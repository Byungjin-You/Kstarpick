# 실서버 DB 연동 가이드

## EC2 서버 연결
```bash
# pem 파일 권한 설정
chmod 400 your-key.pem

# EC2 서버 접속
ssh -i your-key.pem ec2-user@43.202.38.79
```

## 서버에서 실행할 명령어들

### 1. 프로젝트 디렉토리로 이동
```bash
cd /home/ec2-user/kpop-news-portal
```

### 2. MongoDB 연결 파일 업데이트
```bash
# lib/mongodb.js 파일을 다음 내용으로 수정
cat > lib/mongodb.js << 'EOF'
import { MongoClient } from 'mongodb';

// 환경 변수 로드
if (typeof window === 'undefined') {
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env.production' });
}

// 실서버 DocumentDB 연결 (278개 뉴스가 있는 DB)
const uri = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1';
// 로컬 MongoDB인지 DocumentDB인지 확인
const isLocalMongoDB = uri.includes('localhost') || uri.includes('127.0.0.1');

const options = {
  maxPoolSize: 10, // 연결 풀 크기 설정
  serverSelectionTimeoutMS: 30000, // 서버 선택 타임아웃 증가
  socketTimeoutMS: 45000, // 소켓 타임아웃
  connectTimeoutMS: 30000, // 연결 타임아웃 증가
  family: 4, // IPv4 사용 (IPv6 관련 문제 방지)
  useNewUrlParser: true,
  useUnifiedTopology: true
};

// DocumentDB 설정 (원격인 경우만)
if (!isLocalMongoDB) {
  options.authMechanism = 'SCRAM-SHA-1'; // DocumentDB 호환성을 위한 인증 메커니즘
  options.tls = true; // DocumentDB는 TLS 필요
  options.tlsAllowInvalidCertificates = true; // DocumentDB 인증서 검증 비활성화
  options.tlsAllowInvalidHostnames = true; // 호스트네임 검증 비활성화
  options.retryWrites = false; // DocumentDB에서 지원하지 않음
}

let client;
let clientPromise;

console.log('[실제 런타임 MONGODB_URI]', process.env.MONGODB_URI);

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// 디버깅 로그
console.log('[MongoDB] Connecting to MongoDB with uri:', uri.replace(/:[^:]*@/, ':***@'));

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect()
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
  client = new MongoClient(uri, options);
  clientPromise = client.connect()
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

// Direct database connection helper
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const client = await clientPromise;
    // kstarpick 데이터베이스로 강제 연결
    const dbName = 'kstarpick';
    console.log(`[MongoDB] Connecting to database: ${dbName}`);
    
    const db = client.db(dbName);
    
    cachedDb = {
      client,
      db,
    };
    
    console.log(`[MongoDB] Database connection successful: ${dbName}`);
    return cachedDb;
  } catch (error) {
    console.error('[MongoDB] Database connection error:', error);
    throw error;
  }
}
EOF
```

### 3. 환경변수 파일 생성
```bash
# .env.production 파일 생성
cat > .env.production << 'EOF'
MONGODB_URI=mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1
NODE_ENV=production
NEXTAUTH_SECRET=your-nextauth-secret-key
JWT_SECRET=your-jwt-secret-key
ADMIN_KEY=your-admin-key
EOF
```

### 4. DB 연결 테스트
```bash
node -e "
const { connectToDatabase } = require('./lib/mongodb.js');
(async () => {
  try {
    console.log('📡 실서버에서 DocumentDB 연결 테스트...');
    const { client, db } = await connectToDatabase();
    
    const newsCollection = db.collection('news');
    const newsCount = await newsCollection.countDocuments();
    console.log('✅ DB 연결 성공! 뉴스 개수:', newsCount);
    
    // 최근 뉴스 몇 개 확인
    const recentNews = await newsCollection.find({}).sort({ createdAt: -1 }).limit(3).toArray();
    console.log('📰 최근 뉴스 3개:');
    recentNews.forEach((news, idx) => {
      console.log(\`  \${idx + 1}. \${news.title?.slice(0, 50)}...\`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
    process.exit(1);
  }
})();
"
```

### 5. 애플리케이션 재시작
```bash
# PM2가 있는 경우
pm2 restart all

# 또는 Next.js 수동 재시작
pkill -f "next"
sleep 2
npm run build
npm run start
```

### 6. 웹사이트 확인
브라우저에서 https://www.kstarpick.com 접속하여 뉴스 데이터가 정상적으로 표시되는지 확인

## 예상 결과
- DB 연결 성공 시: "✅ DB 연결 성공! 뉴스 개수: 278" (또는 실제 개수)
- 웹사이트에서 뉴스 목록이 정상적으로 표시됨 