import React, { useEffect, useState, useRef, useCallback } from 'react';
import useScrollRestore from '../hooks/useScrollRestore';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import { Star, ChevronRight, ChevronLeft, Play, Eye, Clock, ChevronUp, ChevronDown, Bookmark, Heart, Share2, Calendar, TrendingUp, Award, Tv, BarChart2, Disc, X } from 'lucide-react';
import Link from 'next/link';
import CardNews from '../components/CardNews';
import LoadingSpinner from '../components/LoadingSpinner';
import MainLayout from '../components/MainLayout';
import PaginationControls from '../components/PaginationControls';
import DramaFilter from '../components/DramaFilter';
import MoreNews from '../components/MoreNews';
import { generateWebsiteJsonLd } from '../utils/seoHelpers';

// PC layout components
import ArticleCardGrid from '../components/home/ArticleCardGrid';
import WatchNewsSection from '../components/home/WatchNewsSection';
import CommentTicker from '../components/home/CommentTicker';
import TrendingNow from '../components/home/TrendingNow';
import DramaTop5 from '../components/drama/DramaTop5';
import TopRatedDramaGrid from '../components/drama/TopRatedDramaGrid';
import DramaCategories from '../components/drama/DramaCategories';

// Section wrapper for consistent styling (matches home page)
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

// Editor's PICK widget for sidebar (same as home Sidebar)
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

