import { MongoClient, ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth/next';
import slugify from 'slugify';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Import the authOptions config
import { authOptions } from '../auth/[...nextauth]';

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

if (!MONGODB_URI) {
  console.error('[News API] MONGODB_URI environment variable is not defined');
  throw new Error('MONGODB_URI environment variable is not defined');
}

// Configure formidable options
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * @swagger
 * /api/news:
 *   get:
 *     description: Retrieves a list of news articles
 *     responses:
 *       200:
 *         description: List of news articles
 *   post:
 *     description: Creates a new news article
 *     responses:
 *       201:
 *         description: News article created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
export default async function handler(req, res) {
  console.log('[DEBUG] News API 호출됨, 메소드:', req.method, ', URL:', req.url);
  console.log('[DEBUG] Headers:', JSON.stringify(req.headers, null, 2));
  
  // GET 요청은 인증 없이 바로 처리
  if (req.method === 'GET') {
    console.log('[DEBUG] GET 요청 - getNews로 이동');
    return getNews(req, res);
  }

  console.log('[DEBUG] GET 요청이 아님 - 인증 체크로 이동');
  
  // SSR 내부 호출인지 확인
  const isInternalSSR = req.headers['x-internal-ssr'] === 'true';
  
  try {
    // 세션 확인 먼저 시도
    const session = await getServerSession(req, res, authOptions);
    console.log('[DEBUG] 세션 확인:', session ? `있음 (${session.user?.email})` : '없음');

    // 세션이 있으면 세션 기반 인증 사용
    if (session) {
      // admin 또는 editor 권한 확인
      if (session.user.role !== 'admin' && session.user.role !== 'editor') {
        return res.status(403).json({ message: '권한이 없습니다.' });
      }
      // 세션 인증 성공 - createNews로 이동
      if (req.method === 'POST') {
        return createNews(req, res, session);
      }
      return res.status(405).json({ message: '지원하지 않는 메소드입니다.' });
    }

    // 세션이 없는 경우 토큰 기반 인증 시도 (SSR 내부 호출이 아닌 경우)
    if (!isInternalSSR) {
      console.log('[DEBUG] 인증 토큰 체크 시작');
      try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          console.log('[DEBUG] 토큰 없음 - 인증 오류 반환');
          return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isAdmin) {
          return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
        }

        // 토큰에서 세션 정보 생성
        const tokenSession = {
          user: {
            id: decoded.userId || 'token-user',
            email: decoded.email || 'admin@kstarpick.com',
            name: decoded.name || 'Admin',
            role: 'admin',
            image: ''
          }
        };

        if (req.method === 'POST') {
          return createNews(req, res, tokenSession);
        }
      } catch (error) {
        console.log('[DEBUG] 토큰 검증 실패:', error.message);
        return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
      }
    }

    // 세션도 없고 토큰도 유효하지 않음
    return res.status(401).json({ message: '로그인이 필요합니다.' });
    
  } catch (error) {
    console.error('API 핸들러 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
  }
}

