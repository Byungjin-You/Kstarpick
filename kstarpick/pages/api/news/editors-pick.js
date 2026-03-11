import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

const NEWS_FIELDS = {
  _id: 1, slug: 1, title: 1, summary: 1, coverImage: 1,
  thumbnailUrl: 1, category: 1, viewCount: 1, createdAt: 1, publishedAt: 1,
};

/**
 * GET /api/news/editors-pick
 *
 * 최근 7일 내 댓글 많은 기사 → 부족하면 14일로 확대 → 전체 인기순 fallback
 *
 * Query params:
 *   limit    - number of results (default 6, max 10)
 *   category - filter by category (e.g. "drama", "kpop", "celeb", "movie")
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 10);
    const category = req.query.category || null;
    // exclude: comma-separated IDs to exclude (e.g. trending news IDs)
    const excludeIds = req.query.exclude
      ? req.query.exclude.split(',').filter(Boolean)
      : [];

    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(MONGODB_DB);

    const results = [];
    const usedIds = new Set(excludeIds);

    const tiers = [
      { days: 7 },
      { days: 14 },
    ];

    for (const tier of tiers) {
      if (results.length >= limit) break;

      const since = new Date(Date.now() - tier.days * 24 * 60 * 60 * 1000);

      // comments 컬렉션에서 최근 기간 내 뉴스별 댓글 수 집계
      const commentAgg = await db.collection('comments').aggregate([
        {
          $match: {
            contentType: 'news',
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: '$contentId',
            commentCount: { $sum: 1 },
          },
        },
        { $sort: { commentCount: -1 } },
        { $limit: limit * 3 },
      ]).toArray();

      if (commentAgg.length === 0) continue;

      // 이미 선택된 ID 제외
      const newsIds = commentAgg
        .filter(c => !usedIds.has(c._id.toString()))
        .map(c => c._id);

      if (newsIds.length === 0) continue;

      // 해당 뉴스 데이터 가져오기 (카테고리 필터 포함)
      const newsQuery = { _id: { $in: newsIds } };
      if (category) {
        newsQuery.category = category;
      }

      const newsMap = {};
      const newsDocs = await db.collection('news')
        .find(newsQuery)
        .project(NEWS_FIELDS)
        .toArray();

      for (const doc of newsDocs) {
        newsMap[doc._id.toString()] = doc;
      }

      // 댓글 수 순서대로 결과에 추가
      for (const agg of commentAgg) {
        if (results.length >= limit) break;
        const id = agg._id.toString();
        if (usedIds.has(id)) continue;
        const news = newsMap[id];
        if (!news) continue;
        usedIds.add(id);
        results.push({ ...news, commentCount: agg.commentCount });
      }
    }

    // Tier 3: 부족하면 전체 조회수 순으로 채움
    if (results.length < limit) {
      const allExclude = [
        ...results.map(r => r._id),
        ...excludeIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)),
      ];
      const fallbackQuery = { _id: { $nin: allExclude } };
      if (category) {
        fallbackQuery.category = category;
      }

      const fallback = await db.collection('news')
        .find(fallbackQuery)
        .sort({ viewCount: -1 })
        .limit(limit - results.length)
        .project(NEWS_FIELDS)
        .toArray();

      for (const item of fallback) {
        if (!usedIds.has(item._id.toString())) {
          usedIds.add(item._id.toString());
          results.push(item);
        }
      }
    }

    await client.close();

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
      data: safeResults,
      count: safeResults.length,
    });
  } catch (error) {
    console.error('[Editors Pick API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
