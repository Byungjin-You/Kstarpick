import React, { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import { Star, ChevronRight, ChevronLeft, Play, Eye, Clock, ChevronUp, ChevronDown, Bookmark, Heart, Share2, Calendar, TrendingUp, Award, Tv, BarChart2, Disc } from 'lucide-react';
import Link from 'next/link';
import CardNews from '../components/CardNews';
import LoadingSpinner from '../components/LoadingSpinner';
import MainLayout from '../components/MainLayout';
import PaginationControls from '../components/PaginationControls';
import DramaFilter from '../components/DramaFilter';
import MoreNews from '../components/MoreNews';
import { generateWebsiteJsonLd } from '../utils/seoHelpers';

export default function Drama({ dramas, dramaNews, newsPagination }) {
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
  
  // 리사이즈 타이머 참조
  const resizeTimerRef = useRef(null);
  const isScrollingRef = useRef(false);
  
  // 페이지 전환 애니메이션을 위한 상태 추가
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right'); 
  const animationDuration = 300; // 애니메이션 지속 시간 (밀리초)
  
  // 스와이프 관련 상태
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [swiping, setSwiping] = useState(false);
  
  // 스와이프 감지 설정
  const minSwipeDistance = 50; // 최소 스와이프 거리 (px)
  
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
      // 왼쪽으로 스와이프 - 다음 페이지
      goToNextPage();
    } else if (isRightSwipe && currentPage > 1) {
      // 오른쪽으로 스와이프 - 이전 페이지
      goToPrevPage();
    }
    
    // 터치 상태 초기화
    setTouchEnd(0);
    setTouchStart(0);
  };
  
  // 모바일 상태에 따라 드라마 목록 업데이트 (메모이제이션으로 성능 최적화)
  const updateDisplayedDramasForMobile = useCallback((mobile, showMore, dramas) => {
    if (!dramas || dramas.length === 0) return;
    
    if (mobile) {
      setDisplayedDramas(showMore ? [...dramas] : dramas.slice(0, 5));
    } else {
      const startIndex = (currentPage - 1) * dramasPerPage;
      setDisplayedDramas(dramas.slice(startIndex, startIndex + dramasPerPage));
    }
  }, [currentPage, dramasPerPage]);
  
  // 스크롤 복원 useEffect - 뉴스에서 돌아왔을 때
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isBackToDrama = sessionStorage.getItem('isBackToDrama');
    const savedScrollPosition = sessionStorage.getItem('dramaScrollPosition');

    if (isBackToDrama === 'true' && savedScrollPosition) {
      const scrollPos = parseInt(savedScrollPosition, 10);

      // 스크롤 복원을 위한 타이머
      const restoreScroll = () => {
        window.scrollTo(0, scrollPos);
        document.documentElement.scrollTop = scrollPos;
        document.body.scrollTop = scrollPos;
      };

      // 페이지가 완전히 로드된 후 스크롤 복원
      setTimeout(restoreScroll, 50);
      requestAnimationFrame(() => {
        setTimeout(restoreScroll, 100);
      });

      // 플래그 제거 (한 번만 사용)
      sessionStorage.removeItem('isBackToDrama');
    }
  }, []);

  // 페이지 로드 시 초기화
  useEffect(() => {
    if (dramas && dramas.length > 0) {
      setIsLoading(false);

      // 정렬 및 표시
      const sorted = [...dramas].sort((a, b) => {
        if (sortBy === 'year' && a.year && b.year) {
          return b.year - a.year;
        } else if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else if (sortBy === 'rating' && a.rating && b.rating) {
          return b.rating - a.rating;
        } else if (sortBy === 'episodes' && a.episodes && b.episodes) {
          return b.episodes - a.episodes;
        } else {
          // 기본값은 views (인기순)
          return (b.viewCount || 0) - (a.viewCount || 0);
        }
          });

      // 전체 데이터 저장
      setAllDramas(sorted);

      // 전체 페이지 수 계산
      setTotalPages(Math.ceil(sorted.length / dramasPerPage));

      // 먼저 모바일 상태 확인
      const isMobileView = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
      setIsMobile(isMobileView);

      // 디바이스에 따라 적절한 초기 상태 설정
      updateDisplayedDramasForMobile(isMobileView, false, sorted);

      // 축소된 카드 상태 초기화
      initializeCollapsedCards(sorted);

      // 스크롤 이벤트 리스너 등록 - 스로틀링 적용
      const handleScrollThrottled = throttle(handleScroll, 200);
      window.addEventListener('scroll', handleScrollThrottled);

      // 리사이즈 이벤트 리스너 등록 - 디바운싱 적용
      const handleResizeDebounced = debounce(handleResize, 300);
      window.addEventListener('resize', handleResizeDebounced);

      return () => {
        window.removeEventListener('scroll', handleScrollThrottled);
        window.removeEventListener('resize', handleResizeDebounced);

        if (resizeTimerRef.current) {
          clearTimeout(resizeTimerRef.current);
        }
      };
    }
  }, [dramas, dramasPerPage, updateDisplayedDramasForMobile]);
        
  // 디바운스 함수 구현
  function debounce(func, delay) {
    return function() {
      const context = this;
      const args = arguments;
      
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      
      resizeTimerRef.current = setTimeout(() => {
        func.apply(context, args);
      }, delay);
    };
  }
  
  // 스로틀 함수 구현
  function throttle(func, limit) {
    return function() {
      const context = this;
      const args = arguments;
      
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        func.apply(context, args);
        
        setTimeout(() => {
          isScrollingRef.current = false;
        }, limit);
      }
    };
  }
  
  // 모바일 show more/less에 따라 표시할 드라마 업데이트
  useEffect(() => {
    if (allDramas.length > 0) {
      updateDisplayedDramasForMobile(isMobile, showMoreMobile, allDramas);
    }
  }, [showMoreMobile, isMobile, allDramas, updateDisplayedDramasForMobile]);
  
  // 모바일 환경에서 접힘 상태 확인 및 초기화
  useEffect(() => {
    if (isMobile && displayedDramas && displayedDramas.length > 0) {
      const currentState = { ...collapsedCards };
      let hasOpenCard = false;
      let needsUpdate = false;
      
      // 현재 표시된 드라마들의 접힘 상태 확인
      displayedDramas.forEach((drama, index) => {
        if (drama && drama._id) {
          // 접힘 상태가 정의되지 않은 경우
          if (typeof currentState[drama._id] === 'undefined') {
            currentState[drama._id] = index !== 0; // 첫 번째만 펼침
            needsUpdate = true;
          } else if (currentState[drama._id] === false) {
            hasOpenCard = true;
          }
        }
      });
      
      // 모바일에서 열린 카드가 없으면 첫 번째 카드를 펼침
      if (isMobile && !hasOpenCard && displayedDramas.length > 0) {
        currentState[displayedDramas[0]._id] = false;
        needsUpdate = true;
      }
      
      // 상태 업데이트가 필요한 경우
      if (needsUpdate) {
        setCollapsedCards(currentState);
        
        // localStorage 업데이트
        if (typeof window !== 'undefined') {
          localStorage.setItem('dramaCardsCollapsedState', JSON.stringify(currentState));
        }
      }
    }
  }, [isMobile, displayedDramas]);
  
  // 정렬 변경 시 드라마 목록 재정렬
  const handleSortChange = (sortType) => {
    if (sortType === sortBy) return; // 이미 같은 정렬이면 무시
    
    setSortBy(sortType);
    
    // 선택된 정렬 방식으로 데이터 정렬
    const sorted = [...allDramas].sort((a, b) => {
      if (sortType === 'year' && a.year && b.year) {
        return b.year - a.year;
      } else if (sortType === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortType === 'rating' && a.rating && b.rating) {
        return b.rating - a.rating;
      } else if (sortType === 'episodes' && a.episodes && b.episodes) {
        return b.episodes - a.episodes;
      } else {
        // 기본값은 views
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
    });
  
    // 정렬된 데이터 저장
    setAllDramas(sorted);

    // 현재 페이지 1로 리셋
    setCurrentPage(1);
    
    // 정렬된 목록 업데이트
    updateDisplayedDramasForMobile(isMobile, showMoreMobile, sorted);

    // 로컬 스토리지에 정렬 상태 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('dramaSortBy', sortType);
    }
  };

  // 초기 접힘 상태 설정
  const initializeCollapsedCards = (dramas = allDramas) => {
    if (!dramas || dramas.length === 0) return;
    
    try {
      // 로컬 스토리지에서 상태 가져오기
      const savedState = typeof window !== 'undefined' ? localStorage.getItem('dramaCardsCollapsedState') : null;
      
      // 모바일에서는 항상 첫 번째 카드만 펼친 상태로 초기화
      if (isMobile) {
        const initialState = {};
        dramas.forEach((drama, index) => {
          if (drama && drama._id) {
            // 첫 번째 카드(index 0)는 false(펼침), 나머지는 true(접힌 상태)
            initialState[drama._id] = index !== 0;
          }
        });
        
        setCollapsedCards(initialState);
        
        // 로컬 스토리지에 저장
        if (typeof window !== 'undefined') {
          localStorage.setItem('dramaCardsCollapsedState', JSON.stringify(initialState));
        }
      } else if (savedState) {
        // 데스크톱에서만 저장된 상태 사용
        setCollapsedCards(JSON.parse(savedState));
      } else {
        // 초기 상태 생성 (첫 번째 카드만 펼침, 나머지는 접힘)
        const initialState = {};
        dramas.forEach((drama, index) => {
          if (drama && drama._id) {
            // 첫 번째 카드(index 0)는 false(펼침), 나머지는 true(접힌 상태)
            initialState[drama._id] = index !== 0;
          }
        });
        
        setCollapsedCards(initialState);
        
        // 로컬 스토리지에 저장
        if (typeof window !== 'undefined') {
          localStorage.setItem('dramaCardsCollapsedState', JSON.stringify(initialState));
        }
      }
    } catch (error) {
      console.error('초기 접힘 상태 설정 오류:', error);
    }
  };

  // 카드 접기/펼치기 토글
  const toggleCardCollapse = (dramaId) => {
    try {
      // 새 상태 생성
      const newState = { ...collapsedCards };
    
      if (isMobile) {
        // 모바일에서는 하나의 카드만 펼칠 수 있도록 처리
        const isCurrentlyCollapsed = newState[dramaId];
    
    // 모든 카드를 접힌 상태로 초기화
        Object.keys(newState).forEach(id => {
          newState[id] = true;
    });
    
        // 현재 카드가 접혀있었다면 펼치기, 이미 펼쳐져 있었다면 그대로 접힌 상태 유지
    if (isCurrentlyCollapsed) {
      newState[dramaId] = false;
    }
      } else {
        // 데스크톱에서는 기존 토글 방식 유지
        newState[dramaId] = !newState[dramaId];
      }
    
    setCollapsedCards(newState);
    
      // 로컬 스토리지에 상태 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('dramaCardsCollapsedState', JSON.stringify(newState));
    }
    } catch (error) {
      console.error('카드 토글 오류:', error);
    }
  };

  // 페이지 변경 처리
  const handlePageChange = (page) => {
    if (isPageChanging) return; // 페이지 전환 중이면 함수 실행 중지
    
    setIsPageChanging(true);
    setSlideDirection(page > currentPage ? 'right' : 'left');
    setCurrentPage(page);
    
    const startIndex = (page - 1) * dramasPerPage;
    setPageStartIndex(startIndex);
    
    // 정렬 방식 유지하면서 페이지 변경
    const sorted = [...allDramas].sort((a, b) => {
      if (sortBy === 'year' && a.year && b.year) {
        return b.year - a.year;
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'rating' && a.rating && b.rating) {
        return b.rating - a.rating;
      } else if (sortBy === 'episodes' && a.episodes && b.episodes) {
        return b.episodes - a.episodes;
      } else {
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
    });
    
    // 약간의 지연 후 새 페이지 데이터 로드
    setTimeout(() => {
      if (!isMobile) {
        setDisplayedDramas(sorted.slice(startIndex, startIndex + dramasPerPage));
      }
      
      // 모바일에서 페이지 변경 시 첫 번째 카드만 펼치기
      if (isMobile) {
        const newPageDramas = sorted.slice(startIndex, startIndex + dramasPerPage);
        const newState = {};
        newPageDramas.forEach((drama, index) => {
          if (drama && drama._id) {
            // 첫 번째 카드만 펼침, 나머지는 접힘
            newState[drama._id] = index !== 0;
          }
        });
        
        // 기존 상태와 새 페이지 상태 병합
        setCollapsedCards(prevState => ({ ...prevState, ...newState }));
        
        // localStorage 업데이트
        if (typeof window !== 'undefined') {
          localStorage.setItem('dramaCardsCollapsedState', JSON.stringify({ ...collapsedCards, ...newState }));
        }
      }
      
      // 페이지 전환 애니메이션 완료 후 상태 초기화
      setTimeout(() => {
        setIsPageChanging(false);
      }, 50);
    }, animationDuration - 50);
  };

  // 다음 페이지로 이동
  const goToNextPage = () => {
    if (currentPage < totalPages && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('right');
      
      // 페이지 변경
      handlePageChange(currentPage + 1);
    }
  };

  // 이전 페이지로 이동
  const goToPrevPage = () => {
    if (currentPage > 1 && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('left');
      
      // 페이지 변경
      handlePageChange(currentPage - 1);
    }
  };
  
  // 스크롤 이벤트 핸들러 (간소화)
    const handleScroll = () => {
    if (typeof window !== 'undefined') {
      // 스크롤 위치에 따라 상단 이동 버튼 표시/숨김만 처리
      setShowScrollTop(window.scrollY > 500);
    }
  };
  
  // 상단으로 이동
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // 모바일 보기/접기 토글
  const toggleMobileView = () => {
    const newShowMore = !showMoreMobile;
    setShowMoreMobile(newShowMore);
    
    // 즉시 상태 업데이트를 반영하기 위해 직접 displayedDramas도 업데이트
    if (isMobile && allDramas.length > 0) {
      if (newShowMore) {
        // 더 보기 - 모든 드라마 표시
        setDisplayedDramas([...allDramas]);
          } else {
        // 접기 - 상위 5개만 표시
        setDisplayedDramas(allDramas.slice(0, 5));
      }
    }
  };
  
  // 화면 크기에 따라 모바일/데스크톱 모드 설정
  function handleResize() {
        if (typeof window !== 'undefined') {
      const mobile = window.innerWidth < 768;
      
      // 모바일 상태가 변경된 경우에만 업데이트
      if (mobile !== isMobile) {
        console.log('화면 모드 변경:', mobile ? '모바일' : '데스크톱');
        setIsMobile(mobile);
        
        // 상태 변경 후 즉시 드라마 목록 업데이트
        updateDisplayedDramasForMobile(mobile, showMoreMobile, allDramas);
      }
    }
  }

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
      <div className="container mx-auto px-4 pt-0 pb-12">
        {/* 제목 영역 */}
        <div className="mb-8 mt-8">
          <h1 className="font-bold text-black" style={{ fontSize: '20px' }}>
            Most searched <span style={{ color: '#233CFA' }}>dramas</span> right now
          </h1>
        </div>

        {/* 드라마 리스트 */}
        <div className="relative">
          {/* Left navigation button - only show if not on the first page */}
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
          
          {/* Slider with touch events for mobile */}
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
                  
                  {/* 접힌 상태일 때 간소화된 카드 UI - 모바일에서만 적용 */}
                  {isCollapsed ? (
                    <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full">
                      <div className="flex items-center p-4">
                        {/* 순위 - flex-shrink-0 추가하여 크기 고정 */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg mr-3 flex-shrink-0" style={{ backgroundColor: '#233CFA' }}>
                          {(currentPage - 1) * dramasPerPage + index + 1}
                        </div>
                        
                        {/* 제목과 정보 - 너비 제한 추가 */}
                        <div className="flex-grow min-w-0">
                          <Link href={`/drama/${drama.slug || drama._id}`} className="block">
                            <h3 className="text-base font-semibold text-gray-800 hover:text-[#009efc] transition-colors line-clamp-1 truncate">
                              {drama.title}
                            </h3>
                            
                            {/* 장르 태그와 평점 정보 추가 */}
                            <div className="flex items-center mt-1.5 overflow-hidden">
                              {/* 첫 번째 장르 태그 */}
                              {(drama.genres && Array.isArray(drama.genres) && drama.genres.length > 0) ? (
                                <span
                                  className="inline-block text-xs font-medium px-2 py-0.5 rounded-full shadow-sm mr-2 whitespace-nowrap flex-shrink-0"
                                  style={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#1f2937'
                                  }}
                                >
                                  {typeof drama.genres[0] === 'string'
                                    ? drama.genres[0].charAt(0).toUpperCase() + drama.genres[0].slice(1)
                                    : drama.genres[0]}
                                </span>
                              ) : (typeof drama.genre === 'string' && drama.genre.trim() !== '') ? (
                                <span
                                  className="inline-block text-xs font-medium px-2 py-0.5 rounded-full shadow-sm mr-2 whitespace-nowrap flex-shrink-0"
                                  style={{
                                    backgroundColor: '#f3f4f6',
                                    color: '#1f2937'
                                  }}
                                >
                                  {drama.genre.split(',')[0].trim().charAt(0).toUpperCase() + drama.genre.split(',')[0].trim().slice(1)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 mr-2 whitespace-nowrap flex-shrink-0">No genre</span>
                              )}
                              
                              {/* 평점 */}
                              <div className="flex items-center flex-shrink-0 whitespace-nowrap">
                                <Star size={12} className="text-amber-500 mr-1" fill="#f59e0b" />
                                <span className="text-xs font-medium text-gray-700">
                                  {(drama.reviewRating && drama.reviewRating > 0)
                                    ? parseFloat(drama.reviewRating) === 10 
                                      ? "10" 
                                      : parseFloat(drama.reviewRating).toFixed(1)
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
                    // 펼쳐진 상태 - 기존 카드 UI
                    <Link href={`/drama/${drama.slug || drama._id}`} className="block h-full">
                      <div
                        className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full transform hover:-translate-y-1"
                        style={isMobile ? {
                          border: '2px solid #233CFA'
                        } : {}}
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
                                onError={(e) => {
                                  console.error(`Image load failed: ${drama.title}`);
                                  e.target.onerror = null;
                                  e.target.src = '/images/dramas/default-poster.jpg';
                                }}
                              />
                            </span>
                            
                            {/* Ranking */}
                            <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center">
                              <span className="text-white font-bold text-5xl drop-shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{(currentPage - 1) * dramasPerPage + index + 1}</span>
                            </div>
                            
                            {/* Rating on image - 평점 우측 상단에 표시 (모바일에서는 제거) */}
                            {!isMobile && (
                              <div className="absolute top-2 right-2 flex items-center bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                                <div className="h-6 w-6 rounded-full flex items-center justify-center text-white font-bold text-xs mr-1 shadow-lg" style={{ backgroundColor: '#233CFA' }}>
                                  {(drama.reviewRating && drama.reviewRating > 0)
                                    ? parseFloat(drama.reviewRating) === 10
                                      ? "10"
                                      : parseFloat(drama.reviewRating).toFixed(1)
                                    : "-"
                                  }
                                </div>
                                <span className="text-white/90 text-xs">Rating</span>
                              </div>
                            )}
                            
                            {/* Overlay gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                              <div className="p-4 w-full">
                                <p className="text-white font-medium line-clamp-1">{drama.title}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4 pb-3">
                            <h3 className="text-base font-semibold text-gray-800 group-hover:text-[#009efc] transition-colors line-clamp-1 flex items-center justify-between">
                              <span className="mr-2">{drama.title}</span>
                              {/* Rating 평점을 제목 오른쪽에 표시 (모바일용) - 별 아이콘 추가 */}
                              {isMobile && (
                                <div className="flex-shrink-0 flex items-center bg-gradient-to-r from-amber-50 to-amber-100 px-2 py-1 rounded-full border border-amber-200">
                                  <Star size={12} className="text-amber-500 mr-1 flex-shrink-0" fill="#f59e0b" />
                                  <span className="text-xs font-bold text-amber-700">
                                    {(drama.reviewRating && drama.reviewRating > 0)
                                      ? parseFloat(drama.reviewRating) === 10 
                                        ? "10" 
                                        : parseFloat(drama.reviewRating).toFixed(1)
                                      : "-"
                                    }
                                  </span>
                                </div>
                              )}
                            </h3>
                            
                            {/* 장르 태그 - 제목 바로 아래에 추가 */}
                            <div className="flex mt-2">
                              <div className="w-full overflow-hidden">
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                                  {(drama.genres && Array.isArray(drama.genres) && drama.genres.length > 0)
                                    ? drama.genres.map((genre, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-1 shadow-sm transition-colors"
                                        style={{
                                          display: 'inline-block',
                                          backgroundColor: '#f3f4f6',
                                          color: '#1f2937',
                                          borderRadius: '9999px',
                                          padding: '0.25rem 0.5rem',
                                          marginRight: '0.25rem',
                                          fontSize: '0.75rem',
                                          fontWeight: '500',
                                          cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.backgroundColor = '#009efc';
                                          e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                                          e.currentTarget.style.color = '#1f2937';
                                        }}
                                      >
                                        {genre && typeof genre === 'string' 
                                          ? genre.charAt(0).toUpperCase() + genre.slice(1) 
                                          : genre}
                                      </span>
                                    ))
                                    : (typeof drama.genre === 'string' && drama.genre.trim() !== '')
                                      ? drama.genre.split(',').map((g, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-1 shadow-sm transition-colors"
                                          style={{
                                            display: 'inline-block',
                                            backgroundColor: '#f3f4f6',
                                            color: '#1f2937',
                                            borderRadius: '9999px',
                                            padding: '0.25rem 0.5rem',
                                            marginRight: '0.25rem',
                                            fontSize: '0.75rem',
                                            fontWeight: '500',
                                            cursor: 'pointer'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#009efc';
                                            e.currentTarget.style.color = 'white';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                                            e.currentTarget.style.color = '#1f2937';
                                          }}
                                        >
                                          {g.trim().charAt(0).toUpperCase() + g.trim().slice(1)}
                                        </span>
                                      ))
                                      : null
                                  }
                                </div>
                              </div>
                            </div>
                            
                            {/* Streaming Services */}
                            {drama.watchProviders && drama.watchProviders.length > 0 && (
                              <div className="flex mt-2 mb-2">
                                <div className="w-full overflow-hidden">
                                  <div className="flex flex-nowrap overflow-x-hidden">
                                    {drama.watchProviders.slice(0, 3).map((provider, idx) => (
                                      <span 
                                        key={idx}
                                        className="inline-flex items-center text-xs font-medium text-blue-700 px-2.5 py-0.5 bg-blue-50 rounded-full mr-1.5 whitespace-nowrap shadow-sm hover:bg-blue-100 transition-colors"
                                      >
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
                            
                            {/* 시놉시스 1줄 추가 */}
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
          
          {/* Mobile View More Button */}
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
          
          {/* Right navigation button - only show if not on the last page */}
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
        
        {/* 드라마 관련 뉴스 섹션 - 이 부분만 MoreNews로 대체 */}
        <div className="mt-16">
          {/* 제목 영역 삭제 */}
          
          {/* MoreNews 컴포넌트로 대체 */}
          <MoreNews
            initialNews={dramaNews}
            category="drama" 
          />
          
          {/* 페이지 하단 여백 조정 */}
          <div className="mb-12"></div>
        </div>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  try {
    // 서버 URL 설정 - 실시간 데이터 로딩
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${context.req.headers.host}`;
    
    console.log('Server Side Props: 드라마 페이지 실시간 데이터 로딩 시작');
    console.log('baseUrl:', baseUrl);
    console.log('호출할 드라마 뉴스 API URL:', `${baseUrl}/api/news/drama?page=1&limit=6&sort=createdAt&order=desc`);
    
    // 병렬로 핵심 데이터만 가져오기 (실시간 데이터 로딩)
    const [dramaResponse, dramaNewsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/dramas?category=drama&limit=50&sortBy=orderNumber&sortOrder=asc`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }),
      fetch(`${baseUrl}/api/news/drama?page=1&limit=6&sort=createdAt&order=desc`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
    ]);
    
    // 드라마 데이터 처리
    const dramaData = await dramaResponse.json();
    console.log('드라마 API 응답:', dramaData.success, 'items:', dramaData.data?.length);
    
    // 드라마 뉴스 데이터 처리
    const dramaNewsData = await dramaNewsResponse.json();
    console.log('드라마 뉴스 API 응답 상태:', dramaNewsResponse.status);
    console.log('드라마 뉴스 API 응답 데이터:', JSON.stringify(dramaNewsData).slice(0, 200));
    // /api/news/drama는 data가 직접 배열이므로 수정
    const dramaNews = Array.isArray(dramaNewsData.data) ? dramaNewsData.data : (dramaNewsData.data?.news || []);
    console.log('드라마 뉴스 데이터:', dramaNews.length, '건');
    
    // 기본 이미지 설정만 수행 (상세 정보 요청 제거로 성능 최적화)
    const processedDramas = (dramaData.data || []).map(drama => {
      if (!drama.coverImage) {
        drama.coverImage = '/images/dramas/default-poster.jpg';
      }
      return drama;
    });
    
    // 뉴스 이미지 처리
    const processedNews = dramaNews.map(news => {
      if (!news.coverImage) {
        news.coverImage = '/images/news/default-news.jpg';
      }
      return news;
    });
    
    return {
      props: {
        dramas: processedDramas || [],
        dramaNews: processedNews || [],
        newsPagination: dramaNewsData.data?.pagination || {
          total: processedNews.length,
          page: 1,
          limit: 6,
          totalPages: Math.ceil(processedNews.length / 6),
          hasNextPage: processedNews.length > 6,
          hasPrevPage: false
        }
      }
      // ISR 제거됨 - 실시간 데이터 로딩
    };
  } catch (error) {
    console.error('Server Side Props에서 오류 발생:', error);
    return {
      props: {
        dramas: [],
        dramaNews: [],
        newsPagination: {
          total: 0,
          page: 1,
          limit: 6,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
      // 실시간 데이터 로딩으로 revalidate 불필요
    };
  }
} 

