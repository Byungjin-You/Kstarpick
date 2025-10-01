import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { Eye, Edit, Trash2, Search, Plus, Filter, ChevronLeft, ChevronRight, AlertTriangle, Star, User, RefreshCw, Instagram, Twitter, Youtube, Music } from 'lucide-react';

export default function AdminCelebList() {
  const router = useRouter();
  const [celebrities, setCelebrities] = useState([]);
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
  
  // Categories for filtering
  const categories = [
    { value: 'all', label: '전체 카테고리' },
    { value: 'idol', label: '아이돌' },
    { value: 'actor', label: '배우(남자)' },
    { value: 'actress', label: '배우(여자)' },
    { value: 'solo', label: '솔로 아티스트' },
    { value: 'band', label: '밴드' },
    { value: 'model', label: '모델' },
    { value: 'rookie', label: '신인' },
    { value: 'other', label: '기타' },
  ];
  
  // Fetch celebrity data
  const fetchCelebrities = async (page = 1, category = 'all', search = '') => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      let queryParams = `page=${page}&limit=${limit}`;
      if (category !== 'all') {
        queryParams += `&category=${category}`;
      }
      if (search) {
        queryParams += `&search=${encodeURIComponent(search)}`;
      }
      
      // Fetch data from API
      const response = await fetch(`/api/celeb?${queryParams}`);
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error('Failed to fetch celebrities');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setCelebrities(data.data.celebrities || []);
        setTotalPages(Math.ceil((data.data.pagination?.total || 0) / limit) || 1);
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('셀럽 데이터를 가져오는 중 오류가 발생했습니다:', error);
      setError('셀럽 데이터를 가져오는 중 오류가 발생했습니다.');
      // Generate mock data for demonstration
      setCelebrities(generateMockCelebrities());
      setTotalPages(5);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate mock celebrity data for demonstration
  const generateMockCelebrities = () => {
    const celebNames = ['지수', '제니', '로제', '리사', '아이유', '태연', '정국', '뷔', '지민', '윤아', '수지', '이민호', '김수현'];
    const agencies = ['HYBE', 'SM Entertainment', 'YG Entertainment', 'JYP Entertainment', 'ADOR', 'BIGHIT Music'];
    const roles = ['Singer', 'Rapper', 'Dancer', 'Visual', 'Actor/Actress', 'Model'];
    const groups = ['BLACKPINK', 'BTS', 'NewJeans', 'aespa', 'IVE', 'Girls Generation', 'EXO', 'TWICE', '', ''];
    
    return Array(10).fill(0).map((_, index) => ({
      _id: `mock-${index + 1 + (currentPage - 1) * 10}`,
      name: celebNames[index % celebNames.length],
      koreanName: celebNames[index % celebNames.length],
      role: roles[index % roles.length],
      category: categories[index % 7 + 1].value,
      agency: agencies[index % agencies.length],
      group: groups[index % groups.length],
      followers: Math.floor(Math.random() * 10000000) + 1000000,
      socialMediaFollowers: {
        instagram: Math.floor(Math.random() * 5000000) + 500000,
        twitter: Math.floor(Math.random() * 2000000) + 300000,
        youtube: Math.floor(Math.random() * 1000000) + 100000,
        spotify: Math.floor(Math.random() * 500000) + 50000,
        tiktok: Math.floor(Math.random() * 3000000) + 200000,
        fancafe: Math.floor(Math.random() * 100000) + 10000
      },
      profileImage: `/images/placeholder.jpg`,
      isFeatured: index % 3 === 0,
      isActive: true,
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    }));
  };
  
  // Load data when component mounts or filters change
  useEffect(() => {
    fetchCelebrities(currentPage, selectedCategory, searchTerm);
  }, [currentPage, selectedCategory, searchTerm, refreshKey]);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchCelebrities(1, selectedCategory, searchTerm);
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
      const response = await fetch(`/api/celeb/${deleteItemId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete celebrity');
      }
      
      // Remove item from state
      setCelebrities(celebrities.filter(item => item._id !== deleteItemId));
      
      // Close modal
      setShowDeleteModal(false);
      setDeleteItemId(null);
    } catch (error) {
      console.error('Error deleting celebrity:', error);
      setError('Failed to delete celebrity');
      // Close modal regardless of error
      setShowDeleteModal(false);
      setDeleteItemId(null);
    }
  };
  
  // Format followers count for display
  const formatFollowers = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count;
  };
  
  // 소셜 미디어 아이콘 렌더링
  const renderSocialIcon = (type) => {
    switch (type) {
      case 'instagram':
        return <Instagram size={16} className="text-[#E1306C]" />;
      case 'twitter':
        return <Twitter size={16} className="text-[#1DA1F2]" />;
      case 'youtube':
        return <Youtube size={16} className="text-[#FF0000]" />;
      case 'spotify':
        return <Music size={16} className="text-[#1ED760]" />;
      default:
        return null;
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <AdminLayout>
      <Head>
        <title>Celebrity Management | Admin</title>
      </Head>
      
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">셀럽 관리</h1>
          <p className="text-gray-500">셀럽 프로필 및 정보를 관리하세요</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-2">
          <Link 
            href="/admin/celeb/import"
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            K-POP 셀럽 가져오기
          </Link>
          <Link 
            href="/admin/celeb/create"
            className="inline-flex items-center px-4 py-2 bg-[#ff3e8e] text-white rounded-lg hover:bg-[#e02e7c] transition-colors"
          >
            <Plus className="mr-1 h-4 w-4" />
            셀럽 추가
          </Link>
        </div>
      </div>
      
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
                placeholder="이름으로 검색"
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
              검색
            </button>
          </form>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle size={20} className="text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Celebrity List */}
      <div className="bg-white rounded-lg shadow-sm mb-6 w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  프로필
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  이름
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  소속사/그룹
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  카테고리
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  SNS 팔로워
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  총 팔로워
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  상태
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                // Loading skeleton
                Array(5).fill(0).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-8 bg-gray-200 rounded w-24 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : celebrities.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <User size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">등록된 셀럽이 없습니다</p>
                    <p className="text-gray-400 mt-1">새로운 셀럽을 추가해보세요</p>
                  </td>
                </tr>
              ) : (
                // Celebrity list
                celebrities.map((celeb) => (
                  <tr key={celeb._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                          {celeb.profileImage ? (
                            <img
                              src={celeb.profileImage}
                              alt={celeb.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/images/placeholder.jpg";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                              <User size={24} />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{celeb.name}</div>
                      {celeb.koreanName && celeb.koreanName !== celeb.name && (
                        <div className="text-xs text-gray-500">{celeb.koreanName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {celeb.agency && (
                        <div className="text-sm text-gray-500">{celeb.agency}</div>
                      )}
                      {celeb.group && (
                        <div className="text-xs text-gray-700 font-medium">{celeb.group}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                        {categories.find(cat => cat.value === celeb.category)?.label || celeb.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {celeb.socialMediaFollowers ? (
                        <div className="space-y-1.5">
                          {celeb.socialMediaFollowers.instagram > 0 && (
                            <div className="flex items-center">
                              {renderSocialIcon('instagram')}
                              <span className="ml-2 text-xs text-gray-600">{formatFollowers(celeb.socialMediaFollowers.instagram)}</span>
                            </div>
                          )}
                          {celeb.socialMediaFollowers.twitter > 0 && (
                            <div className="flex items-center">
                              {renderSocialIcon('twitter')}
                              <span className="ml-2 text-xs text-gray-600">{formatFollowers(celeb.socialMediaFollowers.twitter)}</span>
                            </div>
                          )}
                          {celeb.socialMediaFollowers.youtube > 0 && (
                            <div className="flex items-center">
                              {renderSocialIcon('youtube')}
                              <span className="ml-2 text-xs text-gray-600">{formatFollowers(celeb.socialMediaFollowers.youtube)}</span>
                            </div>
                          )}
                          {celeb.socialMediaFollowers.spotify > 0 && (
                            <div className="flex items-center">
                              {renderSocialIcon('spotify')}
                              <span className="ml-2 text-xs text-gray-600">{formatFollowers(celeb.socialMediaFollowers.spotify)}</span>
                            </div>
                          )}
                          {Object.values(celeb.socialMediaFollowers).every(val => val === 0) && (
                            <span className="text-xs text-gray-400">데이터 없음</span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {celeb.socialMedia?.instagram && (
                            <div className="flex items-center">
                              {renderSocialIcon('instagram')}
                              <span className="ml-2 text-xs text-gray-600">링크 있음</span>
                            </div>
                          )}
                          {celeb.socialMedia?.twitter && (
                            <div className="flex items-center">
                              {renderSocialIcon('twitter')}
                              <span className="ml-2 text-xs text-gray-600">링크 있음</span>
                            </div>
                          )}
                          {celeb.socialMedia?.youtube && (
                            <div className="flex items-center">
                              {renderSocialIcon('youtube')}
                              <span className="ml-2 text-xs text-gray-600">링크 있음</span>
                            </div>
                          )}
                          {celeb.socialMedia?.spotify && (
                            <div className="flex items-center">
                              {renderSocialIcon('spotify')}
                              <span className="ml-2 text-xs text-gray-600">링크 있음</span>
                            </div>
                          )}
                          {(!celeb.socialMedia || Object.values(celeb.socialMedia).every(val => !val)) && (
                            <span className="text-xs text-gray-400">데이터 없음</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFollowers(celeb.followers)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {celeb.isFeatured && (
                          <span className="inline-flex items-center mr-2">
                            <Star size={16} className="text-yellow-400" />
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          celeb.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {celeb.isActive ? '활성' : '비활성'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/celeb/${celeb.slug || celeb._id}`}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="View profile"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/admin/celeb/edit/${celeb._id}`}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Edit celebrity"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(celeb._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete celebrity"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && celebrities.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  총 <span className="font-medium">{totalPages * limit}</span> 개 중{' '}
                  <span className="font-medium">{(currentPage - 1) * limit + 1}</span> -{' '}
                  <span className="font-medium">{Math.min(currentPage * limit, totalPages * limit)}</span> 표시
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
                  
                  {/* Page Numbers */}
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    const show = pageNum === 1 || pageNum === totalPages || 
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                    
                    if (!show) {
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return (
                          <span key={`ellipsis-${pageNum}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'bg-[#ff3e8e] text-white border-[#ff3e8e]'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">셀럽 삭제 확인</h3>
            <p className="text-gray-600 mb-6">이 셀럽을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// 서버 사이드에서 인증 확인
export async function getServerSideProps(context) {
  try {
    // Placeholder for authentication logic
    return {
      props: {},
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {},
    };
  }
} 