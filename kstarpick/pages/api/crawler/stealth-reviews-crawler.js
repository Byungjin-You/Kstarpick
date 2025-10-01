import { getSession } from 'next-auth/react';
import * as cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';

// Puppeteer Extra 및 스텔스 플러그인 
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 스텔스 플러그인 추가
puppeteer.use(StealthPlugin());

// 설정
const DEBUG_MODE = true; // 항상 디버그 모드 활성화

// 비동기 대기 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 랜덤 지연시간 생성 (봇 탐지 회피용)
const randomDelay = () => {
  const delay = Math.floor(Math.random() * 1500) + 500;
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * 스텔스 리뷰 크롤러 API
 */
export default async function handler(req, res) {
  // API 요청 시작 로그
  console.log('================ 향상된 스텔스 리뷰 크롤러 API 요청 시작 ================');
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
    console.log('[향상된 스텔스 크롤러] 권한 체크 생략됨 (DEBUG_MODE)');

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
      console.log(`[향상된 스텔스 크롤러] URL 조정됨: ${targetUrl}`);
    }

    console.log(`[향상된 스텔스 크롤러] ${targetUrl} 크롤링 시작`);

    // 향상된 스텔스 브라우저 시작
    console.log('[향상된 스텔스 크롤러] 브라우저 설정 시작');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });

    // 새 페이지 열기
    const page = await browser.newPage();
    console.log('[향상된 스텔스 크롤러] 브라우저 페이지 생성됨');
    
    // 사용자 에이전트 설정
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 추가 헤더 설정
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    });
    
    // 요청 가로채기 설정 (불필요한 리소스 차단)
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      
      if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
        // 이미지, 폰트, 미디어, 스타일시트 차단
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // 콘솔 로그 캡처
    page.on('console', (msg) => console.log('[브라우저 콘솔]', msg.text()));

    // 페이지 로딩
    console.log(`[향상된 스텔스 크롤러] 페이지 로딩 중... (${targetUrl})`);
    try {
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded', // 더 빠른 이벤트로 변경
        timeout: 60000 // 60초 타임아웃
      });
      
      // 추가 대기 - 페이지 또는 주요 요소가 로딩될 때까지 대기
      await page.waitForFunction(() => {
        return document.readyState === 'complete' || 
               document.querySelectorAll('.box, .post, .comment, #content').length > 0;
      }, { timeout: 30000 });
      
      console.log('[향상된 스텔스 크롤러] 페이지 초기 로딩 완료');
    } catch (navigationError) {
      console.error('[향상된 스텔스 크롤러] 페이지 로딩 중 오류:', navigationError.message);
      console.log('[향상된 스텔스 크롤러] 계속 진행 시도...');
    }

    // 무작위 대기 시간
    await sleep(Math.floor(Math.random() * 2000) + 1000);

    // 인간과 같은 스크롤 동작
    console.log('[향상된 스텔스 크롤러] 인간과 유사한 스크롤링 시작...');
    await page.evaluate(async () => {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const viewportHeight = window.innerHeight;
      let currentPosition = 0;
      
      // 페이지를 나누어 스크롤
      while (currentPosition < scrollHeight) {
        // 조금씩 스크롤
        const scrollStep = Math.floor(Math.random() * 300) + 100;
        currentPosition += scrollStep;
        window.scrollTo(0, currentPosition);
        
        // 잠시 대기
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 300) + 100));
        
        // 가끔 잠시 멈춤
        if (Math.random() > 0.7) {
          await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 500));
        }
      }
      
      // 리뷰 섹션 찾기 시도
      const reviewsHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, .box-header'))
        .filter(el => el.textContent.includes('Reviews'));
      
      if (reviewsHeaders.length > 0) {
        reviewsHeaders[0].scrollIntoView({ behavior: 'smooth' });
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // 페이지 맨 위로 다시 스크롤
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 500));
      
      // 중간으로 이동
      window.scrollTo(0, scrollHeight / 2);
    });
    
    console.log('[향상된 스텔스 크롤러] 스크롤링 완료');
    
    // "더 보기" 버튼 등을 클릭하여 더 많은 리뷰 로드 시도 (새로 추가)
    console.log('[향상된 스텔스 크롤러] 추가 리뷰 로드 시도 중...');
    try {
      // "더 보기" 버튼 찾기 시도 (다양한 선택자 사용)
      const loadMoreSelectors = [
        '.load-more',
        '.more-reviews',
        '.show-more',
        'button:contains("Show More")',
        'a:contains("Show More")',
        'button:contains("Load More")',
        'a:contains("Load More")',
        '.reviews-pagination .next',
        '.pagination .next'
      ];
      
      // 각 선택자로 버튼 찾기 시도
      for (const selector of loadMoreSelectors) {
        // 이 선택자에 해당하는 요소가 있는지 확인
        const hasLoadMoreButton = await page.evaluate((sel) => {
          const elements = Array.from(document.querySelectorAll(sel));
          const visibleElements = elements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
          });
          return visibleElements.length > 0;
        }, selector);
        
        if (hasLoadMoreButton) {
          console.log(`[향상된 스텔스 크롤러] 더 보기 버튼 발견: "${selector}"`);
          
          // 버튼 클릭 (최대 3번)
          for (let i = 0; i < 3; i++) {
            try {
              // 스크롤하여 버튼 보이게 하기
              await page.evaluate((sel) => {
                const button = document.querySelector(sel);
                if (button) {
                  button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, selector);
              
              // 잠시 대기
              await sleep(1000);
              
              // 버튼 클릭
              await page.click(selector);
              console.log(`[향상된 스텔스 크롤러] 더 보기 버튼 클릭 ${i+1}회`);
              
              // AJAX 로딩 대기
              await sleep(3000);
              
              // 더 이상 버튼이 없는지 확인
              const buttonStillExists = await page.evaluate((sel) => {
                const button = document.querySelector(sel);
                return button && button.offsetParent !== null;
              }, selector);
              
              if (!buttonStillExists) {
                console.log('[향상된 스텔스 크롤러] 더 이상 버튼이 없음, 로딩 완료');
                break;
              }
            } catch (clickError) {
              console.log(`[향상된 스텔스 크롤러] 버튼 클릭 오류: ${clickError.message}`);
              break;
            }
          }
          
          // 하나의 선택자로 성공했으면 반복 중단
          break;
        }
      }
      
      // 페이지 내 모든 AJAX 로드가 완료될 때까지 대기
      console.log('[향상된 스텔스 크롤러] 페이지 완전 로드 대기 중...');
      await page.waitForFunction(() => {
        return !document.querySelector('.loading, .spinner, .loading-indicator');
      }, { timeout: 5000 }).catch(() => console.log('[향상된 스텔스 크롤러] 로딩 인디케이터가 없거나 계속 표시됨'));
      
      // 리뷰가 로드될 수 있도록 추가 대기
      await sleep(3000);
      
    } catch (interactionError) {
      console.error('[향상된 스텔스 크롤러] 추가 리뷰 로드 중 오류:', interactionError.message);
    }
    
    // 최종 리뷰 요소 수 확인
    const reviewStats = await page.evaluate(() => {
      return {
        posts: document.querySelectorAll('.post').length,
        comments: document.querySelectorAll('.comment:not(.reply)').length,
        reviews: document.querySelectorAll('.review').length,
        reviewContainers: document.querySelectorAll('.review-container, .review-item').length
      };
    });
    
    console.log('[향상된 스텔스 크롤러] 최종 페이지 리뷰 요소 통계:', reviewStats);
    
    // 리뷰 영역 찾기 시도
    const hasReviews = await page.evaluate(() => {
      const reviewsHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, .box-header'))
        .filter(el => el.textContent.includes('Reviews'));
      
      // 리뷰 섹션 존재 여부
      if (reviewsHeaders.length > 0) {
        // 리뷰 섹션으로 이동
        reviewsHeaders[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      
      return false;
    });
    
    // 리뷰 영역 찾음 여부 로그
    console.log(`[향상된 스텔스 크롤러] 리뷰 섹션 발견: ${hasReviews ? '예' : '아니오'}`);
    
    // 페이지 구조 분석
    const pageStructure = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        // 페이지 내 모든 헤더 텍스트
        headers: Array.from(document.querySelectorAll('h1, h2, h3, h4, .box-header')).map(el => el.textContent.trim()),
        // 리뷰 관련 요소 수
        counts: {
          reviews: document.querySelectorAll('.review').length,
          posts: document.querySelectorAll('.post').length,
          comments: document.querySelectorAll('.comment:not(.reply)').length,
          boxes: document.querySelectorAll('.box').length
        }
      };
    });
    
    console.log('[향상된 스텔스 크롤러] 페이지 구조:', JSON.stringify(pageStructure, null, 2));
    
    // 스크린샷 촬영 (디버깅용)
    try {
      await page.screenshot({ path: '/tmp/stealth-reviews.png', fullPage: true });
      console.log('[향상된 스텔스 크롤러] 스크린샷 저장됨: /tmp/stealth-reviews.png');
    } catch (screenshotError) {
      console.error('[향상된 스텔스 크롤러] 스크린샷 저장 오류:', screenshotError.message);
    }
    
    // 잠시 대기
    await sleep(2000);
    
    // HTML 추출
    const html = await page.content();
    console.log(`[향상된 스텔스 크롤러] HTML 추출 완료, 크기: ${html.length} 바이트`);
    
    // 브라우저에서 직접 리뷰 내용 추출 - 더 정확한 추출을 위해
    const browserExtractedReviews = await page.evaluate(() => {
      const reviews = [];
      
      // 다양한 리뷰 요소 선택자 시도
      const selectors = [
        '.post',
        '.comment:not(.reply)',
        '.review',
        '.box .review-container',
        '.review-item',
        '.member-review'
      ];
      
      // 가장 많은 요소를 찾는 선택자 사용
      let selectedElements = [];
      let usedSelector = '';
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > selectedElements.length) {
          selectedElements = Array.from(elements);
          usedSelector = selector;
        }
      }
      
      console.log(`브라우저에서 선택자 '${usedSelector}'를 사용하여 ${selectedElements.length}개 리뷰 요소 발견`);
      
      // 최대 10개 리뷰만 처리
      const reviewElements = selectedElements.slice(0, 10);
      
      for (let i = 0; i < reviewElements.length; i++) {
        const element = reviewElements[i];
        
        try {
          // 사용자 정보
          const userElement = element.querySelector('a[href^="/profile/"], .user-display, .text-primary');
          const username = userElement ? userElement.textContent.trim() : 'Unknown User';
          const userProfileUrl = userElement && userElement.href ? userElement.href : '';
          
          // 사용자 이미지
          const userImageElement = element.querySelector('img.avatar, .avatar img');
          const userImage = userImageElement ? userImageElement.src : '';
          
          // 평점 추출
          let rating = 0;
          const ratingSelectors = [
            '.rating-overall .score', '.score', '.rated', '[itemprop="ratingValue"]',
            'span.score', 'div.score', '.overall'
          ];
          
          for (const selector of ratingSelectors) {
            const ratingElement = element.querySelector(selector);
            if (ratingElement) {
              const ratingText = ratingElement.textContent.trim();
              const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
              if (ratingMatch) {
                rating = parseFloat(ratingMatch[1]);
                break;
              }
            }
          }
          
          // 리뷰 본문 - 개선된 추출 로직
          let reviewText = '';
          let reviewHtml = '';
          
          // 1. 일반적인 본문 선택자 시도 - 더 많은 선택자 추가
          const bodySelectors = [
            '.review-body', '.review-bodyfull', '.review-bodyfull-read', '.text', '.post-body',
            '.comment-body', '[itemprop="reviewBody"]', '.text-content',
            '.review-content', '.post-content', '.review-text',
            'p.text',  // 추가 선택자
            '.box-body p',  // 추가 선택자
            '.user-content',  // 추가 선택자
            '.content'   // 추가 선택자
          ];
          
          for (const selector of bodySelectors) {
            const bodyElement = element.querySelector(selector);
            if (bodyElement) {
              // 불필요한 요소 제거
              const clonedBody = bodyElement.cloneNode(true);
              
              // 불필요한 요소 제거 시도
              ['box', 'user-stats', 'review-helpful', 'review-tag', 'rating-overall', 'spoiler-warning', 'hidden-spoiler'].forEach(className => {
                const elementsToRemove = clonedBody.querySelectorAll(`.${className}`);
                elementsToRemove.forEach(el => {
                  if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                  }
                });
              });
              
              // HTML 및 텍스트 추출
              reviewHtml = clonedBody.innerHTML?.trim() || '';
              reviewText = clonedBody.textContent.trim();
              
              if (reviewText) {
                console.log(`[향상된 스텔스 크롤러] 본문 발견 (${selector}): ${reviewText.length}자`);
                break;
              }
            }
          }
          
          // 1.5 여러 p 태그에 분산된 리뷰 내용 확인 (새로 추가)
          if (!reviewText) {
            const paragraphs = element.querySelectorAll('p');
            if (paragraphs.length > 1) {
              // p 태그가 여러 개 있고 텍스트가 포함되어 있다면 이를 합쳐서 사용
              const textContents = [];
              paragraphs.forEach(p => {
                const pText = p.textContent.trim();
                if (pText.length > 10) { // 간단한 필터링
                  textContents.push(pText);
                }
              });
              
              if (textContents.length > 0) {
                reviewText = textContents.join('\n\n');
                reviewHtml = '<p>' + textContents.join('</p><p>') + '</p>';
                console.log(`[향상된 스텔스 크롤러] 여러 p 태그에서 리뷰 본문 추출: ${reviewText.substring(0, 50)}...`);
              }
            }
          }
          
          // 2. 본문을 찾지 못했다면 더 넓은 요소에서 추출 시도
          if (!reviewText) {
            // 헤더, 평점, 메타데이터 등의 요소를 제외한 복제본 생성
            const clonedElement = element.cloneNode(true);
            
            // 불필요한 요소 제거
            ['avatar', 'user-display', 'rating-overall', 'review-rating', 'review-helpful', 
             'review-tag', 'datetime', 'post-header', 'user-stats', 'spoiler-warning', 
             'hidden-spoiler'].forEach(className => {
              const elementsToRemove = clonedElement.querySelectorAll(`.${className}`);
              elementsToRemove.forEach(el => {
                if (el && el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              });
            });
            
            // 더 구체적인 메타데이터 요소 제거 시도
            ['rating', 'score', 'header', 'title'].forEach(partialClass => {
              const elementsToRemove = clonedElement.querySelectorAll(`[class*="${partialClass}"]`);
              elementsToRemove.forEach(el => {
                if (el && el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              });
            });
            
            reviewText = clonedElement.textContent.trim();
            reviewHtml = clonedElement.innerHTML?.trim() || '';
            
            // 리뷰 내용에서 괄호로 둘러싸인 숫자 형태의 평점 제거 (예: "(8.5)")
            reviewText = reviewText.replace(/\(\d+(\.\d+)?\)/g, '').trim();
            
            console.log(`[향상된 스텔스 크롤러] 대체 본문 추출: ${reviewText.length}자`);
          }
          
          // 3. 내용물이 여전히 없다면 전체 요소에서 불필요 텍스트만 제거하여 추출
          if (!reviewText || reviewText.length < 10) {
            const wholeTitleRemoved = element.cloneNode(true);
            
            // h3, h4, review-title, post-header 제거
            ['h3', 'h4', '.review-title', '.post-header'].forEach(selector => {
              const elementsToRemove = wholeTitleRemoved.querySelectorAll(selector);
              elementsToRemove.forEach(el => {
                if (el && el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              });
            });
            
            // 사용자 이름 및 "Main Role", "Support Role" 같은 텍스트 제거
            const fullText = wholeTitleRemoved.textContent.trim();
            reviewText = fullText
              .replace(new RegExp(username, 'g'), '')
              .replace(/Main Role|Support Role|Completed|Watching|\d+\/\d+/g, '')
              .replace(/Overall:|Story:|Acting:|Music:|Rewatch:/gi, '')  // 평점 레이블 제거
              .replace(/\d+(\.\d+)?\/10/g, '')  // X/10 형태의 평점 제거
              .replace(/\s{2,}/g, ' ') // 연속된 공백 제거
              .trim();
            
            console.log(`[향상된 스텔스 크롤러] 마지막 방법 본문 추출: ${reviewText.length}자`);
          }
          
          // 4. 텍스트 후처리 - 평점 정보가 본문에 포함된 경우 이를 제거 (새로 추가)
          if (reviewText && reviewText.length > 0) {
            // 평점 정보 패턴 제거
            reviewText = reviewText
              .replace(/(?:Overall|Story|Acting|Cast|Music|Rewatch)(?:\s*(?::|Value|Rating))?\s*\d+(?:\.\d+)?(?:\/\d+)?/gi, '')
              .replace(/(?:Rating|Score):\s*\d+(?:\.\d+)?(?:\/\d+)?/gi, '')
              .replace(/\(\d+(?:\.\d+)?\/\d+\)/g, '')
              .replace(/\s{2,}/g, ' ')
              .trim();
              
              // 제거 후 HTML 재생성
              if (reviewText.length > 0) {
                const paragraphs = reviewText.split(/\n{2,}/);
                if (paragraphs.length > 1) {
                  reviewHtml = '<p>' + paragraphs.join('</p><p>') + '</p>';
                } else {
                  reviewHtml = `<p>${reviewText}</p>`;
                }
              }
          }
          
          // 리뷰 제목 추출
          let title = '';
          const titleSelectors = ['.review-title', 'h3', 'h4', '.post-header h2'];
          
          for (const selector of titleSelectors) {
            const titleElement = element.querySelector(selector);
            if (titleElement) {
              title = titleElement.textContent.trim();
              if (title) break;
            }
          }
          
          // 제목이 없으면 본문에서 생성
          if (!title && reviewText) {
            const firstLine = reviewText.split('\n')[0].trim();
            title = firstLine.length > 50 ? `${firstLine.substring(0, 50)}...` : firstLine;
          } else if (!title) {
            title = `${username}의 리뷰`;
            console.log(`[향상된 스텔스 크롤러] 기본 제목 사용: ${title}`);
          }
          
          // 리뷰 객체 생성
          reviews.push({
            reviewId: `browser-${i}-${Date.now()}`,
            username,
            userProfileUrl,
            userImage,
            rating,
            title,
            reviewText,
            reviewHtml,
            extractMethod: 'browser'
          });
        } catch (error) {
          console.error(`브라우저에서 리뷰 #${i + 1} 파싱 중 오류: ${error.message}`);
        }
      }
      
      return reviews;
    });
    
    console.log(`[향상된 스텔스 크롤러] 브라우저에서 직접 추출한 리뷰: ${browserExtractedReviews.length}개`);
    
    // HTML 파싱 및 리뷰 추출 (기존 방식)
    const cheerioReviews = await parseReviewsHtml(html, targetUrl);
    console.log(`[향상된 스텔스 크롤러] Cheerio로 추출한 리뷰: ${cheerioReviews.length}개`);
    
    // 두 가지 방식으로 추출한 리뷰 병합 및 중복 제거
    const mergedReviews = mergeReviews(browserExtractedReviews, cheerioReviews);
    console.log(`[향상된 스텔스 크롤러] 최종 병합된 리뷰: ${mergedReviews.length}개`);
    
    // 리뷰 저장
    if (mergedReviews.length > 0) {
      await saveReviewsToDb(mergedReviews, dramaId);
      console.log(`[향상된 스텔스 크롤러] ${mergedReviews.length}개 리뷰 저장 완료`);
    }
    
    // 브라우저 닫기
    await browser.close();
    console.log('[향상된 스텔스 크롤러] 브라우저 종료됨');
    
    return res.status(200).json({
      success: true,
      message: `${mergedReviews.length}개의 리뷰를 크롤링했습니다.`,
      data: {
        reviews: mergedReviews.map(r => ({
          reviewId: r.reviewId,
          username: r.username,
          rating: r.rating,
          title: r.title
        }))
      }
    });
  } catch (error) {
    console.error('[향상된 스텔스 크롤러] 오류 발생:', error);
    return res.status(500).json({
      success: false,
      message: '크롤링 중 오류가 발생했습니다.',
      error: error.message,
      stack: DEBUG_MODE ? error.stack : undefined
    });
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
      console.log('[향상된 스텔스 크롤러] 브라우저 자원 정리 완료');
    }
    console.log('================ 향상된 스텔스 리뷰 크롤러 API 요청 종료 ================');
  }
}

