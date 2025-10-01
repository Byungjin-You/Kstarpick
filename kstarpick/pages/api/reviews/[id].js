import { connectToDatabase } from '../../../utils/mongodb';
import { getSession } from 'next-auth/react';
import { ObjectId } from 'mongodb';
import dbConnect from '../../../utils/mongodb';
import Review from '../../../models/Review';
import Drama from '../../../models/Drama';
import mongoose from 'mongoose';

/**
 * 특정 리뷰 API - 조회, 수정, 삭제
 */
export default async function handler(req, res) {
  const { id } = req.query;
  console.log(`[API] 리뷰 API 호출: ${req.method}, ID: ${id}`);
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: '리뷰 ID가 필요합니다.'
    });
  }
  
  await dbConnect();
  
  try {
    const { method } = req;
    
    // GET 요청 - 특정 리뷰 조회
    if (method === 'GET') {
      // 리뷰 ID로 조회
      const review = await Review.findById(id);
      
      if (!review) {
        return res.status(404).json({
          success: false,
          message: '리뷰를 찾을 수 없습니다.'
        });
      }
      
      console.log(`[API] 리뷰 조회 성공: ${id}`);
      
      return res.status(200).json({
        success: true,
        data: review
      });
    }
    
    // PUT 요청 - 리뷰 수정 (관리자만 가능)
    else if (method === 'PUT') {
      // 세션 확인 (권한 체크)
      const session = await getSession({ req });
      if (!session || session.user.role !== 'admin') {
        return res.status(401).json({
          success: false,
          message: '관리자만 리뷰를 수정할 수 있습니다.'
        });
      }
      
      const { reviewData } = req.body;
      
      if (!reviewData) {
        return res.status(400).json({
          success: false,
          message: '수정할 리뷰 데이터가 필요합니다.'
        });
      }
      
      // reviewId는 변경 불가
      delete reviewData.reviewId;
      
      // 리뷰 제목이 없으면 자동 생성
      if (reviewData.reviewText && !reviewData.title) {
        // 리뷰 내용의 첫 줄이나 첫 50자를 제목으로 사용
        const text = reviewData.reviewText;
        const firstLine = text.split('\n')[0].trim();
        reviewData.title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
      }
      
      // 수정 시간 업데이트
      reviewData.updatedAt = new Date();
      
      // 리뷰 수정
      const updatedReview = await Review.findByIdAndUpdate(id, reviewData, {
        new: true,
        runValidators: true,
      });
      
      if (!updatedReview) {
        return res.status(404).json({
          success: false,
          message: '리뷰를 찾을 수 없습니다.'
        });
      }
      
      // 리뷰가 수정되었고 dramaId가 있으면 해당 드라마의 통계 업데이트
      if (updatedReview.dramaId) {
        await updateDramaReviewStats(updatedReview.dramaId);
      }
      
      console.log(`[API] 리뷰 수정 성공: ${id}`);
      
      return res.status(200).json({
        success: true,
        message: '리뷰가 성공적으로 수정되었습니다.',
        data: updatedReview
      });
    }
    
    // DELETE 요청 - 리뷰 삭제 (관리자만 가능)
    else if (method === 'DELETE') {
      // 세션 확인 (권한 체크)
      const session = await getSession({ req });
      if (!session || session.user.role !== 'admin') {
        return res.status(401).json({
          success: false,
          message: '관리자만 리뷰를 삭제할 수 있습니다.'
        });
      }
      
      // 삭제 전 리뷰 정보 저장 (드라마 통계 업데이트를 위해)
      const reviewToDelete = await Review.findById(id);
      
      if (!reviewToDelete) {
        return res.status(404).json({
          success: false,
          message: '리뷰를 찾을 수 없습니다.'
        });
      }
      
      // 드라마 ID 저장
      const dramaId = reviewToDelete.dramaId;
      
      // 리뷰 삭제
      const deletedReview = await Review.findByIdAndDelete(id);
      
      // 드라마 통계 업데이트
      await updateDramaReviewStats(dramaId);
      
      console.log(`[API] 리뷰 삭제 성공: ${id}`);
      
      return res.status(200).json({
        success: true,
        message: '리뷰가 성공적으로 삭제되었습니다.',
        data: deletedReview
      });
    }
    
    // 허용되지 않는 메서드
    else {
      return res.status(405).json({
        success: false,
        message: `Method ${method} Not Allowed`
      });
    }
  } catch (error) {
    console.error('[API] 리뷰 API 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

/**
 * 드라마의 리뷰 통계 업데이트 함수
 */
async function updateDramaReviewStats(dramaId) {
  try {
    // 해당 드라마의 모든 리뷰 가져오기
    const reviews = await Review.find({ dramaId });
    const reviewCount = reviews.length;
    
    if (reviewCount === 0) {
      // 리뷰가 없는 경우 드라마 정보 업데이트
      await Drama.findByIdAndUpdate(dramaId, {
        reviewCount: 0,
        reviewRating: 0,
        ratingDistribution: Array(10).fill(0)
      });
      return;
    }
    
    // 평균 평점 계산
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
    
    // 평점 분포 계산 (1-10)
    const ratingDistribution = Array(10).fill(0);
    reviews.forEach(review => {
      if (review.rating > 0 && review.rating <= 10) {
        ratingDistribution[review.rating - 1]++;
        }
    });
    
    // 드라마 정보 업데이트
    await Drama.findByIdAndUpdate(dramaId, {
          reviewCount,
          reviewRating: averageRating,
          ratingDistribution
    });
    
    console.log(`[리뷰 API] 드라마(${dramaId}) 리뷰 통계 업데이트 완료: ${reviewCount}개 리뷰, 평균 ${averageRating.toFixed(1)}점`);
  } catch (error) {
    console.error('[리뷰 API] 드라마 리뷰 통계 업데이트 오류:', error);
  }
} 