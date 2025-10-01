import { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Instagram, Twitter, Youtube, Music, Star, Heart, Users, ChevronRight, Award, Globe, Clock, ChevronLeft } from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import Seo from '../../components/Seo';
import { formatCompactNumber } from '../../utils/formatHelpers';
import MoreNews from '../../components/MoreNews';
import { generateWebsiteJsonLd } from '../../utils/seoHelpers';

// HTML 태그 제거 및 텍스트 추출 함수
const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
};

// 텍스트 길이 제한 함수 (말줄임표 추가)
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// 소셜 미디어 아이콘 매핑
const SocialIconMap = {
  instagram: <Instagram className="text-pink-500" size={18} />,
  twitter: <Twitter className="text-blue-400" size={18} />,
  youtube: <Youtube className="text-red-500" size={18} />,
  spotify: <Music className="text-green-500" size={18} />
};

export default function CelebrityListPage({ celebrities = [], celebNews = [] }) {
  const [currentCelebPage, setCurrentCelebPage] = useState(0); // 현재 표시되는 셀럽 페이지
  const [isPageChanging, setIsPageChanging] = useState(false); // 페이지 전환 애니메이션 상태
  const [slideDirection, setSlideDirection] = useState('right'); // 슬라이드 방향 ('left' 또는 'right')
  const [isMobile, setIsMobile] = useState(false); // 모바일 여부 상태 추가
  const mobileCelebsPerPage = 4; // 모바일에서 한 페이지에 표시할 셀럽 수(2x2)
  const desktopCelebsPerPage = 5; // 데스크톱에서 한 페이지에 표시할 셀럽 수
  const animationDuration = 300; // 애니메이션 지속 시간 (밀리초)
  const scrollContainerRef = useRef(null); // 스크롤 컨테이너 참조 추가
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false }); // 스크롤 상태
  const [activeCardIndex, setActiveCardIndex] = useState(0); // 활성 카드 인덱스
  const [sortedCelebrities, setSortedCelebrities] = useState([]);
  
  // SNS 팔로워 총합 계산 함수
  const getTotalFollowers = (celeb) => {
    if (!celeb.socialMediaFollowers) return 0;
    return Object.values(celeb.socialMediaFollowers).reduce((sum, count) => sum + count, 0);
  };

  // 셀럽 데이터 정렬
  useEffect(() => {
    const sorted = [...celebrities].sort((a, b) => {
      return getTotalFollowers(b) - getTotalFollowers(a);
    });
    setSortedCelebrities(sorted);
  }, [celebrities]);

  // 화면 크기 감지
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    
    // 초기 설정
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
      const spacing = 16; // space-x-4
      
      if (direction === 'left') {
        const newIndex = Math.max(0, activeCardIndex - 1);
        const newScrollPosition = newIndex * (cardWidth + spacing);
        container.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
        setActiveCardIndex(newIndex);
      } else {
        const newIndex = Math.min(sortedCelebrities.length - 1, activeCardIndex + 1);
        const newScrollPosition = newIndex * (cardWidth + spacing);
        container.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
        setActiveCardIndex(newIndex);
      }
      
      // 약간의 지연 후 스크롤 상태 업데이트
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
      const spacing = 16; // space-x-4
      const scrollPosition = container.scrollLeft;
      const newIndex = Math.round(scrollPosition / (cardWidth + spacing));
      setActiveCardIndex(Math.min(Math.max(0, newIndex), sortedCelebrities.length - 1));
    }
  };
  
  // 컴포넌트 마운트 시 및 창 크기 변경 시 스크롤 상태 확인
  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, []);
  
  // 현재 화면 크기에 따라 페이지당 표시할 셀럽 수 결정
  const celebsPerPage = useMemo(() => 
    isMobile ? mobileCelebsPerPage : desktopCelebsPerPage
  , [isMobile]);
  
  // 현재 페이지에 표시할 셀럽 계산
  const paginatedCelebs = useMemo(() => {
    const startIdx = currentCelebPage * celebsPerPage;
    return sortedCelebrities.slice(startIdx, startIdx + celebsPerPage);
  }, [sortedCelebrities, currentCelebPage, celebsPerPage]);
  
  // 총 페이지 수 계산
  const totalPages = useMemo(() => 
    Math.ceil(sortedCelebrities.length / celebsPerPage)
  , [sortedCelebrities, celebsPerPage]);
  
  // 현재 화면 크기가 변경되었을 때 현재 페이지 조정
  useEffect(() => {
    // 페이지 전환 중에는 처리하지 않음
    if (isPageChanging) return;
    
    // 현재 페이지가 새 페이지 수보다 크면 마지막 페이지로 조정
    if (currentCelebPage >= totalPages && totalPages > 0) {
      setCurrentCelebPage(totalPages - 1);
    }
  }, [celebsPerPage, totalPages, currentCelebPage, isPageChanging]);
  
  // 페이지 이동 함수
  const goToPrevPage = () => {
    if (currentCelebPage > 0 && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('left');
      
      // 즉시 페이지 변경
      setCurrentCelebPage(currentCelebPage - 1);
      
      // 애니메이션이 완료되면 페이지 변경 상태 해제
      setTimeout(() => {
        setIsPageChanging(false);
      }, animationDuration / 2); // 애니메이션이 절반만 진행되어도 상태 해제
    }
  };
  
  const goToNextPage = () => {
    if ((currentCelebPage + 1) * celebsPerPage < sortedCelebrities.length && !isPageChanging) {
      setIsPageChanging(true);
      setSlideDirection('right');
      
      // 즉시 페이지 변경
      setCurrentCelebPage(currentCelebPage + 1);
      
      // 애니메이션이 완료되면 페이지 변경 상태 해제
      setTimeout(() => {
        setIsPageChanging(false);
      }, animationDuration / 2); // 애니메이션이 절반만 진행되어도 상태 해제
    }
  };
  
  // 특정 페이지로 이동하는 함수
  const goToPage = (pageNumber) => {
    if (pageNumber >= 0 && pageNumber < totalPages && !isPageChanging && pageNumber !== currentCelebPage) {
      setIsPageChanging(true);
      setSlideDirection(pageNumber > currentCelebPage ? 'right' : 'left');
      
      // 즉시 페이지 변경
      setCurrentCelebPage(pageNumber);
      
      // 애니메이션이 완료되면 페이지 변경 상태 해제
      setTimeout(() => {
        setIsPageChanging(false);
      }, animationDuration / 2); // 애니메이션이 절반만 진행되어도 상태 해제
    }
  };
  
  // 이미지 에러 핸들러
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/images/placeholder.jpg';
  };
  
  // 가장 많은 팔로워 수를 가진 소셜 미디어 플랫폼 찾기
  const getTopPlatform = (socialMediaFollowers) => {
    if (!socialMediaFollowers) return { platform: null, count: 0 };
    
    const platforms = Object.entries(socialMediaFollowers);
    if (platforms.length === 0) return { platform: null, count: 0 };
    
    const topPlatform = platforms.reduce((max, [platform, count]) => 
      count > max.count ? { platform, count } : max, 
      { platform: platforms[0][0], count: platforms[0][1] }
    );
    
    return topPlatform;
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
      
      <div className="container mx-auto px-4 py-12">
        {/* Enhanced Header with Animated Elements */}
        <div className="mb-8 relative">
          <div className="absolute -top-10 -left-6 w-32 h-32 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute top-12 right-20 w-40 h-40 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-40"></div>
          
          <div className="relative z-10">
            <div className="flex items-center mb-1">
              <div className="h-1.5 w-16 bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] rounded-full mr-3"></div>
              <Star size={20} className="text-[#ff3e8e] animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#ff3e8e] via-[#ff8360] to-[#ff61ab] text-transparent bg-clip-text ml-2">
                K-POP Celebrities
              </h1>
            </div>
            <p className="text-gray-500 text-sm mt-2">Discover the most popular K-POP artists and their social media stats</p>
          </div>
        </div>
        
        {/* Celebrity Grid with Navigation - PC 전용 */}
        {celebrities.length > 0 ? (
          <>
            {/* 데스크톱 그리드 레이아웃 */}
            <div className="rounded-3xl mb-16 relative hidden md:block">
              <div 
                key={`celeb-page-${currentCelebPage}`} 
                className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 transition-all duration-300 
                  ${isPageChanging ? 'opacity-70 ' + (slideDirection === 'right' ? 'translate-x-4' : '-translate-x-4') : 'opacity-100 translate-x-0'}`}
              >
                {paginatedCelebs.map((celeb, index) => {
                  const topPlatform = getTopPlatform(celeb.socialMediaFollowers);
                  const isSolo = celeb.category === 'solo';
                  
                  return (
                    <Link 
                      key={celeb._id} 
                      href={`/celeb/${celeb.slug}`} 
                      className={`block group transition-all duration-300 
                        ${isPageChanging ? 'opacity-60 scale-98' : 'opacity-100 scale-100'}
                      `}
                      style={{ 
                        transitionDelay: !isPageChanging ? `${index * 40}ms` : '0ms',
                        transform: isPageChanging ? (slideDirection === 'right' ? 'translateX(10px)' : 'translateX(-10px)') : 'translateX(0)'
                      }}
                    >
                      <div className="relative bg-gradient-to-b from-white to-gray-50 rounded-2xl overflow-hidden shadow-sm border border-gray-100 group-hover:shadow-lg transition-all duration-500 h-full min-h-[220px] sm:min-h-[400px] transform group-hover:-translate-y-1">
                        {/* Glass effect card border */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 z-0"></div>
                        
                        {/* 이미지 */}
                        <div className="aspect-[2/3] min-h-[160px] sm:min-h-[300px] relative overflow-hidden rounded-t-2xl">
                          <img 
                            src={celeb.profileImage} 
                            alt={celeb.name}
                            className="object-cover object-top w-full h-full group-hover:scale-110 transition-transform duration-700 filter group-hover:brightness-110"
                            onError={handleImageError}
                          />
                          
                          {/* 컬러 오버레이 - Group별 컬러 스타일 */}
                          <div 
                            className={`absolute inset-0 opacity-0 group-hover:opacity-80 transition-opacity duration-500 mix-blend-overlay ${
                              isSolo 
                                ? 'bg-gradient-to-tl from-pink-400 via-pink-500 to-transparent' 
                                : 'bg-gradient-to-tl from-purple-400 via-indigo-500 to-transparent'
                            }`}
                          ></div>
                          
                          {/* 셀럽 카테고리 뱃지를 썸네일 왼쪽 상단으로 이동 */}
                          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                            <div className={`
                              px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-medium backdrop-blur-sm shadow-sm
                              ${isSolo 
                                ? 'bg-pink-500/70 text-white' 
                                : 'bg-purple-500/70 text-white'
                              }
                            `}>
                              {isSolo ? 'Solo' : 'Group'}
                            </div>
                          </div>
                          
                          {/* 호버 시 나타나는 소셜 링크 - 모바일에서는 더 작게 */}
                          {celeb.socialMedia && Object.values(celeb.socialMedia).some(url => url) && (
                            <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 z-10">
                              <div className="flex justify-end space-x-1 sm:space-x-2">
                                {celeb.socialMedia.instagram && (
                                  <a 
                                    href={celeb.socialMedia.instagram} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1.5 sm:p-2.5 bg-white/30 backdrop-blur-md hover:bg-white/50 rounded-full transform hover:scale-110 transition-all duration-300 shadow-md"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Instagram size={12} className="text-white sm:hidden" />
                                    <Instagram size={17} className="text-white hidden sm:block" />
                                  </a>
                                )}
                                {celeb.socialMedia.twitter && (
                                  <a 
                                    href={celeb.socialMedia.twitter} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1.5 sm:p-2.5 bg-white/30 backdrop-blur-md hover:bg-white/50 rounded-full transform hover:scale-110 transition-all duration-300 shadow-md"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Twitter size={12} className="text-white sm:hidden" />
                                    <Twitter size={17} className="text-white hidden sm:block" />
                                  </a>
                                )}
                                {celeb.socialMedia.youtube && (
                                  <a 
                                    href={celeb.socialMedia.youtube} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-1.5 sm:p-2.5 bg-white/30 backdrop-blur-md hover:bg-white/50 rounded-full transform hover:scale-110 transition-all duration-300 shadow-md"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Youtube size={12} className="text-white sm:hidden" />
                                    <Youtube size={17} className="text-white hidden sm:block" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* 정보 섹션 - 모바일에서는 더 작게 */}
                        <div className="p-2 sm:p-4 pt-2 pb-3 sm:pt-3 sm:pb-4 relative z-10">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-gray-800 group-hover:text-[#ff3e8e] transition-colors line-clamp-1 text-xs sm:text-base">
                              {celeb.name}
                            </h3>
                            
                            {/* 소속사 정보를 오른쪽으로 이동 - 모바일에서는 더 작게 */}
                            {celeb.agency && (
                              <div className="flex items-center text-[9px] sm:text-xs text-gray-500 gap-0.5 sm:gap-1 bg-gray-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                                <Globe size={8} className="sm:hidden" />
                                <Globe size={11} className="hidden sm:block" />
                                <span className="truncate max-w-[50px] sm:max-w-[80px]">{celeb.agency}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* 소셜 미디어 팔로워 - 모바일에서는 더 단순하게 */}
                          {celeb.socialMediaFollowers && Object.keys(celeb.socialMediaFollowers).length > 0 && (
                            <div className="mt-1.5 pt-1.5 sm:mt-3 sm:pt-3 border-t border-gray-100/70">
                              <div className="flex justify-between items-center">
                                {/* 가장 인기 있는 플랫폼만 표시 - 모바일에서 더 작게 */}
                                <div className="hidden sm:flex items-center gap-1.5 text-xs bg-white px-2.5 py-1.5 rounded-full border border-gray-100 shadow-sm">
                                  {SocialIconMap[topPlatform.platform] || <Star size={14} className="text-yellow-400" />}
                                  <span className="font-medium text-gray-700">
                                    {formatCompactNumber(topPlatform.count)}
                                  </span>
                                </div>
                                
                                {/* 총 팔로워 수 표시 - 모바일에서 더 작게 */}
                                <div className="flex items-center text-[9px] sm:text-xs bg-pink-50 px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-full w-full sm:w-auto justify-center sm:justify-start">
                                  <Heart size={10} className="text-[#ff3e8e] mr-1 sm:mr-1.5" />
                                  <span className="font-semibold text-gray-600">
                                    {formatCompactNumber(
                                      Object.values(celeb.socialMediaFollowers).reduce((sum, count) => sum + count, 0)
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* 좋아요 버튼 - 모바일에서는 더 작게 */}
                        <button 
                          className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-white/40 backdrop-blur-md rounded-full hover:bg-white/60 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-md transform group-hover:scale-110 z-10"
                          onClick={(e) => {
                            e.preventDefault();
                            // 좋아요 기능 추가 예정
                          }}
                        >
                          <Heart size={12} className="text-white hover:text-[#ff3e8e] sm:hidden" />
                          <Heart size={17} className="text-white hover:text-[#ff3e8e] hidden sm:block" />
                        </button>
                      </div>
                    </Link>
                  );
                })}
              </div>
              
              {/* 새로운 화살표 네비게이션 버튼 - TV 및 영화 디자인 적용 */}
              {/* 왼쪽 네비게이션 버튼 - 첫 페이지가 아닐 때만 표시 */}
              {currentCelebPage > 0 && (
                <button 
                  onClick={goToPrevPage}
                  disabled={isPageChanging}
                  aria-label="Previous page"
                  className="flex absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-3 md:-translate-x-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full items-center justify-center text-white bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] hover:shadow-md transition-all duration-300 shadow-md"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              
              {/* 오른쪽 네비게이션 버튼 - 마지막 페이지가 아닐 때만 표시 */}
              {currentCelebPage < totalPages - 1 && (
                <button 
                  onClick={goToNextPage}
                  disabled={isPageChanging}
                  aria-label="Next page"
                  className="flex absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-3 md:translate-x-6 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full items-center justify-center text-white bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] hover:shadow-md transition-all duration-300 shadow-md"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
            
            {/* 모바일 가로 스크롤 레이아웃 - Latest News 스타일 */}
            <div className="md:hidden mt-8 mb-12">
              {/* 스크롤 컨테이너 */}
              <div className="relative">
                <div 
                  ref={scrollContainerRef}
                  className="flex overflow-x-auto pb-4 space-x-4 hide-scrollbar px-6 snap-x snap-mandatory scroll-smooth"
                  onScroll={handleScrollUpdate}
                  style={{
                    scrollbarWidth: 'none', /* Firefox */
                    msOverflowStyle: 'none', /* IE and Edge */
                    paddingLeft: '1.5rem',
                  }}
                >
                  {sortedCelebrities
                    .slice(0, 30)
                    .map((celeb, index) => {
                    const isSolo = celeb.category === 'solo';
                    return (
                      <Link 
                        href={`/celeb/${celeb.slug}`} 
                        key={celeb._id} 
                        className={`flex-shrink-0 w-[48%] snap-center transition-all duration-300 ${
                          activeCardIndex === index 
                            ? 'opacity-100 scale-100' 
                            : 'opacity-90 scale-95'
                        } ${index === 0 ? 'ml-6' : ''}`}
                      >
                        <div className="bg-white overflow-hidden transition-all duration-300 group relative h-full">
                          <div className="aspect-[3/4] overflow-hidden relative">
                            <img 
                              src={celeb.profileImage} 
                              alt={celeb.name}
                              className="object-cover object-top w-full h-full group-hover:scale-105 transition-transform duration-500"
                              onError={handleImageError}
                            />
                            
                            {/* 셀럽 카테고리 뱃지 */}
                            <div className="absolute top-2 left-2 z-10">
                              <div className={`
                                px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm
                                ${isSolo 
                                  ? 'bg-pink-500/80 text-white' 
                                  : 'bg-purple-500/80 text-white'
                                }
                              `}>
                                {isSolo ? 'Solo' : 'Group'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-1">
                              {celeb.name}
                            </h3>
                            
                            {celeb.agency && (
                              <div className="flex items-center text-xs text-gray-500 mb-2">
                                <Globe size={10} className="mr-1" />
                                <span className="truncate">{celeb.agency}</span>
                              </div>
                            )}
                            
                            {celeb.socialMediaFollowers && Object.keys(celeb.socialMediaFollowers).length > 0 && (
                              <div className="flex items-center text-xs bg-pink-50 px-2 py-1 rounded-full w-full justify-center">
                                <Heart size={10} className="text-[#ff3e8e] mr-1" />
                                <span className="font-semibold text-gray-600">
                                  {formatCompactNumber(
                                    Object.values(celeb.socialMediaFollowers).reduce((sum, count) => sum + count, 0)
                                  )}
                                </span>
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
        
        {/* 셀럽 뉴스 영역을 MoreNews 컴포넌트로 대체 */}
        <MoreNews category={['celeb', 'variety']} initialNews={celebNews} />
        
        {/* 페이지 하단 여백 조정 */}
        <div className="mb-12"></div>
        
        {/* 애니메이션 스타일 추가 */}
        <style jsx>{`
          .animate-shimmer {
            background-size: 800px 100%;
            animation: shimmer 2s infinite linear;
          }
          @keyframes shimmer {
            0% {
              background-position: -400px 0;
            }
            100% {
              background-position: 400px 0;
            }
          }
        `}</style>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps() {
  try {
    // 서버 URL 설정
    const server = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:13001' 
      : 'http://localhost:3000';
    
    console.log('서버에서 셀럽 API 호출 시작');
    console.log('API URL:', `${server}/api/celeb?limit=50&active=true`);
    
    // 셀럽 데이터와 셀럽 뉴스, 버라이어티 뉴스 데이터 병렬로 가져오기
    const [celebResponse, celebNewsResponse, varietyNewsResponse] = await Promise.all([
      fetch(`${server}/api/celeb?limit=50&active=true`),
      fetch(`${server}/api/news/celeb?limit=100`), // 최대 100개 뉴스를 가져오도록 수정
      fetch(`${server}/api/news?category=variety&limit=100&sort=createdAt&order=desc`) // 버라이어티 뉴스 가져오기
    ]);
    
    // 셀럽 데이터 처리
    const celebData = await celebResponse.json();
    console.log('셀럽 API 응답:', celebData.success ? '성공' : '실패', '데이터 개수:', celebData.data?.celebrities?.length || 0);
    
    // 셀럽 뉴스 데이터 처리
    const celebNewsData = await celebNewsResponse.json();
    console.log('셀럽 뉴스 API 응답:', celebNewsData.success ? '성공' : '실패', '데이터 개수:', celebNewsData.data?.length || 0);
    
    // 버라이어티 뉴스 데이터 처리
    const varietyNewsData = await varietyNewsResponse.json();
    // /api/news는 data.news 형식이므로 그대로 유지
    console.log('버라이어티 뉴스 API 응답:', varietyNewsData.success ? '성공' : '실패', '데이터 개수:', varietyNewsData.data?.news?.length || 0);
    
    // 셀럽 뉴스 이미지 처리
    const processedCelebNews = celebNewsData.success && celebNewsData.data ? celebNewsData.data.map(news => {
      if (!news.coverImage) {
        news.coverImage = '/images/news/default-news.jpg';
      }
      return news;
    }) : [];
    
    // 버라이어티 뉴스 이미지 처리
    const processedVarietyNews = varietyNewsData.success && varietyNewsData.data && varietyNewsData.data.news ? 
      varietyNewsData.data.news.map(news => {
        if (!news.coverImage) {
          news.coverImage = '/images/news/default-news.jpg';
        }
        return news;
      }) : [];
    
    // 두 카테고리의 뉴스 결합
    const combinedNews = [...processedCelebNews, ...processedVarietyNews];
    
    // 중복 제거 및 날짜 기준 정렬
    const uniqueNewsIds = new Set();
    const uniqueNews = combinedNews
      .filter(news => {
        const id = news._id || news.id;
        if (!id || uniqueNewsIds.has(id)) return false;
        uniqueNewsIds.add(id);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 데이터 성공적으로 가져왔는지 확인
    if (celebData.success && celebData.data && celebData.data.celebrities) {
      return {
        props: {
          celebrities: celebData.data.celebrities,
          celebNews: uniqueNews
        }
      };
    }
    
    // 데이터를 가져오지 못한 경우
    return {
      props: {
        celebrities: [],
        celebNews: uniqueNews
      }
    };
  } catch (error) {
    console.error('셀럽 데이터 가져오기 오류:', error);
    return {
      props: {
        celebrities: [],
        celebNews: []
      }
    };
  }
} 