import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp, Clock, ChevronRight, Star, AlertCircle, Eye, MessageCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';

const CardNews = ({ cards, featured }) => {
  const router = useRouter();
  
  // Set up featured cards - either use the provided featured prop or filter from cards
  // 최대 6개의 피처드 카드만 사용하도록 제한
  const featuredCards = featured ? featured.slice(0, 6) : cards.filter(card => card.featured).slice(0, 6);
  
  // 디버깅 로그 추가
  console.log('[CardNews] Featured prop:', featured ? featured.length : 'null', '개');
  console.log('[CardNews] Featured cards:', featuredCards.length, '개');
  if (featured && featured.length > 0) {
    console.log('[CardNews] Featured 뉴스 제목들:', featured.map(news => news.title));
  }
  
  // If we don't have enough featured cards, add some from regular cards
  if (featuredCards.length < 6) {
    const remainingNeeded = 6 - featuredCards.length;
    const nonFeaturedCards = cards.filter(card => !card.featured && !featuredCards.includes(card));
    featuredCards.push(...nonFeaturedCards.slice(0, remainingNeeded));
  }
  
  // 피처드 카드가 6개를 초과하지 않도록 확실히 제한
  const limitedFeaturedCards = featuredCards.slice(0, 6);
  
  // Get remaining cards (excluding featured ones)
  const featuredIds = limitedFeaturedCards.map(card => card.id || card._id);
  const remainingCards = cards.filter(card => !featuredIds.includes(card.id || card._id));
  
  // 가로 스크롤을 위한 참조와 상태
  const scrollContainerRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false
  });
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const currentPageKey = router.pathname; // 현재 페이지 경로를 키로 사용
  
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
  
  // 스크롤 이벤트를 통해 현재 활성화된 카드 인덱스 업데이트
  const handleScrollUpdate = useCallback(() => {
    updateScrollState();
    if (scrollContainerRef.current && remainingCards.length > 0) {
      const container = scrollContainerRef.current;
      const cardElement = container.querySelector('a');
      
      // a 요소가 없으면 첫 번째 자식 요소의 너비를 사용하거나 기본값 설정
      const cardWidth = cardElement ? cardElement.offsetWidth : 
                      (container.firstElementChild ? container.firstElementChild.offsetWidth : 320);
      const spacing = 16; // space-x-4
      const scrollPosition = container.scrollLeft;
      const newIndex = Math.round(scrollPosition / (cardWidth + spacing));
      setActiveCardIndex(Math.min(Math.max(0, newIndex), remainingCards.length - 1));
      
      // 스크롤 위치에 따라 scrolled 클래스 추가/제거
      if (scrollPosition > 0) {
        container.classList.add('scrolled');
      } else {
        container.classList.remove('scrolled');
      }
      
      // 로컬 세션 스토리지에 저장
      if (typeof window !== 'undefined') {
        try {
          const scrollPositions = JSON.parse(sessionStorage.getItem('cardNewsScrollPositions') || '{}');
          scrollPositions[currentPageKey] = scrollPosition;
          sessionStorage.setItem('cardNewsScrollPositions', JSON.stringify(scrollPositions));
        } catch (e) {
          console.error('카드뉴스 스크롤 저장 오류:', e);
        }
      }
    }
  }, [remainingCards.length, currentPageKey]);
  
  // 가로 스크롤 위치 복원 함수
  const restoreHorizontalScroll = useCallback(() => {
    if (typeof window === 'undefined' || !scrollContainerRef.current) return;
    
    try {
      const scrollPositions = JSON.parse(sessionStorage.getItem('cardNewsScrollPositions') || '{}');
      const savedPosition = scrollPositions[currentPageKey];
      
      if (savedPosition !== undefined) {
        console.log(`카드뉴스 가로 스크롤 복원: ${currentPageKey} = ${savedPosition}`);
        scrollContainerRef.current.scrollLeft = savedPosition;
        
        // 지연 후 updateScrollState 호출하여 UI 상태 갱신
        setTimeout(() => {
          updateScrollState();
          
          // 활성 카드 인덱스 업데이트
          if (scrollContainerRef.current && remainingCards.length > 0) {
            const container = scrollContainerRef.current;
            const cardElement = container.querySelector('a');
            const cardWidth = cardElement ? cardElement.offsetWidth : 
                            (container.firstElementChild ? container.firstElementChild.offsetWidth : 320);
            const spacing = 16;
            const scrollPosition = container.scrollLeft;
            const newIndex = Math.round(scrollPosition / (cardWidth + spacing));
            setActiveCardIndex(Math.min(Math.max(0, newIndex), remainingCards.length - 1));
          }
        }, 100);
      }
    } catch (e) {
      console.error('카드뉴스 스크롤 복원 오류:', e);
    }
  }, [currentPageKey, remainingCards.length]);
  
  // 스크롤 핸들러
  const handleScroll = (direction) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardElement = container.querySelector('a');
      
      // a 요소가 없으면 첫 번째 자식 요소의 너비를 사용하거나 기본값 설정
      const cardWidth = cardElement ? cardElement.offsetWidth : 
                        (container.firstElementChild ? container.firstElementChild.offsetWidth : 320);
      const spacing = 16; // space-x-4
      
      if (direction === 'left') {
        const newIndex = Math.max(0, activeCardIndex - 1);
        const newScrollPosition = newIndex * (cardWidth + spacing);
        container.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
        setActiveCardIndex(newIndex);
      } else {
        const newIndex = Math.min(remainingCards.length - 1, activeCardIndex + 1);
        const newScrollPosition = newIndex * (cardWidth + spacing);
        container.scrollTo({ left: newScrollPosition, behavior: 'smooth' });
        setActiveCardIndex(newIndex);
      }
      
      // 약간의 지연 후 스크롤 상태 업데이트
      setTimeout(() => {
        handleScrollUpdate();
      }, 300);
    }
  };
  
  // 컴포넌트 마운트 시 및 창 크기 변경 시 스크롤 상태 확인
  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    
    // 가로 스크롤 위치 복원
    restoreHorizontalScroll();
    
    return () => window.removeEventListener('resize', updateScrollState);
  }, [currentPageKey, restoreHorizontalScroll]); // 현재 페이지 경로가 변경될 때마다 실행

  // If we have no cards at all, show a placeholder
  if (!cards || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl shadow-md p-8">
        <AlertCircle size={48} className="mb-4 text-pink-300 animate-pulse" />
        <p className="text-lg font-medium text-gray-700">No news articles available</p>
        <p className="text-sm text-gray-500 mt-2">Check back later for updates</p>
      </div>
    );
  }

  // Ensure we have at least one featured card for the hero section
  const heroCard = limitedFeaturedCards.length > 0 ? limitedFeaturedCards[0] : cards[0];

  return (
    <div className="mt-4 space-y-8">
      {/* Featured Cards */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="w-2 h-16 bg-gradient-to-b from-purple-600 to-pink-500 rounded-full mr-5"></div>
            <div>
              <span className="text-pink-600 text-sm font-semibold tracking-wider uppercase mb-1 block">Editor's Picks</span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Featured News</h2>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {limitedFeaturedCards.map((card, index) => (
            <Link 
              key={card._id || card.id}
              href={`/news/${card.slug || card._id || card.id}`}
              passHref
            >
              <div 
                className="bg-white rounded-xl overflow-hidden transition-all duration-300 group relative cursor-pointer"
              >
                <div className="h-56 overflow-hidden relative">
                  {/* 이미지 */}
                  {card.coverImage ? (
                    <img 
                      src={card.coverImage} 
                      alt={card.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-xl"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/placeholder.jpg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span>Image Placeholder</span>
                    </div>
                  )}
                  
                  {/* Add top decorative element */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8e44ad] via-[#9b59b6] to-[#d35400] opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* 카테고리 배지 */}
                  <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20">
                    <span className="px-2 py-1 md:px-3 md:py-1.5 text-white text-xs font-medium rounded-full backdrop-blur-sm shadow-md" 
                          style={{ background: 'linear-gradient(to right, #9333ea, #ec4899)' }}>
                      {card.category || 'K-POP'}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#8e44ad] transition-colors">
                    {card.title}
                  </h3>
                  
                  <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                    {card.content && card.content.trim()
                      ? card.content.replace(/<[^>]*>/g, '').slice(0, 120) + '...'
                      : card.summary 
                        ? card.summary.slice(0, 120) + '...'
                        : 'No content available'}
                  </p>
                  
                  <div className="flex justify-between items-end">
                    {/* 시간 배지 */}
                    <div className="flex items-center text-gray-500 text-xs">
                      <Clock size={12} className="mr-1 text-[#9b59b6]" />
                      <span>{new Date(card.createdAt || card.date).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Read more 버튼 */}
                    <span className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-xs font-medium hover:underline cursor-pointer group">
                      Read more <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Categories */}
      <section className="mt-8 md:rounded-3xl md:p-8 latest-news-section" style={{ backgroundColor: 'transparent', padding: '1rem 0 1.5rem 0' }}>
        {/* 제목 영역 - 여백 제거 및 모바일 왼쪽 정렬 */}
        <div className="px-0 mb-8">
          <div className="flex items-center">
            <div className="w-2 h-16 bg-gradient-to-b from-purple-600 to-pink-500 rounded-full mr-5"></div>
            <div>
              <span className="text-pink-600 text-sm font-semibold tracking-wider uppercase mb-1 block">What's New</span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
                <TrendingUp size={28} className="text-pink-600 mr-3" />
                <span className="inline-block">Latest News</span>
                
                {/* 스크롤 안내 추가 */}
                <span className="ml-3 text-sm font-normal text-gray-500 hidden md:inline-block">
                  (Scroll for more)
                </span>
              </h2>
            </div>
          </div>
        </div>
        
        {/* 스크롤 컨테이너 */}
        <div className="relative md:px-0">
          {/* 스크롤 버튼 - 데스크톱에서만 표시 */}
          <button 
            onClick={() => handleScroll('left')} 
            className={`absolute -left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-white shadow-md rounded-full text-pink-600 border border-pink-100 hidden md:block
              ${scrollState.canScrollLeft ? 'opacity-80 hover:opacity-100' : 'opacity-0 cursor-default pointer-events-none'} transition-opacity`}
            disabled={!scrollState.canScrollLeft}
            aria-label="Scroll left"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory scroll-smooth pl-0 pr-4 md:px-8"
            onScroll={handleScrollUpdate}
            style={{
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none', /* IE and Edge */
              background: 'transparent'
            }}
          >
            {/* 모바일에서 스크롤 힌트 - 원형 버튼만 표시하고 배경 제거 */}
            {activeCardIndex === 0 && (
              <button 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 md:hidden w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center border-2 border-pink-500 animate-pulse pointer-events-none"
                style={{ background: 'white' }}
                aria-hidden="true"
              >
                <ChevronRight size={22} className="text-pink-600" strokeWidth={2.5} />
              </button>
            )}
            
            {remainingCards.map((card, index) => (
              <Link
                key={card._id || card.id}
                href={`/news/${card._id || card.id}`}
                passHref
              >
                <div 
                  className={`flex-shrink-0 w-[67%] min-w-[230px] md:w-[320px] snap-center transition-all duration-300 cursor-pointer mr-4 md:mr-6 ${
                    activeCardIndex === index 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-90 scale-98 md:opacity-100 md:scale-100'
                  } ${index === 0 ? 'pl-0' : ''}`}
                >
                  <div className="bg-white rounded-xl overflow-hidden transition-all duration-300 group relative h-full mx-0">
                    <div className="h-56 md:h-56 overflow-hidden relative">
                      {card.coverImage ? (
                        <img
                          src={card.coverImage}
                          alt={card.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-xl"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/images/placeholder.jpg";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span>Image Placeholder</span>
                        </div>
                      )}
                      
                      {/* Add top decorative element */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8e44ad] via-[#9b59b6] to-[#d35400] opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* 카테고리 배지 */}
                      <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20">
                        <span className="px-2 py-1 md:px-3 md:py-1.5 text-white text-xs font-medium rounded-full backdrop-blur-sm shadow-md"
                              style={{ background: 'linear-gradient(to right, #9333ea, #ec4899)' }}>
                          {card.category || 'News'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#8e44ad] transition-colors">
                        {card.title}
                      </h3>
                      
                      <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                        {card.content && card.content.trim()
                          ? card.content.replace(/<[^>]*>/g, '').slice(0, 120) + '...'
                          : card.summary 
                            ? card.summary.slice(0, 120) + '...'
                            : 'No content available'}
                      </p>
                      
                      <div className="flex justify-between items-end">
                        {/* 시간 배지 */}
                        <div className="flex items-center text-gray-500 text-xs">
                          <Clock size={12} className="mr-1 text-[#9b59b6]" />
                          <span>{new Date(card.createdAt || card.date).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Read more 버튼 */}
                        <span className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-xs font-medium hover:underline cursor-pointer group">
                          Read more <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          <button 
            onClick={() => handleScroll('right')} 
            className={`absolute -right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-white shadow-md rounded-full text-pink-600 border border-pink-100 hidden md:block
              ${scrollState.canScrollRight ? 'opacity-80 hover:opacity-100' : 'opacity-0 cursor-default pointer-events-none'} transition-opacity`}
            disabled={!scrollState.canScrollRight}
            aria-label="Scroll right"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default CardNews; 