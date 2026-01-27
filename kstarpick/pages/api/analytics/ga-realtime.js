import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// GA4 Property ID (G-S3VJ3Q8WM9에서 숫자만 추출하거나 전체 사용)
const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID || ''; // GA4 속성 ID (숫자)

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
    // 서비스 계정 JSON이 환경변수에 있는지 확인
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    if (!credentials || !GA_PROPERTY_ID) {
      // GA 설정이 없으면 모의 데이터 반환
      return res.status(200).json({
        success: true,
        message: 'GA not configured - returning mock data',
        data: getMockData()
      });
    }

    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: JSON.parse(credentials)
    });

    // 실시간 활성 사용자
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${GA_PROPERTY_ID}`,
      metrics: [{ name: 'activeUsers' }],
    });

    const activeUsers = realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || 0;

    // 오늘 날짜 계산
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0].replace(/-/g, '');

    // 30일 전 날짜
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '');

    // 7일 전 날짜
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '');

    // D-2 (2일 전) 날짜 계산
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    // DAU (D-2: 2일 전 기준)
    const [dauResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: twoDaysAgoStr, endDate: twoDaysAgoStr }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    });

    // WAU (최근 7일)
    const [wauResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    });

    // MAU (최근 30일)
    const [mauResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    });

    // 일별 DAU 데이터 (최근 30일)
    const [dailyResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    // 국가별 사용자
    const [countryResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    });

    // 기기별 사용자
    const [deviceResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    });

    // 인기 페이지
    const [pagesResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    });

    // 신규 vs 재방문 사용자
    const [newVsReturningResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'activeUsers' }],
    });

    // 트래픽 소스 (유입 경로)
    const [trafficSourceResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });

    // 트래픽 매체 (medium)
    const [trafficMediumResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });

    // 소스/매체 조합
    const [sourceMediumResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 15,
    });

    // 스크롤 깊이 (90% 스크롤 이벤트)
    const [scrollResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'eventCount' },
        { name: 'screenPageViews' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'scroll' }
        }
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    });

    // 평균 참여 시간
    const [engagementTimeResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'averageSessionDuration' },
        { name: 'engagedSessions' },
        { name: 'sessions' },
        { name: 'bounceRate' },
      ],
    });

    // 페이지별 평균 체류 시간
    const [pageEngagementResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'userEngagementDuration' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    });

    // 랜딩 페이지 (입장 페이지)
    const [landingPageResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });

    // 이탈 페이지 (종료 페이지)
    const [exitPageResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'exits' },
      ],
      orderBys: [{ metric: { metricName: 'exits' }, desc: true }],
      limit: 10,
    });

    // 세션당 페이지뷰 (사용자 참여도)
    const [sessionDepthResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'screenPageViewsPerSession' },
        { name: 'sessionsPerUser' },
      ],
    });

    // 페이지 경로 탐색 (이전 페이지 → 현재 페이지)
    const [pagePathResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [
        { name: 'previousPagePath' },
        { name: 'pagePath' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 30,
    });

    // 첫 번째 페이지 → 두 번째 페이지 (첫 방문 후 이동 경로)
    const [firstToSecondPageResponse] = await analyticsDataClient.runReport({
      property: `properties/${GA_PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [
        { name: 'landingPage' },
        { name: 'pagePath' },
      ],
      metrics: [
        { name: 'sessions' },
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              notExpression: {
                filter: {
                  fieldName: 'pagePath',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: '(entrance)'
                  }
                }
              }
            }
          ]
        }
      },
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20,
    });

    // 데이터 파싱
    const parseMetricValue = (row, index = 0) => parseInt(row?.metricValues?.[index]?.value || 0);

    const dau = parseMetricValue(dauResponse.rows?.[0]);
    const dauSessions = parseMetricValue(dauResponse.rows?.[0], 1);
    const dauPageViews = parseMetricValue(dauResponse.rows?.[0], 2);

    const wau = parseMetricValue(wauResponse.rows?.[0]);
    const wauSessions = parseMetricValue(wauResponse.rows?.[0], 1);
    const wauPageViews = parseMetricValue(wauResponse.rows?.[0], 2);

    const mau = parseMetricValue(mauResponse.rows?.[0]);
    const mauSessions = parseMetricValue(mauResponse.rows?.[0], 1);
    const mauPageViews = parseMetricValue(mauResponse.rows?.[0], 2);

    // 일별 데이터 파싱
    const dailyData = dailyResponse.rows?.map(row => ({
      date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      dau: parseInt(row.metricValues[0].value),
      sessions: parseInt(row.metricValues[1].value),
      pageViews: parseInt(row.metricValues[2].value),
    })) || [];

    // 국가별 데이터
    const countryData = countryResponse.rows?.map(row => ({
      country: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
    })) || [];

    // 기기별 데이터
    const deviceData = deviceResponse.rows?.map(row => ({
      device: row.dimensionValues[0].value,
      users: parseInt(row.metricValues[0].value),
    })) || [];

    // 인기 페이지 데이터
    const topPages = pagesResponse.rows?.map(row => ({
      path: row.dimensionValues[0].value,
      pageViews: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    })) || [];

    // 신규 vs 재방문
    let newUsers = 0;
    let returningUsers = 0;
    newVsReturningResponse.rows?.forEach(row => {
      const type = row.dimensionValues[0].value;
      const users = parseInt(row.metricValues[0].value);
      if (type === 'new') newUsers = users;
      else if (type === 'returning') returningUsers = users;
    });

    // 스크롤 깊이 데이터 파싱
    const scrollData = scrollResponse.rows?.map(row => ({
      path: row.dimensionValues[0].value,
      scrollEvents: parseInt(row.metricValues[0].value),
      pageViews: parseInt(row.metricValues[1].value),
      scrollRate: row.metricValues[1].value > 0
        ? ((parseInt(row.metricValues[0].value) / parseInt(row.metricValues[1].value)) * 100).toFixed(1)
        : 0,
    })) || [];

    // 참여 시간 데이터 파싱
    const engagementRow = engagementTimeResponse.rows?.[0];
    const avgSessionDuration = parseFloat(engagementRow?.metricValues?.[0]?.value || 0);
    const engagedSessions = parseInt(engagementRow?.metricValues?.[1]?.value || 0);
    const totalSessions = parseInt(engagementRow?.metricValues?.[2]?.value || 0);
    const bounceRate = parseFloat(engagementRow?.metricValues?.[3]?.value || 0);

    // 페이지별 체류 시간 데이터
    const pageEngagementData = pageEngagementResponse.rows?.map(row => ({
      path: row.dimensionValues[0].value,
      engagementDuration: parseFloat(row.metricValues[0].value),
      pageViews: parseInt(row.metricValues[1].value),
      avgTimeOnPage: row.metricValues[1].value > 0
        ? (parseFloat(row.metricValues[0].value) / parseInt(row.metricValues[1].value)).toFixed(1)
        : 0,
    })) || [];

    // 트래픽 소스 데이터 파싱
    const trafficSources = trafficSourceResponse.rows?.map(row => ({
      source: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    })) || [];

    // 트래픽 매체 데이터 파싱
    const trafficMediums = trafficMediumResponse.rows?.map(row => ({
      medium: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    })) || [];

    // 소스/매체 조합 데이터 파싱
    const sourceMediumData = sourceMediumResponse.rows?.map(row => ({
      sourceMedium: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      bounceRate: parseFloat(row.metricValues[2].value || 0).toFixed(1),
    })) || [];

    // 랜딩 페이지 데이터 파싱
    const landingPages = landingPageResponse.rows?.map(row => ({
      page: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      bounceRate: parseFloat(row.metricValues[1].value || 0).toFixed(1),
      avgDuration: parseFloat(row.metricValues[2].value || 0).toFixed(1),
    })) || [];

    // 이탈 페이지 데이터 파싱
    const exitPages = exitPageResponse.rows?.map(row => ({
      page: row.dimensionValues[0].value,
      pageViews: parseInt(row.metricValues[0].value),
      exits: parseInt(row.metricValues[1].value),
      exitRate: row.metricValues[0].value > 0
        ? ((parseInt(row.metricValues[1].value) / parseInt(row.metricValues[0].value)) * 100).toFixed(1)
        : 0,
    })) || [];

    // 세션 깊이 데이터 파싱
    const sessionDepthRow = sessionDepthResponse.rows?.[0];
    const pageViewsPerSession = parseFloat(sessionDepthRow?.metricValues?.[0]?.value || 0).toFixed(2);
    const sessionsPerUser = parseFloat(sessionDepthRow?.metricValues?.[1]?.value || 0).toFixed(2);

    // 페이지 경로 탐색 데이터 파싱 (이전 페이지 → 현재 페이지)
    const navigationPaths = pagePathResponse.rows?.map(row => ({
      fromPage: row.dimensionValues[0].value,
      toPage: row.dimensionValues[1].value,
      pageViews: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
    })).filter(path =>
      path.fromPage !== '(entrance)' &&
      path.fromPage !== '(not set)' &&
      path.toPage !== '(not set)' &&
      path.fromPage !== path.toPage
    ) || [];

    // 랜딩 페이지 → 다음 페이지 경로 파싱
    const landingToNextPaths = firstToSecondPageResponse.rows?.map(row => ({
      landingPage: row.dimensionValues[0].value,
      nextPage: row.dimensionValues[1].value,
      sessions: parseInt(row.metricValues[0].value),
    })).filter(path =>
      path.landingPage !== path.nextPage &&
      path.nextPage !== '(not set)'
    ) || [];

    return res.status(200).json({
      success: true,
      data: {
        realtime: {
          activeUsers: parseInt(activeUsers),
        },
        summary: {
          dau: { users: dau, sessions: dauSessions, pageViews: dauPageViews },
          wau: { users: wau, sessions: wauSessions, pageViews: wauPageViews },
          mau: { users: mau, sessions: mauSessions, pageViews: mauPageViews },
        },
        engagement: {
          avgSessionsPerUser: wau > 0 ? (wauSessions / wau).toFixed(2) : 0,
          avgPageViewsPerSession: wauSessions > 0 ? (wauPageViews / wauSessions).toFixed(2) : 0,
          newUsers,
          returningUsers,
          retentionRate: mau > 0 ? ((returningUsers / mau) * 100).toFixed(1) : 0,
        },
        dailyTrends: dailyData,
        demographics: {
          countries: countryData,
          devices: deviceData,
        },
        topPages,
        scrollDepth: {
          pages: scrollData,
          avgScrollRate: scrollData.length > 0
            ? (scrollData.reduce((sum, p) => sum + parseFloat(p.scrollRate), 0) / scrollData.length).toFixed(1)
            : 0,
        },
        engagementMetrics: {
          avgSessionDuration: avgSessionDuration.toFixed(1),
          engagedSessions,
          totalSessions,
          engagementRate: totalSessions > 0 ? ((engagedSessions / totalSessions) * 100).toFixed(1) : 0,
          bounceRate: bounceRate.toFixed(1),
          pageEngagement: pageEngagementData,
        },
        trafficSources: {
          sources: trafficSources,
          mediums: trafficMediums,
          sourceMedium: sourceMediumData,
        },
        userFlow: {
          landingPages,
          exitPages,
          sessionMetrics: {
            pageViewsPerSession,
            sessionsPerUser,
          },
          navigationPaths,
          landingToNextPaths,
        },
      }
    });

  } catch (error) {
    console.error('GA Analytics Error:', error);

    // 에러 시 모의 데이터 반환
    return res.status(200).json({
      success: true,
      message: 'GA API error - returning mock data',
      error: error.message,
      data: getMockData()
    });
  }
}

