// 한글 아티스트명 → 영문명 매핑
const KO_TO_EN = {
  "갓세븐": "GOT7", "골든차일드": "Golden Child", "김세정": "Kim Sejeong",
  "뉴비트": "NEWBEAT", "뉴이스트": "NU'EST", "더보이즈": "THE BOYZ",
  "데이식스": "DAY6", "드림캐쳐": "Dreamcatcher", "라이즈": "RIIZE",
  "레드벨벳": "Red Velvet", "루시": "LUCY", "르세라핌": "LE SSERAFIM",
  "리센느": "LiCENNE", "마마무": "MAMAMOO", "미야오": "MIYAO",
  "박지훈": "PARK JI HOON", "방탄소년단": "BTS", "베리베리": "VERIVERY",
  "베이비몬스터": "BABYMONSTER", "보이넥스트도어": "BOYNEXTDOOR",
  "브브걸": "Brave Girls", "블랙핑크": "BLACKPINK", "비투비": "BTOB",
  "빅톤": "VICTON", "샤이니": "SHINee", "세븐틴": "SEVENTEEN",
  "소녀시대": "Girls' Generation", "슈퍼주니어": "Super Junior",
  "스테이씨": "STAYC", "스트레이 키즈": "Stray Kids", "싸이커스": "xikers",
  "아스트로": "ASTRO", "아이들": "(G)I-DLE", "아이브": "IVE",
  "아이유": "IU", "아이즈원": "IZ*ONE", "아이콘": "iKON",
  "아일릿": "ILLIT", "알파드라이브원": "ALPHA DRIVE ONE", "앤팀": "&TEAM",
  "에이비식스": "AB6IX", "에이티즈": "ATEEZ", "에이핑크": "Apink",
  "에잇턴": "8TURN", "엑소": "EXO", "엑스디너리 히어로즈": "Xdinary Heroes",
  "엔믹스": "NMIXX", "엔플라잉": "N.Flying", "여자친구": "GFRIEND",
  "영파씨": "YOUNG POSSE", "오마이걸": "OH MY GIRL", "온앤오프": "ONF",
  "우주소녀": "WJSN", "원어스": "ONEUS", "위너": "WINNER",
  "위클리": "Weeekly", "유니스": "UNIS", "이달의 소녀": "LOONA",
  "이븐": "EVEN", "이즈나": "izna", "이펙스": "EPEX",
  "임영웅": "Lim Young Woong", "전소미": "JEON SOMI", "정세운": "JEONG SEWOON",
  "제로베이스원": "ZEROBASEONE", "최예나": "YENA", "카드": "KARD",
  "케플러": "Kep1er", "코르티스": "CORTIS", "크래비티": "CRAVITY",
  "클라씨": "CLASS:y", "키스오브라이프": "KISS OF LIFE", "키키": "KIKI",
  "킥플립": "KickFlip", "투모로우바이투게더": "TOMORROW X TOGETHER",
  "투어스": "TWS", "트레저": "TREASURE", "트리플에스": "tripleS",
  "트와이스": "TWICE", "퍼플키스": "Purple Kiss", "펜타곤": "PENTAGON",
  "프로미스나인": "fromis_9", "플레이브": "PLAVE", "피원하모니": "P1Harmony",
  "피프티피프티": "FIFTY FIFTY", "하성운": "Ha Sung Woon",
  "하이라이트": "Highlight", "하이키": "H1-KEY", "하츠투하츠": "HEARTS2HEARTS",
};

function toEnglishName(koreanName) {
  if (!koreanName) return koreanName;
  // 정확히 매칭
  if (KO_TO_EN[koreanName]) return KO_TO_EN[koreanName];
  // 한글이 없으면 이미 영어
  if (!/[가-힣]/.test(koreanName)) return koreanName;
  // 매칭 안 되면 원본 반환
  return koreanName;
}

function translateTitle(title) {
  if (!title || !/[가-힣]/.test(title)) return title;

  let t = title;

  // N주년 → Nth Anniversary
  const ordinal = (n) => {
    const num = parseInt(n);
    const mod100 = num % 100;
    if (mod100 >= 11 && mod100 <= 13) return num + 'th';
    const mod10 = num % 10;
    if (mod10 === 1) return num + 'st';
    if (mod10 === 2) return num + 'nd';
    if (mod10 === 3) return num + 'rd';
    return num + 'th';
  };

  // 발매 N주년
  t = t.replace(/(.+?)\s*발매\s*(\d+)주년/, (_, song, n) => `${song.trim()} ${ordinal(n)} Release Anniversary`);
  // 데뷔 N주년
  t = t.replace(/(.+?)\s*데뷔\s*(\d+)주년/, (_, name, n) => `${toEnglishName(name.trim())} ${ordinal(n)} Debut Anniversary`);
  // 데뷔년 N주년
  t = t.replace(/(.+?)\s*데뷔년\s*(\d+)주년/, (_, name, n) => `${toEnglishName(name.trim())} ${ordinal(n)} Debut Anniversary`);
  // 유닛 데뷔 N주년
  t = t.replace(/(.+?)\s*유닛\s*데뷔\s*(\d+)주년/, (_, name, n) => `${toEnglishName(name.trim())} Unit ${ordinal(n)} Debut Anniversary`);
  // 데뷔일
  t = t.replace(/(.+?)\s*유닛\s*데뷔일/, (_, name) => `${toEnglishName(name.trim())} Unit Debut Anniversary`);
  t = t.replace(/(.+?)\s*데뷔일/, (_, name) => `${toEnglishName(name.trim())} Debut Anniversary`);
  // 데뷔 N일
  t = t.replace(/(.+?)\s*데뷔\s*(\d+)일/, (_, name, n) => `${toEnglishName(name.trim())} ${n} Days Since Debut`);
  // 솔로 데뷔 N주년
  t = t.replace(/(.+?)\s*솔로\s*데뷔\s*(\d+)주년/, (_, name, n) => `${toEnglishName(name.trim())} Solo ${ordinal(n)} Debut Anniversary`);
  // 입사 N주년
  t = t.replace(/(.+?)\s*입사\s*(\d+)주년/, (_, name, n) => `${toEnglishName(name.trim())} ${ordinal(n)} Anniversary at Company`);
  // 입사일
  t = t.replace(/(.+?)\s*([\w]+)\s*입사일!?/, (_, name, company) => `${toEnglishName(name.trim())} ${company} Joining Anniversary`);
  // 첫 음악방송 1위 기념일
  t = t.replace(/첫\s*음악방송\s*1위\s*기념일!?/, '1st Music Show Win Anniversary');
  // 이번 주 <XXX> 1위
  t = t.replace(/이번\s*주\s*<(.+?)>\s*1위\s*🎉?/, (_, show) => `This Week #1 on ${show}`);
  // XXX 생일
  t = t.replace(/(.+?)\s*생일/, (_, name) => `${toEnglishName(name.trim())} Birthday`);
  // 발매 1주년 (앞에 곡명)
  t = t.replace(/발매\s*(\d+)주년/, (_, n) => `${ordinal(n)} Release Anniversary`);

  // 남은 한글 아티스트명 변환
  t = t.replace(/[가-힣]+/g, (match) => toEnglishName(match) || match);

  return t;
}

module.exports = { KO_TO_EN, toEnglishName, translateTitle };
