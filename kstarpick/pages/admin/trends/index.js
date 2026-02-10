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
  Sparkles,
  AlertTriangle,
  Clock,
  Zap,
  Eye,
  FileText,
  Copy,
  Check,
  PenTool,
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

  // AI Content Ideas states (all per-category)
  const [aiIdeasCache, setAiIdeasCache] = useState({});
  const [aiIdeasLoadingMap, setAiIdeasLoadingMap] = useState({}); // { kpop: true, kdrama: false }
  const [aiIdeasErrorMap, setAiIdeasErrorMap] = useState({}); // { kpop: 'error msg', ... }

  // Draft generation states
  const [drafts, setDrafts] = useState({}); // { "category_index": draftData }
  const [draftLoading, setDraftLoading] = useState({}); // { "category_index": true }
  const [draftErrors, setDraftErrors] = useState({}); // { "category_index": errorMsg }

  const cacheKey = `${category}_${sortType}`;
  const data = cache[cacheKey] || null;
  const aiIdeas = aiIdeasCache[category] || null;
  const aiIdeasLoading = aiIdeasLoadingMap[category] || false;
  const aiIdeasError = aiIdeasErrorMap[category] || null;

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

  // Generate AI content ideas (per-category loading/error)
  const generateAiIdeas = async () => {
    if (!data) return;

    const cat = category; // capture current category for closure
    setAiIdeasLoadingMap(prev => ({ ...prev, [cat]: true }));
    setAiIdeasErrorMap(prev => ({ ...prev, [cat]: null }));

    try {
      const res = await fetch('/api/reddit/generate-content-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trendData: data, category: cat })
      });

      if (!res.ok) {
        let errMsg = 'Failed to generate ideas';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const result = await res.json();
      setAiIdeasCache(prev => ({ ...prev, [cat]: result }));
    } catch (err) {
      setAiIdeasErrorMap(prev => ({ ...prev, [cat]: err.message }));
    } finally {
      setAiIdeasLoadingMap(prev => ({ ...prev, [cat]: false }));
    }
  };

  // Generate draft for a specific idea
  const generateDraft = async (idea, index) => {
    if (!data) return;

    const cat = category; // capture for closure
    const key = `${cat}_${index}`;
    setDraftLoading(prev => ({ ...prev, [key]: true }));
    setDraftErrors(prev => { const next = { ...prev }; delete next[key]; return next; });

    try {
      const res = await fetch('/api/reddit/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, trendData: data, category: cat })
      });

      if (!res.ok) {
        let errMsg = 'Failed to generate draft';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const result = await res.json();
      setDrafts(prev => ({ ...prev, [key]: result.draft }));
    } catch (err) {
      setDraftErrors(prev => ({ ...prev, [key]: err.message }));
    } finally {
      setDraftLoading(prev => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  // Copy text to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

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

            {/* AI Content Ideas Tab */}
            {activeTab === 'suggestions' && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      AI Content Ideas
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">Claude AI가 트렌드를 분석하여 콘텐츠 아이디어를 제안합니다</p>
                  </div>
                  <button
                    onClick={generateAiIdeas}
                    disabled={aiIdeasLoading || !data}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                  >
                    {aiIdeasLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        AI 분석 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        아이디어 생성
                      </>
                    )}
                  </button>
                </div>

                {/* Error Message */}
                {aiIdeasError && (
                  <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {aiIdeasError}
                  </div>
                )}

                {/* Loading State */}
                {aiIdeasLoading && (
                  <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                      <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
                    </div>
                    <p className="text-gray-600 font-medium">AI가 Reddit 커뮤니티에 맞는 콘텐츠를 기획 중...</p>
                    <p className="text-gray-400 text-sm mt-1">커뮤니티 갈증 파악 → 포맷 매칭 → 제목 최적화 → 실행 가이드</p>
                  </div>
                )}

                {/* No Ideas Yet */}
                {!aiIdeasLoading && !aiIdeas && (
                  <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <Lightbulb className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">콘텐츠 아이디어를 생성하려면 버튼을 클릭하세요</p>
                    <p className="text-gray-400 text-sm mt-1">트렌드 데이터를 기반으로 AI가 기사 아이디어를 제안합니다</p>
                  </div>
                )}

                {/* AI Ideas List */}
                {!aiIdeasLoading && aiIdeas && aiIdeas.ideas && (
                  <div className="divide-y divide-gray-100">
                    {aiIdeas.ideas.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">생성된 아이디어가 없습니다</div>
                    ) : (
                      aiIdeas.ideas.map((idea, index) => {
                        const typeLabels = {
                          'data-compilation': { label: 'Data', icon: '📊', color: 'bg-cyan-100 text-cyan-700' },
                          'deep-analysis': { label: 'Analysis', icon: '📝', color: 'bg-purple-100 text-purple-700' },
                          'translation': { label: 'Translation', icon: '🔄', color: 'bg-blue-100 text-blue-700' },
                          'discussion': { label: 'Discussion', icon: '❓', color: 'bg-green-100 text-green-700' },
                          'timeline': { label: 'Timeline', icon: '📅', color: 'bg-amber-100 text-amber-700' },
                          'guide': { label: 'Guide', icon: '📖', color: 'bg-emerald-100 text-emerald-700' },
                          'comparison': { label: 'Comparison', icon: '⚖️', color: 'bg-indigo-100 text-indigo-700' },
                        };
                        const typeInfo = typeLabels[idea.type] || { label: idea.type, icon: '📄', color: 'bg-gray-100 text-gray-600' };
                        const effortLabels = {
                          'low': { label: '간단', color: 'bg-green-50 text-green-600' },
                          'medium': { label: '보통', color: 'bg-yellow-50 text-yellow-600' },
                          'high': { label: '높음', color: 'bg-red-50 text-red-600' },
                        };
                        const effortInfo = effortLabels[idea.effortLevel] || effortLabels['medium'];
                        const formatLabels = { 'text': 'Text Post', 'image': 'Image Post', 'link': 'Link Post' };

                        return (
                          <div key={index} className="px-5 py-5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-4">
                              {/* Priority Badge */}
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                                idea.priority === 1 ? 'bg-red-100 text-red-700' :
                                idea.priority === 2 ? 'bg-orange-100 text-orange-700' :
                                idea.priority === 3 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {idea.priority}
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* Subject & Type & Subreddit */}
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-semibold text-gray-900">{idea.subject}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                                    {typeInfo.icon} {typeInfo.label}
                                  </span>
                                  {idea.subreddit && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">
                                      {idea.subreddit}
                                    </span>
                                  )}
                                  {idea.postFormat && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      {formatLabels[idea.postFormat] || idea.postFormat}
                                    </span>
                                  )}
                                </div>

                                {/* Reddit Title */}
                                <div className="text-sm font-mono font-medium text-orange-700 bg-orange-50 px-3 py-2 rounded mb-2 border border-orange-100">
                                  {idea.redditTitle}
                                </div>

                                {/* Body Outline */}
                                {idea.bodyOutline && (
                                  <div className="text-sm text-gray-600 mb-3 bg-gray-50 px-3 py-2 rounded">
                                    <span className="text-gray-400 text-xs block mb-1">본문 구조:</span>
                                    {idea.bodyOutline}
                                  </div>
                                )}

                                {/* Data Needed */}
                                {idea.dataNeeded && (
                                  <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded mb-3 flex items-start gap-1.5">
                                    <Eye className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span><span className="font-medium">필요한 데이터:</span> {idea.dataNeeded}</span>
                                  </div>
                                )}

                                {/* Execution Steps */}
                                {idea.executionSteps && idea.executionSteps.length > 0 && (
                                  <div className="mb-3">
                                    <div className="text-xs text-gray-400 mb-1">실행 단계:</div>
                                    <ol className="text-sm text-gray-600 space-y-1">
                                      {idea.executionSteps.map((step, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <span className="text-purple-500 font-medium shrink-0">{i + 1}.</span>
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}

                                {/* Why It Works */}
                                {idea.whyItWorks && (
                                  <div className="text-sm text-gray-500 bg-amber-50 border border-amber-100 p-2 rounded mb-3 flex items-start gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                                    <span><span className="text-amber-600 font-medium">Reddit에서 통하는 이유:</span> {idea.whyItWorks}</span>
                                  </div>
                                )}

                                {/* Metrics */}
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${effortInfo.color}`}>
                                    <Clock className="w-3 h-3" />
                                    작업량: {effortInfo.label}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                                    idea.engagementPotential === 'high' ? 'bg-green-50 text-green-600' :
                                    idea.engagementPotential === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                                    'bg-gray-50 text-gray-500'
                                  }`}>
                                    <Zap className="w-3 h-3" />
                                    Upvote 예상: {idea.engagementPotential === 'high' ? '높음' : idea.engagementPotential === 'medium' ? '중간' : '낮음'}
                                  </span>
                                  {idea.riskLevel && (
                                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                                      idea.riskLevel === 'high' ? 'bg-red-50 text-red-600' :
                                      idea.riskLevel === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                                      'bg-green-50 text-green-600'
                                    }`}>
                                      <AlertTriangle className="w-3 h-3" />
                                      리스크: {idea.riskLevel === 'high' ? '높음' : idea.riskLevel === 'medium' ? '중간' : '낮음'}
                                    </span>
                                  )}
                                </div>

                                {/* Source URLs */}
                                {idea.sourceUrls && idea.sourceUrls.length > 0 && (
                                  <div className="mt-3 flex items-center gap-2">
                                    <span className="text-xs text-gray-400">참고:</span>
                                    {idea.sourceUrls.slice(0, 2).map((url, i) => (
                                      <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                      >
                                        Reddit #{i + 1} <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ))}
                                  </div>
                                )}

                                {/* Draft Generation */}
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                  {!drafts[`${category}_${index}`] ? (
                                    <button
                                      onClick={() => generateDraft(idea, index)}
                                      disabled={draftLoading[`${category}_${index}`]}
                                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                                    >
                                      {draftLoading[`${category}_${index}`] ? (
                                        <>
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                          초안 작성 중...
                                        </>
                                      ) : (
                                        <>
                                          <PenTool className="w-4 h-4" />
                                          Reddit 포스트 초안 생성
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                                          <Check className="w-4 h-4" />
                                          초안 생성 완료
                                        </span>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => {
                                              const d = drafts[`${category}_${index}`];
                                              copyToClipboard(`${d.title}\n\n${d.body}`);
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium transition-colors"
                                          >
                                            <Copy className="w-3 h-3" />
                                            전체 복사
                                          </button>
                                          <button
                                            onClick={() => generateDraft(idea, index)}
                                            disabled={draftLoading[`${category}_${index}`]}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium transition-colors disabled:opacity-50"
                                          >
                                            <RefreshCw className={`w-3 h-3 ${draftLoading[`${category}_${index}`] ? 'animate-spin' : ''}`} />
                                            다시 생성
                                          </button>
                                        </div>
                                      </div>

                                      {/* Draft Title */}
                                      <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2">
                                        <div className="text-xs text-orange-400 mb-1">Reddit Title:</div>
                                        <div className="font-mono text-sm font-medium text-orange-800">
                                          {drafts[`${category}_${index}`].title}
                                        </div>
                                      </div>

                                      {/* Draft Body */}
                                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-xs text-gray-400">Post Body:</span>
                                          <button
                                            onClick={() => copyToClipboard(drafts[`${category}_${index}`].body)}
                                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                                          >
                                            <Copy className="w-3 h-3" /> 본문 복사
                                          </button>
                                        </div>
                                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">
                                          {drafts[`${category}_${index}`].body}
                                        </pre>
                                      </div>

                                      {/* Flair & Tips */}
                                      <div className="flex items-start gap-4">
                                        {drafts[`${category}_${index}`].flairSuggestion && (
                                          <div className="text-xs">
                                            <span className="text-gray-400">추천 Flair: </span>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                              {drafts[`${category}_${index}`].flairSuggestion}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {drafts[`${category}_${index}`].postingTips && (
                                        <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                                          <span className="font-medium text-yellow-700">포스팅 팁:</span>
                                          <ul className="mt-1 space-y-0.5">
                                            {drafts[`${category}_${index}`].postingTips.map((tip, i) => (
                                              <li key={i}>• {tip}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Draft Error */}
                                  {draftErrors[`${category}_${index}`] && !draftLoading[`${category}_${index}`] && (
                                    <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      {draftErrors[`${category}_${index}`]}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Generation Info */}
                    {aiIdeas.generatedAt && (
                      <div className="px-5 py-3 bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
                        <span>생성 시간: {new Date(aiIdeas.generatedAt).toLocaleString('ko-KR')}</span>
                        <span>데이터 소스: {aiIdeas.dataSource?.totalPosts || 0}개 게시물 분석</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
