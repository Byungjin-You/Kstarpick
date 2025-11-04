const { MongoClient } = require('mongodb');

// MongoDB 연결 URL (환경변수에서 가져오거나 직접 입력)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kpop-news-portal';

// Slug 생성 함수 (ID 없이 제목만으로)
function generateSlug(title) {
  if (!title) return null;

  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣-]/g, '') // 특수문자 제거
    .replace(/\s+/g, '-')           // 공백을 하이픈으로
    .replace(/-+/g, '-')            // 연속 하이픈을 하나로
    .replace(/^-|-$/g, '');         // 앞뒤 하이픈 제거
}

// 기존 slug에서 ID 부분 제거
function removeIdFromSlug(slug) {
  if (!slug) return null;

  // 패턴: 숫자로 시작하고 하이픈이 있는 경우 (예: 778712-the-story-of-bi-hyeong)
  // 또는 제목-숫자 형식 (예: only-god-knows-everything-062661)

  // 앞에 숫자-하이픈이 있는 경우 제거
  let newSlug = slug.replace(/^\d+-/, '');

  // 뒤에 -숫자가 있는 경우 제거
  newSlug = newSlug.replace(/-\d+$/, '');

  return newSlug;
}

async function updateSlugs() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('MongoDB 연결 성공!\n');

    const db = client.db();

    // Drama 컬렉션 업데이트
    console.log('=== Drama 컬렉션 업데이트 시작 ===');
    const dramaCollection = db.collection('dramas');
    const dramas = await dramaCollection.find({}).toArray();

    let dramaUpdated = 0;
    for (const drama of dramas) {
      let newSlug;

      if (drama.slug) {
        // 기존 slug에서 ID 제거
        newSlug = removeIdFromSlug(drama.slug);
      } else {
        // slug가 없으면 title로 생성
        newSlug = generateSlug(drama.title);
      }

      if (newSlug && newSlug !== drama.slug) {
        await dramaCollection.updateOne(
          { _id: drama._id },
          { $set: { slug: newSlug } }
        );
        console.log(`✓ Drama 업데이트: ${drama.title}`);
        console.log(`  이전: ${drama.slug || '(없음)'}`);
        console.log(`  이후: ${newSlug}\n`);
        dramaUpdated++;
      }
    }
    console.log(`Drama ${dramaUpdated}개 업데이트 완료\n`);

    // TVFilm 컬렉션 업데이트
    console.log('=== TVFilm 컬렉션 업데이트 시작 ===');
    const tvfilmCollection = db.collection('tvfilms');
    const tvfilms = await tvfilmCollection.find({}).toArray();

    let tvfilmUpdated = 0;
    for (const tvfilm of tvfilms) {
      let newSlug;

      if (tvfilm.slug) {
        // 기존 slug에서 ID 제거
        newSlug = removeIdFromSlug(tvfilm.slug);
      } else {
        // slug가 없으면 title로 생성
        newSlug = generateSlug(tvfilm.title);
      }

      if (newSlug && newSlug !== tvfilm.slug) {
        await tvfilmCollection.updateOne(
          { _id: tvfilm._id },
          { $set: { slug: newSlug } }
        );
        console.log(`✓ TVFilm 업데이트: ${tvfilm.title}`);
        console.log(`  이전: ${tvfilm.slug || '(없음)'}`);
        console.log(`  이후: ${newSlug}\n`);
        tvfilmUpdated++;
      }
    }
    console.log(`TVFilm ${tvfilmUpdated}개 업데이트 완료\n`);

    console.log('=== 전체 업데이트 완료 ===');
    console.log(`총 ${dramaUpdated + tvfilmUpdated}개 항목 업데이트됨`);

  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB 연결 종료');
  }
}

// 스크립트 실행
console.log('Slug 업데이트 스크립트 시작...\n');
updateSlugs();