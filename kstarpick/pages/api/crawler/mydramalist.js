import axios from 'axios';
import cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';

/**
 * MyDramalist 웹사이트에서 드라마 정보를 크롤링하는 API
 * 
 * @param {string} url - 크롤링할 MyDramalist URL (검색 결과 페이지)
 * @return {Array} - 수집된 드라마 상세 URL 목록
 */
export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { url } = req.body;
    
    // URL 유효성 검사
    if (!url || !url.includes('mydramalist.com')) {
      return res.status(400).json({ 
        success: false, 
        message: '유효한 MyDramalist URL이 필요합니다.' 
      });
    }

    // 페이지 콘텐츠 가져오기
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Referer': 'https://mydramalist.com/',
        'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="113", "Google Chrome";v="113"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
      },
      timeout: 10000
    });

    // cheerio로 HTML 파싱
    const $ = cheerio.load(response.data);
    const dramaLinks = [];
    
    // 모든 드라마 박스 요소 찾기
    $('div[id^="mdl-"]').each((index, element) => {
      // 각 박스에서 드라마 상세 페이지 링크 추출
      const linkElement = $(element).find('h6.text-primary.title a').first();
      const url = linkElement.attr('href');
      const title = linkElement.text().trim();
      
      // 메타 정보 추출 (category, year, episodes)
      const metaText = $(element).find('span.text-muted').text().trim();
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
      const ratingElement = $(element).find('span.p-l-xs.score');
      const rating = ratingElement.text() ? parseFloat(ratingElement.text()) : 0;
      
      // 줄거리 추출
      const summaryElement = $(element).find('p').not(':has(span)').not(':empty');
      let summary = '';
      if (summaryElement.length > 0) {
        summary = summaryElement.text().trim();
      }
      
      // 드라마 정보 저장
      if (url) {
        dramaLinks.push({
          id: $(element).attr('id').replace('mdl-', ''),
          url: 'https://mydramalist.com' + url,
          title,
          category,
          year,
          episodes,
          imageUrl,
          rating,
          summary
        });
      }
    });

    // 다음 페이지 URL 확인
    const nextPageUrl = $('.pagination .page-item.next a').attr('href');
    const nextPage = nextPageUrl ? 'https://mydramalist.com' + nextPageUrl : null;

    return res.status(200).json({ 
      success: true, 
      data: {
        dramas: dramaLinks,
        nextPage,
        total: dramaLinks.length,
        source: url
      }
    });
  } catch (error) {
    console.error('크롤링 중 오류 발생:', error);
    return res.status(500).json({ 
      success: false, 
      message: '크롤링 중 오류가 발생했습니다.',
      error: error.message
    });
  }
} 