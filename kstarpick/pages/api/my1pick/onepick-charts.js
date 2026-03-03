import { connectToDatabase } from '../../../utils/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  console.log('[onepick-api] Handler called, method:', req.method);

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('[onepick-api] Getting session...');
    const session = await getServerSession(req, res, authOptions);
    console.log('[onepick-api] Session:', session?.user?.role);

    if (!session || session.user?.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('[onepick-api] Connecting to DB...');
    const { db } = await connectToDatabase();
    const { season, chartType } = req.query;
    console.log('[onepick-api] Query params:', { season, chartType });

    // 2026년 이후 데이터만
    const yearFilter = { startAt: { $gte: new Date('2026-01-01') } };

    // 시즌 목록 조회
    const seasons = await db.collection('my1pick_charts').aggregate([
      { $match: yearFilter },
      { $group: {
        _id: '$season',
        startAt: { $min: '$startAt' },
        endAt: { $max: '$endAt' },
        chartCount: { $sum: 1 },
        totalVotes: { $sum: '$totalVotes' }
      }},
      { $sort: { startAt: -1 } }
    ]).toArray();
    console.log('[onepick-api] Seasons found:', seasons.length);

    // 선택된 시즌의 차트 데이터
    const filter = { ...yearFilter };
    if (season) {
      filter.season = season;
    } else if (seasons.length > 0) {
      filter.season = seasons[0]._id;
    }
    if (chartType) {
      filter.chartType = chartType;
    }

    const charts = await db.collection('my1pick_charts')
      .find(filter)
      .sort({ chartTypeOrder: 1 })
      .project({ _id: 0 })
      .toArray();
    console.log('[onepick-api] Charts found:', charts.length);

    return res.status(200).json({
      success: true,
      data: {
        seasons: seasons.map(s => ({
          season: s._id,
          startAt: s.startAt,
          endAt: s.endAt,
          chartCount: s.chartCount,
          totalVotes: s.totalVotes
        })),
        currentSeason: filter.season || null,
        charts
      }
    });

  } catch (error) {
    console.error('[onepick-api] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error.message
    });
  }
}
