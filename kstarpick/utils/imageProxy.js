// 외부 이미지 URL을 프록시 URL로 변환
export function convertToProxyUrl(originalUrl) {
  if (!originalUrl) return '';
  
  // 이미 우리 도메인의 URL이면 그대로 반환
  if (originalUrl.includes('/api/proxy/image')) {
    return originalUrl;
  }
  
  // Soompi 이미지 URL인 경우 프록시 URL로 변환
  if (originalUrl.includes('soompi.io') || originalUrl.includes('soompi.com')) {
    return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
  }
  
  // 다른 외부 URL도 프록시를 통해 처리
  return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
}

// 이미지 URL에서 파일명 추출
export function extractImageFilename(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    return filename || 'image';
  } catch (error) {
    return 'image';
  }
}

// 이미지 확장자 추출
export function getImageExtension(url) {
  const filename = extractImageFilename(url);
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.pop().toLowerCase();
  }
  return 'jpg'; // 기본값
}

// 안전한 이미지 URL 생성 (fallback 포함)
export function createSafeImageUrl(originalUrl, fallbackUrl = '/images/default-news.jpg') {
  if (!originalUrl) return fallbackUrl;
  
  try {
    return convertToProxyUrl(originalUrl);
  } catch (error) {
    console.error('이미지 URL 변환 실패:', error);
    return fallbackUrl;
  }
} 