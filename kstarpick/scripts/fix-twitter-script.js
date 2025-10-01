require('dotenv').config({ path: '.env.production' });
const { MongoClient } = require('mongodb');

async function fixTwitterScripts() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('MongoDB 연결 성공\n');
    
    const db = client.db('kstarpick');
    const newsCollection = db.collection('news');
    
    // Twitter 임베드는 있지만 스크립트가 없는 뉴스 찾기
    const cursor = newsCollection.find({
      $and: [
        { content: { $regex: 'twitter-tweet', $options: 'i' } },
        { content: { $not: { $regex: 'platform\\.twitter\\.com/widgets\\.js', $options: 'i' } } }
      ]
    });
    
    let totalFixed = 0;
    let totalProcessed = 0;
    
    while (await cursor.hasNext()) {
      const news = await cursor.next();
      totalProcessed++;
      
      console.log(`\n처리 중: ${news.title}`);
      console.log(`  - ID: ${news._id}`);
      
      // 콘텐츠 끝에 Twitter 스크립트 추가
      const updatedContent = news.content + '\n<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>';
      
      // 업데이트
      await newsCollection.updateOne(
        { _id: news._id },
        { 
          $set: { 
            content: updatedContent,
            updatedAt: new Date()
          } 
        }
      );
      
      totalFixed++;
      console.log('  ✅ Twitter 스크립트 추가 완료');
    }
    
    console.log(`\n=== 수정 완료 ===`);
    console.log(`총 처리된 뉴스: ${totalProcessed}개`);
    console.log(`수정된 뉴스: ${totalFixed}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB 연결 종료');
  }
}

// 실행
fixTwitterScripts().catch(console.error); 