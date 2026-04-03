/**
 * Drama Auto-Crawler Cron Script
 *
 * - MyDramaList에서 한국 드라마/TV쇼 최신순 크롤링 (Puppeteer Stealth)
 * - 상세 페이지에서 평점 확인 → rating > 0인 것만 저장
 * - 리뷰도 MDL Review API로 자동 크롤링
 * - 매일 04:00 KST 실행
 */

const cron = require('node-cron');
const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

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
const MAX_PAGES = 3;
const DELAY_MS = 3000;

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

// ─── Puppeteer 페이지 가져오기 ───
async function fetchPageHtml(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // 사람처럼 약간 스크롤
    await page.evaluate(() => window.scrollBy(0, 300));
    await sleep(500 + Math.random() * 1000);
    return await page.content();
  } catch (err) {
    console.log(`  페이지 로드 실패 (${url}): ${err.message}`);
    return null;
  }
}

// ─── 1. 검색 목록 파싱 ───
function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const dramas = [];

  $('div[id^="mdl-"]').each((_, el) => {
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

    const mdlIdRaw = $(el).attr('id')?.replace('mdl-', '') || '';

    if (href && title) {
      dramas.push({
        mdlId: mdlIdRaw,
        url: 'https://mydramalist.com' + href,
        title,
        category,
        rating,
        imageUrl
      });
    }
  });

  return dramas;
}

// ─── 2. 상세 페이지 파싱 ───
function parseDetailPage(html, dramaUrl, mdlId) {
  const $ = cheerio.load(html);

  const title = $('h1.film-title').text().trim();
  const originalTitle = $('p.film-aka').text().trim();
  const coverImage = $('.film-cover img.img-responsive').attr('src') || '';
  const slug = dramaUrl.split('/').pop();

  const ratingText = $('.film-rating-vote').text().trim();
  const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

  const summary = $('.show-synopsis').text().trim();

  const metaData = {};
  $('.box-body.light-b dl.dl-horizontal').each((_, el) => {
    $(el).find('dt').each((__, dt) => {
      const key = $(dt).text().trim().toLowerCase();
      const value = $(dt).next('dd').text().trim();
      metaData[key] = value;
    });
  });

  const genres = [];
  $('.show-genres a').each((_, el) => genres.push($(el).text().trim()));

  const cast = [];
  $('.box-body ul.list li.cast-item').each((_, el) => {
    const name = $(el).find('.text-primary.text-ellipsis a').text().trim();
    const role = $(el).find('.text-muted').text().trim();
    const image = $(el).find('img').attr('src') || '';
    if (name) cast.push({ name, role, image });
  });

  const tags = [];
  $('.show-tags a').each((_, el) => tags.push($(el).text().trim()));

  const episodes = metaData['episodes'] ? parseInt(metaData['episodes']) : null;

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
    status: (metaData['status'] || 'completed').toLowerCase(),
    releaseDate: metaData['aired'] || metaData['released'] || '',
    country: metaData['country'] || 'South Korea',
    episodes,
    runtime: metaData['duration'] || '',
    network: metaData['original network'] || '',
    contentRating: metaData['content rating'] || '',
    category: episodes ? 'drama' : 'movie'
  };
}

// ─── 3. 리뷰 크롤링 (MDL API — Puppeteer 쿠키 활용) ───
async function crawlReviews(page, mdlId) {
  try {
    const apiUrl = `https://mydramalist.com/v1/titles/${mdlId}/reviews?page=1&limit=10&sort=newest`;

    // Puppeteer의 브라우저 컨텍스트에서 API 호출 (쿠키/세션 공유)
    const data = await page.evaluate(async (url) => {
      try {
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    }, apiUrl);

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
  if (!dramaData.slug && dramaData.mdlSlug) {
    dramaData.slug = dramaData.mdlSlug;
  }
  if (!dramaData.slug) {
    const baseSlug = dramaData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    dramaData.slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
  }

  const query = dramaData.mdlUrl ? { mdlUrl: dramaData.mdlUrl } : { title: dramaData.title };
  const existing = await db.collection('dramas').findOne(query);

  if (existing) {
    const merged = { ...dramaData, updatedAt: new Date(), createdAt: existing.createdAt || new Date() };
    delete merged._id;
    await db.collection('dramas').updateOne({ _id: existing._id }, { $set: merged });
    return { action: 'updated', id: existing._id };
  } else {
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
  console.log(`\n[${timestamp}] 드라마 크롤링 시작 (Puppeteer Stealth)`);

  let client, browser;
  try {
    const conn = await connectToDatabase();
    const db = conn.db;
    client = conn.client;

    // Puppeteer 브라우저 실행
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let totalFound = 0, totalSaved = 0, totalUpdated = 0, totalSkipped = 0, totalReviews = 0;

    for (let p = 1; p <= MAX_PAGES; p++) {
      console.log(`[Drama Crawler] 검색 페이지 ${p}/${MAX_PAGES} 크롤링...`);
      const html = await fetchPageHtml(page, MDL_SEARCH_URL + p);
      if (!html) {
        console.log(`  페이지 ${p} 로드 실패, 스킵`);
        continue;
      }

      const dramas = parseSearchPage(html);
      console.log(`  ${dramas.length}개 발견`);
      totalFound += dramas.length;

      for (const drama of dramas) {
        await sleep(DELAY_MS + Math.random() * 2000);

        // 상세 페이지 크롤링
        const detailHtml = await fetchPageHtml(page, drama.url);
        if (!detailHtml) {
          totalSkipped++;
          continue;
        }

        const detail = parseDetailPage(detailHtml, drama.url, drama.mdlId);
        if (!detail || !detail.title) {
          totalSkipped++;
          continue;
        }

        // 평점 체크 — 상세 페이지 기준
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
        const reviews = await crawlReviews(page, drama.mdlId);
        if (reviews.length > 0) {
          const newReviews = await saveReviews(db, reviews, saveResult.id);
          totalReviews += newReviews;
        }

        if ((totalSaved + totalUpdated) % 5 === 0) {
          console.log(`  진행: ${totalSaved}개 신규, ${totalUpdated}개 업데이트, ${totalSkipped}개 스킵, 리뷰 ${totalReviews}개`);
        }
      }

      await sleep(DELAY_MS);
    }

    console.log(`[Drama Crawler] 완료!`);
    console.log(`  검색: ${totalFound}개 | 신규: ${totalSaved}개 | 업데이트: ${totalUpdated}개 | 스킵(평점없음): ${totalSkipped}개 | 리뷰: ${totalReviews}개`);

    await browser.close();
    await client.close();
  } catch (err) {
    console.error('[Drama Crawler] 에러:', err.message);
    if (browser) await browser.close().catch(() => {});
    if (client) await client.close();
  }
}

// 매일 04:00 KST
cron.schedule('0 4 * * *', () => {
  console.log('[Drama Crawler] 일일 크롤링 (04:00 KST)');
  runDramaCrawl();
}, { timezone: 'Asia/Seoul' });

console.log('[Drama Crawler] 스케줄러 시작됨 - 매일 04:00 KST (Puppeteer Stealth)');

// 시작 시 즉시 1회 실행
runDramaCrawl();
