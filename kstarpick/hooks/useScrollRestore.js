import { useEffect } from 'react';

/**
 * 뒤로가기 시 스크롤 위치를 복원하는 공통 훅.
 *
 * @param {string} scrollKey - sessionStorage 스크롤 위치 키 (e.g., 'dramaScrollPosition')
 * @param {string} flagKey - sessionStorage 뒤로가기 플래그 키 (e.g., 'isBackToDrama')
 * @param {object} [options]
 * @param {number[]} [options.delays] - 복원 시도 딜레이 (ms)
 * @param {any[]} [options.deps] - 추가 useEffect 의존성
 */
export default function useScrollRestore(scrollKey, flagKey, options = {}) {
  const { delays = [50, 150, 300, 500, 800, 1200, 2000], deps = [] } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isBack = sessionStorage.getItem(flagKey);
    const wasBack = sessionStorage.getItem('_navWasBack');
    const savedPos = sessionStorage.getItem(scrollKey);

    // 플래그가 있고 + 실제 뒤로가기였을 때만 복원
    if (isBack !== 'true' || wasBack !== 'true' || !savedPos) {
      // 순방향 도착이면 플래그만 제거 (스크롤 값은 유지)
      if (isBack === 'true' && wasBack !== 'true') {
        sessionStorage.removeItem(flagKey);
      }
      return;
    }

    const scrollPos = parseInt(savedPos, 10);
    if (isNaN(scrollPos)) {
      sessionStorage.removeItem(flagKey);
      return;
    }

    const restoreScroll = () => {
      window.scrollTo(0, scrollPos);
      document.documentElement.scrollTop = scrollPos;
      document.body.scrollTop = scrollPos;
    };

    // 즉시 + 여러 딜레이로 복원 (DOM 높이 변화 대응)
    restoreScroll();
    delays.forEach(delay => setTimeout(restoreScroll, delay));

    // 플래그 제거
    sessionStorage.removeItem(flagKey);

    // cleanup 없음 - React Strict Mode(development)에서 cleanup이 타이머를 취소하면
    // 두 번째 mount에서 플래그가 이미 제거되어 복원 불가
  }, deps);
}
