import axios from 'axios';
import * as cheerio from 'cheerio';
import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../utils/mongodb';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 스텔스 플러그인 활성화
puppeteer.use(StealthPlugin());

// 비동기 대기 함수
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 랜덤 지연시간 생성 (봇 탐지 회피용)
const randomDelay = () => {
  const delay = Math.floor(Math.random() * 1500) + 500;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// 설정
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;

// 디버깅 모드 설정 - 테스트 시에만 true로 설정
const DEBUG_MODE = true;

/**
 * MyDramalist 사이트에서 자동으로 드라마 정보를 크롤링하는 API
 */
export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    // 권한 체크 완전 제거 (항상 접근 허용)
    console.log('[자동 크롤러] 권한 체크 생략됨 (DEBUG_MODE)');

    // GET 요청인 경우 테스트 페이지 반환
    if (req.method === 'GET') {
      return res.status(200).json({ success: true, message: 'Auto Crawler API is working' });
    }

    // 요청 정보 로깅
    if (DEBUG_MODE) {
      console.log('================ 크롤링 요청 시작 ================');
      console.log('요청 시간:', new Date().toISOString());
      console.log('요청 본문:', JSON.stringify(req.body, null, 2));
    }

    // POST 요청 처리
    const { url, mode = 'list', htmlContent, usePuppeteer = false } = req.body;

    // HTML 내용이 제공된 경우 - 클라이언트에서 HTML 전송
    if (htmlContent) {
      console.log('[크롤링] 클라이언트에서 받은 HTML 파싱 시작');
      
      if (DEBUG_MODE) {
        console.log(`[디버깅] HTML 크기: ${htmlContent.length} 바이트`);
        console.log(`[디버깅] HTML 샘플: ${htmlContent.substring(0, 200)}...`);
      }
      
      let result;
      if (mode === 'list') {
        result = await parseListHtml(htmlContent, url);
      } else if (mode === 'detail') {
        result = await parseDetailHtml(htmlContent, url);
      } else {
        return res.status(400).json({ success: false, message: '유효하지 않은 파싱 모드입니다.' });
      }
      
      if (DEBUG_MODE) {
        console.log(`[디버깅] 파싱 결과 요약:`, 
          mode === 'list' 
            ? `드라마 ${result.dramas.length}개 발견, 다음 페이지: ${result.nextPage ? '있음' : '없음'}`
            : `제목: ${result.title}, 장르: ${result.genres?.length || 0}개, 출연: ${result.cast?.length || 0}명`
        );
      }
      
      return res.status(200).json({ success: true, data: result });
    }
    
    // URL만 제공된 경우 - 서버에서 크롤링 시도
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL 또는 HTML 내용이 필요합니다.' });
    }

    let result;
    if (mode === 'list') {
      // 검색 결과 페이지 크롤링 - puppeteer 옵션 추가
      if (usePuppeteer) {
        console.log(`[크롤링] Puppeteer를 사용하여 '${url}' 크롤링 시작`);
        result = await crawlDramaListWithPuppeteer(url);
      } else {
        console.log(`[크롤링] 기본 HTTP 요청으로 '${url}' 크롤링 시작`);
        result = await crawlDramaList(url);
      }
    } else if (mode === 'detail') {
      // 상세 페이지 크롤링 - puppeteer 옵션 추가
      if (usePuppeteer) {
        console.log(`[크롤링] Puppeteer를 사용하여 상세 페이지 '${url}' 크롤링 시작`);
        result = await crawlDramaDetailWithPuppeteer(url);
      } else {
        console.log(`[크롤링] 기본 HTTP 요청으로 상세 페이지 '${url}' 크롤링 시작`);
        result = await crawlDramaDetail(url);
      }
    } else {
      return res.status(400).json({ success: false, message: '유효하지 않은 크롤링 모드입니다.' });
    }

    // 응답 전 결과 요약 로깅
    if (DEBUG_MODE) {
      console.log('================ 크롤링 응답 요약 ================');
      console.log('응답 시간:', new Date().toISOString());
      if (mode === 'list') {
        console.log(`드라마 ${result.dramas.length}개 발견`);
        if (result.dramas.length > 0) {
          console.log('첫 번째 드라마:', result.dramas[0].title);
        }
        console.log('다음 페이지:', result.nextPage || '없음');
      } else {
        console.log(`드라마 제목: ${result.title}`);
        console.log(`원제: ${result.originalTitle || '정보 없음'}`);
        console.log(`평점: ${result.reviewRating || '정보 없음'}`);
        console.log(`장르: ${result.genres?.join(', ') || '정보 없음'}`);
      }
      console.log('=================================================');
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('크롤링/파싱 중 오류 발생:', error);
    
    // 상세 오류 로깅
    if (DEBUG_MODE) {
      console.error('================ 크롤링 오류 발생 ================');
      console.error('오류 시간:', new Date().toISOString());
      console.error('오류 메시지:', error.message);
      console.error('오류 스택:', error.stack);
      
      if (error.response) {
        console.error('외부 API 응답 오류:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      }
    }
    
    return res.status(500).json({ 
      success: false, 
      message: '크롤링/파싱 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

/**
 * 드라마 목록 페이지 크롤링 함수
 */
async function crawlDramaList(url) {
  try {
    console.log(`[크롤링] 목록 페이지 크롤링 시작: ${url}`);
    
    // HTTP 요청 헤더 설정 (브라우저 에뮬레이션)
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Google Chrome";v="128", "Chromium";v="128", "Not=A?Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://mydramalist.com/',
      'Cookie': 'mdl_remember_user=1;'
    };

    // HTTP GET 요청 보내기 (타임아웃 설정)
    console.log(`[크롤링] 목록 페이지 HTTP 요청 시작`);
    const response = await axios.get(url, { 
      headers,
      timeout: 15000, // 15초 타임아웃
      maxRedirects: 5
    });
    console.log(`[크롤링] 목록 페이지 HTTP 응답 받음: 상태 코드 ${response.status}`);
    const html = response.data;
    
    // 응답이 HTML이 아닌 경우 체크
    if (typeof html !== 'string' || !html.includes('<!DOCTYPE html>')) {
      console.error('[크롤링] 응답이 유효한 HTML이 아닙니다:', typeof html);
      // 응답 미리보기 출력
      console.log('[크롤링] 응답 미리보기:', typeof html === 'string' ? html.substring(0, 100) : html);
      throw new Error('유효한 HTML 응답을 받지 못했습니다.');
    }

    // HTML 파싱
    console.log(`[크롤링] HTML 파싱 시작`);
    const $ = cheerio.load(html);
    const dramaLinks = [];
    
    // 모든 드라마 박스 요소 찾기
    console.log(`[크롤링] 드라마 요소 찾기 시작`);
    const dramaElements = $('div[id^="mdl-"]');
    console.log(`[크롤링] 발견된 드라마 요소 수: ${dramaElements.length}`);
    
    // 요소가 없을 경우 페이지 전체 구조 분석
    if (dramaElements.length === 0) {
      console.log('[크롤링] 드라마 요소를 찾지 못했습니다. 페이지 구조 분석:');
      console.log('- body 존재 여부:', $('body').length > 0);
      console.log('- 페이지 타이틀:', $('title').text());
      console.log('- 요소 #content 존재 여부:', $('#content').length > 0);
      console.log('- 페이지 내 div 요소 수:', $('div').length);
      
      // 페이지 구조 분석을 위해 몇 가지 선택자 테스트
      ['.box', '.mdl-style', '.text-primary', 'h6', '.img-responsive'].forEach(selector => {
        console.log(`- 선택자 ${selector} 요소 수:`, $(selector).length);
      });
    }
    
    $('div[id^="mdl-"]').each((index, element) => {
      // ID 추출
      const id = $(element).attr('id').replace('mdl-', '');
      
      // 제목 및 링크 추출
      const titleElement = $(element).find('h6.text-primary.title a');
      if (!titleElement.length) return;
      
      const title = titleElement.text().trim();
      const detailUrl = 'https://mydramalist.com' + titleElement.attr('href');
      
      console.log(`[크롤링] 드라마 발견: ${title} (ID: ${id})`);
      
      // 메타 정보 추출
      const metaElement = $(element).find('span.text-muted');
      const metaText = metaElement.length ? metaElement.text().trim() : '';
      const metaParts = metaText.split(' - ');
      
      const category = metaParts[0]?.includes('Drama') ? 'drama' : 
                      metaParts[0]?.includes('Movie') ? 'movie' : 'other';
      
      let year = null;
      let episodes = null;
      if (metaParts[1]) {
        const yearMatch = metaParts[1].match(/(\d{4})/);
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
        }
        
        const episodesMatch = metaParts[1].match(/(\d+) episodes/);
        if (episodesMatch) {
          episodes = parseInt(episodesMatch[1]);
        }
      }
      
      // 이미지 URL 추출
      const imageElement = $(element).find('img.img-responsive.cover');
      const imageUrl = imageElement.length ? 
        (imageElement.attr('src') || imageElement.attr('data-src')) : 
        null;
      
      // 평점 추출
      const ratingElement = $(element).find('span.p-l-xs.score');
      const rating = ratingElement.length ? parseFloat(ratingElement.text()) : 0;
      
      // 줄거리 추출
      let summary = '';
      $(element).find('p').each((_, p) => {
        if (!$(p).find('span').length && $(p).text().trim() && !$(p).hasClass('rating')) {
          summary = $(p).text().trim();
        }
      });
      
      // 드라마 정보 저장
      dramaLinks.push({
        id,
        url: detailUrl,
        title,
        category,
        year,
        episodes,
        imageUrl,
        rating,
        summary
      });
    });
    
    // 다음 페이지 URL 확인
    const nextPageElement = $('.pagination .page-item.next a');
    const nextPageUrl = nextPageElement.length ? 
      'https://mydramalist.com' + nextPageElement.attr('href') : 
      null;
    
    console.log(`[크롤링] 목록 페이지 크롤링 완료: ${dramaLinks.length}개 드라마 발견, 다음 페이지: ${nextPageUrl ? '있음' : '없음'}`);
    
    return { dramas: dramaLinks, nextPage: nextPageUrl };
  } catch (error) {
    console.error('[크롤링] 드라마 목록 크롤링 중 오류:', error);
    throw error;
  }
}

/**
 * 드라마 상세 페이지 크롤링 함수
 */
async function crawlDramaDetail(url) {
  try {
    console.log(`[크롤링] 상세 페이지 크롤링 시작: ${url}`);
    
    // URL에서 ID 추출
    const urlParts = url.split('/');
    const mdlId = urlParts[urlParts.length - 2];
    const slug = urlParts[urlParts.length - 1];
    
    // HTTP 요청 헤더 설정
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://mydramalist.com/'
    };

    // HTTP GET 요청 보내기
    console.log(`[크롤링] 상세 페이지 HTTP 요청 시작`);
    const response = await axios.get(url, { headers });
    console.log(`[크롤링] 상세 페이지 HTTP 응답 받음: 상태 코드 ${response.status}`);
    const html = response.data;

    // HTML 파싱
    console.log(`[크롤링] 상세 페이지 HTML 파싱 시작`);
    const $ = cheerio.load(html);
    
    // 기본 정보 추출
    const title = $('h1.film-title').text().trim() || '';
    console.log(`[크롤링] 제목 추출: "${title}"`);
    
    // Native Title (원제) 추출
    let nativeTitle = '';
    $('.show-detailsxss .list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Native Title:') {
        nativeTitle = $(element).find('a').text().trim();
      }
    });
    
    // 줄거리(Synopsis) 추출
    let synopsis = '';
    const synopsisElement = $('.show-synopsis p span');
    if (synopsisElement.length) {
      synopsis = synopsisElement.text().trim()
        .replace(/\s+/g, ' ')
        .replace(/Edit Translation/g, '')
        .replace(/\(Source:.+?\)/, '')
        .trim();
    }
    
    // 감독(Director) 추출
    let director = '';
    $('.show-detailsxss .list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Director:') {
        director = $(element).find('a').text().trim();
      }
    });
    
    // 장르(Genres) 추출
    const genres = [];
    $('.show-genres a').each((_, element) => {
      genres.push($(element).text().trim());
    });
    
    // 태그(Tags) 추출
    const tags = [];
    $('.show-tags a').each((_, element) => {
      const tag = $(element).text().trim();
      if (tag && !tag.includes('Vote or add tags')) {
        tags.push(tag);
      }
    });
    
    // 국가(Country) 추출
    let country = 'South Korea'; // 기본값
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Country:') {
        country = $(element).text().replace('Country:', '').trim();
      }
    });
    
    // 유형(Type) 추출
    let type = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Type:') {
        type = $(element).text().replace('Type:', '').trim();
      }
    });
    
    // 에피소드 수(Episodes) 추출
    let episodes = null;
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Episodes:') {
        const episodesText = $(element).text().replace('Episodes:', '').trim();
        if (episodesText && !isNaN(parseInt(episodesText))) {
          episodes = parseInt(episodesText);
        }
      }
    });
    
    // 방영 정보(Airs) 추출
    let airsInfo = '';
    let startDate = '';
    let endDate = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Airs:' && !$(element).text().includes('Airs On')) {
        airsInfo = $(element).text().replace('Airs:', '').trim();
        
        // 날짜 파싱 시도
        const dateMatch = airsInfo.match(/([A-Za-z]+\s+\d+,\s+\d{4})\s*-\s*([A-Za-z]+\s+\d+,\s+\d{4})/);
        if (dateMatch) {
          startDate = dateMatch[1];
          endDate = dateMatch[2];
        }
      }
    });
    
    // 방영 요일(Airs On) 추출
    let airsOn = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Airs On:') {
        airsOn = $(element).text().replace('Airs On:', '').trim();
      }
    });
    
    // 방송국(Original Network) 추출
    let network = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Original Network:') {
        network = $(element).find('a').text().trim();
      }
    });
    
    // 콘텐츠 등급(Content Rating) 추출
    let contentRating = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Content Rating:') {
        contentRating = $(element).text().replace('Content Rating:', '').trim();
      }
    });
    
    // 이미지 URL 추출
    const coverImage = $('.film-cover img.img-responsive').attr('src') || '';
    
    // 평점 추출
    const ratingText = $('.film-rating-vote').text().trim() || '';
    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    
    // 출연진 정보 추출
    const cast = [];
    $('.box-body ul.list li.cast-item').each((_, element) => {
      const actorName = $(element).find('.text-primary.text-ellipsis a').text().trim() || '';
      const role = $(element).find('.text-muted').text().trim() || '';
      const actorImage = $(element).find('img').attr('src') || '';
      
      if (actorName) {
        cast.push({
          name: actorName,
          role: role,
          image: actorImage
        });
      }
    });
    
    // 상영 정보 추출
    let status = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Status:') {
        status = $(element).text().replace('Status:', '').trim().toLowerCase();
      }
    });
    
    // 런타임 추출
    let runtime = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Duration:') {
        runtime = $(element).text().replace('Duration:', '').trim();
      }
    });
    
    // 카테고리 결정 (에피소드가 있으면 드라마, 없으면 영화)
    const category = type.toLowerCase().includes('movie') ? 'movie' : 'drama';
    
    // 데이터 객체 구성
    return {
      mdlId,
      mdlUrl: url,
      mdlSlug: slug,
      title,
      originalTitle: nativeTitle,
      coverImage,
      bannerImage: coverImage, // 임시로 커버 이미지를 배너 이미지로 사용
      summary: synopsis,
      description: synopsis,
      reviewRating: rating,
      genres,
      director,
      cast,
      tags,
      status,
      type,
      releaseDate: startDate,
      endDate,
      airsOn,
      network,
      country,
      episodes,
      runtime,
      contentRating,
      category,
      whereToWatch: extractWhereToWatch($),
      credits: await extractCredits($, url),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('드라마 상세 정보 크롤링 중 오류:', error);
    throw error;
  }
}

