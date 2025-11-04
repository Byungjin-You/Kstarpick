import { connectToDatabase } from '../../../utils/mongodb';
import { getSession } from 'next-auth/react';
import { ObjectId } from 'mongodb';

/**
 * @swagger
 * /api/dramas:
 *   get:
 *     description: Retrieves a list of dramas
 *     responses:
 *       200:
 *         description: List of dramas
 *   post:
 *     description: Creates a new drama
 *     responses:
 *       201:
 *         description: Drama created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  const { db } = await connectToDatabase();
  
  // GET 요청 처리 - 공개 접근 허용
  if (req.method === 'GET') {
    try {
      // 쿼리 파라미터 파싱
      const {
        page = 1,
        limit = 10,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        title = '',
        category = '',
        status = '',
        featured = '',
        includeAllFields = 'false'
      } = req.query;
      
      // 숫자형 변환
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      
      // 검색 쿼리 구성
      const query = {};
      
      if (title) {
        query.title = { $regex: title, $options: 'i' };
      }
      
      if (category && category !== 'all') {
        query.category = category;
      }
      
      if (status && status !== 'all') {
        query.status = status;
      }
      
      if (featured === 'true') {
        query.featured = true;
      } else if (featured === 'false') {
        query.featured = false;
      }
      
      // 로그 추가
      console.log('[드라마 API] 검색 쿼리:', JSON.stringify(query));
      console.log('[드라마 API] 정렬:', sortBy, sortOrder);

      // 필요한 필드만 가져오기 (orderNumber 정렬 전에 선언)
      let projection = {};
      if (includeAllFields !== 'true') {
        projection = {
          title: 1,
          slug: 1,
          category: 1,
          status: 1,
          mdlId: 1,
          coverImage: 1,
          network: 1,
          featured: 1,
          updatedAt: 1,
          createdAt: 1,
          genres: 1,
          genre: 1,
          rating: 1,
          reviewRating: 1,
          orderNumber: 1,
          previousOrderNumber: 1,
          description: 1,
          summary: 1
        };
      }

      // 정렬 설정
      const sort = {};

      // orderNumber로 정렬할 때는 orderNumber가 없는 항목들을 뒤로 보내기
      if (sortBy === 'orderNumber') {
        // MongoDB aggregation을 사용하여 orderNumber가 없는 경우 맨 뒤로
        const pipeline = [
          { $match: query },
          {
            $addFields: {
              // orderNumber가 없으면 999999로 설정하여 맨 뒤로
              sortOrder: {
                $cond: {
                  if: { $gt: ['$orderNumber', null] },
                  then: '$orderNumber',
                  else: 999999
                }
              }
            }
          },
          { $sort: { sortOrder: sortOrder === 'asc' ? 1 : -1, updatedAt: -1 } },
          { $skip: skip },
          { $limit: limitNum }
        ];

        if (Object.keys(projection).length > 0) {
          pipeline.push({ $project: projection });
        }

        const dramas = await db.collection('dramas').aggregate(pipeline).toArray();
        const total = await db.collection('dramas').countDocuments(query);

        return res.status(200).json({
          success: true,
          data: dramas,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum)
          }
        });
      }

      // 다른 정렬 기준일 경우 기존 로직 사용
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // 드라마 가져오기
      const dramas = await db
        .collection('dramas')
        .find(query, { projection })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .toArray();
      
      // 전체 개수 가져오기
      const total = await db.collection('dramas').countDocuments(query);
      
      // 응답 전송
      return res.status(200).json({
        success: true,
        data: dramas,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('드라마 조회 중 오류 발생:', error);
      return res.status(500).json({
        success: false,
        message: '드라마 조회 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  } 
  // POST 요청 처리 - 개선된 인증 처리
  else if (req.method === 'POST') {
    console.log('[드라마 API] POST 요청 수신');
    console.log('[드라마 API] 헤더 확인:', {
      authorization: req.headers.authorization ? '있음' : '없음',
      contentType: req.headers['content-type']
    });

    try {
      const dramaData = req.body;
      console.log('[드라마 API] 요청 데이터:', {
        hasTitle: !!dramaData?.title,
        dataKeys: dramaData ? Object.keys(dramaData).length : 0
      });
      
      // 데이터 유효성 검사
      if (!dramaData || !dramaData.title) {
        console.error('[드라마 API] 데이터 유효성 검사 실패');
        return res.status(400).json({
          success: false,
          message: '유효한 드라마 데이터가 필요합니다.'
        });
      }
      
      // 필드 이름 매핑 (크롤러 필드명 -> UI 필드명)
      // synopsis -> summary
      if (dramaData.synopsis && !dramaData.summary) {
        dramaData.summary = dramaData.synopsis;
      }

      // posterImage -> coverImage
      if (dramaData.posterImage && !dramaData.coverImage) {
        dramaData.coverImage = dramaData.posterImage;
      }

      // nativeTitle -> originalTitle
      if (dramaData.nativeTitle && !dramaData.originalTitle) {
        dramaData.originalTitle = dramaData.nativeTitle;
      }

      // airsInfo -> releaseDate
      if (dramaData.airsInfo && !dramaData.releaseDate) {
        dramaData.releaseDate = dramaData.airsInfo;
      }

      // contentRating -> ageRating
      if (dramaData.contentRating && !dramaData.ageRating) {
        dramaData.ageRating = dramaData.contentRating;
      }

      // backgroundImage -> bannerImage
      if (dramaData.backgroundImage && !dramaData.bannerImage) {
        dramaData.bannerImage = dramaData.backgroundImage;
      }

      // whereToWatch/streamingServices -> watchProviders
      if (!dramaData.watchProviders || dramaData.watchProviders.length === 0) {
        if (dramaData.whereToWatch && dramaData.whereToWatch.length > 0) {
          dramaData.watchProviders = dramaData.whereToWatch;
        } else if (dramaData.streamingServices && dramaData.streamingServices.length > 0) {
          // streamingServices를 watchProviders 형식으로 변환
          dramaData.watchProviders = dramaData.streamingServices.map(service => ({
            name: service.name,
            link: service.url,
            imageUrl: service.logo,
            type: service.type
          }));
        } else if (dramaData.credits?.watchProviders && dramaData.credits.watchProviders.length > 0) {
          // credits.watchProviders 매핑
          dramaData.watchProviders = dramaData.credits.watchProviders;
        }
      }

      // credits.directors -> director/directors 매핑
      if (dramaData.credits?.directors && dramaData.credits.directors.length > 0) {
        if (!dramaData.directors || dramaData.directors.length === 0) {
          dramaData.directors = dramaData.credits.directors;
        }
        if (!dramaData.director) {
          dramaData.director = dramaData.credits.directors[0]?.name || '';
        }
      }

      // credits.writers -> screenwriters 매핑
      if (dramaData.credits?.writers && dramaData.credits.writers.length > 0) {
        if (!dramaData.screenwriters || dramaData.screenwriters.length === 0) {
          dramaData.screenwriters = dramaData.credits.writers.map(writer => ({
            name: writer.name,
            image: writer.image || ''
          }));
        }
      }

      // credits.mainCast + credits.supportCast -> cast 매핑
      if (!dramaData.cast || (!dramaData.cast.mainRoles && !dramaData.cast.supportRoles)) {
        const mainRoles = dramaData.credits?.mainCast?.map(actor => ({
          name: actor.name,
          role: actor.role,
          image: actor.image
        })) || [];

        const supportRoles = dramaData.credits?.supportCast?.map(actor => ({
          name: actor.name,
          role: actor.role,
          image: actor.image
        })) || [];

        if (mainRoles.length > 0 || supportRoles.length > 0) {
          dramaData.cast = {
            mainRoles,
            supportRoles
          };
        }
      }

      // status 필드 생성 (airsInfo 기반)
      if (!dramaData.status && dramaData.airsInfo) {
        const airsInfo = dramaData.airsInfo.toLowerCase();
        const currentDate = new Date();

        if (airsInfo.includes('upcoming') || (dramaData.startDate && new Date(dramaData.startDate) > currentDate)) {
          dramaData.status = 'Upcoming';
        } else if (airsInfo.includes('airing') || airsInfo.includes('ongoing') ||
                   (dramaData.startDate && new Date(dramaData.startDate) <= currentDate &&
                    (!dramaData.endDate || new Date(dramaData.endDate) >= currentDate))) {
          dramaData.status = 'Airing';
        } else if (dramaData.endDate && new Date(dramaData.endDate) < currentDate) {
          dramaData.status = 'Completed';
        } else {
          dramaData.status = 'Completed'; // 기본값
        }

        console.log(`[드라마 API] 상태 자동 설정: ${dramaData.status} (airsInfo: ${dramaData.airsInfo})`);
      }

      // 타임스탬프 추가
      const now = new Date();
      dramaData.createdAt = now;
      dramaData.updatedAt = now;

      // 중복 체크 (고유 식별자 우선순위: url > mdlUrl > id > title)
      let query = {};

      if (dramaData.url) {
        query.url = dramaData.url;
      } else if (dramaData.mdlUrl) {
        query.mdlUrl = dramaData.mdlUrl;
      } else if (dramaData.id) {
        query.id = dramaData.id;
      } else if (dramaData.title) {
        query.title = dramaData.title;
      }

      console.log('[드라마 API] 중복 체크 조건:', query);

      // 기존 항목 검색
      const existingItem = await db.collection('dramas').findOne(query);

      let result;

      if (existingItem) {
        console.log(`[드라마 API] 기존 항목 발견: ${existingItem.title} (ID: ${existingItem._id})`);
        console.log('[드라마 API] 중복 항목이므로 업데이트합니다.');

        // 기존 데이터와 새 데이터 병합
        const mergedData = {
          ...dramaData,
          _id: existingItem._id,
          createdAt: existingItem.createdAt || new Date(),
          updatedAt: new Date(),
        };

        // slug 보존
        if (existingItem.slug) {
          mergedData.slug = existingItem.slug;
        } else if (!mergedData.slug) {
          const baseSlug = dramaData.title
            .toLowerCase()
            .replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]+/g, '-')
            .replace(/^-|-$/g, '');
          const timestamp = Date.now().toString().slice(-6);
          mergedData.slug = `${baseSlug}-${timestamp}`;
        }

        // 업데이트
        result = await db.collection('dramas').replaceOne(
          { _id: existingItem._id },
          mergedData
        );

        console.log('[드라마 API] 업데이트 성공:', {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount
        });

        return res.status(200).json({
          success: true,
          message: '기존 항목이 업데이트되었습니다.',
          data: {
            _id: existingItem._id,
            title: mergedData.title,
            slug: mergedData.slug,
            isUpdate: true
          }
        });
      } else {
        // 새 항목 생성
        console.log('[드라마 API] 새 항목 생성');

        // 슬러그 생성 (없는 경우)
        if (!dramaData.slug) {
          const baseSlug = dramaData.title
            .toLowerCase()
            .replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]+/g, '-')
            .replace(/^-|-$/g, '');
          const timestamp = Date.now().toString().slice(-6);
          dramaData.slug = `${baseSlug}-${timestamp}`;
        }

        console.log('[드라마 API] 데이터베이스 저장 시도:', {
          title: dramaData.title,
          slug: dramaData.slug,
          hasContent: !!dramaData.content
        });

        // 드라마 저장
        result = await db.collection('dramas').insertOne(dramaData);

        console.log('[드라마 API] 저장 성공:', {
          insertedId: result.insertedId,
          acknowledged: result.acknowledged
        });
      }
      
      return res.status(201).json({
        success: true,
        message: '드라마가 성공적으로 생성되었습니다.',
        data: {
          _id: result.insertedId,
          title: dramaData.title,
          slug: dramaData.slug
        }
      });
    } catch (error) {
      console.error('[드라마 API] 생성 중 오류 발생:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({
        success: false,
        message: '드라마 생성 중 오류가 발생했습니다.',
        error: error.message,
        details: error.stack
      });
    }
  } 
  // 허용되지 않는 메소드
  else {
    return res.status(405).json({
      success: false,
      message: '허용되지 않는 메소드입니다.'
    });
  }
}

/**
 * Get dramas with optional filtering
 */
