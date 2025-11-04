import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSession, useSession } from 'next-auth/react';
import AdminLayout from '../../../components/AdminLayout';
import {
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  Download,
  User,
  Instagram,
  Twitter,
  Youtube,
  Music
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Image from 'next/image';

export default function AdminCelebList() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [celebrities, setCelebrities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });

  // 필터링 및 페이지네이션 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // 다중 선택 상태
  const [selectedItems, setSelectedItems] = useState([]);
  const [showMultiDeleteModal, setShowMultiDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Categories for filtering
  const categories = [
    { value: 'all', label: '전체' },
    { value: 'idol', label: '아이돌' },
    { value: 'actor', label: '배우(남자)' },
    { value: 'actress', label: '배우(여자)' },
    { value: 'solo', label: '솔로 아티스트' },
    { value: 'band', label: '밴드' },
    { value: 'model', label: '모델' },
    { value: 'rookie', label: '신인' },
    { value: 'other', label: '기타' },
  ];

  // 인증 확인
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/admin/login');
    } else if (session.user?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  // URL 쿼리 파라미터에서 초기 필터 상태 설정
  useEffect(() => {
    const { search, page, category } = router.query;

    if (search) {
      setSearchTerm(search);
    }

    if (page) {
      setCurrentPage(parseInt(page, 10));
    }

    if (category) {
      setSelectedCategory(category);
    }
  }, [router.query]);

  // Fetch celebrity data
  const fetchCelebrities = async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        sortBy: sortField,
        sortOrder: sortOrder
      });

      if (selectedCategory !== 'all') {
        queryParams.append('category', selectedCategory);
      }

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }

      console.log('API 요청 파라미터:', queryParams.toString());

      // Fetch data from API
      const response = await fetch(`/api/celeb?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error('셀럽 목록을 불러오는 중 오류가 발생했습니다.');
      }

      const data = await response.json();

      console.log('API 응답 데이터:', data);

      if (data.success && data.data) {
        setCelebrities(data.data.celebrities || []);
        setTotalPages(data.data.pagination?.pages || 1);
        setTotalItems(data.data.pagination?.total || 0);
      } else {
        throw new Error('잘못된 데이터 형식입니다.');
      }
    } catch (error) {
      console.error('셀럽 데이터를 가져오는 중 오류가 발생했습니다:', error);
      setError(error.message);
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 페이지 변경 시 셀럽 목록 조회
  useEffect(() => {
    if (session && status === 'authenticated') {
      fetchCelebrities();
    }
  }, [currentPage, itemsPerPage, sortField, sortOrder, selectedCategory, session, status]);

  // 검색어 변경 시 API 호출
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);

    // URL 쿼리 파라미터 업데이트
    const query = { ...router.query };
    if (searchTerm) {
      query.search = searchTerm;
    } else {
      delete query.search;
    }

    delete query.page;

    router.push({
      pathname: router.pathname,
      query
    }, undefined, { shallow: true });

    fetchCelebrities();
  };

  // 카테고리 변경
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);

    const query = { ...router.query };
    if (category !== 'all') {
      query.category = category;
    } else {
      delete query.category;
    }
    delete query.page;

    router.push({
      pathname: router.pathname,
      query
    }, undefined, { shallow: true });
  };

  // 셀럽 삭제 처리
  const handleDelete = async (id, name) => {
    if (!confirm(`"${name}" 셀럽을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      const response = await fetch(`/api/celeb/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '셀럽 삭제 중 오류가 발생했습니다.');
      }

      fetchCelebrities();
      showToast('셀럽이 성공적으로 삭제되었습니다.', 'success');
    } catch (err) {
      console.error('Error deleting celebrity:', err);
      showToast(err.message, 'error');
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
      setSelectedItems(celebrities.map(item => item._id));
    } else {
      setSelectedItems([]);
    }
  };

  // 다중 삭제 모달 열기
  const handleMultiDeleteClick = () => {
    if (selectedItems.length === 0) {
      showToast('선택된 항목이 없습니다.', 'warning');
      return;
    }
    setShowMultiDeleteModal(true);
  };

  // 다중 삭제 실행
  const handleMultiDeleteConfirm = async () => {
    if (selectedItems.length === 0) return;

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');

      const deletePromises = selectedItems.map(id =>
        fetch(`/api/celeb/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        })
      );

      const results = await Promise.all(deletePromises);
      const hasError = results.some(response => !response.ok);

      if (!hasError) {
        fetchCelebrities();
        setShowMultiDeleteModal(false);
        setSelectedItems([]);
        showToast(`${selectedItems.length}개의 셀럽이 성공적으로 삭제되었습니다.`, 'success');
      } else {
        showToast('일부 항목 삭제 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('Error deleting multiple celebrities:', error);
      showToast('셀럽 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 정렬 필드 변경
  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 토스트 메시지 표시
  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: '' }), 3000);
  };

  // Format followers count for display
  const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };

  // 소셜 미디어 아이콘 렌더링
  const renderSocialIcon = (type) => {
    switch (type) {
      case 'instagram':
        return <Instagram size={14} className="text-[#E1306C]" />;
      case 'twitter':
        return <Twitter size={14} className="text-[#1DA1F2]" />;
      case 'youtube':
        return <Youtube size={14} className="text-[#FF0000]" />;
      case 'spotify':
        return <Music size={14} className="text-[#1ED760]" />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>셀럽 관리 | Admin</title>
      </Head>

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">셀럽 관리</h1>
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
          <Link
            href="/admin/celeb/import"
            className="bg-white hover:bg-gray-50 border-2 py-2 px-4 rounded-md flex items-center"
            style={{ borderColor: '#233cfa', color: '#233cfa' }}
          >
            <Download className="mr-2 h-5 w-5" />
            K-POP 셀럽 가져오기
          </Link>
          <Link
            href="/admin/celeb/create"
            className="bg-white hover:bg-gray-50 border-2 py-2 px-4 rounded-md flex items-center"
            style={{ borderColor: '#233cfa', color: '#233cfa' }}
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            신규 셀럽 등록
          </Link>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => handleCategoryChange(category.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category.value
                  ? 'bg-[#233cfa] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 및 정렬 */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* 검색 */}
          <div className="flex-1 flex min-w-[300px]">
            <form onSubmit={handleSearch} className="w-full flex">
              <input
                type="text"
                placeholder="이름으로 검색..."
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
              <option value="createdAt-desc">최신순</option>
              <option value="createdAt-asc">오래된순</option>
              <option value="name-asc">이름 오름차순</option>
              <option value="name-desc">이름 내림차순</option>
              <option value="followers-desc">팔로워 많은순</option>
              <option value="followers-asc">팔로워 적은순</option>
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

      {/* Celebrity List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">셀럽을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={fetchCelebrities}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        ) : celebrities.length === 0 ? (
          <div className="p-10 text-center text-gray-600">
            <p>셀럽이 없습니다. 새 셀럽을 등록해보세요.</p>
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
                      checked={celebrities.length > 0 && selectedItems.length === celebrities.length}
                      className="h-4 w-4 rounded border-gray-300 text-[#ff3e8e] focus:ring-[#ff3e8e]"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    프로필
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SNS 팔로워
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
                {celebrities.map((celeb) => (
                  <tr key={celeb._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(celeb._id)}
                        onChange={() => handleCheckboxChange(celeb._id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#ff3e8e] focus:ring-[#ff3e8e]"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full overflow-hidden relative bg-gray-100">
                          {celeb.profileImage ? (
                            <Image
                              src={celeb.profileImage}
                              alt={celeb.name}
                              layout="fill"
                              objectFit="cover"
                              className="rounded-full"
                              onError={(e) => {
                                e.target.src = "/images/placeholder.jpg";
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-200 text-gray-400">
                              <User size={24} />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {celeb.name}
                          </div>
                          {celeb.koreanName && celeb.koreanName !== celeb.name && (
                            <div className="text-sm text-gray-500">
                              {celeb.koreanName}
                            </div>
                          )}
                          {celeb.group && (
                            <div className="text-xs text-gray-500">
                              {celeb.group}
                            </div>
                          )}
                          {celeb.isFeatured && (
                            <span className="inline-flex items-center mt-1">
                              <Star size={14} className="text-yellow-400 mr-1" />
                              <span className="text-xs text-yellow-600">대표</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-100 text-pink-800">
                        {categories.find(cat => cat.value === celeb.category)?.label || celeb.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {celeb.socialMediaFollowers ? (
                        <div className="flex gap-3">
                          {celeb.socialMediaFollowers.instagram > 0 && (
                            <div className="flex items-center">
                              {renderSocialIcon('instagram')}
                              <span className="ml-1 text-xs text-gray-600">{formatFollowers(celeb.socialMediaFollowers.instagram)}</span>
                            </div>
                          )}
                          {celeb.socialMediaFollowers.youtube > 0 && (
                            <div className="flex items-center">
                              {renderSocialIcon('youtube')}
                              <span className="ml-1 text-xs text-gray-600">{formatFollowers(celeb.socialMediaFollowers.youtube)}</span>
                            </div>
                          )}
                          {celeb.socialMediaFollowers.twitter > 0 && (
                            <div className="flex items-center">
                              {renderSocialIcon('twitter')}
                              <span className="ml-1 text-xs text-gray-600">{formatFollowers(celeb.socialMediaFollowers.twitter)}</span>
                            </div>
                          )}
                          {Object.values(celeb.socialMediaFollowers).every(val => val === 0) && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {celeb.createdAt && format(new Date(celeb.createdAt), 'yyyy.MM.dd', { locale: ko })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <div className="flex justify-start space-x-2">
                        <Link
                          href={`/celeb/${celeb.slug || celeb._id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/admin/celeb/edit/${celeb._id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDelete(celeb._id, celeb.name)}
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
        {!isLoading && !error && celebrities.length > 0 && (
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

      {/* Multi Delete Confirmation Modal */}
      {showMultiDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">다중 삭제</h3>
            <p className="text-sm text-gray-500 mb-4">
              선택한 {selectedItems.length}개의 셀럽을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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

// 서버 사이드에서 인증 확인
export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session || session.user?.role !== 'admin') {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
}