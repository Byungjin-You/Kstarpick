const { slugify, upsertSchedule, cheerio } = require('./schedule-utils');

const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function getMonthUrl(year, month) {
  const monthName = MONTH_NAMES[month - 1];
  return `https://kprofiles.com/${monthName}-${year}-kpop-comebacks-debuts-releases/`;
}

function parseType(tag) {
  const lower = (tag || '').toLowerCase().trim();
  if (lower.includes('solo debut')) return 'debut';
  if (lower.includes('solo comeback')) return 'comeback';
  if (lower.includes('debut')) return 'debut';
  if (lower.includes('comeback')) return 'comeback';
  if (lower.includes('pre-release')) return 'pre_release';
  if (lower.includes('release')) return 'release';
  return 'release';
}

function parseDateStr(monthName, day, defaultYear) {
  const monthIdx = MONTH_NAMES.indexOf(monthName.toLowerCase());
  if (monthIdx === -1 || isNaN(day)) return null;
  return new Date(defaultYear, monthIdx, day);
}

async function crawlKprofiles(db, year, month) {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  const url = getMonthUrl(targetYear, targetMonth);
  console.log(`[Kprofiles] 크롤링: ${url}`);

  let inserted = 0, updated = 0, errors = 0, total = 0;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });

    if (res.status === 404) {
      console.log(`[Kprofiles] 페이지 없음: ${url}`);
      return { source: 'kprofiles', total: 0, inserted: 0, updated: 0, errors: 0, message: 'Page not found' };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const content = $('.entry-content').first().text() || $('article').first().text() || '';
    const lines = content.split('\n');

    let currentDate = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // 날짜 헤더 감지: "March 30th", "April 13th" 등
      const dateMatch = trimmed.match(/(\w+)\s+(\d+)(?:st|nd|rd|th)/);
      if (dateMatch) {
        const monthName = dateMatch[1];
        const day = parseInt(dateMatch[2]);
        if (MONTH_NAMES.includes(monthName.toLowerCase())) {
          currentDate = parseDateStr(monthName, day, targetYear);
        }
      }

      // 아티스트 항목: ➳ ARTIST ║〘TITLE〙║ [Type]
      if (!currentDate || !trimmed.includes('➳')) continue;

      const entryMatch = trimmed.match(/➳\s*(.+?)\s*║〘(.+?)〙║\s*\[(.+?)\]/);
      if (!entryMatch) continue;

      let artistName = entryMatch[1].trim();
      const title = entryMatch[2].trim();
      const typeTag = entryMatch[3].trim();

      // 국가 플래그
      const flagMatch = trimmed.match(/(🇰🇷|🇯🇵|🇨🇳|🇺🇸)/);
      const country = flagMatch ? { '🇰🇷': 'KR', '🇯🇵': 'JP', '🇨🇳': 'CN', '🇺🇸': 'US' }[flagMatch[1]] || '' : '';

      // 그룹명 추출: "WONPIL [DAY6]" or "DITA [former SECRET NUMBER]"
      let groupName = '';
      const groupMatch = artistName.match(/^(.+?)\s*\[(?:former\s+)?(.+?)\]$/);
      if (groupMatch) {
        artistName = groupMatch[1].trim();
        groupName = groupMatch[2].trim();
      }

      const sourceId = `kprofiles-${slugify(artistName)}-${slugify(title)}-${currentDate.toISOString().substring(0, 10)}`;

      try {
        const normalized = {
          sourceId,
          source: 'kprofiles',
          title: title && title !== '–' ? `${artistName} - ${title}` : `${artistName} ${typeTag}`,
          artistName,
          albumName: title !== '–' ? title : '',
          type: parseType(typeTag),
          subType: typeTag,
          startDate: currentDate,
          description: groupName ? `${artistName} [${groupName}] - ${typeTag}` : `${artistName} - ${typeTag}`,
          country,
          groupName,
          rawData: { artistName, groupName, title, typeTag, country, dateStr: currentDate.toISOString().substring(0, 10) }
        };

        total++;
        const action = await upsertSchedule(db, normalized);
        if (action === 'inserted') inserted++;
        else updated++;
      } catch(e) {
        errors++;
      }
    }
  } catch(e) {
    console.log(`[Kprofiles] 에러:`, e.message);
    errors++;
  }

  console.log(`[Kprofiles] 완료: total=${total}, inserted=${inserted}, updated=${updated}, errors=${errors}`);
  return { source: 'kprofiles', total, inserted, updated, errors };
}

module.exports = { crawlKprofiles };
