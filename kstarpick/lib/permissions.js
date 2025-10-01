/**
 * 사용자가 특정 액션을 수행할 권한이 있는지 확인합니다.
 * @param {Object} user - 사용자 객체
 * @param {string} action - 확인할 액션 (ex: 'create', 'update', 'delete')
 * @param {string} resource - 대상 리소스 (ex: 'news', 'drama', 'tvfilm')
 * @returns {boolean} 권한 여부
 */
export const checkUserPermission = (user, action, resource) => {
  // 사용자가 없는 경우
  if (!user) return false;
  
  // admin은 모든 권한을 가짐
  if (user.role === 'admin') return true;
  
  // 리소스와 액션 조합에 따른 권한 체크 로직
  switch (resource) {
    case 'tvfilm':
      // 편집자는 TV/영화 콘텐츠 생성 및 수정 가능
      if (user.role === 'editor' && (action === 'create' || action === 'update')) {
        return true;
      }
      break;
    case 'news':
    case 'drama':
      // 편집자는 뉴스와 드라마 콘텐츠에 대한 모든 액션 가능
      if (user.role === 'editor') {
        return true;
      }
      break;
    case 'comment':
      // 모든 인증된 사용자는 자신의 댓글 생성/수정/삭제 가능
      if (action === 'create') {
        return true;
      }
      break;
  }
  
  // 기본적으로 권한 없음
  return false;
}; 