/**
 * HTML 문자열을 받아 목록 페이지 파싱
 */
async function parseListHtml(html, originalUrl = '') {
  try {
    console.log(`[파싱] 목록 페이지 HTML 파싱 시작, HTML 크기: ${html.length} 바이트`);
    console.log(`[파싱] HTML 샘플: ${html.substring(0, 150)}...`);
    
    // HTML 파싱
    const $ = cheerio.load(html);
    console.log(`[파싱] 페이지 제목: "${$('title').text()}"`);
    
    const dramaLinks = [];
    
    // 모든 드라마 박스 요소 찾기
    console.log(`[파싱] 드라마 요소 찾기 시작`);
    const dramaElements = $('div[id^="mdl-"]');
    console.log(`[파싱] 발견된 드라마 요소 수: ${dramaElements.length}`);
    
    // 요소가 없을 경우 페이지 전체 구조 분석
    if (dramaElements.length === 0) {
      console.log('[파싱] 드라마 요소를 찾지 못했습니다. 페이지 구조 분석:');
      console.log('- body 존재 여부:', $('body').length > 0);
      console.log('- 페이지 타이틀:', $('title').text());
      console.log('- 요소 #content 존재 여부:', $('#content').length > 0);
      console.log('- 페이지 내 div 요소 수:', $('div').length);
      
      // 다른 가능한 선택자 확인
      console.log('- 대안 선택자 ".box" 요소 수:', $('.box').length);
      console.log('- 대안 선택자 ".mdl-card" 요소 수:', $('.mdl-card').length);
      console.log('- 대안 선택자 ".box-body" 요소 수:', $('.box-body').length);
      
      // MyDramalist 특정 구조 확인
      if ($('.mdl-card').length > 0) {
        console.log('[파싱] mdl-card 요소 발견, 대체 파싱 시도');
        $('.mdl-card').each((index, element) => {
          // 카드에서 ID 추출 시도
          const idAttr = $(element).attr('id') || '';
          const id = idAttr.replace('mdl-', '') || `unknown-${index}`;
          
          // 제목 추출 시도
          const titleElement = $(element).find('.title a');
          if (!titleElement.length) return;
          
          const title = titleElement.text().trim();
          const href = titleElement.attr('href') || '';
          const detailUrl = href.startsWith('http') ? href : 'https://mydramalist.com' + href;
          
          console.log(`[파싱] 대체 방식으로 드라마 발견: ${title} (ID: ${id})`);
          
          dramaLinks.push({
            id,
            url: detailUrl,
            title,
            category: 'drama',
            imageUrl: $(element).find('img').attr('src') || null,
            summary: $(element).find('.content').text().trim() || ''
          });
        });
      }
      
      // 페이지 구조 분석을 위해 몇 가지 선택자 테스트
      ['.box', '.mdl-style', '.text-primary', 'h6', '.img-responsive'].forEach(selector => {
        console.log(`- 선택자 ${selector} 요소 수:`, $(selector).length);
      });
      
      // 타이틀 기반 검색
      $('h6.text-primary').each((index, element) => {
        console.log(`- 제목 요소 #${index}:`, $(element).text().trim());
      });
    }
    
    $('div[id^="mdl-"]').each((index, element) => {
      // ID 추출
      const id = $(element).attr('id').replace('mdl-', '');
      
      // 제목 및 링크 추출
      const titleElement = $(element).find('h6.text-primary.title a');
      if (!titleElement.length) return;
      
      const title = titleElement.text().trim();
      const detailUrl = 'https://mydramalist.com' + titleElement.attr('href');
      
      console.log(`[파싱] 드라마 발견: ${title} (ID: ${id})`);
      
      // 메타 정보 추출
      const metaElement = $(element).find('span.text-muted');
      const metaText = metaElement.length ? metaElement.text().trim() : '';
      const metaParts = metaText.split(' - ');
      
      const category = metaParts[0]?.includes('Drama') ? 'drama' : 
                      metaParts[0]?.includes('Movie') ? 'movie' : 'other';
      
      let year = null;
      let episodes = null;
      if (metaParts[1]) {
        const yearMatch = metaParts[1].match(/(\d{4})/);
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
        }
        
        const episodesMatch = metaParts[1].match(/(\d+) episodes/);
        if (episodesMatch) {
          episodes = parseInt(episodesMatch[1]);
        }
      }
      
      // 이미지 URL 추출
      const imageElement = $(element).find('img.img-responsive.cover');
      const imageUrl = imageElement.length ? 
        (imageElement.attr('src') || imageElement.attr('data-src')) : 
        null;
      
      // 평점 추출
      const ratingElement = $(element).find('span.p-l-xs.score');
      const rating = ratingElement.length ? parseFloat(ratingElement.text()) : 0;
      
      // 줄거리 추출
      let summary = '';
      $(element).find('p').each((_, p) => {
        if (!$(p).find('span').length && $(p).text().trim() && !$(p).hasClass('rating')) {
          summary = $(p).text().trim();
        }
      });
      
      // 드라마 정보 저장
      dramaLinks.push({
        id,
        url: detailUrl,
        title,
        category,
        year,
        episodes,
        imageUrl,
        rating,
        summary
      });
    });
    
    // 다음 페이지 URL 확인
    const nextPageElement = $('.pagination .page-item.next a');
    const nextPageUrl = nextPageElement.length ? 
      'https://mydramalist.com' + nextPageElement.attr('href') : 
      null;
    
    console.log(`[파싱] 목록 페이지 파싱 완료: ${dramaLinks.length}개 드라마 발견, 다음 페이지: ${nextPageUrl ? '있음' : '없음'}`);
    
    return { dramas: dramaLinks, nextPage: nextPageUrl };
  } catch (error) {
    console.error('[파싱] 드라마 목록 파싱 중 오류:', error);
    throw error;
  }
}

