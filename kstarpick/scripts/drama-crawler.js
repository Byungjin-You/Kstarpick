/**
 * Drama Auto-Crawler Cron Script (메모리 안전 버전)
 *
 * 안전 장치:
 * - 검색 페이지 1개만 (최대 20개 드라마)
 * - 드라마 1개당 브라우저 새로 열고 닫기 (메모리 누적 방지)
 * - 각 단계 사이 5초 대기
 * - PM2 max_memory_restart: 500M
 *
 * - rating > 0인 드라마만 저장
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

// 크롤링 소스 (드라마/TV쇼 + 영화)
const MDL_SOURCES = [
  { name: 'Drama/TV', category: 'drama', url: 'https://mydramalist.com/search?adv=titles&ty=68,83&co=3&so=newest&or=asc&page=1' },
  { name: 'Movie',    category: 'movie', url: 'https://mydramalist.com/search?adv=titles&ty=77&co=3&so=newest&or=asc&page=1' }
];
const DELAY_BETWEEN_DRAMAS = 5000; // 5초
const API_BASE = process.env.API_BASE || process.env.NEXTAUTH_URL || 'http://localhost:13001';

// ─── YouTube 영상 자동 검색 ───
async function searchYouTubeVideos(title, originalTitle, category) {
  try {
    const keyword = category === 'movie' ? '영화' : '드라마';
    const searchQuery = originalTitle ? `${originalTitle} ${keyword}` : `${title} ${keyword}`;
    const url = `${API_BASE}/api/youtube/search-videos?title=${encodeURIComponent(searchQuery)}&maxResults=5`;

    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  YouTube 검색 실패: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
      return [];
    }
    return data.data.map(v => ({
      title: v.title,
      type: v.title.toLowerCase().includes('trailer') ? 'trailer'
          : v.title.toLowerCase().includes('teaser') ? 'teaser'
          : 'other',
      url: v.url,
      videoId: v.videoId,
      thumbnailUrl: v.thumbnailUrl,
      viewCount: v.viewCount,
      publishedAt: v.publishedAt,
    }));
  } catch (err) {
    console.log(`  YouTube 검색 에러: ${err.message}`);
    return [];
  }
}

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

// ─── 브라우저 launch (1회용) ───
async function launchBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--mute-audio',
      '--single-process'
    ]
  });
}

async function fetchHtmlOnce(url) {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(800);
    const html = await page.content();
    await page.close();
    return html;
  } catch (err) {
    console.log(`  페이지 로드 실패 (${url}): ${err.message}`);
    return null;
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

// 상세 페이지 + 리뷰 페이지(최대 3페이지) 한 브라우저로 처리
async function fetchDetailAndReviews(dramaUrl, mdlId) {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1) 상세 페이지
    await page.goto(dramaUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(800);
    const detailHtml = await page.content();

    // 2) 리뷰 페이지 (HTML 파싱, 최대 3페이지 × 12개 = 36개)
    const reviewHtmls = [];
    const reviewsBaseUrl = `${dramaUrl}/reviews`;
    for (let p = 1; p <= 3; p++) {
      try {
        const reviewsUrl = p === 1 ? reviewsBaseUrl : `${reviewsBaseUrl}?page=${p}`;
        await page.goto(reviewsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(600);
        const html = await page.content();
        const $tmp = cheerio.load(html);
        const reviewCount = $tmp('div.review').length;
        if (reviewCount === 0) break;
        reviewHtmls.push(html);
        if (reviewCount < 12) break; // 마지막 페이지
      } catch (err) {
        console.log(`  리뷰 페이지 ${p} 로드 실패: ${err.message}`);
        break;
      }
    }

    await page.close();
    return { detailHtml, reviewHtmls };
  } catch (err) {
    console.log(`  상세/리뷰 로드 실패 (${dramaUrl}): ${err.message}`);
    return { detailHtml: null, reviewHtmls: [] };
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

// ─── 리뷰 HTML 파싱 ───
function parseReviewsFromHtml(html, mdlId) {
  const $ = cheerio.load(html);
  const reviews = [];

  $('div.review').each((_, el) => {
    const $r = $(el);
    const idAttr = $r.attr('id') || '';
    const reviewIdRaw = idAttr.replace('review-', '');
    if (!reviewIdRaw) return;

    const usernameEl = $r.find('a.text-primary').first();
    const username = usernameEl.text().trim() || 'Unknown';
    const profileHref = usernameEl.attr('href') || '';
    const userProfileUrl = profileHref ? `https://mydramalist.com${profileHref}` : '';

    const userImage = $r.find('.avatar img').attr('src') || '';

    const status = $r.find('.review-tag').first().text().trim() || 'Completed';

    // 평점
    const overallText = $r.find('.rating-overall .score').text().trim();
    const rating = parseFloat(overallText) || 0;

    let storyRating = 0, actingRating = 0, musicRating = 0, rewatchRating = 0;
    $r.find('.review-rating > div').each((__, d) => {
      const text = $(d).text().trim().replace(/\s+/g, ' ');
      const scoreMatch = text.match(/([\d.]+)$/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
      if (/^Story/i.test(text)) storyRating = score;
      else if (/^Acting/i.test(text)) actingRating = score;
      else if (/^Music/i.test(text)) musicRating = score;
      else if (/^Rewatch/i.test(text)) rewatchRating = score;
    });

    // helpful count
    const helpfulMatch = $r.find('.user-stats').text().match(/(\d+)\s+people\s+found/);
    const helpfulCount = helpfulMatch ? parseInt(helpfulMatch[1]) : 0;

    // 에피소드 시청 정보
    const epsText = $r.find('.episodes-seen').text().trim();
    const epsMatch = epsText.match(/(\d+)\s*of\s*(\d+)/);
    const watchedEpisodes = epsMatch ? parseInt(epsMatch[1]) : 0;
    const totalEpisodes = epsMatch ? parseInt(epsMatch[2]) : 0;

    // 리뷰 본문 (제목 + 텍스트)
    const bodyEl = $r.find('.review-body').first().clone();
    // UI 요소 제거
    bodyEl.find('.box, .read-more, .review-helpful, button, .mdl-dropdown, .review-vote, .btn').remove();

    // 첫 번째 <p><strong>은 제목으로 분리
    let reviewTitle = '';
    const firstP = bodyEl.find('p').first();
    const firstStrong = firstP.find('strong').first();
    if (firstStrong.length && firstP.text().trim() === firstStrong.text().trim()) {
      reviewTitle = firstStrong.text().trim();
      firstP.remove();
    }

    const reviewHtml = bodyEl.html() || '';
    const reviewText = bodyEl.text().replace(/\s+/g, ' ').trim();

    reviews.push({
      reviewId: `mdl-${reviewIdRaw}`,
      username,
      userProfileUrl,
      userImage,
      status,
      watchedEpisodes,
      totalEpisodes,
      createdAt: new Date(), // MDL은 상대 시간만 표시 (e.g. "3 days ago")
      rating,
      storyRating,
      actingRating,
      musicRating,
      rewatchRating,
      title: reviewTitle || `${username}의 리뷰`,
      reviewText,
      reviewHtml,
      helpfulCount,
      commentCount: 0,
      reviewUrl: `https://mydramalist.com${profileHref}/review/${reviewIdRaw}`,
      sourceUrl: `https://mydramalist.com/${mdlId}/reviews`,
      crawledAt: new Date()
    });
  });

  return reviews;
}

// ─── 1. 검색 목록 파싱 ───
function parseSearchPage(html) {
  const $ = cheerio.load(html);
  const dramas = [];

  // mdl-{숫자}만 (mdl-lang 등 메뉴 박스 제외)
  $('div[id^="mdl-"]').each((_, el) => {
    const id = $(el).attr('id') || '';
    if (!/^mdl-\d+$/.test(id)) return;

    const linkEl = $(el).find('h6.text-primary.title a').first();
    const href = linkEl.attr('href');
    const title = linkEl.text().trim();

    const ratingEl = $(el).find('span.p-l-xs.score');
    const rating = ratingEl.text() ? parseFloat(ratingEl.text()) : 0;

    const mdlIdRaw = id.replace('mdl-', '');

    if (href && title) {
      dramas.push({
        mdlId: mdlIdRaw,
        url: 'https://mydramalist.com' + href,
        title,
        rating
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

  // 평점: .deep-orange (MDL이 셀렉터 변경 — 기존 .film-rating-vote는 더 이상 작동 안 함)
  const ratingText = $('.deep-orange').first().text().trim();
  const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

  // 평점자 수: .hfs "Ratings: 8.6/10 from 3,771 users"
  const usersMatch = $('.hfs').text().match(/from\s+([\d,]+)\s+user/i);
  const raters = usersMatch ? parseInt(usersMatch[1].replace(/,/g, '')) : 0;

  // MDL 자체 통계: .show-stats "Ranked #364 Popularity #1539 Watchers 3,771"
  const statsText = $('.show-stats').text().replace(/\s+/g, ' ');
  const rankedMatch = statsText.match(/Ranked\s*#(\d+)/i);
  const popularityMatch = statsText.match(/Popularity\s*#(\d+)/i);
  const watchersMatch = statsText.match(/Watchers\s*([\d,]+)/i);
  const mdlRanking = rankedMatch ? parseInt(rankedMatch[1]) : null;
  const mdlPopularity = popularityMatch ? parseInt(popularityMatch[1]) : null;
  const mdlWatchers = watchersMatch ? parseInt(watchersMatch[1].replace(/,/g, '')) : 0;

  // 줄거리: 첫 번째 .show-synopsis 요소만, <p> 태그 단위로 paragraph 보존
  const synopsisEl = $('.show-synopsis').first().clone();
  // 히든/더보기/spoiler/UI 요소 제거
  synopsisEl.find('.spoiler, .hidden, .more, .read-more, [hidden], .btn, button, a.edit-trans, .edit-trans, .small').remove();
  const paragraphs = [];
  synopsisEl.find('p').each((_, p) => {
    let text = $(p).text().trim().replace(/\s+/g, ' ');
    text = text.replace(/\s*Edit Translation\s*$/i, '').trim();
    if (text) paragraphs.push(text);
  });
  let summary;
  if (paragraphs.length > 0) {
    // 중복 paragraph 제거
    const uniqueParas = [...new Set(paragraphs)];
    summary = uniqueParas.join('\n\n');
  } else {
    summary = synopsisEl.text().trim().replace(/\s+/g, ' ').replace(/\s*Edit Translation\s*$/i, '').trim();
  }

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
    raters,
    mdlRanking,
    mdlPopularity,
    mdlWatchers,
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

// ─── 4. DB 저장 ───
async function saveDrama(db, dramaData) {
  if (!dramaData.slug && dramaData.mdlSlug) dramaData.slug = dramaData.mdlSlug;
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

  // 평점 분포 계산 (우리가 크롤링한 36개 리뷰 기준 — 표시용)
  const allReviews = await db.collection('reviews').find({ dramaId }).toArray();
  const ratingDistribution = Array(10).fill(0);
  for (const r of allReviews) {
    if (r.rating > 0 && r.rating <= 10) {
      const idx = Math.floor(r.rating) - 1;
      if (idx >= 0 && idx < 10) ratingDistribution[idx]++;
    }
  }

  // reviewCount는 우리 DB의 크롤링한 리뷰 수, reviewRating은 MDL 원본 유지 (덮어쓰지 않음)
  await db.collection('dramas').updateOne(
    { _id: dramaId },
    { $set: { reviewCount: allReviews.length, ratingDistribution } }
  );

  return saved;
}

// ─── 점수 계산 (Bayesian + 시간 가중치) ───
function calculateAutoScore(item) {
  const v = item.raters || 0;
  const R = item.reviewRating || 0;

  // 평점이 없거나 평점자가 너무 적으면 점수 0 (랭킹에서 사실상 제외)
  if (R <= 0 || v < 5) return 0;

  const m = 50;       // 최소 평점자 임계값
  const C = 7.0;      // 전체 평균 평점 (MDL 평균)

  // Bayesian Weighted Rating
  const bayesian = (v / (v + m)) * R + (m / (v + m)) * C;

  // 시간 가중치 (30일 이내 신작 보너스 0~0.3)
  const ageDays = item.createdAt
    ? (Date.now() - new Date(item.createdAt).getTime()) / 86400000
    : 999;
  const recencyBonus = Math.max(0, 1 - ageDays / 30) * 0.3;

  return bayesian + recencyBonus;
}

// ─── orderNumber 일괄 재계산 (category별 분리, Bayesian + 시간 가중치) ───
// 비-featured 모든 항목 대상 (rating 없는 것도 포함, score 0으로 뒤로 밀림)
async function recalculateOrderNumbers(db) {
  console.log('\n[Drama Crawler] orderNumber 일괄 재계산 시작 (category별)...');

  // category별로 처리
  for (const category of ['drama', 'movie']) {
    // featured: true인 것만 자동 영역에서 제외 (수동 큐레이션 보존)
    const items = await db.collection('dramas').find({
      category,
      featured: { $ne: true },
    }).project({
      _id: 1, title: 1, category: 1, reviewRating: 1, raters: 1, createdAt: 1
    }).toArray();

    if (items.length === 0) {
      console.log(`  [${category}] 대상 없음.`);
      continue;
    }

    // 점수 계산 + 정렬
    const scored = items.map(d => ({ ...d, score: calculateAutoScore(d) }));
    scored.sort((a, b) => b.score - a.score);

    // orderNumber 부여 (100부터 — featured 1~99 보존)
    // 모든 비-featured 항목을 100번대로 새로 부여하여 옛날 orderNumber 잔재 제거
    const bulkOps = scored.map((d, i) => ({
      updateOne: {
        filter: { _id: d._id },
        update: { $set: { orderNumber: 100 + i, autoScore: Math.round(d.score * 1000) / 1000 } }
      }
    }));

    await db.collection('dramas').bulkWrite(bulkOps);

    console.log(`  [${category}] ${bulkOps.length}개 재계산 완료. 상위 5개:`);
    scored.slice(0, 5).forEach((d, i) => {
      console.log(`    ${100 + i}. ${d.title} (rating: ${d.reviewRating}, raters: ${d.raters || 0}, score: ${d.score.toFixed(2)})`);
    });
  }
}

// ─── 단일 소스 크롤링 ───
async function crawlSource(db, source, totals) {
  console.log(`\n[Drama Crawler] === ${source.name} 소스 크롤링 ===`);
  console.log(`  URL: ${source.url}`);

  const searchHtml = await fetchHtmlOnce(source.url);
  if (!searchHtml) {
    console.log('  검색 페이지 로드 실패, 다음 소스로.');
    return;
  }

  const allItems = parseSearchPage(searchHtml);
  console.log(`  ${allItems.length}개 발견`);

  const items = allItems.filter(d => d.rating && d.rating > 0);
  const filteredOut = allItems.length - items.length;
  console.log(`  평점 있는 항목: ${items.length}개 (평점 없음으로 ${filteredOut}개 스킵)`);
  totals.skipped += filteredOut;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const memMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    console.log(`[${source.name} ${i + 1}/${items.length}] ${item.title} (list rating: ${item.rating}, mem: ${memMB}MB)`);

    await sleep(DELAY_BETWEEN_DRAMAS);

    const { detailHtml, reviewHtmls } = await fetchDetailAndReviews(item.url, item.mdlId);
    if (!detailHtml) {
      totals.skipped++;
      continue;
    }

    const detail = parseDetailPage(detailHtml, item.url, item.mdlId);
    if (!detail || !detail.title) {
      totals.skipped++;
      continue;
    }

    // 검색 소스의 category로 강제 지정 (episodes 추출 실패 케이스 대응)
    detail.category = source.category;

    // 리뷰 HTML 파싱
    const allReviews = [];
    for (const html of reviewHtmls) {
      allReviews.push(...parseReviewsFromHtml(html, item.mdlId));
    }
    const reviewsWithRating = allReviews.filter(r => r.rating > 0);

    // YouTube 영상 자동 검색 (신규/업데이트 모두 — videos 비어있을 때만)
    // 기존 데이터 보존을 위해 saveDrama 전에 existing 확인
    const existing = await db.collection('dramas').findOne({ mdlUrl: detail.mdlUrl });
    const needsVideos = !existing || !existing.videos || existing.videos.length === 0;
    if (needsVideos) {
      const videos = await searchYouTubeVideos(detail.title, detail.originalTitle, detail.category);
      if (videos.length > 0) {
        detail.videos = videos;
        // 첫 번째 trailer/teaser를 trailerUrl로 (existing.trailerUrl 없을 때만)
        if (!existing?.trailerUrl) {
          const firstTrailer = videos.find(v => v.type === 'trailer') || videos[0];
          detail.trailerUrl = firstTrailer.url;
        }
        console.log(`  🎬 YouTube 영상 ${videos.length}개 자동 검색됨`);
      }
    }

    // DB 저장
    const saveResult = await saveDrama(db, detail);
    if (saveResult.action === 'inserted') {
      totals.saved++;
      console.log(`  ✅ 신규 등록 [${detail.category}] (rating: ${detail.reviewRating}, 리뷰 ${reviewsWithRating.length}개)`);
    } else {
      totals.updated++;
      console.log(`  🔄 업데이트 [${detail.category}] (rating: ${detail.reviewRating}, 리뷰 ${reviewsWithRating.length}개)`);
    }

    // 리뷰 저장
    if (reviewsWithRating.length > 0) {
      const newReviews = await saveReviews(db, reviewsWithRating, saveResult.id);
      totals.reviews += newReviews;
      if (newReviews > 0) console.log(`  💬 신규 리뷰 ${newReviews}개`);
    }

    if (global.gc) global.gc();
  }
}

// ─── 메인 실행 ───
async function runDramaCrawl() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 드라마/영화 크롤링 시작 (안전 모드)`);
  console.log(`  메모리 사용량: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

  let client;
  try {
    const conn = await connectToDatabase();
    const db = conn.db;
    client = conn.client;

    const totals = { saved: 0, updated: 0, skipped: 0, reviews: 0 };

    // 모든 소스 순차 크롤링 (Drama/TV → Movie)
    for (const source of MDL_SOURCES) {
      await crawlSource(db, source, totals);
    }

    console.log(`\n[Drama Crawler] 크롤링 완료!`);
    console.log(`  신규: ${totals.saved}개 | 업데이트: ${totals.updated}개 | 스킵: ${totals.skipped}개 | 리뷰: ${totals.reviews}개`);

    // 모든 non-featured 드라마/영화 orderNumber 일괄 재계산
    await recalculateOrderNumbers(db);

    console.log(`\n[Drama Crawler] 전체 완료!`);
    console.log(`  최종 메모리: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    await client.close();
  } catch (err) {
    console.error('[Drama Crawler] 에러:', err.message);
    if (client) await client.close();
  }
}

// RUN_ONCE 모드: 1회만 실행하고 종료 (로컬 테스트용)
if (process.env.RUN_ONCE === '1') {
  console.log('[Drama Crawler] RUN_ONCE 모드 - 1회 실행 후 종료');
  runDramaCrawl().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  // 매일 04:00 KST
  cron.schedule('0 4 * * *', () => {
    console.log('[Drama Crawler] 일일 크롤링 (04:00 KST)');
    runDramaCrawl();
  }, { timezone: 'Asia/Seoul' });

  console.log('[Drama Crawler] 스케줄러 시작됨 - 매일 04:00 KST (안전 모드)');

  // PM2 재시작 시 즉시 실행 방지 — 환경변수로 명시적으로 활성화한 경우만 실행
  if (process.env.RUN_ON_BOOT === '1') {
    console.log('[Drama Crawler] RUN_ON_BOOT=1, 시작 시 즉시 1회 실행');
    runDramaCrawl();
  } else {
    console.log('[Drama Crawler] 다음 실행 대기 중 (매일 04:00 KST)');
  }
}
