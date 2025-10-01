/**
 * MyDramalist 리뷰 스텔스 크롤러 (스탠드얼론 스크립트)
 * 이 스크립트는 명령줄에서 직접 실행하여 MyDramalist 사이트의 리뷰를 크롤링합니다.
 * 
 * 사용법: node stealth-reviews-crawler.js <mydramalist-url>
 * 예시: node stealth-reviews-crawler.js https://mydramalist.com/705613-moving
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 스텔스 플러그인 활성화
puppeteer.use(StealthPlugin());

// 비동기 대기 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 메인 함수
 */
async function main() {
  // 사용자 입력 확인
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node stealth-reviews-crawler.js <mydramalist-url>');
    console.error('Example: node stealth-reviews-crawler.js https://mydramalist.com/705613-moving');
    process.exit(1);
  }

  let targetUrl = args[0];
  let browser;

  try {
    // URL이 '/reviews'로 끝나지 않으면 추가
    if (!targetUrl.endsWith('/reviews')) {
      // URL에서 trailing slash 제거
      if (targetUrl.endsWith('/')) {
        targetUrl = targetUrl.slice(0, -1);
      }
      targetUrl = `${targetUrl}/reviews`;
      console.log(`URL 조정됨: ${targetUrl}`);
    }

    console.log(`크롤링 시작: ${targetUrl}`);

    // 스텔스 브라우저 시작
    console.log('브라우저 설정 시작');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-features=site-per-process',
        '--js-flags=--max-old-space-size=4096',
        '--no-zygote',
        '--single-process'
      ],
      ignoreHTTPSErrors: true,
      timeout: 120000 // 2분 타임아웃
    });

    // 새 페이지 열기
    const page = await browser.newPage();
    console.log('브라우저 페이지 생성됨');
    
    // 사용자 에이전트 설정
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');
    
    // 추가 헤더 설정
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // 요청 가로채기 설정 (불필요한 리소스 차단)
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      
      if (['image', 'font', 'media'].includes(resourceType) || 
          url.includes('google-analytics') || 
          url.includes('googletagmanager') ||
          url.includes('facebook') ||
          url.includes('twitter') ||
          url.includes('analytics')) {
        // 이미지, 폰트, 미디어, 분석 스크립트 차단
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // 페이지 로딩
    console.log(`페이지 로딩 중... (${targetUrl})`);
    await page.goto(targetUrl, {
      waitUntil: ['domcontentloaded', 'networkidle2'],
      timeout: 90000 // 90초 타임아웃
    });
    
    // 추가 대기 - 페이지 또는 주요 요소가 로딩될 때까지 대기
    await page.waitForFunction(() => {
      return document.readyState === 'complete' || 
             document.querySelectorAll('.box, .post, .comment, #content').length > 0;
    }, { timeout: 30000 }).catch(e => console.log('초기 로딩 대기 타임아웃:', e.message));
    
    console.log('페이지 초기 로딩 완료');

    // 무작위 대기 시간
    await sleep(Math.floor(Math.random() * 2000) + 1000);

    // 인간과 같은 스크롤 동작
    console.log('인간과 유사한 스크롤링 시작...');
    await page.evaluate(async () => {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      let currentPosition = 0;
      
      // 페이지를 나누어 스크롤
      while (currentPosition < scrollHeight) {
        // 조금씩 스크롤
        const scrollStep = Math.floor(Math.random() * 300) + 100;
        currentPosition += scrollStep;
        window.scrollTo(0, currentPosition);
        
        // 잠시 대기
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 300) + 100));
      }
      
      // 리뷰 섹션 찾기 시도
      const reviewsHeaders = Array.from(document.querySelectorAll('h1, h2, h3, h4, .box-header'))
        .filter(el => el.textContent.includes('Reviews'));
      
      if (reviewsHeaders.length > 0) {
        reviewsHeaders[0].scrollIntoView({ behavior: 'smooth' });
        await new Promise(r => setTimeout(r, 1000));
      }
    });
    
    console.log('스크롤링 완료');
    
    // "더 보기" 버튼 등을 클릭하여 더 많은 리뷰 로드 시도
    console.log('추가 리뷰 로드 시도 중...');
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
          // jQuery 스타일 :contains 선택자 처리
          if (sel.includes(':contains(')) {
            const text = sel.match(/:contains\("(.+?)"\)/)[1];
            const tagName = sel.split(':')[0];
            const elements = Array.from(document.querySelectorAll(tagName));
            return elements.some(el => el.textContent.includes(text) && 
                                   el.offsetParent !== null);
          }
          
          // 일반 CSS 선택자 처리
          const elements = Array.from(document.querySelectorAll(sel));
          const visibleElements = elements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
          });
          return visibleElements.length > 0;
        }, selector);
        
        if (hasLoadMoreButton) {
          console.log(`더 보기 버튼 발견: "${selector}"`);
          
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
              console.log(`더 보기 버튼 클릭 ${i+1}회`);
              
              // AJAX 로딩 대기
              await sleep(3000);
              
              // 더 이상 버튼이 없는지 확인
              const buttonStillExists = await page.evaluate((sel) => {
                const button = document.querySelector(sel);
                return button && button.offsetParent !== null;
              }, selector);
              
              if (!buttonStillExists) {
                console.log('더 이상 버튼이 없음, 로딩 완료');
                break;
              }
            } catch (clickError) {
              console.log(`버튼 클릭 오류: ${clickError.message}`);
              break;
            }
          }
          
          // 하나의 선택자로 성공했으면 반복 중단
          break;
        }
      }
    } catch (interactionError) {
      console.error('추가 리뷰 로드 중 오류:', interactionError.message);
    }

    // HTML 추출
    const html = await page.content();
    console.log(`HTML 추출 완료, 크기: ${html.length} 바이트`);
    
    // HTML 파싱하여 리뷰 추출
    const reviews = await parseReviewsHtml(html, targetUrl);
    console.log(`${reviews.length}개 리뷰 추출 완료`);
    
    // 결과 저장
    if (reviews.length > 0) {
      const outputDir = path.join(__dirname, 'crawled-reviews');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const urlParts = targetUrl.split('/');
      const filename = urlParts[urlParts.length - 2]; // URL에서 드라마 ID 추출
      const outputFile = path.join(outputDir, `${filename}-reviews.json`);
      
      fs.writeFileSync(outputFile, JSON.stringify(reviews, null, 2));
      console.log(`결과가 ${outputFile}에 저장되었습니다.`);
    } else {
      console.log('추출된 리뷰가 없습니다.');
    }
    
  } catch (error) {
    console.error('크롤링 오류:', error);
  } finally {
    // 브라우저 종료
    if (browser) {
      await browser.close();
      console.log('브라우저 종료됨');
    }
  }
}

