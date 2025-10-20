import Image from 'next/image';
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
        <div className="w-auto h-[40px] flex items-center">
          <Image
            src="/images/KSTARPICK Logo - Emblem Style, Futuristic Aesthetic.png"
            alt="Kstarpick Logo"
            width={135}
            height={40}
            className="object-contain"
            priority
          />
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
      <div className={`w-auto h-[40px] relative flex items-center transition-all duration-300 ${isHovered ? 'scale-105' : ''}`}>
        <div className="flex items-center">
          {/* 이미지 로고 */}
          <Image
            src="/images/KSTARPICK Logo - Emblem Style, Futuristic Aesthetic.png"
            alt="Kstarpick Logo"
            width={135}
            height={40}
            className="object-contain"
            priority
          />
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