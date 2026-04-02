const { slugify, upsertSchedule, cheerio } = require('./schedule-utils');

function parseAlbumType(text) {
  const lower = (text || '').toLowerCase();
  if (/debut/i.test(lower)) return 'debut';
  if (/comeback/i.test(lower)) return 'comeback';
  return 'release';
}

function parseDate(dateText) {
  // "Monday, March 30, 2026 at 9 AM" -> Date
  const cleaned = dateText.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/(\w+),\s+(\w+)\s+(\d+),\s+(\d{4})\s+at\s+(\d+)\s*(AM|PM)/i);
  if (!match) {
    // "April 2026" 같은 대략적 날짜
    const monthMatch = cleaned.match(/(\w+)\s+(\d{4})/);
    if (monthMatch) {
      const months = { january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11 };
      const monthIdx = months[monthMatch[1].toLowerCase()];
      if (monthIdx !== undefined) return new Date(parseInt(monthMatch[2]), monthIdx, 1);
    }
    return null;
  }

  const months = { january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11 };
  const month = months[match[2].toLowerCase()];
  const day = parseInt(match[3]);
  const year = parseInt(match[4]);
  let hour = parseInt(match[5]);
  const ampm = match[6].toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  return new Date(year, month, day, hour, 0, 0);
}

async function crawlKpopSchedule(db) {
  console.log('[KpopSchedule] 크롤링 시작...');

  const urls = ['https://www.kpopschedule.com/', 'https://www.kpopschedule.com/upcoming'];
  let inserted = 0, updated = 0, errors = 0, total = 0;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      $('.album-card').each((i, card) => {
        try {
          const artistName = $(card).find('h3').text().trim();
          const paragraphs = $(card).find('p');
          const albumName = paragraphs.eq(0).text().trim();
          const albumType = paragraphs.eq(1).text().trim();

          let dateText = '';
          paragraphs.each((j, p) => {
            const t = $(p).text().trim();
            if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december/i.test(t)) {
              dateText = t;
            }
          });

          const imageUrl = $(card).find('img').attr('src') || '';
          const startDate = parseDate(dateText);

          if (!artistName || !startDate) return;

          const sourceId = `kpopsched-${slugify(artistName)}-${slugify(albumName)}-${startDate.toISOString().substring(0, 10)}`;

          total++;
          // Will be upserted below
          const normalized = {
            sourceId,
            source: 'kpopschedule',
            title: albumName ? `${artistName} - ${albumName}` : artistName,
            artistName,
            albumName,
            type: parseAlbumType(albumType),
            subType: albumType,
            startDate,
            imageUrl,
            description: `${albumType}`,
            rawData: { artistName, albumName, albumType, dateText, imageUrl }
          };

          // Async upsert - collect promises
          upsertSchedule(db, normalized).then(action => {
            if (action === 'inserted') inserted++;
            else updated++;
          }).catch(() => errors++);

        } catch(e) {
          errors++;
        }
      });

      // Wait for async operations
      await new Promise(r => setTimeout(r, 500));

    } catch(e) {
      console.log(`[KpopSchedule] ${url} 에러:`, e.message);
    }
  }

  // Wait for all upserts to complete
  await new Promise(r => setTimeout(r, 1000));

  console.log(`[KpopSchedule] 완료: inserted=${inserted}, updated=${updated}, errors=${errors}`);
  return { source: 'kpopschedule', total, inserted, updated, errors };
}

module.exports = { crawlKpopSchedule };
