// 기존 기사 본문에서 모든 <a> 태그를 텍스트로 변환하고 홍보 문구를 제거하는 일괄 처리 API
// POST /api/news/strip-links
// 관리자 전용 - 한 번 실행 후 결과 확인

import { MongoClient } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

function cleanArticleContent(html) {
  if (!html) return html;

  // Soompi 하단 홍보 문구 통째로 제거 (링크 제거 전에 실행)
  html = html.replace(/<p[^>]*>\s*(?:In the meantime,?\s*)?(?:Also\s+|And\s+)?(?:watch|check out|catch|start watching|you can (?:also )?watch|don'?t forget to (?:also )?(?:watch|check out))\b.*?<\/p>/gi, '');
  html = html.replace(/<p[^>]*>[^<]*(?:below|here)\s*!?\s*:?\s*<\/p>/gi, '');

  // 1. 소셜 미디어 임베드 blockquote를 플레이스홀더로 보호 (내부 <a> 태그 보존)
  const embeds = [];
  html = html.replace(/<blockquote[^>]*class="(?:twitter-tweet|instagram-media)"[^>]*>[\s\S]*?<\/blockquote>/gi, (match) => {
    embeds.push(match);
    return `__SOCIAL_EMBED_${embeds.length - 1}__`;
  });

  // 2. 나머지 <a> 태그 제거 (소셜 미디어 URL 링크는 보존)
  html = html.replace(/<a[^>]*>(.*?)<\/a>/gi, (match, text) => {
    if (/instagram\.com\/(?:p|reel)\//i.test(match)) return match;
    if (/(?:twitter\.com|x\.com)\/.*\/status\//i.test(match)) return match;
    return text;
  });

  // 3. 보호된 blockquote 복원
  html = html.replace(/__SOCIAL_EMBED_(\d+)__/g, (match, index) => embeds[parseInt(index)]);

  return html;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 관리자 인증 확인
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    const collection = db.collection('news');

    // <a 태그 또는 홍보 문구가 포함된 기사 조회
    const articles = await collection.find({
      $or: [
        { content: { $regex: '<a\\s', $options: 'i' } },
        { content: { $regex: 'watch.*below|check out.*below|start watching|In the meantime.*watch', $options: 'i' } },
      ],
    }).toArray();

    if (articles.length === 0) {
      return res.status(200).json({
        success: true,
        message: '처리할 기사가 없습니다.',
        updated: 0,
      });
    }

    let updated = 0;
    for (const article of articles) {
      const cleanedContent = cleanArticleContent(article.content);
      if (cleanedContent !== article.content) {
        await collection.updateOne(
          { _id: article._id },
          { $set: { content: cleanedContent } }
        );
        updated++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `${updated}개 기사에서 링크 및 홍보 문구를 제거했습니다.`,
      found: articles.length,
      updated,
    });
  } catch (error) {
    console.error('Strip links error:', error);
    return res.status(500).json({ error: 'Failed to strip links', details: error.message });
  } finally {
    await client.close();
  }
}
