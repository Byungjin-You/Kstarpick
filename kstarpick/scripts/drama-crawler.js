/**
 * Drama Auto-Crawler Cron Script
 *
 * - MyDramaList에서 한국 드라마/TV쇼 최신순 크롤링
 * - 평점(rating > 0)이 있는 드라마만 저장
 * - 리뷰도 자동으로 MDL Review API로 크롤링
 * - 매일 04:00 KST 실행
 */

const cron = require('node-cron');
const { MongoClient, ObjectId } = require('mongodb');
const cheerio = require('cheerio');
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

const MDL_SEARCH_URL = 'https://mydramalist.com/search?adv=titles&ty=68,83&co=3&so=newest&or=asc&page=';
const MDL_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Referer': 'https://mydramalist.com/',
  'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"'
};
const MDL_API_HEADERS = {
  ...MDL_HEADERS,
  'Accept': 'application/json',
  'Origin': 'https://mydramalist.com',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'X-Requested-With': 'XMLHttpRequest'
};

const MAX_PAGES = 3; // 최신순 3페이지 (약 60개)
const DELAY_MS = 2000; // 요청 간 2초 딜레이

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'kstarpick';
  const client = new MongoClient(uri);
  await client.connect();
  return { db: client.db(dbName), client };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── 1. 검색 목록 크롤링 ───
