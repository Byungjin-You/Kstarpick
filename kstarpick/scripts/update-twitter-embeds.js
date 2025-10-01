require('dotenv').config({ path: '.env.production' });
const { MongoClient } = require('mongodb');

// pages/api/news/crawl.js에서 가져온 Twitter 변환 함수
function convertTwitterTextToEmbed(htmlContent) {
  if (!htmlContent) return htmlContent;
  
  let convertedContent = htmlContent;
  
  // Twitter/X URL 찾기 (다양한 패턴 지원)
  const twitterUrlPattern = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(?:@)?([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)/g;
  const twitterUrls = [...convertedContent.matchAll(twitterUrlPattern)];
  
  if (twitterUrls.length === 0) {
    return convertedContent;
  }
  
  console.log(`  - ${twitterUrls.length}개의 Twitter/X URL 발견`);
  
  // 각 Twitter URL에 대해 처리
  twitterUrls.forEach((urlMatch, index) => {
    const twitterUrl = urlMatch[0];
    const username = urlMatch[1];
    const tweetId = urlMatch[2];
    
    // 이미 임베드 코드로 변환된 경우 건너뛰기
    if (convertedContent.includes(`blockquote class="twitter-tweet"`)) {
      console.log(`  - 이미 Twitter 임베드가 존재함`);
      return;
    }
    
    // Twitter 임베드 코드 생성
    const embedCode = `<blockquote class="twitter-tweet" data-lang="en" data-theme="light">
<p lang="en" dir="ltr">Loading tweet...</p>
<a href="${twitterUrl}"></a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
    
    // URL을 임베드 코드로 교체
    convertedContent = convertedContent.replace(twitterUrl, embedCode);
  });
  
  return convertedContent.trim();
}

async function updateExistingNewsWithTwitterEmbeds() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('MongoDB 연결 성공');
    
    const db = client.db('kstarpick');
    const newsCollection = db.collection('news');
    
    // Twitter URL이 포함된 모든 뉴스 찾기
    const twitterUrlPattern = /(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(?:@)?[A-Za-z0-9_]+\/status(?:es)?\/\d+)/;
    
    const cursor = newsCollection.find({
      content: { $regex: twitterUrlPattern.source, $options: 'i' }
    });
    
    let totalUpdated = 0;
    let totalProcessed = 0;
    
    while (await cursor.hasNext()) {
      const news = await cursor.next();
      totalProcessed++;
      
      console.log(`\n처리 중: ${news.title}`);
      console.log(`  - ID: ${news._id}`);
      
      // 이미 Twitter 임베드가 있는지 확인
      if (news.content && news.content.includes('twitter-tweet')) {
        console.log('  - 이미 Twitter 임베드가 존재함. 건너뜀.');
        continue;
      }
      
      // Twitter URL을 임베드로 변환
      const updatedContent = convertTwitterTextToEmbed(news.content);
      
      if (updatedContent !== news.content) {
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
        
        totalUpdated++;
        console.log('  ✅ Twitter 임베드로 업데이트 완료');
      } else {
        console.log('  - 변경사항 없음');
      }
    }
    
    console.log(`\n=== 업데이트 완료 ===`);
    console.log(`총 처리된 뉴스: ${totalProcessed}개`);
    console.log(`업데이트된 뉴스: ${totalUpdated}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB 연결 종료');
  }
}

// 실행
updateExistingNewsWithTwitterEmbeds().catch(console.error); 