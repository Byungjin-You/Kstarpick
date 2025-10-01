import React, { useState, useEffect } from 'react';
import { Star, Plus, Trash, Edit2, Save, X, ThumbsUp, ThumbsDown, MessageCircle, Tag, Flag, Award, Eye, Check, XCircle, Pencil } from 'lucide-react';

// 컴포넌트에 reviews 배열과 onChange 핸들러를 props로 전달
const ReviewsEditor = ({ reviews = [], onChange, tvfilmId, dramaId, readOnly = false }) => {
  // 모든 리뷰를 보여주는 상태
  const [reviewsList, setReviewsList] = useState([]);
  // 편집 모드 상태 (null: 편집 안함, 'new': 새 리뷰, 'edit': 기존 리뷰 편집)
  const [editMode, setEditMode] = useState(null);
  // 현재 편집 중인 리뷰
  const [editingId, setEditingId] = useState(null);
  // 필터 상태 ('all', 'user')
  const [reviewFilter, setReviewFilter] = useState('all');
  // 폼 데이터 상태
  const [formData, setFormData] = useState({
    authorName: '',
    title: '',
    content: '',
    rating: 5,
    date: new Date().toISOString(),
    tags: [],
    featured: false
  });
  // 에러 메시지 상태
  const [validationError, setValidationError] = useState(null);
  // 태그 입력을 위한 상태
  const [tagInput, setTagInput] = useState('');
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  // 마지막 업데이트 상태 추적용 ID
  const [lastChangeId, setLastChangeId] = useState(null);

  // 초기화
  useEffect(() => {
    if (reviews && Array.isArray(reviews)) {
      console.log('ReviewsEditor: 초기 리뷰 목록 설정:', reviews.length + '개');
      setReviewsList(reviews);
    } else {
      console.log('ReviewsEditor: 유효하지 않은 리뷰 데이터:', reviews);
      setReviewsList([]);
    }
  }, [reviews]);
  
  // 변경 사항이 있을 때 부모 컴포넌트에 알림
  // 성능 최적화: 200ms 디바운스 적용
  useEffect(() => {
    // 로딩 중에는 onChange 호출하지 않음
    if (isLoading) return;
    
    // 디바운스 적용 (200ms) - 리뷰 수가 많은 경우에도 안정적으로 작동하도록 개선
    const timeoutId = setTimeout(() => {
      if (onChange && Array.isArray(reviewsList)) {
        onChange(reviewsList);
      }
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [reviewsList, onChange, isLoading]);

  // 입력값 변경 핸들러
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : 
                    name === 'rating' ? parseInt(value, 10) : value;
    
    // 대표 리뷰 체크박스 로그 추가
    if (name === 'featured') {
      console.log(`대표 리뷰 설정 ${newValue ? '활성화' : '비활성화'} (리뷰 ID: ${formData._id || '새 리뷰'})`);
    }
    
    setFormData(prevData => ({
      ...prevData,
      [name]: newValue
    }));

    // 에러 메시지 초기화
    if (validationError && name) {
      setValidationError(null);
    }
  };

  // 리뷰 추가 전 유효성 검사 강화
  const validateReviewData = (data) => {
    const errors = [];
    
    // 제목 검증
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      errors.push('제목이 없거나 유효하지 않습니다');
    } else if (data.title.length > 100) {
      errors.push('제목은 100자 이내여야 합니다');
    }
    
    // 내용 검증
    if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
      errors.push('내용이 없거나 유효하지 않습니다');
    } else if (data.content.length > 5000) {
      errors.push('내용은 5000자 이내여야 합니다');
    }
    
    // 작성자 검증
    if (!data.authorName || typeof data.authorName !== 'string' || data.authorName.trim() === '') {
      errors.push('작성자 이름이 없거나 유효하지 않습니다');
    } else if (data.authorName.length > 50) {
      errors.push('작성자 이름은 50자 이내여야 합니다');
    }
    
    // 별점 검증
    const rating = parseInt(data.rating, 10);
    if (isNaN(rating) || rating < 1 || rating > 10) {
      errors.push('별점이 유효하지 않습니다 (1-10 사이 숫자여야 함)');
    }
    
    return errors;
  };

  // 리뷰 추가
  const handleAddReview = (e) => {
    e.preventDefault();
    
    // 읽기 전용일 경우 실행하지 않음
    if (readOnly) return;
    
    setIsLoading(true);
    setValidationError(null);

    // 강화된 유효성 검증 수행
    const validationErrors = validateReviewData(formData);
    if (validationErrors.length > 0) {
      setValidationError(validationErrors.join('\n'));
      setIsLoading(false);
      return;
    }

    // 임시 ID 생성 (더 안전한 방식)
    const randomId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // 새 리뷰 객체 생성
    const newReview = {
      ...formData,
      _id: randomId,
      tvfilmId: tvfilmId || dramaId || null,
      createdAt: formData.date || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 리뷰 목록에 추가 (안전하게 추가)
    setReviewsList(prev => {
      const newList = Array.isArray(prev) ? [...prev] : [];
      return [...newList, newReview];
    });
    
    // 폼 초기화
    setFormData({
      authorName: '',
      title: '',
      content: '',
      rating: 5,
      date: new Date().toISOString(),
      tags: [],
      featured: false
    });
    
    setValidationError(null);
    setEditMode(null);
    setIsLoading(false);
  };

  // 리뷰 삭제
  const handleDeleteReview = (id) => {
    // 읽기 전용일 경우 실행하지 않음
    if (readOnly || isLoading) return;
    
    if (!window.confirm('정말로 이 리뷰를 삭제하시겠습니까?')) return;
    
    setIsLoading(true);
    setReviewsList(prev => Array.isArray(prev) 
      ? prev.filter(review => review._id !== id) 
      : []);
    
    // 삭제하는 리뷰가 현재 편집 중이면 편집 모드 취소
    if (editingId === id) {
      setEditingId(null);
      setEditMode(null);
      setFormData({
        authorName: '',
        title: '',
        content: '',
        rating: 5,
        date: new Date().toISOString(),
        tags: [],
        featured: false
      });
    }
    setIsLoading(false);
  };

  // 리뷰 수정 모드 설정
  const handleEditStart = (review) => {
    if (isLoading || readOnly) return;
    
    setEditingId(review._id);
    setEditMode('edit');
    setFormData({
      authorName: review.authorName || '',
      title: review.title || '',
      content: review.content || '',
      rating: review.rating || 5,
      date: review.date || review.createdAt || new Date().toISOString(),
      tags: Array.isArray(review.tags) ? review.tags : [],
      featured: review.featured || false
    });
    setValidationError(null);
  };

  // 새 리뷰 추가 모드 설정
  const handleAddStart = () => {
    if (isLoading || readOnly) return;
    
    // 새 리뷰 폼 초기화
    setFormData({
      _id: `temp_${Date.now()}`, // 임시 ID 생성
      title: '',
      content: '',
      authorName: '',
      rating: 5,
      tags: [],
      featured: false, // 대표 리뷰 여부 명시적으로 false로 설정
      date: new Date()
    });
    setTagInput('');
    setEditMode('add');
    setEditingId(null);
  };

  // 리뷰 수정 적용 - 유효성 검사 강화
  const handleEditSubmit = (e) => {
    e.preventDefault();
    
    // 읽기 전용일 경우 실행하지 않음
    if (readOnly) return;
    
    setIsLoading(true);
    setValidationError(null);

    // 강화된 유효성 검증 수행
    const validationErrors = validateReviewData(formData);
    if (validationErrors.length > 0) {
      setValidationError(validationErrors.join('\n'));
      setIsLoading(false);
      return;
    }

    // 리뷰 업데이트
    setReviewsList(prev => {
      if (!Array.isArray(prev)) return []; 
      
      return prev.map(review => {
        if (review._id === editingId) {
          return { 
            ...formData, 
            _id: editingId,
            tvfilmId: tvfilmId || review.tvfilmId,
            updatedAt: new Date().toISOString()
          };
        }
        return review;
      });
    });

    // 수정 모드 종료
    setEditingId(null);
    setEditMode(null);
    setFormData({
      authorName: '',
      title: '',
      content: '',
      rating: 5,
      date: new Date().toISOString(),
      tags: [],
      featured: false
    });
    
    setValidationError(null);
    setIsLoading(false);
  };

  // 리뷰 수정 취소
  const handleCancelEdit = () => {
    if (isLoading) return;
    
    setEditingId(null);
    setEditMode(null);
    setFormData({
      authorName: '',
      title: '',
      content: '',
      rating: 5,
      date: new Date().toISOString(),
      tags: [],
      featured: false
    });
    setValidationError(null);
  };

  // 별점 렌더링
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 !== 0;
    
    // 꽉 찬 별
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }
    
    // 반쪽 별
    if (hasHalfStar) {
      stars.push(
        <span key="half" className="relative">
          <Star className="w-4 h-4 text-yellow-400" />
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 absolute top-0 left-0 overflow-hidden" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        </span>
      );
    }
    
    // 빈 별
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-yellow-400" />
      );
    }
    
    return (
      <div className="flex gap-1 items-center">
        {stars}
        <span className="ml-1 text-sm text-gray-600">({rating}/10)</span>
      </div>
    );
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '날짜 형식 오류';
      
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('날짜 형식 오류:', error);
      return '날짜 형식 오류';
    }
  };

  // 필터링된 리뷰 목록을 가져오는 함수
  const getFilteredReviews = () => {
    if (!Array.isArray(reviewsList)) return [];
    if (reviewFilter === 'all') return reviewsList;
    if (reviewFilter === 'user') return reviewsList;
    return reviewsList;
  };

  // 리뷰 목록 렌더링
  const renderReviewsList = () => {
    const filteredReviews = getFilteredReviews();
    
    if (!filteredReviews.length) {
      return (
        <div className="text-center py-8">
          <MessageCircle className="mx-auto h-10 w-10 text-gray-300 mb-2" />
          <p className="text-gray-500 mb-1">
            아직 리뷰가 없습니다
          </p>
          {!readOnly && (
            <p className="text-gray-400 text-sm">첫 번째 리뷰를 추가해보세요</p>
          )}
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <div 
            key={review._id} 
            className={`p-4 rounded-lg border ${editingId === review._id ? 'border-blue-400 bg-blue-50' : review.featured ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{review.title || '(제목 없음)'}</h3>
                  {review.featured && (
                    <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                      <Award className="w-3 h-3 mr-1" />
                      대표 리뷰
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {review.authorName || '익명'} - {formatDate(review.date || review.createdAt)}
                </p>
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditStart(review)}
                    className="p-1 text-blue-500 hover:text-blue-700"
                    title="수정"
                    disabled={isLoading}
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteReview(review._id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="삭제"
                    disabled={isLoading}
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-2">{renderStars(review.rating || 5)}</div>
            <p className="mt-2 text-gray-700">{review.content || '(내용 없음)'}</p>
            
            {/* 태그 있으면 표시 */}
            {review.tags && Array.isArray(review.tags) && review.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {review.tags.map((tag, index) => (
                  <span key={index} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 리뷰 편집 폼 렌더링
  const renderEditForm = () => {
    return (
      <div className="border border-gray-200 rounded-lg p-5 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800">
            {editMode === 'edit' ? '리뷰 편집' : '새 리뷰 추가'}
          </h3>
          <button 
            onClick={handleCancelEdit}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* 작성자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작성자 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="authorName"
              value={formData.authorName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500"
              placeholder="작성자 이름"
              disabled={isLoading}
              required
            />
          </div>
          
          {/* 별점 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              별점 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center">
              {[...Array(10)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleChange({ target: { name: 'rating', value: i + 1 } })}
                  className={`p-1 focus:outline-none ${
                    i < formData.rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <Star className="w-6 h-6" fill="currentColor" />
                </button>
              ))}
              <span className="ml-2 font-medium text-gray-700">
                {formData.rating}/10
              </span>
            </div>
          </div>
          
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              리뷰 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500"
              placeholder="리뷰 제목"
              disabled={isLoading}
              required
            />
          </div>
          
          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              리뷰 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-pink-500"
              placeholder="리뷰 내용을 작성하세요"
              disabled={isLoading}
              required
            ></textarea>
          </div>
          
          {/* 대표 리뷰 체크박스 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="featured"
              name="featured"
              checked={formData.featured || false}
              onChange={handleChange}
              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
              disabled={isLoading}
            />
            <label htmlFor="featured" className="ml-2 block text-sm font-medium text-gray-700">
              대표 리뷰로 설정 <span className="text-xs text-gray-500">(웹사이트 영화 카드에 표시됩니다)</span>
            </label>
          </div>
          
          {/* 태그 입력 폼 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              태그
            </label>
            <div className="flex">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-pink-500"
                placeholder="태그 입력 후 추가"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-gray-100 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
                disabled={isLoading}
              >
                추가
              </button>
            </div>
            
            {/* 태그 목록 표시 */}
            {formData.tags && Array.isArray(formData.tags) && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded flex items-center"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-gray-500 hover:text-red-500"
                      disabled={isLoading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {validationError && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-200">
              {validationError}
            </div>
          )}
          
          {/* 버튼 */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="button"
              onClick={editMode === 'edit' ? handleEditSubmit : handleAddReview}
              className={`px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">◌</span>
                  처리 중...
                </span>
              ) : editMode === 'edit' ? (
                <span className="flex items-center">
                  <Check className="w-4 h-4 mr-1" />
                  수정 완료
                </span>
              ) : (
                <span className="flex items-center">
                  <Plus className="w-4 h-4 mr-1" />
                  리뷰 추가
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 태그 추가 핸들러
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    
    // 이미 존재하는 태그인지 확인
    if (formData.tags && Array.isArray(formData.tags) && formData.tags.includes(tagInput.trim())) {
      return;
    }
    
    // 태그 추가
    setFormData(prev => ({
      ...prev,
      tags: [...(Array.isArray(prev.tags) ? prev.tags : []), tagInput.trim()]
    }));
    
    // 입력 필드 초기화
    setTagInput('');
  };

  // 태그 삭제 핸들러
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: Array.isArray(prev.tags) 
        ? prev.tags.filter(tag => tag !== tagToRemove)
        : []
    }));
  };

  return (
    <div className="space-y-4">
      {/* 헤더와 추가 버튼 */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {readOnly ? '리뷰 목록' : '리뷰 관리'}
          {reviewsList && reviewsList.length > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              ({reviewsList.length}개)
            </span>
          )}
        </h2>
        
        {!readOnly && !editMode && (
          <button
            type="button"
            onClick={handleAddStart}
            className="px-3 py-1.5 bg-pink-500 text-white rounded-md hover:bg-pink-600 flex items-center"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-1" />
            리뷰 추가
          </button>
        )}
      </div>
      
      {/* readOnly가 true일 때 편집 모드를 무시 */}
      {!readOnly && editMode ? renderEditForm() : renderReviewsList()}
    </div>
  );
};

export default ReviewsEditor; 