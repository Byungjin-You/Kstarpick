import * as cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';

const crypto = require('crypto');

function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    + '-' + Date.now().toString(36);
}

function createImageHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
}

// 네이버 연예뉴스 목록 크롤링 (Cheerio만 사용, Puppeteer 없음)
async function scrapeNaverEntertainmentList(maxItems = 15) {
  const axios = (await import('axios')).default;
  const articles = [];
  const seenUrls = new Set();

  const listUrl = 'https://entertain.naver.com/ranking';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Referer': 'https://entertain.naver.com/',
  };

  try {
    const res = await axios.get(listUrl, { headers, timeout: 15000 });
    const $ = cheerio.load(res.data);

    // 랭킹 뉴스 기사 링크 추출
    $('a[href*="entertain.naver.com/read"]').each((_, el) => {
      if (articles.length >= maxItems) return false;
      const href = $(el).attr('href');
      if (!href || seenUrls.has(href)) return;
      const fullUrl = href.startsWith('http') ? href : `https://entertain.naver.com${href}`;
      seenUrls.add(fullUrl);
      const titleText = $(el).text().trim();
      if (titleText && titleText.length > 5) {
        articles.push({ url: fullUrl, listTitle: titleText });
      }
    });

    // 부족하면 최신 뉴스 페이지도 시도
    if (articles.length < maxItems) {
      const latestRes = await axios.get('https://entertain.naver.com/home', { headers, timeout: 15000 });
      const $2 = cheerio.load(latestRes.data);
      $2('a[href*="entertain.naver.com/read"]').each((_, el) => {
        if (articles.length >= maxItems) return false;
        const href = $2(el).attr('href');
        if (!href) return;
        const fullUrl = href.startsWith('http') ? href : `https://entertain.naver.com${href}`;
        if (seenUrls.has(fullUrl)) return;
        seenUrls.add(fullUrl);
        const titleText = $2(el).text().trim();
        if (titleText && titleText.length > 5) {
          articles.push({ url: fullUrl, listTitle: titleText });
        }
      });
    }
  } catch (err) {
    console.error('[Naver Crawler] 목록 크롤링 실패:', err.message);
  }

  return articles.slice(0, maxItems);
}

// 개별 기사 본문 크롤링
async function scrapeArticleDetail(articleUrl) {
  const axios = (await import('axios')).default;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Referer': 'https://entertain.naver.com/',
  };

  const res = await axios.get(articleUrl, { headers, timeout: 15000 });
  const $ = cheerio.load(res.data);

  const title = $('h2.end_tit, .article_info h2, #title_area span, .media_end_head_title .media_end_head_headline').first().text().trim();
  const bodyEl = $('#articeBody, #newsEndContents, .article_body, #dic_area, .newsct_article, .go_trans._article_content');

  // 이미지 추출
  let coverImage = '';
  bodyEl.find('img').each((_, img) => {
    if (coverImage) return;
    const src = $(img).attr('data-src') || $(img).attr('src') || '';
    if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
      coverImage = src;
    }
  });
  if (!coverImage) {
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) coverImage = ogImage;
  }

  // 본문 텍스트 (HTML 태그 제거, 광고/스크립트 제거)
  bodyEl.find('script, style, .ad, .reporter_area, .copyright, .byline').remove();
  const rawText = bodyEl.text().replace(/\s+/g, ' ').trim();

  // 출처(언론사)
  const press = $('.press_logo img').attr('alt') ||
                $('meta[property="og:article:author"]').attr('content') ||
                '네이버 연예';

  // 카테고리 추론
  const category = detectCategory(title + ' ' + rawText);

  return {
    title: title || '',
    content: rawText || '',
    coverImage,
    press,
    category,
  };
}

function detectCategory(text) {
  const lower = text.toLowerCase();
  const koText = text;

  if (/드라마|시청률|방영|출연|대본|촬영|연기/.test(koText) || /drama|rating|episode/i.test(lower)) return 'drama';
  if (/영화|극장|개봉|박스오피스|감독/i.test(koText) || /movie|film|box office/i.test(lower)) return 'movie';
  if (/예능|버라이어티|출연진|MC/.test(koText) || /variety|show/i.test(lower)) return 'variety';
  if (/앨범|컴백|음원|차트|뮤비|뮤직비디오|콘서트|투어|공연/.test(koText) || /album|comeback|chart|mv|concert|tour/i.test(lower)) return 'kpop';
  return 'celeb';
}

