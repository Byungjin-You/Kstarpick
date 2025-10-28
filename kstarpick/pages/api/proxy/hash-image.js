import crypto from 'crypto';
import { MongoClient } from 'mongodb';

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

if (!MONGODB_URI) {
  console.error('[Hash Image API] MONGODB_URI environment variable is not defined');
  throw new Error('MONGODB_URI environment variable is not defined');
}

// URL을 해시로 변환
function createImageHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { hash } = req.query;

  if (!hash) {
    return res.status(400).json({ error: 'Hash parameter is required' });
  }

  let client;

  try {
    console.log('[Hash Image API] === 네이티브 MongoDB 연결 시작 ===');
    
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
    console.log('[Hash Image API] MongoDB 연결 성공');
    
    const db = client.db(MONGODB_DB);
    
    // MongoDB에서 해시에 해당하는 원본 URL 찾기
    const collection = db.collection('image_hashes');
    
    const imageRecord = await collection.findOne({ hash });
    
    if (!imageRecord) {
      console.log(`[Hash Image API] 해시를 찾을 수 없음: ${hash}`);

      // 로컬 개발 환경에서는 기본 이미지 사용
      if (process.env.NODE_ENV === 'development' || process.env.IS_LOCAL_DEV === 'true') {
        console.log('[Hash Image API] 로컬 개발 환경 - 기본 이미지 리다이렉트');
        // 기본 뉴스 이미지로 리다이렉트
        return res.redirect(307, '/images/news/default-news.jpg');
      }

      return res.status(404).json({ error: 'Image hash not found' });
    }

    const originalUrl = imageRecord.url;
    console.log(`[Hash Image API] 원본 URL 찾음: ${originalUrl}`);

    // 외부 이미지 가져오기
    const response = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.soompi.com/',
      },
    });

    if (!response.ok) {
      console.log(`[Hash Image API] 이미지 가져오기 실패: ${response.status}`);
      return res.status(404).json({ error: 'Image not found' });
    }

    const contentType = response.headers.get('content-type');
    
    // 이미지 타입 검증
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`[Hash Image API] 잘못된 콘텐츠 타입: ${contentType}`);
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // 캐시 헤더 설정 (24시간)
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', contentType);
    
    // 이미지 데이터 스트리밍
    const buffer = await response.arrayBuffer();
    console.log(`[Hash Image API] 이미지 전송 성공: ${buffer.byteLength} bytes`);
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('[Hash Image API] 이미지 프록시 오류:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  } finally {
    if (client) {
      await client.close();
      console.log('[Hash Image API] MongoDB 연결 종료');
    }
  }
} 