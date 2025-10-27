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

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  const hasMounted = useHasMounted();
  const router = useRouter();
  
  // 스크롤 관리 - 브라우저 기본 동작 비활성화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 브라우저의 자동 스크롤 복원 비활성화
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
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
        }
      }
    };

    const handleScroll = () => {
      // throttle: 100ms마다 저장
      if (scrollSaveTimer) return;
      scrollSaveTimer = setTimeout(() => {
        saveHomeScroll();
        scrollSaveTimer = null;
      }, 100);
    };

    // 스크롤 이벤트 리스너
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 뒤로가기 플래그 추적
    let isNavigatingBack = false;
    // 중복 저장 방지 플래그
    let hasScrollSaved = false;

    // popstate 이벤트로 뒤로가기 감지
    const handlePopState = () => {
      isNavigatingBack = true;
      // 충분히 긴 시간으로 설정 (routeChangeStart가 실행될 때까지)
      setTimeout(() => {
        isNavigatingBack = false;
      }, 2000);
    };
    window.addEventListener('popstate', handlePopState);

    const handleRouteChangeStart = (url) => {
      const currentScroll = getScrollPosition();

      // 뒤로가기 감지: 뉴스→뉴스 이동 시 저장된 스크롤이 있으면 뒤로가기
      const targetNewsSlugTemp = url.startsWith('/news/') ? url.split('/news/')[1] : null;
      const hasStoredScroll = targetNewsSlugTemp && sessionStorage.getItem(`newsScroll_${targetNewsSlugTemp}`) !== null;
      const isActuallyBack = isNavigatingBack || hasStoredScroll;

      // 로고 클릭 확인
      const isLogoClick = sessionStorage.getItem('logoClicked') === 'true';

      // 홈 페이지에서 나갈 때 현재 스크롤 위치 저장 (로고 클릭이 아닌 경우만)
      // 스크롤이 0이어도 저장 (슬라이더 클릭 등의 경우를 위해)
      // 중복 저장 방지: hasScrollSaved가 false일 때만 저장
      if (router.pathname === '/' && !isLogoClick && !hasScrollSaved) {
        sessionStorage.setItem('homeScrollPosition', currentScroll.toString());
        hasScrollSaved = true; // 저장 완료 플래그 설정
      }

      // 뉴스 페이지에서 다른 뉴스 페이지로 이동하는 경우 (뒤로가기 제외)
      const newsToNews = router.pathname.startsWith('/news/') && url.startsWith('/news/');
      if (newsToNews && currentScroll > 0 && !isActuallyBack) {
        // 현재 뉴스 슬러그 추출 - router.asPath 사용 (window.location은 아직 업데이트 안됨)
        const currentNewsSlug = router.asPath.split('/news/')[1];
        // 목적지 뉴스 슬러그 추출
        const targetNewsSlug = url.split('/news/')[1];

        if (currentNewsSlug && targetNewsSlug !== currentNewsSlug) {
          // 현재 뉴스의 스크롤 위치 저장
          sessionStorage.setItem(`newsScroll_${currentNewsSlug}`, currentScroll.toString());
          sessionStorage.setItem('isBackToNewsDetail', 'true');

          // Forward 이동이므로 목적지 뉴스의 이전 스크롤 위치는 삭제 (처음부터 시작)
          sessionStorage.removeItem(`newsScroll_${targetNewsSlug}`);
        }
      }

      // 뉴스 페이지에서 홈으로 돌아가는 경우 (로고 클릭이 아닌 경우만)
      const backToHome = url === '/' && router.pathname.startsWith('/news/') && !isLogoClick;

      if (backToHome) {
        sessionStorage.setItem('isBackToHome', 'true');
      } else if (url !== '/' && router.pathname === '/') {
        // 홈에서 다른 곳으로 갈 때는 플래그 제거
        sessionStorage.removeItem('isBackToHome');
      }

      // 뉴스 페이지로 이동하는 경우에만 즉시 스크롤 리셋 (단, 뒤로가기는 제외)
      if (url.startsWith('/news/') && !isActuallyBack) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }

      // 로고 클릭 플래그가 있으면 제거 (한 번만 사용)
      if (isLogoClick) {
        sessionStorage.removeItem('logoClicked');
      }
    };

    const handleRouteChangeComplete = () => {
      const currentPath = router.pathname;

      // 로고 클릭 플래그 확인
      const wasLogoClick = sessionStorage.getItem('logoClicked') === 'true';

      // 뉴스 페이지로 이동한 경우 - 스크롤 최상단 유지
      if (currentPath.startsWith('/news/')) {
        // 뒤로가기로 뉴스 상세 페이지에 돌아온 경우는 스크롤 복원을 방해하지 않음
        const isBackToNewsDetail = sessionStorage.getItem('isBackToNewsDetail') === 'true';
        if (!isBackToNewsDetail) {
          window.scrollTo(0, 0);
          requestAnimationFrame(() => {
            window.scrollTo(0, 0);
          });
        }
      }
      // 홈 페이지로 돌아온 경우
      else if (currentPath === '/') {
        // 로고를 클릭한 경우 - 무조건 최상단으로
        if (wasLogoClick) {
          window.scrollTo(0, 0);
          sessionStorage.removeItem('logoClicked');
          sessionStorage.removeItem('isBackToHome');
          sessionStorage.removeItem('homeScrollPosition');
          return;
        }

        const savedScroll = sessionStorage.getItem('homeScrollPosition');
        const homeScrollPosition = savedScroll ? parseInt(savedScroll, 10) : 0;
        const backToHomeFlag = sessionStorage.getItem('isBackToHome') === 'true';

        // 뒤로가기로 홈에 온 경우 - 스크롤 복원
        // savedScroll이 존재하면 복원 (값이 0이어도 복원)
        if (backToHomeFlag && savedScroll !== null) {
          // 스크롤 복원 함수
          const restoreHomeScroll = () => {
            window.scrollTo(0, homeScrollPosition);
            document.documentElement.scrollTop = homeScrollPosition;
            document.body.scrollTop = homeScrollPosition;
          };

          // 1차: 즉시 복원 시도
          restoreHomeScroll();

          // 2차: DOM 렌더링 직후 (RAF 2번 중첩으로 레이아웃 재계산 대기)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              restoreHomeScroll();
            });
          });

          // 3차: 이미지 로딩 등을 고려한 지연 복원
          setTimeout(() => restoreHomeScroll(), 100);

          // 최종: 확실한 복원 및 플래그 제거 (깊은 스크롤 위치 대응)
          setTimeout(() => {
            restoreHomeScroll();
            sessionStorage.removeItem('isBackToHome');
          }, 300);
        }
        // 직접 접근 또는 새로고침 - 최상단
        else {
          window.scrollTo(0, 0);
          sessionStorage.removeItem('isBackToHome');
        }
      }
      // 다른 페이지는 최상단
      else {
        window.scrollTo(0, 0);
      }

      // 네비게이션 완료 후 중복 저장 방지 플래그 리셋
      hasScrollSaved = false;
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('popstate', handlePopState);
      if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);
  
  
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