import { connectToDatabase } from '../../../utils/mongodb';
import { getSession } from 'next-auth/react';

/**
 * 리뷰 API - 리뷰 목록 조회 및 생성
 */
export default async function handler(req, res) {
  console.log(`[API] 리뷰 API 호출: ${req.method}`);
  
  try {
    const { db } = await connectToDatabase();
    const { method } = req;
    
    // GET 요청 - 리뷰 목록 조회
    if (method === 'GET') {
      // 쿼리 파라미터 추출
      const { 
        dramaId, 
        username,
        rating, 
        limit = 10, 
        page = 1, 
        sort = 'createdAt',
        order = 'desc' 
      } = req.query;
      
      // 페이지네이션 설정
      const pageSize = parseInt(limit);
      const skip = (parseInt(page) - 1) * pageSize;
      
      // 정렬 설정
      const sortDirection = order === 'desc' ? -1 : 1;
      const sortOptions = { [sort]: sortDirection };
      
      // 쿼리 필터 구성
      const query = {};
      
      // 필터: 드라마 ID
      if (dramaId) {
        query.dramaId = dramaId;
      }
      
      // 필터: 작성자 이름
      if (username) {
        query.username = username;
      }
      
      // 필터: 평점
      if (rating) {
        const ratingValue = parseInt(rating);
        if (!isNaN(ratingValue)) {
          // 정확한 평점 또는 평점 범위(예: 7-10) 검색 지원
          if (rating.includes('-')) {
            const [minRating, maxRating] = rating.split('-').map(r => parseInt(r));
            if (!isNaN(minRating) && !isNaN(maxRating)) {
              query.rating = { $gte: minRating, $lte: maxRating };
            }
          } else {
            query.rating = ratingValue;
          }
        }
      }
      
      console.log(`[API] 리뷰 조회 쿼리:`, query);
      
      // 총 리뷰 개수 조회
      const total = await db.collection('reviews').countDocuments(query);
      
      // 리뷰 데이터 조회
      const reviews = await db.collection('reviews')
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)
        .toArray();
      
      console.log(`[API] ${reviews.length}개 리뷰 조회됨`);
      
      // 응답 전송
      return res.status(200).json({
        success: true,
        data: reviews,
        pagination: {
          page: parseInt(page),
          limit: pageSize,
          total,
          pages: Math.ceil(total / pageSize)
        }
      });
    }
    
    // POST 요청 - 리뷰 생성 (관리자만 가능)
    else if (method === 'POST') {
      // 세션 확인 (권한 체크)
      const session = await getSession({ req });
      if (!session || session.user.role !== 'admin') {
        return res.status(401).json({
          success: false,
          message: '관리자만 리뷰를 생성할 수 있습니다.'
        });
      }
      
      const { reviewData } = req.body;
      
      if (!reviewData) {
        return res.status(400).json({
          success: false,
          message: '리뷰 데이터가 필요합니다.'
        });
      }
      
      // 필수 필드 확인
      if (!reviewData.dramaId || !reviewData.username || !reviewData.reviewText) {
        return res.status(400).json({
          success: false,
          message: '드라마 ID, 작성자 이름, 리뷰 내용은 필수입니다.'
        });
      }
      
      // 리뷰 제목이 없으면 자동 생성
      if (!reviewData.title) {
        // 리뷰 내용의 첫 줄이나 첫 50자를 제목으로 사용
        const text = reviewData.reviewText || '';
        const firstLine = text.split('\n')[0].trim();
        reviewData.title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
        
        // 내용이 없는 경우
        if (!reviewData.title) {
          reviewData.title = `${reviewData.username}의 리뷰`;
        }
      }
      
      // 고유 리뷰 ID 생성 (수동 생성한 경우)
      if (!reviewData.reviewId) {
        reviewData.reviewId = `manual-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      }
      
      // 타임스탬프 추가
      reviewData.createdAt = new Date();
      reviewData.crawledAt = new Date();
      
      // 리뷰 저장
      const result = await db.collection('reviews').insertOne(reviewData);
      
      // 드라마의 리뷰 통계 업데이트
      await updateDramaReviewStats(db, reviewData.dramaId);
      
      console.log(`[API] 리뷰 생성 성공: ${result.insertedId}`);
      
      return res.status(201).json({
        success: true,
        message: '리뷰가 성공적으로 생성되었습니다.',
        data: { 
          ...reviewData,
          _id: result.insertedId
        }
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
async function updateDramaReviewStats(db, dramaId) {
  try {
    // 해당 드라마의 모든 리뷰 조회
    const allReviews = await db.collection('reviews').find({ dramaId }).toArray();
    const reviewCount = allReviews.length;
    
    // 평균 평점 계산
    let totalRating = 0;
    let ratingCount = 0;
    for (const review of allReviews) {
      if (review.rating && review.rating > 0) {
        totalRating += review.rating;
        ratingCount++;
      }
    }
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    
    // 평점 분포 계산 (1-10점)
    const ratingDistribution = Array(10).fill(0);
    for (const review of allReviews) {
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
          reviewRating: averageRating,
          ratingDistribution
        } 
      }
    );
    
    console.log(`[API] 드라마 리뷰 통계 업데이트 완료: 리뷰 ${reviewCount}개, 평균 평점 ${averageRating.toFixed(1)}`);
    return true;
  } catch (error) {
    console.error('[API] 드라마 리뷰 통계 업데이트 오류:', error);
    return false;
  }
} 