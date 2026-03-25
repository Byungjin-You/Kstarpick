import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
// 스크롤 복원은 _app.js handleRouteChangeComplete에서 중앙 처리
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

export default function CelebrityListPage({ celebrities = [], celebNews = [], recentComments, rankingNews, trendingNews = [], watchNews, recommendedNews, editorsPickNews = [] }) {
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

  // 스크롤 복원은 _app.js handleRouteChangeComplete에서 중앙 처리

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
    router.push(path);
    return false;
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

  // PC 캐러셀은 카드 3개 단위로 이동
  const pcCardsPerSlide = 3;
  const pcMaxPage = useMemo(() =>
    Math.max(0, Math.ceil(sortedCelebrities.length / pcCardsPerSlide) - 1)
  , [sortedCelebrities.length]);

  useEffect(() => {
    if (isPageChanging) return;
    if (currentCelebPage >= totalPages && totalPages > 0) {
      setCurrentCelebPage(totalPages - 1);
    }
  }, [celebsPerPage, totalPages, currentCelebPage, isPageChanging]);

  // PC에서 pcMaxPage 초과 방지
  useEffect(() => {
    if (!isMobile && currentCelebPage > pcMaxPage && pcMaxPage >= 0) {
      setCurrentCelebPage(pcMaxPage);
    }
  }, [isMobile, currentCelebPage, pcMaxPage]);

  const goToPrevPage = () => {
    if (currentCelebPage > 0 && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('left');
      setCurrentCelebPage(currentCelebPage - 1);
      setTimeout(() => { setIsPageChanging(false); }, animationDuration / 2);
    }
  };

  const goToNextPage = () => {
    if (currentCelebPage < pcMaxPage && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('right');
      setCurrentCelebPage(currentCelebPage + 1);
      setTimeout(() => { setIsPageChanging(false); }, animationDuration / 2);
    }
  };

  // 마우스 드래그 스크롤 (translateX 방식)
  const celebCarouselRef = useRef(null);
  const dragOffset = useRef(0); // 현재 translateX 값
  const dragState = useRef({ isDragging: false, startX: 0, startOffset: 0, didDrag: false });

  const applyTranslate = (x, smooth) => {
    const el = celebCarouselRef.current;
    if (!el) return;
    el.style.transition = smooth ? 'transform 0.3s ease' : 'none';
    el.style.transform = `translateX(${x}px)`;
  };

  const handleMouseDown = (e) => {
    // See More 버튼 클릭은 무시
    if (e.target.closest('button')) return;
    e.preventDefault();
    dragState.current = { isDragging: true, startX: e.clientX, startOffset: dragOffset.current, didDrag: false };
  };

  // 드래그 중이면 카드 링크 클릭 방지
  const handleCardClick = (e) => {
    if (dragState.current.didDrag) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.didDrag = false;
    }
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragState.current.isDragging) return;
      e.preventDefault();
      const diff = e.clientX - dragState.current.startX;
      if (Math.abs(diff) > 5) dragState.current.didDrag = true;
      const el = celebCarouselRef.current;
      if (!el) return;
      const parentWidth = el.parentElement?.offsetWidth || 0;
      const contentWidth = el.scrollWidth;
      const maxOffset = 0;
      const minOffset = -(contentWidth - parentWidth);
      let newOffset = dragState.current.startOffset + diff;
      // 경계 제한 (약간의 탄성)
      if (newOffset > maxOffset) newOffset = maxOffset + (newOffset - maxOffset) * 0.2;
      if (newOffset < minOffset) newOffset = minOffset + (newOffset - minOffset) * 0.2;
      dragOffset.current = newOffset;
      applyTranslate(newOffset, false);
    };

    const onMouseUp = () => {
      if (!dragState.current.isDragging) return;
      dragState.current.isDragging = false;
      const el = celebCarouselRef.current;
      if (!el) return;
      const parentWidth = el.parentElement?.offsetWidth || 0;
      const contentWidth = el.scrollWidth;
      const maxOffset = 0;
      const minOffset = -(contentWidth - parentWidth);
      // 경계 스냅백
      if (dragOffset.current > maxOffset) dragOffset.current = maxOffset;
      if (dragOffset.current < minOffset) dragOffset.current = minOffset;
      applyTranslate(dragOffset.current, true);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

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
            draggable="false"
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
              draggable="false"
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
      <div className="lg:hidden overflow-x-hidden">

        {/* === CommentTicker === */}
        <div className="bg-white" style={{ padding: '16px 16px 4px' }}>
          <CommentTicker comments={recentComments} onNavigate={navigateToPage} />
        </div>

        {/* === Section: Celebrities at a glance === */}
        <div className="bg-white">
          {/* Header */}
          <div className="px-4 pt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[21px] font-extrabold" style={{ fontFamily: 'Pretendard, sans-serif', lineHeight: '1.29em', color: '#101828' }}>
                <span className="text-ksp-accent">Celebrities</span> at a glance
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col" style={{ gap: '20px', padding: '16px 16px 20px' }}>
            <div className="flex flex-col" style={{ gap: '16px' }}>

              {/* Hero Card #1 */}
              {sortedCelebrities.length > 0 && (() => {
                const celeb = sortedCelebrities[0];
                const totalFollowers = getTotalFollowers(celeb);
                return (
                  <div
                    className="relative rounded-xl overflow-hidden cursor-pointer"
                    style={{ height: '360px', background: '#1a1a2e' }}
                    onClick={() => navigateToPage(`/celeb/${celeb.slug}`)}
                  >
                    {/* Blurred background image */}
                    <img
                      src={celeb.profileImage}
                      alt=""
                      className="absolute w-full h-full object-cover object-top"
                      style={{ inset: '-20px', width: 'calc(100% + 40px)', height: 'calc(100% + 40px)', filter: 'blur(50px)', WebkitFilter: 'blur(50px)' }}
                      onError={handleImageError}
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0" style={{ background: 'rgba(0,7,20,0.3)' }} />
                    {/* Inner album image */}
                    <div
                      className="absolute overflow-hidden z-[1]"
                      style={{ top: '74px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 62px)', height: '262px', borderRadius: '12px' }}
                    >
                      <img
                        src={celeb.profileImage}
                        alt={celeb.name}
                        className="w-full h-full object-cover object-top"
                        onError={handleImageError}
                      />
                    </div>
                    {/* Rank number */}
                    <span
                      className="absolute select-none pointer-events-none z-[2]"
                      style={{
                        top: '277px', left: '34px',
                        fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic',
                        fontSize: '70px', lineHeight: '48px',
                        letterSpacing: '0.352px',
                        color: '#FFF', WebkitTextStroke: '1px #1D1D1D',
                        paintOrder: 'stroke fill',
                        textShadow: '0 4px 10px rgba(0,0,0,0.4)',
                      }}
                    >1</span>
                    {/* Top: name + followers - Figma: x:24, y:24 */}
                    <div className="absolute flex items-center justify-between z-[2]" style={{ top: '24px', left: '24px', right: '30px' }}>
                      <span className="text-white font-bold truncate" style={{ fontFamily: 'Inter', fontSize: '24px', lineHeight: '28px', letterSpacing: '-0.439px' }}>
                        {celeb.name}
                      </span>
                      {totalFollowers > 0 && (
                        <div className="flex items-center gap-1 rounded-full flex-shrink-0" style={{ padding: '4px 12px 4px 10px', background: 'rgba(255,255,255,0.2)' }}>
                          <Heart size={14} className="text-white" fill="white" />
                          <span className="text-white text-[12px] font-bold" style={{ fontFamily: 'Inter', letterSpacing: '-0.013em' }}>
                            {formatCompactNumber(totalFollowers)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Small Cards #2-5 horizontal scroll */}
              {sortedCelebrities.length > 1 && (
                <div className="overflow-x-auto scrollbar-hide -mx-4">
                  <div className="flex gap-2 px-4">
                    {sortedCelebrities.slice(1, 5).map((celeb, idx) => {
                      const rank = idx + 2;
                      const totalFollowers = getTotalFollowers(celeb);
                      return (
                        <div
                          key={celeb._id}
                          className="flex-shrink-0 relative rounded-[6px] overflow-hidden cursor-pointer"
                          style={{ width: '155px', height: '180px', background: '#1a1a2e' }}
                          onClick={() => navigateToPage(`/celeb/${celeb.slug}`)}
                        >
                          {/* Blurred background */}
                          <img
                            src={celeb.profileImage}
                            alt=""
                            className="absolute w-full h-full object-cover object-top"
                            style={{ inset: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)', filter: 'blur(25px)', WebkitFilter: 'blur(25px)' }}
                            onError={handleImageError}
                          />
                          {/* Dark overlay */}
                          <div className="absolute inset-0" style={{ background: 'rgba(0,7,20,0.3)' }} />
                          {/* Inner album */}
                          <div className="absolute overflow-hidden z-[1]" style={{ top: '37px', left: '12px', width: '131px', height: '131px', borderRadius: '6px' }}>
                            <img
                              src={celeb.profileImage}
                              alt={celeb.name}
                              className="w-full h-full object-cover object-top"
                              onError={handleImageError}
                            />
                          </div>
                          {/* Rank */}
                          <span
                            className="absolute select-none pointer-events-none z-[2]"
                            style={{
                              top: '138px', left: '17px',
                              fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic',
                              fontSize: '50px', lineHeight: '24px',
                              letterSpacing: '0.176px',
                              color: '#FFF', WebkitTextStroke: '0.5px #1D1D1D',
                              paintOrder: 'stroke fill',
                              textShadow: '0 2px 5px rgba(0,0,0,0.4)',
                            }}
                          >{rank}</span>
                          {/* Top: name + followers - Figma: x:12, y:12 */}
                          <div className="absolute flex items-center justify-between z-[2]" style={{ top: '12px', left: '12px', width: '131px' }}>
                            <span className="text-white font-bold truncate" style={{ fontFamily: 'Inter', fontSize: '12px', lineHeight: '14px', letterSpacing: '-0.22px' }}>
                              {celeb.name}
                            </span>
                            {totalFollowers > 0 && (
                              <div className="flex items-center gap-[2px] rounded-full flex-shrink-0" style={{ padding: '2px 6px 2px 5px', background: 'rgba(255,255,255,0.2)' }}>
                                <Heart size={10} className="text-white" fill="white" />
                                <span className="text-white text-[8px] font-bold" style={{ fontFamily: 'Inter' }}>
                                  {formatCompactNumber(totalFollowers)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex-shrink-0 w-4" />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Separator */}
        <div className="h-2 bg-[#F3F4F6]" />

        {/* === Remaining sections (Trending, Latest Updates, More News) === */}
        <div className="bg-white px-4 py-5">
          <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews} onNavigate={navigateToPage} showCard={false} />
        </div>
        <div className="h-2 bg-[#F3F4F6]" />

        {/* Latest Celeb Updates */}
        <div className="bg-white" style={{ padding: '24px 16px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-black text-[#101828]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <span className="text-ksp-accent">Latest Celeb</span> Updates
            </h2>
          </div>

          {/* Featured large card */}
          {celebNews && celebNews.length > 0 && (
            <div
              className="rounded-[10px] overflow-hidden cursor-pointer relative"
              style={{ height: '227px' }}
              onClick={() => navigateToPage(`/news/${celebNews[0].slug || celebNews[0]._id}`)}
            >
              <img
                src={celebNews[0].coverImage || celebNews[0].thumbnailUrl || '/images/news/default-news.jpg'}
                alt={celebNews[0].title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = '/images/news/default-news.jpg'; }}
              />
              <div className="absolute bottom-0 left-0 right-0 px-[17px] py-5" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}>
                <p className="text-white font-bold line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: '22.5px' }}>
                  {celebNews[0].title}
                </p>
              </div>
            </div>
          )}

          {/* News list items */}
          {celebNews && celebNews.length > 1 && (
            <div className="pt-4 flex flex-col gap-4">
              {celebNews.slice(1, 5).map((news) => (
                <div
                  key={news._id}
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                >
                  <div className="flex-shrink-0 w-[127px] h-[95px] rounded-lg overflow-hidden" style={{ background: '#F3F4F6' }}>
                    <img
                      src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                      alt={news.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/images/news/default-news.jpg'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <p className="text-[#101828] font-bold line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px' }}>
                      {news.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-[2px] rounded bg-[#DBE6F6] text-[#2B7FFF] font-bold text-[12px]" style={{ fontFamily: 'Inter' }}>
                        Celeb
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

        {/* More News */}
        <div className="bg-white py-5 px-4">
          <MoreNews category="celeb" initialNews={celebNews} storageKey="celeb_mobile" />
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
                  </div>

                  {celebrities.length > 0 ? (
                    <div
                      className="overflow-hidden select-none"
                      style={{ cursor: 'grab' }}
                      onMouseDown={handleMouseDown}
                      onClickCapture={handleCardClick}
                    >
                      <div
                        ref={celebCarouselRef}
                        className="flex gap-4"
                        style={{ width: 'max-content' }}
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
                  ) : (
                    <div className="text-center py-12">
                      <Users size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No celebrities found</p>
                    </div>
                  )}

                </div>

                {/* ===== Section 2: Latest Celeb Updates (3-column grid) ===== */}
                <SectionWrapper title="Latest Celeb Updates" emoji="🔥">
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
                              <h4 className="font-bold text-[16px] leading-[1.375] text-[#101828] line-clamp-2 transition-colors" style={{ letterSpacing: '-0.02em' }}>
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
                    <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews || []} onNavigate={navigateToPage} />

                    {/* Editor's PICK (Figma: DramaNewsWidget) */}
                    {(editorsPickNews.length > 0 || (rankingNews && rankingNews.length > 0)) && (
                      <div>
                        <h3 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-[6px] pl-[26px]">Editor&apos;s <span className="text-ksp-accent">PICK</span></h3>
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
    // 뒤로가기 시 브라우저 캐시 사용 → 서버 요청 없이 즉시 렌더링
    context.res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    const host = context.req.headers.host;
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Use production API for data (local DB may not have all data)
    const prodUrl = baseUrl;

    const listFields = 'fields=_id,title,slug,coverImage,thumbnailUrl,category,source,sourceUrl,timeText,summary,createdAt,publishedAt,updatedAt,viewCount,featured,tags,author,youtubeUrl,articleUrl';

    // Fetch all data in parallel
    const [celebResponse, celebNewsResponse, commentsResponse, rankingResponse, allNewsResponse, trendingResponse, editorsPickResponse] = await Promise.all([
      fetch(`${prodUrl}/api/celeb?limit=50&active=true`),
      fetch(`${prodUrl}/api/news/celeb?limit=200`),
      fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=10&sort=viewCount&category=celeb&${listFields}`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=200&${listFields}`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news/trending?limit=5&category=celeb`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news/editors-pick?limit=6&category=celeb`).catch(() => ({ json: () => ({ success: false }) })),
    ]);

    const celebData = await celebResponse.json();
    const celebNewsData = await celebNewsResponse.json();
    const commentsData = await commentsResponse.json();
    const rankingData = await rankingResponse.json();
    const allNewsData = await allNewsResponse.json();
    const trendingData = await trendingResponse.json();
    const editorsPickData = await editorsPickResponse.json();

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

    // Trending news
    const trendingNews = trendingData.success
      ? (trendingData.data || []).slice(0, 5).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

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
        trendingNews,
        watchNews,
        recommendedNews: finalRecommended,
        editorsPickNews: editorsPickData.success ? (editorsPickData.data || []).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) })) : [],
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
        trendingNews: [],
        watchNews: [],
        recommendedNews: [],
        editorsPickNews: [],
      }
    };
  }
}
