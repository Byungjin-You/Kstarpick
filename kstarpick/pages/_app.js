import '../styles/globals.css';
import { Fragment } from 'react';
import { SessionProvider } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Analytics from '../components/Analytics';
import GlobalLoading from '../components/GlobalLoading';

// 전역 오류 핸들러 추가
if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error caught:', { message, source, lineno, colno, error });
    return false;
  };
  
  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
  });
}

// Custom hook to check if component has mounted on client
function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  return hasMounted;
}

// 메인 메뉴 페이지인지 확인하는 간단한 함수
function isMainMenuPage(pathname) {
  const mainMenuPaths = ['/drama', '/music', '/celeb', '/tvfilm', '/ranking', '/features', '/'];
  return mainMenuPaths.includes(pathname);
}

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const hasMounted = useHasMounted();
  const router = useRouter();
  
  // 스크롤 관리 - 브라우저 기본 동작 비활성화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 브라우저의 자동 스크롤 복원 비활성화
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
      console.log('브라우저 스크롤 복원 비활성화됨');
    }

    // 홈 페이지에서 스크롤 위치를 주기적으로 저장 (throttle 적용)
    let lastSavedScroll = 0;
    let scrollSaveTimer = null;

    // 실제 스크롤 위치 가져오기 (window.scrollY, body.scrollTop, documentElement.scrollTop 모두 확인)
    const getScrollPosition = () => {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const saveHomeScroll = () => {
      if (router.pathname === '/') {
        const currentScroll = getScrollPosition();
        // 10px 이상 차이날 때만 저장 (불필요한 저장 방지)
        if (Math.abs(currentScroll - lastSavedScroll) > 10) {
          lastSavedScroll = currentScroll;
          sessionStorage.setItem('homeScrollPosition', currentScroll.toString());
          console.log('📍 _app.js - 홈 스크롤 위치 자동 저장:', currentScroll);
        }
      }
    };

    const handleScroll = () => {
      // throttle: 100ms마다 저장
      if (scrollSaveTimer) return;
      scrollSaveTimer = setTimeout(() => {
        const scrollPos = getScrollPosition();
        console.log('📜 _app.js - 스크롤 이벤트 감지, pathname:', router.pathname, 'scroll:', scrollPos);
        saveHomeScroll();
        scrollSaveTimer = null;
      }, 100);
    };

    // 스크롤 이벤트 리스너
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleRouteChangeStart = (url) => {
      const currentScroll = getScrollPosition();
      console.log(`🔵 routeChangeStart: ${router.pathname} -> ${url}`);
      console.log('현재 스크롤 위치:', currentScroll);

      // 홈 페이지에서 나갈 때 현재 스크롤 위치 저장
      if (router.pathname === '/' && currentScroll > 0) {
        sessionStorage.setItem('homeScrollPosition', currentScroll.toString());
        console.log('📍 routeChangeStart - 홈 스크롤 위치 저장:', currentScroll);
      }

      // 뉴스 페이지에서 홈으로 돌아가는 경우
      const backToHome = url === '/' && router.pathname.startsWith('/news/');
      console.log('뒤로가기로 홈 복귀:', backToHome);

      if (backToHome) {
        sessionStorage.setItem('isBackToHome', 'true');
        console.log('🔖 isBackToHome 플래그 저장됨');
      } else if (url !== '/' && router.pathname === '/') {
        // 홈에서 다른 곳으로 갈 때는 플래그 제거
        sessionStorage.removeItem('isBackToHome');
      }

      // 뉴스 페이지로 이동하는 경우에만 즉시 스크롤 리셋
      if (url.startsWith('/news/')) {
        console.log('🚀 뉴스 페이지로 이동 시작 - 즉시 스크롤 0으로');
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };

    const handleRouteChangeComplete = () => {
      const currentPath = router.pathname;
      console.log(`🟢 routeChangeComplete: -> ${currentPath}`);
      console.log('현재 router.pathname:', router.pathname);
      console.log('현재 window.location.pathname:', window.location.pathname);

      // 뉴스 페이지로 이동한 경우 - 스크롤 최상단 유지
      if (currentPath.startsWith('/news/')) {
        console.log('뉴스 페이지 진입 - 스크롤을 0으로 강제 설정');
        window.scrollTo(0, 0);
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
        });
      }
      // 홈 페이지로 돌아온 경우
      else if (currentPath === '/') {
        const savedScroll = sessionStorage.getItem('homeScrollPosition');
        const homeScrollPosition = savedScroll ? parseInt(savedScroll, 10) : 0;
        const backToHomeFlag = sessionStorage.getItem('isBackToHome') === 'true';
        console.log('저장된 홈 스크롤 위치:', homeScrollPosition);
        console.log('isBackToHome 플래그:', backToHomeFlag);

        // 뒤로가기로 홈에 온 경우 - 스크롤 복원
        if (backToHomeFlag && homeScrollPosition > 0) {
          console.log('🔙 홈 페이지로 복귀 (뒤로가기) - 스크롤 복원:', homeScrollPosition);

          // 스크롤 복원 함수 (모든 스크롤 속성에 적용)
          const restoreScroll = () => {
            window.scrollTo(0, homeScrollPosition);
            document.documentElement.scrollTop = homeScrollPosition;
            document.body.scrollTop = homeScrollPosition;
          };

          // 즉시 복원
          restoreScroll();

          // 여러 타이밍에 스크롤 복원 시도 (DOM 렌더링 완료 대기)
          requestAnimationFrame(() => {
            restoreScroll();
            const currentScroll = getScrollPosition();
            console.log('스크롤 복원 시도 1 (RAF):', homeScrollPosition, '현재:', currentScroll);
          });

          setTimeout(() => {
            restoreScroll();
            const currentScroll = getScrollPosition();
            console.log('스크롤 복원 시도 2 (10ms):', homeScrollPosition, '현재:', currentScroll);
          }, 10);

          setTimeout(() => {
            restoreScroll();
            const currentScroll = getScrollPosition();
            console.log('스크롤 복원 시도 3 (50ms):', homeScrollPosition, '현재:', currentScroll);
          }, 50);

          setTimeout(() => {
            restoreScroll();
            const currentScroll = getScrollPosition();
            console.log('스크롤 복원 시도 4 (100ms):', homeScrollPosition, '현재:', currentScroll);
          }, 100);

          setTimeout(() => {
            restoreScroll();
            const currentScroll = getScrollPosition();
            console.log('스크롤 복원 최종 (200ms):', homeScrollPosition, '현재:', currentScroll);
            // 복원 후 플래그 제거
            sessionStorage.removeItem('isBackToHome');
          }, 200);
        }
        // 직접 접근 또는 새로고침 - 최상단
        else {
          console.log('홈 페이지 진입 (새로고침 또는 직접 접근) - 스크롤 0 유지');
          window.scrollTo(0, 0);
          sessionStorage.removeItem('isBackToHome');
        }
      }
      // 다른 페이지는 최상단
      else {
        window.scrollTo(0, 0);
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('MyApp mounted, current path:', window.location.pathname);
      if (window.location.pathname.includes('/admin')) {
        console.log('Admin page detected, session:', session);
      }
    }
  }, [session]);
  
  return (
    <Fragment>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Analytics />
      <GlobalLoading />
      <SessionProvider session={session}>
        {hasMounted ? (
          <Component {...pageProps} />
        ) : (
          // Simple placeholder during server-side rendering to avoid hydration mismatch
          <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: '#233CFA' }}></div>
              <p className="text-gray-500 text-sm">Loading...</p>
            </div>
          </div>
        )}
      </SessionProvider>
    </Fragment>
  );
}

export default MyApp; 