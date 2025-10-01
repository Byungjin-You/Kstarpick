import { getSession } from 'next-auth/react';

// 개발 환경 확인 (process.env.NODE_ENV가 'development'인 경우 true)
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 복사된 리뷰 텍스트에서 리뷰 정보를 자동으로 추출하는 API 엔드포인트
 * 사용자가 MyDramalist 등에서 복사해온 리뷰 텍스트를 자동으로 파싱하여 구조화된 정보로 변환
 */
export default async function handler(req, res) {
  try {
    // 개발 환경이 아닌 경우에만 인증 확인
    if (!isDevelopment) {
      // 관리자 인증 확인
      const session = await getSession({ req });
      if (!session || session.user.role !== 'admin') {
        return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' });
      }
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
    }
    
    const { rawText } = req.body;
    
    if (!rawText) {
      return res.status(400).json({ success: false, message: '리뷰 텍스트가 필요합니다.' });
    }
    
    // 리뷰 텍스트를 구조화된 정보로 파싱
    const extractedInfo = extractReviewInfo(rawText);
    
    return res.status(200).json({
      success: true,
      message: '리뷰 정보를 추출했습니다.',
      data: extractedInfo
    });
    
  } catch (error) {
    console.error('[리뷰 정보 추출] 오류:', error);
    return res.status(500).json({ success: false, message: '리뷰 정보 추출 중 오류가 발생했습니다.', error: error.message });
  }
}

/**
 * 복사된 리뷰 텍스트에서 리뷰 정보를 추출
 * @param {string} rawText - 복사된 리뷰 텍스트
 * @returns {object} - 구조화된 리뷰 정보
 */
