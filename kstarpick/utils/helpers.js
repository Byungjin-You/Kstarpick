/**
 * HTML 엔티티를 디코딩합니다.
 * 예: '&#39;'와 같은 HTML 엔티티를 해당 문자로 변환합니다.
 * @param {string} text - 디코딩할 텍스트
 * @returns {string} - 디코딩된 텍스트
 */
export function decodeHtmlEntities(text) {
  if (!text) return '';
  
  // 브라우저 환경
  if (typeof document !== 'undefined') {
    const element = document.createElement('div');
    element.innerHTML = text;
    return element.textContent || element.innerText || '';
  } 
  // 서버 환경
  else {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }
} 