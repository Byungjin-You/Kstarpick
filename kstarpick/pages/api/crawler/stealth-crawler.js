import { getSession } from 'next-auth/react';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '../../../utils/mongodb';
import axios from 'axios';

// 스텔스 플러그인 활성화
puppeteer.use(StealthPlugin());

// 설정
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;
const DEBUG_MODE = true; // 항상 디버그 모드 활성화

// 비동기 대기 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 랜덤 지연시간 생성 (봇 탐지 회피용)
const randomDelay = () => {
  const delay = Math.floor(Math.random() * 1500) + 500;
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * 스텔스 모드로 MyDramalist 크롤링하는 API
 * Cloudflare 보호를 우회하기 위한 기술을 적용함
 */
export default async function handler(req, res) {
  // API 요청 시작 로그
  console.log('================ 스텔스 크롤러 API 요청 시작 ================');
  console.log('요청 메소드:', req.method);
  console.log('요청 본문:', JSON.stringify(req.body, null, 2));
  console.log('요청 시간:', new Date().toISOString());
  
  // POST 요청만 허용
  if (req.method !== 'POST') {
    console.log('허용되지 않는 메소드:', req.method);
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  let browser;
  try {
    // 권한 체크 완전 제거 (항상 접근 허용)
    console.log('[스텔스 크롤러] 권한 체크 생략됨 (DEBUG_MODE)');

    // 요청 본문 확인
    const { url, mode = 'list' } = req.body;

    if (!url) {
      console.log('URL 누락');
      return res.status(400).json({ success: false, message: 'URL이 필요합니다.' });
    }

    console.log(`[스텔스 크롤러] ${mode} 모드로 ${url} 크롤링 시작`);

    // 스텔스 브라우저 설정
    console.log('[스텔스 크롤러] 브라우저 설정 시작');
    const { browser: newBrowser, page } = await setupStealthBrowser();
    browser = newBrowser;
    console.log('[스텔스 크롤러] 브라우저 설정 완료');

    // 페이지 로딩
    console.log(`[스텔스 크롤러] 페이지 로딩 중... (${url})`);
    
    // 5초 후에 타임아웃 처리를 시작
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('페이지 로딩 타임아웃'));
      }, 60000); // 60초 타임아웃
    });
    
    // 페이지 로딩 또는 타임아웃 중 먼저 발생하는 것 처리
    try {
      await Promise.race([
        page.goto(url, {
          waitUntil: 'domcontentloaded', // 더 빠른 이벤트로 변경
          timeout: 30000 // 30초 타임아웃
        }),
        timeoutPromise
      ]);
      console.log('[스텔스 크롤러] 페이지 로딩 성공');
    } catch (navigationError) {
      console.error('[스텔스 크롤러] 페이지 로딩 중 오류:', navigationError.message);
      console.log('[스텔스 크롤러] 페이지 일부 로딩된 상태로 계속 진행 시도...');
    }

    console.log(`[스텔스 크롤러] 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();

    // 인간과 같은 스크롤 동작
    console.log(`[스텔스 크롤러] 인간과 유사한 스크롤 동작 수행 중...`);
    try {
      await humanLikeScroll(page);
      console.log('[스텔스 크롤러] 스크롤 완료');
    } catch (scrollError) {
      console.error('[스텔스 크롤러] 스크롤 중 오류:', scrollError.message);
    }

    // Cloudflare 우회 확인
    let pageTitle = '';
    try {
      pageTitle = await handleCloudflareProtection(page);
      console.log(`[스텔스 크롤러] 페이지 제목: "${pageTitle}"`);
    } catch (cfError) {
      console.error('[스텔스 크롤러] Cloudflare 처리 중 오류:', cfError.message);
    }

    // HTML 추출
    console.log('[스텔스 크롤러] HTML 콘텐츠 추출 중...');
    const html = await page.content();
    console.log(`[스텔스 크롤러] HTML 데이터 크기: ${html.length} 바이트`);

    if (!html || html.length < 1000) {
      console.error('[스텔스 크롤러] HTML이 비어있거나 너무 짧음');
      throw new Error('HTML이 비어있거나 너무 짧습니다. 크롤링에 실패했습니다.');
    }

    let result;
    if (mode === 'list') {
      // 검색 결과 페이지 파싱
      console.log('[스텔스 크롤러] 목록 페이지 파싱 시작');
      result = await parseListHtml(html, url);
      console.log(`[스텔스 크롤러] 파싱 완료: ${result.dramas.length}개 드라마 발견`);
      
      return res.status(200).json({
        success: true,
        message: `${result.dramas.length}개의 드라마를 찾았습니다.`,
        data: {
          dramas: result.dramas,
          nextPage: result.nextPage
        }
      });
    } else if (mode === 'detail') {
      // 상세 페이지 파싱
      console.log('[스텔스 크롤러] 상세 페이지 파싱 시작');
      const detailResult = await parseDetailHtml(html, url);
      console.log(`[스텔스 크롤러] 파싱 완료: ${detailResult.title}`);
      
      // 추가: 캐스트 페이지 크롤링 (더 많은 배우 정보를 가져오기 위함)
      const castUrl = getCastPageUrl(url);
      if (castUrl && castUrl !== url) {
        try {
          console.log(`[스텔스 크롤러] 캐스트 전용 페이지 크롤링 시작: ${castUrl}`);
          
          // 캐스트 페이지로 이동
          await page.goto(castUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          
          // 대기 및 스크롤
          await randomDelay();
          await humanLikeScroll(page);
          
          // 캐스트 페이지 HTML 추출
          const castHtml = await page.content();
          console.log(`[스텔스 크롤러] 캐스트 페이지 HTML 크기: ${castHtml.length} 바이트`);
          
          if (castHtml && castHtml.length > 1000) {
            // 캐스트 페이지 HTML 파싱 및 배우 정보 병합
            await mergeCastInfo(detailResult, castHtml, castUrl);
          } else {
            console.log('[스텔스 크롤러] 캐스트 페이지 HTML이 불충분함, 기존 정보로 진행');
          }
        } catch (castError) {
          console.error('[스텔스 크롤러] 캐스트 페이지 크롤링 중 오류:', castError.message);
          console.log('[스텔스 크롤러] 캐스트 페이지 크롤링 실패, 기존 정보로 진행');
        }
      } else {
        console.log('[스텔스 크롤러] 캐스트 전용 페이지를 찾을 수 없음, 기존 정보로 진행');
      }
      
      // 추가: 스트리밍 서비스 정보 크롤링
      try {
        console.log('[스텔스 크롤러] 스트리밍 서비스 정보 크롤링 시작');
        const streamingInfo = await parseStreamingServices(html, url);
        if (streamingInfo && streamingInfo.length > 0) {
          detailResult.streamingServices = streamingInfo;
          
          // whereToWatch 필드로 변환하여 추가
          detailResult.whereToWatch = streamingInfo.map(service => ({
            name: service.name,
            link: service.url,
            imageUrl: service.logo,
            type: service.type
          }));
          
          console.log(`[스텔스 크롤러] ${streamingInfo.length}개의 스트리밍 서비스 정보를 추가했습니다.`);
        } else {
          console.log('[스텔스 크롤러] 스트리밍 서비스 정보를 찾을 수 없음');
          detailResult.streamingServices = [];
        }
      } catch (streamingError) {
        console.error('[스텔스 크롤러] 스트리밍 서비스 정보 크롤링 중 오류:', streamingError.message);
        detailResult.streamingServices = [];
      }
      
      return res.status(200).json({
        success: true,
        message: `드라마 "${detailResult.title}" 정보를 크롤링했습니다.`,
        data: detailResult
      });
    } else if (mode === 'episodes') {
      // 에피소드 페이지 파싱
      console.log('[스텔스 크롤러] 에피소드 페이지 파싱 시작');
      const episodesResult = await parseEpisodesHtml(html, url);
      console.log(`[스텔스 크롤러] 파싱 완료: ${episodesResult.length}개 에피소드 발견`);
      
      return res.status(200).json({
        success: true,
        message: `${episodesResult.length}개의 에피소드 정보를 크롤링했습니다.`,
        data: {
          episodes: episodesResult
        }
      });
    } else if (mode === 'streaming') {
      // 스트리밍 서비스 정보만 파싱
      console.log('[스텔스 크롤러] 스트리밍 서비스 정보 파싱 시작');
      const streamingServices = await parseStreamingServices(html, url);
      console.log(`[스텔스 크롤러] 파싱 완료: ${streamingServices.length}개 스트리밍 서비스 발견`);
      
      // whereToWatch 형식으로 변환
      const whereToWatch = streamingServices.map(service => ({
        name: service.name,
        link: service.url,
        imageUrl: service.logo,
        type: service.type
      }));
      
      return res.status(200).json({
        success: true,
        message: `${streamingServices.length}개의 스트리밍 서비스 정보를 크롤링했습니다.`,
        data: {
          streamingServices,
          whereToWatch
        }
      });
    } else {
      console.log('[스텔스 크롤러] 유효하지 않은 모드:', mode);
      return res.status(400).json({ success: false, message: '유효하지 않은 크롤링 모드입니다.' });
    }
  } catch (error) {
    console.error('[스텔스 크롤러] 오류 발생:', error);
    console.error('스택 트레이스:', error.stack);
    return res.status(500).json({
      success: false,
      message: '크롤링 중 오류가 발생했습니다.',
      error: error.message,
      stack: DEBUG_MODE ? error.stack : undefined
    });
  } finally {
    // 브라우저 종료
    if (browser) {
      try {
        await browser.close();
        console.log('[스텔스 크롤러] 브라우저 세션 종료');
      } catch (closeError) {
        console.error('[스텔스 크롤러] 브라우저 종료 중 오류:', closeError);
      }
    }
    
    console.log('================ 스텔스 크롤러 API 요청 종료 ================');
  }
}

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
    
    return newTitle;
  }
  
  return pageTitle;
}

/**
 * 스텔스 브라우저 설정 함수
 */
async function setupStealthBrowser() {
  // 스텔스 모드로 브라우저 실행
  const browser = await puppeteer.launch({
    headless: "new", // 서버에서는 headless 모드 사용
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled', // 자동화 탐지 비활성화
      `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
      '--disable-extensions',
      '--disable-dev-shm-usage', // 메모리 공간 제한 해결
      '--disable-accelerated-2d-canvas', // 하드웨어 가속 비활성화
      '--no-first-run',
      '--no-zygote',
      '--single-process', // 단일 프로세스 모드
      '--disable-gpu' // GPU 가속 비활성화
    ],
    ignoreHTTPSErrors: true,
    slowMo: 20, // 느린 작업 - 인간처럼 보이기 위해
    timeout: 120000 // 브라우저 시작 타임아웃 120초
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
  
  // 리소스 타임아웃 설정
  await page.setDefaultNavigationTimeout(120000); // 120초
  await page.setDefaultTimeout(120000); // 120초
  
  // 필요 없는 리소스 차단으로 속도 향상
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    // 이미지, 폰트, 스타일시트 등 블로킹하여 로딩 속도 향상
    if (['image', 'font', 'media'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
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
 * 드라마 목록 페이지 HTML 파싱
 */
async function parseListHtml(html, originalUrl = '') {
  try {
    console.log(`[스텔스 크롤러] 목록 페이지 HTML 파싱 시작, HTML 크기: ${html.length} 바이트`);
    
    // HTML 파싱
    const $ = cheerio.load(html);
    console.log(`[스텔스 크롤러] 페이지 제목: "${$('title').text()}"`);
    
    const dramaLinks = [];
    
    // 모든 드라마 박스 요소 찾기
    console.log(`[스텔스 크롤러] 드라마 요소 찾기 시작`);
    const dramaElements = $('div[id^="mdl-"]');
    console.log(`[스텔스 크롤러] 발견된 드라마 요소 수: ${dramaElements.length}`);
    
    // 요소가 없을 경우 페이지 전체 구조 분석
    if (dramaElements.length === 0) {
      console.log('[스텔스 크롤러] 드라마 요소를 찾지 못했습니다. 페이지 구조 분석 시도 중...');
      
      // 다른 가능한 선택자 확인
      if ($('.mdl-card').length > 0) {
        console.log('[스텔스 크롤러] mdl-card 요소 발견, 대체 파싱 시도');
        $('.mdl-card').each((index, element) => {
          // 카드에서 ID 추출 시도
          const idAttr = $(element).attr('id') || '';
          const id = idAttr.replace('mdl-', '') || `unknown-${index}`;
          
          // 제목 추출 시도
          const titleElement = $(element).find('.title a');
          if (!titleElement.length) return;
          
          const title = titleElement.text().trim();
          const href = titleElement.attr('href') || '';
          const detailUrl = href.startsWith('http') ? href : 'https://mydramalist.com' + href;
          
          console.log(`[스텔스 크롤러] 대체 방식으로 드라마 발견: ${title} (ID: ${id})`);
          
          dramaLinks.push({
            id,
            url: detailUrl,
            title,
            category: 'drama',
            imageUrl: $(element).find('img').attr('src') || null,
            summary: $(element).find('.content').text().trim() || ''
          });
        });
      }
    }
    
    $('div[id^="mdl-"]').each((index, element) => {
      // ID 추출
      const id = $(element).attr('id').replace('mdl-', '');
      
      // 제목 및 링크 추출
      const titleElement = $(element).find('h6.text-primary.title a');
      if (!titleElement.length) return;
      
      const title = titleElement.text().trim();
      const detailUrl = 'https://mydramalist.com' + titleElement.attr('href');
      
      console.log(`[스텔스 크롤러] 드라마 발견: ${title} (ID: ${id})`);
      
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
      
      // 드라마 정보 저장
      dramaLinks.push({
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
    });
    
    // 다음 페이지 URL 확인
    const nextPageElement = $('.pagination .page-item.next a');
    const nextPageUrl = nextPageElement.length ? 
      'https://mydramalist.com' + nextPageElement.attr('href') : 
      null;
    
    console.log(`[스텔스 크롤러] 목록 페이지 파싱 완료: ${dramaLinks.length}개 드라마 발견, 다음 페이지: ${nextPageUrl ? '있음' : '없음'}`);
    
    return { dramas: dramaLinks, nextPage: nextPageUrl };
  } catch (error) {
    console.error('[스텔스 크롤러] 드라마 목록 파싱 중 오류:', error);
    throw error;
  }
}

/**
 * 드라마 상세 페이지 파싱 함수
 */
async function parseDetailHtml(html, url) {
  try {
    console.log(`[스텔스 크롤러] 상세 페이지 HTML 파싱 시작, HTML 크기: ${html.length} 바이트`);
    
    // URL에서 ID 추출
    const urlParts = url.split('/');
    const mdlId = urlParts[urlParts.length - 2];
    const slug = urlParts[urlParts.length - 1];
    console.log(`[스텔스 크롤러] URL에서 추출한 ID: ${mdlId}, Slug: ${slug}`);
    
    // HTML 파싱
    const $ = cheerio.load(html);
    console.log(`[스텔스 크롤러] 페이지 제목: "${$('title').text()}"`);
    
    // 기본 정보 추출
    const title = $('h1.film-title').text().trim() || '';
    console.log(`[스텔스 크롤러] 제목 추출: "${title}"`);
    
    // Native Title (원제) 추출
    let nativeTitle = '';
    $('.show-detailsxss .list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Native Title:') {
        nativeTitle = $(element).find('a').text().trim() || $(element).clone().children().remove().end().text().trim();
        console.log(`[스텔스 크롤러] 원제 추출: "${nativeTitle}"`);
      }
    });
    
    // 이미지 URL 추출
    let backgroundImage = '';
    const headerImage = $('.v-image-wrap img.img-responsive');
    if (headerImage.length) {
      backgroundImage = headerImage.attr('src') || '';
      console.log(`[크롤러] 배경 이미지 URL 추출: ${backgroundImage}`);
    }
    
    // 포스터 이미지 URL 추출
    let posterImage = '';
    const posterElement = $('.box-body .film-poster img.img-responsive, .box-body .box-poster img.img-responsive');
    if (posterElement.length) {
      posterImage = posterElement.attr('src') || '';
      console.log(`[크롤러] 포스터 이미지 URL 추출: ${posterImage}`);
    }
    
    // 항상 배경 이미지를 포스터 이미지와 동일하게 설정
    if (posterImage) {
      backgroundImage = posterImage;
      console.log(`[크롤러] 배경 이미지를 포스터와 동일하게 설정: ${backgroundImage}`);
    }
    
    // 포스터 이미지가 없으면 다른 이미지도 찾아보기
    if (!posterImage) {
      const altPosterImage = $('.box-body img.img-responsive');
      if (altPosterImage.length) {
        posterImage = altPosterImage.attr('src') || '';
        console.log(`[크롤러] 대체 포스터 이미지 URL 추출: ${posterImage}`);
        // 포스터를 찾았으면 배경도 동일하게 설정
        backgroundImage = posterImage;
        console.log(`[크롤러] 대체 포스터로 배경 이미지 설정: ${backgroundImage}`);
      }
    }
    
    // 줄거리(Synopsis) 추출
    let synopsis = '';
    
    // 다양한 선택자를 시도하여 시놉시스 추출
    // 실제 HTML 구조 분석 결과를 바탕으로 선택자 추가 및 정렬
    const synopsisSelectors = [
      '.show-synopsis p span',          // 가장 일반적인 구조
      '.show-synopsis p',               // span이 없는 경우
      '.show-synopsis',                 // 전체 컨테이너
      '.film-description',              // 다른 구조
      '.box-body .box-inset',           // 또 다른 구조
      '.show-synopsis .synopsis',       // 다른 가능한 구조
      'div.box:contains("Synopsis") .box-body' // Synopsis 라벨이 있는 박스
    ];
    
    // 각 선택자를 시도해보고 내용 추출
    for (const selector of synopsisSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim()) {
        // 숨겨진 텍스트도 포함하여 모든 텍스트 추출
        synopsis = element.text().trim().replace(/\s+/g, ' ');
        console.log(`[스텔스 크롤러] 시놉시스를 찾았습니다 (${selector}): ${synopsis.substring(0, 50)}...`);
        
        // "read-more-hidden" 클래스가 있는 경우 숨겨진 내용도 추출
        const hiddenText = element.find('.read-more-hidden').text().trim();
        if (hiddenText) {
          console.log('[스텔스 크롤러] 숨겨진 추가 시놉시스 텍스트 발견');
          // read-more-hidden의 내용이 이미 포함되어 있는지 확인
          if (!synopsis.includes(hiddenText)) {
            synopsis += ' ' + hiddenText;
            console.log('[스텔스 크롤러] 숨겨진 텍스트가 추가되었습니다');
          }
        }
        
        break;
      }
    }
    
    // 내용 정리
    if (synopsis) {
      // "Edit Translation" 텍스트 제거
      synopsis = synopsis.replace(/Edit Translation/g, '').trim();
      
      // 소스 정보 정리 (괄호 안의 Source 부분)
      synopsis = synopsis.replace(/\(Source:.+?\)/g, '').trim();
      
      // 언어 선택 UI 관련 텍스트 제거
      synopsis = synopsis.replace(/English한국어हिन्दीEspañol.+/s, '').trim();
      synopsis = synopsis.replace(/English[\s\n]+한국어[\s\n]+हिन्दी[\s\n]+Español.+/s, '').trim();
      synopsis = synopsis.replace(/English[\s\n]*ภาษาไทย[\s\n]*Arabic[\s\n]*Русский.+/s, '').trim();
      
      // 불필요한 텍스트 제거
      synopsis = synopsis.replace(/Expand$/g, '').trim();
      synopsis = synopsis.replace(/Show\s+Less$/g, '').trim();
      synopsis = synopsis.replace(/Synopsis\s+/g, '').trim();
      synopsis = synopsis.replace(/Edit$/g, '').trim();
    }
    
    // 여전히 시놉시스가 없거나 짧으면 메타 설명을 대안으로 사용
    if (!synopsis || synopsis.length < 10) {
      const metaDescription = $('meta[name="description"]').attr('content');
      if (metaDescription) {
        synopsis = metaDescription.trim();
        console.log(`[스텔스 크롤러] 메타 설명을 시놉시스로 사용: ${synopsis.substring(0, 50)}...`);
      }
    }
    
    // 로그 출력
    if (synopsis) {
      console.log(`[스텔스 크롤러] 최종 시놉시스 길이: ${synopsis.length}자`);
    } else {
      console.log(`[스텔스 크롤러] 시놉시스를 찾지 못했습니다.`);
    }
    
    // 감독(Director) 추출
    let director = '';
    $('.show-detailsxss .list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Director:') {
        const directors = [];
        $(element).find('a').each((_, link) => {
          const name = $(link).text().trim();
          if (name) directors.push(name);
        });
        director = directors.join(', ');
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
    
    // 국가(Country) 추출
    let country = 'South Korea'; // 기본값
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Country:') {
        country = $(element).text().replace('Country:', '').trim();
      }
    });
    
    // 유형(Type) 추출
    let type = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Type:') {
        type = $(element).text().replace('Type:', '').trim();
      }
    });
    
    // 에피소드 수(Episodes) 추출
    let episodes = null;
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Episodes:') {
        const episodesText = $(element).text().replace('Episodes:', '').trim();
        if (episodesText && !isNaN(parseInt(episodesText))) {
          episodes = parseInt(episodesText);
        }
      }
    });
    
    // 방영 정보(Aired) 추출
    let airsInfo = '';
    let startDate = '';
    let endDate = '';
    
    // 방영일 정보 추출 개선
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Aired:' || label === 'Airs:') {
        airsInfo = $(element).clone().children('b').remove().end().text().trim();
        console.log(`[스텔스 크롤러] 방영일 정보 추출: "${airsInfo}"`);
        
        // 날짜 파싱 시도 - 여러 포맷 지원
        // 예: "Apr 30, 2025 - Jun 5, 2025" 형식
        const dateMatch1 = airsInfo.match(/([A-Za-z]+\s+\d+,\s+\d{4})\s*-\s*([A-Za-z]+\s+\d+,\s+\d{4})/);
        // 예: "Apr 30, 2025" 형식 (단일 날짜)
        const dateMatch2 = airsInfo.match(/([A-Za-z]+\s+\d+,\s+\d{4})/);
        // 예: "2025-04-30" 형식
        const dateMatch3 = airsInfo.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
        // 예: "2025" 형식 (연도만)
        const dateMatch4 = airsInfo.match(/(\d{4})/);
        
        if (dateMatch1) {
          startDate = dateMatch1[1];
          endDate = dateMatch1[2];
          console.log(`[스텔스 크롤러] 방영 시작일: ${startDate}, 종료일: ${endDate}`);
        } else if (dateMatch2) {
          startDate = dateMatch2[1];
          console.log(`[스텔스 크롤러] 방영일: ${startDate}`);
        } else if (dateMatch3) {
          startDate = dateMatch3[1];
          endDate = dateMatch3[2];
          console.log(`[스텔스 크롤러] 방영 시작일: ${startDate}, 종료일: ${endDate}`);
        } else if (dateMatch4) {
          startDate = dateMatch4[1];
          console.log(`[스텔스 크롤러] 방영 연도: ${startDate}`);
        } else {
          // 추가 파싱 시도: "Apr 2025" 형식 (월과 연도만)
          const monthYearMatch = airsInfo.match(/([A-Za-z]+\s+\d{4})/);
          if (monthYearMatch) {
            startDate = monthYearMatch[1];
            console.log(`[스텔스 크롤러] 방영 월/연도: ${startDate}`);
          } else {
            // 날짜 범위가 있는지 확인 (예: "2025 - 2026")
            const yearRangeMatch = airsInfo.match(/(\d{4})\s*-\s*(\d{4})/);
            if (yearRangeMatch) {
              startDate = yearRangeMatch[1];
              endDate = yearRangeMatch[2];
              console.log(`[스텔스 크롤러] 방영 시작 연도: ${startDate}, 종료 연도: ${endDate}`);
            } else {
              // 파싱 실패 시 원본 텍스트 그대로 사용
              startDate = airsInfo;
              console.log(`[스텔스 크롤러] 방영일 파싱 실패, 원본 텍스트 사용: ${airsInfo}`);
            }
          }
        }
      }
    });
    
    // 방영 요일(Airs On) 추출
    let airsOn = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Airs On:') {
        airsOn = $(element).text().replace('Airs On:', '').trim();
      }
    });
    
    // 방송국(Original Network) 추출
    let network = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Original Network:') {
        network = $(element).find('a').text().trim();
      }
    });
    
    // 콘텐츠 등급(Content Rating) 추출
    let contentRating = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Content Rating:') {
        contentRating = $(element).text().replace('Content Rating:', '').trim();
      }
    });
    
    // 런타임(Duration) 추출
    let runtime = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Duration:') {
        runtime = $(element).text().replace('Duration:', '').trim();
        console.log(`[스텔스 크롤러] 런타임 추출: "${runtime}"`);
      }
    });
    
    // 평점 추출
    const ratingText = $('.film-rating-vote').text().trim() || '';
    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    
    // 출연진 정보 추출
    const cast = {
      mainRoles: [],
      supportRoles: []
    };
    
    // HTML 태그 제거 함수
    const stripHtml = (html) => {
      return html ? html.replace(/<\/?[^>]+(>|$)/g, "").trim() : "";
    };
    
    // 역할 텍스트에서 배역 이름 추출 함수
    const extractCharacterName = (roleText) => {
      if (!roleText) return '';
      
      // "Main Role" "Support Role" 등의 역할 타입을 제거
      let cleanText = roleText
        .replace(/Main Role/gi, '')
        .replace(/Support Role/gi, '')
        .replace(/Guest Role/gi, '')
        .replace(/Cameo/gi, '')
        .replace(/Supporting Role/gi, '')
        .trim();
      
      // 괄호 안의 내용이 있으면 그것이 캐릭터 이름일 가능성이 높음
      const bracketMatch = cleanText.match(/\[([^\]]+)\]/);
      if (bracketMatch) {
        return bracketMatch[1].trim();
      }
      
      // 괄호 밖에 있는 내용을 시도
      if (cleanText) {
        // 쉼표로 구분된 경우 (예: "배우 이름, 캐릭터 이름")
        const parts = cleanText.split(',');
        if (parts.length > 1) {
          return parts[1].trim();
        }
        
        // as나 역할 구분자가 있는 경우
        if (cleanText.includes(' as ')) {
          return cleanText.split(' as ')[1].trim();
        }
        
        // 그 외의 경우 전체 텍스트를 반환
        return cleanText;
      }
      
      return '';
    };
    
    // 메인 캐스트와 서포트 캐스트 구분 함수
    const isMainRole = (role) => {
      const roleText = role.toLowerCase();
      return roleText.includes('main') || 
             roleText.includes('lead') || 
             roleText.includes('주연') || 
             (!roleText.includes('support') && !roleText.includes('guest') && !roleText.includes('cameo'));
    };
    
    // 배우 역할인지 확인하는 함수 (비배우 역할 제외)
    const isActorRole = (role) => {
      if (!role) return true; // 역할 정보가 없어도 배우로 간주
      const roleText = role.toLowerCase();
      
      // 명백한 비배우 역할만 제외
      if (roleText.includes('director') || 
          roleText.includes('producer') || 
          roleText.includes('screenwriter') || 
          roleText.includes('writer') ||
          roleText.includes('original author') ||
          roleText.includes('casting director')) {
        console.log(`[크롤러] 제작진 역할 제외: "${role}"`);
        return false;
      }
      
      return true; // 기본적으로 배우로 간주
    };
    
    // 제작진 정보 (감독, 작가 등)
    const staffInfo = {
      directors: [],
      screenwriters: [],
      castingDirectors: [],
      producers: []
    };
    
    // 제작진 정보 추출 함수
    const extractStaffInfo = () => {
      // 각 섹션별로 제작진 정보 추출
      $('h3.header.b-b.p-b').each((_, sectionHeader) => {
        const headerText = $(sectionHeader).text().trim();
        const actorList = $(sectionHeader).next('ul.list');
        
        // 감독 정보 추출
        if (headerText === 'Director' || headerText.includes('Director')) {
          actorList.find('li.list-item').each((_, element) => {
            const name = $(element).find('a.text-primary b').text().trim();
            const image = $(element).find('img.img-responsive').attr('src') || '';
            
            if (name) {
              console.log(`[크롤러] 감독 정보 추출: ${name}`);
              staffInfo.directors.push({ name, image });
            }
          });
        }
        
        // 작가 정보 추출
        else if (headerText === 'Screenwriter' || headerText.includes('Screenwriter') || 
                headerText === 'Writer' || headerText.includes('Writer')) {
          actorList.find('li.list-item').each((_, element) => {
            const name = $(element).find('a.text-primary b').text().trim();
            const image = $(element).find('img.img-responsive').attr('src') || '';
            
            if (name) {
              console.log(`[크롤러] 작가 정보 추출: ${name}`);
              staffInfo.screenwriters.push({ name, image });
            }
          });
        }
        
        // 캐스팅 디렉터 정보 추출
        else if (headerText === 'Casting Director' || headerText.includes('Casting')) {
          actorList.find('li.list-item').each((_, element) => {
            const name = $(element).find('a.text-primary b').text().trim();
            const image = $(element).find('img.img-responsive').attr('src') || '';
            
            if (name) {
              console.log(`[크롤러] 캐스팅 디렉터 정보 추출: ${name}`);
              staffInfo.castingDirectors.push({ name, image });
            }
          });
        }
        
        // 프로듀서 정보 추출
        else if (headerText === 'Producer' || headerText.includes('Producer')) {
          actorList.find('li.list-item').each((_, element) => {
            const name = $(element).find('a.text-primary b').text().trim();
            const image = $(element).find('img.img-responsive').attr('src') || '';
            
            if (name) {
              console.log(`[크롤러] 프로듀서 정보 추출: ${name}`);
              staffInfo.producers.push({ name, image });
            }
          });
        }
      });
      
      console.log(`[크롤러] 제작진 정보 추출 완료: 감독 ${staffInfo.directors.length}명, 작가 ${staffInfo.screenwriters.length}명`);
    };
    
    // 제작진 정보 추출 실행
    extractStaffInfo();
    
    // 배우 정보 추출 함수 - 개선된 버전
    const extractCastFromHtml = () => {
      console.log('[크롤러] 출연진 정보 추출 시작');
      
      // 직접적인 배우 추출 방식 - 명확한 섹션 헤더와 리스트 아이템 구조 활용
      const extractActorsFromSection = (sectionHeader, isMain) => {
        const section = $(`h3.header:contains("${sectionHeader}")`);
        if (section.length) {
          console.log(`[크롤러] ${sectionHeader} 섹션 발견`);
          const actorList = section.next('ul.list');
          
          actorList.find('li.list-item').each((_, element) => {
            // 배우 이름 추출
            const actorName = $(element).find('a.text-primary b').text().trim();
            
            // 역할/캐릭터 이름 추출 - small[title] 태그에서 추출
            let characterName = $(element).find('small[title]').text().trim();
            if (!characterName) {
              // title 속성이 없는 경우, 직접 small 태그 내용 확인
              characterName = $(element).find('small:not(.text-muted)').text().trim();
            }
            
            // 이미지 URL 추출
            const imageElement = $(element).find('img.img-responsive');
            const image = imageElement.length ? imageElement.attr('src') : '';
            
            if (actorName) {
              console.log(`[크롤러] ${sectionHeader} 배우 발견: ${actorName}, 역할: ${characterName}, 이미지: ${image}`);
              
              if (isMain) {
                cast.mainRoles.push({
                  name: actorName,
                  role: characterName || '주연',
                  image: image
                });
              } else {
                cast.supportRoles.push({
                  name: actorName,
                  role: characterName || '조연',
                  image: image
                });
              }
            }
          });
          return true;
        }
        return false;
      };
      
      // 전용 출연진 페이지 형식 처리 함수 - /cast 페이지 대응
      const extractActorsFromCastPage = () => {
        // 출연진 페이지의 모든 섹션 확인
        $('h3.header.b-b.p-b').each((_, sectionHeader) => {
          const headerText = $(sectionHeader).text().trim();
          const isMain = headerText === 'Main Role';
          const isSupport = headerText === 'Support Role';
          
          // 배우 역할(Main/Support) 섹션만 처리
          if (isMain || isSupport) {
            console.log(`[크롤러] 출연진 페이지에서 ${headerText} 섹션 발견`);
            const actorList = $(sectionHeader).next('ul.list');
            
            actorList.find('li.list-item').each((_, element) => {
              // 배우 이름 추출 
              const actorName = $(element).find('a.text-primary b').text().trim();
              
              // 역할/캐릭터 이름 추출
              let characterName = '';
              const smallTitle = $(element).find('small[title]');
              if (smallTitle.length) {
                characterName = smallTitle.text().trim();
                // 일부 사이트는 title 속성에 추가 정보가 있음
                if (characterName === '' && smallTitle.attr('title')) {
                  characterName = smallTitle.attr('title').trim();
                }
              }
              
              // 이미지 URL 추출
              const imageElement = $(element).find('img.img-responsive');
              const image = imageElement.length ? imageElement.attr('src') : '';
              
              if (actorName) {
                console.log(`[크롤러] ${headerText} 배우 발견: ${actorName}, 역할: ${characterName}, 이미지: ${image}`);
                
                const actorInfo = {
                  name: actorName,
                  role: characterName || (isMain ? '주연' : '조연'),
                  image: image
                };
                
                if (isMain) {
                  cast.mainRoles.push(actorInfo);
                } else {
                  cast.supportRoles.push(actorInfo);
                }
              }
            });
          } else if (headerText !== 'Guest Role' && headerText !== 'Cameo' && 
                     headerText !== 'Director' && headerText !== 'Screenwriter & Director' &&
                     headerText !== 'Casting Director' && headerText !== 'Extras Casting' && 
                     headerText !== 'Unknown') {
            console.log(`[크롤러] 지원되지 않는 출연진 섹션 무시: ${headerText}`);
          }
        });
        
        return cast.mainRoles.length > 0 || cast.supportRoles.length > 0;
      };
      
      // 먼저 /cast 페이지 형식 시도 (더 상세한 정보가 있는 형식)
      const foundInCastPage = extractActorsFromCastPage();
      
      // /cast 페이지 형식에서 찾지 못했다면 기존 방법 시도
      if (!foundInCastPage) {
        // 메인 역할 추출
        const foundMain = extractActorsFromSection('Main Role', true);
        
        // 서포트 역할 추출
        const foundSupport = extractActorsFromSection('Support Role', false);
        
        // 게스트 역할도 추출 (서포트 카테고리에 추가)
        const foundGuest = extractActorsFromSection('Guest Role', false);
        
        // 역할이 명시되지 않은 Unknown 배우도 서포트 역할로 추가
        const foundUnknown = extractActorsFromSection('Unknown', false);
      }
      
      // 기존 방식들도 유지 (만약 위 방식이 실패할 경우를 대비)
      if (cast.mainRoles.length === 0 && cast.supportRoles.length === 0) {
        // 기존 백업 추출 코드 실행
        console.log('[크롤러] 기본 셀렉터로 출연진을 찾지 못함. 대체 방식 시도');
        
        // **추가 대체 방법: 모든 list-item에서 배우 정보 추출**
        $('.list-item').each((_, element) => {
          // 배우 이름 찾기
          let actorName = $(element).find('a.text-primary b').text().trim();
          
          // 이미지 URL 찾기
          const image = $(element).find('img').attr('src') || '';
          
          // 역할 정보 추출
          let roleText = $(element).find('small.text-muted').text().trim();
          
          // 배역 이름 찾기
          let characterText = $(element).find('small[title]').text().trim();
          if (!characterText) {
            characterText = $(element).find('small:not(.text-muted)').text().trim();
          }
          
          if (actorName && (roleText.includes('Main') || roleText.includes('Support') || 
                          roleText.includes('Guest') || roleText.includes('Cameo'))) {
            console.log(`[크롤러] 대체 방식으로 배우 발견: ${actorName}, 역할: ${roleText}, 캐릭터: ${characterText}`);
            
            const isMain = roleText.includes('Main');
            const roleDisplay = characterText || (isMain ? "주연" : "조연");
            
            // 중복 확인
            if (isMain && !cast.mainRoles.some(actor => actor.name === actorName)) {
              cast.mainRoles.push({
                name: actorName,
                role: roleDisplay,
                image: image
              });
            } else if (!isMain && !cast.supportRoles.some(actor => actor.name === actorName)) {
              cast.supportRoles.push({
                name: actorName,
                role: roleDisplay,
                image: image
              });
            }
          }
        });
      }
      
      console.log(`[크롤러] 출연진 정보 추출 완료: 메인 ${cast.mainRoles.length}명, 서포트 ${cast.supportRoles.length}명`);
      
      // 설명 목적으로 처음 몇 명의 배우 정보 출력
      if (cast.mainRoles.length > 0) {
        console.log('[크롤러] 메인 출연진 샘플:');
        cast.mainRoles.slice(0, 3).forEach((actor, i) => {
          console.log(`  ${i+1}. ${actor.name} - ${actor.role}`);
        });
      }
      
      if (cast.supportRoles.length > 0) {
        console.log('[크롤러] 서포트 출연진 샘플:');
        cast.supportRoles.slice(0, 3).forEach((actor, i) => {
          console.log(`  ${i+1}. ${actor.name} - ${actor.role}`);
        });
      }
    };
    
    // 새로운 방식으로 출연진 정보 추출
    extractCastFromHtml();
    
    // 출연진 정보가 없으면 대체 선택자 시도
    if (cast.mainRoles.length === 0 && cast.supportRoles.length === 0) {
      console.log('[스텔스 크롤러] 기본 방식으로 출연진 정보를 찾을 수 없어 대체 방식 시도');
      
      // 대체 선택자 1: 'Cast Credits' 박스 내의 모든 배우 찾기 (더 넓은 선택자)
      $('.box-header:contains("Cast")').closest('.box').find('.list li').each((_, element) => {
        // 배우 이름 추출
        const actorName = $(element).find('a.text-primary').text().trim() || '';
        
        // 역할 정보 추출 - HTML 태그 제거하고 순수 텍스트만 추출
        const roleWithTags = $(element).find('.text-muted').html() || '';
        const roleText = stripHtml(roleWithTags);
        
        // 실제 배역 이름 추출
        const characterName = extractCharacterName(roleText);
        
        // 배우 이미지 URL 추출
        const actorImage = $(element).find('img').attr('src') || '';
        
        // 포함 여부 결정을 위한 섹션 헤더 확인
        const parentHeader = $(element).closest('ul.list').prev('h3.header').text().trim();
        
        // "Main Role", "Support Role", "Guest Role", "Cameo" 섹션에 있는 배우만 포함
        if (actorName && 
            (parentHeader.includes('Main Role') || 
             parentHeader.includes('Support Role') || 
             parentHeader.includes('Guest Role') ||
             parentHeader.includes('Cameo')) &&
            isActorRole(roleText)) {
          
          // 역할 정보가 없거나 기본 역할 텍스트만 있으면 기본값 사용
          let roleDisplay = characterName;
          if (!roleDisplay || roleDisplay.length === 0) {
            const isMain = parentHeader.includes('Main Role');
            roleDisplay = isMain ? "주연" : "조연";
            console.log(`[크롤러] 배역명 없음, 기본값 사용: ${actorName} (${roleDisplay})`);
          }
          
          const actorInfo = {
            name: actorName,
            role: roleDisplay,
            image: actorImage
          };
          
          // 역할에 따라 메인/서포트 구분 (내부적으로만 사용)
          if (parentHeader.includes('Main Role')) {
            cast.mainRoles.push(actorInfo);
            console.log(`[크롤러] 메인 출연진 추가: ${actorName} (${roleDisplay})`);
          } else {
            cast.supportRoles.push(actorInfo);
            console.log(`[크롤러] 서포트 출연진 추가: ${actorName} (${roleDisplay})`);
          }
        } else if (actorName) {
          console.log(`[크롤러] 배우 역할 아님, 제외함: ${actorName} (${roleText}) - 섹션: ${parentHeader}`);
        }
      });
      
      // 대체 선택자 2: 또 다른 일반적인 구조
      if (cast.mainRoles.length === 0 && cast.supportRoles.length === 0) {
        $('div.col-lg-8 li.list-item').each((_, element) => {
          if ($(element).find('img').length > 0) { // 배우는 보통 이미지가 있음
            // 배우 이름 추출
            const actorName = $(element).find('a').text().trim() || '';
            
            // 역할 정보 추출 - HTML 태그 제거하고 순수 텍스트만 추출
            const roleWithTags = $(element).find('.text-muted').html() || '';
            const roleText = stripHtml(roleWithTags);
            
            // 실제 배역 이름 추출
            const characterName = extractCharacterName(roleText);
            
            // 배우 이미지 URL 추출
            const actorImage = $(element).find('img').attr('src') || '';
            
            // 포함 여부 결정을 위한 섹션 헤더 확인
            const parentHeader = $(element).closest('ul.list').prev('h3.header').text().trim();
            
            // "Main Role", "Support Role", "Guest Role", "Cameo" 섹션에 있는 배우만 포함
            if (actorName && 
                (parentHeader.includes('Main Role') || 
                 parentHeader.includes('Support Role') || 
                 parentHeader.includes('Guest Role') ||
                 parentHeader.includes('Cameo')) &&
                isActorRole(roleText)) {
              
              // 역할 정보가 없거나 기본 역할 텍스트만 있으면 기본값 사용
              let roleDisplay = characterName;
              if (!roleDisplay || roleDisplay.length === 0) {
                const isMain = parentHeader.includes('Main Role');
                roleDisplay = isMain ? "주연" : "조연";
                console.log(`[크롤러] 배역명 없음, 기본값 사용: ${actorName} (${roleDisplay})`);
              }
              
              const actorInfo = {
                name: actorName,
                role: roleDisplay,
                image: actorImage
              };
              
              // 역할에 따라 메인/서포트 구분 (내부적으로만 사용)
              if (parentHeader.includes('Main Role')) {
                cast.mainRoles.push(actorInfo);
                console.log(`[크롤러] 메인 출연진 추가: ${actorName} (${roleDisplay})`);
              } else {
                cast.supportRoles.push(actorInfo);
                console.log(`[크롤러] 서포트 출연진 추가: ${actorName} (${roleDisplay})`);
              }
            } else if (actorName) {
              console.log(`[크롤러] 배우 역할 아님, 제외함: ${actorName} (${roleText}) - 섹션: ${parentHeader}`);
            }
          }
        });
      }
    }
    
    // 출연진 정보 로깅
    if (cast.mainRoles.length > 0 || cast.supportRoles.length > 0) {
      console.log(`[스텔스 크롤러] 출연진 정보 추출: 메인 ${cast.mainRoles.length}명, 서포트 ${cast.supportRoles.length}명`);
      
      if (cast.mainRoles.length > 0) {
        cast.mainRoles.forEach((actor, idx) => {
          console.log(`[스텔스 크롤러] 메인 출연진 #${idx+1}: ${actor.name} (${actor.role})`);
        });
      }
      
      if (cast.supportRoles.length > 0) {
        cast.supportRoles.forEach((actor, idx) => {
          console.log(`[스텔스 크롤러] 서포트 출연진 #${idx+1}: ${actor.name} (${actor.role})`);
        });
      }
    } else {
      console.log('[스텔스 크롤러] 출연진 정보를 찾을 수 없습니다.');
    }
    
    // 제작진 정보 로깅
    if (staffInfo.directors.length > 0 || staffInfo.screenwriters.length > 0) {
      console.log('[스텔스 크롤러] 제작진 정보:');
      
      if (staffInfo.directors.length > 0) {
        console.log(`[스텔스 크롤러] 감독: ${staffInfo.directors.map(d => d.name).join(', ')}`);
      }
      
      if (staffInfo.screenwriters.length > 0) {
        console.log(`[스텔스 크롤러] 작가: ${staffInfo.screenwriters.map(w => w.name).join(', ')}`);
      }
    }
    
    console.log(`[스텔스 크롤러] 출연진 정보 로깅 완료`);
    
    // 파싱된 결과 객체 생성
    const detailResult = {
      title,
      nativeTitle,
      slug: slug || '',
      mdlId: mdlId || '',
      mdlUrl: url,
      link: url,
      synopsis,
      director: director || (staffInfo.directors.length > 0 ? staffInfo.directors[0].name : ''),
      directors: staffInfo.directors,
      screenwriters: staffInfo.screenwriters,
      castingDirectors: staffInfo.castingDirectors,
      producers: staffInfo.producers,
      genres,
      tags,
      country,
      type,
      episodes,
      airsInfo,
      airsOn,
      startDate,
      endDate,
      rating,
      network,
      contentRating,
      runtime,
      cast: {
        mainRoles: cast.mainRoles,
        supportRoles: cast.supportRoles
      },
      backgroundImage,
      posterImage,
      category: 'drama',
      createdAt: new Date()
    };
    
    // YouTube 관련 비디오 가져오기
    try {
      console.log('[크롤러] YouTube 비디오 자동 검색 시작');
      const youtubeVideos = await fetchYouTubeVideosForDrama(
        detailResult.title,
        detailResult.nativeTitle
      );
      
      if (youtubeVideos && youtubeVideos.length > 0) {
        console.log(`[크롤러] ${youtubeVideos.length}개의 YouTube 비디오를 추가합니다.`);
        detailResult.videos = youtubeVideos;
        
        // 첫 번째 비디오를 trailerUrl로 설정 (기존 trailerUrl이 없는 경우)
        if (!detailResult.trailerUrl && youtubeVideos[0]) {
          detailResult.trailerUrl = youtubeVideos[0].url;
          console.log(`[크롤러] 첫 번째 YouTube 비디오를 메인 트레일러로 설정: ${detailResult.trailerUrl}`);
        }
      } else {
        console.log('[크롤러] 적합한 YouTube 비디오를 찾지 못했습니다.');
      }
    } catch (youtubeError) {
      console.error('[크롤러] YouTube 비디오 검색 중 오류:', youtubeError);
      // YouTube 검색 실패는 전체 처리를 중단하지 않도록 에러를 무시하고 진행
    }
    
    console.log(`[스텔스 크롤러] 파싱 완료: ${title}`);
    return detailResult;
  } catch (error) {
    console.error('[스텔스 크롤러] 드라마 상세 정보 파싱 중 오류:', error);
    throw error;
  }
}

