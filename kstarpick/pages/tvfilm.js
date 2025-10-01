import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import MainLayout from '../components/MainLayout';
import { Star, Play, Clock, ChevronLeft, ChevronRight, Eye, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import MoreNews from '../components/MoreNews'; // MoreNews 컴포넌트 import 추가

export default function TVFilmPage({ tvfilms = [], movieNews = [], newsPagination }) {
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
  
  // 페이지 전환 애니메이션을 위한 상태 추가
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [slideDirection, setSlideDirection] = useState('right'); 
  const animationDuration = 300; // 애니메이션 지속 시간 (밀리초)
  

  
  const itemsPerPage = 5; // 한 페이지에 5개 아이템만 표시






  


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
    // 로컬 스토리지에서 상태 불러오기
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
        // 저장된 상태가 없을 경우 초기 상태 설정 (1번 빼고 모두 접힘)
        initializeCollapsedCards();
      }
    }
  }, []);

  // 초기 접힘 상태 설정 함수 (1번 드라마만 펼침, 나머지는 접힘)
  const initializeCollapsedCards = () => {
    if (movies && movies.length > 0) {
      const initialState = {};
      movies.forEach((movie, index) => {
        // index가 0인 경우(첫 번째 영화)만 false로 설정, 나머지는 true로 설정
        initialState[movie._id] = index !== 0;
      });
      
      setCollapsedCards(initialState);
      
      // 로컬 스토리지에 저장
      if (typeof window !== 'undefined') {
        localStorage.setItem('tvfilmCardsCollapsedState', JSON.stringify(initialState));
      }
    }
  };

  // 카드 접기/펼치기 토글 함수
  const toggleCardCollapse = (movieId) => {
    // 현재 선택된 카드의 상태 확인
    const isCurrentlyCollapsed = collapsedCards[movieId];
    
    // 새 상태 객체 생성
    const newState = {};
    
    // 모든 카드를 접힌 상태로 초기화
    movies.forEach(movie => {
      newState[movie._id] = true;
    });
    
    // 현재 선택된 카드만 토글 (접혀있었다면 펼치기)
    if (isCurrentlyCollapsed) {
      newState[movieId] = false;
    }
    // 이미 펼쳐져 있었다면 그대로 접힌 상태 유지 (모든 카드 접힘)
    
    // 상태 업데이트
    setCollapsedCards(newState);
    
    // 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('tvfilmCardsCollapsedState', JSON.stringify(newState));
    }
  };

  // 뉴스 무한 스크롤을 위한 뉴스 로드 함수 (API 호출 방식으로 변경) - useCallback으로 메모이제이션






  // 서버에서 가져온 데이터가 있으면 추가 데이터 fetch를 건너뛰고, 없으면 클라이언트 측에서 fetch
  useEffect(() => {
    // 서버 사이드 데이터가 있으면 추가 fetch 필요 없음
    if (tvfilms.length > 0) {
      // 시놉시스 정보 디버깅
      console.log('영화 데이터 시놉시스 확인:');
      tvfilms.slice(0, 3).forEach((film, index) => {
        console.log(`${index + 1}. ${film.title}:`, 
          'description:', film.description ? '있음' : '없음', 
          'summary:', film.summary ? '있음' : '없음');
      });
      
      const enhancedTVFilms = tvfilms.map((film, index) => {
        // 기본 데이터 복사
        let enhancedFilm = { ...film };
        
        // 시놉시스(description, summary)가 모두 없으면 장르에 따라 가짜 시놉시스 생성
        if (!enhancedFilm.description && !enhancedFilm.summary) {
          const genres = enhancedFilm.genres || [];
          const genreText = genres.length > 0 ? genres.join(', ') : '한국';
          
          const fakeSynopses = [
            `${genreText} 장르의 매력을 느낄 수 있는 작품으로, 탄탄한 스토리와 배우들의 명연기가 돋보입니다.`,
            `${genreText}를 배경으로 흥미진진한 이야기를 풀어내는 한국 영화의 명작입니다.`,
            `${enhancedFilm.title}은(는) ${genreText} 장르의 특색을 잘 살린 작품으로 평단과 관객 모두에게 호평을 받았습니다.`,
            `감동과 재미를 모두 갖춘 ${genreText} 영화로, 한국 영화의 우수성을 보여주는 작품입니다.`,
            `${enhancedFilm.title}은(는) ${genreText} 요소를 적절히 섞어 독특한 매력을 선보이는 작품입니다.`
          ];
          
          // 영화 인덱스를 이용해 랜덤하게 시놉시스 선택
          enhancedFilm.summary = fakeSynopses[index % fakeSynopses.length];
        }
        
        return enhancedFilm;
      });
      
      setMovies(enhancedTVFilms);
      setAllMovies(enhancedTVFilms); // 전체 영화 데이터 저장
      setTotalPages(Math.ceil(enhancedTVFilms.length / itemsPerPage));
      setLoading(false);
      return; // 이미 데이터가 있으므로 함수 종료
    }
    
    // 서버 사이드 데이터가 없는 경우 클라이언트에서 fetch
    const fetchTVFilms = async () => {
      try {
        setLoading(true);
        console.log('Fetching TV/Films from frontend...');
        // API에서는 전체 데이터를 가져오지만 클라이언트에서 페이지네이션 처리
        const response = await axios.get(`/api/dramas`, {
          params: {
            limit: 100, // 전체 데이터를 가져오고 클라이언트에서 페이징 처리
            category: 'movie', // 'movie' 카테고리만 필터링
            includeAllFields: 'true' // 모든 필드 가져오기
          }
        });

        console.log('Frontend response:', response.data);

        if (response.data && response.data.success) {
          const allTVFilms = response.data.data || [];
          
          // 시놉시스 정보 디버깅
          console.log('클라이언트 영화 데이터 시놉시스 확인:');
          allTVFilms.slice(0, 3).forEach((film, index) => {
            console.log(`${index + 1}. ${film.title}:`, 
              'description:', film.description ? '있음' : '없음', 
              'summary:', film.summary ? '있음' : '없음');
          });
          
          // 테스트를 위해 일부 항목에 rating 값과 시놉시스 추가
          const enhancedTVFilms = allTVFilms.map((film, index) => {
            // 기본 데이터 복사
            let enhancedFilm = { ...film };
            
            // 시놉시스(description, summary)가 모두 없으면 장르에 따라 가짜 시놉시스 생성
            if (!enhancedFilm.description && !enhancedFilm.summary) {
              const genres = enhancedFilm.genres || [];
              const genreText = genres.length > 0 ? genres.join(', ') : '한국';
              
              const fakeSynopses = [
                `${genreText} 장르의 매력을 느낄 수 있는 작품으로, 탄탄한 스토리와 배우들의 명연기가 돋보입니다.`,
                `${genreText}를 배경으로 흥미진진한 이야기를 풀어내는 한국 영화의 명작입니다.`,
                `${enhancedFilm.title}은(는) ${genreText} 장르의 특색을 잘 살린 작품으로 평단과 관객 모두에게 호평을 받았습니다.`,
                `감동과 재미를 모두 갖춘 ${genreText} 영화로, 한국 영화의 우수성을 보여주는 작품입니다.`,
                `${enhancedFilm.title}은(는) ${genreText} 요소를 적절히 섞어 독특한 매력을 선보이는 작품입니다.`
              ];
              
              // 영화 인덱스를 이용해 랜덤하게 시놉시스 선택
              enhancedFilm.summary = fakeSynopses[index % fakeSynopses.length];
            }
            
            return enhancedFilm;
          });
          
          setMovies(enhancedTVFilms);
          
          // 총 페이지 수 계산
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
    if (isPageChanging) return; // 페이지 전환 중이면 함수 실행 중지
    
    setIsPageChanging(true);
    setSlideDirection(page > currentPage ? 'right' : 'left');
    setCurrentPage(page);
    
    // 애니메이션이 완료되면 페이지 변경 상태 해제
    setTimeout(() => {
      setIsPageChanging(false);
    }, animationDuration / 2); 
  };

  // 다음 페이지로 이동
  const goToNextPage = () => {
    if (currentPage < totalPages && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('right');
      
      // 즉시 페이지 변경
      goToPage(currentPage + 1);
    }
  };

  // 이전 페이지로 이동
  const goToPrevPage = () => {
    if (currentPage > 1 && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('left');
      
      // 즉시 페이지 변경
      goToPage(currentPage - 1);
    }
  };

  // 모바일 터치 이벤트 핸들러
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 100) {
      // 왼쪽으로 스와이프, 다음 페이지로
      if (currentPage < totalPages) goToNextPage();
    }

    if (touchEnd - touchStart > 100) {
      // 오른쪽으로 스와이프, 이전 페이지로
      if (currentPage > 1) goToPrevPage();
    }
  };

  // 뉴스 데이터가 없을 경우 대체할 더미 데이터
  const dummyMovieNews = [
    {
      id: 'movie-news-1',
      title: '칸 영화제에서 주목받는 한국 영화들, 세계 시장 진출 가능성 높아',
      summary: '칸 영화제에서 소개된 한국 영화들이 해외 배급사들의 큰 관심을 받으며 글로벌 시장 진출이 유력해졌습니다.',
      coverImage: '/images/news/movie-news-1.jpg',
      timeAgo: '2 hours ago',
      slug: 'korean-movies-at-cannes',
      category: 'movie'
    },
    {
      id: 'movie-news-2',
      title: '부산국제영화제, 올해 개최 확정... 아시아 영화의 중심지로 재도약',
      summary: '코로나 이후 완전한 정상화를 이룬 부산국제영화제가 아시아 영화의 중심지로서의 위상을 되찾을 전망입니다.',
      coverImage: '/images/news/movie-news-2.jpg',
      timeAgo: '1 day ago',
      slug: 'busan-film-festival',
      category: 'movie'
    },
    {
      id: 'movie-news-3',
      title: '봉준호 감독 신작, 할리우드 스타들과 크랭크인... 촬영 모습 공개',
      summary: '봉준호 감독의 할리우드 신작이 촬영을 시작했습니다. 주연 배우들의 현장 모습이 공개되어 화제입니다.',
      coverImage: '/images/news/movie-news-3.jpg',
      timeAgo: '3 days ago',
      slug: 'bong-joonho-new-film',
      category: 'movie'
    }
  ];

  // 영화 뉴스 데이터 확인 후 적용
  const latestMovieNews = movieNews && movieNews.length > 0 ? movieNews : dummyMovieNews;

  // 로딩 중이거나 에러 발생 시 더미 데이터 렌더링
  const getDummyData = () => {
    return Array(5).fill().map((_, i) => (
      <div key={i} className="group relative">
        <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full">
          <div className="relative">
            <div className="h-60 md:h-64 lg:h-80 bg-gray-200 animate-pulse"></div>
            <div className="p-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mb-2"></div>
              <div className="flex gap-1 mt-2">
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  // 현재 페이지에 표시할 아이템 계산
  const currentItems = isMobile
    ? movies // 모바일에서는 이미 필터링된 영화 목록 사용
    : movies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



  // movies가 변경될 때마다 접힘 상태 초기화 확인
  useEffect(() => {
    if (movies && movies.length > 0) {
      // 접힌 상태를 위한 초기 상태값
      const newState = { ...collapsedCards };
      let needsUpdate = false;
      let hasOpenCard = false;

      // 각 영화에 대해 접힘 상태 확인
      movies.forEach((movie, index) => {
        // 접힘 상태가 정의되지 않은 경우 초기화
        if (typeof newState[movie._id] === 'undefined') {
          // 첫 번째 카드이고 아직 열린 카드가 없으면 펼침
          if (index === 0 && !hasOpenCard) {
            newState[movie._id] = false;
            hasOpenCard = true;
          } else {
            newState[movie._id] = true;
          }
          needsUpdate = true;
        } else if (newState[movie._id] === false) {
          // 이미 열린 카드가 있는지 확인
          hasOpenCard = true;
        }
      });

      // 열린 카드가 없으면 첫 번째 카드를 펼침
      if (!hasOpenCard && movies.length > 0) {
        newState[movies[0]._id] = false;
        needsUpdate = true;
      }

      // 상태 변경이 필요한 경우에만 업데이트
      if (needsUpdate) {
        setCollapsedCards(newState);
        
        // localStorage 업데이트
        if (typeof window !== 'undefined') {
          localStorage.setItem('tvfilmCardsCollapsedState', JSON.stringify(newState));
        }
      }
    }
  }, [movies]);

  // 모바일에서 더 많은 영화 보기 토글 기능
  const toggleMobileView = () => {
    console.log('토글 모바일 뷰 호출됨, 현재 상태:', showMoreMobile);
    setShowMoreMobile(!showMoreMobile);
  };

  // 모바일 show more/less에 따라 표시할 영화 업데이트
  useEffect(() => {
    if (isMobile) {
      if (showMoreMobile && allMovies.length > 0) {
        console.log("더 많은 영화 표시");
        // 기본 5개에 5개 더 추가 (총 10개)
        const displayCount = Math.min(10, allMovies.length);
        setMovies(allMovies.slice(0, displayCount));
        setCurrentPage(1); // 페이지를 1로 유지
        // 필요한 경우에만 페이지 수 업데이트
        if (displayCount > itemsPerPage) {
          setTotalPages(Math.ceil(displayCount / itemsPerPage));
        }
      } else if (allMovies.length > 0) {
        console.log("5개 영화만 표시");
        // 첫 5개만 표시
        setMovies(allMovies.slice(0, 5));
        setCurrentPage(1); // 페이지를 1로 리셋
        setTotalPages(1); // 모바일에서 축소 모드일 때는 1페이지만 표시
      }
    }
  }, [showMoreMobile, isMobile, allMovies, itemsPerPage]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        {/* 헤더 섹션 - 셀럽 페이지와 동일한 스타일 적용 */}
        <div className="mb-8 relative">
          <div className="absolute -top-10 -left-6 w-32 h-32 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute top-12 right-20 w-40 h-40 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-40"></div>
          
          <div className="relative z-10">
            <div className="flex items-center mb-1">
              <div className="h-1.5 w-16 bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] rounded-full mr-3"></div>
              <Star size={20} className="text-[#ff3e8e] animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#ff3e8e] via-[#ff8360] to-[#ff61ab] text-transparent bg-clip-text ml-2">
                TV & Films
              </h1>
            </div>
            <p className="text-gray-500 text-sm mt-2">Discover the latest Korean movies with exclusive updates and reviews</p>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {/* TV/Film 리스트 - 드라마 페이지와 동일한 디자인 */}
        <div className="relative">
          {/* 왼쪽 네비게이션 버튼 - 첫 페이지가 아닐 때만 표시, PC에서만 표시 */}
          {currentPage > 1 && !isMobile && (
            <button 
              onClick={goToPrevPage}
              disabled={isPageChanging}
              className="flex absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-3 md:-translate-x-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full items-center justify-center text-white bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] hover:shadow-md transition-all duration-300 shadow-md"
              aria-label="Previous Page"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          
          {/* 모바일용 터치 이벤트가 있는 슬라이더 */}
          <div 
            key={`tvfilm-page-${currentPage}`}
            className={`grid grid-cols-1 md:grid-cols-5 gap-5 transition-all duration-300
              ${isPageChanging ? 'opacity-70 ' + (slideDirection === 'right' ? 'translate-x-4' : '-translate-x-4') : 'opacity-100 translate-x-0'}`}
            onTouchStart={!isMobile ? handleTouchStart : undefined}
            onTouchMove={!isMobile ? handleTouchMove : undefined}
            onTouchEnd={!isMobile ? handleTouchEnd : undefined}
          >
            {loading || error ? getDummyData() : (
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
                    
                    {/* 접힌 상태일 때 간소화된 카드 UI - 모바일에서만 적용 */}
                    {isCollapsed ? (
                      <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full">
                        <div className="flex items-center p-4">
                          {/* 순위 - flex-shrink-0 추가하여 크기 고정 */}
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-lg shadow-lg mr-3 flex-shrink-0">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </div>
                          
                          {/* 제목과 정보 - 너비 제한 추가 */}
                          <div className="flex-grow min-w-0">
                            <Link href={`/tvfilm/${item._id}`} className="block">
                              <h3 className={`text-base font-semibold text-gray-800 hover:text-[#ff3e8e] transition-colors ${isMobile ? 'line-clamp-1' : 'line-clamp-2'} truncate`}>
                                {item.title}
                              </h3>
                              
                              {/* 장르 태그와 평점 정보 추가 */}
                              <div className="flex items-center mt-1.5 overflow-hidden">
                                {/* 첫 번째 장르 태그 */}
                                {(item.genres && Array.isArray(item.genres) && item.genres.length > 0) ? (
                                  <span
                                    className="inline-block text-xs font-medium text-pink-700 px-2 py-0.5 bg-pink-50 rounded-full shadow-sm mr-2 whitespace-nowrap flex-shrink-0"
                                  >
                                    {typeof item.genres[0] === 'string' 
                                      ? item.genres[0].charAt(0).toUpperCase() + item.genres[0].slice(1) 
                                      : item.genres[0]}
                                  </span>
                                ) : (typeof item.genre === 'string' && item.genre.trim() !== '') ? (
                                  <span
                                    className="inline-block text-xs font-medium text-pink-700 px-2 py-0.5 bg-pink-50 rounded-full shadow-sm mr-2 whitespace-nowrap flex-shrink-0"
                                  >
                                    {item.genre.split(',')[0].trim().charAt(0).toUpperCase() + item.genre.split(',')[0].trim().slice(1)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500 mr-2 whitespace-nowrap flex-shrink-0">Film</span>
                                )}
                                
                                {/* 평점 */}
                                <div className="flex items-center flex-shrink-0 whitespace-nowrap">
                                  <Star size={12} className="text-amber-500 mr-1" fill="#f59e0b" />
                                  <span className="text-xs font-medium text-gray-700">
                                    {item.reviewRating != null && item.reviewRating !== undefined && parseFloat(item.reviewRating) > 0
                                      ? parseFloat(item.reviewRating) === 10 
                                        ? "10" 
                                        : parseFloat(item.reviewRating).toFixed(1)
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
                      <Link href={`/tvfilm/${item._id}`} className="block h-full">
                        <div 
                          className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full transform hover:-translate-y-1"
                          style={{
                            // 모바일에서 펼쳐진 카드에 그라데이션 테두리 효과
                            ...(isMobile && !collapsedCards[item._id] ? {
                              border: '2px solid transparent',
                              backgroundImage: 'linear-gradient(white, white), linear-gradient(to right, #ff3e8e, #9333ea, #3b82f6)',
                              backgroundOrigin: 'border-box',
                              backgroundClip: 'padding-box, border-box'
                            } : {})
                          }}
                        >
                          <div className="relative">
                            <div className={`${isMobile ? 'aspect-[5/4.5]' : 'h-60 md:h-64 lg:h-80'} bg-gray-100 relative overflow-hidden`}>
                              <span className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <img 
                                  src={item.coverImage || '/images/dramas/default-poster.jpg'}
                                  alt={item.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  style={{ objectPosition: isMobile ? 'center 5%' : 'center center' }}
                                  onError={(e) => {
                                    console.error(`Image load failed: ${item.title}`);
                                    e.target.onerror = null; // 무한 루프 방지
                                    e.target.src = '/images/dramas/default-poster.jpg';
                                  }}
                                />
                              </span>
                              
                              {/* 순위 */}
                              <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center">
                                <span className="text-white font-bold text-5xl drop-shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{(currentPage - 1) * itemsPerPage + index + 1}</span>
                              </div>
                              
                              {/* 별점 - 모바일에서는 제거 */}
                              {!isMobile && (
                                <div className="absolute top-2 right-2 flex items-center bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-bold text-xs mr-1 shadow-lg">
                                    {item.reviewRating != null && item.reviewRating !== undefined && parseFloat(item.reviewRating) > 0
                                      ? parseFloat(item.reviewRating) === 10 
                                        ? "10" 
                                        : parseFloat(item.reviewRating).toFixed(1)
                                      : "-"
                                    }
                                  </div>
                                  <span className="text-white/90 text-xs">Rating</span>
                                </div>
                              )}
                              
                              {/* 그라데이션 오버레이 */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                                <div className="p-4 w-full">
                                  <p className="text-white font-medium">{item.title}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4">
                              <h3 className="text-base font-bold text-gray-800 group-hover:text-[#ff3e8e] transition-colors flex items-center justify-between">
                                <span className={`mr-2 ${isMobile ? 'line-clamp-1' : 'line-clamp-2'}`}>{item.title}</span>
                                {/* Rating 평점을 제목 오른쪽에 표시 (모바일용) - 별 아이콘 추가 */}
                                {isMobile && (
                                  <div className="flex-shrink-0 flex items-center bg-gradient-to-r from-amber-50 to-amber-100 px-2 py-1 rounded-full border border-amber-200">
                                    <Star size={12} className="text-amber-500 mr-1" fill="#f59e0b" />
                                    <span className="text-xs font-bold text-amber-700">
                                      {item.reviewRating != null && item.reviewRating !== undefined && parseFloat(item.reviewRating) > 0
                                        ? parseFloat(item.reviewRating) === 10 
                                          ? "10" 
                                          : parseFloat(item.reviewRating).toFixed(1)
                                        : "-"
                                      }
                                    </span>
                                  </div>
                                )}
                              </h3>
                              
                              {/* 장르 / 영화시간 영역 - 드라마 카드와 동일하게 디자인 */}
                              <div className="flex mt-2">
                                <div className="w-full overflow-hidden">
                                  <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                                    {(item.genres && Array.isArray(item.genres) && item.genres.length > 0)
                                      ? item.genres.map((genre, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-block text-xs font-medium text-pink-700 px-2 py-0.5 bg-pink-50 rounded-full mr-1 shadow-sm hover:bg-pink-100 transition-colors"
                                        >
                                          {genre && typeof genre === 'string' 
                                            ? genre.charAt(0).toUpperCase() + genre.slice(1) 
                                            : genre}
                                        </span>
                                      ))
                                      : (typeof item.genre === 'string' && item.genre.trim() !== '')
                                        ? item.genre.split(',').map((g, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-block text-xs font-medium text-pink-700 px-2 py-0.5 bg-pink-50 rounded-full mr-1 shadow-sm hover:bg-pink-100 transition-colors"
                                          >
                                            {g.trim().charAt(0).toUpperCase() + g.trim().slice(1)}
                                          </span>
                                        ))
                                        : (
                                          <span className="inline-block text-xs font-medium text-pink-700 px-2 py-0.5 bg-pink-50 rounded-full mr-1 shadow-sm hover:bg-pink-100 transition-colors">
                                            {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : "Film"}
                                          </span>
                                        )
                                    }
                                  </div>
                                </div>
                              </div>
                              
                              {/* 러닝타임 표시 */}
                              {item.runtime && (
                                <div className="flex mt-2 mb-2">
                                  <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-xs">
                                    <Clock size={12} className="mr-1 text-gray-500" />
                                    {item.runtime}
                                  </div>
                                </div>
                              )}
                              
                              {/* 시놉시스 표시 - 드라마 카드와 동일하게 */}
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
          
          {/* 오른쪽 네비게이션 버튼 - 마지막 페이지가 아닐 때만 표시, PC에서만 표시 */}
          {currentPage < totalPages && !isMobile && (
            <button 
              onClick={goToNextPage}
              disabled={isPageChanging}
              className="flex absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-3 md:translate-x-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full items-center justify-center text-white bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] hover:shadow-md transition-all duration-300 shadow-md"
              aria-label="Next Page"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
        
        {/* 모바일 View More Button */}
        {isMobile && (
          <div className="mt-6 text-center">
            <button
              onClick={toggleMobileView}
              className="px-6 py-2 bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] text-white rounded-full hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              {showMoreMobile ? "Show Less ↑" : "Show More ↓"}
            </button>
          </div>
        )}
        
        {/* 영화 관련 뉴스 섹션 - MoreNews 컴포넌트로 대체 */}
        <div className="mt-16">
          {/* MoreNews 컴포넌트 추가, category 속성에 'movie' 지정 */}
          <MoreNews initialNews={movieNews} category="movie" />
          
          {/* Add consistent bottom spacing */}
          <div className="mb-12"></div>
        </div>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  try {
    // 요청 객체에서 호스트 정보 가져오기
    const host = context.req.headers.host;
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;
    
    console.log('서버에서, 영화 및 뉴스 API 호출 시작:', baseUrl);
    
    // 영화 데이터와 영화 뉴스 데이터 병렬로 가져오기
    const [moviesResponse, movieNewsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/dramas?category=movie&limit=100&includeAllFields=true`),
      fetch(`${baseUrl}/api/news/movie?page=1&limit=12&sort=createdAt&order=desc`)
    ]);
    
    // 영화 데이터 처리
    const moviesData = await moviesResponse.json();
    console.log('영화 API 응답 상태:', moviesResponse.status);
    console.log('영화 데이터 개수:', moviesData.data?.length || 0);
    
    // 영화 뉴스 데이터 처리
    const movieNewsData = await movieNewsResponse.json();
    console.log('영화 뉴스 API 응답 상태:', movieNewsResponse.status);
    // /api/news/movie는 data가 직접 배열이므로 수정
    const movieNewsArray = Array.isArray(movieNewsData.data) ? movieNewsData.data : [];
    console.log('영화 뉴스 데이터 개수:', movieNewsArray.length);
    console.log('영화 뉴스 페이지네이션:', movieNewsData.pagination?.total || 'N/A', '건');
    
    // 뉴스 이미지 처리
    const processedNews = movieNewsArray.map(news => {
      if (!news.coverImage) {
        news.coverImage = '/images/news/default-news.jpg';
      }
      return news;
    });
    
    // 영화 이미지 처리
    const processedMovies = moviesData.data ? moviesData.data.map(movie => {
      if (!movie.coverImage) {
        movie.coverImage = '/images/dramas/default-poster.jpg';
      }
      return movie;
    }) : [];
    
    console.log('최종 전달할 영화 뉴스 데이터:', processedNews.length, '개');
    
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
        }
      }
    };
  } catch (error) {
    console.error('getServerSideProps에서 오류 발생:', error);
    return {
      props: {
        tvfilms: [],
        movieNews: [],
        newsPagination: {
          total: 0,
          page: 1,
          limit: 12,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    };
  }
}
