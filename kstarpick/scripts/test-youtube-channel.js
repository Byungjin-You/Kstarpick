// YouTube 채널 크롤링 드라이런 (DB 쓰기 없음)
// 사용법: node scripts/test-youtube-channel.js [channelId]
//        node scripts/test-youtube-channel.js tv10    ← channels.js의 id

const fs = require('fs');
const path = require('path');

// .env.local 로드
let envPath = path.resolve(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) envPath = path.resolve(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const { channels, PHOTO_CATEGORIES, CATEGORY_KEYWORDS } = require('../lib/crawlers/youtube-channels');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) {
  console.error('❌ YOUTUBE_API_KEY 없음');
  process.exit(1);
}

// 분류 함수 (youtube-news-crawler.js에서 복사)
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

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

async function fetchRecentVideos(channelId, max = 15) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=${max}&type=video&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return (data.items || []).map(v => ({
    id: v.id.videoId,
    title: decodeHtml(v.snippet.title),
    publishedAt: v.snippet.publishedAt,
    desc: decodeHtml(v.snippet.description || '').slice(0, 100),
  }));
}

// 해시태그 + 괄호 기반 간단 아티스트 추출 (DB 없이)
function extractArtistsSimple(title) {
  const result = [];
  const hash = title.match(/#(\S+)/g);
  if (hash) result.push(...hash.map(h => h.replace('#', '')));
  const prefix = title.match(/^([가-힣A-Za-z0-9&\s]{2,20}?)(?:\s*[-|·]\s*|\s+(?:쇼챔|음악중심|인기가요|출국|입국|팬미팅|사인회|레드카펫|축제|공연))/);
  if (prefix && result.length === 0) result.push(prefix[1].trim());
  return result;
}

async function run() {
  const targetId = process.argv[2] || 'tv10';
  const channel = channels.find(c => c.id === targetId);
  if (!channel) {
    console.error(`❌ ${targetId} 채널 설정 없음. 사용 가능:`, channels.map(c => c.id).join(', '));
    process.exit(1);
  }

  console.log('━'.repeat(80));
  console.log(`🎬 ${channel.name}  (${channel.handle})`);
  console.log(`   channelId: ${channel.channelId}`);
  console.log(`   ${channel.url}`);
  console.log('━'.repeat(80));

  const videos = await fetchRecentVideos(channel.channelId, 15);
  console.log(`\n📥 최근 영상 ${videos.length}개 fetch\n`);

  let excluded = 0, classified = {};
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const isExcluded = channel.excludePatterns.some(p => p.test(v.title));
    const cls = classifyVideo(v.title);
    const artists = extractArtistsSimple(v.title);
    const date = new Date(v.publishedAt).toISOString().slice(0, 10);

    classified[cls.label] = (classified[cls.label] || 0) + 1;
    if (isExcluded) excluded++;

    const mark = isExcluded ? '⛔' : '✅';
    const catTag = `[${cls.label}]`.padEnd(18);
    console.log(`${mark} ${date} ${catTag} ${v.title}`);
    console.log(`   └─ videoId=${v.id}  artists=${JSON.stringify(artists)}`);
  }

  console.log('\n' + '━'.repeat(80));
  console.log('📊 요약');
  console.log('━'.repeat(80));
  console.log(`  총 ${videos.length}개 · 제외 ${excluded}개 · 신규로 들어갈 후보 ${videos.length - excluded}개`);
  console.log('  카테고리 분포:');
  for (const [k, v] of Object.entries(classified)) {
    console.log(`    - ${k}: ${v}`);
  }
  console.log('');
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });