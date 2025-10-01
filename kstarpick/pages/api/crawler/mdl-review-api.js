import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../utils/mongodb';
import fetch from 'node-fetch';

// 설정
const DEBUG_MODE = true; // 항상 디버그 모드 활성화

/**
 * MyDramalist 리뷰 API 호출 크롤러
 */
export default async function handler(req, res) {
  // API 요청 시작 로그
  console.log('================ MDL 리뷰 API 크롤러 요청 시작 ================');
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
    console.log('[MDL 리뷰 API] 권한 체크 생략됨 (DEBUG_MODE)');

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

    // MyDramalist URL에서 드라마 ID 추출
    const mdlIdMatch = url.match(/\/(\d+)[-\w]*\/reviews?/);
    const mdlId = mdlIdMatch ? mdlIdMatch[1] : null;

    if (!mdlId) {
      return res.status(400).json({ 
        success: false, 
        message: 'MyDramalist URL에서 ID를 추출할 수 없습니다.'
      });
    }

    console.log(`[MDL 리뷰 API] 드라마 ID: ${mdlId}, 내부 dramaId: ${dramaId}`);

    // MyDramalist 리뷰 API 호출
    const reviews = await fetchMdlReviews(mdlId);
    console.log(`[MDL 리뷰 API] ${reviews.length}개 리뷰 가져옴`);

    // 리뷰 저장
    if (reviews.length > 0) {
      await saveReviews(reviews, dramaId);
    }

    return res.status(200).json({
      success: true,
      message: `${reviews.length}개의 리뷰를 가져왔습니다.`,
      data: {
        reviews
      }
    });
  } catch (error) {
    console.error('[MDL 리뷰 API] 오류 발생:', error);
    return res.status(500).json({
      success: false,
      message: '리뷰 가져오기 중 오류가 발생했습니다.',
      error: error.message,
      stack: DEBUG_MODE ? error.stack : undefined
    });
  } finally {
    console.log('================ MDL 리뷰 API 크롤러 요청 종료 ================');
  }
}

/**
 * MyDramalist 리뷰 API에서 리뷰 가져오기
 */
async function fetchMdlReviews(mdlId) {
  try {
    console.log(`[MDL 리뷰 API] MDL ID ${mdlId}에 대한 리뷰 요청 중...`);
    
    // API URL
    const apiUrl = `https://mydramalist.com/v1/titles/${mdlId}/reviews?page=1&limit=10&sort=newest`;
    
    // 헤더 설정
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://mydramalist.com',
      'Referer': `https://mydramalist.com/${mdlId}-title/reviews`,
      'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not-A.Brand";v="24"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // API 요청
    console.log(`[MDL 리뷰 API] API 요청: ${apiUrl}`);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers
    });
    
    // 응답 확인
    if (!response.ok) {
      console.error(`[MDL 리뷰 API] API 요청 실패: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[MDL 리뷰 API] 오류 응답: ${errorText}`);
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }
    
    // JSON 응답 파싱
    const data = await response.json();
    console.log(`[MDL 리뷰 API] 응답 받음, 데이터 유형: ${typeof data}`);
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error('[MDL 리뷰 API] 유효하지 않은 API 응답 형식');
      console.error('응답 데이터:', JSON.stringify(data, null, 2));
      return [];
    }
    
    // 리뷰 데이터 변환
    const reviews = data.data.map(review => transformReview(review, mdlId));
    
    console.log(`[MDL 리뷰 API] ${reviews.length}개 리뷰 변환 완료`);
    return reviews;
  } catch (error) {
    console.error('[MDL 리뷰 API] 리뷰 가져오기 오류:', error);
    throw error;
  }
}

/**
 * API 응답을 리뷰 객체로 변환
 */
function transformReview(apiReview, mdlId) {
  try {
    const reviewId = `mdl-${apiReview.id}`;
    const username = apiReview.user?.name || 'Unknown User';
    const userProfileUrl = apiReview.user?.url || '';
    const userImage = apiReview.user?.avatar_url || '';
    
    // 리뷰 상태
    const status = apiReview.watch_status || 'Completed';
    
    // 에피소드 정보
    const watchedEpisodes = apiReview.watched_episodes || 0;
    const totalEpisodes = apiReview.total_episodes || 0;
    
    // 날짜 변환
    let createdAt;
    try {
      createdAt = apiReview.created_at ? new Date(apiReview.created_at) : new Date();
    } catch (e) {
      createdAt = new Date();
    }
    
    // 평점 정보
    const overallRating = parseFloat(apiReview.score) || 0;
    
    // 세부 평점
    const storyRating = parseFloat(apiReview.story_score) || 0;
    const actingRating = parseFloat(apiReview.acting_score) || 0;
    const musicRating = parseFloat(apiReview.music_score) || 0;
    const rewatchRating = parseFloat(apiReview.rewatch_value_score) || 0;
    
    // 리뷰 제목/내용
    const reviewTitle = apiReview.subject || `${username}의 리뷰`;
    const reviewText = apiReview.body || '';
    
    // HTML 형식의 본문 (있는 경우)
    const reviewHtml = apiReview.body_html || reviewText;
    
    // 기타 정보
    const helpfulCount = apiReview.like_count || 0;
    const commentCount = apiReview.total_comments || 0;
    
    // 리뷰 URL
    const reviewUrl = apiReview.url || `https://mydramalist.com/${mdlId}/reviews/${apiReview.id}`;
    
    return {
      reviewId,
      username,
      userProfileUrl,
      userImage,
      status,
      watchedEpisodes,
      totalEpisodes,
      createdAt,
      rating: overallRating,
      storyRating,
      actingRating,
      musicRating,
      rewatchRating,
      title: reviewTitle,
      reviewText,
      reviewHtml,
      helpfulCount,
      commentCount,
      reviewUrl,
      sourceUrl: `https://mydramalist.com/${mdlId}/reviews`,
      crawledAt: new Date()
    };
  } catch (error) {
    console.error('[MDL 리뷰 API] 리뷰 변환 오류:', error);
    return null;
  }
}

/**
 * 리뷰 데이터를 DB에 저장
 */
async function saveReviews(reviews, dramaId) {
  try {
    const { db } = await connectToDatabase();
    
    // 유효한 리뷰만 필터링
    const validReviews = reviews.filter(review => review !== null);
    
    // 리뷰 데이터 처리 및 저장
    for (const review of validReviews) {
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
        console.log(`[MDL 리뷰 API] 기존 리뷰 업데이트: ${review.reviewId}`);
      } else {
        // 새 리뷰 추가
        await db.collection('reviews').insertOne(review);
        console.log(`[MDL 리뷰 API] 새 리뷰 추가: ${review.reviewId}`);
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
    
    console.log(`[MDL 리뷰 API] 드라마 정보 업데이트 완료: 리뷰 ${reviewCount}개, 평균 평점 ${averageRating.toFixed(1)}`);
  } catch (dbError) {
    console.error('[MDL 리뷰 API] 데이터베이스 처리 중 오류:', dbError);
    throw dbError;
  }
} 