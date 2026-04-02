const cron = require('node-cron');

const API_BASE = process.env.API_BASE || 'http://localhost:13001';

async function runCrawl() {
  const now = new Date();
  console.log(`[Schedule Crawler] 크롤링 시작: ${now.toISOString()}`);

  try {
    const res = await fetch(`${API_BASE}/api/schedules/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: ['blip', 'kprofiles', 'kpopofficial', 'kpopofficial-concerts'] })
    });

    const data = await res.json();

    if (data.success) {
      console.log(`[Schedule Crawler] 크롤링 완료! DB 총 ${data.totalCount}건`);
      Object.entries(data.results || {}).forEach(([src, r]) => {
        if (r.error) {
          console.log(`  ${src}: 에러 - ${r.error}`);
        } else {
          console.log(`  ${src}: ${r.total}개 파싱, ${r.inserted}개 신규, ${r.updated}개 업데이트${r.details ? `, ${r.details}개 상세` : ''}`);
        }
      });
    } else {
      console.error(`[Schedule Crawler] 실패:`, data.error);
    }
  } catch (e) {
    console.error(`[Schedule Crawler] 에러:`, e.message);
  }
}

// 매일 오전 6시 (KST) = UTC 21시 (전날)
cron.schedule('0 21 * * *', () => {
  console.log('[Schedule Crawler] 일일 크롤링 (06:00 KST)');
  runCrawl();
});

console.log('[Schedule Crawler] 스케줄러 시작됨 - 매일 06:00 KST 크롤링');
console.log(`[Schedule Crawler] API: ${API_BASE}`);

// 시작 시 즉시 1회 실행
runCrawl();
