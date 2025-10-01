import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Edit2, Trash2, Star, Check, X, Filter, Search, RefreshCw, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function ReviewsManagement() {
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    reported: 0,
    featured: 0
  });
  
  // 페이지네이션 상태
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // 필터 상태
  const [filters, setFilters] = useState({
    status: 'all',
    contentType: 'all',
    search: ''
  });
  
  // 데이터 로드
  const loadReviews = async (page = 1, filters = {}) => {
    setLoading(true);
    try {
      // 필터링 파라미터 구성
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', pagination.limit);
      
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.contentType && filters.contentType !== 'all') params.append('contentType', filters.contentType);
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`/api/admin/reviews?${params.toString()}`);
      
      if (response.data.success) {
        setReviews(response.data.reviews);
        setStats(response.data.stats);
        setPagination(response.data.pagination);
      } else {
        toast.error('리뷰 데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('리뷰 로드 중 오류:', error);
      toast.error('리뷰 데이터를 불러오는데 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // 초기 로드
  useEffect(() => {
    loadReviews(1, filters);
  }, []);
  
  // 필터링 핸들러
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 필터 적용
  const applyFilters = () => {
    loadReviews(1, filters);
  };
  
  // 페이지 변경
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    loadReviews(newPage, filters);
  };
  
  // 리뷰 삭제
  const handleDelete = async (id) => {
    if (!confirm('이 리뷰를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      const response = await axios.delete(`/api/admin/reviews/${id}`);
      
      if (response.data.success) {
        toast.success('리뷰가 삭제되었습니다.');
        loadReviews(pagination.page, filters); // 현재 페이지 리로드
      } else {
        toast.error('리뷰 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('리뷰 삭제 중 오류:', error);
      toast.error('리뷰 삭제 중 오류가 발생했습니다.');
    }
  };
  
  // 추천 리뷰 토글
  const toggleFeatured = async (id, currentStatus) => {
    try {
      const response = await axios.put(`/api/admin/reviews/${id}`, {
        featured: !currentStatus
      });
      
      if (response.data.success) {
        toast.success(currentStatus 
          ? '추천 리뷰에서 제외되었습니다.' 
          : '추천 리뷰로 설정되었습니다.');
        
        // 현재 리뷰 목록 업데이트
        setReviews(reviews.map(review => 
          review._id === id 
            ? { ...review, featured: !currentStatus } 
            : review
        ));
      } else {
        toast.error('리뷰 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('리뷰 상태 변경 중 오류:', error);
      toast.error('리뷰 상태 변경 중 오류가 발생했습니다.');
    }
  };
  
  // 승인 상태 토글
  const toggleApproved = async (id, currentStatus) => {
    try {
      const response = await axios.put(`/api/admin/reviews/${id}`, {
        approved: !currentStatus
      });
      
      if (response.data.success) {
        toast.success(currentStatus 
          ? '리뷰가 비승인 상태로 변경되었습니다.' 
          : '리뷰가 승인되었습니다.');
        
        // 현재 리뷰 목록 업데이트
        setReviews(reviews.map(review => 
          review._id === id 
            ? { ...review, approved: !currentStatus } 
            : review
        ));
      } else {
        toast.error('리뷰 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('리뷰 상태 변경 중 오류:', error);
      toast.error('리뷰 상태 변경 중 오류가 발생했습니다.');
    }
  };
  
  // 포맷된 날짜 표시
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: ko });
    } catch (e) {
      return dateString;
    }
  };
  
  // 별점 렌더링
  const renderRating = (rating) => {
    return (
      <div className="flex items-center">
        <span className="font-bold mr-1">{rating}</span>
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
      </div>
    );
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">리뷰 관리</h1>
        
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm text-gray-500">전체 리뷰</h3>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm text-gray-500">승인됨</h3>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm text-gray-500">대기중</h3>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm text-gray-500">신고됨</h3>
            <p className="text-2xl font-bold text-red-600">{stats.reported}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm text-gray-500">추천 리뷰</h3>
            <p className="text-2xl font-bold text-purple-600">{stats.featured}</p>
          </div>
        </div>
        
        {/* 필터 및 검색 섹션 */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">모든 상태</option>
                <option value="approved">승인됨</option>
                <option value="pending">대기중</option>
                <option value="reported">신고됨</option>
                <option value="featured">추천 리뷰</option>
              </select>
            </div>
            
            <div className="w-full md:w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">콘텐츠 타입</label>
              <select
                name="contentType"
                value={filters.contentType}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">모든 타입</option>
                <option value="drama">드라마</option>
                <option value="movie">영화</option>
              </select>
            </div>
            
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
              <div className="relative">
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="제목, 내용, 작성자로 검색"
                  className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                <Filter className="w-4 h-4 mr-1" />
                필터 적용
              </button>
              
              <button
                onClick={() => {
                  setFilters({ status: 'all', contentType: 'all', search: '' });
                  loadReviews(1, { status: 'all', contentType: 'all', search: '' });
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                초기화
              </button>
            </div>
          </div>
        </div>
        
        {/* 액션 버튼 */}
        <div className="flex justify-between mb-6">
          <div className="text-sm text-gray-600">
            총 <span className="font-bold">{pagination.total}</span>개의 리뷰 중 <span className="font-bold">{reviews.length}</span>개 표시 중
          </div>
          
          <Link 
            href="/admin/reviews/new"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            + 새 리뷰 작성
          </Link>
        </div>
        
        {/* 리뷰 테이블 */}
        <div className="bg-white overflow-hidden rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성자
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    콘텐츠
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    별점
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    추천
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성일
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-gray-500">
                      리뷰가 없습니다.
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr key={review._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {review._id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {review.title}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{review.authorName || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {review.contentTitle || 
                            (review.dramaId ? '드라마' : review.tvfilmId ? '영화' : '-')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderRating(review.rating)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => toggleApproved(review._id, review.approved)}
                          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                            review.approved 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          }`}
                        >
                          {review.approved ? (
                            <><Check className="w-3 h-3 mr-1" /> 승인됨</>
                          ) : (
                            <><X className="w-3 h-3 mr-1" /> 대기중</>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => toggleFeatured(review._id, review.featured)}
                          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                            review.featured 
                              ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {review.featured ? (
                            <><Award className="w-3 h-3 mr-1" /> 추천</>
                          ) : (
                            <><Award className="w-3 h-3 mr-1 text-gray-400" /> 일반</>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(review.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          <Link
                            href={`/admin/reviews/edit/${review._id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(review._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* 페이지네이션 */}
          {pagination.pages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    pagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  이전
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    pagination.page === pagination.pages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  다음
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    전체 <span className="font-medium">{pagination.total}</span>개 중{' '}
                    <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>-
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>번
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        pagination.page === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">처음</span>
                      <span>&laquo;</span>
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        pagination.page === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">이전</span>
                      <span>&lt;</span>
                    </button>
                    
                    {/* 페이지 번호 버튼 생성 */}
                    {[...Array(pagination.pages)].map((_, i) => {
                      // 너무 많은 페이지가 있으면 일부만 표시
                      if (pagination.pages > 7) {
                        // 현재 페이지 주변 3개와 처음/끝 페이지 표시
                        if (
                          i === 0 ||
                          i === pagination.pages - 1 ||
                          (i >= pagination.page - 2 && i <= pagination.page)
                        ) {
                          return (
                            <button
                              key={i}
                              onClick={() => handlePageChange(i + 1)}
                              className={`relative inline-flex items-center px-4 py-2 border ${
                                pagination.page === i + 1
                                  ? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              } text-sm font-medium`}
                            >
                              {i + 1}
                            </button>
                          );
                        } else if (
                          i === 1 && pagination.page > 3 ||
                          i === pagination.pages - 2 && pagination.page < pagination.pages - 2
                        ) {
                          return <span key={i} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                        }
                        return null;
                      }
                      
                      // 페이지 수가 적으면 모두 표시
                      return (
                        <button
                          key={i}
                          onClick={() => handlePageChange(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            pagination.page === i + 1
                              ? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          } text-sm font-medium`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                        pagination.page === pagination.pages
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">다음</span>
                      <span>&gt;</span>
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.pages)}
                      disabled={pagination.page === pagination.pages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        pagination.page === pagination.pages
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">마지막</span>
                      <span>&raquo;</span>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
} 