async function crawlSearchPage(page) {
  const url = MDL_SEARCH_URL + page;
  try {
    const res = await fetch(url, { headers: MDL_HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.log(`  검색 페이지 ${page} 실패: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const dramas = [];

    $('div[id^="mdl-"]').each((i, el) => {
      const linkEl = $(el).find('h6.text-primary.title a').first();
      const href = linkEl.attr('href');
      const title = linkEl.text().trim();

      const metaText = $(el).find('span.text-muted').text().trim();
      const metaParts = metaText.split(' - ');
      const category = metaParts[0]?.includes('Movie') ? 'movie' : 'drama';

      const ratingEl = $(el).find('span.p-l-xs.score');
      const rating = ratingEl.text() ? parseFloat(ratingEl.text()) : 0;

      const imageEl = $(el).find('img.img-responsive.cover');
      const imageUrl = imageEl.attr('src') || imageEl.attr('data-src') || '';

      const summaryEl = $(el).find('p').not(':has(span)').not(':empty');
      const summary = summaryEl.text().trim();

      const mdlIdRaw = $(el).attr('id')?.replace('mdl-', '') || '';

      if (href && title) {
        dramas.push({
          mdlId: mdlIdRaw,
          url: 'https://mydramalist.com' + href,
          title,
          category,
          rating,
          imageUrl,
          summary
        });
      }
    });

    return dramas;
  } catch (err) {
    console.log(`  검색 페이지 ${page} 에러: ${err.message}`);
    return [];
  }
}

// ─── 2. 상세 페이지 크롤링 ───
async function crawlDetailPage(dramaUrl, mdlId) {
  try {
    const res = await fetch(dramaUrl, { headers: MDL_HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $('h1.film-title').text().trim();
    const originalTitle = $('p.film-aka').text().trim();
    const coverImage = $('.film-cover img.img-responsive').attr('src') || '';
    const slug = dramaUrl.split('/').pop();

    const ratingText = $('.film-rating-vote').text().trim();
    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    const summary = $('.show-synopsis').text().trim();

    // 메타 정보
    const metaData = {};
    $('.box-body.light-b dl.dl-horizontal').each((i, el) => {
      $(el).find('dt').each((j, dt) => {
        const key = $(dt).text().trim().toLowerCase();
        const value = $(dt).next('dd').text().trim();
        metaData[key] = value;
      });
    });

    // 장르
    const genres = [];
    $('.show-genres a').each((i, el) => genres.push($(el).text().trim()));

    // 출연진
    const cast = [];
    $('.box-body ul.list li.cast-item').each((i, el) => {
      const name = $(el).find('.text-primary.text-ellipsis a').text().trim();
      const role = $(el).find('.text-muted').text().trim();
      const image = $(el).find('img').attr('src') || '';
      if (name) cast.push({ name, role, image });
    });

    // 태그
    const tags = [];
    $('.show-tags a').each((i, el) => tags.push($(el).text().trim()));

    const status = metaData['status'] || '';
    const episodes = metaData['episodes'] ? parseInt(metaData['episodes']) : null;
    const network = metaData['original network'] || '';

    return {
      mdlId,
      mdlUrl: dramaUrl,
      mdlSlug: slug,
      title,
      originalTitle,
      coverImage,
      bannerImage: coverImage,
      summary,
      description: summary,
      reviewRating: rating,
      genres,
      cast,
      tags,
      status: status.toLowerCase() || 'completed',
      releaseDate: metaData['aired'] || metaData['released'] || '',
      country: metaData['country'] || 'South Korea',
      episodes,
      runtime: metaData['duration'] || '',
      network,
      contentRating: metaData['content rating'] || '',
      category: episodes ? 'drama' : 'movie'
    };
  } catch (err) {
    console.log(`  상세 크롤링 에러 (${dramaUrl}): ${err.message}`);
    return null;
  }
}

// ─── 3. 리뷰 크롤링 (MDL API) ───
async function crawlReviews(mdlId) {
  try {
    const apiUrl = `https://mydramalist.com/v1/titles/${mdlId}/reviews?page=1&limit=10&sort=newest`;
    const res = await fetch(apiUrl, { headers: MDL_API_HEADERS, signal: AbortSignal.timeout(10000) });

    if (!res.ok) {
      console.log(`  리뷰 API 실패 (mdlId:${mdlId}): ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data?.data || !Array.isArray(data.data)) return [];

    return data.data.map(r => ({
      reviewId: `mdl-${r.id}`,
      username: r.user?.name || 'Unknown',
      userProfileUrl: r.user?.url || '',
      userImage: r.user?.avatar_url || '',
      status: r.watch_status || 'Completed',
      watchedEpisodes: r.watched_episodes || 0,
      totalEpisodes: r.total_episodes || 0,
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      rating: parseFloat(r.score) || 0,
      storyRating: parseFloat(r.story_score) || 0,
      actingRating: parseFloat(r.acting_score) || 0,
      musicRating: parseFloat(r.music_score) || 0,
      rewatchRating: parseFloat(r.rewatch_value_score) || 0,
      title: r.subject || `${r.user?.name || 'User'}의 리뷰`,
      reviewText: r.body || '',
      reviewHtml: r.body_html || r.body || '',
      helpfulCount: r.like_count || 0,
      commentCount: r.total_comments || 0,
      reviewUrl: r.url || `https://mydramalist.com/${mdlId}/reviews/${r.id}`,
      sourceUrl: `https://mydramalist.com/${mdlId}/reviews`,
      crawledAt: new Date()
    })).filter(Boolean);
  } catch (err) {
    console.log(`  리뷰 크롤링 에러 (mdlId:${mdlId}): ${err.message}`);
    return [];
  }
}

// ─── 4. DB 저장 ───
async function saveDrama(db, dramaData) {
  // 필드 매핑
  if (dramaData.synopsis && !dramaData.summary) dramaData.summary = dramaData.synopsis;
  if (dramaData.posterImage && !dramaData.coverImage) dramaData.coverImage = dramaData.posterImage;

  // slug 생성
  if (!dramaData.slug && dramaData.mdlSlug) {
    dramaData.slug = dramaData.mdlSlug;
  }
  if (!dramaData.slug) {
    const baseSlug = dramaData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    dramaData.slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
  }

  // 기존 드라마 검색 (mdlUrl 기준)
  const query = dramaData.mdlUrl ? { mdlUrl: dramaData.mdlUrl } : { title: dramaData.title };
  const existing = await db.collection('dramas').findOne(query);

  if (existing) {
    // 업데이트 (기존 필드 보존)
    const merged = { ...dramaData, updatedAt: new Date(), createdAt: existing.createdAt || new Date() };
    delete merged._id;
    await db.collection('dramas').updateOne({ _id: existing._id }, { $set: merged });
    return { action: 'updated', id: existing._id };
  } else {
    // 신규 등록
    dramaData.createdAt = new Date();
    dramaData.updatedAt = new Date();
    const result = await db.collection('dramas').insertOne(dramaData);
    return { action: 'inserted', id: result.insertedId };
  }
}

async function saveReviews(db, reviews, dramaId) {
  let saved = 0;
  for (const review of reviews) {
    review.dramaId = dramaId;
    const existing = await db.collection('reviews').findOne({ reviewId: review.reviewId });
    if (existing) {
      await db.collection('reviews').updateOne({ reviewId: review.reviewId }, { $set: review });
    } else {
      await db.collection('reviews').insertOne(review);
      saved++;
    }
  }

  // 드라마 평균 평점 업데이트
  const allReviews = await db.collection('reviews').find({ dramaId }).toArray();
  let totalRating = 0, ratingCount = 0;
  const ratingDistribution = Array(10).fill(0);

  for (const r of allReviews) {
    if (r.rating > 0) {
      totalRating += r.rating;
      ratingCount++;
      const idx = Math.floor(r.rating) - 1;
      if (idx >= 0 && idx < 10) ratingDistribution[idx]++;
    }
  }

  await db.collection('dramas').updateOne(
    { _id: dramaId },
    { $set: { reviewCount: allReviews.length, reviewRating: ratingCount > 0 ? totalRating / ratingCount : 0, ratingDistribution } }
  );

  return saved;
}

// ─── 메인 실행 ───
async function runDramaCrawl() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 드라마 크롤링 시작`);

  let client;
  try {
    const conn = await connectToDatabase();
    const db = conn.db;
    client = conn.client;

    let totalFound = 0, totalSaved = 0, totalUpdated = 0, totalSkipped = 0, totalReviews = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
      console.log(`[Drama Crawler] 검색 페이지 ${page}/${MAX_PAGES} 크롤링...`);
      const dramas = await crawlSearchPage(page);
      console.log(`  ${dramas.length}개 발견`);
      totalFound += dramas.length;

      for (const drama of dramas) {
        await sleep(DELAY_MS);

        // 상세 페이지 크롤링 (검색 목록 rating은 무시, 상세 페이지에서 정확한 rating 확인)
        const detail = await crawlDetailPage(drama.url, drama.mdlId);
        if (!detail) {
          totalSkipped++;
          continue;
        }

        // 상세 페이지 기준 평점 체크 — 평점 없으면 저장하지 않음
        if (!detail.reviewRating || detail.reviewRating <= 0) {
          totalSkipped++;
          continue;
        }

        // DB 저장
        const saveResult = await saveDrama(db, detail);
        if (saveResult.action === 'inserted') totalSaved++;
        else totalUpdated++;

        // 리뷰 크롤링
        await sleep(1000);
        const reviews = await crawlReviews(drama.mdlId);
        if (reviews.length > 0) {
          const newReviews = await saveReviews(db, reviews, saveResult.id);
          totalReviews += newReviews;
        }

        if ((totalSaved + totalUpdated) % 10 === 0) {
          console.log(`  진행: ${totalSaved}개 신규, ${totalUpdated}개 업데이트, ${totalSkipped}개 스킵`);
        }
      }

      await sleep(DELAY_MS);
    }

    console.log(`[Drama Crawler] 완료!`);
    console.log(`  검색: ${totalFound}개 | 신규: ${totalSaved}개 | 업데이트: ${totalUpdated}개 | 스킵(평점없음): ${totalSkipped}개 | 리뷰: ${totalReviews}개`);

    await client.close();
  } catch (err) {
    console.error('[Drama Crawler] 에러:', err.message);
    if (client) await client.close();
  }
}

// 매일 04:00 KST
cron.schedule('0 4 * * *', () => {
  console.log('[Drama Crawler] 일일 크롤링 (04:00 KST)');
  runDramaCrawl();
}, { timezone: 'Asia/Seoul' });

console.log('[Drama Crawler] 스케줄러 시작됨 - 매일 04:00 KST');

// 시작 시 즉시 1회 실행
runDramaCrawl();
