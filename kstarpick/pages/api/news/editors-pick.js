import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/utils/mongodb';

const NEWS_FIELDS = {
  _id: 1, slug: 1, title: 1, summary: 1, content: 1, coverImage: 1,
  thumbnailUrl: 1, category: 1, viewCount: 1, createdAt: 1, publishedAt: 1,
  reactions: 1,
};

// In-memory cache (1 minute TTL) — 동일 카테고리 반복 호출 시 DB 호출 회피
const cache = new Map();
const CACHE_TTL = 60 * 1000;

const trimContent = (articles) => articles.map(a => {
  const { reactions, score, ...rest } = a;
  if (rest.content && typeof rest.content === 'string') {
    return { ...rest, content: rest.content.replace(/<[^>]*>/g, '').trim().slice(0, 200) };
  }
  return rest;
});

/**
 * GET /api/news/editors-pick
 *
 * Engagement Score (좋아요, 싫어요, 조회수, 최신도) 기반 추천.
 * 단일 aggregation pipeline = 1 cursor 사용 (cursor leak 방지).
 * 1분 in-memory 캐시로 동시 호출 폭증 방지.
 *
 * Score = likes*2 + dislikes*1 + log10(views+1)*10 + recency_bonus
 *
 * Query params:
 *   limit    - number of results (default 6, max 10)
 *   category - filter by category (drama, kpop, celeb, movie, tvfilm)
 *   exclude  - comma-separated IDs to exclude
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 10);
    // category alias: tvfilm 페이지는 movie 데이터를 사용
    const rawCategory = req.query.category || null;
    const category = rawCategory === 'tvfilm' ? 'movie' : rawCategory;
    const excludeIds = req.query.exclude
      ? req.query.exclude.split(',').filter(Boolean)
      : [];

    // 캐시 확인
    const cacheKey = `${category || 'all'}:${limit}:${excludeIds.join(',')}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    const { db } = await connectToDatabase();

    const excludeObjectIds = excludeIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    // 최근 30일 published 기사 — {status, category, createdAt} 인덱스 활용
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const matchStage = {
      status: 'published',
      createdAt: { $gte: since },
    };
    if (category) matchStage.category = category;
    if (excludeObjectIds.length) matchStage._id = { $nin: excludeObjectIds };

    // 단일 aggregation pipeline = 1 cursor
    const results = await db.collection('news').aggregate([
      { $match: matchStage },
      // Engagement Score 계산
      {
        $addFields: {
          score: {
            $add: [
              // 좋아요 * 2
              { $multiply: [{ $ifNull: ['$reactions.like', 0] }, 2] },
              // 싫어요 * 1 (논쟁성도 engagement)
              { $multiply: [{ $ifNull: ['$reactions.dislike', 0] }, 1] },
              // log10(viewCount + 1) * 10
              {
                $multiply: [
                  { $log10: { $add: [{ $ifNull: ['$viewCount', 0] }, 1] } },
                  10,
                ],
              },
              // 최신도 보너스 (0 ~ 20점, 30일 기준)
              {
                $multiply: [
                  {
                    $max: [
                      0,
                      {
                        $divide: [
                          {
                            $subtract: [
                              30,
                              {
                                $divide: [
                                  { $subtract: [new Date(), '$createdAt'] },
                                  1000 * 60 * 60 * 24,
                                ],
                              },
                            ],
                          },
                          30,
                        ],
                      },
                    ],
                  },
                  20,
                ],
              },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: limit },
      { $project: { ...NEWS_FIELDS, score: 1 } },
    ], { allowDiskUse: false }).toArray();

    // undefined 필드를 빈 문자열로 변환 (Next.js SSR 직렬화 에러 방지)
    const safeResults = results.map(r => ({
      ...r,
      thumbnailUrl: r.thumbnailUrl || '',
      coverImage: r.coverImage || '',
      summary: r.summary || '',
      slug: r.slug || '',
    }));

    const response = {
      success: true,
      data: trimContent(safeResults),
      count: safeResults.length,
    };

    // 캐시 저장
    cache.set(cacheKey, { time: Date.now(), data: response });

    // 캐시 크기 제한 (메모리 leak 방지)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('[Editors Pick API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
