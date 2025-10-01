/**
 * Cloudflare 보호를 우회하기 위한 스텔스 모드 크롤러
 * puppeteer-extra와 stealth 플러그인을 사용하여 봇 탐지를 회피합니다.
 */

// 필수 라이브러리
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Puppeteer 및 스텔스 플러그인
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// 스텔스 플러그인 활성화
puppeteer.use(StealthPlugin());

// 설정
const OUTPUT_DIR = path.join(__dirname, 'crawled-data');
const DELAY_MIN = 500;  // 최소 지연시간 (밀리초)
const DELAY_MAX = 2000; // 최대 지연시간 (밀리초)
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;

// 랜덤 지연시간 생성 (봇 탐지 회피용)
const randomDelay = () => {
  const delay = Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1) + DELAY_MIN);
  return new Promise(resolve => setTimeout(resolve, delay));
};

// 인간과 유사한 스크롤 동작 구현
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

// 브라우저 지문 랜덤화 (화면 크기, 브라우저 창 크기 등)
async function randomizeBrowserFingerprint(page) {
  // 랜덤 뷰포트 설정 (합리적인 범위 내에서)
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
  
  // 타임존 및 언어 설정 등 추가 가능
}

// 인간같은 마우스 움직임 구현
async function moveMouseRandomly(page) {
  // 몇 번의 랜덤 마우스 이동
  const moveCount = Math.floor(Math.random() * 5) + 3;
  
  for (let i = 0; i < moveCount; i++) {
    const x = Math.floor(Math.random() * (VIEWPORT_WIDTH - 100)) + 50;
    const y = Math.floor(Math.random() * (VIEWPORT_HEIGHT - 100)) + 50;
    
    await page.mouse.move(x, y, { steps: 10 });
    await randomDelay();
  }
}

/**
 * 스텔스 모드로 MyDramalist 검색 페이지 크롤링
 * @param {string} searchUrl - 검색 URL
 * @param {boolean} saveHtml - HTML 저장 여부
 * @returns {Object} - 추출된 드라마 목록 및 메타데이터
 */
