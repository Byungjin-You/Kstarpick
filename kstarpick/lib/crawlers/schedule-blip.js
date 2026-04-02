const { upsertSchedule } = require('./schedule-utils');
const { toEnglishName, translateTitle } = require('./artist-name-map');

function cleanDescription(desc) {
  if (!desc) return '';
  let d = desc;
  // blip 링크 제거
  d = d.replace(/🎉\s*\[블립에서[^\]]*\]\(blip:\/\/[^)]*\)/g, '');
  d = d.replace(/🎉?\[축하[^\]]*\]\(blip:\/\/[^)]*\)/g, '');
  d = d.replace(/\[.*?\]\(blip:\/\/[^)]*\)/g, '');
  // 🔗 관련 링크/SNS 제거
  d = d.replace(/🔗[^\n]*\n?/g, '');
  d = d.replace(/공식\s*SNS[^\n]*/g, '');
  d = d.replace(/관련\s*링크/g, '');
  // 프로필 URL 제거 (트윗 URL은 보존)
  d = d.replace(/^https?:\/\/(?:x\.com|twitter\.com)\/(?!.*\/status\/)\S+$/gm, '');
  // 생일 한글 → 영어
  d = d.replace(/(.+?)의?\s*(\d+)번째\s*생일을\s*함께\s*축하해\s*주세요!?/g, 'Happy $2nd Birthday!');
  d = d.replace(/생일을\s*함께\s*축하해\s*주세요!?/g, 'Happy Birthday!');
  // 기념일 한글 → 영어
  d = d.replace(/(.+?)의?\s*데뷔\s*기념일을\s*축하해\s*주세요!?/g, 'Celebrating debut anniversary!');
  d = d.replace(/(.+?)\s*발매\s*기념일을\s*축하해\s*주세요!?/g, '$1 release anniversary!');
  d = d.replace(/(.+?)의?\s*(.+?)\s*입사일을\s*축하해\s*주세요!?/g, 'Celebrating joining anniversary!');
  // 1위 축하 한글 → 영어
  d = d.replace(/이번\s*주\s*(.+?)\s*1위는\s*(.+?)!\s*축하합니다\s*🎉?/g, 'This week #1 on $1 is $2! Congratulations 🎉');
  d = d.replace(/오늘은\s*(.+?)(?:이|가)\s*(.+?)에서\s*[''"](.+?)[''"]로\s*1위한\s*날!?/g, 'Today $1 won #1 on $2 with "$3"!');
  // 빈 줄 정리
  d = d.replace(/\n{3,}/g, '\n\n').trim();
  return d;
}

function classifyBlipType(item) {
  const title = (item.title || '').toLowerCase();
  if (item.typeId === 4) {
    if (/birthday|day!$/i.test(item.title)) return 'birthday';
    return 'anniversary';
  }
  if (/teaser/i.test(title)) return 'teaser';
  if (/concept\s*photo/i.test(title)) return 'concept_photo';
  if (/\bmv\b|music\s*video/i.test(title)) return 'mv';
  if (/tracklist|track\s*list/i.test(title)) return 'tracklist';
  if (/highlight\s*medley/i.test(title)) return 'highlight_medley';
  if (/release|발매/i.test(title)) return 'release';
  if (/comeback/i.test(title)) return 'comeback';
  return item.typeId === 2 ? 'release' : 'other';
}

function extractArtistFromBlip(item) {
  if (item.members && item.members.length > 0) {
    return item.members[0].name || item.members[0].nameEn || '';
  }
  return '';
}

function parseBlipItems(html) {
  const pattern = /\\"scheduleId\\":(\d+),\\"idHash\\":\\"([^"]*?)\\",\\"typeId\\":(\d+),\\"title\\":\\"(.*?)\\"(?:,\\"message\\":\\"(.*?)\\")?,\\"isAllday\\":(true|false),\\"startTime\\":\\"([^"]*?)\\",\\"endTime\\":\\"([^"]*?)\\"/g;

  const items = [];
  let m;
  while ((m = pattern.exec(html)) !== null) {
    const title = m[4]
      .replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
      .replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
    const message = (m[5] || '')
      .replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')
      .replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

    items.push({
      scheduleId: parseInt(m[1]),
      idHash: m[2],
      typeId: parseInt(m[3]),
      title,
      message,
      isAllday: m[6] === 'true',
      startTime: m[7],
      endTime: m[8]
    });
  }

  // members 정보도 추출 (unitId 기반)
  const unitPattern = /\\"unitId\\":(\d+),\\"members\\":\[(.*?)\]/g;
  const unitMembers = {};
  while ((m = unitPattern.exec(html)) !== null) {
    const unitId = parseInt(m[1]);
    try {
      const membersStr = m[2].replace(/\\"/g, '"');
      if (membersStr.length > 2) {
        const parsed = JSON.parse('[' + membersStr + ']');
        unitMembers[unitId] = parsed;
      }
    } catch(e) {}
  }

  return items;
}

