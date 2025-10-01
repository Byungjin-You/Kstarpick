import { MongoClient } from 'mongodb';

// 환경 변수 로드
if (typeof window === 'undefined') {
  const dotenv = require('dotenv');
  dotenv.config({ path: './.env.local' });
  dotenv.config({ path: './.env.production' });
}

// 실서버 DocumentDB 연결 (278개 뉴스가 있는 DB)
const uri = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1';
// 로컬 MongoDB인지 DocumentDB인지 확인
const isLocalMongoDB = uri.includes('localhost') || uri.includes('127.0.0.1');

const options = {
  maxPoolSize: 10, // 연결 풀 크기 감소 (50 → 10) - DocumentDB 안정성 향상
  minPoolSize: 2, // 최소 연결 풀 크기 감소
  serverSelectionTimeoutMS: 10000, // 서버 선택 타임아웃 증가 (5초 → 10초)
  socketTimeoutMS: 30000, // 소켓 타임아웃 증가 (10초 → 30초)
  connectTimeoutMS: 10000, // 연결 타임아웃 증가 (5초 → 10초)
  family: 4, // IPv4 사용 (IPv6 관련 문제 방지)
  // DocumentDB 최적화 옵션
  maxIdleTimeMS: 60000, // 유휴 연결 타임아웃 증가 (30초 → 60초)
  retryWrites: false, // DocumentDB에서 지원하지 않음
  readPreference: 'primary', // 읽기 선호도 설정
  compressors: ['zlib'], // 배열 형태로 수정
  // 재연결 옵션 추가 - 최신 드라이버 호환
  heartbeatFrequencyMS: 30000, // 하트비트 주기 증가 (30초)
  // 연결 안정성 옵션
  monitorCommands: false, // 명령 모니터링 비활성화
};

// DocumentDB 설정 (원격인 경우만)
if (!isLocalMongoDB) {
  options.authMechanism = 'SCRAM-SHA-1'; // DocumentDB 호환성을 위한 인증 메커니즘
  options.tls = true; // DocumentDB는 TLS 필요
  options.tlsAllowInvalidCertificates = true; // DocumentDB 인증서 검증 비활성화
  options.tlsAllowInvalidHostnames = true; // 호스트네임 검증 비활성화
  options.retryWrites = false; // DocumentDB에서 지원하지 않음
  // DocumentDB 전용 추가 옵션
  options.tlsCAFile = undefined; // CA 파일 사용 안함
  options.tlsCertificateKeyFile = undefined; // 인증서 키 파일 사용 안함
}

let client;
let clientPromise;

console.log('[실제 런타임 MONGODB_URI]', process.env.MONGODB_URI);

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// 디버깅 로그
console.log('[MongoDB] Connecting to MongoDB with uri:', uri.replace(/:[^:]*@/, ':***@'));
console.log('[MongoDB] Connection options:', { ...options, authMechanism: options.authMechanism, tls: options.tls });

// 연결 재시도 함수
async function createConnection() {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`[MongoDB] Connection attempt ${retryCount + 1}/${maxRetries}`);
      const client = new MongoClient(uri, options);
      await client.connect();
      
      // 연결 테스트
      await client.db('kstarpick').admin().ping();
      console.log('[MongoDB] Connection successful and ping test passed');
      
      // 연결 이벤트 리스너 추가
      client.on('error', (err) => {
        console.error('[MongoDB] Client error:', err);
      });
      
      client.on('close', () => {
        console.log('[MongoDB] Connection closed');
      });
      
      client.on('reconnect', () => {
        console.log('[MongoDB] Reconnected to MongoDB');
      });
      
      return client;
    } catch (error) {
      retryCount++;
      console.error(`[MongoDB] Connection attempt ${retryCount} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        console.error('[MongoDB] All connection attempts failed');
        throw error;
      }
      
      // 재시도 전 대기 (지수 백오프)
      const delay = Math.pow(2, retryCount) * 1000; // 2초, 4초, 8초
      console.log(`[MongoDB] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createConnection()
      .then((client) => {
        console.log('[MongoDB] Successfully connected to MongoDB (development)');
        return client;
      })
      .catch(err => {
        console.error('[MongoDB] Connection error (development):', err);
        throw err;
      });
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = createConnection()
    .then((client) => {
      console.log('[MongoDB] Successfully connected to MongoDB (production)');
      return client;
    })
    .catch(err => {
      console.error('[MongoDB] Connection error (production):', err);
      throw err;
    });
}

// Export a module-scoped connection promise
export default clientPromise;

// Direct database connection helper with retry logic
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) {
    // 기존 연결이 유효한지 확인
    try {
      await cachedDb.client.db('kstarpick').admin().ping();
      return cachedDb;
    } catch (error) {
      console.log('[MongoDB] Cached connection invalid, creating new connection');
      cachedDb = null;
    }
  }

  try {
    const client = await clientPromise;
    // kstarpick 데이터베이스로 강제 연결
    const dbName = 'kstarpick';
    console.log(`[MongoDB] Connecting to database: ${dbName}`);
    
    const db = client.db(dbName);
    
    // 연결 테스트
    await db.admin().ping();
    
    cachedDb = {
      client,
      db,
    };
    
    console.log(`[MongoDB] Database connection successful: ${dbName}`);
    return cachedDb;
  } catch (error) {
    console.error('[MongoDB] Database connection error:', error);
    // 캐시 초기화
    cachedDb = null;
    throw error;
  }
} 