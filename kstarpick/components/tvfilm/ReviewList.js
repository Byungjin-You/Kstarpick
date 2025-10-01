import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FaStar, FaThumbsUp, FaEllipsisH, FaExclamationTriangle } from 'react-icons/fa';
import Link from 'next/link';
import ReviewForm from './ReviewForm';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const ReviewList = ({ tvfilmId, initialReviews = [], initialStats = {} }) => {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState(initialReviews);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialReviews.length >= 10);
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [sort, setSort] = useState('newest');
  
  useEffect(() => {
    setReviews(initialReviews);
    setStats(initialStats);
    setHasMore(initialReviews.length >= 10);
    setPage(1);
  }, [initialReviews, initialStats]);
  
  const loadMoreReviews = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/tvfilm/review?id=${tvfilmId}&page=${nextPage}&sort=${sort}`);
      
      if (!response.ok) {
        throw new Error('리뷰를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      if (data.reviews.length === 0) {
        setHasMore(false);
      } else {
        setReviews(prev => [...prev, ...data.reviews]);
        setPage(nextPage);
        setHasMore(data.reviews.length >= 10);
      }
    } catch (error) {
      console.error('Error loading more reviews:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSortChange = async (newSort) => {
    if (sort === newSort) return;
    
    setLoading(true);
    setSort(newSort);
    
    try {
      const response = await fetch(`/api/tvfilm/review?id=${tvfilmId}&page=1&sort=${newSort}`);
      
      if (!response.ok) {
        throw new Error('리뷰를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      setReviews(data.reviews);
      setPage(1);
      setHasMore(data.reviews.length >= 10);
    } catch (error) {
      console.error('Error sorting reviews:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReviewSubmit = (newReview) => {
    // For editing, replace the existing review
    if (editingReview) {
      setReviews(prev => 
        prev.map(review => 
          review._id === newReview._id ? newReview : review
        )
      );
      setEditingReview(null);
    } else {
      // For new reviews, add to the top of the list
      setReviews(prev => [newReview, ...prev]);
    }
    
    // Update stats with the data directly from the review response
    if (newReview.tvfilmStats) {
      setStats(prev => ({
        ...prev,
        reviewCount: editingReview ? prev.reviewCount : prev.reviewCount + 1,
        reviewRating: newReview.tvfilmStats.reviewRating,
        ratingDistribution: newReview.tvfilmStats.ratingDistribution
      }));
    }
    
    setShowForm(false);
  };
  
  const startEditReview = (review) => {
    setEditingReview(review);
    setShowForm(true);
  };
  
  const cancelForm = () => {
    setShowForm(false);
    setEditingReview(null);
  };
  
  // Check if the user has already reviewed this TVFilm
  const userReview = session?.user 
    ? reviews.find(review => review.author?._id === session.user?.id)
    : null;
  
  return (
    <div className="w-full">
      {/* Reviews Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">사용자 리뷰 ({stats.reviewCount || 0})</h2>
        
        <div className="flex space-x-2">
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
          >
            <option value="newest">최신순</option>
            <option value="highest">평점 높은순</option>
            <option value="lowest">평점 낮은순</option>
            <option value="helpful">추천순</option>
          </select>
          
          {!showForm && !userReview && session?.user && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              리뷰 작성하기
            </button>
          )}
        </div>
      </div>
      
      {/* Review Form */}
      {showForm && (
        <div className="mb-8">
          <ReviewForm 
            tvfilmId={tvfilmId} 
            onSuccess={handleReviewSubmit} 
            existingReview={editingReview}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={cancelForm}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
      
      {/* User's Review */}
      {!showForm && userReview && (
        <div className="mb-8 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-400">내가 작성한 리뷰</h3>
            <button
              onClick={() => startEditReview(userReview)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              수정하기
            </button>
          </div>
          <ReviewItem review={userReview} isUserReview={true} />
        </div>
      )}
      
      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews
            .filter(review => review.author?._id !== session?.user?.id) // Filter out user's own review
            .map(review => (
              <ReviewItem 
                key={review._id} 
                review={review} 
              />
            ))}
          
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMoreReviews}
                disabled={loading}
                className={`px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                  loading 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {loading ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            아직 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!
          </p>
          {!showForm && !userReview && session?.user && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              리뷰 작성하기
            </button>
          )}
          {!session?.user && (
            <Link href="/login">
              <a className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                로그인하고 리뷰 작성하기
              </a>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

const ReviewItem = ({ review, isUserReview = false }) => {
  const [showFullContent, setShowFullContent] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(review.likes || 0);
  
  const toggleContent = () => {
    setShowFullContent(!showFullContent);
  };
  
  const handleLike = async () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    
    try {
      await fetch(`/api/tvfilm/review/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewId: review._id }),
      });
    } catch (error) {
      // Revert UI changes if the API call fails
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);
      console.error('Error liking review:', error);
    }
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ko });
    } catch (error) {
      return dateString;
    }
  };
  
  const contentPreview = review.content.length > 300 && !showFullContent
    ? `${review.content.substring(0, 300)}...`
    : review.content;
    
  return (
    <div className={`p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${
      isUserReview ? 'border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
            <FaStar className="text-yellow-500 mr-1" />
            <span className="font-bold text-yellow-800 dark:text-yellow-400">{review.rating}</span>
          </div>
          <div className="ml-3">
            <h4 className="font-medium text-gray-900 dark:text-white">{review.author?.name || '알 수 없는 사용자'}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleLike}
            className={`flex items-center space-x-1 px-2 py-1 rounded ${
              isLiked 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <FaThumbsUp size={14} />
            <span className="text-xs">{likeCount}</span>
          </button>
          
          <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <FaEllipsisH size={14} />
          </button>
        </div>
      </div>
      
      {review.spoiler && (
        <div className="mb-3 flex items-center text-yellow-600 dark:text-yellow-500">
          <FaExclamationTriangle className="mr-1" />
          <span className="text-sm font-medium">이 리뷰에는 스포일러가 포함되어 있습니다</span>
        </div>
      )}
      
      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">{review.title}</h3>
      
      <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{contentPreview}</p>
      </div>
      
      {review.content.length > 300 && (
        <button 
          onClick={toggleContent}
          className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
        >
          {showFullContent ? '접기' : '더 보기'}
        </button>
      )}
    </div>
  );
};

export default ReviewList; 