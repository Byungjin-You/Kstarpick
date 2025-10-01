import axios from 'axios';
import cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';

/**
 * MyDramalist 상세 페이지에서 드라마/영화 정보를 가져오는 API
 * 
 * @param {string} url - 크롤링할 MyDramalist 상세 페이지 URL
 */
export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { url, mdlId } = req.body;
    
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
    
    // 기본 정보 추출
    const title = $('h1.film-title').text().trim();
    const originalTitle = $('p.film-aka').text().trim();
    
    // 이미지 URL 추출
    const coverImage = $('.film-cover img.img-responsive').attr('src');
    
    // 현재 URL의 slug 추출
    const slug = url.split('/').pop();
    
    // 평점 추출
    const ratingText = $('.film-rating-vote').text().trim();
    const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    
    // 줄거리 추출
    const summary = $('.show-synopsis').text().trim();
    
    // 메타 정보 추출 (릴리스 연도, 국가, 에피소드)
    const metaData = {};
    
    // 상세 정보 테이블에서 데이터 추출
    $('.box-body.light-b dl.dl-horizontal').each((index, element) => {
      $(element).find('dt').each((i, dt) => {
        const key = $(dt).text().trim().toLowerCase();
        const value = $(dt).next('dd').text().trim();
        
        metaData[key] = value;
      });
    });
    
    // 장르 추출
    const genres = [];
    $('.show-genres a').each((i, element) => {
      genres.push($(element).text().trim());
    });
    
    // 출연진 정보 추출
    const cast = [];
    $('.box-body ul.list li.cast-item').each((i, element) => {
      const actorName = $(element).find('.text-primary.text-ellipsis a').text().trim();
      const role = $(element).find('.text-muted').text().trim();
      const actorImage = $(element).find('img').attr('src');
      
      if (actorName) {
        cast.push({
          name: actorName,
          role: role,
          image: actorImage
        });
      }
    });
    
    // 태그 추출
    const tags = [];
    $('.show-tags a').each((i, element) => {
      tags.push($(element).text().trim());
    });
    
    // 상영 정보 추출
    const status = metaData['status'] || '';
    const releaseDate = metaData['aired'] || metaData['released'] || '';
    const country = metaData['country'] || 'South Korea';
    const episodes = metaData['episodes'] ? parseInt(metaData['episodes']) : null;
    const runtime = metaData['duration'] || '';
    
    // 데이터 객체 구성
    const dramaData = {
      mdlId: mdlId,
      mdlUrl: url,
      mdlSlug: slug,
      title,
      originalTitle,
      coverImage,
      bannerImage: coverImage, // 임시로 커버 이미지를 배너 이미지로 사용
      summary,
      description: summary,
      reviewRating: rating,
      genres,
      cast,
      tags,
      status: status.toLowerCase(),
      releaseDate,
      country,
      episodes,
      runtime,
      category: episodes ? 'drama' : 'movie', // 에피소드가 있으면 드라마, 없으면 영화로 구분
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 데이터베이스에 저장 또는 업데이트 (선택 사항)
    // const { db } = await connectToDatabase();
    // const result = await db.collection('dramas').updateOne(
    //   { mdlId: mdlId },
    //   { $set: dramaData },
    //   { upsert: true }
    // );

    return res.status(200).json({ 
      success: true, 
      data: dramaData
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