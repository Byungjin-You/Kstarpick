import { getSession } from 'next-auth/react';
import * as cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';
import fetch from 'node-fetch';

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
 * 직접 HTTP 요청으로 MyDramalist 리뷰를 크롤링하는 API
 */
export default async function handler(req, res) {
  // API 요청 시작 로그
  console.log('================ 직접 리뷰 크롤러 API 요청 시작 ================');
  console.log('요청 메소드:', req.method);
  console.log('요청 본문:', JSON.stringify(req.body, null, 2));
  console.log('요청 시간:', new Date().toISOString());
  
  // POST 요청만 허용
  if (req.method !== 'POST') {
    console.log('허용되지 않는 메소드:', req.method);
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    // 권한 체크 완전 제거 (항상 접근 허용)
    console.log('[직접 리뷰 크롤러] 권한 체크 생략됨 (DEBUG_MODE)');

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
      console.log(`[직접 리뷰 크롤러] URL 조정됨: ${targetUrl}`);
    }

    console.log(`[직접 리뷰 크롤러] ${targetUrl} 크롤링 시작`);

    // HTTP 요청 헤더 설정
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
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
    };

    // node-fetch를 사용해 HTTP 요청 보내기
    console.log('[직접 리뷰 크롤러] HTTP 요청 시작...');
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
      timeout: 30000 // 30초 타임아웃
    });

    if (!response.ok) {
      throw new Error(`HTTP 요청 실패: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[직접 리뷰 크롤러] HTTP 상태 코드: ${response.status}`);
    console.log(`[직접 리뷰 크롤러] HTML 데이터 크기: ${html.length} 바이트`);

    if (!html || html.length < 1000) {
      console.error('[직접 리뷰 크롤러] HTML이 비어있거나 너무 짧음');
      throw new Error('HTML이 비어있거나 너무 짧습니다. 크롤링에 실패했습니다.');
    }
    
    // HTML 샘플 디버깅
    const htmlSample = html.length > 2000 
      ? html.substring(0, 1000) + '...[중간 생략]...' + html.substring(html.length - 1000) 
      : html;
    console.log('[직접 리뷰 크롤러] HTML 샘플:', htmlSample.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    
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
      const htmlPath = path.join(debugDir, `direct-review-page-${timestamp}.html`);
      fs.writeFileSync(htmlPath, html);
      console.log(`[직접 리뷰 크롤러] 디버깅용 HTML 저장됨: ${htmlPath}`);
    } catch (fsError) {
      console.error('[직접 리뷰 크롤러] 디버깅용 HTML 저장 실패:', fsError.message);
    }
    
    // 리뷰 페이지 파싱
    console.log('[직접 리뷰 크롤러] 리뷰 페이지 파싱 시작');
    const reviewsResult = await parseReviewsHtml(html, targetUrl);
    console.log(`[직접 리뷰 크롤러] 파싱 완료: ${reviewsResult.length}개 리뷰 발견`);
    
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
            console.log(`[직접 리뷰 크롤러] 기존 리뷰 업데이트: ${review.reviewId}`);
          } else {
            // 새 리뷰 추가
            await db.collection('reviews').insertOne(review);
            console.log(`[직접 리뷰 크롤러] 새 리뷰 추가: ${review.reviewId}`);
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
        
        console.log(`[직접 리뷰 크롤러] 드라마 정보 업데이트 완료: 리뷰 ${reviewCount}개, 평균 평점 ${averageRating.toFixed(1)}`);
      } catch (dbError) {
        console.error('[직접 리뷰 크롤러] 데이터베이스 처리 중 오류:', dbError);
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
    console.error('[직접 리뷰 크롤러] 오류 발생:', error);
    console.error('스택 트레이스:', error.stack);
    return res.status(500).json({
      success: false,
      message: '크롤링 중 오류가 발생했습니다.',
      error: error.message,
      stack: DEBUG_MODE ? error.stack : undefined
    });
  } finally {
    console.log('================ 직접 리뷰 크롤러 API 요청 종료 ================');
  }
}

/**
 * 리뷰 페이지 HTML 파싱 함수
 */
