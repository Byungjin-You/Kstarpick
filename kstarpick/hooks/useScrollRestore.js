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
  const { delays = [50, 150, 400], deps = [] } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isBack = sessionStorage.getItem(flagKey);
    const savedPos = sessionStorage.getItem(scrollKey);

    if (isBack !== 'true' || !savedPos) return;

    const scrollPos = parseInt(savedPos, 10);
    if (isNaN(scrollPos) || scrollPos <= 0) {
      sessionStorage.removeItem(flagKey);
      return;
    }

    let restored = false;

    const restoreScroll = () => {
      if (restored) return;
      const current = window.scrollY || document.documentElement.scrollTop || 0;
      if (Math.abs(current - scrollPos) < 10) {
        restored = true;
        return;
      }
      window.scrollTo(0, scrollPos);
      document.documentElement.scrollTop = scrollPos;
      document.body.scrollTop = scrollPos;
    };

    delays.forEach(delay => setTimeout(restoreScroll, delay));

    // 플래그 제거
    sessionStorage.removeItem(flagKey);

    // cleanup 없음 - React Strict Mode(development)에서 cleanup이 타이머를 취소하면
    // 두 번째 mount에서 플래그가 이미 제거되어 복원 불가
  }, deps);
}
