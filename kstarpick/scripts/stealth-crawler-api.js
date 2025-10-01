/**
 * MyDramalist 스텔스 크롤링 API
 * Cloudflare 보호를 우회하여 데이터를 크롤링합니다.
 */

// 필수 라이브러리
const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 스텔스 플러그인 활성화
puppeteer.use(StealthPlugin());

// 설정
const OUTPUT_DIR = path.join(__dirname, 'crawled-data');
const DELAY_MIN = 500;  // 최소 지연시간 (밀리초)
const DELAY_MAX = 2000; // 최대 지연시간 (밀리초)
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const DEBUG_MODE = true;

// 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 랜덤 지연시간 생성 (봇 탐지 회피용)
const randomDelay = () => {
  const delay = Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1) + DELAY_MIN);
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * 인간과 유사한 스크롤 동작 구현
 */
async function humanLikeScroll(page) {
  await page.evaluate(async () => {
    const scrollHeight = document.body.scrollHeight;
    const viewportHeight = window.innerHeight;
    let currentPosition = 0;
    
    while (currentPosition < scrollHeight) {
      // 랜덤한 스크롤 거리
      const scrollAmount = Math.floor(Math.random() * 400) + 100;
      currentPosition += scrollAmount;
      
      // 가끔 위로 조금 스크롤 (실제 사용자처럼)
      if (Math.random() < 0.1 && currentPosition > viewportHeight) {
        window.scrollTo(0, currentPosition - Math.floor(Math.random() * 100));
        await new Promise(r => setTimeout(r, Math.random() * 400 + 100));
      }
      
      window.scrollTo(0, currentPosition);
      
      // 랜덤 대기
      await new Promise(r => setTimeout(r, Math.random() * 800 + 300));
      
      // 가끔 잠시 멈춤
      if (Math.random() < 0.2) {
        await new Promise(r => setTimeout(r, Math.random() * 2000 + 500));
      }
    }
    
    // 페이지 맨 위로 다시 이동
    window.scrollTo(0, 0);
  });
}

/**
 * 브라우저 설정 및 스텔스 모드 구성
 */
