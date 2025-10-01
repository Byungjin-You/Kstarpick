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
    const handleScroll = () => {
      if (window && window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // 맨 위로 스크롤 함수
  const scrollToTop = () => {
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
      console.log(`페이지 본문 클래스 설정: page-${path}`);
    }
  }, [router.pathname]);
  
  // 페이지 로드 시 스크롤 위치 복원
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 브라우저 네비게이션 유형 확인
    const navigation = window.performance?.getEntriesByType('navigation')?.[0];
    const isBackForwardNavigation = navigation && navigation.type === 'back_forward';
    
    if (isBackForwardNavigation) {
      // 현재 페이지 경로
      const currentPath = window.location.pathname;
      console.log('[MainLayout] 뒤로가기/앞으로가기 감지:', currentPath);
      
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
        console.log('[MainLayout] 스크롤 위치 복원:', finalPosition);
        
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
      <main className="flex-grow pt-20">
        {children}
      </main>
      <Footer />
      
      {/* 맨 위로 스크롤 버튼 */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 bg-[#ff3e8e] text-white rounded-full shadow-lg hover:bg-[#e02e7c] transition-colors hover:animate-none transform hover:scale-110 z-40"
          aria-label="맨 위로 이동"
          style={{
            animation: 'bounce-button 2s infinite',
          }}
        >
          <style jsx>{`
            @keyframes bounce-button {
              0%, 100% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(-10px);
              }
              70% {
                transform: translateY(-5px);
              }
            }
            button {
              animation: bounce-button 2s ease-in-out infinite;
              transition: all 0.3s;
            }
            button:hover {
              animation: none;
              transform: scale(1.15);
              box-shadow: 0 10px 25px -5px rgba(255, 62, 142, 0.4);
            }
          `}</style>
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};

export default MainLayout; 