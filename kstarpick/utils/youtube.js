import axios from 'axios';

// 유튜브 비디오 ID 추출 함수
export const extractYoutubeVideoId = (url) => {
  if (!url) return null;
  
  // URL에서 v 파라미터 추출
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

// 유튜브 동영상 정보 가져오기
export const getYoutubeVideoStats = async (videoUrl) => {
  try {
    const videoId = extractYoutubeVideoId(videoUrl);
    if (!videoId) {
      throw new Error('유효한 YouTube URL이 아닙니다.');
    }
    
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      throw new Error('YouTube API 키가 설정되지 않았습니다.');
    }
    
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=statistics&key=${API_KEY}`
    );
    
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('동영상을 찾을 수 없습니다.');
    }
    
    const statistics = response.data.items[0].statistics;
    return {
      viewCount: statistics.viewCount || '0',
      likeCount: statistics.likeCount || '0',
      commentCount: statistics.commentCount || '0'
    };
  } catch (error) {
    console.error('YouTube 비디오 정보 가져오기 실패:', error);
    return {
      viewCount: '0',
      likeCount: '0',
      commentCount: '0'
    };
  }
};

// 유튜브 동영상 제목, 아티스트 정보 가져오기
export const getYoutubeVideoDetails = async (videoUrl) => {
  try {
    const videoId = extractYoutubeVideoId(videoUrl);
    if (!videoId) {
      throw new Error('유효한 YouTube URL이 아닙니다.');
    }
    
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      throw new Error('YouTube API 키가 설정되지 않았습니다.');
    }
    
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${API_KEY}`
    );
    
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('동영상을 찾을 수 없습니다.');
    }
    
    const snippet = response.data.items[0].snippet;
    
    // 제목에서 아티스트와 노래 제목 분리 (일반적인 포맷: 'Artist - Title')
    const title = snippet.title;
    let artist = '';
    let songTitle = title;
    
    const titleParts = title.split('-');
    if (titleParts.length > 1) {
      artist = titleParts[0].trim();
      songTitle = titleParts.slice(1).join('-').trim();
    }
    
    return {
      title: songTitle,
      artist: artist,
      description: snippet.description,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      publishedAt: snippet.publishedAt
    };
  } catch (error) {
    console.error('YouTube 비디오 상세 정보 가져오기 실패:', error);
    return null;
  }
};

// 플레이리스트 ID 추출 함수
export const extractPlaylistId = (url) => {
  if (!url) return null;
  
  // URL에서 list 파라미터 추출
  const urlParams = new URLSearchParams(url.split('?')[1] || '');
  return urlParams.get('list');
};

// 특정 플레이리스트에서 비디오 목록 가져오기
export async function getPlaylistVideos(playlistUrl) {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    console.log('YouTube API 키 확인:', apiKey ? '키가 설정됨' : '키가 설정되지 않음');
    
    if (!apiKey) {
      console.error('YouTube API 키가 설정되지 않았습니다');
      return [];
    }

    // 플레이리스트 ID 추출
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      console.error('유효하지 않은 플레이리스트 URL입니다:', playlistUrl);
      return [];
    }

    console.log('플레이리스트 ID:', playlistId);
    
    // YouTube Playlist Items API 호출
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
    console.log('YouTube Playlist API 요청 URL (API 키 제외):', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(apiUrl);
    console.log('YouTube Playlist API 응답 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('YouTube Playlist API 오류 상세:', errorData);
      throw new Error(`YouTube Playlist API 오류: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('YouTube Playlist API 응답 데이터 구조:', 
      JSON.stringify({
        kind: data.kind,
        etag: data.etag,
        pageInfo: data.pageInfo,
        itemCount: data.items?.length || 0
      })
    );
    
    if (!data.items || data.items.length === 0) {
      console.warn('플레이리스트에서 반환된 항목이 없습니다');
      return [];
    }
    
    // 첫 번째 항목 샘플 로깅
    if (data.items[0]) {
      console.log('플레이리스트 첫 번째 항목 샘플:',
        JSON.stringify({
          videoId: data.items[0].snippet?.resourceId?.videoId,
          title: data.items[0].snippet?.title,
          channelTitle: data.items[0].snippet?.channelTitle,
          publishedAt: data.items[0].snippet?.publishedAt,
          thumbnails: Object.keys(data.items[0].snippet?.thumbnails || {})
        })
      );
    }
    
    // 비디오 ID 목록 수집
    const videoIds = data.items
      .map(item => item.snippet?.resourceId?.videoId)
      .filter(Boolean)
      .join(',');
    
    // 비디오 상세 정보 가져오기 (조회수, 좋아요 등)
    if (videoIds) {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        const detailsMap = {};
        
        // 비디오 ID로 인덱싱된 조회수 맵 생성
        if (detailsData.items) {
          detailsData.items.forEach(item => {
            detailsMap[item.id] = {
              viewCount: item.statistics?.viewCount || '0',
              likeCount: item.statistics?.likeCount || '0'
            };
          });
        }
        
        // 결과 매핑과 통계 데이터 통합
        return data.items.map(item => {
          const videoId = item.snippet?.resourceId?.videoId;
          const stats = detailsMap[videoId] || { viewCount: '0', likeCount: '0' };
          
          return {
            videoId: videoId,
            title: item.snippet?.title || '',
            channelTitle: item.snippet?.channelTitle || '',
            publishedAt: item.snippet?.publishedAt || '',
            thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
            viewCount: parseInt(stats.viewCount, 10),
            likeCount: parseInt(stats.likeCount, 10),
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`
          };
        });
      }
    }
    
    // 상세 정보를 가져오지 못한 경우 기본 데이터만 반환
    return data.items.map(item => ({
      videoId: item.snippet?.resourceId?.videoId,
      title: item.snippet?.title || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
      viewCount: 0,
      likeCount: 0,
      youtubeUrl: `https://www.youtube.com/watch?v=${item.snippet?.resourceId?.videoId}`
    }));
    
  } catch (error) {
    console.error('플레이리스트 비디오 가져오기 오류:', error);
    return [];
  }
}

