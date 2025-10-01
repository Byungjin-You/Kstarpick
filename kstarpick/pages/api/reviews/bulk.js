/**
 * 여러 리뷰를 한 번에 데이터베이스에 저장하는 API 엔드포인트
 */

import { connectToDatabase } from '../../../utils/mongodb';
import { getSession } from 'next-auth/react';
import mongoose from 'mongoose';
import Review from '../../../models/Review';

export default async function handler(req, res) {
  // API 요청 시작 로그
  console.log('============== 리뷰 대량 저장 API 요청 시작 ==============');
  console.log('요청 메소드:', req.method);
  console.log('요청 시간:', new Date().toISOString());
  
  // POST 요청만 허용
  if (req.method !== 'POST') {
    console.log('허용되지 않는 메소드:', req.method);
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    // 인증 확인 (관리자만 접근 가능)
    if (process.env.NODE_ENV === 'production') { // 개발 환경에서는 인증 우회
      const session = await getSession({ req });
      if (!session || session.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
      }
    }

    // 요청 본문 확인
    const { reviews } = req.body;

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ success: false, message: '저장할 리뷰 데이터가 필요합니다.' });
    }

    console.log(`[리뷰 저장 API] ${reviews.length}개 리뷰 저장 요청 받음`);
    
    // 데이터베이스 연결
    await connectToDatabase();
    
    // Review 모델이 없는 경우 생성
    if (!mongoose.models.Review) {
      const reviewSchema = new mongoose.Schema({
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
      
      mongoose.model('Review', reviewSchema);
    }

    // 저장 결과를 추적하기 위한 변수
    const results = {
      savedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: []
    };

    // 리뷰 저장 (upsert)
    for (const review of reviews) {
      try {
        // 필수 필드 확인
        if (!review.reviewId || !review.title || !review.reviewText || !review.dramaId) {
          results.skippedCount++;
          results.errors.push(`필수 필드 누락: ${review.title || '제목 없음'}`);
          continue;
        }

        // 리뷰 저장
        const updateResult = await Review.updateOne(
          { reviewId: review.reviewId },
          { 
            $set: {
              ...review,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );

        // 저장 성공 카운트 증가
        if (updateResult.upserted || updateResult.modifiedCount > 0) {
          results.savedCount++;
        } else {
          results.skippedCount++;
        }
      } catch (error) {
        console.error('[리뷰 저장 API] 리뷰 저장 중 오류:', error);
        results.errorCount++;
        results.errors.push(`저장 오류: ${error.message}`);
      }
    }

    // 결과 로그
    console.log('[리뷰 저장 API] 저장 결과:', JSON.stringify(results, null, 2));

    // 성공 응답 반환
    return res.status(200).json({
      success: true,
      message: `${results.savedCount}개 리뷰를 성공적으로 저장했습니다.`,
      ...results
    });
    
  } catch (error) {
    console.error('[리뷰 저장 API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '리뷰 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
} 