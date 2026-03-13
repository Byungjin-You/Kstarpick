import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import useScrollRestore from '../hooks/useScrollRestore';
import Head from 'next/head';
import MainLayout from '../components/MainLayout';
import CommentTicker from '../components/home/CommentTicker';
import TrendingNow from '../components/home/TrendingNow';
import { Search, X } from 'lucide-react';
import SearchResults from '../components/SearchResults';
import SearchSuggestions from '../components/SearchSuggestions';
import { generateSearchResultsJsonLd } from '../utils/seoHelpers';

export default function SearchPage({ recentComments = [], rankingNews = [], trendingNews = [], editorsPickNews = [] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const activeTab = 'all';
  const viewMode = 'grid';
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    news: [],
    dramas: [],
    movies: [],
    actors: []
  });
  const filters = {
    dateRange: 'all',
    sortBy: 'relevance',
    category: 'all'
  };
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sidebar sticky
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  useEffect(() => {
    if (!sidebarStickyRef.current) return;
    const ro = new ResizeObserver(() => {
      const header = document.querySelector('header');
      if (header) setSidebarStickyTop(header.offsetHeight + 8);
    });
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  // Handle search when query parameter changes
  useEffect(() => {
    if (router.isReady && router.query.q) {
      setSearchTerm(router.query.q);
      performSearch(router.query.q);
    }
  }, [router.isReady, router.query.q]);

  useScrollRestore('searchScrollPosition', 'isBackToSearch', { deps: [router.asPath] });

  const navigateToPage = (path) => {
    router.push(path);
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/images/news/default-news.jpg';
  };

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

  const performSearch = async (query) => {
    setIsLoading(true);
    setHasSearched(false);
    setLastSearchQuery(query);
    try {
      const params = new URLSearchParams({
        q: query,
        type: activeTab,
        page: 1,
        limit: 50,
        sortBy: filters.sortBy,
        dateRange: filters.dateRange
      });

      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data = await response.json();

      if (activeTab === 'all') {
        if (data.success && data.data && data.data.news) {
          setSearchResults({
            news: data.data.news,
            dramas: [],
            movies: [],
            actors: []
          });
        } else {
          setSearchResults(data.results || {
            news: [],
            dramas: [],
            movies: [],
            actors: []
          });
        }
      } else {
        setSearchResults(prev => ({
          ...prev,
          [activeTab]: data.results || []
        }));
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        news: [],
        dramas: [],
        movies: [],
        actors: []
      });
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push({
        pathname: '/search',
        query: { q: searchTerm }
      });
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setSearchTerm(suggestion);
    router.push({
      pathname: '/search',
      query: { q: suggestion }
    });
    setShowSuggestions(false);
  };

  const getTotalResults = () => {
    return Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0);
  };

  const getActiveResults = () => {
    if (activeTab === 'all') {
      return Object.values(searchResults).flat();
    }
    return searchResults[activeTab] || [];
  };

  // --- Shared search form ---
  const renderSearchForm = () => (
    <form onSubmit={handleSearch} className="relative" onBlur={(e) => {
      // Close suggestions when focus leaves the form entirely
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setTimeout(() => setShowSuggestions(false), 150);
      }
    }}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search K-POP news, dramas, movies, actors..."
          className="w-full px-4 py-3 pl-12 bg-white border-[1.5px] border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-ksp-accent/30 focus:border-ksp-accent"
          style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}
        />
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#99A1AF]" size={20} />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setShowSuggestions(true);
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#99A1AF] hover:text-[#4A5565]"
          >
            <X size={20} />
          </button>
        )}
      </div>
      {showSuggestions && (
        <div className="absolute w-full mt-2 z-50">
          <SearchSuggestions
            searchTerm={searchTerm}
            onSelect={handleSuggestionSelect}
            className="max-h-[400px] overflow-y-auto"
          />
        </div>
      )}
    </form>
  );

  // --- Shared loading spinner ---
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-ksp-accent animate-spin"></div>
      </div>
      <p className="text-lg font-medium text-gray-800 mb-1">Searching...</p>
    </div>
  );

  // --- Shared empty/no results ---
  const renderEmpty = (message, sub) => (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 flex items-center justify-center text-gray-300 mb-4">
        <Search size={48} />
      </div>
      <h3 className="text-lg font-medium text-gray-900">{message}</h3>
      <p className="mt-2 text-gray-500">{sub}</p>
    </div>
  );

  return (
    <MainLayout>
      <Head>
        <title>{searchTerm ? `"${searchTerm}" Search Results` : 'Search'} - KstarPick</title>
        <meta name="description" content={searchTerm ? `Search results for "${searchTerm}". Find K-Pop news, Korean dramas, movies, and celebrity information.` : 'Search K-Pop news, Korean dramas, movies, and celebrity information.'} />
        <meta name="robots" content="noindex, follow" />
        {searchTerm && getTotalResults() > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(generateSearchResultsJsonLd(searchTerm, getActiveResults().slice(0, 10).map(item => ({
                title: item.title,
                url: item.type === 'news' ? `/news/${item._id}` : item.type === 'drama' ? `/drama/${item._id}` : `/tvfilm/${item._id}`,
                description: item.description || item.summary
              }))))
            }}
          />
        )}
      </Head>

      {/* ============ MOBILE LAYOUT (< lg) ============ */}
      <div className="lg:hidden">
        <main className="pt-4 pb-24 px-4">
          {/* Search Form */}
          <div className="mb-6">
            {renderSearchForm()}
          </div>

          {/* Results Header */}
          {hasSearched && !isLoading && (
            <div className="mb-4">
              <h1 className="font-bold text-[20px] text-[#101828]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                Search Results for &ldquo;{lastSearchQuery}&rdquo;
              </h1>
              <p className="text-[13px] text-[#99A1AF] mt-1">{getTotalResults()} results found</p>
            </div>
          )}

          {/* Results */}
          {isLoading ? renderLoading() : hasSearched ? (
            getTotalResults() > 0 ? (
              <SearchResults
                results={getActiveResults()}
                viewMode={viewMode}
                type={activeTab === 'all' ? 'news' : activeTab}
                searchQuery={lastSearchQuery}
              />
            ) : renderEmpty('No results found', 'Try adjusting your search to find what you\'re looking for.')
          ) : renderEmpty('Start your search', 'Enter a search term to find K-POP news, dramas, movies, and more.')}
        </main>
      </div>

      {/* ============ PC LAYOUT (lg+) ============ */}
      <div className="hidden lg:block">
        <main className="pt-0 pb-16 bg-[#F8F9FA]">
          <div className="max-w-[1772px] mx-auto px-10 pt-8">
            <div className="flex flex-row gap-[60px]">

              {/* Left: Main Content */}
              <div className="flex-1 min-w-0">

                {/* Search Card */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl" style={{ padding: '30px 24px' }}>
                  {/* Header */}
                  <div className="flex items-center gap-2.5 mb-6">
                    <h1 className="text-[26px] font-black" style={{ fontFamily: 'Pretendard, sans-serif', color: '#101828' }}>
                      Search
                    </h1>
                  </div>

                  {/* Search Form */}
                  <div className="mb-6">
                    {renderSearchForm()}
                  </div>

                  {/* Results Header */}
                  {hasSearched && !isLoading && (
                    <div className="mb-6 pb-4 border-b border-[#F3F4F6]">
                      <p className="text-[15px] text-[#4A5565]">
                        <span className="font-bold text-[#101828]">{getTotalResults()}</span> results for &ldquo;<span className="font-bold text-ksp-accent">{lastSearchQuery}</span>&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Results */}
                  {isLoading ? renderLoading() : hasSearched ? (
                    getTotalResults() > 0 ? (
                      <SearchResults
                        results={getActiveResults()}
                        viewMode={viewMode}
                        type={activeTab === 'all' ? 'news' : activeTab}
                        searchQuery={lastSearchQuery}
                      />
                    ) : renderEmpty('No results found', 'Try adjusting your search to find what you\'re looking for.')
                  ) : renderEmpty('Start your search', 'Enter a search term to find K-POP news, dramas, movies, and more.')}
                </div>

              </div>

              {/* Right: Sidebar (500px) */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarStickyRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    {/* Comment Ticker */}
                    <CommentTicker comments={recentComments || []} onNavigate={navigateToPage} />

                    {/* Trending NOW */}
                    <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews || []} onNavigate={navigateToPage} />

                    {/* Editor's PICK */}
                    {(editorsPickNews.length > 0 || (rankingNews && rankingNews.length > 0)) && (
                      <div>
                        <h3 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-4 pl-1">Editor&apos;s <span className="text-ksp-accent">PICK</span></h3>
                        <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
                          {(editorsPickNews.length > 0 ? editorsPickNews : rankingNews).slice(0, 6).map((item) => (
                            <div
                              key={item._id}
                              className="flex gap-4 cursor-pointer group"
                              onClick={() => navigateToPage(`/news/${item.slug || item._id}`)}
                            >
                              <div className="flex-shrink-0 w-[140px] h-[90px] rounded overflow-hidden">
                                <img
                                  src={item.coverImage || item.thumbnailUrl || '/images/news/default-news.jpg'}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={handleImageError}
                                />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block px-1.5 py-0.5 bg-ksp-accent text-white text-[10px] font-bold uppercase tracking-wider rounded">
                                    {item.category === 'kpop' ? 'K-POP' : item.category === 'drama' ? 'DRAMA' : item.category === 'movie' ? 'FILM' : item.category === 'celeb' ? 'CELEB' : 'NEWS'}
                                  </span>
                                  <span className="text-xs font-medium text-ksp-meta">
                                    {getTimeAgo(item.createdAt || item.publishedAt)}
                                  </span>
                                </div>
                                <h4 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2 group-hover:text-ksp-accent transition-colors">
                                  {item.title}
                                </h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  try {
    // 뒤로가기 시 브라우저 캐시 사용 → 서버 요청 없이 즉시 렌더링
    context.res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    const server = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:13001'
      : 'http://localhost:3000';

    const listFields = 'fields=_id,title,slug,coverImage,thumbnailUrl,category,source,sourceUrl,timeText,summary,createdAt,publishedAt,updatedAt,viewCount,featured,tags,author,youtubeUrl,articleUrl';

    const [commentsResponse, rankingResponse, trendingResponse, editorsPickResponse] = await Promise.all([
      fetch(`${server}/api/comments/recent?limit=10`),
      fetch(`${server}/api/news?limit=10&sort=viewCount&${listFields}`),
      fetch(`${server}/api/news/trending?limit=5`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${server}/api/news/editors-pick?limit=6`).catch(() => ({ json: () => ({ success: false }) })),
    ]);

    const [commentsData, rankingData, trendingData, editorsPickData] = await Promise.all([
      commentsResponse.json(),
      rankingResponse.json(),
      trendingResponse.json(),
      editorsPickResponse.json(),
    ]);

    const recentComments = commentsData.success ? (commentsData.data || commentsData.comments || []) : [];
    const rankingNews = rankingData.success ? (rankingData.data?.news || rankingData.data || []) : [];
    const trendingNews = trendingData.success ? (trendingData.data || []).slice(0, 5) : [];

    const editorsPickNews = editorsPickData.success ? (editorsPickData.data || []) : [];

    return {
      props: {
        recentComments,
        rankingNews,
        trendingNews,
        editorsPickNews,
      }
    };
  } catch (error) {
    console.error('[Search] getServerSideProps error:', error);
    return { props: { recentComments: [], rankingNews: [], trendingNews: [], editorsPickNews: [] } };
  }
}
