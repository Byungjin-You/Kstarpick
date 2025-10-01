import { formidable } from 'formidable';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../utils/mongodb';
import { parse } from 'cookie';
import dbConnect from '../../../lib/dbConnect';
import TVFilm from '../../../models/TVFilm';
import { verifyToken } from '../../../lib/auth';
import { validateToken } from '../../../lib/token';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import User from '../../../models/User';
import slugify from 'slugify';
import { getSession } from 'next-auth/react';
import { ObjectId } from 'mongodb';
import { checkUserPermission } from '../../../lib/permissions';
import mongoose from 'mongoose';
import Review from '../../../models/Review';

// Upload directory
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

// Helper function to process fields for updates
function processFields(fields, existingTVFilm) {
  const updateData = {
    updatedAt: new Date()
  };
  
  // 기본 필드 처리
  if (fields.title) updateData.title = fields.title;
  if (fields.originalTitle) updateData.originalTitle = fields.originalTitle;
  if (fields.category) updateData.category = fields.category.toLowerCase();
  if (fields.summary) updateData.summary = fields.summary;
  if (fields.content) updateData.content = fields.content;
  if (fields.network) updateData.network = fields.network;
  if (fields.status) updateData.status = fields.status.toLowerCase();
  if (fields.releaseDate) updateData.releaseDate = new Date(fields.releaseDate);
  if (fields.rating) updateData.rating = parseFloat(fields.rating);
  if (fields.runtime) updateData.runtime = fields.runtime;
  if (fields.ageRating) updateData.ageRating = fields.ageRating;
  if (fields.director) updateData.director = fields.director;
  if (fields.country) updateData.country = fields.country;
  if (fields.trailerUrl) updateData.trailerUrl = fields.trailerUrl;
  if (fields.coverImage) updateData.coverImage = fields.coverImage;
  if (fields.bannerImage) updateData.bannerImage = fields.bannerImage;
  
  // 순위 관련 필드 처리
  if (fields.orderNumber !== undefined) updateData.orderNumber = parseInt(fields.orderNumber);
  if (fields.previousOrderNumber !== undefined) updateData.previousOrderNumber = parseInt(fields.previousOrderNumber);
  
  // Generate slug from title if it has changed
  if (updateData.title && updateData.title !== existingTVFilm.title) {
    updateData.slug = slugify(updateData.title, { lower: true });
    
    // 한글이나 특수문자만 있는 경우 slugify 결과가 비어있을 수 있음
    if (!updateData.slug || updateData.slug.trim() === '') {
      // 원래 제목을 소문자로 변환하고 공백을 하이픈으로 대체
      updateData.slug = updateData.title.toLowerCase().replace(/\s+/g, '-');
    }
  }
  
  // 배열 필드 직접 할당 - JSON.parse 오류 방지
  if (fields.tags) updateData.tags = Array.isArray(fields.tags) ? fields.tags : [];
  if (fields.genres) updateData.genres = Array.isArray(fields.genres) ? fields.genres : [];
  if (fields.cast) updateData.cast = Array.isArray(fields.cast) ? fields.cast : [];
  if (fields.watchProviders) updateData.watchProviders = Array.isArray(fields.watchProviders) ? fields.watchProviders : [];
  if (fields.videos) updateData.videos = Array.isArray(fields.videos) ? fields.videos : [];
  
  // 리뷰 데이터는 별도로 처리되므로 여기서는 제외
  
  // 평가 데이터 처리
  if (fields.reviewRating) updateData.reviewRating = parseFloat(fields.reviewRating);
  if (fields.reviewCount) updateData.reviewCount = parseInt(fields.reviewCount, 10);
  
  // 평점 분포 데이터 처리
  if (fields.ratingDistribution) {
    updateData.ratingDistribution = Array.isArray(fields.ratingDistribution) 
      ? fields.ratingDistribution 
      : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  
  console.log('Processed update data fields:', Object.keys(updateData));
  return updateData;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb', // 파일 크기 제한 증가
    },
  },
};

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Get the directory name using ES modules pattern
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  await dbConnect();

  try {
    switch (method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'PUT':
        await handlePut(req, res);
        break;
      case 'DELETE':
        await handleDelete(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
}

// Handle GET requests to fetch a single TV/Film
async function handleGet(req, res) {
  try {
    const { id } = req.query;
    const { view = false } = req.query;
    
    console.log(`Fetching TVFilm with ID: ${id}`);
    console.log(`쿼리 파라미터 전체: ${JSON.stringify(req.query)}`);
    
    // 수정: ID 형식 확인 로직 완화
    if (!id) {
      console.error('ID 파라미터가 없습니다');
      return res.status(400).json({ success: false, message: 'ID is required' });
    }
    
    let tvfilm;
    let searchMethod = '';
    
    // 1. ObjectId로 검색 시도
    if (mongoose.Types.ObjectId.isValid(id)) {
      console.log(`유효한 ObjectId 형식으로 검색 시도: ${id}`);
      tvfilm = await TVFilm.findById(id).populate('author', 'name email');
      
      if (tvfilm) {
        console.log(`ObjectId로 TVFilm 찾음: ${tvfilm._id}, 제목: ${tvfilm.title}`);
        searchMethod = 'objectId';
      } else {
        console.log(`ObjectId ${id}로 찾지 못했습니다`);
      }
    } else {
      console.log(`${id}는 유효한 ObjectId 형식이 아님`);
    }
    
    // 2. ID로 찾지 못한 경우 정확한 slug 매칭으로 시도
    if (!tvfilm) {
      console.log(`Slug로 검색 시도: ${id}`);
      tvfilm = await TVFilm.findOne({ slug: id }).populate('author', 'name email');
      
      if (tvfilm) {
        console.log(`Slug로 TVFilm 찾음: ${tvfilm._id}, 제목: ${tvfilm.title}`);
        searchMethod = 'slug';
      } else {
        console.log(`Slug ${id}로 찾지 못했습니다`);
      }
    }
    
    // 3. slug의 일부로 검색 시도 (부분 일치)
    if (!tvfilm) {
      console.log(`Partial slug로 검색 시도: ${id}`);
      tvfilm = await TVFilm.findOne({ 
        slug: { $regex: new RegExp(id, 'i') } 
      }).populate('author', 'name email');
      
      if (tvfilm) {
        console.log(`Partial slug로 TVFilm 찾음: ${tvfilm._id}, 제목: ${tvfilm.title}`);
        searchMethod = 'partialSlug';
      } else {
        console.log(`Partial slug ${id}로 찾지 못했습니다`);
      }
    }
    
    // 4. 마지막으로 title로 시도 (정확히 일치)
    if (!tvfilm) {
      console.log(`Title로 정확히 검색 시도: ${id}`);
      tvfilm = await TVFilm.findOne({ title: id }).populate('author', 'name email');
      
      if (tvfilm) {
        console.log(`Title로 TVFilm 찾음: ${tvfilm._id}, 제목: ${tvfilm.title}`);
        searchMethod = 'exactTitle';
      } else {
        console.log(`Title ${id}로 찾지 못했습니다`);
      }
    }
    
    // 5. title에 포함된 문자열로 검색 (부분 일치)
    if (!tvfilm) {
      console.log(`Title에 포함된 문자열로 검색 시도: ${id}`);
      tvfilm = await TVFilm.findOne({ 
        title: { $regex: new RegExp(id, 'i') }
      }).populate('author', 'name email');
      
      if (tvfilm) {
        console.log(`Title 부분 일치로 TVFilm 찾음: ${tvfilm._id}, 제목: ${tvfilm.title}`);
        searchMethod = 'partialTitle';
      } else {
        console.log(`Title 부분 일치로도 ${id}를 찾지 못함`);
        
        // 6. originalTitle로 검색 시도 (부분 일치)
        tvfilm = await TVFilm.findOne({
          originalTitle: { $regex: new RegExp(id, 'i') }
        }).populate('author', 'name email');
        
        if (tvfilm) {
          console.log(`originalTitle 부분 일치로 TVFilm 찾음: ${tvfilm._id}, 제목: ${tvfilm.title}`);
          searchMethod = 'originalTitle';
        } else {
          // 디버깅을 위해 컬렉션의 첫 10개 문서 확인
          const allTvfilms = await TVFilm.find({}, '_id title originalTitle slug').limit(10);
          console.log('데이터베이스의 첫 10개 TVFilm 문서:');
          allTvfilms.forEach(item => {
            console.log(`- ID: ${item._id}, 제목: ${item.title}, 원제: ${item.originalTitle}, slug: ${item.slug}`);
          });
        }
      }
    }
    
    if (!tvfilm) {
      console.error(`TVFilm not found with ID, slug, or title: ${id}`);
      return res.status(404).json({ 
        success: false, 
        message: 'TV/Film not found',
        detail: `No TV/Film found with identifier: ${id}`,
        searchAttempts: [
          'ObjectId lookup',
          'Exact slug match',
          'Partial slug match',
          'Exact title match',
          'Partial title match',
          'Partial originalTitle match'
        ]
      });
    }
    
    console.log(`TVFilm found in database (via ${searchMethod}): ${tvfilm._id}`);
    
    // Fetch reviews for this tvfilm
    const reviews = await Review.find({ tvfilm: tvfilm._id })
      .populate('author', 'name image')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${reviews.length} reviews for TVFilm ${tvfilm._id}`);
    
    // Convert to plain object
    let tvfilmObj = tvfilm.toObject();
    
    // Add reviews to the tvfilm object
    tvfilmObj.reviews = reviews;
    
    // 이미지 URL 보강 및 로깅
    // 커버 이미지 처리
    console.log('Original coverImage URL:', tvfilmObj.coverImage);
    if (tvfilmObj.coverImage && tvfilmObj.coverImage.includes('justwatch.com')) {
      // JustWatch 이미지 URL을 HTTPS로 변환
      if (tvfilmObj.coverImage.startsWith('http://')) {
        tvfilmObj.coverImage = tvfilmObj.coverImage.replace('http://', 'https://');
        console.log('Converted JustWatch coverImage to HTTPS:', tvfilmObj.coverImage);
      }
    } else if (!tvfilmObj.coverImage) {
      tvfilmObj.coverImage = '/images/placeholder-tvfilm.jpg';
      console.log('Using placeholder for coverImage');
    }
    
    // 배너 이미지 처리
    console.log('Original bannerImage URL:', tvfilmObj.bannerImage);
    if (tvfilmObj.bannerImage && tvfilmObj.bannerImage.includes('justwatch.com')) {
      // JustWatch 이미지 URL을 HTTPS로 변환
      if (tvfilmObj.bannerImage.startsWith('http://')) {
        tvfilmObj.bannerImage = tvfilmObj.bannerImage.replace('http://', 'https://');
        console.log('Converted JustWatch bannerImage to HTTPS:', tvfilmObj.bannerImage);
      }
    } else if (!tvfilmObj.bannerImage) {
      tvfilmObj.bannerImage = tvfilmObj.coverImage || '/images/placeholder-tvfilm.jpg';
      console.log('Using coverImage or placeholder for bannerImage');
    }
    
    // 모든 필드가 있는지 확인
    const requiredFields = [
      'title', 'category', 'summary', 'content', 'coverImage', 'bannerImage',
      'cast', 'watchProviders', 'videos', 'reviews', 'tags', 'genres'
    ];
    
    for (const field of requiredFields) {
      if (tvfilmObj[field] === undefined) {
        console.error(`Missing required field: ${field}`);
        // 필드가 없으면 기본값 설정
        if (field === 'cast' || field === 'watchProviders' || field === 'videos' || 
            field === 'reviews' || field === 'tags' || field === 'genres') {
          tvfilmObj[field] = [];
        } else {
          tvfilmObj[field] = '';
        }
      } else if (Array.isArray(tvfilmObj[field])) {
        console.log(`Array field ${field} has ${tvfilmObj[field].length} items`);
      }
    }
    
    // watchProviders 처리 (빈 배열인 경우 초기화 및 logo 필드 추가)
    if (!Array.isArray(tvfilmObj.watchProviders) || tvfilmObj.watchProviders.length === 0) {
      console.log('No watchProviders found, initializing with defaults');
      tvfilmObj.watchProviders = [
        {
          name: 'Netflix',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png',
          type: 'subscription',
          price: '13,500원/월',
          quality: ['HD', '4K', 'HDR'],
          url: 'https://www.netflix.com',
          order: 1
        },
        {
          name: 'Disney+',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
          type: 'subscription',
          price: '9,900원/월',
          quality: ['HD', '4K'],
          url: 'https://www.disneyplus.com',
          order: 2
        },
        {
          name: 'TVING',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/9/95/TVING_logo.png',
          type: 'subscription',
          price: '7,900원/월',
          quality: ['HD'],
          url: 'https://www.tving.com',
          order: 3
        }
      ];
    } else {
      // watchProviders의 logo 필드가 없는 경우 추가
      tvfilmObj.watchProviders = tvfilmObj.watchProviders.map(provider => {
        if (!provider.logo) {
          let logoUrl = '/images/placeholder-image.jpg';
          
          // 스트리밍 서비스별 고품질 로고 이미지 매핑
          if (provider.name.toLowerCase().includes('netflix')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png';
          } else if (provider.name.toLowerCase().includes('disney')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg';
          } else if (provider.name.toLowerCase().includes('tving')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/9/95/TVING_logo.png';
          } else if (provider.name.toLowerCase().includes('wavve')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Wavve_logo.png';
          } else if (provider.name.toLowerCase().includes('watcha')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Watcha_logo.png/800px-Watcha_logo.png';
          } else if (provider.name.toLowerCase().includes('apple')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg';
          } else {
            // 기타 서비스는 도메인 favicon 사용
            const providerUrl = provider.url || '';
            logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(providerUrl)}&sz=128`;
          }
          
          console.log(`Adding logo for provider ${provider.name}: ${logoUrl}`);
          return { ...provider, logo: logoUrl };
        }
        
        return provider;
      });
    }
    
    // videos 처리 (빈 배열인 경우 초기화)
    if (!Array.isArray(tvfilmObj.videos) || tvfilmObj.videos.length === 0) {
      console.log('No videos found, initializing with defaults');
      tvfilmObj.videos = [
        {
          title: '공식 예고편',
          type: 'trailer',
          url: tvfilmObj.trailerUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          order: 1
        }
      ];
    }
    
    // 조회수 업데이트 (view 파라미터가 true일 경우)
    if (view === 'true' || view === true) {
      console.log(`Increasing view count for TVFilm ID: ${id}`);
      await TVFilm.findByIdAndUpdate(id, { $inc: { views: 1 } });
      tvfilmObj.views += 1;
    }
    
    // 누락된 필드 확인 및 추가 (최종 체크)
    const finalResponseFields = {
      title: tvfilmObj.title || '',
      originalTitle: tvfilmObj.originalTitle || '',
      category: tvfilmObj.category || '',
      summary: tvfilmObj.summary || '',
      content: tvfilmObj.content || tvfilmObj.summary || '',
      coverImage: tvfilmObj.coverImage || '/images/placeholder-tvfilm.jpg',
      bannerImage: tvfilmObj.bannerImage || tvfilmObj.coverImage || '/images/placeholder-tvfilm.jpg',
      releaseDate: tvfilmObj.releaseDate || null,
      rating: tvfilmObj.rating || 0,
      runtime: tvfilmObj.runtime || '',
      ageRating: tvfilmObj.ageRating || '',
      director: tvfilmObj.director || '',
      country: tvfilmObj.country || '',
      network: tvfilmObj.network || '',
      status: tvfilmObj.status || 'Ongoing',
      trailerUrl: tvfilmObj.trailerUrl || '',
      cast: Array.isArray(tvfilmObj.cast) ? tvfilmObj.cast : [],
      watchProviders: Array.isArray(tvfilmObj.watchProviders) ? tvfilmObj.watchProviders : [],
      videos: Array.isArray(tvfilmObj.videos) ? tvfilmObj.videos : [],
      tags: Array.isArray(tvfilmObj.tags) ? tvfilmObj.tags : [],
      genres: Array.isArray(tvfilmObj.genres) ? tvfilmObj.genres : [],
      reviews: Array.isArray(tvfilmObj.reviews) ? tvfilmObj.reviews : [],
      reviewRating: tvfilmObj.reviewRating || 0,
      reviewCount: tvfilmObj.reviewCount || 0,
      ratingDistribution: Array.isArray(tvfilmObj.ratingDistribution) ? tvfilmObj.ratingDistribution : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      _id: tvfilmObj._id,
      id: tvfilmObj._id // id 필드 추가 (클라이언트 호환성)
    };
    
    console.log(`Sending API response for TVFilm ${id} with ${Object.keys(finalResponseFields).length} fields`);
    
    res.status(200).json({ success: true, data: finalResponseFields });
  } catch (error) {
    console.error('Error fetching TVFilm:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Add a dislike to a TV/Film
const handleDislike = async (req, res, tvfilm, session) => {
  try {
    if (!session) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Increment the dislikes count
    tvfilm.dislikes += 1;
    await tvfilm.save();

    return res.status(200).json({ success: true, message: 'Dislike added successfully', dislikes: tvfilm.dislikes });
  } catch (error) {
    console.error('Error adding dislike:', error);
    return res.status(500).json({ success: false, message: 'Error adding dislike' });
  }
};

// Add a like to a TV/Film
const handleLike = async (req, res, tvfilm, session) => {
  try {
    if (!session) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Increment the likes count
    tvfilm.likes += 1;
    await tvfilm.save();

    return res.status(200).json({ success: true, message: 'Like added successfully', likes: tvfilm.likes });
  } catch (error) {
    console.error('Error adding like:', error);
    return res.status(500).json({ success: false, message: 'Error adding like' });
  }
};

// Handle PUT request
const handlePutRequest = async (req, res, id, session) => {
  try {
    const { action } = req.body;

    const tvfilm = await TVFilm.findById(id);
    if (!tvfilm) {
      return res.status(404).json({ success: false, message: 'TV/Film not found' });
    }

    // Handle different actions
    switch (action) {
      case 'like':
        return handleLike(req, res, tvfilm, session);
      case 'dislike':
        return handleDislike(req, res, tvfilm, session);
      case 'update':
        return handleUpdate(req, res, tvfilm, session);
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error handling PUT request:', error);
    return res.status(500).json({ success: false, message: 'Error handling PUT request' });
  }
};

// Handle PUT requests to update a TV/Film
async function handlePut(req, res) {
  console.log(`Handling PUT request to /api/tvfilm/${req.query.id}`);
  
  try {
    // 새로운 토큰 검증 함수 사용
    const user = await validateToken(req);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }
    
    const contentType = req.headers['content-type'];
    let updateData = {};
    
    // 수정: ID 유효성 검사 및 tvfilm 조회 로직 변경
    const id = req.query.id;
    console.log(`Updating TVFilm with ID or slug: ${id}`);
    
    // Find the existing TVFilm by ID or slug
    let tvfilm = null;
    
    try {
      // 먼저 ObjectId로 시도
      if (mongoose.Types.ObjectId.isValid(id)) {
        console.log(`유효한 ObjectId 형식으로 검색 시도: ${id}`);
        tvfilm = await TVFilm.findById(id);
        if (tvfilm) {
          console.log(`ObjectId로 TVFilm 찾음: ${tvfilm._id}, 제목: ${tvfilm.title}`);
        } else {
          console.log(`ObjectId ${id}로 찾지 못했습니다`);
        }
      } else {
        console.log(`${id}는 유효한 ObjectId 형식이 아닙니다`);
      }
      
      // ObjectId로 찾지 못했으면 slug로 시도
      if (!tvfilm) {
        console.log(`ObjectId로 찾지 못해 slug로 검색 시도: ${id}`);
        tvfilm = await TVFilm.findOne({ slug: id });
        
        if (tvfilm) {
          console.log(`Slug로 TVFilm 찾음: ${tvfilm._id}, 제목: ${tvfilm.title}`);
        } else {
          console.log(`Slug ${id}로 찾지 못했습니다`);
          
          // 3. 컬렉션에 있는 전체 slug 목록 확인 (디버깅용)
          const allTvfilms = await TVFilm.find({}, 'slug title').limit(10);
          console.log('데이터베이스의 첫 10개 slug 목록:');
          allTvfilms.forEach(item => {
            console.log(`- ${item.slug}: ${item.title}`);
          });
        }
      }
    } catch (findError) {
      console.error(`TVFilm 찾기 오류: ${findError.message}`);
    }
    
    if (!tvfilm) {
      console.error(`TVFilm not found with ID or slug: ${id}`);
      return res.status(404).json({ success: false, message: 'TV/Film not found' });
    }
    
    console.log(`Found TVFilm for update: ${tvfilm._id}, title: ${tvfilm.title}`);
    
    // 폼 데이터 또는 JSON 처리
    if (contentType && contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data request');
      
      try {
        // Parse form data with formidable
        const form = formidable({
          uploadDir: uploadDir,
          keepExtensions: true,
          maxFileSize: 10 * 1024 * 1024, // 10MB limit
        });
        
        const [fields, files] = await form.parse(req);
        
        // formidable v3는 필드와 파일을 배열로 반환하므로 변환 필요
        const parsedFields = {};
        Object.keys(fields).forEach(key => {
          parsedFields[key] = fields[key][0];
        });
        
        const parsedFiles = {};
        Object.keys(files).forEach(key => {
          parsedFiles[key] = files[key][0];
        });
        
        console.log('Form fields:', Object.keys(parsedFields));
        console.log('Uploaded files:', Object.keys(parsedFiles));
        
        // Prepare update data from fields
        updateData = processFields(parsedFields, tvfilm);
        
        // Process uploaded images
        if (files.coverImage) {
          const coverImage = files.coverImage[0];
          const imageDestination = path.join(uploadDir, coverImage.newFilename);
          
          try {
            // Create folder if it doesn't exist
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Copy the file to the destination
            fs.copyFileSync(coverImage.filepath, imageDestination);
            
            // Set the path to be saved in the database
            updateData.coverImage = `/uploads/${coverImage.newFilename}`;
            console.log(`Cover image updated: ${updateData.coverImage}`);
          } catch (error) {
            console.error('Error saving cover image:', error);
            // Continue without updating the image
          }
        } else if (parsedFields.coverImage && parsedFields.coverImage.startsWith('http')) {
          // 외부 URL 유지 (JustWatch URLs 처리)
          updateData.coverImage = parsedFields.coverImage;
          if (parsedFields.coverImage.includes('justwatch.com') && parsedFields.coverImage.startsWith('http://')) {
            // HTTP를 HTTPS로 변환
            updateData.coverImage = parsedFields.coverImage.replace('http://', 'https://');
            console.log(`JustWatch coverImage URL 변환: ${updateData.coverImage}`);
          }
        }
        
        if (files.bannerImage) {
          const bannerImage = files.bannerImage[0];
          const imageDestination = path.join(uploadDir, bannerImage.newFilename);
          
          try {
            // Create folder if it doesn't exist
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // Copy the file to the destination
            fs.copyFileSync(bannerImage.filepath, imageDestination);
            
            // Set the path to be saved in the database
            updateData.bannerImage = `/uploads/${bannerImage.newFilename}`;
            console.log(`Banner image updated: ${updateData.bannerImage}`);
          } catch (error) {
            console.error('Error saving banner image:', error);
            // Continue without updating the image
          }
        } else if (parsedFields.bannerImage && parsedFields.bannerImage.startsWith('http')) {
          // 외부 URL 유지 (JustWatch URLs 처리)
          updateData.bannerImage = parsedFields.bannerImage;
          if (parsedFields.bannerImage.includes('justwatch.com') && parsedFields.bannerImage.startsWith('http://')) {
            // HTTP를 HTTPS로 변환
            updateData.bannerImage = parsedFields.bannerImage.replace('http://', 'https://');
            console.log(`JustWatch bannerImage URL 변환: ${updateData.bannerImage}`);
          }
        }
      } catch (formError) {
        console.error('Error processing form data:', formError);
        return res.status(400).json({ success: false, message: '폼 데이터 처리 중 오류가 발생했습니다.' });
      }
    } else {
      // JSON request 처리
      console.log('Processing JSON request');
      updateData = processFields(req.body, tvfilm);
      
      // 이미지 URL 변환 처리
      if (updateData.coverImage && updateData.coverImage.startsWith('http://')) {
        updateData.coverImage = updateData.coverImage.replace('http://', 'https://');
      }
      
      if (updateData.bannerImage && updateData.bannerImage.startsWith('http://')) {
        updateData.bannerImage = updateData.bannerImage.replace('http://', 'https://');
      }
    }
    
    // Ensure arrays are properly formatted
    if (updateData.watchProviders && Array.isArray(updateData.watchProviders)) {
      updateData.watchProviders = updateData.watchProviders.map(provider => {
        if (!provider.logo) {
          let logoUrl = '/images/placeholder-image.jpg';
          
          // 스트리밍 서비스별 고품질 로고 이미지 매핑
          if (provider.name.toLowerCase().includes('netflix')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png';
          } else if (provider.name.toLowerCase().includes('disney')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg';
          } else if (provider.name.toLowerCase().includes('tving')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/9/95/TVING_logo.png';
          } else if (provider.name.toLowerCase().includes('wavve')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Wavve_logo.png';
          } else if (provider.name.toLowerCase().includes('watcha')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Watcha_logo.png/800px-Watcha_logo.png';
          } else if (provider.name.toLowerCase().includes('apple')) {
            logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg';
          } else {
            // 기타 서비스는 도메인 favicon 사용
            const providerUrl = provider.url || '';
            logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(providerUrl)}&sz=128`;
          }
          
          return { ...provider, logo: logoUrl };
        } else if (provider.logo.includes('justwatch.com') && provider.logo.startsWith('http://')) {
          // JustWatch 이미지 URL 변환
          provider.logo = provider.logo.replace('http://', 'https://');
        }
        return provider;
      });
    }
    
    // Handle videos array - ensure id field doesn't conflict with MongoDB
    if (updateData.videos && Array.isArray(updateData.videos)) {
      updateData.videos = updateData.videos.map(video => {
        // 이미 _id 필드가 있는 비디오는 그대로 유지
        if (video._id) {
          return video;
        }
        
        // MongoDB와 충돌할 수 있는 id 필드를 videoId로 변환
        const { id, ...videoWithoutId } = video;
        
        return {
          ...videoWithoutId,
          videoId: id || `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      });
    }
        
    // 최종 업데이트 수행
    console.log('Final update data keys:', Object.keys(updateData));
    const updatedTVFilm = await TVFilm.findByIdAndUpdate(
      req.query.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
        
    return res.status(200).json({
      success: true,
      message: 'TV/Film updated successfully',
      data: updatedTVFilm
    });
  } catch (error) {
    console.error('Error in handlePut:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Error updating TV/Film',
      error: error.stack  // 디버깅을 위한 스택 추적 정보 포함
    });
  }
}

// Handle DELETE requests to delete a TV/Film
async function handleDelete(req, res) {
  try {
    console.log('============== TVFilm 삭제 요청 시작 ==============');
    console.log('요청 헤더:', JSON.stringify(req.headers));
    console.log('쿼리 ID:', req.query.id);
    
    // 인증 확인 제거됨 (크롤링 작업 편의성을 위해)
    console.log('[TVFilm API] DELETE 토큰 검사 생략됨 - 크롤링 모드');
    
    const id = req.query.id;
    console.log(`요청된 삭제 ID 또는 slug: ${id}`);
    
    // Find TVFilm by ID or slug
    let tvfilm = null;
    
    try {
      // 먼저 ObjectId로 시도
      if (mongoose.Types.ObjectId.isValid(id)) {
        console.log(`유효한 ObjectId 형식으로 검색 시도: ${id}`);
        tvfilm = await TVFilm.findById(id);
      }
      
      // ObjectId로 찾지 못했으면 slug로 시도
      if (!tvfilm) {
        console.log(`ObjectId로 찾지 못해 slug로 검색 시도: ${id}`);
        tvfilm = await TVFilm.findOne({ slug: id });
      }
    } catch (findError) {
      console.error(`TVFilm 찾기 오류: ${findError.message}`);
    }
    
    if (!tvfilm) {
      console.error(`TVFilm not found with ID or slug: ${id}`);
      return res.status(404).json({ success: false, message: 'TV/Film not found' });
    }
    
    // Delete the TVFilm
    console.log(`삭제 시도: TVFilm ID ${tvfilm._id}`);
    const result = await TVFilm.deleteOne({ _id: tvfilm._id });
    
    if (!result || result.deletedCount === 0) {
      console.log('삭제 결과:', result);
      return res.status(404).json({ success: false, message: 'TV/Film not found or could not be deleted' });
    }
    
    console.log(`TVFilm 삭제 성공: ${tvfilm._id}, 제목: ${tvfilm.title}`);
    return res.status(200).json({
      success: true,
      message: 'TV/Film deleted successfully'
    });

  } catch (error) {
    console.error(`TVFilm 삭제 오류: ${error.message}`);
    console.error(error.stack);
    return res.status(500).json({ success: false, message: error.message || 'Error deleting TV/Film' });
  }
}