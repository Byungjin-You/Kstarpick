import { connectToDatabase } from '../lib/mongodb';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

/**
 * 드라마 정보를 데이터베이스에 추가하는 스크립트
 * 
 * 사용 방법:
 * 1. 드라마 제목을 인수로 전달: node scripts/addDrama.js "드라마 제목"
 * 2. 또는 여러 드라마를 함께 전달: node scripts/addDrama.js "드라마1" "드라마2"
 */

// 드라마 정보를 검색하는 함수
async function searchDramaInfo(title) {
  try {
    console.log(`검색 중: "${title}"...`);
    
    // 이 부분은 실제 드라마 API를 사용하거나 웹 스크래핑을 통해 정보를 가져올 수 있습니다.
    // 여기서는 기본 정보만 포함하는 샘플 데이터를 생성합니다.
    
    const dramaData = {
      id: title.toLowerCase().replace(/\s+/g, '-') + '-' + new Date().getFullYear(),
      title: title,
      originalTitle: title + ' (원제목)',
      status: 'Airing',
      description: `${title}은 인기 있는 한국 드라마입니다. 이 작품은 흥미로운 스토리라인과 뛰어난 연기로 주목받고 있습니다.`,
      coverImage: '/images/placeholder-tvfilm.svg',
      bannerImage: '/images/placeholder-tvfilm.svg',
      releaseDate: new Date().toISOString(),
      rating: (Math.random() * 5 + 5).toFixed(1), // 5.0-10.0 사이의 랜덤 평점
      episodes: Math.floor(Math.random() * 16) + 8, // 8-24 사이의 랜덤 에피소드 수
      runtime: `${Math.floor(Math.random() * 30) + 50}분`, // 50-80분 사이의 랜덤 러닝타임
      director: '김철수',
      writer: '박영희',
      cast: [
        { name: '이지은', role: '주인공', image: '/images/placeholder-tvfilm.svg' },
        { name: '김민준', role: '남자 주인공', image: '/images/placeholder-tvfilm.svg' },
        { name: '박지영', role: '조연', image: '/images/placeholder-tvfilm.svg' }
      ],
      genre: ['로맨스', '코미디', '드라마'],
      network: ['tvN', 'Netflix'],
      airingTime: '매주 토, 일 21:00',
      tags: ['로맨스', '코미디', '청춘'],
      viewCount: Math.floor(Math.random() * 50000) + 5000,
      likeCount: Math.floor(Math.random() * 1000) + 100,
      reviews: [],
      gallery: [
        'https://via.placeholder.com/800x450.jpg?text=' + encodeURIComponent(title + ' 장면 1'),
        'https://via.placeholder.com/800x450.jpg?text=' + encodeURIComponent(title + ' 장면 2'),
        'https://via.placeholder.com/800x450.jpg?text=' + encodeURIComponent(title + ' 장면 3')
      ],
      awards: [
        `2023 드라마 어워즈 최우수상 후보`,
        `2023 연기대상 우수 연기상 수상`
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      images: [
        '/images/placeholder-tvfilm.svg',
        '/images/placeholder-tvfilm.svg',
        '/images/placeholder-tvfilm.svg'
      ],
    };
    
    console.log(`"${title}" 정보를 찾았습니다.`);
    return dramaData;
  } catch (error) {
    console.error(`"${title}" 정보 검색 중 오류 발생:`, error);
    return null;
  }
}

// 드라마 정보를 데이터베이스에 저장하는 함수
async function saveDramaToDB(dramaData) {
  try {
    const { db } = await connectToDatabase();
    
    // 같은 id의 드라마가 이미 있는지 확인
    const existingDrama = await db.collection('dramas').findOne({ id: dramaData.id });
    
    if (existingDrama) {
      console.log(`"${dramaData.title}"는 이미 데이터베이스에 존재합니다. ID: ${existingDrama.id}`);
      return existingDrama;
    }
    
    // 새 드라마 추가
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
  try {
    // 명령줄에서 드라마 제목을 가져옴
    const dramaTitles = process.argv.slice(2);
    
    if (dramaTitles.length === 0) {
      console.error('드라마 제목을 입력해주세요.');
      console.log('사용법: node scripts/addDrama.js "드라마 제목"');
      process.exit(1);
    }
    
    console.log(`${dramaTitles.length}개의 드라마를 처리합니다...`);
    
    // 각 드라마 처리
    for (const title of dramaTitles) {
      const dramaInfo = await searchDramaInfo(title);
      if (dramaInfo) {
        await saveDramaToDB(dramaInfo);
      }
    }
    
    console.log('모든 드라마 처리 완료!');
    process.exit(0);
    
  } catch (error) {
    console.error('스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main(); 