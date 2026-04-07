import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/utils/mongodb';

const NEWS_FIELDS = {
  _id: 1, slug: 1, title: 1, summary: 1, content: 1, coverImage: 1,
  thumbnailUrl: 1, category: 1, viewCount: 1, createdAt: 1, publishedAt: 1,
  reactions: 1,
};

const trimContent = (articles) => articles.map(a => {
  const { reactions, ...rest } = a;
  if (rest.content && typeof rest.content === 'string') {
    return { ...rest, content: rest.content.replace(/<[^>]*>/g, '').trim().slice(0, 200) };
  }
  return rest;
});

// ─── Engagement Score 계산 ───
// 댓글, 좋아요, 싫어요, 조회수, 최신도를 종합한 단일 점수
function calculateEngagementScore(article, commentCount = 0) {
  const reactions = article.reactions || {};
  const likeCount = reactions.like || 0;
  const dislikeCount = reactions.dislike || 0;
  const viewCount = article.viewCount || 0;

  // 시간 가중치 (0~20점, 30일 이내)
  const ageDays = article.createdAt
    ? (Date.now() - new Date(article.createdAt).getTime()) / 86400000
    : 999;
  const recencyBonus = Math.max(0, (30 - ageDays) / 30) * 20;

  // 통합 점수
  return (
    commentCount * 5         // 댓글: 사용자 참여도 가장 높음
    + likeCount * 2          // 좋아요
    + dislikeCount * 1       // 싫어요(논쟁성도 engagement)
    + Math.log10(viewCount + 1) * 10  // 조회수 (log scale)
    + recencyBonus           // 최신도 보너스
  );
}

/**
 * GET /api/news/editors-pick
 *
 * 통합 Engagement Score 기반 추천:
 * - 댓글, 좋아요, 싫어요, 조회수, 최신도를 모두 반영한 단일 점수
 * - 30일 이내 기사 우선, 부족하면 60일까지 fallback
 *
 * Query params:
 *   limit    - number of results (default 6, max 10)
 *   category - filter by category (e.g. "drama", "kpop", "celeb", "movie")
 *   exclude  - comma-separated IDs to exclude
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 10);
    const category = req.query.category || null;
    const excludeIds = req.query.exclude
      ? req.query.exclude.split(',').filter(Boolean)
      : [];

    const { db } = await connectToDatabase();

    const excludeObjectIds = excludeIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    const results = [];
    const usedIds = new Set(excludeIds);

    // Tier별로 점진적으로 기간 확대
    const tiers = [
      { days: 30, label: 'recent' },
      { days: 60, label: 'extended' },
    ];

    for (const tier of tiers) {
      if (results.length >= limit) break;

      const since = new Date(Date.now() - tier.days * 24 * 60 * 60 * 1000);
      const sinceIso = since.toISOString();

      // 1. 해당 기간 내 기사 가져오기 (제외 ID 제외)
      // createdAt이 Date 또는 String 둘 다 가능하므로 $or로 처리
      const newsQuery = {
        $or: [
          { createdAt: { $gte: since } },
          { createdAt: { $gte: sinceIso } }
        ],
        _id: { $nin: excludeObjectIds.concat(
          [...usedIds].filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id))
        ) },
      };
      if (category) {
        newsQuery.category = category;
      }

      const articles = await db.collection('news')
        .find(newsQuery)
        .project(NEWS_FIELDS)
        .limit(500) // 점수 계산용 후보군
        .toArray();

      if (articles.length === 0) continue;

      // 2. 해당 기사들의 댓글 수 일괄 집계
      const articleIds = articles.map(a => a._id);
      const commentAgg = await db.collection('comments').aggregate([
        {
          $match: {
            contentType: 'news',
            contentId: { $in: articleIds },
          },
        },
        {
          $group: {
            _id: '$contentId',
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      const commentCountMap = {};
      for (const c of commentAgg) {
        commentCountMap[c._id.toString()] = c.count;
      }

      // 3. 각 기사에 점수 부여
      const scored = articles.map(a => ({
        ...a,
        commentCount: commentCountMap[a._id.toString()] || 0,
        score: calculateEngagementScore(a, commentCountMap[a._id.toString()] || 0),
      }));

      // 4. 점수 내림차순 정렬
      scored.sort((a, b) => b.score - a.score);

      // 5. 결과에 추가 (limit까지)
      for (const item of scored) {
        if (results.length >= limit) break;
        const id = item._id.toString();
        if (usedIds.has(id)) continue;
        usedIds.add(id);
        results.push(item);
      }
    }

    // undefined 필드를 빈 문자열로 변환 (Next.js SSR 직렬화 에러 방지)
    const safeResults = results.map(r => ({
      ...r,
      thumbnailUrl: r.thumbnailUrl || '',
      coverImage: r.coverImage || '',
      summary: r.summary || '',
      slug: r.slug || '',
    }));

    return res.status(200).json({
      success: true,
      data: trimContent(safeResults),
      count: safeResults.length,
    });
  } catch (error) {
    console.error('[Editors Pick API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
