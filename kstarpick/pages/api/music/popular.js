import dbConnect from '../../../lib/dbConnect';
import Music from '../../../models/Music';
import { decodeHtmlEntities } from '../../../utils/helpers';

/**
 * 일일 조회수 기준으로 인기 있는 음악 목록을 반환하는 API
 * 
 * @route GET /api/music/popular
 * @param {number} limit - 반환할 항목 수 (기본값: 10)
 * @returns {Array} - 인기 음악 목록
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    await dbConnect();

    // 쿼리 파라미터
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit);

    // 일일 조회수 기준으로 정렬된 음악 가져오기
    let topMusic = await Music.find({ status: 'active' })
      .sort({ position: 1 }) // position 기준 오름차순 정렬 (순위 1, 2, 3...)
      .limit(limitNum)
      .lean();

    console.log(`Top ${limitNum} 음악 항목 조회 완료 - position 기준 정렬`);
    
    if (topMusic.length === 0) {
      // position을 찾을 수 없는 경우 일일 조회수 기준으로 정렬 시도
      console.log("position 기준 정렬된 항목이 없습니다. 일일 조회수 기준으로 정렬을 시도합니다.");
      const viewSortedMusic = await Music.find({ status: 'active' })
        .sort({ dailyViews: -1 }) // 일일 조회수 내림차순
        .limit(limitNum)
        .lean();
      
      if (viewSortedMusic.length > 0) {
        console.log("일일 조회수 기준으로 정렬된 항목을 반환합니다.");
        // 임시 position 할당
        topMusic = viewSortedMusic.map((item, index) => ({
          ...item,
          position: index + 1,
          previousPosition: index + 1
        }));
      }
    }
    
    // 반환하기 전에 필드명 표준화 (클라이언트 측 호환성)
    const formattedMusic = topMusic.map((music, index) => {
      // 숫자 형식 변환
      const ensureNumber = (value, defaultValue = 0) => {
        if (typeof value === 'number') return value;
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };
      
      // 일일 조회수 통합
      const dailyViews = ensureNumber(
        music.dailyViews || music.dailyview || music.dailyView, 
        Math.round(ensureNumber(music.views) * 0.02)
      );
      
      // position 처리 - index 기반 위치를 폴백으로 사용
      let position = index + 1; // 기본값은 인덱스 + 1
      
      // DB에 저장된 position이 있고 유효하면 사용
      if (music.position !== undefined && music.position !== null) {
        const parsedPosition = ensureNumber(music.position, 0);
        if (parsedPosition > 0 && parsedPosition <= 100) { // 유효한 범위 확인
          position = parsedPosition;
        }
      }
      
      // previousPosition 처리
      let previousPosition = position; // 기본값은 현재 position
      
      if (music.previousPosition !== undefined && music.previousPosition !== null) {
        const parsedPrevPosition = ensureNumber(music.previousPosition, 0);
        if (parsedPrevPosition > 0 && parsedPrevPosition <= 100) { // 유효한 범위 확인
          previousPosition = parsedPrevPosition;
        }
      }
      
      // 로그 출력
      console.log(`음악 데이터 [${index}]: 제목="${music.title}", position=${position}, prev=${previousPosition}, dailyViews=${dailyViews}`);
      
      return {
        _id: music._id,
        title: decodeHtmlEntities(music.title) || '',
        artist: decodeHtmlEntities(music.artist) || '',
        position: position,
        previousPosition: previousPosition,
        coverImage: music.coverImage || '',
        dailyViews: dailyViews,
        totalViews: ensureNumber(music.views),
        releaseDate: music.releaseDate,
        slug: music.slug || '',
        youtubeUrl: music.musicVideo || '',
        album: music.album || ''
      };
    });

    // 위치 기준으로 다시 정렬 (이중 보장)
    const sortedMusic = formattedMusic.sort((a, b) => a.position - b.position);

    // 결과 반환
    return res.status(200).json({
      success: true,
      count: sortedMusic.length,
      data: sortedMusic
    });
  } catch (error) {
    console.error('인기 음악 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
} 