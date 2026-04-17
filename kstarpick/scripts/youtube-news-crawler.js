// YouTube Channel → News Article Auto-Crawler
// 채널 설정: lib/crawlers/youtube-channels.js
// 새 채널 추가 = 설정 파일에 객체 하나 추가하면 끝
// 매 6시간마다 실행

const cron = require('node-cron');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

// Load env
let envPath = path.resolve(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '..', '..', '.env.local');
}
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const { channels, PHOTO_CATEGORIES, CATEGORY_KEYWORDS } = require('../lib/crawlers/youtube-channels');
const { toEnglishName } = require('../lib/crawlers/artist-name-map');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

// ==================== 카테고리 분류 (youtube-channels.js에서 정의) ====================

function classifyVideo(title) {
  const lower = title.toLowerCase();
  for (const cat of PHOTO_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[cat.key] || [];
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      let eventName = cat.label;
      if (cat.key === 'music-show') {
        if (/음악중심|Music Core|MUSIC CORE/i.test(title)) eventName = 'Music Core';
        else if (/쇼챔피언|Show Champion|쇼챔|미팬|미챈/i.test(title)) eventName = 'Show Champion';
        else if (/인기가요|Inkigayo/i.test(title)) eventName = 'Inkigayo';
        else if (/Music Bank/i.test(title)) eventName = 'Music Bank';
        else eventName = 'Music Show';
      }
      return { label: cat.key, eventName, newsCategory: cat.newsCategory };
    }
  }
  return { label: 'idol-moments', eventName: 'Idol Moments', newsCategory: null };
}

// ==================== 아티스트명 추출 (DB 기반) ====================

// artist_groups 컬렉션에서 미리 로딩 (멤버→그룹 매핑)
let artistCache = null; // { memberKo→{memberEn, groupEn}, groupKo→groupEn, groupEn→groupEn }

async function loadArtistCache(db) {
  if (artistCache) return artistCache;
  const docs = await db.collection('artist_groups').find({}).toArray();
  const cache = {};
  for (const doc of docs) {
    // 그룹명 매핑 (한글→영문, 영문→영문)
    if (doc.groupNameKo) cache[doc.groupNameKo] = { memberEn: doc.groupNameEn, groupEn: doc.groupNameEn, type: doc.type };
    if (doc.groupNameEn) cache[doc.groupNameEn] = { memberEn: doc.groupNameEn, groupEn: doc.groupNameEn, type: doc.type };
    // 멤버명 매핑 (한글→영문+그룹)
    for (const m of (doc.members || [])) {
      if (m.nameKo) cache[m.nameKo] = { memberEn: m.nameEn, groupEn: doc.groupNameEn, type: 'member' };
      if (m.nameEn) cache[m.nameEn.toUpperCase()] = { memberEn: m.nameEn, groupEn: doc.groupNameEn, type: 'member' };
    }
  }
  artistCache = cache;
  console.log(`[YouTube] artist_groups 캐시 로드: ${Object.keys(cache).length}건`);
  return cache;
}

function lookupArtist(name, cache) {
  // 정확 매칭
  if (cache[name]) return cache[name];
  // 대소문자 무시
  if (cache[name.toUpperCase()]) return cache[name.toUpperCase()];
  // artist-name-map fallback
  const en = toEnglishName(name);
  if (en !== name && cache[en]) return cache[en];
  if (en !== name) return { memberEn: en, groupEn: '', type: 'fallback' };
  return null;
}

function extractArtists(title, cache) {
  const artists = [];   // { name: 영문명, group: 그룹영문명 }
  const addArtist = (name, group) => {
    if (!artists.find(a => a.name === name)) artists.push({ name, group });
  };

  // 1. 해시태그 추출: #샤오팅, #IRENE
  const hashMatches = title.match(/#(\S+)/g);
  if (hashMatches) {
    for (const tag of hashMatches) {
      const raw = tag.replace('#', '');
      const found = lookupArtist(raw, cache);
      if (found) {
        addArtist(found.memberEn, found.groupEn);
      } else {
        addArtist(raw, '');
        console.log(`  ⚠ 아티스트 DB 미등록: ${raw}`);
      }
    }
  }

  // 2. 제목 앞부분에서 아티스트명: "케플러 쇼챔피언..." or "최유진 - RUDE!"
  const prefixMatch = title.match(/^([가-힣A-Za-z0-9&\s]+?)(?:\s*[-|·]\s*|\s+(?:쇼챔|음악중심|인기가요|출국|입국|팬미팅|사인회|레드카펫|축제|공연))/);
  if (prefixMatch && !hashMatches) {
    let name = prefixMatch[1].trim();
    // 괄호 안 영문명: "프로미스나인(fromis_9)"
    const parenMatch = name.match(/(.+?)\((.+?)\)/);
    if (parenMatch) name = parenMatch[1].trim();

    const found = lookupArtist(name, cache);
    if (found) {
      addArtist(found.memberEn, found.groupEn);
    } else {
      // & 로 분리된 멤버명: "민제&주왕&동화"
      const parts = name.split('&').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        for (const p of parts) {
          const f = lookupArtist(p, cache);
          if (f) addArtist(f.memberEn, f.groupEn);
          else addArtist(p, '');
        }
      } else {
        const en = toEnglishName(name);
        addArtist(en, '');
      }
    }
  }

  return artists;
}

