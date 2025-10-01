// MongoDB 직접 연결
const { MongoClient } = require('mongodb');

const connectToDatabase = async () => {
  const client = new MongoClient('mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false', {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
  });
  
  await client.connect();
  const db = client.db('kstarpick');
  return { db, client };
};

async function debugRiddleContent() {
  try {
    console.log('🔍 MongoDB 연결 시도...');
    const { db, client } = await connectToDatabase();
    console.log('✅ MongoDB 연결 성공');

    // Riddle이 포함된 뉴스 기사 찾기
    console.log('🔍 Riddle 포함 뉴스 기사 검색 중...');
    
    const riddleNews = await db.collection('news').find({
      $or: [
        { content: { $regex: 'riddle', $options: 'i' } },
        { content: { $regex: 'riddle2-wrapper', $options: 'i' } }
      ]
    }).limit(3).toArray();

    console.log(`📰 Riddle 포함 뉴스 기사 발견: ${riddleNews.length}개`);

    riddleNews.forEach((article, index) => {
      console.log(`\n📄 뉴스 기사 ${index + 1}:`);
      console.log(`  - ID: ${article._id}`);
      console.log(`  - 제목: ${article.title}`);
      console.log(`  - 콘텐츠 길이: ${article.content?.length || 0}`);
      
      if (article.content) {
        // Riddle 관련 부분만 추출
        const riddleMatch = article.content.match(/.*riddle.*|.*iframe.*riddle.*/gi);
        if (riddleMatch) {
          console.log(`  - Riddle 관련 HTML (${riddleMatch.length}개 발견):`);
          riddleMatch.forEach((match, i) => {
            console.log(`    ${i + 1}: ${match.substring(0, 200)}...`);
          });
        }
        
        // 전체 HTML 구조 확인
        console.log(`  - 전체 HTML 미리보기:`);
        console.log(`    ${article.content.substring(0, 500)}...`);
        
        // riddle2-wrapper 구조 확인
        const wrapperMatch = article.content.match(/<div[^>]*class[^>]*riddle2-wrapper[^>]*>[\s\S]*?<\/div>/gi);
        if (wrapperMatch) {
          console.log(`  - riddle2-wrapper 구조 (${wrapperMatch.length}개):`);
          wrapperMatch.forEach((wrapper, i) => {
            console.log(`    ${i + 1}: ${wrapper}`);
          });
        }
      }
    });

    console.log('\n✅ 디버깅 완료');
    await client.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
debugRiddleContent();
