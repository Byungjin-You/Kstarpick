const cron = require('node-cron');
const axios = require('axios');

console.log('🚀 자동 뉴스 크롤러 시작');
console.log('📅 스케줄: 매시간 정각에 실행');
console.log('🎯 대상: Soompi 뉴스 (QUIZ:, soompi 키워드 제외)');

// 크롤링 실행 함수
async function runCrawling() {
  try {
    console.log(`⏰ [${new Date().toLocaleString('ko-KR')}] 자동 크롤링 시작...`);
    
    const response = await axios.post('http://43.202.38.79:13001/api/news/crawl', {
      maxItems: 15,
      useDynamicCrawling: true
    }, {
      timeout: 300000 // 5분 타임아웃
    });
    
    if (response.data.success) {
      console.log(`✅ 크롤링 완료: 총 ${response.data.total}개 수집, 새 뉴스 ${response.data.new}개 추가`);
    } else {
      console.log(`❌ 크롤링 실패: ${response.data.message}`);
    }
    
  } catch (error) {
    console.log(`💥 크롤링 오류: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔌 서버가 실행되지 않았습니다. npm run dev로 서버를 시작해주세요.');
    }
  }
}

// 매시간 정각에 실행 (0분 0초)
cron.schedule('0 0 * * * *', runCrawling, {
  scheduled: true,
  timezone: "Asia/Seoul"
});

console.log('⏳ 스케줄러 활성화됨. 다음 정각을 기다리는 중...');
console.log('💡 즉시 테스트: node -e "require(\'./auto-crawler.js\').runCrawling()"');

// 종료 처리
process.on('SIGINT', () => {
  console.log('\n🛑 자동 크롤러 종료');
  process.exit(0);
});

// 함수 내보내기 (테스트용)
module.exports = { runCrawling }; 