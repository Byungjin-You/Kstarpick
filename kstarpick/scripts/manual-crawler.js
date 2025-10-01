/**
 * MyDramalist 사이트에서 복사한 HTML을 파싱하여 드라마 정보를 추출하는 스크립트
 * 
 * 사용 방법:
 * 1. MyDramalist 검색 결과 페이지에서 HTML을 복사하여 html-sample.html 파일에 저장
 * 2. node manual-crawler.js 명령으로 실행
 * 3. 추출된 정보는 extracted-dramas.json 파일에 저장됨
 */

const fs = require('fs');
const cheerio = require('cheerio');
const path = require('path');

// 파일 경로 설정
const INPUT_FILE = 'html-sample.html';
const OUTPUT_FILE = 'extracted-dramas.json';
const DETAIL_INPUT_DIR = 'drama-details';
const DETAIL_OUTPUT_FILE = 'drama-details.json';

// HTML 파싱 및 드라마 정보 추출 함수
function parseDramaList(html) {
  try {
    console.log('HTML 파싱 시작...');
    
    // HTML 파싱
    const $ = cheerio.load(html);
    console.log(`페이지 제목: \"${$('title').text()}\"`);
    
    // 모든 드라마 박스 요소 찾기
    const dramaElements = $('div[id^=\"mdl-\"]');
    console.log(`발견된 드라마 요소 수: ${dramaElements.length}`);
    
    const dramas = [];
    
    // 각 드라마 정보 추출
    dramaElements.each((i, element) => {
      try {
        // ID 추출
        const id = $(element).attr('id').replace('mdl-', '');
        
        // 제목 및 링크 추출
        const titleElement = $(element).find('h6.text-primary.title a');
        const title = titleElement.text().trim();
        const detailUrl = 'https://mydramalist.com' + titleElement.attr('href');
        
        // 메타 정보 추출
        const metaElement = $(element).find('span.text-muted');
        const metaText = metaElement.text().trim();
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
        const imageUrl = imageElement.attr('src') || imageElement.attr('data-src');
        
        // 평점 추출
        const ratingElement = $(element).find('span.score');
        const rating = ratingElement.length ? parseFloat(ratingElement.text()) : null;
        
        // 줄거리 추출
        let summary = '';
        $(element).find('p').each((i, p) => {
          if (!$(p).find('span').length && $(p).text().trim()) {
            summary = $(p).text().trim();
          }
        });
        
        // 태그 추출 (옵션)
        const tags = [];
        $(element).find('.genres a').each((i, tag) => {
          tags.push($(tag).text().trim());
        });
        
        // 결과 객체에 추가
        dramas.push({
          id,
          title,
          detailUrl,
          category,
          year,
          episodes,
          imageUrl,
          rating,
          summary,
          tags
        });
        
        console.log(`[${i+1}] 드라마 파싱: ${title}`);
      } catch (error) {
        console.error(`[오류] 드라마 요소 파싱 중 오류 발생:`, error);
      }
    });
    
    console.log(`파싱 완료: ${dramas.length}개 드라마 발견`);
    return dramas;
  } catch (error) {
    console.error('HTML 파싱 중 오류 발생:', error);
    throw error;
  }
}

