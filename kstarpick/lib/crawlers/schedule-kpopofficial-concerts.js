const { slugify, upsertSchedule, cheerio } = require('./schedule-utils');
const { toEnglishName } = require('./artist-name-map');

const MONTH_MAP = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
};

function parseConcertDates(dateText) {
  // "April 9, 2026 · Thursday · 7 PM KST\nApril 11, 2026 · Saturday · 7 PM KST"
  // or "March 28 (Sat) – 29 (Sun), 2026"
  const dates = [];
  const lines = dateText.split(/\n|(?=(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d)/);

  for (const line of lines) {
    const match = line.match(/(\w+)\s+(\d+),?\s*(\d{4})/);
    if (match && MONTH_MAP[match[1]] !== undefined) {
      const monthIdx = MONTH_MAP[match[1]];
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      // Time
      let hour = 0;
      const timeMatch = line.match(/(\d+)\s*(AM|PM)\s*KST/i);
      if (timeMatch) {
        hour = parseInt(timeMatch[1]);
        if (timeMatch[2].toUpperCase() === 'PM' && hour !== 12) hour += 12;
        if (timeMatch[2].toUpperCase() === 'AM' && hour === 12) hour = 0;
      }
      dates.push(new Date(Date.UTC(year, monthIdx, day, hour - 9)));
    }
  }

  // "March 28 (Sat) – 29 (Sun), 2026" 패턴
  if (dates.length === 0) {
    const rangeMatch = dateText.match(/(\w+)\s+(\d+).*?[–-]\s*(\d+).*?,\s*(\d{4})/);
    if (rangeMatch && MONTH_MAP[rangeMatch[1]] !== undefined) {
      const monthIdx = MONTH_MAP[rangeMatch[1]];
      const startDay = parseInt(rangeMatch[2]);
      const endDay = parseInt(rangeMatch[3]);
      const year = parseInt(rangeMatch[4]);
      for (let d = startDay; d <= endDay; d++) {
        dates.push(new Date(Date.UTC(year, monthIdx, d, -9)));
      }
    }
  }

  // "April 9, 11, 12, 2026" 패턴
  if (dates.length === 0) {
    const multiMatch = dateText.match(/(\w+)\s+([\d,\s]+),?\s*(\d{4})/);
    if (multiMatch && MONTH_MAP[multiMatch[1]] !== undefined) {
      const monthIdx = MONTH_MAP[multiMatch[1]];
      const year = parseInt(multiMatch[3]);
      const days = multiMatch[2].split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
      days.forEach(d => dates.push(new Date(Date.UTC(year, monthIdx, d, -9))));
    }
  }

  return dates;
}

function parseConcertType(text) {
  const lower = text.toLowerCase();
  if (/festival/i.test(lower)) return 'festival';
  if (/fan\s*meeting/i.test(lower)) return 'fan_meeting';
  return 'concert';
}

async function crawlKpopOfficialConcerts(db) {
  console.log('[KpopOfficial Concerts] 크롤링 시작...');

  const res = await fetch('https://kpopofficial.com/kpop-concerts/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  });

  if (res.status !== 200) {
    return { source: 'kpopofficial', total: 0, inserted: 0, updated: 0, errors: 0 };
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  let inserted = 0, updated = 0, errors = 0, total = 0;
  const concertLinks = [];

  $('.gspbgrid_item').each((i, el) => {
    try {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      const img = $(el).find('img').attr('src') || '';
      const link = $(el).find('a').attr('href') || '';
      if (!link.includes('/event/')) return;

      // "April 9, 11, 12, 2026 BTS World Tour ARIRANG 2026 – Goyang, South Korea ..."
      // 날짜 부분과 제목 부분 분리
      const titleMatch = text.match(/\d{4}\s+(.+?)(?:\s+\d+,?\d*Views|$)/);
      const eventTitle = titleMatch ? titleMatch[1].trim() : text.substring(0, 80);

      // 장소 추출
      const venueMatch = text.match(/(?:Arena|Stadium|Dome|Hall|Center|Centre|Park|Messe|Convention|Garden|Forum|Olympic|Inspire)[^,]*,\s*([^0-9]+?)(?:\s+\d|Views|$)/i);

      // 조회수
      const viewsMatch = text.match(/(\d[\d,]*)Views/);
      const views = viewsMatch ? parseInt(viewsMatch[1].replace(',', '')) : 0;

      concertLinks.push({ text, img, link, eventTitle, views });
      total++;
    } catch(e) { errors++; }
  });

  console.log(`[KpopOfficial Concerts] ${concertLinks.length}개 콘서트 발견, 상세 크롤링 시작...`);

  // 상세 페이지 크롤링 — 각 날짜를 별도 항목으로 저장
  for (const concert of concertLinks) {
    try {
      const detail = await fetchConcertDetail(concert.link);
      if (!detail) continue;

      const dates = detail.dates || [];
      if (dates.length === 0) continue;

      const artistName = toEnglishName(detail.artist) || detail.artist;
      const eventType = parseConcertType(concert.eventTitle);
      const eventName = detail.eventName || concert.eventTitle;

      for (const date of dates) {
        const dateStr = date.toISOString().substring(0, 10);
        const sourceId = `kpopofficial-concert-${slugify(artistName || eventName)}-${slugify(detail.venue || '')}-${dateStr}`;

        const normalized = {
          sourceId,
          source: 'kpopofficial',
          title: eventName,
          artistName,
          type: eventType,
          startDate: date,
          eventName,
          venue: detail.venue || '',
          location: detail.location || '',
          imageUrl: concert.img,
          detailUrl: concert.link,
          views: concert.views,
          description: `${eventName} · ${detail.venue || ''} · ${detail.location || ''}`.trim(),
          images: detail.images || [],
          ogImage: detail.ogImage || '',
          totalDates: dates.map(d => d.toISOString().substring(0, 10)),
          ticketingPlatform: detail.ticketingPlatform || '',
          ticketingSchedule: detail.ticketingSchedule || '',
          liveStreaming: detail.liveStreaming || '',
          liveStreamingLinks: detail.liveStreamingLinks || [],
          officialSource: detail.officialSource || '',
          officialLinks: detail.officialLinks || [],
          lineup: detail.lineup || '',
          priceInfo: detail.priceInfo || '',
          ticketPrice: detail.ticketPrice || '',
          ticketSalesSchedule: detail.ticketSalesSchedule || '',
          buyTicketUrl: detail.buyTicketUrl || '',
          buyTicketLinks: detail.buyTicketLinks || [],
          ticketSalesSchedule: detail.ticketSalesSchedule || '',
          promoter: detail.promoter || '',
          promoterLinks: detail.promoterLinks || [],
          rawData: { text: concert.text.substring(0, 300) }
        };

        const action = await upsertSchedule(db, normalized);
        if (action === 'inserted') inserted++;
        else updated++;
        total++;
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch(e) { errors++; }
  }

  console.log(`[KpopOfficial Concerts] 완료: total=${total}, inserted=${inserted}, updated=${updated}, errors=${errors}`);
  return { source: 'kpopofficial-concerts', total, inserted, updated, errors };
}

async function fetchConcertDetail(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    if (res.status !== 200) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const detail = {};

    // 필드 매칭 규칙 (순서 중요: 긴 키를 먼저 매칭)
    const fieldRules = [
      { match: /^Artists?\s*Lineup/i, key: 'lineup' },
      { match: /^Artist$/i, key: 'artist' },
      { match: /^Event/i, key: 'eventName' },
      { match: /^Date/i, key: 'date' },
      { match: /^Venue/i, key: 'venue' },
      { match: /^Ticketing Platform/i, key: 'ticketingPlatform' },
      { match: /^Ticketing Schedule/i, key: 'ticketingSchedule' },
      { match: /^Ticket Sales Schedule/i, key: 'ticketSalesSchedule' },
      { match: /^Ticket Price/i, key: 'ticketPrice' },
      { match: /^Buy Ticket/i, key: 'buyTicket' },
      { match: /^Live Streaming/i, key: 'liveStreaming' },
      { match: /^Promoter/i, key: 'promoter' },
      { match: /^Official Source/i, key: 'officialSource' },
      { match: /^Price/i, key: 'priceInfo' },
    ];

    $('li, tr').each((i, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length < 5 || text.length > 1000) return;

      for (const rule of fieldRules) {
        if (!rule.match.test(text)) continue;
        const value = text.replace(rule.match, '').trim();
        const links = [];
        $(el).find('a').each((j, a) => {
          const href = $(a).attr('href');
          const name = $(a).text().trim();
          if (href && name) links.push({ name, url: href });
        });

        switch (rule.key) {
          case 'artist': detail.artist = value; break;
          case 'eventName': detail.eventName = value; break;
          case 'date':
            detail.dateText = value;
            detail.dates = parseConcertDates(value);
            break;
          case 'venue':
            const venueText = value.replace('[Google Maps]', '').replace('Google Maps →', '').trim();
            const parts = venueText.split(/\n|,/).map(p => p.trim()).filter(Boolean);
            detail.venue = parts[0] || '';
            detail.location = parts.slice(1).join(', ');
            break;
          case 'lineup': detail.lineup = value; break;
          case 'ticketingPlatform': detail.ticketingPlatform = value; break;
          case 'ticketingSchedule': detail.ticketingSchedule = value; break;
          case 'ticketPrice': detail.ticketPrice = value; break;
          case 'ticketSalesSchedule': detail.ticketSalesSchedule = value; break;
          case 'buyTicket':
            detail.buyTicketUrl = links.length > 0 ? links[0].url : value;
            detail.buyTicketLinks = links;
            break;
          case 'liveStreaming':
            detail.liveStreaming = value;
            detail.liveStreamingLinks = links;
            break;
          case 'promoter':
            detail.promoter = value;
            detail.promoterLinks = links;
            break;
          case 'officialSource':
            detail.officialSource = value;
            detail.officialLinks = links;
            break;
          case 'priceInfo': detail.priceInfo = value; break;
        }
        break; // 첫 매칭만
      }
    });

    // 이미지 (포스터, 좌석배치)
    detail.images = [];
    $('img').each((i, img) => {
      const src = $(img).attr('src') || '';
      const srcLower = src.toLowerCase();
      if (src.includes('kpopofficial.com/wp-content/uploads') &&
          !srcLower.includes('logo') && !srcLower.includes('icon') &&
          !srcLower.includes('badge') && !srcLower.includes('emoticon') &&
          !srcLower.includes('svg') && !src.includes('788x')) {
        detail.images.push(src);
      }
    });

    detail.ogImage = $('meta[property="og:image"]').attr('content') || '';
    detail.ogTitle = $('meta[property="og:title"]').attr('content')?.replace(/EmojiStickers.*/g, '').trim() || '';

    // eventName이 이상하면 (Schedule로 시작하거나 200자 이상) ogTitle 사용
    if (detail.eventName && (detail.eventName.startsWith('Schedule') || detail.eventName.length > 200)) {
      detail.eventName = detail.ogTitle || $('h1').first().text().trim() || detail.eventName.substring(0, 80);
    }

    return detail;
  } catch(e) { return null; }
}

module.exports = { crawlKpopOfficialConcerts };
