import dbConnect from '../../../../lib/dbConnect';
import TVFilm from '../../../../models/TVFilm';
import Review from '../../../../models/Review';
import mongoose from 'mongoose';
import { getSession } from 'next-auth/react';

// 긴급 디버깅용 간소화된 API 핸들러
export default async function handler(req, res) {
  console.log('=== 리뷰 동기화 API 호출됨 ===');
  
  // 메서드 확인
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    // 요청 헤더 및 본문 로깅 (민감 정보는 제외)
    console.log('요청 헤더:', {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    });
    
    // 요청 데이터 확인
    const { tvfilmId, dramaId, reviews } = req.body;
    
    console.log('tvfilmId:', tvfilmId);
    console.log('dramaId:', dramaId);
    console.log('리뷰 개수:', Array.isArray(reviews) ? reviews.length : 'N/A');
    
    // 유효성 검사
    if (!tvfilmId && !dramaId) {
      return res.status(400).json({ success: false, message: 'TVFilm ID or Drama ID is required' });
    }
    
    // 사용할 ID 결정
    const contentId = tvfilmId || dramaId;
    
    if (!reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Reviews must be an array',
        receivedType: typeof reviews
      });
    }
    
    // 데이터베이스 연결
    console.log('데이터베이스에 연결 중...');
    await dbConnect();
    
    // 리뷰 처리 전 TVFilm 존재 여부 확인
    let tvfilm;
    try {
      tvfilm = await TVFilm.findById(contentId);
      if (!tvfilm) {
        return res.status(404).json({ success: false, message: 'TVFilm not found' });
      }
      console.log('TVFilm 확인됨:', tvfilm.title);
    } catch (findError) {
      console.error('TVFilm 조회 오류:', findError);
      return res.status(500).json({ success: false, message: `Error finding TVFilm: ${findError.message}` });
    }
    
    // 리뷰 처리 결과 추적
    const reviewResults = {
      added: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      errorMessages: []
    };
    
    try {
      // 1. 기존 리뷰 ID 목록 획득
      const existingReviews = await Review.find({ tvfilm: contentId });
      const existingReviewMap = new Map();
      existingReviews.forEach(review => {
        existingReviewMap.set(review._id.toString(), review);
      });
      
      // 새 리뷰 ID 추적을 위한 집합
      const newReviewIds = new Set();
      const batchSize = 20; // 배치 크기 설정
      
      // 리뷰 유효성 검사 함수
      const validateReview = (reviewData, index) => {
        const errors = [];
        
        // 제목 검증
        if (!reviewData.title || typeof reviewData.title !== 'string' || reviewData.title.trim() === '') {
          errors.push(`리뷰 #${index+1}: 제목이 없거나 유효하지 않습니다`);
        }
        
        // 내용 검증
        if (!reviewData.content || typeof reviewData.content !== 'string' || reviewData.content.trim() === '') {
          errors.push(`리뷰 #${index+1}: 내용이 없거나 유효하지 않습니다`);
        }
        
        // 작성자 검증
        if (!reviewData.authorName || typeof reviewData.authorName !== 'string' || reviewData.authorName.trim() === '') {
          errors.push(`리뷰 #${index+1}: 작성자 이름이 없거나 유효하지 않습니다`);
        }
        
        // 별점 검증
        const rating = parseInt(reviewData.rating, 10);
        if (isNaN(rating) || rating < 1 || rating > 10) {
          errors.push(`리뷰 #${index+1}: 별점이 유효하지 않습니다 (1-10 사이 숫자여야 함)`);
        }
        
        // 태그 검증
        if (reviewData.tags && !Array.isArray(reviewData.tags)) {
          errors.push(`리뷰 #${index+1}: 태그가 배열 형식이 아닙니다`);
        }
        
        return errors;
      };
      
      // 2. 리뷰를 배치로 처리하여 성능 개선
      for (let i = 0; i < reviews.length; i += batchSize) {
        const batch = reviews.slice(i, i + batchSize);
        const batchPromises = batch.map(async (reviewData, idx) => {
          try {
            const actualIndex = i + idx; // 전체 배열에서의 인덱스
            
            // 유효성 검사 진행
            const validationErrors = validateReview(reviewData, actualIndex);
            if (validationErrors.length > 0) {
              validationErrors.forEach(error => {
                reviewResults.errorMessages.push(error);
              });
              reviewResults.errors++;
              return null;
            }
            
            // 기존 로직 계속...
            // 임시 ID 확인 (temp_로 시작하면 새 리뷰)
            const isNewReview = !reviewData._id || reviewData._id.startsWith('temp_');
            
            const rating = parseInt(reviewData.rating, 10);
            
            if (isNewReview) {
              // 새 리뷰 추가
              const newReview = new Review({
                tvfilm: contentId,
                author: new mongoose.Types.ObjectId('000000000000000000000000'), // 수정: new 키워드 추가
                authorName: reviewData.authorName,
                rating: rating,
                title: reviewData.title,
                content: reviewData.content,
                tags: Array.isArray(reviewData.tags) ? reviewData.tags : [],
                isCritic: false,
                spoiler: false,
                featured: reviewData.featured === true || reviewData.featured === 'true',
                approved: true,
                createdAt: new Date(reviewData.date || reviewData.createdAt || Date.now()),
                updatedAt: new Date()
              });
              
              // 대표 리뷰 상태 로그 추가 (새 리뷰)
              if (reviewData.featured === true || reviewData.featured === 'true') {
                console.log(`새 리뷰 - 대표 리뷰로 설정됨 (작성자: ${reviewData.authorName})`);
              }
              
              try {
                const savedReview = await newReview.save();
                newReviewIds.add(savedReview._id.toString());
                reviewResults.added++;
                return savedReview;
              } catch (saveError) {
                reviewResults.errors++;
                reviewResults.errorMessages.push(`리뷰 #${actualIndex+1} 저장 실패: ${saveError.message}`);
                return null;
              }
            } else {
              // 기존 리뷰 수정
              const reviewId = reviewData._id;
              
              // 이미 존재하는 ID인지 확인
              if (existingReviewMap.has(reviewId)) {
                try {
                  const updateResult = await Review.findByIdAndUpdate(
                    reviewId,
                    {
                      authorName: reviewData.authorName,
                      rating: rating,
                      title: reviewData.title,
                      content: reviewData.content,
                      tags: Array.isArray(reviewData.tags) ? reviewData.tags : [],
                      featured: reviewData.featured === true || reviewData.featured === 'true',
                      updatedAt: new Date()
                    },
                    { new: true }
                  );
                  
                  // 대표 리뷰 상태 로그 추가
                  if (reviewData.featured === true || reviewData.featured === 'true') {
                    console.log(`리뷰 ID ${reviewId} - 대표 리뷰로 설정됨`);
                  }
                  
                  newReviewIds.add(reviewId);
                  reviewResults.updated++;
                  return updateResult;
                } catch (updateError) {
                  reviewResults.errors++;
                  reviewResults.errorMessages.push(`리뷰 #${actualIndex+1} (ID: ${reviewId}) 업데이트 실패: ${updateError.message}`);
                  return null;
                }
              } else {
                // ID가 유효하지 않으면 새 리뷰로 처리
                try {
                  const newReview = new Review({
                    tvfilm: contentId,
                    author: new mongoose.Types.ObjectId('000000000000000000000000'), // 수정: new 키워드 추가
                    authorName: reviewData.authorName,
                    rating: rating,
                    title: reviewData.title,
                    content: reviewData.content,
                    tags: Array.isArray(reviewData.tags) ? reviewData.tags : [],
                    isCritic: false,
                    spoiler: false,
                    featured: reviewData.featured === true || reviewData.featured === 'true',
                    approved: true,
                    createdAt: new Date(reviewData.date || reviewData.createdAt || Date.now()),
                    updatedAt: new Date()
                  });
                  
                  // 대표 리뷰 상태 로그 추가 (ID 유효하지 않지만 대표 리뷰로 설정됐을 경우)
                  if (reviewData.featured === true || reviewData.featured === 'true') {
                    console.log(`유효하지 않은 ID ${reviewId}의 리뷰 - 새로 생성하여 대표 리뷰로 설정됨`);
                  }
                  
                  const savedReview = await newReview.save();
                  newReviewIds.add(savedReview._id.toString());
                  reviewResults.added++;
                  return savedReview;
                } catch (saveError) {
                  reviewResults.errors++;
                  reviewResults.errorMessages.push(`리뷰 #${actualIndex+1} (ID: ${reviewId}) 존재하지 않아 새로 저장 시도 중 실패: ${saveError.message}`);
                  return null;
                }
              }
            }
          } catch (reviewError) {
            console.error('리뷰 처리 오류:', reviewError);
            reviewResults.errors++;
            reviewResults.errorMessages.push(`리뷰 #${i+idx+1} 처리 중 예상치 못한 오류: ${reviewError.message}`);
            return null;
          }
        });
        
        // 배치 처리 완료 대기
        await Promise.all(batchPromises);
      }
      
      // 3. 삭제할 리뷰 처리 (현재 리뷰 목록에 없는 기존 리뷰)
      const reviewsToDelete = [...existingReviewMap.keys()].filter(id => !newReviewIds.has(id));
      
      if (reviewsToDelete.length > 0) {
        // 배치 처리로 변경
        const deleteResult = await Review.deleteMany({ 
          _id: { $in: reviewsToDelete.map(id => new mongoose.Types.ObjectId(id)) } // 수정: new 키워드 추가
        });
        
        reviewResults.deleted = deleteResult.deletedCount;
        console.log(`${deleteResult.deletedCount}개 리뷰 삭제됨`);
      }
      
      // 4. TVFilm 리뷰 통계 업데이트
      const allReviews = await Review.find({ tvfilm: contentId });
      const reviewCount = allReviews.length;
      
      // 평균 별점 계산
      let reviewRating = 0;
      const ratingDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      
      if (reviewCount > 0) {
        // 별점 합계 계산
        const ratingSum = allReviews.reduce((sum, review) => {
          const rating = parseInt(review.rating, 10);
          return sum + (isNaN(rating) ? 0 : rating);
        }, 0);
        
        reviewRating = parseFloat((ratingSum / reviewCount).toFixed(1));
        
        // 별점 분포 계산
        allReviews.forEach(review => {
          const rating = parseInt(review.rating, 10);
          if (!isNaN(rating) && rating >= 1 && rating <= 10) {
            const index = Math.min(Math.max(Math.floor(rating) - 1, 0), 9);
            ratingDistribution[index]++;
          }
        });
      }
      
      // TVFilm 업데이트
      await TVFilm.findByIdAndUpdate(
        contentId, 
        {
          reviewCount,
          reviewRating,
          ratingDistribution
        }
      );
      
      console.log('리뷰 처리 완료');
    } catch (processError) {
      console.error('리뷰 처리 중 오류:', processError);
      throw processError;
    }
    
    // 성공 응답
    return res.status(200).json({
      success: true,
      message: '리뷰 처리 완료',
      data: {
        processed: reviews.length,
        added: reviewResults.added,
        updated: reviewResults.updated,
        deleted: reviewResults.deleted,
        errors: reviewResults.errors,
        errorDetails: reviewResults.errorMessages.length > 0 ? reviewResults.errorMessages : undefined
      }
    });
  } catch (error) {
    // 오류 처리
    console.error('리뷰 동기화 중 오류 발생:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error synchronizing reviews'
    });
  }
} 