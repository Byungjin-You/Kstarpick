const { MongoClient } = require('mongodb');

// Soompi 이미지 URL을 우리 사이트 프록시 URL로 변환
function convertSoompiImageToProxy(soompiImageUrl) {
  if (!soompiImageUrl) return null;
  
  // 이미 우리 사이트 URL이면 그대로 반환
  if (soompiImageUrl.startsWith('/api/proxy/image') || soompiImageUrl.startsWith('/images/')) {
    return soompiImageUrl;
  }
  
  // Soompi 이미지 URL인 경우 프록시 URL로 변환
  if (soompiImageUrl.includes('soompi.io') || soompiImageUrl.includes('soompi.com')) {
    return `/api/proxy/image?url=${encodeURIComponent(soompiImageUrl)}`;
  }
  
  // 기타 외부 이미지도 프록시를 통해 처리
  return `/api/proxy/image?url=${encodeURIComponent(soompiImageUrl)}`;
}

async function updateImageUrls() {
  const uri = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?authSource=admin&authMechanism=SCRAM-SHA-1';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('MongoDB에 연결되었습니다.');
    
    const db = client.db('kpop-news-portal');
    const collection = db.collection('news');
    
    // Soompi 이미지를 사용하는 뉴스 찾기
    const soompiNews = await collection.find({
      $or: [
        { coverImage: { $regex: /soompi\.io/ } },
        { coverImage: { $regex: /soompi\.com/ } }
      ]
    }).toArray();
    
    console.log(`Soompi 이미지를 사용하는 뉴스: ${soompiNews.length}개`);
    
    if (soompiNews.length === 0) {
      console.log('업데이트할 뉴스가 없습니다.');
      return;
    }
    
    let updatedCount = 0;
    
    for (const news of soompiNews) {
      const originalCoverImage = news.coverImage;
      const newCoverImage = convertSoompiImageToProxy(originalCoverImage);
      
      if (newCoverImage && newCoverImage !== originalCoverImage) {
        // coverImage 업데이트
        await collection.updateOne(
          { _id: news._id },
          { $set: { coverImage: newCoverImage } }
        );
        
        console.log(`업데이트: ${news.title}`);
        console.log(`  이전: ${originalCoverImage}`);
        console.log(`  이후: ${newCoverImage}`);
        console.log('  ---');
        
        updatedCount++;
      }
    }
    
    console.log(`\n총 ${updatedCount}개의 뉴스 이미지 URL이 업데이트되었습니다.`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('MongoDB 연결이 종료되었습니다.');
  }
}

// 스크립트 실행
updateImageUrls(); 