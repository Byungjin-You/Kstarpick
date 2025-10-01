const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// MongoDB 연결
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?tls=true&tlsCAFile=global-bundle.pem&retryWrites=false&directConnection=true';

// News 스키마
const newsSchema = new mongoose.Schema({
  title: String,
  content: String,
  summary: String,
  category: String,
  thumbnail: String,
  publishedAt: Date,
  source: String,
  sourceUrl: String,
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'news' });

const News = mongoose.model('News', newsSchema);

// Riddle HTML 엔티티 수정 함수
function fixRiddleHtmlEntities(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return htmlContent;
  }

  console.log('원본 콘텐츠 길이:', htmlContent.length);
  
  let fixedContent = htmlContent;
  
  // HTML 엔티티로 인코딩된 Riddle 코드 찾기 및 수정
  // &lt;div class="riddle2-wrapper" ... &gt; 패턴 찾기
  const riddlePattern = /&lt;div[^&]*class="riddle2-wrapper"[^&]*data-rid-id="([^"]+)"[^&]*&gt;[\s\S]*?&lt;\/div&gt;/g;
  
  fixedContent = fixedContent.replace(riddlePattern, (match, riddleId) => {
    console.log('HTML 엔티티 Riddle 발견 - ID:', riddleId);
    console.log('원본 매치:', match.substring(0, 200) + '...');
    
    // 올바른 공식 Riddle 임베드 코드로 교체
    const cleanRiddleCode = `<div class="riddle2-wrapper" data-rid-id="${riddleId}" data-auto-scroll="true" data-is-fixed-height-enabled="false" data-bg="#fff" data-fg="#00205b" style="margin:0 auto; width:100%; max-width:none;">
<script src="https://www.riddle.com/embed/build-embedjs/embedV2.js"></script>
</div>`;
    
    console.log('교체될 코드:', cleanRiddleCode);
    return cleanRiddleCode;
  });
  
  console.log('수정된 콘텐츠 길이:', fixedContent.length);
  console.log('변경 여부:', htmlContent !== fixedContent);
  
  return fixedContent;
}

async function main() {
  try {
    console.log('🔗 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // News 컬렉션에서 Riddle 포함된 기사 찾기
    console.log('📰 News 컬렉션에서 Riddle 포함 기사 검색 중...');
    const newsWithRiddle = await News.find({
      content: { $regex: /riddle2-wrapper/i }
    });
    
    console.log(`📊 Riddle 포함 News 기사 수: ${newsWithRiddle.length}`);
    
    // News 기사들 수정
    let newsUpdated = 0;
    for (const news of newsWithRiddle) {
      console.log(`\n📝 처리 중: ${news.title}`);
      
      const originalContent = news.content;
      const fixedContent = fixRiddleHtmlEntities(originalContent);
      
      if (originalContent !== fixedContent) {
        news.content = fixedContent;
        news.updatedAt = new Date();
        await news.save();
        newsUpdated++;
        console.log(`✅ News 기사 수정 완료 - ID: ${news._id}`);
      } else {
        console.log('❌ 수정할 내용이 없음');
      }
    }
    
    console.log(`\n🎉 Riddle HTML 엔티티 수정 완료!`);
    console.log(`📰 News 기사 수정: ${newsUpdated}개`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

main();
