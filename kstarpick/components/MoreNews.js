import React, { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import CategoryTag from './home/CategoryTag';

const NEWS_PER_LOAD = 12;
const MAX_NEWS_COUNT = 300;

// ── API fetch 헬퍼 ──

function buildApiUrl(category, pageParam) {
  if (!category) return `/api/news?page=${pageParam}&limit=${NEWS_PER_LOAD}`;
  if (category === 'drama') return `/api/news/drama?page=${pageParam}&limit=${NEWS_PER_LOAD}`;
  if (category === 'movie') return `/api/news/movie?page=${pageParam}&limit=${NEWS_PER_LOAD}`;
  if (category === 'kpop') return `/api/news?page=${pageParam}&limit=${NEWS_PER_LOAD}&category=kpop`;
  if (category === 'celeb') return `/api/news/celeb?page=${pageParam}&limit=${NEWS_PER_LOAD}`;
  return `/api/news?page=${pageParam}&limit=${NEWS_PER_LOAD}&category=${encodeURIComponent(category)}`;
}

async function fetchNewsSingle(category, pageParam) {
  const url = buildApiUrl(category, pageParam);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (!data.success || !data.data) return { news: [], hasMore: false };

  let newsArray;
  if (Array.isArray(data.data)) {
    newsArray = data.data;
  } else if (data.data.news && Array.isArray(data.data.news)) {
    newsArray = data.data.news;
  } else {
    return { news: [], hasMore: false };
  }

  const pagination = Array.isArray(data.data) ? data.pagination : data.data?.pagination;
  const totalPages = pagination?.totalPages || pagination?.pages || 0;
  const isLastPage = pagination ? (pageParam >= totalPages || newsArray.length < NEWS_PER_LOAD) : newsArray.length < NEWS_PER_LOAD;

  return { news: newsArray, hasMore: !isLastPage };
}

async function fetchNewsMulti(categories, pageParam) {
  const promises = categories.map(async (cat) => {
    let url;
    if (cat === 'drama') url = `/api/news/drama?page=${pageParam}&limit=${NEWS_PER_LOAD}`;
    else if (cat === 'movie') url = `/api/news/movie?page=${pageParam}&limit=${NEWS_PER_LOAD}`;
    else if (cat === 'kpop') url = `/api/news?page=${pageParam}&limit=${NEWS_PER_LOAD}&category=kpop`;
    else if (cat === 'celeb') url = `/api/news/celeb?page=${pageParam}&limit=${NEWS_PER_LOAD}`;
    else url = `/api/news?page=${pageParam}&limit=${NEWS_PER_LOAD}&category=${encodeURIComponent(cat)}`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success || !data.data) return [];
    if (Array.isArray(data.data)) return data.data;
    if (data.data.news && Array.isArray(data.data.news)) return data.data.news;
    return [];
  });

  const results = await Promise.all(promises);
  const allNews = results.flat();

  const seen = new Set();
  const unique = allNews.filter(n => {
    const id = n._id || n.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));

  return { news: unique, hasMore: unique.length >= NEWS_PER_LOAD };
}

// ── 크로스 브라우저 스크롤 유틸 ──

function getScrollPos() {
  return Math.max(
    document.body.scrollTop,
    window.scrollY || 0,
    window.pageYOffset || 0,
    document.documentElement.scrollTop,
    (document.scrollingElement || {}).scrollTop || 0
  );
}

function getViewportHeight() {
  return window.innerHeight || document.documentElement.clientHeight;
}

function isNearBottom(threshold = 500) {
  const scrollPos = getScrollPos();
  const contentH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  const viewportH = getViewportHeight();
  return contentH - scrollPos - viewportH < threshold;
}

// ── 뒤로가기 감지 (SPA + 풀 리로드 모두 대응) ──

function isBackNavigation() {
  // 1) Next.js SPA 뒤로가기 플래그
  if (typeof window !== 'undefined' && sessionStorage.getItem('_navWasBack') === 'true') {
    return true;
  }
  // 2) Performance API — 풀 페이지 리로드(모바일 뒤로가기)에서도 작동
  try {
    const nav = performance.getEntriesByType('navigation');
    if (nav.length > 0 && nav[0].type === 'back_forward') return true;
  } catch (e) {}
  return false;
}

// ── sessionStorage 데이터 백업/복원 (모바일 bfcache 대응) ──

function compactNews(item) {
  return {
    _id: item._id || item.id,
    title: item.title,
    coverImage: item.coverImage || item.thumbnailUrl || '',
    thumbnailUrl: item.thumbnailUrl || '',
    category: item.category || '',
    slug: item.slug || '',
    createdAt: item.createdAt || item.publishedAt || '',
    publishedAt: item.publishedAt || '',
    content: item.content ? item.content.replace(/<[^>]*>/g, '').slice(0, 150) : '',
    summary: item.summary || '',
  };
}

function saveNewsToStorage(key, newsItems) {
  try {
    const compact = newsItems.map(compactNews);
    sessionStorage.setItem(`moreNews_${key}`, JSON.stringify(compact));
  } catch (e) {
    // sessionStorage 용량 초과 시 무시
  }
}

