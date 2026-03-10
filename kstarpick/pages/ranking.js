import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Eye, Clock, Calendar, Star } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import Seo from '../components/Seo';
import useScrollRestore from '../hooks/useScrollRestore';
import { generateWebsiteJsonLd } from '../utils/seoHelpers';

// PC layout components
import CommentTicker from '../components/home/CommentTicker';
import TrendingNow from '../components/home/TrendingNow';
import CategoryTag from '../components/home/CategoryTag';

// Time ago helper
const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Format date (YYYY.MM.DD)
const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// Format view count
const formatViews = (count) => {
  if (!count) return '0 views';
  return `${Number(count).toLocaleString()} views`;
};

export default function Ranking({ todayNews = [], weekNews = [], monthNews = [], recentComments = [], rankingNews = [] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('today');
  const [newsItems, setNewsItems] = useState(todayNews);

  // Sidebar sticky
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  useScrollRestore('rankingScrollPosition', 'isBackToRanking');

  // Tab change
  useEffect(() => {
    switch (activeTab) {
      case 'today': setNewsItems(todayNews); break;
      case 'week': setNewsItems(weekNews); break;
      case 'month': setNewsItems(monthNews); break;
      default: setNewsItems(todayNews);
    }
  }, [activeTab, todayNews, weekNews, monthNews]);

  // Sidebar sticky calculation
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) setSidebarStickyTop(header.offsetHeight + 12);
  }, []);

  const navigateToPage = (path) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('rankingScrollPosition', window.scrollY.toString());
      sessionStorage.setItem('isBackToRanking', 'true');
    }
    router.push(path);
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/images/news/default-news.jpg';
  };

  const topSix = newsItems.slice(0, 6);
  const restItems = newsItems.slice(6);

  // Group top 6 into rows of 3
  const topRows = [];
  for (let i = 0; i < topSix.length; i += 3) {
    topRows.push(topSix.slice(i, i + 3));
  }

  const tabs = [
    { id: 'today', label: 'Today', icon: Clock },
    { id: 'week', label: 'Week', icon: Calendar },
    { id: 'month', label: 'Month', icon: Star },
  ];

  return (
    <MainLayout>
      <Seo
        title="Top Trending News | K-Pop Rankings & Popular Stories"
        description="Discover the most popular and trending news in K-Pop, K-Drama, and Korean entertainment. Daily, weekly, and monthly rankings."
        url="/ranking"
        type="website"
        keywords="K-Pop trending,Korean news rankings,popular K-Pop news,viral Korean entertainment"
        jsonLd={generateWebsiteJsonLd()}
      />

      {/* ============ MOBILE LAYOUT (< lg) ============ */}
      <div className="lg:hidden">
        <div className="bg-white min-h-screen">
          <div className="px-4 pb-12 pt-4">
            {/* Tab Buttons */}
            <div className="flex gap-2 mb-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                    style={activeTab === tab.id ? { background: '#155DFC' } : {}}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Top 6 - Card Grid */}
            {topSix.length > 0 && (
              <div className="space-y-4 mb-8">
                {/* Featured #1 */}
                <div
                  className="cursor-pointer group"
                  onClick={() => navigateToPage(`/news/${topSix[0].slug || topSix[0]._id}`)}
                >
                  <div className="relative rounded-[14px] overflow-hidden mb-3 bg-[#F3F4F6]">
                    <img
                      src={topSix[0].coverImage || topSix[0].thumbnailUrl || '/images/news/default-news.jpg'}
                      alt={topSix[0].title}
                      className="w-full h-[222px] object-cover"
                      onError={handleImageError}
                    />
                    <div className="absolute top-3 left-3 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                      <span className="text-white font-black text-lg">1</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-[18px] leading-[1.33] text-[#0A0A0A] line-clamp-2 mb-1" style={{ letterSpacing: '-0.0244em' }}>
                    {topSix[0].title}
                  </h3>
                  <div className="flex items-center gap-2 text-[13px]" style={{ color: '#99A1AF' }}>
                    <span>{formatDateShort(topSix[0].createdAt)}</span>
                    <span>|</span>
                    <span className="flex items-center gap-1"><Eye size={12} />{formatViews(topSix[0].viewCount)}</span>
                  </div>
                </div>

                {/* #2-6 List */}
                <div className="flex flex-col gap-3">
                  {topSix.slice(1).map((news, idx) => (
                    <div
                      key={news._id}
                      className="flex gap-3 cursor-pointer group"
                      onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                    >
                      <div className="relative flex-shrink-0 w-[100px] h-[70px] rounded-[6px] overflow-hidden bg-[#F3F4F6]">
                        <img
                          src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                          alt={news.title}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                        <div className="absolute top-1 left-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{idx + 2}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-medium text-[15px] leading-[1.375] text-[#0A0A0A] line-clamp-2 group-hover:text-ksp-accent transition-colors" style={{ letterSpacing: '-0.0244em' }}>
                          {news.title}
                        </h4>
                        <span className="text-[12px] mt-1" style={{ color: '#99A1AF' }}>
                          {formatViews(news.viewCount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7+ List */}
            {restItems.length > 0 && (
              <div className="flex flex-col gap-3">
                {restItems.map((news, idx) => (
                  <div
                    key={news._id}
                    className="flex gap-3 cursor-pointer group"
                    onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                  >
                    <div className="relative flex-shrink-0 w-[100px] h-[70px] rounded-[6px] overflow-hidden bg-[#F3F4F6]">
                      <img
                        src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                        alt={news.title}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                      <div className="absolute top-1 left-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{idx + 7}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-medium text-[15px] leading-[1.375] text-[#0A0A0A] line-clamp-2 group-hover:text-ksp-accent transition-colors" style={{ letterSpacing: '-0.0244em' }}>
                        {news.title}
                      </h4>
                      <span className="text-[12px] mt-1" style={{ color: '#99A1AF' }}>
                        {formatViews(news.viewCount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {newsItems.length === 0 && (
              <div className="text-center py-16">
                <p className="text-ksp-meta">No trending news found. Check back later.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ PC LAYOUT (>= lg) ============ */}
      <div className="hidden lg:block">
        <main className="pt-0 pb-16 bg-[#F8F9FA]">
          <div className="max-w-[1772px] mx-auto px-10 pt-8">
            <div className="flex flex-row gap-[60px]">
              {/* Left: Main Content Area (1212px) */}
              <div className="flex-1 min-w-0 max-w-content">

                {/* ===== Ranking News Section ===== */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl" style={{ padding: '30px 16px 16px' }}>

                  {/* Header: Title + Tabs */}
                  <div className="flex items-center justify-between mb-4" style={{ padding: '0 8px' }}>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-[26px] font-black" style={{ fontFamily: 'Pretendard, sans-serif', color: '#101828' }}>
                        Ranking News
                      </h2>
                      <span className="text-2xl">👑</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 rounded-full transition-all ${
                              isActive
                                ? 'text-white shadow-lg'
                                : 'bg-white text-[#4A5565] border border-[#D1D5DC] hover:bg-gray-50'
                            }`}
                            style={{
                              padding: '0 20px',
                              height: isActive ? '40px' : '42px',
                              fontFamily: 'Inter, sans-serif',
                              fontWeight: 500,
                              fontSize: '14px',
                              letterSpacing: '-0.0107em',
                              ...(isActive ? { background: '#155DFC' } : {}),
                            }}
                          >
                            {isActive && <Icon size={16} />}
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top 1-6: Card Grid (rows of 3) */}
                  {topRows.length > 0 && (
                    <div className="flex flex-col" style={{ gap: '30px', padding: '24px 16px 12px' }}>
                      {topRows.map((row, rowIdx) => (
                        <div key={rowIdx} className="flex">
                          {row.map((news, colIdx) => {
                            const rank = rowIdx * 3 + colIdx + 1;
                            return (
                              <div
                                key={news._id}
                                className="flex-1 cursor-pointer group"
                                style={{ paddingLeft: colIdx > 0 ? '16px' : '0' }}
                                onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                              >
                                {/* Image */}
                                <div className="relative overflow-hidden bg-[#F3F4F6]" style={{ borderRadius: '12px', height: '220px' }}>
                                  <img
                                    src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                                    alt={news.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={handleImageError}
                                  />
                                </div>
                                {/* Title */}
                                <div style={{ marginTop: '10px' }}>
                                  <h3
                                    className="font-bold line-clamp-2 text-[#101828] group-hover:text-ksp-accent transition-colors"
                                    style={{
                                      fontFamily: 'Pretendard, sans-serif',
                                      fontWeight: 700,
                                      fontSize: '18px',
                                      lineHeight: '1.375',
                                      letterSpacing: '-0.0244em',
                                    }}
                                  >
                                    {news.title}
                                  </h3>
                                </div>
                                {/* Date | Views */}
                                <div className="flex items-center gap-2.5 mt-1.5" style={{ padding: '0 10px 0 0' }}>
                                  <div className="flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#88909F" strokeWidth="1"/><path d="M6 3V6L8 7" stroke="#88909F" strokeWidth="1" strokeLinecap="round"/></svg>
                                    <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 500, fontSize: '12px', lineHeight: '1.33', color: '#99A1AF' }}>
                                      {formatDateShort(news.createdAt)}
                                    </span>
                                  </div>
                                  <span style={{ color: '#BFC4CD', fontSize: '12px' }}>|</span>
                                  <div className="flex items-center gap-0.5">
                                    <Eye size={14} style={{ color: '#99A1AF' }} />
                                    <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 600, fontSize: '12px', lineHeight: '1.25', color: '#99A1AF' }}>
                                      {formatViews(news.viewCount)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ===== 7-30 Ranking List ===== */}
                {restItems.length > 0 && (
                  <div className="bg-white border-[1.5px] border-ksp-border rounded-xl mt-6" style={{ padding: '30px 24px' }}>
                    <div className="grid grid-cols-2" style={{ gap: '0' }}>
                      {restItems.map((news, idx) => {
                        const rank = idx + 7;
                        const isRightCol = idx % 2 === 1;
                        const rowIdx = Math.floor(idx / 2);
                        return (
                          <div
                            key={news._id}
                            className="flex items-center cursor-pointer group"
                            style={{
                              gap: '20px',
                              padding: `${rowIdx > 0 ? '20px' : '0'} 0 0 ${isRightCol ? '24px' : '0'}`,
                              borderTop: rowIdx > 0 ? '1px solid #F3F4F6' : 'none',
                            }}
                            onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                          >
                            {/* Thumbnail with rank overlay */}
                            <div className="relative flex-shrink-0 overflow-hidden bg-[#F3F4F6]" style={{ width: '168px', height: '133px', borderRadius: '10px' }}>
                              <img
                                src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                                alt={news.title}
                                className="w-full h-full object-cover"
                                onError={handleImageError}
                              />
                              {/* Rank number */}
                              <span
                                className="absolute select-none"
                                style={{
                                  top: '15px',
                                  left: '12px',
                                  fontFamily: 'Pretendard JP, Pretendard, sans-serif',
                                  fontWeight: 900,
                                  fontSize: '28px',
                                  lineHeight: '0.66em',
                                  letterSpacing: '0.003em',
                                  color: '#FFFFFF',
                                  textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                }}
                              >
                                {rank}
                              </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch" style={{ padding: '8px 0' }}>
                              <h3
                                className="line-clamp-3 text-[#101828] group-hover:text-ksp-accent transition-colors"
                                style={{
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 700,
                                  fontSize: '16px',
                                  lineHeight: '1.5',
                                  letterSpacing: '-0.022em',
                                }}
                              >
                                {news.title}
                              </h3>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1">
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#88909F" strokeWidth="1"/><path d="M6 3V6L8 7" stroke="#88909F" strokeWidth="1" strokeLinecap="round"/></svg>
                                  <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 500, fontSize: '12px', lineHeight: '1.33', color: '#99A1AF' }}>
                                    {formatDateShort(news.createdAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <Eye size={14} style={{ color: '#99A1AF' }} />
                                  <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 600, fontSize: '12px', lineHeight: '1.25', color: '#99A1AF' }}>
                                    {formatViews(news.viewCount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {newsItems.length === 0 && (
                  <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-16 text-center">
                    <p className="text-ksp-meta">No trending news found. Check back later.</p>
                  </div>
                )}
              </div>

              {/* Right: Sidebar (500px) */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarStickyRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    {/* Comment Ticker */}
                    <CommentTicker comments={recentComments || []} onNavigate={navigateToPage} />

                    {/* Trending NOW */}
                    <TrendingNow items={rankingNews || []} onNavigate={navigateToPage} />

                    {/* Editor's PICK */}
                    {rankingNews && rankingNews.length > 0 && (
                      <div>
                        <h3 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-4 pl-1">Editor&apos;s <span className="text-ksp-accent">PICK</span></h3>
                        <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
                          {rankingNews.slice(0, 6).map((item) => (
                            <div
                              key={item._id}
                              className="flex gap-4 cursor-pointer group"
                              onClick={() => navigateToPage(`/news/${item.slug || item._id}`)}
                            >
                              <div className="flex-shrink-0 w-[140px] h-[90px] rounded overflow-hidden">
                                <img
                                  src={item.coverImage || item.thumbnailUrl || '/images/news/default-news.jpg'}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={handleImageError}
                                />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block px-1.5 py-0.5 bg-ksp-accent text-white text-[10px] font-bold uppercase tracking-wider rounded">
                                    {item.category === 'kpop' ? 'K-POP' : item.category === 'drama' ? 'DRAMA' : item.category === 'movie' ? 'FILM' : item.category === 'celeb' ? 'CELEB' : 'NEWS'}
                                  </span>
                                  <span className="text-xs font-medium text-ksp-meta">
                                    {getTimeAgo(item.createdAt || item.publishedAt)}
                                  </span>
                                </div>
                                <h4 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2 group-hover:text-ksp-accent transition-colors">
                                  {item.title}
                                </h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps() {
  try {
    const server = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:13001'
      : 'http://localhost:3000';

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || server;

    // Date calculations
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const [todayResponse, weekResponse, monthResponse, commentsResponse, rankingResponse] = await Promise.all([
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${threeDaysAgo.toISOString()}`),
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${weekAgo.toISOString()}`),
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${monthAgo.toISOString()}`),
      fetch(`${server}/api/comments/recent?limit=10`),
      fetch(`${server}/api/news?limit=10&sort=viewCount`),
    ]);

    const [todayData, weekData, monthData, commentsData, rankingData] = await Promise.all([
      todayResponse.json(),
      weekResponse.json(),
      monthResponse.json(),
      commentsResponse.json(),
      rankingResponse.json(),
    ]);

    // Fix image URLs for production
    const fixImageUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('http')) {
        // 로컬 개발 시 kstarpick.com 프록시 → 프로덕션 서버 직접 접근
        if (process.env.NODE_ENV === 'development' && url.includes('kstarpick.com/api/proxy')) {
          return url.replace('https://kstarpick.com', 'http://43.202.38.79:13001');
        }
        return url;
      }
      if (url.startsWith('/api/proxy/') || url.startsWith('/uploads/')) {
        return `${baseUrl}${url}`;
      }
      return url;
    };

    const fixNewsImages = (news) => {
      if (!news) return [];
      return news.map(n => ({
        ...n,
        coverImage: fixImageUrl(n.coverImage) || '/images/news/default-news.jpg',
        thumbnailUrl: fixImageUrl(n.thumbnailUrl) || null,
      }));
    };

    return {
      props: {
        todayNews: fixNewsImages(todayData.success && todayData.data?.news ? todayData.data.news : []),
        weekNews: fixNewsImages(weekData.success && weekData.data?.news ? weekData.data.news : []),
        monthNews: fixNewsImages(monthData.success && monthData.data?.news ? monthData.data.news : []),
        recentComments: commentsData.success ? (commentsData.data || []) : [],
        rankingNews: fixNewsImages(rankingData.success ? (rankingData.data?.news || []) : []),
      }
    };
  } catch (error) {
    console.error('랭킹 데이터 가져오기 오류:', error);
    return {
      props: {
        todayNews: [],
        weekNews: [],
        monthNews: [],
        recentComments: [],
        rankingNews: [],
      }
    };
  }
}
