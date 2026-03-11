import React, { useState, useEffect, useRef, useCallback } from 'react';
// 스크롤 복원은 _app.js handleRouteChangeComplete에서 중앙 처리
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
const SectionWrapper = ({ title, emoji, children }) => (
  <div className="bg-white border-0 lg:border-[1.5px] border-ksp-border rounded-none lg:rounded-xl py-5 lg:py-8 px-4 lg:px-6 mb-0 lg:mb-8">
    <div className="flex items-center justify-between mb-5 lg:mb-7">
      <div className="flex items-center gap-2">
        <h2 className="text-[21px] lg:text-[26px] font-black">
          <span style={{ color: '#2B7FFF' }}>{title.split(' ')[0]}</span>{' '}
          <span style={{ color: '#101828' }}>{title.split(' ').slice(1).join(' ')}</span>
        </h2>
        {emoji && <span className="text-xl lg:text-2xl">{emoji}</span>}
      </div>
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

export default function TVFilmPage({ tvfilms = [], movieNews = [], newsPagination, recentComments, rankingNews, trendingNews = [], watchNews, recommendedNews, recentReviews = [], editorsPickNews = [] }) {
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
  const [allMovies, setAllMovies] = useState(tvfilms);
  const [activeCategory, setActiveCategory] = useState(null);

  // Review rolling
  const [reviewIndex, setReviewIndex] = useState(0);

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

  // Review rolling timer
  useEffect(() => {
    if (recentReviews.length <= 1) return;
    const timer = setInterval(() => {
      setReviewIndex(prev => (prev + 1) % recentReviews.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [recentReviews.length]);

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
      <div className="lg:hidden overflow-x-hidden">
        {/* === Section 1: TV/Film TOP 5 === */}
        <div className="px-4 pt-5 pb-0">
          <h2 className="font-bold text-[20px] leading-[1.4] text-[#101828]" style={{ fontFamily: 'Inter' }}>
            TV/Film <span className="text-ksp-accent">TOP 5</span>
          </h2>
        </div>

        {/* Hero Card (#1) */}
        {allMovies.length > 0 && (() => {
          const hero = allMovies[0];
          const heroGenres = hero.genres && Array.isArray(hero.genres) ? hero.genres : (hero.genre ? hero.genre.split(',').map(g => g.trim()) : []);
          return (
            <div className="mt-4 px-4">
              <div
                className="relative rounded-[20px] overflow-hidden cursor-pointer"
                style={{ height: '251px', background: '#18181B' }}
                onClick={() => navigateToPage(`/tvfilm/${hero.slug || hero._id}`)}
              >
                {/* Background image */}
                <img
                  src={hero.coverImage || '/images/dramas/default-poster.jpg'}
                  alt={hero.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.8 }}
                  onError={(e) => { e.target.src = '/images/dramas/default-poster.jpg'; }}
                />
                {/* Gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0" style={{ height: '100px', background: 'linear-gradient(180deg, rgba(29,29,29,0) 0%, rgba(29,29,29,1) 100%)' }} />
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end gap-3">
                  <span className="text-white font-black italic" style={{ fontFamily: 'Inter', fontSize: '48px', lineHeight: '48px', letterSpacing: '0.352px', textShadow: '0 3px 6px rgba(0,0,0,0.12)' }}>1</span>
                  <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
                    <span className="text-white font-bold line-clamp-2" style={{ fontFamily: 'Inter', fontSize: '18px', lineHeight: '24.75px', letterSpacing: '-0.439px', textTransform: 'capitalize' }}>
                      {hero.title}
                    </span>
                    <div className="flex flex-col gap-[6px]">
                      <span className="text-white line-clamp-1" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '17px' }}>
                        {hero.description ? hero.description.substring(0, 50) : 'A captivating production featuring compelling storytelling'}
                      </span>
                      <div className="flex items-center gap-[10px]">
                        {heroGenres.slice(0, 3).map((g, i) => (
                          <span key={i} className="px-2 py-1 rounded-[10px] text-white text-[10px] font-medium" style={{ fontFamily: 'Inter', background: 'rgba(255,255,255,0.12)' }}>
                            {typeof g === 'string' ? g.charAt(0).toUpperCase() + g.slice(1) : g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Pick badge */}
                <div className="absolute top-0 right-0 px-3 py-[5px] rounded-bl-[10px]" style={{ background: 'linear-gradient(90deg, rgba(6,74,236,1) 0%, rgba(77,139,244,1) 91%, rgba(175,230,255,1) 100%)' }}>
                  <span className="text-white font-bold text-[14px]" style={{ fontFamily: 'Inter' }}>Pick</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Cards #2 ~ #5 horizontal scroll */}
        {allMovies.length > 1 && (
          <div className="mt-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 ml-4">
              {allMovies.slice(1, 5).map((film, idx) => {
                const rank = idx + 2;
                const genres = film.genres && Array.isArray(film.genres) ? film.genres : (film.genre ? film.genre.split(',').map(g => g.trim()) : []);
                return (
                  <div
                    key={film._id}
                    className="flex-shrink-0 rounded-[14px] overflow-hidden cursor-pointer relative"
                    style={{ width: '140px', height: '177px' }}
                    onClick={() => navigateToPage(`/tvfilm/${film.slug || film._id}`)}
                  >
                    {/* Full card background image */}
                    <img
                      src={film.coverImage || '/images/dramas/default-poster.jpg'}
                      alt={film.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/images/dramas/default-poster.jpg'; }}
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0" style={{ background: rank > 2 ? 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)' : 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.7) 100%)' }} />
                    {/* Rank number */}
                    <span className="absolute text-white font-black italic" style={{ fontFamily: 'Inter', fontSize: '30px', lineHeight: '30px', top: '8px', left: '11px', letterSpacing: '0.396px', fontStyle: 'italic', textShadow: '0.95px 1.9px 1.9px rgba(0,0,0,0.25)' }}>{rank}</span>
                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-2 pb-2.5">
                      <span className="text-center line-clamp-1 w-full" style={{ color: '#FFF', fontFamily: 'Inter', fontSize: '14px', fontWeight: 700, lineHeight: '20px', letterSpacing: '-0.15px', textTransform: 'capitalize' }}>
                        {film.title}
                      </span>
                      <div className="flex items-center justify-center gap-[2px] mt-0.5">
                        <span className="text-[#FDC700] font-bold text-[10px]" style={{ fontFamily: 'Arial' }}>
                          ★{(film.reviewRating && film.reviewRating > 0) ? parseFloat(film.reviewRating) === 10 ? '10' : parseFloat(film.reviewRating).toFixed(1) : '-'}
                        </span>
                        {genres.slice(0, 2).map((g, i) => (
                          <React.Fragment key={i}>
                            <span className="w-[2px] h-[2px] rounded-full bg-[#6A7282]" />
                            <span className="text-center" style={{ color: '#FAFAFA', fontFamily: 'Inter', fontSize: '8px', fontWeight: 400, lineHeight: '15px', letterSpacing: '0.117px' }}>
                              {typeof g === 'string' ? g.charAt(0).toUpperCase() + g.slice(1) : g}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Right spacer for scroll alignment with hero card */}
              <div className="flex-shrink-0 w-4" />
            </div>
          </div>
        )}


        {/* Separator */}
        <div className="lg:hidden mt-5 h-2 bg-[#F3F4F6]" />

        {/* === Section 2: Top Rated TV/Film === */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-extrabold text-[#101828]" style={{ fontFamily: 'Inter, sans-serif' }}><span className="text-ksp-accent">Top Rated</span> TV/Film</h2>
            </div>
          </div>
        </div>

        {/* Top Rated horizontal scroll cards */}
        <div className="mt-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 ml-4">
            {(() => {
              const topRated = [...(allMovies.length > 0 ? allMovies : tvfilms)]
                .sort((a, b) => (b.reviewRating || 0) - (a.reviewRating || 0))
                .slice(0, 8);
              return topRated.map((film) => {
                const genres = film.genres && Array.isArray(film.genres) ? film.genres : (film.genre ? film.genre.split(',').map(g => g.trim()) : []);
                return (
                  <div
                    key={film._id}
                    className="flex-shrink-0 rounded-[14px] overflow-hidden relative cursor-pointer"
                    style={{ width: '280px', height: '157.5px', background: '#1E2939', boxShadow: '0px 8px 10px -6px rgba(0,0,0,0.1), 0px 20px 25px -5px rgba(0,0,0,0.1)' }}
                    onClick={() => navigateToPage(`/tvfilm/${film.slug || film._id}`)}
                  >
                    {/* Background poster */}
                    <img
                      src={film.coverImage || '/images/dramas/default-poster.jpg'}
                      alt={film.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/images/dramas/default-poster.jpg'; }}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)' }} />
                    {/* Content overlay */}
                    <div className="absolute inset-0" style={{ padding: '32.75px 46px 0px 16px' }}>
                      <div className="flex flex-col gap-1">
                        <h4 className="text-white font-bold text-[16px] leading-[1.5] line-clamp-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.02em' }}>
                          {film.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1.17L8.56 4.33L12 4.83L9.5 7.27L10.12 10.7L7 9.05L3.88 10.7L4.5 7.27L2 4.83L5.44 4.33L7 1.17Z" stroke="#F0B100" strokeWidth="1.17" fill="#F0B100"/></svg>
                          <span className="text-[#F0B100] font-semibold text-[14px]" style={{ fontFamily: 'Inter', letterSpacing: '-0.01em' }}>
                            {(film.reviewRating && film.reviewRating > 0) ? parseFloat(film.reviewRating) === 10 ? '10' : parseFloat(film.reviewRating).toFixed(1) : '-'}
                          </span>
                        </div>
                        <span className="text-[#D1D5DC] text-[12px]" style={{ fontFamily: 'Inter' }}>
                          {genres.slice(0, 2).map(g => typeof g === 'string' ? g.charAt(0).toUpperCase() + g.slice(1) : g).join(' · ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
              {/* Right spacer for scroll alignment */}
              <div className="flex-shrink-0 w-4" />
          </div>
        </div>

        {/* === Section 3: Rolling Review Card === */}
        {recentReviews.length > 0 && (
          <div className="px-4 pt-4 pb-4">
            <div
              className="rounded-full p-[10px_16px_10px_16px] flex items-center justify-between cursor-pointer"
              style={{ border: '2px solid transparent', backgroundImage: 'linear-gradient(#fff, #fff), linear-gradient(90deg, #78A5FF 0%, #9075FF 100%)', backgroundOrigin: 'padding-box, border-box', backgroundClip: 'padding-box, border-box', WebkitBackgroundClip: 'padding-box, border-box' }}
              onClick={() => {
                const r = recentReviews[reviewIndex];
                if (r?.dramaSlug) navigateToPage(`/drama/${r.dramaSlug}`);
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 relative h-[28px]">
                {recentReviews.map((rv, i) => (
                  <div
                    key={rv._id || i}
                    className="absolute inset-0 flex items-center gap-[7px] transition-all duration-500"
                    style={{ opacity: i === reviewIndex ? 1 : 0, transform: i === reviewIndex ? 'translateY(0)' : 'translateY(12px)', pointerEvents: i === reviewIndex ? 'auto' : 'none' }}
                  >
                    {/* Text: title | review */}
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-[#000] font-bold text-[10px] truncate" style={{ fontFamily: 'Inter, sans-serif', maxWidth: '35%' }}>{rv.dramaTitle}</span>
                      <div className="w-0 h-[10px] flex-shrink-0" style={{ borderRight: '0.75px solid rgba(106,114,130,0.8)' }} />
                      <span className="text-[#6A7282] truncate flex-1 min-w-0" style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 400, lineHeight: '16px' }}>
                        {rv.content || 'Great film!'}
                      </span>
                    </div>
                    {/* Rating */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L7.5 3.8L10.7 4.3L8.35 6.6L8.95 9.8L6 8.2L3.05 9.8L3.65 6.6L1.3 4.3L4.5 3.8L6 1Z" stroke="#FDC700" strokeWidth="1" fill="#FDC700"/></svg>
                      <span className="text-[#364153] font-semibold text-[12px]" style={{ fontFamily: 'Inter' }}>
                        {rv.rating || '-'}
                      </span>
                      <span className="text-[#99A1AF] text-[12px]" style={{ fontFamily: 'Inter' }}>/ 10</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Chevron */}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-2 flex-shrink-0"><path d="M6 4L10 8L6 12" stroke="#0A0A0A" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        )}

        {/* Separator */}
        <div className="w-full h-2" style={{ background: '#F3F4F6' }} />

        {/* === Section 4: Latest TV/Film Updates === */}
        <div className="bg-white">
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-black text-[#101828]" style={{ fontFamily: 'Inter, sans-serif' }}><span className="text-ksp-accent">Latest TV/Film</span> Updates</h2>
            </div>
          </div>

          {/* Featured large card */}
          {movieNews && movieNews.length > 0 && (
            <div className="px-4">
              <div
                className="rounded overflow-hidden cursor-pointer"
                style={{ background: '#E5E7EB', borderRadius: '4px' }}
                onClick={() => navigateToPage(`/news/${movieNews[0].slug || movieNews[0]._id}`)}
              >
                <div className="relative overflow-hidden" style={{ height: '227px', borderRadius: '10px' }}>
                  <img
                    src={movieNews[0].coverImage || movieNews[0].thumbnailUrl || '/images/news/default-news.jpg'}
                    alt={movieNews[0].title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/images/news/default-news.jpg'; }}
                  />
                  {/* Bottom gradient overlay */}
                  <div className="absolute bottom-0 left-0 right-0 px-[17px] py-5" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}>
                    <p className="text-white font-bold text-[14px] leading-[1.6] line-clamp-2" style={{ fontFamily: 'Inter', letterSpacing: '0.004em' }}>
                      {movieNews[0].title}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* News list items */}
          {movieNews && movieNews.length > 1 && (
            <div className="pl-4 pr-0 pt-4 pb-4 flex flex-col gap-4">
              {movieNews.slice(1, 5).map((news) => (
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
                    <p className="text-[#101828] font-bold text-[16px] leading-[1.25] line-clamp-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.013em' }}>
                      {news.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-[2px] rounded bg-[#DBE6F6] text-[#2B7FFF] font-bold text-[12px]" style={{ fontFamily: 'Inter' }}>
                        TV/Film
                      </span>
                      <span className="text-[#6A7282] text-[12px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {news.author?.name || news.author || ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="lg:hidden h-2 bg-[#F3F4F6]" />

        {/* === Section 5: Recommended News === */}
        <div className="bg-white" style={{ padding: '24px 16px' }}>
          <div className="flex flex-col" style={{ gap: '24px' }}>
            {/* Title row */}
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-black text-[#101828]" style={{ fontFamily: 'Inter, sans-serif' }}><span className="text-ksp-accent">Recommended</span> News</h2>
            </div>

            {/* Featured recommended */}
            {recommendedNews && recommendedNews.length > 0 && (
              <div className="flex flex-col" style={{ gap: '10px' }}>
                <div
                  className="rounded-[14px] overflow-hidden cursor-pointer relative"
                  style={{ height: '222px' }}
                  onClick={() => navigateToPage(`/news/${recommendedNews[0].slug || recommendedNews[0]._id}`)}
                >
                  <img
                    src={recommendedNews[0].coverImage || recommendedNews[0].thumbnailUrl || '/images/news/default-news.jpg'}
                    alt={recommendedNews[0].title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/images/news/default-news.jpg'; }}
                  />
                </div>
                <div className="flex flex-col" style={{ gap: '6px' }}>
                  <h3
                    className="text-[#101828] font-bold text-[18px] leading-[1.25] line-clamp-2 cursor-pointer"
                    style={{ fontFamily: 'Inter' }}
                    onClick={() => navigateToPage(`/news/${recommendedNews[0].slug || recommendedNews[0]._id}`)}
                  >
                    {recommendedNews[0].title}
                  </h3>
                  <p className="text-[#6A7282] text-[12px] leading-[1.5] line-clamp-2" style={{ fontFamily: 'Inter' }}>
                    {recommendedNews[0].description || recommendedNews[0].content?.replace(/<[^>]+>/g, '').substring(0, 120) || ''}
                  </p>
                </div>
              </div>
            )}

            {/* Recommended news list */}
            {(() => {
              const recNews = recommendedNews && recommendedNews.length > 1
                ? recommendedNews.slice(1, 5)
                : (rankingNews || []).slice(0, 4);
              if (recNews.length === 0) return null;
              return (
                <div className="flex flex-col gap-4">
                  {recNews.map((news) => (
                    <div
                      key={news._id}
                      className="flex items-center cursor-pointer"
                      style={{ gap: '12px' }}
                      onClick={() => navigateToPage(`/news/${news.slug || news._id}`)}
                    >
                      <div className="flex-shrink-0 w-[100px] h-[70px] overflow-hidden" style={{ borderRadius: '6px' }}>
                        <img
                          src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                          alt={news.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = '/images/news/default-news.jpg'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '4px' }}>
                        <span className="text-[#99A1AF] text-[10px]" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6' }}>
                          {news.createdAt ? new Date(news.createdAt).toLocaleDateString('en-CA').replace(/-/g, '.') : ''}
                        </span>
                        <p className="text-[#101828] font-bold text-[14px] leading-[1.43] line-clamp-2" style={{ fontFamily: 'Inter', letterSpacing: '-0.0107em' }}>
                          {news.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>
        </div>

        {/* Separator */}
        <div className="lg:hidden h-2 bg-[#F3F4F6]" />

        {/* === Section 7: More News (Infinite Scroll) === */}
        <div className="bg-white">
          <div className="py-5 px-4">
            <MoreNews initialNews={movieNews} category="movie" storageKey="tvfilm_mobile" />
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
                <SectionWrapper title="TV/Film Top 5" emoji="🎬">
                  <DramaTop5 dramas={allMovies.length > 0 ? allMovies : tvfilms} type="tvfilm" onNavigate={navigateToPage} />
                </SectionWrapper>

                {/* Top Rated TV/Film */}
                <SectionWrapper title="Top Rated TV/Film" emoji="">
                  <TopRatedDramaGrid dramas={allMovies.length > 0 ? allMovies : tvfilms} onNavigate={navigateToPage} />
                </SectionWrapper>

                {/* Latest TV/Film Updates */}
                <SectionWrapper title="Latest TV/Film Updates" emoji="🔥">
                  <ArticleCardGrid articles={movieNews?.slice(0, 3) || []} onNavigate={navigateToPage} />
                  {movieNews?.length > 3 && (
                    <div className="mt-8">
                      <ArticleCardGrid articles={movieNews.slice(3, 6)} onNavigate={navigateToPage} />
                    </div>
                  )}
                </SectionWrapper>

                {/* Watch News */}
                {watchNews && watchNews.length > 0 && (
                  <SectionWrapper title="Watch News" emoji="👀">
                    <WatchNewsSection articles={watchNews} onNavigate={navigateToPage} onPlayVideo={openYoutubeModal} />
                  </SectionWrapper>
                )}

                {/* Recommended News */}
                {recommendedNews && recommendedNews.length > 0 && (
                  <SectionWrapper title="Recommended News" emoji="💓">
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
                    <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews || []} onNavigate={navigateToPage} />

                    {/* TV/Film Categories */}
                    {/* <DramaCategories type="tvfilm" onCategoryClick={handleCategoryClick} activeCategory={activeCategory} /> */}

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
    const prodUrl = baseUrl;

    // Fetch all data in parallel
    // comments/recent may not exist on production, use local for that
    const [moviesResponse, movieNewsResponse, commentsResponse, rankingResponse, allNewsResponse, reviewsResponse, trendingResponse] = await Promise.all([
      fetch(`${prodUrl}/api/dramas?category=movie&limit=100&includeAllFields=true&sortBy=orderNumber&sortOrder=asc`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      }),
      fetch(`${prodUrl}/api/news/movie?page=1&limit=12&sort=createdAt&order=desc`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      }),
      fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=10&sort=viewCount`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=200`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${baseUrl}/api/dramas/reviews/recent?limit=10&category=movie`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news/trending?limit=5&category=movie`).catch(() => ({ json: () => ({ success: false }) })),
    ]);

    const moviesData = await moviesResponse.json();
    const movieNewsData = await movieNewsResponse.json();
    const commentsData = await commentsResponse.json();
    const rankingData = await rankingResponse.json();
    const allNewsData = await allNewsResponse.json();
    const reviewsData = await reviewsResponse.json();
    const trendingData = await trendingResponse.json();

    // Editor's PICK: trending ID 제외
    const trendingIds = (trendingData.success ? trendingData.data || [] : []).map(n => n._id).join(',');
    const editorsPickResponse = await fetch(`${prodUrl}/api/news/editors-pick?limit=6&category=movie${trendingIds ? `&exclude=${trendingIds}` : ''}`).catch(() => ({ json: () => ({ success: false }) }));
    const editorsPickData = await editorsPickResponse.json();

    const movieNewsArray = Array.isArray(movieNewsData.data) ? movieNewsData.data : [];

    // Fix relative image URLs to absolute production URLs (local dev doesn't have hash-image data)
    const fixImageUrl = (url) => {
      if (!url) return url;
      if (url.startsWith('/api/proxy/hash-image')) return `${prodUrl}${url}`;
      // 로컬 개발 시 kstarpick.com 프록시 → 프로덕션 서버 직접 접근
      if (process.env.NODE_ENV === 'development' && url.includes('kstarpick.com/api/proxy')) {
        return url.replace('https://kstarpick.com', 'http://43.202.38.79:13001');
      }
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

    // Watch News: 'Watch:' 제목 또는 유튜브 임베드 포함 기사 (카테고리 무관)
    const watchNews = allNewsData.success && allNewsData.data?.news
      ? allNewsData.data.news.filter(n => n.title && (n.title.startsWith('Watch:') || (n.content && n.content.includes('youtube')))).slice(0, 6).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // Recommended News: featured movie news
    const recommendedNews = allNewsData.success && allNewsData.data?.news
      ? allNewsData.data.news.filter(n => n.featured && n.category === 'movie').slice(0, 3).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    // If not enough recommended, use ranking news as fallback
    const finalRecommended = recommendedNews.length >= 3
      ? recommendedNews
      : (rankingData.success ? (rankingData.data?.news || []).slice(0, 3).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) })) : []);

    // Trending news
    const trendingNews = trendingData.success
      ? (trendingData.data || []).slice(0, 5).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

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
        trendingNews,
        watchNews: watchNews,
        recommendedNews: finalRecommended,
        recentReviews: reviewsData.success ? (reviewsData.data || []).slice(0, 10) : [],
        editorsPickNews: editorsPickData.success ? (editorsPickData.data || []).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) })) : [],
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
        trendingNews: [],
        watchNews: [],
        recommendedNews: [],
        recentReviews: [],
        editorsPickNews: [],
      }
    };
  }
}
