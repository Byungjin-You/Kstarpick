import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getSession } from 'next-auth/react';
import AdminLayout from '../../../components/AdminLayout';
import withAdminAuth from '../../../components/withAdminAuth';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Star,
  Clock,
  Download,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';
import { Grid, Card, CardContent, Typography, CardActions, Button } from '@mui/material';

function ContentManagement() {
  const router = useRouter();
  const [contents, setContents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [debugInfo, setDebugInfo] = useState(null);
  
  // 필터링 및 페이지네이션 상태
  const [contentType, setContentType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // 토큰 상태 확인 함수
  const checkTokenStatus = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    const debugInfo = {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 20) + '...' : 'None',
      localStorage: {
        token: !!localStorage.getItem('token'),
        adminToken: !!localStorage.getItem('adminToken')
      }
    };
    setDebugInfo(debugInfo);
    console.log('토큰 상태:', debugInfo);
    return debugInfo;
  };

  // URL 쿼리 파라미터에서 초기 필터 상태 설정
  useEffect(() => {
    const { type, search, page } = router.query;
    
    // 토큰 상태 확인
    checkTokenStatus();
    
    // 콘텐츠 타입 설정
    if (type) {
      setContentType(type);
    }
    
    // 검색어 설정
    if (search) {
      setSearchTerm(search);
    }
    
    // 페이지 설정
    if (page) {
      setCurrentPage(parseInt(page, 10));
    }
  }, [router.query]);
  
  // 콘텐츠 목록 조회
  const fetchContents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 쿼리 파라미터 구성
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        sortBy: sortField,
        sortOrder: sortOrder
      });
      
      // contentType이 선택되었을 때만 category 파라미터 추가
      if (contentType && contentType !== 'all') {
        queryParams.append('category', contentType);
      }
      
      if (searchTerm) {
        queryParams.append('title', searchTerm);
      }
      
      console.log('API 요청 파라미터:', queryParams.toString());
      
      // 인증 토큰 가져오기
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      // 드라마 또는 영화 타입일 경우 /api/dramas를 호출
      const endpoint = '/api/dramas';
      const response = await fetch(`${endpoint}?${queryParams.toString()}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '콘텐츠 목록을 불러오는 중 오류가 발생했습니다.');
      }
      
      console.log('API 응답 데이터:', data);
      
      // 드라마 API와 콘텐츠 API의 응답 구조를 통일
      let normalizedData;
      const itemsWithContentType = data.data.map(item => ({
        ...item,
        contentType: item.category || contentType  // 항목의 category 필드 사용, 없으면 현재 선택된 contentType 사용
      }));
      
      normalizedData = {
        data: itemsWithContentType,
        pagination: data.pagination
      };
      
      if (normalizedData.data.length > 0) {
        console.log('정규화된 데이터 첫 항목:', normalizedData.data[0]); // 첫 번째 항목의 구조 로깅
      } else {
        console.log('검색 결과 없음');
      }
      
      setContents(normalizedData.data);
      setTotalPages(normalizedData.pagination.pages);
      setTotalItems(normalizedData.pagination.total);
    } catch (err) {
      console.error('Error fetching contents:', err);
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 페이지 초기화 시 인증 체크 및 콘텐츠 목록 조회
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window !== 'undefined') {
      // 토큰 확인 후 API 호출
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (token) {
        // 토큰이 있으면 관리자 권한 확인
        checkAdminAuth(token);
      } else {
        // 토큰이 없으면 로그인 페이지로 리다이렉트
        router.push('/admin/login');
      }
    }
  }, [currentPage, itemsPerPage, sortField, sortOrder, contentType]);
  
  // 관리자 권한 확인 함수
  const checkAdminAuth = async (token) => {
    try {
      const response = await fetch('/api/auth/check-admin', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      const data = await response.json();
      
      if (data.isAdmin) {
        fetchContents();
      } else {
        // 관리자가 아니면 로그인 페이지로 리다이렉트
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Admin auth check failed:', error);
      router.push('/admin/login');
    }
  };
  
  // 검색어 변경 시 API 호출
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // 검색 시 1페이지로 이동
    
    // URL 쿼리 파라미터 업데이트
    const query = { ...router.query };
    if (searchTerm) {
      query.search = searchTerm;
    } else {
      delete query.search;
    }
    
    // 페이지 파라미터 리셋
    delete query.page;
    
    router.push({
      pathname: router.pathname,
      query
    }, undefined, { shallow: true });
    
    fetchContents();
  };
  
  // 콘텐츠 삭제 처리
  const handleDelete = async (id, title, type) => {
    if (!confirm(`"${title}" 콘텐츠를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    
    try {
      // 콘텐츠 타입 검증 및 교정
      let contentTypeToUse = type;
      
      // contentType이 undefined인 경우 현재 선택된 컨텐츠 타입 필터를 사용
      if (!contentTypeToUse) {
        console.log('contentType이 undefined입니다. 현재 필터로 추정:', contentType);
        contentTypeToUse = contentType || 'content'; // 선택된 필터가 없으면 기본값 'content'
      }
      
      // 로그에 contentType 표시
      console.log(`삭제 시도 - ID: ${id}, 제목: ${title}, 콘텐츠 타입: ${contentTypeToUse}`);
      
      // 모든 타입의 콘텐츠는 통합 API /api/dramas를 통해 관리됨
      const apiEndpoint = `/api/dramas/${id}`;
      
      console.log(`삭제 요청: ${apiEndpoint}`);
      
      // 인증 토큰 가져오기
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      const response = await fetch(apiEndpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '콘텐츠 삭제 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      
      // 삭제 후 목록 새로고침
      fetchContents();
      showToast('콘텐츠가 성공적으로 삭제되었습니다.', 'success');
    } catch (err) {
      console.error('Error deleting content:', err);
      showToast(err.message, 'error');
    }
  };
  
  // 정렬 필드 변경
  const handleSortChange = (field) => {
    if (sortField === field) {
      // 같은 필드를 다시 클릭하면 정렬 방향 전환
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드 선택 시 해당 필드로 정렬 (기본 내림차순)
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  // 토스트 메시지 표시
  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: '' }), 3000);
  };
  
  // 콘텐츠 타입에 따른 한글 레이블
  const getContentTypeLabel = (type) => {
    const types = {
      'drama': '드라마',
      'movie': '영화',
      'variety': '예능',
      'documentary': '다큐멘터리',
      'other': '기타'
    };
    return types[type] || type;
  };
  
  // 상태에 따른 한글 레이블
  const getStatusLabel = (status) => {
    const statuses = {
      'ongoing': '방영 중',
      'completed': '완결',
      'upcoming': '개봉 예정',
      'canceled': '취소됨'
    };
    return statuses[status] || status;
  };
  
  // 순위 조정 관련 함수들 추가
  const updatePosition = async (id, newPosition, contentType) => {
    try {
      const item = contents.find(c => c._id === id);
      if (!item) return;
      
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      // 콘텐츠 타입에 따라 올바른 API 엔드포인트 결정
      let apiEndpoint;
      if (item.category === 'Movie' || item.category === 'movie' || contentType === 'Movie' || contentType === 'movie') {
        apiEndpoint = `/api/tvfilm/${id}`;
      } else {
        apiEndpoint = `/api/dramas/${id}`;
      }
      
      console.log('순위 업데이트 요청:', {
        id,
        newPosition,
        contentType,
        category: item.category,
        apiEndpoint,
        hasToken: !!token
      });
      
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...item,
          orderNumber: newPosition,
          previousOrderNumber: item.orderNumber || newPosition
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API 응답 오류:', response.status, errorData);
        throw new Error(`순위 업데이트에 실패했습니다. (${response.status})`);
      }
      
      // 목록 새로 고침
      fetchContents();
      showToast('순위가 성공적으로 업데이트되었습니다.', 'success');
    } catch (error) {
      console.error('순위 업데이트 오류:', error);
      showToast(`순위 업데이트 중 오류가 발생했습니다: ${error.message}`, 'error');
    }
  };

  // 토큰 재생성 함수
  const regenerateToken = async () => {
    try {
      const response = await fetch('/api/auth/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'admin', // 실제 사용자명 필요
          password: 'admin123' // 실제 비밀번호 필요
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        checkTokenStatus();
        showToast('토큰이 재생성되었습니다.', 'success');
      } else {
        showToast('토큰 재생성에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('토큰 재생성 오류:', error);
      showToast('토큰 재생성 중 오류가 발생했습니다.', 'error');
    }
  };

  // 순위 변경 (위/아래)
  const movePosition = (id, direction) => {
    const index = contents.findIndex(item => item._id === id);
    if (index === -1) return;
    
    const item = contents[index];
    let newPosition;
    
    if (direction === 'up' && index > 0) {
      newPosition = (contents[index - 1].orderNumber || index) - 1;
      updatePosition(id, Math.max(1, newPosition), item.contentType || item.category);
    } else if (direction === 'down' && index < contents.length - 1) {
      newPosition = (contents[index + 1].orderNumber || index + 2) + 1;
      updatePosition(id, newPosition, item.contentType || item.category);
    }
  };

  // 강제 순위 정렬 (최신순 기준)
  const forceSort = async () => {
    if (contents.length === 0) return;
    
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      // 최신순으로 정렬
      const sortedContents = [...contents].sort((a, b) => {
        return new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt);
      });
      
      // 순위 부여 및 업데이트
      const updatePromises = sortedContents.map(async (item, index) => {
        const position = index + 1;
        return fetch(`/api/dramas/${item._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderNumber: position,
            previousOrderNumber: item.orderNumber || position
          })
        });
      });
      
      await Promise.all(updatePromises);
      fetchContents();
      showToast(`${sortedContents.length}개 콘텐츠의 순위가 최신순으로 정렬되었습니다.`, 'success');
    } catch (error) {
      console.error('순위 정렬 오류:', error);
      showToast('순위 정렬 중 오류가 발생했습니다.', 'error');
    }
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">콘텐츠 관리</h1>
            {debugInfo && (
              <div className="text-sm text-gray-600 mt-1">
                토큰 상태: {debugInfo.hasToken ? '✅ 있음' : '❌ 없음'} 
                {debugInfo.hasToken && `(길이: ${debugInfo.tokenLength})`}
                {!debugInfo.hasToken && (
                  <button 
                    onClick={regenerateToken}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    토큰 재생성
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={forceSort}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
              disabled={isLoading}
            >
              <ArrowUp className="mr-2 h-5 w-5" />
              순위 정렬
            </button>
            <Link 
              href="/admin/content/movie-crawler"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
            >
              <Download className="mr-2 h-5 w-5" />
              영화 크롤러
            </Link>
            <Link 
              href="/admin/content/reviews-crawler"
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md flex items-center"
            >
              <Download size={18} className="mr-1" />
              리뷰 크롤러
            </Link>
            <Link 
              href="/admin/content/crawler"
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md flex items-center"
            >
              <Download size={18} className="mr-1" />
              드라마 크롤러
            </Link>
            <Link 
              href="/admin/content/new"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
            >
              <PlusCircle size={18} className="mr-1" />
              신규 콘텐츠 등록
            </Link>
          </div>
        </div>
        
        {/* 크롤러 카드 UI */}
        <Grid container spacing={3} className="mb-6">
          {/* 드라마 크롤러 카드 */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  드라마 크롤러
                </Typography>
                <Typography>
                  MyDramalist에서 드라마/영화 정보와 배우 정보를 크롤링합니다.
                </Typography>
              </CardContent>
              <CardActions>
                <Link href="/admin/content/crawler" passHref>
                  <Button size="small" variant="contained" color="secondary">크롤러 시작</Button>
                </Link>
              </CardActions>
            </Card>
          </Grid>
          
          {/* 리뷰 스텔스 크롤러 카드 */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  리뷰 스텔스 크롤러
                </Typography>
                <Typography>
                  MyDramalist 드라마/영화 리뷰를 Cloudflare 보호를 우회하여 스텔스 크롤링합니다.
                </Typography>
              </CardContent>
              <CardActions>
                <Link href="/admin/content/reviews-crawler" passHref>
                  <Button size="small" variant="contained" color="success">크롤러 시작</Button>
                </Link>
              </CardActions>
            </Card>
          </Grid>
          
          {/* 콘텐츠 등록 카드 */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  콘텐츠 신규 등록
                </Typography>
                <Typography>
                  드라마, 영화, 예능 등 새로운 콘텐츠를 직접 등록합니다.
                </Typography>
              </CardContent>
              <CardActions>
                <Link href="/admin/content/new" passHref>
                  <Button size="small" variant="contained" color="primary">콘텐츠 등록</Button>
                </Link>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
        
        {/* 필터링 및 검색 */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* 콘텐츠 타입 필터 */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">콘텐츠 타입</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={contentType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setContentType(newType);
                  setCurrentPage(1);
                  
                  // URL 쿼리 파라미터 업데이트
                  const query = { ...router.query };
                  if (newType) {
                    query.type = newType;
                  } else {
                    delete query.type;
                  }
                  router.push({
                    pathname: router.pathname,
                    query
                  }, undefined, { shallow: true });
                }}
              >
                <option value="">전체 타입</option>
                <option value="all">모든 타입 보기</option>
                <option value="drama">드라마</option>
                <option value="movie">영화</option>
                <option value="variety">예능</option>
                <option value="documentary">다큐멘터리</option>
                <option value="other">기타</option>
              </select>
            </div>
            
            {/* 검색 */}
            <div className="flex-1 flex min-w-[300px]">
              <form onSubmit={handleSearch} className="w-full flex">
                <input
                  type="text"
                  placeholder="제목 검색..."
                  className="flex-1 border border-gray-300 rounded-l-md px-3 py-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-r-md"
                >
                  <Search size={20} />
                </button>
              </form>
            </div>
            
            {/* 정렬 및 페이지 표시 개수 */}
            <div className="flex items-center gap-2">
              <select
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortField(field);
                  setSortOrder(order);
                  setCurrentPage(1);
                }}
              >
                <option value="orderNumber-asc">순위순</option>
                <option value="createdAt-desc">최신순</option>
                <option value="createdAt-asc">오래된순</option>
                <option value="title-asc">제목 오름차순</option>
                <option value="title-desc">제목 내림차순</option>
                <option value="reviewRating-desc">평점 높은순</option>
                <option value="reviewCount-desc">리뷰 많은순</option>
                <option value="views-desc">조회수 높은순</option>
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
        
        {/* 콘텐츠 목록 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-20 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-gray-600">콘텐츠를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">
              <p>{error}</p>
              <button 
                onClick={fetchContents}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
          ) : contents.length === 0 ? (
            <div className="p-10 text-center text-gray-600">
              <p>콘텐츠가 없습니다. 새 콘텐츠를 등록해보세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      정보
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      콘텐츠 타입
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      순위
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        className="flex items-center"
                        onClick={() => handleSortChange('reviewRating')}
                      >
                        평점
                        {sortField === 'reviewRating' && (
                          <span className="ml-1">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        className="flex items-center"
                        onClick={() => handleSortChange('createdAt')}
                      >
                        등록일
                        {sortField === 'createdAt' && (
                          <span className="ml-1">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contents.map((content) => (
                    <tr key={content._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-16 w-12 relative">
                            {content.coverImage ? (
                              <Image 
                                src={content.coverImage}
                                alt={content.title}
                                layout="fill"
                                objectFit="cover"
                                className="rounded"
                              />
                            ) : (
                              <div className="h-full w-full bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-gray-500 text-xs">No Image</span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {content.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {content.originalTitle}
                            </div>
                            {content.featured && (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                대표 콘텐츠
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          {getContentTypeLabel(content.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getStatusLabel(content.status) === '방영 중' 
                            ? 'bg-green-100 text-green-800'
                            : getStatusLabel(content.status) === '완결'
                            ? 'bg-blue-100 text-blue-800'
                            : getStatusLabel(content.status) === '개봉 예정'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getStatusLabel(content.status)}
                        </span>
                      </td>

                      {/* 순위 및 순위 조정 버튼 */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            #{content.orderNumber || contents.indexOf(content) + 1}
                          </span>
                          <div className="flex flex-col space-y-1">
                            <button 
                              onClick={() => movePosition(content._id, 'up')}
                              className="text-blue-500 hover:text-blue-700 p-1"
                              disabled={contents.indexOf(content) === 0}
                              title="순위 올리기"
                            >
                              <ArrowUp size={14} className={contents.indexOf(content) === 0 ? 'text-gray-300' : ''} />
                            </button>
                            <button 
                              onClick={() => movePosition(content._id, 'down')}
                              className="text-blue-500 hover:text-blue-700 p-1"
                              disabled={contents.indexOf(content) === contents.length - 1}
                              title="순위 내리기"
                            >
                              <ArrowDown size={14} className={contents.indexOf(content) === contents.length - 1 ? 'text-gray-300' : ''} />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Star size={16} className="text-yellow-400 mr-1" />
                          <span className="text-sm text-gray-900">
                            {content.reviewRating ? content.reviewRating.toFixed(1) : '-'}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({content.reviewCount || 0})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(content.createdAt), 'yyyy.MM.dd', { locale: ko })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link 
                            href={`/${content.category}/${content.slug}`}
                            className="text-indigo-600 hover:text-indigo-900"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye size={18} />
                          </Link>
                          <Link 
                            href={`/admin/content/edit/${content._id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => {
                              console.log('삭제 시도:', content._id, content.title, content.contentType);
                              handleDelete(content._id, content.title, content.contentType);
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* 페이지네이션 */}
          {!isLoading && !error && contents.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {totalItems}개 중 {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, totalItems)}개 표시
              </div>
              <div className="flex space-x-2">
                <button
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // 페이지 버튼 최대 5개 표시, 현재 페이지 중심으로
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      className={`px-3 py-1 rounded ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-100'
                      }`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 토스트 메시지 */}
      {toast.visible && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-fade-in">
          <div className={`flex items-center p-4 rounded-lg border ${
            toast.type === 'success' ? 'bg-green-50 border-green-500' :
            toast.type === 'error' ? 'bg-red-50 border-red-500' :
            toast.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
            'bg-blue-50 border-blue-500'
          } shadow-md`}>
            <div className={`flex-grow ${
              toast.type === 'success' ? 'text-green-800' :
              toast.type === 'error' ? 'text-red-800' :
              toast.type === 'warning' ? 'text-yellow-800' :
              'text-blue-800'
            }`}>{toast.message}</div>
            <button 
              onClick={() => setToast({ visible: false, message: '', type: '' })} 
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <span className="text-xl">×</span>
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// 클라이언트 사이드에서 인증 확인으로 변경
export async function getServerSideProps(context) {
  // 임시로 서버 사이드 인증 체크 비활성화
  return {
    props: {},
  };
}

export default withAdminAuth(ContentManagement); 