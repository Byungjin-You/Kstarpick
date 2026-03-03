import React, { useState, useEffect, useRef, useCallback } from 'react';
import useScrollRestore from '../hooks/useScrollRestore';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../components/MainLayout';
import { Star, Play, Clock, ChevronLeft, ChevronRight, Eye, TrendingUp, Calendar, ChevronDown, ChevronUp, X } from 'lucide-react';
import axios from 'axios';
import MoreNews from '../components/MoreNews';

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

export default function TVFilmPage({ tvfilms = [], movieNews = [], newsPagination, recentComments, rankingNews, watchNews, recommendedNews }) {
  const router = useRouter();
  const [movies, setMovies] = useState(tvfilms);
  const [loading, setLoading] = useState(tvfilms.length === 0);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.ceil(tvfilms.length / 5) || 1);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [collapsedCards, setCollapsedCards] = useState({});
  const [showMoreMobile, setShowMoreMobile] = useState(false);
  const [allMovies, setAllMovies] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  // 페이지 전환 애니메이션을 위한 상태 추가
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right');
  const animationDuration = 300;

  // YouTube modal
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState('');

  // Sidebar sticky
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  const itemsPerPage = 5;

  // 스크롤 위치 복원
  useScrollRestore('tvfilmScrollPosition', 'isBackToTvfilm');

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
  const navigateToPage = (path, e) => {
    if (e) e.preventDefault();
    if (router.pathname === path || router.asPath === path) return false;
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('tvfilmScrollPosition', window.scrollY.toString());
      }
    } catch (err) {}
    router.push(path);
    return true;
  };

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

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 카드 접기/펼치기 상태 관리
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCollapsedState = localStorage.getItem('tvfilmCardsCollapsedState');
      if (savedCollapsedState) {
        try {
          setCollapsedCards(JSON.parse(savedCollapsedState));
        } catch (error) {
          console.error('Failed to parse collapsed state from localStorage:', error);
          initializeCollapsedCards();
        }
      } else {
        initializeCollapsedCards();
      }
    }
  }, []);

  const initializeCollapsedCards = () => {
    if (movies && movies.length > 0) {
      const initialState = {};
      movies.forEach((movie, index) => {
        initialState[movie._id] = index !== 0;
      });

      setCollapsedCards(initialState);

      if (typeof window !== 'undefined') {
        localStorage.setItem('tvfilmCardsCollapsedState', JSON.stringify(initialState));
      }
    }
  };

  const toggleCardCollapse = (movieId) => {
    const isCurrentlyCollapsed = collapsedCards[movieId];
    const newState = {};
    movies.forEach(movie => {
      newState[movie._id] = true;
    });
    if (isCurrentlyCollapsed) {
      newState[movieId] = false;
    }
    setCollapsedCards(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tvfilmCardsCollapsedState', JSON.stringify(newState));
    }
  };

  useEffect(() => {
    if (tvfilms.length > 0) {
      const enhancedTVFilms = tvfilms.map((film, index) => {
        let enhancedFilm = { ...film };
        if (!enhancedFilm.description && !enhancedFilm.summary) {
          const genres = enhancedFilm.genres || [];
          const genreText = genres.length > 0 ? genres.join(', ') : 'Korean';
          const fakeSynopses = [
            `A captivating ${genreText} production featuring compelling storytelling and outstanding performances.`,
            `An engaging ${genreText} work that showcases the best of Korean entertainment.`,
            `${enhancedFilm.title} delivers a unique blend of ${genreText} elements with masterful execution.`,
            `A must-watch ${genreText} title that has earned acclaim from both critics and audiences.`,
            `${enhancedFilm.title} offers an unforgettable ${genreText} experience with its distinctive charm.`
          ];
          enhancedFilm.summary = fakeSynopses[index % fakeSynopses.length];
        }
        return enhancedFilm;
      });

      setMovies(enhancedTVFilms);
      setAllMovies(enhancedTVFilms);
      setTotalPages(Math.ceil(enhancedTVFilms.length / itemsPerPage));
      setLoading(false);
      return;
    }

    const fetchTVFilms = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/dramas`, {
          params: {
            limit: 100,
            category: 'movie',
            includeAllFields: 'true'
          }
        });

        if (response.data && response.data.success) {
          const allTVFilms = response.data.data || [];
          const enhancedTVFilms = allTVFilms.map((film, index) => {
            let enhancedFilm = { ...film };
            if (!enhancedFilm.description && !enhancedFilm.summary) {
              const genres = enhancedFilm.genres || [];
              const genreText = genres.length > 0 ? genres.join(', ') : 'Korean';
              const fakeSynopses = [
                `A captivating ${genreText} production featuring compelling storytelling and outstanding performances.`,
                `An engaging ${genreText} work that showcases the best of Korean entertainment.`,
                `${enhancedFilm.title} delivers a unique blend of ${genreText} elements with masterful execution.`,
                `A must-watch ${genreText} title that has earned acclaim from both critics and audiences.`,
                `${enhancedFilm.title} offers an unforgettable ${genreText} experience with its distinctive charm.`
              ];
              enhancedFilm.summary = fakeSynopses[index % fakeSynopses.length];
            }
            return enhancedFilm;
          });

          setMovies(enhancedTVFilms);
          setTotalPages(Math.ceil(enhancedTVFilms.length / itemsPerPage));
        } else {
          setError('Failed to load TV/Film data');
        }
      } catch (err) {
        console.error('Error fetching TV/Film:', err);
        setError('An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchTVFilms();
  }, [tvfilms]);

  // 페이지 변경 처리
  const goToPage = (page) => {
    if (isPageChanging) return;
    setIsPageChanging(true);
    setSlideDirection(page > currentPage ? 'right' : 'left');
    setCurrentPage(page);
    setTimeout(() => {
      setIsPageChanging(false);
    }, animationDuration / 2);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('right');
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1 && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('left');
      goToPage(currentPage - 1);
    }
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 100) {
      if (currentPage < totalPages) goToNextPage();
    }
    if (touchEnd - touchStart > 100) {
      if (currentPage > 1) goToPrevPage();
    }
  };

  const currentItems = isMobile
    ? movies
    : movies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // movies가 변경될 때마다 접힘 상태 초기화 확인
  useEffect(() => {
    if (movies && movies.length > 0) {
      const newState = { ...collapsedCards };
      let needsUpdate = false;
      let hasOpenCard = false;

      movies.forEach((movie, index) => {
        if (typeof newState[movie._id] === 'undefined') {
          if (index === 0 && !hasOpenCard) {
            newState[movie._id] = false;
            hasOpenCard = true;
          } else {
            newState[movie._id] = true;
          }
          needsUpdate = true;
        } else if (newState[movie._id] === false) {
          hasOpenCard = true;
        }
      });

      if (!hasOpenCard && movies.length > 0) {
        newState[movies[0]._id] = false;
        needsUpdate = true;
      }

      if (needsUpdate) {
        setCollapsedCards(newState);
        if (typeof window !== 'undefined') {
          localStorage.setItem('tvfilmCardsCollapsedState', JSON.stringify(newState));
        }
      }
    }
  }, [movies]);

  const toggleMobileView = () => {
    setShowMoreMobile(!showMoreMobile);
  };

  useEffect(() => {
    if (isMobile) {
      if (showMoreMobile && allMovies.length > 0) {
        const displayCount = Math.min(10, allMovies.length);
        setMovies(allMovies.slice(0, displayCount));
        setCurrentPage(1);
        if (displayCount > itemsPerPage) {
          setTotalPages(Math.ceil(displayCount / itemsPerPage));
        }
      } else if (allMovies.length > 0) {
        setMovies(allMovies.slice(0, 5));
        setCurrentPage(1);
        setTotalPages(1);
      }
    }
  }, [showMoreMobile, isMobile, allMovies, itemsPerPage]);

  return (
    <MainLayout>
      {/* ============ MOBILE LAYOUT (< lg) ============ */}
      <div className="lg:hidden">
        <div className="container mx-auto px-4 py-12">
          {/* 제목 영역 */}
          <div className="mb-8 mt-8">
            <h1 className="font-bold text-black" style={{ fontSize: '20px' }}>
              Most searched <span style={{ color: '#233CFA' }}>movies</span> right now
            </h1>
          </div>

          {error && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          {/* TV/Film 리스트 */}
          <div className="relative">
            {currentPage > 1 && !isMobile && (
              <button
                onClick={goToPrevPage}
                disabled={isPageChanging}
                className="flex absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-3 md:-translate-x-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full items-center justify-center text-white hover:shadow-md transition-all duration-300 shadow-md"
                style={{ backgroundColor: '#233CFA' }}
                aria-label="Previous Page"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <div
              key={`tvfilm-page-${currentPage}`}
              className={`grid grid-cols-1 md:grid-cols-5 gap-5 transition-all duration-300
                ${isPageChanging ? 'opacity-70 ' + (slideDirection === 'right' ? 'translate-x-4' : '-translate-x-4') : 'opacity-100 translate-x-0'}`}
              onTouchStart={!isMobile ? handleTouchStart : undefined}
              onTouchMove={!isMobile ? handleTouchMove : undefined}
              onTouchEnd={!isMobile ? handleTouchEnd : undefined}
            >
              {loading || error ? (
                Array(5).fill().map((_, i) => (
                  <div key={i} className="group relative">
                    <div className="bg-white rounded-2xl overflow-hidden shadow-md h-full">
                      <div className="relative">
                        <div className="h-60 md:h-64 lg:h-80 bg-gray-200 animate-pulse"></div>
                        <div className="p-4">
                          <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mb-2"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                currentItems.map((item, index) => {
                  const isCollapsed = isMobile && collapsedCards[item._id];
                  return (
                    <div
                      key={item._id}
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
                            toggleCardCollapse(item._id);
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
                              {(currentPage - 1) * itemsPerPage + index + 1}
                            </div>
                            <div className="flex-grow min-w-0">
                              <Link href={`/tvfilm/${item.slug || item._id}`} className="block">
                                <h3 className="text-base font-semibold text-gray-800 hover:text-[#009efc] transition-colors line-clamp-1 truncate">
                                  {item.title}
                                </h3>
                                <div className="flex items-center mt-1.5 overflow-hidden">
                                  {(item.genres && Array.isArray(item.genres) && item.genres.length > 0) ? (
                                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full shadow-sm mr-2 whitespace-nowrap flex-shrink-0" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}>
                                      {typeof item.genres[0] === 'string' ? item.genres[0].charAt(0).toUpperCase() + item.genres[0].slice(1) : item.genres[0]}
                                    </span>
                                  ) : (typeof item.genre === 'string' && item.genre.trim() !== '') ? (
                                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full shadow-sm mr-2 whitespace-nowrap flex-shrink-0" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}>
                                      {item.genre.split(',')[0].trim().charAt(0).toUpperCase() + item.genre.split(',')[0].trim().slice(1)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-500 mr-2 whitespace-nowrap flex-shrink-0">Film</span>
                                  )}
                                  <div className="flex items-center flex-shrink-0 whitespace-nowrap">
                                    <Star size={12} className="text-amber-500 mr-1" fill="#f59e0b" />
                                    <span className="text-xs font-medium text-gray-700">
                                      {item.reviewRating != null && parseFloat(item.reviewRating) > 0
                                        ? parseFloat(item.reviewRating) === 10 ? "10" : parseFloat(item.reviewRating).toFixed(1)
                                        : "-"
                                      }
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Link href={`/tvfilm/${item.slug || item._id}`} className="block h-full">
                          <div
                            className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full transform hover:-translate-y-1"
                            style={isMobile ? { border: '2px solid #233CFA' } : {}}
                          >
                            <div className="relative">
                              <div className={`${isMobile ? 'aspect-[5/4.5]' : 'h-60 md:h-64 lg:h-80'} bg-gray-100 relative overflow-hidden`}>
                                <span className="absolute inset-0 flex items-center justify-center text-gray-400">
                                  <img
                                    src={item.coverImage || '/images/dramas/default-poster.jpg'}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    style={{ objectPosition: isMobile ? 'center 5%' : 'center center' }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/dramas/default-poster.jpg'; }}
                                  />
                                </span>
                                <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center">
                                  <span className="text-white font-bold text-5xl drop-shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{(currentPage - 1) * itemsPerPage + index + 1}</span>
                                </div>
                                {!isMobile && (
                                  <div className="absolute top-2 right-2 flex items-center bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-white font-bold text-xs mr-1 shadow-lg" style={{ backgroundColor: '#233CFA' }}>
                                      {item.reviewRating != null && parseFloat(item.reviewRating) > 0
                                        ? parseFloat(item.reviewRating) === 10 ? "10" : parseFloat(item.reviewRating).toFixed(1)
                                        : "-"
                                      }
                                    </div>
                                    <span className="text-white/90 text-xs">Rating</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                                  <div className="p-4 w-full">
                                    <p className="text-white font-medium">{item.title}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 pb-3">
                                <h3 className="text-base font-semibold text-gray-800 group-hover:text-[#009efc] transition-colors line-clamp-1 flex items-center justify-between">
                                  <span className="mr-2 truncate">{item.title}</span>
                                  {isMobile && (
                                    <div className="flex-shrink-0 flex items-center bg-gradient-to-r from-amber-50 to-amber-100 px-2 py-1 rounded-full border border-amber-200">
                                      <Star size={12} className="text-amber-500 mr-1 flex-shrink-0" fill="#f59e0b" />
                                      <span className="text-xs font-bold text-amber-700">
                                        {item.reviewRating != null && parseFloat(item.reviewRating) > 0
                                          ? parseFloat(item.reviewRating) === 10 ? "10" : parseFloat(item.reviewRating).toFixed(1)
                                          : "-"
                                        }
                                      </span>
                                    </div>
                                  )}
                                </h3>

                                <div className="flex mt-2">
                                  <div className="w-full overflow-hidden">
                                    <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                                      {(item.genres && Array.isArray(item.genres) && item.genres.length > 0)
                                        ? item.genres.map((genre, idx) => (
                                          <span key={idx} className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-1 shadow-sm transition-colors" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}>
                                            {genre && typeof genre === 'string' ? genre.charAt(0).toUpperCase() + genre.slice(1) : genre}
                                          </span>
                                        ))
                                        : (typeof item.genre === 'string' && item.genre.trim() !== '')
                                          ? item.genre.split(',').map((g, idx) => (
                                            <span key={idx} className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-1 shadow-sm transition-colors" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}>
                                              {g.trim().charAt(0).toUpperCase() + g.trim().slice(1)}
                                            </span>
                                          ))
                                          : (
                                            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-1 shadow-sm" style={{ backgroundColor: '#f3f4f6', color: '#1f2937' }}>
                                              {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : "Film"}
                                            </span>
                                          )
                                      }
                                    </div>
                                  </div>
                                </div>

                                {item.runtime && (
                                  <div className="flex mt-2 mb-2">
                                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-xs">
                                      <Clock size={12} className="mr-1 text-gray-500" />
                                      {item.runtime}
                                    </div>
                                  </div>
                                )}

                                <div className="mt-2 mb-1">
                                  {(item.description || item.summary) ? (
                                    <p className="text-xs text-gray-600 line-clamp-1 overflow-ellipsis">
                                      {item.description || item.summary}
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
                })
              )}
            </div>

            {currentPage < totalPages && !isMobile && (
              <button
                onClick={goToNextPage}
                disabled={isPageChanging}
                className="flex absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-3 md:translate-x-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full items-center justify-center text-white hover:shadow-md transition-all duration-300 shadow-md"
                style={{ backgroundColor: '#233CFA' }}
                aria-label="Next Page"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>

          {/* 모바일 View More Button */}
          {isMobile && (
            <div className="mt-6">
              <button
                onClick={toggleMobileView}
                className="w-full py-3 bg-white text-black font-medium rounded-2xl border-2 border-gray-300 hover:border-gray-400 hover:shadow-md transition-all"
              >
                {showMoreMobile ? (
                  <span className="flex items-center justify-center">
                    Fold
                    <ChevronUp className="ml-2" size={20} />
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    See more
                    <ChevronDown className="ml-2" size={20} />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* MoreNews */}
          <div className="mt-16">
            <MoreNews initialNews={movieNews} category="movie" />
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

                {/* TV/Film Top 5 */}
                <SectionWrapper title="TV/Film Top 5" emoji="🎬" seeMoreHref="/tvfilm" onNavigate={navigateToPage}>
                  <DramaTop5 dramas={allMovies.length > 0 ? allMovies : tvfilms} type="tvfilm" onNavigate={navigateToPage} />
                </SectionWrapper>

                {/* Top Rated TV/Film */}
                <SectionWrapper title="Top Rated" emoji="" seeMoreHref="/tvfilm" onNavigate={navigateToPage}>
                  <TopRatedDramaGrid dramas={allMovies.length > 0 ? allMovies : tvfilms} onNavigate={navigateToPage} />
                </SectionWrapper>

                {/* Latest TV/Film Updates */}
                <SectionWrapper title="Latest TV/Film Updates" emoji="🔥" seeMoreHref="/tvfilm" onNavigate={navigateToPage}>
                  <ArticleCardGrid articles={movieNews?.slice(0, 3) || []} onNavigate={navigateToPage} />
                  {movieNews?.length > 3 && (
                    <div className="mt-8">
                      <ArticleCardGrid articles={movieNews.slice(3, 6)} onNavigate={navigateToPage} />
                    </div>
                  )}
                </SectionWrapper>

                {/* Watch News */}
                {watchNews && watchNews.length > 0 && (
                  <SectionWrapper title="Watch News" emoji="👀" seeMoreHref="/news" onNavigate={navigateToPage}>
                    <WatchNewsSection articles={watchNews} onNavigate={navigateToPage} onPlayVideo={openYoutubeModal} />
                  </SectionWrapper>
                )}

                {/* Recommended News */}
                {recommendedNews && recommendedNews.length > 0 && (
                  <SectionWrapper title="Recommended News" emoji="💓" seeMoreHref="/news" onNavigate={navigateToPage}>
                    <ArticleCardGrid articles={recommendedNews.slice(0, 3)} onNavigate={navigateToPage} />
                  </SectionWrapper>
                )}

                {/* MoreNews - Infinite Scroll */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-8 px-6">
                  <MoreNews initialNews={movieNews} category="movie" />
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

                    {/* TV/Film Categories */}
                    <DramaCategories type="tvfilm" onCategoryClick={handleCategoryClick} activeCategory={activeCategory} />

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
    const host = context.req.headers.host;
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Use production API for movie/tvfilm data (local DB may not have movie category data)
    const prodUrl = process.env.NEXT_PUBLIC_API_URL || baseUrl;

    // Fetch all data in parallel
    // comments/recent may not exist on production, use local for that
    const [moviesResponse, movieNewsResponse, commentsResponse, rankingResponse, allNewsResponse] = await Promise.all([
      fetch(`${prodUrl}/api/dramas?category=movie&limit=100&includeAllFields=true&sortBy=orderNumber&sortOrder=asc`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      }),
      fetch(`${prodUrl}/api/news/movie?page=1&limit=12&sort=createdAt&order=desc`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      }),
      fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=10&sort=viewCount`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=200`).catch(() => ({ json: () => ({ success: false }) }))
    ]);

    const moviesData = await moviesResponse.json();
    const movieNewsData = await movieNewsResponse.json();
    const commentsData = await commentsResponse.json();
    const rankingData = await rankingResponse.json();
    const allNewsData = await allNewsResponse.json();

    const movieNewsArray = Array.isArray(movieNewsData.data) ? movieNewsData.data : [];

    // Fix relative image URLs to absolute production URLs (local dev doesn't have hash-image data)
    const fixImageUrl = (url) => {
      if (!url) return url;
      if (url.startsWith('/api/proxy/hash-image')) return `${prodUrl}${url}`;
      return url;
    };

    // Process news images
    const processedNews = movieNewsArray.map(news => {
      if (!news.coverImage) news.coverImage = '/images/news/default-news.jpg';
      else news.coverImage = fixImageUrl(news.coverImage);
      if (news.thumbnailUrl) news.thumbnailUrl = fixImageUrl(news.thumbnailUrl);
      return news;
    });

    // Process movie images
    const processedMovies = (moviesData.data || []).map(movie => {
      if (!movie.coverImage) movie.coverImage = '/images/dramas/default-poster.jpg';
      else movie.coverImage = fixImageUrl(movie.coverImage);
      return movie;
    });

    // Watch News: filter from all news (movie category only)
    const watchNews = allNewsData.success && allNewsData.data?.news
      ? allNewsData.data.news.filter(n => n.title && n.title.startsWith('Watch:') && n.category === 'movie').slice(0, 6).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // Recommended News: featured movie news
    const recommendedNews = allNewsData.success && allNewsData.data?.news
      ? allNewsData.data.news.filter(n => n.featured && n.category === 'movie').slice(0, 3).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // If not enough recommended, use ranking news as fallback
    const finalRecommended = recommendedNews.length >= 3
      ? recommendedNews
      : (rankingData.success ? (rankingData.data?.news || []).slice(0, 3).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) })) : []);

    return {
      props: {
        tvfilms: processedMovies || [],
        movieNews: processedNews || [],
        newsPagination: movieNewsData.pagination || {
          total: processedNews.length,
          page: 1,
          limit: 12,
          totalPages: Math.ceil(processedNews.length / 12),
          hasNextPage: processedNews.length > 12,
          hasPrevPage: false
        },
        recentComments: commentsData.success ? (commentsData.data || []).slice(0, 10) : [],
        rankingNews: rankingData.success ? (rankingData.data?.news || []).slice(0, 10).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) })) : [],
        watchNews: watchNews,
        recommendedNews: finalRecommended,
      }
    };
  } catch (error) {
    console.error('getServerSideProps error:', error);
    return {
      props: {
        tvfilms: [],
        movieNews: [],
        newsPagination: { total: 0, page: 1, limit: 12, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        recentComments: [],
        rankingNews: [],
        watchNews: [],
        recommendedNews: [],
      }
    };
  }
}
