const { MongoClient } = require('mongodb');

// 외부 이미지 URL을 프록시 URL로 변환
function convertExternalImageToProxy(imageUrl) {
  if (!imageUrl) return null;
  
  // 이미 우리 사이트 URL이면 그대로 반환
  if (imageUrl.startsWith('/api/proxy/image') || imageUrl.startsWith('/images/') || imageUrl.startsWith('/uploads/')) {
    return imageUrl;
  }
  
  // HTTP/HTTPS로 시작하는 외부 이미지 URL인 경우 프록시 URL로 변환
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // YouTube, Twitter 등 임베드는 제외
    if (imageUrl.includes('youtube.com') || imageUrl.includes('twitter.com') || imageUrl.includes('platform.twitter.com')) {
      return imageUrl;
    }
    return `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
  }
  
  // 상대 경로는 그대로 반환
  return imageUrl;
}

async function updateContentImages() {
  const uri = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?authSource=admin&authMechanism=SCRAM-SHA-1';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('MongoDB에 연결되었습니다.');
    
    const db = client.db('kpop-news-portal');
    const collection = db.collection('news');
    
    // content가 있고 HTTP 이미지를 포함하는 뉴스 찾기
    const newsWithContent = await collection.find({
      content: { $exists: true, $ne: '', $regex: /src="https?:\/\// }
    }).toArray();
    
    console.log(`기사 내용에 HTTP 이미지가 있는 뉴스: ${newsWithContent.length}개`);
    
    if (newsWithContent.length === 0) {
      console.log('업데이트할 뉴스가 없습니다.');
      return;
    }
    
    let updatedCount = 0;
    
    for (const news of newsWithContent) {
      let updatedContent = news.content;
      let hasUpdates = false;
      
      console.log(`\n처리 중: ${news.title}`);
      
      // img 태그의 src 속성 찾기 (다양한 따옴표 패턴 지원)
      const imgRegexes = [
        /<img[^>]+src="(https?:\/\/[^"]+)"/g,  // 큰따옴표
        /<img[^>]+src='(https?:\/\/[^']+)'/g   // 작은따옴표
      ];
      
      for (const imgRegex of imgRegexes) {
        let match;
        while ((match = imgRegex.exec(news.content)) !== null) {
          const originalSrc = match[1];
          const newSrc = convertExternalImageToProxy(originalSrc);
          
          if (newSrc !== originalSrc) {
            updatedContent = updatedContent.replace(originalSrc, newSrc);
            hasUpdates = true;
            console.log(`  이미지 변환:`);
            console.log(`    이전: ${originalSrc}`);
            console.log(`    이후: ${newSrc}`);
          } else if (originalSrc.includes('youtube.com') || originalSrc.includes('twitter.com')) {
            console.log(`  임베드 유지: ${originalSrc}`);
          }
        }
      }
      
      // 업데이트 실행
      if (hasUpdates) {
        await collection.updateOne(
          { _id: news._id },
          { $set: { content: updatedContent } }
        );
        
        updatedCount++;
        console.log(`  ✅ 업데이트 완료`);
      } else {
        console.log(`  ⏭️  변환할 이미지 없음`);
      }
    }
    
    console.log(`\n총 ${updatedCount}개의 뉴스 기사 내용이 업데이트되었습니다.`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('MongoDB 연결이 종료되었습니다.');
  }
}

// 스크립트 실행
updateContentImages(); 