async function stealthSearchCrawler(searchUrl, saveHtml = true) {
  let browser = null;
  
  try {
    console.log(`[스텔스 크롤러] 검색 페이지 크롤링 시작: ${searchUrl}`);
    
    // puppeteer 실행 - 헤드리스가 아닌 모드 (일반 브라우저처럼 보이기 위해)
    browser = await puppeteer.launch({
      headless: false, // 봇 탐지를 피하기 위해 헤드리스가 아닌 모드 사용
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
    
    console.log(`[스텔스 크롤러] 브라우저 시작됨`);
    
    // 새 페이지(탭) 열기
    const page = await browser.newPage();
    
    // 브라우저 지문 랜덤화
    await randomizeBrowserFingerprint(page);
    
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
    
    // 인간과 같은 마우스 움직임
    console.log(`[스텔스 크롤러] 인간과 유사한 마우스 움직임 수행 중...`);
    await moveMouseRandomly(page);
    
    // Cloudflare 우회 검증
    const pageTitle = await page.title();
    console.log(`[스텔스 크롤러] 페이지 제목: "${pageTitle}"`);
    
    if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
      console.log(`[스텔스 크롤러] Cloudflare 감지됨, 추가 대기...`);
      
      // 추가 대기
      await page.waitForTimeout(10000);
      
      // 다시 제목 확인
      const newTitle = await page.title();
      console.log(`[스텔스 크롤러] 대기 후 페이지 제목: "${newTitle}"`);
      
      if (newTitle.includes('Just a moment') || newTitle.includes('Cloudflare')) {
        throw new Error('Cloudflare 보호를 우회하지 못했습니다.');
      }
    }
    
    // HTML 추출
    const html = await page.content();
    
    // HTML 저장 (필요시)
    if (saveHtml) {
      // 디렉토리 없으면 생성
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }
      
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
      
      // 이미지 URL 추출
      const imageElement = $(element).find('img.img-responsive.cover');
      const imageUrl = imageElement.length ? 
        (imageElement.attr('src') || imageElement.attr('data-src')) : 
        null;
      
      // 평점 추출
      const ratingElement = $(element).find('span.p-l-xs.score');
      const rating = ratingElement.length ? parseFloat(ratingElement.text()) : 0;
      
      // 정보 저장
      dramas.push({
        id,
        title,
        url: detailUrl,
        category,
        imageUrl,
        rating
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
 * @param {string} detailUrl - 상세 페이지 URL
 * @param {boolean} saveHtml - HTML 저장 여부
 * @returns {Object} - 추출된 드라마 상세 정보
 */
async function stealthDetailCrawler(detailUrl, saveHtml = true) {
  let browser = null;
  
  try {
    console.log(`[스텔스 크롤러] 상세 페이지 크롤링 시작: ${detailUrl}`);
    
    // URL에서 ID 추출
    const urlParts = detailUrl.split('/');
    const mdlId = urlParts[urlParts.length - 2];
    const slug = urlParts[urlParts.length - 1];
    
    // puppeteer 실행 - 헤드리스가 아닌 모드
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
        '--disable-extensions',
      ],
      ignoreHTTPSErrors: true,
      slowMo: 20,
    });
    
    console.log(`[스텔스 크롤러] 브라우저 시작됨`);
    
    // 새 페이지(탭) 열기
    const page = await browser.newPage();
    
    // 브라우저 지문 랜덤화
    await randomizeBrowserFingerprint(page);
    
    // 자동화 감지 방지 설정
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.navigator.chrome = { runtime: {} };
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
      'sec-ch-ua-platform': '"macOS"'
    });
    
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
    
    // 인간과 같은 마우스 움직임
    console.log(`[스텔스 크롤러] 인간과 유사한 마우스 움직임 수행 중...`);
    await moveMouseRandomly(page);
    
    // Cloudflare 우회 검증
    const pageTitle = await page.title();
    console.log(`[스텔스 크롤러] 페이지 제목: "${pageTitle}"`);
    
    if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
      console.log(`[스텔스 크롤러] Cloudflare 감지됨, 추가 대기...`);
      
      // 추가 대기
      await page.waitForTimeout(10000);
      
      // 다시 제목 확인
      const newTitle = await page.title();
      console.log(`[스텔스 크롤러] 대기 후 페이지 제목: "${newTitle}"`);
      
      if (newTitle.includes('Just a moment') || newTitle.includes('Cloudflare')) {
        throw new Error('Cloudflare 보호를 우회하지 못했습니다.');
      }
    }
    
    // HTML 추출
    const html = await page.content();
    
    // HTML 저장 (필요시)
    if (saveHtml) {
      // 디렉토리 없으면 생성
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }
      
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
    
    // 줄거리 추출
    let synopsis = '';
    const synopsisElement = $('.show-synopsis p span');
    if (synopsisElement.length) {
      synopsis = synopsisElement.text().trim()
        .replace(/\s+/g, ' ')
        .replace(/Edit Translation/g, '')
        .replace(/\(Source:.+?\)/, '')
        .trim();
    }
    
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
    const cast = [];
    $('.box-body ul.list li.cast-item').each((_, element) => {
      const actorName = $(element).find('.text-primary').text().trim();
      const role = $(element).find('.text-muted').text().trim();
      const character = $(element).find('small[title]').text().trim() || '';
      const actorImage = $(element).find('img').attr('src') || '';
      const link = $(element).find('.text-primary').attr('href') || '';
      
      if (actorName) {
        cast.push({
          name: actorName,
          role,
          character,
          image: actorImage,
          link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
        });
      }
    });
    
    console.log(`[스텔스 크롤러] 상세 정보 추출 완료: ${title}, 출연진 ${cast.length}명, 스트리밍 ${whereToWatch.length}개`);
    
    // 반환 데이터
    return {
      success: true,
      mdlId,
      mdlUrl: detailUrl,
      mdlSlug: slug,
      title,
      originalTitle: nativeTitle,
      coverImage,
      summary: synopsis,
      rating,
      cast,
      whereToWatch,
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

// 메인 실행 함수
async function main() {
  try {
    const searchUrl = 'https://mydramalist.com/search?q=korea&adv=titles&ty=68,77,83&co=3&so=newest';
    
    console.log('===== 스텔스 모드 크롤링 테스트 시작 =====');
    
    // 1. 검색 페이지 크롤링
    console.log('\n[1] 검색 페이지 크롤링:');
    const searchResult = await stealthSearchCrawler(searchUrl);
    
    // 실패 시 중단
    if (!searchResult.success) {
      console.log('검색 페이지 크롤링에 실패했습니다.');
      console.log(searchResult);
      return;
    }
    
    console.log(`검색 결과: 성공 (${searchResult.dramas.length}개 드라마 발견)`);
    
    // 첫 번째 드라마 상세 페이지 크롤링 (발견된 경우)
    if (searchResult.dramas.length > 0) {
      const firstDrama = searchResult.dramas[0];
      console.log(`\n[2] 상세 페이지 크롤링 - "${firstDrama.title}":` );
      const detailResult = await stealthDetailCrawler(firstDrama.url);
      
      if (detailResult.success) {
        console.log(`상세 정보 추출 성공: ${detailResult.title}`);
        console.log(`- 원제: ${detailResult.originalTitle}`);
        console.log(`- 평점: ${detailResult.rating}`);
        console.log(`- 캐스트: ${detailResult.cast.length}명`);
        console.log(`- 시청 플랫폼: ${detailResult.whereToWatch.length}개`);
      } else {
        console.log('상세 페이지 크롤링에 실패했습니다.');
        console.log(detailResult);
      }
    }
    
    console.log('\n===== 스텔스 모드 크롤링 테스트 완료 =====');
  } catch (error) {
    console.error('테스트 실행 중 오류 발생:', error);
  }
}

// 모듈 내보내기
module.exports = {
  stealthSearchCrawler,
  stealthDetailCrawler
};

// 직접 실행 시 메인 함수 호출
if (require.main === module) {
  main();
} 