/**
 * 리뷰 페이지 HTML 파싱 함수
 */
async function parseReviewsHtml(html, url) {
  try {
    console.log(`[향상된 스텔스 크롤러] HTML 파싱 시작...`);
    
    // Cheerio로 HTML 파싱
    const $ = cheerio.load(html);
    
    // "Reviews" 제목을 포함하는 박스 찾기
    const reviewsBox = $('.box-header').filter(function() {
      return $(this).text().includes('Reviews');
    }).closest('.box');
    
    // 리뷰 요소 선택자 목록
    const selectors = [
      { name: 'posts', selector: '.post', elements: $('.post') },
      { name: 'comments', selector: '.comment:not(.reply)', elements: $('.comment:not(.reply)') },
      { name: 'reviews', selector: '.review', elements: $('.review') }
    ];
    
    // Reviews 박스가 있다면 해당 박스 내 요소 추가
    if (reviewsBox.length > 0) {
      selectors.push(
        { name: 'reviewBoxPosts', selector: 'reviewsBox .post', elements: reviewsBox.find('.post') },
        { name: 'reviewBoxComments', selector: 'reviewsBox .comment:not(.reply)', elements: reviewsBox.find('.comment:not(.reply)') }
      );
    }
    
    // 선택자별 결과 로깅
    selectors.forEach(item => {
      console.log(`[향상된 스텔스 크롤러] '${item.name}' 선택자: ${item.elements.length}개 발견`);
    });
    
    // 가장 많은 요소를 가진 선택자 선택
    let selectedReviews = $();
    let selectorUsed = '';
    
    for (const item of selectors) {
      if (item.elements.length > selectedReviews.length) {
        selectedReviews = $(item.selector);
        selectorUsed = item.selector;
      }
    }
    
    console.log(`[향상된 스텔스 크롤러] 최적 선택자: '${selectorUsed}'를 사용하여 ${selectedReviews.length}개 리뷰 요소 발견`);
    
    // 선택된 요소가 없으면 빈 배열 반환
    if (selectedReviews.length === 0) {
      console.log('[향상된 스텔스 크롤러] 리뷰 요소를 발견하지 못함');
      return [];
    }
    
    // 최대 10개 리뷰만 처리
    const reviewElements = selectedReviews.slice(0, 10);
    const reviews = [];
    
    // 각 리뷰 요소 파싱
    reviewElements.each((index, element) => {
      try {
        const $el = $(element);
        console.log(`[향상된 스텔스 크롤러] 리뷰 #${index + 1} 파싱 시작...`);
        
        // 리뷰 요소 클래스 정보 로깅
        const elementClasses = $el.attr('class') || '';
        console.log(`[향상된 스텔스 크롤러] 리뷰 요소 클래스: ${elementClasses}`);
        
        // 리뷰 ID
        const reviewId = $el.attr('id') || `stealth-${index}-${Date.now()}`;
        console.log(`[향상된 스텔스 크롤러] 리뷰 ID: ${reviewId}`);
        
        // 사용자 정보
        const userElement = $el.find('a[href^="/profile/"], .user-display, .post-header a, .text-primary').first();
        const username = userElement.text().trim() || 'Unknown User';
        const userProfileUrl = userElement.attr('href') 
          ? (userElement.attr('href').startsWith('http') 
              ? userElement.attr('href') 
              : `https://mydramalist.com${userElement.attr('href')}`)
          : '';
        
        console.log(`[향상된 스텔스 크롤러] 사용자: ${username}`);
        
        // 사용자 이미지
        const userImage = $el.find('img.avatar, .avatar img').attr('src') || '';
        
        // 평점 정보
        let rating = 0;
        
        // 다양한 평점 요소 선택자 시도
        const ratingSelectors = [
          '.rating-overall .score', '.score', '.rated', '[itemprop="ratingValue"]',
          'span.score', 'div.score', '.overall'
        ];
        
        for (const selector of ratingSelectors) {
          const ratingElement = $el.find(selector).first();
          if (ratingElement.length > 0) {
            const ratingText = ratingElement.text().trim();
            const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
            if (ratingMatch) {
              rating = parseFloat(ratingMatch[1]);
              console.log(`[향상된 스텔스 크롤러] 평점 발견 (${selector}): ${rating}`);
              break;
            }
          }
        }
        
        // 리뷰 본문 - 개선된 추출 로직
        let reviewText = '';
        let reviewHtml = '';
        
        // 1. 일반적인 본문 선택자 시도 - 더 많은 선택자 추가
        const bodySelectors = [
          '.review-body', '.review-bodyfull', '.review-bodyfull-read', '.text', '.post-body',
          '.comment-body', '[itemprop="reviewBody"]', '.text-content',
          '.review-content', '.post-content', '.review-text',
          'p.text',  // 추가 선택자
          '.box-body p',  // 추가 선택자
          '.user-content',  // 추가 선택자
          '.content'   // 추가 선택자
        ];
        
        for (const selector of bodySelectors) {
          const bodyElement = $el.find(selector).first();
          if (bodyElement.length > 0) {
            // 불필요한 요소 제거
            const clonedBody = bodyElement.cloneNode(true);
            
            // 불필요한 요소 제거 시도
            ['box', 'user-stats', 'review-helpful', 'review-tag', 'rating-overall', 'spoiler-warning', 'hidden-spoiler'].forEach(className => {
              const elementsToRemove = clonedBody.querySelectorAll(`.${className}`);
              elementsToRemove.forEach(el => {
                if (el && el.parentNode) {
                  el.parentNode.removeChild(el);
                }
              });
            });
            
            // HTML 및 텍스트 추출
            reviewHtml = clonedBody.innerHTML?.trim() || '';
            reviewText = clonedBody.textContent.trim();
            
            if (reviewText) {
              console.log(`[향상된 스텔스 크롤러] 본문 발견 (${selector}): ${reviewText.length}자`);
              break;
            }
          }
        }
        
        // 1.5 여러 p 태그에 분산된 리뷰 내용 확인 (새로 추가)
        if (!reviewText) {
          const paragraphs = $el.find('p');
          if (paragraphs.length > 1) {
            // p 태그가 여러 개 있고 텍스트가 포함되어 있다면 이를 합쳐서 사용
            const textContents = [];
            paragraphs.each((i, p) => {
              const pText = $(p).text().trim();
              if (pText.length > 10) { // 간단한 필터링
                textContents.push(pText);
              }
            });
            
            if (textContents.length > 0) {
              reviewText = textContents.join('\n\n');
              reviewHtml = '<p>' + textContents.join('</p><p>') + '</p>';
              console.log(`[향상된 스텔스 크롤러] 여러 p 태그에서 리뷰 본문 추출: ${reviewText.substring(0, 50)}...`);
            }
          }
        }
        
        // 2. 본문을 찾지 못했다면 더 넓은 요소에서 추출 시도
        if (!reviewText) {
          // 헤더, 평점, 메타데이터 등의 요소를 제외한 복제본 생성
          const clonedElement = $el.cloneNode(true);
          
          // 불필요한 요소 제거
          ['avatar', 'user-display', 'rating-overall', 'review-rating', 'review-helpful', 
           'review-tag', 'datetime', 'post-header', 'user-stats', 'spoiler-warning', 
           'hidden-spoiler'].forEach(className => {
            const elementsToRemove = clonedElement.querySelectorAll(`.${className}`);
            elementsToRemove.forEach(el => {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el);
              }
            });
          });
          
          // 더 구체적인 메타데이터 요소 제거 시도
          ['rating', 'score', 'header', 'title'].forEach(partialClass => {
            const elementsToRemove = clonedElement.querySelectorAll(`[class*="${partialClass}"]`);
            elementsToRemove.forEach(el => {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el);
              }
            });
          });
          
          reviewText = clonedElement.textContent.trim();
          reviewHtml = clonedElement.innerHTML?.trim() || '';
          
          // 리뷰 내용에서 괄호로 둘러싸인 숫자 형태의 평점 제거 (예: "(8.5)")
          reviewText = reviewText.replace(/\(\d+(\.\d+)?\)/g, '').trim();
          
          console.log(`[향상된 스텔스 크롤러] 대체 본문 추출: ${reviewText.length}자`);
        }
        
        // 3. 내용물이 여전히 없다면 전체 요소에서 불필요 텍스트만 제거하여 추출
        if (!reviewText || reviewText.length < 10) {
          const wholeTitleRemoved = $el.cloneNode(true);
          
          // h3, h4, review-title, post-header 제거
          ['h3', 'h4', '.review-title', '.post-header'].forEach(selector => {
            const elementsToRemove = wholeTitleRemoved.querySelectorAll(selector);
            elementsToRemove.forEach(el => {
              if (el && el.parentNode) {
                el.parentNode.removeChild(el);
              }
            });
          });
          
          // 사용자 이름 및 "Main Role", "Support Role" 같은 텍스트 제거
          const fullText = wholeTitleRemoved.textContent.trim();
          reviewText = fullText
            .replace(new RegExp(username, 'g'), '')
            .replace(/Main Role|Support Role|Completed|Watching|\d+\/\d+/g, '')
            .replace(/Overall:|Story:|Acting:|Music:|Rewatch:/gi, '')  // 평점 레이블 제거
            .replace(/\d+(\.\d+)?\/10/g, '')  // X/10 형태의 평점 제거
            .replace(/\s{2,}/g, ' ') // 연속된 공백 제거
            .trim();
          
          console.log(`[향상된 스텔스 크롤러] 마지막 방법 본문 추출: ${reviewText.length}자`);
        }
        
        // 4. 텍스트 후처리 - 평점 정보가 본문에 포함된 경우 이를 제거 (새로 추가)
        if (reviewText && reviewText.length > 0) {
          // 평점 정보 패턴 제거
          reviewText = reviewText
            .replace(/(?:Overall|Story|Acting|Cast|Music|Rewatch)(?:\s*(?::|Value|Rating))?\s*\d+(?:\.\d+)?(?:\/\d+)?/gi, '')
            .replace(/(?:Rating|Score):\s*\d+(?:\.\d+)?(?:\/\d+)?/gi, '')
            .replace(/\(\d+(?:\.\d+)?\/\d+\)/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
            
            // 제거 후 HTML 재생성
            if (reviewText.length > 0) {
              const paragraphs = reviewText.split(/\n{2,}/);
              if (paragraphs.length > 1) {
                reviewHtml = '<p>' + paragraphs.join('</p><p>') + '</p>';
              } else {
                reviewHtml = `<p>${reviewText}</p>`;
              }
            }
        }
        
        // 리뷰 내용 확인
        if (reviewText) {
          console.log(`[향상된 스텔스 크롤러] 최종 리뷰 본문 길이: ${reviewText.length}자`);
        } else {
          console.log(`[향상된 스텔스 크롤러] 리뷰 본문을 추출하지 못함`);
          reviewText = "내용 없음";
        }
        
        // 리뷰 제목 추출
        let title = $el.find('.review-title, h3, h4, .post-header h2').first().text().trim();
        
        // 제목이 없으면 본문의 첫 줄을 제목으로 사용
        if (!title && reviewText) {
          const firstLine = reviewText.split('\n')[0].trim();
          title = firstLine.length > 50 ? `${firstLine.substring(0, 50)}...` : firstLine;
          console.log(`[향상된 스텔스 크롤러] 본문 첫 줄을 제목으로 사용: ${title}`);
        } else if (!title) {
          title = `${username}의 리뷰`;
          console.log(`[향상된 스텔스 크롤러] 기본 제목 사용: ${title}`);
        }
        
        // 리뷰 객체 생성
        reviews.push({
          reviewId,
          username,
          userProfileUrl,
          userImage,
          status: 'Completed',
          watchedEpisodes: 0,
          totalEpisodes: 0,
          createdAt: new Date(),
          rating,
          storyRating: 0,
          actingRating: 0,
          musicRating: 0,
          rewatchRating: 0,
          title,
          reviewText,
          reviewHtml,
          helpfulCount: 0,
          commentCount: 0,
          reviewUrl: '',
          sourceUrl: url,
          crawledAt: new Date()
        });
        
        console.log(`[향상된 스텔스 크롤러] 리뷰 #${index + 1} 파싱 완료: ${username}, 평점: ${rating}, 길이: ${reviewText.length}자`);
      } catch (error) {
        console.error(`[향상된 스텔스 크롤러] 리뷰 #${index + 1} 파싱 오류:`, error.message);
      }
    });
    
    console.log(`[향상된 스텔스 크롤러] 총 ${reviews.length}개 리뷰 파싱 완료`);
    return reviews;
  } catch (error) {
    console.error('[향상된 스텔스 크롤러] HTML 파싱 오류:', error.message);
    return [];
  }
}

