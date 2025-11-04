import { connectToDatabase } from '../../../utils/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // NextAuth 세션으로 관리자 권한 확인
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user?.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const { db } = await connectToDatabase();
    const { days = 30 } = req.query;
    
    // 날짜 계산 (최근 N일)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    console.log(`[Analytics] 방문자 통계 조회: ${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`);

    // 1. 드라마 조회수 통계 (최근 15일)
    const dramaStats = await db.collection('dramas').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$viewCount' },
          totalDramas: { $sum: 1 }
        }
      }
    ]).toArray();

    // 2. 뉴스 조회수 통계 (최근 15일)
    const newsStats = await db.collection('news').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$viewCount' },
          totalNews: { $sum: 1 }
        }
      }
    ]).toArray();

    // 3. 영화 조회수 통계 (최근 15일)
    const movieStats = await db.collection('tvfilms').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$viewCount' },
          totalMovies: { $sum: 1 }
        }
      }
    ]).toArray();

    // 4. 음악 조회수 통계 (최근 15일)
    const musicStats = await db.collection('musics').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalMusic: { $sum: 1 }
        }
      }
    ]).toArray();

    // 5. 일별 뉴스 조회수 (최근 30일)
    const dailyNewsViews = await db.collection('news').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          views: { $sum: '$viewCount' },
          articles: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]).toArray();

    // 6. 인기 컨텐츠 Top 10
    const topDramas = await db.collection('dramas')
      .find({})
      .sort({ viewCount: -1 })
      .limit(10)
      .project({ title: 1, viewCount: 1, _id: 0 })
      .toArray();

    const topNews = await db.collection('news')
      .find({})
      .sort({ viewCount: -1 })
      .limit(10)
      .project({ title: 1, viewCount: 1, _id: 0 })
      .toArray();

    // 통계 계산 - dailyTrends의 실제 일별 조회수 합산 사용
    const totalViews = dailyNewsViews.reduce((sum, day) => sum + (day.views || 0), 0);

    const totalContent = (dramaStats[0]?.totalDramas || 0) +
                        (newsStats[0]?.totalNews || 0) +
                        (movieStats[0]?.totalMovies || 0) +
                        (musicStats[0]?.totalMusic || 0);

    // 일별 평균 계산
    const dailyAverage = dailyNewsViews.length > 0
      ? Math.round(totalViews / dailyNewsViews.length)
      : 0;

    // 응답 데이터 구성
    const response = {
      success: true,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days: parseInt(days)
      },
      summary: {
        totalViews,
        totalContent,
        dailyAverage,
        estimatedDailyVisitors: Math.round(dailyAverage * 0.7) // 조회수의 70%를 방문자로 추정
      },
      breakdown: {
        dramas: {
          views: dramaStats[0]?.totalViews || 0,
          count: dramaStats[0]?.totalDramas || 0
        },
        news: {
          views: newsStats[0]?.totalViews || 0,
          count: newsStats[0]?.totalNews || 0
        },
        movies: {
          views: movieStats[0]?.totalViews || 0,
          count: movieStats[0]?.totalMovies || 0
        },
        music: {
          views: musicStats[0]?.totalViews || 0,
          count: musicStats[0]?.totalMusic || 0
        }
      },
      dailyTrends: dailyNewsViews.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        views: item.views,
        articles: item.articles
      })),
      topContent: {
        dramas: topDramas,
        news: topNews
      }
    };

    console.log(`[Analytics] 통계 결과: 총 ${totalViews}회 조회, 일평균 ${dailyAverage}회`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('[Analytics] 방문자 통계 오류:', error);
    return res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
} 