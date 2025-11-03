import { connectToDatabase } from '../../../utils/mongodb';
import { verifyToken } from '../../../lib/auth';
import { validateToken } from '../../../lib/token';
import { ObjectId } from 'mongodb';
import { formidable } from 'formidable';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import TVFilm from '../../../models/TVFilm';
import { serialize } from 'cookie';
import { parse } from 'cookie';
import dbConnect from '../../../lib/dbConnect';
import slugify from 'slugify';
import { getSession } from 'next-auth/react';
import mongoose from 'mongoose';
import Review from '../../../models/Review';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

// Get the directory name using ES modules pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadDir = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export default async function handler(req, res) {
  const { method } = req;

  // GET 요청은 공개 API이므로 인증 불필요
  if (method !== 'GET') {
    // SSR 내부 호출인지 확인
    const isInternalSSR = req.headers['x-internal-ssr'] === 'true';

    // SSR 내부 호출이 아닌 경우에만 인증 확인 (POST, DELETE 등)
    if (!isInternalSSR) {
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isAdmin) {
          return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        }
      } catch (error) {
        return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
      }
    }
  }

  await dbConnect();

  try {
    switch (method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res);
        break;
      case 'DELETE':
        await handleDelete(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
}

// Handle GET requests to fetch TV/Film entries
async function handleGet(req, res) {
  try {
    const { page = 1, limit = 10, search = '', category = '', sort = 'createdAt', order = 'desc' } = req.query;
    
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { network: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 드라마 카테고리 항목 제외 - 어드민 페이지에서 드라마 카테고리를 명시적으로 요청한 경우만 예외처리
    if (category === 'k-drama' && req.headers.referer && req.headers.referer.includes('/admin/')) {
      query.category = 'k-drama';
      console.log(`관리자 페이지에서 k-drama 카테고리 요청 허용: ${req.headers.referer}`);
    } else if (category && category !== 'k-drama') {
      // 다른 카테고리가 지정된 경우 해당 카테고리만 검색
      query.category = category;
      console.log(`카테고리 쿼리: '${category}'로 필터링 시도 중`);
    } else {
      // 카테고리가 지정되지 않았거나 드라마 카테고리인 경우(관리자 페이지 제외), 드라마 제외
      query.category = { $ne: 'k-drama' };
      console.log('일반 페이지에서는 k-drama 카테고리 항목 제외');
    }
    
    // 전체 카테고리 분포 확인
    const categoryDistribution = await TVFilm.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    console.log("카테고리 분포:", JSON.stringify(categoryDistribution));
    
    // 특정 카테고리의 항목 샘플 로깅 (최대 3개)
    if (category === 'k-drama' && req.headers.referer && req.headers.referer.includes('/admin/')) {
      const dramaSamples = await TVFilm.find({ category: 'k-drama' }).limit(3).lean();
      console.log(`'k-drama' 카테고리 샘플 데이터 (${dramaSamples.length}개):`, 
        dramaSamples.map(d => ({ id: d._id, title: d.title, category: d.category }))
      );
    }
    
    // 정렬 기준 확인
    const validSortFields = ['createdAt', 'title', 'rating', 'reviewRating', 'reviewCount', 'views'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    console.log(`정렬 기준: ${sortField}, 방향: ${sortOrder === 1 ? '오름차순' : '내림차순'}`);
    
    // 정렬 옵션 설정
    const sortOptions = {};
    sortOptions[sortField] = sortOrder;
    
    // Execute query with pagination and sorting
    const tvfilms = await TVFilm.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parsedLimit)
      .populate('author', 'name email');
    
    const total = await TVFilm.countDocuments(query);
    
    console.log(`Found ${tvfilms.length} tvfilms matching query.`);
    
    // 각 TVFilm에 대한 리뷰 가져오기
    const processedTvfilms = await Promise.all(tvfilms.map(async (tvfilm) => {
      const tvfilmObj = tvfilm.toObject();
      
      // 커버 이미지가 없는 경우 기본 이미지 설정
      if (!tvfilmObj.coverImage) {
        tvfilmObj.coverImage = '/images/placeholder-tvfilm.svg';
      }
      
      // 배너 이미지가 없는 경우 기본 이미지 설정
      if (!tvfilmObj.bannerImage) {
        tvfilmObj.bannerImage = '/images/placeholder-tvfilm.svg';
      }
      
      // 외부 이미지 URL 로깅 (관리 목적)
      if (tvfilmObj.coverImage && (tvfilmObj.coverImage.startsWith('http://') || tvfilmObj.coverImage.startsWith('https://'))) {
        console.log(`외부 이미지 URL 사용: ${tvfilmObj.title} - ${tvfilmObj.coverImage}`);
      }
      
      // 리뷰 가져오기
      try {
        // 먼저 대표 리뷰를 찾고, 없으면 최신 리뷰를 가져옴
        const featuredReview = await Review.findOne({ 
          tvfilm: tvfilm._id, 
          featured: true 
        }).populate('author', 'name image');
        
        if (featuredReview) {
          // 대표 리뷰가 있으면 해당 리뷰만 포함
          tvfilmObj.reviews = [featuredReview];
        } else {
          // 대표 리뷰가 없으면 최신 리뷰 하나만 가져오기
          const latestReviews = await Review.find({ 
            tvfilm: tvfilm._id 
          })
          .populate('author', 'name image')
          .sort({ createdAt: -1 })
          .limit(1);
          
          tvfilmObj.reviews = latestReviews;
        }
      } catch (reviewError) {
        console.error(`Error fetching reviews for TVFilm ${tvfilm._id}:`, reviewError);
        tvfilmObj.reviews = []; // 에러 발생 시 빈 배열로 설정
      }
      
      return tvfilmObj;
    }));
    
    res.status(200).json({
      success: true,
      data: processedTvfilms,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching tvfilms:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Handle POST requests to create new TV/Film entries
async function handlePost(req, res) {
  console.log('Handling POST request to /api/tvfilm');
  
  try {
    // 1. 사용자 인증 확인
    const user = await validateToken(req);
    console.log('User authentication result:', user);
    
    if (!user) {
      console.error('Authentication failed: No user found');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    if (user.role !== 'admin') {
      console.error('Authorization failed: User is not an admin, role:', user.role);
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }
    
    console.log('User ID for author field:', user._id?.toString());
    
    // 2. 데이터 파싱
    const contentType = req.headers['content-type'] || '';
    console.log('Request Content-Type:', contentType);
    
    let tvfilmData = {};
    
    // JSON 데이터인 경우
    if (contentType.includes('application/json')) {
      console.log('Processing JSON data...');
      tvfilmData = req.body;
      console.log('Received data:', JSON.stringify(tvfilmData, null, 2));
      
    } 
    // FormData인 경우
    else if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data...');
      
      const form = formidable({
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024,
      });
      
      try {
        const [fields, files] = await form.parse(req);
        
        // formidable v3는 필드와 파일을 배열로 반환하므로 변환 필요
        const parsedFields = {};
        Object.keys(fields).forEach(key => {
          parsedFields[key] = fields[key][0];
        });
        
        tvfilmData = { ...parsedFields };
        console.log('Parsed form fields:', Object.keys(tvfilmData));
        
        // JSON 문자열 필드 파싱
        try {
          if (tvfilmData.tags) tvfilmData.tags = JSON.parse(tvfilmData.tags);
          if (tvfilmData.genres) tvfilmData.genres = JSON.parse(tvfilmData.genres);
          if (tvfilmData.cast) tvfilmData.cast = JSON.parse(tvfilmData.cast);
          if (tvfilmData.watchProviders) tvfilmData.watchProviders = JSON.parse(tvfilmData.watchProviders);
          if (tvfilmData.videos) tvfilmData.videos = JSON.parse(tvfilmData.videos);
          if (tvfilmData.reviews) tvfilmData.reviews = JSON.parse(tvfilmData.reviews);
        } catch (jsonError) {
          console.error('Error parsing JSON fields:', jsonError);
        }
        
        // 파일 처리
        if (files.coverImage) {
          const coverImage = files.coverImage[0];
          const imageDestination = path.join(uploadDir, coverImage.newFilename);
          fs.copyFileSync(coverImage.filepath, imageDestination);
          tvfilmData.coverImage = `/uploads/${coverImage.newFilename}`;
        }
        
        if (files.bannerImage) {
          const bannerImage = files.bannerImage[0];
          const imageDestination = path.join(uploadDir, bannerImage.newFilename);
          fs.copyFileSync(bannerImage.filepath, imageDestination);
          tvfilmData.bannerImage = `/uploads/${bannerImage.newFilename}`;
        }
      } catch (formError) {
        console.error('Error parsing form data:', formError);
        return res.status(400).json({ success: false, message: 'Failed to parse form data' });
      }
    } else {
      console.error('Unsupported content type:', contentType);
      return res.status(400).json({ success: false, message: 'Unsupported content type' });
    }
    
    // 3. 필수 필드 검증
    if (!tvfilmData.title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    
    if (!tvfilmData.summary) {
      return res.status(400).json({ success: false, message: 'Summary is required' });
    }
    
    if (!tvfilmData.category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }
    
    if (!tvfilmData.coverImage && !tvfilmData.coverImage?.startsWith('/')) {
      tvfilmData.coverImage = '/images/placeholder-tvfilm.svg';
    }
    
    // 4. slug 생성 및 확인
    let baseSlug = tvfilmData.slug;
    if (!baseSlug) {
      try {
        baseSlug = slugify(tvfilmData.title, { lower: true, strict: true });
      } catch (slugError) {
        console.error('Error using slugify:', slugError);
      }
    }
    
    // 한글만 있거나 slugify 실패하면 UUID 생성
    if (!baseSlug || baseSlug.trim() === '') {
      const randomId = uuidv4().substring(0, 8);
      baseSlug = `tvfilm-${randomId}`;
    }
    
    let slug = baseSlug;
    let counter = 1;
    let slugExists = await TVFilm.findOne({ slug });
    
    while (slugExists) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      slugExists = await TVFilm.findOne({ slug });
    }
    
    console.log(`생성된 최종 slug: ${slug}`);
    
    // 5. TVFilm 데이터 준비
    const finalTVFilmData = {
      ...tvfilmData,
      slug,
      author: user._id?.toString(),
      content: tvfilmData.content || tvfilmData.summary || '',
      lang: tvfilmData.lang || 'ko',
      status: tvfilmData.status || 'ongoing',
      createdAt: new Date(),
      updatedAt: new Date(),
      // 필수 기본값들
      reviewRating: parseFloat(tvfilmData.reviewRating) || 0,
      reviewCount: parseInt(tvfilmData.reviewCount) || 0,
      ratingDistribution: tvfilmData.ratingDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      views: 0,
      likes: 0
    };
    
    // 배열 데이터 확인
    finalTVFilmData.tags = Array.isArray(finalTVFilmData.tags) ? finalTVFilmData.tags : [];
    finalTVFilmData.genres = Array.isArray(finalTVFilmData.genres) ? finalTVFilmData.genres : [];
    finalTVFilmData.cast = Array.isArray(finalTVFilmData.cast) ? finalTVFilmData.cast : [];
    finalTVFilmData.watchProviders = Array.isArray(finalTVFilmData.watchProviders) ? finalTVFilmData.watchProviders : [];
    finalTVFilmData.videos = Array.isArray(finalTVFilmData.videos) ? finalTVFilmData.videos : [];
    finalTVFilmData.reviews = Array.isArray(finalTVFilmData.reviews) ? finalTVFilmData.reviews : [];
    
    console.log('Final TVFilm data:', JSON.stringify({
      title: finalTVFilmData.title,
      slug: finalTVFilmData.slug,
      category: finalTVFilmData.category,
      author: finalTVFilmData.author
    }, null, 2));
    
    // 6. TVFilm 모델 생성 및 저장
    const tvfilm = new TVFilm(finalTVFilmData);
    
    // 유효성 검사
    const validationError = tvfilm.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ 
        success: false, 
        message: `Validation failed: ${validationError.message}`,
        errors: validationError.errors
      });
    }
    
    await tvfilm.save();
    console.log(`TVFilm created successfully: ${tvfilm.title} (${tvfilm._id})`);
    
    return res.status(201).json({ 
      success: true, 
      data: tvfilm,
      message: 'TV/Film created successfully'
    });
    
  } catch (error) {
    console.error('Error in handlePost:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error occurred'
    });
  }
}

async function handleDelete(req, res) {
  console.log('Handling DELETE request to /api/tvfilm');
  
  try {
    // 토큰 검증 제거됨 (크롤링 작업 편의성을 위해)
    console.log('[TVFilm Index API] DELETE 토큰 검사 생략됨 - 크롤링 모드');
    
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID parameter is required' });
    }
    
    // Find TVFilm to get the image path
    const tvfilm = await TVFilm.findById(id);
    
    if (!tvfilm) {
      return res.status(404).json({ success: false, message: 'TV/Film not found' });
    }
    
    // Delete the TV/Film
    await TVFilm.findByIdAndDelete(id);
    
    // Delete the cover image if it exists and is not an external URL
    if (tvfilm.coverImage && tvfilm.coverImage.startsWith('/uploads/')) {
      const imagePath = path.join(process.cwd(), 'public', tvfilm.coverImage);
      
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('Error deleting image file:', error);
      }
    }
    
    res.status(200).json({ success: true, message: 'TV/Film deleted successfully' });
  } catch (error) {
    console.error('Error deleting tvfilm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
} 