export default function Drama({ dramas, dramaNews, newsPagination, recentComments, rankingNews, watchNews, recommendedNews }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [dramasPerPage, setDramasPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('views');
  const [isMobile, setIsMobile] = useState(false);
  const [displayedDramas, setDisplayedDramas] = useState([]);
  const [pageStartIndex, setPageStartIndex] = useState(0);
  const [showMoreMobile, setShowMoreMobile] = useState(false);
  const [allDramas, setAllDramas] = useState([]);
  const [collapsedCards, setCollapsedCards] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);

  // YouTube modal
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState('');

  // 리사이즈 타이머 참조
  const resizeTimerRef = useRef(null);
  const isScrollingRef = useRef(false);

  // 페이지 전환 애니메이션을 위한 상태 추가
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right');
  const animationDuration = 300;

  // 스와이프 관련 상태
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const minSwipeDistance = 50;

  // Sidebar sticky (same as home page)
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  useEffect(() => {
    const el = sidebarStickyRef.current;
    if (!el) return;
    const HEADER_H = 92;
    const calcTop = () => {
      const sH = el.offsetHeight;
      const vH = window.innerHeight;
      if (sH <= vH - HEADER_H) {
        setSidebarStickyTop(HEADER_H);
      } else {
        setSidebarStickyTop(vH - sH - 40);
      }
    };
    const timer = setTimeout(calcTop, 300);
    const observer = new ResizeObserver(calcTop);
    observer.observe(el);
    window.addEventListener('resize', calcTop);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', calcTop);
    };
  }, []);

  // Navigate helper
  const navigateToPage = (path, e) => {
    if (e) e.preventDefault();
    if (router.pathname === path || router.asPath === path) return false;
    try {
      router.push(path, undefined, { shallow: false });
    } catch (error) {
      if (path !== router.pathname && path !== router.asPath) {
        window.location.href = path;
      }
    }
    return false;
  };

  // YouTube modal
  const openYoutubeModal = (url, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!url) return;
    let embedUrl = url;
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    if (match && match[1]) {
      embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
    } else {
      return;
    }
    setCurrentYoutubeUrl(embedUrl);
    setShowYoutubeModal(true);
  };

  const closeYoutubeModal = () => {
    setShowYoutubeModal(false);
    setCurrentYoutubeUrl('');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!document.body) return;
    if (showYoutubeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      if (document.body) document.body.style.overflow = 'auto';
    };
  }, [showYoutubeModal]);

  // 스와이프 이벤트 핸들러
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (swiping) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setSwiping(false);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && currentPage < totalPages) {
      goToNextPage();
    } else if (isRightSwipe && currentPage > 1) {
      goToPrevPage();
    }
    setTouchEnd(0);
    setTouchStart(0);
  };

  // 모바일 상태에 따라 드라마 목록 업데이트
  const updateDisplayedDramasForMobile = useCallback((mobile, showMore, dramas) => {
    if (!dramas || dramas.length === 0) return;
    if (mobile) {
      setDisplayedDramas(showMore ? [...dramas] : dramas.slice(0, 5));
    } else {
      const startIndex = (currentPage - 1) * dramasPerPage;
      setDisplayedDramas(dramas.slice(startIndex, startIndex + dramasPerPage));
    }
  }, [currentPage, dramasPerPage]);

  // 스크롤 복원
  useScrollRestore('dramaScrollPosition', 'isBackToDrama');

  // 페이지 로드 시 초기화
  useEffect(() => {
    if (dramas && dramas.length > 0) {
      setIsLoading(false);
      const sorted = [...dramas].sort((a, b) => {
        if (sortBy === 'year' && a.year && b.year) return b.year - a.year;
        else if (sortBy === 'title') return a.title.localeCompare(b.title);
        else if (sortBy === 'rating' && a.rating && b.rating) return b.rating - a.rating;
        else if (sortBy === 'episodes' && a.episodes && b.episodes) return b.episodes - a.episodes;
        else return (b.viewCount || 0) - (a.viewCount || 0);
      });
      setAllDramas(sorted);
      setTotalPages(Math.ceil(sorted.length / dramasPerPage));
      const isMobileView = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
      setIsMobile(isMobileView);
      updateDisplayedDramasForMobile(isMobileView, false, sorted);
      initializeCollapsedCards(sorted);

      const handleScrollThrottled = throttle(handleScroll, 200);
      window.addEventListener('scroll', handleScrollThrottled);
      const handleResizeDebounced = debounce(handleResize, 300);
      window.addEventListener('resize', handleResizeDebounced);
      return () => {
        window.removeEventListener('scroll', handleScrollThrottled);
        window.removeEventListener('resize', handleResizeDebounced);
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      };
    }
  }, [dramas, dramasPerPage, updateDisplayedDramasForMobile]);

  function debounce(func, delay) {
    return function() {
      const context = this;
      const args = arguments;
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        func.apply(context, args);
      }, delay);
    };
  }

  function throttle(func, limit) {
    return function() {
      const context = this;
      const args = arguments;
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        func.apply(context, args);
        setTimeout(() => { isScrollingRef.current = false; }, limit);
      }
    };
  }

  useEffect(() => {
    if (allDramas.length > 0) {
      updateDisplayedDramasForMobile(isMobile, showMoreMobile, allDramas);
    }
  }, [showMoreMobile, isMobile, allDramas, updateDisplayedDramasForMobile]);

  useEffect(() => {
    if (isMobile && displayedDramas && displayedDramas.length > 0) {
      const currentState = { ...collapsedCards };
      let hasOpenCard = false;
      let needsUpdate = false;
      displayedDramas.forEach((drama, index) => {
        if (drama && drama._id) {
          if (typeof currentState[drama._id] === 'undefined') {
            currentState[drama._id] = index !== 0;
            needsUpdate = true;
          } else if (currentState[drama._id] === false) {
            hasOpenCard = true;
          }
        }
      });
      if (isMobile && !hasOpenCard && displayedDramas.length > 0) {
        currentState[displayedDramas[0]._id] = false;
        needsUpdate = true;
      }
      if (needsUpdate) {
        setCollapsedCards(currentState);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dramaCardsCollapsedState', JSON.stringify(currentState));
        }
      }
    }
  }, [isMobile, displayedDramas]);

  const handleSortChange = (sortType) => {
    if (sortType === sortBy) return;
    setSortBy(sortType);
    const sorted = [...allDramas].sort((a, b) => {
      if (sortType === 'year' && a.year && b.year) return b.year - a.year;
      else if (sortType === 'title') return a.title.localeCompare(b.title);
      else if (sortType === 'rating' && a.rating && b.rating) return b.rating - a.rating;
      else if (sortType === 'episodes' && a.episodes && b.episodes) return b.episodes - a.episodes;
      else return (b.viewCount || 0) - (a.viewCount || 0);
    });
    setAllDramas(sorted);
    setCurrentPage(1);
    updateDisplayedDramasForMobile(isMobile, showMoreMobile, sorted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dramaSortBy', sortType);
    }
  };

  const initializeCollapsedCards = (dramas = allDramas) => {
    if (!dramas || dramas.length === 0) return;
    try {
      const savedState = typeof window !== 'undefined' ? localStorage.getItem('dramaCardsCollapsedState') : null;
      if (isMobile) {
        const initialState = {};
        dramas.forEach((drama, index) => {
          if (drama && drama._id) initialState[drama._id] = index !== 0;
        });
        setCollapsedCards(initialState);
        if (typeof window !== 'undefined') localStorage.setItem('dramaCardsCollapsedState', JSON.stringify(initialState));
      } else if (savedState) {
        setCollapsedCards(JSON.parse(savedState));
      } else {
        const initialState = {};
        dramas.forEach((drama, index) => {
          if (drama && drama._id) initialState[drama._id] = index !== 0;
        });
        setCollapsedCards(initialState);
        if (typeof window !== 'undefined') localStorage.setItem('dramaCardsCollapsedState', JSON.stringify(initialState));
      }
    } catch (error) {
      console.error('초기 접힘 상태 설정 오류:', error);
    }
  };

  const toggleCardCollapse = (dramaId) => {
    try {
      const newState = { ...collapsedCards };
      if (isMobile) {
        const isCurrentlyCollapsed = newState[dramaId];
        Object.keys(newState).forEach(id => { newState[id] = true; });
        if (isCurrentlyCollapsed) newState[dramaId] = false;
      } else {
        newState[dramaId] = !newState[dramaId];
      }
      setCollapsedCards(newState);
      if (typeof window !== 'undefined') localStorage.setItem('dramaCardsCollapsedState', JSON.stringify(newState));
    } catch (error) {
      console.error('카드 토글 오류:', error);
    }
  };

  const handlePageChange = (page) => {
    if (isPageChanging) return;
    setIsPageChanging(true);
    setSlideDirection(page > currentPage ? 'right' : 'left');
    setCurrentPage(page);
    const startIndex = (page - 1) * dramasPerPage;
    setPageStartIndex(startIndex);
    const sorted = [...allDramas].sort((a, b) => {
      if (sortBy === 'year' && a.year && b.year) return b.year - a.year;
      else if (sortBy === 'title') return a.title.localeCompare(b.title);
      else if (sortBy === 'rating' && a.rating && b.rating) return b.rating - a.rating;
      else if (sortBy === 'episodes' && a.episodes && b.episodes) return b.episodes - a.episodes;
      else return (b.viewCount || 0) - (a.viewCount || 0);
    });
    setTimeout(() => {
      if (!isMobile) setDisplayedDramas(sorted.slice(startIndex, startIndex + dramasPerPage));
      if (isMobile) {
        const newPageDramas = sorted.slice(startIndex, startIndex + dramasPerPage);
        const newState = {};
        newPageDramas.forEach((drama, index) => {
          if (drama && drama._id) newState[drama._id] = index !== 0;
        });
        setCollapsedCards(prevState => ({ ...prevState, ...newState }));
        if (typeof window !== 'undefined') localStorage.setItem('dramaCardsCollapsedState', JSON.stringify({ ...collapsedCards, ...newState }));
      }
      setTimeout(() => { setIsPageChanging(false); }, 50);
    }, animationDuration - 50);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('right');
      handlePageChange(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1 && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('left');
      handlePageChange(currentPage - 1);
    }
  };

  const handleScroll = () => {
    if (typeof window !== 'undefined') {
      setShowScrollTop(window.scrollY > 500);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMobileView = () => {
    const newShowMore = !showMoreMobile;
    setShowMoreMobile(newShowMore);
    if (isMobile && allDramas.length > 0) {
      if (newShowMore) {
        setDisplayedDramas([...allDramas]);
      } else {
        setDisplayedDramas(allDramas.slice(0, 5));
      }
    }
  };

  function handleResize() {
    if (typeof window !== 'undefined') {
      const mobile = window.innerWidth < 1024;
      if (mobile !== isMobile) {
        setIsMobile(mobile);
        updateDisplayedDramasForMobile(mobile, showMoreMobile, allDramas);
      }
    }
  }

  // Category filter handler
  const handleCategoryClick = (categoryId) => {
    setActiveCategory(prev => prev === categoryId ? null : categoryId);
  };

  return (
    <MainLayout>
      <Seo
        title="Korean Dramas | K-Drama Rankings & Reviews"
        description="Explore popular Korean dramas including Queen of Tears, Crash Landing on You, Squid Game, and latest K-Dramas. Find ratings, cast info, and plot summaries."
        url="/drama"
        type="website"
        keywords="Korean drama,K-Drama,Crash Landing on You,Squid Game,Queen of Tears,Korean series,drama reviews,K-Drama ratings,Korean entertainment"
        jsonLd={generateWebsiteJsonLd()}
      />

      {/* ============ MOBILE LAYOUT (< lg) ============ */}
      <div className="lg:hidden">
        <div className="container mx-auto px-4 pt-0 pb-12">
          {/* 제목 영역 */}
          <div className="mb-8 mt-8">
            <h1 className="font-bold text-black" style={{ fontSize: '20px' }}>
              Most searched <span style={{ color: '#233CFA' }}>dramas</span> right now
            </h1>
          </div>

          {/* 드라마 리스트 */}
          <div className="relative">
            {currentPage > 1 && (
              <button
                onClick={goToPrevPage}
                className="hidden lg:flex absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-6 z-10 w-12 h-12 rounded-full items-center justify-center text-white hover:shadow-md transition-all duration-300 shadow-md"
                style={{ backgroundColor: '#233CFA' }}
                aria-label="Previous Page"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <div
              key={`drama-page-${currentPage}`}
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 transition-all duration-300
                ${isPageChanging ? 'opacity-70 ' + (slideDirection === 'right' ? 'translate-x-4' : '-translate-x-4') : 'opacity-100 translate-x-0'}`}
            >
              {displayedDramas.map((drama, index) => {
                const isCollapsed = isMobile && collapsedCards[drama._id];
                return (
                  <div
                    key={drama._id}
                    className={`group relative transition-all duration-300
                      ${isPageChanging ? 'opacity-60 scale-98' : 'opacity-100 scale-100'}`}
                    style={{
                      transitionDelay: !isPageChanging ? `${index * 40}ms` : '0ms',
                      transform: isPageChanging ? (slideDirection === 'right' ? 'translateX(10px)' : 'translateX(-10px)') : 'translateX(0)'
                    }}
                  >
                    {isMobile && (
                      <div
                        className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md cursor-pointer hover:bg-white transition-all"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleCardCollapse(drama._id);
                        }}
                      >
                        {isCollapsed ? (
                          <ChevronDown size={18} className="text-gray-700" />
                        ) : (
                          <ChevronUp size={18} className="text-gray-700" />
                        )}
                      </div>
                    )}

                    {isCollapsed ? (
                      <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full">
                        <div className="flex items-center p-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg mr-3 flex-shrink-0" style={{ backgroundColor: '#233CFA' }}>
                            {(currentPage - 1) * dramasPerPage + index + 1}
                          </div>
                          <div className="flex-grow min-w-0">
                            <Link href={`/drama/${drama.slug || drama._id}`} className="block">
                              <h3 className="text-base font-semibold text-gray-800 hover:text-[#009efc] transition-colors line-clamp-1 truncate">
                                {drama.title}
                              </h3>
                              <div className="flex items-center mt-1.5 overflow-hidden">
                                {(drama.genres && Array.isArray(drama.genres) && drama.genres.length > 0) ? (
                                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full shadow-sm mr-2 whitespace-nowrap flex-shrink-0" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}>
                                    {typeof drama.genres[0] === 'string' ? drama.genres[0].charAt(0).toUpperCase() + drama.genres[0].slice(1) : drama.genres[0]}
                                  </span>
                                ) : (typeof drama.genre === 'string' && drama.genre.trim() !== '') ? (
                                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full shadow-sm mr-2 whitespace-nowrap flex-shrink-0" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}>
                                    {drama.genre.split(',')[0].trim().charAt(0).toUpperCase() + drama.genre.split(',')[0].trim().slice(1)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500 mr-2 whitespace-nowrap flex-shrink-0">No genre</span>
                                )}
                                <div className="flex items-center flex-shrink-0 whitespace-nowrap">
                                  <Star size={12} className="text-amber-500 mr-1" fill="#f59e0b" />
                                  <span className="text-xs font-medium text-gray-700">
                                    {(drama.reviewRating && drama.reviewRating > 0)
                                      ? parseFloat(drama.reviewRating) === 10 ? "10" : parseFloat(drama.reviewRating).toFixed(1)
                                      : "-"}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link href={`/drama/${drama.slug || drama._id}`} className="block h-full">
                        <div
                          className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full transform hover:-translate-y-1"
                          style={isMobile ? { border: '2px solid #233CFA' } : {}}
                        >
                          <div className="relative">
                            <div className={`${isMobile ? 'aspect-[5/4.5]' : 'h-60 md:h-64 lg:h-80'} bg-gray-100 relative overflow-hidden`}>
                              <span className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <img
                                  key={`drama-img-${drama._id}`}
                                  src={drama.coverImage && drama.coverImage.trim() !== '' ? drama.coverImage : '/images/dramas/default-poster.jpg'}
                                  alt={drama.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  style={{ objectPosition: isMobile ? 'center 5%' : 'center center' }}
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/images/dramas/default-poster.jpg'; }}
                                />
                              </span>
                              <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center">
                                <span className="text-white font-bold text-5xl drop-shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{(currentPage - 1) * dramasPerPage + index + 1}</span>
                              </div>
                              {!isMobile && (
                                <div className="absolute top-2 right-2 flex items-center bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                                  <div className="h-6 w-6 rounded-full flex items-center justify-center text-white font-bold text-xs mr-1 shadow-lg" style={{ backgroundColor: '#233CFA' }}>
                                    {(drama.reviewRating && drama.reviewRating > 0) ? parseFloat(drama.reviewRating) === 10 ? "10" : parseFloat(drama.reviewRating).toFixed(1) : "-"}
                                  </div>
                                  <span className="text-white/90 text-xs">Rating</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                                <div className="p-4 w-full">
                                  <p className="text-white font-medium line-clamp-1">{drama.title}</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 pb-3">
                              <h3 className="text-base font-semibold text-gray-800 group-hover:text-[#009efc] transition-colors line-clamp-1 flex items-center justify-between">
                                <span className="mr-2">{drama.title}</span>
                                {isMobile && (
                                  <div className="flex-shrink-0 flex items-center bg-gradient-to-r from-amber-50 to-amber-100 px-2 py-1 rounded-full border border-amber-200">
                                    <Star size={12} className="text-amber-500 mr-1 flex-shrink-0" fill="#f59e0b" />
                                    <span className="text-xs font-bold text-amber-700">
                                      {(drama.reviewRating && drama.reviewRating > 0) ? parseFloat(drama.reviewRating) === 10 ? "10" : parseFloat(drama.reviewRating).toFixed(1) : "-"}
                                    </span>
                                  </div>
                                )}
                              </h3>

                              <div className="flex mt-2">
                                <div className="w-full overflow-hidden">
                                  <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                                    {(drama.genres && Array.isArray(drama.genres) && drama.genres.length > 0)
                                      ? drama.genres.map((genre, idx) => (
                                        <span key={idx} className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-1 shadow-sm transition-colors" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}
                                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#009efc'; e.currentTarget.style.color = 'white'; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.color = '#1f2937'; }}
                                        >
                                          {genre && typeof genre === 'string' ? genre.charAt(0).toUpperCase() + genre.slice(1) : genre}
                                        </span>
                                      ))
                                      : (typeof drama.genre === 'string' && drama.genre.trim() !== '')
                                        ? drama.genre.split(',').map((g, idx) => (
                                          <span key={idx} className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-1 shadow-sm transition-colors" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#009efc'; e.currentTarget.style.color = 'white'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.color = '#1f2937'; }}
                                          >
                                            {g.trim().charAt(0).toUpperCase() + g.trim().slice(1)}
                                          </span>
                                        ))
                                        : null
                                    }
                                  </div>
                                </div>
                              </div>

                              {drama.watchProviders && drama.watchProviders.length > 0 && (
                                <div className="flex mt-2 mb-2">
                                  <div className="w-full overflow-hidden">
                                    <div className="flex flex-nowrap overflow-x-hidden">
                                      {drama.watchProviders.slice(0, 3).map((provider, idx) => (
                                        <span key={idx} className="inline-flex items-center text-xs font-medium text-blue-700 px-2.5 py-0.5 bg-blue-50 rounded-full mr-1.5 whitespace-nowrap shadow-sm hover:bg-blue-100 transition-colors">
                                          {provider.name}
                                        </span>
                                      ))}
                                      {drama.watchProviders.length > 3 && (
                                        <span className="text-xs font-medium text-blue-600 whitespace-nowrap">+{drama.watchProviders.length - 3}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="mt-2 mb-1">
                                {(drama.description || drama.summary) ? (
                                  <p className="text-xs text-gray-600 line-clamp-1 overflow-ellipsis">
                                    {drama.description || drama.summary}
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-400 line-clamp-1 overflow-ellipsis italic">
                                    No synopsis available
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {isMobile && (
              <div className="mt-6">
                <button
                  onClick={toggleMobileView}
                  className="w-full py-3 bg-white text-black font-medium rounded-2xl border-2 border-gray-300 hover:border-gray-400 hover:shadow-md transition-all"
                >
                  {showMoreMobile ? (
                    <span className="flex items-center justify-center">Fold <ChevronUp className="ml-2" size={20} /></span>
                  ) : (
                    <span className="flex items-center justify-center">See more <ChevronDown className="ml-2" size={20} /></span>
                  )}
                </button>
              </div>
            )}

            {currentPage < totalPages && (
              <button
                onClick={goToNextPage}
                className="hidden lg:flex absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-6 z-10 w-12 h-12 rounded-full items-center justify-center text-white hover:shadow-md transition-all duration-300 shadow-md"
                style={{ backgroundColor: '#233CFA' }}
                aria-label="Next Page"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>

          {/* 드라마 관련 뉴스 섹션 */}
          <div className="mt-16">
            <MoreNews initialNews={dramaNews} category="drama" />
            <div className="mb-12"></div>
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

                {/* Drama Top 5 */}
                <SectionWrapper title="Drama Top 5" emoji="🎬" seeMoreHref="/drama" onNavigate={navigateToPage}>
                  <DramaTop5 dramas={allDramas.length > 0 ? allDramas : dramas} onNavigate={navigateToPage} />
                </SectionWrapper>

                {/* Top Rated Drama */}
                <SectionWrapper title="Top Rated" emoji="" seeMoreHref="/drama" onNavigate={navigateToPage}>
                  <TopRatedDramaGrid dramas={allDramas.length > 0 ? allDramas : dramas} onNavigate={navigateToPage} />
                </SectionWrapper>

                {/* Latest K-Drama Updates */}
                <SectionWrapper title="Latest K-Drama Updates" emoji="🔥" seeMoreHref="/drama" onNavigate={navigateToPage}>
                  <ArticleCardGrid articles={dramaNews?.slice(0, 3) || []} onNavigate={navigateToPage} />
                  {dramaNews?.length > 3 && (
                    <div className="mt-8">
                      <ArticleCardGrid articles={dramaNews.slice(3, 6)} onNavigate={navigateToPage} />
                    </div>
                  )}
                </SectionWrapper>

                {/* Watch News */}
                {watchNews && watchNews.length > 0 && (
                  <>
                    <SectionWrapper title="Watch News" emoji="👀" seeMoreHref="/news" onNavigate={navigateToPage}>
                      <WatchNewsSection articles={watchNews} onNavigate={navigateToPage} onPlayVideo={openYoutubeModal} />
                    </SectionWrapper>
                  </>
                )}

                {/* Recommended News */}
                {recommendedNews && recommendedNews.length > 0 && (
                  <SectionWrapper title="Recommended News" emoji="💓" seeMoreHref="/news" onNavigate={navigateToPage}>
                    <ArticleCardGrid articles={recommendedNews.slice(0, 3)} onNavigate={navigateToPage} />
                  </SectionWrapper>
                )}

                {/* MoreNews - Infinite Scroll */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-8 px-6">
                  <MoreNews initialNews={dramaNews} category="drama" />
                </div>
              </div>

              {/* Right: Sidebar (500px) */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarStickyRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    {/* Comment Ticker */}
                    <CommentTicker comments={recentComments || []} onNavigate={navigateToPage} />

                    {/* Trending NOW */}
                    <TrendingNow items={rankingNews || []} onNavigate={navigateToPage} />

                    {/* Drama Categories */}
                    <DramaCategories onCategoryClick={handleCategoryClick} activeCategory={activeCategory} />

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
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${context.req.headers.host}`;
    const prodUrl = process.env.NEXT_PUBLIC_API_URL || baseUrl;

    // Fetch all data in parallel
    const [dramaResponse, dramaNewsResponse, commentsResponse, rankingResponse, allNewsResponse] = await Promise.all([
      fetch(`${prodUrl}/api/dramas?category=drama&limit=50&sortBy=orderNumber&sortOrder=asc`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      }),
      fetch(`${prodUrl}/api/news/drama?page=1&limit=12&sort=createdAt&order=desc`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      }),
      fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=10&sort=viewCount`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=200`).catch(() => ({ json: () => ({ success: false }) }))
    ]);

    const dramaData = await dramaResponse.json();
    const dramaNewsData = await dramaNewsResponse.json();
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

    const dramaNews = Array.isArray(dramaNewsData.data) ? dramaNewsData.data : (dramaNewsData.data?.news || []);

    // Process dramas
    const processedDramas = (dramaData.data || []).map(drama => {
      if (!drama.coverImage) drama.coverImage = '/images/dramas/default-poster.jpg';
      else drama.coverImage = fixImageUrl(drama.coverImage);
      return drama;
    });

    // Process news images
    const processedNews = dramaNews.map(news => {
      if (!news.coverImage) news.coverImage = '/images/news/default-news.jpg';
      else news.coverImage = fixImageUrl(news.coverImage);
      if (news.thumbnailUrl) news.thumbnailUrl = fixImageUrl(news.thumbnailUrl);
      return news;
    });

    // Watch News: filter from all news (drama category only)
    const watchNews = allNewsData.success && allNewsData.data?.news
      ? allNewsData.data.news.filter(n => n.title && n.title.startsWith('Watch:') && n.category === 'drama').slice(0, 6).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // Recommended News: featured drama news
    const recommendedNews = allNewsData.success && allNewsData.data?.news
      ? allNewsData.data.news.filter(n => n.featured && n.category === 'drama').slice(0, 3).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // Ranking news
    const rankingNews = rankingData.success
      ? (rankingData.data?.news || []).slice(0, 10).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // If not enough recommended, use ranking news as fallback
    const finalRecommended = recommendedNews.length >= 3
      ? recommendedNews
      : rankingNews.slice(0, 3);

    return {
      props: {
        dramas: processedDramas || [],
        dramaNews: processedNews || [],
        newsPagination: dramaNewsData.data?.pagination || {
          total: processedNews.length, page: 1, limit: 12,
          totalPages: Math.ceil(processedNews.length / 12),
          hasNextPage: processedNews.length > 12, hasPrevPage: false
        },
        recentComments: commentsData.success ? (commentsData.data || []).slice(0, 10) : [],
        rankingNews,
        watchNews: watchNews,
        recommendedNews: finalRecommended,
      }
    };
  } catch (error) {
    console.error('Server Side Props에서 오류 발생:', error);
    return {
      props: {
        dramas: [],
        dramaNews: [],
        newsPagination: { total: 0, page: 1, limit: 12, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        recentComments: [],
        rankingNews: [],
        watchNews: [],
        recommendedNews: [],
      }
    };
  }
}
