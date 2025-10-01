const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// URL을 해시로 변환
function createImageHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
}

async function fixHashImages() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?authSource=admin&authMechanism=SCRAM-SHA-1');
  
  try {
    await client.connect();
    console.log('MongoDB 연결 성공');
    
    const db = client.db('kstarpick');
    const newsCollection = db.collection('news');
    const hashCollection = db.collection('image_hashes');
    
    // 해시 프록시 URL을 사용하는 뉴스 찾기
    const hashNews = await newsCollection.find({
      $or: [
        { coverImage: { $regex: /\/api\/proxy\/hash-image\?hash=/ } },
        { thumbnailUrl: { $regex: /\/api\/proxy\/hash-image\?hash=/ } }
      ]
    }).toArray();
    
    console.log(`해시 기반 이미지를 사용하는 뉴스: ${hashNews.length}개`);
    
    // 각 뉴스의 해시가 image_hashes 컬렉션에 있는지 확인
    let missingHashes = [];
    let foundHashes = 0;
    
    for (const news of hashNews) {
      // coverImage 해시 확인
      if (news.coverImage && news.coverImage.includes('/api/proxy/hash-image?hash=')) {
        const hash = news.coverImage.split('hash=')[1];
        const hashRecord = await hashCollection.findOne({ hash });
        
        if (!hashRecord) {
          missingHashes.push({
            newsId: news._id,
            title: news.title,
            hash,
            field: 'coverImage',
            url: news.coverImage
          });
        } else {
          foundHashes++;
        }
      }
      
      // thumbnailUrl 해시 확인
      if (news.thumbnailUrl && news.thumbnailUrl.includes('/api/proxy/hash-image?hash=')) {
        const hash = news.thumbnailUrl.split('hash=')[1];
        const hashRecord = await hashCollection.findOne({ hash });
        
        if (!hashRecord) {
          missingHashes.push({
            newsId: news._id,
            title: news.title,
            hash,
            field: 'thumbnailUrl',
            url: news.thumbnailUrl
          });
        } else {
          foundHashes++;
        }
      }
    }
    
    console.log(`찾은 해시 매핑: ${foundHashes}개`);
    console.log(`누락된 해시 매핑: ${missingHashes.length}개`);
    
    if (missingHashes.length > 0) {
      console.log('\n누락된 해시들:');
      missingHashes.slice(0, 5).forEach(item => {
        console.log(`- 뉴스: ${item.title.substring(0, 50)}...`);
        console.log(`  해시: ${item.hash}`);
        console.log(`  필드: ${item.field}`);
      });
      
      // 누락된 해시들을 더미 매핑으로 생성 (원본 URL을 추측할 수 없으므로)
      // 대신 coverImage를 thumbnailUrl로 복사하는 것을 제안
      console.log('\n해결 방안:');
      console.log('1. thumbnailUrl이 비어있거나 누락된 해시인 경우 coverImage로 대체');
      console.log('2. coverImage가 누락된 해시인 경우 기본 이미지로 대체');
      
      let fixedCount = 0;
      
      for (const news of hashNews) {
        let updates = {};
        let needsUpdate = false;
        
        // thumbnailUrl이 비어있거나 누락된 해시면 coverImage로 대체
        if (!news.thumbnailUrl || news.thumbnailUrl === '' || 
            (news.thumbnailUrl && news.thumbnailUrl.includes('/api/proxy/hash-image') && 
             missingHashes.some(h => news.thumbnailUrl.includes(h.hash)))) {
          if (news.coverImage && !missingHashes.some(h => news.coverImage.includes(h.hash))) {
            updates.thumbnailUrl = news.coverImage;
            needsUpdate = true;
          }
        }
        
        // coverImage가 누락된 해시면 빈 문자열로 설정 (기본 이미지 사용)
        if (news.coverImage && news.coverImage.includes('/api/proxy/hash-image') && 
            missingHashes.some(h => news.coverImage.includes(h.hash))) {
          updates.coverImage = '';
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await newsCollection.updateOne(
            { _id: news._id },
            { $set: updates }
          );
          fixedCount++;
          
          if (fixedCount <= 5) {
            console.log(`수정됨: ${news.title.substring(0, 50)}...`);
            console.log(`  업데이트: ${JSON.stringify(updates)}`);
          }
        }
      }
      
      console.log(`\n총 ${fixedCount}개 뉴스가 수정되었습니다.`);
    }
    
    // 최종 통계
    const totalNews = await newsCollection.countDocuments();
    const newsWithThumbnail = await newsCollection.countDocuments({
      thumbnailUrl: { $exists: true, $ne: '' }
    });
    const newsWithCover = await newsCollection.countDocuments({
      coverImage: { $exists: true, $ne: '' }
    });
    
    console.log(`\n=== 최종 통계 ===`);
    console.log(`전체 뉴스: ${totalNews}개`);
    console.log(`thumbnailUrl이 있는 뉴스: ${newsWithThumbnail}개`);
    console.log(`coverImage가 있는 뉴스: ${newsWithCover}개`);
    console.log(`해시 매핑 레코드: ${await hashCollection.countDocuments()}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
  }
}

// 스크립트 실행
if (require.main === module) {
  fixHashImages();
}

module.exports = { fixHashImages }; 