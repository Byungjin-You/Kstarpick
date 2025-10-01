// MongoDB 연결 유틸리티 - 환경에 따라 다른 연결 사용
import { MongoClient } from 'mongodb';

// 환경 확인
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalDev = process.env.IS_LOCAL_DEV === 'true';

// 로컬 개발 환경인지 확인
export function isLocalEnvironment() {
  return isDevelopment && isLocalDev;
}

// MongoDB URI 가져오기
export function getMongoUri() {
  if (isLocalEnvironment()) {
    // 로컬 개발 환경 - 로컬 MongoDB 사용
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/kstarpick_dev';
  } else {
    // 프로덕션 또는 일반 개발 환경 - 기존 설정 유지
    return process.env.MONGODB_URI;
  }
}

// MongoDB 옵션 가져오기
export function getMongoOptions() {
  const uri = getMongoUri();
  const isLocalMongoDB = uri && (uri.includes('localhost') || uri.includes('127.0.0.1'));

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  };

  // 로컬이 아닌 경우 DocumentDB 설정
  if (!isLocalMongoDB) {
    options.authMechanism = 'SCRAM-SHA-1';
    options.retryWrites = false;
    options.authSource = 'admin';
  }

  return options;
}

// 빠른 MongoDB 연결 함수
export async function getMongoConnection() {
  const uri = getMongoUri();

  if (!uri) {
    console.error('[MongoDB] URI가 정의되지 않았습니다.');
    throw new Error('MongoDB URI is not defined');
  }

  const options = getMongoOptions();

  console.log('[MongoDB] 연결 시도:', {
    isLocal: isLocalEnvironment(),
    uriPreview: uri ? uri.substring(0, 30) + '...' : 'undefined'
  });

  try {
    const client = new MongoClient(uri, options);
    await client.connect();
    return client;
  } catch (error) {
    console.error('[MongoDB] 연결 실패:', error.message);
    throw error;
  }
}