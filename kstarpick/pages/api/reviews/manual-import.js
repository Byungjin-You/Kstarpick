import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';

// 개발 환경 확인 (process.env.NODE_ENV가 'development'인 경우 true)
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 수동 리뷰 등록 API
 * MyDramalist 사이트에서 직접 리뷰를 복사하여 등록할 수 있는 기능 제공
 */
export default async function handler(req, res) {
  try {
    // 개발 환경이 아닌 경우에만 인증 확인
    if (!isDevelopment) {
      // 관리자 인증 확인
      const session = await getSession({ req });
      if (!session || session.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' });
      }
    }
    
    if (req.method === 'POST') {
      // 리뷰 등록 처리
      return await addReview(req, res);
    } else if (req.method === 'GET') {
      // 드라마에 등록된 리뷰 목록 가져오기
      return await getReviews(req, res);
    } else if (req.method === 'DELETE') {
      // 리뷰 삭제
      return await deleteReview(req, res);
    } else {
      return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
    }
  } catch (error) {
    console.error('리뷰 관리 API 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
  }
}

/**
 * 새로운 리뷰 추가 또는 기존 리뷰 수정
 */
async function addReview(req, res) {
  try {
    const { db } = await connectToDatabase();
    
    // 요청 본문 확인
    const {
      dramaId,
      username,
      userProfileUrl,
      userImage,
      status = 'Completed',
      rating,
      storyRating = 0,
      actingRating = 0,
      musicRating = 0,
      rewatchRating = 0,
      title,
      reviewText,
      reviewId
    } = req.body;
    
    // 필수 필드 검증
    if (!dramaId || !username || !title || !reviewText) {
      return res.status(400).json({ 
        success: false, 
        message: '드라마 ID, 사용자 이름, 제목, 리뷰 내용은 필수 항목입니다.' 
      });
    }
    
    if (!rating || isNaN(rating) || rating < 0 || rating > 10) {
      return res.status(400).json({ 
        success: false, 
        message: '평점은 0에서 10 사이의 숫자여야 합니다.' 
      });
    }
    
    // 드라마 존재 여부 확인
    console.log(`[수동 리뷰 관리] 드라마 ID: ${dramaId} 조회 시도`);
    
    let drama = null;
    
    // 먼저 문자열 ID로 시도
    console.log('[수동 리뷰 관리] 문자열 ID로 조회 시도');
    drama = await db.collection('dramas').findOne({ _id: dramaId });
    
    // 찾지 못했다면 ObjectId로 시도
    if (!drama && ObjectId.isValid(dramaId)) {
      console.log('[수동 리뷰 관리] ObjectId로 조회 시도');
      drama = await db.collection('dramas').findOne({ _id: new ObjectId(dramaId) });
    }
    
    // 그래도 찾지 못했다면 다른 필드로 시도
    if (!drama) {
      console.log('[수동 리뷰 관리] 다른 필드로 조회 시도');
      drama = await db.collection('dramas').findOne({ 
        $or: [
          { id: dramaId },
          { mdlId: dramaId }
        ]
      });
    }
    
    // 드라마 검색 결과 처리
    if (!drama) {
      console.log(`[수동 리뷰 관리] 드라마를 찾을 수 없음: ${dramaId}`);
      
      // 데이터베이스의 드라마 샘플 확인
      const allDramas = await db.collection('dramas').find({}).limit(3).toArray();
      console.log('[수동 리뷰 관리] 데이터베이스 드라마 샘플:'); 
      for (const d of allDramas) {
        console.log(`- ID: ${d._id}, 제목: ${d.title}, mdlId: ${d.mdlId}`);
      }
      
      return res.status(404).json({ success: false, message: '드라마를 찾을 수 없습니다.' });
    }
    
    console.log(`[수동 리뷰 관리] 드라마 찾음: ID=${drama._id}, 제목=${drama.title}`);
    
    // 리뷰 객체 생성
    const review = {
      reviewId: reviewId || `manual-${Date.now()}`,
      dramaId,
      username,
      userProfileUrl: userProfileUrl || '',
      userImage: userImage || '',
      status,
      watchedEpisodes: 0,
      totalEpisodes: 0,
      createdAt: new Date(),
      rating: parseFloat(rating),
      storyRating: parseFloat(storyRating) || 0,
      actingRating: parseFloat(actingRating) || 0,
      musicRating: parseFloat(musicRating) || 0,
      rewatchRating: parseFloat(rewatchRating) || 0,
      title,
      reviewText,
      reviewHtml: '',
      helpfulCount: 0,
      commentCount: 0,
      reviewUrl: '',
      isManualImport: true,
      updatedAt: new Date()
    };
    
    // 이미 존재하는 리뷰인지 확인
    const existingReview = await db.collection('reviews').findOne({ reviewId: review.reviewId });
    
    if (existingReview) {
      // 기존 리뷰 업데이트
      await db.collection('reviews').updateOne(
        { reviewId: review.reviewId },
        { $set: review }
      );
      
      console.log(`[수동 리뷰 관리] 리뷰 업데이트: ${review.reviewId}, 드라마: ${dramaId}`);
      
      await updateDramaReviewStats(db, dramaId);
      
      return res.status(200).json({
        success: true,
        message: '리뷰가 업데이트되었습니다.',
        review
      });
    } else {
      // 새 리뷰 추가
      await db.collection('reviews').insertOne(review);
      
      console.log(`[수동 리뷰 관리] 새 리뷰 추가: ${review.reviewId}, 드라마: ${dramaId}`);
      
      await updateDramaReviewStats(db, dramaId);
      
      return res.status(201).json({
        success: true,
        message: '새 리뷰가 추가되었습니다.',
        review
      });
    }
  } catch (error) {
    console.error('[수동 리뷰 관리] 리뷰 추가 오류:', error);
    return res.status(500).json({ success: false, message: '리뷰 추가 중 오류가 발생했습니다.', error: error.message });
  }
}

/**
 * 드라마에 등록된 리뷰 목록 가져오기
 */
async function getReviews(req, res) {
  try {
    const { db } = await connectToDatabase();
    const { dramaId } = req.query;
    
    if (!dramaId) {
      return res.status(400).json({ success: false, message: '드라마 ID가 필요합니다.' });
    }
    
    // 드라마 존재 여부 확인
    const drama = await db.collection('dramas').findOne({ _id: dramaId });
    if (!drama) {
      return res.status(404).json({ success: false, message: '드라마를 찾을 수 없습니다.' });
    }
    
    // 리뷰 조회
    const reviews = await db.collection('reviews')
      .find({ dramaId })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`[수동 리뷰 관리] 드라마 ${dramaId}의 리뷰 ${reviews.length}개 조회됨`);
    
    return res.status(200).json({
      success: true,
      message: `${reviews.length}개 리뷰를 가져왔습니다.`,
      data: reviews
    });
  } catch (error) {
    console.error('[수동 리뷰 관리] 리뷰 조회 오류:', error);
    return res.status(500).json({ success: false, message: '리뷰 조회 중 오류가 발생했습니다.', error: error.message });
  }
}

