import { connectToDatabase } from '../../../utils/mongodb';

/**
 * Admin Dashboard Stats API
 * - 콘텐츠 현황 (카테고리별 기사 수, 인기 기사, 최근 발행)
 * - 시스템 상태 (DB 연결, API 응답 시간)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { db } = await connectToDatabase();
    const dbConnectTime = Date.now() - startTime;

    // 1. 카테고리별 기사 수
    const categoryStatsPromise = db.collection('news').aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: { $ifNull: ['$viewCount', 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    // 2. 조회수 기반 인기 기사 TOP 10 (최근 30일)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30);

    const popularArticlesPromise = db.collection('news').find({
      createdAt: { $gte: sevenDaysAgo }
    })
      .sort({ viewCount: -1 })
      .limit(10)
      .project({
        title: 1,
        category: 1,
        viewCount: 1,
        createdAt: 1,
        thumbnail: 1,
        coverImage: 1,
        slug: 1,
        reactions: 1
      })
      .toArray();

    // 3. 최근 발행 기사 (최근 5개)
    const recentArticlesPromise = db.collection('news').find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({
        title: 1,
        category: 1,
        viewCount: 1,
        createdAt: 1,
        thumbnail: 1,
        slug: 1
      })
      .toArray();

    // 4. 오늘/이번주 발행 기사 수
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const todayCountPromise = db.collection('news').countDocuments({
      createdAt: { $gte: today }
    });

    const weekCountPromise = db.collection('news').countDocuments({
      createdAt: { $gte: weekStart }
    });

    // 5. 전체 기사 수
    const totalCountPromise = db.collection('news').countDocuments({});

    // 6. 전체 조회수 합계
    const totalViewsPromise = db.collection('news').aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: { $ifNull: ['$viewCount', 0] } }
        }
      }
    ]).toArray();

    // 병렬 실행
    const [
      categoryStats,
      popularArticles,
      recentArticles,
      todayCount,
      weekCount,
      totalCount,
      totalViewsResult
    ] = await Promise.all([
      categoryStatsPromise,
      popularArticlesPromise,
      recentArticlesPromise,
      todayCountPromise,
      weekCountPromise,
      totalCountPromise,
      totalViewsPromise
    ]);

    const apiResponseTime = Date.now() - startTime;

    // 카테고리 매핑
    const categoryMap = {
      'kpop': 'K-POP',
      'drama': 'Drama',
      'movie': 'Movie',
      'celeb': 'Celebrity',
      'music': 'Music',
      'tvfilm': 'TV/Film'
    };

    const formattedCategoryStats = categoryStats.map(cat => ({
      category: cat._id,
      displayName: categoryMap[cat._id] || cat._id || 'Other',
      count: cat.count,
      totalViews: cat.totalViews
    }));

    // 시스템 상태
    const systemStatus = {
      dbConnected: true,
      dbResponseTime: dbConnectTime,
      apiResponseTime: apiResponseTime,
      serverTime: new Date().toISOString(),
      nodeVersion: process.version,
      memoryUsage: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };

    return res.status(200).json({
      success: true,
      data: {
        contentStats: {
          categories: formattedCategoryStats,
          totalArticles: totalCount,
          totalViews: totalViewsResult[0]?.totalViews || 0,
          todayPublished: todayCount,
          weekPublished: weekCount
        },
        popularArticles: popularArticles.map(article => {
          const r = article.reactions || {};
          const totalReactions = Object.values(r).reduce((sum, v) => sum + (v || 0), 0);
          return {
            ...article,
            _id: article._id.toString(),
            createdAt: article.createdAt?.toISOString(),
            totalReactions
          };
        }),
        recentArticles: recentArticles.map(article => ({
          ...article,
          _id: article._id.toString(),
          createdAt: article.createdAt?.toISOString()
        })),
        systemStatus
      }
    });
  } catch (error) {
    console.error('[Dashboard Stats API] Error:', error);

    return res.status(200).json({
      success: true,
      data: {
        contentStats: {
          categories: [],
          totalArticles: 0,
          totalViews: 0,
          todayPublished: 0,
          weekPublished: 0
        },
        popularArticles: [],
        recentArticles: [],
        systemStatus: {
          dbConnected: false,
          dbResponseTime: 0,
          apiResponseTime: Date.now() - startTime,
          serverTime: new Date().toISOString(),
          error: error.message
        }
      }
    });
  }
}
