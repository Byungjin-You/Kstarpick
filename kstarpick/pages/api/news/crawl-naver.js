import * as cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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

function generateAuthorByCategory(category) {
  const authors = {
    kpop: ['Rachel Kim', 'Jenna Park', 'Mina Lee', 'Sophie Yoon'],
    drama: ['Alex Cho', 'Hannah Jung', 'David Kang', 'Emily Shin'],
    movie: ['Chris Oh', 'Olivia Han', 'Ryan Seo', 'Grace Lim'],
    variety: ['Jake Moon', 'Lily Hwang', 'Kevin Bae', 'Nara Choi'],
    celeb: ['Emma Cha', 'Daniel Woo', 'Sarah Hong', 'Jason Ryu'],
  };
  const pool = authors[category] || authors.celeb;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateTags(category, title) {
  const baseTags = ['K-Entertainment', 'News'];
  const catTags = {
    kpop: ['K-POP'], drama: ['K-Drama'], movie: ['Korean Film'],
    variety: ['Variety Show'], celeb: ['Celebrity'],
  };
  return [...baseTags, ...(catTags[category] || [])];
}

async function downloadImageToDisk(imageUrl, hash) {
  const uploadDir = path.join(process.cwd(), 'public', 'images', 'news');
  try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}

  const ext = (imageUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) || [, 'jpg'])[1];
  const filePath = path.join(uploadDir, `${hash}.${ext}`);

  if (fs.existsSync(filePath)) return `/images/news/${hash}.${ext}`;

  return new Promise((resolve) => {
    const protocol = imageUrl.startsWith('https') ? https : http;
    const req = protocol.get(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://entertain.naver.com/',
      },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        resolve(null);
        return;
      }
      if (res.statusCode !== 200) { resolve(null); return; }
      const stream = fs.createWriteStream(filePath);
      res.pipe(stream);
      stream.on('finish', () => resolve(`/images/news/${hash}.${ext}`));
      stream.on('error', () => resolve(null));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

// 네이버 연예뉴스 목록 크롤링 (Cheerio만 사용)
async function scrapeNaverEntertainmentList(maxItems = 15) {
  const axios = (await import('axios')).default;
  const articles = [];
  const seenUrls = new Set();

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Referer': 'https://entertain.naver.com/',
  };

  const sources = [
    'https://entertain.naver.com/ranking',
    'https://entertain.naver.com/home',
    'https://entertain.naver.com/now',
  ];

  for (const listUrl of sources) {
    if (articles.length >= maxItems) break;
    try {
      const res = await axios.get(listUrl, { headers, timeout: 15000 });
      const $ = cheerio.load(res.data);

      $('a[href*="entertain.naver.com/read"], a[href*="/read?"]').each((_, el) => {
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
    } catch (err) {
      console.error(`[Naver Crawler] ${listUrl} 크롤링 실패:`, err.message);
    }
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

  const title = $('h2.end_tit, #title_area span, .media_end_head_headline, .article_info h2').first().text().trim();
  const bodyEl = $('#dic_area, #newsEndContents, #articeBody, .newsct_article, .article_body, .go_trans._article_content');

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

  // 불필요한 요소 제거
  bodyEl.find('script, style, .ad, .reporter_area, .copyright, .byline, .article_relate, .article_footer, .promotion, .vod_player_wrap').remove();

  // 본문: plain text (Claude에 보낼 용도)
  const rawText = bodyEl.text().replace(/\s+/g, ' ').trim();

  // 본문: HTML (저장용 — 단락 보존)
  const htmlContent = bodyEl.html()?.trim() || '';

  // 출처(언론사)
  const press = $('.press_logo img').attr('alt') ||
                $('meta[property="og:article:author"]').attr('content') ||
                '네이버 연예';

  const category = detectCategory(title + ' ' + rawText);

  return { title, rawText, htmlContent, coverImage, press, category };
}

function detectCategory(text) {
  const koText = text;
  if (/드라마|시청률|방영|대본|촬영|연기|극본/.test(koText)) return 'drama';
  if (/영화|극장|개봉|박스오피스|감독/.test(koText)) return 'movie';
  if (/예능|버라이어티|출연진|MC|방송/.test(koText)) return 'variety';
  if (/앨범|컴백|음원|차트|뮤비|뮤직비디오|콘서트|투어|공연|아이돌|팬미팅/.test(koText)) return 'kpop';
  return 'celeb';
}

// Claude API: 요약 + 번역 (1회 호출)
async function summarizeAndTranslate(title, rawText, apiKey) {
  const truncated = rawText.substring(0, 3000);

  const prompt = `You are a K-entertainment news editor. Given a Korean news article, do the following:

1. Write a 2-3 line brief summary in Korean
2. Rewrite the article body in Korean at ~70% of original length, using <p> tags for paragraphs
3. Translate the title, brief summary, and rewritten body into: English, Japanese, Chinese (Simplified), Spanish

IMPORTANT:
- Do NOT copy the original text verbatim. Rewrite in your own words.
- Wrap each paragraph in <p></p> tags in the content field for ALL languages.
- Keep translations natural and fluent.

Original Title: ${title}
Original Content: ${truncated}

Return ONLY valid JSON (no markdown, no code blocks, no extra text):
{"summary":{"ko":"2-3줄 요약","en":"...","ja":"...","zh":"...","es":"..."},"title":{"ko":"${title.replace(/"/g, '\\"')}","en":"...","ja":"...","zh":"...","es":"..."},"content":{"ko":"<p>...</p>","en":"<p>...</p>","ja":"<p>...</p>","zh":"<p>...</p>","es":"<p>...</p>"}}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // 가장 바깥 { } 매칭 (greedy 방지: 마지막 }를 찾음)
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Claude API returned no valid JSON');
  }
  return JSON.parse(text.substring(firstBrace, lastBrace + 1));
}

// 제목 기반 중복 체크
async function findDuplicateByTitle(collection, koTitle) {
  if (!koTitle || koTitle.length < 10) return false;
  const normalized = koTitle.replace(/[\s\[\]'".,!?·…""''「」\-]/g, '');
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recent = await collection.find({
    createdAt: { $gte: cutoff },
    _crawlSource: 'naver',
  }).project({ _originalTitle: 1 }).limit(200).toArray();

  for (const doc of recent) {
    if (!doc._originalTitle) continue;
    const existing = doc._originalTitle.replace(/[\s\[\]'".,!?·…""''「」\-]/g, '');
    if (existing === normalized) return true;
    if (normalized.length > 15 && existing.includes(normalized.substring(0, 15))) return true;
  }
  return false;
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
    console.log(`[Naver Crawler] URL 중복 제외 후 ${newArticles.length}개`);

    if (newArticles.length === 0) {
      return res.status(200).json({
        success: true, message: '새로운 기사가 없습니다.',
        total: articleList.length, new: 0,
      });
    }

    // 3. 기사별 본문 크롤링 + 요약/번역
    const savedArticles = [];
    const errors = [];
    let consecutiveApiErrors = 0;

    for (let i = 0; i < newArticles.length; i++) {
      if (consecutiveApiErrors >= 3) {
        console.log('[Naver Crawler] API 연속 실패 3회, 중단');
        break;
      }

      const article = newArticles[i];
      try {
        const detail = await scrapeArticleDetail(article.url);
        if (!detail.title || !detail.rawText || detail.rawText.length < 50) {
          console.log(`[Naver Crawler] 본문 부족, 건너뜀: ${article.url}`);
          continue;
        }

        // 제목 기반 중복 체크
        const isDupe = await findDuplicateByTitle(collection, detail.title);
        if (isDupe) {
          console.log(`[Naver Crawler] 제목 중복, 건너뜀: ${detail.title}`);
          continue;
        }

        // Claude API: 요약 + 번역
        const translated = await summarizeAndTranslate(detail.title, detail.rawText, apiKey);
        consecutiveApiErrors = 0;

        // 이미지 처리: 해시 저장 + 디스크 다운로드
        let coverImage = '/images/default-news.jpg';
        if (detail.coverImage) {
          const hash = createImageHash(detail.coverImage);
          const localPath = await downloadImageToDisk(detail.coverImage, hash);
          if (localPath) {
            coverImage = localPath;
          } else {
            coverImage = `/api/proxy/hash-image?hash=${hash}`;
          }
          try {
            await db.collection('image_hashes').updateOne(
              { hash },
              { $set: { hash, originalUrl: detail.coverImage, createdAt: new Date() } },
              { upsert: true }
            );
          } catch {}
        }

        const enTitle = translated.title?.en || detail.title;
        const newsDoc = {
          title: enTitle,
          slug: createSlug(enTitle),
          content: translated.content?.en || `<p>${detail.rawText}</p>`,
          summary: translated.summary?.en || '',
          coverImage,
          thumbnailUrl: detail.coverImage || '',
          category: detail.category,
          tags: generateTags(detail.category, enTitle),
          source: detail.press,
          sourceUrl: 'https://entertain.naver.com',
          articleUrl: article.url,
          timeText: 'Recently',
          author: {
            name: generateAuthorByCategory(detail.category),
            id: 'naver-crawler',
            email: 'crawler@kstarpick.com',
            image: '/images/default-avatar.png',
          },
          status: 'published',
          featured: false,
          viewCount: 0,
          lang: 'en',
          createdAt: new Date(),
          publishedAt: new Date(),
          updatedAt: new Date(),
          translations: {
            title: translated.title,
            summary: translated.summary,
            content: translated.content,
          },
          _crawlSource: 'naver',
          _originalTitle: detail.title,
        };

        await collection.insertOne(newsDoc);
        savedArticles.push(enTitle);
        console.log(`[Naver Crawler] 저장 (${i + 1}/${newArticles.length}): ${detail.title}`);

        if (i < newArticles.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err) {
        errors.push({ url: article.url, error: err.message });
        console.error(`[Naver Crawler] 실패: ${article.url} - ${err.message}`);
        if (err.message.includes('Claude API')) consecutiveApiErrors++;
        await new Promise(r => setTimeout(r, 1000));
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