/**
 * HTML 문자열을 받아 상세 페이지 파싱
 */
async function parseDetailHtml(html, url) {
  try {
    console.log(`[파싱] 상세 페이지 HTML 파싱 시작, HTML 크기: ${html.length} 바이트`);
    console.log(`[파싱] HTML 샘플: ${html.substring(0, 150)}...`);
    
    // URL에서 ID 추출
    const urlParts = url.split('/');
    const mdlId = urlParts[urlParts.length - 2];
    const slug = urlParts[urlParts.length - 1];
    console.log(`[파싱] URL에서 추출한 ID: ${mdlId}, Slug: ${slug}`);
    
    // HTML 파싱
    const $ = cheerio.load(html);
    console.log(`[파싱] 페이지 제목: "${$('title').text()}"`);
    
    // 기본 정보 추출
    const title = $('h1.film-title').text().trim() || '';
    console.log(`[파싱] 제목 추출: "${title}"`);
    
    // 요소가 없을 경우 페이지 전체 구조 분석
    if (!title) {
      console.log('[파싱] 제목 요소를 찾지 못했습니다. 페이지 구조 분석:');
      console.log('- 제목 요소 h1.film-title 존재 여부:', $('h1.film-title').length > 0);
      console.log('- body 존재 여부:', $('body').length > 0);
      console.log('- 페이지 타이틀:', $('title').text());
      
      // 페이지 구조 분석을 위해 모든 h1 요소 확인
      $('h1').each((i, el) => {
        console.log(`- h1 요소 #${i}:`, $(el).text().trim());
      });
      
      // 대체 제목 찾기 시도
      const alternateTitleEl = $('.film-title, .title, .page-title, .header-title').first();
      if (alternateTitleEl.length) {
        console.log('[파싱] 대체 제목 요소 발견:', alternateTitleEl.text().trim());
      }
    }
    
    // Native Title (원제) 추출
    let nativeTitle = '';
    $('.show-detailsxss .list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Native Title:') {
        nativeTitle = $(element).find('a').text().trim() || $(element).clone().children().remove().end().text().trim();
        console.log(`[파싱] 원제 추출: "${nativeTitle}"`);
      }
    });
    
    // 이미지 URL 추출 (주의: 아이들 요소가 지연 로드될 수 있음)
    const coverImage = $('.film-cover img.img-responsive').attr('src') || 
                       $('.film-cover img').attr('src') || 
                       $('.film-poster img').attr('src') || '';
    
    console.log(`[파싱] 이미지 URL 추출: ${coverImage ? '성공' : '실패'}`);
    if (coverImage) {
      console.log(`[파싱] 이미지 URL: ${coverImage}`);
    } else {
      // 이미지 요소 세부 분석
      console.log('[파싱] 이미지 요소 분석:');
      $('.film-cover img, .film-poster img').each((i, el) => {
        console.log(`- 이미지 #${i} src:`, $(el).attr('src'));
        console.log(`- 이미지 #${i} data-src:`, $(el).attr('data-src'));
        console.log(`- 이미지 #${i} alt:`, $(el).attr('alt'));
      });
    }
    
    // 요약 정보 추출
    console.log('[파싱] 주요 데이터 요약:');
    console.log(`- 제목: ${title}`);
    console.log(`- 원제: ${nativeTitle}`);
    console.log(`- 이미지 URL: ${coverImage}`);
    
    // 줄거리(Synopsis) 추출
    let synopsis = '';
    const synopsisElement = $('.show-synopsis p span');
    if (synopsisElement.length) {
      synopsis = synopsisElement.text().trim()
        .replace(/\s+/g, ' ')
        .replace(/Edit Translation/g, '')
        .replace(/\(Source:.+?\)/, '')
        .trim();
    }
    
    // 감독(Director) 추출
    let director = '';
    $('.show-detailsxss .list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Director:') {
        director = $(element).find('a').text().trim();
      }
    });
    
    // 장르(Genres) 추출
    const genres = [];
    $('.show-genres a').each((_, element) => {
      genres.push($(element).text().trim());
    });
    
    // 태그(Tags) 추출
    const tags = [];
    $('.show-tags a').each((_, element) => {
      const tag = $(element).text().trim();
      if (tag && !tag.includes('Vote or add tags')) {
        tags.push(tag);
      }
    });
    
    // 국가(Country) 추출
    let country = 'South Korea'; // 기본값
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Country:') {
        country = $(element).text().replace('Country:', '').trim();
      }
    });
    
    // 유형(Type) 추출
    let type = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Type:') {
        type = $(element).text().replace('Type:', '').trim();
      }
    });
    
    // 에피소드 수(Episodes) 추출
    let episodes = null;
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Episodes:') {
        const episodesText = $(element).text().replace('Episodes:', '').trim();
        if (episodesText && !isNaN(parseInt(episodesText))) {
          episodes = parseInt(episodesText);
        }
      }
    });
    
    // 방영 정보(Airs) 추출
    let airsInfo = '';
    let startDate = '';
    let endDate = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Airs:' && !$(element).text().includes('Airs On')) {
        airsInfo = $(element).text().replace('Airs:', '').trim();
        
        // 날짜 파싱 시도
        const dateMatch = airsInfo.match(/([A-Za-z]+\s+\d+,\s+\d{4})\s*-\s*([A-Za-z]+\s+\d+,\s+\d{4})/);
        if (dateMatch) {
          startDate = dateMatch[1];
          endDate = dateMatch[2];
        }
      }
    });
    
    // 방영 요일(Airs On) 추출
    let airsOn = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Airs On:') {
        airsOn = $(element).text().replace('Airs On:', '').trim();
      }
    });
    
    // 방송국(Original Network) 추출
    let network = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Original Network:') {
        network = $(element).find('a').text().trim();
      }
    });
    
    // 콘텐츠 등급(Content Rating) 추출
    let contentRating = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Content Rating:') {
        contentRating = $(element).text().replace('Content Rating:', '').trim();
      }
    });
    
    // 평점 추출
    const ratingText = $('.film-rating-vote').text().trim() || '';
    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    
    // 출연진 정보 추출
    const cast = [];
    $('.box-body ul.list li.cast-item').each((_, element) => {
      const actorName = $(element).find('.text-primary.text-ellipsis a').text().trim() || '';
      const role = $(element).find('.text-muted').text().trim() || '';
      const actorImage = $(element).find('img').attr('src') || '';
      
      if (actorName) {
        cast.push({
          name: actorName,
          role: role,
          image: actorImage
        });
      }
    });
    
    // 상영 정보 추출
    let status = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Status:') {
        status = $(element).text().replace('Status:', '').trim().toLowerCase();
      }
    });
    
    // 런타임 추출
    let runtime = '';
    $('.list-item').each((_, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Duration:') {
        runtime = $(element).text().replace('Duration:', '').trim();
      }
    });
    
    // 카테고리 결정 (에피소드가 있으면 드라마, 없으면 영화)
    const category = type.toLowerCase().includes('movie') ? 'movie' : 'drama';
    
    // 데이터 객체 구성
    const dramaData = {
      mdlId,
      mdlUrl: url,
      mdlSlug: slug,
      title: title || $('title').text().trim(),  // 제목 못찾을 경우 페이지 타이틀 사용
      originalTitle: nativeTitle,
      coverImage,
      bannerImage: coverImage, // 임시로 커버 이미지를 배너 이미지로 사용
      summary: synopsis,
      description: synopsis,
      reviewRating: rating,
      genres,
      director,
      cast,
      tags,
      status,
      type,
      releaseDate: startDate,
      endDate,
      airsOn,
      network,
      country,
      episodes,
      runtime,
      contentRating,
      category,
      whereToWatch: extractWhereToWatch($),
      credits: await extractCredits($, url),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // YouTube 관련 비디오 자동 가져오기
    try {
      // 영어 제목과 원제목으로 YouTube 비디오 검색
      if (!dramaData.videos || dramaData.videos.length === 0) {
        console.log('[크롤러] YouTube 비디오 자동 검색 시작');
        const youtubeVideos = await fetchYouTubeVideosForDrama(
          dramaData.title,
          dramaData.originalTitle || dramaData.nativeTitle
        );
        
        if (youtubeVideos && youtubeVideos.length > 0) {
          console.log(`[크롤러] ${youtubeVideos.length}개의 YouTube 비디오를 추가합니다.`);
          dramaData.videos = youtubeVideos;
          
          // 첫 번째 비디오를 trailerUrl로 설정 (기존 trailerUrl이 없는 경우)
          if (!dramaData.trailerUrl && youtubeVideos[0]) {
            dramaData.trailerUrl = youtubeVideos[0].url;
            console.log(`[크롤러] 첫 번째 YouTube 비디오를 메인 트레일러로 설정: ${dramaData.trailerUrl}`);
          }
        } else {
          console.log('[크롤러] 적합한 YouTube 비디오를 찾지 못했습니다.');
        }
      }
    } catch (youtubeError) {
      console.error('[크롤러] YouTube 비디오 검색 중 오류:', youtubeError);
      // YouTube 검색 실패는 전체 처리를 중단하지 않도록 에러를 무시하고 진행
    }
    
    return dramaData;
  } catch (error) {
    console.error('드라마 상세 정보 파싱 중 오류:', error);
    throw error;
  }
}

