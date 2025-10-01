import axios from 'axios';

/**
 * 드라마 제목으로 YouTube API를 통해 관련 영상을 검색하는 엔드포인트
 * 
 * @param {string} query - 검색할 드라마 제목 (영어 또는 한글)
 * @param {number} maxResults - 반환할 최대 결과 수 (기본값: 5)
 * @returns {Array} - 검색된 비디오 정보 목록
 */
export default async function handler(req, res) {
  const { method, query } = req;
  
  if (method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: `Method ${method} Not Allowed` 
    });
  }
  
  const { title, maxResults = 5 } = query;
  
  if (!title) {
    return res.status(400).json({ 
      success: false, 
      message: '검색할 드라마 제목이 필요합니다.'
    });
  }
  
  try {
    // YouTube API 키 확인
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'YouTube API 키가 설정되지 않았습니다.'
      });
    }
    
    // 검색 키워드 준비 (최신 공식 예고편, 티저 등의 영상 위주로 검색)
    const searchKeyword = `${title} official trailer teaser`;
    
    // YouTube API로 검색 실행
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search`,
      {
        params: {
          part: 'snippet',
          q: searchKeyword,
          maxResults: maxResults,
          type: 'video',
          videoEmbeddable: true,
          videoSyndicated: true,
          key: API_KEY
        }
      }
    );
    
    // API 응답에서 필요한 정보만 추출
    const videos = response.data.items.map(item => {
      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      };
    });
    
    // 비디오 ID 목록 수집
    const videoIds = videos.map(video => video.videoId).join(',');
    
    // 비디오 상세 정보 가져오기 (조회수 등)
    if (videoIds) {
      const detailsResponse = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`,
        {
          params: {
            part: 'statistics',
            id: videoIds,
            key: API_KEY
          }
        }
      );
      
      // 상세 정보를 원래 비디오 객체에 병합
      if (detailsResponse.data && detailsResponse.data.items) {
        const detailsMap = {};
        
        detailsResponse.data.items.forEach(item => {
          detailsMap[item.id] = {
            viewCount: parseInt(item.statistics?.viewCount || '0', 10),
            likeCount: parseInt(item.statistics?.likeCount || '0', 10),
            commentCount: parseInt(item.statistics?.commentCount || '0', 10)
          };
        });
        
        // 상세 정보 추가 및 조회수 기준 정렬
        videos.forEach(video => {
          const details = detailsMap[video.videoId] || { viewCount: 0, likeCount: 0, commentCount: 0 };
          video.viewCount = details.viewCount;
          video.likeCount = details.likeCount;
          video.commentCount = details.commentCount;
        });
        
        // 조회수 기준 내림차순 정렬
        videos.sort((a, b) => b.viewCount - a.viewCount);
      }
    }
    
    // 결과 반환
    return res.status(200).json({
      success: true,
      data: videos
    });
    
  } catch (error) {
    console.error('YouTube 비디오 검색 오류:', error);
    
    return res.status(500).json({ 
      success: false, 
      message: '유튜브 비디오 검색 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 