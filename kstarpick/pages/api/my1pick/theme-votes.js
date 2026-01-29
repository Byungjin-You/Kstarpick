import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { query } from '../../../lib/my1pick-db';

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
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Season Chart 투표만 필터링
    let whereConditions = ["vc.title LIKE '%season chart%'"];
    let params = [];

    // 상태 필터 (진행중/종료/예정)
    if (status === 'ongoing') {
      whereConditions.push("NOW() BETWEEN vc.start_at AND vc.end_at AND vc.states = 'Y'");
    } else if (status === 'ended') {
      whereConditions.push('vc.end_at < NOW()');
    } else if (status === 'scheduled') {
      whereConditions.push('vc.start_at > NOW()');
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // 1. 캠페인 목록 조회 (간단한 쿼리)
    const listSql = `
      SELECT
        vc.idx,
        vc.title,
        vc.states,
        vc.start_at,
        vc.end_at,
        CASE
          WHEN NOW() < vc.start_at THEN 'scheduled'
          WHEN NOW() BETWEEN vc.start_at AND vc.end_at AND vc.states = 'Y' THEN 'ongoing'
          ELSE 'ended'
        END as computed_status
      FROM vote_campaign vc
      ${whereClause}
      ORDER BY vc.idx DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    const campaigns = await query(listSql, params);

    if (campaigns.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          campaigns: [],
          pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 },
          stats: { scheduled: 0, ongoing: 0, ended: 0 }
        }
      });
    }

    // 2. 캠페인 idx 목록 추출
    const campaignIds = campaigns.map(c => c.idx);

    // 3. 한 번에 모든 후보자 데이터 조회 (report_vote_detail_daily만 사용 - season chart는 최근 데이터)
    const candidatesSql = `
      SELECT
        vote_campaign_idx as campaign_idx,
        star_idx as idx,
        star_name as candidate_name,
        group_name as candidate_group_name,
        SUM(vote_count) as total_vote
      FROM report_vote_detail_daily
      WHERE vote_campaign_idx IN (${campaignIds.join(',')})
      GROUP BY vote_campaign_idx, star_idx, star_name, group_name
      ORDER BY vote_campaign_idx, total_vote DESC
    `;
    const allCandidates = await query(candidatesSql, []);

    // 4. 캠페인별로 후보자 매핑 (상위 20명만)
    const candidatesByCampaign = {};
    for (const candidate of allCandidates) {
      const cid = candidate.campaign_idx;
      if (!candidatesByCampaign[cid]) {
        candidatesByCampaign[cid] = [];
      }
      if (candidatesByCampaign[cid].length < 20) {
        candidatesByCampaign[cid].push(candidate);
      }
    }

    // 5. 캠페인에 후보자 정보 추가
    const campaignsWithDetails = campaigns.map(campaign => ({
      ...campaign,
      candidates: candidatesByCampaign[campaign.idx] || [],
      candidate_count: (candidatesByCampaign[campaign.idx] || []).length
    }));

    // 6. 총 개수 및 통계 (Season Chart만)
    const statsSql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN NOW() < start_at THEN 1 ELSE 0 END) as scheduled_count,
        SUM(CASE WHEN NOW() BETWEEN start_at AND end_at AND states = 'Y' THEN 1 ELSE 0 END) as ongoing_count,
        SUM(CASE WHEN end_at < NOW() THEN 1 ELSE 0 END) as ended_count
      FROM vote_campaign
      WHERE title LIKE '%season chart%'
    `;
    const statsResult = await query(statsSql, []);
    const stats = statsResult[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        campaigns: campaignsWithDetails,
        pagination: {
          total: parseInt(stats.total) || 0,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil((parseInt(stats.total) || 0) / limitNum)
        },
        stats: {
          scheduled: parseInt(stats.scheduled_count) || 0,
          ongoing: parseInt(stats.ongoing_count) || 0,
          ended: parseInt(stats.ended_count) || 0
        }
      }
    });

  } catch (error) {
    console.error('My1Pick Theme Votes Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database error',
      error: error.message
    });
  }
}
