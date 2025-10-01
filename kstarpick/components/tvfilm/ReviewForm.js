import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FaStar, FaExclamationTriangle } from 'react-icons/fa';

const ReviewForm = ({ tvfilmId, onSuccess, existingReview = null }) => {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  
  const [formData, setFormData] = useState({
    rating: existingReview?.rating || 8,
    title: existingReview?.title || '',
    content: existingReview?.content || '',
    spoiler: existingReview?.spoiler || false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [isEditing, setIsEditing] = useState(!!existingReview);
  
  // Rating descriptions to provide feedback to users
  const ratingTexts = {
    1: '최악이에요',
    2: '싫어요',
    3: '매우 나빠요',
    4: '나빠요',
    5: '별로예요',
    6: '보통이에요',
    7: '괜찮아요',
    8: '좋아요',
    9: '매우 좋아요',
    10: '최고예요!'
  };
  
  useEffect(() => {
    if (existingReview) {
      setFormData({
        rating: existingReview.rating,
        title: existingReview.title,
        content: existingReview.content,
        spoiler: existingReview.spoiler
      });
      setIsEditing(true);
    }
  }, [existingReview]);
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.rating || formData.rating < 1 || formData.rating > 10) {
      errors.rating = '1부터 10까지의 평점을 선택해주세요';
    }
    
    if (!formData.title.trim()) {
      errors.title = '리뷰 제목을 입력해주세요';
    } else if (formData.title.length > 100) {
      errors.title = '제목은 100자 이내로 작성해주세요';
    }
    
    if (!formData.content.trim()) {
      errors.content = '리뷰 내용을 입력해주세요';
    } else if (formData.content.length < 10) {
      errors.content = '리뷰는 최소 10자 이상 작성해주세요';
    } else if (formData.content.length > 2000) {
      errors.content = '리뷰는, 2,000자 이내로 작성해주세요';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear validation error when field is edited
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const handleRatingClick = (rating) => {
    setFormData(prev => ({ ...prev, rating }));
    
    // Clear validation error when rating is changed
    if (validationErrors.rating) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.rating;
        return newErrors;
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('리뷰를 작성하려면 로그인이 필요합니다.');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const url = '/api/tvfilm/review';
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing 
        ? { 
            reviewId: existingReview._id, 
            ...formData 
          }
        : { 
            id: tvfilmId, 
            ...formData 
          };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '리뷰 제출 중 오류가 발생했습니다.');
      }
      
      toast.success(isEditing ? '리뷰가 수정되었습니다!' : '리뷰가 등록되었습니다!');
      
      if (onSuccess) {
        onSuccess(result.data);
      }
      
      if (!isEditing) {
        // Reset form if not editing
        setFormData({
          rating: 8,
          title: '',
          content: '',
          spoiler: false
        });
      }
    } catch (error) {
      console.error('Review submission error:', error);
      toast.error(error.message || '리뷰 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">리뷰 작성하기</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">로그인하고 이 작품에 대한 리뷰를 남겨보세요.</p>
        <Link href="/login">
          <a className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
            로그인하기
          </a>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
        {isEditing ? '리뷰 수정하기' : '리뷰 작성하기'}
      </h3>
      
      <form onSubmit={handleSubmit}>
        {/* Rating selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            평점
          </label>
          <div className="flex items-center">
            <div className="flex items-center mr-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <div 
                  key={num}
                  className="cursor-pointer p-1"
                  onClick={() => handleRatingClick(num)}
                  onMouseEnter={() => setHoveredRating(num)}
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  <FaStar 
                    className={`text-xl ${
                      (hoveredRating || formData.rating) >= num 
                        ? 'text-yellow-400' 
                        : 'text-gray-300 dark:text-gray-600'
                    }`} 
                  />
                </div>
              ))}
            </div>
            
            <div className="text-sm font-medium ml-2 text-gray-700 dark:text-gray-300 min-w-[80px]">
              {hoveredRating > 0 
                ? ratingTexts[hoveredRating] 
                : formData.rating > 0 ? ratingTexts[formData.rating] : '선택하세요'}
            </div>
          </div>
          {validationErrors.rating && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.rating}</p>
          )}
        </div>
        
        {/* Title */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            제목
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`w-full px-3 py-2 border ${validationErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md dark:bg-gray-700 dark:text-white`}
            placeholder="리뷰 제목을 입력하세요"
          />
          {validationErrors.title && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
          )}
        </div>
        
        {/* Content */}
        <div className="mb-4">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            내용
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows="5"
            className={`w-full px-3 py-2 border ${validationErrors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md dark:bg-gray-700 dark:text-white`}
            placeholder="이 작품에 대한 생각을 자유롭게 작성해주세요"
          ></textarea>
          {validationErrors.content && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.content}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formData.content.length}/2000자
          </p>
        </div>
        
        {/* Spoiler Warning */}
        <div className="mb-6 flex items-center">
          <input
            type="checkbox"
            id="spoiler"
            name="spoiler"
            checked={formData.spoiler}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="spoiler" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            <span className="flex items-center">
              <FaExclamationTriangle className="text-yellow-500 mr-1" />
              이 리뷰에는 스포일러가 포함되어 있습니다
            </span>
          </label>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting 
              ? '처리 중...' 
              : isEditing 
                ? '리뷰 수정하기' 
                : '리뷰 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm; 