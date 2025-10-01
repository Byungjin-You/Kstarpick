import { MongoClient, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

/**
 * 콘텐츠(드라마/영화) 정보를 데이터베이스에 추가하는 스크립트
 * 
 * 사용 방법:
 * node scripts/addContent.mjs "타입" "제목" "요약"
 * 예: node scripts/addContent.mjs "drama" "레지던트 플레이북 2025" "젊은 의사들의 병원 생활을 그린 의학 드라마"
 * 또는: node scripts/addContent.mjs "movie" "위대한 패왕" "고대 왕국의 부흥을 그린 역사 영화"
 */

// MongoDB 연결
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kpop-news-portal';
  const client = new MongoClient(uri, {
    useUnifiedTopology: true,
  });
  
  try {
    await client.connect();
    console.log('MongoDB에 연결되었습니다');
    const db = client.db();
    return { client, db };
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
    throw error;
  }
}

// 관리자 사용자 ID 찾기
async function findAdminUserId(db) {
  try {
    const admin = await db.collection('users').findOne({ role: 'admin' });
    if (admin) {
      console.log(`관리자 사용자를 찾았습니다. ID: ${admin._id}`);
      return admin._id;
    } else {
      console.log('관리자 사용자를 찾을 수 없어 새 ObjectId를 생성합니다.');
      return new ObjectId();
    }
  } catch (error) {
    console.error('관리자 사용자 검색 중 오류:', error);
    return new ObjectId();
  }
}

// 콘텐츠 정보 생성
async function createContentData(db, type, title, summary) {
  const slug = title.toLowerCase().replace(/\s+/g, '-') + '-' + new Date().getFullYear();
  const adminId = await findAdminUserId(db);
  
  return {
    title: title,
    originalTitle: title + ' (원제목)',
    slug,
    contentType: type, // 'drama' 또는 'movie'
    content: `<p>${summary}</p><p>이 콘텐츠는 ${type === 'drama' ? '드라마' : '영화'}로, 많은 시청자들에게 사랑받고 있습니다. 뛰어난 연출과 배우들의 연기가 돋보이는 작품입니다.</p>`,
    summary: summary,
    coverImage: '/images/placeholder-tvfilm.svg',
    bannerImage: '/images/placeholder-tvfilm.svg',
    trailerUrl: '',
    releaseDate: new Date(),
    status: 'ongoing',
    network: type === 'drama' ? 'tvN' : '',
    director: '김철수',
    country: '대한민국',
    runtime: type === 'drama' ? '60분' : '120분',
    ageRating: '15', // 유효한 enum 값으로 변경
    tags: ['인기', '추천', type === 'drama' ? '드라마' : '영화'],
    genres: type === 'drama' ? ['의학', '로맨스'] : ['액션', '모험'],
    cast: [
      { name: '이지은', role: '주인공', profileImage: '/images/placeholder-tvfilm.svg' },
      { name: '김민준', role: '남자 주인공', profileImage: '/images/placeholder-tvfilm.svg' }
    ],
    watchProviders: [
      { 
        name: 'Netflix', 
        type: 'subscription',
        url: 'https://netflix.com', 
        logo: '/images/netflix-logo.png' 
      }
    ],
    videos: [
      { title: '공식 예고편', url: 'https://www.youtube.com/watch?v=example', type: 'trailer' }
    ],
    featured: true,
    author: adminId, // ObjectId로 지정
    lang: 'ko',
    createdAt: new Date(),
    updatedAt: new Date(),
    ratingDistribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    reviewCount: 0,
    reviewRating: 0
  };
}

// 콘텐츠 정보를 데이터베이스에 저장하는 함수
async function saveContentToDB(db, contentData) {
  try {
    // 같은 slug의 콘텐츠가 이미 있는지 확인
    const existingContent = await db.collection('contents').findOne({ slug: contentData.slug });
    
    if (existingContent) {
      console.log(`"${contentData.title}"는 이미 데이터베이스에 존재합니다. ID: ${existingContent._id}`);
      return existingContent;
    }
    
    // 새 콘텐츠 추가
    const result = await db.collection('contents').insertOne(contentData);
    
    console.log(`"${contentData.title}" 데이터베이스에 저장 완료. ID: ${result.insertedId}`);
    return { _id: result.insertedId, ...contentData };
    
  } catch (error) {
    console.error(`"${contentData.title}" 저장 중 오류 발생:`, error);
    return null;
  }
}

// 메인 함수
async function main() {
  let client;
  
  try {
    // 명령줄에서 콘텐츠 정보를 가져옴
    const [contentType, title, summary] = process.argv.slice(2);
    
    if (!contentType || !title || !summary) {
      console.error('콘텐츠 타입, 제목, 요약을 모두 입력해주세요.');
      console.log('사용법: node scripts/addContent.mjs "타입" "제목" "요약"');
      console.log('예: node scripts/addContent.mjs "drama" "레지던트 플레이북" "의학 드라마"');
      process.exit(1);
    }
    
    if (contentType !== 'drama' && contentType !== 'movie') {
      console.error('콘텐츠 타입은 "drama" 또는 "movie"만 가능합니다.');
      process.exit(1);
    }
    
    console.log(`"${title}" (${contentType}) 콘텐츠를 처리합니다...`);
    
    // MongoDB 연결
    const { client: mongoClient, db } = await connectToDatabase();
    client = mongoClient;
    
    // 콘텐츠 데이터 생성 및 저장
    const contentData = await createContentData(db, contentType, title, summary);
    await saveContentToDB(db, contentData);
    
    console.log('콘텐츠 처리 완료!');
    
  } catch (error) {
    console.error('스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  } finally {
    // 연결 종료
    if (client) {
      await client.close();
      console.log('MongoDB 연결 종료');
    }
  }
}

// 스크립트 실행
main(); 