// 드라마 상세 정보 페이지 파싱 함수
function parseDramaDetail(html, filename) {
  try {
    console.log(`상세 정보 HTML 파싱 시작: ${filename}`);
    
    // HTML 파싱
    const $ = cheerio.load(html);
    
    // 파일 이름에서 ID 추출 (패턴: {id}-detail.html)
    const idMatch = filename.match(/(\d+)-detail\.html$/);
    const id = idMatch ? idMatch[1] : 'unknown';
    
    // 기본 정보 추출
    const title = $('h1.film-title').text().trim();
    console.log(`제목: ${title}`);
    
    // Native Title (원제) 추출
    let nativeTitle = '';
    $('.show-details .list-item').each((i, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Native Title:') {
        nativeTitle = $(element).clone().children().remove().end().text().trim();
        if (!nativeTitle) {
          nativeTitle = $(element).text().replace('Native Title:', '').trim();
        }
      }
    });
    
    // 줄거리 추출
    let synopsis = '';
    const synopsisElement = $('.show-synopsis');
    if (synopsisElement.length) {
      synopsis = synopsisElement.text().trim()
        .replace(/\s+/g, ' ')
        .replace(/Edit Translation/g, '')
        .replace(/\(Source:.+?\)/, '')
        .trim();
    }
    
    // 장르 추출
    const genres = [];
    $('.show-genres a').each((i, element) => {
      genres.push($(element).text().trim());
    });
    
    // 태그 추출
    const tags = [];
    $('.show-tags a').each((i, element) => {
      const tag = $(element).text().trim();
      if (tag && !tag.includes('Vote or add tags')) {
        tags.push(tag);
      }
    });
    
    // 국가 추출
    let country = 'South Korea'; // 기본값
    $('.list-item').each((i, element) => {
      const label = $(element).find('b').text().trim();
      if (label === 'Country:') {
        country = $(element).text().replace('Country:', '').trim();
      }
    });
    
    // 이미지 URL 추출
    const coverImage = $('.film-cover img.img-responsive').attr('src') || '';
    
    // 평점 추출
    const ratingText = $('.film-rating-vote').text().trim();
    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    
    // 출연진 정보 추출
    const cast = [];
    $('.box-body ul.list li.cast-item').each((i, element) => {
      const actorName = $(element).find('.text-primary').text().trim();
      const role = $(element).find('.text-muted').text().trim();
      const actorImage = $(element).find('img').attr('src') || '';
      
      if (actorName) {
        cast.push({
          name: actorName,
          role,
          image: actorImage
        });
      }
    });
    
    // Where to Watch 정보 추출
    const whereToWatch = extractWhereToWatch($);
    
    // Cast & Credits 정보 추출
    const credits = extractCastAndCredits($);
    
    // 데이터 객체 구성
    const dramaDetail = {
      id,
      title,
      originalTitle: nativeTitle,
      coverImage,
      summary: synopsis,
      genres,
      tags,
      cast,
      rating,
      country,
      whereToWatch,
      credits
    };
    
    console.log(`상세 정보 파싱 완료: ${title}`);
    console.log(`- 장르: ${genres.join(', ')}`);
    console.log(`- 출연진: ${cast.length}명`);
    console.log(`- 시청 가능 서비스: ${whereToWatch.length}개`);
    
    return dramaDetail;
  } catch (error) {
    console.error('상세 HTML 파싱 중 오류 발생:', error);
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
      console.log('Where to Watch 정보가 없습니다.');
      return streamingServices;
    }
    
    console.log(`Where to Watch 정보 추출 시작 (${whereToWatchBoxes.length}개 섹션 발견)`);
    
    // 각 Where to Watch 박스에서 정보 추출
    whereToWatchBoxes.each((i, boxElement) => {
      const boxTitle = $(boxElement).find('.box-header').text().trim();
      console.log(`스트리밍 섹션 발견: "${boxTitle}"`);
      
      // 스트리밍 서비스 정보 추출
      $(boxElement).find('.box-body.wts .row .col-xs-12, .box-body.wts .row .col-xs-12.col-lg-4').each((j, element) => {
        $(element).find('.row.no-gutter').each((k, serviceRow) => {
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
              
              console.log(`스트리밍 서비스 발견: ${serviceName}, 유형: ${serviceType}`);
              
              streamingServices.push({
                name: serviceName,
                link: serviceLink,
                imageUrl: serviceImg,
                type: serviceType
              });
            }
          } catch (error) {
            console.error('스트리밍 서비스 행 파싱 오류:', error);
          }
        });
      });
    });
    
    console.log(`Where to Watch 정보 추출 완료: ${streamingServices.length}개 서비스 발견`);
    return streamingServices;
  } catch (error) {
    console.error('Where to Watch 정보 추출 중 오류:', error);
    return [];
  }
}

