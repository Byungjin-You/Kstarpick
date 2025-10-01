require('dotenv').config({ path: '.env.production' });
const { MongoClient } = require('mongodb');

// Slug 생성 함수 (Soompi와 유사한 형태)
function generateSlug(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    // 한글, 영문, 숫자, 공백만 남기기
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    // 연속된 공백을 하이픈으로 변경
    .replace(/\s+/g, '-')
    // 연속된 하이픈 제거
    .replace(/-+/g, '-')
    // 앞뒤 하이픈 제거
    .replace(/^-|-$/g, '')
    // 길이 제한 (100자)
    .substring(0, 100)
    // 혹시 빈 문자열이면 fallback
    || `news-${Date.now()}`;
}

async function generateSlugsForExistingNews() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('MongoDB 연결 성공\n');
    
    const db = client.db('kstarpick');
    const newsCollection = db.collection('news');
    
    // slug가 없는 뉴스 찾기
    const newsWithoutSlug = await newsCollection.find({
      $or: [
        { slug: { $exists: false } },
        { slug: null },
        { slug: '' }
      ]
    }).toArray();
    
    console.log(`slug가 없는 뉴스: ${newsWithoutSlug.length}개\n`);
    
    if (newsWithoutSlug.length === 0) {
      console.log('모든 뉴스에 slug가 이미 있습니다.');
      return;
    }
    
    let updatedCount = 0;
    let duplicateSlugCount = 0;
    
    for (const news of newsWithoutSlug) {
      console.log(`처리 중: ${news.title}`);
      console.log(`  - ID: ${news._id}`);
      
      // 기본 slug 생성
      let baseSlug = generateSlug(news.title);
      let finalSlug = baseSlug;
      let counter = 1;
      
      // 중복 slug 확인 및 처리
      while (true) {
        const existingNews = await newsCollection.findOne({ 
          slug: finalSlug,
          _id: { $ne: news._id }
        });
        
        if (!existingNews) {
          break; // 중복 없음
        }
        
        // 중복이 있으면 숫자 추가
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
        duplicateSlugCount++;
      }
      
      // slug 업데이트
      await newsCollection.updateOne(
        { _id: news._id },
        { 
          $set: { 
            slug: finalSlug,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`  ✅ slug 생성: "${finalSlug}"`);
      if (counter > 1) {
        console.log(`    (중복으로 인해 번호 추가됨)`);
      }
      
      updatedCount++;
    }
    
    console.log(`\n=== 작업 완료 ===`);
    console.log(`총 업데이트된 뉴스: ${updatedCount}개`);
    console.log(`중복으로 인한 번호 추가: ${duplicateSlugCount}개`);
    
    // 샘플 확인
    console.log('\n=== 생성된 slug 샘플 (최신 5개) ===');
    const sampleNews = await newsCollection.find({})
      .sort({ updatedAt: -1 })
      .limit(5)
      .project({ title: 1, slug: 1, _id: 1 })
      .toArray();
    
    sampleNews.forEach((news, index) => {
      console.log(`${index + 1}. ${news.title}`);
      console.log(`   ID: ${news._id}`);
      console.log(`   Slug: ${news.slug}`);
      console.log(`   URL: https://www.kstarpick.com/news/${news.slug}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('MongoDB 연결 종료');
  }
}

// 실행
generateSlugsForExistingNews().catch(console.error);