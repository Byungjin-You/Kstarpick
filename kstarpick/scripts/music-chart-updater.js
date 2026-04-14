/**
 * Music Chart Auto-Updater Cron Script
 *
 * 매일 07:00 KST: 조회수 업데이트 + 순위 재정렬
 * 매주 월요일 06:00 KST: 기존 전체 삭제 → 이번주 인기 영상 50개 새로 등록
 *
 * YouTube Playlist: 이번주 인기 K-POP 영상
 */

const cron = require('node-cron');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

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

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=OLNY56MxFrczc5CoAvnTCDO_3bAdOLExkJQ';

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'kstarpick';
  const client = new MongoClient(uri);
  await client.connect();
  return { db: client.db(dbName), client };
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function generateSlug(title, artist) {
  const baseSlug = `${title}-${artist}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
  return baseSlug || `music-${Date.now()}`;
}

// ─── YouTube API로 실제 조회수 가져오기 ───
function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function fetchRealViewCounts(videoIds) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY not configured');
    return {};
  }

  const results = {};
  // YouTube API는 한 번에 최대 50개
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${batch.join(',')}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        console.error(`YouTube API error ${res.status}:`, errText.substring(0, 200));
        continue;
      }
      const data = await res.json();
      if (data.items) {
        for (const item of data.items) {
          results[item.id] = {
            viewCount: parseInt(item.statistics?.viewCount) || 0,
            likeCount: parseInt(item.statistics?.likeCount) || 0
          };
        }
      }
    } catch (err) {
      console.error('YouTube API fetch error:', err.message);
    }
  }
  return results;
}

// ─── 1. 매일: 실제 YouTube 조회수 업데이트 + 순위 재정렬 ───
async function updateViewsAndRank() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 실제 조회수 업데이트 + 순위 정렬 시작`);

  let client;
  try {
    const conn = await connectToDatabase();
    const db = conn.db;
    client = conn.client;

    const allMusic = await db.collection('musics').find({}).toArray();
    if (allMusic.length === 0) {
      console.log('음악 데이터 없음. 종료.');
      await client.close();
      return;
    }

    console.log(`${allMusic.length}개 음악 실제 조회수 가져오는 중...`);

    // Step 1: YouTube videoId 추출
    const videoIdMap = {}; // videoId → music._id[]
    for (const music of allMusic) {
      const youtubeUrl = music.youtubeUrl || music.musicVideo || '';
      const videoId = extractVideoId(youtubeUrl);
      if (videoId) {
        videoIdMap[videoId] = music._id;
      }
    }

    const videoIds = Object.keys(videoIdMap);
    if (videoIds.length === 0) {
      console.log('YouTube URL이 있는 음악이 없음. 종료.');
      await client.close();
      return;
    }

    // Step 2: YouTube API로 실제 조회수 가져오기
    const realStats = await fetchRealViewCounts(videoIds);
    console.log(`YouTube API: ${Object.keys(realStats).length}/${videoIds.length}개 영상 조회수 확인`);

    // Step 3: DB 업데이트
    const bulkOps = [];
    for (const music of allMusic) {
      const youtubeUrl = music.youtubeUrl || music.musicVideo || '';
      const videoId = extractVideoId(youtubeUrl);
      const stats = videoId ? realStats[videoId] : null;

      if (stats) {
        const oldViews = typeof music.views === 'number' ? music.views : parseInt(music.views) || 0;
        const newViews = stats.viewCount;
        // dailyViews = 오늘 조회수 - 어제 조회수 (증가분)
        const dailyViews = Math.max(0, newViews - oldViews);

        bulkOps.push({
          updateOne: {
            filter: { _id: music._id },
            update: {
              $set: {
                views: newViews,
                totalViews: newViews,
                dailyViews: dailyViews,
                dailyview: dailyViews,
                dailyView: dailyViews,
                likes: stats.likeCount,
                updatedAt: new Date()
              }
            }
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await db.collection('musics').bulkWrite(bulkOps);
    }

    console.log(`${bulkOps.length}개 음악 실제 조회수 업데이트 완료`);

    // Step 4: dailyViews 기준 순위 재정렬
    const sorted = await db.collection('musics').find({}).sort({ dailyViews: -1 }).toArray();
    const rankOps = [];
    let changed = 0;

    for (let i = 0; i < sorted.length; i++) {
      const music = sorted[i];
      const newPosition = i + 1;
      const oldPosition = typeof music.position === 'number' ? music.position : 99;

      if (newPosition !== oldPosition) {
        rankOps.push({
          updateOne: {
            filter: { _id: music._id },
            update: {
              $set: {
                position: newPosition,
                previousPosition: oldPosition
              }
            }
          }
        });
        changed++;
      }
    }

    if (rankOps.length > 0) {
      await db.collection('musics').bulkWrite(rankOps);
    }

    // 상위 3개 로그
    const top3 = sorted.slice(0, 3);
    console.log(`조회수 업데이트 완료. 순위 변경: ${changed}건`);
    top3.forEach((m, i) => {
      console.log(`  ${i + 1}위: ${m.title} (${m.artist}) - daily: ${m.dailyViews}`);
    });

    await client.close();
  } catch (err) {
    console.error('조회수 업데이트 에러:', err.message);
    if (client) await client.close();
  }
}

// ─── 2. 매주 월요일: 전체 삭제 → 이번주 인기 영상 50개 등록 ───
async function refreshWeeklyChart() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 주간 차트 갱신 시작`);

  let client;
  try {
    const conn = await connectToDatabase();
    const db = conn.db;
    client = conn.client;

    // Step 1: YouTube Playlist에서 영상 가져오기
    console.log('[Music Chart] YouTube 플레이리스트 가져오는 중...');
    const videos = await fetchPlaylistVideos();

    if (!videos || videos.length === 0) {
      console.log('[Music Chart] 영상을 가져오지 못했습니다. 기존 데이터 유지.');
      await client.close();
      return;
    }

    console.log(`[Music Chart] ${videos.length}개 영상 로드 완료`);

    // Step 2: 기존 데이터 전체 삭제
    const deleteResult = await db.collection('musics').deleteMany({});
    console.log(`[Music Chart] 기존 ${deleteResult.deletedCount}개 삭제`);

    // Step 3: 새 영상 50개 등록
    const musicDocs = [];
    for (let i = 0; i < Math.min(videos.length, 50); i++) {
      const video = videos[i];
      const title = decodeHtmlEntities(video.title);
      const artist = decodeHtmlEntities(video.channelTitle);
      const views = parseInt(video.viewCount) || 0;
      const dailyViews = Math.max(50, Math.round(views * (Math.random() * 0.02 + 0.01)));

      let slug = generateSlug(title, artist);
      // slug 중복 방지
      const existing = musicDocs.find(d => d.slug === slug);
      if (existing) slug = `${slug}-${i}`;

      musicDocs.push({
        title,
        artist,
        slug,
        album: '',
        position: i + 1,
        previousPosition: i + 1,
        youtubeUrl: video.youtubeUrl || `https://www.youtube.com/watch?v=${video.videoId}`,
        musicVideo: video.youtubeUrl || `https://www.youtube.com/watch?v=${video.videoId}`,
        dailyViews,
        dailyview: dailyViews,
        dailyView: dailyViews,
        views,
        totalViews: views,
        releaseDate: video.publishedAt || new Date().toISOString(),
        featured: i < 10,
        coverImage: video.thumbnailUrl || '',
        description: '',
        genre: ['kpop'],
        likes: parseInt(video.likeCount) || 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (musicDocs.length > 0) {
      await db.collection('musics').insertMany(musicDocs);
    }

    console.log(`[Music Chart] ${musicDocs.length}개 새 영상 등록 완료`);
    musicDocs.slice(0, 5).forEach((m, i) => {
      console.log(`  ${i + 1}위: ${m.title} (${m.artist}) - views: ${m.views}`);
    });

    await client.close();
  } catch (err) {
    console.error('[Music Chart] 주간 갱신 에러:', err.message);
    if (client) await client.close();
  }
}

// ─── YouTube Playlist API 호출 ───
async function fetchPlaylistVideos() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY not configured');
    return [];
  }

  try {
    // Playlist ID 추출
    const url = new URL(PLAYLIST_URL);
    const playlistId = url.searchParams.get('list');
    if (!playlistId) {
      console.error('Invalid playlist URL');
      return [];
    }

    // Playlist Items 가져오기 (최대 50개)
    const listUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
    const listRes = await fetch(listUrl);

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error(`YouTube Playlist API error ${listRes.status}:`, errText.substring(0, 200));
      return [];
    }

    const listData = await listRes.json();
    if (!listData.items || listData.items.length === 0) {
      console.log('Playlist is empty');
      return [];
    }

    // Video IDs 수집
    const videoIds = listData.items
      .map(item => item.snippet?.resourceId?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) return [];

    // Video 상세 정보 (조회수, 좋아요)
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds.join(',')}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);

    let detailsMap = {};
    if (detailsRes.ok) {
      const detailsData = await detailsRes.json();
      if (detailsData.items) {
        for (const item of detailsData.items) {
          detailsMap[item.id] = {
            viewCount: item.statistics?.viewCount || '0',
            likeCount: item.statistics?.likeCount || '0',
            publishedAt: item.snippet?.publishedAt || ''
          };
        }
      }
    }

    // 결과 조합
    return listData.items.map(item => {
      const videoId = item.snippet?.resourceId?.videoId;
      const details = detailsMap[videoId] || {};
      const thumbnails = item.snippet?.thumbnails || {};

      return {
        videoId,
        title: item.snippet?.title || '',
        channelTitle: item.snippet?.channelTitle || '',
        publishedAt: details.publishedAt || item.snippet?.publishedAt || '',
        thumbnailUrl: thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || '',
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        viewCount: details.viewCount || '0',
        likeCount: details.likeCount || '0'
      };
    }).filter(v => v.videoId);
  } catch (err) {
    console.error('fetchPlaylistVideos error:', err.message);
    return [];
  }
}

// ─── 크론 스케줄 ───

// 매일 11:00 KST: 조회수 업데이트 + 순위 정렬 (배치 분산 스케줄 — 기존 07:00에서 이동)
cron.schedule('0 11 * * *', () => {
  console.log('[Music Chart] 일일 조회수 업데이트 (11:00 KST)');
  updateViewsAndRank();
}, { timezone: 'Asia/Seoul' });

// 매주 월요일 11:30 KST: 주간 차트 갱신 (배치 분산 스케줄 — 기존 06:00에서 이동)
cron.schedule('30 11 * * 1', () => {
  console.log('[Music Chart] 주간 차트 갱신 (월요일 11:30 KST)');
  refreshWeeklyChart();
}, { timezone: 'Asia/Seoul' });

console.log('[Music Chart] 스케줄러 시작됨');
console.log('  - 매일 11:00 KST: 조회수 업데이트 + 순위 정렬');
console.log('  - 매주 월요일 11:30 KST: 주간 차트 갱신 (50개)');

// 시작 시 즉시 실행 제거 — PM2 재시작 시 모든 배치가 동시 실행되는 것 방지
console.log('[Music Chart] 다음 스케줄 실행 대기 중');
