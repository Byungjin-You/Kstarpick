import { connectToDatabase } from '../../../utils/mongodb';
import { getSession } from 'next-auth/react';
import { ObjectId } from 'mongodb';

/**
 * @swagger
 * /api/dramas/{id}:
 *   get:
 *     description: Get a specific drama by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Drama details
 *       404:
 *         description: Drama not found
 *   put:
 *     description: Update a drama
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Drama updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Drama not found
 *   delete:
 *     description: Delete a drama
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Drama deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Drama not found
 */

// 리뷰 배열에서 reviewRating, reviewCount, ratingDistribution 계산
function calculateReviewStats(reviews) {
  // 기본값 설정
  let reviewCount = 0;
  let reviewRating = 0;
  let ratingDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  
  // 리뷰가 없으면 기본값 반환
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { reviewCount, reviewRating, ratingDistribution };
  }
  
  reviewCount = reviews.length;
  let totalRating = 0;
  
  // 리뷰 순회하며 평균 평점 및 분포 계산
  reviews.forEach(review => {
    const rating = parseInt(review.rating, 10);
    if (!isNaN(rating) && rating >= 1 && rating <= 10) {
      totalRating += rating;
      // 평점은 1-10, 배열 인덱스는 0-9이므로 -1 처리
      const ratingIndex = Math.min(Math.max(Math.floor(rating) - 1, 0), 9);
      ratingDistribution[ratingIndex]++;
    }
  });
  
  // 평균 평점 계산 (소수점 첫째 자리까지)
  if (reviewCount > 0) {
    reviewRating = parseFloat((totalRating / reviewCount).toFixed(1));
  }
  
  return { reviewCount, reviewRating, ratingDistribution };
}

