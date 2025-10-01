require('dotenv').config({ path: '.env.production' });
const { MongoClient } = require('mongodb');

async function checkNewsWithTwitterUrls() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('MongoDB 연결 성공\n');
    
    const db = client.db('kstarpick');
    const newsCollection = db.collection('news');
    
    // Twitter URL 패턴 - global 플래그 추가
    const twitterUrlPattern = /(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(?:@)?[A-Za-z0-9_]+\/status(?:es)?\/\d+)/g;
    
    // Twitter URL이 포함된 뉴스 찾기
    const newsWithTwitter = await newsCollection.find({
      content: { $regex: twitterUrlPattern.source, $options: 'i' }
    }).limit(10).toArray();
    
    console.log(`Twitter URL이 포함된 뉴스: ${newsWithTwitter.length}개 (최대 10개 표시)\n`);
    
    for (const news of newsWithTwitter) {
      console.log(`제목: ${news.title}`);
      console.log(`ID: ${news._id}`);
      console.log(`URL: https://www.kstarpick.com/news/${news._id}`);
      
      // Twitter 임베드가 이미 있는지 확인
      const hasEmbed = news.content && news.content.includes('twitter-tweet');
      console.log(`Twitter 임베드 존재: ${hasEmbed ? '예' : '아니오'}`);
      
      // Twitter URL 추출
      const twitterUrls = news.content ? [...news.content.matchAll(twitterUrlPattern)] : [];
      console.log(`Twitter URL 개수: ${twitterUrls.length}`);
      twitterUrls.forEach((match, index) => {
        console.log(`  ${index + 1}. ${match[0]}`);
      });
      
      console.log('---\n');
    }
    
    // 전체 개수 확인
    const totalCount = await newsCollection.countDocuments({
      content: { $regex: twitterUrlPattern.source, $options: 'i' }
    });
    
    console.log(`전체 Twitter URL이 포함된 뉴스: ${totalCount}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB 연결 종료');
  }
}

// 실행
checkNewsWithTwitterUrls().catch(console.error); 