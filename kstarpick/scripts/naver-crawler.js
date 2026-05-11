const cron = require('node-cron');
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:13001';

console.log('[Naver Crawler] 시작');
console.log('[Naver Crawler] 스케줄: 매 4시간 (00, 04, 08, 12, 16, 20시 KST)');
console.log(`[Naver Crawler] API: ${API_BASE}`);

async function runCrawling() {
  try {
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    console.log(`[Naver Crawler] ${now} 크롤링 시작...`);

    const response = await axios.post(`${API_BASE}/api/news/crawl-naver`, {
      maxItems: 15,
    }, {
      timeout: 600000, // 10분 (번역 포함이라 넉넉히)
    });

    if (response.data.success) {
      console.log(`[Naver Crawler] 완료: 총 ${response.data.total}개 수집, 새 ${response.data.new}개 저장, 실패 ${response.data.errors || 0}개`);
    } else {
      console.log(`[Naver Crawler] 실패: ${response.data.message}`);
    }
  } catch (error) {
    console.error(`[Naver Crawler] 오류: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('[Naver Crawler] 서버가 실행되지 않았습니다.');
    }
  }
}

// 매 4시간 실행 (KST 00, 04, 08, 12, 16, 20시)
cron.schedule('0 */4 * * *', runCrawling, {
  scheduled: true,
  timezone: 'Asia/Seoul',
});

console.log('[Naver Crawler] 스케줄러 활성화됨. 다음 4시간 정각을 기다리는 중...');

process.on('SIGINT', () => {
  console.log('\n[Naver Crawler] 종료');
  process.exit(0);
});

module.exports = { runCrawling };
