import dbConnect from '../../../../lib/dbConnect';
import Review from '../../../../models/Review';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

/**
 * @swagger
 * /api/reviews/by-drama/{id}:
 *   get:
 *     description: 특정 드라마의 리뷰 목록을 가져옵니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 드라마 ID
 *     responses:
 *       200:
 *         description: 리뷰 목록 반환 성공
 *       404:
 *         description: 리뷰를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
export default async function handler(req, res) {
  const { id } = req.query;
  const { method } = req;

  if (!id) {
    return res.status(400).json({ success: false, message: '드라마 ID가 필요합니다.' });
  }

  try {
    // 데이터베이스 연결 시도
    console.log(`[API] 드라마 ID: ${id}에 대한 리뷰 조회 시작`);
    
    // 연결 시도 (최대 3회)
    let connectionAttempts = 0;
    let db = null;
    
    while (connectionAttempts < 3 && !db) {
      try {
        connectionAttempts++;
        console.log(`[API] MongoDB 연결 시도 (${connectionAttempts}/3)...`);
        db = await dbConnect();
      } catch (connError) {
        console.error(`[API] MongoDB 연결 실패 (시도 ${connectionAttempts}/3):`, connError);
        
        if (connectionAttempts < 3) {
          console.log('[API] 3초 후 재시도...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          throw new Error(`MongoDB 연결 실패 (최대 시도 횟수 초과): ${connError.message}`);
        }
      }
    }
    
    // 연결 상태 확인
    if (mongoose.connection.readyState !== 1) {
      throw new Error(`MongoDB 연결 실패: 현재 상태 = ${mongoose.connection.readyState} (1=연결됨, 0=끊김, 2=연결중, 3=연결해제중)`);
    }
    
    switch (method) {
      case 'GET':
        try {
          // 여러 방식으로 리뷰 조회 시도
          let allReviews = [];
          
          // 1. 문자열 ID로 시도
          console.log(`[API] 리뷰 조회 시도 1: 문자열 ID (${id})`);
          try {
            const stringIdReviews = await Review.find({ dramaId: id })
              .sort({ createdAt: -1 })
              .limit(100);
            
            if (stringIdReviews && stringIdReviews.length > 0) {
              console.log(`[API] 문자열 ID로 ${stringIdReviews.length}개 리뷰 찾음`);
              allReviews = [...stringIdReviews];
            }
          } catch (error) {
            console.error(`[API] 문자열 ID로 리뷰 조회 중 오류:`, error);
            
            // 연결 오류 시 다시 시도
            if (error.name === 'MongoNotConnectedError' || error.message.includes('disconnected')) {
              try {
                console.log('[API] MongoDB 연결 재시도...');
                await dbConnect();
                
                // 연결 상태 다시 확인
                if (mongoose.connection.readyState !== 1) {
                  throw new Error(`MongoDB 재연결 실패: 현재 상태 = ${mongoose.connection.readyState}`);
                }
                
                const retryStringIdReviews = await Review.find({ dramaId: id })
                  .sort({ createdAt: -1 })
                  .limit(100);
                
                if (retryStringIdReviews && retryStringIdReviews.length > 0) {
                  console.log(`[API] 재시도 후 문자열 ID로 ${retryStringIdReviews.length}개 리뷰 찾음`);
                  allReviews = [...retryStringIdReviews];
                }
              } catch (retryErr) {
                console.error(`[API] 문자열 ID 재시도 중 오류:`, retryErr);
                // 에러 발생해도 계속 진행 (ObjectId로 시도)
              }
            }
          }
          
          // 2. ObjectId로 시도 (유효한 ObjectId인 경우)
          if (ObjectId.isValid(id)) {
            try {
              console.log(`[API] 리뷰 조회 시도 2: ObjectId (${id})`);
              
              // 연결 상태 확인
              if (mongoose.connection.readyState !== 1) {
                console.log('[API] MongoDB 연결이 끊어짐, 재연결 시도...');
                await dbConnect();
              }
              
              const objectIdReviews = await Review.find({ dramaId: new ObjectId(id) })
                .sort({ createdAt: -1 })
                .limit(100);
              
              if (objectIdReviews && objectIdReviews.length > 0) {
                console.log(`[API] ObjectId로 ${objectIdReviews.length}개 리뷰 찾음`);
                
                // 중복 제거를 위한 Map 사용
                const reviewMap = new Map();
                
                // 기존 리뷰 추가
                allReviews.forEach(review => {
                  const reviewId = review.reviewId || review._id.toString();
                  reviewMap.set(reviewId, review);
                });
                
                // 새로 찾은 리뷰 추가 (중복 방지)
                objectIdReviews.forEach(review => {
                  const reviewId = review.reviewId || review._id.toString();
                  if (!reviewMap.has(reviewId)) {
                    reviewMap.set(reviewId, review);
                  }
                });
                
                // Map을 다시 배열로 변환
                allReviews = Array.from(reviewMap.values());
              }
            } catch (error) {
              console.error(`[API] ObjectId 리뷰 조회 중 오류:`, error);
            }
          }
          
          // 리뷰 데이터 반환
          console.log(`[API] 리뷰 조회 결과: 문자열 ID=${allReviews.length}개, ObjectId=${allReviews.length}개, 중복제거 후=${allReviews.length}개`);
          
          if (!allReviews || allReviews.length === 0) {
            console.log(`[API] 드라마 ID: ${id}에 대한 리뷰를 찾지 못함`);
            return res.status(200).json({ 
              success: true, 
              message: '이 드라마에 등록된 리뷰가 없습니다.',
              data: []
            });
          }

          return res.status(200).json({ 
            success: true, 
            message: '리뷰 목록을 성공적으로 가져왔습니다.',
            data: allReviews
          });
        } catch (error) {
          console.error('리뷰 조회 오류:', error);
          return res.status(500).json({ 
            success: false, 
            message: '리뷰 조회 중 오류가 발생했습니다.', 
            error: error.message 
          });
        }

      default:
        return res.status(405).json({ 
          success: false, 
          message: `Method ${method} Not Allowed` 
        });
    }
  } catch (error) {
    console.error('서버 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.', 
      error: error.message 
    });
  }
} 