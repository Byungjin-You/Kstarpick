import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

// 환경변수 명시적 로딩
if (typeof window === 'undefined') {
  const dotenv = require('dotenv');
  
  // 환경에 따른 env 파일 로딩
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
  const envPath = path.resolve(process.cwd(), envFile);
  
  if (fs.existsSync(envPath)) {
    console.log(`[MongoDB Utils] Loading env from: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error(`[MongoDB Utils] Error loading env file:`, result.error);
    }
  } else {
    console.warn(`[MongoDB Utils] Env file not found: ${envPath}`);
  }
}

const uri = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1';
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

console.log('[MongoDB Utils] =====================');
console.log('[MongoDB Utils] NODE_ENV:', process.env.NODE_ENV);
console.log('[MongoDB Utils] MONGODB_URI exists:', !!uri);
console.log('[MongoDB Utils] MONGODB_URI length:', uri ? uri.length : 0);
console.log('[MongoDB Utils] MONGODB_DB:', MONGODB_DB);
console.log('[MongoDB Utils] =====================');

let client;
let clientPromise;

// MongoDB 클라이언트 옵션 - 최신 드라이버 호환
const mongoOptions = {
  tls: false,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  retryWrites: false,
  maxPoolSize: process.env.NODE_ENV === 'development' ? 10 : 50,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  // 지원되지 않는 옵션들을 제거하고 새로운 옵션들 추가
  heartbeatFrequencyMS: 10000,
  maxIdleTimeMS: 30000,
};

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, mongoOptions);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, mongoOptions);
  clientPromise = client.connect();
}

export async function connectToDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db(MONGODB_DB);
    return { client, db };
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}

// API 파일에서 사용하는 dbConnect 함수도 export
export const dbConnect = connectToDatabase;

// Export clientPromise for NextAuth MongoDB adapter
export default clientPromise; 