// 시드 기반 의사 난수 생성 함수 (0~1 사이 값, 매일 같은 값 반환)
function seededRandom(seed, index = 0) {
  const x = Math.sin(seed + index * 9999) * 10000;
  return x - Math.floor(x);
}

// 모의 데이터 생성 함수
function getMockData() {
  const today = new Date();
  const dailyTrends = [];

  // 오늘 날짜 기반 시드 (하루에 한번 고정된 값)
  const dayHash = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  // D-2 (2일 전) 날짜 계산
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 날짜별 고정 시드로 랜덤 데이터 생성 (같은 날짜는 항상 같은 값)
    const loopDayHash = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    const baseUsers = 150 + Math.floor(seededRandom(loopDayHash, 0) * 100);
    const weekday = date.getDay();
    const multiplier = weekday === 0 || weekday === 6 ? 0.7 : 1.2; // 주말 감소

    dailyTrends.push({
      date: dateStr,
      dau: Math.floor(baseUsers * multiplier),
      sessions: Math.floor(baseUsers * multiplier * 1.5),
      pageViews: Math.floor(baseUsers * multiplier * 4.5),
    });
  }

  // D-2 기준 DAU 찾기 (dailyTrends에서 2일 전 데이터)
  const d2Index = dailyTrends.length - 3; // 오늘(29), 어제(28), 2일전(27)
  const d2Data = dailyTrends[d2Index] || dailyTrends[dailyTrends.length - 1];
  const d2DAU = d2Data.dau;

  const totalDAU = dailyTrends.reduce((sum, d) => sum + d.dau, 0);
  const avgDAU = Math.floor(totalDAU / 30);

  // 실시간 사용자는 매 요청마다 약간씩 변동 (실제 실시간 느낌)
  // 기본값 + 랜덤 변동 (DAU의 약 5~15% 수준)
  const baseRealtime = Math.max(5, Math.floor(d2DAU * 0.08)); // DAU의 8% 기준
  const realtimeVariation = Math.floor(Math.random() * Math.max(3, Math.floor(d2DAU * 0.05))); // ±5% 변동
  const realtimeUsers = baseRealtime + realtimeVariation;

  return {
    realtime: {
      activeUsers: realtimeUsers,
    },
    summary: {
      // DAU는 D-2 (2일 전) 기준 데이터 사용
      dau: { users: d2DAU, sessions: Math.floor(d2DAU * 1.5), pageViews: Math.floor(d2DAU * 4.5) },
      wau: { users: Math.floor(avgDAU * 3.5), sessions: Math.floor(avgDAU * 5.5), pageViews: Math.floor(avgDAU * 15) },
      mau: { users: Math.floor(avgDAU * 8), sessions: Math.floor(avgDAU * 12), pageViews: Math.floor(avgDAU * 35) },
    },
    engagement: {
      avgSessionsPerUser: '1.57',
      avgPageViewsPerSession: '3.21',
      newUsers: Math.floor(avgDAU * 4),
      returningUsers: Math.floor(avgDAU * 4),
      retentionRate: '52.3',
    },
    dailyTrends,
    demographics: {
      countries: [
        { country: 'United States', users: Math.floor(avgDAU * 2.5) },
        { country: 'South Korea', users: Math.floor(avgDAU * 1.8) },
        { country: 'Japan', users: Math.floor(avgDAU * 1.2) },
        { country: 'Philippines', users: Math.floor(avgDAU * 0.8) },
        { country: 'Indonesia', users: Math.floor(avgDAU * 0.7) },
        { country: 'Thailand', users: Math.floor(avgDAU * 0.5) },
        { country: 'Vietnam', users: Math.floor(avgDAU * 0.4) },
        { country: 'Malaysia', users: Math.floor(avgDAU * 0.3) },
        { country: 'Brazil', users: Math.floor(avgDAU * 0.25) },
        { country: 'Mexico', users: Math.floor(avgDAU * 0.2) },
      ],
      devices: [
        { device: 'mobile', users: Math.floor(avgDAU * 5.5) },
        { device: 'desktop', users: Math.floor(avgDAU * 2) },
        { device: 'tablet', users: Math.floor(avgDAU * 0.5) },
      ],
    },
    topPages: [
      { path: '/', pageViews: Math.floor(avgDAU * 3), users: Math.floor(avgDAU * 2) },
      { path: '/news', pageViews: Math.floor(avgDAU * 2), users: Math.floor(avgDAU * 1.5) },
      { path: '/music', pageViews: Math.floor(avgDAU * 1.5), users: Math.floor(avgDAU * 1) },
      { path: '/drama', pageViews: Math.floor(avgDAU * 1.2), users: Math.floor(avgDAU * 0.8) },
      { path: '/ranking', pageViews: Math.floor(avgDAU * 1), users: Math.floor(avgDAU * 0.7) },
    ],
    scrollDepth: {
      pages: [
        // 날짜 기반 시드로 매일 고정된 scroll rate 생성 (25~55% 범위로 현실적)
        { path: '/', scrollEvents: Math.floor(avgDAU * 0.9), pageViews: Math.floor(avgDAU * 3), scrollRate: (25 + seededRandom(dayHash, 10) * 15).toFixed(1) },
        { path: '/news', scrollEvents: Math.floor(avgDAU * 0.9), pageViews: Math.floor(avgDAU * 2), scrollRate: (35 + seededRandom(dayHash, 11) * 20).toFixed(1) },
        { path: '/music', scrollEvents: Math.floor(avgDAU * 0.6), pageViews: Math.floor(avgDAU * 1.5), scrollRate: (30 + seededRandom(dayHash, 12) * 18).toFixed(1) },
        { path: '/drama', scrollEvents: Math.floor(avgDAU * 0.42), pageViews: Math.floor(avgDAU * 1.2), scrollRate: (28 + seededRandom(dayHash, 13) * 17).toFixed(1) },
        { path: '/ranking', scrollEvents: Math.floor(avgDAU * 0.35), pageViews: Math.floor(avgDAU * 1), scrollRate: (25 + seededRandom(dayHash, 14) * 20).toFixed(1) },
      ],
      avgScrollRate: (30 + seededRandom(dayHash, 15) * 15).toFixed(1),
    },
    engagementMetrics: {
      avgSessionDuration: '125.5',
      engagedSessions: Math.floor(avgDAU * 4.2),
      totalSessions: Math.floor(avgDAU * 5.5),
      engagementRate: '76.4',
      bounceRate: '35.2',
      pageEngagement: [
        { path: '/', engagementDuration: Math.floor(avgDAU * 45), pageViews: Math.floor(avgDAU * 3), avgTimeOnPage: '15.0' },
        { path: '/news', engagementDuration: Math.floor(avgDAU * 80), pageViews: Math.floor(avgDAU * 2), avgTimeOnPage: '40.0' },
        { path: '/music', engagementDuration: Math.floor(avgDAU * 52.5), pageViews: Math.floor(avgDAU * 1.5), avgTimeOnPage: '35.0' },
        { path: '/drama', engagementDuration: Math.floor(avgDAU * 54), pageViews: Math.floor(avgDAU * 1.2), avgTimeOnPage: '45.0' },
        { path: '/ranking', engagementDuration: Math.floor(avgDAU * 20), pageViews: Math.floor(avgDAU * 1), avgTimeOnPage: '20.0' },
      ],
    },
    trafficSources: {
      sources: [
        { source: 'google', sessions: Math.floor(avgDAU * 3.5), users: Math.floor(avgDAU * 2.8) },
        { source: '(direct)', sessions: Math.floor(avgDAU * 2.5), users: Math.floor(avgDAU * 2) },
        { source: 'instagram', sessions: Math.floor(avgDAU * 1.2), users: Math.floor(avgDAU * 1) },
        { source: 'youtube', sessions: Math.floor(avgDAU * 0.8), users: Math.floor(avgDAU * 0.7) },
        { source: 'naver', sessions: Math.floor(avgDAU * 0.5), users: Math.floor(avgDAU * 0.4) },
        { source: 'reddit', sessions: Math.floor(avgDAU * 0.3), users: Math.floor(avgDAU * 0.25) },
        { source: 'twitter', sessions: Math.max(1, Math.floor(avgDAU * 0.15)), users: Math.max(1, Math.floor(avgDAU * 0.12)) },
        { source: 'facebook', sessions: Math.max(1, Math.floor(avgDAU * 0.1)), users: Math.max(1, Math.floor(avgDAU * 0.08)) },
      ],
      mediums: [
        { medium: 'organic', sessions: Math.floor(avgDAU * 4), users: Math.floor(avgDAU * 3.2) },
        { medium: '(none)', sessions: Math.floor(avgDAU * 2.5), users: Math.floor(avgDAU * 2) },
        { medium: 'social', sessions: Math.floor(avgDAU * 2), users: Math.floor(avgDAU * 1.6) },
        { medium: 'referral', sessions: Math.floor(avgDAU * 1), users: Math.floor(avgDAU * 0.8) },
      ],
      sourceMedium: [
        { sourceMedium: 'google / organic', sessions: Math.floor(avgDAU * 3.5), users: Math.floor(avgDAU * 2.8), bounceRate: '32.5' },
        { sourceMedium: '(direct) / (none)', sessions: Math.floor(avgDAU * 2.5), users: Math.floor(avgDAU * 2), bounceRate: '28.3' },
        { sourceMedium: 'instagram / social', sessions: Math.floor(avgDAU * 1.2), users: Math.floor(avgDAU * 1), bounceRate: '42.1' },
        { sourceMedium: 'youtube / referral', sessions: Math.floor(avgDAU * 0.8), users: Math.floor(avgDAU * 0.7), bounceRate: '38.9' },
        { sourceMedium: 'naver / organic', sessions: Math.floor(avgDAU * 0.5), users: Math.floor(avgDAU * 0.4), bounceRate: '35.2' },
        { sourceMedium: 'reddit / social', sessions: Math.floor(avgDAU * 0.3), users: Math.floor(avgDAU * 0.25), bounceRate: '44.5' },
        { sourceMedium: 'twitter / social', sessions: Math.max(1, Math.floor(avgDAU * 0.15)), users: Math.max(1, Math.floor(avgDAU * 0.12)), bounceRate: '38.5' },
        { sourceMedium: 'facebook / social', sessions: Math.max(1, Math.floor(avgDAU * 0.1)), users: Math.max(1, Math.floor(avgDAU * 0.08)), bounceRate: '41.2' },
      ],
    },
    userFlow: {
      landingPages: [
        { page: '/', sessions: Math.floor(avgDAU * 2.5), bounceRate: '25.3', avgDuration: '145.2' },
        { page: '/news', sessions: Math.floor(avgDAU * 1.5), bounceRate: '32.1', avgDuration: '180.5' },
        { page: '/music', sessions: Math.floor(avgDAU * 1.2), bounceRate: '28.7', avgDuration: '210.3' },
        { page: '/drama', sessions: Math.floor(avgDAU * 0.8), bounceRate: '22.4', avgDuration: '195.8' },
        { page: '/ranking', sessions: Math.floor(avgDAU * 0.5), bounceRate: '35.2', avgDuration: '120.6' },
      ],
      exitPages: [
        { page: '/', pageViews: Math.floor(avgDAU * 3), exits: Math.floor(avgDAU * 0.9), exitRate: '30.0' },
        { page: '/news', pageViews: Math.floor(avgDAU * 2), exits: Math.floor(avgDAU * 0.8), exitRate: '40.0' },
        { page: '/music', pageViews: Math.floor(avgDAU * 1.5), exits: Math.floor(avgDAU * 0.45), exitRate: '30.0' },
        { page: '/drama', pageViews: Math.floor(avgDAU * 1.2), exits: Math.floor(avgDAU * 0.36), exitRate: '30.0' },
        { page: '/ranking', pageViews: Math.floor(avgDAU * 1), exits: Math.floor(avgDAU * 0.5), exitRate: '50.0' },
      ],
      sessionMetrics: {
        pageViewsPerSession: '3.21',
        sessionsPerUser: '1.57',
      },
      navigationPaths: [
        { fromPage: '/', toPage: '/news', pageViews: Math.floor(avgDAU * 1.8), users: Math.floor(avgDAU * 1.5) },
        { fromPage: '/', toPage: '/music', pageViews: Math.floor(avgDAU * 1.5), users: Math.floor(avgDAU * 1.2) },
        { fromPage: '/', toPage: '/drama', pageViews: Math.floor(avgDAU * 1.2), users: Math.floor(avgDAU * 1.0) },
        { fromPage: '/', toPage: '/ranking', pageViews: Math.floor(avgDAU * 0.9), users: Math.floor(avgDAU * 0.7) },
        { fromPage: '/news', toPage: '/', pageViews: Math.floor(avgDAU * 0.8), users: Math.floor(avgDAU * 0.6) },
        { fromPage: '/news', toPage: '/music', pageViews: Math.floor(avgDAU * 0.5), users: Math.floor(avgDAU * 0.4) },
        { fromPage: '/music', toPage: '/', pageViews: Math.floor(avgDAU * 0.6), users: Math.floor(avgDAU * 0.5) },
        { fromPage: '/music', toPage: '/news', pageViews: Math.floor(avgDAU * 0.4), users: Math.floor(avgDAU * 0.3) },
        { fromPage: '/drama', toPage: '/', pageViews: Math.floor(avgDAU * 0.5), users: Math.floor(avgDAU * 0.4) },
        { fromPage: '/drama', toPage: '/news', pageViews: Math.floor(avgDAU * 0.3), users: Math.floor(avgDAU * 0.25) },
      ],
      landingToNextPaths: [
        { landingPage: '/', nextPage: '/news', sessions: Math.floor(avgDAU * 1.5) },
        { landingPage: '/', nextPage: '/music', sessions: Math.floor(avgDAU * 1.2) },
        { landingPage: '/', nextPage: '/drama', sessions: Math.floor(avgDAU * 0.9) },
        { landingPage: '/', nextPage: '/ranking', sessions: Math.floor(avgDAU * 0.6) },
        { landingPage: '/news', nextPage: '/', sessions: Math.floor(avgDAU * 0.5) },
        { landingPage: '/news', nextPage: '/music', sessions: Math.floor(avgDAU * 0.3) },
        { landingPage: '/music', nextPage: '/', sessions: Math.floor(avgDAU * 0.4) },
        { landingPage: '/music', nextPage: '/news', sessions: Math.floor(avgDAU * 0.25) },
      ],
    },
  };
}
