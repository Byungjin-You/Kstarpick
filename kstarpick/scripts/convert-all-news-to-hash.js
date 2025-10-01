const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// URL을 해시로 변환
function createImageHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
}

// 외부 이미지 URL을 해시 기반 프록시 URL로 변환
function convertExternalImageToProxy(imageUrl) {
  if (!imageUrl) return null;
  
  // 이미 우리 사이트 URL이면 그대로 반환
  if (imageUrl.startsWith('/api/proxy/hash-image') || 
      imageUrl.startsWith('/images/') || 
      imageUrl.startsWith('/uploads/')) {
    return imageUrl;
  }
  
  // 기존 프록시 URL에서 원본 URL 추출
  if (imageUrl.includes('/api/proxy/image?url=')) {
    const urlParam = imageUrl.split('/api/proxy/image?url=')[1];
    const originalUrl = decodeURIComponent(urlParam);
    const hash = createImageHash(originalUrl);
    return { newUrl: `/api/proxy/hash-image?hash=${hash}`, originalUrl, hash };
  }
  
  // HTTP/HTTPS로 시작하는 외부 이미지 URL인 경우
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // YouTube, Twitter 등 임베드는 제외
    if (imageUrl.includes('youtube.com') || 
        imageUrl.includes('twitter.com') || 
        imageUrl.includes('platform.twitter.com')) {
      return imageUrl;
    }
    
    const hash = createImageHash(imageUrl);
    return { newUrl: `/api/proxy/hash-image?hash=${hash}`, originalUrl: imageUrl, hash };
  }
  
  // 상대 경로는 그대로 반환
  return imageUrl;
}

async function convertAllNewsToHash() {
  const uri = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?authSource=admin&authMechanism=SCRAM-SHA-1';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('MongoDB에 연결되었습니다.');
    
    // kstarpick 데이터베이스 사용
    const db = client.db('kstarpick');
    const newsCollection = db.collection('news');
    const hashCollection = db.collection('image_hashes');
    
    // 기존 해시 컬렉션 확인
    const existingHashCount = await hashCollection.countDocuments();
    console.log(`기존 해시 매핑: ${existingHashCount}개`);
    
    // 모든 뉴스 가져오기
    const allNews = await newsCollection.find({}).toArray();
    console.log(`총 ${allNews.length}개의 뉴스를 처리합니다.`);
    
    const hashMap = new Map(); // 중복 URL 방지
    let updatedNewsCount = 0;
    let totalImagesProcessed = 0;
    let skippedCount = 0;
    
    // 기존 해시 매핑 로드
    const existingHashes = await hashCollection.find({}).toArray();
    existingHashes.forEach(item => {
      hashMap.set(item.url, item.hash);
    });
    console.log(`기존 해시 매핑 ${existingHashes.length}개 로드됨`);
    
    for (let i = 0; i < allNews.length; i++) {
      const news = allNews[i];
      let hasUpdates = false;
      const updates = {};
      
      if (i % 50 === 0) {
        console.log(`진행률: ${i + 1}/${allNews.length} (${Math.round((i + 1) / allNews.length * 100)}%)`);
      }
      
      // coverImage 처리
      if (news.coverImage) {
        const result = convertExternalImageToProxy(news.coverImage);
        
        if (result && typeof result === 'object' && result.newUrl) {
          let hash = result.hash;
          
          if (hashMap.has(result.originalUrl)) {
            hash = hashMap.get(result.originalUrl);
          } else {
            hashMap.set(result.originalUrl, hash);
            
            // 해시 매핑을 DB에 저장
            await hashCollection.insertOne({
              hash,
              url: result.originalUrl,
              createdAt: new Date()
            });
            
            totalImagesProcessed++;
          }
          
          updates.coverImage = `/api/proxy/hash-image?hash=${hash}`;
          hasUpdates = true;
        }
      }
      
      // thumbnailUrl 처리
      if (news.thumbnailUrl) {
        const result = convertExternalImageToProxy(news.thumbnailUrl);
        
        if (result && typeof result === 'object' && result.newUrl) {
          let hash = result.hash;
          
          if (hashMap.has(result.originalUrl)) {
            hash = hashMap.get(result.originalUrl);
          } else {
            hashMap.set(result.originalUrl, hash);
            
            await hashCollection.insertOne({
              hash,
              url: result.originalUrl,
              createdAt: new Date()
            });
            
            totalImagesProcessed++;
          }
          
          updates.thumbnailUrl = `/api/proxy/hash-image?hash=${hash}`;
          hasUpdates = true;
        }
      }
      
      // content 내 이미지 처리
      if (news.content && (news.content.includes('http://') || news.content.includes('https://') || news.content.includes('/api/proxy/image?url='))) {
        let updatedContent = news.content;
        let contentUpdated = false;
        
        // 기존 프록시 이미지 URL 찾기
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
        }
        
        // 직접 HTTP 이미지 URL 찾기
        const imgRegexes = [
          /<img[^>]+src="(https?:\/\/[^"]+)"/g,  // 큰따옴표
          /<img[^>]+src='(https?:\/\/[^']+)'/g   // 작은따옴표
        ];
        
        for (const imgRegex of imgRegexes) {
          let imgMatch;
          while ((imgMatch = imgRegex.exec(news.content)) !== null) {
            const originalSrc = imgMatch[1];
            
            // YouTube, Twitter 등 임베드는 제외
            if (originalSrc.includes('youtube.com') || 
                originalSrc.includes('twitter.com') || 
                originalSrc.includes('platform.twitter.com')) {
              continue;
            }
            
            let hash;
            
            if (hashMap.has(originalSrc)) {
              hash = hashMap.get(originalSrc);
            } else {
              hash = createImageHash(originalSrc);
              hashMap.set(originalSrc, hash);
              
              await hashCollection.insertOne({
                hash,
                url: originalSrc,
                createdAt: new Date()
              });
              
              totalImagesProcessed++;
            }
            
            const newHashUrl = `/api/proxy/hash-image?hash=${hash}`;
            updatedContent = updatedContent.replace(originalSrc, newHashUrl);
            contentUpdated = true;
          }
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
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\n=== 변환 완료 ===`);
    console.log(`총 처리된 뉴스: ${allNews.length}개`);
    console.log(`업데이트된 뉴스: ${updatedNewsCount}개`);
    console.log(`스킵된 뉴스: ${skippedCount}개`);
    console.log(`새로 처리된 고유 이미지: ${totalImagesProcessed}개`);
    console.log(`총 해시 매핑: ${hashMap.size}개`);
    
    // 최종 통계
    const finalNews = await newsCollection.find({}).toArray();
    let hashImages = 0;
    let oldProxyImages = 0;
    let httpImages = 0;
    let localImages = 0;
    
    finalNews.forEach(news => {
      if (news.coverImage) {
        if (news.coverImage.includes('/api/proxy/hash-image')) hashImages++;
        else if (news.coverImage.includes('/api/proxy/image')) oldProxyImages++;
        else if (news.coverImage.startsWith('http')) httpImages++;
        else localImages++;
      }
    });
    
    console.log(`\n=== 최종 결과 ===`);
    console.log(`해시 기반 이미지: ${hashImages}개`);
    console.log(`기존 프록시 이미지: ${oldProxyImages}개`);
    console.log(`HTTP 이미지: ${httpImages}개`);
    console.log(`로컬 이미지: ${localImages}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('MongoDB 연결이 종료되었습니다.');
  }
}

// 스크립트 실행
convertAllNewsToHash(); 