/**
 * URL에서 캐스트 페이지 URL을 생성하는 함수
 * 예: https://mydramalist.com/702271-weak-hero-season-2 -> https://mydramalist.com/702271-weak-hero-season-2/cast
 */
function getCastPageUrl(url) {
  if (!url) return null;
  
  // 이미 캐스트 페이지인 경우
  if (url.endsWith('/cast')) {
    return url;
  }
  
  try {
    // URL의 끝에 '/cast' 추가
    const baseUrl = url.trim();
    return `${baseUrl}/cast`;
  } catch (error) {
    console.error('[스텔스 크롤러] 캐스트 페이지 URL 생성 중 오류:', error);
    return null;
  }
}

/**
 * 캐스트 페이지에서 추출한 배우 정보를 기존 정보와 병합하는 함수
 */
async function mergeCastInfo(detailResult, castHtml, castUrl) {
  if (!detailResult || !castHtml) return;
  
  try {
    console.log('[스텔스 크롤러] 캐스트 페이지에서 추출한 배우 정보 병합 시작');
    const $ = cheerio.load(castHtml);
    
    const existingActors = new Set();
    
    // 기존 배우 이름을 Set에 추가 (중복 방지용)
    if (detailResult.cast && detailResult.cast.mainRoles) {
      detailResult.cast.mainRoles.forEach(actor => {
        existingActors.add(actor.name.trim().toLowerCase());
      });
    }
    
    if (detailResult.cast && detailResult.cast.supportRoles) {
      detailResult.cast.supportRoles.forEach(actor => {
        existingActors.add(actor.name.trim().toLowerCase());
      });
    }
    
    console.log(`[스텔스 크롤러] 기존 배우 ${existingActors.size}명 정보 확인 완료`);
    
    // 캐스트 페이지에서 새로운 배우 추출
    // 메인 역할 배우 추출
    $('h3.header:contains("Main Role")').next('ul.list').find('li.list-item').each((_, element) => {
      const actorName = $(element).find('a.text-primary b').text().trim();
      if (!actorName) return;
      
      // 이미 존재하는 배우인지 확인
      if (existingActors.has(actorName.toLowerCase())) {
        return;
      }
      
      // 역할/캐릭터 이름 추출
      let characterName = '';
      const smallTitle = $(element).find('small[title]');
      if (smallTitle.length) {
        characterName = smallTitle.text().trim();
        if (characterName === '' && smallTitle.attr('title')) {
          characterName = smallTitle.attr('title').trim();
        }
      }
      
      // 이미지 URL 추출
      const imageElement = $(element).find('img.img-responsive');
      const image = imageElement.length ? imageElement.attr('src') : '';
      
      console.log(`[스텔스 크롤러] 캐스트 페이지에서 새 메인 배우 발견: ${actorName}, 역할: ${characterName || '주연'}`);
      
      // 배우 정보 추가
      if (!detailResult.cast.mainRoles) {
        detailResult.cast.mainRoles = [];
      }
      
      detailResult.cast.mainRoles.push({
        name: actorName,
        role: characterName || '주연',
        image: image
      });
      
      existingActors.add(actorName.toLowerCase());
    });
    
    // 서포트 역할 배우 추출
    $('h3.header:contains("Support Role")').next('ul.list').find('li.list-item').each((_, element) => {
      const actorName = $(element).find('a.text-primary b').text().trim();
      if (!actorName) return;
      
      // 이미 존재하는 배우인지 확인
      if (existingActors.has(actorName.toLowerCase())) {
        return;
      }
      
      // 역할/캐릭터 이름 추출
      let characterName = '';
      const smallTitle = $(element).find('small[title]');
      if (smallTitle.length) {
        characterName = smallTitle.text().trim();
        if (characterName === '' && smallTitle.attr('title')) {
          characterName = smallTitle.attr('title').trim();
        }
      }
      
      // 이미지 URL 추출
      const imageElement = $(element).find('img.img-responsive');
      const image = imageElement.length ? imageElement.attr('src') : '';
      
      console.log(`[스텔스 크롤러] 캐스트 페이지에서 새 서포트 배우 발견: ${actorName}, 역할: ${characterName || '조연'}`);
      
      // 배우 정보 추가
      if (!detailResult.cast.supportRoles) {
        detailResult.cast.supportRoles = [];
      }
      
      detailResult.cast.supportRoles.push({
        name: actorName,
        role: characterName || '조연',
        image: image
      });
      
      existingActors.add(actorName.toLowerCase());
    });
    
    // 게스트 역할 배우 추출 (서포트에 추가)
    $('h3.header:contains("Guest Role")').next('ul.list').find('li.list-item').each((_, element) => {
      const actorName = $(element).find('a.text-primary b').text().trim();
      if (!actorName) return;
      
      // 이미 존재하는 배우인지 확인
      if (existingActors.has(actorName.toLowerCase())) {
        return;
      }
      
      // 역할/캐릭터 이름 추출
      let characterName = '';
      const smallTitle = $(element).find('small[title]');
      if (smallTitle.length) {
        characterName = smallTitle.text().trim();
        if (characterName === '' && smallTitle.attr('title')) {
          characterName = smallTitle.attr('title').trim();
        }
      }
      
      // 이미지 URL 추출
      const imageElement = $(element).find('img.img-responsive');
      const image = imageElement.length ? imageElement.attr('src') : '';
      
      console.log(`[스텔스 크롤러] 캐스트 페이지에서 새 게스트 배우 발견: ${actorName}, 역할: ${characterName || '게스트'}`);
      
      // 배우 정보 추가 (서포트에 추가)
      if (!detailResult.cast.supportRoles) {
        detailResult.cast.supportRoles = [];
      }
      
      detailResult.cast.supportRoles.push({
        name: actorName,
        role: characterName || '게스트',
        image: image
      });
      
      existingActors.add(actorName.toLowerCase());
    });
    
    console.log(`[스텔스 크롤러] 캐스트 페이지 병합 완료: 메인 ${detailResult.cast.mainRoles?.length || 0}명, 서포트 ${detailResult.cast.supportRoles?.length || 0}명`);
  } catch (error) {
    console.error('[스텔스 크롤러] 캐스트 정보 병합 중 오류:', error);
  }
}

