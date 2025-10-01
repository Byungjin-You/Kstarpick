import { getSession } from 'next-auth/react';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';
// import { getServerSession } from "next-auth";
// import { authOptions } from "../auth/[...nextauth]";
import { getToken } from "next-auth/jwt";

// 스텔스 플러그인 활성화
puppeteer.use(StealthPlugin());

// 비동기 대기 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 랜덤 지연시간 생성 (봇 탐지 회피용)
const randomDelay = () => {
  const delay = Math.floor(Math.random() * 1500) + 500;
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * 스텔스 모드로 MyDramalist 영화 목록 크롤링하는 API
 */
export default async function handler(req, res) {
  // API 요청 시작 로그
  console.log('================ 영화 스텔스 크롤러 API 요청 시작 ================');
  console.log('요청 메소드:', req.method);
  console.log('요청 본문:', req.body);

  // POST 메소드 체크
  if (req.method !== 'POST') {
    console.log('================ 영화 스텔스 크롤러 API 요청 완료 ================');
    return res.status(405).json({ message: '허용되지 않는 요청 방식입니다.' });
  }

  try {
    // 개발 환경에서는 인증 검사 건너뛰기
    console.log('인증 체크 생략 - 개발 환경 우선 지원');
    
    const { url, mode } = req.body;

    if (!url) {
      console.log('================ 영화 스텔스 크롤러 API 요청 완료 ================');
      return res.status(400).json({ message: 'URL이 필요합니다.' });
    }

    // 목록 모드에서는 크롤링 결과 반환
    if (mode === 'list') {
      const data = await crawlMovieList(url);
      console.log('================ 영화 스텔스 크롤러 API 요청 완료 ================');
      return res.status(200).json({ message: '영화 목록 크롤링 성공', data });
    } 
    // 상세 모드에서는 영화 상세 정보 크롤링
    else if (mode === 'detail') {
      const data = await crawlMovieDetail(url);
      console.log('================ 영화 스텔스 크롤러 API 요청 완료 ================');
      return res.status(200).json({ message: '영화 상세 정보 크롤링 성공', data });
    }
    // 모드가 지정되지 않은 경우
    else {
      console.log('================ 영화 스텔스 크롤러 API 요청 완료 ================');
      return res.status(400).json({ message: '유효한 모드가 아닙니다: list 또는 detail을 지정하세요.' });
    }
  } catch (error) {
    console.error('영화 크롤링 오류:', error);
    console.log('================ 영화 스텔스 크롤러 API 요청 완료 ================');
    return res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
  }
}

let browser;

// 스텔스 모드로 MyDramalist 영화 목록 크롤링하는 함수
async function crawlMovieList(url) {
  console.log(`[영화 스텔스 크롤러] 목록 모드로 ${url} 크롤링 시작`);

  try {
    // 스텔스 브라우저 설정
    console.log('[영화 스텔스 크롤러] 브라우저 설정 시작');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-dev-shm-usage'
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    
    const page = await browser.newPage();
    
    // 브라우저 지문 숨기기
    await page.evaluateOnNewDocument(() => {
      // WebDriver 감지 우회
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // 자동화 감지 방지
      window.navigator.chrome = {
        runtime: {},
      };
      
      // 플러그인 숨기기
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
              enabledPlugin: Plugin,
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin",
          },
          {
            0: {
              type: "application/pdf",
              suffixes: "pdf",
              description: "",
              enabledPlugin: Plugin,
            },
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer",
          },
        ],
      });
    });
    
    console.log('[영화 스텔스 크롤러] 브라우저 설정 완료');

    // 페이지 로딩
    console.log(`[영화 스텔스 크롤러] 페이지 로딩 중... (${url})`);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log(`[영화 스텔스 크롤러] 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();

    // 인간과 같은 스크롤 동작
    console.log(`[영화 스텔스 크롤러] 인간과 유사한 스크롤 동작 수행 중...`);
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      let scrollPosition = 0;
      
      while (scrollPosition < scrollHeight) {
        // 랜덤한 거리로 스크롤
        const scrollStep = Math.floor(Math.random() * 300) + 100;
        scrollPosition += scrollStep;
        window.scrollTo(0, scrollPosition);
        
        // 랜덤한 시간 동안 대기 (300-600ms)
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 300));
        
        // 가끔 약간 위로 스크롤 (더 자연스러운 동작을 위해)
        if (Math.random() > 0.8 && scrollPosition > viewportHeight) {
          const upScroll = Math.floor(Math.random() * 100) + 50;
          scrollPosition -= upScroll;
          window.scrollTo(0, scrollPosition);
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100));
        }
      }
    });

    // HTML 추출
    console.log('[영화 스텔스 크롤러] HTML 콘텐츠 추출 중...');
    const html = await page.content();
    console.log(`[영화 스텔스 크롤러] HTML 데이터 크기: ${html.length} 바이트`);

    if (!html || html.length < 1000) {
      throw new Error('HTML이 비어있거나 너무 짧습니다. 크롤링에 실패했습니다.');
    }

    const $ = cheerio.load(html);
    const movieElements = $('div[id^="mdl-"]');
    const movies = [];
    let nextPage = null;
    
    console.log(`[영화 스텔스 크롤러] 총 ${movieElements.length}개 영화 요소 발견`);
    
    movieElements.each((index, element) => {
      const id = $(element).attr('id').replace('mdl-', '');
      const titleElement = $(element).find('h6.text-primary.title a');
      
      if (!titleElement.length) return;
      
      const title = titleElement.text().trim();
      const url = 'https://mydramalist.com' + titleElement.attr('href');
      
      const metaElement = $(element).find('span.text-muted');
      const metaText = metaElement.length ? metaElement.text().trim() : '';
      const metaParts = metaText.split(' - ');
      
      const category = 'movie';
      let year = null;
      
      // 연도 추출
      if (metaParts[1]) {
        const yearMatch = metaParts[1].match(/(\d{4})/);
        if (yearMatch) year = parseInt(yearMatch[1], 10);
      }
      
      // 이미지 추출
      const imageElement = $(element).find('img.img-responsive');
      let image = imageElement.length ? imageElement.attr('src') : null;
      
      // 평점 추출
      const ratingElement = $(element).find('span.score');
      let rating = null;
      if (ratingElement.length) {
        const ratingText = ratingElement.text().trim();
        if (ratingText && !isNaN(parseFloat(ratingText))) {
          rating = parseFloat(ratingText);
        }
      }
      
      movies.push({
        id,
        title,
        url,
        image,
        category,
        year,
        rating
      });
    });
    
    // 다음 페이지 URL 추출
    const paginationNext = $('ul.pagination li.next:not(.disabled) a');
    if (paginationNext.length) {
      const nextPageHref = paginationNext.attr('href');
      if (nextPageHref) {
        nextPage = 'https://mydramalist.com' + nextPageHref;
      }
    }
    
    return {
      movies,
      nextPage
    };
  } catch (error) {
    console.error('[영화 스텔스 크롤러] 오류 발생:', error);
    return {
      success: false,
      message: '영화 목록 크롤링 중 오류가 발생했습니다.',
      error: error.message
    };
  } finally {
    // 브라우저 종료
    if (browser) {
      console.log('[영화 스텔스 크롤러] 브라우저 종료');
      await browser.close();
    }
  }
}

// 스텔스 모드로 MyDramalist 영화 상세 정보 크롤링하는 함수
async function crawlMovieDetail(url) {
  console.log(`[영화 스텔스 크롤러] 상세 모드로 ${url} 크롤링 시작`);

  try {
    // 스텔스 브라우저 설정
    console.log('[영화 스텔스 크롤러] 브라우저 설정 시작');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-dev-shm-usage'
      ],
      ignoreHTTPSErrors: true,
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    
    const page = await browser.newPage();
    
    // 브라우저 지문 숨기기
    await page.evaluateOnNewDocument(() => {
      // WebDriver 감지 우회
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // 자동화 감지 방지
      window.navigator.chrome = {
        runtime: {},
      };
      
      // 플러그인 숨기기
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
              enabledPlugin: Plugin,
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin",
          },
          {
            0: {
              type: "application/pdf",
              suffixes: "pdf",
              description: "",
              enabledPlugin: Plugin,
            },
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer",
          },
        ],
      });
    });
    
    console.log('[영화 스텔스 크롤러] 브라우저 설정 완료');

    // 영화 상세 정보 페이지 로딩
    console.log(`[영화 스텔스 크롤러] 페이지 로딩 중... (${url})`);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log(`[영화 스텔스 크롤러] 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();

    // 인간과 같은 스크롤 동작
    console.log(`[영화 스텔스 크롤러] 인간과 유사한 스크롤 동작 수행 중...`);
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      let scrollPosition = 0;
      
      while (scrollPosition < scrollHeight) {
        // 랜덤한 거리로 스크롤
        const scrollStep = Math.floor(Math.random() * 300) + 100;
        scrollPosition += scrollStep;
        window.scrollTo(0, scrollPosition);
        
        // 랜덤한 시간 동안 대기 (300-600ms)
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 300));
        
        // 가끔 약간 위로 스크롤 (더 자연스러운 동작을 위해)
        if (Math.random() > 0.8 && scrollPosition > viewportHeight) {
          const upScroll = Math.floor(Math.random() * 100) + 50;
          scrollPosition -= upScroll;
          window.scrollTo(0, scrollPosition);
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100));
        }
      }
    });

    // HTML 추출
    console.log('[영화 스텔스 크롤러] HTML 콘텐츠 추출 중...');
    const html = await page.content();
    console.log(`[영화 스텔스 크롤러] HTML 데이터 크기: ${html.length} 바이트`);

    if (!html || html.length < 1000) {
      throw new Error('HTML이 비어있거나 너무 짧습니다. 크롤링에 실패했습니다.');
    }

    // 메인 페이지 파싱
    const $ = cheerio.load(html);
    const title = $('h1.film-title').text().trim();
    
    // 상세 영화 정보
    const movieInfo = {};
    movieInfo.title = title;
    movieInfo.category = 'movie';
    
    // 기본 정보 수집 - show-detailsxss 영역
    console.log('[영화 스텔스 크롤러] 기본 정보 추출 시작');
    
    // 원제목(Native Title) 추출
    const nativeTitleItem = $('.show-detailsxss li.list-item:contains("Native Title:")');
    if (nativeTitleItem.length) {
      const nativeTitle = nativeTitleItem.find('a').text().trim();
      movieInfo.originalTitle = nativeTitle || null;
      console.log(`[영화 스텔스 크롤러] 원제목: ${nativeTitle}`);
    } else {
      const originalTitleElem = $('p.mdl-aka span.mdl-md-not-hidden');
      movieInfo.originalTitle = originalTitleElem.length ? originalTitleElem.text().trim() : null;
    }
    
    // 대체 제목(Also Known As) 추출
    const akaItem = $('.show-detailsxss li.list-item:contains("Also Known As:")');
    if (akaItem.length) {
      const akaTitles = [];
      akaItem.find('a').each((i, elem) => {
        const akaTitle = $(elem).text().trim();
        if (akaTitle) akaTitles.push(akaTitle);
      });
      movieInfo.alternativeTitles = akaTitles;
      console.log(`[영화 스텔스 크롤러] 대체 제목: ${akaTitles.join(', ')}`);
    }
    
    // 영어 제목 추출/설정
    // 1. 주 제목이 영어인지 확인
    const isEnglishTitle = (title) => {
      if (!title) return false;
      // 한글 문자가 포함되어 있지 않은지 확인
      const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(title);
      // 영어 문자가 포함되어 있는지 확인
      const hasEnglish = /[a-zA-Z]/.test(title);
      // 한글이 없고, 영어가 있으면 영어 제목으로 간주
      return !hasKorean && hasEnglish;
    };
    
    if (isEnglishTitle(movieInfo.title)) {
      movieInfo.englishTitle = movieInfo.title;
      console.log(`[영화 스텔스 크롤러] 영어 제목(주 제목): ${movieInfo.englishTitle}`);
    } 
    // 2. 주 제목이 영어가 아니면 대체 제목에서 영어 제목 찾기
    else if (movieInfo.alternativeTitles && movieInfo.alternativeTitles.length > 0) {
      const englishAkaTitle = movieInfo.alternativeTitles.find(title => isEnglishTitle(title));
      if (englishAkaTitle) {
        movieInfo.englishTitle = englishAkaTitle;
        console.log(`[영화 스텔스 크롤러] 영어 제목(대체 제목): ${movieInfo.englishTitle}`);
      }
    }
    
    // 3. 그래도 없으면 제목에서 괄호 안 내용이 영어인지 확인 (예: "한글제목 (English Title)")
    if (!movieInfo.englishTitle) {
      const titleParenthesisMatch = movieInfo.title.match(/\(([^)]+)\)/);
      if (titleParenthesisMatch && titleParenthesisMatch[1] && isEnglishTitle(titleParenthesisMatch[1])) {
        movieInfo.englishTitle = titleParenthesisMatch[1].trim();
        console.log(`[영화 스텔스 크롤러] 영어 제목(괄호 내): ${movieInfo.englishTitle}`);
      }
    }
    
    // 감독(Director) 추출
    const directorItem = $('.show-detailsxss li.list-item:contains("Director:")');
    if (directorItem.length) {
      const director = directorItem.find('a.text-primary').text().trim();
      movieInfo.director = director || null;
      console.log(`[영화 스텔스 크롤러] 감독: ${director}`);
    }
    
    // 장르(Genres) 추출
    const genresItem = $('.show-detailsxss li.list-item.show-genres');
    if (genresItem.length) {
      const genres = [];
      genresItem.find('a.text-primary').each((i, elem) => {
        const genre = $(elem).text().trim();
        if (genre) genres.push(genre);
      });
      movieInfo.genres = genres;
      console.log(`[영화 스텔스 크롤러] 장르: ${genres.join(', ')}`);
    }
    
    // 태그(Tags) 추출
    const tagsItem = $('.show-detailsxss li.list-item.show-tags');
    if (tagsItem.length) {
      const tags = [];
      tagsItem.find('a.text-primary').each((i, elem) => {
        const tag = $(elem).text().trim();
        if (tag) tags.push(tag);
      });
      movieInfo.tags = tags;
      console.log(`[영화 스텔스 크롤러] 태그: ${tags.join(', ')}`);
    }
    
    // 기타 정보 추출 (Country, Type, Release Date, Duration, Content Rating)
    $('.show-detailsxss ul.list li.list-item').each((i, elem) => {
      const labelElem = $(elem).find('b.inline');
      if (!labelElem.length) return;
      
      const label = labelElem.text().trim().replace(':', '');
      const valueText = $(elem).text().replace(labelElem.text(), '').trim();
      
      if (label === 'Country') {
        movieInfo.country = valueText.replace(/\s*\i[^\i]*$/, '').trim(); // 국기 이모지 제거
        console.log(`[영화 스텔스 크롤러] 국가: ${movieInfo.country}`);
      } else if (label === 'Release Date') {
        movieInfo.releaseDate = valueText;
        // 연도 추출
        const yearMatch = valueText.match(/(\d{4})/);
        if (yearMatch) movieInfo.year = parseInt(yearMatch[1], 10);
        console.log(`[영화 스텔스 크롤러] 개봉일: ${movieInfo.releaseDate}`);
      } else if (label === 'Duration') {
        movieInfo.duration = valueText;
        movieInfo.runtime = valueText;
        console.log(`[영화 스텔스 크롤러] 상영 시간: ${movieInfo.duration}`);
      } else if (label === 'Content Rating') {
        movieInfo.contentRating = valueText;
        movieInfo.ageRating = valueText;
        console.log(`[영화 스텔스 크롤러] 시청 등급: ${movieInfo.contentRating}`);
      }
    });
    
    // 줄거리 추출
    const synopsisElement = $('.show-synopsis p');
    if (synopsisElement.length) {
      // 첫 번째 span 요소의 텍스트를 가져옵니다 (이 안에 줄거리가 있습니다)
      const synopsisText = synopsisElement.find('span').first().text().trim();
      // "Edit Translation" 등의 텍스트를 제거
      const cleanedSynopsis = synopsisText.replace(/\s*\(Source:.*?\)$/, '').trim();
      
      movieInfo.synopsis = cleanedSynopsis || null;
      movieInfo.summary = cleanedSynopsis || null;
      console.log(`[영화 스텔스 크롤러] 줄거리: ${cleanedSynopsis ? cleanedSynopsis.substring(0, 100) + '...' : '없음'}`);
    }
    
    // 평점 추출
    const ratingElement = $('.col-film-rating .box');
    if (ratingElement.length) {
      const ratingText = ratingElement.text().trim();
      movieInfo.rating = parseFloat(ratingText) || 0;
      console.log(`[영화 스텔스 크롤러] 평점: ${movieInfo.rating}`);
    }
    
    // 시청자 수 추출
    const watchersElem = $('.hfs:contains("# of Watchers:")');
    if (watchersElem.length) {
      const watchersText = watchersElem.find('b').text().trim();
      movieInfo.watchers = parseInt(watchersText.replace(/,/g, ''), 10) || 0;
      console.log(`[영화 스텔스 크롤러] 시청자 수: ${movieInfo.watchers}`);
    }
    
    // 리뷰 수 추출
    const reviewsElem = $('.hfs:contains("Reviews:")');
    if (reviewsElem.length) {
      const reviewsText = reviewsElem.find('a').text().trim();
      const reviewCount = parseInt(reviewsText.replace(/[^0-9]/g, ''), 10) || 0;
      movieInfo.reviewCount = reviewCount;
      console.log(`[영화 스텔스 크롤러] 리뷰 수: ${movieInfo.reviewCount}`);
    }
    
    // 포스터 이미지
    const posterElement = $('div.film-cover img.img-responsive');
    if (posterElement.length) {
      movieInfo.poster = posterElement.attr('src') || null;
      console.log(`[영화 스텔스 크롤러] 포스터 이미지: ${movieInfo.poster}`);
    } else {
      const altPosterElement = $('div.box-body img.img-responsive');
      movieInfo.poster = altPosterElement.length ? altPosterElement.attr('src') : null;
    }
    
    // 배경 이미지 (배너)
    try {
      console.log('[영화 스텔스 크롤러] 배경 이미지 추출 시도');
      
      // 배경 이미지 추출 방법 1: 페이지 스타일에서 추출
      const bgImageStyle = $('.film-detail').attr('style');
      if (bgImageStyle) {
        const bgImageMatch = bgImageStyle.match(/background-image:url\(['"]?([^'"]+)['"]?\)/i);
        if (bgImageMatch && bgImageMatch[1]) {
          movieInfo.bannerImage = bgImageMatch[1];
          console.log(`[영화 스텔스 크롤러] 배경 이미지 찾음 (스타일): ${movieInfo.bannerImage}`);
        }
      }
      
      // 배경 이미지 추출 방법 2: 상단 배너 이미지
      if (!movieInfo.bannerImage) {
        const bannerImageElement = $('.film-banner img');
        if (bannerImageElement.length) {
          movieInfo.bannerImage = bannerImageElement.attr('src');
          console.log(`[영화 스텔스 크롤러] 배경 이미지 찾음 (배너): ${movieInfo.bannerImage}`);
        }
      }
      
      // 배경 이미지 추출 방법 3: film-cover 요소 이미지
      if (!movieInfo.bannerImage) {
        const filmCoverElement = $('.film-cover img.img-responsive');
        if (filmCoverElement.length) {
          movieInfo.bannerImage = filmCoverElement.attr('src');
          console.log(`[영화 스텔스 크롤러] 배경 이미지 찾음 (film-cover): ${movieInfo.bannerImage}`);
        }
      }
      
      // 배경 이미지 추출 방법 4: 대체 이미지 요소
      if (!movieInfo.bannerImage) {
        const altBannerElement = $('.film-header-image, .film-cover');
        if (altBannerElement.length) {
          const bgImageUrl = altBannerElement.css('background-image') || 
                          altBannerElement.attr('style')?.match(/background-image:url\(['"]?([^'"]+)['"]?\)/i)?.[1];
          
          if (bgImageUrl) {
            movieInfo.bannerImage = bgImageUrl.replace(/^url\(['"]?|['"]?\)$/g, '');
            console.log(`[영화 스텔스 크롤러] 배경 이미지 찾음 (대체): ${movieInfo.bannerImage}`);
          }
        }
      }
      
      // 배경 이미지가 없으면 포스터를 사용
      if (!movieInfo.bannerImage && movieInfo.poster) {
        movieInfo.bannerImage = movieInfo.poster;
        console.log('[영화 스텔스 크롤러] 배경 이미지 없음, 포스터 이미지를 배경으로 사용');
      }
    } catch (error) {
      console.error('[영화 스텔스 크롤러] 배경 이미지 추출 중 오류:', error.message);
    }
    
    // 기본 출연진 정보 (메인 페이지에서 가져올 수 있는 정도)
    movieInfo.cast = {
      mainRoles: [],
      supportRoles: []
    };
    
    // 메인 역할 배우 추출
    $('div.box-body ul.list li').each((i, elem) => {
      const actorElement = $(elem).find('a.text-primary');
      if (!actorElement.length) return;
      
      const actorName = actorElement.text().trim();
      const actorUrl = 'https://mydramalist.com' + actorElement.attr('href');
      
      const roleElement = $(elem).find('div.text-muted small');
      const roleName = roleElement.length ? roleElement.text().trim() : '';
      
      const imgElement = $(elem).find('img.img-responsive');
      const imgSrc = imgElement.length ? imgElement.attr('src') : null;
      
      // 역할 유형 결정 (Main Role 또는 Support Role)
      const roleTypeElement = $(elem).find('small.text-muted');
      let roleType = 'Main Role'; // 기본값
      
      if (roleTypeElement.length) {
        const roleTypeText = roleTypeElement.text().trim();
        if (roleTypeText === 'Support Role') {
          roleType = 'Support Role';
        }
      }
      
      const actor = {
        name: actorName,
        role: roleName,
        url: actorUrl,
        image: imgSrc,
        roleType: roleType
      };
      
      if (roleType === 'Main Role') {
        movieInfo.cast.mainRoles.push(actor);
        console.log(`[영화 스텔스 크롤러] 메인 페이지에서 주연 추가: ${actorName} - ${roleName}`);
      } else {
        movieInfo.cast.supportRoles.push(actor);
        console.log(`[영화 스텔스 크롤러] 메인 페이지에서 조연 추가: ${actorName} - ${roleName}`);
      }
    });

    // *** 출연진 페이지 크롤링 ***
    const castUrl = `${url}/cast`;
    console.log(`[영화 스텔스 크롤러] 출연진 페이지 로딩 중... (${castUrl})`);
    
    await page.goto(castUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    console.log(`[영화 스텔스 크롤러] 출연진 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();

    // 인간과 같은 스크롤 동작 수행
    console.log('[영화 스텔스 크롤러] 자연스러운 스크롤 시작');
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      let scrollPosition = 0;
      
      // 랜덤한 속도와 간격으로 스크롤
      while (scrollPosition < scrollHeight) {
        // 랜덤한 스크롤 거리 (100~300px)
        const scrollStep = Math.floor(Math.random() * 200) + 100;
        scrollPosition += scrollStep;
        window.scrollTo(0, scrollPosition);
        
        // 랜덤한 대기 시간 (300~600ms)
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 300));
        
        // 20% 확률로 약간 위로 스크롤 (인간같은 행동 시뮬레이션)
        if (Math.random() > 0.8 && scrollPosition > viewportHeight) {
          const upScroll = Math.floor(Math.random() * 100) + 50;
          scrollPosition -= upScroll;
          window.scrollTo(0, scrollPosition);
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200) + 100));
        }
        
        // 10% 확률로 잠시 멈춤 (컨텐츠 읽는 시뮬레이션)
        if (Math.random() > 0.9) {
          await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 500) + 500));
        }
      }
      
      // 페이지의 끝에 도달하면 잠시 대기 (컨텐츠 확인)
      await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 300) + 500));
      
      // 마지막에 약간 위로 스크롤 (관심있는 부분 다시 확인하는 시뮬레이션)
      const finalScroll = Math.floor(Math.random() * 200) + 100;
      window.scrollTo(0, scrollHeight - finalScroll);
    });

    console.log('[영화 스텔스 크롤러] 자연스러운 스크롤 완료');

    // 추가 로딩 시간 부여 (AJAX 로딩 컨텐츠 대기)
    await sleep(Math.floor(Math.random() * 500) + 500);

    // 출연진 페이지 HTML 추출
    console.log('[영화 스텔스 크롤러] 출연진 페이지 HTML 추출 중...');
    const castHtml = await page.content();
    console.log(`[영화 스텔스 크롤러] 출연진 HTML 데이터 크기: ${castHtml.length} 바이트`);

    if (castHtml && castHtml.length > 1000) {
      // 출연진 페이지 파싱
      const $cast = cheerio.load(castHtml);
      
      // 영화 크레딧 정보
      const credits = {
        directors: [],
        producers: [],
        writers: [],
        mainCast: [],
        supportCast: [],
        guestCast: [],
        others: []
      };
      
      // 새로운 HTML 구조에 맞게 감독 정보 추출
      console.log('[영화 스텔스 크롤러] 감독 정보 추출 시도 (새로운 방식)');
      $cast('div.box-body h3.header:contains("Director")').each((i, headerElem) => {
        const directorList = $cast(headerElem).nextAll('ul.list').first();
        
        directorList.find('li.list-item').each((j, elem) => {
          const directorElement = $cast(elem).find('a.text-primary');
          if (!directorElement.length) return;
          
          const directorName = directorElement.find('b').text().trim();
          if (!directorName) return;
          
          const directorUrl = 'https://mydramalist.com' + directorElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          credits.directors.push({
            name: directorName,
            role: 'Director',
            url: directorUrl,
            image: imgSrc
          });
          
          console.log(`[영화 스텔스 크롤러] 감독 추가: ${directorName}`);
        });
      });
      
      // 이전 방식(테이블) 으로도 시도
      if (credits.directors.length === 0) {
        console.log('[영화 스텔스 크롤러] 기존 방식으로 감독 정보 추출 시도');
        $cast('div.box div.box-header:contains("Directors")').closest('div.box').find('table.cast-table tbody tr').each((i, elem) => {
          const personElement = $cast(elem).find('td.cast-profile a');
          if (!personElement.length) return;
          
          const personName = personElement.find('b').text().trim();
          if (!personName) return;
          
          const personUrl = 'https://mydramalist.com' + personElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          credits.directors.push({
            name: personName,
            role: 'Director',
            url: personUrl,
            image: imgSrc
          });
        });
      }
      
      console.log(`[영화 스텔스 크롤러] 감독 정보: ${credits.directors.length}명`);
      
      // 새로운 HTML 구조에 맞게 주연 배우 정보 추출
      console.log('[영화 스텔스 크롤러] 주연 배우 정보 추출 시도 (새로운 방식)');
      $cast('div.box-body h3.header:contains("Main Role")').each((i, headerElem) => {
        const mainRoleList = $cast(headerElem).nextAll('ul.list').first();
        
        mainRoleList.find('li.list-item').each((j, elem) => {
          const actorElement = $cast(elem).find('a.text-primary');
          if (!actorElement.length) return;
          
          const actorName = actorElement.find('b').text().trim();
          if (!actorName) return;
          
          const actorUrl = 'https://mydramalist.com' + actorElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          const roleElement = $cast(elem).find('small[title]');
          const roleName = roleElement.length ? roleElement.text().trim() : '';
          
          const roleTypeElement = $cast(elem).find('small.text-muted');
          const roleType = roleTypeElement.length ? roleTypeElement.text().trim() : 'Main Role';
          
          credits.mainCast.push({
            name: actorName,
            role: roleName,
            roleType: roleType,
            url: actorUrl,
            image: imgSrc
          });
          
          console.log(`[영화 스텔스 크롤러] 주연 배우 추가: ${actorName} - ${roleName}`);
        });
      });
      
      // 기존 방식으로도 시도
      if (credits.mainCast.length === 0) {
        console.log('[영화 스텔스 크롤러] 기존 방식으로 주연 배우 정보 추출 시도');
        $cast('div.box[id="main-content"] div.col-lg-8 div.box-body table.cast-table tbody tr').each((i, elem) => {
          const actorElement = $cast(elem).find('td.cast-profile a');
          if (!actorElement.length) return;
          
          const actorName = actorElement.find('b').text().trim();
          if (!actorName) return;
          
          const actorUrl = 'https://mydramalist.com' + actorElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          const roleElement = $cast(elem).find('td.cast-role a');
          const roleName = roleElement.length ? roleElement.text().trim() : '';
          
          const roleType = $cast(elem).find('span.badge').text().trim();
          
          credits.mainCast.push({
            name: actorName,
            role: roleName,
            roleType: roleType,
            url: actorUrl,
            image: imgSrc
          });
        });
      }

      // 새로운 HTML 구조에 맞게 조연 배우 정보 추출
      console.log('[영화 스텔스 크롤러] 조연 배우 정보 추출 시도 (새로운 방식)');
      $cast('div.box-body h3.header:contains("Support Role")').each((i, headerElem) => {
        // 특정 h3 헤더 다음에 있는 모든 ul.list를 찾아서 처리
        let currentElement = $cast(headerElem).next();
        let continueSearching = true;
        
        while (continueSearching && currentElement.length) {
          // ul.list를 찾으면 처리
          if (currentElement.is('ul.list')) {
            currentElement.find('li.list-item').each((j, elem) => {
              const actorElement = $cast(elem).find('a.text-primary');
              if (!actorElement.length) return;
              
              const actorName = actorElement.find('b').text().trim();
              if (!actorName) return;
              
              const actorUrl = 'https://mydramalist.com' + actorElement.attr('href');
              
              const imgElement = $cast(elem).find('img.img-responsive');
              const imgSrc = imgElement.length ? imgElement.attr('src') : null;
              
              const roleElement = $cast(elem).find('small[title]');
              const roleName = roleElement.length ? roleElement.text().trim() : '';
              
              const roleTypeElement = $cast(elem).find('small.text-muted');
              const roleType = roleTypeElement.length ? roleTypeElement.text().trim() : 'Support Role';
              
              credits.supportCast.push({
                name: actorName,
                role: roleName,
                roleType: roleType,
                url: actorUrl,
                image: imgSrc
              });
              
              console.log(`[영화 스텔스 크롤러] 조연 배우 추가: ${actorName} - ${roleName}`);
            });
            
            // 다음 요소로 이동
            currentElement = currentElement.next();
          } 
          // 다른 헤더를 만나면 중단
          else if (currentElement.is('h3.header')) {
            continueSearching = false;
          }
          // 그 외의 경우 다음 요소로 이동
          else {
            currentElement = currentElement.next();
          }
        }
      });
      
      // 모든 Support Role을 가진 li.list-item을 찾는 대체 방법 
      if (credits.supportCast.length === 0 || credits.supportCast.length < 7) {
        console.log('[영화 스텔스 크롤러] 조연 배우 정보 추가 추출 시도');
        $cast('li.list-item').each((i, elem) => {
          // 이미 등록된 배우인지 확인하기 위한 배열
          const existingNames = credits.mainCast.map(actor => actor.name).concat(
            credits.supportCast.map(actor => actor.name)
          );
          
          const roleTypeElement = $cast(elem).find('small.text-muted');
          if (roleTypeElement.length && roleTypeElement.text().trim() === 'Support Role') {
            const actorElement = $cast(elem).find('a.text-primary');
            if (!actorElement.length) return;
            
            const actorName = actorElement.find('b').text().trim();
            if (!actorName || existingNames.includes(actorName)) return;
            
            const actorUrl = 'https://mydramalist.com' + actorElement.attr('href');
            
            const imgElement = $cast(elem).find('img.img-responsive');
            const imgSrc = imgElement.length ? imgElement.attr('src') : null;
            
            const roleElement = $cast(elem).find('small[title]');
            const roleName = roleElement.length ? roleElement.text().trim() : '';
            
            credits.supportCast.push({
              name: actorName,
              role: roleName,
              roleType: 'Support Role',
              url: actorUrl,
              image: imgSrc
            });
            
            console.log(`[영화 스텔스 크롤러] 추가 조연 배우 추가: ${actorName} - ${roleName}`);
          }
        });
      }
      
      // 기존 방식으로도 시도
      if (credits.supportCast.length === 0) {
        console.log('[영화 스텔스 크롤러] 기존 방식으로 조연 배우 정보 추출 시도');
        $cast('div.box[id="supporting-content"] div.col-lg-8 div.box-body table.cast-table tbody tr').each((i, elem) => {
          const actorElement = $cast(elem).find('td.cast-profile a');
          if (!actorElement.length) return;
          
          const actorName = actorElement.find('b').text().trim();
          if (!actorName) return;
          
          const actorUrl = 'https://mydramalist.com' + actorElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          const roleElement = $cast(elem).find('td.cast-role a');
          const roleName = roleElement.length ? roleElement.text().trim() : '';
          
          const roleType = $cast(elem).find('span.badge').text().trim();
          
          credits.supportCast.push({
            name: actorName,
            role: roleName,
            roleType: roleType,
            url: actorUrl,
            image: imgSrc
          });
        });
      }

      // 게스트 배우 및 기타 역할 (Bit part 등)
      console.log('[영화 스텔스 크롤러] 게스트/기타 배우 정보 추출 시도 (새로운 방식)');
      $cast('div.box-body h3.header:contains("Bit part"), div.box-body h3.header:contains("Guest")').each((i, headerElem) => {
        const guestRoleList = $cast(headerElem).nextAll('ul.list').first();
        
        guestRoleList.find('li.list-item').each((j, elem) => {
          const actorElement = $cast(elem).find('a.text-primary');
          if (!actorElement.length) return;
          
          const actorName = actorElement.find('b').text().trim();
          if (!actorName) return;
          
          const actorUrl = 'https://mydramalist.com' + actorElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          const roleElement = $cast(elem).find('small[title]');
          const roleName = roleElement.length ? roleElement.text().trim() : '';
          
          const roleTypeElement = $cast(elem).find('small.text-muted');
          const roleType = roleTypeElement.length ? roleTypeElement.text().trim() : 'Bit part';
          
          credits.guestCast.push({
            name: actorName,
            role: roleName,
            roleType: roleType,
            url: actorUrl,
            image: imgSrc
          });
          
          console.log(`[영화 스텔스 크롤러] 기타 배우 추가: ${actorName} - ${roleName}`);
        });
      });
      
      // 새로운 HTML 구조에 맞게 작가 정보 추출
      console.log('[영화 스텔스 크롤러] 작가 정보 추출 시도 (새로운 방식)');
      $cast('div.box-body h3.header:contains("Screenwriter"), div.box-body h3.header:contains("Writer")').each((i, headerElem) => {
        const writerList = $cast(headerElem).nextAll('ul.list').first();
        
        writerList.find('li.list-item').each((j, elem) => {
          const writerElement = $cast(elem).find('a.text-primary');
          if (!writerElement.length) return;
          
          const writerName = writerElement.find('b').text().trim();
          if (!writerName) return;
          
          const writerUrl = 'https://mydramalist.com' + writerElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          credits.writers.push({
            name: writerName,
            role: 'Screenwriter',
            url: writerUrl,
            image: imgSrc
          });
          
          console.log(`[영화 스텔스 크롤러] 작가 추가: ${writerName}`);
        });
      });
      
      // 기존 방식으로도 시도
      if (credits.writers.length === 0) {
        console.log('[영화 스텔스 크롤러] 기존 방식으로 작가 정보 추출 시도');
        $cast('div.box div.box-header:contains("Screenwriters")').closest('div.box').find('table.cast-table tbody tr').each((i, elem) => {
          const personElement = $cast(elem).find('td.cast-profile a');
          if (!personElement.length) return;
          
          const personName = personElement.find('b').text().trim();
          if (!personName) return;
          
          const personUrl = 'https://mydramalist.com' + personElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          credits.writers.push({
            name: personName,
            role: 'Screenwriter',
            url: personUrl,
            image: imgSrc
          });
        });
      }
      
      console.log(`[영화 스텔스 크롤러] 작가 정보: ${credits.writers.length}명`);

      // 새로운 HTML 구조에 맞게 프로듀서 정보 추출
      console.log('[영화 스텔스 크롤러] 프로듀서 정보 추출 시도 (새로운 방식)');
      $cast('div.box-body h3.header:contains("Producer")').each((i, headerElem) => {
        const producerList = $cast(headerElem).nextAll('ul.list').first();
        
        producerList.find('li.list-item').each((j, elem) => {
          const producerElement = $cast(elem).find('a.text-primary');
          if (!producerElement.length) return;
          
          const producerName = producerElement.find('b').text().trim();
          if (!producerName) return;
          
          const producerUrl = 'https://mydramalist.com' + producerElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          credits.producers.push({
            name: producerName,
            role: 'Producer',
            url: producerUrl,
            image: imgSrc
          });
          
          console.log(`[영화 스텔스 크롤러] 프로듀서 추가: ${producerName}`);
        });
      });
      
      // 기존 방식으로도 시도
      if (credits.producers.length === 0) {
        console.log('[영화 스텔스 크롤러] 기존 방식으로 프로듀서 정보 추출 시도');
        $cast('div.box div.box-header:contains("Producers")').closest('div.box').find('table.cast-table tbody tr').each((i, elem) => {
          const personElement = $cast(elem).find('td.cast-profile a');
          if (!personElement.length) return;
          
          const personName = personElement.find('b').text().trim();
          if (!personName) return;
          
          const personUrl = 'https://mydramalist.com' + personElement.attr('href');
          
          const imgElement = $cast(elem).find('img.img-responsive');
          const imgSrc = imgElement.length ? imgElement.attr('src') : null;
          
          credits.producers.push({
            name: personName,
            role: 'Producer',
            url: personUrl,
            image: imgSrc
          });
        });
      }
      
      console.log(`[영화 스텔스 크롤러] 프로듀서 정보: ${credits.producers.length}명`);
      console.log(`[영화 스텔스 크롤러] 주연 배우 정보: ${credits.mainCast.length}명`);
      console.log(`[영화 스텔스 크롤러] 조연 배우 정보: ${credits.supportCast.length}명`);
      console.log(`[영화 스텔스 크롤러] 게스트 배우 정보: ${credits.guestCast.length}명`);

      // 크레딧 정보를 영화 정보에 추가
      movieInfo.credits = credits;
      
      // 기존 출연진 정보 업데이트
      movieInfo.cast.mainRoles = credits.mainCast.length > 0 ? credits.mainCast : movieInfo.cast.mainRoles;
      movieInfo.cast.supportRoles = credits.supportCast.length > 0 ? credits.supportCast : movieInfo.cast.supportRoles;
      
      // 기본 형태와 호환성을 위해 cast도 설정
      movieInfo.cast = {
        mainRoles: movieInfo.cast.mainRoles,
        supportRoles: movieInfo.cast.supportRoles
      };
      
      // 추가 정보 저장
      movieInfo.director = credits.directors.map(d => d.name).join(', ');
      movieInfo.writers = credits.writers.map(w => w.name).join(', ');
      movieInfo.producers = credits.producers.map(p => p.name).join(', ');
      
      console.log(`[영화 스텔스 크롤러] 출연진 정보 추출 완료: 감독 ${credits.directors.length}명, 작가 ${credits.writers.length}명, 주연 ${credits.mainCast.length}명, 조연 ${credits.supportCast.length}명`);
    }
    
    // 감독 정보 추출 - 메인 페이지에서 찾기
    const director = [];
    $('div.box-body dl.dl-horizontal dt').each((i, elem) => {
      const label = $(elem).text().trim();
      if (label.toLowerCase().includes('director')) {
        const directorElement = $(elem).next('dd');
        directorElement.find('a').each((j, dirElem) => {
          const directorName = $(dirElem).text().trim();
          if (directorName) {
            director.push(directorName);
          }
        });
      }
    });
    
    // 작가 정보 추출 - 메인 페이지에서 찾기
    const writers = [];
    $('div.box-body dl.dl-horizontal dt').each((i, elem) => {
      const label = $(elem).text().trim();
      if (label.toLowerCase().includes('screenwriter') || label.toLowerCase().includes('writer')) {
        const writerElement = $(elem).next('dd');
        writerElement.find('a').each((j, writerElem) => {
          const writerName = $(writerElem).text().trim();
          if (writerName) {
            writers.push(writerName);
          }
        });
      }
    });
    
    // 수집한 정보를 영화 정보에 추가
    movieInfo.mainDirector = director.length > 0 ? director[0] : '';
    movieInfo.directorsFromMain = director.join(', ');
    movieInfo.writersFromMain = writers.join(', ');
    
    // 정보 병합 - 모든 소스(메인 페이지, cast 페이지)의 데이터를 통합
    if (movieInfo.credits) {
      // 디렉터 정보 병합
      if (director.length > 0 && movieInfo.credits.directors.length === 0) {
        // 메인 페이지에서만 디렉터 정보가 있는 경우
        director.forEach(name => {
          movieInfo.credits.directors.push({
            name: name,
            role: 'Director',
            url: '',
            image: ''
          });
        });
      } else if (director.length === 0 && movieInfo.credits.directors.length > 0) {
        // cast 페이지에서만 디렉터 정보가 있는 경우
        movieInfo.director = movieInfo.credits.directors.map(d => d.name).join(', ');
      } else if (director.length > 0 && movieInfo.credits.directors.length > 0) {
        // 양쪽 모두 정보가 있는 경우, cast 페이지 정보 우선 사용
        movieInfo.director = movieInfo.credits.directors.map(d => d.name).join(', ');
      }
      
      // 작가 정보 병합
      if (writers.length > 0 && movieInfo.credits.writers.length === 0) {
        // 메인 페이지에서만 작가 정보가 있는 경우
        writers.forEach(name => {
          movieInfo.credits.writers.push({
            name: name,
            role: 'Screenwriter',
            url: '',
            image: ''
          });
        });
      } else if (writers.length === 0 && movieInfo.credits.writers.length > 0) {
        // cast 페이지에서만 작가 정보가 있는 경우
        movieInfo.writers = movieInfo.credits.writers.map(w => w.name).join(', ');
      } else if (writers.length > 0 && movieInfo.credits.writers.length > 0) {
        // 양쪽 모두 정보가 있는 경우, cast 페이지 정보 우선 사용
        movieInfo.writers = movieInfo.credits.writers.map(w => w.name).join(', ');
      }
    } else {
      // credits 정보가 없는 경우(cast 페이지 크롤링 실패)
      movieInfo.director = director.join(', ');
      movieInfo.writers = writers.join(', ');
      
      // 기본 credits 구조 생성
      movieInfo.credits = {
        directors: director.map(name => ({ name, role: 'Director' })),
        writers: writers.map(name => ({ name, role: 'Screenwriter' })),
        producers: [],
        mainCast: movieInfo.cast.mainRoles || [],
        supportCast: movieInfo.cast.supportRoles || [],
        guestCast: [],
        others: []
      };
    }
    
    // 출연진 정보 출력 및 검증
    console.log(`[영화 스텔스 크롤러] 주연진 정보 (${movieInfo.cast.mainRoles.length}명): ${movieInfo.cast.mainRoles.map(actor => actor.name).join(', ')}`);
    console.log(`[영화 스텔스 크롤러] 조연진 정보 (${movieInfo.cast.supportRoles.length}명): ${movieInfo.cast.supportRoles.map(actor => actor.name).join(', ')}`);
    
    // 영화 정보 종합 로그
    console.log(`[영화 스텔스 크롤러] 영화 정보 추출 완료: "${movieInfo.title}"`);
    console.log(`[영화 스텔스 크롤러] - 감독: ${movieInfo.director || '정보 없음'}`);
    console.log(`[영화 스텔스 크롤러] - 작가: ${movieInfo.writers || '정보 없음'}`);
    console.log(`[영화 스텔스 크롤러] - 주연: ${(movieInfo.credits?.mainCast || []).length}명, 조연: ${(movieInfo.credits?.supportCast || []).length}명`);
    console.log(`[영화 스텔스 크롤러] - 출연진 총 인원: ${(movieInfo.credits?.mainCast || []).length + (movieInfo.credits?.supportCast || []).length}명`);
    
    // 자동으로 YouTube 영상 가져오기 시도
    try {
      console.log('[영화 스텔스 크롤러] YouTube 영상 자동 검색 시작');
      
      // 원제가 있으면 원제 + 영화 키워드, 없으면 타이틀 + 영화 키워드
      const searchQuery = movieInfo.originalTitle 
        ? `${movieInfo.originalTitle} 영화` 
        : `${movieInfo.title} 영화`;
      
      console.log(`[영화 스텔스 크롤러] 영상 검색 쿼리: "${searchQuery}"`);
      
      // YouTube API를 직접 호출하지 않고 내부 API 경로 활용
      const youtubeApiUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:13001'}/api/youtube/search-videos?title=${encodeURIComponent(searchQuery)}&maxResults=5`;
      
      console.log(`[영화 스텔스 크롤러] YouTube API 요청: ${youtubeApiUrl}`);
      
      const youtubeResponse = await fetch(youtubeApiUrl);
      
      if (!youtubeResponse.ok) {
        throw new Error(`YouTube API 요청 실패: ${youtubeResponse.status}`);
      }
      
      const youtubeData = await youtubeResponse.json();
      
      if (youtubeData.success && youtubeData.data && youtubeData.data.length > 0) {
        console.log(`[영화 스텔스 크롤러] YouTube 영상 ${youtubeData.data.length}개 찾음`);
        
        // 영상 정보 변환
        const videos = youtubeData.data.map(video => ({
          title: video.title,
          type: video.title.toLowerCase().includes('trailer') ? 'trailer' : 
                video.title.toLowerCase().includes('teaser') ? 'teaser' : 'other',
          url: video.url,
          viewCount: video.viewCount,
          publishedAt: video.publishedAt
        }));
        
        // 영상 정보 저장
        movieInfo.videos = videos;
        console.log(`[영화 스텔스 크롤러] ${videos.length}개 영상 정보 저장 완료`);
      } else {
        console.log('[영화 스텔스 크롤러] 영상을 찾지 못했거나 API 응답이 올바르지 않습니다');
        movieInfo.videos = [];
      }
    } catch (error) {
      console.error('[영화 스텔스 크롤러] YouTube 영상 검색 중 오류 발생:', error);
      movieInfo.videos = [];
    }
    
    console.log('[영화 스텔스 크롤러] 영화 정보 추출 완료');
    return movieInfo;
  } catch (error) {
    console.error('[영화 스텔스 크롤러] 영화 상세 정보 수집 중 오류 발생:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('[영화 스텔스 크롤러] 브라우저 종료');
    }
  }
} 