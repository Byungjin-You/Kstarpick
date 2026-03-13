import '../styles/globals.css';
import { Fragment } from 'react';
import { SessionProvider } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  // React Query client — useState로 생성하여 SSR 안전 + 리렌더 시 재생성 방지
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    },
  }));
  const router = useRouter();
  
  // 스크롤 관리 - 브라우저 기본 동작 비활성화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 브라우저의 자동 스크롤 복원 비활성화
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // 페이지별 스크롤 저장 설정 맵
    const pageScrollConfig = {
      '/': { key: 'homeScrollPosition', hasMoreNews: true },
      '/drama': { key: 'dramaScrollPosition', flag: 'isBackToDrama', hasMoreNews: true },
      '/drama/[id]': { key: 'dramaDetailScrollPosition', flag: 'isBackToDramaDetail' },
      '/tvfilm': { key: 'tvfilmScrollPosition', flag: 'isBackToTvfilm', hasMoreNews: true },
      '/music': { key: 'musicScrollPosition', flag: 'isBackToMusic', hasMoreNews: true },
      '/celeb': { key: 'celebScrollPosition', flag: 'isBackToCeleb', hasMoreNews: true },
      '/celeb/[slug]': { key: 'celebDetailScrollPosition', flag: 'isBackToCelebDetail' },
      '/ranking': { key: 'rankingScrollPosition', flag: 'isBackToRanking', hasMoreNews: true },
      '/search': { key: 'searchScrollPosition', flag: 'isBackToSearch' },
    };

    // 동적 라우트 매칭 함수 (window.location.pathname → config)
    const getScrollConfig = (path) => {
      // 정적 라우트 먼저
      if (pageScrollConfig[path]) return pageScrollConfig[path];
      // 동적 라우트
      if (path.startsWith('/drama/') && path !== '/drama') return pageScrollConfig['/drama/[id]'];
      if (path.startsWith('/celeb/') && path !== '/celeb') return pageScrollConfig['/celeb/[slug]'];
      // 뉴스 상세: 슬러그별 개별 키
      if (path.startsWith('/news/') && path !== '/news') {
        const slug = path.split('/news/')[1];
        return { key: 'newsScroll_' + slug };
      }
      return null;
    };

    // === 스크롤 저장/복원 (단순화) ===
    // 원칙: handleScroll이 100ms마다 현재 페이지 스크롤을 sessionStorage에 저장.
    //        routeChangeStart에서는 저장하지 않음 (popstate URL 변경 문제 회피).
    //        routeChangeComplete에서 뒤로가기면 복원, 순방향이면 최상단.
    let scrollSaveTimer = null;
    let isScrollSavePaused = false; // 복원 중 덮어쓰기 방지
    let isNavigatingBack = false;

    const getScrollPosition = () => Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop,
      document.body.scrollTop
    );

    const handleScroll = () => {
      if (scrollSaveTimer) return;
      scrollSaveTimer = setTimeout(() => {
        scrollSaveTimer = null;
        if (isScrollSavePaused) return;
        const pos = getScrollPosition();
        const config = getScrollConfig(window.location.pathname);
        if (config) {
          sessionStorage.setItem(config.key, pos.toString());
        }
      }, 100);
    };
    // body가 스크롤 컨테이너인 경우 window/document scroll 이벤트가 안 발생함
    // window, document, body 모두에 리스너 등록
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.body.addEventListener('scroll', handleScroll, { passive: true });

    // 뒤로가기 감지
    const handlePopState = () => {
      isNavigatingBack = true;
      sessionStorage.setItem('_navWasBack', 'true');
      setTimeout(() => { isNavigatingBack = false; }, 2000);
    };
    window.addEventListener('popstate', handlePopState);

    router.beforePopState(() => {
      isNavigatingBack = true;
      sessionStorage.setItem('_navWasBack', 'true');
      return true;
    });

    const handleRouteChangeStart = (url) => {
      const isActuallyBack = isNavigatingBack;

      // 페이지 전환 시작 → 스크롤 저장 즉시 차단
      // (scrollTo(0,0)이 scroll 이벤트를 발생시켜 저장값을 0으로 덮어쓰는 것 방지)
      isScrollSavePaused = true;

      // 뒤로가기 플래그
      if (isActuallyBack) {
        sessionStorage.setItem('_navWasBack', 'true');
      } else {
        sessionStorage.removeItem('_navWasBack');
        // 순방향 이동: 뉴스 페이지로 갈 때 즉시 스크롤 리셋
        if (url.startsWith('/news/')) {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        }
        // 순방향 진입 시 랭킹 탭 초기화 (뒤로가기가 아닌 경우에만)
        if (url === '/ranking') {
          sessionStorage.removeItem('rankingActiveTab');
        }
      }

      // 로고 클릭 처리
      if (sessionStorage.getItem('logoClicked') === 'true') {
        sessionStorage.removeItem('logoClicked');
      }
    };

    const restoreScrollWithRetry = (scrollPos) => {
      const doRestore = () => {
        window.scrollTo(0, scrollPos);
        document.documentElement.scrollTop = scrollPos;
        document.body.scrollTop = scrollPos;
      };

      doRestore();
      requestAnimationFrame(doRestore);

      // 모바일: 콘텐츠가 렌더링될 때까지 반복 시도 (최대 3초)
      let count = 0;
      const interval = setInterval(() => {
        count++;
        const pageH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        doRestore();
        if (pageH > scrollPos || count >= 20) {
          doRestore();
          clearInterval(interval);
          // 복원 완료 후 저장 재개
          setTimeout(() => { isScrollSavePaused = false; }, 500);
        }
      }, 150);
      setTimeout(() => { clearInterval(interval); isScrollSavePaused = false; }, 3000);
    };

    const handleRouteChangeComplete = () => {
      const wasBack = sessionStorage.getItem('_navWasBack') === 'true';

      if (!wasBack) {
        // 순방향: 최상단 (body가 스크롤 컨테이너이므로 body도 리셋)
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
          document.documentElement.scrollTop = 0;
        });
        isScrollSavePaused = false;
      } else {
        // 뒤로가기: 저장된 위치 복원
        const config = getScrollConfig(window.location.pathname);
        if (config) {
          const saved = parseInt(sessionStorage.getItem(config.key) || '0', 10);
          if (saved > 0) {
            restoreScrollWithRetry(saved);
          } else {
            // 최상단이었으면 그냥 최상단
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            isScrollSavePaused = false;
          }
        } else {
          isScrollSavePaused = false;
        }
      }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    // 풀 리로드 뒤로가기 감지 (모바일에서 bfcache 미사용 시)
    let isFullReloadBack = false;
    try {
      const nav = performance.getEntriesByType('navigation');
      if (nav.length > 0 && nav[0].type === 'back_forward') isFullReloadBack = true;
    } catch (e) {}
    if (!isFullReloadBack && sessionStorage.getItem('_navWasBack') === 'true') {
      isFullReloadBack = true;
    }

    if (isFullReloadBack && sessionStorage.getItem('logoClicked') !== 'true') {
      const config = getScrollConfig(window.location.pathname);
      if (config) {
        const saved = parseInt(sessionStorage.getItem(config.key) || '0', 10);
        if (saved > 0) {
          isScrollSavePaused = true;
          restoreScrollWithRetry(saved);
        }
      }
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      document.body?.removeEventListener('scroll', handleScroll);
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
      return Math.max(
        document.body.scrollTop,
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement.scrollTop
      );
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
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Analytics />
      <GlobalLoading />
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>
          {/* 항상 Component를 렌더링하여 SSR에서 Head 메타 태그가 포함되도록 함 */}
          {!hasMounted && (
            <div className="min-h-screen bg-white flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: '#233CFA' }}></div>
                <p className="text-gray-500 text-sm">Loading...</p>
              </div>
            </div>
          )}
          <Component {...pageProps} />
        </SessionProvider>
      </QueryClientProvider>
    </Fragment>
  );
}

export default MyApp; 