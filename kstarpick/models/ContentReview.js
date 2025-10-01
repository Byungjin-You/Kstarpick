import mongoose from 'mongoose';

const ContentReviewSchema = new mongoose.Schema({
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: [true, 'Content ID is required']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  authorName: {
    type: String,
    required: [true, 'Author name is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [10, 'Rating cannot be more than 10']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    maxlength: [200, 'Review title cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Review content is required'],
    maxlength: [5000, 'Review content cannot be more than 5000 characters']
  },
  isCritic: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  spoiler: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  approved: {
    type: Boolean,
    default: true
  },
  reportCount: {
    type: Number,
    default: 0
  },
  tags: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 인덱스 생성
ContentReviewSchema.index({ content: 1, author: 1 }, { unique: true }); // 중복 리뷰 방지
ContentReviewSchema.index({ content: 1, featured: 1 }); // 대표 리뷰 쿼리 최적화
ContentReviewSchema.index({ content: 1, createdAt: -1 }); // 최신순 정렬
ContentReviewSchema.index({ author: 1, createdAt: -1 }); // 사용자별 리뷰 조회
ContentReviewSchema.index({ approved: 1 }); // 승인 여부 필터링
ContentReviewSchema.index({ isCritic: 1 }); // 평론가 리뷰 필터링

export default mongoose.models.ContentReview || mongoose.model('ContentReview', ContentReviewSchema); 