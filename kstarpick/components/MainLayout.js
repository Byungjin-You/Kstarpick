import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { ArrowUp } from 'lucide-react';
import { useRouter } from 'next/router';

const MainLayout = ({ children }) => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const router = useRouter();

  // 스크롤 위치에 따라 버튼 표시 여부 결정
  useEffect(() => {
    const checkScroll = () => {
      // body.scrollTop을 우선 확인 (이 사이트에서는 body가 스크롤됨)
      const scrollY = document.body.scrollTop || window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      setShowBackToTop(scrollY > 300);
    };

    // 초기 체크
    checkScroll();

    // body, window, document 모두에 이벤트 리스너 등록
    document.body.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('scroll', checkScroll, { passive: true });
    document.addEventListener('scroll', checkScroll, { passive: true });

    // 주기적으로도 체크 (fallback)
    const interval = setInterval(checkScroll, 500);

    return () => {
      document.body.removeEventListener('scroll', checkScroll);
      window.removeEventListener('scroll', checkScroll);
      document.removeEventListener('scroll', checkScroll);
      clearInterval(interval);
    };
  }, [router.pathname]);

  // 맨 위로 스크롤 함수
  const scrollToTop = () => {
    // body가 스크롤되므로 body.scrollTop을 0으로 설정
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 현재 페이지에 따라 body 클래스 추가
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // 기존 page-* 클래스 제거
      document.body.classList.forEach(className => {
        if (className.startsWith('page-')) {
          document.body.classList.remove(className);
        }
      });
      
      // 현재 페이지 경로에 맞는 클래스 추가
      const path = router.pathname.split('/')[1] || 'home';
      document.body.classList.add(`page-${path}`);
    }
  }, [router.pathname]);
  
  // 페이지 로드 시 스크롤 위치 복원
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 현재 페이지 경로
    const currentPath = window.location.pathname;

    // 홈페이지에서는 _app.js에서 스크롤 복원 처리하므로 여기서는 건너뜀
    if (currentPath === '/') {
      return;
    }

    // 뉴스 상세 페이지에서는 [id].js에서 스크롤 복원 처리하므로 여기서는 건너뜀
    if (currentPath.startsWith('/news/')) {
      return;
    }

    // 브라우저 네비게이션 유형 확인
    const navigation = window.performance?.getEntriesByType('navigation')?.[0];
    const isBackForwardNavigation = navigation && navigation.type === 'back_forward';

    if (isBackForwardNavigation) {

      // 저장된 스크롤 위치 복원 (여러 저장소에서 시도)
      const scrollPositions = JSON.parse(sessionStorage.getItem('scrollPositions') || '{}');
      const lastPath = sessionStorage.getItem('lastPath');
      const lastPosition = parseInt(sessionStorage.getItem('lastScrollPosition'), 10);
      const localLastPath = localStorage.getItem('lastPath');
      const localLastPosition = parseInt(localStorage.getItem('lastScrollPosition'), 10);

      // 가장 적절한 스크롤 위치 결정
      let finalPosition = scrollPositions[currentPath] || 0;

      if (finalPosition === 0 && lastPath === currentPath && !isNaN(lastPosition)) {
        finalPosition = lastPosition;
      } else if (finalPosition === 0 && localLastPath === currentPath && !isNaN(localLastPosition)) {
        finalPosition = localLastPosition;
      }

      if (finalPosition > 0) {
        // 다단계 복원 시도
        const restoreScroll = () => {
          // 즉시 한 번
          window.scrollTo(0, finalPosition);

          // 약간의 지연 후
          setTimeout(() => {
            window.scrollTo(0, finalPosition);
          }, 100);

          // 더 긴 지연 후
          setTimeout(() => {
            window.scrollTo(0, finalPosition);
          }, 300);
        };

        // 페이지 로드 직후 복원
        restoreScroll();

        // DOM 완전 로드 후 다시 시도
        window.addEventListener('load', restoreScroll, { once: true });
      }
    }
  }, [router.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-14">
        {children}
      </main>
      <Footer />
      
      {/* 맨 위로 스크롤 버튼 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-white rounded-full shadow-lg transition-all hover:scale-110 z-[9999]"
          aria-label="맨 위로 이동"
          style={{
            border: '2px solid #233CFA',
          }}
        >
          <ArrowUp size={20} color="#233CFA" />
        </button>
      )}
    </div>
  );
};

export default MainLayout; 