/**
 * MyDramalist의 에피소드 페이지 HTML을 파싱하여 에피소드 정보를 추출하는 함수
 */
async function parseEpisodesHtml(html, url) {
  try {
    console.log(`[스텔스 크롤러] 에피소드 페이지 HTML 파싱 시작, HTML 크기: ${html.length} 바이트`);
    
    // HTML 파싱
    const $ = cheerio.load(html);
    console.log(`[스텔스 크롤러] 에피소드 페이지 제목: "${$('title').text()}"`);
    
    // 에피소드 목록을 저장할 배열
    const episodes = [];
    
    // 에피소드 테이블 찾기
    const episodeTable = $('.box.episode-list table.table tbody tr');
    
    // 에피소드 목록에서 각 에피소드 정보 추출
    episodeTable.each((index, element) => {
      try {
        // 에피소드 번호
        const episodeNumber = $(element).find('td.text-center').first().text().trim();
        const number = parseInt(episodeNumber) || (index + 1);
        
        // 에피소드 제목
        const titleElement = $(element).find('td.title');
        const title = titleElement.text().trim();
        
        // 에피소드 상세 URL
        const mdlUrl = titleElement.find('a').attr('href');
        
        // 방영일
        let airDate = null;
        const airDateText = $(element).find('td:nth-child(3)').text().trim();
        if (airDateText && airDateText !== '?') {
          try {
            airDate = new Date(airDateText);
            if (isNaN(airDate.getTime())) {
              airDate = null;
            }
          } catch (e) {
            airDate = null;
          }
        }
        
        // 평점
        let rating = null;
        const ratingText = $(element).find('td:nth-child(4)').text().trim();
        if (ratingText && ratingText !== '?') {
          rating = parseFloat(ratingText);
        }
        
        // 관람자 평점
        let viewerRating = null;
        const viewerRatingText = $(element).find('td:nth-child(5)').text().trim();
        if (viewerRatingText && viewerRatingText !== '?' && viewerRatingText !== 'N/A') {
          // "5.2%" 같은 형식에서 %를 제거하고 숫자만 파싱
          viewerRating = parseFloat(viewerRatingText.replace('%', ''));
        }
        
        // 이미지 URL (없을 경우)
        const image = '';
        
        // 런타임 (기본값 60분)
        const runtime = 60;
        
        // 줄거리 (기본값 빈 문자열)
        const summary = '';
        
        // 에피소드 정보 객체 생성 및 배열에 추가
        episodes.push({
          number,
          title,
          airDate,
          rating,
          viewerRating,
          image,
          mdlUrl,
          runtime,
          summary
        });
        
        console.log(`[스텔스 크롤러] 에피소드 #${number} 추출: ${title}, 방영일: ${airDate ? airDate.toISOString().split('T')[0] : 'N/A'}, 평점: ${rating || 'N/A'}`);
      } catch (episodeError) {
        console.error(`[스텔스 크롤러] 에피소드 #${index + 1} 파싱 중 오류:`, episodeError);
      }
    });
    
    // 에피소드를 번호순으로 정렬
    episodes.sort((a, b) => a.number - b.number);
    
    console.log(`[스텔스 크롤러] 에피소드 페이지 파싱 완료: ${episodes.length}개 에피소드 추출`);
    return episodes;
    
  } catch (error) {
    console.error('[스텔스 크롤러] 에피소드 페이지 파싱 중 오류:', error);
    return [];
  }
}