// 인기 급상승 음악 비디오 가져오기 (한국 지역, 음악 카테고리, K-POP)
export async function getTrendingMusicVideos() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    console.log('YouTube API 키 확인:', apiKey ? '키가 설정됨' : '키가 설정되지 않음');
    
    if (!apiKey) {
      console.error('YouTube API 키가 설정되지 않았습니다');
      return [];
    }
    
    // 오늘 기준 7일 전 계산 (D-7)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // 00:00:00으로 설정
    
    // RFC 3339 형식으로 변환
    const publishedAfter = sevenDaysAgo.toISOString();
    console.log('검색 기준일 (오늘로부터 7일 전):', publishedAfter);
    
    // 수정: search API를 사용해 K-POP 음악 검색 (지난 7일 업로드 기준 추가)
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=kpop+music&type=video&videoCategoryId=10&regionCode=KR&order=viewCount&publishedAfter=${publishedAfter}&maxResults=20&key=${apiKey}`;
    console.log('YouTube API 요청 URL (API 키 제외):', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(apiUrl);
    console.log('YouTube API 응답 상태:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('YouTube API 오류 상세:', errorData);
      throw new Error(`YouTube API 오류: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('YouTube API 응답 데이터 구조:', 
      JSON.stringify({
        kind: data.kind,
        etag: data.etag,
        pageInfo: data.pageInfo,
        itemCount: data.items?.length || 0,
        publishedAfter: publishedAfter
      })
    );
    
    if (!data.items || data.items.length === 0) {
      console.warn('YouTube API에서 반환된 항목이 없습니다 (지난 7일 업로드 기준)');
      return [];
    }
    
    // 첫 번째 항목 샘플 로깅
    if (data.items[0]) {
      console.log('YouTube API 첫 번째 항목 샘플:',
        JSON.stringify({
          id: data.items[0].id?.videoId,
          title: data.items[0].snippet?.title,
          channelTitle: data.items[0].snippet?.channelTitle,
          publishedAt: data.items[0].snippet?.publishedAt,
          thumbnails: Object.keys(data.items[0].snippet?.thumbnails || {})
        })
      );
    }
    
    // 비디오 ID 목록 수집
    const videoIds = data.items
      .map(item => item.id?.videoId)
      .filter(Boolean)
      .join(',');
    
    // 비디오 상세 정보 가져오기 (조회수, 좋아요 등)
    if (videoIds) {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        const detailsMap = {};
        
        // 비디오 ID로 인덱싱된 조회수 맵 생성
        if (detailsData.items) {
          detailsData.items.forEach(item => {
            detailsMap[item.id] = {
              viewCount: item.statistics?.viewCount || '0',
              likeCount: item.statistics?.likeCount || '0'
            };
          });
        }
        
        // 결과 매핑과 통계 데이터 통합
        return data.items.map(item => {
          const videoId = item.id?.videoId;
          const stats = detailsMap[videoId] || { viewCount: '0', likeCount: '0' };
          
          return {
            videoId: videoId,
            title: item.snippet?.title || '',
            channelTitle: item.snippet?.channelTitle || '',
            publishedAt: item.snippet?.publishedAt || '',
            thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
            viewCount: parseInt(stats.viewCount, 10),
            likeCount: parseInt(stats.likeCount, 10),
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`
          };
        });
      }
    }
    
    // 상세 정보를 가져오지 못한 경우 기본 데이터만 반환
    return data.items.map(item => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title || '',
      channelTitle: item.snippet?.channelTitle || '',
      publishedAt: item.snippet?.publishedAt || '',
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
      viewCount: 0,
      likeCount: 0,
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id?.videoId}`
    }));
    
  } catch (error) {
    console.error('인기 급상승 음악 비디오 가져오기 오류:', error);
    return [];
  }
} 