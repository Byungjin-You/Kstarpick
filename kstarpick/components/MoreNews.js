import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Clock, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';

const MoreNews = ({ initialNews = [], category = '' }) => {
  const router = useRouter();
  const [allNews, setAllNews] = useState([]);  // 초기값을 빈 배열로 설정
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const observerRef = useRef();
  const lastNewsElementRef = useRef();
  const maxNewsCount = 300; // 원래대로 300개 제한
  const initialLoadRef = useRef(true); // 초기 로드 여부를 추적하는 ref 추가
  const initialLoadTimerRef = useRef(null); // 초기 로드 타이머 추가
  const restoringScrollRef = useRef(false); // 스크롤 복원 중인지 여부를 추적하는 ref
  const wasRefreshedRef = useRef(false); // 새로고침 여부를 저장하는 ref
  const initialDataAppliedRef = useRef(false); // initialNews가 이미 적용되었는지 추적
  const categoryRef = useRef(category); // 카테고리 값을 ref로 유지

  // 뉴스 카드 클릭 시 홈 스크롤 위치 저장
  const handleNewsClick = (e) => {
    if (typeof window !== 'undefined' && router.pathname === '/') {
      // 클릭 시점의 정확한 스크롤 위치를 즉시 캡처
      const currentScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

      // 이미 저장된 값이 있고 0이 아니면 유지 (routeChangeStart에서 이미 저장했을 수 있음)
      const existingScroll = sessionStorage.getItem('homeScrollPosition');
      if (!existingScroll || existingScroll === '0' || parseInt(existingScroll) === 0) {
        sessionStorage.setItem('homeScrollPosition', currentScroll.toString());
        console.log('📍 MoreNews - 홈 스크롤 위치 저장:', currentScroll);
      } else {
        console.log('📍 MoreNews - 이미 저장된 스크롤 위치 유지:', existingScroll);
      }
    }
  };

  // 카테고리 ref 업데이트
  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  // 카테고리가 배열인지 확인하는 함수
  const isCategoryArray = () => Array.isArray(category);
  
  // 특정 뉴스가 현재 카테고리(들)에 포함되는지 확인하는 함수
  const isNewsInCategory = (news) => {
    if (!news || !news.category) return false;
    
    if (isCategoryArray()) {
      return category.includes(news.category);
    }
    
    return news.category === category;
  };

  // 세션 스토리지 키 설정 - 카테고리 배열 지원
  const STORAGE_KEYS = {
    NEWS_DATA: category ? (isCategoryArray() ? `moreNews_${category.join('_')}Data` : `moreNews_${category}Data`) : 'moreNewsData',
    NEWS_PAGE: category ? (isCategoryArray() ? `moreNews_${category.join('_')}Page` : `moreNews_${category}Page`) : 'moreNewsPage',
    GLOBAL_ID_SET: category ? (isCategoryArray() ? `moreNews_${category.join('_')}LoadedIds` : `moreNews_${category}LoadedIds`) : 'moreNewsLoadedIds',
    SCROLL_POS: category ? (isCategoryArray() ? `moreNews_${category.join('_')}ScrollPos` : `moreNews_${category}ScrollPos`) : 'moreNewsScrollPos',
    BACK_NAVIGATION: 'wasBackNavigation',
    CACHE_TIME: category ? (isCategoryArray() ? `moreNews_${category.join('_')}CacheTime` : `moreNews_${category}CacheTime`) : 'moreNewsCacheTime'
  };

  // 캐시 유효 기간 (30분)
  const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30분

  // 초기 및 추가 로드 시 12개씩 뉴스를 표시
  const NEWS_PER_LOAD = 12;
  
  // 디버깅을 위한 상태 로깅
  useEffect(() => {
    console.log(`[MoreNews] 상태 변경 - loading: ${loading}, hasMore: ${hasMore}, allNews.length: ${allNews.length}, page: ${page}`);
  }, [loading, hasMore, allNews.length, page]);
  // 각 세트에 6개의 뉴스 항목이 있도록 설정 (첫 번째는 큰 카드, 나머지 5개는 작은 카드)
  const NEWS_PER_SET = 6;
  
  // 현재 경로 추적
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // 페이지 로드/새로고침 시 상태 초기화 또는 복원을 위한 useEffect
  useEffect(() => {
    // 이전 타이머 정리
    if (initialLoadTimerRef.current) {
      clearTimeout(initialLoadTimerRef.current);
    }
    
    // 간소화된 탐색 판단 로직
    let isBackNavigation = false;
    let isRefresh = false;
    
    if (typeof window !== 'undefined') {
      // 로고 클릭 플래그 확인
      const logoClicked = sessionStorage.getItem('logoClicked') === 'true';
      
      // 로고 클릭했으면 반드시 새로고침으로 처리
      if (logoClicked) {
        isRefresh = true;
        isBackNavigation = false;
        console.log('[MoreNews] 로고 클릭 감지 - 새로고침으로 처리');
        
        // 플래그 초기화 (일회성 사용)
        sessionStorage.removeItem('logoClicked');
      } else {
        // 세션 스토리지 데이터 확인
        const hasCachedNews = sessionStorage.getItem(STORAGE_KEYS.NEWS_DATA) !== null;
        const hasCachedScroll = sessionStorage.getItem(STORAGE_KEYS.SCROLL_POS) !== null;
        const cacheTime = sessionStorage.getItem(STORAGE_KEYS.CACHE_TIME);
        
        // 캐시 유효성 검사
        let isCacheValid = false;
        if (cacheTime) {
          const timeDiff = Date.now() - parseInt(cacheTime);
          isCacheValid = timeDiff < CACHE_EXPIRY_TIME;
          console.log(`[MoreNews] 캐시 시간 검사: ${Math.floor(timeDiff / 1000)}초 경과, 유효: ${isCacheValid}`);
        }
        
        if ((hasCachedNews || hasCachedScroll) && isCacheValid) {
          // 세션 스토리지에 유효한 데이터가 있으면 뒤로가기로 처리
          isBackNavigation = true;
          isRefresh = false;
          console.log('[MoreNews] 유효한 캐시 데이터 존재 - 뒤로가기로 처리');
        } else {
          // 캐시가 없거나 만료된 경우는 새로고침으로 처리
          isRefresh = true;
          isBackNavigation = false;
          console.log('[MoreNews] 캐시 없음 또는 만료 - 새로고침으로 처리');
          
          // 만료된 캐시 정리
          if (hasCachedNews || hasCachedScroll) {
            console.log('[MoreNews] 만료된 캐시 정리');
            sessionStorage.removeItem(STORAGE_KEYS.NEWS_DATA);
            sessionStorage.removeItem(STORAGE_KEYS.NEWS_PAGE);
            sessionStorage.removeItem(STORAGE_KEYS.GLOBAL_ID_SET);
            sessionStorage.removeItem(STORAGE_KEYS.SCROLL_POS);
            sessionStorage.removeItem(STORAGE_KEYS.CACHE_TIME);
          }
        }
      }
    }
    
    // 뒤로가기 감지되면 스크롤 복원 플래그 활성화
    if (isBackNavigation) {
      restoringScrollRef.current = true;
      console.log('[MoreNews] 뒤로가기 감지 - 스크롤 복원 모드 활성화');
      
      // 세션 스토리지에서 데이터 복원
      try {
        // 저장된 뉴스 데이터 복원
        const savedNewsData = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.NEWS_DATA) || '[]');
        const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEYS.NEWS_PAGE) || '1');
        
        if (savedNewsData.length > 0) {
          console.log(`[MoreNews] 뒤로가기: 세션 스토리지에서 ${savedNewsData.length}개 뉴스, 페이지 ${savedPage} 복원`);
          
          // 300개 제한 적용하여 상태 설정
          const limitedSavedNews = savedNewsData.slice(0, maxNewsCount);
          setAllNews(limitedSavedNews);
          setPage(savedPage);
          
          // 300개 제한에 도달했으면 무한 스크롤 비활성화
          if (limitedSavedNews.length >= maxNewsCount) {
            console.log(`[MoreNews] 뒤로가기 복원 시 최대 뉴스 개수 도달 (${limitedSavedNews.length}/${maxNewsCount}) - 무한 스크롤 비활성화`);
            setHasMore(false);
          } else {
            setHasMore(true);
          }
          
          // 전역 ID 캐시 초기화 및 복원
          window._loadedNewsIds = new Set();
          
          // 로드된 뉴스 ID 목록 복원 (300개 제한 적용)
          limitedSavedNews.forEach(news => {
            const newsId = news._id || news.id;
            if (newsId) window._loadedNewsIds.add(newsId);
          });
          
          // 초기 데이터 처리 완료 표시
          initialDataAppliedRef.current = true;
        }
      } catch (e) {
        console.error('[MoreNews] 세션 스토리지 복원 오류:', e);
      }
      
      // 뒤로가기일 경우에는 여기서 함수 종료
      return;
    }
    
    // 새로고침 처리
    if (isRefresh) {
      console.log('[MoreNews] 새로고침 처리 - 세션 스토리지 초기화');
      
      // 세션 스토리지 초기화
      if (typeof window !== 'undefined') {
        try {
          // 모든 관련 스토리지 항목 제거
          sessionStorage.removeItem(STORAGE_KEYS.NEWS_DATA);
          sessionStorage.removeItem(STORAGE_KEYS.NEWS_PAGE);
          sessionStorage.removeItem(STORAGE_KEYS.GLOBAL_ID_SET);
          sessionStorage.removeItem(STORAGE_KEYS.SCROLL_POS);
          sessionStorage.removeItem(STORAGE_KEYS.BACK_NAVIGATION);
          sessionStorage.removeItem(STORAGE_KEYS.CACHE_TIME); // 새로고침 시 캐시 타임도 초기화
          
          // 추가로 모든 moreNews 관련 캐시 정리
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('moreNews') || key.includes('moreNews')) {
              sessionStorage.removeItem(key);
              console.log(`[MoreNews] 캐시 정리: ${key}`);
            }
          });
          
          // 쿨다운 플래그 초기화
          window._newsLoadCooldown = false;
          window._forceNextLoad = false;
          
          // 전역 상태 초기화
          window._loadedNewsIds = new Set();
          
          // 스크롤 초기화
          window.scrollTo(0, 0);
          
          // 초기 데이터 제한 (원래대로 12개씩만)
          const limitedInitialNews = initialNews && initialNews.length > 0 
            ? initialNews.slice(0, NEWS_PER_LOAD) 
            : [];
          
          console.log('[MoreNews] 초기 뉴스 데이터:', initialNews?.length || 0, '개, 제한 후:', limitedInitialNews.length, '개');
          
          // 상태 초기화
          setAllNews(limitedInitialNews);
          setPage(1);
          setHasMore(true);
          setError(null);
          
          // 초기 데이터가 없으면 즉시 API 호출
          if (limitedInitialNews.length === 0) {
            console.log('[MoreNews] 초기 데이터가 없어서 API 호출 시작');
            setTimeout(() => {
              loadMoreNews();
            }, 100);
          }
          
          // 초기 데이터 처리 완료 표시
          initialDataAppliedRef.current = true;
          
          // ID 캐시에 초기 데이터 추가
          if (limitedInitialNews.length > 0) {
            limitedInitialNews.forEach(news => {
              const newsId = news._id || news.id;
              if (newsId) window._loadedNewsIds.add(newsId);
            });
          }
          
          // 새로고침 시 캐시 타임 설정
          sessionStorage.setItem(STORAGE_KEYS.CACHE_TIME, Date.now().toString());
          
          console.log(`[MoreNews] 새로고침 완료: ${limitedInitialNews.length}개 뉴스 로드`);
        } catch (error) {
          console.error('[MoreNews] 초기화 중 오류:', error);
        }
      }
      
      return;
    }
    
    // 기본 초기화 (일반 탐색)
    if (!initialDataAppliedRef.current) {
      console.log('[MoreNews] 일반 탐색 - 초기 데이터 적용');
      
      // 카테고리가 지정된 경우 initialNews에서 해당 카테고리만 필터링
      if (category && initialNews.length > 0) {
        // 카테고리가 배열인 경우 여러 카테고리의 뉴스를 모두 표시
        const filteredNews = initialNews.filter(news => isNewsInCategory(news));
        
        if (isCategoryArray()) {
          console.log(`[MoreNews] 카테고리 [${category.join(', ')}]로 필터링: ${initialNews.length}개 중 ${filteredNews.length}개 선택됨`);
        } else {
          console.log(`[MoreNews] 카테고리 '${category}'로 필터링: ${initialNews.length}개 중 ${filteredNews.length}개 선택됨`);
        }
        
        const limitedNews = (filteredNews || []).slice(0, NEWS_PER_LOAD);
        setAllNews(limitedNews);
      } else {
        const limitedNews = (initialNews || []).slice(0, NEWS_PER_LOAD);
        setAllNews(limitedNews);
      }
      
      setPage(1);
      setHasMore(true);
      setError(null);
      
      // 초기 데이터 처리 완료 표시
      initialDataAppliedRef.current = true;
      
      // 전역 ID 캐시 초기화
      if (typeof window !== 'undefined') {
        window._loadedNewsIds = window._loadedNewsIds || new Set();
        
        // 초기 데이터가 있는 경우 ID 캐시에 추가
        if (initialNews && initialNews.length > 0) {
          // 카테고리 필터링 적용
          const newsToCache = category
            ? initialNews.filter(news => isNewsInCategory(news))
            : initialNews;
            
          newsToCache.forEach(news => {
            const newsId = news._id || news.id;
            if (newsId) window._loadedNewsIds.add(newsId);
          });
        }
      }
    }
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (initialLoadTimerRef.current) {
        clearTimeout(initialLoadTimerRef.current);
      }
    };
  }, [initialNews, category]);
  
  // 초기화 이펙트 - 화면 크기에 따른 모바일 감지
  useEffect(() => {
    // 모바일 여부 확인 함수
    const checkMobile = () => {
      const mobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
      setIsMobile(mobile);
    };
    
    // 초기 모바일 상태 확인
    checkMobile();
    
    // 리사이즈 이벤트 리스너 등록
    const handleResize = debounce(checkMobile, 300);
    window.addEventListener('resize', handleResize);
    
    // 클린업 함수
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // 디바운스 유틸리티 함수
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // 디버깅용 로그 추가
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log(`[MoreNews] 상태 업데이트: ${allNews.length}개 뉴스, 페이지 ${page}, hasMore=${hasMore}, loading=${loading}, 새로고침=${wasRefreshedRef.current}`);
    }
  }, [allNews.length, page, hasMore, loading]);

  // 현재 경로와 뉴스 데이터 상태 저장 (세션 스토리지에 자동 저장)
  useEffect(() => {
    if (typeof window === 'undefined' || allNews.length === 0) return;
    
    // 데이터 저장 (단, 복원 중이 아닐 때만)
    if (!restoringScrollRef.current) {
      try {
        sessionStorage.setItem(STORAGE_KEYS.NEWS_DATA, JSON.stringify(allNews));
        sessionStorage.setItem(STORAGE_KEYS.NEWS_PAGE, page.toString());
        sessionStorage.setItem(STORAGE_KEYS.CACHE_TIME, Date.now().toString()); // 캐시 타임 업데이트
        
        // 세션 스토리지 저장 완료 로그
        console.log(`[MoreNews] 세션 스토리지에 ${allNews.length}개 뉴스 저장, 페이지 ${page}`);
      } catch (e) {
        console.error('[MoreNews] 상태 저장 오류:', e);
      }
    }
  }, [allNews, page]);

  // 스크롤 복원 후 추가 데이터 로드를 위한 useEffect 추가
  useEffect(() => {
    // 스크롤 복원 모드가 false로 변경되었을 때만 실행 (복원 완료 후)
    if (typeof window !== 'undefined' && restoringScrollRef.current === false) {
      // 스크롤 위치 확인하여 필요시 추가 데이터 로드
      const checkScrollAfterRestore = () => {
        if (!hasMore || loading) return;
        
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight
        );
        
        const scrollPercent = (scrollTop + windowHeight) / documentHeight;
        
        // 스크롤 위치가 하단에 가까우면 추가 데이터 로드
        if (scrollPercent > 0.7) {
          console.log(`[MoreNews] 복원 후 스크롤 확인: ${(scrollPercent * 100).toFixed(1)}% - 추가 뉴스 로드`);
          loadMoreNews();
        }
      };
      
      // 스크롤 복원 후 약간의 지연을 두고 스크롤 위치 확인
      const checkTimer = setTimeout(checkScrollAfterRestore, 500);
      
      return () => {
        clearTimeout(checkTimer);
      };
    }
  }, [restoringScrollRef.current, hasMore, loading]);

  // 무한 스크롤을 위한 이벤트 설정
  useEffect(() => {
    // 로딩 중이거나 더 이상 로드할 데이터가 없으면 스크롤 이벤트 등록하지 않음
    if (!hasMore || loading) {
      return;
    }
    
    // 스크롤 기반 로딩 처리 함수
    const handleScroll = () => {
      // 복원 중이거나 로딩 중이거나 더 이상 로드할 데이터가 없으면 무시
      if (loading || !hasMore || restoringScrollRef.current) return;
      
      // 현재 스크롤 위치가 전체 높이의 90%를 넘으면 다음 데이터 로드
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
      
      const scrollPercent = (scrollTop + windowHeight) / documentHeight;
      
      if (scrollPercent > 0.85) {
        console.log(`[MoreNews] Scroll detection: ${(scrollPercent * 100).toFixed(1)}% - Loading more news`);
        loadMoreNews();
      }
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll);
    
    // 초기 페이지 로드 시 화면이 충분히 차지 않으면 추가 로드
    const initialCheckTimer = setTimeout(() => {
      if (document.body.scrollHeight <= window.innerHeight && hasMore && !loading && !restoringScrollRef.current) {
        console.log("[MoreNews] Initial content doesn't fill the screen, loading more");
        loadMoreNews();
      } else if (!restoringScrollRef.current) {
        // 복원 중이 아니면 스크롤 확인
        handleScroll();
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(initialCheckTimer);
    };
  }, [allNews, hasMore, loading, restoringScrollRef.current]);

  // 추가 뉴스 로드
  const loadMoreNews = async () => {
    if (loading) {
      console.log('[MoreNews] 이미 로딩 중 - 요청 무시');
      return;
    }
    
    // 스크롤 복원 중이면 건너뛰기
    if (restoringScrollRef.current) {
      console.log('[MoreNews] 스크롤 복원 중 - 데이터 로드 건너뜀');
      return;
    }
    
    // 최대 뉴스 개수 제한 확인
    if (allNews.length >= maxNewsCount) {
      console.log(`[MoreNews] 최대 뉴스 개수 도달 (${allNews.length}/${maxNewsCount}) - 무한 스크롤 비활성화`);
      console.log('[MoreNews] 🔴 hasMore를 false로 설정 (이유: 최대 뉴스 개수 도달)');
      setHasMore(false);
      return;
    }
    
    try {
      // 로딩 상태 설정
      setLoading(true);
      console.log(`[MoreNews] Loading page ${page}, current items: ${allNews.length}`);
      
      // 현재 카테고리 가져오기 (props나 ref에서)
      const currentCategory = categoryRef.current || category;
      
      // 카테고리가 배열인 경우와 단일 문자열인 경우 처리
      const isMultiCategory = Array.isArray(currentCategory);
      
      // 다중 카테고리인 경우 여러 API 요청 준비
      if (isMultiCategory && currentCategory.length > 0) {
        // 모든 카테고리에 대한 API 요청 병렬 실행
        const promises = currentCategory.map(async (cat) => {
          // 카테고리별 전용 API 사용
          let apiUrl;
          if (cat === 'drama') {
            apiUrl = `/api/news/drama?page=${page}&limit=${NEWS_PER_LOAD}`;
          } else if (cat === 'movie') {
            apiUrl = `/api/news/movie?page=${page}&limit=${NEWS_PER_LOAD}`;
          } else if (cat === 'kpop') {
            apiUrl = `/api/news?page=${page}&limit=${NEWS_PER_LOAD}&category=kpop`;
          } else if (cat === 'celeb') {
            apiUrl = `/api/news/celeb?page=${page}&limit=${NEWS_PER_LOAD}`;
          } else {
            // 기본 뉴스 API 사용
            apiUrl = `/api/news?page=${page}&limit=${NEWS_PER_LOAD}&category=${encodeURIComponent(cat)}`;
          }
          
          console.log(`[MoreNews] API 요청 (카테고리: ${cat}): ${apiUrl}`);
          
          const response = await fetch(apiUrl);
          if (!response.ok) {
            console.error(`[MoreNews] API 오류 (카테고리: ${cat}): ${response.status}`);
            return [];
          }
          
          const data = await response.json();
          if (!data.success || !data.data) {
            console.log(`[MoreNews] API 데이터 없음 (카테고리: ${cat})`);
            return [];
          }
          
          // API 응답 형식 확인 및 처리
          let newsArray;
          if (Array.isArray(data.data)) {
            // 카테고리별 API: data가 직접 배열
            newsArray = data.data;
          } else if (data.data.news && Array.isArray(data.data.news)) {
            // 기본 API: data.news가 배열
            newsArray = data.data.news;
          } else {
            console.log(`[MoreNews] 예상하지 못한 API 응답 형식 (카테고리: ${cat}):`, data.data);
            return [];
          }
          
          return newsArray;
        });
        
        // 모든 API 응답 처리
        const resultsArray = await Promise.all(promises);
        
        // 모든 결과 합치기
        let allReceivedNews = [];
        resultsArray.forEach((newsArray, index) => {
          if (newsArray.length > 0) {
            console.log(`[MoreNews] 카테고리 '${currentCategory[index]}'에서 ${newsArray.length}개 뉴스 수신`);
            allReceivedNews = [...allReceivedNews, ...newsArray];
          }
        });
        
        // 모든 카테고리에서 뉴스를 받아오지 못한 경우
        if (allReceivedNews.length === 0) {
          console.log('[MoreNews] 모든 카테고리에서 데이터 없음 - 무한 스크롤 비활성화');
          setHasMore(false);
          setLoading(false);
          return;
        }
        
        // 뉴스 중복 제거 및 정렬 (생성일 기준 내림차순)
        const uniqueNewsIds = new Set();
        const uniqueNews = allReceivedNews.filter(news => {
          const id = news._id || news.id;
          if (!id || uniqueNewsIds.has(id)) return false;
          uniqueNewsIds.add(id);
          return true;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // 현재 로드된 ID들을 Set으로 구성 (중복 체크용)
        const existingIds = new Set();
        allNews.forEach(item => {
          const id = item._id || item.id;
          if (id) existingIds.add(id);
        });
        
        // 중복되지 않은 새 항목 필터링
        const newUniqueNews = uniqueNews.filter(item => {
          const id = item._id || item.id;
          if (!id) return false;
          
          const isDuplicate = existingIds.has(id);
          return !isDuplicate;
        });
        
        // 새 항목이 없으면 페이지만 증가하고 다시 로드
        if (newUniqueNews.length === 0) {
          // 페이지 번호 증가
          setPage(prev => prev + 1);
          setLoading(false);
          return;
        }
        
        // 새 항목이 있으면 상태 업데이트 (300개 제한 적용)
        setAllNews(prev => {
          const updatedNews = [...prev, ...newUniqueNews];
          const limitedNews = updatedNews.slice(0, maxNewsCount);
          
          // 300개 제한에 도달하면 무한 스크롤 비활성화
          if (limitedNews.length >= maxNewsCount) {
            console.log(`[MoreNews] 최대 뉴스 개수 도달 (${limitedNews.length}/${maxNewsCount}) - 무한 스크롤 비활성화`);
            setHasMore(false);
          }
          
          return limitedNews;
        });
        
        // 페이지 번호 증가
        setPage(prev => prev + 1);
        
        // 마지막 페이지 여부 확인 (다중 카테고리에서는 수신된 뉴스 개수로 판단)
        const isLastPage = newUniqueNews.length < NEWS_PER_LOAD;
        if (isLastPage) {
          setHasMore(false);
        }
        
        setLoading(false);
        return;
      }
      
      // 단일 카테고리 처리 (기존 코드)
      // 카테고리별 전용 API 사용
      let apiUrl;
      if (currentCategory && !isMultiCategory) {
        if (currentCategory === 'drama') {
          apiUrl = `/api/news/drama?page=${page}&limit=${NEWS_PER_LOAD}`;
        } else if (currentCategory === 'movie') {
          apiUrl = `/api/news/movie?page=${page}&limit=${NEWS_PER_LOAD}`;
        } else if (currentCategory === 'kpop') {
          apiUrl = `/api/news?page=${page}&limit=${NEWS_PER_LOAD}&category=kpop`;
        } else if (currentCategory === 'celeb') {
          apiUrl = `/api/news/celeb?page=${page}&limit=${NEWS_PER_LOAD}`;
        } else {
          // 기본 뉴스 API 사용
          apiUrl = `/api/news?page=${page}&limit=${NEWS_PER_LOAD}&category=${encodeURIComponent(currentCategory)}`;
        }
      } else {
        // 카테고리가 없는 경우 전체 뉴스
        apiUrl = `/api/news?page=${page}&limit=${NEWS_PER_LOAD}`;
      }
      
      console.log(`[MoreNews] API 요청: ${apiUrl} (카테고리: ${currentCategory || '없음'})`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // API에서 데이터 반환됐는지 확인
      if (!data.success || !data.data) {
        console.log('[MoreNews] API 데이터 없음 - 무한 스크롤 비활성화');
        console.log('[MoreNews] 🔴 hasMore를 false로 설정 (이유: API 데이터 없음)');
        setHasMore(false);
        return;
      }
      
      // API 응답 형식 확인 및 처리
      let receivedNews;
      if (Array.isArray(data.data)) {
        // 카테고리별 API: data가 직접 배열
        receivedNews = data.data;
      } else if (data.data.news && Array.isArray(data.data.news)) {
        // 기본 API: data.news가 배열
        receivedNews = data.data.news;
      } else {
        console.log('[MoreNews] 예상하지 못한 API 응답 형식:', data.data);
        setHasMore(false);
        return;
      }
      
      // 데이터가 비어있는 경우
      if (receivedNews.length === 0) {
        console.log('[MoreNews] API에서 빈 배열 반환 - 무한 스크롤 비활성화');
        console.log('[MoreNews] 🔴 hasMore를 false로 설정 (이유: 빈 배열 반환)');
        setHasMore(false);
        return;
      }
      
      // 카테고리 필터링 한번 더 적용 (서버에서 제대로 필터링되지 않았을 경우 대비)
      const filteredNews = currentCategory && !isMultiCategory
        ? receivedNews.filter(news => news.category === currentCategory)
        : receivedNews;
        
      if (currentCategory && !isMultiCategory && filteredNews.length < receivedNews.length) {
        console.log(`[MoreNews] 클라이언트 측 추가 필터링: ${receivedNews.length}개 중 ${filteredNews.length}개가 '${currentCategory}' 카테고리에 해당`);
      }
      
      // 현재 로드된 ID들을 Set으로 구성 (중복 체크용)
      const existingIds = new Set();
      allNews.forEach(item => {
        const id = item._id || item.id;
        if (id) existingIds.add(id);
      });
      
      // 중복되지 않은 새 항목 필터링
      const newUniqueNews = filteredNews.filter(item => {
        const id = item._id || item.id;
        if (!id) return false;
        
        const isDuplicate = existingIds.has(id);
        return !isDuplicate;
      });
      
      // 새 항목이 없으면 페이지만 증가하고 다시 로드
      if (newUniqueNews.length === 0) {
        // 페이지 번호 증가
        setPage(prev => prev + 1);
        return;
      }
      
      // 새 항목이 있으면 상태 업데이트 (300개 제한 적용)
      setAllNews(prev => {
        const updatedNews = [...prev, ...newUniqueNews];
        const limitedNews = updatedNews.slice(0, maxNewsCount);
        
        // 300개 제한에 도달하면 무한 스크롤 비활성화
        if (limitedNews.length >= maxNewsCount) {
          console.log(`[MoreNews] 최대 뉴스 개수 도달 (${limitedNews.length}/${maxNewsCount}) - 무한 스크롤 비활성화`);
          setHasMore(false);
        }
        
        return limitedNews;
      });
      
      // 페이지 번호 증가
      setPage(prev => prev + 1);
      
      // 마지막 페이지 여부 확인
      const pagination = data.data.pagination;
      const totalPages = pagination?.pages || 0;
      const isLastPage = pagination && (page >= totalPages || receivedNews.length < NEWS_PER_LOAD);
      
      if (isLastPage) {
        console.log('[MoreNews] 🔴 hasMore를 false로 설정 (이유: 마지막 페이지 도달)');
        setHasMore(false);
      }
      
    } catch (err) {
      console.error('[MoreNews] 데이터 로드 오류:', err);
      setError(err.message);
      
      // API 에러 시 무한스크롤 비활성화하여 무한루프 방지
      if (err.message.includes('API error: 500')) {
        console.log('[MoreNews] API 서버 에러로 인해 무한스크롤 비활성화');
        setHasMore(false);
      }
    } finally {
      // 로딩 상태 해제
      setLoading(false);
    }
  };

  // 현재 상태 출력을 위한 useEffect
  useEffect(() => {
    if (category) {
      if (isCategoryArray()) {
        console.log(`[MoreNews] 현재 카테고리: [${category.join(', ')}], 뉴스 개수: ${allNews.length}, 페이지: ${page}`);
      } else {
        console.log(`[MoreNews] 현재 카테고리: ${category}, 뉴스 개수: ${allNews.length}, 페이지: ${page}`);
      }
    }
    
    // 필터링이 제대로 되었는지 확인
    if (category && allNews.length > 0) {
      const correctCategoryCount = allNews.filter(news => isNewsInCategory(news)).length;
      if (correctCategoryCount < allNews.length) {
        if (isCategoryArray()) {
          console.warn(`[MoreNews] 경고: ${allNews.length}개 중 ${correctCategoryCount}개만 [${category.join(', ')}] 카테고리. 잘못된 필터링 가능성 있음.`);
        } else {
          console.warn(`[MoreNews] 경고: ${allNews.length}개 중 ${correctCategoryCount}개만 '${category}' 카테고리. 잘못된 필터링 가능성 있음.`);
        }
        
        // 필터링 적용 (필요한 경우에만)
        if (correctCategoryCount < allNews.length * 0.9) { // 90% 이상이 올바른 카테고리가 아닌 경우에만 수정
          console.log('[MoreNews] 카테고리 불일치 수정 적용');
          setAllNews(prev => prev.filter(news => isNewsInCategory(news)));
        }
      }
    }
  }, [allNews.length, page, category]);

  // 뉴스를 세트로 그룹화 (한 세트에 6개씩)
  const getNewsSets = () => {
    if (!Array.isArray(allNews)) {
      console.error("allNews is not an array:", allNews);
      return [];
    }
    
    // 현재 카테고리에 맞는 뉴스만 필터링 (추가 안전장치)
    const filteredNews = category 
      ? allNews.filter(news => isNewsInCategory(news))
      : allNews;
    
    const sets = [];
    for (let i = 0; i < filteredNews.length; i += NEWS_PER_SET) {
      const set = filteredNews.slice(i, i + NEWS_PER_SET);
      if (set.length > 0) {
        sets.push(set);
      }
    }
    return sets;
  };

  const newsSets = getNewsSets();
  
  // 컴포넌트 마운트 시 페이지 로드 방식 기록
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 페이지가 로드된 방식을 세션 스토리지에 기록
    const pageLoadMethod = {
      time: new Date().toISOString(),
      isRefresh: wasRefreshedRef.current,
      hasSessionData: sessionStorage.getItem(STORAGE_KEYS.NEWS_DATA) !== null
    };
    
    try {
      sessionStorage.setItem('pageLoadMethod', JSON.stringify(pageLoadMethod));
    } catch (e) {
      console.error('[MoreNews] 페이지 로드 방식 저장 오류:', e);
    }
  }, []);
  
  // 현재 스크롤 위치 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 스크롤 위치 저장 함수
    const saveScrollPosition = () => {
      // 스크롤 복원 중에는 저장하지 않음 - 중요!
      if (restoringScrollRef.current) return;
      
      try {
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        sessionStorage.setItem(STORAGE_KEYS.SCROLL_POS, scrollPosition.toString());
        console.log(`[Log] 스크롤 저장 [home]: ${window.location.pathname} = ${scrollPosition}`);
      } catch (e) {
        console.error('[MoreNews] 스크롤 위치 저장 오류:', e);
      }
    };
    
    // 스크롤 이벤트 디바운싱 (성능 최적화)
    let scrollTimer;
    const handleScroll = () => {
      // 스크롤 복원 중에는 이벤트 무시
      if (restoringScrollRef.current) return;
      
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(saveScrollPosition, 300);
    };
    
    // 페이지 나갈 때 최종 스크롤 위치 저장
    const handleBeforeUnload = () => {
      // 스크롤 복원 중이 아닐 때만 저장
      if (!restoringScrollRef.current) {
        saveScrollPosition();
      }
      
      // 뉴스 데이터도 저장
      if (allNews.length > 0) {
        try {
          sessionStorage.setItem(STORAGE_KEYS.NEWS_DATA, JSON.stringify(allNews));
          sessionStorage.setItem(STORAGE_KEYS.NEWS_PAGE, page.toString());
          sessionStorage.setItem(STORAGE_KEYS.CACHE_TIME, Date.now().toString()); // 이탈 시 캐시 타임 업데이트
        } catch (e) {
          console.error('[MoreNews] 이탈 시 데이터 저장 오류:', e);
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimeout(scrollTimer);
    };
  }, [allNews, page, restoringScrollRef.current]);
  
  // 뒤로가기 시 스크롤 위치 복원 - 간소화된 코드
  useEffect(() => {
    if (typeof window === 'undefined' || !restoringScrollRef.current) return;
    
    // 스크롤 타이머 참조 배열
    const scrollTimers = [];
    
    try {
      const savedScrollPosition = parseInt(sessionStorage.getItem(STORAGE_KEYS.SCROLL_POS) || '0');
      if (savedScrollPosition > 0) {
        console.log(`[MoreNews] 스크롤 위치 복원: ${savedScrollPosition}px`);
        
        // 스크롤 복원은 한 번만 시도 (지연 적용)
        const timer = setTimeout(() => {
          // 중요: 복원 중인 상태인 경우에만 스크롤 복원 실행
          if (restoringScrollRef.current) {
            window.scrollTo({
              top: savedScrollPosition,
              behavior: 'auto'
            });
            
            // 스크롤 복원 직후 세션 스토리지에서 스크롤 위치 제거
            // 이렇게 하면 사용자의 추가 스크롤 상호작용이 존중됨
            sessionStorage.removeItem(STORAGE_KEYS.SCROLL_POS);
            
            // 스크롤 복원 플래그 비활성화 (즉시)
            restoringScrollRef.current = false;
            console.log('[MoreNews] 스크롤 복원 완료 - 복원 모드 비활성화');
          }
        }, 300);
        
        scrollTimers.push(timer);
      } else {
        // 저장된 스크롤 위치가 없으면 즉시 복원 모드 비활성화
        restoringScrollRef.current = false;
        console.log('[MoreNews] 저장된 스크롤 위치 없음 - 복원 모드 비활성화');
      }
    } catch (e) {
      console.error('[MoreNews] 스크롤 위치 복원 오류:', e);
      restoringScrollRef.current = false;
    }
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      scrollTimers.forEach(timer => clearTimeout(timer));
    };
  }, [restoringScrollRef.current]);

  // Intersection Observer 설정 (무한스크롤을 위한 핵심 기능)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('[MoreNews] Observer 설정 시도 - loading:', loading, 'hasMore:', hasMore, 'allNews.length:', allNews.length);
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log('[MoreNews] Observer 콜백 - isIntersecting:', entry.isIntersecting, 'loading:', loading, 'hasMore:', hasMore);
          if (entry.isIntersecting && !loading && hasMore) {
            console.log('[MoreNews] 조건 만족 - 추가 뉴스 로드 시작');
            loadMoreNews();
          }
        });
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    // observer 설정을 약간 지연시켜 DOM이 완전히 렌더링된 후 설정
    const timer = setTimeout(() => {
      if (lastNewsElementRef.current) {
        observer.observe(lastNewsElementRef.current);
        console.log('[MoreNews] Intersection Observer 설정 완료 - 감지 요소:', lastNewsElementRef.current);
      } else {
        console.log('[MoreNews] 경고: lastNewsElementRef.current가 null입니다');
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (lastNewsElementRef.current) {
        observer.unobserve(lastNewsElementRef.current);
      }
      observer.disconnect();
      console.log('[MoreNews] Intersection Observer 정리 완료');
    };
  }, [loading, hasMore, allNews.length]); // allNews.length 의존성 추가로 새 뉴스 로드 시 observer 재설정
  
  // 스켈레톤 작은 카드 컴포넌트 (재사용 가능)
  const SkeletonSmallCard = () => (
    <div className="flex gap-2 bg-white py-3">
      <div className="w-40 h-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
      </div>
      <div className="flex-1 pt-0 pr-3 pb-0 pl-3 flex flex-col justify-between">
        <div>
          <div className="h-5 w-1/3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md mb-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
          </div>
          <div className="h-4 w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md mb-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
          </div>
          <div className="h-4 w-5/6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
          </div>
        </div>
        <div className="flex items-end justify-between w-full mt-2">
          <div className="h-3 w-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
          </div>
          <div className="h-4 w-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mb-8 md:mb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          {/* New Icon */}
          <div className="mr-4 flex-shrink-0">
            <img
              src="/images/icons8-new-50.png"
              alt="New Icon"
              className="h-12 w-12 object-contain"
            />
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold tracking-wider uppercase mb-1 block" style={{ color: '#233CFA' }}>Continue Reading</span>
            <h2 className="text-2xl font-bold text-gray-800">Latest K-Pop Updates</h2>
          </div>
        </div>
      </div>

      {/* 데이터가 없고 로딩 중이 아닌 경우 빈 화면 표시 */}
      {(newsSets.length === 0 && !loading) && (
        <div className="text-center py-16">
          {error ? (
            // 에러가 발생한 경우 에러 메시지 표시
            <div>
              <p className="text-red-500 mb-2">An error occurred while loading data.</p>
              <p className="text-gray-500 mb-4">{error}</p>
              <button 
                onClick={() => {
                  setError(null);
                  setPage(1);
                  setHasMore(true);
                  loadMoreNews();
                }} 
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            // 일반적인 데이터 없음 메시지
            <div>
              <p className="text-gray-500">No news available to display.</p>
              <button 
                onClick={() => {
                  setPage(1);
                  setHasMore(true);
                  loadMoreNews();
                }} 
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
              >
                Load News
              </button>
            </div>
          )}
        </div>
      )}

      {/* 각 뉴스 세트 렌더링 */}
      {newsSets.map((set, setIndex) => (
        <div key={`set-${setIndex}`} className="mb-10">
          {set.length > 0 && (
            <>
              {/* 모바일에서는 기존 레이아웃 유지 */}
              <div className="block lg:hidden space-y-4">
                {/* 첫 번째 뉴스는 큰 카드로 표시 */}
                <Link
                  href={`/news/${set[0]._id || set[0].id}`}
                  key={set[0]._id || set[0].id}
                  onClick={handleNewsClick}
                >
                  <div className="block cursor-pointer">
                    <div className="bg-white rounded-lg overflow-hidden transition-all duration-300 group relative">
                      <div className="h-64 overflow-hidden relative">
                        {set[0].coverImage ? (
                          <img
                            src={set[0].coverImage}
                            alt={set[0].title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-md"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/images/placeholder.jpg";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span>Image Placeholder</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-bold text-gray-800 text-xl md:text-2xl mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#006fff] transition-colors">
                          {set[0].title}
                        </h3>
                        
                        <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                          {set[0].content && set[0].content.trim()
                            ? set[0].content.replace(/<[^>]*>/g, '').slice(0, 120) + '...' 
                            : set[0].summary 
                              ? set[0].summary.slice(0, 120) + '...'
                              : 'No content available'}
                        </p>
                        
                        <div className="flex justify-between items-end">
                          {/* 시간 배지 */}
                          <div className="flex items-center text-gray-500 text-xs">
                            <Clock size={12} className="mr-1 text-gray-500" />
                            <span>{new Date(set[0].createdAt || set[0].date).toLocaleDateString()}</span>
                          </div>
                          
                          {/* Read more 버튼 */}
                          <span className="inline-flex items-center text-xs font-medium hover:underline cursor-pointer group" style={{ color: '#233CFA' }}>
                            Read more <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" style={{ color: '#233CFA' }} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                
                {/* 나머지 뉴스는 작은 카드로 표시 */}
                <div className="space-y-2 mt-4">
                  {set.slice(1).map((news, idx) => {
                    // 모바일에서도 마지막 항목 감지를 정확히 하기 위해 검사 로직 개선
                    const isLastItem = setIndex === newsSets.length - 1 && 
                      (idx === set.slice(1).length - 1 || 
                       (allNews.length % NEWS_PER_SET !== 0 && 
                        idx === set.slice(1).length - 1 && 
                        allNews.length === setIndex * NEWS_PER_SET + idx + 2));
                    
                    return (
                      <Link
                        key={news._id || news.id}
                        href={`/news/${news._id || news.id}`}
                        onClick={handleNewsClick}
                      >
                        <div 
                          className="block bg-white overflow-hidden py-3 cursor-pointer"
                        >
                          <div className="flex gap-1">
                            {/* 썸네일 */}
                            <div className="w-40 h-32 flex-shrink-0 relative rounded-md overflow-hidden">
                              <img
                                src={news.coverImage || '/images/placeholder.jpg'}
                                alt={news.title}
                                className="w-full h-full object-cover rounded-md"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "/images/placeholder.jpg";
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            </div>
                            
                            {/* 콘텐츠 */}
                            <div className="flex-1 pt-0 pr-3 pb-0 pl-3 flex flex-col justify-between h-32">
                              <div>
                                <h3 className="text-base md:text-lg font-semibold line-clamp-3 text-gray-800 mt-2">
                                  {news.title}
                                </h3>
                              </div>
                              <div className="flex items-end justify-between w-full mt-2">
                                <div className="flex items-center text-gray-500 text-xs">
                                  <Clock size={12} className="mr-1" />
                                  {new Date(news.createdAt || news.date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* PC에서는 3열 그리드 레이아웃 적용 */}
              <div className="hidden lg:grid grid-cols-3 gap-6">
                {set.map((news, idx) => {
                  const isLastItem = setIndex === newsSets.length - 1 && idx === set.length - 1;
                  
                  return (
                    <Link
                      key={news._id || news.id}
                      href={`/news/${news._id || news.id}`}
                      onClick={handleNewsClick}
                    >
                      <div
                        className="block bg-white rounded-lg overflow-hidden transition-all duration-300 group relative cursor-pointer"
                      >
                        <div className="h-56 overflow-hidden relative">
                          {/* 이미지 */}
                          <img
                            src={news.coverImage || '/images/placeholder.jpg'}
                            alt={news.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-md"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/images/placeholder.jpg";
                            }}
                          />
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-bold text-gray-800 text-xl md:text-2xl mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#006fff] transition-colors">
                            {news.title}
                          </h3>
                          
                          <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                            {news.content && news.content.trim()
                              ? news.content.replace(/<[^>]*>/g, '').slice(0, 120) + '...' 
                              : news.summary 
                                ? news.summary.slice(0, 120) + '...'
                                : 'No content available'}
                          </p>
                          
                          <div className="flex justify-between items-end">
                            {/* 시간 배지 */}
                            <div className="flex items-center text-gray-500 text-xs">
                              <Clock size={12} className="mr-1 text-gray-500" />
                              <span>{new Date(news.createdAt || news.date).toLocaleDateString()}</span>
                            </div>
                            
                            {/* Read more 버튼 */}
                            <span className="inline-flex items-center text-xs font-medium hover:underline cursor-pointer group" style={{ color: '#233CFA' }}>
                              Read more <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" style={{ color: '#233CFA' }} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ))}
      
      {/* 추가 데이터 로딩 스켈레톤 UI */}
      {loading && (
        <div className="mt-4 mb-8 space-y-6 relative">
          {/* 모바일용 스켈레톤 UI (2개 카드 표시) */}
          <div className="block lg:hidden">
            {/* 큰 카드 스켈레톤 (첫 번째 카드) */}
            <div className="bg-white rounded-lg overflow-hidden relative mb-4">
              <div className="h-56 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync relative rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
              </div>
              <div className="p-4">
                <div className="h-6 w-3/4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md mb-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                </div>
                <div className="h-4 w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md mb-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                </div>
                <div className="h-4 w-2/3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md mb-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="h-3 w-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                  </div>
                  <div className="h-3 w-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 작은 카드 스켈레톤 (1개만 표시) */}
            <div className="space-y-2 mt-4">
              <SkeletonSmallCard />
            </div>
          </div>
          
          {/* 데스크탑용 스켈레톤 UI (그리드 레이아웃) */}
          <div className="hidden lg:grid grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`skeleton-desktop-${idx}`} className="bg-white rounded-lg overflow-hidden relative">
                <div className="h-56 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync relative rounded-lg overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                </div>
                <div className="p-4">
                  <div className="h-6 w-3/4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md mb-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                  </div>
                  <div className="h-4 w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md mb-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                  </div>
                  <div className="h-4 w-2/3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md mb-3 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                    </div>
                    <div className="h-3 w-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer-sync rounded-md relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-wave-sync"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 무한스크롤 감지를 위한 요소 (사용자에게 보이지 않음) */}
      {hasMore && !loading && allNews.length > 0 && (
        <div
          ref={lastNewsElementRef}
          className="w-full h-1"
          style={{ visibility: 'hidden' }}
        />
      )}

      {/* 더 이상 로드할 뉴스가 없음을 알리는 메시지 */}
      {!loading && !hasMore && allNews.length > 0 && allNews.length < maxNewsCount && (
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>You've reached all available news.</p>
        </div>
      )}

      {/* Add consistent bottom spacing */}
      <div className="mb-12"></div>

      {/* 모바일 마지막 아이템 감지를 위한 스타일 */}
      <style jsx>{`
        .mobile-last-item {
          margin-bottom: 50px;
          position: relative;
        }
        .mobile-last-item::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -30px;
          height: 30px;
          background: transparent;
        }
        @media (max-width: 768px) {
          div[key^="set-"]:last-child {
            margin-bottom: 60px;
          }
        }
        @media (min-width: 769px) {
          div[key^="set-"]:last-child {
            margin-bottom: 80px;
          }
        }
        .animate-spin-slow {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-shimmer-sync {
          background-size: 800px 100%;
          animation: shimmer 2s infinite linear;
          animation-delay: 0s !important;
        }
        @keyframes shimmer {
          0% {
            background-position: -400px 0;
          }
          100% {
            background-position: 400px 0;
          }
        }
        .animate-wave-sync {
          animation: wave 2s infinite ease-in-out;
          animation-delay: 0s !important;
        }
        @keyframes wave {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default MoreNews; 