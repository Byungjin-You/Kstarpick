import { getSession } from 'next-auth/react';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';
import Review from '../../../models/Review';
// import { getServerSession } from "next-auth";
// import { authOptions } from "../auth/[...nextauth]";
import { getToken } from "next-auth/jwt";

// 스텔스 플러그인 활성화
puppeteer.use(StealthPlugin());

// 비동기 대기 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 랜덤 지연시간 생성 (봇 탐지 회피용)
const randomDelay = () => {
  const delay = Math.floor(Math.random() * 1500) + 500;
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * 스텔스 모드로 MyDramalist에서 영화 리뷰를 크롤링하는 API
 */
export default async function handler(req, res) {
  // API 요청 시작 로그
  console.log('================ 영화 리뷰 스텔스 크롤러 API 요청 시작 ================');
  console.log('요청 메소드:', req.method);
  console.log('요청 본문:', req.body);

  // POST 메소드 체크
  if (req.method !== 'POST') {
    console.log('================ 영화 리뷰 스텔스 크롤러 API 요청 완료 ================');
    return res.status(405).json({ message: '허용되지 않는 요청 방식입니다.' });
  }

  let browser;
  try {
    // 개발 환경에서는 인증 검사 건너뛰기
    console.log('인증 체크 생략 - 개발 환경 우선 지원');
    
    const { url, dramaId } = req.body;

    if (!url || !dramaId) {
      console.log('================ 영화 리뷰 스텔스 크롤러 API 요청 완료 ================');
      return res.status(400).json({ message: 'URL과 드라마 ID가 필요합니다.' });
    }

    // 스텔스 브라우저 설정
    console.log('[리뷰 스텔스 크롤러] 브라우저 설정 시작');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-dev-shm-usage'
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    
    const page = await browser.newPage();
    
    // 브라우저 지문 숨기기
    await page.evaluateOnNewDocument(() => {
      // WebDriver 감지 우회
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // 자동화 감지 방지
      window.navigator.chrome = {
        runtime: {},
      };
      
      // 플러그인 숨기기
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
              enabledPlugin: Plugin,
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin",
          },
          {
            0: {
              type: "application/pdf",
              suffixes: "pdf",
              description: "",
              enabledPlugin: Plugin,
            },
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer",
          },
        ],
      });
    });
    
    console.log('[리뷰 스텔스 크롤러] 브라우저 설정 완료');
    
    // 리뷰 페이지 로딩
    const reviewUrl = `${url}/reviews`;
    console.log(`[리뷰 스텔스 크롤러] 리뷰 페이지 로딩 중... (${reviewUrl})`);
    
    await page.goto(reviewUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log(`[리뷰 스텔스 크롤러] 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();
    
    // "더 보기" 버튼 클릭하여 모든 리뷰 로드
    let clickCount = 0;
    let hasMoreButton = true;
    
    console.log(`[리뷰 스텔스 크롤러] "더 보기" 버튼 클릭하여 모든 리뷰 로드 시작`);
    
    while (hasMoreButton && clickCount < 5) {
      try {
        const moreButton = await page.$('.more-button');
        if (moreButton) {
          await moreButton.click();
          clickCount++;
          console.log(`[리뷰 스텔스 크롤러] 더 보기 버튼 클릭 ${clickCount}회`);
          await randomDelay();
        } else {
          hasMoreButton = false;
        }
      } catch (error) {
        console.log(`[리뷰 스텔스 크롤러] 더 보기 버튼 클릭 실패:`, error.message);
        hasMoreButton = false;
      }
    }
    
    // HTML 추출
    console.log('[리뷰 스텔스 크롤러] HTML 추출 시작');
    const html = await page.content();
    console.log(`[리뷰 스텔스 크롤러] HTML 추출 완료, 크기: ${html.length} 바이트`);
    
    // 리뷰 정보 파싱
    console.log('[리뷰 스텔스 크롤러] HTML 파싱 시작');
    const $ = cheerio.load(html);
    
    // 페이지 제목에서 영화 제목 추출
    const pageTitle = $('title').text().trim();
    console.log(`[리뷰 스텔스 크롤러] 페이지 제목: ${pageTitle}`);
    
    // 영화 제목 추출 (페이지 제목에서 " Reviews - MyDramaList" 부분 제거)
    const title = pageTitle.replace(' Reviews - MyDramaList', '').trim();
    console.log(`[리뷰 스텔스 크롤러] 드라마 제목: ${title}`);
    
    // 다양한 리뷰 컨테이너 선택자 시도
    const reviewContainers = [
      { selector: '#main-box-reviews .box-review', name: 'main-box-reviews' },
      { selector: '.global-items .review', name: 'global-items' },
      { selector: '.body-posts .review', name: 'body-posts' },
    ];
    
    let reviewElements = [];
    let containerUsed = '';
    
    for (const container of reviewContainers) {
      const elements = $(container.selector);
      console.log(`[리뷰 스텔스 크롤러] 컨테이너 '${container.name}'에서 ${elements.length}개 리뷰 요소 발견`);
      
      if (elements.length > reviewElements.length) {
        reviewElements = elements;
        containerUsed = container.name;
      }
    }
    
    console.log(`[리뷰 스텔스 크롤러] 최종 선택: '${containerUsed}'에서 ${reviewElements.length}개 리뷰 요소 추출`);
    
    // HTML 구조 로깅
    console.log('[리뷰 스텔스 크롤러] 주요 HTML 구조:');
    
    const reviews = [];
    
    reviewElements.each((i, element) => {
      try {
        console.log(`[리뷰 스텔스 크롤러] 리뷰 #${i+1} 파싱 시작...`);
        
        // 디버깅을 위한 요소 정보 출력
        const classAttr = $(element).attr('class');
        const idAttr = $(element).attr('id');
        console.log(`[리뷰 스텔스 크롤러] 요소 정보: class="${classAttr}", id="${idAttr}"`);
        
        // 리뷰 ID 추출
        const reviewId = $(element).attr('id') ? $(element).attr('id').replace('review-', '') : null;
        
        // 리뷰 제목 추출
        const reviewTitle = $(element).find('.review-title').text().trim();
        
        // 평점 추출
        const ratingElement = $(element).find('.rating-overall .score');
        let rating = 0;
        
        if (ratingElement.length > 0) {
          rating = parseFloat(ratingElement.text().trim());
          console.log(`[리뷰 스텔스 크롤러] 평점 발견: ${rating}, 선택자: .rating-overall .score`);
        } else {
          // 대체 선택자 시도
          const altRatingElement = $(element).find('.score');
          if (altRatingElement.length > 0) {
            rating = parseFloat(altRatingElement.text().trim());
            console.log(`[리뷰 스텔스 크롤러] 평점 발견: ${rating}, 선택자: .score`);
          }
        }
        
        // 리뷰 본문 추출 (여러 선택자 시도)
        const contentSelectors = ['.review-body', '.review-bodyfull-read', '.review-bodypartial-read'];
        let reviewContent = '';
        let usedSelector = '';
        
        for (const selector of contentSelectors) {
          const contentElement = $(element).find(selector);
          if (contentElement.length > 0) {
            // 불필요한 요소 제거
            const clonedContent = contentElement.clone();
            clonedContent.find('.read-more, .button, .box, .user-stats, .review-helpful').remove();
            
            const content = clonedContent.text().trim();
            if (content && content.length > reviewContent.length) {
              reviewContent = content;
              usedSelector = selector;
            }
          }
        }
        
        if (reviewContent) {
          console.log(`[리뷰 스텔스 크롤러] 본문 발견: 길이=${reviewContent.length}자, 선택자: ${usedSelector}`);
        }
        
        // 리뷰 날짜 추출
        const reviewDate = $(element).find('.review-meta').text().trim();
        
        // 사용자 정보
        const username = $(element).find('.username a').text().trim();
        
        if (reviewId && reviewContent) {
          reviews.push({
            mdlId: reviewId,
            title: reviewTitle || `${title.substring(0, 30)}... Review`,
            content: reviewContent,
            rating: rating,
            date: reviewDate,
            username: username,
            dramaId: dramaId,
            source: 'mydramalist'
          });
          
          console.log(`[리뷰 스텔스 크롤러] 리뷰 추출 성공 - ID: ${reviewId}, 제목: ${reviewTitle ? reviewTitle.substring(0, 30) + '...' : 'No Title'}, 평점: ${rating}`);
        }
      } catch (error) {
        console.error(`[리뷰 스텔스 크롤러] 리뷰 파싱 오류:`, error);
      }
    });
    
    console.log(`[리뷰 스텔스 크롤러] ${reviews.length}개 리뷰 추출 완료`);
    
    // 추출한 리뷰를 데이터베이스에 저장
    console.log(`[리뷰 스텔스 크롤러] ${reviews.length}개 리뷰 저장 시작`);
    
    // MongoDB 연결
    console.log(`[리뷰 스텔스 크롤러] MongoDB 연결 시작`);
    const { db } = await connectToDatabase();
    console.log(`[리뷰 스텔스 크롤러] MongoDB 연결 성공`);
    
    // 리뷰 저장 및 업데이트
    const savedReviews = [];
    let failedReviews = 0;
    
    for (const review of reviews) {
      try {
        // 이미 존재하는 리뷰인지 확인
        const existingReview = await db.collection('reviews').findOne({ 
          mdlId: review.mdlId, 
          dramaId: review.dramaId 
        });
        
        if (existingReview) {
          // 기존 리뷰 업데이트
          await db.collection('reviews').updateOne(
            { mdlId: review.mdlId, dramaId: review.dramaId },
            { $set: review }
          );
        } else {
          // 새 리뷰 추가
          await db.collection('reviews').insertOne(review);
        }
        
        savedReviews.push(review);
      } catch (error) {
        console.error(`[리뷰 스텔스 크롤러] 리뷰 저장 오류:`, error);
        failedReviews++;
      }
    }
    
    console.log(`[리뷰 스텔스 크롤러] 저장 완료: ${savedReviews.length}개 성공, ${failedReviews}개 실패`);
    
    // 리뷰 통계 정보 업데이트
    console.log(`[리뷰 스텔스 크롤러] 드라마 ID: ${dramaId}의 리뷰 통계 업데이트 시작`);
    
    // 해당 드라마의 모든 리뷰 가져오기
    const allReviews = await db.collection('reviews').find({ dramaId: dramaId }).toArray();
    
    // 평점 계산
    const ratings = allReviews.map(review => review.rating).filter(rating => rating > 0);
    const averageRating = ratings.length > 0 
      ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10
      : 0;
    
    // 평점 분포 계산 (1~10점)
    const ratingDistribution = Array(10).fill(0);
    ratings.forEach(rating => {
      if (rating > 0 && rating <= 10) {
        ratingDistribution[Math.ceil(rating) - 1]++;
      }
    });
    
    // 드라마 정보 업데이트
    const updateResult = await db.collection('dramas').updateOne(
      { _id: new ObjectId(dramaId) },
      { 
        $set: { 
          reviewCount: allReviews.length,
          reviewRating: averageRating,
          ratingDistribution: ratingDistribution
        } 
      }
    );
    
    console.log(`[리뷰 스텔스 크롤러] 드라마 리뷰 통계 업데이트 완료: 리뷰 ${allReviews.length}개, 평균 평점 ${averageRating}, 업데이트 결과:`, updateResult);
    
    // 브라우저 종료
    console.log('[리뷰 스텔스 크롤러] MongoDB 연결 종료');
    
    return res.status(200).json({
      message: `${savedReviews.length}개 리뷰 크롤링 및 저장 완료`,
      reviewCount: savedReviews.length,
      averageRating: averageRating
    });
    
  } catch (error) {
    console.error('[리뷰 스텔스 크롤러] 오류 발생:', error);
    return res.status(500).json({ 
      message: '리뷰 크롤링 중 오류가 발생했습니다.', 
      error: error.message 
    });
  } finally {
    // 브라우저 종료
    if (browser) {
      console.log('[리뷰 스텔스 크롤러] 브라우저 종료');
      await browser.close();
    }
  }
} 