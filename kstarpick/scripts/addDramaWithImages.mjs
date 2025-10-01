import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const copyFileAsync = promisify(fs.copyFile);

/**
 * 드라마 정보를 데이터베이스에 추가하는 스크립트 (이미지 저장 포함)
 * 
 * 사용 방법:
 * 1. 드라마 제목을 인수로 전달: node scripts/addDramaWithImages.mjs "드라마 제목"
 * 2. 또는 여러 드라마를 함께 전달: node scripts/addDramaWithImages.mjs "드라마1" "드라마2"
 */

// 기존 샘플 이미지 경로
const SAMPLE_IMAGES = {
  cover: path.join(__dirname, '../public/images/sample/drama-cover.jpg'),
  banner: path.join(__dirname, '../public/images/sample/drama-banner.jpg'),
  gallery: path.join(__dirname, '../public/images/sample/drama-gallery.jpg'),
  cast: path.join(__dirname, '../public/images/sample/cast.jpg')
};

// 샘플 이미지 확인 및 생성
async function ensureSampleImages() {
  // 샘플 이미지 디렉토리 생성
  const sampleDir = path.join(__dirname, '../public/images/sample');
  if (!fs.existsSync(sampleDir)) {
    await mkdirAsync(sampleDir, { recursive: true });
    console.log(`샘플 이미지 디렉토리 생성됨: ${sampleDir}`);
  }
  
  // 샘플 이미지가 있는지 확인하고 없으면 기본 이미지 생성 
  // (실제로는 미리 준비된 이미지를 사용하거나 다운로드해야 함)
  for (const [type, imagePath] of Object.entries(SAMPLE_IMAGES)) {
    if (!fs.existsSync(imagePath)) {
      // 간단한 텍스트 이미지를 만듭니다 (이 부분은 실제로는 준비된 이미지로 대체해야 함)
      try {
        // 디폴트 이미지 지정 (이미 존재하는 이미지 사용)
        const defaultImagePath = path.join(__dirname, '../public/images/dramas/default-poster.jpg');
        const defaultBannerPath = path.join(__dirname, '../public/images/dramas/default-banner.jpg');
        
        // 기본 이미지 복사하기
        if (type === 'cover' && fs.existsSync(defaultImagePath)) {
          await copyFileAsync(defaultImagePath, imagePath);
        } else if (type === 'banner' && fs.existsSync(defaultBannerPath)) {
          await copyFileAsync(defaultBannerPath, imagePath);
        } else if (fs.existsSync(defaultImagePath)) {
          await copyFileAsync(defaultImagePath, imagePath);
        } else {
          // 폴백 옵션: 간단한 텍스트 파일 생성 (실제로는 사용하지 않는 것이 좋음)
          console.log(`경고: 기본 이미지를 찾을 수 없습니다. 임시 이미지를 사용합니다.`);
          const placeholderImageData = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
            <rect width="300" height="450" fill="#f0f0f0"/>
            <text x="150" y="225" font-family="Arial" font-size="24" text-anchor="middle">${type}</text>
          </svg>`;
          await writeFileAsync(imagePath, placeholderImageData);
        }
        
        console.log(`샘플 ${type} 이미지 생성됨: ${imagePath}`);
      } catch (error) {
        console.error(`샘플 ${type} 이미지 생성 실패:`, error);
      }
    }
  }
}

// 이미지 저장 디렉토리 확인 및 생성
async function ensureImageDirectories() {
  const dirs = [
    path.join(__dirname, '../public/images/dramas/covers'),
    path.join(__dirname, '../public/images/dramas/banners'),
    path.join(__dirname, '../public/images/dramas/gallery'),
    path.join(__dirname, '../public/images/dramas/cast')
  ];
  
  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        await mkdirAsync(dir, { recursive: true });
        console.log(`디렉토리 생성됨: ${dir}`);
      }
    } catch (error) {
      console.error(`디렉토리 생성 실패: ${dir}`, error);
    }
  }
}

// 이미지 복사 함수
async function copyImage(sourceImagePath, targetImagePath) {
  try {
    // 이미 존재하는 경우 스킵
    if (fs.existsSync(targetImagePath)) {
      console.log(`이미지가 이미 존재합니다: ${targetImagePath}`);
      return targetImagePath;
    }
    
    // 이미지 복사
    await copyFileAsync(sourceImagePath, targetImagePath);
    console.log(`이미지 복사됨: ${targetImagePath}`);
    return targetImagePath;
  } catch (error) {
    console.error(`이미지 복사 실패: ${sourceImagePath} -> ${targetImagePath}`, error);
    return null;
  }
}

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

// 드라마 정보를 검색하는 함수
async function searchDramaInfo(title) {
  try {
    console.log(`검색 중: "${title}"...`);
    
    // 이 부분은 실제 드라마 API를 사용하거나 웹 스크래핑을 통해 정보를 가져올 수 있습니다.
    // 여기서는 기본 정보만 포함하는 샘플 데이터를 생성합니다.
    
    const dramaId = title.toLowerCase().replace(/\s+/g, '-') + '-' + new Date().getFullYear();
    
    // 이미지 경로 설정
    const coverImagePath = `/images/dramas/covers/${dramaId}.jpg`;
    const bannerImagePath = `/images/dramas/banners/${dramaId}.jpg`;
    const galleryImages = [
      `/images/dramas/gallery/${dramaId}-1.jpg`,
      `/images/dramas/gallery/${dramaId}-2.jpg`,
      `/images/dramas/gallery/${dramaId}-3.jpg`
    ];
    
    // 캐스트 이미지 경로
    const castImages = [
      `/images/dramas/cast/${dramaId}-cast1.jpg`,
      `/images/dramas/cast/${dramaId}-cast2.jpg`,
      `/images/dramas/cast/${dramaId}-cast3.jpg`
    ];
    
    const dramaData = {
      id: dramaId,
      title: title,
      originalTitle: title + ' (원제목)',
      status: 'Airing',
      description: `${title}은 인기 있는 한국 드라마입니다. 이 작품은 흥미로운 스토리라인과 뛰어난 연기로 주목받고 있습니다.`,
      coverImage: coverImagePath,
      bannerImage: bannerImagePath,
      releaseDate: new Date().toISOString(),
      rating: (Math.random() * 5 + 5).toFixed(1), // 5.0-10.0 사이의 랜덤 평점
      episodes: Math.floor(Math.random() * 16) + 8, // 8-24 사이의 랜덤 에피소드 수
      runtime: `${Math.floor(Math.random() * 30) + 50}분`, // 50-80분 사이의 랜덤 러닝타임
      director: '김철수',
      writer: '박영희',
      cast: [
        { name: '이지은', role: '주인공', image: castImages[0] },
        { name: '김민준', role: '남자 주인공', image: castImages[1] },
        { name: '박지영', role: '조연', image: castImages[2] }
      ],
      genre: ['로맨스', '코미디', '드라마'],
      network: ['tvN', 'Netflix'],
      airingTime: '매주 토, 일 21:00',
      tags: ['로맨스', '코미디', '청춘'],
      viewCount: Math.floor(Math.random() * 50000) + 5000,
      likeCount: Math.floor(Math.random() * 1000) + 100,
      reviews: [],
      gallery: galleryImages,
      awards: [
        `2023 드라마 어워즈 최우수상 후보`,
        `2023 연기대상 우수 연기상 수상`
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`"${title}" 정보를 찾았습니다.`);
    return dramaData;
  } catch (error) {
    console.error(`"${title}" 정보 검색 중 오류 발생:`, error);
    return null;
  }
}

// 드라마 정보와 이미지를 저장하는 함수
async function saveDramaWithImages(db, dramaData) {
  try {
    // 1. 샘플 이미지 확인
    await ensureSampleImages();
    
    // 2. 이미지 디렉토리 확인
    await ensureImageDirectories();
    
    // 3. 커버 이미지 복사
    const localCoverPath = path.join(__dirname, '../public', dramaData.coverImage);
    await copyImage(SAMPLE_IMAGES.cover, localCoverPath);
    
    // 4. 배너 이미지 복사
    const localBannerPath = path.join(__dirname, '../public', dramaData.bannerImage);
    await copyImage(SAMPLE_IMAGES.banner, localBannerPath);
    
    // 5. 갤러리 이미지 복사
    for (let i = 0; i < dramaData.gallery.length; i++) {
      const localGalleryPath = path.join(__dirname, '../public', dramaData.gallery[i]);
      await copyImage(SAMPLE_IMAGES.gallery, localGalleryPath);
    }
    
    // 6. 캐스트 이미지 복사
    for (let i = 0; i < dramaData.cast.length; i++) {
      const localCastPath = path.join(__dirname, '../public', dramaData.cast[i].image);
      await copyImage(SAMPLE_IMAGES.cast, localCastPath);
    }
    
    // 7. 같은 id의 드라마가 이미 있는지 확인
    const existingDrama = await db.collection('dramas').findOne({ id: dramaData.id });
    
    if (existingDrama) {
      console.log(`"${dramaData.title}"는 이미 데이터베이스에 존재합니다. ID: ${existingDrama.id}`);
      return existingDrama;
    }
    
    // 8. 새 드라마 추가
    const result = await db.collection('dramas').insertOne(dramaData);
    
    console.log(`"${dramaData.title}" 데이터베이스에 저장 완료. ID: ${dramaData.id}`);
    return { _id: result.insertedId, ...dramaData };
    
  } catch (error) {
    console.error(`"${dramaData.title}" 저장 중 오류 발생:`, error);
    return null;
  }
}

// 메인 함수
async function main() {
  let client;
  
  try {
    // 명령줄에서 드라마 제목을 가져옴
    const dramaTitles = process.argv.slice(2);
    
    if (dramaTitles.length === 0) {
      console.error('드라마 제목을 입력해주세요.');
      console.log('사용법: node scripts/addDramaWithImages.mjs "드라마 제목"');
      process.exit(1);
    }
    
    console.log(`${dramaTitles.length}개의 드라마를 처리합니다...`);
    
    // MongoDB 연결
    const { client: mongoClient, db } = await connectToDatabase();
    client = mongoClient;
    
    // 각 드라마 처리
    for (const title of dramaTitles) {
      const dramaInfo = await searchDramaInfo(title);
      if (dramaInfo) {
        await saveDramaWithImages(db, dramaInfo);
      }
    }
    
    console.log('모든 드라마 처리 완료!');
    
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