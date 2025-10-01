/**
 * 숫자를 천 단위 구분자와 함께 포맷팅합니다.
 * @param {number} number - 포맷팅할 숫자
 * @param {number} digits - 소수점 자릿수
 * @returns {string} 포맷팅된 숫자 문자열
 */
export const formatNumber = (number, digits = 0) => {
  if (number === undefined || number === null) return '0';
  
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(number);
};

/**
 * 숫자를 단축된 형식(K, M, B)으로 포맷팅합니다.
 * @param {number} number - 포맷팅할 숫자
 * @param {number} digits - 소수점 자릿수 (기본값: 1)
 * @returns {string} 포맷팅된 문자열 (예: 1.2K, 3.5M)
 */
export const formatCompactNumber = (number, digits = 1) => {
  if (number === undefined || number === null || isNaN(number)) return '0';
  number = Number(number);
  
  // 정확한 소수점 계산을 위한 함수
  const formatDecimal = (value) => {
    // 소수점이 .0으로 끝나면 제거
    return value.toFixed(digits).replace(/\.0+$/, '');
  };
  
  const trillion = 1000000000000;
  const billion = 1000000000;
  const million = 1000000;
  const thousand = 1000;
  
  if (number >= trillion) {
    return `${formatDecimal(number / trillion)}T`;
  } else if (number >= billion) {
    return `${formatDecimal(number / billion)}B`;
  } else if (number >= million) {
    return `${formatDecimal(number / million)}M`;
  } else if (number >= thousand) {
    return `${formatDecimal(number / thousand)}K`;
  }
  
  return number.toLocaleString();
};

/**
 * 날짜를 원하는 형식으로 포맷팅합니다.
 * @param {string|Date} date - 포맷팅할 날짜
 * @param {string} locale - 로케일 (기본값: 'ko-KR')
 * @returns {string} 포맷팅된 날짜 문자열
 */
export const formatDate = (date, locale = 'ko-KR') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * 시간을 상대적인 형식(예: '3일 전')으로 변환합니다.
 * @param {string|Date} date - 변환할 날짜
 * @returns {string} 상대적인 시간 문자열
 */
export const timeAgo = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  // 1분 미만
  if (diffInSeconds < 60) {
    return '방금 전';
  }
  
  // 1시간 미만
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  }
  
  // 1일 미만
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  }
  
  // 1주일 미만
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  }
  
  // 1개월 미만
  if (diffInDays < 30) {
    return `${Math.floor(diffInDays / 7)}주 전`;
  }
  
  // 1년 미만
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}개월 전`;
  }
  
  // 1년 이상
  return `${Math.floor(diffInMonths / 12)}년 전`;
}; 