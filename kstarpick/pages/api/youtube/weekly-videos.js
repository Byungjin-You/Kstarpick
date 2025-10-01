import { getPlaylistVideos } from '../../../utils/youtube';

export default async function handler(req, res) {
  // POST 메서드만 허용 (플레이리스트 URL을 받기 위해)
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    console.log('=== 이번주 인기 영상 API 호출 시작 ===');
    console.log('Request body:', req.body);
    
    const { playlistUrl } = req.body;
    
    if (!playlistUrl) {
      return res.status(400).json({
        success: false,
        message: '플레이리스트 URL이 필요합니다.'
      });
    }
    
    console.log('플레이리스트 URL:', playlistUrl);
    
    // YouTube API 키 확인
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('YouTube API 키가 설정되지 않았습니다');
      return res.status(500).json({
        success: false,
        message: 'YouTube API 키가 설정되지 않았습니다.'
      });
    }
    
    // 플레이리스트에서 비디오 가져오기
    console.log('getPlaylistVideos 함수 호출 중...');
    const videos = await getPlaylistVideos(playlistUrl);
    
    // 로그 추가
    console.log('YouTube Playlist API 응답 결과:', {
      success: videos && videos.length > 0,
      count: videos?.length || 0,
      firstVideo: videos?.[0]?.title || null
    });
    
    if (!videos || videos.length === 0) {
      console.warn('플레이리스트에서 비디오를 찾을 수 없습니다');
      return res.status(404).json({
        success: false,
        message: '플레이리스트에서 비디오를 찾을 수 없습니다.'
      });
    }
    
    console.log('=== API 응답 성공 ===');
    return res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error) {
    console.error('=== 이번주 인기 영상 API 오류 ===');
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