/**
 * Puppeteer를 사용한 드라마 목록 페이지 크롤링 함수 (스텔스 모드로 업데이트)
 */
async function crawlDramaListWithPuppeteer(url) {
  let browser;
  try {
    console.log(`[크롤링] 스텔스 모드로 목록 페이지 크롤링 시작: ${url}`);
    
    // 스텔스 브라우저 설정
    const { browser: newBrowser, page } = await setupStealthBrowser();
    browser = newBrowser;
    
    // 페이지 로딩
    console.log(`[크롤링] 페이지 로딩 중...`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log(`[크롤링] 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();
    
    // 인간과 같은 스크롤 동작
    console.log(`[크롤링] 인간과 유사한 스크롤 동작 수행 중...`);
    await humanLikeScroll(page);
    
    // Cloudflare 우회 확인
    const pageTitle = await handleCloudflareProtection(page);
    console.log(`[크롤링] 페이지 제목: "${pageTitle}"`);
    
    // HTML 추출
    const html = await page.content();
    console.log(`[크롤링] HTML 데이터 크기: ${html.length} 바이트`);
    
    if (!html || html.length < 1000) {
      throw new Error('HTML이 비어있거나 너무 짧습니다. 크롤링에 실패했습니다.');
    }
    
    // Cheerio를 사용하여 HTML 파싱
    console.log(`[크롤링] HTML 파싱 시작`);
    const $ = cheerio.load(html);
    
    // 여기서부터는 기존 파싱 로직 유지
    // ... existing code ...
    
    return { dramas: dramaLinks, nextPage: nextPageUrl };
  } catch (error) {
    console.error('[크롤링] Puppeteer 크롤링 중 오류 발생:', error);
    throw error;
  } finally {
    // 브라우저 종료
    if (browser) {
      await browser.close();
      console.log('[크롤링] 브라우저 세션 종료');
    }
  }
}

/**
 * Puppeteer를 사용한 드라마 상세 페이지 크롤링 함수 (스텔스 모드로 업데이트)
 */
async function crawlDramaDetailWithPuppeteer(url) {
  let browser;
  try {
    console.log(`[크롤링] 스텔스 모드로 상세 페이지 크롤링 시작: ${url}`);
    
    // URL에서 ID 추출
    const urlParts = url.split('/');
    const mdlId = urlParts[urlParts.length - 2];
    const slug = urlParts[urlParts.length - 1];
    console.log(`[크롤링] URL에서 추출한 ID: ${mdlId}, Slug: ${slug}`);
    
    // 스텔스 브라우저 설정
    const { browser: newBrowser, page } = await setupStealthBrowser();
    browser = newBrowser;
    
    // 페이지 로딩
    console.log(`[크롤링] 페이지 로딩 중...`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    console.log(`[크롤링] 페이지 로딩 완료, 랜덤 대기 중...`);
    await randomDelay();
    
    // 인간과 같은 스크롤 동작
    console.log(`[크롤링] 인간과 유사한 스크롤 동작 수행 중...`);
    await humanLikeScroll(page);
    
    // Cloudflare 우회 확인
    const pageTitle = await handleCloudflareProtection(page);
    console.log(`[크롤링] 페이지 제목: "${pageTitle}"`);
    
    // HTML 추출
    const html = await page.content();
    
    // 여기서부터는 기존 파싱 로직을 유지하되 스텔스 크롤러의 기능 추가
    console.log(`[크롤링] HTML 파싱 시작`);
    const result = await parseDetailHtml(html, url);
    
    // Where to Watch 정보와 Cast & Credits 정보 추가 추출
    const $ = cheerio.load(html);
    
    // Where to Watch 정보 추출 (스텔스 크롤러에서 가져온 기능)
    const whereToWatch = [];
    $('.box-header:contains("Where to Watch")').closest('.box').find('.box-body.wts .row .col-xs-12 .row.no-gutter').each((i, el) => {
      const name = $(el).find('a.text-primary b').text().trim();
      const link = $(el).find('a.text-primary').attr('href') || '';
      const image = $(el).find('img.img-responsive').attr('src') || '';
      const type = $(el).find('.p-l div:nth-child(2)').text().trim();
      
      if (name) {
        whereToWatch.push({ 
          name, 
          link: link.startsWith('/redirect') 
            ? decodeURIComponent(link.match(/\/redirect\?q=([^&]+)/)?.[1] || '') 
            : link,
          imageUrl: image,
          type 
        });
      }
    });
    
    // 결과에 Where to Watch 정보 추가
    result.whereToWatch = whereToWatch;
    
    // Cast & Credits 정보 확장 (스텔스 크롤러에서 가져온 기능)
    const credits = {
      directors: [],
      writers: [],
      mainCast: [],
      supportCast: [],
      guestCast: [],
      others: []
    };
    
    $('.box-body ul.list li.cast-item').each((_, element) => {
      const actorName = $(element).find('.text-primary').text().trim();
      const role = $(element).find('.text-muted').text().trim();
      const character = $(element).find('small[title]').text().trim() || '';
      const actorImage = $(element).find('img').attr('src') || '';
      const link = $(element).find('.text-primary').attr('href') || '';
      
      if (actorName) {
        const actorInfo = {
          name: actorName,
          role: role,
          character,
          image: actorImage,
          link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
        };
        
        // 역할에 따라 분류
        if (role.includes('Main Role')) {
          credits.mainCast.push(actorInfo);
        } else if (role.includes('Support Role')) {
          credits.supportCast.push(actorInfo);
        } else if (role.includes('Guest Role')) {
          credits.guestCast.push(actorInfo);
        } else {
          credits.others.push(actorInfo);
        }
      }
    });
    
    // 결과에 확장된 credits 정보 추가
    result.credits = credits;
    result.cast = credits.mainCast.concat(credits.supportCast);
    
    console.log(`[크롤링] 상세 정보 추출 완료: ${result.title}, 출연진 ${result.cast.length}명, 스트리밍 ${whereToWatch.length}개`);
    
    return result;
  } catch (error) {
    console.error('[크롤링] Puppeteer 상세 크롤링 중 오류 발생:', error);
    throw error;
  } finally {
    // 브라우저 종료
    if (browser) {
      await browser.close();
      console.log('[크롤링] 브라우저 세션 종료');
    }
  }
}

/**
 * 드라마 정보 저장 함수
 */
async function saveDrama(dramaData) {
  try {
    const { db } = await connectToDatabase();
    
    // 필수 필드 확인
    if (!dramaData || !dramaData.title) {
      throw new Error('유효한 드라마 데이터가 필요합니다.');
    }
    
    // 데이터 가공 및 준비
    const data = {
      ...dramaData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // slug 생성 (없는 경우)
    if (!data.slug) {
      const baseSlug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]+/g, '-')
        .replace(/^-|-$/g, '');
      const timestamp = Date.now().toString().slice(-6);
      data.slug = `${baseSlug}-${timestamp}`;
    }
    
    // MongoDB에 삽입 또는 업데이트
    const result = await db.collection('dramas').updateOne(
      { mdlId: data.mdlId }, // mdlId로 중복 확인
      { $set: data },
      { upsert: true } // 없으면 생성, 있으면 업데이트
    );
    
    return {
      success: true,
      message: result.upsertedId ? '드라마가 새로 저장되었습니다.' : '드라마 정보가 업데이트되었습니다.',
      data: result
    };
  } catch (error) {
    console.error('드라마 저장 중 오류:', error);
    throw error;
  }
}

/**
 * Where to Watch 스트리밍 서비스 정보 추출
 * @param {Object} $ - Cheerio 객체
 * @return {Array} - 시청 가능한 스트리밍 서비스 목록
 */
function extractWhereToWatch($) {
  try {
    const streamingServices = [];
    
    // Where to Watch 박스 검색 (헤더 텍스트에 "Where to Watch"가 포함된 박스)
    const whereToWatchBoxes = $('.box-header:contains("Where to Watch")').closest('.box');
    
    if (whereToWatchBoxes.length === 0) {
      console.log('[파싱] Where to Watch 정보가 없습니다.');
      return streamingServices;
    }
    
    console.log(`[파싱] Where to Watch 정보 추출 시작 (${whereToWatchBoxes.length}개 섹션 발견)`);
    
    // 각 Where to Watch 박스에서 정보 추출
    whereToWatchBoxes.each((_, boxElement) => {
      const boxTitle = $(boxElement).find('.box-header').text().trim();
      console.log(`[파싱] 스트리밍 섹션 발견: "${boxTitle}"`);
      
      // 스트리밍 서비스 정보 추출
      $(boxElement).find('.box-body.wts .row .col-xs-12, .box-body.wts .row .col-xs-12.col-lg-4').each((_, element) => {
        $(element).find('.row.no-gutter').each((_, serviceRow) => {
          try {
            const serviceImgEl = $(serviceRow).find('img.img-responsive');
            const serviceNameEl = $(serviceRow).find('a.text-primary b');
            const serviceLinkEl = $(serviceRow).find('a.text-primary');
            const serviceTypeEl = $(serviceRow).find('.p-l div:nth-child(2)');
            
            if (serviceNameEl.length) {
              const serviceName = serviceNameEl.text().trim();
              let serviceLink = serviceLinkEl.attr('href') || '';
              
              // 리다이렉트 URL에서 실제 URL 추출 시도
              const redirectMatch = serviceLink.match(/\/redirect\?q=([^&]+)/);
              if (redirectMatch && redirectMatch[1]) {
                serviceLink = decodeURIComponent(redirectMatch[1]);
              }
              
              const serviceImg = serviceImgEl.attr('src') || '';
              const serviceType = serviceTypeEl.text().trim() || '';
              
              console.log(`[파싱] 스트리밍 서비스 발견: ${serviceName}, 유형: ${serviceType}`);
              
              streamingServices.push({
                name: serviceName,
                link: serviceLink,
                imageUrl: serviceImg,
                type: serviceType
              });
            }
          } catch (rowError) {
            console.error('[파싱] 스트리밍 서비스 행 파싱 오류:', rowError);
          }
        });
      });
    });
    
    console.log(`[파싱] Where to Watch 정보 추출 완료: ${streamingServices.length}개 서비스 발견`);
    return streamingServices;
  } catch (error) {
    console.error('[파싱] Where to Watch 정보 추출 중 오류:', error);
    return [];
  }
}

/**
 * Cast & Credits 정보 추출 함수
 * @param {Object} $ - Cheerio 객체
 * @param {string} url - 드라마 URL (캐스트 페이지 URL 생성용)
 * @return {Object} - 추출된 Cast & Credits 정보
 */
async function extractCredits($, dramaUrl) {
  try {
    console.log('[파싱] Cast & Credits 정보 추출 시작');
    
    // 기본 정보는 현재 페이지에서 추출
    const credits = {
      directors: [],
      writers: [],
      mainCast: [],
      supportCast: [],
      guestCast: [],
      others: []
    };
    
    // 현재 페이지에서 기본 출연진 정보 추출
    $('.box-body ul.list li.cast-item').each((_, element) => {
      const actorName = $(element).find('.text-primary').text().trim();
      const role = $(element).find('.text-muted').text().trim();
      const character = $(element).find('small[title]').text().trim() || '';
      const actorImage = $(element).find('img').attr('src') || '';
      const link = $(element).find('.text-primary').attr('href') || '';
      
      // 역할에 따라 적절한 배열에 추가
      if (role.includes('Main Role')) {
        credits.mainCast.push({
          name: actorName,
          role: 'Main Role',
          character,
          image: actorImage,
          link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
        });
      } else if (role.includes('Support Role')) {
        credits.supportCast.push({
          name: actorName,
          role: 'Support Role',
          character,
          image: actorImage,
          link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
        });
      } else if (role.includes('Guest Role')) {
        credits.guestCast.push({
          name: actorName,
          role: 'Guest Role',
          character,
          image: actorImage,
          link: link.startsWith('http') ? link : `https://mydramalist.com${link}`,
          episodes: character.match(/\(Ep\.\s*([\d,-\s]+)\)/) ? character.match(/\(Ep\.\s*([\d,-\s]+)\)/)[1] : ''
        });
      }
    });
    
    console.log(`[파싱] 기본 Cast 정보 추출: 주연 ${credits.mainCast.length}명, 조연 ${credits.supportCast.length}명`);
    
    // 캐스트 전용 페이지 URL 생성
    // 예: https://mydramalist.com/702271-weak-hero-season-2/cast
    const castPageUrl = dramaUrl.split('/').slice(0, -1).join('/') + '/cast';
    
    // 가능하다면 캐스트 페이지에서 확장 정보 가져오기 시도
    try {
      console.log(`[파싱] 확장 캐스트 정보 페이지 확인: ${castPageUrl}`);
      
      // HTTP 요청 헤더 설정
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': dramaUrl
      };
      
      // 이 부분은 Puppeteer를 사용하여 처리하는 것이 좋지만, 간단한 예시로 axios 사용
      // 실제 구현에서는 async/await로 기존 정보 반환 후 나중에 업데이트하는 방식 고려
      // const response = await axios.get(castPageUrl, { headers, timeout: 10000 });
      // const castHtml = response.data;
      // const $cast = cheerio.load(castHtml);
      
      // 확장 출연진 및 제작진 정보 파싱
      /*
      $cast('.box-body').each((_, boxElement) => {
        const headerText = $cast(boxElement).prev('.header').text().trim();
        
        if (headerText.includes('Director')) {
          // 감독 정보 추출
          $cast(boxElement).find('li.list-item').each((_, li) => {
            const name = $cast(li).find('.text-primary b').text().trim();
            const image = $cast(li).find('img').attr('src') || '';
            const link = $cast(li).find('.text-primary').attr('href') || '';
            
            credits.directors.push({
              name,
              role: 'Director',
              image,
              link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
            });
          });
        } 
        else if (headerText.includes('Screenwriter')) {
          // 작가 정보 추출
          $cast(boxElement).find('li.list-item').each((_, li) => {
            const name = $cast(li).find('.text-primary b').text().trim();
            const image = $cast(li).find('img').attr('src') || '';
            const link = $cast(li).find('.text-primary').attr('href') || '';
            
            credits.writers.push({
              name,
              role: 'Screenwriter',
              image,
              link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
            });
          });
        }
        // 기타 역할들도 필요에 따라 추가
      });
      */
      
      console.log('[파싱] 확장 캐스트 정보 추출 시도는 건너뜁니다 (axios/puppeteer 추가 요청 필요)');
    } catch (castError) {
      console.error('[파싱] 확장 캐스트 정보 가져오기 실패:', castError.message);
    }
    
    console.log('[파싱] Cast & Credits 정보 추출 완료');
    return credits;
  } catch (error) {
    console.error('[파싱] Cast & Credits 정보 추출 중 오류:', error);
    // 기본 구조 반환
    return {
      directors: [],
      writers: [],
      mainCast: [],
      supportCast: [],
      guestCast: [],
      others: []
    };
  }
}

