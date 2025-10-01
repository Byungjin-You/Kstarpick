import { MongoClient } from 'mongodb';

// 로컬 개발 전용 MongoDB 연결 설정
const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalDev = process.env.IS_LOCAL_DEV === 'true';

// 환경에 따른 URI 설정
let uri;
if (isDevelopment && isLocalDev) {
  // 로컬 개발 환경
  uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kstarpick_dev';
} else {
  // 프로덕션 환경 (기존 설정 유지)
  uri = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1';
}

const isLocalMongoDB = uri.includes('localhost') || uri.includes('127.0.0.1');

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// 로컬이 아닌 경우 DocumentDB 설정
if (!isLocalMongoDB) {
  options.authMechanism = 'SCRAM-SHA-1';
  options.retryWrites = false;
}

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;