/**
 * Cast & Credits 정보를 추출하는 함수
 * @param {Object} $ - Cheerio 객체
 * @return {Object} - 추출된 Cast & Credits 정보
 */
function extractCastAndCredits($) {
  try {
    console.log('Cast & Credits 정보 추출 시작');
    
    // 기본 구조 생성
    const credits = {
      directors: [],
      writers: [],
      mainCast: [],
      supportCast: [],
      guestCast: [],
      others: []
    };
    
    // 헤더를 통해 각 카테고리 구분하여 추출
    $('.box-body').each((_, boxElement) => {
      // 헤더 텍스트 가져오기
      const headerText = $(boxElement).prev('.header').text().trim();
      
      if (!headerText) return; // 헤더가 없으면 건너뜀
      
      console.log(`섹션 발견: "${headerText}"`);
      
      // 카테고리에 따라 처리
      if (headerText.includes('Director') && !headerText.includes('Casting')) {
        // 감독 정보 추출
        $(boxElement).find('li.list-item').each((_, li) => {
          const name = $(li).find('.text-primary b').text().trim();
          const image = $(li).find('img').attr('src') || '';
          const link = $(li).find('.text-primary').attr('href') || '';
          
          if (name) {
            credits.directors.push({
              name,
              role: 'Director',
              image,
              link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
            });
          }
        });
      } 
      else if (headerText.includes('Screenwriter') || headerText.includes('Writer')) {
        // 작가 정보 추출
        $(boxElement).find('li.list-item').each((_, li) => {
          const name = $(li).find('.text-primary b').text().trim();
          const image = $(li).find('img').attr('src') || '';
          const link = $(li).find('.text-primary').attr('href') || '';
          
          if (name) {
            credits.writers.push({
              name,
              role: 'Writer',
              image,
              link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
            });
          }
        });
      }
      else if (headerText.includes('Main Role')) {
        // 주연 배우 정보 추출
        $(boxElement).find('li.list-item').each((_, li) => {
          const name = $(li).find('.text-primary b').text().trim();
          const character = $(li).find('small[title]').text().trim() || '';
          const image = $(li).find('img').attr('src') || '';
          const link = $(li).find('.text-primary').attr('href') || '';
          const role = $(li).find('.text-muted').text().trim();
          
          if (name) {
            credits.mainCast.push({
              name,
              role: 'Main Role',
              character,
              image,
              link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
            });
          }
        });
      }
      else if (headerText.includes('Support Role')) {
        // 조연 배우 정보 추출
        $(boxElement).find('li.list-item').each((_, li) => {
          const name = $(li).find('.text-primary b').text().trim();
          const character = $(li).find('small[title]').text().trim() || '';
          const image = $(li).find('img').attr('src') || '';
          const link = $(li).find('.text-primary').attr('href') || '';
          const role = $(li).find('.text-muted').text().trim();
          
          if (name) {
            credits.supportCast.push({
              name,
              role: 'Support Role',
              character,
              image,
              link: link.startsWith('http') ? link : `https://mydramalist.com${link}`
            });
          }
        });
      }
      else if (headerText.includes('Guest') || headerText.includes('Cameo')) {
        // 게스트 배우 정보 추출
        $(boxElement).find('li.list-item').each((_, li) => {
          const name = $(li).find('.text-primary b').text().trim();
          const character = $(li).find('small[title]').text().trim() || '';
          const image = $(li).find('img').attr('src') || '';
          const link = $(li).find('.text-primary').attr('href') || '';
          const role = $(li).find('.text-muted').text().trim();
          
          // 에피소드 정보 추출 (예: "[Character] (Ep. 1)" → "1")
          const episodes = character.match(/\(Ep\.\s*([\d,-\s]+)\)/) ? 
            character.match(/\(Ep\.\s*([\d,-\s]+)\)/)[1] : '';
          
          if (name) {
            credits.guestCast.push({
              name,
              role: headerText.includes('Cameo') ? 'Cameo' : 'Guest Role',
              character,
              image,
              link: link.startsWith('http') ? link : `https://mydramalist.com${link}`,
              episodes
            });
          }
        });
      }
      else if (headerText) {
        // 기타 역할 (Casting Director, Extras 등)
        $(boxElement).find('li.list-item').each((_, li) => {
          const name = $(li).find('.text-primary b').text().trim();
          const character = $(li).find('small[title]').text().trim() || '';
          const image = $(li).find('img').attr('src') || '';
          const link = $(li).find('.text-primary').attr('href') || '';
          const role = $(li).find('.text-muted').text().trim() || headerText;
          
          if (name) {
            credits.others.push({
              name,
              role,
              character,
              image,
              link: link.startsWith('http') ? link : `https://mydramalist.com${link}`,
              category: headerText
            });
          }
        });
      }
    });
    
    // 결과 요약
    console.log('Cast & Credits 정보 추출 결과:');
    console.log(`- 감독: ${credits.directors.length}명`);
    console.log(`- 작가: ${credits.writers.length}명`);
    console.log(`- 주연: ${credits.mainCast.length}명`);
    console.log(`- 조연: ${credits.supportCast.length}명`);
    console.log(`- 게스트: ${credits.guestCast.length}명`);
    console.log(`- 기타: ${credits.others.length}명`);
    
    return credits;
  } catch (error) {
    console.error('Cast & Credits 정보 추출 중 오류:', error);
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

// 메인 실행 함수
async function main() {
  try {
    // Step 1: HTML 샘플 파일이 있는지 확인
    if (!fs.existsSync(INPUT_FILE)) {
      console.error(`오류: ${INPUT_FILE} 파일이 존재하지 않습니다.`);
      console.log('MyDramalist 페이지에서 HTML을 복사하여 파일에 저장해주세요.');
      return;
    }
    
    // Step 2: HTML 파일 읽기 및 파싱
    console.log(`${INPUT_FILE} 파일 읽는 중...`);
    const html = fs.readFileSync(INPUT_FILE, 'utf8');
    
    // Step 3: HTML 파싱 및 드라마 정보 추출
    const dramas = parseDramaList(html);
    
    // Step 4: 결과 저장
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dramas, null, 2), 'utf8');
    console.log(`추출된 ${dramas.length}개 드라마 정보가 ${OUTPUT_FILE}에 저장되었습니다.`);
    
    // Step 5: 상세 페이지 폴더 확인 및 파싱
    if (fs.existsSync(DETAIL_INPUT_DIR)) {
      console.log(`\n${DETAIL_INPUT_DIR} 폴더에서 상세 정보 파일 확인 중...`);
      const detailFiles = fs.readdirSync(DETAIL_INPUT_DIR)
        .filter(file => file.endsWith('-detail.html'));
      
      if (detailFiles.length === 0) {
        console.log('상세 정보 파일이 없습니다.');
        return;
      }
      
      console.log(`${detailFiles.length}개 상세 정보 파일 발견. 파싱 시작...`);
      
      const detailResults = [];
      
      // 각 상세 정보 파일 파싱
      for (const file of detailFiles) {
        const filePath = path.join(DETAIL_INPUT_DIR, file);
        const detailHtml = fs.readFileSync(filePath, 'utf8');
        const detailData = parseDramaDetail(detailHtml, file);
        detailResults.push(detailData);
      }
      
      // 상세 정보 결과 저장
      fs.writeFileSync(DETAIL_OUTPUT_FILE, JSON.stringify(detailResults, null, 2), 'utf8');
      console.log(`추출된 ${detailResults.length}개 상세 정보가 ${DETAIL_OUTPUT_FILE}에 저장되었습니다.`);
    }
  } catch (error) {
    console.error('실행 중 오류 발생:', error);
  }
}

// 스크립트 실행
main(); 