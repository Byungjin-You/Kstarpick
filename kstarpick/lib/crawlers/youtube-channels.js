/**
 * YouTube 채널 → 뉴스 기사 크롤러 설정
 *
 * 새 채널 추가 = channels 배열에 객체 하나 추가
 * 새 카테고리 추가 = PHOTO_CATEGORIES 배열에 객체 하나 추가
 * → 배포하면 크롤러 + Photo 페이지 모두 자동 반영
 * → 뉴스 1개 이상인 카테고리만 Photo 페이지에 표시
 */

// Photo 카테고리 (크롤러 분류 + Photo 페이지에서 공유)
const PHOTO_CATEGORIES = [
  { key: 'music-show', label: 'Music Show', tags: ['Show Champion', 'Music Core', 'Inkigayo', 'Music Bank', 'Music Show'], newsCategory: 'kpop' },
  { key: 'airport', label: 'Airport', tags: ['Airport'], newsCategory: 'celeb' },
  { key: 'festival', label: 'Festival & Concert', tags: ['Festival', 'Concert'], newsCategory: 'celeb' },
  { key: 'performance', label: 'Performance & Cover', tags: ['Performance', 'Cover'], newsCategory: 'kpop' },
  { key: 'fan-meeting', label: 'Fan Meeting', tags: ['Fan Meeting'], newsCategory: 'celeb' },
  { key: 'fashion', label: 'Fashion', tags: ['Fashion'], newsCategory: 'celeb' },
  { key: 'showcase', label: 'Showcase', tags: ['Showcase'], newsCategory: 'kpop' },
  { key: 'press-con', label: 'Press Conference', tags: ['Press Conference'], newsCategory: 'celeb' },
  { key: 'interview', label: 'Interview & Behind', tags: ['Interview', 'Behind the Scenes'], newsCategory: 'celeb' },
  { key: 'event', label: 'Event & Promotion', tags: ['Event', 'Promotion'], newsCategory: 'celeb' },
  { key: 'red-carpet', label: 'Red Carpet', tags: ['Red Carpet', 'Premiere'], newsCategory: 'celeb' },
  { key: 'anniversary', label: 'Anniversary', tags: ['Anniversary'], newsCategory: 'celeb' },
  { key: 'idol-moments', label: 'Idol Moments', tags: ['Idol Moments'], newsCategory: 'celeb' },
];

// 크롤러 분류용 키워드 (카테고리 key → 매칭 키워드)
// ⚠ 순서 중요: PHOTO_CATEGORIES 배열 순서대로 매칭되므로 구체적인 키워드는 앞쪽 카테고리에 배치
const CATEGORY_KEYWORDS = {
  'music-show': ['쇼챔피언', '음악중심', '인기가요', 'Show Champion', 'Music Bank', 'Music Core', 'MUSIC CORE', 'Inkigayo', '쇼챔', '미팬', '미챈'],
  'airport': ['출국', '입국', '출국길', '입국길', 'airport', 'departure', 'arrival', '공항', '인천공항', '김포공항'],
  'festival': ['축제', '콘서트', '버스킹', 'Festival', 'Concert', 'Busking', '페스티벌', '월드투어', 'World Tour'],
  'performance': ['cover', 'Cover', '댄스', 'Dance', 'choreo', 'Rehearsal', '리허설', 'Sound Check'],
  'fan-meeting': ['팬미팅', '사인회', 'Fan Meeting', 'Sign', '공개사인회', '팬사인'],
  'fashion': ['패션', '패션쇼', '코디', 'Fashion', '패션위크'],
  'showcase': ['쇼케이스', 'Showcase', '컴백', 'Comeback', '컴백 라인업'],
  'press-con': ['제작발표회', '제작보고회', '기자간담회', '제작발표', 'Press Conference', '영화발표회', '드라마발표회'],
  'interview': ['인터뷰', 'Interview', '비하인드', 'Behind', 'Making', '메이킹', 'behind the scenes'],
  'event': ['내한', '행사', 'Promotion', '이벤트', 'Event', '런칭', '시상식', 'Awards'],
  'red-carpet': ['레드카펫', 'Red Carpet', '시사회', 'Premiere', 'VIP시사회'],
  'anniversary': ['년 전', '기념', 'anniversary', '주년', '생일', 'Birthday'],
  // idol-moments는 매칭 키워드 없음 → 미분류 시 기본 카테고리
};

// 채널 목록
const channels = [
  {
    id: 'smts',
    channelId: 'UCi2gSRWFxaFeKPOe0wGfoPg',
    name: 'SMTS (Show Me The Star)',
    handle: '@smts708',
    url: 'https://www.youtube.com/@smts708',
    excludePatterns: [/^\[LIVE\]/i],
    defaultCategory: 'celeb',
    authorPool: ['Olivia', 'Ethan', 'Ava', 'Mason', 'Isabella', 'Logan'],
    enabled: true,
  },
  {
    id: 'tv10',
    channelId: 'UCY9QGuU9mBLBp_OCRNKeVSw',
    name: '티비텐 TV10',
    handle: '@_TV10',
    url: 'https://www.youtube.com/@_TV10/shorts',
    excludePatterns: [/^\[LIVE\]/i],
    defaultCategory: 'celeb',
    authorPool: ['Sophia', 'Liam', 'Emma', 'Noah', 'Mia', 'Lucas'],
    enabled: true,
  },
];

module.exports = { channels, PHOTO_CATEGORIES, CATEGORY_KEYWORDS };