/**
 * MyDramalist의 "Where to Watch" 섹션에서 스트리밍 서비스 정보를 추출하는 함수
 */
async function parseStreamingServices(html, url) {
  try {
    console.log(`[스텔스 크롤러] "Where to Watch" 섹션 파싱 시작, HTML 크기: ${html.length} 바이트`);
    
    // HTML 파싱
    const $ = cheerio.load(html);
    
    // 스트리밍 서비스 정보를 저장할 배열
    const streamingServices = [];
    
    // "Where to Watch" 섹션 찾기
    const whereToWatchSection = $('.box-body.wts');
    
    if (!whereToWatchSection.length) {
      console.log('[스텔스 크롤러] "Where to Watch" 섹션을 찾을 수 없음');
      return [];
    }
    
    // 각 스트리밍 서비스 항목 찾기
    whereToWatchSection.find('.row .col-xs-12.col-lg-4.m-b-sm').each((_, element) => {
      try {
        const serviceContainer = $(element);
        
        // 서비스 정보 추출
        const serviceLink = serviceContainer.find('a[rel="external nofollow"]').first();
        if (!serviceLink.length) return;
        
        // 서비스 URL 추출
        const rawRedirectUrl = serviceLink.attr('href') || '';
        let serviceUrl = '';
        
        // mydramalist의 리다이렉트 URL에서 실제 URL 추출
        if (rawRedirectUrl.includes('/redirect?q=')) {
          const urlMatch = rawRedirectUrl.match(/\/redirect\?q=([^&]+)/);
          if (urlMatch && urlMatch[1]) {
            serviceUrl = decodeURIComponent(urlMatch[1]);
          }
        } else {
          serviceUrl = rawRedirectUrl;
        }
        
        // 서비스 이름 추출
        const serviceName = serviceContainer.find('a.text-primary b').text().trim();
        
        // 서비스 타입 추출 (Subscription, Free 등)
        const serviceType = serviceContainer.find('.p-l div:nth-child(2)').text().trim();
        
        // 서비스 로고 이미지 추출
        const serviceLogoElement = serviceContainer.find('img.img-responsive');
        let serviceLogo = serviceLogoElement.length ? serviceLogoElement.attr('src') : '';
        
        // 특정 서비스는 고정 로고 URL 사용
        if (serviceName.toLowerCase() === 'wavve') {
          serviceLogo = 'https://i.mydramalist.com/pgAd8_3m.jpg';
        } else if (serviceName.toLowerCase() === 'viki') {
          serviceLogo = 'https://i.mydramalist.com/kEBdrm.jpg';
        }
        
        // 발견한 서비스 정보 처리
        if (serviceName && serviceUrl) {
          console.log(`[스텔스 크롤러] 스트리밍 서비스 발견: ${serviceName}, URL: ${serviceUrl}, Logo: ${serviceLogo}`);
          
          // 로고 URL 정규화
          const normalizedLogo = serviceLogo?.startsWith('http') ? 
            serviceLogo : 
            `https://i.mydramalist.com${serviceLogo?.startsWith('/') ? '' : '/'}${serviceLogo}`;
          
          // 스트리밍 서비스 정보 객체 생성
          const serviceInfo = {
            name: serviceName,
            url: serviceUrl,
            type: serviceType,
            logo: normalizedLogo
          };
          
          // 특정 서비스에 대한 추가 정보 설정
          switch (serviceName.toLowerCase()) {
            case 'netflix':
              serviceInfo.providerKey = 'netflix';
              break;
            case 'apple tv+':
            case 'apple tv':
              serviceInfo.providerKey = 'apple';
              break;
            case 'disney+':
              serviceInfo.providerKey = 'disney';
              break;
            case 'viki':
              serviceInfo.providerKey = 'viki';
              serviceInfo.logo = 'https://i.mydramalist.com/kEBdrm.jpg';
              break;
            case 'wavve':
              serviceInfo.providerKey = 'wavve';
              serviceInfo.logo = 'https://i.mydramalist.com/pgAd8_3m.jpg';
              break;
            default:
              // 기타 서비스는 소문자 이름을 키로 사용
              serviceInfo.providerKey = serviceName.toLowerCase().replace(/\s+/g, '_');
          }
          
          // 배열에 추가
          streamingServices.push(serviceInfo);
        }
      } catch (serviceError) {
        console.error('[스텔스 크롤러] 스트리밍 서비스 파싱 중 오류:', serviceError);
      }
    });
    
    console.log(`[스텔스 크롤러] "Where to Watch" 섹션 파싱 완료: ${streamingServices.length}개 서비스 발견`);
    return streamingServices;
    
  } catch (error) {
    console.error('[스텔스 크롤러] 스트리밍 서비스 파싱 중 오류:', error);
    return [];
  }
}