// Claude API로 요약 + 번역 (한 번의 호출로 처리)
async function summarizeAndTranslate(title, content, apiKey) {
  const truncatedContent = content.substring(0, 3000);

  const prompt = `You are a K-entertainment news editor. Given a Korean news article, do the following:

1. Write a 2-3 line brief summary in Korean (요약)
2. Rewrite the article in Korean at ~70% of original length (본문 재작성)
3. Translate the brief summary AND rewritten article into: English, Japanese, Chinese (Simplified), Spanish

IMPORTANT: Do NOT copy the original text verbatim. Rewrite in your own words.

Original Title: ${title}
Original Content: ${truncatedContent}

Respond in this exact JSON format (no markdown, no code block):
{"summary":{"ko":"...","en":"...","ja":"...","zh":"...","es":"..."},"title":{"ko":"${title}","en":"...","ja":"...","zh":"...","es":"..."},"content":{"ko":"...","en":"...","ja":"...","zh":"...","es":"..."}}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude API returned no valid JSON');
  return JSON.parse(jsonMatch[0]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { maxItems = 15 } = req.body || {};
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ success: false, message: 'CLAUDE_API_KEY not configured' });
  }

  console.log(`[Naver Crawler] 시작: 최대 ${maxItems}개 기사`);

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('news');

    // 1. 네이버 연예뉴스 목록 크롤링
    const articleList = await scrapeNaverEntertainmentList(maxItems);
    console.log(`[Naver Crawler] ${articleList.length}개 기사 링크 수집`);

    if (articleList.length === 0) {
      return res.status(200).json({ success: true, message: '수집된 기사가 없습니다.', total: 0, new: 0 });
    }

    // 2. 중복 확인 (URL 기반)
    const existingUrls = await collection.find({
      articleUrl: { $in: articleList.map(a => a.url) }
    }).project({ articleUrl: 1 }).toArray();
    const existingUrlSet = new Set(existingUrls.map(a => a.articleUrl));

    const newArticles = articleList.filter(a => !existingUrlSet.has(a.url));
    console.log(`[Naver Crawler] 중복 제외 후 ${newArticles.length}개 새 기사`);

    if (newArticles.length === 0) {
      return res.status(200).json({
        success: true, message: '새로운 기사가 없습니다.',
        total: articleList.length, new: 0,
      });
    }

    // 3. 기사별 본문 크롤링 + 요약/번역
    const savedArticles = [];
    const errors = [];

    for (let i = 0; i < newArticles.length; i++) {
      const article = newArticles[i];
      try {
        // 본문 크롤링
        const detail = await scrapeArticleDetail(article.url);
        if (!detail.title || !detail.content || detail.content.length < 50) {
          console.log(`[Naver Crawler] 본문 부족, 건너뜀: ${article.url}`);
          continue;
        }

        // Claude API로 요약 + 번역
        const translated = await summarizeAndTranslate(detail.title, detail.content, apiKey);

        // 이미지 처리
        let coverImage = '';
        if (detail.coverImage) {
          const hash = createImageHash(detail.coverImage);
          coverImage = `/api/proxy/hash-image?hash=${hash}`;
          try {
            await db.collection('image_hashes').updateOne(
              { hash },
              { $set: { hash, originalUrl: detail.coverImage, createdAt: new Date() } },
              { upsert: true }
            );
          } catch (imgErr) {
            coverImage = detail.coverImage;
          }
        }

        const newsDoc = {
          title: translated.title?.en || detail.title,
          slug: createSlug(translated.title?.en || detail.title),
          content: translated.content?.en || detail.content,
          summary: translated.summary?.en || '',
          coverImage,
          category: detail.category,
          tags: [],
          source: detail.press,
          sourceUrl: 'https://entertain.naver.com',
          articleUrl: article.url,
          featured: false,
          viewCount: 0,
          lang: 'en',
          createdAt: new Date(),
          updatedAt: new Date(),
          // 다국어 데이터
          translations: {
            title: translated.title,
            summary: translated.summary,
            content: translated.content,
          },
          // 메타데이터
          _crawlSource: 'naver',
          _originalTitle: detail.title,
        };

        await collection.insertOne(newsDoc);
        savedArticles.push(newsDoc.title);
        console.log(`[Naver Crawler] 저장 완료 (${i + 1}/${newArticles.length}): ${detail.title}`);

        // API rate limit 대비 1초 대기
        if (i < newArticles.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        errors.push({ url: article.url, error: err.message });
        console.error(`[Naver Crawler] 실패: ${article.url} - ${err.message}`);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`[Naver Crawler] 완료: ${savedArticles.length}개 저장, ${errors.length}개 실패`);

    return res.status(200).json({
      success: true,
      total: articleList.length,
      new: savedArticles.length,
      errors: errors.length,
      articles: savedArticles,
    });
  } catch (err) {
    console.error('[Naver Crawler] 치명적 오류:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
