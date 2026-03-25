import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/utils/mongodb';

const FIELDS = {
  _id: 1, slug: 1, title: 1, summary: 1, content: 1, coverImage: 1,
  thumbnailUrl: 1, category: 1, tags: 1, viewCount: 1, createdAt: 1,
};
const trimContent = (articles) => articles.map(a => {
  if (a.content && typeof a.content === 'string') {
    return { ...a, content: a.content.replace(/<[^>]*>/g, '').trim().slice(0, 200) };
  }
  return a;
});

/**
 * GET /api/news/related
 *
 * Unified Related/Recommended News API
 * 3-tier fallback: category(viewCount) → tags(viewCount) → global popular
 *
 * Query params:
 *   category  - news category (kpop, drama, movie, celeb, etc.)
 *   tags      - comma-separated tag list
 *   exclude   - comma-separated article IDs to exclude
 *   limit     - number of results (default 6, max 20)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      category,
      tags,
      exclude = '',
      limit: limitStr = '6',
    } = req.query;

    const limit = Math.min(parseInt(limitStr, 10) || 6, 20);
    const excludeIds = exclude
      .split(',')
      .filter(Boolean)
      .map(id => {
        try { return new ObjectId(id); } catch { return null; }
      })
      .filter(Boolean);

    const { db } = await connectToDatabase();
    const collection = db.collection('news');

    const results = [];
    const usedIds = new Set(excludeIds.map(id => id.toString()));

    // --- Tier 1: Same category, sorted by viewCount ---
    if (category) {
      const categoryNews = await collection
        .find({
          category,
          _id: { $nin: excludeIds },
        })
        .sort({ viewCount: -1 })
        .limit(limit)
        .project(FIELDS)
        .toArray();

      for (const item of categoryNews) {
        if (!usedIds.has(item._id.toString())) {
          usedIds.add(item._id.toString());
          results.push(item);
        }
      }
    }

    // --- Tier 2: Same tags, sorted by viewCount ---
    if (results.length < limit && tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        const tagNews = await collection
          .find({
            tags: { $in: tagList },
            _id: { $nin: [...excludeIds, ...results.map(r => r._id)] },
          })
          .sort({ viewCount: -1 })
          .limit(limit - results.length)
          .project(FIELDS)
          .toArray();

        for (const item of tagNews) {
          if (!usedIds.has(item._id.toString())) {
            usedIds.add(item._id.toString());
            results.push(item);
          }
        }
      }
    }

    // --- Tier 3: Recent popular news (last 7 days) ---
    if (results.length < limit) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const allExcludeIds = [...excludeIds, ...results.map(r => r._id)];
      const recentPopular = await collection
        .find({
          _id: { $nin: allExcludeIds },
          createdAt: { $gte: sevenDaysAgo },
        })
        .sort({ viewCount: -1 })
        .limit(limit - results.length)
        .project(FIELDS)
        .toArray();

      for (const item of recentPopular) {
        if (!usedIds.has(item._id.toString())) {
          usedIds.add(item._id.toString());
          results.push(item);
        }
      }
    }

    // --- Tier 4: Global popular news (fallback) ---
    if (results.length < limit) {
      const allExcludeIds = [...excludeIds, ...results.map(r => r._id)];
      const popularNews = await collection
        .find({
          _id: { $nin: allExcludeIds },
        })
        .sort({ viewCount: -1 })
        .limit(limit - results.length)
        .project(FIELDS)
        .toArray();

      for (const item of popularNews) {
        if (!usedIds.has(item._id.toString())) {
          usedIds.add(item._id.toString());
          results.push(item);
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: trimContent(results),
      count: results.length,
    });
  } catch (error) {
    console.error('[Related News API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
