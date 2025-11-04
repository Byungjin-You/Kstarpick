/**
 * AWS 프로덕션 서버에서 최신 뉴스를 로컬 DB로 백업하는 스크립트
 * API를 통해 데이터를 가져옵니다
 * 사용법: node backup-news-from-aws.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const http = require('http');

// 프로덕션 서버 URL
const PROD_SERVER = 'http://43.202.38.79:13001';

// 로컬 DB URI
const LOCAL_DB_URI = 'mongodb://localhost:27017/kstarpick_dev';
const LOCAL_DB_NAME = 'kstarpick_dev';

// HTTP 요청 헬퍼 함수
function fetchFromAPI(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          console.error('파싱 실패한 데이터:', data.substring(0, 500));
          reject(new Error(`JSON 파싱 실패: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function backupNewsFromAWS() {
  let localClient;

  try {
    console.log('🔗 프로덕션 서버에서 뉴스 가져오는 중...');
    console.log(`   서버: ${PROD_SERVER}\n`);

    // 2025.10.15 ~ 2025.10.21 사이의 뉴스 조회
    const startDate = new Date('2025-10-15T00:00:00.000Z');
    const endDate = new Date('2025-10-21T23:59:59.999Z');

    console.log(`📅 조회 기간: ${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}\n`);

    // API를 통해 뉴스 가져오기
    let allNews = [];
    let page = 1;
    const limit = 50;

    while (true) {
      console.log(`   페이지 ${page} 조회 중...`);
      const url = `${PROD_SERVER}/api/news?page=${page}&limit=${limit}`;

      try {
        const response = await fetchFromAPI(url);
        // API 응답 구조: {success: true, data: {news: [...]}}
        const news = response.data?.news || response.news || response.data || response;

        if (!Array.isArray(news) || news.length === 0) {
          console.log(`   ⚠️  페이지 ${page}에 뉴스가 없습니다.`);
          break;
        }

        console.log(`   ✅ ${news.length}개 뉴스 조회됨`);

        // 날짜 필터링
        const filteredNews = news.filter(item => {
          const itemDate = new Date(item.createdAt);
          return itemDate >= startDate && itemDate <= endDate;
        });

        console.log(`   📅 날짜 필터 후: ${filteredNews.length}개`);

        allNews = allNews.concat(filteredNews);

        // 모든 뉴스가 startDate 이전이면 중단
        const allBefore = news.every(item => new Date(item.createdAt) < startDate);
        if (allBefore) {
          console.log(`   ⏹️  모든 뉴스가 기준 날짜 이전입니다. 조회 중단.\n`);
          break;
        }

        page++;

        // 최대 20페이지까지 조회
        if (page > 20) {
          console.log('   ⚠️  최대 페이지 수 도달\n');
          break;
        }

      } catch (error) {
        console.log(`   ❌ 페이지 ${page} 조회 실패: ${error.message}\n`);
        break;
      }
    }

    console.log(`\n📰 프로덕션 서버에서 총 ${allNews.length}개의 뉴스를 찾았습니다.\n`);

    if (allNews.length === 0) {
      console.log('⚠️  해당 기간에 백업할 뉴스가 없습니다.');
      return;
    }

    // 날짜순 정렬
    allNews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 각 뉴스의 날짜 표시
    console.log('📋 백업할 뉴스 목록:');
    allNews.forEach((news, index) => {
      const dateStr = new Date(news.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`  ${index + 1}. [${dateStr}] ${news.title.substring(0, 50)}${news.title.length > 50 ? '...' : ''}`);
    });

    console.log('\n🔗 로컬 DB에 연결 중...');
    localClient = await MongoClient.connect(LOCAL_DB_URI);
    const localDb = localClient.db(LOCAL_DB_NAME);
    const localNewsCollection = localDb.collection('news');

    console.log('✅ 로컬 DB 연결 성공!');
    console.log('\n💾 로컬 DB에 백업 중...\n');

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const news of allNews) {
      try {
        // _id를 ObjectId로 변환하고 날짜 필드들을 Date 객체로 변환
        const newsToSave = {
          ...news,
          _id: new ObjectId(news._id),
          createdAt: new Date(news.createdAt),
          publishedAt: news.publishedAt ? new Date(news.publishedAt) : undefined,
          updatedAt: news.updatedAt ? new Date(news.updatedAt) : undefined
        };

        // _id로 중복 확인
        const existing = await localNewsCollection.findOne({ _id: newsToSave._id });

        if (existing) {
          // 이미 존재하면 업데이트
          await localNewsCollection.replaceOne({ _id: newsToSave._id }, newsToSave);
          updatedCount++;
          console.log(`  ✏️  업데이트: ${news.title.substring(0, 40)}...`);
        } else {
          // 없으면 새로 삽입
          await localNewsCollection.insertOne(newsToSave);
          insertedCount++;
          console.log(`  ➕ 삽입: ${news.title.substring(0, 40)}...`);
        }
      } catch (error) {
        console.error(`  ❌ 오류 (${news.title.substring(0, 30)}...):`, error.message);
        skippedCount++;
      }
    }

    console.log('\n✨ 백업 완료!');
    console.log(`\n📊 통계:`);
    console.log(`   - 새로 추가됨: ${insertedCount}개`);
    console.log(`   - 업데이트됨: ${updatedCount}개`);
    console.log(`   - 건너뜀: ${skippedCount}개`);
    console.log(`   - 총 처리: ${insertedCount + updatedCount + skippedCount}개\n`);

  } catch (error) {
    console.error('\n❌ 백업 중 오류 발생:', error);
    throw error;
  } finally {
    if (localClient) {
      await localClient.close();
      console.log('🔌 로컬 DB 연결 종료');
    }
  }
}

// 스크립트 실행
backupNewsFromAWS()
  .then(() => {
    console.log('✅ 백업 프로세스 완료\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 백업 프로세스 실패:', error);
    process.exit(1);
  });
