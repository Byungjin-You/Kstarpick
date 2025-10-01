require('dotenv').config({ path: '.env.production' });
const { MongoClient, ObjectId } = require('mongodb');

async function checkSpecificNews() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('MongoDB 연결 성공\n');
    
    const db = client.db('kstarpick');
    const news = await db.collection('news').findOne({ 
      _id: new ObjectId('68873c1b8d5e23044e74025c') 
    });
    
    if (!news) {
      console.log('뉴스를 찾을 수 없습니다.');
      return;
    }
    
    console.log('제목:', news.title);
    console.log('ID:', news._id);
    console.log('Twitter 임베드 존재:', news.content.includes('twitter-tweet'));
    console.log('Twitter 스크립트 존재:', news.content.includes('platform.twitter.com/widgets.js'));
    
    console.log('\nTwitter URL 검색:');
    const twitterPattern = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^\s<>"]+\/status(?:es)?\/\d+/g;
    const matches = news.content.match(twitterPattern);
    if (matches) {
      matches.forEach((url, i) => console.log(`  ${i+1}. ${url}`));
    } else {
      console.log('  Twitter URL을 찾을 수 없습니다.');
    }
    
    // blockquote 태그 검색
    const blockquotePattern = /<blockquote[^>]*class="twitter-tweet"[^>]*>/g;
    const blockquotes = news.content.match(blockquotePattern);
    console.log('\nTwitter 임베드 blockquote 개수:', blockquotes ? blockquotes.length : 0);
    
    // Twitter 관련 콘텐츠 일부 출력
    const twitterIndex = news.content.indexOf('twitter');
    if (twitterIndex > -1) {
      console.log('\n첫 번째 "twitter" 텍스트 주변 콘텐츠:');
      console.log('---');
      console.log(news.content.substring(Math.max(0, twitterIndex - 100), twitterIndex + 200));
      console.log('---');
    }
    
    // x.com 검색
    const xcomIndex = news.content.indexOf('x.com');
    if (xcomIndex > -1) {
      console.log('\n첫 번째 "x.com" 텍스트 주변 콘텐츠:');
      console.log('---');
      console.log(news.content.substring(Math.max(0, xcomIndex - 100), xcomIndex + 200));
      console.log('---');
    }
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB 연결 종료');
  }
}

// 실행
checkSpecificNews().catch(console.error); 