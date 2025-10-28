import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, User, Users } from 'lucide-react';

const CastSection = ({ cast = [], onActorClick }) => {
  const [isMobile, setIsMobile] = useState(false);
  const castContainerRef = useRef(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: true
  });

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 스크롤 상태 업데이트
  const updateScrollState = () => {
    if (castContainerRef.current) {
      const container = castContainerRef.current;
      const canScrollLeft = container.scrollLeft > 0;
      const canScrollRight = container.scrollWidth > container.clientWidth + container.scrollLeft;
      
      setScrollState({ canScrollLeft, canScrollRight });
    }
  };

  // 스크롤 이벤트 리스너
  useEffect(() => {
    const container = castContainerRef.current;
    if (container) {
      updateScrollState();
      
      const handleScroll = () => {
        updateScrollState();
      };
      
      container.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', updateScrollState);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', updateScrollState);
      };
    }
  }, [cast]);

  // 스크롤 함수
  const scrollCast = (direction) => {
    if (castContainerRef.current) {
      const container = castContainerRef.current;
      const scrollAmount = isMobile ? 180 : 300;
      
      if (direction === 'left') {
        container.scrollTo({ 
          left: Math.max(0, container.scrollLeft - scrollAmount), 
          behavior: 'smooth' 
        });
      } else {
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        container.scrollTo({ 
          left: Math.min(maxScrollLeft, container.scrollLeft + scrollAmount), 
          behavior: 'smooth' 
        });
      }
    }
  };

  // 배우 클릭 핸들러
  const handleActorClick = (actor) => {
    if (onActorClick) {
      onActorClick(actor);
    }
  };

  if (!cast || cast.length === 0) {
    return (
      <div id="cast" className="mb-14 scroll-mt-24">
        <h2 className="text-2xl font-bold mb-5 text-gray-900 py-1">
          Cast
        </h2>
        <div className="w-full text-center py-10">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No cast information available</p>
          <p className="text-gray-400 text-sm mt-1">Cast details coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div id="cast" className="mb-14 scroll-mt-24">
      <h2 className="text-2xl font-bold mb-5 text-gray-900 py-1">
        Cast
      </h2>
      
      <div className="relative">
        <div 
          className="overflow-x-auto pb-4 hide-scrollbar" 
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory',
            display: 'flex',
            gap: '0.5rem',
            boxShadow: 'none',
            willChange: 'scroll-position',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: 1000,
            overscrollBehavior: 'contain'
          }}
          ref={castContainerRef}
        >
          {cast.map((actor, index) => (
            <div 
              key={index} 
              className="w-[90px] flex-shrink-0 group cursor-pointer"
              style={{ scrollSnapAlign: 'center' }}
              onClick={() => handleActorClick(actor)}
            >
              <div className="relative w-[90px] h-[120px] rounded-lg bg-gray-100 overflow-hidden border border-gray-100 transition-all group-hover:border-[#233cfa]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                {actor.image || actor.profileImage ? (
                  <Image 
                    src={actor.image || actor.profileImage}
                    alt={actor.name || 'Actor'}
                    fill
                    sizes="90px"
                    loading="lazy"
                    className="object-cover object-top"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/images/placeholder-tvfilm.jpg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-gray-200 to-gray-300 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center mb-1">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-xs text-gray-600 bg-white/80 px-2 py-0.5 rounded-full">No Image</div>
                  </div>
                )}
                <div className="absolute left-0 right-0 bottom-0 p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-all">
                  <p className="text-xs text-white line-clamp-2">Known for roles in Korean dramas and films</p>
                </div>
                <div className="absolute top-2 right-2 w-5 h-5 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-sm text-gray-900 font-medium group-hover:text-[#233cfa] transition-colors line-clamp-1">
                  {actor.name || 'Unknown Actor'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {actor.role || actor.character || 'Unknown Role'}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* 스크롤 네비게이션 버튼 */}
        {cast.length > 4 && (
          <>
            <div className={`absolute top-1/2 -right-4 transform -translate-y-1/2 ${
              scrollState.canScrollRight ? 'visible' : 'invisible'
            }`}>
              <button
                onClick={() => scrollCast('right')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 transition-all group"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#233cfa';
                  e.currentTarget.style.borderColor = '#233cfa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#4b5563';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className={`absolute top-1/2 -left-4 transform -translate-y-1/2 ${
              scrollState.canScrollLeft ? 'visible' : 'invisible'
            }`}>
              <button
                onClick={() => scrollCast('left')}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 transition-all group"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#233cfa';
                  e.currentTarget.style.borderColor = '#233cfa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#4b5563';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <ChevronRight className="w-5 h-5 rotate-180 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CastSection; 