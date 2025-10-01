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
  
  // 스크롤 관리 시스템
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('스크롤 관리 시스템 초기화');
    
    // 경로별 스크롤 위치를 저장하는 맵
    const scrollMaps = {
      home: {},  // 홈 및 일반 페이지
      news: {}   // 뉴스 상세 페이지
    };
    
    // 네비게이션 상태 관리 
    const navState = {
      // 현재 페이지 정보
      currentPath: '',
      currentType: '',
      // 이전 페이지 정보 (뒤로가기/앞으로가기 감지용)
      previousPath: '',
      previousType: '',
      // 이동 방향 추적
      direction: 'none',  // 'forward', 'backward', 'none'
      // 플래그
      isNavigating: false,
      lastNavigationTime: 0
    };
    
    // 현재 페이지 정보 초기화
    const initCurrentPageInfo = () => {
      const path = window.location.pathname + window.location.search + window.location.hash;
      const type = isNewsPage(path) ? 'news' : 'home';
      
      navState.currentPath = path;
      navState.currentType = type;
      
      console.log(`현재 페이지 초기화: ${path} (${type})`);
      
      return { path, type };
    };
    
    // 현재 페이지가 뉴스 상세 페이지인지 확인하는 함수
    const isNewsPage = (path) => {
      return path.startsWith('/news/') || path.match(/^\/news\/[a-f0-9]+\/?$/i);
    };
    
    // 페이지 유형 가져오기
    const getPageType = (path) => {
      // 경로 정규화 
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return isNewsPage(normalizedPath) ? 'news' : 'home';
    };
    
    // 스크롤맵 초기화 - 세션 스토리지에서 복원
    try {
      const savedHomeScrolls = JSON.parse(sessionStorage.getItem('homeScrollPositions') || '{}');
      const savedNewsScrolls = JSON.parse(sessionStorage.getItem('newsScrollPositions') || '{}');
      scrollMaps.home = savedHomeScrolls;
      scrollMaps.news = savedNewsScrolls;
      console.log('스크롤 맵 초기화 완료:', {
        홈페이지수: Object.keys(scrollMaps.home).length,
        뉴스페이지수: Object.keys(scrollMaps.news).length
      });
    } catch (e) {
      console.error('스크롤 맵 초기화 오류:', e);
    }
    
    // 네비게이션 상태 초기화
    const { path, type } = initCurrentPageInfo();
    
    // 세션 스토리지에서 이전 페이지 정보 복원
    try {
      navState.previousPath = sessionStorage.getItem('previousPath') || '';
      navState.previousType = sessionStorage.getItem('previousType') || '';
    } catch (e) {
      console.error('이전 페이지 정보 복원 오류:', e);
    }
    
    // 특정 페이지 유형의 스크롤 위치 저장
    const saveScroll = (path, type, position) => {
      // 유효성 검사
      if (!path || !type) {
        console.warn('스크롤 저장 실패: 경로 또는 타입이 없음', { path, type, position });
        return;
      }
      
      // 경로와 타입이 일치하는지 확인
      const expectedType = getPageType(path);
      if (expectedType !== type) {
        console.warn(`스크롤 저장 불일치! 경로에 따른 예상 타입: ${expectedType}, 제공된 타입: ${type}`, path);
        // 예상 타입으로 덮어쓰기
        type = expectedType;
      }
      
      // 지정된 타입의 맵에 경로별 위치 저장
      scrollMaps[type][path] = position;
      
      // 세션 스토리지에도 저장
      sessionStorage.setItem(`${type}ScrollPositions`, JSON.stringify(scrollMaps[type]));
      
      // 현재 스크롤 상태 로깅
      console.log(`스크롤 저장 [${type}]: ${path} = ${position}`);
    };
    
    // 페이지 유형에 따른 스크롤 위치 가져오기
    const getScroll = (path, type) => {
      if (!path || !type) return 0;
      return scrollMaps[type][path] || 0;
    };
    
    // 페이지 이동 시작 시 처리
    const handleRouteChangeStart = (url) => {
      // 현재 상태 저장
      const currentPath = navState.currentPath;
      const currentType = navState.currentType;
      const currentScroll = window.scrollY;
      
      // 이동할 페이지 정보
      const targetPath = url;
      const targetType = getPageType(targetPath);
      
      // 이동 방향 감지
      const isBackwardNavigation = navState.previousPath === targetPath;
      navState.direction = isBackwardNavigation ? 'backward' : 'forward';
      
      console.log(`페이지 이동 시작: ${currentPath}(${currentType}) -> ${targetPath}(${targetType}), 방향: ${navState.direction}`);
      
      // 현재 페이지의 스크롤 위치를 현재 타입에 맞게 저장
      saveScroll(currentPath, currentType, currentScroll);
      
      // 이전 페이지 정보로 현재 페이지 저장 (뒤로가기 감지용)
      navState.previousPath = currentPath;
      navState.previousType = currentType;
      
      // 세션 스토리지에도 저장
      sessionStorage.setItem('previousPath', currentPath);
      sessionStorage.setItem('previousType', currentType);
      sessionStorage.setItem('previousScroll', currentScroll.toString());
      
      // 이동 중 플래그 설정
      navState.isNavigating = true;
      navState.lastNavigationTime = Date.now();
    };
    
    // 페이지 이동 완료 시 처리
    const handleRouteChangeComplete = (url) => {
      // 실제 현재 URL 가져오기 (url 매개변수 대신)
      const actualPath = window.location.pathname + window.location.search + window.location.hash;
      const actualType = getPageType(actualPath);
      
      // 이전 상태 
      const prevPath = navState.previousPath;
      const prevType = navState.previousType;
      
      console.log(`페이지 이동 완료: ${prevPath}(${prevType}) -> ${actualPath}(${actualType}), 방향: ${navState.direction}`);
      
      // 현재 페이지 정보 업데이트
      navState.currentPath = actualPath;
      navState.currentType = actualType;
      
      // 뒤로가기/앞으로가기 처리
      if (navState.direction === 'backward') {
        const savedScroll = getScroll(actualPath, actualType);
        console.log(`뒤로가기 감지 - 복원할 스크롤: ${savedScroll} [${actualType}]`);
        
        // 약간의 지연 후 스크롤 복원 시도 (여러 번)
        setTimeout(() => {
          window.scrollTo(0, savedScroll);
          // 추가 스크롤 복원 시도
          setTimeout(() => window.scrollTo(0, savedScroll), 50);
          setTimeout(() => window.scrollTo(0, savedScroll), 200);
        }, 0);
      } else {
        // 일반 네비게이션은 페이지 상단으로
        window.scrollTo(0, 0);
        console.log('일반 페이지 이동 - 최상단으로 스크롤');
      }
      
      // 이동 완료 플래그 해제
      navState.isNavigating = false;
      
      // 현재 스크롤 맵 상태 기록 (디버깅용)
      console.log('현재 스크롤 맵 상태:', {
        홈: Object.keys(scrollMaps.home).length,
        뉴스: Object.keys(scrollMaps.news).length
      });
    };
    
    // 브라우저 뒤로가기/앞으로가기 이벤트 처리
    const handlePopState = () => {
      // 실제 현재 URL 가져오기
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      const currentType = getPageType(currentPath);
      
      // 이전 URL 참조
      const prevPath = navState.previousPath;
      const prevType = navState.previousType;
      
      console.log(`PopState 이벤트: ${prevPath}(${prevType}) -> ${currentPath}(${currentType})`);
      
      // 뒤로가기로 방향 설정
      navState.direction = 'backward';
      
      // 현재 페이지 정보 업데이트
      navState.currentPath = currentPath;
      navState.currentType = currentType;
      
      // 저장된 스크롤 위치 가져오기
      const savedScroll = getScroll(currentPath, currentType);
      console.log(`PopState 스크롤 복원: ${currentPath}(${currentType}) - ${savedScroll}`);
      
      // 스크롤 복원 여러 번 시도
      setTimeout(() => {
        window.scrollTo(0, savedScroll);
        setTimeout(() => window.scrollTo(0, savedScroll), 50);
        setTimeout(() => window.scrollTo(0, savedScroll), 200);
      }, 0);
      
      // 마지막 네비게이션 시간 업데이트
      navState.lastNavigationTime = Date.now();
    };
    
    // 주기적인 스크롤 위치 저장 (현재 페이지만)
    const scrollInterval = setInterval(() => {
      // 네비게이션 중이면 건너뜀
      if (navState.isNavigating) return;
      
      // 마지막 네비게이션으로부터 500ms 이내면 스킵 (안정성을 위해)
      if (Date.now() - navState.lastNavigationTime < 500) return;
      
      const currentPath = navState.currentPath;
      const currentType = navState.currentType;
      const currentScroll = window.scrollY;
      
      // 이미 저장된 값과 크게 다른 경우에만 저장 (50px 이상 차이)
      const savedScroll = getScroll(currentPath, currentType);
      if (Math.abs(savedScroll - currentScroll) > 50) {
        saveScroll(currentPath, currentType, currentScroll);
      }
    }, 1000);
    
    // 이벤트 리스너 등록
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    window.addEventListener('popstate', handlePopState);
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      window.removeEventListener('popstate', handlePopState);
      clearInterval(scrollInterval);
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500 text-sm">콘텐츠 로딩 중...</p>
            </div>
          </div>
        )}
      </SessionProvider>
    </Fragment>
  );
}

export default MyApp; 