export default async function handler(req, res) {
  const { id, view } = req.query;
  
  try {
    const { db } = await connectToDatabase();
    const dramas = db.collection('dramas');
    
    switch (req.method) {
      case 'GET':
        // GET 요청은 공개 접근 허용
        console.log(`[API] GET /api/dramas/${id} 요청 받음, view=${view}`);
        
        let drama = await dramas.findOne({ _id: new ObjectId(id) });
        
        if (!drama) {
          return res.status(404).json({
            success: false,
            message: '드라마를 찾을 수 없습니다.'
          });
        }
        
        // 조회수 증가 (view=true 쿼리 파라미터가 있는 경우)
        if (view === 'true') {
          await dramas.updateOne(
            { _id: new ObjectId(id) },
            { $inc: { viewCount: 1 } }
          );
          
          // 업데이트된 조회수를 포함한 최신 데이터를 가져옴
          drama = await dramas.findOne({ _id: new ObjectId(id) });
        }
        
        // 리뷰 컬렉션에서 해당 드라마의 리뷰 조회 (여러 방식으로 시도)
        let externalReviews = [];
        
        try {
          // 1. 문자열 ID로 시도
          console.log(`[API] 리뷰 조회 시도 1: 문자열 ID (${id})`);
          const stringIdReviews = await db.collection('reviews').find({ dramaId: id }).toArray();
          
          // 2. ObjectId로 시도 (유효한 ObjectId인 경우)
          let objectIdReviews = [];
          if (ObjectId.isValid(id)) {
            console.log(`[API] 리뷰 조회 시도 2: ObjectId (${id})`);
            objectIdReviews = await db.collection('reviews').find({ dramaId: new ObjectId(id) }).toArray();
          }
          
          // 조회된 리뷰 병합 (중복 제거)
          const allReviews = [...stringIdReviews, ...objectIdReviews];
          
          // reviewId를 기준으로 중복 제거
          const reviewMap = new Map();
          allReviews.forEach(review => {
            reviewMap.set(review.reviewId || review._id.toString(), review);
          });
          
          externalReviews = Array.from(reviewMap.values());
          console.log(`[API] 리뷰 조회 결과: 문자열 ID=${stringIdReviews.length}개, ObjectId=${objectIdReviews.length}개, 중복제거 후=${externalReviews.length}개`);
        } catch (error) {
          console.error('[API] 리뷰 조회 중 오류:', error);
          // 오류가 발생해도 계속 진행
        }
        
        // 리뷰 통계 계산 - 외부 리뷰 컬렉션 데이터 사용
        const { reviewCount, reviewRating, ratingDistribution } = calculateReviewStats(externalReviews);
        
        // 리뷰 통계 필드 추가
        drama.reviewCount = reviewCount;
        drama.reviewRating = reviewRating;
        drama.ratingDistribution = ratingDistribution;
        
        // 외부 리뷰 컬렉션에서 가져온 리뷰를 drama.reviews 배열에 포함시킵니다
        // 기존 리뷰 배열이 없으면 새로 생성합니다
        if (!drama.reviews || !Array.isArray(drama.reviews)) {
          drama.reviews = [];
        }
        
        // 외부 리뷰가 있으면 추가
        if (externalReviews && externalReviews.length > 0) {
          // 기존 리뷰 배열을 유지하고 외부 리뷰를 추가
          drama.reviews = [...drama.reviews, ...externalReviews];
          console.log(`[API] ${externalReviews.length}개의 리뷰를 드라마/영화 객체에 추가했습니다.`);
        }
        
        console.log(`[API] 드라마 데이터 반환: reviewCount=${drama.reviewCount}, reviewRating=${drama.reviewRating}, ratingDistribution=${JSON.stringify(drama.ratingDistribution)}`);
        
        return res.status(200).json({
          success: true,
          data: drama
        });
        
      case 'PUT':
      case 'DELETE':
        // PUT/DELETE 요청의 토큰 검사 제거됨 (크롤링 작업 편의성을 위해)
        console.log('[드라마 API] PUT/DELETE 토큰 검사 생략됨 - 크롤링 모드');
        
        if (req.method === 'PUT') {
          const {
            title,
            originalTitle,
            description,
            summary,
            status,
            country,
            releaseDate,
            runtime,
            ageRating,
            director,
            genres,
            category,
            coverImage,
            bannerImage,
            trailerUrl,
            cast,
            watchProviders,
            streamingLinks,
            tags,
            videos,
            reviews,
            reviewRating,
            reviewCount,
            ratingDistribution,
            featured,
            metaDescription,
            metaKeywords,
            episodeList,
            whereToWatch,
            orderNumber,
            previousOrderNumber
          } = req.body;
          
          // 필수 필드 검증
          if (!title) {
            return res.status(400).json({
              success: false,
              message: '제목은 필수 필드입니다.'
            });
          }
          
          // 업데이트할 데이터 객체 생성
          const updateData = {
            title,
            updatedAt: new Date()
          };
          
          // 선택적 필드들 추가 (undefined가 아닌 필드만)
          if (originalTitle !== undefined) updateData.originalTitle = originalTitle;
          if (description !== undefined) updateData.description = description;
          if (summary !== undefined) updateData.summary = summary;
          if (status !== undefined) updateData.status = status;
          if (country !== undefined) updateData.country = country;
          if (releaseDate !== undefined) updateData.releaseDate = releaseDate;
          if (runtime !== undefined) updateData.runtime = runtime;
          if (ageRating !== undefined) updateData.ageRating = ageRating;
          if (director !== undefined) updateData.director = director;
          if (genres !== undefined) updateData.genres = genres;
          if (category !== undefined) updateData.category = category;
          if (coverImage !== undefined) updateData.coverImage = coverImage;
          if (bannerImage !== undefined) updateData.bannerImage = bannerImage;
          if (trailerUrl !== undefined) updateData.trailerUrl = trailerUrl;
          if (watchProviders !== undefined) updateData.watchProviders = watchProviders;
          if (streamingLinks !== undefined) updateData.streamingLinks = streamingLinks;
          if (tags !== undefined) updateData.tags = tags;
          if (videos !== undefined) updateData.videos = videos;
          if (reviews !== undefined) updateData.reviews = reviews;
          if (reviewRating !== undefined) updateData.reviewRating = reviewRating;
          if (reviewCount !== undefined) updateData.reviewCount = reviewCount;
          if (ratingDistribution !== undefined) updateData.ratingDistribution = ratingDistribution;
          if (featured !== undefined) updateData.featured = featured;
          if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
          if (metaKeywords !== undefined) updateData.metaKeywords = metaKeywords;
          if (episodeList !== undefined) updateData.episodeList = episodeList;
          if (whereToWatch !== undefined) updateData.whereToWatch = whereToWatch;
          
          // 순위 관련 필드 추가
          if (orderNumber !== undefined) updateData.orderNumber = parseInt(orderNumber) || 0;
          if (previousOrderNumber !== undefined) updateData.previousOrderNumber = parseInt(previousOrderNumber) || 0;
          
          // 만약 리뷰가 수정되었고 리뷰 통계 필드가 직접 제공되지 않았으면 재계산
          if (reviews !== undefined && (reviewRating === undefined || reviewCount === undefined || ratingDistribution === undefined)) {
            const stats = calculateReviewStats(reviews);
            updateData.reviewRating = stats.reviewRating;
            updateData.reviewCount = stats.reviewCount;
            updateData.ratingDistribution = stats.ratingDistribution;
          }
          
          if (cast !== undefined) {
            // 출연진 정보 처리
            if (typeof cast === 'object' && cast !== null && !Array.isArray(cast) && (cast.mainRoles || cast.supportRoles)) {
              // 객체 형태의 출연진 정보 (mainRoles, supportRoles)
              const mainRoles = Array.isArray(cast.mainRoles) ? cast.mainRoles : [];
              const supportRoles = Array.isArray(cast.supportRoles) ? cast.supportRoles : [];
              
              console.log(`[API] 드라마 '${title}'의 출연진 정보 업데이트: 메인 ${mainRoles.length}명, 서포트 ${supportRoles.length}명`);
              
              // 비배우 정보(감독, 작가 등) 필터링 함수
              const isActorRole = (role) => {
                if (!role) return true;
                const roleText = role.toLowerCase();
                return !roleText.includes('director') && 
                       !roleText.includes('producer') && 
                       !roleText.includes('screenwriter') && 
                       !roleText.includes('writer') &&
                       !roleText.includes('creator') &&
                       !roleText.includes('pd') &&
                       !roleText.includes('production') &&
                       !roleText.includes('script') &&
                       !roleText.includes('original author') &&
                       !roleText.includes('original work');
              };
              
              // 의미 없는 역할 텍스트 확인
              const isEmptyRole = (role) => {
                if (!role) return true;
                const roleText = role.toLowerCase();
                return roleText === '' || 
                       roleText === 'unknown' || 
                       roleText === 'unknown role' || 
                       roleText === 'main role' || 
                       roleText === 'support role' || 
                       roleText === 'supporting role' || 
                       roleText === 'guest role' ||
                       roleText.includes('known for roles');
              };
              
              // 변환: 원래 역할 이름 그대로 사용, 비배우 정보는 제외
              const convertedCast = [
                ...mainRoles.filter(actor => isActorRole(actor.role) && !isEmptyRole(actor.role)).map((actor, index) => ({
                  name: actor.name || 'N/A',
                  role: actor.role || '',
                  profileImage: actor.profileImage || actor.image || '',
                  order: index
                })),
                ...supportRoles.filter(actor => isActorRole(actor.role) && !isEmptyRole(actor.role)).map((actor, index) => ({
                  name: actor.name || 'N/A',
                  role: actor.role || '',
                  profileImage: actor.profileImage || actor.image || '',
                  order: mainRoles.length + index
                }))
              ];
              
              // 변환된 배열로 대체
              updateData.cast = convertedCast;
            } else {
              // 이미 배열 형태이거나 다른 형태의 데이터면 그대로 사용
              updateData.cast = cast;
            }
          }
          
          // 드라마 정보 업데이트
          const result = await dramas.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
          );
          
          if (result.matchedCount === 0) {
            return res.status(404).json({
              success: false,
              message: '드라마를 찾을 수 없습니다.'
            });
          }
          
          return res.status(200).json({
            success: true,
            message: '드라마가 성공적으로 수정되었습니다.'
          });
        } else {
          // DELETE 요청 처리
          const deleteResult = await dramas.deleteOne({ _id: new ObjectId(id) });
          
          if (deleteResult.deletedCount === 0) {
            return res.status(404).json({
              success: false,
              message: '드라마를 찾을 수 없습니다.'
            });
          }
          
          return res.status(200).json({
            success: true,
            message: '드라마가 성공적으로 삭제되었습니다.'
          });
        }
        
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} Not Allowed`
        });
    }
  } catch (error) {
    console.error('Error handling drama:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
} 