async function parseReviewsHtml(html, url) {
  try {
    console.log(`[직접 리뷰 크롤러] 리뷰 페이지 HTML 파싱 시작, HTML 크기: ${html.length} 바이트`);
    
    // HTML 파싱
    const $ = cheerio.load(html);
    console.log(`[직접 리뷰 크롤러] 페이지 제목: "${$('title').text()}"`);
    
    // HTML에서 'review'라는 단어가 몇 번 나오는지 확인 (디버깅 목적)
    const reviewCount = (html.match(/review/g) || []).length;
    console.log(`[직접 리뷰 크롤러] HTML에서 'review'라는 단어가 ${reviewCount}번 등장`);
    
    // 페이지 구조 분석
    console.log('[직접 리뷰 크롤러] 페이지 구조 분석:');
    console.log(`- #content 요소: ${$('#content').length}`);
    console.log(`- .box 요소: ${$('.box').length}`);
    console.log(`- .review 요소: ${$('.review').length}`);
    console.log(`- .post 요소: ${$('.post').length}`);
    console.log(`- .comment 요소: ${$('.comment').length}`);
    
    // 모든 box 클래스의 헤더 제목 출력 (디버깅용)
    $('.box .box-header').each((i, el) => {
      console.log(`[직접 리뷰 크롤러] Box 헤더 #${i + 1}: ${$(el).text().trim()}`);
    });
    
    // 리뷰 선택자 목록
    const selectors = [
      { selector: '.post', count: $('.post').length },
      { selector: '.comment:not(.reply)', count: $('.comment:not(.reply)').length },
      { selector: '.review', count: $('.review').length },
      { selector: '.box-header:contains("Reviews") + .box-body .post', count: $('.box-header:contains("Reviews") + .box-body .post').length },
      { selector: '.box-header:contains("Reviews") ~ .box-body .post', count: $('.box-header:contains("Reviews") ~ .box-body .post').length },
      { selector: '.box:contains("Reviews") .post', count: $('.box:contains("Reviews") .post').length },
      { selector: '.box:contains("Reviews") .comment:not(.reply)', count: $('.box:contains("Reviews") .comment:not(.reply)').length }
    ];
    
    // 선택자 결과 출력
    for (const item of selectors) {
      console.log(`- 선택자 ${item.selector}: ${item.count}개 요소 발견`);
    }
    
    // 가장 많은 리뷰 요소를 찾는 선택자 선택
    let selectedReviews = $();
    let selectorUsed = '';
    
    for (const item of selectors) {
      if (item.count > selectedReviews.length) {
        selectedReviews = $(item.selector);
        selectorUsed = item.selector;
      }
    }
    
    console.log(`[직접 리뷰 크롤러] 선택자 '${selectorUsed}'를 사용하여 ${selectedReviews.length}개 리뷰 요소 발견`);
    
    // 리뷰 목록을 저장할 배열
    const reviews = [];
    
    // 각 리뷰 요소 추출 (최대 10개로 제한)
    selectedReviews.slice(0, 10).each((index, element) => {
      try {
        console.log(`[직접 리뷰 크롤러] 리뷰 #${index + 1} 파싱 시작...`);
        
        // 리뷰 요소 타입 확인 및 클래스 로깅
        const elementClasses = $(element).attr('class') || '';
        console.log(`[직접 리뷰 크롤러] 리뷰 요소 클래스: ${elementClasses}`);
        
        // 리뷰 요소 구조 확인
        const hasRatingOverall = $(element).find('.rating-overall, [itemprop="ratingValue"], .score, .rated').length > 0;
        const hasReviewBody = $(element).find('.review-body, .review-bodyfull, .review-bodyfull-read, [itemprop="reviewBody"], .text, .post-body, .text-content').length > 0;
        console.log(`[직접 리뷰 크롤러] 리뷰 #${index + 1} 구조: rating-overall=${hasRatingOverall}, review-body=${hasReviewBody}`);
        
        // 리뷰 요소의 HTML 구조 로깅 (디버깅용)
        const elementHtml = $(element).html();
        const elementSample = elementHtml.length > 200 ? elementHtml.substring(0, 200) + '...' : elementHtml;
        console.log(`[직접 리뷰 크롤러] 리뷰 요소 HTML 샘플: ${elementSample.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`);
        
        // 리뷰 ID 추출
        const reviewId = $(element).attr('id')?.replace('review-', '') || 
                       $(element).attr('data-id') || 
                       `direct-${index}-${Date.now()}`;
        console.log(`[직접 리뷰 크롤러] 리뷰 ID: ${reviewId}`);
        
        // 작성자 정보
        const userElement = $(element).find('a.user-display, a.text-primary[href^="/profile/"], a[href^="/profile/"], [itemprop="author"] a, .user-display').first();
        const username = userElement.text().trim() || 
                         $(element).find('[itemprop="author"], .user-display').text().trim() || 
                         "Unknown User";
        
        const userProfileUrl = userElement.attr('href') ? 
                               (userElement.attr('href').startsWith('http') ? 
                                userElement.attr('href') : 
                                'https://mydramalist.com' + userElement.attr('href')) : 
                               '';
        
        const userImage = $(element).find('.avatar img, img.avatar, img.user-avatar, [itemprop="image"]').attr('src') || '';
        
        console.log(`[직접 리뷰 크롤러] 사용자 정보: ${username}`);
        
        // 리뷰 상태 (Completed, Ongoing 등)
        const reviewStatus = $(element).find('.review-tag, .status, .review-status').first().text().trim() || 'Completed';
        
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
                console.log(`[직접 리뷰 크롤러] 평점 발견 (${selector}): ${overallRating}`);
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
              console.log(`[직접 리뷰 크롤러] 숫자만 포함된 요소에서 평점 발견: ${overallRating}`);
            }
          }
        }
        
        console.log(`[직접 리뷰 크롤러] Overall 평점: ${overallRating}`);
        
        // 리뷰 본문 - 개선된 추출 방법
        let reviewText = '';
        let reviewHtml = '';
        
        // 1. 일반적인 본문 선택자들로 내용 추출 시도 - 더 많은 선택자 추가
        const bodySelectors = [
          '.review-bodyfull-read', 
          '.review-body', 
          '.text', 
          '[itemprop="reviewBody"]', 
          '.comment-body',
          '.post-body',
          '.text-content'
        ];
        
        for (const selector of bodySelectors) {
          const bodyElement = $(element).find(selector).first();
          if (bodyElement.length > 0) {
            // 불필요한 요소 제거
            const clonedBody = bodyElement.clone();
            clonedBody.find('.box, .user-stats, .review-helpful, .review-tag, .rating-overall, .read-more, .button').remove();
            
            // HTML 및 텍스트 추출
            reviewHtml = clonedBody.html()?.trim() || '';
            reviewText = clonedBody.text()?.trim() || '';
            
            if (reviewText) {
              console.log(`[직접 리뷰 크롤러] 리뷰 본문 발견 (${selector}): ${reviewText.substring(0, 50)}...`);
              break;
            }
          }
        }
        
        // 1.5 여러 p 태그에 분산된 리뷰 내용 확인 (새로 추가)
        if (!reviewText) {
          const paragraphs = $(element).find('p');
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
              console.log(`[직접 리뷰 크롤러] 여러 p 태그에서 리뷰 본문 추출: ${reviewText.substring(0, 50)}...`);
            }
          }
        }
        
        // 2. 리뷰 본문을 찾지 못한 경우, 요소에서 메타데이터를 제외하고 추출 시도
        if (!reviewText) {
          const clonedElement = $(element).clone();
          
          // 사용자 정보, 평점, 메타데이터 등 모든 비본문 요소 제거
          clonedElement.find('.avatar, .user-stats, .rating-overall, .review-rating, .review-helpful, .review-tag, .datetime, .post-header, a, img, .spoiler-warning, .hidden-spoiler').remove();
          
          // 더 구체적인 메타데이터 요소 제거 시도
          clonedElement.find('[class*="rating"], [class*="score"], [class*="header"], [class*="title"], .user-display').remove();
          
          reviewText = clonedElement.text().trim();
          reviewHtml = clonedElement.html()?.trim() || '';
          
          // 리뷰 내용에서 괄호로 둘러싸인 숫자 형태의 평점 제거 (예: "(8.5)")
          reviewText = reviewText.replace(/\(\d+(\.\d+)?\)/g, '').trim();
          
          console.log(`[직접 리뷰 크롤러] 전체 요소에서 리뷰 본문 추출: ${reviewText.substring(0, 50)}...`);
        }
        
        // 3. 내용이 아직도 없으면 더 적극적인 방법으로 추출
        if (!reviewText || reviewText.length < 20) {
          // 전체 요소에서 불필요한 정보 제거 시도
          const fullElement = $(element).clone();
          fullElement.find('h3, h4, .review-title, .post-header, .avatar, .rating-overall').remove();
          
          // 사용자 이름, 상태 등의 텍스트 제거
          const fullText = fullElement.text().trim();
          reviewText = fullText
            .replace(new RegExp(username, 'g'), '')
            .replace(/Completed|Watching|Dropped|Plan to Watch|On Hold|\d+\/\d+|\d+ of \d+/g, '')
            .replace(/Main Role|Support Role|Guest Role/g, '')
            .replace(/Overall:|Story:|Acting:|Music:|Rewatch:/gi, '')  // 평점 레이블 제거
            .replace(/\d+(\.\d+)?\/10/g, '')  // X/10 형태의 평점 제거
            .replace(/\s{2,}/g, ' ') // 연속된 공백 제거
            .trim();
          
          console.log(`[직접 리뷰 크롤러] 대체 방법으로 리뷰 본문 추출: ${reviewText.length}자`);
          
          if (reviewText) {
            reviewHtml = `<p>${reviewText}</p>`;
          }
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

        console.log(`[직접 리뷰 크롤러] 리뷰 텍스트 최종 길이: ${reviewText.length}자`);
        
        // 본문이 없는 경우 예외 처리
        if (!reviewText) {
          reviewText = "내용 없음";
          reviewHtml = "<p>내용 없음</p>";
          console.log(`[직접 리뷰 크롤러] 리뷰 본문을 추출하지 못했습니다.`);
        }
        
        // 리뷰 제목 추출
        let reviewTitle = '';
        const titleSelectors = [
          '.review-title', 
          'h3', 
          'h4', 
          '[itemprop="headline"]',
          '.post-header h1',
          '.post-header h2'
        ];
        
        for (const selector of titleSelectors) {
          const titleElement = $(element).find(selector).first();
          if (titleElement.length > 0) {
            reviewTitle = titleElement.text().trim();
            if (reviewTitle) {
              console.log(`[직접 리뷰 크롤러] 리뷰 제목 발견 (${selector}): ${reviewTitle}`);
              break;
            }
          }
        }
        
        // 제목이 없으면 리뷰 내용에서 첫 줄을 제목으로 사용
        if (!reviewTitle && reviewText && reviewText !== "내용 없음") {
          const firstLine = reviewText.split('\n')[0].trim();
          reviewTitle = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
          console.log(`[직접 리뷰 크롤러] 리뷰 첫 줄을 제목으로 사용: ${reviewTitle}`);
        } else if (!reviewTitle) {
          reviewTitle = `${username}의 리뷰`;
          console.log(`[직접 리뷰 크롤러] 기본 제목 사용: ${reviewTitle}`);
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
        
        console.log(`[직접 리뷰 크롤러] 리뷰 #${index + 1} 추출 완료: ${username}, 평점: ${overallRating}, 길이: ${reviewText.length}자`);
      } catch (reviewError) {
        console.error(`[직접 리뷰 크롤러] 리뷰 #${index + 1} 파싱 중 오류:`, reviewError);
      }
    });
    
    console.log(`[직접 리뷰 크롤러] 리뷰 페이지 파싱 완료: ${reviews.length}개 리뷰 추출 (최대 10개)`);
    return reviews;
    
  } catch (error) {
    console.error('[직접 리뷰 크롤러] 리뷰 페이지 파싱 중 오류:', error);
    return [];
  }
} 