const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// MongoDB 연결
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?tls=true&tlsCAFile=global-bundle.pem&retryWrites=false&directConnection=true';

console.log('MongoDB URI:', MONGODB_URI);

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

// Content 스키마
const contentSchema = new mongoose.Schema({
  title: String,
  content: String,
  summary: String,
  category: String,
  tags: [String],
  thumbnail: String,
  publishedAt: Date,
  author: String,
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'contents' });

const Content = mongoose.model('Content', contentSchema);

// Riddle 임베드 코드 정리 함수
function fixRiddleEmbeds(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return htmlContent;
  }

  console.log('원본 콘텐츠 길이:', htmlContent.length);
  
  // 직접 iframe이 포함된 riddle2-wrapper를 찾아서 정리
  let fixedContent = htmlContent;
  
  // 1. riddle2-wrapper 내부에 직접 iframe이 있는 경우 제거
  fixedContent = fixedContent.replace(
    /<div[^>]*class="riddle2-wrapper"[^>]*data-rid-id="([^"]+)"[^>]*>[\s\S]*?<iframe[^>]*><\/iframe>[\s\S]*?<\/div>/g,
    (match, riddleId) => {
      console.log('직접 iframe 방식 Riddle 발견 - ID:', riddleId);
      
      // 공식 Riddle 임베드 코드로 교체
      return `<div class="riddle2-wrapper" data-rid-id="${riddleId}" data-auto-scroll="true" data-is-fixed-height-enabled="false" data-bg="#fff" data-fg="#00205b" style="margin:0 auto; width:100%; max-width:none;">
<script src="https://www.riddle.com/embed/build-embedjs/embedV2.js"></script>
</div>`;
    }
  );
  
  // 2. script 태그가 riddle2-wrapper 내부에 있는 경우도 처리
  fixedContent = fixedContent.replace(
    /<div[^>]*class="riddle2-wrapper"[^>]*>[\s\S]*?<script[^>]*riddle[^>]*><\/script>[\s\S]*?<\/div>/g,
    (match) => {
      const ridIdMatch = match.match(/data-rid-id="([^"]+)"/);
      const riddleId = ridIdMatch ? ridIdMatch[1] : '';
      
      if (riddleId) {
        console.log('스크립트 포함 Riddle 발견 - ID:', riddleId);
        return `<div class="riddle2-wrapper" data-rid-id="${riddleId}" data-auto-scroll="true" data-is-fixed-height-enabled="false" data-bg="#fff" data-fg="#00205b" style="margin:0 auto; width:100%; max-width:none;">
<script src="https://www.riddle.com/embed/build-embedjs/embedV2.js"></script>
</div>`;
      }
      return match;
    }
  );
  
  console.log('수정된 콘텐츠 길이:', fixedContent.length);
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
      const originalContent = news.content;
      const fixedContent = fixRiddleEmbeds(originalContent);
      
      if (originalContent !== fixedContent) {
        news.content = fixedContent;
        news.updatedAt = new Date();
        await news.save();
        newsUpdated++;
        console.log(`✅ News 기사 수정 완료 - ID: ${news._id}, 제목: ${news.title?.substring(0, 50)}...`);
      }
    }
    
    // Content 컬렉션에서 Riddle 포함된 콘텐츠 찾기
    console.log('📝 Content 컬렉션에서 Riddle 포함 콘텐츠 검색 중...');
    const contentWithRiddle = await Content.find({
      content: { $regex: /riddle2-wrapper/i }
    });
    
    console.log(`📊 Riddle 포함 Content 수: ${contentWithRiddle.length}`);
    
    // Content들 수정
    let contentUpdated = 0;
    for (const content of contentWithRiddle) {
      const originalContent = content.content;
      const fixedContent = fixRiddleEmbeds(originalContent);
      
      if (originalContent !== fixedContent) {
        content.content = fixedContent;
        content.updatedAt = new Date();
        await content.save();
        contentUpdated++;
        console.log(`✅ Content 수정 완료 - ID: ${content._id}, 제목: ${content.title?.substring(0, 50)}...`);
      }
    }
    
    console.log(`\n🎉 Riddle 임베드 수정 완료!`);
    console.log(`📰 News 기사 수정: ${newsUpdated}개`);
    console.log(`📝 Content 수정: ${contentUpdated}개`);
    console.log(`📊 총 수정: ${newsUpdated + contentUpdated}개`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

main();
