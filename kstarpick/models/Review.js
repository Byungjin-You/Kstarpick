/**
 * Review 모델
 * MyDramalist에서 크롤링한 리뷰를 저장하는 모델입니다.
 */

import mongoose from 'mongoose';

// 스키마가 이미 등록되어 있는지 확인
const ReviewSchema = new mongoose.Schema({
  reviewId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  userProfileUrl: String,
  userImage: String,
  rating: { type: Number, default: 0 },
  title: { type: String, required: true },
  reviewText: { type: String, required: true },
  reviewHtml: String,
  reviewDate: String,
  helpfulCount: { type: Number, default: 0 },
  dramaId: { type: String, required: true },
  sourceUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 모델 등록 (이미 등록되어 있지 않은 경우에만)
const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

export default Review; 