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

// 매일 09:00 KST (배치 분산 스케줄 — 기존 21:00 시스템시간에서 이동)
cron.schedule('0 9 * * *', () => {
  console.log('[Schedule Crawler] 일일 크롤링 (09:00 KST)');
  runCrawl();
}, { timezone: 'Asia/Seoul' });

console.log('[Schedule Crawler] 스케줄러 시작됨 - 매일 09:00 KST 크롤링');
console.log(`[Schedule Crawler] API: ${API_BASE}`);

// 시작 시 즉시 실행 제거 — PM2 재시작 시 모든 배치가 동시 실행되는 것 방지
console.log('[Schedule Crawler] 다음 스케줄 실행 대기 중 (09:00 KST)');
