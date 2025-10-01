import axios from 'axios';

export default async function handler(req, res) {
  const { method, query } = req;
  
  if (method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: `Method ${method} Not Allowed` 
    });
  }
  
  const { videoId } = query;
  
  if (!videoId) {
    return res.status(400).json({ 
      success: false, 
      message: '비디오 ID가 필요합니다.'
    });
  }
  
  // API 키 확인
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const useRealAPI = API_KEY && API_KEY !== 'YOUR_API_KEY_HERE';
  
  // 실제 API 혹은 더미 데이터 반환
  if (useRealAPI) {
    // 실제 YouTube API 사용
    try {
      // 비디오 상세 정보 가져오기 (snippet 및 statistics 정보)
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics&key=${API_KEY}`
      );
      
      if (!response.data.items || response.data.items.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: '동영상을 찾을 수 없습니다.' 
        });
      }
      
      const videoData = response.data.items[0];
      const snippet = videoData.snippet;
      const statistics = videoData.statistics;
      
      // 채널 정보 가져오기 (옵션)
      let channelInfo = null;
      try {
        const channelResponse = await axios.get(
          `https://www.googleapis.com/youtube/v3/channels?id=${snippet.channelId}&part=snippet&key=${API_KEY}`
        );
        
        if (channelResponse.data.items && channelResponse.data.items.length > 0) {
          channelInfo = channelResponse.data.items[0].snippet;
        }
      } catch (error) {
        console.error('채널 정보 가져오기 실패:', error);
        // 채널 정보는 선택적으로 가져오므로 오류가 발생해도 계속 진행
      }
      
      // 제목에서 아티스트와 노래 제목 분리 시도 (일반적인 포맷: 'Artist - Title')
      const title = snippet.title;
      let artist = '';
      let songTitle = title;
      
      const titleParts = title.split('-');
      if (titleParts.length > 1) {
        artist = titleParts[0].trim();
        songTitle = titleParts.slice(1).join('-').trim();
      } else if (channelInfo) {
        // 제목에서 분리할 수 없는 경우 채널 이름을 아티스트로 사용
        artist = channelInfo.title;
      }
      
      const videoInfo = {
        id: videoId,
        title: songTitle,
        originalTitle: title,
        description: snippet.description,
        publishedAt: snippet.publishedAt,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        thumbnails: snippet.thumbnails,
        tags: snippet.tags || [],
        viewCount: statistics.viewCount,
        likeCount: statistics.likeCount,
        commentCount: statistics.commentCount,
        artist: artist,
        channelInfo: channelInfo
      };
      
      return res.status(200).json({
        success: true,
        videoInfo
      });
    } catch (error) {
      console.error('YouTube API 호출 중 오류:', error);
      
      // 오류 응답 처리
      if (error.response) {
        return res.status(error.response.status).json({
          success: false,
          message: '유튜브 API 호출 중 오류가 발생했습니다.',
          error: error.response.data
        });
      }
      
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  } else {
    // API 키가 없거나 유효하지 않은 경우 더미 데이터 반환
    console.log('YouTube API 키가 설정되지 않았습니다. 더미 데이터를 반환합니다.');
    
    // 현재 날짜
    const currentDate = new Date();
    // 랜덤 조회수 (10,000 ~ 1,000,000)
    const randomViews = Math.floor(Math.random() * 990000 + 10000).toString();
    // 랜덤 좋아요 수 (조회수의 3~10%)
    const randomLikes = Math.floor(Number(randomViews) * (Math.random() * 0.07 + 0.03)).toString();
    
    // 더미 데이터 생성
    const videoInfo = {
      id: videoId,
      title: '더미 음악 제목',
      originalTitle: '아티스트 - 더미 음악 제목',
      description: '이것은 더미 설명입니다. YouTube API 키가 설정되지 않아 실제 데이터를 가져올 수 없습니다.',
      publishedAt: currentDate.toISOString(),
      channelId: 'dummy-channel-id',
      channelTitle: '더미 채널',
      thumbnails: {
        default: {
          url: `https://i.ytimg.com/vi/${videoId}/default.jpg`,
          width: 120,
          height: 90
        },
        medium: {
          url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          width: 320,
          height: 180
        },
        high: {
          url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          width: 480,
          height: 360
        },
        standard: {
          url: `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
          width: 640,
          height: 480
        },
        maxres: {
          url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
          width: 1280,
          height: 720
        }
      },
      tags: ['더미', '테스트', 'K-POP'],
      viewCount: randomViews,
      likeCount: randomLikes,
      commentCount: Math.floor(Number(randomLikes) / 5).toString(),
      artist: '아티스트',
      channelInfo: null
    };
    
    return res.status(200).json({
      success: true,
      videoInfo,
      isDummy: true,
      message: 'API 키가 설정되지 않아 더미 데이터를 반환합니다.'
    });
  }
} 