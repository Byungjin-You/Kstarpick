import { getTrendingMusicVideos } from '../../../utils/youtube';
import { isAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  // GET 메서드만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    console.log('=== 인기 급상승 음악 API 호출 시작 ===');
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- YOUTUBE_API_KEY exists:', !!process.env.YOUTUBE_API_KEY);
    
    // YouTube API 키 확인
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('YouTube API 키가 설정되지 않았습니다');
      return res.status(500).json({
        success: false,
        message: 'YouTube API 키가 설정되지 않았습니다.'
      });
    }
    
    // 인기 급상승 음악 비디오 가져오기
    console.log('getTrendingMusicVideos 함수 호출 중...');
    const trendingVideos = await getTrendingMusicVideos();
    
    // 로그 추가
    console.log('YouTube API 응답 결과:', {
      success: trendingVideos && trendingVideos.length > 0,
      count: trendingVideos?.length || 0,
      firstVideo: trendingVideos?.[0]?.title || null
    });
    
    if (!trendingVideos || trendingVideos.length === 0) {
      console.warn('인기 급상승 음악 비디오를 찾을 수 없습니다');
      return res.status(404).json({
        success: false,
        message: '인기 급상승 음악 비디오를 찾을 수 없습니다.'
      });
    }
    
    console.log('=== API 응답 성공 ===');
    return res.status(200).json({
      success: true,
      count: trendingVideos.length,
      data: trendingVideos
    });
  } catch (error) {
    console.error('=== 인기 급상승 음악 비디오 API 오류 ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message,
      errorType: error.constructor.name
    });
  }
} 