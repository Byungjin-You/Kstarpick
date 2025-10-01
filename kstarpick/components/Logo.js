import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Logo() {
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // 로고 클릭 핸들러
  const handleLogoClick = (e) => {
    e.preventDefault(); // 기본 동작 방지
    
    if (typeof window !== 'undefined') {
      // 스토리지 키 정의
      const STORAGE_KEYS = {
        NEWS_DATA: 'moreNewsData',
        NEWS_PAGE: 'moreNewsPage',
        GLOBAL_ID_SET: 'moreNewsLoadedIds',
        SCROLL_POS: 'moreNewsScrollPos',
        BACK_NAVIGATION: 'wasBackNavigation'
      };
      
      // 모든 관련 스토리지 항목 제거
      sessionStorage.removeItem(STORAGE_KEYS.NEWS_DATA);
      sessionStorage.removeItem(STORAGE_KEYS.NEWS_PAGE);
      sessionStorage.removeItem(STORAGE_KEYS.GLOBAL_ID_SET);
      sessionStorage.removeItem(STORAGE_KEYS.SCROLL_POS);
      sessionStorage.removeItem(STORAGE_KEYS.BACK_NAVIGATION);
      
      // Featured News 캐시도 제거
      sessionStorage.removeItem('cachedFeaturedNews');
      sessionStorage.removeItem('featuredNewsCacheTime');
      
      // Watch News 캐시도 제거
      sessionStorage.removeItem('cachedWatchNews');
      sessionStorage.removeItem('watchNewsCacheTime');
      
      // 명시적인 초기화 표시를 위한 플래그 설정
      sessionStorage.setItem('logoClicked', 'true');
      
      // 쿨다운 플래그 초기화
      window._newsLoadCooldown = false;
      window._forceNextLoad = false;
      
      // 전역 상태 초기화
      window._loadedNewsIds = new Set();
      
      console.log('[Logo] 로고 클릭 - 세션 스토리지 초기화 및 플래그 설정');
      
      // 현재 페이지가 홈페이지인지 확인
      if (router.pathname === '/' || router.asPath === '/') {
        // 홈페이지에 있을 때는 강제 새로고침 (Featured News 랜덤 시스템 작동)
        console.log('[Logo] 홈페이지에서 로고 클릭 - Featured News 새로고침');
        // 쿼리 파라미터를 추가해서 URL을 다르게 만든 후 즉시 제거
        const timestamp = Date.now();
        router.push(`/?refresh=${timestamp}`, '/', { shallow: true }).then(() => {
          // URL에서 쿼리 파라미터 제거
          window.history.replaceState({}, '', '/');
        });
      } else {
        // 다른 페이지에 있을 때는 홈페이지로 이동
        console.log('[Logo] 다른 페이지에서 로고 클릭 - 홈페이지로 이동');
        router.push('/');
      }
    }
  };
  
  // Server-side rendering - return a simpler version
  if (!isClient) {
    return (
      <div className="block cursor-pointer" onClick={handleLogoClick}>
        <div className="w-auto h-[50px] flex items-center">
          <span className="text-[#ff3e8e] font-bold text-xl">K-POP News</span>
        </div>
      </div>
    );
  }
  
  // Client-side rendering
  return (
    <div 
      className="block cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleLogoClick}
    >
      <div className={`w-auto h-[50px] relative flex items-center transition-all duration-300 ${isHovered ? 'scale-105' : ''}`}>
        <div className="flex items-center">
          {/* 음표 아이콘 */}
          <div className={`mr-2 transition-transform duration-500 ${isHovered ? 'rotate-12' : ''}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 17.25V8.25M9 17.25C9 18.4926 7.99264 19.5 6.75 19.5C5.50736 19.5 4.5 18.4926 4.5 17.25C4.5 16.0074 5.50736 15 6.75 15C7.99264 15 9 16.0074 9 17.25ZM15 14.25V5.25M15 14.25C15 15.4926 13.9926 16.5 12.75 16.5C11.5074 16.5 10.5 15.4926 10.5 14.25C10.5 13.0074 11.5074 12 12.75 12C13.9926 12 15 13.0074 15 14.25Z" 
                stroke="url(#music-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="music-gradient" x1="4.5" y1="5.25" x2="15" y2="19.5" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ff3e8e" />
                  <stop offset="1" stopColor="#ffb67b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          {/* 텍스트 로고 */}
          <div className="flex flex-col">
            <div className="flex items-baseline">
              <span className={`font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#ff3e8e] to-[#ffb67b] text-2xl tracking-tighter transition-all duration-300 ${isHovered ? 'tracking-normal' : ''}`}>
                K-POP
              </span>
              <span className="text-lg font-bold ml-1 text-gray-800">NEWS</span>
            </div>
            <span className="text-[10px] text-gray-500 font-medium -mt-1">Your Daily Korean Updates</span>
          </div>
        </div>
        
        {/* 애니메이션 효과 - 호버 시 표시되는 파티클 효과 */}
        {isHovered && (
          <div className="absolute -right-2 -top-1">
            <svg width="20" height="20" viewBox="0 0 24 24" className="animate-ping-slow opacity-80">
              <circle cx="12" cy="12" r="3" fill="#ff3e8e" />
            </svg>
          </div>
        )}
        {isHovered && (
          <div className="absolute right-1 top-6">
            <svg width="14" height="14" viewBox="0 0 24 24" className="animate-ping-slow opacity-60" style={{animationDelay: "0.2s"}}>
              <circle cx="12" cy="12" r="3" fill="#ffb67b" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
} 