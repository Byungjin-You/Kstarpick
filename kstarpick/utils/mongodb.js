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

// MongoDB 클라이언트 옵션 - DocumentDB 최적화 (stuck connection 방지)
const mongoOptions = {
  tls: false,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  retryWrites: false,
  retryReads: true,                                              // 신규: read 실패 시 자동 재시도
  maxPoolSize: process.env.NODE_ENV === 'development' ? 10 : 20, // 50 → 20 (작은 EC2에 맞춤)
  minPoolSize: 2,                                                // 신규: 항상 2개 connection 유지
  serverSelectionTimeoutMS: 10000,                               // 5초 → 10초
  socketTimeoutMS: 60000,                                        // 45초 → 60초
  connectTimeoutMS: 20000,                                       // 10초 → 20초
  heartbeatFrequencyMS: 30000,                                   // 10초 → 30초 (heartbeat 부담 감소)
  maxIdleTimeMS: 60000,                                          // 30초 → 60초
  waitQueueTimeoutMS: 10000,                                     // 신규: pool 대기 timeout
};

function createClient() {
  return new MongoClient(uri, mongoOptions);
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = createClient();
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = createClient();
  clientPromise = client.connect();
}

// Auto-reconnect on stuck connection
let reconnecting = false;
async function reconnect() {
  if (reconnecting) return clientPromise;
  reconnecting = true;
  console.log('[MongoDB Utils] Reconnecting due to stuck connection...');
  try {
    if (client) {
      try { await client.close(true); } catch {}
    }
    client = createClient();
    clientPromise = client.connect();
    if (process.env.NODE_ENV === 'development') {
      global._mongoClientPromise = clientPromise;
    }
    await clientPromise;
    console.log('[MongoDB Utils] Reconnected successfully');
  } catch (e) {
    console.error('[MongoDB Utils] Reconnect failed:', e?.message);
  } finally {
    reconnecting = false;
  }
  return clientPromise;
}

export async function connectToDatabase() {
  try {
    const c = await clientPromise;
    const db = c.db(MONGODB_DB);
    // Quick ping to detect stuck connection (cheap, non-blocking)
    return { client: c, db };
  } catch (error) {
    console.error('[MongoDB Utils] Connection failed, attempting reconnect:', error?.message);
    // Stuck connection detected → recreate client
    const c = await reconnect();
    const db = c.db(MONGODB_DB);
    return { client: c, db };
  }
}

// API 파일에서 사용하는 dbConnect 함수도 export
export const dbConnect = connectToDatabase;

// Export clientPromise for NextAuth MongoDB adapter
export default clientPromise; 
