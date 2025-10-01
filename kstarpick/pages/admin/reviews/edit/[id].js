import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Star, Award, Check, AlertTriangle, ArrowLeft, Save, X } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function EditReview() {
  const router = useRouter();
  const { id } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState(null);
  const [contentInfo, setContentInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rating: 5,
    authorName: '',
    featured: false,
    approved: true,
    spoiler: false,
    tags: []
  });
  
  // 태그 입력을 위한 상태
  const [tagInput, setTagInput] = useState('');
  
  // 리뷰 데이터 로드
  useEffect(() => {
    if (id) {
      loadReviewData();
    }
  }, [id]);
  
  const loadReviewData = async () => {
    try {
      const response = await axios.get(`/api/admin/reviews/${id}`);
      
      if (response.data.success) {
        const { review, contentInfo } = response.data;
        
        setReview(review);
        setContentInfo(contentInfo);
        
        // 폼 데이터 설정
        setFormData({
          title: review.title || '',
          content: review.content || '',
          rating: review.rating || 5,
          authorName: review.authorName || '',
          featured: review.featured || false,
          approved: review.approved || false,
          spoiler: review.spoiler || false,
          tags: Array.isArray(review.tags) ? [...review.tags] : []
        });
      } else {
        toast.error('리뷰를 불러오는데 실패했습니다.');
        router.push('/admin/reviews');
      }
    } catch (error) {
      console.error('리뷰 로딩 중 오류:', error);
      toast.error('리뷰를 불러오는데 오류가 발생했습니다.');
      router.push('/admin/reviews');
    } finally {
      setLoading(false);
    }
  };
  
  // 입력 값 변경 핸들러
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // 태그 추가 핸들러
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    
    // 중복 체크
    if (formData.tags.includes(tagInput.trim())) {
      toast.warning('이미 추가된 태그입니다.');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tagInput.trim()]
    }));
    setTagInput('');
  };
  
  // 태그 제거 핸들러
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  // 리뷰 수정 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 기본 유효성 검사
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    
    if (!formData.content.trim()) {
      toast.error('내용을 입력해주세요.');
      return;
    }
    
    if (!formData.authorName.trim()) {
      toast.error('작성자 이름을 입력해주세요.');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await axios.put(`/api/admin/reviews/${id}`, formData);
      
      if (response.data.success) {
        toast.success('리뷰가 성공적으로 수정되었습니다.');
        router.push('/admin/reviews');
      } else {
        toast.error(response.data.message || '리뷰 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('리뷰 수정 중 오류:', error);
      toast.error('리뷰 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // 별점 렌더링
  const renderRatingStars = (currentRating) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData({ ...formData, rating: star })}
            className={`focus:outline-none ${star <= currentRating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            <Star className={`w-6 h-6 ${star <= currentRating ? 'fill-yellow-400' : ''}`} />
          </button>
        ))}
      </div>
    );
  };
  
  // 포맷된 날짜 표시
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
    } catch (e) {
      return dateString;
    }
  };
  
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }
  
  if (!review) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-8 flex flex-col items-center">
          <div className="bg-red-50 p-6 rounded-lg mb-6 w-full max-w-3xl">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500 mr-2" />
              <h2 className="text-xl font-bold text-red-700">리뷰를 찾을 수 없습니다</h2>
            </div>
            <p className="text-red-600 mb-4">요청하신 리뷰가 존재하지 않거나 접근 권한이 없습니다.</p>
            <Link
              href="/admin/reviews"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              리뷰 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">리뷰 편집</h1>
          <Link
            href="/admin/reviews"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            리뷰 목록으로 돌아가기
          </Link>
        </div>
        
        {/* 메타 정보 */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">리뷰 ID</p>
              <p className="font-mono text-gray-700">{review._id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">작성일</p>
              <p className="text-gray-700">{formatDate(review.createdAt)}</p>
            </div>
            {review.updatedAt && (
              <div>
                <p className="text-sm text-gray-500">마지막 수정일</p>
                <p className="text-gray-700">{formatDate(review.updatedAt)}</p>
              </div>
            )}
            {contentInfo && (
              <div>
                <p className="text-sm text-gray-500">콘텐츠</p>
                <div className="flex items-center">
                  {contentInfo.coverImage && (
                    <div className="w-10 h-14 bg-gray-200 mr-2 relative flex-shrink-0 overflow-hidden rounded">
                      <img 
                        src={contentInfo.coverImage} 
                        alt={contentInfo.title} 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{contentInfo.title}</p>
                    <p className="text-xs text-gray-500">
                      {contentInfo.category || (review.dramaId ? '드라마' : '영화')}
                      {contentInfo.releaseDate && ` (${contentInfo.releaseDate.substring(0, 4)})`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 폼 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* 작성자 정보 */}
              <div>
                <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 mb-1">
                  작성자 *
                </label>
                <input
                  type="text"
                  id="authorName"
                  name="authorName"
                  value={formData.authorName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              {/* 별점 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  별점 *
                </label>
                <div className="flex items-center space-x-4">
                  {renderRatingStars(formData.rating)}
                  <span className="text-lg font-bold ml-2">{formData.rating}/10</span>
                </div>
              </div>
              
              {/* 제목 */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              {/* 내용 */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  내용 *
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows="8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                ></textarea>
                <p className="mt-1 text-sm text-gray-500">
                  {formData.content.length}자
                </p>
              </div>
              
              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  태그
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <div 
                      key={index}
                      className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="태그 입력 후 추가"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    추가
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6">
                {/* 특별 속성 체크박스 - 추천 리뷰 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="featured"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm text-gray-700 flex items-center">
                    <Award className="w-5 h-5 text-yellow-500 mr-1" />
                    추천 리뷰로 설정
                  </label>
                </div>
                
                {/* 승인 상태 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="approved"
                    name="approved"
                    checked={formData.approved}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="approved" className="ml-2 block text-sm text-gray-700 flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-1" />
                    승인된 리뷰
                  </label>
                </div>
                
                {/* 스포일러 여부 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="spoiler"
                    name="spoiler"
                    checked={formData.spoiler}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="spoiler" className="ml-2 block text-sm text-gray-700 flex items-center">
                    <AlertTriangle className="w-5 h-5 text-orange-500 mr-1" />
                    스포일러 포함
                  </label>
                </div>
              </div>
              
              {/* 액션 버튼 */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => router.push('/admin/reviews')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 ${
                    submitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      변경사항 저장
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
} 