/**
 * 인간과 유사한 스크롤 동작 구현
 */
async function humanLikeScroll(page) {
  await page.evaluate(async () => {
    const scrollHeight = document.body.scrollHeight;
    const viewportHeight = window.innerHeight;
    let currentPosition = 0;
    
    while (currentPosition < scrollHeight) {
      // 랜덤한 스크롤 거리
      const scrollAmount = Math.floor(Math.random() * 400) + 100;
      currentPosition += scrollAmount;
      
      // 가끔 위로 조금 스크롤 (실제 사용자처럼)
      if (Math.random() < 0.1 && currentPosition > viewportHeight) {
        window.scrollTo(0, currentPosition - Math.floor(Math.random() * 100));
        await new Promise(r => setTimeout(r, Math.random() * 400 + 100));
      }
      
      window.scrollTo(0, currentPosition);
      
      // 랜덤 대기
      await new Promise(r => setTimeout(r, Math.random() * 800 + 300));
      
      // 가끔 잠시 멈춤
      if (Math.random() < 0.2) {
        await new Promise(r => setTimeout(r, Math.random() * 2000 + 500));
      }
    }
    
    // 페이지 맨 위로 다시 이동
    window.scrollTo(0, 0);
  });
}

/**
 * Cloudflare 우회 확인 및 처리
 */
