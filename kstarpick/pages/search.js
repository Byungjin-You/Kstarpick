import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search, Filter, Grid, List, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchResults from '../components/SearchResults';
import SearchSuggestions from '../components/SearchSuggestions';
import { generateSearchResultsJsonLd } from '../utils/seoHelpers';

export default function SearchPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({
    news: [],
    dramas: [],
    movies: [],
    actors: []
  });
  const [filters, setFilters] = useState({
    dateRange: 'all',
    sortBy: 'relevance',
    category: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Handle search when query parameter changes
  useEffect(() => {
    if (router.isReady && router.query.q) {
      setSearchTerm(router.query.q);
      performSearch(router.query.q);
    }
  }, [router.isReady, router.query.q]);

  const performSearch = async (query) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        type: activeTab,
        page: 1,
        limit: 50,
        sortBy: filters.sortBy,
        dateRange: filters.dateRange
      });

      const response = await fetch(`/api/news?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data = await response.json();
      
      if (activeTab === 'all') {
        // Handle the new API response format
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    if (searchTerm) {
      performSearch(searchTerm);
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Head>
        <title>{searchTerm ? `"${searchTerm}" Search Results` : 'Search'} - KstarPick</title>
        <meta name="description" content={searchTerm ? `Search results for "${searchTerm}". Find K-Pop news, Korean dramas, movies, and celebrity information.` : 'Search K-Pop news, Korean dramas, movies, and celebrity information. Find the latest Korean entertainment news quickly.'} />
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

      <Header />

      <main className="flex-1 container mx-auto px-4 pt-8 pb-24">
        {/* Search Header */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative">
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
                className="w-full px-4 py-3 pl-12 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setShowSuggestions(true);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Search Suggestions */}
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
        </div>

        {/* Search Results Header */}
        {searchTerm && (
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Search Results for "{searchTerm}"
                </h1>
                <p className="mt-1 text-gray-500">
                  {!isLoading && `${getTotalResults()} results found`}
                </p>
              </div>
              

            </div>


          </div>
        )}

        {/* Search Results */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner />
          </div>
        ) : searchTerm ? (
          <div>


            {/* Results Content */}
            {getTotalResults() > 0 ? (
              <div className="mb-24">
                <SearchResults
                  results={getActiveResults()}
                  viewMode={viewMode}
                  type={activeTab === 'all' ? 'news' : activeTab}
                  searchQuery={searchTerm}
                />
              </div>
            ) : (
              <div className="text-center py-16 mb-24">
                <div className="mx-auto w-24 h-24 flex items-center justify-center text-gray-300 mb-4">
                  <Search size={48} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No results found</h3>
                <p className="mt-2 text-gray-500">
                  Try adjusting your search to find what you're looking for.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 mb-24">
            <div className="mx-auto w-24 h-24 flex items-center justify-center text-gray-300 mb-4">
              <Search size={48} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Start your search</h3>
            <p className="mt-2 text-gray-500">
              Enter a search term to find K-POP news, dramas, movies, and more.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
} 