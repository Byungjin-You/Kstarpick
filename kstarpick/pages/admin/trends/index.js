import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import {
  TrendingUp,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  ArrowUp,
  BarChart3,
  Users,
  Flame,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Hash,
  Globe,
  Music,
  Tv,
  Star,
} from 'lucide-react';

export default function TrendAnalysis() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState({}); // { 'kpop_hot': data, 'kdrama_hot': data, ... }
  const [sortType, setSortType] = useState('hot');
  const [expandedItem, setExpandedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('main');
  const [category, setCategory] = useState('kpop'); // 'kpop' or 'kdrama'
  const [lastFetched, setLastFetched] = useState(null);

  const cacheKey = `${category}_${sortType}`;
  const data = cache[cacheKey] || null;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  const fetchTrends = useCallback(async (forceRefresh = false) => {
    const key = `${category}_${sortType}`;
    // Use cached data if available and not forcing refresh
    if (!forceRefresh && cache[key]) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = category === 'kpop' ? '/api/reddit/trending' : '/api/reddit/drama-trending';
      const res = await fetch(`${endpoint}?sort=${sortType}&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch trends');
      const result = await res.json();
      setCache((prev) => ({ ...prev, [key]: result }));
      setLastFetched(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sortType, category, cache]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchTrends();
    }
  }, [session, category, sortType]);

  // Reset tab when switching category
  useEffect(() => {
    setActiveTab('main');
    setExpandedItem(null);
  }, [category]);

  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  };

  const getEngagementColor = (score) => {
    if (score >= 5000) return 'text-red-400';
    if (score >= 2000) return 'text-orange-400';
    if (score >= 500) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getCategoryColor = (cat) => {
    const colors = {
      'News': 'bg-blue-500/20 text-blue-400',
      'MV/Release': 'bg-purple-500/20 text-purple-400',
      'Release': 'bg-indigo-500/20 text-indigo-400',
      'Discussion': 'bg-green-500/20 text-green-400',
      'Teaser': 'bg-pink-500/20 text-pink-400',
      'Preview/Teaser': 'bg-pink-500/20 text-pink-400',
      'Performance': 'bg-yellow-500/20 text-yellow-400',
      'Charts': 'bg-cyan-500/20 text-cyan-400',
      'Variety': 'bg-teal-500/20 text-teal-400',
      'Concert/Tour': 'bg-orange-500/20 text-orange-400',
      'Controversy': 'bg-red-500/20 text-red-400',
      'Dating/Personal': 'bg-rose-500/20 text-rose-400',
      'Rumor': 'bg-amber-500/20 text-amber-400',
      'Episode Discussion': 'bg-violet-500/20 text-violet-400',
      'Review': 'bg-emerald-500/20 text-emerald-400',
      'Recommendation': 'bg-sky-500/20 text-sky-400',
      'Casting': 'bg-fuchsia-500/20 text-fuchsia-400',
      'OST': 'bg-lime-500/20 text-lime-400',
      'Ratings': 'bg-cyan-500/20 text-cyan-400',
      'Streaming': 'bg-indigo-500/20 text-indigo-400',
      'Featured': 'bg-amber-500/20 text-amber-400',
      'Question': 'bg-gray-500/20 text-gray-400',
      'General': 'bg-gray-500/20 text-gray-400',
    };
    return colors[cat] || colors['General'];
  };

  // Get tabs based on category
  const getTabs = () => {
    if (category === 'kpop') {
      return [
        { id: 'main', label: 'Trending Artists', icon: <Flame className="w-4 h-4" /> },
        { id: 'posts', label: 'Hot Posts', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'categories', label: 'Categories', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'suggestions', label: 'Content Ideas', icon: <Lightbulb className="w-4 h-4" /> },
      ];
    }
    return [
      { id: 'main', label: 'Trending Dramas', icon: <Tv className="w-4 h-4" /> },
      { id: 'actors', label: 'Trending Actors', icon: <Star className="w-4 h-4" /> },
      { id: 'posts', label: 'Hot Posts', icon: <TrendingUp className="w-4 h-4" /> },
      { id: 'categories', label: 'Categories', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'suggestions', label: 'Content Ideas', icon: <Lightbulb className="w-4 h-4" /> },
    ];
  };

  // Get summary cards data
  const getSummaryCards = () => {
    if (!data) return [];
    if (category === 'kpop') {
      return [
        { icon: <Hash className="w-4 h-4" />, label: '분석 게시물', value: data.summary.totalPosts, sub: data.summary.subreddits.map(s => `r/${s}`).join(', ') },
        { icon: <Users className="w-4 h-4" />, label: '트렌딩 아티스트', value: (data.trendingArtists || []).length, sub: '감지된 아티스트 수' },
        { icon: <BarChart3 className="w-4 h-4" />, label: '카테고리', value: data.categoryBreakdown.length, sub: '콘텐츠 유형' },
        { icon: <Lightbulb className="w-4 h-4" />, label: '콘텐츠 제안', value: data.suggestions.length, sub: '기사 추천' },
      ];
    }
    return [
      { icon: <Hash className="w-4 h-4" />, label: '분석 게시물', value: data.summary.totalPosts, sub: data.summary.subreddits.map(s => `r/${s}`).join(', ') },
      { icon: <Tv className="w-4 h-4" />, label: '트렌딩 드라마', value: (data.trendingDramas || []).length, sub: '감지된 드라마 수' },
      { icon: <Star className="w-4 h-4" />, label: '트렌딩 배우', value: (data.trendingActors || []).length, sub: '감지된 배우 수' },
      { icon: <Lightbulb className="w-4 h-4" />, label: '콘텐츠 제안', value: data.suggestions.length, sub: '기사 추천' },
    ];
  };

  // Render a ranking list (shared between artists, dramas, actors)
  const renderRankingList = (items, title, subtitle, icon) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
      <div className="divide-y divide-gray-200">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-400">감지된 항목이 없습니다</div>
        ) : (
          items.map((item, index) => (
            <div key={item.name}>
              <div
                className="flex items-center px-5 py-5 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setExpandedItem(expandedItem === item.name ? null : item.name)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 shrink-0 ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-400'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{item.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.mentions} mentions</div>
                </div>
                <div className="flex items-center gap-6 mr-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <ArrowUp className="w-3 h-3 text-green-500" />
                      <span className="font-medium text-gray-700">{formatNumber(item.totalScore)}</span>
                    </div>
                    <div className="text-xs text-gray-400">upvotes</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <MessageCircle className="w-3 h-3 text-blue-500" />
                      <span className="font-medium text-gray-700">{formatNumber(item.totalComments)}</span>
                    </div>
                    <div className="text-xs text-gray-400">comments</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${getEngagementColor(item.totalEngagement)}`}>
                      {formatNumber(item.totalEngagement)}
                    </div>
                    <div className="text-xs text-gray-400">engagement</div>
                  </div>
                </div>
                <div className="w-32 mr-4 shrink-0">
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${category === 'kpop' ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-purple-400 to-indigo-500'}`}
                      style={{
                        width: `${Math.min(100, (item.totalEngagement / (items[0]?.totalEngagement || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                {expandedItem === item.name ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </div>
              {expandedItem === item.name && (
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="pl-12 space-y-2">
                    {item.posts.map((post, pIdx) => (
                      <a
                        key={pIdx}
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-blue-50 transition-colors group"
                      >
                        <div className="flex-1 mr-4">
                          <span className="text-sm text-gray-700 group-hover:text-blue-600">{post.title}</span>
                          <span className="ml-2 text-xs text-gray-400">r/{post.subreddit}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                          <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /> {formatNumber(post.score)}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comments}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (status === 'loading' || !session) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Content Trend Analysis - KStarPick Admin</title>
      </Head>

      <div className="w-full" style={{ minHeight: 'calc(100vh + 1px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-orange-500" />
              Content Trend Analysis
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Reddit 커뮤니티 실시간 트렌드 분석
              {lastFetched && (
                <span className="ml-2 text-gray-400">
                  · Last updated: {lastFetched.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hot">Hot (실시간)</option>
              <option value="top">Top (인기순)</option>
              <option value="new">New (최신순)</option>
              <option value="rising">Rising (떠오르는)</option>
            </select>
            <button
              onClick={() => fetchTrends(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>

        {/* Category Toggle - K-Pop / K-Drama */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setCategory('kpop')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              category === 'kpop'
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Music className="w-4 h-4" />
            K-Pop
          </button>
          <button
            onClick={() => setCategory('kdrama')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              category === 'kdrama'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Tv className="w-4 h-4" />
            K-Drama
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-gray-500">Reddit 데이터를 수집하고 있습니다...</p>
          </div>
        )}

        {/* Data */}
        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {getSummaryCards().map((card, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 min-w-0">
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    {card.icon}
                    <span className="truncate">{card.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs text-gray-400 mt-1 truncate">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg" style={{ width: 'fit-content', minWidth: '600px' }}>
              {getTabs().map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Main Ranking Tab (Artists or Dramas) */}
            {activeTab === 'main' && (
              category === 'kpop'
                ? renderRankingList(
                    data.trendingArtists || [],
                    'Trending Artists',
                    'Reddit에서 가장 많이 언급되는 아티스트',
                    <Flame className="w-5 h-5 text-orange-500" />
                  )
                : renderRankingList(
                    data.trendingDramas || [],
                    'Trending Dramas',
                    'Reddit에서 가장 많이 언급되는 드라마',
                    <Tv className="w-5 h-5 text-purple-500" />
                  )
            )}

            {/* Actors Tab (K-Drama only) */}
            {activeTab === 'actors' && category === 'kdrama' && (
              renderRankingList(
                data.trendingActors || [],
                'Trending Actors',
                'Reddit에서 가장 많이 언급되는 배우',
                <Star className="w-5 h-5 text-yellow-500" />
              )
            )}

            {/* Hot Posts Tab */}
            {activeTab === 'posts' && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Hot Posts
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Engagement 기준 상위 게시물</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.topPosts.map((post, index) => (
                    <a
                      key={post.id}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start px-5 py-3 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="w-6 text-sm font-medium text-gray-400 mt-0.5 mr-3">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="text-sm font-medium text-gray-800 group-hover:text-blue-600 leading-snug">
                          {post.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-gray-400">r/{post.subreddit}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(post.category)}`}>
                            {post.category}
                          </span>
                          {/* K-pop: artists tags */}
                          {post.artists && post.artists.length > 0 && (
                            <div className="flex gap-1">
                              {post.artists.slice(0, 3).map((a) => (
                                <span key={a} className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">{a}</span>
                              ))}
                            </div>
                          )}
                          {/* K-Drama: drama tags */}
                          {post.dramas && post.dramas.length > 0 && (
                            <div className="flex gap-1">
                              {post.dramas.slice(0, 3).map((d) => (
                                <span key={d} className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">{d}</span>
                              ))}
                            </div>
                          )}
                          {/* K-Drama: actor tags */}
                          {post.actors && post.actors.length > 0 && (
                            <div className="flex gap-1">
                              {post.actors.slice(0, 2).map((a) => (
                                <span key={a} className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded">{a}</span>
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-gray-300">{formatTimeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-sm">
                        <div className="flex items-center gap-1 text-gray-500">
                          <ArrowUp className="w-3.5 h-3.5 text-green-500" />
                          <span className="font-medium">{formatNumber(post.score)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                          <span>{post.comments}</span>
                        </div>
                        <div className={`font-bold ${getEngagementColor(post.engagement)}`}>
                          {formatNumber(post.engagement)}
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                      Category Breakdown
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">콘텐츠 유형별 분포</p>
                  </div>
                  <div className="p-5 space-y-3">
                    {data.categoryBreakdown.map((cat) => {
                      const maxCount = data.categoryBreakdown[0]?.count || 1;
                      const percentage = ((cat.count / data.summary.totalPosts) * 100).toFixed(1);
                      return (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm px-2 py-0.5 rounded-full ${getCategoryColor(cat.name)}`}>
                              {cat.name}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span>{cat.count} posts</span>
                              <span className="font-medium text-gray-600">{percentage}%</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                category === 'kpop'
                                  ? 'bg-gradient-to-r from-orange-400 to-pink-500'
                                  : 'bg-gradient-to-r from-purple-400 to-indigo-500'
                              }`}
                              style={{ width: `${(cat.count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-green-500" />
                      Subreddit Stats
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">서브레딧별 통계</p>
                  </div>
                  <div className="p-5 space-y-4">
                    {Object.entries(data.subredditStats).map(([sub, stats]) => (
                      <div key={sub} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <a
                            href={`https://reddit.com/r/${sub}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-gray-800 hover:text-blue-600 flex items-center gap-1"
                          >
                            r/{sub}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <div className="text-lg font-bold text-gray-800">{stats.totalPosts}</div>
                            <div className="text-xs text-gray-400">Posts</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-800">{formatNumber(stats.totalEngagement)}</div>
                            <div className="text-xs text-gray-400">Engagement</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-800">{formatNumber(stats.avgScore)}</div>
                            <div className="text-xs text-gray-400">Avg Score</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Content Suggestions Tab */}
            {activeTab === 'suggestions' && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Content Suggestions
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">트렌드 기반 기사 작성 추천</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.suggestions.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">아직 추천할 콘텐츠가 없습니다</div>
                  ) : (
                    data.suggestions.map((suggestion, index) => (
                      <div key={index} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                            category === 'kpop'
                              ? 'bg-orange-100 text-orange-700'
                              : suggestion.type === 'drama'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                {suggestion.artist || suggestion.name}
                              </span>
                              {suggestion.type && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  suggestion.type === 'drama' ? 'bg-purple-100 text-purple-600' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {suggestion.type}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                              "{suggestion.suggestedTitle}"
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                                {suggestion.reason}
                              </span>
                              {suggestion.topPostUrl && (
                                <a
                                  href={suggestion.topPostUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1"
                                >
                                  소스 보기 <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