function extractReviewInfo(rawText) {
  // 기본 정보 초기화
  const extractedInfo = {
    username: '',
    userProfileUrl: '',
    rating: 0,
    title: '',
    reviewText: '',
    storyRating: 0,
    actingRating: 0,
    musicRating: 0,
    rewatchRating: 0
  };
  
  // 줄 단위로 분리
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // 전체 텍스트에서 평점 추출
  const ratingMatches = [
    ...rawText.matchAll(/(\d+(\.\d+)?)\s*\/\s*10/g),
    ...rawText.matchAll(/Rating:\s*(\d+(\.\d+)?)/gi),
    ...rawText.matchAll(/Score:\s*(\d+(\.\d+)?)/gi),
    ...rawText.matchAll(/rated\s+it\s+(\d+(\.\d+)?)/gi)
  ];
  
  if (ratingMatches.length > 0) {
    extractedInfo.rating = parseFloat(ratingMatches[0][1]);
  }
  
  // 사용자 이름 추출
  // 1. "rated it" 패턴을 찾아 username 추출
  const ratedItMatch = rawText.match(/^([A-Za-z0-9_\-.]+)\s+rated\s+it/);
  if (ratedItMatch) {
    extractedInfo.username = ratedItMatch[1];
  } else {
    // 2. "Review by" 패턴 추출
    const reviewByMatch = rawText.match(/Review\s+by\s+([A-Za-z0-9_\-.]+)/i);
    if (reviewByMatch) {
      extractedInfo.username = reviewByMatch[1];
    } else {
      // 3. 첫 줄이 짧고 단어가 1-3개면 사용자 이름일 가능성이 높음
      if (lines.length > 0 && lines[0].length < 30) {
        const words = lines[0].split(/\s+/);
        if (words.length <= 3 && words[0].match(/^[A-Za-z0-9_\-.]+$/)) {
          extractedInfo.username = words[0];
        }
      }
    }
  }
  
  // 제목과 리뷰 내용 추출
  let titleFound = false;
  let reviewTextLines = [];
  let potentialTitleLine = -1;
  
  // 1. 먼저 평점 패턴이 있는 텍스트 라인을 정리 (Rating: X/10을 제거하고 문장을 복원)
  for (let i = 0; i < lines.length; i++) {
    // Rating: X/10 패턴이 줄 중간에 있는지 확인 (여러 변형 고려)
    let ratingRemoved = false;

    // "Rating: 8.5/10" 패턴 찾기
    const ratingPattern = lines[i].match(/(.*?)\b(?:Rating|Score|rated)(?:\s+it)?(?:\s*:\s*)(\d+(?:\.\d+)?)(?:\/(?:10|\d+))?(.*)$/i);
    if (ratingPattern) {
      // 평점 앞뒤 텍스트 추출
      const beforeRating = ratingPattern[1] || '';
      const afterRating = ratingPattern[3] || '';
      
      // 평점을 제외한 텍스트로 줄 재구성
      lines[i] = (beforeRating + ' ' + afterRating).trim();
      ratingRemoved = true;
    }
    
    // 다른 형태의 평점 패턴: "deserves X/10" 패턴 찾기
    if (!ratingRemoved) {
      const deservePattern = lines[i].match(/(.*?)\bdeserves\b.*?(\d+(?:\.\d+)?)(?:\/(?:10|\d+))?(.*)$/i);
      if (deservePattern) {
        const beforeRating = deservePattern[1] || '';
        const afterRating = deservePattern[3] || '';
        
        // 평점을 제외한 텍스트로 줄 재구성
        lines[i] = (beforeRating + ' ' + afterRating).trim();
      }
    }
  }
  
  // 제목 후보 찾기: 첫 번째 의미 있는 텍스트 줄
  for (let i = 0; i < lines.length; i++) {
    // 평점 정보, 사용자 이름 줄 건너뛰기
    if (lines[i].match(/^\s*rating|^\s*score|^\s*overall|^\s*story|^\s*acting|^\s*music|^\s*rewatch/i) ||
        lines[i].match(/rated\s+it|review\s+by/i) ||
        (extractedInfo.username && lines[i].startsWith(extractedInfo.username))) {
      continue;
    }
    
    // 제목이 따옴표로 둘러싸인 경우
    const quotedTitleMatch = lines[i].match(/^["'](.+)["']$/);
    if (quotedTitleMatch) {
      extractedInfo.title = quotedTitleMatch[1];
      titleFound = true;
      reviewTextLines = lines.slice(i + 1);
      break;
    }
    
    // 첫 번째 의미 있는 텍스트 줄을 제목 후보로 선택
    if (potentialTitleLine === -1) {
      potentialTitleLine = i;
      
      // 이 줄이 명확한 제목 형식이면 (30자 미만, 마침표 없음)
      if (lines[i].length < 50 && !lines[i].includes('.') && lines.length > i + 1) {
        extractedInfo.title = lines[i];
        titleFound = true;
        reviewTextLines = lines.slice(i + 1);
        break;
      }
    }
  }
  
  // 제목을 찾지 못했지만 제목 후보가 있는 경우
  if (!titleFound && potentialTitleLine !== -1) {
    // 제목 후보가 긴 경우, 첫 문장만 제목으로 사용
    const candidateText = lines[potentialTitleLine];
    const firstSentenceMatch = candidateText.match(/^([^.!?]+[.!?])/);
    
    if (firstSentenceMatch) {
      extractedInfo.title = firstSentenceMatch[1].trim();
      // 첫 문장을 제외한 나머지를 리뷰 시작으로
      const remainingText = candidateText.substring(firstSentenceMatch[0].length).trim();
      reviewTextLines = [remainingText, ...lines.slice(potentialTitleLine + 1)];
    } else {
      // 문장 구분자가 없는 경우, 최대 50자까지만 제목으로
      if (candidateText.length > 50) {
        extractedInfo.title = candidateText.substring(0, 47) + '...';
      } else {
        extractedInfo.title = candidateText;
      }
      reviewTextLines = lines.slice(potentialTitleLine + 1);
    }
  }
  
  // 리뷰 텍스트 추출 (평점 정보가 포함된 줄 제외)
  if (reviewTextLines.length > 0) {
    // 평점 정보 및 메타데이터 줄 필터링
    reviewTextLines = reviewTextLines.filter(line => {
      return !(line.match(/^\s*(overall|story|acting|music|rewatch|rating|score)/i) && 
              line.match(/\d+(\.\d+)?/)) &&
              !line.match(/read more|show more|see more|continue reading/i);
    });
    
    extractedInfo.reviewText = reviewTextLines.join('\n\n');
  } else if (!titleFound && lines.length > 0) {
    // 제목도 리뷰 텍스트도 식별되지 않았다면 전체 내용을 리뷰로 취급
    extractedInfo.title = "Review";
    
    // 메타데이터 제거
    const contentLines = lines.filter(line => {
      return !(line.match(/^\s*(overall|story|acting|music|rewatch|rating|score)/i) && 
              line.match(/\d+(\.\d+)?/)) &&
              !line.match(/read more|show more|see more|continue reading/i) &&
              !(extractedInfo.username && line.startsWith(extractedInfo.username)) &&
              !line.match(/rated\s+it|review\s+by/i);
    });
    
    extractedInfo.reviewText = contentLines.join('\n\n');
  }
  
  // 세부 평점 정보 추출
  const storyMatch = rawText.match(/Story:\s*(\d+(\.\d+)?)/i);
  const actingMatch = rawText.match(/Acting[^:]*:\s*(\d+(\.\d+)?)/i);
  const musicMatch = rawText.match(/Music:\s*(\d+(\.\d+)?)/i);
  const rewatchMatch = rawText.match(/Rewatch[^:]*:\s*(\d+(\.\d+)?)/i);
  
  if (storyMatch) extractedInfo.storyRating = parseFloat(storyMatch[1]);
  if (actingMatch) extractedInfo.actingRating = parseFloat(actingMatch[1]);
  if (musicMatch) extractedInfo.musicRating = parseFloat(musicMatch[1]);
  if (rewatchMatch) extractedInfo.rewatchRating = parseFloat(rewatchMatch[1]);
  
  // 추가 정리 및 기본값 설정
  
  // 사용자 이름이 없으면 "Unknown User"로 설정
  if (!extractedInfo.username) {
    extractedInfo.username = "Unknown User";
  }
  
  // 평점이 0이면 5로 기본값 설정 (중간값)
  if (extractedInfo.rating === 0) {
    extractedInfo.rating = 5;
  }
  
  // 제목이 없으면 "Review"로 설정
  if (!extractedInfo.title) {
    extractedInfo.title = "Review";
  }
  
  // 내용이 너무 짧으면 제목과 내용 역할 교환 시도
  if (extractedInfo.reviewText.length < 10 && extractedInfo.title.length > 20) {
    extractedInfo.reviewText = extractedInfo.title;
    extractedInfo.title = "Review";
  }
  
  return extractedInfo;
}

// 함수 노출 (테스트 목적)
export { extractReviewInfo }; 