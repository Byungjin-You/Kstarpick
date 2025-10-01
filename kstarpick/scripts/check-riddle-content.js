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

async function main() {
  try {
    console.log('🔗 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB 연결 성공');

    // News 컬렉션에서 Riddle 포함된 기사 찾기
    const newsWithRiddle = await News.find({
      content: { $regex: /riddle2-wrapper/i }
    });
    
    console.log(`📊 Riddle 포함 News 기사 수: ${newsWithRiddle.length}`);
    
    if (newsWithRiddle.length > 0) {
      const news = newsWithRiddle[0];
      console.log('\n📰 첫 번째 Riddle 기사 정보:');
      console.log('제목:', news.title);
      console.log('ID:', news._id);
      
      // Riddle 관련 부분만 추출하여 확인
      const content = news.content;
      const riddleIndex = content.toLowerCase().indexOf('riddle');
      
      if (riddleIndex !== -1) {
        // Riddle 주변 1000자 정도 추출
        const start = Math.max(0, riddleIndex - 500);
        const end = Math.min(content.length, riddleIndex + 1500);
        const riddleSection = content.substring(start, end);
        
        console.log('\n🔍 Riddle 관련 HTML 코드:');
        console.log('=' * 80);
        console.log(riddleSection);
        console.log('=' * 80);
        
        // iframe 포함 여부 확인
        console.log('\n📊 분석 결과:');
        console.log('- iframe 포함:', content.includes('<iframe'));
        console.log('- riddle2-wrapper 포함:', content.includes('riddle2-wrapper'));
        console.log('- script 포함:', content.includes('<script'));
        console.log('- riddle.com 포함:', content.includes('riddle.com'));
      }
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

main();
