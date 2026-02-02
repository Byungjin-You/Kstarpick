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
  options.tls = false; // TLS 비활성화 (utils/mongodb.js와 동일하게)
  options.tlsAllowInvalidCertificates = true; // DocumentDB 인증서 검증 비활성화
  options.tlsAllowInvalidHostnames = true; // 호스트네임 검증 비활성화
  options.retryWrites = false; // DocumentDB에서 지원하지 않음
}

let client = null;
let clientPromise = null;

console.log('[실제 런타임 MONGODB_URI]', process.env.MONGODB_URI);

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// 디버깅 로그
console.log('[MongoDB] Connecting to MongoDB with uri:', uri.replace(/:[^:]*@/, ':***@'));
console.log('[MongoDB] Connection options:', { ...options, authMechanism: options.authMechanism, tls: options.tls });

// 새로운 연결 생성 함수
async function createNewConnection() {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[MongoDB] Connection attempt ${attempt}/${maxRetries}`);
      const newClient = new MongoClient(uri, options);
      await newClient.connect();

      // 연결 테스트
      await newClient.db('kstarpick').command({ ping: 1 });
      console.log('[MongoDB] Connection successful and ping test passed');

      return newClient;
    } catch (error) {
      console.error(`[MongoDB] Connection attempt ${attempt} failed:`, error.message);

      if (attempt >= maxRetries) {
        console.error('[MongoDB] All connection attempts failed');
        throw error;
      }

      // 재시도 전 대기 (지수 백오프)
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[MongoDB] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 연결 가져오기 (실패 시 재생성)
async function getClient() {
  // 기존 클라이언트가 있으면 연결 테스트
  if (client) {
    try {
      await client.db('kstarpick').command({ ping: 1 });
      return client;
    } catch (error) {
      console.log('[MongoDB] Existing connection invalid, creating new one');
      try {
        await client.close();
      } catch (e) {
        // ignore close errors
      }
      client = null;
    }
  }

  // 새 연결 생성
  client = await createNewConnection();
  return client;
}

// 초기 연결 시도
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClient) {
    global._mongoClient = null;
  }
  clientPromise = {
    then: async (resolve, reject) => {
      try {
        if (!global._mongoClient) {
          global._mongoClient = await createNewConnection();
        } else {
          // 연결 테스트
          try {
            await global._mongoClient.db('kstarpick').command({ ping: 1 });
          } catch (e) {
            console.log('[MongoDB] Dev connection invalid, recreating...');
            global._mongoClient = await createNewConnection();
          }
        }
        resolve(global._mongoClient);
      } catch (err) {
        reject(err);
      }
    }
  };
} else {
  // Production: 매 요청마다 연결 상태 확인
  clientPromise = {
    then: async (resolve, reject) => {
      try {
        const activeClient = await getClient();
        resolve(activeClient);
      } catch (err) {
        reject(err);
      }
    }
  };
}

// Export
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