async function getDramas(req, res, db) {
  try {
    const { status, genre, network, limit = 20, page = 1 } = req.query;
    
    // Build query based on filters
    const query = {};
    if (status) query.status = status;
    if (genre) query.genre = { $in: [genre] };
    if (network) query.network = network;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get dramas from database
    const dramas = await db
      .collection('dramas')
      .find(query)
      .sort({ releaseDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Get total count for pagination
    const total = await db.collection('dramas').countDocuments(query);
    
    return res.status(200).json({ 
      success: true, 
      data: dramas,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(limit),
        pageCount: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting dramas:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving dramas', error: error.message });
  }
}

/**
 * Create a new drama
 */
async function createDrama(req, res, db) {
  try {
    const dramaData = req.body;
    
    // Basic validation
    if (!dramaData.title || !dramaData.status) {
      return res.status(400).json({ success: false, message: 'Title and status are required' });
    }
    
    // Add timestamps
    const now = new Date();
    dramaData.createdAt = now;
    dramaData.updatedAt = now;
    
    // Insert into database
    const result = await db.collection('dramas').insertOne(dramaData);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Drama created successfully',
      data: { 
        _id: result.insertedId,
        ...dramaData 
      }
    });
  } catch (error) {
    console.error('Error creating drama:', error);
    return res.status(500).json({ success: false, message: 'Error creating drama', error: error.message });
  }
}

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