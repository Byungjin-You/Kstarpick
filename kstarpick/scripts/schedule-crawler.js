const cron = require('node-cron');

const API_BASE = process.env.API_BASE || 'http://localhost:13001';

async function crawlSource(source) {
  try {
    console.log(`[Schedule Crawler] ${source} 크롤링 중...`);
    const res = await fetch(`${API_BASE}/api/schedules/crawl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: [source] }),
      signal: AbortSignal.timeout(600000) // 10분 타임아웃
    });
    const data = await res.json();
    if (data.success) {
      const r = data.results?.[source];
      if (r?.error) {
        console.log(`  ${source}: 에러 - ${r.error}`);
      } else if (r) {
        console.log(`  ${source}: ${r.total}개 파싱, ${r.inserted}개 신규, ${r.updated}개 업데이트${r.details ? `, ${r.details}개 상세` : ''}`);
      }
    }
  } catch (e) {
    console.error(`  ${source}: 에러 - ${e.message}`);
  }
}

async function runCrawl() {
  const now = new Date();
  console.log(`[Schedule Crawler] 크롤링 시작: ${now.toISOString()}`);

  // 소스별 순차 실행 (타임아웃 방지)
  await crawlSource('blip');
  await crawlSource('kprofiles');
  await crawlSource('kpopofficial');
  await crawlSource('kpopofficial-concerts');

  console.log(`[Schedule Crawler] 전체 크롤링 완료: ${new Date().toISOString()}`);
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