// YouTube 관련 비디오 가져오기 함수
const fetchYouTubeVideosForDrama = async (dramaTitle, originalTitle) => {
  try {
    console.log(`[YouTube] '${dramaTitle}' 관련 유튜브 비디오 검색 시작`);
    
    // YouTube API 키 확인
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      console.warn('[YouTube] API 키가 설정되지 않았습니다.');
      return [];
    }
    
    // 영어 제목 기준으로 검색 (영어 제목이 없으면 원제목 사용)
    const searchTitle = originalTitle || dramaTitle;
    
    // 내부 API 호출 (환경에 맞는 포트 사용)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:13001';
    const response = await axios.get(`${baseUrl}/api/youtube/search-videos`, {
      params: {
        title: searchTitle,
        maxResults: 5
      }
    });
    
    if (!response.data.success || !response.data.data) {
      console.warn(`[YouTube] '${searchTitle}' 검색 실패:`, response.data.message);
      return [];
    }
    
    const videos = response.data.data;
    console.log(`[YouTube] '${searchTitle}' 관련 비디오 ${videos.length}개 발견`);
    
    // 유튜브 API로부터 받은 비디오 정보를 드라마 스키마에 맞게 변환
    return videos.map((video, index) => ({
      title: video.title,
      type: 'trailer', // 기본 타입은 트레일러로 설정
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      publishedAt: video.publishedAt,
      order: index
    }));
    
  } catch (error) {
    console.error('[YouTube] 비디오 검색 오류:', error);
    return [];
  }
};