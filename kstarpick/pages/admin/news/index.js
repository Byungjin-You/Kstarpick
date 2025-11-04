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
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
    concurrentRequests: 3,
    quality: 'standard', // standard, high, premium
    categories: ['drama', 'kpop', 'celeb', 'movie'],
    sources: ['naver', 'daum', 'nate', 'x', 'instagram', 'youtube'],
    customPrompt: ''
  });
  const [selectedPreset, setSelectedPreset] = useState('standard');
  const [showCrawlOptions, setShowCrawlOptions] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMultiDeleteModal, setShowMultiDeleteModal] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // AI 생성 모달 상태
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiSteps, setAiSteps] = useState([
    { name: '뉴스 소스 크롤링', status: 'pending', count: 0 },
    { name: 'AI 기사 분석', status: 'pending', count: 0 },
    { name: '한국어 번역', status: 'pending', count: 0 },
    { name: '이미지 최적화', status: 'pending', count: 0 },
    { name: '카테고리 분류', status: 'pending', count: 0 },
    { name: '최종 검수', status: 'pending', count: 0 }
  ]);
  const [aiLogs, setAiLogs] = useState([]);
  const [currentArticle, setCurrentArticle] = useState('');
  const [generatedCount, setGeneratedCount] = useState(0);
  const [totalFound, setTotalFound] = useState(0);

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
      let queryParams = `page=${page}&limit=${itemsPerPage}&adminMode=true`;
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
        setTotalPages(data.data.totalPages || Math.ceil(data.data.total / itemsPerPage));
        setTotalItems(data.data.total || 0);
      } else {
        // 이전 구조인 경우 (직접 배열)
        setNews(data.data || data || []);
        setTotalPages(data.pagination?.totalPages || Math.ceil(data.pagination?.total / itemsPerPage) || 1);
        setTotalItems(data.pagination?.total || 0);
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
  }, [currentPage, selectedCategory, searchTerm, refreshKey, itemsPerPage]);
  
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
  
  // AI 뉴스 생성 시뮬레이션 함수
  const simulateAIGeneration = async () => {
    const steps = [
      { name: '뉴스 소스 크롤링', duration: 2000 },
      { name: 'AI 기사 분석', duration: 3000 },
      { name: '한국어 번역', duration: 2500 },
      { name: '이미지 최적화', duration: 2000 },
      { name: '카테고리 분류', duration: 1500 },
      { name: '최종 검수', duration: 1000 }
    ];

    const sampleArticles = [
      'BTS Jungkook\'s Solo Album Breaks Records...',
      'BLACKPINK Lisa Announces New Fashion Line...',
      'NewJeans Drops Surprise Music Video...',
      'IVE Prepares For World Tour 2024...',
      'Stray Kids Completes Sold-Out Arena Tour...'
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // 단계 시작
      setAiSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'in-progress' } : s
      ));

      // 로그 추가
      const timestamp = new Date().toLocaleTimeString('ko-KR');
      setAiLogs(prev => [...prev, `[${timestamp}] ${step.name} 시작...`]);

      // 단계별 세부 로그
      await new Promise(resolve => setTimeout(resolve, step.duration / 3));

      if (i === 0) {
        setTotalFound(15);
        setAiLogs(prev => [...prev, `[${timestamp}] ✓ 15개 기사 발견`]);
      } else if (i === 1) {
        setCurrentArticle(sampleArticles[Math.floor(Math.random() * sampleArticles.length)]);
        setAiLogs(prev => [...prev, `[${timestamp}] 🤖 AI가 기사 중요도 분석 중...`]);
        await new Promise(resolve => setTimeout(resolve, step.duration / 3));
        setAiLogs(prev => [...prev, `[${timestamp}] ✓ 평균 중요도: 93/100`]);
      } else if (i === 2) {
        setAiLogs(prev => [...prev, `[${timestamp}] 🌐 GPT-4 번역 요청 중...`]);
        await new Promise(resolve => setTimeout(resolve, step.duration / 3));
        setAiLogs(prev => [...prev, `[${timestamp}] ✓ 번역 완료 (품질 점수: 98/100)`]);
      } else if (i === 3) {
        setAiLogs(prev => [...prev, `[${timestamp}] 🖼️ 이미지 압축 및 최적화...`]);
        await new Promise(resolve => setTimeout(resolve, step.duration / 3));
        setAiLogs(prev => [...prev, `[${timestamp}] ✓ 이미지 크기 85% 감소`]);
      } else if (i === 4) {
        setAiLogs(prev => [...prev, `[${timestamp}] 📂 AI가 카테고리 자동 분류 중...`]);
        await new Promise(resolve => setTimeout(resolve, step.duration / 3));
        setAiLogs(prev => [...prev, `[${timestamp}] ✓ K-POP: 7개, K-Drama: 3개, Celebrity: 2개`]);
      }

      // 진행률 업데이트
      const progress = ((i + 1) / steps.length) * 100;
      setAiProgress(progress);

      // 생성 카운트 업데이트
      if (i >= 1 && i < steps.length - 1) {
        setGeneratedCount(prev => Math.min(prev + 2, 12));
      }

      // 단계 완료
      await new Promise(resolve => setTimeout(resolve, step.duration / 3));
      setAiSteps(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'completed', count: i === 0 ? 15 : i === 1 ? 12 : 0 } : s
      ));
      setAiLogs(prev => [...prev, `[${timestamp}] ✅ ${step.name} 완료!`]);
    }
  };

  // 숨피 뉴스 크롤링 함수
  const handleCrawlSoompi = async () => {
    // AI 모달 초기화 및 표시
    setShowAIModal(true);
    setAiProgress(0);
    setAiLogs([]);
    setGeneratedCount(0);
    setTotalFound(0);
    setCurrentArticle('');
    setAiSteps([
      { name: '뉴스 소스 크롤링', status: 'pending', count: 0 },
      { name: 'AI 기사 분석', status: 'pending', count: 0 },
      { name: '한국어 번역', status: 'pending', count: 0 },
      { name: '이미지 최적화', status: 'pending', count: 0 },
      { name: '카테고리 분류', status: 'pending', count: 0 },
      { name: '최종 검수', status: 'pending', count: 0 }
    ]);

    setIsCrawling(true);
    setCrawlResult(null);
    setShowCrawlResult(false);

    try {
      // AI 생성 시뮬레이션 실행
      await simulateAIGeneration();

      // 실제 API 호출
      const response = await fetch('/api/news/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(crawlOptions)
      });

      const result = await response.json();

      // AI 모달 닫고 결과 표시
      setTimeout(() => {
        setShowAIModal(false);
        setCrawlResult(result);
        setShowCrawlResult(true);

        // 새로운 데이터가 추가되었으면 리스트 새로고침
        if (result.success && result.new > 0) {
          setRefreshKey(prev => prev + 1);
        }
      }, 1000);

    } catch (error) {
      console.error('크롤링 중 오류:', error);
      setShowAIModal(false);
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

  // 프리셋 적용 함수
  const applyPreset = (preset) => {
    setSelectedPreset(preset);
    const presets = {
      quick: { maxItems: 10, concurrentRequests: 5, quality: 'standard' },
      standard: { maxItems: 30, concurrentRequests: 3, quality: 'high' },
      bulk: { maxItems: 100, concurrentRequests: 2, quality: 'high' }
    };

    setCrawlOptions(prev => ({
      ...prev,
      ...presets[preset]
    }));
  };

  // 카테고리 토글
  const toggleCategory = (category) => {
    setCrawlOptions(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  // 소스 채널 토글
  const toggleSource = (source) => {
    setCrawlOptions(prev => ({
      ...prev,
      sources: prev.sources.includes(source)
        ? prev.sources.filter(s => s !== source)
        : [...prev.sources, source]
    }));

    // 예상 결과 재계산 애니메이션 트리거
    setIsRecalculating(true);
    setTimeout(() => setIsRecalculating(false), 600);
  };

  // 소스별 가중치 (각 소스가 기사 생성에 미치는 영향)
  const getSourceMultiplier = () => {
    const sourceWeights = {
      naver: 1.3,
      daum: 1.2,
      nate: 1.1,
      x: 0.9,
      instagram: 0.8,
      youtube: 1.0
    };

    const activeWeights = crawlOptions.sources.map(s => sourceWeights[s] || 1.0);
    const avgWeight = activeWeights.length > 0
      ? activeWeights.reduce((a, b) => a + b, 0) / activeWeights.length
      : 1.0;

    return avgWeight;
  };

  // 예상 소요 시간 계산 (분) - 소스 개수에 따라 변동
  const estimatedTime = Math.round(
    (crawlOptions.maxItems / crawlOptions.concurrentRequests) *
    0.5 *
    getSourceMultiplier()
  );

  // 서버 부하 레벨
  const getServerLoad = () => {
    const sourceLoad = crawlOptions.sources.length * 0.2;
    const baseLoad = crawlOptions.concurrentRequests + sourceLoad;

    if (baseLoad >= 5) return { level: '높음', color: 'text-red-600', bg: 'bg-red-100' };
    if (baseLoad >= 3) return { level: '보통', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: '낮음', color: 'text-green-600', bg: 'bg-green-100' };
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
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">뉴스 관리</h1>
        </div>
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <button
              onClick={handleMultiDeleteClick}
              className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 py-2 px-4 rounded-md flex items-center"
            >
              <Trash2 className="mr-2 h-5 w-5" />
              선택 삭제 ({selectedItems.length})
            </button>
          )}
          <button
            onClick={() => setShowCrawlOptions(!showCrawlOptions)}
            className="bg-white hover:bg-gray-50 border-2 py-2 px-4 rounded-md flex items-center"
            style={{ borderColor: '#233cfa', color: '#233cfa' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            AI 옵션
          </button>
          <button
            onClick={handleCrawlSoompi}
            disabled={isCrawling}
            className="bg-white hover:bg-gray-50 border-2 py-2 px-4 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: '#233cfa', color: '#233cfa' }}
          >
            {isCrawling ? (
              <>
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                AI 생성 중...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 7H7v6h6V7z"/>
                  <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd"/>
                </svg>
                AI 뉴스 생성
              </>
            )}
          </button>
          <Link
            href="/admin/news/create"
            className="bg-white hover:bg-gray-50 border-2 py-2 px-4 rounded-md flex items-center"
            style={{ borderColor: '#233cfa', color: '#233cfa' }}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            신규 뉴스 등록
          </Link>
        </div>
      </div>
      
      {/* AI 옵션 설정 */}
      {showCrawlOptions && (
        <div className="mb-4 rounded-lg overflow-hidden shadow border border-gray-200">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 7H7v6h6V7z"/>
                  <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd"/>
                </svg>
                <h3 className="text-base font-bold">AI 뉴스 생성 옵션</h3>
              </div>
              <button
                onClick={() => setShowCrawlOptions(false)}
                className="text-white hover:bg-white/20 rounded p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 bg-white">
            {/* 프리셋 선택 */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">⚡ 빠른 프리셋</h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => applyPreset('quick')}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    selectedPreset === 'quick'
                      ? 'text-white'
                      : 'border-gray-200 hover:bg-gray-50 bg-white'
                  }`}
                  style={selectedPreset === 'quick' ? {
                    borderColor: '#233CFA',
                    backgroundColor: '#233CFA'
                  } : {}}
                >
                  <div className={`text-xs font-semibold mb-1 ${selectedPreset === 'quick' ? 'text-white' : 'text-gray-800'}`}>빠른 생성</div>
                  <p className={`text-xs ${selectedPreset === 'quick' ? 'text-white' : 'text-gray-600'}`}>10개 / 5-10분</p>
                </button>

                <button
                  onClick={() => applyPreset('standard')}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    selectedPreset === 'standard'
                      ? 'text-white'
                      : 'border-gray-200 hover:bg-gray-50 bg-white'
                  }`}
                  style={selectedPreset === 'standard' ? {
                    borderColor: '#233CFA',
                    backgroundColor: '#233CFA'
                  } : {}}
                >
                  <div className={`text-xs font-semibold mb-1 ${selectedPreset === 'standard' ? 'text-white' : 'text-gray-800'}`}>표준 생성</div>
                  <p className={`text-xs ${selectedPreset === 'standard' ? 'text-white' : 'text-gray-600'}`}>30개 / 15-20분</p>
                </button>

                <button
                  onClick={() => applyPreset('bulk')}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    selectedPreset === 'bulk'
                      ? 'text-white'
                      : 'border-gray-200 hover:bg-gray-50 bg-white'
                  }`}
                  style={selectedPreset === 'bulk' ? {
                    borderColor: '#233CFA',
                    backgroundColor: '#233CFA'
                  } : {}}
                >
                  <div className={`text-xs font-semibold mb-1 ${selectedPreset === 'bulk' ? 'text-white' : 'text-gray-800'}`}>대량 생성</div>
                  <p className={`text-xs ${selectedPreset === 'bulk' ? 'text-white' : 'text-gray-600'}`}>100개 / 30-40분</p>
                </button>
              </div>
            </div>

            {/* 세부 설정 - 2열 레이아웃 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 왼쪽: 슬라이더 & 품질 */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-700">⚙️ 세부 설정</h4>

                {/* 생성할 기사 수 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-700">기사 수</label>
                    <span className="text-lg font-bold text-blue-600">{crawlOptions.maxItems}개</span>
                  </div>
                  <input
                    type="range"
                    name="maxItems"
                    min="10"
                    max="100"
                    step="5"
                    value={crawlOptions.maxItems}
                    onChange={handleCrawlOptionChange}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* 동시 처리 속도 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-700">처리 속도</label>
                    <span className="text-lg font-bold text-purple-600">{crawlOptions.concurrentRequests}/5</span>
                  </div>
                  <input
                    type="range"
                    name="concurrentRequests"
                    min="1"
                    max="5"
                    value={crawlOptions.concurrentRequests}
                    onChange={handleCrawlOptionChange}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* AI 품질 */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-2 block">AI 품질</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['standard', 'high', 'premium'].map((quality) => (
                      <button
                        key={quality}
                        onClick={() => setCrawlOptions(prev => ({ ...prev, quality }))}
                        className={`py-2.5 px-2 rounded border-2 text-xs font-medium transition-all ${
                          crawlOptions.quality === quality
                            ? 'bg-white text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        style={crawlOptions.quality === quality ? {
                          borderColor: '#233CFA',
                          backgroundColor: '#233CFA'
                        } : {}}
                      >
                        {quality === 'standard' && '표준'}
                        {quality === 'high' && '고품질'}
                        {quality === 'premium' && '최고급'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI 프롬프트 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-700">Article Generation Prompt</label>
                    <button
                      onClick={() => {
                        const defaultPrompts = {
                          standard: `You are a professional Korean entertainment news writer. Generate a concise and engaging news article based on the provided source material.

Requirements:
- Write in clear, accessible language suitable for general audiences
- Focus on the most important facts and key information
- Maintain a neutral, objective journalistic tone
- Structure: Lead paragraph (who, what, when, where), 2-3 body paragraphs with supporting details, brief conclusion
- Include relevant names, dates, and specific details from the source
- Target length: 200-300 words
- Avoid sensationalism or speculation
- Use present tense for recent events, past tense for completed actions
- End with context or what this means for fans/industry

Style: Professional yet accessible, suitable for quick reading on mobile devices.`,
                          high: `You are an experienced Korean entertainment journalist writing for a major publication. Create a well-structured, detailed news article based on the provided source material.

Requirements:
- Write with professional journalistic standards and sophisticated narrative flow
- Provide comprehensive coverage including background context and analysis
- Structure: Compelling lead paragraph, 4-6 well-developed body paragraphs, insightful conclusion
- Include direct quotes from sources when available
- Add relevant background information about artists, shows, or industry trends
- Discuss multiple perspectives or angles of the story
- Connect the news to broader industry trends or cultural significance
- Target length: 400-600 words
- Use varied sentence structures and engaging transitions
- Incorporate specific data, statistics, or comparative information where relevant
- Address potential reader questions: Why does this matter? What happens next?

Style: Engaging and informative, balancing professional reporting with reader engagement. Write for readers who want deeper understanding beyond surface-level news.`,
                          premium: `You are a senior Korean entertainment industry analyst and award-winning journalist. Produce a comprehensive, in-depth investigative article that goes beyond simple news reporting.

Requirements:
- Deliver exceptional journalistic quality with extensive research and multi-layered analysis
- Structure: Hook-driven opening, comprehensive body (8-12 paragraphs), thought-provoking conclusion
- Provide detailed background: artist/show history, previous related events, industry context
- Include expert opinions, industry insider perspectives, and analytical commentary
- Examine the business implications, cultural impact, and future ramifications
- Discuss the story within broader contexts: K-pop/K-drama evolution, global hallyu trends, industry economics
- Target length: 800-1000 words
- Use sophisticated vocabulary and varied rhetorical devices
- Incorporate multiple data points: chart performance, viewership numbers, social media metrics, market analysis
- Compare with similar past events or industry benchmarks
- Address multiple stakeholder perspectives: fans, industry professionals, business analysts, cultural critics
- Explore potential controversies, challenges, or opportunities this news presents
- Conclude with forward-looking analysis and expert predictions
- Maintain objectivity while demonstrating deep industry knowledge

Style: Authoritative and comprehensive, written for serious entertainment industry followers, journalists, and professionals who demand thorough, nuanced coverage with lasting reference value.`
                        };
                        setCrawlOptions(prev => ({
                          ...prev,
                          customPrompt: prev.customPrompt || defaultPrompts[prev.quality]
                        }));
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {crawlOptions.customPrompt ? '기본값으로 되돌리기' : '커스텀 편집'}
                    </button>
                  </div>

                  {crawlOptions.customPrompt ? (
                    <textarea
                      value={crawlOptions.customPrompt}
                      onChange={(e) => setCrawlOptions(prev => ({ ...prev, customPrompt: e.target.value }))}
                      className="w-full h-48 bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-gray-700 leading-relaxed font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="프롬프트를 입력하세요..."
                    />
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 max-h-48 overflow-y-auto">
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                        {crawlOptions.quality === 'standard' &&
                          `You are a professional Korean entertainment news writer. Generate a concise and engaging news article based on the provided source material.

Requirements:
- Write in clear, accessible language suitable for general audiences
- Focus on the most important facts and key information
- Maintain a neutral, objective journalistic tone
- Structure: Lead paragraph (who, what, when, where), 2-3 body paragraphs with supporting details, brief conclusion
- Include relevant names, dates, and specific details from the source
- Target length: 200-300 words
- Avoid sensationalism or speculation
- Use present tense for recent events, past tense for completed actions
- End with context or what this means for fans/industry

Style: Professional yet accessible, suitable for quick reading on mobile devices.`
                        }
                        {crawlOptions.quality === 'high' &&
                          `You are an experienced Korean entertainment journalist writing for a major publication. Create a well-structured, detailed news article based on the provided source material.

Requirements:
- Write with professional journalistic standards and sophisticated narrative flow
- Provide comprehensive coverage including background context and analysis
- Structure: Compelling lead paragraph, 4-6 well-developed body paragraphs, insightful conclusion
- Include direct quotes from sources when available
- Add relevant background information about artists, shows, or industry trends
- Discuss multiple perspectives or angles of the story
- Connect the news to broader industry trends or cultural significance
- Target length: 400-600 words
- Use varied sentence structures and engaging transitions
- Incorporate specific data, statistics, or comparative information where relevant
- Address potential reader questions: Why does this matter? What happens next?

Style: Engaging and informative, balancing professional reporting with reader engagement. Write for readers who want deeper understanding beyond surface-level news.`
                        }
                        {crawlOptions.quality === 'premium' &&
                          `You are a senior Korean entertainment industry analyst and award-winning journalist. Produce a comprehensive, in-depth investigative article that goes beyond simple news reporting.

Requirements:
- Deliver exceptional journalistic quality with extensive research and multi-layered analysis
- Structure: Hook-driven opening, comprehensive body (8-12 paragraphs), thought-provoking conclusion
- Provide detailed background: artist/show history, previous related events, industry context
- Include expert opinions, industry insider perspectives, and analytical commentary
- Examine the business implications, cultural impact, and future ramifications
- Discuss the story within broader contexts: K-pop/K-drama evolution, global hallyu trends, industry economics
- Target length: 800-1000 words
- Use sophisticated vocabulary and varied rhetorical devices
- Incorporate multiple data points: chart performance, viewership numbers, social media metrics, market analysis
- Compare with similar past events or industry benchmarks
- Address multiple stakeholder perspectives: fans, industry professionals, business analysts, cultural critics
- Explore potential controversies, challenges, or opportunities this news presents
- Conclude with forward-looking analysis and expert predictions
- Maintain objectivity while demonstrating deep industry knowledge

Style: Authoritative and comprehensive, written for serious entertainment industry followers, journalists, and professionals who demand thorough, nuanced coverage with lasting reference value.`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 오른쪽: 카테고리 */}
              <div className="space-y-5">
                <h4 className="text-xs font-semibold text-gray-700">🎯 카테고리</h4>

                {/* 카테고리 */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-2 block">생성 카테고리</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'drama', label: '드라마' },
                      { value: 'kpop', label: '음악' },
                      { value: 'celeb', label: '셀럽' },
                      { value: 'movie', label: '영화' }
                    ].map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => toggleCategory(cat.value)}
                        className={`py-2 px-2 rounded border-2 text-xs font-medium transition-all ${
                          crawlOptions.categories.includes(cat.value)
                            ? 'text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        style={crawlOptions.categories.includes(cat.value) ? {
                          borderColor: '#233CFA',
                          backgroundColor: '#233CFA'
                        } : {}}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 학습 채널 */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-2 block">학습 채널</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'naver', label: '네이버' },
                      { value: 'daum', label: '다음' },
                      { value: 'nate', label: '네이트' },
                      { value: 'x', label: 'X' },
                      { value: 'instagram', label: '인스타그램' },
                      { value: 'youtube', label: '유튜브' }
                    ].map((source) => (
                      <button
                        key={source.value}
                        onClick={() => toggleSource(source.value)}
                        className={`py-2.5 px-2 rounded border-2 text-xs font-medium transition-all ${
                          crawlOptions.sources.includes(source.value)
                            ? 'text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        style={crawlOptions.sources.includes(source.value) ? {
                          borderColor: '#233CFA',
                          backgroundColor: '#233CFA'
                        } : {}}
                      >
                        {source.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 예상 결과 - 전체 가로 영역 */}
            <div className={`mt-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2.5 border border-blue-200 transition-all duration-300 ${
              isRecalculating ? 'scale-105 shadow-lg' : ''
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-semibold text-gray-700">📊 예상 결과</h5>
                {isRecalculating && (
                  <div className="flex items-center space-x-1">
                    <svg className="animate-spin h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span className="text-xs text-blue-600 font-medium">재계산 중...</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className={`bg-white rounded p-2 text-center transform transition-all duration-300 hover:scale-105 ${
                  isRecalculating ? 'animate-refresh-card' : ''
                }`}>
                  <div className={`text-lg font-bold text-blue-600 ${isRecalculating ? 'animate-refresh-number' : ''}`}>
                    {crawlOptions.maxItems}
                  </div>
                  <div className="text-xs text-gray-600">기사 수</div>
                </div>
                <div className={`bg-white rounded p-2 text-center transform transition-all duration-300 hover:scale-105 ${
                  isRecalculating ? 'animate-refresh-card' : ''
                }`} style={{ animationDelay: '100ms' }}>
                  <div className={`text-lg font-bold text-purple-600 ${isRecalculating ? 'animate-refresh-number' : ''}`} style={{ animationDelay: '100ms' }}>
                    {estimatedTime}분
                  </div>
                  <div className="text-xs text-gray-600">소요시간</div>
                </div>
                <div className={`bg-white rounded p-2 text-center transform transition-all duration-300 hover:scale-105 ${
                  isRecalculating ? 'animate-refresh-card' : ''
                }`} style={{ animationDelay: '200ms' }}>
                  <div className={`text-lg font-bold ${getServerLoad().color} ${isRecalculating ? 'animate-refresh-number' : ''}`} style={{ animationDelay: '200ms' }}>
                    {getServerLoad().level}
                  </div>
                  <div className="text-xs text-gray-600">서버 부하</div>
                </div>
                <div className={`bg-white rounded p-2 text-center transform transition-all duration-300 hover:scale-105 ${
                  isRecalculating ? 'animate-refresh-card' : ''
                }`} style={{ animationDelay: '300ms' }}>
                  <div className={`text-lg font-bold text-green-600 ${isRecalculating ? 'animate-refresh-number' : ''}`} style={{ animationDelay: '300ms' }}>
                    {crawlOptions.categories.length}
                  </div>
                  <div className="text-xs text-gray-600">카테고리</div>
                </div>
              </div>
            </div>

            {/* 하단 액션 버튼 */}
            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={() => applyPreset('standard')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd"/>
                </svg>
                AI 추천 설정 적용
              </button>
              <button
                onClick={handleCrawlSoompi}
                disabled={isCrawling || crawlOptions.categories.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center shadow-lg"
              >
                {isCrawling ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    AI 생성 중...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 7H7v6h6V7z"/>
                      <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd"/>
                    </svg>
                    AI 뉴스 생성 시작
                  </>
                )}
              </button>
            </div>
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
      
      {/* 검색 및 필터 */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 검색 */}
          <div className="flex-1 flex min-w-[300px]">
            <form onSubmit={handleSearch} className="w-full flex">
              <input
                type="text"
                placeholder="제목 검색..."
                className="flex-1 border border-gray-300 rounded-l-md px-3 py-2"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <button
                type="submit"
                className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-r-md"
              >
                <Search size={20} />
              </button>
            </form>
          </div>

          {/* 카테고리 필터 및 페이지 표시 개수 */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="10">10개씩</option>
              <option value="20">20개씩</option>
              <option value="50">50개씩</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* News List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">뉴스를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={() => fetchNews(currentPage, selectedCategory, searchTerm)}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="p-10 text-center text-gray-600">
            <p>뉴스가 없습니다. 새 뉴스를 등록해보세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조회수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {news.map((item) => {
                  // 크롤링 실패한 기사인지 확인
                  const isCrawlFailed = item.content && item.content.includes('상세 기사를 가져오는 중 오류가 발생했습니다');

                  return (
                    <tr key={item._id} className={`hover:bg-gray-50 transition-colors ${isCrawlFailed ? 'bg-red-50' : ''}`}>
                      <td className="px-2 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item._id)}
                          onChange={() => handleCheckboxChange(item._id)}
                          className="h-4 w-4 rounded border-gray-300 text-[#ff3e8e] focus:ring-[#ff3e8e]"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-16 w-12 relative">
                            {item.coverImage ? (
                              <img
                                src={item.coverImage}
                                alt={item.title}
                                className="h-16 w-12 object-cover rounded"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/images/placeholder.jpg';
                                }}
                              />
                            ) : (
                              <div className="h-full w-full bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No Image</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.title}
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {item.tags.slice(0, 2).map((tag, i) => (
                                  <span key={i} className="mr-1">#{tag}</span>
                                ))}
                              </div>
                            )}
                            {isCrawlFailed && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                크롤링 실패
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          {item.category === 'drama' ? 'K-Drama' :
                           item.category === 'kpop' ? 'K-POP' :
                           item.category === 'celeb' ? 'Celebrity' :
                           item.category === 'movie' ? 'Movie' :
                           item.category === 'variety' ? 'Variety Show' :
                           item.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.viewCount?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                        <div className="flex justify-start space-x-2">
                          <Link
                            href={`/news/${item._id || 'preview'}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye size={18} />
                          </Link>
                          <Link
                            href={`/admin/news/edit/${item._id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteClick(item._id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        
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
                  {totalItems}개 중 {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, totalItems)}개 표시
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
                                ? 'z-10 bg-[#233cfa] border-[#233cfa] text-white'
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

      {/* AI 뉴스 생성 모달 */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="animate-pulse">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 7H7v6h6V7z"/>
                      <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">AI 뉴스 생성 중</h2>
                    <p className="text-sm text-blue-100">인공지능이 최신 뉴스를 생성하고 있습니다...</p>
                  </div>
                </div>
                <div className="text-3xl font-bold">{Math.round(aiProgress)}%</div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* 진행률 바 */}
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
                    style={{ width: `${aiProgress}%` }}
                  >
                    {aiProgress > 10 && (
                      <span className="text-xs text-white font-bold">{Math.round(aiProgress)}%</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 단계별 진행 상황 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {aiSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                      step.status === 'completed' ? 'bg-green-50 border-green-500' :
                      step.status === 'in-progress' ? 'bg-blue-50 border-blue-500 animate-pulse' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {step.status === 'completed' && (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                            </svg>
                          </div>
                        )}
                        {step.status === 'in-progress' && (
                          <div className="w-6 h-6">
                            <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                          </div>
                        )}
                        {step.status === 'pending' && (
                          <div className="w-6 h-6 bg-gray-300 rounded-full"/>
                        )}
                        <span className={`font-medium ${
                          step.status === 'completed' ? 'text-green-700' :
                          step.status === 'in-progress' ? 'text-blue-700' :
                          'text-gray-500'
                        }`}>
                          {step.name}
                        </span>
                      </div>
                      {step.count > 0 && (
                        <span className="text-sm font-bold text-gray-600">
                          {step.count}개
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 현재 처리 중인 기사 */}
              {currentArticle && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">현재 생성 중인 기사:</p>
                  <p className="font-medium text-gray-900">{currentArticle}</p>
                </div>
              )}

              {/* 통계 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{totalFound}</div>
                  <div className="text-sm text-gray-600">발견된 기사</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{generatedCount}</div>
                  <div className="text-sm text-gray-600">생성 완료</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {totalFound > 0 ? Math.round((generatedCount / totalFound) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-600">성공률</div>
                </div>
              </div>

              {/* 로그 */}
              <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
                {aiLogs.map((log, index) => (
                  <div
                    key={index}
                    className="text-green-400 mb-1 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {log}
                  </div>
                ))}
                {aiLogs.length === 0 && (
                  <div className="text-gray-500">AI 처리 로그가 여기에 표시됩니다...</div>
                )}
              </div>
            </div>

            {/* 푸터 */}
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Powered by</span> GPT-4 & Advanced AI
                </div>
                <div className="text-xs text-gray-500">
                  예상 완료: 약 {Math.max(0, Math.round((100 - aiProgress) / 8))}초
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        @keyframes refresh-card {
          0% {
            transform: scale(1);
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          }
        }

        @keyframes refresh-number {
          0% {
            opacity: 1;
            transform: rotateX(0deg);
          }
          50% {
            opacity: 0;
            transform: rotateX(90deg);
          }
          100% {
            opacity: 1;
            transform: rotateX(0deg);
          }
        }

        .animate-refresh-card {
          animation: refresh-card 0.6s ease-in-out;
        }

        .animate-refresh-number {
          animation: refresh-number 0.6s ease-in-out;
          display: inline-block;
        }
      `}</style>
    </AdminLayout>
  );
} 