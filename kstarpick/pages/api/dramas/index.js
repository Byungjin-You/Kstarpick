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
      
      // 정렬 설정
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      // orderNumber가 정렬 기준인 경우 보조 정렬 추가
      if (sortBy === 'orderNumber') {
        sort['updatedAt'] = -1; // orderNumber가 같은 경우 최신순
      }
      
      // 필요한 필드만 가져오기
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
          description: 1,  // 시놉시스 필드 추가
          summary: 1      // 시놉시스 필드 추가
        };
      }
      
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
      
      // 타임스탬프 추가
      const now = new Date();
      dramaData.createdAt = now;
      dramaData.updatedAt = now;
      
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
      const result = await db.collection('dramas').insertOne(dramaData);
      
      console.log('[드라마 API] 저장 성공:', {
        insertedId: result.insertedId,
        acknowledged: result.acknowledged
      });
      
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