/**
 * 리뷰 데이터를 데이터베이스에 저장
 */
async function saveReviewsToDb(reviews, dramaId) {
  try {
    const { db } = await connectToDatabase();
    
    // 리뷰 데이터 저장
    for (const review of reviews) {
      // 드라마 ID 추가
      review.dramaId = dramaId;
      
      // 중복 체크
      const existingReview = await db.collection('reviews').findOne({ 
        reviewId: review.reviewId
      });
      
      if (existingReview) {
        // 기존 리뷰 업데이트
        await db.collection('reviews').updateOne(
          { reviewId: review.reviewId },
          { $set: review }
        );
      } else {
        // 새 리뷰 추가
        await db.collection('reviews').insertOne(review);
      }
    }
    
    // 드라마 컬렉션 업데이트 (리뷰 개수 및 평점)
    const allReviews = await db.collection('reviews').find({ dramaId }).toArray();
    
    // 리뷰 수
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
    
    const reviewRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    
    // 평점 분포 계산
    const ratingDistribution = Array(10).fill(0);
    for (const review of allReviews) {
      if (review.rating && review.rating > 0 && review.rating <= 10) {
        const ratingIndex = Math.floor(review.rating) - 1;
        if (ratingIndex >= 0 && ratingIndex < 10) {
          ratingDistribution[ratingIndex]++;
        }
      }
    }
    
    // 드라마 정보 업데이트
    await db.collection('dramas').updateOne(
      { _id: dramaId },
      { 
        $set: { 
          reviewCount,
          reviewRating,
          ratingDistribution
        } 
      }
    );
    
    console.log(`[향상된 스텔스 크롤러] 드라마 ${dramaId} 업데이트: 리뷰 ${reviewCount}개, 평점 ${reviewRating.toFixed(1)}`);
  } catch (error) {
    console.error('[향상된 스텔스 크롤러] 데이터베이스 저장 오류:', error.message);
    throw error;
  }
}

