import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import useScrollRestore from '../../hooks/useScrollRestore';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Instagram, Twitter, Youtube, Music, Star, Heart, Users, ChevronRight, Globe, ChevronLeft, X } from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import Seo from '../../components/Seo';
import { formatCompactNumber } from '../../utils/formatHelpers';
import MoreNews from '../../components/MoreNews';
import { generateWebsiteJsonLd } from '../../utils/seoHelpers';

// PC layout components
import ArticleCardGrid from '../../components/home/ArticleCardGrid';
import WatchNewsSection from '../../components/home/WatchNewsSection';
import CommentTicker from '../../components/home/CommentTicker';
import TrendingNow from '../../components/home/TrendingNow';
import DramaCategories from '../../components/drama/DramaCategories';

// Section wrapper for consistent styling (matches drama/tvfilm page)
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

// Editor's PICK helper
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

// 소셜 미디어 아이콘 매핑
const SocialIconMap = {
  instagram: <Instagram className="text-pink-500" size={18} />,
  twitter: <Twitter className="text-blue-400" size={18} />,
  youtube: <Youtube className="text-red-500" size={18} />,
  spotify: <Music className="text-green-500" size={18} />
};

export default function CelebrityListPage({ celebrities = [], celebNews = [], recentComments, rankingNews, watchNews, recommendedNews }) {
  const router = useRouter();
  const [currentCelebPage, setCurrentCelebPage] = useState(0);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right');
  const [isMobile, setIsMobile] = useState(false);
  const mobileCelebsPerPage = 4;
  const desktopCelebsPerPage = 4;
  const animationDuration = 300;
  const scrollContainerRef = useRef(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [sortedCelebrities, setSortedCelebrities] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  // YouTube modal
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState('');

  // Sidebar sticky
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  // 스크롤 위치 복원
  useScrollRestore('celebScrollPosition', 'isBackToCeleb');

  // Sidebar sticky logic
  useEffect(() => {
    const el = sidebarStickyRef.current;
    if (!el) return;
    const HEADER_H = 92;
    const calcTop = () => {
      const sideH = el.getBoundingClientRect().height;
      const winH = window.innerHeight;
      if (sideH + HEADER_H > winH) {
        setSidebarStickyTop(winH - sideH - 16);
      } else {
        setSidebarStickyTop(HEADER_H + 16);
      }
    };
    calcTop();
    window.addEventListener('resize', calcTop);
    return () => window.removeEventListener('resize', calcTop);
  }, []);

  // Navigate helper
  const navigateToPage = useCallback((path, e) => {
    if (e) e.preventDefault();
    if (router.pathname === path || router.asPath === path) return false;
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('celebScrollPosition', window.scrollY.toString());
      }
    } catch (err) {}
    router.push(path);
    return true;
  }, [router]);

  // YouTube modal
  const openYoutubeModal = (url, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!url) return;
    let embedUrl = url;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) {
      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    }
    setCurrentYoutubeUrl(embedUrl);
    setShowYoutubeModal(true);
  };

  const closeYoutubeModal = () => {
    setShowYoutubeModal(false);
    setCurrentYoutubeUrl('');
  };

  // Category filter handler
  const handleCategoryClick = (categoryId) => {
    setActiveCategory(prev => prev === categoryId ? null : categoryId);
  };

  // SNS 팔로워 총합 계산 함수
  const getTotalFollowers = (celeb) => {
    if (!celeb.socialMediaFollowers) return 0;
    return Object.values(celeb.socialMediaFollowers).reduce((sum, count) => sum + count, 0);
  };

  // 셀럽 데이터 정렬 - 최신 업데이트 순
  useEffect(() => {
    const sorted = [...celebrities].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return dateB - dateA;
    });
    setSortedCelebrities(sorted);
  }, [celebrities]);

  // 화면 크기 감지
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // 스크롤 상태 업데이트 함수
  const updateScrollState = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      setScrollState({
        canScrollLeft: container.scrollLeft > 0,
        canScrollRight: container.scrollWidth > container.clientWidth + container.scrollLeft
      });
    }
  };

  // 스크롤 핸들러
  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardElement = container.querySelector('a');
      if (!cardElement) return;
      const cardWidth = cardElement.offsetWidth;
      const spacing = 16;
      if (direction === 'left') {
        const newIndex = Math.max(0, activeCardIndex - 1);
        container.scrollTo({ left: newIndex * (cardWidth + spacing), behavior: 'smooth' });
        setActiveCardIndex(newIndex);
      } else {
        const newIndex = Math.min(sortedCelebrities.length - 1, activeCardIndex + 1);
        container.scrollTo({ left: newIndex * (cardWidth + spacing), behavior: 'smooth' });
        setActiveCardIndex(newIndex);
      }
      setTimeout(updateScrollState, 300);
    }
  };

  // 스크롤 이벤트 핸들러
  const handleScrollUpdate = () => {
    updateScrollState();
    if (scrollContainerRef.current && sortedCelebrities.length > 0) {
      const container = scrollContainerRef.current;
      const cardElement = container.querySelector('a');
      if (!cardElement) return;
      const cardWidth = cardElement.offsetWidth;
      const spacing = 16;
      const scrollPosition = container.scrollLeft;
      const newIndex = Math.round(scrollPosition / (cardWidth + spacing));
      setActiveCardIndex(Math.min(Math.max(0, newIndex), sortedCelebrities.length - 1));
    }
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, []);

  const celebsPerPage = useMemo(() =>
    isMobile ? mobileCelebsPerPage : desktopCelebsPerPage
  , [isMobile]);

  const paginatedCelebs = useMemo(() => {
    const startIdx = currentCelebPage * celebsPerPage;
    return sortedCelebrities.slice(startIdx, startIdx + celebsPerPage);
  }, [sortedCelebrities, currentCelebPage, celebsPerPage]);

  const totalPages = useMemo(() =>
    Math.ceil(sortedCelebrities.length / celebsPerPage)
  , [sortedCelebrities, celebsPerPage]);

  useEffect(() => {
    if (isPageChanging) return;
    if (currentCelebPage >= totalPages && totalPages > 0) {
      setCurrentCelebPage(totalPages - 1);
    }
  }, [celebsPerPage, totalPages, currentCelebPage, isPageChanging]);

  const goToPrevPage = () => {
    if (currentCelebPage > 0 && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('left');
      setCurrentCelebPage(currentCelebPage - 1);
      setTimeout(() => { setIsPageChanging(false); }, animationDuration / 2);
    }
  };

  const goToNextPage = () => {
    const maxPage = Math.ceil(sortedCelebrities.length / 3) - 1;
    if (currentCelebPage < maxPage && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('right');
      setCurrentCelebPage(currentCelebPage + 1);
      setTimeout(() => { setIsPageChanging(false); }, animationDuration / 2);
    }
  };

  const goToPage = (pageNumber) => {
    if (pageNumber >= 0 && pageNumber < totalPages && !isPageChanging && pageNumber !== currentCelebPage) {
      setIsPageChanging(true);
      setSlideDirection(pageNumber > currentCelebPage ? 'right' : 'left');
      setCurrentCelebPage(pageNumber);
      setTimeout(() => { setIsPageChanging(false); }, animationDuration / 2);
    }
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/images/placeholder.jpg';
  };

  const getTopPlatform = (socialMediaFollowers) => {
    if (!socialMediaFollowers) return { platform: null, count: 0 };
    const platforms = Object.entries(socialMediaFollowers);
    if (platforms.length === 0) return { platform: null, count: 0 };
    return platforms.reduce((max, [platform, count]) =>
      count > max.count ? { platform, count } : max,
      { platform: platforms[0][0], count: platforms[0][1] }
    );
  };

  // ============ PC Celebrity Card (Figma: 310x360, frosted glass) ============
  const CelebCardPC = ({ celeb, index, rank }) => {
    const totalFollowers = getTotalFollowers(celeb);

    return (
      <Link
        href={`/celeb/${celeb.slug}`}
        className="block group flex-shrink-0 relative"
        style={{ width: '310px', height: '360px' }}
      >
        {/* Card body with overflow hidden for image/overlay */}
        <div className="relative w-full h-full rounded-xl overflow-hidden">
          {/* Background image (fills entire card) */}
          <img
            src={celeb.profileImage}
            alt={celeb.name}
            className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
            onError={handleImageError}
          />
          {/* Dark blur overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0, 7, 20, 0.3)', backdropFilter: 'blur(50px)', WebkitBackdropFilter: 'blur(50px)' }}
          />

          {/* Inner rounded image (262x262 centered) */}
          <div
            className="absolute rounded-xl overflow-hidden"
            style={{ top: '74px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 26px)', height: '262px' }}
          >
            <img
              src={celeb.profileImage}
              alt={celeb.name}
              className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700"
              onError={handleImageError}
            />
          </div>

          {/* Top bar: name + followers pill */}
          <div
            className="absolute flex items-center justify-between"
            style={{ top: '24px', left: '24px', right: '24px' }}
          >
            <span className="text-white font-bold text-[24px] leading-[1.17] truncate" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.018em' }}>
              {celeb.name}
            </span>
            {totalFollowers > 0 && (
              <div className="flex items-center gap-1 rounded-full px-3 py-1" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Heart size={14} className="text-white" />
                <span className="text-white text-xs font-bold" style={{ letterSpacing: '-0.013em' }}>
                  {formatCompactNumber(totalFollowers)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Rank number - outside overflow-hidden so it can overflow the card */}
        <span
          className="absolute text-white select-none pointer-events-none z-10"
          style={{
            bottom: '-4px',
            left: '6px',
            fontSize: '90px',
            fontWeight: 900,
            fontStyle: 'italic',
            fontFamily: 'Inter, sans-serif',
            lineHeight: '0.7em',
            letterSpacing: '0.005em',
            WebkitTextStroke: '4px #1D1D1D',
            paintOrder: 'stroke fill',
            textShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
          }}
        >
          {rank}
        </span>
      </Link>
    );
  };

  return (
    <MainLayout>
      <Seo
        title="K-Pop Celebrities | Popular Korean Idols & Artists Rankings"
        description="Discover popular K-Pop idols and solo artists including BTS, BLACKPINK, aespa, NewJeans. Check profiles, social media followers, and latest celebrity rankings from Korea."
        url="/celeb"
        type="website"
        keywords="K-Pop celebrities,Korean idols,BTS,BLACKPINK,aespa,NewJeans,Korean artists,idol rankings,social media followers,K-Pop stars"
        jsonLd={generateWebsiteJsonLd()}
      />

      {/* ============ MOBILE LAYOUT (< lg) ============ */}
      <div className="lg:hidden">
        <div className="container mx-auto px-4 pt-0 pb-12">
          {/* 제목 영역 */}
          <div className="mb-8 mt-8">
            <h1 className="font-bold text-black" style={{ fontSize: '20px' }}>
              <span style={{ color: '#233CFA' }}>Celebrities</span> at a Glance
            </h1>
          </div>

          {celebrities.length > 0 ? (
            <>
              {/* 모바일 가로 스크롤 레이아웃 */}
              <div className="mt-8 mb-12">
                <div className="relative">
                  <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto pb-4 space-x-4 hide-scrollbar px-6 snap-x snap-mandatory scroll-smooth"
                    onScroll={handleScrollUpdate}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', paddingLeft: '1.5rem' }}
                  >
                    {sortedCelebrities.slice(0, 30).map((celeb, index) => {
                      const isSolo = celeb.category === 'solo';
                      return (
                        <Link
                          href={`/celeb/${celeb.slug}`}
                          key={celeb._id}
                          className={`flex-shrink-0 w-[65%] snap-center transition-all duration-300 ${
                            activeCardIndex === index ? 'opacity-100 scale-100' : 'opacity-90 scale-95'
                          } ${index === 0 ? 'ml-6' : ''}`}
                          style={{ boxShadow: 'none !important' }}
                        >
                          <div className="bg-white overflow-hidden transition-all duration-300 group relative h-full rounded-lg shadow-none"
                            style={{ boxShadow: 'none !important', border: 'none !important', outline: 'none !important' }}
                          >
                            <div className="aspect-[4/5] overflow-hidden relative rounded-md">
                              <img
                                src={celeb.profileImage}
                                alt={celeb.name}
                                className="object-cover object-top w-full h-full group-hover:scale-105 transition-transform duration-500"
                                onError={handleImageError}
                              />
                              <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center">
                                <span className="text-white font-bold text-5xl drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                  {index + 1}
                                </span>
                              </div>
                            </div>
                            <div className="p-3">
                              <h3 className="font-bold text-gray-800 text-lg mb-1 line-clamp-1">
                                {celeb.name}
                              </h3>
                              {celeb.agency && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Globe size={10} className="mr-1" />
                                  <span className="truncate">{celeb.agency}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-16 text-center mb-16">
              <div className="text-gray-400 mb-6">
                <Users size={64} className="mx-auto opacity-60" />
              </div>
              <p className="text-gray-600 text-xl mb-4">No celebrities found</p>
              <p className="text-gray-400 text-base">Check back later for updates</p>
            </div>
          )}

          {/* 셀럽 뉴스 - MoreNews */}
          <MoreNews category="celeb" initialNews={celebNews} />
          <div className="mb-12"></div>
        </div>
      </div>

      {/* ============ PC LAYOUT (>= lg) ============ */}
      <div className="hidden lg:block">
        <main className="pt-0 pb-16 bg-[#F8F9FA]">
          <div className="max-w-[1772px] mx-auto px-10 pt-8">
            <div className="flex flex-row gap-[60px]">
              {/* Left: Main Content Area (1212px) */}
              <div className="flex-1 min-w-0 max-w-content">

                {/* ===== Section 1: Celebrity Cards (Figma: frosted glass carousel) ===== */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-[30px] px-8 mb-8">
                  {/* Header: title + See more (Figma: Pretendard 900 26px) */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[26px] font-black" style={{ fontFamily: 'Pretendard, sans-serif', lineHeight: '1.23em' }}>
                      <span style={{ color: '#2B7FFF' }}>Celebrities</span>{' '}
                      <span style={{ color: '#101828' }}>at a glance</span>
                    </h2>
                    <button
                      onClick={() => navigateToPage('/celeb')}
                      className="flex items-center gap-[10px] text-[14px] font-bold hover:underline"
                      style={{ color: '#2B7FFF', letterSpacing: '-0.0107em' }}
                    >
                      See more
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="#2B7FFF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>

                  {celebrities.length > 0 ? (
                    <div className="relative">
                      {/* Card row (Figma: 1148px, overflow hidden, gap 16px, cards 310x360) */}
                      <div className="overflow-hidden" style={{ maxWidth: '1148px' }}>
                        <div
                          className="flex gap-4 transition-transform duration-300 ease-in-out"
                          style={{ transform: `translateX(-${currentCelebPage * (310 + 16) * 3}px)` }}
                        >
                          {sortedCelebrities.map((celeb, index) => (
                            <CelebCardPC
                              key={celeb._id}
                              celeb={celeb}
                              index={index}
                              rank={index + 1}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Right arrow button (Figma: overlapping 4th card, vertically centered) */}
                      {currentCelebPage < Math.ceil(sortedCelebrities.length / 3) - 1 && (
                        <button
                          onClick={goToNextPage}
                          disabled={isPageChanging}
                          aria-label="Next page"
                          className="absolute z-20 w-[44px] h-[44px] rounded-full bg-white flex items-center justify-center transition-all duration-300 hover:bg-gray-50"
                          style={{ top: '50%', transform: 'translateY(-50%)', right: '-22px', border: '1.5px solid #C0D9FF', boxShadow: '0px 0px 6px rgba(139, 185, 255, 0.43)' }}
                        >
                          <ChevronRight size={18} strokeWidth={2} className="text-[#2B7FFF]" />
                        </button>
                      )}
                      {currentCelebPage > 0 && (
                        <button
                          onClick={goToPrevPage}
                          disabled={isPageChanging}
                          aria-label="Previous page"
                          className="absolute z-20 w-[44px] h-[44px] rounded-full bg-white flex items-center justify-center transition-all duration-300 hover:bg-gray-50"
                          style={{ top: '50%', transform: 'translateY(-50%)', left: '0px', border: '1.5px solid #C0D9FF', boxShadow: '0px 0px 6px rgba(139, 185, 255, 0.43)' }}
                        >
                          <ChevronLeft size={18} strokeWidth={2} className="text-[#2B7FFF]" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No celebrities found</p>
                    </div>
                  )}

                  {/* See More button (Figma: full-width, 46px, border #D5D8DF, rounded 100px) */}
                  <button
                    onClick={() => navigateToPage('/celeb')}
                    className="w-full mt-6 flex items-center justify-center rounded-full transition-colors hover:bg-gray-50"
                    style={{ height: '46px', border: '1px solid #D5D8DF' }}
                  >
                    <span className="text-[14px] font-semibold" style={{ color: '#2D3138' }}>See More</span>
                  </button>
                </div>

                {/* ===== Section 2: Latest Celeb Updates (3-column grid) ===== */}
                <SectionWrapper title="Latest Celeb Updates" emoji="🔥" seeMoreHref="/news" onNavigate={navigateToPage}>
                  <ArticleCardGrid articles={celebNews?.slice(4, 7) || []} onNavigate={navigateToPage} />
                  {celebNews?.length > 7 && (
                    <div className="mt-8">
                      <ArticleCardGrid articles={celebNews.slice(7, 10)} onNavigate={navigateToPage} />
                    </div>
                  )}
                </SectionWrapper>

                {/* ===== Section 3: K-Celeb News (featured image + side news list) ===== */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-[30px] px-6 mb-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-[30px]">
                    <div className="flex items-center gap-[10px]">
                      <h2 className="text-[26px] font-black" style={{ fontFamily: 'Pretendard, sans-serif', color: '#101828' }}>
                        <span style={{ color: '#2B7FFF' }}>K-Celeb</span> News
                      </h2>
                      <span className="text-2xl">👀</span>
                    </div>
                    <button
                      onClick={() => navigateToPage('/celeb')}
                      className="flex items-center gap-[10px] text-[14px] font-bold hover:underline"
                      style={{ color: '#2B7FFF', letterSpacing: '-0.0107em' }}
                    >
                      See more
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="#2B7FFF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>

                  {/* Content: Featured left + News list right */}
                  {celebNews && celebNews.length > 0 && (
                    <div className="flex gap-0">
                      {/* Left: Featured article image (height matches right: 96px×3 + 24px×2 = 336px) */}
                      <div
                        className="relative flex-shrink-0 rounded-[14px] overflow-hidden cursor-pointer group"
                        style={{ width: '49%', height: '336px' }}
                        onClick={() => navigateToPage(`/news/${celebNews[0].slug || celebNews[0]._id}`)}
                      >
                        <img
                          src={celebNews[0].coverImage || '/images/placeholder.jpg'}
                          alt={celebNews[0].title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                        />
                        {/* Bottom gradient overlay with title */}
                        <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-end p-6" style={{ height: '114px', background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}>
                          <h3 className="font-bold text-xl leading-[1.6] text-white line-clamp-2" style={{ letterSpacing: '0.0035em' }}>
                            {celebNews[0].title}
                          </h3>
                        </div>
                      </div>

                      {/* Right: News list (3 items stacked, gap 24px) */}
                      <div className="flex-1 flex flex-col gap-6 pl-6 justify-start">
                        {celebNews.slice(1, 4).map((news) => (
                          <div
                            key={news._id}
                            className="flex items-center gap-4 cursor-pointer group"
                            onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                          >
                            {/* Thumbnail (128x96, rounded 10px) */}
                            <div className="flex-shrink-0 w-[128px] h-[96px] rounded-[10px] overflow-hidden bg-[#F3F4F6]">
                              <img
                                src={news.coverImage || '/images/placeholder.jpg'}
                                alt={news.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                              />
                            </div>
                            {/* Text */}
                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                              <h4 className="font-bold text-[16px] leading-[1.375] text-[#101828] line-clamp-2 group-hover:text-ksp-accent transition-colors" style={{ letterSpacing: '-0.02em' }}>
                                {news.title}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="inline-block px-1.5 py-0.5 bg-ksp-accent text-white text-[10px] font-bold uppercase tracking-wider rounded">
                                  CELEB
                                </span>
                                <span className="text-xs font-medium text-ksp-meta">
                                  {getTimeAgo(news.createdAt || news.publishedAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* MoreNews - Infinite Scroll */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-8 px-6">
                  <MoreNews initialNews={celebNews} category="celeb" />
                </div>
              </div>

              {/* Right: Sidebar (500px) */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarStickyRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    {/* Trending NOW */}
                    <TrendingNow items={rankingNews || []} onNavigate={navigateToPage} />

                    {/* Editor's PICK (Figma: DramaNewsWidget) */}
                    {rankingNews && rankingNews.length > 0 && (
                      <div>
                        <h3 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-[6px] pl-[26px]">Editor&apos;s <span className="text-ksp-accent">PICK</span></h3>
                        <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
                          {rankingNews.slice(0, 6).map((item) => (
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

      {/* YouTube Modal */}
      {showYoutubeModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
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
        </div>
      )}
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  try {
    const host = context.req.headers.host;
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Use production API for data (local DB may not have all data)
    const prodUrl = process.env.NEXT_PUBLIC_API_URL || baseUrl;

    // Fetch all data in parallel
    const [celebResponse, celebNewsResponse, commentsResponse, rankingResponse, allNewsResponse] = await Promise.all([
      fetch(`${prodUrl}/api/celeb?limit=50&active=true`),
      fetch(`${prodUrl}/api/news/celeb?limit=200`),
      fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=10&sort=viewCount&category=celeb`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=200`).catch(() => ({ json: () => ({ success: false }) }))
    ]);

    const celebData = await celebResponse.json();
    const celebNewsData = await celebNewsResponse.json();
    const commentsData = await commentsResponse.json();
    const rankingData = await rankingResponse.json();
    const allNewsData = await allNewsResponse.json();

    // Fix relative image URLs to absolute production URLs
    const fixImageUrl = (url) => {
      if (!url) return url;
      if (url.startsWith('/api/proxy/hash-image')) return `${prodUrl}${url}`;
      // 로컬 개발 시 kstarpick.com 프록시 → 프로덕션 서버 직접 접근
      if (process.env.NODE_ENV === 'development' && url.includes('kstarpick.com/api/proxy')) {
        return url.replace('https://kstarpick.com', 'http://43.202.38.79:13001');
      }
      return url;
    };

    // Process celeb news
    const celebNewsArray = celebNewsData.success && celebNewsData.data ? celebNewsData.data : [];
    const processedNews = celebNewsArray.map(news => {
      if (!news.coverImage) news.coverImage = '/images/news/default-news.jpg';
      else news.coverImage = fixImageUrl(news.coverImage);
      if (news.thumbnailUrl) news.thumbnailUrl = fixImageUrl(news.thumbnailUrl);
      return news;
    });

    // Watch News: filter celeb category
    const watchNews = allNewsData.success && allNewsData.data?.news
      ? allNewsData.data.news.filter(n => n.title && n.title.startsWith('Watch:') && (n.category === 'celeb' || n.category === 'variety')).slice(0, 6).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // Recommended News: featured celeb news
    const recommendedNews = allNewsData.success && allNewsData.data?.news
      ? allNewsData.data.news.filter(n => n.featured && (n.category === 'celeb' || n.category === 'variety')).slice(0, 3).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // Ranking news for sidebar
    const rankingNews = rankingData.success
      ? (rankingData.data?.news || []).slice(0, 10).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // If not enough recommended, fallback to ranking
    const finalRecommended = recommendedNews.length >= 3
      ? recommendedNews
      : rankingNews.slice(0, 3);

    // Celebrities
    const celebrities = celebData.success && celebData.data?.celebrities
      ? celebData.data.celebrities
      : [];

    return {
      props: {
        celebrities,
        celebNews: processedNews,
        recentComments: commentsData.success ? (commentsData.data || []).slice(0, 10) : [],
        rankingNews,
        watchNews,
        recommendedNews: finalRecommended,
      }
    };
  } catch (error) {
    console.error('셀럽 데이터 가져오기 오류:', error);
    return {
      props: {
        celebrities: [],
        celebNews: [],
        recentComments: [],
        rankingNews: [],
        watchNews: [],
        recommendedNews: [],
      }
    };
  }
}
