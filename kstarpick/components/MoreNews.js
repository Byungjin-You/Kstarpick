import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import CategoryTag from './home/CategoryTag';

const NEWS_PER_LOAD = 12;

const MoreNews = ({ initialNews = [], category = '', storageKey = '' }) => {
  // initialNews로 즉시 초기화하여 빈 화면 flash 방지
  const [allNews, setAllNews] = useState(() => initialNews || []);
  const [page, setPage] = useState(() => {
    const len = initialNews?.length || 0;
    return len > 0 ? Math.ceil(len / NEWS_PER_LOAD) + 1 : 1;
  });
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const lastNewsElementRef = useRef();
  const maxNewsCount = 300;
  const initialLoadTimerRef = useRef(null);
  const restoringScrollRef = useRef(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const initialDataAppliedRef = useRef(initialNews?.length > 0);
  const initialNewsRef = useRef(initialNews); // 마운트 시 초기값 한 번만 캡처 (매 렌더마다 새 [] 참조 방지)
  const categoryRef = useRef(category); // 카테고리 값을 ref로 유지

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

  // 세션 스토리지 키 설정 - storageKey prop 우선, 없으면 카테고리 기반
  const baseKey = storageKey
    ? storageKey
    : category
      ? (isCategoryArray() ? category.join('_') : category)
      : '';
  const STORAGE_KEYS = {
    NEWS_DATA: baseKey ? `moreNews_${baseKey}Data` : 'moreNewsData',
    NEWS_PAGE: baseKey ? `moreNews_${baseKey}Page` : 'moreNewsPage',
    CACHE_TIME: baseKey ? `moreNews_${baseKey}CacheTime` : 'moreNewsCacheTime'
  };

  // 캐시 유효 기간 (30분)
  const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30분

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
        
        // 플래그 초기화 (일회성 사용)
        sessionStorage.removeItem('logoClicked');
      } else {
        // 세션 스토리지 데이터 확인
        const hasCachedNews = sessionStorage.getItem(STORAGE_KEYS.NEWS_DATA) !== null;
        const cacheTime = sessionStorage.getItem(STORAGE_KEYS.CACHE_TIME);

        // 캐시 유효성 검사
        let isCacheValid = false;
        if (cacheTime) {
          const timeDiff = Date.now() - parseInt(cacheTime);
          isCacheValid = timeDiff < CACHE_EXPIRY_TIME;
        }

        if (hasCachedNews && isCacheValid) {
          // 세션 스토리지에 유효한 데이터가 있으면 뒤로가기로 처리
          isBackNavigation = true;
          isRefresh = false;
        } else {
          // 캐시가 없거나 만료된 경우는 새로고침으로 처리
          isRefresh = true;
          isBackNavigation = false;
          
          // 만료된 캐시 정리
          if (hasCachedNews) {
            sessionStorage.removeItem(STORAGE_KEYS.NEWS_DATA);
            sessionStorage.removeItem(STORAGE_KEYS.NEWS_PAGE);
            sessionStorage.removeItem(STORAGE_KEYS.CACHE_TIME);
          }
        }
      }
    }
    
    // 뒤로가기 감지되면 스크롤 복원 플래그 활성화
    if (isBackNavigation) {
      restoringScrollRef.current = true;
      setIsRestoring(true);
      
      // 세션 스토리지에서 데이터 복원
      try {
        // 저장된 뉴스 데이터 복원
        const savedNewsData = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.NEWS_DATA) || '[]');
        const savedPage = parseInt(sessionStorage.getItem(STORAGE_KEYS.NEWS_PAGE) || '1');
        
        if (savedNewsData.length > 0) {
          
          // 300개 제한 적용하여 상태 설정
          const limitedSavedNews = savedNewsData.slice(0, maxNewsCount);
          setAllNews(limitedSavedNews);
          setPage(savedPage);
          
          // 300개 제한에 도달했으면 무한 스크롤 비활성화
          if (limitedSavedNews.length >= maxNewsCount) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }
          
          // 초기 데이터 처리 완료 표시
          initialDataAppliedRef.current = true;
        }
      } catch (e) {
        console.error('[MoreNews] 세션 스토리지 복원 오류:', e);
      }

      // 데이터 복원 후 잠시 뒤 플래그 해제 (무한스크롤 로딩 재개)
      setTimeout(() => {
        restoringScrollRef.current = false;
        setIsRestoring(false);
      }, 500);

      // 뒤로가기일 경우에는 여기서 함수 종료
      return;
    }
    
    // 새로고침 처리
    if (isRefresh) {
      
      // 세션 스토리지 초기화
      if (typeof window !== 'undefined') {
        try {
          // 모든 관련 스토리지 항목 제거
          sessionStorage.removeItem(STORAGE_KEYS.NEWS_DATA);
          sessionStorage.removeItem(STORAGE_KEYS.NEWS_PAGE);
          sessionStorage.removeItem(STORAGE_KEYS.CACHE_TIME);

          // 추가로 모든 moreNews 관련 캐시 정리
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('moreNews') || key.includes('moreNews')) {
              sessionStorage.removeItem(key);
            }
          });
          
          // 초기 데이터 제한 (원래대로 12개씩만)
          const initNews = initialNewsRef.current;
          const limitedInitialNews = initNews && initNews.length > 0
            ? initNews.slice(0, NEWS_PER_LOAD)
            : [];
          
          
          // 상태 초기화 - 초기 데이터가 있으면 page 2부터 시작 (page 1은 SSR 데이터로 커버)
          setAllNews(limitedInitialNews);
          setPage(limitedInitialNews.length > 0 ? 2 : 1);
          setHasMore(true);
          setError(null);

          // 초기 데이터가 없으면 즉시 API 호출
          if (limitedInitialNews.length === 0) {
            setTimeout(() => {
              loadMoreNews();
            }, 100);
          }
          
          // 초기 데이터 처리 완료 표시
          initialDataAppliedRef.current = true;
          
          // 새로고침 시 캐시 타임 설정
          sessionStorage.setItem(STORAGE_KEYS.CACHE_TIME, Date.now().toString());
          
        } catch (error) {
          console.error('[MoreNews] 초기화 중 오류:', error);
        }
      }
      
      return;
    }
    
    // 기본 초기화 (일반 탐색)
    if (!initialDataAppliedRef.current) {
      
      // 카테고리가 지정된 경우 initialNews에서 해당 카테고리만 필터링
      const initNewsDefault = initialNewsRef.current;
      let limitedNews;
      if (category && initNewsDefault.length > 0) {
        const filteredNews = initNewsDefault.filter(news => isNewsInCategory(news));
        limitedNews = (filteredNews || []).slice(0, NEWS_PER_LOAD);
      } else {
        limitedNews = (initNewsDefault || []).slice(0, NEWS_PER_LOAD);
      }
      setAllNews(limitedNews);

      // 초기 데이터가 있으면 page 2부터 시작
      setPage(limitedNews.length > 0 ? 2 : 1);
      setHasMore(true);
      setError(null);
      
      // 초기 데이터 처리 완료 표시
      initialDataAppliedRef.current = true;
      
    }

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (initialLoadTimerRef.current) {
        clearTimeout(initialLoadTimerRef.current);
      }
    };
  }, [category]);
  
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
      } catch (e) {
        console.error('[MoreNews] 상태 저장 오류:', e);
      }
    }
  }, [allNews, page]);

  // 스크롤 복원 후 추가 데이터 로드를 위한 useEffect 추가
  useEffect(() => {
    // 스크롤 복원 모드가 false로 변경되었을 때만 실행 (복원 완료 후)
    if (typeof window !== 'undefined' && !isRestoring) {
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
          loadMoreNews();
        }
      };
      
      // 스크롤 복원 후 약간의 지연을 두고 스크롤 위치 확인
      const checkTimer = setTimeout(checkScrollAfterRestore, 500);
      
      return () => {
        clearTimeout(checkTimer);
      };
    }
  }, [isRestoring, hasMore, loading]);

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
        loadMoreNews();
      }
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll);
    
    // 초기 페이지 로드 시 화면이 충분히 차지 않으면 추가 로드
    const initialCheckTimer = setTimeout(() => {
      if (document.body.scrollHeight <= window.innerHeight && hasMore && !loading && !restoringScrollRef.current) {
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
  }, [allNews, hasMore, loading, isRestoring]);

  // 추가 뉴스 로드
  const loadMoreNews = async () => {
    if (loading) {
      return;
    }
    
    // 스크롤 복원 중이면 건너뛰기
    if (restoringScrollRef.current) {
      return;
    }
    
    // 최대 뉴스 개수 제한 확인
    if (allNews.length >= maxNewsCount) {
      setHasMore(false);
      return;
    }
    
    try {
      // 로딩 상태 설정
      setLoading(true);
      
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
          
          
          const response = await fetch(apiUrl);
          if (!response.ok) {
            console.error(`[MoreNews] API 오류 (카테고리: ${cat}): ${response.status}`);
            return [];
          }
          
          const data = await response.json();
          if (!data.success || !data.data) {
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
            allReceivedNews = [...allReceivedNews, ...newsArray];
          }
        });
        
        // 모든 카테고리에서 뉴스를 받아오지 못한 경우
        if (allReceivedNews.length === 0) {
          setHasMore(false);
          setLoading(false);
          return;
        }
        
        // 뉴스 중복 제거 및 정렬 (발행일 우선, 없으면 생성일 기준 내림차순)
        const uniqueNewsIds = new Set();
        const uniqueNews = allReceivedNews.filter(news => {
          const id = news._id || news.id;
          if (!id || uniqueNewsIds.has(id)) return false;
          uniqueNewsIds.add(id);
          return true;
        }).sort((a, b) => {
          const dateA = new Date(a.publishedAt || a.createdAt);
          const dateB = new Date(b.publishedAt || b.createdAt);
          return dateB - dateA;
        });
        
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
      
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // API에서 데이터 반환됐는지 확인
      if (!data.success || !data.data) {
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
        setHasMore(false);
        return;
      }
      
      // 데이터가 비어있는 경우
      if (receivedNews.length === 0) {
        setHasMore(false);
        return;
      }
      
      // 카테고리 필터링 한번 더 적용 (서버에서 제대로 필터링되지 않았을 경우 대비)
      const filteredNews = currentCategory && !isMultiCategory
        ? receivedNews.filter(news => news.category === currentCategory)
        : receivedNews;
        
      if (currentCategory && !isMultiCategory && filteredNews.length < receivedNews.length) {
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
          setHasMore(false);
        }
        
        return limitedNews;
      });
      
      // 페이지 번호 증가
      setPage(prev => prev + 1);
      
      // 마지막 페이지 여부 확인
      // 카테고리 API는 data.data가 배열이므로 pagination이 최상위에 있음
      const pagination = Array.isArray(data.data) ? data.pagination : data.data?.pagination;
      const totalPages = pagination?.totalPages || pagination?.pages || 0;
      const isLastPage = pagination && (page >= totalPages || receivedNews.length < NEWS_PER_LOAD);
      
      if (isLastPage) {
        setHasMore(false);
      }
      
    } catch (err) {
      console.error('[MoreNews] 데이터 로드 오류:', err);
      setError(err.message);
      
      // API 에러 시 무한스크롤 비활성화하여 무한루프 방지
      if (err.message.includes('API error: 500')) {
        setHasMore(false);
      }
    } finally {
      // 로딩 상태 해제
      setLoading(false);
    }
  };

  // 카테고리 필터링 보정 (카테고리 페이지에서 잘못된 카테고리 기사 제거)
  useEffect(() => {
    if (category && allNews.length > 0) {
      const correctCategoryCount = allNews.filter(news => isNewsInCategory(news)).length;
      if (correctCategoryCount < allNews.length * 0.9) {
        setAllNews(prev => prev.filter(news => isNewsInCategory(news)));
      }
    }
  }, [allNews.length, category]);
  
  // 페이지 나갈 때 뉴스 데이터 저장 (스크롤 복원은 _app.js + useScrollRestore에서 처리)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      if (allNews.length > 0) {
        try {
          sessionStorage.setItem(STORAGE_KEYS.NEWS_DATA, JSON.stringify(allNews));
          sessionStorage.setItem(STORAGE_KEYS.NEWS_PAGE, page.toString());
          sessionStorage.setItem(STORAGE_KEYS.CACHE_TIME, Date.now().toString());
        } catch (e) {
          console.error('[MoreNews] 이탈 시 데이터 저장 오류:', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [allNews, page]);

  // Intersection Observer 설정 (무한스크롤을 위한 핵심 기능)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loading && hasMore) {
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
      } else {
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (lastNewsElementRef.current) {
        observer.unobserve(lastNewsElementRef.current);
      }
      observer.disconnect();
    };
  }, [loading, hasMore, allNews.length]); // allNews.length 의존성 추가로 새 뉴스 로드 시 observer 재설정
  
  // 시간 표시 함수
  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHr < 24) return `${diffHr} hr ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // 모든 뉴스를 flat 리스트로 렌더링
  const filteredNews = category
    ? allNews.filter(news => isNewsInCategory(news))
    : allNews;

  // PC 3열 그리드에서 마지막 행이 불완전하지 않도록 3의 배수로 표시
  // (더 로드할 데이터가 있을 때만 - 마지막 페이지면 전체 표시)
  const displayedNews = hasMore && filteredNews.length > 3 && filteredNews.length % 3 !== 0
    ? filteredNews.slice(0, Math.floor(filteredNews.length / 3) * 3)
    : filteredNews;

  return (
    <div className="mb-8 md:mb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[26px] font-black text-[#101828]">
            {category === 'movie' ? 'More Movie News' :
             category === 'drama' ? 'More Drama News' :
             (category === 'celeb' || (Array.isArray(category) && category.includes('celeb'))) ? 'More Celebrity News' :
             'More News'}
          </h2>
          <span className="text-2xl">🔥</span>
        </div>
      </div>

      {/* Empty state */}
      {(displayedNews.length === 0 && !loading) && (
        <div className="text-center py-16">
          {error ? (
            <div>
              <p className="text-red-500 mb-2">An error occurred while loading data.</p>
              <p className="text-ksp-meta mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setPage(1);
                  setHasMore(true);
                  loadMoreNews();
                }}
                className="mt-2 px-4 py-2 bg-ksp-accent text-white rounded-full hover:opacity-90 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div>
              <p className="text-ksp-meta">No news available to display.</p>
              <button
                onClick={() => {
                  setPage(1);
                  setHasMore(true);
                  loadMoreNews();
                }}
                className="mt-4 px-4 py-2 bg-ksp-accent text-white rounded-full hover:opacity-90 transition-colors"
              >
                Load News
              </button>
            </div>
          )}
        </div>
      )}

      {/* News grid - 3-column card style matching ArticleCardGrid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayedNews.map((news) => (
          <Link
            key={news._id || news.id}
            href={`/news/${news.slug || news._id || news.id}`}
            className="cursor-pointer group"
          >
            {/* Image */}
            <div className="relative rounded-card overflow-hidden mb-4 bg-[#F3F4F6]">
              <img
                src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                alt={news.title}
                className="w-full h-[209px] object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/images/news/default-news.jpg';
                }}
              />
              <CategoryTag category={news.category} variant="overlay" className="absolute top-3 left-3" />
            </div>

            {/* Title */}
            <h3
              className="font-bold text-lg leading-[1.375] text-[#101828] line-clamp-2 mb-2 group-hover:text-ksp-accent transition-colors"
              style={{ letterSpacing: '-0.0244em' }}
            >
              {news.title}
            </h3>

            {/* Description */}
            <p
              className="text-sm leading-[1.625] line-clamp-2 mb-2"
              style={{ color: '#6A7282', letterSpacing: '-0.0107em', fontFamily: 'Pretendard, Inter, sans-serif' }}
            >
              {news.content ? news.content.replace(/<[^>]*>/g, '').slice(0, 120) : (news.summary || '')}
            </p>

            {/* Date */}
            <span className="text-xs text-ksp-meta">
              {getTimeAgo(news.createdAt || news.publishedAt || news.date)}
            </span>
          </Link>
        ))}
      </div>

      {/* Loading skeleton - 3-column card style */}
      {loading && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={`skeleton-${idx}`}>
              <div className="w-full h-[209px] rounded-card bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse mb-4" />
              <div className="h-5 w-full bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-5 w-3/4 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-4 w-full bg-gray-100 animate-pulse rounded mb-1" />
              <div className="h-4 w-2/3 bg-gray-100 animate-pulse rounded mb-2" />
              <div className="h-3 w-20 bg-gray-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && !loading && allNews.length > 0 && (
        <div
          ref={lastNewsElementRef}
          className="w-full h-1"
          style={{ visibility: 'hidden' }}
        />
      )}

      {/* End of list message */}
      {!loading && !hasMore && allNews.length > 0 && allNews.length < maxNewsCount && (
        <div className="text-center py-6 text-ksp-meta text-sm">
          <p>You've reached all available news.</p>
        </div>
      )}

      <div className="mb-12"></div>
    </div>
  );
};

export default MoreNews; 