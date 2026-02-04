import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import {
  Newspaper,
  Film,
  Music,
  Users,
  Plus,
  PenTool,
  Video,
  Eye,
  MessageCircle,
  Activity,
  AlertCircle,
  Trash2,
  Star,
  ChevronDown,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  UserPlus,
  UserCheck,
  RefreshCw,
  BarChart3,
  Zap,
  FileText,
  ArrowDown,
  Clock,
  MousePointer,
  Share2,
  ExternalLink,
  Search,
  TrendingUp,
  Database,
  Server,
  CheckCircle2,
  XCircle,
  Flame,
  Calendar,
  Layers
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [dramas, setDramas] = useState([]);
  const [dramaLoading, setDramaLoading] = useState(false);
  const [dramaError, setDramaError] = useState('');
  const [stats, setStats] = useState({
    music: 0,
    dramas: 0,
    films: 0,
    celebs: 0,
    musicToday: 0,
    dramasToday: 0,
    filmsToday: 0,
    celebsToday: 0,
    views: 0,
    likes: 0,
    comments: 0,
    users: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [gaData, setGaData] = useState(null);
  const [gaLoading, setGaLoading] = useState(false);
  const [isUserAnalyticsOpen, setIsUserAnalyticsOpen] = useState(true);
  const [chartTooltip, setChartTooltip] = useState({ visible: false, x: 0, y: 0, date: '', value: 0 });
  const [dataMultiplier, setDataMultiplier] = useState(1);
  const [isMultiplierOpen, setIsMultiplierOpen] = useState(false);
  const [isSavingMultiplier, setIsSavingMultiplier] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardStatsLoading, setDashboardStatsLoading] = useState(false);

  // 배율 설정을 변경할 수 있는 슈퍼 관리자 이메일
  const SUPER_ADMIN_EMAIL = 'y@fsn.co.kr';
  const isSuperAdmin = session?.user?.email === SUPER_ADMIN_EMAIL;

  // 배율 값 서버에서 불러오기
  useEffect(() => {
    const fetchMultiplier = async () => {
      try {
        const response = await fetch('/api/admin/settings', {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success && data.multiplier) {
          setDataMultiplier(data.multiplier);
        }
      } catch (error) {
        console.error('Error fetching multiplier:', error);
      }
    };

    if (session?.user?.role === 'admin') {
      fetchMultiplier();
    }
  }, [session]);

  // 배율 값 변경 시 서버에 저장 (슈퍼 관리자만 가능)
  const handleMultiplierChange = async (value) => {
    const newValue = Math.max(1, Math.min(1000, Number(value) || 1));
    setDataMultiplier(newValue);

    // 슈퍼 관리자만 서버에 저장
    if (isSuperAdmin) {
      setIsSavingMultiplier(true);
      try {
        await fetch('/api/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ multiplier: newValue }),
        });
      } catch (error) {
        console.error('Error saving multiplier:', error);
      } finally {
        setIsSavingMultiplier(false);
      }
    }
  };

  // 배율이 적용된 데이터 계산 + 날짜/DAU 기반 비율 변동
  const getScaledData = () => {
    if (!gaData) return null;

    const scale = (value) => Math.round(value * dataMultiplier);

    // DAU 값 (D-2 기준, 배율 적용 전 원본 값)
    const rawDAU = gaData.summary?.dau?.users || 100;
    // 배율 적용된 DAU
    const scaledDAU = rawDAU * dataMultiplier;

    // 날짜 + DAU 기반 시드 생성 (DAU가 바뀌면 데이터도 변동)
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    // DAU를 시드에 포함 (DAU 변화에 따라 다른 변동값)
    const dauSeed = dateSeed + Math.floor(scaledDAU);

    // 시드 기반 의사 난수 생성 함수 (0~1 사이 값)
    const seededRandom = (seed, index = 0) => {
      const x = Math.sin(seed + index * 9999) * 10000;
      return x - Math.floor(x);
    };

    // 비율 값에 변동 적용 함수 (기본값, 변동범위%, DAU보정 활성화 여부)
    const varyRate = (baseValue, variationPercent = 10, index = 0, dauBoost = true) => {
      const base = parseFloat(baseValue) || 0;
      // DAU 기반 랜덤 변동 (-variationPercent ~ +variationPercent)
      const randomVariation = (seededRandom(dauSeed, index) - 0.5) * 2 * variationPercent;
      // DAU 기반 보정 (DAU가 높을수록 약간의 참여율 상승)
      const dauBoostFactor = dauBoost && scaledDAU > 100
        ? Math.min(5, Math.log10(scaledDAU / 100) * 3) // 최대 5% 추가 상승
        : 0;
      const newValue = base + randomVariation + dauBoostFactor;
      // 범위 제한 (0~100 사이)
      return Math.max(0, Math.min(100, newValue)).toFixed(1);
    };

    // 시간 값에 변동 적용 (초 단위)
    const varyTime = (baseValue, variationPercent = 15, index = 0) => {
      const base = parseFloat(baseValue) || 0;
      const randomVariation = (seededRandom(dauSeed, index + 100) - 0.5) * 2 * variationPercent / 100;
      const newValue = base * (1 + randomVariation);
      return Math.max(1, newValue).toFixed(2);
    };

    // 세션당 페이지뷰 등 소수점 값 변동
    const varyDecimal = (baseValue, variationPercent = 10, index = 0) => {
      const base = parseFloat(baseValue) || 0;
      const randomVariation = (seededRandom(dauSeed, index + 200) - 0.5) * 2 * variationPercent / 100;
      const newValue = base * (1 + randomVariation);
      return Math.max(0.1, newValue).toFixed(2);
    };

    return {
      ...gaData,
      realtime: {
        activeUsers: scale(gaData.realtime.activeUsers),
      },
      summary: {
        dau: {
          users: scale(gaData.summary.dau.users),
          sessions: scale(gaData.summary.dau.sessions),
          pageViews: scale(gaData.summary.dau.pageViews),
        },
        wau: {
          users: scale(gaData.summary.wau.users),
          sessions: scale(gaData.summary.wau.sessions),
          pageViews: scale(gaData.summary.wau.pageViews),
        },
        mau: {
          users: scale(gaData.summary.mau.users),
          sessions: scale(gaData.summary.mau.sessions),
          pageViews: scale(gaData.summary.mau.pageViews),
        },
      },
      engagement: {
        ...gaData.engagement,
        newUsers: scale(gaData.engagement.newUsers),
        returningUsers: scale(gaData.engagement.returningUsers),
        avgSessionsPerUser: varyDecimal(gaData.engagement.avgSessionsPerUser, 8, 1),
        avgPageViewsPerSession: varyDecimal(gaData.engagement.avgPageViewsPerSession, 8, 2),
        retentionRate: varyRate(gaData.engagement.retentionRate, 5, 3, true),
      },
      dailyTrends: gaData.dailyTrends?.filter(day => {
        // 오늘 날짜 제외 (오늘 데이터는 불완전하므로)
        const today = new Date().toISOString().split('T')[0];
        return day.date !== today;
      }).map((day, i) => ({
        ...day,
        dau: scale(day.dau),
        sessions: scale(day.sessions),
        pageViews: scale(day.pageViews),
      })),
      demographics: {
        countries: gaData.demographics.countries?.map(c => ({
          ...c,
          users: scale(c.users),
        })),
        devices: gaData.demographics.devices?.map(d => ({
          ...d,
          users: scale(d.users),
        })),
      },
      topPages: gaData.topPages?.map(p => ({
        ...p,
        pageViews: scale(p.pageViews),
        users: scale(p.users),
      })),
      scrollDepth: {
        ...gaData.scrollDepth,
        avgScrollRate: varyRate(gaData.scrollDepth?.avgScrollRate, 8, 10),
        pages: gaData.scrollDepth?.pages?.map((p, i) => ({
          ...p,
          scrollEvents: scale(p.scrollEvents),
          pageViews: scale(p.pageViews),
          scrollRate: varyRate(p.scrollRate, 10, 20 + i),
        })),
      },
      engagementMetrics: {
        ...gaData.engagementMetrics,
        avgSessionDuration: varyTime(gaData.engagementMetrics?.avgSessionDuration, 12, 30),
        engagementRate: varyRate(gaData.engagementMetrics?.engagementRate, 8, 31, true),
        bounceRate: varyRate(gaData.engagementMetrics?.bounceRate, 8, 32, false), // 바운스율은 DAU 부스트 적용 안함
        engagedSessions: scale(gaData.engagementMetrics?.engagedSessions || 0),
        totalSessions: scale(gaData.engagementMetrics?.totalSessions || 0),
        pageEngagement: gaData.engagementMetrics?.pageEngagement?.map((p, i) => ({
          ...p,
          engagementDuration: scale(p.engagementDuration),
          pageViews: scale(p.pageViews),
          avgTimeOnPage: varyTime(p.avgTimeOnPage, 15, 40 + i),
        })),
      },
      trafficSources: {
        sources: gaData.trafficSources?.sources?.map((s, i) => ({
          ...s,
          sessions: scale(s.sessions),
          users: scale(s.users),
        })),
        mediums: gaData.trafficSources?.mediums?.map((m, i) => ({
          ...m,
          sessions: scale(m.sessions),
          users: scale(m.users),
        })),
        sourceMedium: gaData.trafficSources?.sourceMedium?.map((sm, i) => ({
          ...sm,
          sessions: scale(sm.sessions),
          users: scale(sm.users),
          bounceRate: varyRate(sm.bounceRate, 10, 60 + i, false),
        })),
      },
      userFlow: {
        landingPages: gaData.userFlow?.landingPages?.map((lp) => ({
          ...lp,
          sessions: scale(lp.sessions),
          // bounceRate는 sessions 수와 무관한 독립적인 비율이므로 원본 값 유지
          bounceRate: lp.bounceRate,
        })),
        exitPages: gaData.userFlow?.exitPages?.map((ep, i) => {
          const scaledPageViews = scale(ep.pageViews);
          const scaledExits = scale(ep.exits);
          // scale 적용 후 비율 재계산
          const calculatedExitRate = scaledPageViews > 0 ? ((scaledExits / scaledPageViews) * 100).toFixed(1) : '0.0';
          return {
            ...ep,
            pageViews: scaledPageViews,
            exits: scaledExits,
            exitRate: calculatedExitRate,
          };
        }),
        sessionMetrics: gaData.userFlow?.sessionMetrics,
        navigationPaths: gaData.userFlow?.navigationPaths?.map(np => ({
          ...np,
          pageViews: scale(np.pageViews),
          users: scale(np.users),
        })).sort((a, b) => b.pageViews - a.pageViews), // pageViews 기준 내림차순 정렬
        landingToNextPaths: gaData.userFlow?.landingToNextPaths?.map(lnp => ({
          ...lnp,
          sessions: scale(lnp.sessions),
        })).sort((a, b) => b.sessions - a.sessions), // sessions 기준 내림차순 정렬
      },

      // 새로운 데이터 섹션들
      hourlyTraffic: gaData.hourlyTraffic ? {
        ...gaData.hourlyTraffic,
        today: gaData.hourlyTraffic.today?.map(h => ({
          ...h,
          users: scale(h.users),
          pageViews: scale(h.pageViews),
          sessions: scale(h.sessions),
        })),
        avgHourlyUsers: scale(gaData.hourlyTraffic.avgHourlyUsers),
      } : null,

      contentPerformance: gaData.contentPerformance ? {
        ...gaData.contentPerformance,
        byCategory: gaData.contentPerformance.byCategory?.map(c => ({
          ...c,
          views: scale(c.views),
        })),
        topArticles: gaData.contentPerformance.topArticles?.map(a => ({
          ...a,
          views: scale(a.views),
          shares: scale(a.shares),
        })),
      } : null,

      engagementAdvanced: gaData.engagementAdvanced ? {
        scrollDepth: {
          '25%': scale(gaData.engagementAdvanced.scrollDepth?.['25%'] || 0),
          '50%': scale(gaData.engagementAdvanced.scrollDepth?.['50%'] || 0),
          '75%': scale(gaData.engagementAdvanced.scrollDepth?.['75%'] || 0),
          '100%': scale(gaData.engagementAdvanced.scrollDepth?.['100%'] || 0),
        },
        avgReadTime: gaData.engagementAdvanced.avgReadTime,
        commentsPerArticle: gaData.engagementAdvanced.commentsPerArticle,
        reactionsPerArticle: gaData.engagementAdvanced.reactionsPerArticle,
        shareRate: gaData.engagementAdvanced.shareRate,
        ctr: gaData.engagementAdvanced.ctr,
      } : null,

      searchAnalytics: gaData.searchAnalytics ? {
        ...gaData.searchAnalytics,
        topKeywords: gaData.searchAnalytics.topKeywords?.map(k => ({
          ...k,
          searches: scale(k.searches),
        })),
        totalSearches: scale(gaData.searchAnalytics.totalSearches),
      } : null,

      cohortAnalysis: gaData.cohortAnalysis ? {
        ...gaData.cohortAnalysis,
        weekly: gaData.cohortAnalysis.weekly?.map(w => ({
          ...w,
          cohortSize: scale(w.cohortSize),
        })),
      } : null,

      acquisitionDetails: gaData.acquisitionDetails ? {
        ...gaData.acquisitionDetails,
        byChannel: gaData.acquisitionDetails.byChannel?.map(c => ({
          ...c,
          sessions: scale(c.sessions),
        })),
        topReferrers: gaData.acquisitionDetails.topReferrers?.map(r => ({
          ...r,
          sessions: scale(r.sessions),
          users: scale(r.users),
        })),
      } : null,

      performance: gaData.performance || null,

      artistPopularity: gaData.artistPopularity ? {
        ...gaData.artistPopularity,
        topArtists: gaData.artistPopularity.topArtists?.map(a => ({
          ...a,
          views: scale(a.views),
          searches: scale(a.searches),
        })),
        risingArtists: gaData.artistPopularity.risingArtists?.map(a => ({
          ...a,
          views: scale(a.views),
        })),
        fandomActivity: {
          totalComments: scale(gaData.artistPopularity.fandomActivity?.totalComments || 0),
          totalVotes: scale(gaData.artistPopularity.fandomActivity?.totalVotes || 0),
          avgParticipationRate: gaData.artistPopularity.fandomActivity?.avgParticipationRate,
        },
      } : null,
    };
  };

  const scaledGaData = getScaledData();

  // URL에서 탭 파라미터 가져오기
  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab);
    }
  }, [router.query.tab]);



  // Redirect if not logged in or not an admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/admin/login');
    } else if (session && session.user?.role !== 'admin') {
      // In a real app, check if the user has admin privileges
      router.push('/');
      alert('You do not have admin privileges.');
    } else {
      setIsLoading(false);
    }
  }, [session, status, router]);

  // 드라마 데이터 로드
  useEffect(() => {
    const fetchDramas = async () => {
      if (activeTab === 'drama') {
        try {
          setDramaLoading(true);
          setDramaError('');
          
          // 인증 토큰 가져오기
          const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
          
          const response = await fetch('/api/dramas', {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            }
          });
          const result = await response.json();
          
          if (response.ok) {
            console.log('드라마 데이터 로드됨:', result);
            if (result.success && Array.isArray(result.data)) {
              setDramas(result.data);
            } else {
              setDramas([]);
              setDramaError('데이터 형식이 올바르지 않습니다.');
              console.error('응답 데이터 형식 오류:', result);
            }
          } else {
            setDramaError('Failed to load dramas: ' + (result.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error fetching dramas:', error);
          setDramaError('Failed to load dramas: ' + error.message);
        } finally {
          setDramaLoading(false);
        }
      }
    };
    
    fetchDramas();
  }, [activeTab]);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 오늘 날짜 계산 (00:00:00부터)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // 전체 통계와 오늘 통계를 병렬로 조회
        const [
          musicNewsRes,
          dramaNewsRes,
          movieNewsRes,
          celebNewsRes,
          musicTodayRes,
          dramaTodayRes,
          movieTodayRes,
          celebTodayRes
        ] = await Promise.all([
          // 전체 통계
          fetch('/api/news?category=kpop&limit=1'),
          fetch('/api/news/drama?limit=1'),
          fetch('/api/news/movie?limit=1'),
          fetch('/api/news/celeb?limit=1'),
          // 오늘 통계
          fetch(`/api/news?category=kpop&limit=1&createdAfter=${todayISO}`),
          fetch(`/api/news/drama?limit=1&createdAfter=${todayISO}`),
          fetch(`/api/news/movie?limit=1&createdAfter=${todayISO}`),
          fetch(`/api/news/celeb?limit=1&createdAfter=${todayISO}`)
        ]);

        const [
          musicNewsData,
          dramaNewsData,
          movieNewsData,
          celebNewsData,
          musicTodayData,
          dramaTodayData,
          movieTodayData,
          celebTodayData
        ] = await Promise.all([
          musicNewsRes.json(),
          dramaNewsRes.json(),
          movieNewsRes.json(),
          celebNewsRes.json(),
          musicTodayRes.json(),
          dramaTodayRes.json(),
          movieTodayRes.json(),
          celebTodayRes.json()
        ]);

        setStats({
          music: musicNewsData.data?.total || 0,
          dramas: dramaNewsData.pagination?.total || 0,
          films: movieNewsData.pagination?.total || 0,
          celebs: celebNewsData.pagination?.total || 0,
          musicToday: musicTodayData.data?.total || 0,
          dramasToday: dramaTodayData.pagination?.total || 0,
          filmsToday: movieTodayData.pagination?.total || 0,
          celebsToday: celebTodayData.pagination?.total || 0,
          views: 0,
          likes: 0,
          comments: 0,
          users: 0
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch recent activity
  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        // 최근 뉴스 10개 가져오기 (모든 카테고리)
        const response = await fetch('/api/news?limit=10&sort=createdAt&order=desc');
        const data = await response.json();

        if (data.success && data.data?.news) {
          // 뉴스 데이터를 activity 형식으로 변환
          const activities = data.data.news.map(news => {
            const createdDate = new Date(news.createdAt);
            const now = new Date();
            const diffMs = now - createdDate;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            let timeAgo;
            if (diffMins < 1) {
              timeAgo = 'Just now';
            } else if (diffMins < 60) {
              timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
            } else if (diffHours < 24) {
              timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            } else {
              timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            }

            // 카테고리에 따라 타입 결정
            let type = 'news';
            if (news.category === 'drama') type = 'drama';
            else if (news.category === 'movie') type = 'film';
            else if (news.category === 'kpop') type = 'music';
            else if (news.category === 'celeb' || news.category === 'variety') type = 'celeb';

            return {
              type,
              action: 'News published',
              title: news.title,
              time: timeAgo,
              category: news.category
            };
          });

          setRecentActivity(activities);
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      }
    };

    fetchRecentActivity();

    // 30초마다 갱신
    const interval = setInterval(fetchRecentActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  // GA 데이터 가져오기
  const fetchGAData = async () => {
    try {
      setGaLoading(true);
      const response = await fetch('/api/analytics/ga-realtime', {
        credentials: 'include',
      });
      const data = await response.json();
      console.log('[GA Data] hourlyTraffic:', data.data?.hourlyTraffic ? 'exists' : 'missing');
      console.log('[GA Data] artistPopularity:', data.data?.artistPopularity ? 'exists' : 'missing');
      if (data.success) {
        setGaData(data.data);
      }
    } catch (err) {
      console.error('Error fetching GA data:', err);
    } finally {
      setGaLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchGAData();
      const interval = setInterval(fetchGAData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  // Dashboard Stats (콘텐츠 현황, 시스템 상태) 가져오기
  const fetchDashboardStats = async () => {
    try {
      setDashboardStatsLoading(true);
      const response = await fetch('/api/admin/dashboard-stats', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setDashboardStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setDashboardStatsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchDashboardStats();
      const interval = setInterval(fetchDashboardStats, 60 * 1000); // 1분마다 갱신
      return () => clearInterval(interval);
    }
  }, [session]);

  // 헬퍼 함수들
  const formatNumber = (num) => {
    // 모든 숫자를 1의 자리까지 전체 표시 (K, M 없이)
    return num?.toLocaleString() || '0';
  };

  const formatCompactNumber = (num) => {
    // 백의 자리까지 표현 (2.5k, 12.3k, 1.2M 형식)
    if (!num) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  const getDeviceIcon = (device) => {
    switch (device?.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-5 h-5" />;
      case 'desktop': return <Monitor className="w-5 h-5" />;
      case 'tablet': return <Tablet className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  // 국가 코드 매핑 (flagcdn.com 이미지 사용 - 윈도우/맥 모두 호환)
  const getCountryFlag = (country) => {
    const countryCodes = {
      'United States': 'us', 'South Korea': 'kr', 'Japan': 'jp',
      'Philippines': 'ph', 'Indonesia': 'id', 'Thailand': 'th',
      'Vietnam': 'vn', 'Malaysia': 'my', 'Brazil': 'br',
      'Mexico': 'mx', 'India': 'in', 'United Kingdom': 'gb',
      'Canada': 'ca', 'Australia': 'au', 'Germany': 'de',
      'France': 'fr', 'Singapore': 'sg', 'Taiwan': 'tw',
      'Hong Kong': 'hk', 'China': 'cn',
    };
    const code = countryCodes[country] || 'un';
    return (
      <img
        src={`https://flagcdn.com/24x18/${code}.png`}
        srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
        width="24"
        height="18"
        alt={country}
        className="inline-block rounded-sm shadow-sm"
        style={{ verticalAlign: 'middle' }}
      />
    );
  };

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // D-2 (2일 전) 날짜 계산 - DAU 측정 기준일
  const d2Date = new Date();
  d2Date.setDate(d2Date.getDate() - 2);
  const d2DateStr = d2Date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  // 드라마 삭제 처리
  const handleDeleteDrama = async (dramaId) => {
    if (!confirm('Are you sure you want to delete this drama?')) {
      return;
    }
    
    try {
      // 인증 토큰 가져오기
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/dramas/${dramaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (response.ok) {
        // 목록에서 삭제된 드라마 제거
        setDramas(dramas.filter(drama => drama._id !== dramaId));
        alert('Drama deleted successfully');
      } else {
        const result = await response.json();
        alert('Failed to delete drama: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting drama:', error);
      alert('Failed to delete drama: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Admin Dashboard | K-POP News Portal</title>
      </Head>
      
      {/* Main Content */}
      <div className="flex flex-col w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Page Header - Modern Glass Effect */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-blue-600/10 to-cyan-500/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/50 shadow-lg shadow-blue-500/5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-500 mt-1 font-medium">{currentDate}</p>
              </div>
              {scaledGaData?.realtime?.activeUsers > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full text-white shadow-lg shadow-green-500/30">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                  <span className="font-semibold">{formatNumber(scaledGaData.realtime.activeUsers)} users online</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Analytics Section - Modern Card */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <button
              onClick={() => setIsUserAnalyticsOpen(!isUserAnalyticsOpen)}
              className="w-full px-6 py-5 flex items-center justify-between hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-800">User Analytics</h2>
                  <p className="text-sm text-gray-500">Real-time Google Analytics data</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Multiplier Setting Button (for super admin only - y@fsn.co.kr) */}
                {isSuperAdmin && (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsMultiplierOpen(!isMultiplierOpen); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${dataMultiplier !== 1 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      <span className="text-sm font-semibold">×{dataMultiplier}</span>
                      {isSavingMultiplier && (
                        <div className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </button>
                    {isMultiplierOpen && (
                      <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 min-w-[280px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-800">Data Multiplier</h4>
                          <button onClick={() => setIsMultiplierOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <span className="text-lg">×</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Adjust all analytics data by this multiplier</p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="1"
                              max="100"
                              step="1"
                              value={dataMultiplier}
                              onChange={(e) => handleMultiplierChange(Number(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                            />
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              value={dataMultiplier}
                              onChange={(e) => handleMultiplierChange(e.target.value)}
                              className="w-20 px-3 py-2 text-sm font-semibold text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {[1, 5, 10, 25, 50, 100].map(val => (
                              <button
                                key={val}
                                onClick={() => handleMultiplierChange(val)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${dataMultiplier === val ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                              >
                                ×{val}
                              </button>
                            ))}
                          </div>
                          {dataMultiplier !== 1 && (
                            <p className="text-xs text-violet-600 bg-violet-50 px-3 py-2 rounded-lg">
                              All data is multiplied by <strong>{dataMultiplier}x</strong>
                            </p>
                          )}
                          {isSavingMultiplier && (
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                              Saving...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); fetchGAData(); }}
                  disabled={gaLoading}
                  className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 group"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-600 group-hover:text-gray-800 ${gaLoading ? 'animate-spin' : ''}`} />
                </button>
                <div className={`p-2 rounded-xl bg-gray-100 transition-transform duration-300 ${isUserAnalyticsOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            </button>

            {isUserAnalyticsOpen && scaledGaData && (
              <div className="px-6 pb-6 border-t border-gray-100">
                {/* Premium Dark Theme Metrics Dashboard */}
                <div className="mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700/50 shadow-2xl overflow-hidden relative">
                  {/* Animated background effects */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
                  </div>

                  <div className="relative z-10">
                    {/* Key Metrics Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Realtime - Dynamic Animated Card */}
                      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-600/30 via-teal-600/20 to-cyan-600/10 border border-emerald-400/40 group hover:border-emerald-300/60 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/20">
                        {/* Animated pulse rings */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-emerald-400/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-emerald-400/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
                          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl animate-pulse"></div>
                          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-cyan-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                        </div>

                        {/* LIVE badge with glow */}
                        <div className="absolute top-3 right-3">
                          <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-emerald-400/30">
                            <div className="relative">
                              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/80"></div>
                              <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                            </div>
                            <span className="text-xs font-black text-emerald-300 tracking-widest">LIVE</span>
                          </div>
                        </div>

                        <div className="relative z-10">
                          <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl w-fit shadow-lg shadow-emerald-500/40 mb-3 group-hover:shadow-emerald-400/50 transition-shadow">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-4xl font-black text-white drop-shadow-lg">{formatNumber(scaledGaData.realtime.activeUsers)}</h3>
                          <p className="text-sm text-emerald-200/80 font-semibold mt-1">Active Users Now</p>
                        </div>
                      </div>

                      {/* DAU */}
                      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/30 group hover:border-blue-400/50 transition-all duration-300">
                        <div className="absolute top-3 right-3">
                          <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-500/30">{d2DateStr}</span>
                        </div>
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl w-fit shadow-lg shadow-blue-500/30 mb-3">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-3xl font-black text-white">{formatNumber(scaledGaData.summary.dau.users)}</h3>
                        <p className="text-sm text-slate-400 font-medium mt-1">Daily Active</p>
                      </div>

                      {/* WAU */}
                      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-violet-600/20 to-purple-600/10 border border-violet-500/30 group hover:border-violet-400/50 transition-all duration-300">
                        <div className="absolute top-3 right-3">
                          <span className="text-xs font-semibold text-violet-400 bg-violet-500/20 px-2.5 py-1 rounded-full border border-violet-500/30">7 Days</span>
                        </div>
                        <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl w-fit shadow-lg shadow-violet-500/30 mb-3">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-3xl font-black text-white">{formatNumber(scaledGaData.summary.wau.users)}</h3>
                        <p className="text-sm text-slate-400 font-medium mt-1">Weekly Active</p>
                      </div>

                      {/* MAU */}
                      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-orange-600/20 to-amber-600/10 border border-orange-500/30 group hover:border-orange-400/50 transition-all duration-300">
                        <div className="absolute top-3 right-3">
                          <span className="text-xs font-semibold text-orange-400 bg-orange-500/20 px-2.5 py-1 rounded-full border border-orange-500/30">30 Days</span>
                        </div>
                        <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl w-fit shadow-lg shadow-orange-500/30 mb-3">
                          <Globe className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-3xl font-black text-white">{formatNumber(scaledGaData.summary.mau.users)}</h3>
                        <p className="text-sm text-slate-400 font-medium mt-1">Monthly Active</p>
                      </div>
                    </div>

                    {/* Engagement Metrics Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="relative overflow-hidden rounded-xl p-4 bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sessions/User</p>
                          <p className="text-2xl font-black text-cyan-400 mt-1">{scaledGaData.userFlow?.sessionMetrics?.sessionsPerUser || scaledGaData.engagement.avgSessionsPerUser}</p>
                        </div>
                      </div>
                      <div className="relative overflow-hidden rounded-xl p-4 bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pages/Session</p>
                          <p className="text-2xl font-black text-pink-400 mt-1">{scaledGaData.userFlow?.sessionMetrics?.pageViewsPerSession || scaledGaData.engagement.avgPageViewsPerSession}</p>
                        </div>
                      </div>
                      <div className="relative overflow-hidden rounded-xl p-4 bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative">
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-emerald-400" />
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Users</p>
                          </div>
                          <p className="text-2xl font-black text-emerald-400 mt-1">{formatNumber(scaledGaData.engagement.newUsers)}</p>
                        </div>
                      </div>
                      <div className="relative overflow-hidden rounded-xl p-4 bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-amber-400" />
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retention</p>
                          </div>
                          <p className="text-2xl font-black text-amber-400 mt-1">{scaledGaData.engagement.retentionRate}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DAU Chart - Premium Animated Design */}
                <div className="mt-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700/50 shadow-2xl overflow-hidden relative">
                  {/* Animated background effects */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                  </div>

                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-xl shadow-lg shadow-violet-500/30">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">Daily Active Users</h3>
                            <p className="text-sm text-slate-400">Last 30 days performance</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {scaledGaData.dailyTrends && scaledGaData.dailyTrends.length > 0 && (() => {
                          const maxDAU = Math.max(...scaledGaData.dailyTrends.map(d => d.dau));
                          const minDAU = Math.min(...scaledGaData.dailyTrends.map(d => d.dau));
                          const avgDAU = Math.floor(scaledGaData.dailyTrends.reduce((sum, d) => sum + d.dau, 0) / scaledGaData.dailyTrends.length);
                          return (
                            <>
                              <div className="text-center px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Min</p>
                                <p className="text-lg font-bold text-cyan-400">{formatNumber(minDAU)}</p>
                              </div>
                              <div className="text-center px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Avg</p>
                                <p className="text-lg font-bold text-blue-400">{formatNumber(avgDAU)}</p>
                              </div>
                              <div className="text-center px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">Max</p>
                                <p className="text-lg font-bold text-violet-400">{formatNumber(maxDAU)}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="relative" style={{ height: '320px' }}>
                      {(() => {
                        const data = scaledGaData.dailyTrends;
                        if (!data || data.length === 0) return null;
                        const maxDAU = Math.max(...data.map(d => d.dau));
                        const minDAU = Math.min(...data.map(d => d.dau));
                        const padding = (maxDAU - minDAU) * 0.1 || maxDAU * 0.1;
                        const chartMax = maxDAU + padding;

                        return (
                          <div className="relative w-full h-full">
                            {/* Y-axis labels */}
                            <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-right pr-2">
                              {[0, 1, 2, 3, 4].map((i) => (
                                <span key={i} className="text-xs text-slate-500 font-medium">
                                  {formatNumber(Math.round(chartMax - (chartMax / 4) * i))}
                                </span>
                              ))}
                            </div>

                            {/* SVG Chart */}
                            <div className="absolute left-14 right-0 top-0 bottom-0">
                              <svg width="100%" height="260" viewBox="0 0 1000 260" preserveAspectRatio="none" className="overflow-visible">
                                {/* Animated Grid lines */}
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <line
                                    key={i}
                                    x1="0"
                                    y1={i * 60 + 10}
                                    x2="1000"
                                    y2={i * 60 + 10}
                                    stroke="#334155"
                                    strokeWidth="1"
                                    strokeDasharray="8,8"
                                    opacity="0.5"
                                  />
                                ))}

                                {/* Gradient Definitions */}
                                <defs>
                                  {/* Main area gradient */}
                                  <linearGradient id="dauAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                                    <stop offset="30%" stopColor="#6366f1" stopOpacity="0.4" />
                                    <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                                  </linearGradient>

                                  {/* Line gradient */}
                                  <linearGradient id="dauLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#a78bfa" />
                                    <stop offset="25%" stopColor="#8b5cf6" />
                                    <stop offset="50%" stopColor="#6366f1" />
                                    <stop offset="75%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                  </linearGradient>

                                  {/* Glow filter */}
                                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                    <feMerge>
                                      <feMergeNode in="coloredBlur"/>
                                      <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                  </filter>

                                  {/* Point glow */}
                                  <radialGradient id="pointGlow" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                                  </radialGradient>

                                  {/* Trend line gradient */}
                                  <linearGradient id="trendLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
                                  </linearGradient>
                                </defs>

                                {(() => {
                                  const chartStartX = 0;
                                  const chartWidth = 1000;
                                  const chartHeight = 230;
                                  const pointSpacing = chartWidth / (data.length - 1);

                                  // Smooth curve using quadratic bezier
                                  const getY = (dau) => chartHeight - ((dau / chartMax) * (chartHeight - 20)) + 10;

                                  // Create smooth path
                                  let linePath = '';
                                  let areaPath = '';

                                  data.forEach((day, index) => {
                                    const x = chartStartX + index * pointSpacing;
                                    const y = getY(day.dau);

                                    if (index === 0) {
                                      linePath = `M ${x} ${y}`;
                                      areaPath = `M ${x} ${chartHeight + 10}  L ${x} ${y}`;
                                    } else {
                                      const prevX = chartStartX + (index - 1) * pointSpacing;
                                      const prevY = getY(data[index - 1].dau);
                                      const cpX = (prevX + x) / 2;
                                      linePath += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
                                      areaPath += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
                                    }
                                  });

                                  areaPath += ` L ${chartStartX + (data.length - 1) * pointSpacing} ${chartHeight + 10} Z`;

                                  // Calculate trend line (linear regression)
                                  const n = data.length;
                                  const sumX = data.reduce((sum, _, i) => sum + i, 0);
                                  const sumY = data.reduce((sum, d) => sum + d.dau, 0);
                                  const sumXY = data.reduce((sum, d, i) => sum + i * d.dau, 0);
                                  const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);
                                  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                                  const intercept = (sumY - slope * sumX) / n;

                                  const trendStartY = getY(intercept);
                                  const trendEndY = getY(slope * (n - 1) + intercept);

                                  return (
                                    <>
                                      {/* Area fill with animation */}
                                      <path
                                        d={areaPath}
                                        fill="url(#dauAreaGradient)"
                                        className="transition-all duration-1000"
                                      />

                                      {/* Trend line */}
                                      <line
                                        x1={chartStartX}
                                        y1={trendStartY}
                                        x2={chartStartX + (n - 1) * pointSpacing}
                                        y2={trendEndY}
                                        stroke="url(#trendLineGradient)"
                                        strokeWidth="2"
                                        strokeDasharray="8,4"
                                        strokeLinecap="round"
                                        opacity="0.9"
                                      />

                                      {/* Main line with glow */}
                                      <path
                                        d={linePath}
                                        fill="none"
                                        stroke="url(#dauLineGradient)"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#glow)"
                                        className="transition-all duration-500"
                                      />

                                      {/* Vertical hover lines and points */}
                                      {data.map((day, index) => {
                                        const x = chartStartX + index * pointSpacing;
                                        const y = getY(day.dau);
                                        const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6;

                                        return (
                                          <g key={index} className="group cursor-pointer">
                                            {/* Hover area */}
                                            <rect
                                              x={x - pointSpacing / 2}
                                              y={0}
                                              width={pointSpacing}
                                              height={260}
                                              fill="transparent"
                                              onMouseEnter={(e) => {
                                                const rect = e.currentTarget.closest('svg').getBoundingClientRect();
                                                setChartTooltip({
                                                  visible: true,
                                                  x: (x / 1000) * rect.width,
                                                  y: (y / 260) * rect.height,
                                                  date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }),
                                                  value: day.dau,
                                                  sessions: day.sessions,
                                                  pageViews: day.pageViews
                                                });
                                              }}
                                              onMouseLeave={() => setChartTooltip({ ...chartTooltip, visible: false })}
                                            />

                                            {/* Vertical hover line */}
                                            <line
                                              x1={x}
                                              y1={y}
                                              x2={x}
                                              y2={chartHeight + 10}
                                              stroke="#8b5cf6"
                                              strokeWidth="1"
                                              strokeDasharray="4,4"
                                              opacity="0"
                                              className="group-hover:opacity-50 transition-opacity duration-200"
                                            />

                                            {/* Outer glow circle */}
                                            <circle
                                              cx={x}
                                              cy={y}
                                              r="12"
                                              fill="url(#pointGlow)"
                                              opacity="0"
                                              className="group-hover:opacity-100 transition-opacity duration-200"
                                            />

                                            {/* Point with animation */}
                                            <circle
                                              cx={x}
                                              cy={y}
                                              r="4"
                                              fill={isWeekend ? "#f97316" : "#8b5cf6"}
                                              stroke="#1e293b"
                                              strokeWidth="2"
                                              className="group-hover:r-6 transition-all duration-200"
                                              style={{
                                                filter: 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.5))',
                                              }}
                                            />

                                            {/* Hover ring */}
                                            <circle
                                              cx={x}
                                              cy={y}
                                              r="8"
                                              fill="none"
                                              stroke="#8b5cf6"
                                              strokeWidth="2"
                                              opacity="0"
                                              className="group-hover:opacity-100 transition-opacity duration-200"
                                            />
                                          </g>
                                        );
                                      })}
                                    </>
                                  );
                                })()}
                              </svg>

                              {/* Date Labels */}
                              <div className="relative w-full mt-2" style={{ height: '24px' }}>
                                {(() => {
                                  const dateIndices = data.map((_, i) => i).filter(i => i % 5 === 0 || i === data.length - 1);
                                  return dateIndices.map(index => {
                                    const position = (index / (data.length - 1)) * 100;
                                    const isWeekend = new Date(data[index].date).getDay() === 0 || new Date(data[index].date).getDay() === 6;
                                    return (
                                      <span
                                        key={index}
                                        className={`absolute text-xs font-medium transform -translate-x-1/2 ${isWeekend ? 'text-orange-400' : 'text-slate-500'}`}
                                        style={{ left: `${position}%` }}
                                      >
                                        {new Date(data[index].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    );
                                  });
                                })()}
                              </div>

                              {/* Enhanced Tooltip */}
                              {chartTooltip.visible && (
                                <div
                                  className="absolute pointer-events-none z-50 transform -translate-x-1/2"
                                  style={{
                                    left: chartTooltip.x,
                                    top: Math.max(0, chartTooltip.y - 120),
                                  }}
                                >
                                  <div className="bg-slate-800/95 backdrop-blur-xl text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-600/50 min-w-[140px]">
                                    <div className="text-center mb-2 pb-2 border-b border-slate-600/50">
                                      <p className="text-slate-400 text-xs">{chartTooltip.date}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-400 text-xs">Users</span>
                                        <span className="font-bold text-violet-400">{formatNumber(chartTooltip.value)}</span>
                                      </div>
                                      {chartTooltip.sessions && (
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="text-slate-400 text-xs">Sessions</span>
                                          <span className="font-semibold text-blue-400">{formatNumber(chartTooltip.sessions)}</span>
                                        </div>
                                      )}
                                      {chartTooltip.pageViews && (
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="text-slate-400 text-xs">Page Views</span>
                                          <span className="font-semibold text-cyan-400">{formatNumber(chartTooltip.pageViews)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="w-3 h-3 bg-slate-800/95 border-r border-b border-slate-600/50 transform rotate-45 mx-auto -mt-1.5"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>

                {/* Content Stats & System Status - Premium Dark Theme */}
                {dashboardStats && (
                  <div className="mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700/50 shadow-2xl overflow-hidden relative">
                    {/* Animated background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                    </div>

                    <div className="relative z-10">
                      {/* Section Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl shadow-lg shadow-rose-500/30">
                            <Layers className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">Content & System</h3>
                            <p className="text-xs text-slate-400">Real-time content metrics & server health</p>
                          </div>
                        </div>
                        <button
                          onClick={fetchDashboardStats}
                          disabled={dashboardStatsLoading}
                          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-all border border-slate-700/50"
                        >
                          <RefreshCw className={`w-4 h-4 text-slate-400 ${dashboardStatsLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* Content Overview Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        {/* Total Articles */}
                        <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-violet-600/20 to-purple-600/10 border border-violet-500/30 hover:border-violet-400/50 transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-violet-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase">Total</span>
                          </div>
                          <p className="text-2xl font-black text-white">{dashboardStats.contentStats.totalArticles.toLocaleString()}</p>
                          <p className="text-xs text-slate-500 mt-1">Articles</p>
                        </div>

                        {/* Total Views */}
                        <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-cyan-600/20 to-blue-600/10 border border-cyan-500/30 hover:border-cyan-400/50 transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase">Views</span>
                          </div>
                          <p className="text-2xl font-black text-white">{(dashboardStats.contentStats.totalViews * dataMultiplier).toLocaleString()}</p>
                          <p className="text-xs text-slate-500 mt-1">All Time</p>
                        </div>

                        {/* Today Published */}
                        <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-emerald-600/20 to-green-600/10 border border-emerald-500/30 hover:border-emerald-400/50 transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase">Today</span>
                          </div>
                          <p className="text-2xl font-black text-emerald-400">{dashboardStats.contentStats.todayPublished}</p>
                          <p className="text-xs text-slate-500 mt-1">Published</p>
                        </div>

                        {/* Week Published */}
                        <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-amber-600/20 to-orange-600/10 border border-amber-500/30 hover:border-amber-400/50 transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase">Week</span>
                          </div>
                          <p className="text-2xl font-black text-amber-400">{dashboardStats.contentStats.weekPublished}</p>
                          <p className="text-xs text-slate-500 mt-1">Published</p>
                        </div>

                        {/* System Status */}
                        <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-slate-600/20 to-slate-700/10 border border-slate-500/30 hover:border-slate-400/50 transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            <Server className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase">System</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {dashboardStats.systemStatus.dbConnected ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                <span className="text-sm font-bold text-emerald-400">Healthy</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5 text-red-400" />
                                <span className="text-sm font-bold text-red-400">Error</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{dashboardStats.systemStatus.dbResponseTime}ms</p>
                        </div>
                      </div>

                      {/* Two Column Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Category Stats */}
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-rose-400" />
                            <h4 className="text-sm font-bold text-white">Articles by Category</h4>
                          </div>
                          <div className="space-y-3">
                            {dashboardStats.contentStats.categories.slice(0, 6).map((cat, i) => {
                              const maxCount = Math.max(...dashboardStats.contentStats.categories.map(c => c.count));
                              const percentage = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
                              const colors = [
                                'from-rose-500 to-pink-500',
                                'from-violet-500 to-purple-500',
                                'from-blue-500 to-cyan-500',
                                'from-emerald-500 to-green-500',
                                'from-amber-500 to-orange-500',
                                'from-slate-500 to-gray-500'
                              ];
                              return (
                                <div key={i}>
                                  <div className="flex items-center justify-between text-sm mb-1.5">
                                    <span className="text-slate-300 font-medium">{cat.displayName}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-slate-500 text-xs">{(cat.totalViews * dataMultiplier).toLocaleString()} views</span>
                                      <span className="font-bold text-white bg-slate-700/50 px-2 py-0.5 rounded text-xs">{cat.count}</span>
                                    </div>
                                  </div>
                                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Popular Articles */}
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <Flame className="w-4 h-4 text-orange-400" />
                            <h4 className="text-sm font-bold text-white">Trending Articles</h4>
                            <span className="text-xs text-slate-500 ml-auto">Last 7 days</span>
                          </div>
                          <div className="space-y-2">
                            {dashboardStats.popularArticles.slice(0, 5).map((article, i) => (
                              <div key={article._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 transition-colors group">
                                <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold ${
                                  i === 0 ? 'bg-amber-500/20 text-amber-400' :
                                  i === 1 ? 'bg-slate-400/20 text-slate-300' :
                                  i === 2 ? 'bg-orange-600/20 text-orange-400' :
                                  'bg-slate-700/50 text-slate-500'
                                }`}>
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-300 truncate group-hover:text-white transition-colors">
                                    {article.title}
                                  </p>
                                  <p className="text-xs text-slate-500">{article.category}</p>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-1 rounded">
                                  <Eye className="w-3 h-3" />
                                  {formatCompactNumber((article.viewCount || 0) * dataMultiplier)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* System Details Row */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <Database className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">DB Response</p>
                            <p className="text-sm font-bold text-emerald-400">{dashboardStats.systemStatus.dbResponseTime}ms</p>
                          </div>
                        </div>
                        <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Zap className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">API Response</p>
                            <p className="text-sm font-bold text-blue-400">{dashboardStats.systemStatus.apiResponseTime}ms</p>
                          </div>
                        </div>
                        <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3">
                          <div className="p-2 bg-violet-500/20 rounded-lg">
                            <Server className="w-4 h-4 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Memory Used</p>
                            <p className="text-sm font-bold text-violet-400">{dashboardStats.systemStatus.memoryUsage?.heapUsed || 0}MB</p>
                          </div>
                        </div>
                        <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3">
                          <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Clock className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Node Version</p>
                            <p className="text-sm font-bold text-amber-400">{dashboardStats.systemStatus.nodeVersion}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Demographics Row - Dark Theme */}
                <div className="mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700/50 shadow-2xl overflow-hidden relative">
                  {/* Animated background */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                  </div>

                  <div className="relative z-10">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/30">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Demographics & Pages</h3>
                        <p className="text-xs text-slate-400">User distribution and top content</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Countries */}
                      <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-4">
                          <Globe className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-sm font-bold text-white">Top Countries</h4>
                        </div>
                        <div className="space-y-2">
                          {scaledGaData.demographics.countries.slice(0, 8).map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-sm group p-1.5 rounded-lg hover:bg-slate-700/30 transition-colors">
                              <span className="flex items-center gap-2">
                                <span className="w-5 text-xs font-bold text-slate-500">{i + 1}</span>
                                <span>{getCountryFlag(c.country)}</span>
                                <span className="text-slate-300 font-medium group-hover:text-cyan-400 transition-colors">{c.country}</span>
                              </span>
                              <span className="font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded text-xs">{formatNumber(c.users)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Devices */}
                      <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-4">
                          <Smartphone className="w-4 h-4 text-violet-400" />
                          <h4 className="text-sm font-bold text-white">Device Distribution</h4>
                        </div>
                        <div className="space-y-4">
                          {scaledGaData.demographics.devices.map((d, i) => {
                            const total = scaledGaData.demographics.devices.reduce((sum, x) => sum + x.users, 0);
                            const pct = ((d.users / total) * 100).toFixed(0);
                            const colors = [
                              { gradient: 'from-blue-500 to-cyan-400', text: 'text-cyan-400' },
                              { gradient: 'from-violet-500 to-purple-400', text: 'text-violet-400' },
                              { gradient: 'from-emerald-500 to-green-400', text: 'text-emerald-400' }
                            ];
                            return (
                              <div key={i}>
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className={`flex items-center gap-2 ${colors[i]?.text || 'text-slate-300'} font-medium capitalize`}>
                                    {getDeviceIcon(d.device)}
                                    {d.device}
                                  </span>
                                  <span className="font-bold text-white">{pct}%</span>
                                </div>
                                <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${colors[i]?.gradient || 'from-slate-500 to-gray-400'} rounded-full transition-all duration-500`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Top Pages */}
                      <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="w-4 h-4 text-amber-400" />
                          <h4 className="text-sm font-bold text-white">Top Pages</h4>
                        </div>
                        <div className="space-y-2">
                          {scaledGaData.topPages.slice(0, 6).map((p, i) => (
                            <div key={i} className="flex items-center justify-between text-sm group p-1.5 rounded-lg hover:bg-slate-700/30 transition-colors">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${
                                  i === 0 ? 'bg-amber-500/20 text-amber-400' :
                                  i === 1 ? 'bg-slate-500/20 text-slate-300' :
                                  i === 2 ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-slate-700/50 text-slate-500'
                                }`}>{i + 1}</span>
                                <span className="text-slate-300 truncate font-medium group-hover:text-amber-400 transition-colors" title={p.path}>
                                  {p.path === '/' ? 'Home' : p.path}
                                </span>
                              </div>
                              <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-xs ml-2">{formatNumber(p.pageViews)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scroll Depth & Engagement Row - Dark Theme */}
                {scaledGaData.scrollDepth && scaledGaData.engagementMetrics && (
                  <div className="mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700/50 shadow-2xl overflow-hidden relative">
                    {/* Animated background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>

                    <div className="relative z-10">
                      {/* Section Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30">
                          <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Engagement Analysis</h3>
                          <p className="text-xs text-slate-400">Scroll depth & user interaction metrics</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Scroll Depth */}
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <ArrowDown className="w-4 h-4 text-cyan-400" />
                              <h4 className="text-sm font-bold text-white">Scroll Depth</h4>
                            </div>
                            <span className="text-xs font-bold text-cyan-400 bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-500/30">
                              Avg: {scaledGaData.scrollDepth.avgScrollRate}%
                            </span>
                          </div>
                          <div className="space-y-3">
                            {scaledGaData.scrollDepth.pages.slice(0, 5).map((p, i) => (
                              <div key={i}>
                                <div className="flex items-center justify-between text-sm mb-1.5">
                                  <span className="text-slate-300 font-medium truncate flex-1">
                                    {p.path === '/' ? 'Home' : p.path}
                                  </span>
                                  <span className="font-bold text-cyan-400 ml-2">{p.scrollRate}%</span>
                                </div>
                                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(parseFloat(p.scrollRate), 100)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Engagement Metrics */}
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-4 h-4 text-rose-400" />
                            <h4 className="text-sm font-bold text-white">Engagement Metrics</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/30">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg. Session</p>
                              <p className="text-lg font-black text-white mt-1">
                                {Math.floor(parseFloat(scaledGaData.engagementMetrics.avgSessionDuration) / 60)}m {Math.floor(parseFloat(scaledGaData.engagementMetrics.avgSessionDuration) % 60)}s
                              </p>
                            </div>
                            <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engagement</p>
                              <p className="text-lg font-black text-emerald-400 mt-1">{scaledGaData.engagementMetrics.engagementRate}%</p>
                            </div>
                            <div className="bg-orange-500/10 rounded-xl p-3 border border-orange-500/20">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bounce Rate</p>
                              <p className="text-lg font-black text-orange-400 mt-1">{scaledGaData.engagementMetrics.bounceRate}%</p>
                            </div>
                            <div className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engaged</p>
                              <p className="text-lg font-black text-violet-400 mt-1">{formatNumber(scaledGaData.engagementMetrics.engagedSessions)}</p>
                            </div>
                          </div>

                          {/* Page Engagement */}
                          <div className="border-t border-slate-700/50 pt-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Avg. Time on Page</p>
                            <div className="space-y-1.5">
                              {scaledGaData.engagementMetrics.pageEngagement.slice(0, 4).map((p, i) => (
                                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-slate-700/30 transition-colors">
                                  <span className="text-slate-300 font-medium truncate flex-1">
                                    {p.path === '/' ? 'Home' : p.path}
                                  </span>
                                  <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-xs ml-2">{parseFloat(p.avgTimeOnPage).toFixed(0)}s</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Traffic Sources Row - Dark Theme */}
                {scaledGaData.trafficSources && (
                  <div className="mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700/50 shadow-2xl overflow-hidden relative">
                    {/* Animated background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
                      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>

                    <div className="relative z-10">
                      {/* Section Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30">
                          <Share2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Traffic Sources</h3>
                          <p className="text-xs text-slate-400">Where your visitors come from</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* By Source */}
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <ExternalLink className="w-4 h-4 text-indigo-400" />
                            <h4 className="text-sm font-bold text-white">By Source</h4>
                          </div>
                          <div className="space-y-3">
                            {scaledGaData.trafficSources.sources.slice(0, 6).map((s, i) => {
                              const totalSessions = scaledGaData.trafficSources.sources.reduce((sum, x) => sum + x.sessions, 0);
                              const percentage = totalSessions > 0 ? ((s.sessions / totalSessions) * 100).toFixed(1) : 0;
                              const colors = [
                                { gradient: 'from-indigo-500 to-blue-500', text: 'text-indigo-400' },
                                { gradient: 'from-violet-500 to-purple-500', text: 'text-violet-400' },
                                { gradient: 'from-pink-500 to-rose-500', text: 'text-pink-400' },
                                { gradient: 'from-orange-500 to-amber-500', text: 'text-orange-400' },
                                { gradient: 'from-emerald-500 to-green-500', text: 'text-emerald-400' },
                                { gradient: 'from-cyan-500 to-teal-500', text: 'text-cyan-400' }
                              ];
                              return (
                                <div key={i}>
                                  <div className="flex items-center justify-between text-sm mb-1.5">
                                    <span className="text-slate-300 font-medium capitalize">{s.source}</span>
                                    <span className={`font-bold ${colors[i % colors.length].text}`}>{percentage}%</span>
                                  </div>
                                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full bg-gradient-to-r ${colors[i % colors.length].gradient} rounded-full transition-all duration-500`}
                                      style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* By Medium */}
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <Share2 className="w-4 h-4 text-purple-400" />
                            <h4 className="text-sm font-bold text-white">By Medium</h4>
                          </div>
                          <div className="space-y-3">
                            {scaledGaData.trafficSources.mediums.map((m, i) => {
                              const totalSessions = scaledGaData.trafficSources.mediums.reduce((sum, x) => sum + x.sessions, 0);
                              const percentage = totalSessions > 0 ? ((m.sessions / totalSessions) * 100).toFixed(1) : 0;
                              const colors = [
                                { gradient: 'from-emerald-500 to-green-400', text: 'text-emerald-400' },
                                { gradient: 'from-blue-500 to-cyan-400', text: 'text-blue-400' },
                                { gradient: 'from-violet-500 to-purple-400', text: 'text-violet-400' },
                                { gradient: 'from-orange-500 to-amber-400', text: 'text-orange-400' },
                                { gradient: 'from-pink-500 to-rose-400', text: 'text-pink-400' }
                              ];
                              return (
                                <div key={i}>
                                  <div className="flex items-center justify-between text-sm mb-1.5">
                                    <span className="text-slate-300 font-medium capitalize">{m.medium === '(none)' ? 'Direct' : m.medium}</span>
                                    <span className={`font-bold ${colors[i % colors.length].text}`}>{formatNumber(m.sessions)}</span>
                                  </div>
                                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full bg-gradient-to-r ${colors[i % colors.length].gradient} rounded-full transition-all duration-500`}
                                      style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Source/Medium */}
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <Search className="w-4 h-4 text-rose-400" />
                            <h4 className="text-sm font-bold text-white">Source / Medium</h4>
                          </div>
                          <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                            {scaledGaData.trafficSources.sourceMedium.slice(0, 8).map((sm, i) => {
                              const totalSessions = scaledGaData.trafficSources.sourceMedium.reduce((sum, x) => sum + x.sessions, 0);
                              const percentage = totalSessions > 0 ? ((sm.sessions / totalSessions) * 100).toFixed(1) : 0;
                              const colors = [
                                { bg: 'bg-violet-500/20', text: 'text-violet-400' },
                                { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
                                { bg: 'bg-amber-500/20', text: 'text-amber-400' },
                                { bg: 'bg-rose-500/20', text: 'text-rose-400' },
                                { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
                                { bg: 'bg-blue-500/20', text: 'text-blue-400' },
                                { bg: 'bg-pink-500/20', text: 'text-pink-400' },
                                { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
                              ];
                              return (
                                <div key={i} className="flex items-center justify-between text-sm p-2.5 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                                  <span className="text-slate-300 font-medium truncate flex-1" title={sm.sourceMedium}>
                                    {sm.sourceMedium}
                                  </span>
                                  <div className="flex items-center gap-2 ml-2">
                                    <span className="font-bold text-white text-xs">{formatNumber(sm.sessions)}</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${colors[i % colors.length].bg} ${colors[i % colors.length].text}`}>
                                      {percentage}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Flow Section - Dark Theme */}
                {scaledGaData.userFlow && (
                  <div className="mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 border border-slate-700/50 shadow-2xl overflow-hidden relative">
                    {/* Animated background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute -top-20 -left-20 w-40 h-40 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
                      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>

                    <div className="relative z-10">
                      {/* Section Header */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30">
                          <MousePointer className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">User Flow Analysis</h3>
                          <p className="text-xs text-slate-400">Navigation patterns and page transitions</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Session Metrics */}
                        <div className="bg-gradient-to-br from-indigo-600/30 to-purple-600/20 rounded-2xl p-5 border border-indigo-500/30">
                          <h4 className="text-sm font-semibold text-slate-300 mb-4">Session Metrics</h4>
                          <div className="space-y-3">
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                              <p className="text-xs text-slate-500">Pages per Session</p>
                              <p className="text-2xl font-bold text-indigo-400">{scaledGaData.userFlow.sessionMetrics.pageViewsPerSession}</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                              <p className="text-xs text-slate-500">Sessions per User</p>
                              <p className="text-2xl font-bold text-purple-400">{scaledGaData.userFlow.sessionMetrics.sessionsPerUser}</p>
                            </div>
                          </div>
                        </div>

                        {/* Landing Pages */}
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <ArrowDown className="w-4 h-4 text-emerald-400 rotate-180" />
                            <h4 className="text-sm font-bold text-white">Landing Pages</h4>
                            <span className="text-xs text-slate-500 ml-auto">Entry Points</span>
                          </div>
                          <div className="space-y-2">
                            {scaledGaData.userFlow.landingPages.slice(0, 5).map((lp, i) => {
                              const totalSessions = scaledGaData.userFlow.landingPages.reduce((sum, x) => sum + x.sessions, 0);
                              const percentage = totalSessions > 0 ? ((lp.sessions / totalSessions) * 100).toFixed(1) : 0;
                              const colors = [
                                { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
                                { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
                                { bg: 'bg-blue-500/20', text: 'text-blue-400' },
                                { bg: 'bg-violet-500/20', text: 'text-violet-400' },
                                { bg: 'bg-amber-500/20', text: 'text-amber-400' },
                              ];
                              return (
                                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'}`}>
                                      {i + 1}
                                    </span>
                                    <span className="text-sm text-slate-300 font-medium truncate max-w-[120px]">{lp.page}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">{formatNumber(lp.sessions)}</span>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${colors[i % colors.length].bg} ${colors[i % colors.length].text}`}>
                                      {percentage}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Exit Pages */}
                        <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                          <div className="flex items-center gap-2 mb-4">
                            <ArrowDown className="w-4 h-4 text-red-400" />
                            <h4 className="text-sm font-bold text-white">Exit Pages</h4>
                            <span className="text-xs text-slate-500 ml-auto">Where users leave</span>
                          </div>
                          <div className="space-y-2">
                            {scaledGaData.userFlow.exitPages.slice(0, 5).map((ep, i) => {
                              const totalExits = scaledGaData.userFlow.exitPages.reduce((sum, x) => sum + x.exits, 0);
                              const percentage = totalExits > 0 ? ((ep.exits / totalExits) * 100).toFixed(1) : 0;
                              const colors = [
                                { bg: 'bg-red-500/20', text: 'text-red-400' },
                                { bg: 'bg-orange-500/20', text: 'text-orange-400' },
                                { bg: 'bg-amber-500/20', text: 'text-amber-400' },
                                { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
                                { bg: 'bg-rose-500/20', text: 'text-rose-400' },
                              ];
                              return (
                                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-500'}`}>
                                      {i + 1}
                                    </span>
                                    <span className="text-sm text-slate-300 font-medium truncate max-w-[120px]">{ep.page}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">{formatNumber(ep.exits)}</span>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded ${colors[i % colors.length].bg} ${colors[i % colors.length].text}`}>
                                      {percentage}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Navigation Paths Section */}
                      {scaledGaData.userFlow.navigationPaths && scaledGaData.userFlow.navigationPaths.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Page Navigation Flow */}
                          <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <MousePointer className="w-4 h-4 text-cyan-400" />
                                <h5 className="text-sm font-bold text-white">Page Transitions</h5>
                              </div>
                              <span className="text-xs text-slate-500">From → To</span>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                              {scaledGaData.userFlow.navigationPaths.slice(0, 8).map((path, i) => (
                                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-xs font-bold text-slate-500 w-5">#{i + 1}</span>
                                    <span className="text-sm text-slate-300 font-medium truncate max-w-[70px]" title={path.fromPage}>
                                      {path.fromPage === '/' ? 'Home' : path.fromPage}
                                    </span>
                                    <span className="text-cyan-400 font-bold">→</span>
                                    <span className="text-sm text-slate-300 font-medium truncate max-w-[70px]" title={path.toPage}>
                                      {path.toPage === '/' ? 'Home' : path.toPage}
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded">{formatNumber(path.pageViews)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Landing to Next Page */}
                          {scaledGaData.userFlow.landingToNextPaths && scaledGaData.userFlow.landingToNextPaths.length > 0 && (
                            <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700/50">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-sm font-bold text-white">Entry Flow</h5>
                                <span className="text-xs text-slate-500">First → Second</span>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {scaledGaData.userFlow.landingToNextPaths.slice(0, 8).map((path, i) => (
                                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-xs font-bold text-slate-500 w-5">#{i + 1}</span>
                                      <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded font-semibold">ENTRY</span>
                                      <span className="text-sm text-slate-300 font-medium truncate max-w-[60px]" title={path.landingPage}>
                                        {path.landingPage === '/' ? 'Home' : path.landingPage}
                                      </span>
                                      <span className="text-emerald-400 font-bold">→</span>
                                      <span className="text-sm text-slate-300 font-medium truncate max-w-[60px]" title={path.nextPage}>
                                        {path.nextPage === '/' ? 'Home' : path.nextPage}
                                      </span>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded">{formatNumber(path.sessions)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                  {/* ==================== NEW ANALYTICS SECTIONS ==================== */}

                  {/* 1. Hourly Traffic Pattern */}
                  {scaledGaData?.hourlyTraffic && scaledGaData.hourlyTraffic.today && (
                    <div className="mt-8 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-2xl p-6 border border-indigo-100/50">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Hourly Traffic Pattern
                        <span className="text-xs text-gray-400 font-normal ml-2">Today's traffic by hour</span>
                        <span className="ml-auto text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                          Peak: {scaledGaData.hourlyTraffic.peakHour}:00
                        </span>
                      </h3>
                      <div className="bg-white rounded-xl p-4 border border-gray-200/50">
                        <div className="flex items-end gap-1 h-32">
                          {scaledGaData.hourlyTraffic.today?.map((h, i) => {
                            const maxUsers = Math.max(...scaledGaData.hourlyTraffic.today.map(x => x.users));
                            const height = maxUsers > 0 ? (h.users / maxUsers) * 100 : 0;
                            const isPeak = h.hour === scaledGaData.hourlyTraffic.peakHour;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center group relative">
                                <div
                                  className={`w-full rounded-t transition-all ${isPeak ? 'bg-gradient-to-t from-indigo-500 to-purple-500' : 'bg-gradient-to-t from-indigo-200 to-indigo-300'} hover:from-indigo-400 hover:to-purple-400`}
                                  style={{ height: `${Math.max(4, height)}%` }}
                                />
                                <span className="text-[9px] text-gray-400 mt-1">{h.hour}</span>
                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                  {h.hour}:00 - {formatNumber(h.users)} users
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-400">
                          <span>Midnight</span>
                          <span>Noon</span>
                          <span>Evening</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Content Performance */}
                  {scaledGaData.contentPerformance && (
                    <div className="mt-8 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-2xl p-6 border border-emerald-100/50">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        Content Performance
                        <span className="text-xs text-gray-400 font-normal ml-2">Articles per session: {scaledGaData.contentPerformance.articlesPerSession}</span>
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* By Category */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">By Category</h4>
                          <div className="space-y-3">
                            {scaledGaData.contentPerformance.byCategory?.map((cat, i) => (
                              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors">
                                <span className="text-sm font-medium text-gray-700">{cat.category}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-500">{formatNumber(cat.views)} views</span>
                                  <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">{cat.avgReadTime}s read</span>
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{cat.shareRate}% share</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Top Articles */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">Top Articles</h4>
                          <div className="space-y-2">
                            {scaledGaData.contentPerformance.topArticles?.slice(0, 5).map((article, i) => (
                              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                                  <span className="text-sm text-gray-700 truncate">{article.title}</span>
                                </div>
                                <span className="text-xs font-bold text-emerald-600 ml-2">{formatNumber(article.views)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Engagement Metrics (Advanced) */}
                  {scaledGaData.engagementAdvanced && (
                    <div className="mt-8 bg-gradient-to-br from-orange-50/50 to-amber-50/50 rounded-2xl p-6 border border-orange-100/50">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-orange-600" />
                        User Engagement
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-orange-600">{scaledGaData.engagementAdvanced.avgReadTime}s</div>
                          <div className="text-xs text-gray-500 mt-1">Avg Read Time</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-amber-600">{scaledGaData.engagementAdvanced.commentsPerArticle}</div>
                          <div className="text-xs text-gray-500 mt-1">Comments/Article</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-yellow-600">{scaledGaData.engagementAdvanced.shareRate}%</div>
                          <div className="text-xs text-gray-500 mt-1">Share Rate</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-green-600">{scaledGaData.engagementAdvanced.ctr}%</div>
                          <div className="text-xs text-gray-500 mt-1">Rec. CTR</div>
                        </div>
                      </div>
                      {/* Scroll Depth */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/50">
                        <h4 className="text-sm font-bold text-gray-800 mb-3">Scroll Depth</h4>
                        <div className="flex items-center gap-2">
                          {['25%', '50%', '75%', '100%'].map((depth, i) => {
                            const value = scaledGaData.engagementAdvanced.scrollDepth[depth] || 0;
                            const max = scaledGaData.engagementAdvanced.scrollDepth['25%'] || 1;
                            const width = Math.max(10, (value / max) * 100);
                            return (
                              <div key={depth} className="flex-1">
                                <div className="text-xs text-gray-500 text-center mb-1">{depth}</div>
                                <div className="bg-gray-100 rounded-full h-6 relative overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${i === 0 ? 'bg-orange-300' : i === 1 ? 'bg-orange-400' : i === 2 ? 'bg-orange-500' : 'bg-orange-600'}`}
                                    style={{ width: `${width}%` }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                                    {formatNumber(value)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Search Analytics */}
                  {scaledGaData.searchAnalytics && (
                    <div className="mt-8 bg-gradient-to-br from-violet-50/50 to-purple-50/50 rounded-2xl p-6 border border-violet-100/50">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-violet-600" />
                        Search Analytics
                        <span className="ml-auto text-sm font-semibold text-violet-600 bg-violet-100 px-3 py-1 rounded-full">
                          {formatNumber(scaledGaData.searchAnalytics.totalSearches)} total searches
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Top Keywords */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">Top Keywords</h4>
                          <div className="space-y-2">
                            {scaledGaData.searchAnalytics.topKeywords?.slice(0, 8).map((kw, i) => (
                              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50 hover:bg-violet-50 transition-colors">
                                <span className="text-sm text-gray-700">{kw.keyword}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{formatNumber(kw.searches)}</span>
                                  <span className="text-xs text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded">{kw.ctr}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Trending Searches */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">Trending Searches</h4>
                          <div className="space-y-2">
                            {scaledGaData.searchAnalytics.trendingSearches?.map((ts, i) => (
                              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50 hover:bg-green-50 transition-colors">
                                <div className="flex items-center gap-2">
                                  {ts.isNew && <span className="text-[9px] bg-red-500 text-white px-1 rounded">NEW</span>}
                                  <span className="text-sm text-gray-700">{ts.keyword}</span>
                                </div>
                                <span className="text-xs font-bold text-green-600">+{ts.change}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Zero Result Searches */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">Zero Result Searches</h4>
                          <div className="space-y-2">
                            {scaledGaData.searchAnalytics.zeroResultSearches?.map((zr, i) => (
                              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-red-50">
                                <span className="text-sm text-gray-700">{zr.keyword}</span>
                                <span className="text-xs text-red-600">{zr.count} searches</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500">Search to Click Rate</div>
                            <div className="text-lg font-bold text-violet-600">{scaledGaData.searchAnalytics.searchToClickRate}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. Cohort Analysis */}
                  {scaledGaData.cohortAnalysis && (
                    <div className="mt-8 bg-gradient-to-br from-cyan-50/50 to-sky-50/50 rounded-2xl p-6 border border-cyan-100/50">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-cyan-600" />
                        Cohort Analysis
                      </h3>
                      <div className="grid grid-cols-4 gap-4 mb-5">
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-cyan-600">{scaledGaData.cohortAnalysis.day1Retention}%</div>
                          <div className="text-xs text-gray-500 mt-1">Day 1 Retention</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-sky-600">{scaledGaData.cohortAnalysis.day7Retention}%</div>
                          <div className="text-xs text-gray-500 mt-1">Day 7 Retention</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-blue-600">{scaledGaData.cohortAnalysis.day30Retention}%</div>
                          <div className="text-xs text-gray-500 mt-1">Day 30 Retention</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-red-500">{scaledGaData.cohortAnalysis.churnRate}%</div>
                          <div className="text-xs text-gray-500 mt-1">Churn Rate</div>
                        </div>
                      </div>
                      {/* Cohort Table */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/50 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left py-2 px-2">Week</th>
                              <th className="text-right py-2 px-2">Size</th>
                              <th className="text-center py-2 px-2">W0</th>
                              <th className="text-center py-2 px-2">W1</th>
                              <th className="text-center py-2 px-2">W2</th>
                              <th className="text-center py-2 px-2">W3</th>
                              <th className="text-center py-2 px-2">W4</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scaledGaData.cohortAnalysis.weekly?.slice(-5).map((week, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="py-2 px-2 text-gray-700">{week.weekStart}</td>
                                <td className="py-2 px-2 text-right text-gray-600">{formatNumber(week.cohortSize)}</td>
                                {[0, 1, 2, 3, 4].map(w => {
                                  const val = week.retention[w];
                                  const bgColor = val !== undefined
                                    ? val > 50 ? 'bg-cyan-500' : val > 30 ? 'bg-cyan-400' : val > 15 ? 'bg-cyan-300' : 'bg-cyan-200'
                                    : 'bg-gray-100';
                                  return (
                                    <td key={w} className="py-2 px-2 text-center">
                                      {val !== undefined ? (
                                        <span className={`inline-block px-2 py-0.5 rounded text-white ${bgColor}`}>
                                          {val}%
                                        </span>
                                      ) : '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 6. Acquisition Details */}
                  {scaledGaData.acquisitionDetails && (
                    <div className="mt-8 bg-gradient-to-br from-lime-50/50 to-green-50/50 rounded-2xl p-6 border border-lime-100/50">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ExternalLink className="w-5 h-5 text-lime-600" />
                        Acquisition Details
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* By Channel */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">By Channel</h4>
                          <div className="space-y-2">
                            {scaledGaData.acquisitionDetails.byChannel?.map((ch, i) => (
                              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-lime-50 transition-colors">
                                <span className="text-sm font-medium text-gray-700">{ch.channel}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{formatNumber(ch.sessions)}</span>
                                  <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">{ch.bounceRate}%</span>
                                  <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">{ch.conversionRate}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Top Referrers */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">Top Referrers</h4>
                          <div className="space-y-2">
                            {scaledGaData.acquisitionDetails.topReferrers?.map((ref, i) => (
                              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-lime-50 transition-colors">
                                <span className="text-sm text-gray-700">{ref.referrer}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-lime-600 font-bold">{formatNumber(ref.sessions)} sessions</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. Performance Metrics */}
                  {scaledGaData.performance && (
                    <div className="mt-8 bg-gradient-to-br from-rose-50/50 to-pink-50/50 rounded-2xl p-6 border border-rose-100/50">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-rose-600" />
                        Performance Metrics
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">LCP</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${scaledGaData.performance.coreWebVitals.lcpStatus === 'good' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                              {scaledGaData.performance.coreWebVitals.lcpStatus}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800">{scaledGaData.performance.coreWebVitals.lcp}s</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">FID</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${scaledGaData.performance.coreWebVitals.fidStatus === 'good' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                              {scaledGaData.performance.coreWebVitals.fidStatus}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800">{scaledGaData.performance.coreWebVitals.fid}ms</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">CLS</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${scaledGaData.performance.coreWebVitals.clsStatus === 'good' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                              {scaledGaData.performance.coreWebVitals.clsStatus}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800">{scaledGaData.performance.coreWebVitals.cls}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">API Response</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-800">{scaledGaData.performance.apiResponseTime}ms</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Page Load Times */}
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">Page Load Times</h4>
                          <div className="space-y-2">
                            {scaledGaData.performance.pageLoadTimes?.map((p, i) => (
                              <div key={i} className="flex items-center justify-between py-1.5">
                                <span className="text-sm text-gray-600">{p.page}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${parseFloat(p.loadTime) < 2 ? 'bg-green-500' : parseFloat(p.loadTime) < 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                                      style={{ width: `${Math.min(100, (parseFloat(p.loadTime) / 4) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-gray-600 w-10 text-right">{p.loadTime}s</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Error Rates */}
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">Error Rates</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center py-4 bg-amber-50 rounded-xl">
                              <div className="text-2xl font-bold text-amber-600">{scaledGaData.performance.errorRates['4xx']}%</div>
                              <div className="text-xs text-gray-500 mt-1">4xx Errors</div>
                            </div>
                            <div className="text-center py-4 bg-red-50 rounded-xl">
                              <div className="text-2xl font-bold text-red-600">{scaledGaData.performance.errorRates['5xx']}%</div>
                              <div className="text-xs text-gray-500 mt-1">5xx Errors</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 8. K-Star Artist Popularity */}
                  {scaledGaData.artistPopularity && (
                    <div className="mt-8 bg-gradient-to-br from-fuchsia-50/50 to-pink-50/50 rounded-2xl p-6 border border-fuchsia-100/50">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-fuchsia-600" />
                        K-Star Artist Popularity
                      </h3>
                      {/* Fandom Activity Summary */}
                      <div className="grid grid-cols-3 gap-4 mb-5">
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-fuchsia-600">{formatNumber(scaledGaData.artistPopularity.fandomActivity.totalComments)}</div>
                          <div className="text-xs text-gray-500 mt-1">Total Comments</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-pink-600">{formatNumber(scaledGaData.artistPopularity.fandomActivity.totalVotes)}</div>
                          <div className="text-xs text-gray-500 mt-1">Total Votes</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200/50 text-center">
                          <div className="text-2xl font-bold text-purple-600">{scaledGaData.artistPopularity.fandomActivity.avgParticipationRate}%</div>
                          <div className="text-xs text-gray-500 mt-1">Participation Rate</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Top Artists */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3">Top Artists</h4>
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {scaledGaData.artistPopularity.topArtists?.map((artist, i) => (
                              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-fuchsia-50 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-medium text-gray-700">{artist.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">{formatNumber(artist.views)}</span>
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${artist.trend > 0 ? 'bg-green-100 text-green-600' : artist.trend < 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                    {artist.trend > 0 ? '+' : ''}{artist.trend}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Rising Artists */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50">
                          <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="text-lg">🚀</span> Rising Artists
                          </h4>
                          <div className="space-y-3">
                            {scaledGaData.artistPopularity.risingArtists?.map((artist, i) => (
                              <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-gradient-to-r from-fuchsia-50 to-pink-50 border border-fuchsia-100">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</span>
                                  <span className="text-sm font-bold text-gray-700">{artist.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-500">{formatNumber(artist.views)} views</span>
                                  <span className="text-sm font-bold text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                                    +{artist.weeklyGrowth}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {isUserAnalyticsOpen && !scaledGaData && (
              <div className="px-6 pb-8 border-t border-gray-100">
                <div className="p-12 text-center">
                  <div className="relative mx-auto w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                    <div className="absolute inset-1 rounded-full bg-white"></div>
                    <div className="absolute inset-3 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 animate-pulse"></div>
                  </div>
                  <p className="text-gray-600 font-medium">Loading analytics data...</p>
                  <p className="text-sm text-gray-400 mt-1">Please wait a moment</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'drama' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Dramas</h2>
              <Link
                href="/admin/drama/create"
                className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center"
              >
                <Plus size={16} className="mr-2" />
                Add New
              </Link>
            </div>

            {dramaLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading dramas...</p>
              </div>
            ) : dramaError ? (
              <div className="p-6 text-center">
                <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                <p className="text-red-500">{dramaError}</p>
              </div>
            ) : dramas.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No dramas found.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {dramas.map((drama) => (
                  <li key={drama._id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 rounded overflow-hidden bg-gray-100">
                        {drama.image ? (
                          <img
                            src={drama.image}
                            alt={drama.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/images/dramas/default-poster.jpg';
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gray-200">
                            <Film size={20} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-medium text-gray-800">{drama.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {drama.year} • {drama.episodes} eps • Rating: {drama.rating || 'N/A'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          href={`/admin/drama/edit/${drama._id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        >
                          <PenTool size={16} />
                        </Link>
                        <Link
                          href={`/drama/${drama._id}`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                          target="_blank"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          onClick={() => handleDeleteDrama(drama._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

// 서버 사이드 렌더링으로 강제 (SSG 비활성화)
export async function getServerSideProps() {
  return {
    props: {}
  };
}
 