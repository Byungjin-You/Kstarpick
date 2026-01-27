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
  Search
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
      dailyTrends: gaData.dailyTrends?.map((day, i) => ({
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
        landingPages: gaData.userFlow?.landingPages?.map((lp, i) => ({
          ...lp,
          sessions: scale(lp.sessions),
          bounceRate: varyRate(lp.bounceRate, 10, 80 + i, false),
        })),
        exitPages: gaData.userFlow?.exitPages?.map((ep, i) => ({
          ...ep,
          pageViews: scale(ep.pageViews),
          exits: scale(ep.exits),
          exitRate: varyRate(ep.exitRate, 10, 90 + i, false),
        })),
        sessionMetrics: gaData.userFlow?.sessionMetrics,
        navigationPaths: gaData.userFlow?.navigationPaths?.map(np => ({
          ...np,
          pageViews: scale(np.pageViews),
          users: scale(np.users),
        })),
        landingToNextPaths: gaData.userFlow?.landingToNextPaths?.map(lnp => ({
          ...lnp,
          sessions: scale(lnp.sessions),
        })),
      },
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

  // 헬퍼 함수들
  const formatNumber = (num) => {
    // 모든 숫자를 1의 자리까지 전체 표시 (K, M 없이)
    return num?.toLocaleString() || '0';
  };

  const getDeviceIcon = (device) => {
    switch (device?.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-5 h-5" />;
      case 'desktop': return <Monitor className="w-5 h-5" />;
      case 'tablet': return <Tablet className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  const getCountryFlag = (country) => {
    const flags = {
      'United States': '🇺🇸', 'South Korea': '🇰🇷', 'Japan': '🇯🇵',
      'Philippines': '🇵🇭', 'Indonesia': '🇮🇩', 'Thailand': '🇹🇭',
      'Vietnam': '🇻🇳', 'Malaysia': '🇲🇾', 'Brazil': '🇧🇷',
      'Mexico': '🇲🇽', 'India': '🇮🇳', 'United Kingdom': '🇬🇧',
    };
    return flags[country] || '🌍';
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
                {/* Realtime + Key Metrics - Modern Gradient Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-6">
                  {/* Realtime - Glassmorphism */}
                  <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white shadow-xl shadow-green-500/30">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5" />
                        <span className="text-xs font-bold tracking-wider opacity-90">LIVE NOW</span>
                      </div>
                      <h3 className="text-4xl font-black">{formatNumber(scaledGaData.realtime.activeUsers)}</h3>
                      <p className="text-sm opacity-80 mt-1">Active users</p>
                    </div>
                  </div>

                  {/* DAU - Modern Card */}
                  <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 group hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                    <div className="absolute top-3 right-3">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{d2DateStr}</span>
                    </div>
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl w-fit shadow-lg shadow-blue-500/30">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-800 mt-3">{formatNumber(scaledGaData.summary.dau.users)}</h3>
                    <p className="text-sm text-gray-500 font-medium">Daily Active Users</p>
                  </div>

                  {/* WAU - Modern Card */}
                  <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 group hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
                    <div className="absolute top-3 right-3">
                      <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">7 Days</span>
                    </div>
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl w-fit shadow-lg shadow-purple-500/30">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-800 mt-3">{formatNumber(scaledGaData.summary.wau.users)}</h3>
                    <p className="text-sm text-gray-500 font-medium">Weekly Active Users</p>
                  </div>

                  {/* MAU - Modern Card */}
                  <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 group hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
                    <div className="absolute top-3 right-3">
                      <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">30 Days</span>
                    </div>
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl w-fit shadow-lg shadow-orange-500/30">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-gray-800 mt-3">{formatNumber(scaledGaData.summary.mau.users)}</h3>
                    <p className="text-sm text-gray-500 font-medium">Monthly Active Users</p>
                  </div>
                </div>

                {/* Engagement Metrics - Modern Compact Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-all duration-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sessions/User</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{scaledGaData.engagement.avgSessionsPerUser}</p>
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-4 border border-gray-200/50 hover:shadow-md transition-all duration-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pages/Session</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{scaledGaData.engagement.avgPageViewsPerSession}</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-4 border border-green-200/50 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">New Users</p>
                    </div>
                    <p className="text-2xl font-black text-gray-800 mt-1">{formatNumber(scaledGaData.engagement.newUsers)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl p-4 border border-amber-200/50 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-600" />
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Retention</p>
                    </div>
                    <p className="text-2xl font-black text-gray-800 mt-1">{scaledGaData.engagement.retentionRate}%</p>
                  </div>
                </div>

                {/* DAU Chart - Modern Design with Inline Labels */}
                <div className="mt-8 bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-6 border border-gray-200/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Daily Active Users</h3>
                      <p className="text-sm text-gray-500">Last 30 days trend</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {scaledGaData.dailyTrends && scaledGaData.dailyTrends.length > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Max</p>
                          <p className="text-sm font-bold text-violet-600">{formatNumber(Math.max(...scaledGaData.dailyTrends.map(d => d.dau)))}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-violet-500"></div>
                        <span className="text-sm font-medium text-gray-600">Users</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart with inline data labels */}
                  <div className="relative" style={{ height: '280px' }}>
                    {(() => {
                      const data = scaledGaData.dailyTrends;
                      if (!data || data.length === 0) return null;
                      const maxDAU = Math.max(...data.map(d => d.dau));

                      return (
                        <div className="relative w-full h-full">
                          {/* SVG Chart */}
                          <svg width="100%" height="220" viewBox="0 0 1000 220" preserveAspectRatio="none" className="overflow-visible">
                            {/* Grid lines */}
                            {[0, 1, 2, 3, 4].map((i) => (
                              <g key={i}>
                                <line x1="0" y1={i * 50 + 10} x2="1000" y2={i * 50 + 10} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5,5" />
                              </g>
                            ))}

                            {/* Area and Line */}
                            <defs>
                              <linearGradient id="dauGradientModern" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
                              </linearGradient>
                              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="50%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#06b6d4" />
                              </linearGradient>
                            </defs>

                            {(() => {
                              const chartStartX = 20;
                              const chartWidth = 960;
                              const pointSpacing = chartWidth / (data.length - 1);
                              const areaPath = data.map((day, index) => {
                                const x = chartStartX + index * pointSpacing;
                                const y = 200 - ((day.dau / maxDAU) * 170);
                                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }).join(' ') + ` L ${chartStartX + (data.length - 1) * pointSpacing} 210 L ${chartStartX} 210 Z`;
                              const linePath = data.map((day, index) => {
                                const x = chartStartX + index * pointSpacing;
                                const y = 200 - ((day.dau / maxDAU) * 170);
                                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }).join(' ');

                              return (
                                <>
                                  <path d={areaPath} fill="url(#dauGradientModern)" />
                                  <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                                  {/* Data points with hover interaction */}
                                  {data.map((day, index) => {
                                    const x = chartStartX + index * pointSpacing;
                                    const y = 200 - ((day.dau / maxDAU) * 170);

                                    return (
                                      <g key={index}>
                                        {/* Invisible hover area for better UX */}
                                        <rect
                                          x={x - pointSpacing / 2}
                                          y={0}
                                          width={pointSpacing}
                                          height={220}
                                          fill="transparent"
                                          style={{ cursor: 'pointer' }}
                                          onMouseEnter={(e) => {
                                            const rect = e.currentTarget.closest('svg').getBoundingClientRect();
                                            setChartTooltip({
                                              visible: true,
                                              x: (x / 1000) * rect.width,
                                              y: (y / 220) * rect.height,
                                              date: new Date(day.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }),
                                              value: day.dau
                                            });
                                          }}
                                          onMouseLeave={() => setChartTooltip({ ...chartTooltip, visible: false })}
                                        />
                                        {/* Point */}
                                        <circle
                                          cx={x}
                                          cy={y}
                                          r="3"
                                          fill="white"
                                          stroke="#3b82f6"
                                          strokeWidth="2"
                                          style={{ pointerEvents: 'none' }}
                                        />
                                      </g>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </svg>

                          {/* Date Labels - 5일마다 표시 */}
                          <div className="relative w-full mt-1" style={{ height: '20px' }}>
                            {(() => {
                              const dateIndices = data.map((_, i) => i).filter(i => i % 5 === 0 || i === data.length - 1);
                              return dateIndices.map(index => {
                                const position = (index / (data.length - 1)) * 100;
                                return (
                                  <span
                                    key={index}
                                    className="absolute text-xs text-gray-400 font-medium transform -translate-x-1/2"
                                    style={{ left: `${position}%` }}
                                  >
                                    {new Date(data[index].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                );
                              });
                            })()}
                          </div>

                          {/* Tooltip */}
                          {chartTooltip.visible && (
                            <div
                              className="absolute pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full"
                              style={{
                                left: chartTooltip.x,
                                top: chartTooltip.y - 10,
                              }}
                            >
                              <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
                                <div className="font-semibold text-center">{formatNumber(chartTooltip.value)} users</div>
                                <div className="text-gray-300 text-xs text-center mt-0.5">{chartTooltip.date}</div>
                              </div>
                              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900 mx-auto"></div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Demographics Row - Modern Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                  {/* Countries */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-md shadow-blue-500/20">
                        <Globe className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Top Countries</h4>
                    </div>
                    <div className="space-y-3">
                      {scaledGaData.demographics.countries.slice(0, 5).map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-sm group">
                          <span className="flex items-center gap-3">
                            <span className="text-lg">{getCountryFlag(c.country)}</span>
                            <span className="text-gray-700 font-medium group-hover:text-blue-600 transition-colors">{c.country}</span>
                          </span>
                          <span className="font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">{formatNumber(c.users)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Devices */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-md shadow-purple-500/20">
                        <Smartphone className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Device Distribution</h4>
                    </div>
                    <div className="space-y-4">
                      {scaledGaData.demographics.devices.map((d, i) => {
                        const total = scaledGaData.demographics.devices.reduce((sum, x) => sum + x.users, 0);
                        const pct = ((d.users / total) * 100).toFixed(0);
                        const gradients = [
                          'from-blue-500 to-cyan-400',
                          'from-violet-500 to-purple-400',
                          'from-emerald-500 to-green-400'
                        ];
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="flex items-center gap-2 text-gray-700 font-medium capitalize">
                                {getDeviceIcon(d.device)}
                                {d.device}
                              </span>
                              <span className="font-bold text-gray-800">{pct}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${gradients[i]} rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Pages */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-md shadow-orange-500/20">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-800">Top Pages</h4>
                    </div>
                    <div className="space-y-3">
                      {scaledGaData.topPages.slice(0, 5).map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-sm group">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                            <span className="text-gray-700 truncate font-medium group-hover:text-orange-600 transition-colors" title={p.path}>
                              {p.path === '/' ? 'Home' : p.path}
                            </span>
                          </div>
                          <span className="font-bold text-gray-800 bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg text-xs ml-2">{formatNumber(p.pageViews)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scroll Depth & Engagement Row - Modern Design */}
                {scaledGaData.scrollDepth && scaledGaData.engagementMetrics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                    {/* Scroll Depth - Modern Card */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-md shadow-blue-500/20">
                            <ArrowDown className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-800">Scroll Depth</h4>
                            <p className="text-xs text-gray-500">90% completion rate</p>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full">
                          <span className="text-xs font-bold text-white">Avg: {scaledGaData.scrollDepth.avgScrollRate}%</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {scaledGaData.scrollDepth.pages.slice(0, 5).map((p, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-700 font-medium truncate flex-1">
                                {p.path === '/' ? 'Home' : p.path}
                              </span>
                              <span className="font-bold text-gray-800 ml-2">{p.scrollRate}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(parseFloat(p.scrollRate), 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Engagement Metrics - Modern Card */}
                    <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl shadow-md shadow-pink-500/20">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-800">Engagement Metrics</h4>
                          <p className="text-xs text-gray-500">User interaction analysis</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl p-4 border border-gray-200/50">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg. Session</p>
                          <p className="text-xl font-black text-gray-800 mt-1">
                            {Math.floor(parseFloat(scaledGaData.engagementMetrics.avgSessionDuration) / 60)}m {Math.floor(parseFloat(scaledGaData.engagementMetrics.avgSessionDuration) % 60)}s
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-4 border border-green-200/50">
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Engagement</p>
                          <p className="text-xl font-black text-emerald-600 mt-1">{scaledGaData.engagementMetrics.engagementRate}%</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl p-4 border border-orange-200/50">
                          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Bounce Rate</p>
                          <p className="text-xl font-black text-orange-600 mt-1">{scaledGaData.engagementMetrics.bounceRate}%</p>
                        </div>
                        <div className="bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl p-4 border border-purple-200/50">
                          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wider">Engaged</p>
                          <p className="text-xl font-black text-violet-600 mt-1">{formatNumber(scaledGaData.engagementMetrics.engagedSessions)}</p>
                        </div>
                      </div>

                      {/* Page Engagement */}
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Avg. Time on Page</p>
                        <div className="space-y-2">
                          {scaledGaData.engagementMetrics.pageEngagement.slice(0, 4).map((p, i) => (
                            <div key={i} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                              <span className="text-gray-700 font-medium truncate flex-1">
                                {p.path === '/' ? 'Home' : p.path}
                              </span>
                              <span className="font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg text-xs ml-2">{parseFloat(p.avgTimeOnPage).toFixed(0)}s</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Traffic Sources Row - Modern Design */}
                {scaledGaData.trafficSources && (
                  <div className="mt-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md shadow-indigo-500/20">
                        <Share2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">Traffic Sources</h3>
                        <p className="text-sm text-gray-500">Where your visitors come from</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Traffic Sources */}
                      <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <ExternalLink className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-sm font-bold text-gray-800">By Source</h4>
                        </div>
                        <div className="space-y-4">
                          {scaledGaData.trafficSources.sources.slice(0, 6).map((s, i) => {
                            const totalSessions = scaledGaData.trafficSources.sources.reduce((sum, x) => sum + x.sessions, 0);
                            const percentage = totalSessions > 0 ? ((s.sessions / totalSessions) * 100).toFixed(1) : 0;
                            const colors = [
                              'from-indigo-500 to-blue-500',
                              'from-violet-500 to-purple-500',
                              'from-pink-500 to-rose-500',
                              'from-orange-500 to-amber-500',
                              'from-emerald-500 to-green-500',
                              'from-cyan-500 to-teal-500'
                            ];
                            return (
                              <div key={i}>
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className="text-gray-700 font-medium capitalize">{s.source}</span>
                                  <span className="font-bold text-gray-800">{percentage}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Traffic Mediums */}
                      <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <Share2 className="w-4 h-4 text-purple-600" />
                          <h4 className="text-sm font-bold text-gray-800">By Medium</h4>
                        </div>
                        <div className="space-y-4">
                          {scaledGaData.trafficSources.mediums.map((m, i) => {
                            const totalSessions = scaledGaData.trafficSources.mediums.reduce((sum, x) => sum + x.sessions, 0);
                            const percentage = totalSessions > 0 ? ((m.sessions / totalSessions) * 100).toFixed(1) : 0;
                            const colors = [
                              'from-emerald-500 to-green-400',
                              'from-blue-500 to-cyan-400',
                              'from-violet-500 to-purple-400',
                              'from-orange-500 to-amber-400',
                              'from-pink-500 to-rose-400'
                            ];
                            return (
                              <div key={i}>
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className="text-gray-700 font-medium capitalize">{m.medium === '(none)' ? 'Direct' : m.medium}</span>
                                  <span className="font-bold text-gray-800">{formatNumber(m.sessions)}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Source/Medium Combination */}
                      <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <Search className="w-4 h-4 text-rose-600" />
                          <h4 className="text-sm font-bold text-gray-800">Source / Medium</h4>
                        </div>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                          {scaledGaData.trafficSources.sourceMedium.slice(0, 8).map((sm, i) => (
                            <div key={i} className="flex items-center justify-between text-sm py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                              <span className="text-gray-700 font-medium truncate flex-1" title={sm.sourceMedium}>
                                {sm.sourceMedium}
                              </span>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="font-bold text-gray-800 text-xs">{formatNumber(sm.sessions)}</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${parseFloat(sm.bounceRate) > 50 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                  {sm.bounceRate}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Flow Section */}
                {scaledGaData.userFlow && (
                    <div className="mt-6">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        User Flow Analysis
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Session Metrics */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
                          <h4 className="text-sm font-semibold opacity-90 mb-4">Session Metrics</h4>
                          <div className="space-y-4">
                            <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
                              <p className="text-xs opacity-80">Pages per Session</p>
                              <p className="text-2xl font-bold">{scaledGaData.userFlow.sessionMetrics.pageViewsPerSession}</p>
                            </div>
                            <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
                              <p className="text-xs opacity-80">Sessions per User</p>
                              <p className="text-2xl font-bold">{scaledGaData.userFlow.sessionMetrics.sessionsPerUser}</p>
                            </div>
                          </div>
                        </div>

                        {/* Landing Pages */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="flex items-center gap-2 mb-4">
                            <ArrowDown className="w-4 h-4 text-green-600 rotate-180" />
                            <h4 className="text-sm font-bold text-gray-800">Landing Pages</h4>
                            <span className="text-xs text-gray-400 ml-auto">Entry Points</span>
                          </div>
                          <div className="space-y-3">
                            {scaledGaData.userFlow.landingPages.slice(0, 5).map((lp, i) => (
                              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'}`}>
                                    {i + 1}
                                  </span>
                                  <span className="text-sm text-gray-700 font-medium truncate max-w-[120px]">{lp.page}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-500">{formatNumber(lp.sessions)} sessions</span>
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${parseFloat(lp.bounceRate) > 40 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                    {lp.bounceRate}% bounce
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Exit Pages */}
                        <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="flex items-center gap-2 mb-4">
                            <ArrowDown className="w-4 h-4 text-red-500" />
                            <h4 className="text-sm font-bold text-gray-800">Exit Pages</h4>
                            <span className="text-xs text-gray-400 ml-auto">Where users leave</span>
                          </div>
                          <div className="space-y-3">
                            {scaledGaData.userFlow.exitPages.slice(0, 5).map((ep, i) => (
                              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
                                    {i + 1}
                                  </span>
                                  <span className="text-sm text-gray-700 font-medium truncate max-w-[120px]">{ep.page}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-500">{formatNumber(ep.exits)} exits</span>
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${parseFloat(ep.exitRate) > 40 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {ep.exitRate}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Navigation Paths Section */}
                      {scaledGaData.userFlow.navigationPaths && scaledGaData.userFlow.navigationPaths.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <MousePointer className="w-4 h-4 text-cyan-600" />
                            Navigation Paths
                            <span className="text-xs text-gray-400 font-normal ml-2">Page to page transitions</span>
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Page Navigation Flow */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-sm font-bold text-gray-800">Page Transitions</h5>
                                <span className="text-xs text-gray-400">From → To</span>
                              </div>
                              <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {scaledGaData.userFlow.navigationPaths.slice(0, 10).map((path, i) => (
                                  <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gradient-to-r from-gray-50 to-cyan-50/30 hover:from-gray-100 hover:to-cyan-100/50 transition-colors">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                                      <span className="text-sm text-gray-700 font-medium truncate max-w-[80px]" title={path.fromPage}>
                                        {path.fromPage === '/' ? 'Home' : path.fromPage}
                                      </span>
                                      <span className="text-cyan-500 font-bold">→</span>
                                      <span className="text-sm text-gray-700 font-medium truncate max-w-[80px]" title={path.toPage}>
                                        {path.toPage === '/' ? 'Home' : path.toPage}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
                                      <span className="text-xs font-bold text-cyan-600 bg-cyan-100 px-2 py-1 rounded-lg">{formatNumber(path.pageViews)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Landing to Next Page */}
                            {scaledGaData.userFlow.landingToNextPaths && scaledGaData.userFlow.landingToNextPaths.length > 0 && (
                              <div className="bg-white rounded-2xl p-5 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-sm font-bold text-gray-800">First Page → Second Page</h5>
                                  <span className="text-xs text-gray-400">Entry flow</span>
                                </div>
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                  {scaledGaData.userFlow.landingToNextPaths.slice(0, 10).map((path, i) => (
                                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gradient-to-r from-gray-50 to-green-50/30 hover:from-gray-100 hover:to-green-100/50 transition-colors">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded font-semibold">ENTRY</span>
                                          <span className="text-sm text-gray-700 font-medium truncate max-w-[70px]" title={path.landingPage}>
                                            {path.landingPage === '/' ? 'Home' : path.landingPage}
                                          </span>
                                        </div>
                                        <span className="text-green-500 font-bold">→</span>
                                        <span className="text-sm text-gray-700 font-medium truncate max-w-[80px]" title={path.nextPage}>
                                          {path.nextPage === '/' ? 'Home' : path.nextPage}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 ml-2">
                                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-lg">{formatNumber(path.sessions)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
 