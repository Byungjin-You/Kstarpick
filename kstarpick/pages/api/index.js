/**
 * API 인덱스 핸들러
 */
export default async function handler(req, res) {
  try {
    // 서버 URL 설정
    const server = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:13001' 
      : 'http://localhost:3000';

    // Top Songs 데이터 가져오기
    const songsRes = await fetch(`${server}/api/music/popular?limit=10`);
    const songsData = await songsRes.json();

    // 노래 데이터 처리
    let topSongs = [];
    if (songsData && songsData.success && Array.isArray(songsData.data)) {
      // 이미 API에서 HTML 엔티티가 디코딩된 결과를 받음
      topSongs = songsData.data;
    }

    return res.status(200).json({
      success: true,
      data: {
        topSongs
      }
    });
  } catch (error) {
    console.error('API 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
} 