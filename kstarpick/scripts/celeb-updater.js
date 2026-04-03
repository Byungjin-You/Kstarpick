/**
 * Celeb Auto-Updater Cron Script
 *
 * - K-POP Radar에서 아티스트 데이터 스크래핑 → DB 업데이트
 * - 기존 /api/scrape/kpop-radar + /api/celeb/import API 재사용
 * - 매일 05:00 KST 실행 (뉴스 크롤링 전에 셀럽 데이터 최신화)
 */

const cron = require('node-cron');

const API_BASE = process.env.API_BASE || 'http://localhost:13001';

async function runCelebUpdate() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Celeb update started`);

  try {
    // Step 1: K-POP Radar에서 데이터 스크래핑
    console.log('[Celeb Updater] K-POP Radar 스크래핑 중...');
    const scrapeRes = await fetch(`${API_BASE}/api/scrape/kpop-radar`, {
      signal: AbortSignal.timeout(300000) // 5분 타임아웃 (Puppeteer 사용)
    });

    const scrapeData = await scrapeRes.json();

    if (!scrapeData.success || !scrapeData.data || scrapeData.data.length === 0) {
      console.log(`[Celeb Updater] 스크래핑 실패 또는 데이터 없음: ${scrapeData.error || 'empty data'}`);
      return;
    }

    // 유효한 아티스트만 필터링
    const artists = scrapeData.data.filter(artist =>
      artist.name &&
      artist.id &&
      !artist.id.includes('faq') &&
      !artist.id.includes('#') &&
      !artist.id.includes('viewcount') &&
      !artist.id.includes('artistList') &&
      !artist.id.includes('brief') &&
      !artist.id.includes('contact') &&
      !artist.id.includes('dashboard')
    );

    console.log(`[Celeb Updater] ${artists.length}명 아티스트 스크래핑 완료${scrapeData.fallback ? ' (fallback 데이터)' : ''}`);

    if (artists.length === 0) {
      console.log('[Celeb Updater] 유효한 아티스트 데이터 없음. 종료.');
      return;
    }

    // Step 2: DB에 일괄 저장/업데이트
    console.log('[Celeb Updater] DB 업데이트 중...');
    const importRes = await fetch(`${API_BASE}/api/celeb/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artists }),
      signal: AbortSignal.timeout(120000) // 2분 타임아웃
    });

    const importData = await importRes.json();

    if (importData.success && importData.data) {
      const r = importData.data;
      console.log(`[Celeb Updater] 완료: 신규 ${r.imported}명, 업데이트 ${r.updated}명, 실패 ${r.failed}명`);

      // 실패한 항목 로그
      if (r.failed > 0 && r.details) {
        r.details
          .filter(d => d.status === 'failed')
          .forEach(d => console.log(`  실패: ${d.name} - ${d.error}`));
      }
    } else {
      console.log(`[Celeb Updater] 저장 실패: ${importData.error || 'unknown error'}`);
    }

  } catch (e) {
    console.error(`[Celeb Updater] 에러: ${e.message}`);
  }
}

// 매일 05:00 KST = UTC 20:00 (전날)
cron.schedule('0 20 * * *', () => {
  console.log('[Celeb Updater] 일일 업데이트 (05:00 KST)');
  runCelebUpdate();
}, { timezone: 'Asia/Seoul' });

console.log('[Celeb Updater] 스케줄러 시작됨 - 매일 05:00 KST');
console.log(`[Celeb Updater] API: ${API_BASE}`);

// 시작 시 즉시 1회 실행
runCelebUpdate();
