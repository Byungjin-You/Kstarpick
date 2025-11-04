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

    // 홈 페이지와 드라마 페이지에서 스크롤 위치를 주기적으로 저장 (throttle 적용)
    let lastSavedScroll = 0;
    let scrollSaveTimer = null;

    // 실제 스크롤 위치 가져오기 (window.scrollY, body.scrollTop, documentElement.scrollTop 모두 확인)
    const getScrollPosition = () => {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const savePageScroll = () => {
      const currentScroll = getScrollPosition();
      // 10px 이상 차이날 때만 저장 (불필요한 저장 방지)
      if (Math.abs(currentScroll - lastSavedScroll) > 10) {
        lastSavedScroll = currentScroll;

        // 홈 페이지 스크롤 저장
        if (router.pathname === '/') {
          sessionStorage.setItem('homeScrollPosition', currentScroll.toString());
        }
        // 드라마 페이지 스크롤 저장
        else if (router.pathname === '/drama') {
          sessionStorage.setItem('dramaScrollPosition', currentScroll.toString());
        }
        // TV & Film 페이지 스크롤 저장
        else if (router.pathname === '/tvfilm') {
          sessionStorage.setItem('tvfilmScrollPosition', currentScroll.toString());
        }
        // Music 페이지 스크롤 저장
        else if (router.pathname === '/music') {
          sessionStorage.setItem('musicScrollPosition', currentScroll.toString());
        }
        // Celeb 페이지 스크롤 저장
        else if (router.pathname === '/celeb') {
          sessionStorage.setItem('celebScrollPosition', currentScroll.toString());
        }
        // Ranking 페이지 스크롤 저장
        else if (router.pathname === '/ranking') {
          sessionStorage.setItem('rankingScrollPosition', currentScroll.toString());
        }
      }
    };

    const handleScroll = () => {
      // throttle: 100ms마다 저장
      if (scrollSaveTimer) return;
      scrollSaveTimer = setTimeout(() => {
        savePageScroll();
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

      // 드라마 페이지에서 뉴스로 이동할 때 스크롤 위치 저장
      if (router.pathname === '/drama' && url.startsWith('/news/') && !isLogoClick && !hasScrollSaved) {
        sessionStorage.setItem('dramaScrollPosition', currentScroll.toString());
        sessionStorage.setItem('isBackToDrama', 'true');
        hasScrollSaved = true;
      }

      // TV & Film 페이지에서 뉴스로 이동할 때 스크롤 위치 저장
      if (router.pathname === '/tvfilm' && url.startsWith('/news/') && !isLogoClick && !hasScrollSaved) {
        sessionStorage.setItem('tvfilmScrollPosition', currentScroll.toString());
        sessionStorage.setItem('isBackToTvfilm', 'true');
        hasScrollSaved = true;
      }

      // Music 페이지에서 뉴스로 이동할 때 스크롤 위치 저장
      if (router.pathname === '/music' && url.startsWith('/news/') && !isLogoClick && !hasScrollSaved) {
        sessionStorage.setItem('musicScrollPosition', currentScroll.toString());
        sessionStorage.setItem('isBackToMusic', 'true');
        hasScrollSaved = true;
      }

      // Celeb 페이지에서 뉴스로 이동할 때 스크롤 위치 저장
      if (router.pathname === '/celeb' && url.startsWith('/news/') && !isLogoClick && !hasScrollSaved) {
        sessionStorage.setItem('celebScrollPosition', currentScroll.toString());
        sessionStorage.setItem('isBackToCeleb', 'true');
        hasScrollSaved = true;
      }

      // Ranking 페이지에서 뉴스로 이동할 때 스크롤 위치 저장
      if (router.pathname === '/ranking' && url.startsWith('/news/') && !isLogoClick && !hasScrollSaved) {
        sessionStorage.setItem('rankingScrollPosition', currentScroll.toString());
        sessionStorage.setItem('isBackToRanking', 'true');
        hasScrollSaved = true;
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
      // 모든 페이지 이동 시 무조건 최상단으로 스크롤
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // requestAnimationFrame으로 확실하게 최상단 유지
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });

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

  // Pull-to-refresh 기능
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let touchStartY = 0;
    let touchCurrentY = 0;
    let isPulling = false;
    let pullContainer = null;
    let refreshIcon = null;
    let isAtTop = false;
    let canPull = false;
    let initialScrollY = 0;

    const getScrollY = () => {
      return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const handleTouchStart = (e) => {
      const scrollY = getScrollY();
      initialScrollY = scrollY;

      // scrollY가 정확히 0일 때만 pull-to-refresh 허용
      if (scrollY === 0) {
        isAtTop = true;
        touchStartY = e.touches[0].clientY;
        canPull = false;
        isPulling = false;
        // iOS overscroll 방지
        document.body.style.overscrollBehavior = 'none';
      } else {
        isAtTop = false;
        canPull = false;
        isPulling = false;
      }
    };

    const handleTouchMove = (e) => {
      // 최상단에서 시작하지 않았으면 아무것도 안함
      if (!isAtTop) return;

      const scrollY = getScrollY();
      touchCurrentY = e.touches[0].clientY;
      const pullDistance = touchCurrentY - touchStartY;

      // 스크롤이 발생했거나, 처음 스크롤 위치가 0이 아니었으면 차단
      if (scrollY !== 0 || initialScrollY !== 0) {
        isAtTop = false;
        canPull = false;
        isPulling = false;
        if (pullContainer && pullContainer.parentNode) {
          pullContainer.style.height = '0';
          document.body.style.paddingTop = '0';
          setTimeout(() => {
            if (pullContainer && pullContainer.parentNode) {
              pullContainer.parentNode.removeChild(pullContainer);
            }
            pullContainer = null;
            refreshIcon = null;
          }, 200);
        }
        return;
      }

      // 위로 당기면(음수) 즉시 중단
      if (pullDistance < 0) {
        isAtTop = false;
        canPull = false;
        isPulling = false;
        return;
      }

      // 아래로 당기기 시작 (양수) - 5px 이상만 당기면 canPull = true
      if (pullDistance > 5 && scrollY === 0 && initialScrollY === 0) {
        canPull = true;
        isPulling = true;
      }

      // canPull이 true이고, 아래로 당기고, 스크롤이 정확히 0일 때만
      if (canPull && pullDistance > 0 && scrollY === 0) {
        // 브라우저 기본 동작 방지 (iOS에서 즉시 방지)
        e.preventDefault();

        // Pull container 생성 (없으면)
        if (!pullContainer) {
          pullContainer = document.createElement('div');
          pullContainer.id = 'pull-to-refresh-container';

          // 헤더 찾기
          const header = document.querySelector('header');
          const headerHeight = header ? header.offsetHeight : 0;

          pullContainer.style.cssText = `
            position: fixed;
            top: ${headerHeight}px;
            left: 0;
            right: 0;
            height: 0;
            background: #ffffff;
            z-index: 9998;
            overflow: hidden;
            transition: height 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
          document.body.insertBefore(pullContainer, document.body.firstChild);

          // 새로고침 아이콘 (별 아이콘)
          refreshIcon = document.createElement('div');
          refreshIcon.innerHTML = `
            <div style="position: relative; width: 32px; height: 32px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#233cfa" stroke="#233cfa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 8px rgba(35, 60, 250, 0.4)); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#233cfa" fill-opacity="0.9"/>
              </svg>
            </div>
          `;
          pullContainer.appendChild(refreshIcon);
        }

        // Pull distance에 따라 컨테이너 높이 조정 (최대 100px)
        const maxPull = 100;
        const containerHeight = Math.min(pullDistance * 0.8, maxPull);
        pullContainer.style.height = `${containerHeight}px`;

        // Body에 padding-top 적용하여 공간 생성
        document.body.style.paddingTop = `${containerHeight}px`;
        document.body.style.transition = 'padding-top 0.2s ease';

        // 아이콘 회전 + 스케일 효과 (더 감각적으로)
        const progress = Math.min(pullDistance / maxPull, 1);
        const rotation = progress * 120; // 180도 → 120도로 더 천천히
        const scale = 0.8 + (progress * 0.4); // 0.8에서 1.2로 커짐
        const opacity = 0.5 + (progress * 0.5); // 0.5에서 1로 선명해짐

        if (refreshIcon) {
          const svg = refreshIcon.querySelector('svg');
          if (svg) {
            svg.style.transform = `rotate(${rotation}deg) scale(${scale})`;
            svg.style.opacity = opacity;
          }
        }
      } else {
        // 조건이 맞지 않으면 중단
        isAtTop = false;
        canPull = false;
        isPulling = false;
      }
    };

    const handleTouchEnd = (e) => {
      // 최상단이 아니면 즉시 중단
      const scrollY = getScrollY();

      if (!isPulling || !isAtTop || !canPull || scrollY !== 0 || initialScrollY !== 0) {
        // Pull container 정리
        if (pullContainer && pullContainer.parentNode) {
          pullContainer.style.height = '0';
          document.body.style.paddingTop = '0';
          setTimeout(() => {
            if (pullContainer && pullContainer.parentNode) {
              pullContainer.parentNode.removeChild(pullContainer);
            }
            pullContainer = null;
            refreshIcon = null;
            document.body.style.paddingTop = '';
          }, 200);
        }
        isAtTop = false;
        canPull = false;
        isPulling = false;
        touchStartY = 0;
        touchCurrentY = 0;
        initialScrollY = 0;
        return;
      }

      // touchend에서는 changedTouches 사용 (touches는 비어있음)
      const endY = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : touchCurrentY;
      const pullDistance = endY - touchStartY;
      const threshold = 100;

      // 오직 아래로 당겼고(양수), 스크롤이 정확히 0이고, 처음부터 0이었을 때만
      if (pullDistance > threshold && pullDistance > 0 && scrollY === 0 && initialScrollY === 0) {
        // 새로고침 실행
        if (pullContainer) {
          pullContainer.style.transition = 'height 0.3s ease';
          pullContainer.style.height = '80px';
          document.body.style.paddingTop = '80px';

          // 아이콘을 스피너로 변경
          if (refreshIcon) {
            refreshIcon.innerHTML = `
              <div style="width: 28px; height: 28px; border: 2.5px solid #f0f0f0; border-top: 2.5px solid #233cfa; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
              <style>
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            `;
          }
        }

        setTimeout(() => {
          window.location.reload();
        }, 400);
      } else {
        // Pull container와 padding 제거
        if (pullContainer) {
          pullContainer.style.transition = 'height 0.3s ease';
          pullContainer.style.height = '0';
          document.body.style.transition = 'padding-top 0.3s ease';
          document.body.style.paddingTop = '0';

          setTimeout(() => {
            if (pullContainer && pullContainer.parentNode) {
              pullContainer.parentNode.removeChild(pullContainer);
            }
            pullContainer = null;
            refreshIcon = null;
            document.body.style.paddingTop = '';
            document.body.style.transition = '';
          }, 300);
        }
      }

      // 모든 상태 초기화
      isAtTop = false;
      canPull = false;
      isPulling = false;
      touchStartY = 0;
      touchCurrentY = 0;
      initialScrollY = 0;
      // iOS overscroll 복구
      document.body.style.overscrollBehavior = '';
    };

    // 터치 이벤트 리스너 등록
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);

      // Pull container 정리
      if (pullContainer && pullContainer.parentNode) {
        pullContainer.parentNode.removeChild(pullContainer);
      }
      document.body.style.paddingTop = '';
    };
  }, []);


  return (
    <Fragment>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
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