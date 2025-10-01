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
    return `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
  }
  
  // 상대 경로는 그대로 반환
  return imageUrl;
}

async function updateAllImageUrls() {
  const uri = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?authSource=admin&authMechanism=SCRAM-SHA-1';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('MongoDB에 연결되었습니다.');
    
    const db = client.db('kpop-news-portal');
    const collection = db.collection('news');
    
    // 외부 이미지 URL을 사용하는 뉴스 찾기 (HTTP/HTTPS로 시작하는 것들)
    const externalImageNews = await collection.find({
      $or: [
        { coverImage: { $regex: /^https?:\/\// } },
        { featuredImage: { $regex: /^https?:\/\// } },
        { thumbnailUrl: { $regex: /^https?:\/\// } }
      ]
    }).toArray();
    
    console.log(`외부 이미지를 사용하는 뉴스: ${externalImageNews.length}개`);
    
    if (externalImageNews.length === 0) {
      console.log('업데이트할 뉴스가 없습니다.');
      return;
    }
    
    let updatedCount = 0;
    
    for (const news of externalImageNews) {
      let hasUpdates = false;
      const updates = {};
      
      // coverImage 변환
      if (news.coverImage && news.coverImage.startsWith('http')) {
        const newCoverImage = convertExternalImageToProxy(news.coverImage);
        if (newCoverImage !== news.coverImage) {
          updates.coverImage = newCoverImage;
          hasUpdates = true;
          console.log(`[coverImage] ${news.title}`);
          console.log(`  이전: ${news.coverImage}`);
          console.log(`  이후: ${newCoverImage}`);
        }
      }
      
      // featuredImage 변환
      if (news.featuredImage && news.featuredImage.startsWith('http')) {
        const newFeaturedImage = convertExternalImageToProxy(news.featuredImage);
        if (newFeaturedImage !== news.featuredImage) {
          updates.featuredImage = newFeaturedImage;
          hasUpdates = true;
          console.log(`[featuredImage] ${news.title}`);
          console.log(`  이전: ${news.featuredImage}`);
          console.log(`  이후: ${newFeaturedImage}`);
        }
      }
      
      // thumbnailUrl 변환
      if (news.thumbnailUrl && news.thumbnailUrl.startsWith('http')) {
        const newThumbnailUrl = convertExternalImageToProxy(news.thumbnailUrl);
        if (newThumbnailUrl !== news.thumbnailUrl) {
          updates.thumbnailUrl = newThumbnailUrl;
          hasUpdates = true;
          console.log(`[thumbnailUrl] ${news.title}`);
          console.log(`  이전: ${news.thumbnailUrl}`);
          console.log(`  이후: ${newThumbnailUrl}`);
        }
      }
      
      // 기사 내용의 이미지 URL 변환
      if (news.content && news.content.includes('http')) {
        let updatedContent = news.content;
        
        // img 태그의 src 속성 찾기
        const imgRegex = /<img[^>]+src="(https?:\/\/[^"]+)"/g;
        let match;
        let contentUpdated = false;
        
        while ((match = imgRegex.exec(news.content)) !== null) {
          const originalSrc = match[1];
          const newSrc = convertExternalImageToProxy(originalSrc);
          
          if (newSrc !== originalSrc) {
            updatedContent = updatedContent.replace(originalSrc, newSrc);
            contentUpdated = true;
            console.log(`[content img] ${news.title}`);
            console.log(`  이전: ${originalSrc}`);
            console.log(`  이후: ${newSrc}`);
          }
        }
        
        if (contentUpdated) {
          updates.content = updatedContent;
          hasUpdates = true;
        }
      }
      
      // 업데이트 실행
      if (hasUpdates) {
        await collection.updateOne(
          { _id: news._id },
          { $set: updates }
        );
        
        updatedCount++;
        console.log(`  ✅ 업데이트 완료`);
        console.log('  ---');
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
updateAllImageUrls(); 