const { slugify, upsertSchedule, cheerio } = require('./schedule-utils');

const MONTH_MAP = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
};

function parseKpopOfficialDate(text) {
  // "March 30 (Mon) · 6 PM KST" or "March 31 (Tue) · 6 PM KST"
  const match = text.match(/(\w+)\s+(\d+)\s*\(\w+\)\s*·?\s*(\d+)\s*(AM|PM)\s*KST/i);
  if (!match) {
    const simpleMatch = text.match(/(\w+)\s+(\d+)/);
    if (simpleMatch && MONTH_MAP[simpleMatch[1]] !== undefined) {
      return new Date(2026, MONTH_MAP[simpleMatch[1]], parseInt(simpleMatch[2]));
    }
    return null;
  }
  const monthIdx = MONTH_MAP[match[1]];
  if (monthIdx === undefined) return null;
  const day = parseInt(match[2]);
  let hour = parseInt(match[3]);
  if (match[4].toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (match[4].toUpperCase() === 'AM' && hour === 12) hour = 0;
  // KST -> UTC
  return new Date(Date.UTC(2026, monthIdx, day, hour - 9, 0, 0));
}

function parseAlbumType(text) {
  const lower = text.toLowerCase();
  if (/debut/i.test(lower)) return 'debut';
  if (/pre-release|lead single/i.test(lower)) return 'pre_release';
  if (/comeback/i.test(lower)) return 'comeback';
  return 'release';
}

async function crawlKpopOfficial(db) {
  console.log('[KpopOfficial] 크롤링 시작...');

  const res = await fetch('https://kpopofficial.com/kpop-comebacks/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });

  if (res.status !== 200) {
    console.log('[KpopOfficial] HTTP', res.status);
    return { source: 'kpopofficial', total: 0, inserted: 0, updated: 0, errors: 0 };
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  let inserted = 0, updated = 0, errors = 0, total = 0;

  $('.gspbgrid_item').each((i, el) => {
    try {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      const img = $(el).find('img').attr('src') || '';
      const link = $(el).find('a').attr('href') || '';

      // "MAR 30 IRENE (Red Velvet) March 30 (Mon) · 6 PM KST Title – "Biggest Fan" The 1st Album – Biggest Fan 843Views"
      // 또는 "MAR 31 Kep1er March 31 (Tue) · 6 PM KST 8th Mini Album – CRACK CODE 510Views"

      // 앞부분: MAR DD ARTIST_NAME
      const headerMatch = text.match(/^[A-Z]{3}\s+\d+\s+(.+?)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)/);
      if (!headerMatch) return;

      let artistName = headerMatch[1].trim();
      let groupName = '';
      const groupMatch = artistName.match(/^(.+?)\s*\((.+?)\)$/);
      if (groupMatch) {
        artistName = groupMatch[1].trim();
        groupName = groupMatch[2].trim();
      }

      // 날짜+시간
      const dateMatch = text.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+\s*\(\w+\)\s*·?\s*\d+\s*(?:AM|PM)\s*KST)/i);
      const dateStr = dateMatch ? dateMatch[1] : text.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+)/)?.[1];
      const startDate = dateStr ? parseKpopOfficialDate(dateStr) : null;
      if (!startDate) return;

      // 타이틀곡: Title – "xxx"
      const titleSongMatch = text.match(/Title\s*[–-]\s*["""](.+?)["""]/);
      const titleSong = titleSongMatch ? titleSongMatch[1] : '';

      // 앨범: "1st Album – Biggest Fan" or "8th Mini Album – CRACK CODE"
      const albumMatch = text.match(/(?:The\s+)?(\d+(?:st|nd|rd|th)\s+(?:Full\s+)?(?:Mini\s+)?(?:Album|EP|Single))\s*[–-]\s*(.+?)(?:\s+\d+Views|$)/i);
      const albumType = albumMatch ? albumMatch[1] : '';
      const albumName = albumMatch ? albumMatch[2].trim() : '';

      // EP만 있는 경우: "EP – Love in the Margins"
      const epMatch = !albumMatch && text.match(/(?:EP|Single)\s*[–-]\s*(.+?)(?:\s+\d+Views|$)/i);
      const finalAlbumName = albumName || (epMatch ? epMatch[1].trim() : '');
      const finalAlbumType = albumType || (epMatch ? 'EP' : '');

      // 조회수
      const viewsMatch = text.match(/(\d+)Views/);
      const views = viewsMatch ? parseInt(viewsMatch[1]) : 0;

      const sourceId = `kpopofficial-${slugify(artistName)}-${slugify(finalAlbumName || titleSong)}-${startDate.toISOString().substring(0, 10)}`;

      total++;
      const normalized = {
        sourceId,
        source: 'kpopofficial',
        title: titleSong ? `${artistName} - ${titleSong}` : `${artistName} - ${finalAlbumName || text.substring(0, 50)}`,
        artistName,
        groupName,
        albumName: finalAlbumName,
        titleSong,
        type: parseAlbumType(text),
        subType: finalAlbumType,
        startDate,
        imageUrl: img,
        detailUrl: link,
        views,
        description: `${finalAlbumType} ${finalAlbumName}`.trim(),
        rawData: { text: text.substring(0, 300), img, link, views }
      };

      upsertSchedule(db, normalized).then(action => {
        if (action === 'inserted') inserted++;
        else updated++;
      }).catch(() => errors++);

    } catch(e) {
      errors++;
    }
  });

  // Wait for async upserts
  await new Promise(r => setTimeout(r, 2000));

  // Phase 2: 상세 페이지 크롤링 (detailUrl이 있는 항목만)
  const itemsWithDetail = [];
  $('.gspbgrid_item').each((i, el) => {
    const link = $(el).find('a').attr('href') || '';
    if (link.includes('/album/')) itemsWithDetail.push(link);
  });

  console.log(`[KpopOfficial] 상세 크롤링 대상: ${itemsWithDetail.length}건`);
  let detailCount = 0;

  for (const detailUrl of itemsWithDetail) {
    try {
      const detail = await fetchKpopOfficialDetail(detailUrl);
      if (detail) {
        await db.collection('schedules').updateOne(
          { source: 'kpopofficial', detailUrl },
          { $set: { detail, updatedAt: new Date() } }
        );
        detailCount++;
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch(e) { /* skip */ }
  }
  console.log(`[KpopOfficial] 상세 크롤링 완료: ${detailCount}건`);

  console.log(`[KpopOfficial] 완료: total=${total}, inserted=${inserted}, updated=${updated}, errors=${errors}, details=${detailCount}`);
  return { source: 'kpopofficial', total, inserted, updated, errors, details: detailCount };
}

async function fetchKpopOfficialDetail(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    if (res.status !== 200) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const detail = { detailUrl: url };

    // 메타 데이터 파싱
    $('li, tr').each((i, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.startsWith('Artist')) detail.artist = text.replace('Artist', '').trim();
      if (text.startsWith('Release Date')) detail.releaseDate = text.replace('Release Date', '').trim();
      if (text.startsWith('Title Track')) detail.titleTrack = text.replace('Title Track', '').replace(/["""]/g, '').trim();
      if (text.startsWith('Album')) detail.albumFull = text.replace('Album', '').trim();
      if (text.startsWith('Tracklist')) {
        const tracks = text.replace('Tracklist', '').trim();
        detail.tracklist = tracks.split(/(\d+\.\s*)/).filter(t => t.trim() && !/^\d+\.\s*$/.test(t)).map(t => t.trim());
      }
      if (text.startsWith('Label')) detail.label = text.replace('Label', '').trim();
      if (text.startsWith('Genre')) detail.genre = text.replace('Genre', '').trim();
      if (text.startsWith('Type')) detail.albumType = text.replace('Type', '').trim();
      if (text.startsWith('Buy Album')) {
        detail.buyLinks = [];
        $(el).find('a').each((j, a) => {
          const href = $(a).attr('href');
          const name = $(a).text().trim();
          if (href && name) detail.buyLinks.push({ name, url: href });
        });
      }
      if (text.startsWith('Official Source')) {
        detail.officialSource = text.replace('Official Source', '').trim();
        detail.officialLinks = [];
        $(el).find('a').each((j, a) => {
          const href = $(a).attr('href');
          const name = $(a).text().trim();
          if (href && name) detail.officialLinks.push({ name, url: href });
        });
      }
    });

    // YouTube MV/티저 링크
    detail.youtubeUrls = [];
    $('iframe, a').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('href') || '';
      if (/youtube\.com\/embed\/|youtu\.be\//i.test(src)) {
        const videoId = src.match(/(?:embed\/|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (videoId) {
          const url = `https://www.youtube.com/watch?v=${videoId[1]}`;
          if (!detail.youtubeUrls.includes(url)) detail.youtubeUrls.push(url);
        }
      }
    });

    // 이미지들 (앨범 관련만, 로고/배지/썸네일 제외)
    detail.images = [];
    $('img').each((i, img) => {
      const src = $(img).attr('src') || '';
      const srcLower = src.toLowerCase();
      if (src.includes('kpopofficial.com/wp-content/uploads') &&
          !srcLower.includes('logo') && !srcLower.includes('icon') &&
          !srcLower.includes('badge') && !src.includes('788x') &&
          !srcLower.includes('spotify') && !srcLower.includes('apple-music') &&
          !srcLower.includes('youtube-music') && !srcLower.includes('kpop-official')) {
        detail.images.push(src);
      }
    });

    // OG 이미지 (고해상도 커버)
    detail.ogImage = $('meta[property="og:image"]').attr('content') || '';
    detail.ogDescription = $('meta[property="og:description"]').attr('content') || '';

    return detail;
  } catch(e) {
    return null;
  }
}

module.exports = { crawlKpopOfficial };
