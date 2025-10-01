const { MongoClient } = require('mongodb');

async function fixThumbnailUrls() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?authSource=admin&authMechanism=SCRAM-SHA-1');
  
  try {
    await client.connect();
    console.log('MongoDB 연결 성공');
    
    const db = client.db('kstarpick');
    const collection = db.collection('news');
    
    // thumbnailUrl이 없거나 빈 문자열인 뉴스 찾기
    const newsWithoutThumbnail = await collection.find({
      $or: [
        { thumbnailUrl: { $exists: false } },
        { thumbnailUrl: '' },
        { thumbnailUrl: null }
      ],
      coverImage: { $exists: true, $ne: '' }
    }).toArray();
    
    console.log(`썸네일이 없는 뉴스: ${newsWithoutThumbnail.length}개`);
    
    if (newsWithoutThumbnail.length === 0) {
      console.log('수정할 뉴스가 없습니다.');
      return;
    }
    
    // 각 뉴스의 thumbnailUrl을 coverImage로 업데이트
    let updatedCount = 0;
    
    for (const news of newsWithoutThumbnail) {
      try {
        await collection.updateOne(
          { _id: news._id },
          { $set: { thumbnailUrl: news.coverImage } }
        );
        updatedCount++;
        
        if (updatedCount % 10 === 0) {
          console.log(`진행률: ${updatedCount}/${newsWithoutThumbnail.length}`);
        }
      } catch (error) {
        console.error(`뉴스 ${news._id} 업데이트 실패:`, error.message);
      }
    }
    
    console.log(`✅ 완료: ${updatedCount}개 뉴스의 thumbnailUrl 업데이트`);
    
    // 결과 확인
    const fixedNews = await collection.find({
      thumbnailUrl: { $exists: true, $ne: '' }
    }).count();
    
    console.log(`현재 thumbnailUrl이 있는 뉴스: ${fixedNews}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
  }
}

// 스크립트 실행
if (require.main === module) {
  fixThumbnailUrls();
}

module.exports = { fixThumbnailUrls }; 