/**
 * HTML에서 리뷰 정보 추출
 * @param {string} html - 리뷰 페이지 HTML
 * @param {string} url - 리뷰 페이지 URL
 * @returns {Array} - 추출된 리뷰 목록
 */
async function parseReviewsHtml(html, url) {
  try {
    console.log('HTML 파싱 시작');
    const $ = cheerio.load(html);
    
    // 로그 추가: 페이지 응답 코드 확인 (404 오류 감지)
    const pageTitle = $('title').text().trim();
    console.log(`페이지 제목: ${pageTitle}`);
    
    // 404 오류 감지
    if (pageTitle.includes('not found') || pageTitle.includes('404')) {
      console.error('404 오류: 페이지를 찾을 수 없음');
      return [];
    }
    
    // CloudFlare 보호 감지
    if (html.includes('Just a moment') && html.includes('Cloudflare')) {
      console.error('CloudFlare 보호가 감지됨. 스텔스 기능 강화 필요');
      return [];
    }
    
    // 드라마 제목 추출 시도
    const dramaTitle = $('h1.film-title').first().text().trim() || 
                       $('.film-title, .box-header h1').first().text().trim() ||
                       $('h1').first().text().trim();
    
    console.log(`드라마 제목: ${dramaTitle}`);
    
    // 리뷰 섹션 찾기
    // MyDramalist는 다양한 HTML 구조를 가질 수 있으므로 여러 선택자 시도
    const reviewSelectors = [
      { 
        container: '#content .box:has(.box-header:contains("Reviews"))',
        items: '.post', 
        name: 'main-box-reviews' 
      },
      { 
        container: '.review-list', 
        items: '.review-item, .post', 
        name: 'review-list-items' 
      },
      { 
        container: '.user-reviews-box', 
        items: '.review, .post', 
        name: 'user-reviews' 
      },
      { 
        container: '#reviews-section', 
        items: '.review, .post', 
        name: 'reviews-section' 
      },
      { 
        container: '#app', 
        items: '.post, .review, .review-item, .comment:not(.reply)', 
        name: 'global-items' 
      },
      { 
        container: 'body', 
        items: '.post', 
        name: 'body-posts' 
      }
    ];
    
    // 가장 적합한 리뷰 컨테이너 및 아이템 찾기
    let bestContainer = null;
    let reviewItems = $();
    let selectorName = '';
    
    for (const selector of reviewSelectors) {
      const container = $(selector.container);
      if (container.length > 0) {
        const items = container.find(selector.items);
        console.log(`컨테이너 '${selector.name}'에서 ${items.length}개 리뷰 요소 발견`);
        
        if (items.length > reviewItems.length) {
          bestContainer = container;
          reviewItems = items;
          selectorName = selector.name;
        }
      }
    }
    
    // 적합한 컨테이너를 찾지 못했을 경우, 전체 페이지에서 리뷰 관련 요소 검색
    if (reviewItems.length === 0) {
      console.log('표준 컨테이너에서 리뷰를 찾지 못함, 전체 페이지 검색');
      
      // 새로운 선택자 목록으로 재시도
      const fallbackSelectors = [
        '.post, .review-item, .review, .comment:not(.reply)',
        '.box .post, .box .comment:not(.reply)',
        '.list-item:has(.review-body), .list-item:has(.text)',
        '[class*="review"], [id*="review"]'
      ];
      
      for (const selector of fallbackSelectors) {
        const items = $(selector);
        console.log(`대체 선택자 '${selector}'에서 ${items.length}개 요소 발견`);
        
        if (items.length > reviewItems.length) {
          reviewItems = items;
          selectorName = `fallback-${selector}`;
        }
      }
    }
    
    console.log(`최종 선택: '${selectorName}'에서 ${reviewItems.length}개 리뷰 요소 추출`);
    
    // 페이지 구조 디버깅을 위한 정보 수집
    console.log('주요 HTML 구조:');
    $('#app > .app-content > div').each((i, el) => {
      const className = $(el).attr('class') || 'no-class';
      const id = $(el).attr('id') || 'no-id';
      console.log(`  섹션 #${i+1}: Class="${className}", ID="${id}", 내부 요소 수: ${$(el).children().length}`);
    });
    
    // 리뷰 목록을 저장할 배열
    const reviews = [];
    
    // 각 리뷰 요소에서 데이터 추출
    reviewItems.each((index, element) => {
      try {
        console.log(`리뷰 #${index + 1} 파싱 시작...`);
        
        // 요소 디버깅 정보
        const elementClasses = $(element).attr('class') || 'no-class';
        const elementId = $(element).attr('id') || 'no-id';
        console.log(`요소 정보: class="${elementClasses}", id="${elementId}"`);
        
        // 리뷰 ID 추출 - 다양한 패턴 시도
        let reviewId = '';
        
        // 1. ID 속성에서 추출
        if ($(element).attr('id')) {
          const idMatch = $(element).attr('id').match(/review-(\d+)|post-(\d+)|comment-(\d+)/i);
          if (idMatch) {
            reviewId = idMatch[1] || idMatch[2] || idMatch[3];
          } else {
            reviewId = $(element).attr('id');
          }
        }
        
        // 2. data-id 속성에서 추출
        if (!reviewId && $(element).attr('data-id')) {
          reviewId = $(element).attr('data-id');
        }
        
        // 3. data-review-id 속성에서 추출
        if (!reviewId && $(element).attr('data-review-id')) {
          reviewId = $(element).attr('data-review-id');
        }
        
        // 4. fallback ID
        if (!reviewId) {
          reviewId = `unknown-${url.split('/').pop()}-${index}-${Date.now()}`;
        }
        
        // 사용자 이름 및 프로필 URL
        let username = 'Unknown User';
        let userProfileUrl = '';
        let userImage = '';
        
        // 사용자 정보 추출
        const userSelectors = [
          'a[href^="/profile/"]', 
          '.user-name a', 
          '.user a', 
          '.profile-link', 
          '.meta a[href^="/profile/"]',
          '.user-display a', 
          '.text-primary[href^="/profile/"]',
          '.avatar-name', 
          '.reviewer-name'
        ];
        
        for (const selector of userSelectors) {
          const userElement = $(element).find(selector).first();
          if (userElement.length > 0) {
            username = userElement.text().trim();
            userProfileUrl = userElement.attr('href') || '';
            
            if (username) {
              break;
            }
          }
        }
        
        // 사용자 프로필 이미지
        const avatarSelectors = [
          '.avatar img', 
          '.user-picture img', 
          '.profile-pic img',
          '[class*="avatar"] img', 
          '.user img'
        ];
        
        for (const selector of avatarSelectors) {
          const imgElement = $(element).find(selector).first();
          if (imgElement.length > 0) {
            userImage = imgElement.attr('src') || '';
            if (userImage) {
              break;
            }
          }
        }
        
        // 평점 추출
        let rating = 0;
        const ratingSelectors = [
          '.overall-rating .score', 
          '.rating-overall .score', 
          '.score', 
          '.rated', 
          '[itemprop="ratingValue"]',
          'span.score', 
          'div.score', 
          '.overall',
          '.user-rating',
          '.rating-value',
          '.rating'
        ];
        
        for (const selector of ratingSelectors) {
          const ratingElement = $(element).find(selector).first();
          if (ratingElement.length > 0) {
            const ratingText = ratingElement.text().trim();
            const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
            if (ratingMatch) {
              rating = parseFloat(ratingMatch[1]);
              console.log(`평점 발견: ${rating}, 선택자: ${selector}`);
              break;
            }
          }
        }
        
        // 리뷰 제목
        let reviewTitle = '';
        const titleSelectors = [
          '.review-title', 
          'h3', 
          'h4', 
          '.post-title', 
          '.post-header h2', 
          '.title',
          '.subject',
          '.heading'
        ];
        
        for (const selector of titleSelectors) {
          const titleElement = $(element).find(selector).first();
          if (titleElement.length > 0) {
            reviewTitle = titleElement.text().trim();
            if (reviewTitle) {
              break;
            }
          }
        }
        
        // 리뷰 본문 텍스트
        let reviewText = '';
        
        // 다양한 본문 선택자 시도
        const bodySelectors = [
          '.review-body', 
          '.review-bodyfull', 
          '.review-bodyfull-read', 
          '.text', 
          '.post-body',
          '.comment-body', 
          '[itemprop="reviewBody"]', 
          '.text-content', 
          '.content',
          '.description', 
          '.review-content', 
          '.review-description', 
          '.detail-content'
        ];
        
        // 본문 추출 시도
        for (const selector of bodySelectors) {
          const bodyElement = $(element).find(selector).first();
          if (bodyElement.length > 0) {
            // 불필요한 요소 제거
            const clonedBody = bodyElement.clone();
            clonedBody.find('.box, .user-stats, .review-helpful, .review-tag, .rating-overall, script, style, .read-more, .button').remove();
            
            reviewText = clonedBody.text().trim();
            if (reviewText && reviewText.length >= 20) {
              console.log(`본문 발견: 길이=${reviewText.length}자, 선택자: ${selector}`);
              break;
            }
          }
        }
        
        // 본문을 찾지 못한 경우: 단락 요소 내용 수집
        if (!reviewText || reviewText.length < 20) {
          const paragraphs = $(element).find('p');
          if (paragraphs.length > 0) {
            const paragraphTexts = [];
            paragraphs.each(function() {
              // 사용자 정보, 평점 등의 요소 내부가 아닌 단락만 추가
              const $p = $(this);
              if (!$p.closest('.user-info, .rating, .score, .meta, .header, .title, .review-header, .avatar, .user').length) {
                paragraphTexts.push($p.text().trim());
              }
            });
            
            if (paragraphTexts.length > 0) {
              reviewText = paragraphTexts.join('\n\n');
              console.log(`단락에서 본문 발견: ${paragraphTexts.length}개 단락, 총 길이=${reviewText.length}자`);
            }
          }
        }
        
        // 여전히 리뷰 내용을 못 찾은 경우: 요소 전체 텍스트에서 메타데이터 제거
        if (!reviewText || reviewText.length < 20) {
          // 헤더, 평점, 메타데이터 등의 요소를 제외한 복제본 생성
          const clonedElement = $(element).clone();
          clonedElement.find('.avatar, .user-display, .rating-overall, .review-rating, .review-helpful, .review-tag, .datetime, .post-header, .user-stats, h1, h2, h3, h4, .title, .meta, .rating, .score, .header, script, style, .hidden, .visually-hidden').remove();
          
          reviewText = clonedElement.text().trim()
            .replace(/\s{2,}/g, ' ')  // 여러 공백을 하나로 줄임
            .replace(/\n{2,}/g, '\n'); // 여러 줄바꿈을 하나로 줄임
          
          // 사용자 이름 및 일반적인 메타데이터 텍스트 제거
          if (username && username !== 'Unknown User') {
            reviewText = reviewText.replace(new RegExp(username, 'g'), '');
          }
          
          reviewText = reviewText
            .replace(/\b(rated it|Rating|Score|Overall|Story|Acting|Music|Rewatch)\b\s*:?\s*\d+(\.\d+)?/gi, '')
            .replace(/\b(Main Role|Support Role|Lead Role|Guest Role)\b/g, '')
            .replace(/\b(Completed|Watching|Plan to Watch|On Hold|Dropped)\b/g, '')
            .replace(/\d+\/\d+/g, '')
            .replace(/\b(days?|weeks?|months?|years?) ago\b/g, '')
            .trim();
            
          console.log(`클렌징된 본문: 길이=${reviewText.length}자`);
        }
        
        // 제목이 없는 경우 본문에서 추출
        if (!reviewTitle && reviewText) {
          const firstLine = reviewText.split('\n')[0].trim();
          reviewTitle = firstLine.length > 50 ? `${firstLine.substring(0, 50)}...` : firstLine;
        } else if (!reviewTitle) {
          reviewTitle = `${username}'s Review`;
        }
        
        // 리뷰 날짜
        let reviewDate = '';
        const dateSelectors = [
          '.date', 
          '.datetime', 
          '.review-date', 
          '.meta time', 
          '[datetime]',
          '.post-date',
          '.timestamp',
          '.post-info time',
          '.post-time'
        ];
        
        for (const selector of dateSelectors) {
          const dateElement = $(element).find(selector).first();
          if (dateElement.length > 0) {
            reviewDate = dateElement.text().trim() || dateElement.attr('datetime') || '';
            if (reviewDate) {
              // 날짜 형식 정리 (예: "2022-01-15" 또는 "3 months ago")
              reviewDate = reviewDate.replace(/^\s*on\s+/i, '');
              break;
            }
          }
        }
        
        // 유용한 정보 카운트 (좋아요 등)
        let helpfulCount = 0;
        const helpfulSelectors = [
          '.review-helpful', 
          '.helpful', 
          '.likes',
          '.like-count',
          '.reactions'
        ];
        
        for (const selector of helpfulSelectors) {
          const helpfulElement = $(element).find(selector).first();
          if (helpfulElement.length > 0) {
            const helpfulText = helpfulElement.text().trim();
            const helpfulMatch = helpfulText.match(/(\d+)/);
            if (helpfulMatch) {
              helpfulCount = parseInt(helpfulMatch[1]);
              break;
            }
          }
        }
        
        // 리뷰 텍스트가 20자 이상인 경우만 추가 (너무 짧은 리뷰는 무시)
        if (reviewText && reviewText.length >= 20) {
          reviews.push({
            reviewId,
            username,
            userProfileUrl,
            userImage,
            rating,
            title: reviewTitle,
            reviewText,
            reviewDate,
            helpfulCount,
            createdAt: new Date(),
            sourceUrl: url
          });
          
          console.log(`리뷰 추출 성공 - ID: ${reviewId}, 제목: ${reviewTitle}, 평점: ${rating}`);
        } else {
          console.log(`리뷰 텍스트가 너무 짧아 무시됨 (${reviewText?.length || 0}자)`);
        }
      } catch (error) {
        console.error(`리뷰 #${index + 1} 파싱 오류:`, error.message);
      }
    });
    
    // 0개 리뷰가 추출된 경우 경고 로그
    if (reviews.length === 0) {
      console.warn('리뷰를 찾지 못했습니다. HTML 구조가 변경되었거나 CloudFlare 보호가 활성화된 것 같습니다.');
      
      // 페이지 타이틀과 주요 섹션 로깅
      console.log('페이지 제목:', $('title').text().trim());
      console.log('주요 섹션 개수:', $('#content > div').length);
      console.log('주요 헤더:');
      $('h1, h2').each((i, el) => console.log(`  ${i+1}. ${$(el).text().trim()}`));
    }
    
    return reviews;
  } catch (error) {
    console.error('HTML 파싱 중 오류:', error);
    return [];
  }
}

// 메인 함수 실행
main().catch(err => {
  console.error('오류 발생:', err);
  process.exit(1);
}); 