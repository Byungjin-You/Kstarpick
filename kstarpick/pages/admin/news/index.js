import { useState, useEffect, Fragment } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { Eye, Edit, Trash2, Search, PlusCircle, Filter, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, Plus, FileText, PenTool, AlertCircle, Download } from 'lucide-react';

export default function AdminNewsList() {
  const router = useRouter();
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [limit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState(null);
  const [showCrawlResult, setShowCrawlResult] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [showCleanupResult, setShowCleanupResult] = useState(false);
  const [crawlOptions, setCrawlOptions] = useState({
    maxItems: 15,
    concurrentRequests: 3
  });
  const [showCrawlOptions, setShowCrawlOptions] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMultiDeleteModal, setShowMultiDeleteModal] = useState(false);
  
  // Categories for filtering
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'drama', label: 'K-Drama' },
    { value: 'kpop', label: 'K-POP' },
    { value: 'celeb', label: 'Celebrity' },
    { value: 'movie', label: 'Movie' },
    { value: 'variety', label: 'Variety Show' },
  ];
  
  // Fetch news data
  const fetchNews = async (page = 1, category = 'all', search = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      let queryParams = `page=${page}&limit=${limit}&adminMode=true`;
      if (category !== 'all') {
        queryParams += `&category=${category}`;
      }
      if (search) {
        queryParams += `&title=${encodeURIComponent(search)}`;
      }
      
      // Fetch data from API
      const response = await fetch(`/api/news?${queryParams}`);
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      
      const data = await response.json();
      
      // API 응답 구조가 변경되어 news가 data.data.news에 있는 경우 처리
      if (data.data && data.data.news) {
        setNews(data.data.news);
        setTotalPages(data.data.totalPages || Math.ceil(data.data.total / limit));
      } else {
        // 이전 구조인 경우 (직접 배열)
        setNews(data.data || data || []);
        setTotalPages(data.pagination?.totalPages || Math.ceil(data.pagination?.total / limit) || 1);
      }
    } catch (error) {
      console.error('뉴스 데이터를 가져오는 중 오류가 발생했습니다:', error);
      setError('뉴스 데이터를 가져오는 중 오류가 발생했습니다.');
      // Generate mock data for demo
      setNews(generateMockNews());
      setTotalPages(5);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate mock news data for demonstration
  const generateMockNews = () => {
    return Array(10).fill(0).map((_, index) => ({
      _id: `mock-${index + 1 + (currentPage - 1) * 10}`,
      title: `${['BTS Announces', 'BLACKPINK Reveals', 'NewJeans Drops', 'IVE Prepares', 'Stray Kids Completes'][index % 5]} ${['New Album', 'World Tour', 'Comeback Single', 'Music Video', 'Special Event'][index % 5]}`,
      summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce at justo eget libero commodo venenatis.',
      category: categories[index % categories.length].value,
      coverImage: `/images/placeholder.jpg`,
      viewCount: Math.floor(Math.random() * 10000),
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      featured: index % 5 === 0,
      tags: ['K-pop', 'Music', 'Entertainment', 'Concert', 'Album'][index % 5].split(' ')
    }));
  };
  
  // Load data when component mounts or filters change
  useEffect(() => {
    fetchNews(currentPage, selectedCategory, searchTerm);
  }, [currentPage, selectedCategory, searchTerm, refreshKey]);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchNews(1, selectedCategory, searchTerm);
  };
  
  // Handle category change
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1); // Reset to first page on category change
  };
  
  // Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Handle delete button click
  const handleDeleteClick = (id) => {
    setDeleteItemId(id);
    setShowDeleteModal(true);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;
    
    try {
      setIsDeleting(true);
      // 실제 API 호출로 뉴스 삭제
      const response = await fetch(`/api/news/${deleteItemId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // 성공적으로 삭제되면 상태 업데이트
        setNews(news.filter(item => item._id !== deleteItemId));
        setShowDeleteModal(false);
        setDeleteItemId(null);
      } else {
        // 에러 발생 시 표시
        setError(`삭제 실패: ${result.message || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error('Error deleting news:', error);
      setError('뉴스 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // 체크박스 선택 처리
  const handleCheckboxChange = (id) => {
    setSelectedItems(prevSelected => {
      if (prevSelected.includes(id)) {
        return prevSelected.filter(itemId => itemId !== id);
      } else {
        return [...prevSelected, id];
      }
    });
  };
  
  // 모든 항목 선택/해제
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(news.map(item => item._id));
    } else {
      setSelectedItems([]);
    }
  };
  
  // 다중 삭제 모달 열기
  const handleMultiDeleteClick = () => {
    if (selectedItems.length === 0) {
      setError('선택된 항목이 없습니다.');
      return;
    }
    setShowMultiDeleteModal(true);
  };
  
  // 다중 삭제 실행
  const handleMultiDeleteConfirm = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      setIsDeleting(true);
      // 순차적으로 선택된 항목 삭제
      const deletePromises = selectedItems.map(id => 
        fetch(`/api/news/${id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.all(deletePromises);
      const hasError = results.some(response => !response.ok);
      
      if (!hasError) {
        // 성공적으로 삭제되면 상태 업데이트
        setNews(news.filter(item => !selectedItems.includes(item._id)));
        setShowMultiDeleteModal(false);
        setSelectedItems([]);
      } else {
        setError('일부 항목 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error deleting multiple news:', error);
      setError('뉴스 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // 숨피 뉴스 크롤링 함수
  const handleCrawlSoompi = async () => {
    setIsCrawling(true);
    setCrawlResult(null);
    setShowCrawlResult(false);
    
    try {
      const response = await fetch('/api/news/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(crawlOptions)
      });
      
      const result = await response.json();
      setCrawlResult(result);
      setShowCrawlResult(true);
      
      // 새로운 데이터가 추가되었으면 리스트 새로고침
      if (result.success && result.new > 0) {
        setRefreshKey(prev => prev + 1);
      }
      
    } catch (error) {
      console.error('크롤링 중 오류:', error);
      setCrawlResult({
        success: false,
        message: '크롤링 중 오류가 발생했습니다: ' + error.message
      });
      setShowCrawlResult(true);
    } finally {
      setIsCrawling(false);
    }
  };
  
  // 크롤링 옵션 변경 핸들러
  const handleCrawlOptionChange = (e) => {
    const { name, value } = e.target;
    setCrawlOptions(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };
  
  // 더미 뉴스 삭제 함수
  const handleCleanupDummyNews = async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);
    setShowCleanupResult(false);
    
    try {
      const response = await fetch('/api/news/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      setCleanupResult(result);
      setShowCleanupResult(true);
      
      // 데이터가 삭제되었으면 리스트 새로고침
      if (result.success && result.deletedCount > 0) {
        setRefreshKey(prev => prev + 1);
      }
      
    } catch (error) {
      console.error('더미 뉴스 삭제 중 오류:', error);
      setCleanupResult({
        success: false,
        message: '더미 뉴스 삭제 중 오류가 발생했습니다: ' + error.message
      });
      setShowCleanupResult(true);
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  return (
    <AdminLayout>
      <Head>
        <title>News Management | Admin</title>
      </Head>
      
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">News Management</h1>
          <p className="text-gray-500">Manage your news articles</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            {selectedItems.length > 0 && (
              <button
                onClick={handleMultiDeleteClick}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={18} className="mr-2" />
                Delete Selected ({selectedItems.length})
              </button>
            )}
            <button
              onClick={() => setShowCrawlOptions(!showCrawlOptions)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              크롤링 옵션
            </button>
            
            <button
              onClick={handleCrawlSoompi}
              disabled={isCrawling}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCrawling ? (
                <>
                  <RefreshCw size={18} className="mr-2 animate-spin" />
                  Crawling...
                </>
              ) : (
                <>
                  <Download size={18} className="mr-2" />
                  Crawl Soompi News
                </>
              )}
            </button>
            
            <button
              onClick={handleCleanupDummyNews}
              disabled={isCleaningUp}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCleaningUp ? (
                <>
                  <RefreshCw size={18} className="mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 size={18} className="mr-2" />
                  더미 뉴스 삭제
                </>
              )}
            </button>
            
            <Link 
              href="/admin/news/create"
              className="inline-flex items-center px-4 py-2 bg-[#ff3e8e] text-white rounded-lg hover:bg-[#e02e7c] transition-colors"
            >
              <Plus size={18} className="mr-2" />
              Create News
            </Link>
          </div>
        </div>
      </div>
      
      {/* 크롤링 옵션 설정 */}
      {showCrawlOptions && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 mb-3">크롤링 옵션 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxItems" className="block text-sm font-medium text-gray-700 mb-1">
                최대 크롤링 아이템 수
              </label>
              <input
                type="number"
                id="maxItems"
                name="maxItems"
                min="5"
                max="100"
                value={crawlOptions.maxItems}
                onChange={handleCrawlOptionChange}
                className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                한 번에 크롤링할 최대 기사 수 (5-100)
              </p>
            </div>
            <div>
              <label htmlFor="concurrentRequests" className="block text-sm font-medium text-gray-700 mb-1">
                동시 요청 수
              </label>
              <input
                type="number"
                id="concurrentRequests"
                name="concurrentRequests"
                min="1"
                max="10"
                value={crawlOptions.concurrentRequests}
                onChange={handleCrawlOptionChange}
                className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                병렬로 처리할 요청 수 (1-10). 높을수록 빠르지만 서버에 부하가 증가합니다.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowCrawlOptions(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors mr-2"
            >
              닫기
            </button>
            <button
              onClick={handleCrawlSoompi}
              disabled={isCrawling}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCrawling ? '크롤링 중...' : '이 설정으로 크롤링 시작'}
            </button>
          </div>
        </div>
      )}
      
      {/* 크롤링 결과 표시 */}
      {showCrawlResult && crawlResult && (
        <div className={`mb-6 p-4 rounded-lg ${crawlResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start">
            <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${crawlResult.success ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
              {crawlResult.success ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <AlertCircle size={16} />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${crawlResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {crawlResult.success ? 'Success' : 'Error'}
              </h3>
              <div className={`mt-1 text-sm ${crawlResult.success ? 'text-green-700' : 'text-red-700'}`}>
                <p>{crawlResult.message}</p>
                {crawlResult.success && (
                  <p className="mt-1">총 항목: {crawlResult.total} / 새로 추가된 항목: {crawlResult.new}</p>
                )}
              </div>
              {crawlResult.success && crawlResult.new > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowCrawlResult(false)}
                    className="text-sm font-medium text-green-600 hover:text-green-500"
                  >
                    닫기
                  </button>
                </div>
              )}
              {(!crawlResult.success || crawlResult.new === 0) && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowCrawlResult(false)}
                    className={`text-sm font-medium ${crawlResult.success ? 'text-green-600 hover:text-green-500' : 'text-red-600 hover:text-red-500'}`}
                  >
                    닫기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 더미 뉴스 삭제 결과 표시 */}
      {showCleanupResult && cleanupResult && (
        <div className={`mb-6 p-4 rounded-lg ${cleanupResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start">
            <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${cleanupResult.success ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
              {cleanupResult.success ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <AlertCircle size={16} />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${cleanupResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {cleanupResult.success ? '성공' : '오류'}
              </h3>
              <div className={`mt-1 text-sm ${cleanupResult.success ? 'text-green-700' : 'text-red-700'}`}>
                <p>{cleanupResult.message}</p>
              </div>
              <div className="mt-2">
                <button
                  onClick={() => setShowCleanupResult(false)}
                  className={`text-sm font-medium ${cleanupResult.success ? 'text-green-600 hover:text-green-500' : 'text-red-600 hover:text-red-500'}`}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <Filter size={18} className="text-gray-400 mr-2" />
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="bg-gray-50 border border-gray-200 rounded-lg text-gray-700 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          
          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <div className="relative flex-grow md:w-64">
              <input
                type="text"
                placeholder="Search by title"
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </span>
            </div>
            <button
              type="submit"
              className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>
      
      {/* News List */}
      <div className="bg-white rounded-lg shadow-sm mb-6 w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={news.length > 0 && selectedItems.length === news.length}
                    className="h-4 w-4 rounded border-gray-300 text-[#ff3e8e] focus:ring-[#ff3e8e]"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                  Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  Views
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : news && news.length > 0 ? (
                news.map((item) => {
                  // 크롤링 실패한 기사인지 확인
                  const isCrawlFailed = item.content && item.content.includes('상세 기사를 가져오는 중 오류가 발생했습니다');
                  
                  return (
                    <tr key={item._id} className={`hover:bg-gray-50 ${isCrawlFailed ? 'bg-red-50' : ''}`}>
                    <td className="px-2 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item._id)}
                        onChange={() => handleCheckboxChange(item._id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#ff3e8e] focus:ring-[#ff3e8e]"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-normal">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                          {item.coverImage ? (
                            <img
                              src={item.coverImage}
                              alt={item.title}
                              className="h-10 w-10 object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/placeholder.jpg';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 flex items-center justify-center bg-gray-100 text-gray-400">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="ml-4 max-w-[280px]">
                            <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2 break-words">
                            {item.title}
                              </div>
                              {isCrawlFailed && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertTriangle size={12} className="mr-1" />
                                  크롤링 실패
                                </span>
                              )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.tags && item.tags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="mr-1">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-medium rounded-full bg-blue-100 text-blue-800">
                        {item.category === 'drama' ? 'K-Drama' : item.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.viewCount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link 
                          href={`/news/${item._id || 'preview'}`}
                          className="text-gray-500 hover:text-gray-700 p-1"
                          target="_blank"
                        >
                          <Eye size={18} />
                        </Link>
                        
                        <Link 
                          href={`/admin/news/edit/${item._id}`}
                          className="text-blue-500 hover:text-blue-700 p-1"
                        >
                          <Edit size={18} />
                        </Link>
                        
                        <button
                          onClick={() => handleDeleteClick(item._id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    뉴스 기사가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!error && news.length > 0 && (
          <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{news.length > 0 ? (currentPage - 1) * 10 + 1 : 0}</span> to <span className="font-medium">{(currentPage - 1) * 10 + news.length}</span> of{' '}
                  <span className="font-medium">{totalPages * 10}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft size={18} />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Always show first and last page
                      if (page === 1 || page === totalPages) return true;
                      // Show pages around current page
                      return Math.abs(page - currentPage) < 2;
                    })
                    .map((page, i, arr) => {
                      // Add ellipsis when there are gaps in the sequence
                      const showEllipsisBefore = i > 0 && arr[i - 1] !== page - 1;
                      const showEllipsisAfter = i < arr.length - 1 && arr[i + 1] !== page + 1;
                      
                      return (
                        <Fragment key={page}>
                          {showEllipsisBefore && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-[#ff3e8e] border-[#ff3e8e] text-white'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                          {showEllipsisAfter && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                        </Fragment>
                      );
                    })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === totalPages
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight size={18} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDeleteModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle size={24} className="text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete News Article</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this news article? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Multi Delete Confirmation Modal */}
      {showMultiDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">다중 삭제</h3>
            <p className="text-sm text-gray-500 mb-4">
              선택한 {selectedItems.length}개의 뉴스 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                onClick={() => setShowMultiDeleteModal(false)}
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                onClick={handleMultiDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    삭제 중...
                  </>
                ) : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 