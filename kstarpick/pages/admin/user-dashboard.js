import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import {
  Users,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  UserPlus,
  UserCheck,
  RefreshCw,
  BarChart3,
  PieChart,
  MapPin,
  FileText,
  Zap
} from 'lucide-react';

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [gaData, setGaData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 인증 체크
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/admin/login');
    } else if (session.user?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  // GA 데이터 가져오기
  const fetchGAData = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch('/api/analytics/ga-realtime', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setGaData(data.data);
        setLastUpdated(new Date());
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch GA data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchGAData();
      // 5분마다 자동 새로고침
      const interval = setInterval(fetchGAData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [session]);

  if (status === 'loading' || isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading user analytics...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
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
      'United States': '🇺🇸',
      'South Korea': '🇰🇷',
      'Japan': '🇯🇵',
      'Philippines': '🇵🇭',
      'Indonesia': '🇮🇩',
      'Thailand': '🇹🇭',
      'Vietnam': '🇻🇳',
      'Malaysia': '🇲🇾',
      'Brazil': '🇧🇷',
      'Mexico': '🇲🇽',
      'India': '🇮🇳',
      'United Kingdom': '🇬🇧',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺',
      'Germany': '🇩🇪',
      'France': '🇫🇷',
      'Singapore': '🇸🇬',
      'Taiwan': '🇹🇼',
      'Hong Kong': '🇭🇰',
      'China': '🇨🇳',
    };
    return flags[country] || '🌍';
  };

  return (
    <AdminLayout>
      <Head>
        <title>User Analytics Dashboard | KStarPick Admin</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">User Analytics Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              Real-time user data and engagement metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchGAData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              <span className="font-semibold">Note:</span> {error}. Showing simulated data.
            </p>
          </div>
        )}

        {gaData && (
          <>
            {/* Realtime Active Users Card */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium opacity-90">LIVE</span>
                  </div>
                  <h2 className="text-4xl font-bold">{gaData.realtime.activeUsers}</h2>
                  <p className="text-sm opacity-80 mt-1">Active users right now</p>
                </div>
                <Zap className="w-16 h-16 opacity-30" />
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* DAU Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Today</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-800">{formatNumber(gaData.summary.dau.users)}</h3>
                <p className="text-sm text-gray-500 mt-1">Daily Active Users</p>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Sessions</p>
                    <p className="text-sm font-semibold text-gray-700">{formatNumber(gaData.summary.dau.sessions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Page Views</p>
                    <p className="text-sm font-semibold text-gray-700">{formatNumber(gaData.summary.dau.pageViews)}</p>
                  </div>
                </div>
              </div>

              {/* WAU Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">7 Days</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-800">{formatNumber(gaData.summary.wau.users)}</h3>
                <p className="text-sm text-gray-500 mt-1">Weekly Active Users</p>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Sessions</p>
                    <p className="text-sm font-semibold text-gray-700">{formatNumber(gaData.summary.wau.sessions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Page Views</p>
                    <p className="text-sm font-semibold text-gray-700">{formatNumber(gaData.summary.wau.pageViews)}</p>
                  </div>
                </div>
              </div>

              {/* MAU Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">30 Days</span>
                </div>
                <h3 className="text-3xl font-bold text-gray-800">{formatNumber(gaData.summary.mau.users)}</h3>
                <p className="text-sm text-gray-500 mt-1">Monthly Active Users</p>
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Sessions</p>
                    <p className="text-sm font-semibold text-gray-700">{formatNumber(gaData.summary.mau.sessions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Page Views</p>
                    <p className="text-sm font-semibold text-gray-700">{formatNumber(gaData.summary.mau.pageViews)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg. Sessions/User</p>
                    <p className="text-xl font-bold text-gray-800">{gaData.engagement.avgSessionsPerUser}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Eye className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg. Pages/Session</p>
                    <p className="text-xl font-bold text-gray-800">{gaData.engagement.avgPageViewsPerSession}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <UserPlus className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">New Users (30d)</p>
                    <p className="text-xl font-bold text-gray-800">{formatNumber(gaData.engagement.newUsers)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <UserCheck className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Retention Rate</p>
                    <p className="text-xl font-bold text-gray-800">{gaData.engagement.retentionRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Trends Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Active Users (Last 30 Days)</h3>
              <div className="relative" style={{ height: '300px' }}>
                <svg width="100%" height="100%" viewBox="0 0 1000 280" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line key={i} x1="0" y1={i * 60 + 20} x2="1000" y2={i * 60 + 20} stroke="#e5e7eb" strokeWidth="1" />
                  ))}

                  {(() => {
                    const data = gaData.dailyTrends;
                    if (!data || data.length === 0) return null;

                    const maxDAU = Math.max(...data.map(d => d.dau));
                    const pointSpacing = 1000 / (data.length - 1);

                    // Area fill
                    const areaPath = data.map((day, index) => {
                      const x = index * pointSpacing;
                      const y = 260 - ((day.dau / maxDAU) * 220);
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ') + ` L ${(data.length - 1) * pointSpacing} 260 L 0 260 Z`;

                    // Line path
                    const linePath = data.map((day, index) => {
                      const x = index * pointSpacing;
                      const y = 260 - ((day.dau / maxDAU) * 220);
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    return (
                      <>
                        <defs>
                          <linearGradient id="dauGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#dauGradient)" />
                        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="3" />
                        {data.map((day, index) => {
                          const x = index * pointSpacing;
                          const y = 260 - ((day.dau / maxDAU) * 220);
                          return (
                            <g key={index}>
                              <circle cx={x} cy={y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                              <title>{`${day.date}: ${day.dau} users`}</title>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                {/* X-axis labels */}
                <div className="flex justify-between mt-2">
                  {gaData.dailyTrends.filter((_, i) => i % 5 === 0 || i === gaData.dailyTrends.length - 1).map((day, index) => (
                    <span key={index} className="text-xs text-gray-500">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Demographics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Countries */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Top Countries</h3>
                </div>
                <div className="space-y-3">
                  {gaData.demographics.countries.slice(0, 8).map((country, index) => {
                    const maxUsers = gaData.demographics.countries[0].users;
                    const percentage = (country.users / maxUsers) * 100;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <span className="text-xl">{getCountryFlag(country.country)}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700">{country.country}</span>
                            <span className="text-sm font-medium text-gray-900">{formatNumber(country.users)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Devices */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Devices</h3>
                </div>
                <div className="space-y-4">
                  {gaData.demographics.devices.map((device, index) => {
                    const totalUsers = gaData.demographics.devices.reduce((sum, d) => sum + d.users, 0);
                    const percentage = ((device.users / totalUsers) * 100).toFixed(1);
                    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500'];
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${colors[index] || 'bg-gray-500'} bg-opacity-10`}>
                          {getDeviceIcon(device.device)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 capitalize">{device.device}</span>
                            <span className="text-sm text-gray-500">{percentage}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[index] || 'bg-gray-500'} rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{formatNumber(device.users)} users</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* New vs Returning Users */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">New vs Returning</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">New</span>
                        <span className="text-xs font-medium text-green-600">{formatNumber(gaData.engagement.newUsers)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${(gaData.engagement.newUsers / (gaData.engagement.newUsers + gaData.engagement.returningUsers) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Returning</span>
                        <span className="text-xs font-medium text-amber-600">{formatNumber(gaData.engagement.returningUsers)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${(gaData.engagement.returningUsers / (gaData.engagement.newUsers + gaData.engagement.returningUsers) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Pages */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Top Pages</h3>
                </div>
                <div className="space-y-3">
                  {gaData.topPages.map((page, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate" title={page.path}>
                          {page.path === '/' ? 'Homepage' : page.path}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {formatNumber(page.pageViews)}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {formatNumber(page.users)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Google Analytics Integration</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    This dashboard displays real-time data from Google Analytics. To enable full functionality,
                    configure your GA4 Property ID and service account credentials in environment variables.
                  </p>
                  <div className="mt-3 text-xs text-blue-600 space-y-1">
                    <p><code className="bg-blue-100 px-1 py-0.5 rounded">GA_PROPERTY_ID</code> - Your GA4 property ID (numeric)</p>
                    <p><code className="bg-blue-100 px-1 py-0.5 rounded">GOOGLE_APPLICATION_CREDENTIALS_JSON</code> - Service account JSON</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