// ==================== 제목 번역 (Google Translate 무료) ====================

async function translateToEnglish(text) {
  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=' + encodeURIComponent(text);
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    return data[0].map(s => s[0]).join('');
  } catch {
    return text;
  }
}

// ==================== 날짜 추출 ====================

function extractDateCode(title) {
  // 제목 끝의 YYMMDD 패턴: "| 260408" or "260408"
  const match = title.match(/\|\s*(\d{6})\s*$/) || title.match(/(\d{6})\s*$/);
  return match ? match[1] : '';
}

function dateCodeToDate(code) {
  if (!code || code.length !== 6) return null;
  const y = 2000 + parseInt(code.slice(0, 2));
  const m = parseInt(code.slice(2, 4)) - 1;
  const d = parseInt(code.slice(4, 6));
  return new Date(y, m, d);
}

function formatDate(date) {
  if (!date) return '';
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// ==================== 기사 생성 ====================

const Anthropic = require('@anthropic-ai/sdk');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// YouTube Shorts 임베드 iframe
function youtubeEmbed(videoId) {
  return `<div style="display:flex;justify-content:center;margin:20px 0;"><iframe width="315" height="560" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:12px;max-width:100%;"></iframe></div>`;
}

// Claude API로 기사 생성 (SEO 친화적 본문 400~600 words)
async function generateArticleContent(originalTitle, translatedTitle, artistNames, groupNames, category, eventName, dateStr) {
  // 키 없거나 실패 시 최소한의 의미있는 fallback (thin content 방지)
  const buildFallbackBody = () => {
    const who = artistNames.join(' and ') || 'A K-Pop artist';
    const groupMention = groupNames.length > 0 ? ` from ${groupNames.join(' and ')}` : '';
    const when = dateStr ? ` on ${dateStr}` : ' recently';
    const eventDesc = eventName ? ` at a ${eventName} appearance` : '';
    return [
      `<p>${who}${groupMention} made headlines${when}${eventDesc}, drawing attention from fans across the K-Pop community.</p>`,
      `<p>The appearance quickly spread across social media, with fans sharing photos and clips of the moment. Such appearances remain a core part of K-Pop culture, where artists regularly connect with their global fandom through public events, broadcast stages, and fan interactions.</p>`,
      `<p>K-Pop continues to grow as a leading force in global entertainment, with Korean artists consistently breaking records and expanding their international reach. Stay tuned for more updates on ${who}${groupMention} and the latest from the K-Pop world.</p>`,
    ].join('');
  };

  if (!CLAUDE_API_KEY) {
    return { title: translatedTitle, body: buildFallbackBody() };
  }

  const client = new Anthropic({ apiKey: CLAUDE_API_KEY });

  const artistInfo = artistNames.length > 0
    ? `Artist(s): ${artistNames.join(', ')}${groupNames.length > 0 ? ` (Group: ${groupNames.join(', ')})` : ''}`
    : 'Artist: Unknown K-Pop artist';

  const prompt = `You are a professional K-Pop entertainment journalist writing for KstarPick, an English-language K-Pop news site. Write a comprehensive, SEO-friendly news article based on this YouTube Shorts video.

Video title (Korean): ${originalTitle}
Video title (English): ${translatedTitle}
${artistInfo}
Category: ${category}${eventName ? ` (${eventName})` : ''}
Date: ${dateStr || 'Recent'}

Rules:
- Headline: 8-14 words, specific and engaging, include the artist/group name. NOT a direct translation. Avoid clickbait like "You won't believe" or "SHOCKING".
- Body: 400-600 words total, structured as:
  1. Lead paragraph (60-80 words): The core story — who, what, where, when.
  2. <h2>Section heading</h2> — Background / context about the artist/group (80-120 words). Recent activities, achievements, discography highlights, group introduction if applicable.
  3. <h2>Section heading</h2> — Event details (80-120 words). Describe the moment: what happened at the ${eventName || 'event'}, visual highlights, notable outfits/stage presence, song performed if applicable.
  4. <h2>Section heading</h2> — Fan reactions and impact (80-120 words). Social media buzz, fandom response, significance for the artist's career.
  5. Closing paragraph (50-80 words): Upcoming activities or broader K-Pop trend context.
- HTML: use only <p> and <h2> tags. No <ul>, <li>, <strong>, or other formatting.
- Tone: professional entertainment journalism, informative and engaging.
- SEO: naturally include terms like "K-Pop", group/artist names, relevant event names, song titles. Include related K-Pop context (e.g., "4th-generation group", "rookie artist", "veteran performer") where fitting.
- Do NOT mention the source YouTube channel. Do NOT say "the video shows" or "watch the video". Treat this as independent reporting on the event itself.
- If artist details are unknown, write general but plausible K-Pop context — DO NOT invent specific awards, dates, or numbers.
- Section headings should be informative (e.g., "Rising Stars of Fourth Generation" not just "Background").

Respond with ONLY valid JSON, no markdown fences:
{"title":"headline","body":"<p>lead</p><h2>heading 1</h2><p>para</p><h2>heading 2</h2><p>para</p><h2>heading 3</h2><p>para</p><p>closing</p>"}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();
    // JSON 추출 (코드블록 감싸져 있을 수 있음)
    const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"body"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // 본문이 너무 짧으면 fallback과 결합
      const bodyText = (parsed.body || '').replace(/<[^>]*>/g, '').trim();
      if (bodyText.length < 300) {
        console.log(`  ⚠ 본문 짧음 (${bodyText.length}자) — fallback 보강`);
        parsed.body = (parsed.body || '') + buildFallbackBody();
      }
      return parsed;
    }
    // JSON 파싱 실패 시 원문을 최대한 살림
    return {
      title: translatedTitle,
      body: `<p>${text.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, ' ')}</p>` + buildFallbackBody(),
    };
  } catch (e) {
    console.log(`  ⚠ Claude API 에러: ${e.message} — fallback 사용`);
    return { title: translatedTitle, body: buildFallbackBody() };
  }
}

async function generateArticle(video, artists, classification, channel) {
  const videoId = video.id.videoId;
  const videoUrl = `https://www.youtube.com/shorts/${videoId}`;
  const originalTitle = video.snippet.title;
  const dateCode = extractDateCode(originalTitle);
  const eventDate = dateCodeToDate(dateCode);
  const dateStr = formatDate(eventDate);

  // artists = [{name, group}]
  const artistNames = artists.map(a => a.name);
  const groupNames = [...new Set(artists.map(a => a.group).filter(Boolean))];
  const artistStr = artistNames.length > 0 ? artistNames.join(' & ') : 'K-Pop Artist';
  const artistWithGroup = artists.length === 1 && artists[0].group && artists[0].name !== artists[0].group
    ? `${artists[0].name} (${artists[0].group})`
    : artistStr;

  // 제목 번역 (Claude에 원제도 함께 전달)
  const cleanOriginal = originalTitle.replace(/\|\s*\d{6}\s*$/, '').replace(/#/g, '').trim();
  let translatedTitle = cleanOriginal;
  if (/[가-힣]/.test(cleanOriginal)) {
    translatedTitle = await translateToEnglish(cleanOriginal);
    translatedTitle = translatedTitle.replace(/^./, c => c.toUpperCase()).trim();
  }

  // Claude API로 기사 제목 + 본문 생성
  const generated = await generateArticleContent(
    cleanOriginal, translatedTitle, artistNames, groupNames,
    classification.label, classification.eventName, dateStr
  );

  const title = generated.title;
  const content = generated.body + youtubeEmbed(videoId);
  const summary = generated.body.replace(/<[^>]*>/g, '').slice(0, 200);

  // 태그: 아티스트명 + 그룹명 + 이벤트명 + 날짜코드
  const tags = [...artistNames, ...groupNames];
  if (classification.eventName) tags.push(classification.eventName);
  if (dateCode) tags.push(dateCode);

  // slug 생성
  let slug = slugify(title, { lower: true, strict: true });
  if (slug.length > 80) slug = slug.slice(0, 80);

  // 랜덤 author
  const authorName = channel.authorPool[Math.floor(Math.random() * channel.authorPool.length)];

  return {
    title,
    slug,
    content,
    summary,
    coverImage: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    category: classification.newsCategory || channel.defaultCategory,
    tags,
    author: {
      name: authorName,
      id: `${channel.id}-crawler`,
      email: `crawler@${channel.id}.com`,
      image: '/images/default-avatar.png',
    },
    source: channel.name,
    sourceUrl: channel.url,
    articleUrl: videoUrl,
    contentType: 'photo',
    status: 'published',
    featured: false,
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(video.snippet.publishedAt),
  };
}

// ==================== YouTube API ====================

// HTML entity 디코딩
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

async function fetchRecentVideos(channelId, maxResults = 15) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  // YouTube API가 &amp; 등 HTML entity로 반환하므로 디코딩
  for (const item of (data.items || [])) {
    if (item.snippet) {
      item.snippet.title = decodeHtmlEntities(item.snippet.title);
      if (item.snippet.description) item.snippet.description = decodeHtmlEntities(item.snippet.description);
    }
  }
  return data.items || [];
}

