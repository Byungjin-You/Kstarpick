// 기존 기사에서 strip-links로 손상된 Twitter/Instagram 임베드를 복구하는 API
// POST /api/news/restore-embeds
// 관리자 전용 - 원본 Soompi URL에서 다시 가져와서 blockquote 복원

import { MongoClient } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import * as cheerio from 'cheerio';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Soompi에서 원본 기사 HTML 가져오기
async function fetchOriginalContent(articleUrl) {
  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Soompi 기사 본문 추출
    const articleContent = $('.entry-content').html() || $('article .content').html() || $('[class*="article-body"]').html();
    return articleContent;
  } catch (err) {
    console.error(`[restore-embeds] Error fetching ${articleUrl}:`, err.message);
    return null;
  }
}

// 원본 HTML에서 Twitter blockquote 추출
function extractTwitterBlockquotes(html) {
  if (!html) return [];
  const regex = /<blockquote[^>]*class="twitter-tweet"[^>]*>[\s\S]*?<\/blockquote>/gi;
  return [...html.matchAll(regex)].map(m => m[0]);
}

// 원본 HTML에서 Instagram blockquote 추출
function extractInstagramBlockquotes(html) {
  if (!html) return [];
  const regex = /<blockquote[^>]*class="instagram-media"[^>]*>[\s\S]*?<\/blockquote>/gi;
  return [...html.matchAll(regex)].map(m => m[0]);
}

// 손상된 blockquote인지 확인 (내부에 <a> 태그가 없으면 손상된 것)
function isDamagedBlockquote(blockquote) {
  return !/<a\s/i.test(blockquote);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 서버 내부 호출용 시크릿 키 또는 세션 인증
  const { secret } = req.body || {};
  if (secret !== process.env.NEXTAUTH_SECRET) {
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { dryRun = true } = req.body || {};

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    const collection = db.collection('news');

    // Twitter/Instagram blockquote가 있지만 내부에 <a> 태그가 없는 기사 찾기
    // (strip-links가 blockquote 내부 링크도 제거한 경우)
    const damagedArticles = await collection.find({
      $and: [
        {
          $or: [
            { content: { $regex: 'twitter-tweet', $options: 'i' } },
            { content: { $regex: 'instagram-media', $options: 'i' } },
          ]
        },
        { articleUrl: { $regex: 'soompi\\.com', $options: 'i' } },
      ]
    }).toArray();

    console.log(`[restore-embeds] Found ${damagedArticles.length} articles with social embeds`);

    // 실제로 손상된 기사만 필터링
    const articlesToFix = damagedArticles.filter(article => {
      const twitterBqs = extractTwitterBlockquotes(article.content);
      const instagramBqs = extractInstagramBlockquotes(article.content);
      const allBqs = [...twitterBqs, ...instagramBqs];
      return allBqs.some(bq => isDamagedBlockquote(bq));
    });

    console.log(`[restore-embeds] ${articlesToFix.length} articles have damaged embeds`);

    if (dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        message: `${articlesToFix.length}개 기사에서 손상된 소셜 임베드가 발견되었습니다. dryRun: false로 실행하면 복구됩니다.`,
        totalWithEmbeds: damagedArticles.length,
        damagedCount: articlesToFix.length,
        articles: articlesToFix.slice(0, 20).map(a => ({
          id: a._id,
          title: a.title,
          articleUrl: a.articleUrl,
        })),
      });
    }

    let restored = 0;
    let failed = 0;
    const results = [];

    for (const article of articlesToFix) {
      try {
        console.log(`[restore-embeds] Processing: ${article.title}`);

        // 원본 Soompi 기사에서 HTML 가져오기
        const originalHtml = await fetchOriginalContent(article.articleUrl);
        if (!originalHtml) {
          console.log(`[restore-embeds] Failed to fetch original: ${article.articleUrl}`);
          failed++;
          results.push({ title: article.title, status: 'fetch_failed' });
          await delay(1000);
          continue;
        }

        // 원본에서 Twitter/Instagram blockquote 추출
        const originalTwitterBqs = extractTwitterBlockquotes(originalHtml);
        const originalInstagramBqs = extractInstagramBlockquotes(originalHtml);

        let updatedContent = article.content;
        let fixCount = 0;

        // 손상된 Twitter blockquote를 원본으로 교체
        const damagedTwitterBqs = extractTwitterBlockquotes(updatedContent).filter(isDamagedBlockquote);
        for (let i = 0; i < damagedTwitterBqs.length && i < originalTwitterBqs.length; i++) {
          updatedContent = updatedContent.replace(damagedTwitterBqs[i], originalTwitterBqs[i]);
          fixCount++;
        }

        // 손상된 Instagram blockquote를 원본으로 교체
        const damagedInstagramBqs = extractInstagramBlockquotes(updatedContent).filter(isDamagedBlockquote);
        for (let i = 0; i < damagedInstagramBqs.length && i < originalInstagramBqs.length; i++) {
          updatedContent = updatedContent.replace(damagedInstagramBqs[i], originalInstagramBqs[i]);
          fixCount++;
        }

        if (fixCount > 0 && updatedContent !== article.content) {
          await collection.updateOne(
            { _id: article._id },
            { $set: { content: updatedContent } }
          );
          restored++;
          results.push({ title: article.title, status: 'restored', fixes: fixCount });
        } else {
          results.push({ title: article.title, status: 'no_change' });
        }

        // Rate limiting
        await delay(1500);
      } catch (err) {
        console.error(`[restore-embeds] Error processing ${article.title}:`, err.message);
        failed++;
        results.push({ title: article.title, status: 'error', error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `${restored}개 기사의 소셜 임베드를 복구했습니다.`,
      totalDamaged: articlesToFix.length,
      restored,
      failed,
      results,
    });
  } catch (error) {
    console.error('[restore-embeds] Error:', error);
    return res.status(500).json({ error: 'Failed to restore embeds', details: error.message });
  } finally {
    await client.close();
  }
}
