// MongoDB 직접 연결하여 Instagram URL 찾기
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

async function findInstagramUrls() {
  try {
    console.log('🔍 MongoDB 연결 시도...');
    const { db, client } = await connectToDatabase();
    console.log('✅ MongoDB 연결 성공');

    // 특정 뉴스 기사 찾기
    const targetSlug = '6-male-kpop-idols-with-handsome-sophisticated-kdrama-visuals';
    
    console.log(`🔍 뉴스 기사 검색: ${targetSlug}`);
    const article = await db.collection('news').findOne({ slug: targetSlug });
    
    if (article) {
      console.log(`📰 기사 발견:`);
      console.log(`  - ID: ${article._id}`);
      console.log(`  - 제목: ${article.title}`);
      console.log(`  - 콘텐츠 길이: ${article.content?.length || 0}`);
      
      if (article.content) {
        console.log('\n📄 전체 콘텐츠:');
        console.log(article.content);
        
        // Instagram URL 찾기
        const instagramRegex = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/g;
        const instagramMatches = [...article.content.matchAll(instagramRegex)];
        
        console.log(`\n📱 Instagram URL 발견: ${instagramMatches.length}개`);
        instagramMatches.forEach((match, index) => {
          console.log(`  ${index + 1}. ${match[0]}`);
        });
      }
    } else {
      console.log('❌ 해당 뉴스 기사를 찾을 수 없습니다.');
    }

    await client.close();
    console.log('\n✅ 검색 완료');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

findInstagramUrls();
