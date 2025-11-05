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
  ChevronDown
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
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [topContent, setTopContent] = useState([]);
  const [pageViewStats, setPageViewStats] = useState(null);
  const [dailyVisitors, setDailyVisitors] = useState(3000);
  const [weeklyVisitors, setWeeklyVisitors] = useState(15000);
  const [monthlyVisitors, setMonthlyVisitors] = useState(50000);
  const [viewMultiplier, setViewMultiplier] = useState(10);
  const [isDataSettingsOpen, setIsDataSettingsOpen] = useState(false);
  const [dayFilter, setDayFilter] = useState(15);
  const [dailyDAUData, setDailyDAUData] = useState([]);

  // URL에서 탭 파라미터 가져오기
  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab);
    }
  }, [router.query.tab]);

  // Load saved data settings from localStorage
  useEffect(() => {
    const savedMultiplier = localStorage.getItem('dataMultiplier');
    const savedDAU = localStorage.getItem('dailyActiveUsers');
    const savedWAU = localStorage.getItem('weeklyActiveUsers');
    const savedMAU = localStorage.getItem('monthlyActiveUsers');
    const savedDailyDAU = localStorage.getItem('dailyDAUData');

    if (savedMultiplier) {
      setViewMultiplier(Number(savedMultiplier));
    }
    if (savedDAU) {
      setDailyVisitors(Number(savedDAU));
    }
    if (savedWAU) {
      setWeeklyVisitors(Number(savedWAU));
    }
    if (savedMAU) {
      setMonthlyVisitors(Number(savedMAU));
    }
    if (savedDailyDAU) {
      try {
        setDailyDAUData(JSON.parse(savedDailyDAU));
      } catch (e) {
        console.error('Error parsing daily DAU data:', e);
      }
    }
  }, []);

  // Save data settings to localStorage
  const handleSaveSettings = () => {
    localStorage.setItem('dataMultiplier', viewMultiplier.toString());
    localStorage.setItem('dailyActiveUsers', dailyVisitors.toString());
    localStorage.setItem('weeklyActiveUsers', weeklyVisitors.toString());
    localStorage.setItem('monthlyActiveUsers', monthlyVisitors.toString());
    localStorage.setItem('dailyDAUData', JSON.stringify(dailyDAUData));
    alert('Settings saved successfully!');
  };

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

  // Fetch weekly stats (last 7 days)
  useEffect(() => {
    const fetchWeeklyStats = async () => {
      try {
        const last7Days = [];
        const today = new Date();

        // 지난 7일 데이터 생성
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);

          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          const dateStr = date.toISOString();
          const nextDateStr = nextDate.toISOString();

          // 각 카테고리별로 해당 날짜의 뉴스 개수 조회
          const [musicRes, dramaRes, filmRes, celebRes] = await Promise.all([
            fetch(`/api/news?category=kpop&limit=1&createdAfter=${dateStr}&createdBefore=${nextDateStr}`),
            fetch(`/api/news/drama?limit=1&createdAfter=${dateStr}&createdBefore=${nextDateStr}`),
            fetch(`/api/news/movie?limit=1&createdAfter=${dateStr}&createdBefore=${nextDateStr}`),
            fetch(`/api/news/celeb?limit=1&createdAfter=${dateStr}&createdBefore=${nextDateStr}`)
          ]);

          const [musicData, dramaData, filmData, celebData] = await Promise.all([
            musicRes.json(),
            dramaRes.json(),
            filmRes.json(),
            celebRes.json()
          ]);

          last7Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            music: musicData.data?.total || 0,
            drama: dramaData.pagination?.total || 0,
            film: filmData.pagination?.total || 0,
            celeb: celebData.pagination?.total || 0,
            total: (musicData.data?.total || 0) + (dramaData.pagination?.total || 0) + (filmData.pagination?.total || 0) + (celebData.pagination?.total || 0)
          });
        }

        setWeeklyStats(last7Days);
      } catch (error) {
        console.error('Error fetching weekly stats:', error);
      }
    };

    fetchWeeklyStats();
  }, []);

  // Fetch top performing content
  useEffect(() => {
    const fetchTopContent = async () => {
      try {
        // 조회수 기준 상위 5개 뉴스
        const response = await fetch('/api/news?limit=5&sort=viewCount&order=desc');
        const data = await response.json();

        if (data.success && data.data?.news) {
          setTopContent(data.data.news);
        }
      } catch (error) {
        console.error('Error fetching top content:', error);
      }
    };

    fetchTopContent();

    // 1시간마다 갱신 (3600000ms = 1시간)
    const interval = setInterval(fetchTopContent, 3600000);
    return () => clearInterval(interval);
  }, []);

  // Fetch page view statistics (last N days based on filter)
  useEffect(() => {
    const fetchPageViewStats = async () => {
      try {
        const response = await fetch(`/api/analytics/visitors?days=${dayFilter}`, {
          credentials: 'include', // 세션 쿠키 포함
        });
        const data = await response.json();

        if (data.success) {
          // 지난 N일의 모든 날짜를 생성
          const lastNDays = [];
          const today = new Date();

          for (let i = dayFilter - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            // API에서 받은 데이터에서 해당 날짜 찾기
            const dayData = data.dailyTrends?.find(d => d.date === dateStr);

            lastNDays.push({
              date: dateStr,
              views: dayData?.views || 0,
              articles: dayData?.articles || 0
            });
          }

          // dailyTrends를 완전한 N일 데이터로 교체
          const updatedData = {
            ...data,
            dailyTrends: lastNDays
          };

          setPageViewStats(updatedData);
        } else {
          console.error('Failed to fetch page view stats:', data.message);
        }
      } catch (error) {
        console.error('Error fetching page view stats:', error);
      }
    };

    // 세션이 로드된 후에만 실행
    if (session && session.user?.role === 'admin') {
      fetchPageViewStats();
    }
  }, [session, dayFilter]);

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
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
      <div className="flex flex-col w-full">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">{currentDate}</p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <Music size={24} />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-sm">Total Music</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.music.toLocaleString()}</h3>
                {stats.musicToday > 0 && (
                  <p className="text-xs text-green-600 mt-1">+{stats.musicToday} today</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <Video size={24} />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-sm">Total Dramas</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.dramas.toLocaleString()}</h3>
                {stats.dramasToday > 0 && (
                  <p className="text-xs text-green-600 mt-1">+{stats.dramasToday} today</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                <Film size={24} />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-sm">Total Films</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.films.toLocaleString()}</h3>
                {stats.filmsToday > 0 && (
                  <p className="text-xs text-green-600 mt-1">+{stats.filmsToday} today</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-pink-100 text-pink-600 mr-4">
                <Star size={24} />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-sm">Total Celebs</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.celebs.toLocaleString()}</h3>
                {stats.celebsToday > 0 && (
                  <p className="text-xs text-green-600 mt-1">+{stats.celebsToday} today</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Page Views */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Daily Page Views (Last {dayFilter} Days)</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setDayFilter(7)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dayFilter === 7
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setDayFilter(15)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dayFilter === 15
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  15 Days
                </button>
                <button
                  onClick={() => setDayFilter(30)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dayFilter === 30
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  30 Days
                </button>
              </div>
            </div>
            {!pageViewStats ? (
              <div className="p-8 text-center text-gray-500">
                <Eye size={48} className="mx-auto mb-2 opacity-30" />
                <p>Loading page view statistics...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <p className="text-xs text-blue-600 font-medium mb-1">Total Views</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {(pageViewStats.summary.totalViews * viewMultiplier).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <p className="text-xs text-green-600 font-medium mb-1">av.PV</p>
                    <p className="text-2xl font-bold text-green-700">
                      {(() => {
                        const totalViews = pageViewStats.summary.totalViews * viewMultiplier;
                        let divisor;
                        if (dayFilter === 7) {
                          divisor = dailyVisitors; // DAU for 7 days
                        } else if (dayFilter === 15) {
                          divisor = weeklyVisitors; // WAU for 15 days
                        } else {
                          divisor = monthlyVisitors; // MAU for 30 days
                        }
                        return (totalViews / divisor).toFixed(1);
                      })()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <p className="text-xs text-purple-600 font-medium mb-1">Total Content</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {pageViewStats.summary.totalContent.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                    <p className="text-xs text-orange-600 font-medium mb-1">av.DAU</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {dailyVisitors.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4">
                    <p className="text-xs text-pink-600 font-medium mb-1">WAU</p>
                    <p className="text-2xl font-bold text-pink-700">
                      {weeklyVisitors.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4">
                    <p className="text-xs text-indigo-600 font-medium mb-1">MAU</p>
                    <p className="text-2xl font-bold text-indigo-700">
                      {monthlyVisitors.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Daily Trends Chart */}
                {pageViewStats.dailyTrends && pageViewStats.dailyTrends.length > 0 && (
                  <div className="px-8">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Trends</h3>
                    <div className="relative" style={{ height: '300px' }}>
                      <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
                        {/* Grid lines */}
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <line
                            key={i}
                            x1="0"
                            y1={i * 60}
                            x2="1000"
                            y2={i * 60}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                          />
                        ))}

                        {(() => {
                          // DAU 데이터 준비
                          const dauByDate = {};
                          dailyDAUData.forEach(d => {
                            dauByDate[d.date] = d.dau;
                          });

                          // 최대값 계산 (페이지뷰와 DAU 모두 고려)
                          const maxViews = Math.max(...pageViewStats.dailyTrends.map(d => d.views * viewMultiplier), 1);
                          const maxDAU = Math.max(...pageViewStats.dailyTrends.map(d => dauByDate[d.date] || 0), 1);
                          const maxValue = Math.max(maxViews, maxDAU);

                          const pointSpacing = pageViewStats.dailyTrends.length > 1
                            ? 1000 / (pageViewStats.dailyTrends.length - 1)
                            : 500;

                          // 페이지뷰 경로
                          const pathData = pageViewStats.dailyTrends.map((day, index) => {
                            const x = index * pointSpacing;
                            const y = maxValue > 0 ? 270 - ((day.views * viewMultiplier) / maxValue * 240) : 270;
                            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }).join(' ');

                          // DAU 경로
                          const dauPathData = pageViewStats.dailyTrends.map((day, index) => {
                            const dau = dauByDate[day.date] || 0;
                            const x = index * pointSpacing;
                            const y = maxValue > 0 ? 270 - (dau / maxValue * 240) : 270;
                            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                          }).join(' ');

                          return (
                            <>
                              {/* 페이지뷰 Area fill */}
                              <path
                                d={`${pathData} L ${(pageViewStats.dailyTrends.length - 1) * pointSpacing} 300 L 0 300 Z`}
                                fill="url(#gradient)"
                                opacity="0.3"
                              />
                              {/* 페이지뷰 Line */}
                              <path
                                d={pathData}
                                fill="none"
                                stroke="#233CFA"
                                strokeWidth="3"
                              />
                              {/* DAU Line */}
                              <path
                                d={dauPathData}
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="3"
                                strokeDasharray="5,5"
                              />
                              {/* 페이지뷰 Dots and Labels */}
                              {pageViewStats.dailyTrends.map((day, index) => {
                                const x = index * pointSpacing;
                                const y = maxValue > 0 ? 270 - ((day.views * viewMultiplier) / maxValue * 240) : 270;
                                const displayValue = (day.views * viewMultiplier).toLocaleString();
                                const isFirst = index === 0;
                                const isLast = index === pageViewStats.dailyTrends.length - 1;
                                const textAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle';

                                return (
                                  <g key={`pv-${index}`}>
                                    <ellipse
                                      cx={x}
                                      cy={y}
                                      rx="3"
                                      ry="5"
                                      fill="#233CFA"
                                      stroke="white"
                                      strokeWidth="1.5"
                                    />
                                    {/* Value label above point */}
                                    <text
                                      x={x}
                                      y={y - 10}
                                      textAnchor={textAnchor}
                                      fontSize="10"
                                      fill="#233CFA"
                                      fontWeight="600"
                                      transform={`scale(0.9, 1.5) translate(${x * 0.11}, ${(y - 10) * -0.33})`}
                                    >
                                      {displayValue}
                                    </text>
                                    <title>{`${day.date}: ${displayValue} views`}</title>
                                  </g>
                                );
                              })}
                              {/* DAU Dots and Labels */}
                              {pageViewStats.dailyTrends.map((day, index) => {
                                const dau = dauByDate[day.date] || 0;
                                if (dau === 0) return null;

                                const x = index * pointSpacing;
                                const y = maxValue > 0 ? 270 - (dau / maxValue * 240) : 270;
                                const isFirst = index === 0;
                                const isLast = index === pageViewStats.dailyTrends.length - 1;
                                const textAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle';

                                return (
                                  <g key={`dau-${index}`}>
                                    <circle
                                      cx={x}
                                      cy={y}
                                      r="4"
                                      fill="#f97316"
                                      stroke="white"
                                      strokeWidth="1.5"
                                    />
                                    {/* DAU value label */}
                                    <text
                                      x={x}
                                      y={y + 20}
                                      textAnchor={textAnchor}
                                      fontSize="9"
                                      fill="#f97316"
                                      fontWeight="600"
                                      transform={`scale(0.9, 1.5) translate(${x * 0.11}, ${(y + 20) * -0.33})`}
                                    >
                                      {dau.toLocaleString()}
                                    </text>
                                    <title>{`${day.date}: ${dau.toLocaleString()} DAU`}</title>
                                  </g>
                                );
                              })}
                              {/* Gradient definition */}
                              <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#233CFA" stopOpacity="0.8" />
                                  <stop offset="100%" stopColor="#233CFA" stopOpacity="0.1" />
                                </linearGradient>
                              </defs>
                            </>
                          );
                        })()}
                      </svg>

                      {/* X-axis labels */}
                      <div className="relative mt-2" style={{ height: '20px' }}>
                        {pageViewStats.dailyTrends.map((day, index) => {
                          // 3일마다 또는 첫/마지막 날짜만 표시
                          const shouldShow = index === 0 || index === pageViewStats.dailyTrends.length - 1 || index % 3 === 0;
                          if (!shouldShow) return null;

                          const pointSpacing = pageViewStats.dailyTrends.length > 1
                            ? 100 / (pageViewStats.dailyTrends.length - 1)
                            : 50;
                          const leftPosition = index * pointSpacing;

                          return (
                            <span
                              key={index}
                              className="text-xs text-gray-500 absolute transform -translate-x-1/2 whitespace-nowrap"
                              style={{ left: `${leftPosition}%` }}
                            >
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          );
                        })}
                      </div>
                      {/* Legend */}
                      <div className="flex justify-center gap-6 mt-6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-[#233CFA]"></div>
                          <span className="text-xs text-gray-600">Page Views</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg width="16" height="2" viewBox="0 0 16 2">
                            <line x1="0" y1="1" x2="16" y2="1" stroke="#f97316" strokeWidth="2" strokeDasharray="3,3" />
                          </svg>
                          <span className="text-xs text-gray-600">DAU</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Stats Chart & Top Content - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Stats Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Last 7 Days Activity</h2>
{weeklyStats.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity size={48} className="mx-auto mb-2 opacity-30" />
                <p>Loading weekly stats...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Line Chart */}
                <div className="relative" style={{ height: '240px' }}>
                  <svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="0"
                        y1={i * 60}
                        x2="600"
                        y2={i * 60}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    ))}

                    {(() => {
                      const maxValue = Math.max(...weeklyStats.map(d => Math.max(d.music, d.drama, d.film, d.celeb)));
                      const pointSpacing = 600 / (weeklyStats.length - 1);

                      // Helper function to create path
                      const createPath = (values) => {
                        return values.map((value, index) => {
                          const x = index * pointSpacing;
                          const y = 240 - (value / maxValue * 200) - 20;
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ');
                      };

                      // Helper function to create dots
                      const createDots = (values, color) => {
                        return values.map((value, index) => {
                          const x = index * pointSpacing;
                          const y = 240 - (value / maxValue * 200) - 20;
                          return (
                            <circle
                              key={index}
                              cx={x}
                              cy={y}
                              r="4"
                              fill={color}
                              stroke="white"
                              strokeWidth="2"
                            />
                          );
                        });
                      };

                      const musicValues = weeklyStats.map(d => d.music);
                      const dramaValues = weeklyStats.map(d => d.drama);
                      const filmValues = weeklyStats.map(d => d.film);
                      const celebValues = weeklyStats.map(d => d.celeb);

                      return (
                        <>
                          {/* Music line */}
                          <path
                            d={createPath(musicValues)}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2.5"
                          />
                          {createDots(musicValues, '#3b82f6')}

                          {/* Drama line */}
                          <path
                            d={createPath(dramaValues)}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="2.5"
                          />
                          {createDots(dramaValues, '#22c55e')}

                          {/* Film line */}
                          <path
                            d={createPath(filmValues)}
                            fill="none"
                            stroke="#a855f7"
                            strokeWidth="2.5"
                          />
                          {createDots(filmValues, '#a855f7')}

                          {/* Celeb line */}
                          <path
                            d={createPath(celebValues)}
                            fill="none"
                            stroke="#ec4899"
                            strokeWidth="2.5"
                          />
                          {createDots(celebValues, '#ec4899')}
                        </>
                      );
                    })()}
                  </svg>

                  {/* X-axis labels */}
                  <div className="flex justify-between mt-2">
                    {weeklyStats.map((day, index) => (
                      <span key={index} className="text-xs text-gray-500">
                        {day.date}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Music</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Drama</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Film</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">Celeb</span>
                  </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-4 gap-2 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Music</p>
                    <p className="text-sm font-semibold text-blue-600">
                      {weeklyStats.reduce((sum, d) => sum + d.music, 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Drama</p>
                    <p className="text-sm font-semibold text-green-600">
                      {weeklyStats.reduce((sum, d) => sum + d.drama, 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Film</p>
                    <p className="text-sm font-semibold text-purple-600">
                      {weeklyStats.reduce((sum, d) => sum + d.film, 0)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Celeb</p>
                    <p className="text-sm font-semibold text-pink-600">
                      {weeklyStats.reduce((sum, d) => sum + d.celeb, 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top Content */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Content</h2>
            {topContent.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Star size={48} className="mx-auto mb-2 opacity-30" />
                <p>Loading top content...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topContent.map((content, index) => (
                  <div key={content._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#233CFA] flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{content.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Eye size={12} />
                          {((content.viewCount || 0) * viewMultiplier).toLocaleString()}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full capitalize" style={{
                          backgroundColor: content.category === 'kpop' ? '#E8EEFF' :
                                         content.category === 'drama' ? '#E8F5E9' :
                                         content.category === 'movie' ? '#F3E5F5' : '#FCE4EC',
                          color: content.category === 'kpop' ? '#233CFA' :
                                content.category === 'drama' ? '#2E7D32' :
                                content.category === 'movie' ? '#7B1FA2' : '#C2185B'
                        }}>
                          {content.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Newspaper size={48} className="mx-auto mb-2 opacity-30" />
                <p>No recent activity</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentActivity.map((activity, index) => (
                <li key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start">
                    <div className="mr-4">
                      {activity.type === 'news' && (
                        <div className="p-2 bg-blue-100 text-blue-500 rounded-full">
                          <Newspaper size={20} />
                        </div>
                      )}
                      {activity.type === 'drama' && (
                        <div className="p-2 bg-green-100 text-green-500 rounded-full">
                          <Video size={20} />
                        </div>
                      )}
                      {activity.type === 'film' && (
                        <div className="p-2 bg-purple-100 text-purple-500 rounded-full">
                          <Film size={20} />
                        </div>
                      )}
                      {activity.type === 'music' && (
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                          <Music size={20} />
                        </div>
                      )}
                      {activity.type === 'celeb' && (
                        <div className="p-2 bg-pink-100 text-pink-500 rounded-full">
                          <Star size={20} />
                        </div>
                      )}
                      {activity.type === 'user' && (
                        <div className="p-2 bg-indigo-100 text-indigo-500 rounded-full">
                          <Users size={20} />
                        </div>
                      )}
                      {activity.type === 'comment' && (
                        <div className="p-2 bg-gray-100 text-gray-500 rounded-full">
                          <MessageCircle size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            )}
          </div>

          {/* Content Trend Analysis */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">콘텐츠 트렌드 분석</h2>

            {/* Trending Topics */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-lg">🔥</span>
                지금 핫한 트렌드
              </h3>
              <div className="space-y-3">
                {/* Top Topic */}
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-orange-800">K-Pop: Awards & Events</span>
                        <span className="px-2 py-0.5 bg-orange-200 text-orange-800 text-xs font-bold rounded-full">
                          #1 TRENDING
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 bg-orange-200 rounded-full flex-1 max-w-xs">
                          <div className="h-2 bg-orange-500 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <span className="text-sm font-semibold text-orange-700">60%</span>
                        <span className="text-xs text-orange-600">(3/5)</span>
                      </div>
                      <p className="text-sm text-orange-700 italic">
                        "시상식 & 이벤트 발표 기사가 압도적인 참여도"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Second Topic */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-purple-800">Movie: Survival Show Coverage</span>
                        <span className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs font-bold rounded-full">
                          #2 TRENDING
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 bg-purple-200 rounded-full flex-1 max-w-xs">
                          <div className="h-2 bg-purple-500 rounded-full" style={{ width: '20%' }}></div>
                        </div>
                        <span className="text-sm font-semibold text-purple-700">20%</span>
                        <span className="text-xs text-purple-600">(1/5)</span>
                      </div>
                      <p className="text-sm text-purple-700 italic">
                        "리얼리티 쇼 관심도 지속적으로 높음"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-lg">💡</span>
                핵심 인사이트
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">시상식 시즌 콘텐츠가 압도적 성과</span> -
                    ISAC 발표 기사만으로 65K 조회수 달성 (평균 대비 3배 상회)
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">라인업 발표 기사가 높은 참여도</span> -
                    AAA와 TMA "퍼스트 라인업" 기사 모두 Top 5 진입
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">서바이벌 쇼 업데이트가 지속적인 관심 유지</span> -
                    BOYS II PLANET 순위 발표 기사 17K 조회수 달성
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <p className="text-sm text-gray-700">
                    시상식 콘텐츠 평균: <span className="font-semibold text-blue-600">33,192</span> vs
                    서바이벌 쇼: <span className="font-semibold text-purple-600">17,150</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Discovered Trends */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-lg">📈</span>
                발견된 트렌드
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">✅</span>
                    <span className="text-sm font-bold text-green-800">가설 검증 완료</span>
                  </div>
                  <p className="text-xs text-green-700 mb-2 font-semibold">
                    "아이돌 시상식이 압도적 우위"
                  </p>
                  <p className="text-xs text-green-600">
                    Top 5에 시상식 관련 기사 3개 포함(60%). ISAC 스포츠 대회가 가장 높은 참여도 기록.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">✅</span>
                    <span className="text-sm font-bold text-green-800">가설 검증 완료</span>
                  </div>
                  <p className="text-xs text-green-700 mb-2 font-semibold">
                    "서바이벌 쇼 콘텐츠의 높은 성과"
                  </p>
                  <p className="text-xs text-green-600">
                    BOYS II PLANET 순위 업데이트가 17K 조회수로 3위 달성, 전통적인 영화 뉴스보다 높은 성과.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">🆕</span>
                    <span className="text-sm font-bold text-blue-800">신규 발견</span>
                  </div>
                  <p className="text-xs text-blue-700 mb-2 font-semibold">
                    "라인업 발표에 대한 높은 수요"
                  </p>
                  <p className="text-xs text-blue-600">
                    팬들이 자신의 아티스트가 참여하는지 확인하기 위해 "퍼스트 라인업" 발표를 적극적으로 찾음.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">⚡</span>
                    <span className="text-sm font-bold text-blue-800">성과 격차</span>
                  </div>
                  <p className="text-xs text-blue-700 mb-2 font-semibold">
                    "ISAC가 3배 조회수로 압도"
                  </p>
                  <p className="text-xs text-blue-600">
                    ISAC 발표(65K)가 2위 AAA(23K)보다 거의 3배 높은 조회수 달성.
                  </p>
                </div>
              </div>
            </div>

            {/* Content Strategy Recommendations */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-lg">🎯</span>
                콘텐츠 전략 권장사항
              </h3>
              <div className="space-y-3">
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📺</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-emerald-900 mb-1">시상식 시즌 커버리지 확대</h4>
                      <p className="text-xs text-emerald-700 mb-2">
                        주요 K-pop 시상식(MAMA, AAA, TMA, 골든디스크)의 라인업 발표, 후보 목록, 투표 정보를 즉시 보도하는 것을 우선순위로 설정.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded">높은 우선순위</span>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded">+40% 참여도 증가 예상</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-violet-50 border-l-4 border-violet-500 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🏆</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-violet-900 mb-1">주간 서바이벌 쇼 리캡 제작</h4>
                      <p className="text-xs text-violet-700 mb-2">
                        인기 서바이벌/오디션 프로그램(피지컬:100, 보이즈 플래닛, 걸즈 플래닛)의 순위, 탈락, 하이라이트를 다루는 주간 다이제스트 기사 제작.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded">중간 우선순위</span>
                        <span className="px-2 py-1 bg-violet-100 text-violet-700 text-xs rounded">지속적 참여도</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-amber-900 mb-1">드라마 & 개별 셀럽 커버리지 다각화</h4>
                      <p className="text-xs text-amber-700 mb-2">
                        현재 Top 5에 드라마와 개별 셀럽 뉴스가 부족. 시청률 업데이트, 캐스팅 소식, 셀럽 개인 이정표를 포함하여 콘텐츠 믹스 균형 조정 필요.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">주의 필요</span>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">현재 0% 커버리지</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎪</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-sky-900 mb-1">특별 아이돌 이벤트 집중</h4>
                      <p className="text-xs text-sky-700 mb-2">
                        ISAC형 특별 이벤트(스포츠 대회, 예능 스페셜)가 압도적인 참여도 생성. 이러한 비전통적 아이돌 콘텐츠 기회를 모니터링하고 보도.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-sky-100 text-sky-700 text-xs rounded">높은 영향력</span>
                        <span className="px-2 py-1 bg-sky-100 text-sky-700 text-xs rounded">이벤트 기반</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

        {/* etc */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm">
            <button
              onClick={() => setIsDataSettingsOpen(!isDataSettingsOpen)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-lg font-semibold text-gray-800">etc</h2>
              <ChevronDown
                size={20}
                className={`transform transition-transform ${isDataSettingsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isDataSettingsOpen && (
              <div className="px-6 pb-6 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                  {/* Data Multiplier */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Data Multiplier
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={viewMultiplier}
                        onChange={(e) => setViewMultiplier(Number(e.target.value) || 1)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        step="1"
                      />
                      <span className="text-sm text-gray-500">×</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      All view counts will be multiplied by this number
                    </p>
                  </div>

                  {/* Daily Visitors */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      av.DAU (Daily Active Users)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={dailyVisitors}
                        onChange={(e) => setDailyVisitors(Number(e.target.value) || 1)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="1"
                        step="1"
                      />
                      <span className="text-sm text-gray-500">users</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Manually set the daily active users count
                    </p>
                  </div>

                  {/* Weekly Visitors */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      WAU (Weekly Active Users)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={weeklyVisitors}
                        onChange={(e) => setWeeklyVisitors(Number(e.target.value) || 1)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        min="1"
                        step="1"
                      />
                      <span className="text-sm text-gray-500">users</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Manually set the weekly active users count
                    </p>
                  </div>

                  {/* Monthly Visitors */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      MAU (Monthly Active Users)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={monthlyVisitors}
                        onChange={(e) => setMonthlyVisitors(Number(e.target.value) || 1)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="1"
                        step="1"
                      />
                      <span className="text-sm text-gray-500">users</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Manually set the monthly active users count
                    </p>
                  </div>
                </div>

                {/* 30일 DAU 데이터 입력 */}
                <div className="col-span-full mt-6">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">
                    Daily DAU Data (30 Days)
                  </label>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                    {Array.from({ length: 30 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (29 - i));
                      const dateStr = date.toISOString().split('T')[0];
                      const existingData = dailyDAUData.find(d => d.date === dateStr);

                      return (
                        <div key={i} className="flex flex-col gap-1">
                          <label className="text-xs text-gray-500">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </label>
                          <input
                            type="number"
                            value={existingData?.dau || ''}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setDailyDAUData(prev => {
                                const newData = prev.filter(d => d.date !== dateStr);
                                if (value > 0) {
                                  newData.push({ date: dateStr, dau: value });
                                }
                                return newData.sort((a, b) => a.date.localeCompare(b.date));
                              });
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                            placeholder="DAU"
                            min="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter daily active user counts for the last 30 days to display on the Daily Trends chart
                  </p>
                </div>

                {/* Save Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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