async function setupStealthBrowser() {
  // puppeteer 실행 - 헤드리스가 아닌 모드 (일반 브라우저처럼 보이기 위해)
  const browser = await puppeteer.launch({
    headless: false, // 운영 환경에서는 true로 변경 가능
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled', // 자동화 탐지 비활성화
      `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
      '--disable-extensions',
    ],
    ignoreHTTPSErrors: true,
    slowMo: 20, // 느린 작업 - 인간처럼 보이기 위해
  });
  
  // 새 페이지(탭) 열기
  const page = await browser.newPage();
  
  // 브라우저 지문 랜덤화 (화면 크기, 브라우저 창 크기 등)
  const width = VIEWPORT_WIDTH + Math.floor(Math.random() * 100);
  const height = VIEWPORT_HEIGHT + Math.floor(Math.random() * 100);
  
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: Math.random() < 0.5 ? 1 : 2,
    isMobile: false,
    hasTouch: false,
    isLandscape: true
  });
  
  // navigator.webdriver = false 설정
  await page.evaluateOnNewDocument(() => {
    // WebDriver 속성 감지 우회
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Automation 감지 우회
    window.navigator.chrome = {
      runtime: {},
    };
    
    // 거짓 플러그인 생성
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ];
        return plugins;
      },
    });
  });
  
  // 쿠키 및 로컬 스토리지 설정 (실제 브라우저로 보이도록)
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('random_item', Math.random().toString(36));
  });
  
  // 사용자 에이전트 설정
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
  
  // 추가 헤더 설정
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://mydramalist.com/',
    'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
  });
  
  return { browser, page };
}

/**
 * Cloudflare 우회 확인 및 처리
 */
async function handleCloudflareProtection(page) {
  // Cloudflare 우회 검증
  const pageTitle = await page.title();
  
  if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
    console.log(`[스텔스 크롤러] Cloudflare 감지됨, 추가 대기...`);
    
    // 추가 대기
    await page.waitForTimeout(10000);
    
    // 다시 제목 확인
    const newTitle = await page.title();
    
    if (newTitle.includes('Just a moment') || newTitle.includes('Cloudflare')) {
      throw new Error('Cloudflare 보호를 우회하지 못했습니다.');
    }
  }
  
  return pageTitle;
}

/**
 * 스텔스 모드로 MyDramalist 검색 페이지 크롤링
 */
async function stealthSearchCrawler(searchUrl, saveHtml = true) {
  let browser = null;
  
  try {
    console.log(`[스텔스 크롤러] 검색 페이지 크롤링 시작: ${searchUrl}`);
    
    // 스텔스 브라우저 설정
    const { browser: newBrowser, page } = await setupStealthBrowser();
    browser = newBrowser;
    
    // 페이지 로딩
    console.log(`[스텔스 크롤러] 페이지 로딩 중...`);
    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log(`[스텔스 크롤러] 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();
    
    // 인간과 같은 스크롤 동작
    console.log(`[스텔스 크롤러] 인간과 유사한 스크롤 동작 수행 중...`);
    await humanLikeScroll(page);
    
    // Cloudflare 우회 확인
    const pageTitle = await handleCloudflareProtection(page);
    console.log(`[스텔스 크롤러] 페이지 제목: "${pageTitle}"`);
    
    // HTML 추출
    const html = await page.content();
    
    // HTML 저장 (필요시)
    if (saveHtml) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const outputPath = path.join(OUTPUT_DIR, `search-${timestamp}.html`);
      fs.writeFileSync(outputPath, html);
      console.log(`[스텔스 크롤러] HTML 저장됨: ${outputPath}`);
    }
    
    // Cheerio로 파싱
    console.log(`[스텔스 크롤러] HTML 파싱 중...`);
    const $ = cheerio.load(html);
    
    // 드라마 요소 추출
    const dramaElements = $('div[id^="mdl-"]');
    console.log(`[스텔스 크롤러] 발견된 드라마 요소 수: ${dramaElements.length}`);
    
    // 드라마 정보 저장
    const dramas = [];
    dramaElements.each((i, element) => {
      // 제목 및 링크 추출
      const titleElement = $(element).find('h6.text-primary.title a');
      if (!titleElement.length) return;
      
      const title = titleElement.text().trim();
      const detailUrl = 'https://mydramalist.com' + titleElement.attr('href');
      
      // ID 추출
      const id = $(element).attr('id').replace('mdl-', '');
      
      // 메타 정보 추출
      const metaElement = $(element).find('span.text-muted');
      const metaText = metaElement.length ? metaElement.text().trim() : '';
      const metaParts = metaText.split(' - ');
      
      const category = metaParts[0]?.includes('Drama') ? 'drama' : 
                      metaParts[0]?.includes('Movie') ? 'movie' : 'other';
      
      let year = null;
      let episodes = null;
      if (metaParts[1]) {
        const yearMatch = metaParts[1].match(/(\d{4})/);
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
        }
        
        const episodesMatch = metaParts[1].match(/(\d+) episodes/);
        if (episodesMatch) {
          episodes = parseInt(episodesMatch[1]);
        }
      }
      
      // 이미지 URL 추출
      const imageElement = $(element).find('img.img-responsive.cover');
      const imageUrl = imageElement.length ? 
        (imageElement.attr('src') || imageElement.attr('data-src')) : 
        null;
      
      // 평점 추출
      const ratingElement = $(element).find('span.p-l-xs.score');
      const rating = ratingElement.length ? parseFloat(ratingElement.text()) : 0;
      
      // 줄거리 추출
      let summary = '';
      $(element).find('p').each((_, p) => {
        if (!$(p).find('span').length && $(p).text().trim() && !$(p).hasClass('rating')) {
          summary = $(p).text().trim();
        }
      });
      
      // 정보 저장
      dramas.push({
        id,
        url: detailUrl,
        title,
        category,
        year,
        episodes,
        imageUrl,
        rating,
        summary
      });
      
      console.log(`[스텔스 크롤러] 드라마 발견 #${i+1}: ${title}`);
    });
    
    // 다음 페이지 URL 확인
    const nextPageElement = $('.pagination .page-item.next a');
    const nextPageUrl = nextPageElement.length ? 
      'https://mydramalist.com' + nextPageElement.attr('href') : 
      null;
    
    console.log(`[스텔스 크롤러] 검색 페이지 크롤링 완료: ${dramas.length}개 드라마 발견, 다음 페이지: ${nextPageUrl ? '있음' : '없음'}`);
    
    return { 
      success: true,
      dramas,
      nextPage: nextPageUrl,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[스텔스 크롤러] 오류 발생:', error);
    return {
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    // 브라우저 종료
    if (browser) {
      await browser.close();
      console.log(`[스텔스 크롤러] 브라우저 종료됨`);
    }
  }
}

/**
 * 스텔스 모드로 MyDramalist 상세 페이지 크롤링
 */
async function stealthDetailCrawler(detailUrl, saveHtml = true) {
  let browser = null;
  
  try {
    console.log(`[스텔스 크롤러] 상세 페이지 크롤링 시작: ${detailUrl}`);
    
    // URL에서 ID 추출
    const urlParts = detailUrl.split('/');
    const mdlId = urlParts[urlParts.length - 2];
    const slug = urlParts[urlParts.length - 1];
    
    // 스텔스 브라우저 설정
    const { browser: newBrowser, page } = await setupStealthBrowser();
    browser = newBrowser;
    
    // 페이지 로딩
    console.log(`[스텔스 크롤러] 페이지 로딩 중...`);
    await page.goto(detailUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log(`[스텔스 크롤러] 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();
    
    // 인간과 같은 스크롤 동작
    console.log(`[스텔스 크롤러] 인간과 유사한 스크롤 동작 수행 중...`);
    await humanLikeScroll(page);
    
    // Cloudflare 우회 확인
    const pageTitle = await handleCloudflareProtection(page);
    console.log(`[스텔스 크롤러] 페이지 제목: "${pageTitle}"`);
    
    // HTML 추출
    const html = await page.content();
    
    // HTML 저장 (필요시)
    if (saveHtml) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const outputPath = path.join(OUTPUT_DIR, `detail-${mdlId}-${timestamp}.html`);
      fs.writeFileSync(outputPath, html);
      console.log(`[스텔스 크롤러] HTML 저장됨: ${outputPath}`);
    }
    
    // Cheerio로 파싱
    console.log(`[스텔스 크롤러] HTML 파싱 중...`);
    const $ = cheerio.load(html);
    
    // 기본 정보 추출
    const title = $('h1.film-title').text().trim();
    console.log(`[스텔스 크롤러] 제목: "${title}"`);
    
    // Native Title (원제) 추출
    let nativeTitle = '';
    $('.show-detailsxss .list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Native Title:') {
        nativeTitle = $(element).find('a').text().trim() || $(element).clone().children().remove().end().text().trim();
      }
    });
    
    // 줄거리(Synopsis) 추출
    let synopsis = '';
    const synopsisElement = $('.show-synopsis p span');
    if (synopsisElement.length) {
      synopsis = synopsisElement.text().trim()
        .replace(/\s+/g, ' ')
        .replace(/Edit Translation/g, '')
        .replace(/\(Source:.+?\)/, '')
        .trim();
    }
    
    // 감독(Director) 추출
    let director = '';
    $('.show-detailsxss .list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Director:') {
        director = $(element).find('a').text().trim();
      }
    });
    
    // 장르(Genres) 추출
    const genres = [];
    $('.show-genres a').each((_, element) => {
      genres.push($(element).text().trim());
    });
    
    // 태그(Tags) 추출
    const tags = [];
    $('.show-tags a').each((_, element) => {
      const tag = $(element).text().trim();
      if (tag && !tag.includes('Vote or add tags')) {
        tags.push(tag);
      }
    });
    
    // 이미지 URL 추출
    const coverImage = $('.film-cover img.img-responsive').attr('src') || '';
    
    // 평점 추출
    const ratingText = $('.film-rating-vote').text().trim();
    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    
    // Where to Watch 정보 추출
    const whereToWatch = [];
    $('.box-header:contains("Where to Watch")').closest('.box').find('.box-body.wts .row .col-xs-12 .row.no-gutter').each((i, el) => {
      const name = $(el).find('a.text-primary b').text().trim();
      const link = $(el).find('a.text-primary').attr('href') || '';
      const image = $(el).find('img.img-responsive').attr('src') || '';
      const type = $(el).find('.p-l div:nth-child(2)').text().trim();
      
      if (name) {
        whereToWatch.push({ 
          name, 
          link: link.startsWith('/redirect') 
            ? decodeURIComponent(link.match(/\/redirect\?q=([^&]+)/)?.[1] || '') 
            : link,
          imageUrl: image,
          type 
        });
      }
    });
    
    // Cast & Credits 정보 추출
    const credits = {
      directors: [],
      writers: [],
      mainCast: [],
      supportCast: [],
      guestCast: [],
      others: []
    };
    
    $('.box-body ul.list li.cast-item').each((_, element) => {
      const actorName = $(element).find('.text-primary').text().trim();
      const role = $(element).find('.text-muted').text().trim();
      const character = $(element).find('small[title]').text().trim() || '';
      const actorImage = $(element).find('img').attr('src') || '';
      const link = $(element).find('.text-primary').attr('href') || '';
      
      if (actorName) {
        const actorInfo = {
          name: actorName,
          role: role,
          character,
          image: actorImage,
          link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
        };
        
        // 역할에 따라 분류
        if (role.includes('Main Role')) {
          credits.mainCast.push(actorInfo);
        } else if (role.includes('Support Role')) {
          credits.supportCast.push(actorInfo);
        } else if (role.includes('Guest Role')) {
          credits.guestCast.push(actorInfo);
        } else {
          credits.others.push(actorInfo);
        }
      }
    });
    
    // 국가, 에피소드, 방송사 등 추가 정보 추출
    let country = '';
    let episodes = null;
    let network = '';
    let type = '';
    let contentRating = '';
    let status = '';
    let startDate = '';
    let endDate = '';
    let airsOn = '';
    let runtime = '';
    
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Country:') {
        country = $(element).text().replace('Country:', '').trim();
      } else if (label === 'Episodes:') {
        const episodesText = $(element).text().replace('Episodes:', '').trim();
        if (episodesText && !isNaN(parseInt(episodesText))) {
          episodes = parseInt(episodesText);
        }
      } else if (label === 'Original Network:') {
        network = $(element).find('a').text().trim();
      } else if (label === 'Type:') {
        type = $(element).text().replace('Type:', '').trim();
      } else if (label === 'Content Rating:') {
        contentRating = $(element).text().replace('Content Rating:', '').trim();
      } else if (label === 'Status:') {
        status = $(element).text().replace('Status:', '').trim().toLowerCase();
      } else if (label === 'Airs:' && !$(element).text().includes('Airs On')) {
        const airsInfo = $(element).text().replace('Airs:', '').trim();
        
        // 날짜 파싱 시도
        const dateMatch = airsInfo.match(/([A-Za-z]+\s+\d+,\s+\d{4})\s*-\s*([A-Za-z]+\s+\d+,\s+\d{4})/);
        if (dateMatch) {
          startDate = dateMatch[1];
          endDate = dateMatch[2];
        }
      } else if (label === 'Airs On:') {
        airsOn = $(element).text().replace('Airs On:', '').trim();
      } else if (label === 'Duration:') {
        runtime = $(element).text().replace('Duration:', '').trim();
      }
    });
    
    // 카테고리 결정 (에피소드가 있으면 드라마, 없으면 영화)
    const category = type.toLowerCase().includes('movie') ? 'movie' : 'drama';
    
    console.log(`[스텔스 크롤러] 상세 정보 추출 완료: ${title}, 출연진 ${credits.mainCast.length + credits.supportCast.length + credits.guestCast.length}명, 스트리밍 ${whereToWatch.length}개`);
    
    // 반환 데이터
    return {
      success: true,
      mdlId,
      mdlUrl: detailUrl,
      mdlSlug: slug,
      title,
      originalTitle: nativeTitle,
      coverImage,
      bannerImage: coverImage, // 임시로 커버 이미지를 배너 이미지로 사용
      summary: synopsis,
      description: synopsis,
      reviewRating: rating,
      genres,
      director,
      cast: credits.mainCast.concat(credits.supportCast),
      tags,
      status,
      type,
      releaseDate: startDate,
      endDate,
      airsOn,
      network,
      country,
      episodes,
      runtime,
      contentRating,
      category,
      whereToWatch,
      credits,
      createdAt: new Date(),
      updatedAt: new Date(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[스텔스 크롤러] 오류 발생:', error);
    return {
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    // 브라우저 종료
    if (browser) {
      await browser.close();
      console.log(`[스텔스 크롤러] 브라우저 종료됨`);
    }
  }
}

// API 경로 설정
router.post('/stealth-search', async (req, res) => {
  try {
    const { url, saveHtml = true } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: '검색 URL이 필요합니다.' 
      });
    }
    
    const result = await stealthSearchCrawler(url, saveHtml);
    return res.status(200).json(result);
  } catch (error) {
    console.error('스텔스 검색 크롤링 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '스텔스 크롤링 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

router.post('/stealth-detail', async (req, res) => {
  try {
    const { url, saveHtml = true } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: '상세 페이지 URL이 필요합니다.' 
      });
    }
    
    const result = await stealthDetailCrawler(url, saveHtml);
    return res.status(200).json(result);
  } catch (error) {
    console.error('스텔스 상세 크롤링 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '스텔스 크롤링 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 테스트용 경로
router.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'Stealth Crawler API is working!' 
  });
});

// Express 앱에 적용하는 예시
// const app = express();
// app.use(express.json({ limit: '50mb' }));
// app.use('/api/crawler/stealth', router);

module.exports = router;

// 직접 실행을 위한 코드 (테스트용)
if (require.main === module) {
  const app = express();
  const PORT = 3001;
  
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/crawler/stealth', router);
  
  app.listen(PORT, () => {
    console.log(`스텔스 크롤러 API 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`테스트 URL: http://localhost:${PORT}/api/crawler/stealth/test`);
  });
} 