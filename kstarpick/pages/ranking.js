import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Eye, Clock, Calendar, Star, ChevronDown, ChevronUp } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import Seo from '../components/Seo';
// 스크롤 복원은 _app.js handleRouteChangeComplete에서 중앙 처리
import { generateWebsiteJsonLd } from '../utils/seoHelpers';
import { connectToDatabase } from '../utils/mongodb';

// PC layout components
import CommentTicker from '../components/home/CommentTicker';
import TrendingNow from '../components/home/TrendingNow';

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

export default function Ranking({ todayNews = [], weekNews = [], monthNews = [], recentComments = [], rankingNews = [], trendingNews = [], editorsPickNews = [] }) {
  const router = useRouter();
  // 뒤로가기 시 탭 상태 복원 (SSR에서는 항상 'today'로 시작)
  const [activeTab, setActiveTab] = useState('today');
  const [newsItems, setNewsItems] = useState([]);
  const [listExpanded, setListExpanded] = useState(false);

  // Sidebar sticky
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  // 스크롤 복원은 _app.js handleRouteChangeComplete에서 중앙 처리
  const mountedRef = useRef(false);

  // 탭 복원 + 데이터 연결 (하나의 useEffect로 통합)
  useEffect(() => {
    // 최초 마운트: sessionStorage에서 탭 복원 (순방향 진입 시 _app.js가 이미 삭제함)
    if (!mountedRef.current) {
      mountedRef.current = true;
      const saved = sessionStorage.getItem('rankingActiveTab');
      if (saved && saved !== activeTab) {
        setActiveTab(saved);
        return; // 탭 변경 후 재실행되므로 여기서 중단
      }
    }

    // 탭에 따른 데이터 설정
    switch (activeTab) {
      case 'today': setNewsItems(todayNews); break;
      case 'week': setNewsItems(weekNews); break;
      case 'month': setNewsItems(monthNews); break;
      default: setNewsItems(todayNews);
    }
    sessionStorage.setItem('rankingActiveTab', activeTab);
  }, [activeTab, todayNews, weekNews, monthNews]);

  // Sidebar sticky calculation
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) setSidebarStickyTop(header.offsetHeight + 12);
  }, []);

  const navigateToPage = (path) => {
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

          {/* Ranking News Header: Title + Tabs */}
          <div className="flex items-center justify-between" style={{ padding: '10px 16px' }}>
            <h2 style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 800, fontSize: '21px', lineHeight: '1.29em' }}>
              Ranking News
            </h2>
            <div className="flex items-center gap-[6px]" style={{ padding: '10px 0' }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-[6px] rounded-full"
                    style={{
                      padding: '0 15px',
                      height: isActive ? '30px' : '31.5px',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '10.5px',
                      lineHeight: '1.43em',
                      letterSpacing: '-0.0107em',
                      color: isActive ? '#FFFFFF' : '#4A5565',
                      ...(isActive
                        ? { background: '#155DFC', boxShadow: '0px 3px 4.5px -3px rgba(0,0,0,0.1), 0px 7.5px 11.25px -2.25px rgba(0,0,0,0.1)' }
                        : { background: '#FFFFFF', border: '0.75px solid #D1D5DC' }
                      ),
                    }}
                  >
                    {isActive && <Icon size={12} />}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top 3 Large Cards */}
          {newsItems.length > 0 && (
            <div className="flex flex-col gap-4" style={{ padding: '0 16px' }}>
              {newsItems.slice(0, 3).map((news, idx) => (
                <div
                  key={news._id}
                  className="relative rounded-[14px] overflow-hidden cursor-pointer"
                  style={{ height: '250px' }}
                  onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                >
                  <img
                    src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                    alt={news.title}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)' }} />
                  <div className="absolute bottom-0 left-0 right-0" style={{ padding: '0 16px 16px' }}>
                    <div className="flex gap-3">
                      <span
                        className="flex-shrink-0 select-none"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 900,
                          fontStyle: 'italic',
                          fontSize: '48px',
                          lineHeight: '48px',
                          letterSpacing: '0.352px',
                          color: '#FFFFFF',
                          width: '32px',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <h3
                          className="text-white line-clamp-2"
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 700,
                            fontSize: '18px',
                            lineHeight: '1.375em',
                            letterSpacing: '-0.0244em',
                          }}
                        >
                          {news.title}
                        </h3>
                        <div className="flex items-center gap-[6px]">
                          <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 500, fontSize: '12px', lineHeight: '1.33em', color: 'rgba(255,255,255,0.7)' }}>
                            {formatDateShort(news.createdAt)}
                          </span>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>|</span>
                          <div className="flex items-center gap-[2px]">
                            <Eye size={12} style={{ color: 'rgba(255,255,255,0.7)' }} />
                            <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 500, fontSize: '12px', lineHeight: '1.33em', color: 'rgba(255,255,255,0.7)' }}>
                              {formatViews(news.viewCount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* #4-9 Grid (2 columns) */}
          {newsItems.length > 3 && (
            <div style={{ padding: '16px 16px 0' }}>
              <div className="grid grid-cols-2 gap-2">
                {newsItems.slice(3, 9).map((news, idx) => (
                  <div
                    key={news._id}
                    className="cursor-pointer"
                    onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                  >
                    {/* Thumbnail with rank overlay */}
                    <div className="relative rounded-[10px] overflow-hidden bg-[#F3F4F6]" style={{ height: '146px' }}>
                      <img
                        src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                        alt={news.title}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-x-0 bottom-0" style={{ height: '70px', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)' }} />
                      <span
                        className="absolute select-none"
                        style={{
                          top: '4px',
                          left: '12px',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 900,
                          fontStyle: 'italic',
                          fontSize: '40px',
                          lineHeight: '1.2em',
                          letterSpacing: '0.0088em',
                          color: '#FFFFFF',
                          WebkitTextStroke: '1px #1D1D1D',
                          textShadow: '0px 4px 10px rgba(0,0,0,0.4)',
                        }}
                      >
                        {idx + 4}
                      </span>
                    </div>
                    {/* Title */}
                    <h4
                      className="line-clamp-2 mt-2"
                      style={{
                        fontFamily: 'Pretendard, sans-serif',
                        fontWeight: 600,
                        fontSize: '14px',
                        lineHeight: '1.25em',
                        letterSpacing: '-0.0107em',
                        color: '#101828',
                        WebkitFontSmoothing: 'antialiased',
                      }}
                    >
                      {news.title}
                    </h4>
                    {/* Views */}
                    <div className="flex items-center gap-[2px] mt-[6px]">
                      <Eye size={14} style={{ color: '#99A1AF' }} />
                      <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 500, fontSize: '10px', lineHeight: '1.5em', color: '#99A1AF' }}>
                        {formatViews(news.viewCount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* #10+ List */}
          {newsItems.length > 9 && (
            <div style={{ padding: '16px' }}>
              <div className="flex flex-col gap-4">
                {newsItems.slice(9, listExpanded ? undefined : 21).map((news, idx) => (
                  <div
                    key={news._id}
                    className="flex items-center cursor-pointer group"
                    style={{ gap: '16px' }}
                    onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                  >
                    {/* Thumbnail with rank */}
                    <div className="relative flex-shrink-0 overflow-hidden bg-[#F3F4F6]" style={{ width: '127px', height: '95px', borderRadius: '8px' }}>
                      <img
                        src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                        alt={news.title}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                      <span
                        className="absolute select-none"
                        style={{
                          top: '8px',
                          left: '6px',
                          fontFamily: 'Pretendard JP, Pretendard, sans-serif',
                          fontWeight: 900,
                          fontSize: '27px',
                          lineHeight: '0.69em',
                          color: '#FFFFFF',
                          textShadow: '2px 4px 7px rgba(0,0,0,0.25)',
                        }}
                      >
                        {idx + 10}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch" style={{ padding: '8px 0', gap: '8px' }}>
                      <h4
                        className="line-clamp-2 group-hover:text-ksp-accent transition-colors"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 700,
                          fontSize: '14px',
                          lineHeight: '1.286em',
                          letterSpacing: '-0.015em',
                          color: '#101828',
                        }}
                      >
                        {news.title}
                      </h4>
                      <div className="flex items-center gap-[6px]">
                        <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 500, fontSize: '12px', lineHeight: '1.33em', color: '#BAC2CE' }}>
                          {formatDateShort(news.createdAt)}
                        </span>
                        <span style={{ fontSize: '12px', color: '#BAC2CE' }}>|</span>
                        <div className="flex items-center gap-[2px]">
                          <Eye size={14} style={{ color: '#BAC2CE' }} />
                          <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 500, fontSize: '12px', lineHeight: '1.33em', color: '#BAC2CE' }}>
                            {formatViews(news.viewCount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* See More button */}
              {newsItems.length > 21 && (
                <button
                  className="w-full flex items-center justify-center gap-[3px] mt-4 rounded-[10px]"
                  style={{ padding: '12px 16px', background: '#FFFFFF', border: '1px solid #D1D5DC' }}
                  onClick={() => setListExpanded(!listExpanded)}
                >
                  <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', lineHeight: '1.23em', color: '#2D3138' }}>
                    {listExpanded ? 'Collapse' : 'See More'}
                  </span>
                  {listExpanded
                    ? <ChevronUp size={14} style={{ color: '#99A1AF' }} />
                    : <ChevronDown size={14} style={{ color: '#99A1AF' }} />
                  }
                </button>
              )}
            </div>
          )}

          {/* Dividers */}
          <div className="h-2 bg-[#F3F4F6]" />
          <div className="h-2 bg-[#F3F4F6]" />

          {/* Trending NOW */}
          <div className="px-4 py-4">
            <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews} onNavigate={navigateToPage} showCard={false} />
          </div>

          {newsItems.length === 0 && (
            <div className="text-center py-16">
              <p className="text-ksp-meta">No trending news found. Check back later.</p>
            </div>
          )}
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
                                  {/* Rank number */}
                                  <span
                                    className="absolute select-none"
                                    style={{
                                      bottom: '12px',
                                      left: '14px',
                                      fontFamily: 'Inter, sans-serif',
                                      fontStyle: 'italic',
                                      fontWeight: 900,
                                      fontSize: '64px',
                                      lineHeight: '30px',
                                      letterSpacing: '0.352px',
                                      color: '#FFFFFF',
                                      textShadow: '0 4px 10px rgba(0, 0, 0, 0.40)',
                                    }}
                                  >
                                    {rank}
                                  </span>
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
                    <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews || []} onNavigate={navigateToPage} />

                    {/* Editor's PICK */}
                    {(editorsPickNews.length > 0 || (rankingNews && rankingNews.length > 0)) && (
                      <div>
                        <h3 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-4 pl-1">Editor&apos;s <span className="text-ksp-accent">PICK</span></h3>
                        <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
                          {(editorsPickNews.length > 0 ? editorsPickNews : rankingNews).slice(0, 6).map((item) => (
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

export async function getServerSideProps(context) {
  try {
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const server = `${protocol}://${context.req.headers.host}`;

    const baseUrl = server;

    // Date calculations
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    // Fetch multiplier directly from MongoDB (no auth needed)
    let dataMultiplier = 1;
    try {
      const { db } = await connectToDatabase();
      const settings = await db.collection('adminSettings').findOne({ key: 'dataMultiplier' });
      if (settings?.value) dataMultiplier = settings.value;
    } catch (e) { /* fallback to 1 */ }

    const [todayResponse, weekResponse, monthResponse, commentsResponse, rankingResponse, trendingResponse, editorsPickResponse] = await Promise.all([
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${twoDaysAgo.toISOString()}`),
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${weekAgo.toISOString()}&createdBefore=${twoDaysAgo.toISOString()}`),
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${monthAgo.toISOString()}&createdBefore=${weekAgo.toISOString()}`),
      fetch(`${server}/api/comments/recent?limit=10`),
      fetch(`${server}/api/news?limit=10&sort=viewCount`),
      fetch(`${server}/api/news/trending?limit=5`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${server}/api/news/editors-pick?limit=6`).catch(() => ({ json: () => ({ success: false }) })),
    ]);

    const [todayData, weekData, monthData, commentsData, rankingData, trendingData, editorsPickData] = await Promise.all([
      todayResponse.json(),
      weekResponse.json(),
      monthResponse.json(),
      commentsResponse.json(),
      rankingResponse.json(),
      trendingResponse.json(),
      editorsPickResponse.json(),
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

    // _id 기반 결정적 해시로 기사마다 다른 변동폭 생성 (±20%)
    const getVariance = (id) => {
      if (!id) return 1;
      const str = id.toString();
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return 0.8 + (Math.abs(hash) % 41) / 100; // 0.80 ~ 1.20
    };

    const fixNewsImages = (news) => {
      if (!news) return [];
      return news.map(n => ({
        ...n,
        coverImage: fixImageUrl(n.coverImage) || '/images/news/default-news.jpg',
        thumbnailUrl: fixImageUrl(n.thumbnailUrl) || null,
        viewCount: Math.round((n.viewCount || 0) * dataMultiplier * getVariance(n._id)),
      })).sort((a, b) => b.viewCount - a.viewCount);
    };

    return {
      props: {
        todayNews: fixNewsImages(todayData.success && todayData.data?.news ? todayData.data.news : []),
        weekNews: fixNewsImages(weekData.success && weekData.data?.news ? weekData.data.news : []),
        monthNews: fixNewsImages(monthData.success && monthData.data?.news ? monthData.data.news : []),
        recentComments: commentsData.success ? (commentsData.data || []) : [],
        rankingNews: fixNewsImages(rankingData.success ? (rankingData.data?.news || []) : []),
        trendingNews: trendingData.success ? fixNewsImages((trendingData.data || []).slice(0, 5)) : [],
        editorsPickNews: editorsPickData.success ? fixNewsImages(editorsPickData.data || []) : [],
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
        trendingNews: [],
        editorsPickNews: [],
      }
    };
  }
}
