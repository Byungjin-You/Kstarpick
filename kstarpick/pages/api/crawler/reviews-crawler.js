import { getSession } from 'next-auth/react';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';

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

// page.waitForTimeout 대체 함수
const pageDelay = async (page, ms) => {
  await page.evaluate(ms => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }, ms);
};

/**
 * 스텔스 모드로 MyDramalist 리뷰를 크롤링하는 API
 * Cloudflare 보호를 우회하기 위한 기술을 적용함
 */
export default async function handler(req, res) {
  // API 요청 시작 로그
  console.log('================ 스텔스 리뷰 크롤러 API 요청 시작 ================');
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
    console.log('[스텔스 리뷰 크롤러] 권한 체크 생략됨 (DEBUG_MODE)');

    // 요청 본문 확인
    const { url, dramaId } = req.body;

    if (!url) {
      console.log('URL 누락');
      return res.status(400).json({ success: false, message: 'URL이 필요합니다.' });
    }

    if (!dramaId) {
      console.log('드라마 ID 누락');
      return res.status(400).json({ success: false, message: '드라마 ID가 필요합니다.' });
    }

    // MyDramalist 리뷰 페이지 URL 확인
    let targetUrl = url;
    
    // URL이 '/reviews'로 끝나지 않으면 추가
    if (!targetUrl.endsWith('/reviews')) {
      // URL에서 trailing slash 제거
      if (targetUrl.endsWith('/')) {
        targetUrl = targetUrl.slice(0, -1);
      }
      targetUrl = `${targetUrl}/reviews`;
      console.log(`[스텔스 리뷰 크롤러] URL 조정됨: ${targetUrl}`);
    }

    console.log(`[스텔스 리뷰 크롤러] ${targetUrl} 크롤링 시작`);

    // 스텔스 브라우저 설정
    console.log('[스텔스 리뷰 크롤러] 브라우저 설정 시작');
    const { browser: newBrowser, page } = await setupStealthBrowser();
    browser = newBrowser;
    console.log('[스텔스 리뷰 크롤러] 브라우저 설정 완료');

    // 페이지 디버그 모드 활성화 (콘솔 로그 캡처)
    page.on('console', (msg) => console.log('[브라우저 콘솔]', msg.text()));

    // 페이지 로딩
    console.log(`[스텔스 리뷰 크롤러] 페이지 로딩 중... (${targetUrl})`);
    
    // 여러 번 시도해보기
    let loadSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!loadSuccess && retryCount < maxRetries) {
      try {
        retryCount++;
        console.log(`[스텔스 리뷰 크롤러] 시도 #${retryCount} / ${maxRetries}`);
        
        // 5초 후에 타임아웃 처리를 시작
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('페이지 로딩 타임아웃'));
          }, 60000); // 60초 타임아웃
        });
        
        // 페이지 로딩 또는 타임아웃 중 먼저 발생하는 것 처리
        await Promise.race([
          page.goto(targetUrl, {
            waitUntil: 'domcontentloaded', // 더 빠른 이벤트로 변경
            timeout: 30000 // 30초 타임아웃
          }),
          timeoutPromise
        ]);
        
        // 추가 리소스 로딩 대기
        try {
          await page.waitForFunction(() => {
            return document.readyState === 'complete' || 
                 document.querySelectorAll('.review, .box, #content, .post, .comment').length > 0;
          }, { timeout: 15000 });
          console.log('[스텔스 리뷰 크롤러] 페이지 완전히 로드됨');
          loadSuccess = true;
        } catch (waitError) {
          console.log('[스텔스 리뷰 크롤러] 추가 리소스 대기 타임아웃, 계속 진행');
          
          // 요소가 없더라도 일단 진행
          const htmlContent = await page.content();
          if (htmlContent && htmlContent.length > 1000) {
            console.log('[스텔스 리뷰 크롤러] HTML은 로드되었으므로 계속 진행합니다');
            loadSuccess = true;
          }
        }
      } catch (navigationError) {
        console.error(`[스텔스 리뷰 크롤러] 페이지 로딩 중 오류 (시도 #${retryCount}):`, navigationError.message);
        
        if (retryCount >= maxRetries) {
          console.log('[스텔스 리뷰 크롤러] 최대 시도 횟수 도달, 계속 진행 시도...');
        } else {
          // 잠시 대기 후 다시 시도
          console.log('[스텔스 리뷰 크롤러] 5초 후 다시 시도합니다...');
          await pageDelay(page, 5000);
        }
      }
    }

    console.log(`[스텔스 리뷰 크롤러] 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();

    // Cloudflare 우회 확인
    let pageTitle = '';
    try {
      pageTitle = await handleCloudflareProtection(page);
      console.log(`[스텔스 리뷰 크롤러] 페이지 제목: "${pageTitle}"`);
    } catch (cfError) {
      console.error('[스텔스 리뷰 크롤러] Cloudflare 처리 중 오류:', cfError.message);
      
      // Cloudflare 우회 실패해도 계속 시도
      console.log('[스텔스 리뷰 크롤러] Cloudflare 우회 실패해도 계속 진행 시도...');
      await pageDelay(page, 5000);
    }

    // 인간과 같은 스크롤 동작
    console.log(`[스텔스 리뷰 크롤러] 인간과 유사한 스크롤 동작 수행 중...`);
    try {
      await humanLikeScroll(page);
      console.log('[스텔스 리뷰 크롤러] 스크롤 완료');
    } catch (scrollError) {
      console.error('[스텔스 리뷰 크롤러] 스크롤 중 오류:', scrollError.message);
    }
    
    // 리뷰가 나타날 때까지 추가 대기
    try {
      console.log('[스텔스 리뷰 크롤러] 리뷰 요소 대기 중...');
      await page.waitForFunction(() => {
        const selectors = [
          '.review', 
          '.box-body[data-section="reviews"] > div', 
          '.post', 
          '.comment:not(.reply)',
          '.user-reviews > div'
        ];
        
        for (const selector of selectors) {
          if (document.querySelectorAll(selector).length > 0) {
            console.log(`발견된 선택자: ${selector}, 개수: ${document.querySelectorAll(selector).length}`);
            return true;
          }
        }
        
        return false;
      }, { timeout: 10000 });
      console.log('[스텔스 리뷰 크롤러] 리뷰 요소 발견');
    } catch (e) {
      console.log('[스텔스 리뷰 크롤러] 리뷰 요소를 찾지 못했지만 계속 진행합니다');
    }
    
    // 페이지 구조 분석
    const pageStructure = await page.evaluate(() => {
      const structure = {
        title: document.title,
        url: window.location.href,
        bodyClasses: document.body.className,
        reviewCount: document.querySelectorAll('.review').length,
        postCount: document.querySelectorAll('.post').length,
        commentCount: document.querySelectorAll('.comment:not(.reply)').length,
        boxCount: document.querySelectorAll('.box').length,
        contentCount: document.querySelectorAll('#content').length,
        textareaCount: document.querySelectorAll('textarea').length,
        reviewElements: []
      };
      
      // Reviews 섹션 찾기
      const boxElements = document.querySelectorAll('.box');
      for (let i = 0; i < boxElements.length; i++) {
        const headerText = boxElements[i].querySelector('.box-header')?.textContent || '';
        if (headerText.includes('Reviews')) {
          structure.reviewsBox = {
            headerText,
            boxIndex: i,
            postsCount: boxElements[i].querySelectorAll('.post').length,
            commentsCount: boxElements[i].querySelectorAll('.comment:not(.reply)').length
          };
          break;
        }
      }
      
      // 리뷰 요소 구조 분석
      const selectors = [
        '.review', 
        '.post', 
        '.comment:not(.reply)',
        '.box-body[data-section="reviews"] > div'
      ];
      
      let reviewElements = [];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          reviewElements = Array.from(elements);
          structure.foundSelector = selector;
          structure.foundCount = elements.length;
          break;
        }
      }
      
      for (let i = 0; i < Math.min(reviewElements.length, 3); i++) {
        const review = reviewElements[i];
        structure.reviewElements.push({
          classes: review.className,
          id: review.id,
          childrenCount: review.children.length,
          hasRatingOverall: review.querySelector('.rating-overall, .score, .rated') !== null,
          hasReviewBody: review.querySelector('.review-body, .review-bodyfull, .post-body, .text-content, .comment-body') !== null
        });
      }
      
      return structure;
    });
    
    console.log('[스텔스 리뷰 크롤러] 페이지 구조 분석:', JSON.stringify(pageStructure, null, 2));
    
    // 스크린샷 촬영 (리뷰 디버깅 목적)
    try {
      await page.screenshot({ path: '/tmp/review-page-debug.png', fullPage: true });
      console.log('[스텔스 리뷰 크롤러] 스크린샷 저장됨: /tmp/review-page-debug.png');
    } catch (screenshotError) {
      console.error('[스텔스 리뷰 크롤러] 스크린샷 저장 실패:', screenshotError.message);
    }
    
    // 5초 더 대기 (충분한 로딩 시간 확보)
    await pageDelay(page, 5000);

    // HTML 추출
    console.log('[스텔스 리뷰 크롤러] HTML 콘텐츠 추출 중...');
    const html = await page.content();
    console.log(`[스텔스 리뷰 크롤러] HTML 데이터 크기: ${html.length} 바이트`);

    if (!html || html.length < 1000) {
      console.error('[스텔스 리뷰 크롤러] HTML이 비어있거나 너무 짧음');
      throw new Error('HTML이 비어있거나 너무 짧습니다. 크롤링에 실패했습니다.');
    }
    
    // HTML 샘플 디버깅
    const htmlSample = html.length > 2000 
      ? html.substring(0, 1000) + '...[중간 생략]...' + html.substring(html.length - 1000) 
      : html;
    console.log('[스텔스 리뷰 크롤러] HTML 샘플:', htmlSample.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    
    // 디버깅용 HTML 파일 저장
    try {
      const fs = require('fs');
      const path = require('path');
      const debugDir = path.join(process.cwd(), 'debug');
      
      // debug 디렉토리가 없으면 생성
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const htmlPath = path.join(debugDir, `review-page-${timestamp}.html`);
      fs.writeFileSync(htmlPath, html);
      console.log(`[스텔스 리뷰 크롤러] 디버깅용 HTML 저장됨: ${htmlPath}`);
    } catch (fsError) {
      console.error('[스텔스 리뷰 크롤러] 디버깅용 HTML 저장 실패:', fsError.message);
    }
    
    // 리뷰 페이지 파싱
    console.log('[스텔스 리뷰 크롤러] 리뷰 페이지 파싱 시작');
    const reviewsResult = await parseReviewsHtml(html, targetUrl);
    console.log(`[스텔스 리뷰 크롤러] 파싱 완료: ${reviewsResult.length}개 리뷰 발견`);
    
    // 파싱된 리뷰 데이터를 MongoDB에 저장
    if (reviewsResult.length > 0) {
      try {
        const { db } = await connectToDatabase();
        
        // 리뷰 데이터 처리 및 저장
        for (const review of reviewsResult) {
          // 리뷰에 드라마 ID 추가
          review.dramaId = dramaId;
          
          // 중복 체크 (리뷰 ID 기준)
          const existingReview = await db.collection('reviews').findOne({ 
            reviewId: review.reviewId 
          });
          
          if (existingReview) {
            // 기존 리뷰 업데이트
            await db.collection('reviews').updateOne(
              { reviewId: review.reviewId },
              { $set: review }
            );
            console.log(`[스텔스 리뷰 크롤러] 기존 리뷰 업데이트: ${review.reviewId}`);
          } else {
            // 새 리뷰 추가
            await db.collection('reviews').insertOne(review);
            console.log(`[스텔스 리뷰 크롤러] 새 리뷰 추가: ${review.reviewId}`);
          }
        }
        
        // 드라마 데이터 업데이트 (리뷰 개수 및 평균 평점)
        const allReviews = await db.collection('reviews').find({ dramaId }).toArray();
        const reviewCount = allReviews.length;
        
        // 평균 평점 계산
        let totalRating = 0;
        let ratingCount = 0;
        for (const review of allReviews) {
          if (review.rating && review.rating > 0) {
            totalRating += review.rating;
            ratingCount++;
          }
        }
        const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
        
        // 평점 분포 계산 (1-10점)
        const ratingDistribution = Array(10).fill(0);
        for (const review of allReviews) {
          if (review.rating && review.rating > 0 && review.rating <= 10) {
            const ratingIndex = Math.floor(review.rating) - 1;
            if (ratingIndex >= 0 && ratingIndex < 10) {
              ratingDistribution[ratingIndex]++;
            }
          }
        }
        
        // 드라마 업데이트
        await db.collection('dramas').updateOne(
          { _id: dramaId },
          { 
            $set: { 
              reviewCount,
              reviewRating: averageRating,
              ratingDistribution
            } 
          }
        );
        
        console.log(`[스텔스 리뷰 크롤러] 드라마 정보 업데이트 완료: 리뷰 ${reviewCount}개, 평균 평점 ${averageRating.toFixed(1)}`);
      } catch (dbError) {
        console.error('[스텔스 리뷰 크롤러] 데이터베이스 처리 중 오류:', dbError);
        throw dbError;
      }
    }
    
    return res.status(200).json({
      success: true,
      message: `${reviewsResult.length}개의 리뷰를 크롤링했습니다.`,
      data: {
        reviews: reviewsResult
      }
    });
  } catch (error) {
    console.error('[스텔스 리뷰 크롤러] 오류 발생:', error);
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
        console.log('[스텔스 리뷰 크롤러] 브라우저 세션 종료');
      } catch (closeError) {
        console.error('[스텔스 리뷰 크롤러] 브라우저 종료 중 오류:', closeError);
      }
    }
    
    console.log('================ 스텔스 리뷰 크롤러 API 요청 종료 ================');
  }
}

/**
 * 인간과 유사한 스크롤 동작 구현
 */
async function humanLikeScroll(page) {
  console.log('[스텔스 리뷰 크롤러] 인간과 유사한 스크롤 시작...');
  
  // 페이지의 리뷰 섹션 로딩 대기
  try {
    await page.waitForSelector('#content, .box, .review', { timeout: 10000 });
    console.log('[스텔스 리뷰 크롤러] 페이지 내 주요 요소 발견됨');
  } catch (error) {
    console.log('[스텔스 리뷰 크롤러] 일부 요소를 찾지 못했지만 계속 진행합니다');
  }
  
  await page.evaluate(async () => {
    let scrollHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const viewportHeight = window.innerHeight;
    let currentPosition = 0;
    
    // 리뷰 섹션으로 이동 시도
    const reviewSection = document.querySelector('#content .box, .review');
    if (reviewSection) {
      reviewSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // 페이지 전체 스크롤
    while (currentPosition < scrollHeight) {
      // 랜덤한 스크롤 거리
      const scrollAmount = Math.floor(Math.random() * 300) + 100;
      currentPosition += scrollAmount;
      
      // 가끔 위로 조금 스크롤 (실제 사용자처럼)
      if (Math.random() < 0.15 && currentPosition > viewportHeight) {
        const upScroll = Math.floor(Math.random() * 100) + 10;
        window.scrollTo({
          top: currentPosition - upScroll,
          behavior: 'smooth'
        });
        await new Promise(r => setTimeout(r, Math.random() * 400 + 100));
      }
      
      // 부드러운 스크롤
      window.scrollTo({
        top: currentPosition,
        behavior: 'smooth'
      });
      
      // 랜덤 대기
      await new Promise(r => setTimeout(r, Math.random() * 800 + 300));
      
      // 가끔 잠시 멈춤
      if (Math.random() < 0.25) {
        await new Promise(r => setTimeout(r, Math.random() * 2000 + 500));
        
        // 드래그 동작 시뮬레이션 (텍스트 선택)
        if (Math.random() < 0.3) {
          const reviews = document.querySelectorAll('.review, .review-body, .box-body');
          if (reviews.length > 0) {
            const randomReview = reviews[Math.floor(Math.random() * reviews.length)];
            try {
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(randomReview);
              selection.removeAllRanges();
              selection.addRange(range);
              
              // 잠시 후 선택 취소
              await new Promise(r => setTimeout(r, Math.random() * 500 + 200));
              selection.removeAllRanges();
            } catch (e) {}
          }
        }
      }
      
      // 더 스크롤할 필요가 있는지 다시 계산
      const newScrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      if (newScrollHeight > scrollHeight) {
        scrollHeight = newScrollHeight;
      }
      
      // 끝에 도달한 경우
      if (currentPosition >= scrollHeight - viewportHeight) {
        break;
      }
    }
    
    // 리뷰 섹션으로 다시 이동
    const reviews = document.querySelectorAll('.review, .box-body');
    if (reviews.length > 0) {
      reviews[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // 페이지 중간 부분으로 스크롤
      window.scrollTo({
        top: Math.floor(scrollHeight / 3),
        behavior: 'smooth'
      });
    }
    
    // 잠시 대기
    await new Promise(r => setTimeout(r, 1000));
  });
  
  console.log('[스텔스 리뷰 크롤러] 인간과 유사한 스크롤 완료');
}

/**
 * Cloudflare 우회 확인 및 처리
 */
async function handleCloudflareProtection(page) {
  // Cloudflare 우회 검증
  const pageTitle = await page.title();
  
  if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare') || pageTitle.includes('Attention Required')) {
    console.log(`[스텔스 리뷰 크롤러] Cloudflare 감지됨, 추가 대기...`);
    
    try {
      // 추가 대기
      console.log('[스텔스 리뷰 크롤러] Cloudflare 체크 통과 대기 (최대 30초)...');
      
      // Cloudflare 로딩 표시 대기 (일반적으로 로딩 아이콘이 있음)
      await page.waitForFunction(() => {
        return !document.title.includes('Just a moment') && 
               !document.title.includes('Cloudflare') && 
               !document.title.includes('Attention Required');
      }, { timeout: 30000 });
      
      // 추가 인증 필요한 경우 클릭 처리 시도
      try {
        const clickableElements = await page.$$('input[type="checkbox"], button, a.button');
        if (clickableElements.length > 0) {
          console.log('[스텔스 리뷰 크롤러] Cloudflare 요소 클릭 시도...');
          await clickableElements[0].click();
          await pageDelay(page, 5000);
        }
      } catch (e) {
        console.log('[스텔스 리뷰 크롤러] Cloudflare 요소 클릭 중 오류:', e.message);
      }
      
      // 추가 대기
      await pageDelay(page, 5000);
      
      // 다시 제목 확인
      const newTitle = await page.title();
      console.log(`[스텔스 리뷰 크롤러] Cloudflare 후 새 페이지 제목: "${newTitle}"`);
      
      if (newTitle.includes('Just a moment') || newTitle.includes('Cloudflare') || newTitle.includes('Attention Required')) {
        throw new Error('Cloudflare 보호를 우회하지 못했습니다.');
      }
      
      return newTitle;
    } catch (error) {
      console.error('[스텔스 리뷰 크롤러] Cloudflare 처리 중 오류:', error.message);
      
      // 페이지 내용 분석
      const pageContent = await page.content();
      if (pageContent.includes('challenge-running') || pageContent.includes('challenge-error')) {
        console.log('[스텔스 리뷰 크롤러] Cloudflare 챌린지 감지됨');
      }
      
      throw new Error('Cloudflare 보호를 우회하지 못했습니다: ' + error.message);
    }
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
      '--disable-gpu', // GPU 가속 비활성화
      '--disable-features=site-per-process', // 사이트 격리 비활성화
      '--ignore-certificate-errors', // 인증서 오류 무시
      '--enable-features=NetworkService,NetworkServiceInProcess' // 네트워크 서비스 활성화
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
  
  // 리소스 로딩 관리
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const resourceType = request.resourceType();
    const url = request.url();
    
    // 중요 리소스는 허용 (MDL 리뷰 페이지와 관련된 리소스)
    if (url.includes('mydramalist.com') || 
        url.includes('review') || 
        url.includes('rating') || 
        url.includes('user') ||
        resourceType === 'document' || 
        resourceType === 'script' || 
        resourceType === 'xhr' || 
        resourceType === 'fetch') {
      request.continue();
    }
    // 이미지, 폰트, 미디어 등 차단 (속도 향상)
    else if (['image', 'font', 'media'].includes(resourceType)) {
      request.abort();
    } 
    else {
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
    
    // Chrome 브라우저 특성 시뮬레이션
    window.chrome = {
      app: {
        InstallState: {
          DISABLED: 'disabled',
          INSTALLED: 'installed',
          NOT_INSTALLED: 'not_installed'
        },
        RunningState: {
          CANNOT_RUN: 'cannot_run',
          READY_TO_RUN: 'ready_to_run',
          RUNNING: 'running'
        },
        getDetails: function() {},
        getIsInstalled: function() {},
        installState: function() {
          return 'installed';
        },
        isInstalled: true,
        runningState: function() {
          return 'running';
        }
      },
      csi: function() {},
      loadTimes: function() {},
      runtime: {
        OnInstalledReason: {
          CHROME_UPDATE: 'chrome_update',
          INSTALL: 'install',
          SHARED_MODULE_UPDATE: 'shared_module_update',
          UPDATE: 'update'
        },
        OnRestartRequiredReason: {
          APP_UPDATE: 'app_update',
          OS_UPDATE: 'os_update',
          PERIODIC: 'periodic'
        },
        PlatformArch: {
          ARM: 'arm',
          ARM64: 'arm64',
          MIPS: 'mips',
          MIPS64: 'mips64',
          X86_32: 'x86-32',
          X86_64: 'x86-64'
        },
        PlatformNaclArch: {
          ARM: 'arm',
          MIPS: 'mips',
          MIPS64: 'mips64',
          X86_32: 'x86-32',
          X86_64: 'x86-64'
        },
        PlatformOs: {
          ANDROID: 'android',
          CROS: 'cros',
          LINUX: 'linux',
          MAC: 'mac',
          OPENBSD: 'openbsd',
          WIN: 'win'
        },
        RequestUpdateCheckStatus: {
          NO_UPDATE: 'no_update',
          THROTTLED: 'throttled',
          UPDATE_AVAILABLE: 'update_available'
        }
      }
    };
    
    // 거짓 플러그인 생성
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ];
        // 플러그인 객체 생성
        const pluginArray = plugins.map(p => {
          const plugin = { name: p.name, filename: p.filename };
          plugin.__proto__ = Plugin.prototype;
          return plugin;
        });
        
        // PluginArray 프로토타입 적용
        pluginArray.__proto__ = PluginArray.prototype;
        return pluginArray;
      },
    });
    
    // 위치 정보 하드코딩 (한국 서울 근처)
    const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      success({
        coords: {
          accuracy: 20,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.5665, // 서울
          longitude: 126.9780,
          speed: null
        },
        timestamp: Date.now()
      });
    };
  });
  
  // 쿠키 및 로컬 스토리지 설정 (실제 브라우저로 보이도록)
  await page.evaluateOnNewDocument(() => {
    // 랜덤 로컬 스토리지 아이템 추가
    localStorage.setItem('random_item', Math.random().toString(36));
    localStorage.setItem('last_visit', Date.now().toString());
    localStorage.setItem('visit_count', Math.floor(Math.random() * 10 + 1).toString());
    
    // 쿠키 설정 함수 (직접 호출 X, 페이지 내에서 자동으로 호출되게 함)
    document.setCookie = function(name, value, days) {
      var expires = '';
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
      }
      document.cookie = name + '=' + (value || '') + expires + '; path=/';
    };
  });
  
  // 사용자 에이전트 설정
  // 최신 Chrome 버전으로 설정
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // 추가 헤더 설정
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Connection': 'keep-alive',
    'Referer': 'https://mydramalist.com/',
    'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not-A.Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  });
  
  return { browser, page };
}

/**
 * 리뷰 페이지 HTML 파싱 함수
 */
async function parseReviewsHtml(html, url) {
  try {
    console.log(`[스텔스 리뷰 크롤러] 리뷰 페이지 HTML 파싱 시작, HTML 크기: ${html.length} 바이트`);
    
    // HTML 파싱
    const $ = cheerio.load(html);
    console.log(`[스텔스 리뷰 크롤러] 페이지 제목: "${$('title').text()}"`);
    
    // HTML에서 'review'라는 단어가 몇 번 나오는지 확인 (디버깅 목적)
    const reviewCount = (html.match(/review/g) || []).length;
    console.log(`[스텔스 리뷰 크롤러] HTML에서 'review'라는 단어가 ${reviewCount}번 등장`);
    
    // HTML에서 'review'라는 단어가 몇 번 나오는지 확인 (디버깅 목적)
    const reviewSection = $('#content .box-header:contains("Reviews")').closest('.box');
    console.log(`[스텔스 리뷰 크롤러] Reviews 제목 섹션 존재 여부: ${reviewSection.length > 0 ? '예' : '아니오'}`);
    
    if (reviewSection.length > 0) {
      console.log(`[스텔스 리뷰 크롤러] Reviews 섹션 텍스트: ${reviewSection.find('.box-header').text().trim()}`);
      
      // Reviews 섹션 내 리뷰 요소 수 확인
      const postsInReviews = reviewSection.find('.post').length;
      const commentsInReviews = reviewSection.find('.comment:not(.reply)').length;
      console.log(`[스텔스 리뷰 크롤러] Reviews 섹션 내 post: ${postsInReviews}, comment: ${commentsInReviews}`);
    }
    
    // 페이지 구조 분석
    console.log('[스텔스 리뷰 크롤러] 페이지 구조 분석:');
    console.log(`- #content 요소: ${$('#content').length}`);
    console.log(`- .box 요소: ${$('.box').length}`);
    console.log(`- .review 요소: ${$('.review').length}`);
    console.log(`- [data-section="reviews"] 요소: ${$('[data-section="reviews"]').length}`);
    console.log(`- .user-reviews 요소: ${$('.user-reviews').length}`);
    console.log(`- .review-item 요소: ${$('.review-item').length}`);
    console.log(`- .post 요소: ${$('.post').length}`);
    console.log(`- .post-body 요소: ${$('.post-body').length}`);
    console.log(`- .comment 요소: ${$('.comment').length}`);
    
    // 모든 box 클래스의 헤더 제목 출력 (디버깅용)
    $('.box .box-header').each((i, el) => {
      console.log(`[스텔스 리뷰 크롤러] Box 헤더 #${i + 1}: ${$(el).text().trim()}`);
    });
    
    // 대체 리뷰 선택자 시도 (가장 많은 리뷰 요소를 찾는 선택자 사용)
    let selectedReviews = $('.review');
    let selectorUsed = '.review';
    
    // 대체 선택자 목록과 결과
    const selectors = [
      { selector: '.review', count: $('.review').length },
      { selector: '.box-body[data-section="reviews"] > div', count: $('.box-body[data-section="reviews"] > div').length },
      { selector: '.user-reviews .review-item', count: $('.user-reviews .review-item').length },
      { selector: '.user-reviews > div', count: $('.user-reviews > div').length },
      { selector: '#content .box .review', count: $('#content .box .review').length },
      { selector: '#reviewsSection .comment, #reviewsSection .review', count: $('#reviewsSection .comment, #reviewsSection .review').length },
      { selector: '[itemprop="review"]', count: $('[itemprop="review"]').length },
      // 새로운 선택자 추가
      { selector: '.post', count: $('.post').length },
      { selector: '.comment:not(.reply)', count: $('.comment:not(.reply)').length },
      { selector: '.box-body[data-section="reviews"] .post', count: $('.box-body[data-section="reviews"] .post').length },
      { selector: '.post-body', count: $('.post-body').length },
      { selector: '.box:contains("Reviews") .post', count: $('.box:contains("Reviews") .post').length },
      { selector: '.box:contains("Reviews") .comment', count: $('.box:contains("Reviews") .comment:not(.reply)').length },
      { selector: '.box-header:contains("Reviews") + .box-body .post', count: $('.box-header:contains("Reviews") + .box-body .post').length },
      { selector: '.box-header:contains("Reviews") ~ .box-body .post', count: $('.box-header:contains("Reviews") ~ .box-body .post').length },
      { selector: '.box-header:contains("Reviews") + .box-body .comment:not(.reply)', count: $('.box-header:contains("Reviews") + .box-body .comment:not(.reply)').length }
    ];
    
    // 가장 많은 리뷰 요소를 찾는 선택자 선택
    for (const item of selectors) {
      console.log(`- 선택자 ${item.selector}: ${item.count}개 요소 발견`);
      if (item.count > selectedReviews.length) {
        selectedReviews = $(item.selector);
        selectorUsed = item.selector;
      }
    }
    
    // "Reviews" 텍스트를 포함하는 모든 요소 찾기
    const reviewsTextElements = $(':contains("Reviews")').filter(function() {
      return $(this).children().length < 5 && $(this).text().includes('Reviews');
    });
    console.log(`[스텔스 리뷰 크롤러] 'Reviews' 텍스트 요소: ${reviewsTextElements.length}개 발견`);
    
    if (reviewsTextElements.length > 0) {
      console.log('[스텔스 리뷰 크롤러] 첫 번째 Reviews 섹션:');
      const reviewsSection = reviewsTextElements.first().closest('.box');
      
      // Reviews 섹션 내부 구조 분석
      const postElements = reviewsSection.find('.post').length;
      const commentElements = reviewsSection.find('.comment:not(.reply)').length;
      console.log(`[스텔스 리뷰 크롤러] Reviews 섹션 내 .post 요소: ${postElements}개, .comment 요소: ${commentElements}개`);
      
      // post 또는 comment 요소가 있으면 이를 선택자로 사용
      if (postElements > 0) {
        const newSelector = '.box:contains("Reviews") .post';
        selectedReviews = $(newSelector);
        selectorUsed = newSelector;
        console.log(`[스텔스 리뷰 크롤러] Reviews 섹션에서 발견된 post 요소로 선택자 변경: ${newSelector}, 개수: ${selectedReviews.length}`);
      } else if (commentElements > 0) {
        const newSelector = '.box:contains("Reviews") .comment:not(.reply)';
        selectedReviews = $(newSelector);
        selectorUsed = newSelector;
        console.log(`[스텔스 리뷰 크롤러] Reviews 섹션에서 발견된 comment 요소로 선택자 변경: ${newSelector}, 개수: ${selectedReviews.length}`);
      }
    }
    
    console.log(`[스텔스 리뷰 크롤러] 선택자 '${selectorUsed}'를 사용하여 ${selectedReviews.length}개 리뷰 요소 발견`);
    
    // 리뷰 목록을 저장할 배열
    const reviews = [];
    
    // 각 리뷰 요소 추출 (최대 10개로 제한)
    selectedReviews.slice(0, 10).each((index, element) => {
      try {
        console.log(`[스텔스 리뷰 크롤러] 리뷰 #${index + 1} 파싱 시작...`);
        
        // 리뷰 요소 타입 확인 및 클래스 로깅
        const elementClasses = $(element).attr('class') || '';
        console.log(`[스텔스 리뷰 크롤러] 리뷰 요소 클래스: ${elementClasses}`);
        
        // 리뷰 요소 구조 확인
        const hasRatingOverall = $(element).find('.rating-overall, [itemprop="ratingValue"], .score, .rated').length > 0;
        const hasReviewBody = $(element).find('.review-body, .review-bodyfull, .review-bodyfull-read, [itemprop="reviewBody"], .text, .post-body, .text-content').length > 0;
        console.log(`[스텔스 리뷰 크롤러] 리뷰 #${index + 1} 구조: rating-overall=${hasRatingOverall}, review-body=${hasReviewBody}`);
        
        // 리뷰 요소의 HTML 구조 로깅
        const elementHtml = $(element).html();
        const elementSample = elementHtml.length > 200 ? elementHtml.substring(0, 200) + '...' : elementHtml;
        console.log(`[스텔스 리뷰 크롤러] 리뷰 요소 HTML 샘플: ${elementSample.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`);
        
        // 리뷰 ID 추출
        const reviewId = $(element).attr('id')?.replace('review-', '') || 
                       $(element).attr('data-id') || 
                       `unknown-${index}-${Date.now()}`;
        console.log(`[스텔스 리뷰 크롤러] 리뷰 ID: ${reviewId}`);
        
        // 작성자 정보
        const userElement = $(element).find('a.text-primary[href^="/profile/"], a[href^="/profile/"], [itemprop="author"] a, a.user-display, .user-display, .post-header a[href^="/profile/"]').first();
        const username = userElement.text().trim() || 
                        $(element).find('[itemprop="author"], .user-display').text().trim() || 
                        "Unknown User";
        
        const userProfileUrl = userElement.attr('href') ? 
                             (userElement.attr('href').startsWith('http') ? 
                              userElement.attr('href') : 
                              'https://mydramalist.com' + userElement.attr('href')) : 
                             '';
        
        const userImage = $(element).find('.avatar img, img.avatar, img.user-avatar, [itemprop="image"]').attr('src') || '';
        
        console.log(`[스텔스 리뷰 크롤러] 사용자 정보: ${username}`);
        
        // 리뷰 상태 (Completed, Ongoing 등)
        const reviewStatus = $(element).find('.review-tag, .status').first().text().trim() || 'Completed';
        
        // 작성 시간
        const timeElement = $(element).find('.datetime, [itemprop="datePublished"], .date, time, .post-header small, .text-muted small').first();
        const timeText = timeElement.text().trim();
        let createdAt = new Date();
        
        if (timeText) {
          try {
            if (timeText.includes('hour')) {
              const hours = parseInt(timeText) || 0;
              createdAt = new Date(Date.now() - hours * 60 * 60 * 1000);
            } else if (timeText.includes('day')) {
              const days = parseInt(timeText) || 0;
              createdAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            } else if (timeText.includes('month')) {
              const months = parseInt(timeText) || 0;
              createdAt = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);
            } else if (timeText.includes('year')) {
              const years = parseInt(timeText) || 0;
              createdAt = new Date(Date.now() - years * 365 * 24 * 60 * 60 * 1000);
            } else {
              createdAt = new Date(timeText);
              if (isNaN(createdAt.getTime())) {
                createdAt = new Date();
              }
            }
          } catch (e) {
            createdAt = new Date();
          }
        }
        
        // 평점 정보 - Overall 평점 정확히 추출
        let overallRating = 0;
        
        // 다양한 방법으로 평점 추출 시도
        // 1. 데이터 속성에서 평점 추출 시도
        if ($(element).attr('data-rating')) {
          overallRating = parseFloat($(element).attr('data-rating')) || 0;
        }
        // 2. rating-overall 클래스에서 추출 시도 
        else {
          const ratingSelectors = [
            '.rating-overall .score', 
            '.score[itemprop="ratingValue"]', 
            '[class*="rating"] .score', 
            '.rated', 
            '.score', 
            '.rating span', 
            'span.rated'
          ];
          
          for (const selector of ratingSelectors) {
            const ratingElement = $(element).find(selector).first();
            if (ratingElement.length > 0) {
              const ratingText = ratingElement.text().trim();
              const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
              if (ratingMatch) {
                overallRating = parseFloat(ratingMatch[1]);
                console.log(`[스텔스 리뷰 크롤러] 평점 발견 (${selector}): ${overallRating}`);
                break;
              }
            }
          }
          
          // 평점을 찾지 못했다면, 숫자만 포함된 요소에서 추출 시도
          if (overallRating === 0) {
            const possibleRatingElements = $(element).find('span, div, strong').filter(function() {
              const text = $(this).text().trim();
              return /^\d+(\.\d+)?$/.test(text) && parseFloat(text) <= 10;
            });
            
            if (possibleRatingElements.length > 0) {
              overallRating = parseFloat(possibleRatingElements.first().text()) || 0;
              console.log(`[스텔스 리뷰 크롤러] 숫자만 포함된 요소에서 평점 발견: ${overallRating}`);
            }
          }
        }
        
        console.log(`[스텔스 리뷰 크롤러] Overall 평점: ${overallRating}`);
        
        // 리뷰 본문
        const reviewBodySelectors = [
          '.review-bodyfull-read', 
          '.review-body', 
          '.text', 
          '[itemprop="reviewBody"]', 
          '.comment-body',
          '.post-body',
          '.text-content'
        ];
        
        let reviewText = '';
        let reviewHtml = '';
        
        for (const selector of reviewBodySelectors) {
          const bodyElement = $(element).find(selector).first();
          if (bodyElement.length > 0) {
            // 불필요한 요소 제거
            bodyElement.find('.box, .user-stats, .review-helpful, .read-more, .button').remove();
            
            // HTML 및 텍스트 추출
            reviewHtml = bodyElement.html()?.trim() || '';
            reviewText = bodyElement.text()?.trim() || '';
            
            if (reviewText) {
              console.log(`[스텔스 리뷰 크롤러] 리뷰 본문 발견 (${selector}): ${reviewText.substring(0, 50)}...`);
              break;
            }
          }
        }
        
        // 리뷰 본문을 찾지 못한 경우, 전체 요소에서 추출 시도
        if (!reviewText) {
          const clonedElement = $(element).clone();
          clonedElement.find('.avatar, .user-stats, .rating-overall, .review-rating, .review-helpful, .review-tag, .datetime, .post-header, a').remove();
          reviewText = clonedElement.text().trim();
          reviewHtml = clonedElement.html()?.trim() || '';
          console.log(`[스텔스 리뷰 크롤러] 전체 요소에서 리뷰 본문 추출: ${reviewText.substring(0, 50)}...`);
        }
        
        console.log(`[스텔스 리뷰 크롤러] 리뷰 텍스트 길이: ${reviewText.length}자`);
        
        // 리뷰 제목 추출
        let reviewTitle = '';
        // 1. 명시적 제목 요소가 있는지 확인
        const titleElement = $(element).find('.review-title, h3, h4, [itemprop="headline"], .post-header h1, .post-header h2').first();
        if (titleElement.length > 0) {
          reviewTitle = titleElement.text().trim();
          console.log(`[스텔스 리뷰 크롤러] 리뷰 제목 발견: ${reviewTitle}`);
        } 
        // 2. 없으면 리뷰 내용에서 첫 줄을 제목으로 사용
        else if (reviewText.length > 0) {
          const firstLine = reviewText.split('\n')[0].trim();
          reviewTitle = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
          console.log(`[스텔스 리뷰 크롤러] 리뷰 첫 줄을 제목으로 사용: ${reviewTitle}`);
        } else {
          reviewTitle = `${username}의 리뷰`;
          console.log(`[스텔스 리뷰 크롤러] 기본 제목 사용: ${reviewTitle}`);
        }
        
        // 리뷰 객체 생성
        const reviewObj = {
          reviewId,
          username,
          userProfileUrl,
          userImage,
          status: reviewStatus,
          watchedEpisodes: 0,
          totalEpisodes: 0,
          createdAt,
          rating: overallRating,
          storyRating: 0,
          actingRating: 0,
          musicRating: 0,
          rewatchRating: 0,
          title: reviewTitle,
          reviewText,
          reviewHtml,
          helpfulCount: 0,
          commentCount: 0,
          reviewUrl: '',
          sourceUrl: url,
          crawledAt: new Date()
        };
        
        // 리뷰 배열에 추가
        reviews.push(reviewObj);
        
        console.log(`[스텔스 리뷰 크롤러] 리뷰 #${index + 1} 추출 완료: ${username}, 평점: ${overallRating}, 길이: ${reviewText.length}자`);
      } catch (reviewError) {
        console.error(`[스텔스 리뷰 크롤러] 리뷰 #${index + 1} 파싱 중 오류:`, reviewError);
      }
    });
    
    // HTML에서 직접 sample 추출하여 디버깅 (첫 번째 리뷰 요소)
    if (html.includes('review') && reviews.length === 0) {
      console.log('[스텔스 리뷰 크롤러] 리뷰 없음 - 페이지 패턴 분석:');
      
      // 대표적인 패턴 검색
      const patterns = [
        { name: 'review 클래스', regex: /class=["']review["']/g },
        { name: 'review-body 클래스', regex: /class=["']review-body["']/g },
        { name: 'rating-overall 클래스', regex: /class=["']rating-overall["']/g },
        { name: 'ratingValue 항목', regex: /itemprop=["']ratingValue["']/g },
        { name: 'reviewBody 항목', regex: /itemprop=["']reviewBody["']/g },
        { name: 'author 항목', regex: /itemprop=["']author["']/g },
        { name: 'datePublished 항목', regex: /itemprop=["']datePublished["']/g },
        { name: 'data-rating 속성', regex: /data-rating=["']\d+(\.\d+)?["']/g },
        { name: 'data-section="reviews"', regex: /data-section=["']reviews["']/g }
      ];
      
      patterns.forEach(pattern => {
        const matches = (html.match(pattern.regex) || []).length;
        console.log(`- ${pattern.name}: ${matches}개 발견`);
      });
      
      // 샘플 HTML 구조 추출 (첫 번째 리뷰 영역 주변)
      const reviewSample = html.indexOf('review') > -1 ? 
        html.substring(Math.max(0, html.indexOf('review') - 100), 
                      Math.min(html.length, html.indexOf('review') + 500)) : '';
      
      if (reviewSample) {
        console.log('[스텔스 리뷰 크롤러] 리뷰 관련 HTML 샘플:');
        console.log(reviewSample.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      }
    }
    
    console.log(`[스텔스 리뷰 크롤러] 리뷰 페이지 파싱 완료: ${reviews.length}개 리뷰 추출 (최대 10개)`);
    return reviews;
    
  } catch (error) {
    console.error('[스텔스 리뷰 크롤러] 리뷰 페이지 파싱 중 오류:', error);
    return [];
  }
} 