function loadNewsFromStorage(key) {
  try {
    const raw = sessionStorage.getItem(`moreNews_${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// ── 메인 컴포넌트 ──

const MoreNews = ({ initialNews = [], category = '', storageKey = '' }) => {
  const isCatArray = Array.isArray(category);
  const baseKey = storageKey
    ? storageKey
    : category
      ? (isCatArray ? category.join('_') : category)
      : '';
  const queryKey = ['moreNews', baseKey || 'all'];
  const ssKey = baseKey || 'all';

  const sentinelRef = useRef(null);

  // 모바일 fallback: sessionStorage에서 복원한 데이터
  // useEffect로 설정하여 hydration mismatch 방지 (서버에서는 항상 null)
  const [cachedNews, setCachedNews] = useState(null);

  useEffect(() => {
    if (!isBackNavigation()) return;
    const cached = loadNewsFromStorage(ssKey);
    if (cached && cached.length > 0) {
      setCachedNews(cached);
    }
  }, []);

  // ── React Query: 데이터를 메모리에 캐시 (30분) ──
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      if (isCatArray && category.length > 0) {
        return fetchNewsMulti(category, pageParam);
      }
      return fetchNewsSingle(category || '', pageParam);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      const totalNews = allPages.reduce((sum, p) => sum + p.news.length, 0);
      if (totalNews >= MAX_NEWS_COUNT) return undefined;
      return allPages.length + 1;
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: false,
  });

  // ── 뉴스 데이터 flatten ──
  // 우선순위: React Query 캐시 > sessionStorage 캐시 > SSR initialNews
  const allNews = React.useMemo(() => {
    // 1) React Query에 데이터가 있으면 사용
    if (data?.pages && data.pages.length > 0) {
      const seen = new Set();
      const flat = [];
      for (const page of data.pages) {
        for (const item of page.news) {
          const id = item._id || item.id;
          if (id && !seen.has(id)) {
            seen.add(id);
            flat.push(item);
          }
        }
      }
      return flat.slice(0, MAX_NEWS_COUNT);
    }
    // 2) sessionStorage에 캐시된 데이터가 있으면 사용 (모바일 bfcache 대응)
    if (cachedNews && cachedNews.length > 0) {
      return cachedNews;
    }
    // 3) SSR initialNews fallback
    return initialNews || [];
  }, [data, cachedNews]);

  const filteredNews = React.useMemo(() => {
    if (!category) return allNews;
    return allNews.filter(news => {
      if (!news || !news.category) return false;
      if (isCatArray) return category.includes(news.category);
      return news.category === category;
    });
  }, [allNews, category]);

  const displayedNews = hasNextPage && filteredNews.length > 3 && filteredNews.length % 3 !== 0
    ? filteredNews.slice(0, Math.floor(filteredNews.length / 3) * 3)
    : filteredNews;

  // ── sessionStorage에 데이터 백업 (페이지 이탈 시 보존) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // React Query 데이터가 initialNews보다 많으면 저장
    if (data?.pages && data.pages.length > 0 && allNews.length > (initialNews?.length || 0)) {
      saveNewsToStorage(ssKey, allNews);
    }
  }, [allNews.length, data]);

  // ── 무한 스크롤 ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasNextPage || isFetchingNextPage) return;

    let triggered = false;
    const tryFetch = () => {
      if (triggered || !hasNextPage || isFetchingNextPage) return;
      triggered = true;
      fetchNextPage();
    };

    // 1) IntersectionObserver
    let observer;
    const el = sentinelRef.current;
    if (el) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) tryFetch();
        },
        { rootMargin: '300px', threshold: 0 }
      );
      observer.observe(el);
    }

    // 2) scroll 이벤트 (모바일 + PC)
    let scrollTimer;
    const handleScroll = () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        if (isNearBottom(500)) tryFetch();
      }, 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.body.addEventListener('scroll', handleScroll, { passive: true });

    // 3) 화면 안 차면 자동 로드
    const fillTimer = setTimeout(() => {
      const ch = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      if (ch <= getViewportHeight() + 100) tryFetch();
    }, 500);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      document.body.removeEventListener('scroll', handleScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
      clearTimeout(fillTimer);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, allNews.length]);

  // ── 시간 표시 ──
  const getTimeAgo = useCallback((dateStr) => {
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
  }, []);

  // ── 렌더링 ──
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
      {(displayedNews.length === 0 && !isLoading && !isFetchingNextPage) && (
        <div className="text-center py-16">
          {isError ? (
            <div>
              <p className="text-red-500 mb-2">An error occurred while loading data.</p>
              <p className="text-ksp-meta mb-4">{error?.message}</p>
              <button
                onClick={() => refetch()}
                className="mt-2 px-4 py-2 bg-ksp-accent text-white rounded-full hover:opacity-90 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div>
              <p className="text-ksp-meta">No news available to display.</p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-ksp-accent text-white rounded-full hover:opacity-90 transition-colors"
              >
                Load News
              </button>
            </div>
          )}
        </div>
      )}

      {/* News grid */}
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

      {/* Loading skeleton */}
      {(isLoading || isFetchingNextPage) && (
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
      {hasNextPage && !isFetchingNextPage && allNews.length > 0 && (
        <div
          ref={sentinelRef}
          className="w-full h-1"
          style={{ visibility: 'hidden' }}
        />
      )}

      {/* End of list */}
      {!isLoading && !hasNextPage && allNews.length > 0 && allNews.length < MAX_NEWS_COUNT && (
        <div className="text-center py-6 text-ksp-meta text-sm">
          <p>You've reached all available news.</p>
        </div>
      )}

      <div className="mb-12"></div>
    </div>
  );
};

export default MoreNews;
