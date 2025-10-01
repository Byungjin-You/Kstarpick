/**
 * 이미지 업로드 기능을 처리하는 유틸리티 함수들
 */

/**
 * 이미지 파일을 서버에 업로드합니다.
 * @param {Array} files - 업로드할 파일 배열
 * @param {string} directory - 업로드 대상 디렉토리
 * @returns {Promise<Array>} 업로드된 이미지의 URL 배열
 */
export const uploadImages = async (files, directory = 'common') => {
  console.log(`이미지 ${files.length}개 업로드 시도 - 디렉토리: ${directory}`);
  
  // 실제 프로덕션 환경에서는 이미지를 서버나 클라우드 스토리지에 업로드하는 코드를 구현
  // 여기서는 임시 URL을 반환
  
  try {
    // 이미지 업로드 성공 시뮬레이션
    const uploadedUrls = files.map((file, index) => {
      // 파일이 URL 형태인 경우 그대로 반환
      if (typeof file === 'string' && (file.startsWith('http://') || file.startsWith('https://'))) {
        return file;
      }
      
      // 파일 객체인 경우 가상 URL 생성
      return `/images/${directory}/${Date.now()}-${index}.jpg`;
    });
    
    return uploadedUrls;
  } catch (error) {
    console.error('이미지 업로드 중 오류 발생:', error);
    throw new Error('이미지를 업로드하는 중 오류가 발생했습니다.');
  }
};

/**
 * 서버에서 이미지를 삭제합니다.
 * @param {Array} urls - 삭제할 이미지 URL 배열
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
export const deleteImages = async (urls) => {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return true;
  }
  
  console.log(`이미지 ${urls.length}개 삭제 시도`);
  
  try {
    // 이미지 삭제 성공 시뮬레이션
    return true;
  } catch (error) {
    console.error('이미지 삭제 중 오류 발생:', error);
    return false;
  }
}; 