// ==================== 메인 크롤링 ====================

async function crawlChannel(db, channel) {
  console.log(`[YouTube] ${channel.name} 크롤링 시작...`);

  const videos = await fetchRecentVideos(channel.channelId, 15);
  console.log(`  ${videos.length}개 영상 fetch`);

  // 제외 패턴 필터링
  const filtered = videos.filter(v => {
    const title = v.snippet.title;
    return !channel.excludePatterns.some(pat => pat.test(title));
  });
  console.log(`  ${filtered.length}개 (${videos.length - filtered.length}개 제외)`);

  if (filtered.length === 0) return { inserted: 0, skipped: 0 };

  // 중복 체크
  const videoUrls = filtered.map(v => `https://www.youtube.com/shorts/${v.id.videoId}`);
  const existing = await db.collection('news').find(
    { articleUrl: { $in: videoUrls } },
    { projection: { articleUrl: 1 } }
  ).toArray();
  const existingUrls = new Set(existing.map(e => e.articleUrl));

  const newVideos = filtered.filter(v => !existingUrls.has(`https://www.youtube.com/shorts/${v.id.videoId}`));
  console.log(`  ${newVideos.length}개 신규 (${filtered.length - newVideos.length}개 중복 skip)`);

  if (newVideos.length === 0) return { inserted: 0, skipped: filtered.length };

  // artist_groups 캐시 로드
  const cache = await loadArtistCache(db);

  // 기사 생성 + 저장
  const articles = [];
  for (const video of newVideos) {
    const title = video.snippet.title;
    const classification = classifyVideo(title);
    const artists = extractArtists(title, cache);

    if (artists.length === 0) {
      console.log(`  ⚠ 아티스트 추출 실패: ${title.slice(0, 50)}`);
    }

    const article = await generateArticle(video, artists, classification, channel);
    articles.push(article);
    console.log(`  + [${classification.label}] ${article.title.slice(0, 60)}`);
    // 번역 API rate limit 방지
    await new Promise(r => setTimeout(r, 300));
  }

  if (articles.length > 0) {
    await db.collection('news').insertMany(articles);
  }

  return { inserted: articles.length, skipped: filtered.length - newVideos.length };
}

