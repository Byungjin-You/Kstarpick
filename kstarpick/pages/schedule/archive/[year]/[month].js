import SchedulePage from '../../index';

export default SchedulePage;

// /schedule/archive/YYYY/MM — 월 아카이브 라우트
//   - 현재월이면 canonical을 /schedule 로 (evergreen 페이지로 권위 집중)
//   - 현재월 ±6개월 외부는 noindex (검색 색인 부풀림 방지)
export async function getServerSideProps({ params, res }) {
  const { fetchSchedulesForMonth } = await import('../../../../lib/scheduleSSR');
  const year = parseInt(params.year, 10);
  const month = parseInt(params.month, 10);

  // 유효성 검사: 2020-01 ~ 현재+24개월 범위 외는 404
  if (!year || !month || month < 1 || month > 12 || year < 2020) {
    return { notFound: true };
  }
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const curY = kstNow.getUTCFullYear();
  const curM = kstNow.getUTCMonth() + 1;
  const monthsFromNow = (year - curY) * 12 + (month - curM);
  if (monthsFromNow > 24) {
    return { notFound: true };
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  const initialSchedules = await fetchSchedulesForMonth(year, month);
  const isCurrent = year === curY && month === curM;
  const mm = String(month).padStart(2, '0');

  return {
    props: {
      initialSchedules,
      initialYear: year,
      initialMonth: month,
      // 현재월이면 evergreen /schedule 로 캐노니컬 집중, 아니면 자기 자신
      canonicalUrl: isCurrent ? '/schedule' : `/schedule/archive/${year}/${mm}`,
      // 현재월 ±6개월 외부는 색인 제외
      noindex: Math.abs(monthsFromNow) > 6
    }
  };
}