async function getNews(req, res) {
  let client;
  
  try {
    console.log('[News API] === 네이티브 MongoDB 연결 시작 ===');
    console.log('[News API] NODE_ENV:', process.env.NODE_ENV);
    
    // MongoDB 클라이언트 연결 - 로컬/프로덕션 환경 구분
    const isLocal = process.env.NODE_ENV === 'development' && MONGODB_URI.includes('localhost');
    const options = isLocal ? {
      // 로컬 MongoDB 옵션
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    } : {
      // 프로덕션 DocumentDB 옵션
      retryWrites: false,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1',
    };

    client = new MongoClient(MONGODB_URI, options);
    
    await client.connect();
    console.log('[News API] MongoDB 연결 성공');
    
    const db = client.db(MONGODB_DB);
    
    // 파라미터 추출
    const {
      page = 1,
      limit = 10,
      category,
      featured,
      sort = 'publishedAt',
      order = 'desc',
      fields,
      title,
      createdAfter,
      createdBefore,
      adminMode = 'false' // 어드민 모드 파라미터 추가
    } = req.query;
    
    // 검색 쿼리 구성
    const query = {};
    const andConditions = [];
    
    // 카테고리 필터
    if (category && category !== 'all') {
      andConditions.push({ category: category });
    }
    
    // 피처드 필터
    if (featured === 'true') {
      andConditions.push({ featured: true });
    }
    
    // 오류가 발생한 뉴스 필터링 (어드민 모드가 아닐 때만 적용)
    if (adminMode !== 'true') {
    andConditions.push({
      $or: [
        { title: { $exists: true, $ne: '', $ne: null } },
        { title: { $exists: false } }
      ]
    });
    
    andConditions.push({
      $or: [
        { content: { $exists: false } },
        { content: { $ne: '<p>상세 기사를 가져오는 중 오류가 발생했습니다. 원본 페이지를 방문해 주세요.</p>' } },
        { content: { $not: { $regex: '^<p>상세 기사를 가져오는 중 오류가 발생했습니다' } } }
      ]
    });
    }
    
    // 제목 검색 기능 추가
    if (title) {
      andConditions.push({ title: { $regex: title, $options: 'i' } });
      
      // 'Watch:' 키워드 검색 시 최근 3일 필터 추가
      if (title.toLowerCase().includes('watch:')) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        andConditions.push({
          $or: [
            { publishedAt: { $gte: threeDaysAgo } },
            { createdAt: { $gte: threeDaysAgo } }
          ]
        });
        
        console.log(`[API] Watch 뉴스 검색 - 최근 3일 필터 적용:`, threeDaysAgo.toISOString());
      }
    }
    
    // 날짜 범위 필터 추가
    if (createdAfter || createdBefore) {
      const dateFilter = {};
      if (createdAfter) {
        dateFilter.$gte = new Date(createdAfter);
      }
      if (createdBefore) {
        dateFilter.$lte = new Date(createdBefore);
      }
      andConditions.push({ createdAt: dateFilter });
    }
    
    // 최종 쿼리 구성
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }
    
    // 정렬 및 페이지네이션
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 정렬 옵션 설정
    const sortOption = {};
    sortOption[sort] = order === 'asc' ? 1 : -1;
    
    // 프로젝션 옵션 설정 (반환할 필드)
    let projection = null;
    if (fields) {
      projection = {};
      const fieldsList = fields.split(',').map(field => field.trim());
      fieldsList.forEach(field => {
        projection[field] = 1;
      });
      console.log(`[API] 필드 필터링:`, projection);
    }
    
    console.log(`[API] 뉴스 조회, 정렬: ${sort}, 순서: ${order}, 쿼리:`, query);
    
    // Watch 뉴스 검색 시 랜덤 선택 로직
    let news;
    if (title && title.toLowerCase().includes('watch:')) {
      // Watch 뉴스는 랜덤하게 선택
      const newsQuery = db.collection('news').find(query);
      
      // 필드 프로젝션이 있는 경우 적용
      if (projection) {
        newsQuery.project(projection);
      }
      
      // 먼저 모든 결과를 가져온 후 랜덤하게 섞기
      const allWatchNews = await newsQuery.sort(sortOption).toArray();
      
      console.log(`[API] Watch 뉴스 후보: ${allWatchNews.length}개`);
      
      // 배열을 랜덤하게 섞기
      const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
      };
      
      const shuffledNews = shuffleArray(allWatchNews);
      news = shuffledNews.slice(skip, skip + parseInt(limit));
      
      console.log(`[API] 랜덤 선택된 Watch 뉴스: ${news.length}개`);
    } else {
      // 일반 뉴스는 기존 로직 사용
      const newsQuery = db.collection('news').find(query);
      
      // 필드 프로젝션이 있는 경우 적용
      if (projection) {
        newsQuery.project(projection);
      }
      
      // 정렬, 페이지네이션 적용 후 결과 조회
      news = await newsQuery
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();
    }
    
    // 전체 개수 조회
    const total = await db.collection('news').countDocuments(query);
    
    console.log(`[News API] 뉴스 조회 완료: ${news.length}개, 전체: ${total}개`);
    
    return res.status(200).json({
      success: true,
      data: {
        news,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[News API] 뉴스 조회 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    if (client) {
      await client.close();
      console.log('[News API] MongoDB 연결 종료');
    }
  }
}

async function createNews(req, res, session) {
  let client;

  try {
    console.log('[createNews] === 네이티브 MongoDB 연결 시작 ===');

    // MongoDB 클라이언트 연결 - 로컬/프로덕션 환경 구분
    const isLocal = process.env.NODE_ENV === 'development' && MONGODB_URI.includes('localhost');
    const options = isLocal ? {
      // 로컬 MongoDB 옵션
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    } : {
      // 프로덕션 DocumentDB 옵션
      retryWrites: false,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1',
    };

    client = new MongoClient(MONGODB_URI, options);

    await client.connect();
    console.log('[createNews] MongoDB 연결 성공');

    const db = client.db(MONGODB_DB);

    // Content-Type 확인하여 JSON 또는 FormData 처리 분기
    const contentType = req.headers['content-type'] || '';

    // JSON 요청인 경우 (my1pick 발행 등)
    if (contentType.includes('application/json')) {
      console.log('[createNews] JSON 요청 처리');

      // body를 직접 파싱
      let body = '';
      await new Promise((resolve, reject) => {
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', resolve);
        req.on('error', reject);
      });

      const jsonData = JSON.parse(body);
      console.log('[createNews] JSON data received:', jsonData);

      // 필수 필드 검증
      const requiredFields = ['title', 'content', 'coverImage'];
      for (const field of requiredFields) {
        if (!jsonData[field]) {
          if (client) await client.close();
          return res.status(400).json({
            success: false,
            message: `${field} 필드는 필수입니다.`,
          });
        }
      }

      // 기사 slug 생성
      const slug = slugify(jsonData.title, {
        lower: true,
        strict: true,
      });

      // 뉴스 데이터 준비
      // body에서 author가 전달되면 사용, 아니면 세션 사용자 정보 사용
      const authorData = jsonData.author || {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image || '',
      };

      const newsData = {
        title: jsonData.title,
        summary: jsonData.summary || jsonData.title,
        content: jsonData.content,
        slug: slug,
        coverImage: jsonData.coverImage,
        category: jsonData.category || 'general',
        tags: jsonData.tags || [],
        featured: jsonData.featured || false,
        source: jsonData.source || 'kstarpick',
        author: authorData,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      };

      // 데이터베이스에 뉴스 저장
      const result = await db.collection('news').insertOne(newsData);

      if (client) await client.close();
      console.log('[createNews] MongoDB 연결 종료');

      return res.status(201).json({
        success: true,
        message: '뉴스가 성공적으로 등록되었습니다.',
        _id: result.insertedId,
        news: { ...newsData, _id: result.insertedId },
      });
    }

    // FormData 요청인 경우 (기존 로직)
    // formidable 설정
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
    });

    return new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('[createNews] Form parse error:', err);
          return resolve(res.status(500).json({ message: '파일 처리 중 오류가 발생했습니다.' }));
        }

        try {
          console.log('[createNews] Fields received:', fields);

        // formidable은 모든 필드를 배열로 전달하므로 문자열로 변환
        const processedFields = {};
        Object.keys(fields).forEach(key => {
          processedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
        });
        
        // 필수 필드 검증
        const requiredFields = ['title', 'summary', 'content', 'category'];
        for (const field of requiredFields) {
          if (!processedFields[field]) {
            return resolve(res.status(400).json({
              message: `${field} 필드는 필수입니다.`,
            }));
          }
        }

        // 태그 처리
        let tags = [];
        if (processedFields.tags) {
          try {
            tags = JSON.parse(processedFields.tags);
          } catch (e) {
            console.error('[createNews] Error parsing tags:', e);
            tags = [];
          }
        }

        // 이미지 URL 처리
        let coverImage = '';
        
        if (processedFields.coverImageUrl) {
          try {
            // URL이 제공된 경우 - URL 정리
            coverImage = cleanImageUrl(processedFields.coverImageUrl);
            console.log('[createNews] Using provided image URL:', coverImage);
          } catch (error) {
            console.error('[createNews] Error processing image URL:', error);
            return resolve(res.status(400).json({
              message: '이미지 URL 처리 중 오류가 발생했습니다.',
            }));
          }
        } else if (files.file) {
          // 파일이 업로드된 경우
          const file = files.file;
          console.log('[createNews] File uploaded:', file.originalFilename);
          
          // 유효한 이미지 파일 확인
          const validFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if (!validFileTypes.includes(file.mimetype)) {
            return resolve(res.status(400).json({
              message: '유효한 이미지 파일이 아닙니다. (JPEG, PNG, GIF, WebP만 허용됩니다)',
            }));
          }

          // 업로드 디렉토리 확인 및 생성
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          // 파일명 생성
          const timestamp = Date.now();
          const ext = path.extname(file.originalFilename);
          const newFilename = `news-${timestamp}${ext}`;
          const newPath = path.join(uploadDir, newFilename);

          // 파일 저장
          try {
            fs.copyFileSync(file.filepath, newPath);
            coverImage = `/uploads/${newFilename}`;
            console.log('[createNews] File saved to:', coverImage);
          } catch (error) {
            console.error('[createNews] Error saving file:', error);
            return resolve(res.status(500).json({
              message: '파일 저장 중 오류가 발생했습니다.',
            }));
          }
        } else {
          // 이미지가 제공되지 않은 경우
          return resolve(res.status(400).json({
            message: '커버 이미지를 업로드하거나 URL을 입력해주세요.',
          }));
        }

        // 세션에서 유저 정보 가져오기
        if (!session || !session.user) {
          return resolve(res.status(401).json({ message: '인증되지 않은 사용자입니다.' }));
        }

        // 기사 slug 생성
        const slug = slugify(processedFields.title, {
          lower: true,
          strict: true,
        });

        // 뉴스 데이터 준비
        const newsData = {
          title: processedFields.title,
          summary: processedFields.summary,
          content: processedFields.content,
          slug: slug,
          coverImage: coverImage,
          category: processedFields.category,
          tags: tags,
          featured: processedFields.featured === 'true',
          author: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image || '',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        console.log('[createNews] News data to be inserted:', newsData);

        // 데이터베이스에 뉴스 저장
        const result = await db.collection('news').insertOne(newsData);

        return resolve(res.status(201).json({
          message: '뉴스가 성공적으로 등록되었습니다.',
          news: { ...newsData, _id: result.insertedId },
        }));

        } catch (error) {
          console.error('[createNews] Unexpected error:', error);
          return resolve(res.status(500).json({
            message: '서버 오류가 발생했습니다.',
            error: error.message,
          }));
        } finally {
          // MongoDB 연결 종료
          if (client) {
            await client.close();
            console.log('[createNews] MongoDB 연결 종료');
          }
        }
      });
    });
  } catch (error) {
    console.error('[createNews] 전체 오류:', error);
    if (client) {
      await client.close();
      console.log('[createNews] MongoDB 연결 종료 (오류 시)');
    }
    return res.status(500).json({
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  }
}

// 이미지 URL 정리 함수
function cleanImageUrl(url) {
  try {
    if (!url) return '';
    
    // URL 타입 확인 및 문자열로 변환
    const urlStr = String(url).trim();
    console.log('[cleanImageUrl] Converted URL:', urlStr);
    
    // URL이 유효한지 확인
    try {
      new URL(urlStr);
    } catch (e) {
      console.error('[cleanImageUrl] Invalid URL format:', urlStr);
      return urlStr;
    }
    
    // Soompi URL 처리 (쿼리 파라미터 제거 검토)
    if (urlStr.includes('soompi.io') || urlStr.includes('soompi.com')) {
      // 필수 쿼리 파라미터만 유지 (예: s=900x600)
      const urlObj = new URL(urlStr);
      if (urlObj.search) {
        // 필요한 쿼리 파라미터만 유지하거나, 
        // 현재는 모든 쿼리 파라미터 유지
      }
    }
    
    return urlStr;
  } catch (error) {
    console.error('[cleanImageUrl] Unexpected error:', error);
    // 오류 발생 시 원본 값 반환
    return typeof url === 'string' ? url : '';
  }
} 