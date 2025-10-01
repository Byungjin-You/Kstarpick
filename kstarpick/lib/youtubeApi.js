import { google } from 'googleapis';
import axios from 'axios';

// YouTube Data API 설정
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY // .env 파일에 YOUTUBE_API_KEY 추가 필요
});

// YouTube API 키 설정
const API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyA5e3DzKbgo-zakeQ6k2Hu8k6njFJcumH0';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2초

/**
 * YouTube URL에서 비디오 ID 추출
 * @param {string} url - YouTube 비디오 URL
 * @return {string|null} - 추출된 YouTube 비디오 ID 또는 null
 */
export function extractVideoId(url) {
  if (!url) return null;
  
  try {
    // youtube.com/watch?v=VIDEO_ID 형식
    const watchUrlMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
    if (watchUrlMatch) return watchUrlMatch[1];
    
    // youtu.be/VIDEO_ID 형식
    const shortUrlMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortUrlMatch) return shortUrlMatch[1];
    
    // youtube.com/embed/VIDEO_ID 형식
    const embedUrlMatch = url.match(/youtube\.com\/embed\/([^?&]+)/);
    if (embedUrlMatch) return embedUrlMatch[1];
    
    return null;
  } catch (error) {
    console.error('비디오 ID 추출 중 오류:', error.message);
    return null;
  }
}

/**
 * YouTube 비디오 정보 가져오기
 * @param {string} videoId - YouTube 비디오 ID
 * @return {Promise<Object>} - 비디오 정보
 */
export async function getVideoDetails(videoId) {
  if (!videoId) {
    throw new Error('유효한 YouTube 비디오 ID가 필요합니다');
  }
  
  try {
    const response = await youtube.videos.list({
      part: 'snippet,statistics,contentDetails',
      id: videoId
    });
    
    if (!response.data || !response.data.items || response.data.items.length === 0) {
      throw new Error('비디오 정보를 찾을 수 없습니다');
    }
    
    const video = response.data.items[0];
    const snippet = video.snippet || {};
    const statistics = video.statistics || {};
    
    // ISO 8601 형식의 duration 파싱 (PT1H2M3S -> { hours: 1, minutes: 2, seconds: 3 })
    const duration = video.contentDetails?.duration || '';
    const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    
    const hours = durationMatch && durationMatch[1] ? parseInt(durationMatch[1]) : 0;
    const minutes = durationMatch && durationMatch[2] ? parseInt(durationMatch[2]) : 0;
    const seconds = durationMatch && durationMatch[3] ? parseInt(durationMatch[3]) : 0;
    
    return {
      id: videoId,
      title: snippet.title || '',
      channelTitle: snippet.channelTitle || '',
      channelId: snippet.channelId || '',
      description: snippet.description || '',
      thumbnails: snippet.thumbnails || {},
      publishedAt: snippet.publishedAt || null,
      views: parseInt(statistics.viewCount || '0'),
      likes: parseInt(statistics.likeCount || '0'),
      comments: parseInt(statistics.commentCount || '0'),
      duration: {
        hours,
        minutes,
        seconds,
        totalSeconds: hours * 3600 + minutes * 60 + seconds
      }
    };
  } catch (error) {
    console.error('YouTube API 오류:', error.message);
    throw new Error(`YouTube 비디오 정보를 가져오는 중 오류 발생: ${error.message}`);
  }
}

/**
 * YouTube 비디오 URL 목록에서 상세 정보 가져오기
 * @param {Array<string>} urls - YouTube 비디오 URL 배열 또는 직접 비디오 ID 배열
 * @return {Promise<Array<Object>>} - 비디오 정보 배열
 */
export async function getVideosFromUrls(urls) {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    console.log('getVideosFromUrls: 유효한 URL 또는 비디오 ID가 없습니다');
    return [];
  }
  
  try {
    console.log('getVideosFromUrls: YouTube API 키 확인:', !!process.env.YOUTUBE_API_KEY);
    
    // URL인지 ID인지 확인하여 ID 추출
    let videoIds;
    if (urls[0].includes('youtube.com') || urls[0].includes('youtu.be')) {
      // URL 배열에서 비디오 ID 추출
      console.log('getVideosFromUrls: URL에서 비디오 ID 추출 중...');
      videoIds = urls
        .map(url => extractVideoId(url))
        .filter(Boolean); // null이나 undefined 제거
    } else {
      // 이미 ID 배열인 경우
      console.log('getVideosFromUrls: 이미 비디오 ID 배열로 전달됨');
      videoIds = urls;
    }
    
    console.log('getVideosFromUrls: 처리할 비디오 ID:', videoIds);
    
    if (videoIds.length === 0) {
      console.log('getVideosFromUrls: 유효한 비디오 ID가 없습니다');
      return [];
    }
    
    // API 키 확인
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('getVideosFromUrls: YouTube API 키가 설정되지 않았습니다');
      return [];
    }
    
    // 한 번의 API 호출로 최대 50개의 비디오 정보 가져오기
    console.log('getVideosFromUrls: YouTube API 호출 시작');
    const response = await youtube.videos.list({
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(',')
    });
    
    console.log('getVideosFromUrls: YouTube API 응답 확인:', 
                response?.data ? 
                `${response.data.items?.length || 0}개의 비디오 정보 수신됨` : 
                '응답 데이터 없음');
    
    if (!response.data || !response.data.items) {
      console.error('getVideosFromUrls: YouTube API 응답에 items 필드가 없습니다');
      return [];
    }
    
    // 비디오 정보 매핑
    const results = response.data.items.map(video => {
      const snippet = video.snippet || {};
      const statistics = video.statistics || {};
      
      return {
        id: video.id,
        title: snippet.title || '',
        channelTitle: snippet.channelTitle || '',
        publishedAt: snippet.publishedAt || null,
        views: parseInt(statistics.viewCount || '0'),
        likes: parseInt(statistics.likeCount || '0'),
        thumbnails: snippet.thumbnails || {}
      };
    });
    
    console.log(`getVideosFromUrls: ${results.length}개의 비디오 정보 매핑 완료`);
    
    // 첫 번째 결과의 샘플 데이터 로깅
    if (results.length > 0) {
      console.log('getVideosFromUrls: 첫 번째 결과 샘플:', {
        id: results[0].id,
        title: results[0].title,
        views: results[0].views,
        likes: results[0].likes
      });
    }
    
    return results;
  } catch (error) {
    console.error('getVideosFromUrls: YouTube API 호출 오류:', error.message);
    return [];
  }
}