/**
 * 리뷰 삭제
 */
async function deleteReview(req, res) {
  try {
    const { db } = await connectToDatabase();
    const { reviewId, dramaId } = req.query;
    
    if (!reviewId) {
      return res.status(400).json({ success: false, message: '리뷰 ID가 필요합니다.' });
    }
    
    // 리뷰 삭제
    const result = await db.collection('reviews').deleteOne({ reviewId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: '삭제할 리뷰를 찾을 수 없습니다.' });
    }
    
    console.log(`[수동 리뷰 관리] 리뷰 삭제: ${reviewId}`);
    
    // 드라마 정보 업데이트
    if (dramaId) {
      await updateDramaReviewStats(db, dramaId);
    }
    
    return res.status(200).json({
      success: true,
      message: '리뷰가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('[수동 리뷰 관리] 리뷰 삭제 오류:', error);
    return res.status(500).json({ success: false, message: '리뷰 삭제 중 오류가 발생했습니다.', error: error.message });
  }
}

/**
 * 드라마의 리뷰 통계 업데이트
 */
async function updateDramaReviewStats(db, dramaId) {
  try {
    // 드라마에 등록된 모든 리뷰 조회
    const reviews = await db.collection('reviews').find({ dramaId }).toArray();
    
    // 리뷰 수
    const reviewCount = reviews.length;
    
    // 평균 평점 계산
    let totalRating = 0;
    let ratingCount = 0;
    
    for (const review of reviews) {
      if (review.rating && review.rating > 0) {
        totalRating += review.rating;
        ratingCount++;
      }
    }
    
    const reviewRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    
    // 평점 분포 계산
    const ratingDistribution = Array(10).fill(0);
    for (const review of reviews) {
      if (review.rating && review.rating > 0 && review.rating <= 10) {
        const ratingIndex = Math.floor(review.rating) - 1;
        if (ratingIndex >= 0 && ratingIndex < 10) {
          ratingDistribution[ratingIndex]++;
        }
      }
    }
    
    // 드라마 정보 업데이트
    await db.collection('dramas').updateOne(
      { _id: dramaId },
      { 
        $set: { 
          reviewCount,
          reviewRating,
          ratingDistribution,
          lastUpdated: new Date()
        } 
      }
    );
    
    console.log(`[수동 리뷰 관리] 드라마 ${dramaId} 통계 업데이트: 리뷰 ${reviewCount}개, 평점 ${reviewRating.toFixed(1)}`);
  } catch (error) {
    console.error('[수동 리뷰 관리] 드라마 통계 업데이트 오류:', error);
    throw error;
  }
} 