async function crawlBlip(db) {
  console.log('[Blip] 크롤링 시작...');

  const res = await fetch('https://blip.kr/schedule', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });
  const html = await res.text();

  const items = parseBlipItems(html);
  console.log(`[Blip] ${items.length}개 항목 파싱 완료`);

  let inserted = 0, updated = 0, errors = 0;

  for (const item of items) {
    try {
      const normalized = {
        sourceId: `blip-${item.scheduleId}`,
        source: 'blip',
        title: translateTitle(item.title),
        artistName: toEnglishName(extractArtistFromBlip(item)),
        type: classifyBlipType(item),
        startDate: new Date(item.startTime),
        endDate: item.endTime ? new Date(item.endTime) : null,
        isAllDay: item.isAllday,
        description: cleanDescription(item.message || ''),
        blipTypeId: item.typeId,
        blipScheduleId: item.scheduleId,
        rawData: item
      };

      const action = await upsertSchedule(db, normalized);
      if (action === 'inserted') inserted++;
      else updated++;
    } catch(e) {
      errors++;
    }
  }

  // Phase 2: 상세 크롤링 - artistName이 비어있는 항목 + release 타입
  const existingDocs = await db.collection('schedules').find(
    { source: 'blip', artistName: { $in: ['', null] } },
    { projection: { sourceId: 1, blipScheduleId: 1 } }
  ).toArray();
  const needDetailIds = new Set(existingDocs.map(d => d.blipScheduleId));
  const needDetail = items.filter(it => it.idHash && (needDetailIds.has(it.scheduleId) || classifyBlipType(it) === 'release'));
  console.log(`[Blip] 상세 크롤링 대상: ${needDetail.length}개 (artistName 비어있거나 release)`);
  let detailCount = 0;

  for (const item of needDetail) {
    try {
      const detail = await fetchBlipDetail(item.idHash);
      if (detail) {
        const detailUpdate = { detail, updatedAt: new Date() };
        if (detail.artistName) {
          detailUpdate.artistNameKo = detail.artistName;
          detailUpdate.artistName = toEnglishName(detail.artistName);
        }
        await db.collection('schedules').updateOne(
          { sourceId: `blip-${item.scheduleId}` },
          { $set: detailUpdate }
        );
        detailCount++;
      }
      // 요청 간 딜레이 (1초)
      await new Promise(r => setTimeout(r, 1000));
    } catch(e) { /* skip */ }
  }
  console.log(`[Blip] 상세 크롤링 완료: ${detailCount}건`);

  console.log(`[Blip] 완료: inserted=${inserted}, updated=${updated}, errors=${errors}, details=${detailCount}`);
  return { source: 'blip', total: items.length, inserted, updated, errors, details: detailCount };
}

async function fetchBlipDetail(idHash) {
  try {
    const res = await fetch(`https://s.blip.kr/s/${idHash}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    if (res.status !== 200) return null;
    const html = await res.text();

    const cheerio = require('cheerio');
    const $ = cheerio.load(html);

    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

    // 아티스트명 추출 (title: "블립 | 플레이브 스케줄 | <Caligo>...")
    const titleMatch = ogTitle.match(/블립\s*\|\s*(.+?)\s*스케줄/);
    const artistName = titleMatch ? titleMatch[1] : '';

    // 앨범 정보, 발매일, 링크 추출
    const albumMatch = bodyText.match(/(?:Mini Album|Full Album|Single|EP|Album)\s*[''"]?(.+?)[''"]?\s*(?:Concept|Track|Digital|Release)/i);
    const digitalReleaseMatch = bodyText.match(/Digital Release\s*([\d.]+\s*\d+(?:AM|PM)?\s*\(?KST\)?)/i);
    const albumReleaseMatch = bodyText.match(/Album Release\s*([\d.]+)/i);
    const snsLinks = [];
    const linkMatches = bodyText.matchAll(/https?:\/\/(?:x\.com|twitter\.com|instagram\.com)[^\s]+/g);
    for (const lm of linkMatches) snsLinks.push(lm[0]);

    return {
      artistName: artistName || undefined,
      albumInfo: albumMatch ? albumMatch[0].trim() : '',
      digitalRelease: digitalReleaseMatch ? digitalReleaseMatch[1].trim() : '',
      albumRelease: albumReleaseMatch ? albumReleaseMatch[1].trim() : '',
      snsLinks,
      fullText: bodyText.substring(0, 500),
      detailUrl: `https://s.blip.kr/s/${idHash}`
    };
  } catch(e) {
    return null;
  }
}

module.exports = { crawlBlip };
