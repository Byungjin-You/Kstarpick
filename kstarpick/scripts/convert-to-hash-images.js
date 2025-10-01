const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// URL을 해시로 변환
function createImageHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
}

// 프록시 URL에서 원본 URL 추출
function extractOriginalUrl(proxyUrl) {
  if (!proxyUrl.includes('/api/proxy/image?url=')) {
    return null;
  }
  
  const urlParam = proxyUrl.split('/api/proxy/image?url=')[1];
  return decodeURIComponent(urlParam);
}

async function convertToHashImages() {
  const uri = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?authSource=admin&authMechanism=SCRAM-SHA-1';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('MongoDB에 연결되었습니다.');
    
    const db = client.db('kpop-news-portal');
    const newsCollection = db.collection('news');
    const hashCollection = db.collection('image_hashes');
    
    // 기존 해시 컬렉션 초기화
    await hashCollection.deleteMany({});
    console.log('기존 해시 데이터를 정리했습니다.');
    
    // 프록시 이미지를 사용하는 뉴스 찾기
    const proxyNews = await newsCollection.find({
      $or: [
        { coverImage: { $regex: /\/api\/proxy\/image\?url=/ } }
      ]
    }).toArray();
    
    console.log(`프록시 이미지를 사용하는 뉴스: ${proxyNews.length}개`);
    
    const hashMap = new Map(); // 중복 URL 방지
    let updatedNewsCount = 0;
    let totalImagesProcessed = 0;
    
    for (const news of proxyNews) {
      let hasUpdates = false;
      const updates = {};
      
      console.log(`\n처리 중: ${news.title}`);
      
      // coverImage 처리
      if (news.coverImage && news.coverImage.includes('/api/proxy/image?url=')) {
        const originalUrl = extractOriginalUrl(news.coverImage);
        
        if (originalUrl) {
          let hash;
          
          if (hashMap.has(originalUrl)) {
            hash = hashMap.get(originalUrl);
            console.log(`  [coverImage] 기존 해시 재사용: ${hash}`);
          } else {
            hash = createImageHash(originalUrl);
            hashMap.set(originalUrl, hash);
            
            // 해시 매핑을 DB에 저장
            await hashCollection.insertOne({
              hash,
              url: originalUrl,
              createdAt: new Date()
            });
            
            console.log(`  [coverImage] 새 해시 생성: ${hash}`);
            console.log(`    원본: ${originalUrl}`);
            totalImagesProcessed++;
          }
          
          const newImageUrl = `/api/proxy/hash-image?hash=${hash}`;
          updates.coverImage = newImageUrl;
          hasUpdates = true;
          
          console.log(`    새 URL: ${newImageUrl}`);
        }
      }
      
      // content 내 이미지 처리
      if (news.content && news.content.includes('/api/proxy/image?url=')) {
        let updatedContent = news.content;
        let contentUpdated = false;
        
        // 프록시 이미지 URL 찾기
        const proxyRegex = /\/api\/proxy\/image\?url=([^"'\s>]+)/g;
        let match;
        
        while ((match = proxyRegex.exec(news.content)) !== null) {
          const encodedUrl = match[1];
          const originalUrl = decodeURIComponent(encodedUrl);
          
          let hash;
          
          if (hashMap.has(originalUrl)) {
            hash = hashMap.get(originalUrl);
          } else {
            hash = createImageHash(originalUrl);
            hashMap.set(originalUrl, hash);
            
            // 해시 매핑을 DB에 저장
            await hashCollection.insertOne({
              hash,
              url: originalUrl,
              createdAt: new Date()
            });
            
            totalImagesProcessed++;
          }
          
          const oldProxyUrl = `/api/proxy/image?url=${encodedUrl}`;
          const newHashUrl = `/api/proxy/hash-image?hash=${hash}`;
          
          updatedContent = updatedContent.replace(oldProxyUrl, newHashUrl);
          contentUpdated = true;
          
          console.log(`  [content] 해시 변환: ${hash}`);
        }
        
        if (contentUpdated) {
          updates.content = updatedContent;
          hasUpdates = true;
        }
      }
      
      // 업데이트 실행
      if (hasUpdates) {
        await newsCollection.updateOne(
          { _id: news._id },
          { $set: updates }
        );
        
        updatedNewsCount++;
        console.log(`  ✅ 업데이트 완료`);
      }
    }
    
    console.log(`\n=== 변환 완료 ===`);
    console.log(`업데이트된 뉴스: ${updatedNewsCount}개`);
    console.log(`처리된 고유 이미지: ${totalImagesProcessed}개`);
    console.log(`생성된 해시 매핑: ${hashMap.size}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('MongoDB 연결이 종료되었습니다.');
  }
}

// 스크립트 실행
convertToHashImages(); 