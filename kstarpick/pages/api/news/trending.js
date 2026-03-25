import { connectToDatabase } from '@/utils/mongodb';

const FIELDS = {
  _id: 1, slug: 1, title: 1, summary: 1, content: 1, coverImage: 1,
  thumbnailUrl: 1, category: 1, viewCount: 1, createdAt: 1, publishedAt: 1,
};
const trimContent = (articles) => articles.map(a => {
  if (a.content && typeof a.content === 'string') {
    return { ...a, content: a.content.replace(/<[^>]*>/g, '').trim().slice(0, 200) };
  }
  return a;
});

/**
 * GET /api/news/trending
 *
 * "지금 뜨는 기사" — 최근 작성된 기사 중 조회수 높은 순
 * 3-tier fallback: 48h → 7d → all time
 *
 * Query params:
 *   limit    - number of results (default 5, max 10)
 *   category - filter by category (e.g. "drama", "kpop", "celeb", "movie")
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 10);
    const category = req.query.category || null;

    const { db } = await connectToDatabase();
    const collection = db.collection('news');

    const results = [];
    const usedIds = new Set();

    const tiers = [
      { hours: 48 },
      { days: 7 },
      { all: true },
    ];

    for (const tier of tiers) {
      if (results.length >= limit) break;

      const query = {
        _id: { $nin: results.map(r => r._id) },
      };

      if (category) {
        query.category = category;
      }

      if (tier.hours) {
        const since = new Date(Date.now() - tier.hours * 60 * 60 * 1000);
        query.createdAt = { $gte: since };
      } else if (tier.days) {
        const since = new Date(Date.now() - tier.days * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: since };
      }

      const news = await collection
        .find(query)
        .sort({ viewCount: -1 })
        .limit(limit - results.length)
        .project(FIELDS)
        .toArray();

      for (const item of news) {
        const id = item._id.toString();
        if (!usedIds.has(id)) {
          usedIds.add(id);
          results.push(item);
        }
      }
    }

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
    console.error('[Trending News API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
