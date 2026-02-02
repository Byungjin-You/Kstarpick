import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// S3에서 월별 데이터 가져오기
async function fetchMonthData(yearMonth) {
  const url = `https://my1pick.s3.ap-northeast-2.amazonaws.com/kstarpick/prd-ranking-${yearMonth}.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`[theme-votes] No data for ${yearMonth}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`[theme-votes] Failed to fetch ${yearMonth}:`, error.message);
    return null;
  }
}

// 여러 월의 데이터 가져오기
async function fetchMultipleMonths(months) {
  const promises = months.map(month => fetchMonthData(month));
  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
}

// 최근 N개월 목록 생성
function getRecentMonths(count = 6) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }
  return months;
}

// 타입 코드를 라벨로 변환
const TYPE_LABELS = {
  'S': 'SOLO',
  'G': 'GROUP',
  'T': 'TROT',
  'C': 'CELEBRITY',
  'L': 'GLOBAL'
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // 인증 확인
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { status, page = 1, limit = 20, month, type } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    // 특정 월 지정 또는 최근 6개월
    let monthsToFetch;
    if (month) {
      monthsToFetch = [month];
    } else {
      monthsToFetch = getRecentMonths(6);
    }

    // S3에서 데이터 가져오기
    const allMonthData = await fetchMultipleMonths(monthsToFetch);

    if (allMonthData.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          campaigns: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
          stats: { scheduled: 0, ongoing: 0, ended: 0 },
          types: Object.entries(TYPE_LABELS).map(([code, label]) => ({ code, label }))
        }
      });
    }

    // 모든 캠페인을 하나의 배열로 변환
    let allCampaigns = [];

    for (const monthData of allMonthData) {
      for (const typeData of monthData.types || []) {
        for (const campaign of typeData.campaigns || []) {
          const now = new Date();
          const startAt = new Date(campaign.startAt);
          const endAt = new Date(campaign.endAt);

          // 상태 계산
          let computedStatus;
          if (now < startAt) {
            computedStatus = 'scheduled';
          } else if (now >= startAt && now <= endAt) {
            computedStatus = 'ongoing';
          } else {
            computedStatus = 'ended';
          }

          // 후보자 데이터 변환
          const candidates = (campaign.rankings || []).map((r, idx) => ({
            idx: r.starIdx || idx + 1,
            candidate_name: r.name,
            candidate_group_name: r.groupName || '',
            total_vote: r.total_vote,
            rank: r.rank,
            prev_rank: r.prevRanking
          }));

          allCampaigns.push({
            idx: campaign.campaignIdx,
            title: campaign.title,
            type_code: typeData.type,
            type_label: typeData.label,
            states: computedStatus === 'ongoing' ? 'Y' : 'N',
            start_at: campaign.startAt,
            end_at: campaign.endAt,
            computed_status: computedStatus,
            candidates: candidates,
            candidate_count: candidates.length,
            month: monthData.month
          });
        }
      }
    }

    // 타입 필터
    if (type) {
      allCampaigns = allCampaigns.filter(c => c.type_code === type);
    }

    // 상태 필터
    if (status && status !== 'all') {
      allCampaigns = allCampaigns.filter(c => c.computed_status === status);
    }

    // 정렬 (최신순)
    allCampaigns.sort((a, b) => new Date(b.start_at) - new Date(a.start_at));

    // 통계 계산
    const stats = {
      scheduled: allCampaigns.filter(c => c.computed_status === 'scheduled').length,
      ongoing: allCampaigns.filter(c => c.computed_status === 'ongoing').length,
      ended: allCampaigns.filter(c => c.computed_status === 'ended').length
    };

    // 페이지네이션
    const total = allCampaigns.length;
    const totalPages = Math.ceil(total / limitNum);
    const offset = (pageNum - 1) * limitNum;
    const paginatedCampaigns = allCampaigns.slice(offset, offset + limitNum);

    return res.status(200).json({
      success: true,
      data: {
        campaigns: paginatedCampaigns,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages
        },
        stats,
        types: Object.entries(TYPE_LABELS).map(([code, label]) => ({ code, label })),
        months: monthsToFetch,
        generatedAt: allMonthData[0]?.generatedAt
      }
    });

  } catch (error) {
    console.error('My1Pick Theme Votes Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error.message
    });
  }
}