/**
 * 브라우저와 Cheerio에서 추출한 리뷰 병합 및 중복 제거
 */
function mergeReviews(browserReviews, cheerioReviews) {
  // 결과 리뷰 배열
  const resultReviews = [];
  // 사용자 이름으로 중복 체크
  const usernameMap = new Map();
  
  // 브라우저에서 추출한 리뷰 처리
  for (const review of browserReviews) {
    // 사용자 이름이 있고 리뷰 텍스트가 10자 이상인 경우만 추가
    if (review.username && review.username !== 'Unknown User' && 
        review.reviewText && review.reviewText.length >= 10) {
      usernameMap.set(review.username, review);
    }
  }
  
  // Cheerio에서 추출한 리뷰 처리
  for (const review of cheerioReviews) {
    // 이미 동일한 사용자의 리뷰가 추가된 경우
    if (usernameMap.has(review.username)) {
      const existingReview = usernameMap.get(review.username);
      
      // 리뷰 텍스트 비교 - 더 긴 텍스트 사용
      if (review.reviewText.length > existingReview.reviewText.length) {
        usernameMap.set(review.username, review);
      }
    } else {
      // 새로운 사용자의 리뷰 추가
      if (review.username && review.username !== 'Unknown User' && 
          review.reviewText && review.reviewText.length >= 10) {
        usernameMap.set(review.username, review);
      }
    }
  }
  
  // Map에서 최종 리뷰 배열로 변환
  for (const [_, review] of usernameMap.entries()) {
    resultReviews.push(review);
  }
  
  return resultReviews;
} 