async function handleCloudflareProtection(page) {
  // Cloudflare 우회 검증
  const pageTitle = await page.title();
  
  if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
    console.log(`[크롤링] Cloudflare 감지됨, 추가 대기...`);
    
    // 추가 대기
    await page.waitForTimeout(10000);
    
    // 다시 제목 확인
    const newTitle = await page.title();
    
    if (newTitle.includes('Just a moment') || newTitle.includes('Cloudflare')) {
      throw new Error('Cloudflare 보호를 우회하지 못했습니다.');
    }
  }
  
  return pageTitle;
}

/**
 * 스텔스 브라우저 설정 함수
 */
async function setupStealthBrowser() {
  // 스텔스 모드로 브라우저 실행
  const browser = await puppeteer.launch({
    headless: "new", // 서버에서는 headless 모드 사용
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled', // 자동화 탐지 비활성화
      `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
      '--disable-extensions',
    ],
    ignoreHTTPSErrors: true,
    slowMo: 20, // 느린 작업 - 인간처럼 보이기 위해
  });
  
  // 새 페이지(탭) 열기
  const page = await browser.newPage();
  
  // 브라우저 지문 랜덤화 (화면 크기, 브라우저 창 크기 등)
  const width = VIEWPORT_WIDTH + Math.floor(Math.random() * 100);
  const height = VIEWPORT_HEIGHT + Math.floor(Math.random() * 100);
  
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: Math.random() < 0.5 ? 1 : 2,
    isMobile: false,
    hasTouch: false,
    isLandscape: true
  });
  
  // navigator.webdriver = false 설정
  await page.evaluateOnNewDocument(() => {
    // WebDriver 속성 감지 우회
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Automation 감지 우회
    window.navigator.chrome = {
      runtime: {},
    };
    
    // 거짓 플러그인 생성
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const plugins = [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' },
        ];
        return plugins;
      },
    });
  });
  
  // 쿠키 및 로컬 스토리지 설정 (실제 브라우저로 보이도록)
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('random_item', Math.random().toString(36));
  });
  
  // 사용자 에이전트 설정
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
  
  // 추가 헤더 설정
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Referer': 'https://mydramalist.com/',
    'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
  });
  
  return { browser, page };
}

// YouTube 관련 비디오 가져오기 함수 추가
const fetchYouTubeVideosForDrama = async (dramaTitle, originalTitle) => {
  try {
    console.log(`[YouTube] '${dramaTitle}' 관련 유튜브 비디오 검색 시작`);
    
    // YouTube API 키 확인
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      console.warn('[YouTube] API 키가 설정되지 않았습니다.');
      return [];
    }
    
    // 영어 제목 기준으로 검색 (영어 제목이 없으면 원제목 사용)
    const searchTitle = originalTitle || dramaTitle;
    
    // 내부 API 호출 (환경에 맞는 포트 사용)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:13001';
    const response = await axios.get(`${baseUrl}/api/youtube/search-videos`, {
      params: {
        title: searchTitle,
        maxResults: 5
      }
    });
    
    if (!response.data.success || !response.data.data) {
      console.warn(`[YouTube] '${searchTitle}' 검색 실패:`, response.data.message);
      return [];
    }
    
    const videos = response.data.data;
    console.log(`[YouTube] '${searchTitle}' 관련 비디오 ${videos.length}개 발견`);
    
    // 유튜브 API로부터 받은 비디오 정보를 드라마 스키마에 맞게 변환
    return videos.map((video, index) => ({
      title: video.title,
      type: 'trailer', // 기본 타입은 트레일러로 설정
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      publishedAt: video.publishedAt,
      order: index
    }));
    
  } catch (error) {
    console.error('[YouTube] 비디오 검색 오류:', error);
    return [];
  }
};

// 상세 페이지 처리 부분을 찾아 YouTube 비디오 검색 로직 추가
// 파일에 따라 parseDetailHtml 함수 내부 또는 데이터 반환 직전에 적절한 위치에 다음 코드를 추가:

    // YouTube 관련 비디오 자동 가져오기
    try {
      // 영어 제목과 원제목으로 YouTube 비디오 검색
      if (!dramaData.videos || dramaData.videos.length === 0) {
        console.log('[크롤러] YouTube 비디오 자동 검색 시작');
        const youtubeVideos = await fetchYouTubeVideosForDrama(
          dramaData.title,
          dramaData.originalTitle || dramaData.nativeTitle
        );
        
        if (youtubeVideos && youtubeVideos.length > 0) {
          console.log(`[크롤러] ${youtubeVideos.length}개의 YouTube 비디오를 추가합니다.`);
          dramaData.videos = youtubeVideos;
          
          // 첫 번째 비디오를 trailerUrl로 설정 (기존 trailerUrl이 없는 경우)
          if (!dramaData.trailerUrl && youtubeVideos[0]) {
            dramaData.trailerUrl = youtubeVideos[0].url;
            console.log(`[크롤러] 첫 번째 YouTube 비디오를 메인 트레일러로 설정: ${dramaData.trailerUrl}`);
          }
        } else {
          console.log('[크롤러] 적합한 YouTube 비디오를 찾지 못했습니다.');
        }
      }
    } catch (youtubeError) {
      console.error('[크롤러] YouTube 비디오 검색 중 오류:', youtubeError);
      // YouTube 검색 실패는 전체 처리를 중단하지 않도록 에러를 무시하고 진행
    }

// ... existing code ... 