async function runCrawl() {
  const now = new Date();
  console.log(`\n[YouTube News] 크롤링 시작: ${now.toISOString()}`);

  if (!YOUTUBE_API_KEY) {
    console.error('[YouTube News] YOUTUBE_API_KEY가 설정되지 않았습니다');
    return;
  }

  let client;
  try {
    client = new MongoClient(MONGODB_URI, {
      tls: false,
      tlsAllowInvalidCertificates: true,
      retryWrites: false,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    });
    await client.connect();
    const db = client.db(MONGODB_DB);

    const enabledChannels = channels.filter(c => c.enabled);
    console.log(`[YouTube News] ${enabledChannels.length}개 채널 처리`);

    for (const channel of enabledChannels) {
      try {
        const result = await crawlChannel(db, channel);
        console.log(`[YouTube] ${channel.name}: ${result.inserted}개 신규, ${result.skipped}개 skip`);
      } catch (e) {
        console.error(`[YouTube] ${channel.name} 에러:`, e.message);
      }
      // 채널 간 딜레이
      if (enabledChannels.length > 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  } catch (e) {
    console.error('[YouTube News] DB 연결 에러:', e.message);
  } finally {
    if (client) {
      try { await client.close(); } catch {}
    }
  }

  console.log(`[YouTube News] 크롤링 완료: ${new Date().toISOString()}\n`);
}

// ==================== Cron ====================

// 매 6시간마다 (0, 6, 12, 18시 UTC)
cron.schedule('0 */6 * * *', () => {
  console.log('[YouTube News] 정기 크롤링 시작');
  runCrawl();
});

console.log('[YouTube News] 스케줄러 시작됨 - 6시간마다 크롤링');
console.log(`[YouTube News] 채널: ${channels.filter(c => c.enabled).map(c => c.name).join(', ')}`);

// 시작 시 즉시 1회 실행
runCrawl();
