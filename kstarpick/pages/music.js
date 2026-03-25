import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { X, Eye } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import Seo from '../components/Seo';
// 스크롤 복원은 _app.js handleRouteChangeComplete에서 중앙 처리
import { decodeHtmlEntities } from '../utils/helpers';
import { generateWebsiteJsonLd } from '../utils/seoHelpers';
import MoreNews from '../components/MoreNews';

// PC layout components
import ArticleCardGrid from '../components/home/ArticleCardGrid';
import WatchNewsSection from '../components/home/WatchNewsSection';
import CommentTicker from '../components/home/CommentTicker';
import TrendingNow from '../components/home/TrendingNow';

// Section wrapper for consistent styling (matches other pages)
const SectionWrapper = ({ title, emoji, seeMoreHref, onNavigate, children }) => (
  <div className="bg-white border-0 lg:border-[1.5px] border-ksp-border rounded-none lg:rounded-xl py-5 lg:py-8 px-4 lg:px-6 mb-0 lg:mb-8">
    <div className="flex items-center justify-between mb-5 lg:mb-7">
      <div className="flex items-center gap-2">
        <h2 className="text-[21px] lg:text-[26px] font-black">
          <span style={{ color: '#2B7FFF' }}>{title.split(' ')[0]}</span>{' '}
          <span style={{ color: '#101828' }}>{title.split(' ').slice(1).join(' ')}</span>
        </h2>
        {emoji && <span className="text-xl lg:text-2xl">{emoji}</span>}
      </div>
      {seeMoreHref && (
        <button
          onClick={() => onNavigate?.(seeMoreHref)}
          className="flex items-center gap-[10px] text-[12px] lg:text-[14px] font-bold hover:underline"
          style={{ color: '#2B7FFF', letterSpacing: '-0.0107em' }}
        >
          See more
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="#2B7FFF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}
    </div>
    {children}
  </div>
);

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

// Music card component for the "at a glance" section
// Sizes: large (512×700, #1), medium (620×342, #2-3), small (380×220, #4-9)
const MusicCard = ({ song, rank, size = 'small', onClick }) => {
  const isLarge = size === 'large';
  const isMedium = size === 'medium';

  // Figma specs per size
  const rankTop = isLarge ? '34px' : '24px';
  const rankLeft = isLarge ? '24px' : isMedium ? '24px' : '16px';
  const rankFontSize = isLarge ? '70px' : isMedium ? '70px' : '48px';
  const titleFontSize = isLarge ? '18px' : isMedium ? '18px' : '15px';
  const padding = isLarge ? '16px 24px 24px' : isMedium ? '12px 16px 16px' : '12px 16px 16px';
  const gradientHeight = isLarge ? '114px' : isMedium ? '100px' : '70%';

  return (
    <div
      className="relative cursor-pointer group overflow-hidden"
      style={{ borderRadius: '12px', width: '100%', height: '100%' }}
      onClick={() => onClick?.(song)}
    >
      {/* Image */}
      <img
        src={song.coverImage || '/images/placeholder.jpg'}
        alt={decodeHtmlEntities(song.title || '')}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />
      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: gradientHeight, background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }} />
      {/* Rank number */}
      <span
        className="absolute select-none pointer-events-none"
        style={{
          top: rankTop,
          left: rankLeft,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 900,
          fontSize: rankFontSize,
          lineHeight: '0.7em',
          letterSpacing: '0.005em',
          color: '#FFFFFF',
          WebkitTextStroke: '1px #1D1D1D',
          paintOrder: 'stroke fill',
          textShadow: '0px 4px 10px rgba(0, 0, 0, 0.4)',
        }}
      >
        {rank}
      </span>
      {/* Title + Views at bottom */}
      <div className="absolute bottom-0 left-0 right-0" style={{ padding }}>
        <h3
          className="text-white font-bold line-clamp-2"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: titleFontSize,
            lineHeight: '1.55',
            letterSpacing: '-0.0244em',
          }}
        >
          {decodeHtmlEntities(song.title || '')}
        </h3>
        <div className="flex items-center gap-0.5 mt-1.5">
          <Eye size={14} style={{ color: '#E3E6EB' }} />
          <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 600, fontSize: '14px', color: '#E3E6EB' }}>
            {song.totalViews ? Number(song.totalViews).toLocaleString() : '0'} views
          </span>
        </div>
      </div>
      {/* Play button overlay on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </div>
    </div>
  );
};

export default function Music({ musicNews = [], topSongs = [], watchNews = [], recentComments = [], rankingNews = [], trendingNews = [], editorsPickNews = [] }) {
  const router = useRouter();
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState('');
  const [processedSongs, setProcessedSongs] = useState([]);
  const [glanceExpanded, setGlanceExpanded] = useState(false);

  // Sidebar sticky
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  // 스크롤 복원은 _app.js handleRouteChangeComplete에서 중앙 처리

  useEffect(() => {
    const el = sidebarStickyRef.current;
    if (!el) return;
    const HEADER_H = 92;
    const calcTop = () => {
      const sH = el.offsetHeight;
      const vH = window.innerHeight;
      setSidebarStickyTop(sH <= vH - HEADER_H ? HEADER_H : vH - sH - 40);
    };
    const timer = setTimeout(calcTop, 300);
    const observer = new ResizeObserver(calcTop);
    observer.observe(el);
    window.addEventListener('resize', calcTop);
    return () => { clearTimeout(timer); observer.disconnect(); window.removeEventListener('resize', calcTop); };
  }, []);

  // Process song data
  useEffect(() => {
    if (topSongs && topSongs.length > 0) {
      const processed = topSongs.map((song, index) => {
        const ensureNumber = (v, d) => typeof v === 'number' ? v : (v == null ? d : (isNaN(parseInt(v)) ? d : parseInt(v)));
        return {
          ...song,
          position: ensureNumber(song.position, index + 1),
          totalViews: ensureNumber(song.totalViews, 0),
        };
      }).sort((a, b) => a.position - b.position);
      setProcessedSongs(processed);
    }
  }, [topSongs]);

  const navigateToPage = (path, e) => {
    if (e) e.preventDefault();
    if (path === router.pathname || path === router.asPath) return;
    router.push(path);
  };

  const openYoutubeModal = (url, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!url) return;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (match && match[1]) {
      setCurrentYoutubeUrl(`https://www.youtube.com/embed/${match[1]}?autoplay=1&playsinline=1&rel=0&modestbranding=1`);
      setShowYoutubeModal(true);
    }
  };

  const closeYoutubeModal = () => { setShowYoutubeModal(false); setCurrentYoutubeUrl(''); };

  const handleSongClick = (song) => {
    if (song.youtubeUrl) {
      openYoutubeModal(song.youtubeUrl);
    }
  };

  // Songs for the "at a glance" section
  const glanceSongs = processedSongs.slice(0, 19);

  return (
    <>
    <MainLayout>
      <Seo
        title="K-Pop Music | Korean Music Charts & Latest Songs"
        description="Discover the latest K-Pop music releases, trending songs, and music charts."
        url="/music"
        type="website"
        keywords="K-Pop music,Korean music,K-Pop charts,BTS,BLACKPINK,NewJeans"
        jsonLd={generateWebsiteJsonLd()}
      />

      {/* ============ MOBILE LAYOUT (< lg) ============ */}
      <div className="lg:hidden">
        <main className="pt-0 pb-16 bg-white">
          {/* Mobile Comment Ticker */}
          <div className="px-4 py-3">
            <CommentTicker comments={recentComments} onNavigate={navigateToPage} />
          </div>

          {/* Music News at a glance */}
          <div className="bg-white">
            {/* Header */}
            <div className="px-4 pt-4 pb-0">
              <div className="flex items-center justify-between">
                <h2 className="text-[21px] font-extrabold" style={{ fontFamily: 'Pretendard, sans-serif', lineHeight: '1.29em', color: '#101828' }}>
                  <span className="text-ksp-accent">Music News</span> at a glance
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-5 px-4 pt-4 pb-5">
              {/* Top 3 large cards */}
              <div className="flex flex-col gap-4">
                {glanceSongs.slice(0, 3).map((song) => (
                  <div
                    key={song._id}
                    className="relative overflow-hidden cursor-pointer group"
                    style={{ height: '250px', borderRadius: '14px' }}
                    onClick={() => handleSongClick(song)}
                  >
                    {/* Background image */}
                    <img
                      src={song.coverImage || '/images/placeholder.jpg'}
                      alt={decodeHtmlEntities(song.title || '')}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)' }} />
                    {/* Bottom content: rank + title + views */}
                    <div className="absolute bottom-0 left-0 right-0 flex gap-3" style={{ padding: '0 16px 16px' }}>
                      <span
                        className="select-none flex-shrink-0"
                        style={{
                          fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic', fontSize: '48px',
                          lineHeight: '48px', letterSpacing: '0.352px',
                          color: '#FFF', WebkitTextStroke: '1px #1D1D1D',
                          paintOrder: 'stroke fill',
                          textShadow: '0 4px 10px rgba(0,0,0,0.4)',
                          width: '32px',
                        }}
                      >{song.position}</span>
                      <div className="flex flex-col gap-1 min-w-0">
                        <h3
                          className="text-white font-bold line-clamp-2"
                          style={{ fontFamily: 'Inter', fontSize: '18px', lineHeight: '1.375em', letterSpacing: '-0.0244em' }}
                        >
                          {decodeHtmlEntities(song.title || '')}
                        </h3>
                        <div className="flex items-center gap-[2px]">
                          <Eye size={14} style={{ color: '#E3E6EB' }} />
                          <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '10px', lineHeight: '1.5em', color: '#E3E6EB' }}>
                            {song.totalViews ? Number(song.totalViews).toLocaleString() : '0'} views
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Play button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Small music cards - 2 column grid */}
              {glanceSongs.length > 3 && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                  {glanceSongs.slice(3, glanceExpanded ? 19 : 9).map((song) => (
                    <div
                      key={song._id}
                      className="flex flex-col gap-2 cursor-pointer"
                      onClick={() => handleSongClick(song)}
                    >
                      {/* Thumbnail with rank */}
                      <div className="relative w-full overflow-hidden" style={{ height: '146px', borderRadius: '10px', background: '#F3F4F6' }}>
                        <img
                          src={song.coverImage || '/images/placeholder.jpg'}
                          alt={decodeHtmlEntities(song.title || '')}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                        />
                        {/* Rank number */}
                        <span
                          className="absolute select-none pointer-events-none"
                          style={{
                            bottom: '8px', left: '10px',
                            fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic',
                            fontSize: '40px', lineHeight: '48px', letterSpacing: '0.352px',
                            color: '#FFF', WebkitTextStroke: '1px #1D1D1D',
                            paintOrder: 'stroke fill',
                            textShadow: '0 4px 10px rgba(0,0,0,0.4)',
                          }}
                        >{song.position}</span>
                      </div>
                      {/* Title + views */}
                      <div className="flex flex-col gap-[6px]">
                        <h4
                          className="line-clamp-2"
                          style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', lineHeight: '17.5px', letterSpacing: '-0.15px', color: '#101828', WebkitFontSmoothing: 'antialiased' }}
                        >
                          {decodeHtmlEntities(song.title || '')}
                        </h4>
                        <div className="flex items-center gap-[2px]">
                          <Eye size={14} style={{ color: '#99A1AF' }} />
                          <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '10px', lineHeight: '15px', color: '#99A1AF' }}>
                            {song.totalViews ? Number(song.totalViews).toLocaleString() : '0'} views
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* See More / Collapse button */}
              {!glanceExpanded ? (
                <button
                  onClick={() => setGlanceExpanded(true)}
                  className="w-full flex items-center justify-center gap-[3px] hover:bg-gray-50 transition-colors"
                  style={{ padding: '12px 16px', border: '1px solid #D1D5DC', borderRadius: '10px' }}
                >
                  <span className="text-[14px] font-semibold" style={{ color: '#2D3138', fontFamily: 'Inter' }}>See More</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#2D3138" strokeWidth="1.17" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              ) : (
                <button
                  onClick={() => setGlanceExpanded(false)}
                  className="w-full flex items-center justify-center gap-[3px] hover:bg-gray-50 transition-colors"
                  style={{ padding: '12px 16px', border: '1px solid #D1D5DC', borderRadius: '10px' }}
                >
                  <span className="text-[14px] font-semibold" style={{ color: '#2D3138', fontFamily: 'Inter' }}>Collapse</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 8.75L7 5.25L10.5 8.75" stroke="#2D3138" strokeWidth="1.17" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
            </div>
          </div>
          <div className="h-2 bg-[#F3F4F6]" />

          {/* Mobile Trending */}
          <div className="px-4 py-4">
            <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews} onNavigate={navigateToPage} showCard={false} />
          </div>
          <div className="h-2 bg-[#F3F4F6]" />

          {/* Latest Kpop Updates */}
          <div className="bg-white" style={{ padding: '24px 16px' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-black text-[#101828]" style={{ fontFamily: 'Inter, sans-serif' }}>
                <span className="text-ksp-accent">Latest Kpop</span> Updates
              </h2>
            </div>

            {/* Featured large card */}
            {musicNews.length > 0 && (
              <div
                className="rounded-[10px] overflow-hidden cursor-pointer relative"
                style={{ height: '227px' }}
                onClick={() => navigateToPage(`/news/${musicNews[0].slug || musicNews[0]._id}`)}
              >
                <img
                  src={musicNews[0].coverImage || musicNews[0].thumbnailUrl || '/images/news/default-news.jpg'}
                  alt={decodeHtmlEntities(typeof musicNews[0].title === 'string' ? musicNews[0].title : (musicNews[0].title?.en || ''))}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/images/news/default-news.jpg'; }}
                />
                <div className="absolute bottom-0 left-0 right-0 px-[17px] py-5" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}>
                  <p className="text-white font-bold line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: '22.5px' }}>
                    {decodeHtmlEntities(typeof musicNews[0].title === 'string' ? musicNews[0].title : (musicNews[0].title?.en || ''))}
                  </p>
                </div>
              </div>
            )}

            {/* News list items */}
            {musicNews.length > 1 && (
              <div className="pt-4 flex flex-col gap-4">
                {musicNews.slice(1, 5).map((news) => (
                  <div
                    key={news._id}
                    className="flex items-center gap-4 cursor-pointer"
                    onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                  >
                    <div className="flex-shrink-0 w-[127px] h-[95px] rounded-lg overflow-hidden" style={{ background: '#F3F4F6' }}>
                      <img
                        src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                        alt={decodeHtmlEntities(typeof news.title === 'string' ? news.title : (news.title?.en || ''))}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/images/news/default-news.jpg'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <p className="text-[#101828] font-bold line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px' }}>
                        {decodeHtmlEntities(typeof news.title === 'string' ? news.title : (news.title?.en || ''))}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-[2px] rounded bg-[#DBE6F6] text-[#2B7FFF] font-bold text-[12px]" style={{ fontFamily: 'Inter' }}>
                          K-POP
                        </span>
                        <span className="text-[#6A7282] text-[12px]" style={{ fontFamily: 'Inter' }}>
                          {news.author?.name || news.author || ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="h-2 bg-[#F3F4F6]" />

          {/* MoreNews */}
          <div className="px-4 py-5">
            <MoreNews initialNews={musicNews} category="kpop" />
          </div>
        </main>
      </div>

      {/* ============ PC LAYOUT (>= lg) ============ */}
      <div className="hidden lg:block">
        <main className="pt-0 pb-16 bg-[#F8F9FA]">
          <div className="max-w-[1772px] mx-auto px-10 pt-8">
            <div className="flex flex-row gap-[60px]">
              {/* Left: Main Content Area */}
              <div className="flex-1 min-w-0 max-w-content">

                {/* ===== Music News at a glance ===== */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-[30px] px-8 mb-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[26px] font-black" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      <span style={{ color: '#101828' }}>Music News at a glance</span>
                    </h2>
                  </div>

                  {/* Row 1: Large card (512px) + 2 stacked cards (636px, gap 16px) */}
                  {glanceSongs.length > 0 && (
                    <div className="flex overflow-hidden" style={{ height: '700px' }}>
                      {/* Left: Big card #1 (Figma: 512×700) */}
                      <div style={{ width: '512px', flexShrink: 0, height: '700px' }}>
                        <MusicCard song={glanceSongs[0]} rank={glanceSongs[0]?.position} size="large" onClick={handleSongClick} />
                      </div>
                      {/* Right: 2 stacked cards (Figma: 636×700, each 342px, gap 16px) */}
                      <div className="flex-1 flex flex-col" style={{ gap: '16px', paddingLeft: '16px' }}>
                        {glanceSongs.slice(1, 3).map((song) => (
                          <div key={song._id} style={{ height: '342px', flexShrink: 0 }}>
                            <MusicCard song={song} rank={song.position} size="medium" onClick={handleSongClick} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 2: 3 equal cards */}
                  {glanceSongs.length > 3 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {glanceSongs.slice(3, 6).map((song) => (
                        <div key={song._id} style={{ height: '260px' }}>
                          <MusicCard song={song} rank={song.position} size="small" onClick={handleSongClick} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Row 3: 3 equal cards */}
                  {glanceSongs.length > 6 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {glanceSongs.slice(6, 9).map((song) => (
                        <div key={song._id} style={{ height: '260px' }}>
                          <MusicCard song={song} rank={song.position} size="small" onClick={handleSongClick} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded rows (10~19) */}
                  {glanceExpanded && glanceSongs.length > 9 && (
                    <>
                      {[9, 12, 15].map((startIdx) => (
                        glanceSongs.length > startIdx && (
                          <div key={startIdx} className="grid grid-cols-3 gap-4 mt-4">
                            {glanceSongs.slice(startIdx, Math.min(startIdx + 3, 19)).map((song) => (
                              <div key={song._id} style={{ height: '260px' }}>
                                <MusicCard song={song} rank={song.position} size="small" onClick={handleSongClick} />
                              </div>
                            ))}
                          </div>
                        )
                      ))}
                    </>
                  )}

                  {/* See More / Collapse button */}
                  {glanceSongs.length > 9 && (
                    !glanceExpanded ? (
                      <button
                        onClick={() => setGlanceExpanded(true)}
                        className="w-full mt-6 py-3 text-center font-semibold text-[15px] hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                        style={{ border: '1.5px solid #D5D8DF', borderRadius: '100px', color: '#4B5563' }}
                      >
                        See More
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="#4B5563" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => setGlanceExpanded(false)}
                        className="w-full mt-6 py-3 text-center font-semibold text-[15px] hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                        style={{ border: '1.5px solid #D5D8DF', borderRadius: '100px', color: '#4B5563' }}
                      >
                        Collapse
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 10L8 6L12 10" stroke="#4B5563" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )
                  )}
                </div>

                {/* Latest Kpop Updates */}
                <SectionWrapper title="Latest Kpop Updates" emoji="🔥">
                  <ArticleCardGrid articles={musicNews?.slice(0, 3) || []} onNavigate={navigateToPage} />
                  {musicNews?.length > 3 && (
                    <div className="mt-8">
                      <ArticleCardGrid articles={musicNews.slice(3, 6)} onNavigate={navigateToPage} />
                    </div>
                  )}
                </SectionWrapper>

                {/* Watch News */}
                {watchNews && watchNews.length > 0 && (
                  <SectionWrapper title="Watch News" emoji="👀">
                    <WatchNewsSection articles={watchNews} onNavigate={navigateToPage} onPlayVideo={openYoutubeModal} />
                  </SectionWrapper>
                )}

                {/* MoreNews - Infinite Scroll */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-8 px-6">
                  <MoreNews initialNews={musicNews} category="kpop" />
                </div>
              </div>

              {/* Right: Sidebar (500px) */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarStickyRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    <CommentTicker comments={recentComments} onNavigate={navigateToPage} />
                    <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews} onNavigate={navigateToPage} />
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
                                  src={item.coverImage || item.thumbnailUrl || '/images/placeholder.jpg'}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
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
                                <h4 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2 transition-colors">
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

      {/* YouTube Modal - portal to body to avoid transform containing block from swipe navigation */}
      {showYoutubeModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4"
          onClick={closeYoutubeModal}
        >
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeYoutubeModal}
              className="absolute -top-12 right-0 p-3 text-white bg-black/60 rounded-full hover:bg-black/80 transition-colors z-10"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
            <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  src={currentYoutubeUrl}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                  allowFullScreen
                  title="YouTube video player"
                ></iframe>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export async function getServerSideProps(context) {
  try {
    // 뒤로가기 시 브라우저 캐시 사용 → 서버 요청 없이 즉시 렌더링
    context.res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${context.req.headers.host}`;
    const prodUrl = baseUrl;

    const listFields = 'fields=_id,title,slug,coverImage,thumbnailUrl,category,source,sourceUrl,timeText,summary,content,createdAt,publishedAt,updatedAt,viewCount,featured,tags,author,youtubeUrl,articleUrl';

    const fixImageUrl = (url) => {
      if (!url) return url;
      if (url.startsWith('/api/proxy/hash-image')) return `${prodUrl}${url}`;
      // 로컬 개발 시 kstarpick.com 프록시 → 프로덕션 서버 직접 접근
      if (process.env.NODE_ENV === 'development' && url.includes('kstarpick.com/api/proxy')) {
        return url.replace('https://kstarpick.com', 'http://43.202.38.79:13001');
      }
      return url;
    };

    const [newsRes, musicRes, watchRes, commentsRes, rankingRes, trendingRes, editorsPickRes] = await Promise.all([
      fetch(`${prodUrl}/api/news?category=kpop&limit=100&${listFields}`),
      fetch(`${process.env.NODE_ENV === 'development' ? 'http://43.202.38.79:13001' : prodUrl}/api/music/popular?limit=20`),
      fetch(`${prodUrl}/api/news?limit=200&${listFields}`),
      fetch(`${baseUrl}/api/comments/recent?limit=10`),
      fetch(`${prodUrl}/api/news?limit=10&sort=viewCount&category=kpop&${listFields}`),
      fetch(`${prodUrl}/api/news/trending?limit=5&category=kpop`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news/editors-pick?limit=6&category=kpop`).catch(() => ({ json: () => ({ success: false }) })),
    ]);

    const [newsData, musicData, allNewsData, commentsData, rankingData, trendingData, editorsPickData] = await Promise.all([
      newsRes.json(), musicRes.json(), watchRes.json(), commentsRes.json(), rankingRes.json(), trendingRes.json(), editorsPickRes.json(),
    ]);

    // Process music news
    let musicNews = [];
    if (newsData?.success) {
      musicNews = Array.isArray(newsData.data) ? newsData.data : (newsData.data?.news || []);
    }
    musicNews = musicNews.map(n => ({
      ...n,
      coverImage: fixImageUrl(n.coverImage) || '/images/news/default-news.jpg',
      thumbnailUrl: fixImageUrl(n.thumbnailUrl) || null,
    })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Top songs
    const topSongs = musicData?.success && Array.isArray(musicData.data) ? musicData.data : [];

    // Watch News (kpop category)
    const allNews = allNewsData?.success ? (allNewsData.data?.news || []) : [];
    const watchNews = allNews
      .filter(n => n.title?.startsWith('Watch:') && n.category === 'kpop')
      .slice(0, 6)
      .map(n => ({
        ...n,
        coverImage: fixImageUrl(n.coverImage) || '/images/news/default-news.jpg',
        thumbnailUrl: fixImageUrl(n.thumbnailUrl) || null,
      }));

    // Recent comments
    const recentComments = commentsData?.success ? (commentsData.data?.slice(0, 10) || []) : [];

    // Ranking news
    let rankingNews = [];
    if (rankingData?.success) {
      rankingNews = (rankingData.data?.news || []).map(n => ({
        ...n,
        coverImage: fixImageUrl(n.coverImage) || '/images/news/default-news.jpg',
        thumbnailUrl: fixImageUrl(n.thumbnailUrl) || null,
      }));
    }

    // Trending news
    const trendingNews = trendingData?.success
      ? (trendingData.data || []).slice(0, 5).map(n => ({
          ...n,
          coverImage: fixImageUrl(n.coverImage) || '/images/news/default-news.jpg',
          thumbnailUrl: fixImageUrl(n.thumbnailUrl) || null,
        }))
      : [];

    // Editor's Pick news
    const editorsPickNews = editorsPickData?.success
      ? (editorsPickData.data || []).map(n => ({
          ...n,
          coverImage: fixImageUrl(n.coverImage) || '/images/news/default-news.jpg',
          thumbnailUrl: fixImageUrl(n.thumbnailUrl) || null,
        }))
      : [];

    return {
      props: { musicNews, topSongs, watchNews, recentComments, rankingNews, trendingNews, editorsPickNews }
    };
  } catch (error) {
    console.error('Music page data fetching error:', error);
    return {
      props: { musicNews: [], topSongs: [], watchNews: [], recentComments: [], rankingNews: [], trendingNews: [], editorsPickNews: [] }
    };
  }
}