/**
 * YouTube API를 통해 뮤직비디오 정보를 추가합니다.
 * @param {Array} videos - 정보를 추가할 비디오 목록
 * @returns {Array} - 정보가 추가된 비디오 목록
 */
export async function enrichMusicVideos(videos) {
  if (!videos || videos.length === 0) {
    console.log('정보를 추가할 비디오가 없습니다.');
    return [];
  }

  try {
    console.log(`${videos.length}개 비디오에 YouTube 정보 추가 중...`);
    
    const enrichedVideos = [];
    
    for (const video of videos) {
      try {
        if (!video.url && !video.youtubeUrl) {
          console.log('URL이 없는 비디오를 건너뜁니다:', video);
          enrichedVideos.push(video);
          continue;
        }
        
        // YouTube URL에서 비디오 ID 추출
        const videoUrl = video.url || video.youtubeUrl;
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
          console.log('유효하지 않은 YouTube URL:', videoUrl);
          enrichedVideos.push(video);
          continue;
        }
        
        // YouTube API를 통해 비디오 정보 가져오기 (재시도 로직 포함)
        const videoDetails = await fetchVideoDetailsWithRetry(videoId);
        
        if (videoDetails) {
          enrichedVideos.push({
            ...video,
            ...videoDetails
          });
        } else {
          // API 요청이 실패하면 원본 비디오 정보만 반환
          console.log(`비디오 ID ${videoId}에 대한 정보를 가져오는데 실패했습니다.`);
          enrichedVideos.push(video);
        }
      } catch (videoError) {
        console.error('비디오 정보 처리 중 오류:', videoError.message);
        enrichedVideos.push(video);
      }
    }
    
    return enrichedVideos;
  } catch (error) {
    console.error('YouTube 정보 추가 중 오류 발생:', error.message);
    return videos; // 오류 발생 시 원본 비디오 목록 반환
  }
}

/**
 * YouTube API를 호출하여 비디오 정보를 가져옵니다. 쿼터 제한 초과 시 재시도 로직 포함.
 * @param {string} videoId - YouTube 비디오 ID
 * @returns {Object|null} - 비디오 정보 또는 null
 */
async function fetchVideoDetailsWithRetry(videoId, attempt = 1) {
  try {
    console.log(`비디오 ID ${videoId} 정보 요청 중... (시도: ${attempt}/${MAX_RETRY_ATTEMPTS})`);
    
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'snippet,statistics',
        id: videoId,
        key: API_KEY
      }
    });
    
    // 응답 데이터 처리
    const items = response.data.items;
    if (!items || items.length === 0) {
      console.log(`비디오 ID ${videoId}에 대한 정보를 찾을 수 없습니다.`);
      return null;
    }
    
    const videoData = items[0];
    return {
      title: videoData.snippet.title,
      thumbnail: videoData.snippet.thumbnails.high?.url || videoData.snippet.thumbnails.default?.url,
      publishedAt: videoData.snippet.publishedAt,
      viewCount: parseInt(videoData.statistics.viewCount, 10) || 0,
      likeCount: parseInt(videoData.statistics.likeCount, 10) || 0,
      commentCount: parseInt(videoData.statistics.commentCount, 10) || 0
    };
  } catch (error) {
    // API 쿼터 초과 오류 처리
    if (
      (error.response && error.response.status === 403 && 
       (error.response.data.error.errors.some(e => e.reason === 'quotaExceeded') || 
        error.response.data.error.errors.some(e => e.reason === 'dailyLimitExceeded'))) || 
      (error.message && error.message.includes('quota'))
    ) {
      console.error('YouTube API 쿼터 한도 초과:', error.message);
      
      // 재시도 횟수가 남아있으면 지수 백오프로 재시도
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`${delay}ms 후 재시도합니다... (${attempt}/${MAX_RETRY_ATTEMPTS})`);
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(fetchVideoDetailsWithRetry(videoId, attempt + 1));
          }, delay);
        });
      } else {
        console.error(`최대 재시도 횟수(${MAX_RETRY_ATTEMPTS})를 초과했습니다. 처리를 중단합니다.`);
        return null;
      }
    }
    
    // 다른 오류 처리
    console.error(`비디오 ID ${videoId} 정보 요청 중 오류:`, error.message);
    return null;
  }
} 