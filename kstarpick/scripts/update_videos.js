const fs = require('fs');
const fetch = require('node-fetch');

async function updateVideos() {
  try {
    // 영화 데이터 읽기
    const movieData = JSON.parse(fs.readFileSync('movie.json', 'utf8'));
    const movieInfo = movieData.data;
    
    console.log('영화 제목:', movieInfo.title);
    console.log('영화 원제:', movieInfo.originalTitle);
    
    // 원제가 있으면 원제 + 영화 키워드, 없으면 타이틀 + 영화 키워드
    const searchQuery = movieInfo.originalTitle 
      ? `${movieInfo.originalTitle} 영화` 
      : `${movieInfo.title} 영화`;
    
    console.log('검색 쿼리:', searchQuery);
    
    // YouTube API 호출
    const youtubeApiUrl = `http://localhost:3000/api/youtube/search-videos?title=${encodeURIComponent(searchQuery)}&maxResults=5`;
    console.log('YouTube API URL:', youtubeApiUrl);
    
    const youtubeResponse = await fetch(youtubeApiUrl);
    const youtubeData = await youtubeResponse.json();
    
    if (youtubeData.success && youtubeData.data && youtubeData.data.length > 0) {
      console.log(`${youtubeData.data.length}개 영상 찾음`);
      
      // 영상 정보 변환
      const videos = youtubeData.data.map(video => ({
        title: video.title,
        type: video.title.toLowerCase().includes('trailer') ? 'trailer' : 
              video.title.toLowerCase().includes('teaser') ? 'teaser' : 'other',
        url: video.url,
        viewCount: video.viewCount,
        publishedAt: video.publishedAt
      }));
      
      // 영화 정보 업데이트
      movieInfo.videos = videos;
      
      // 업데이트된 정보 저장
      const response = await fetch(`http://localhost:3000/api/dramas/${movieInfo._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(movieInfo),
      });
      
      const result = await response.json();
      console.log('업데이트 결과:', result);
      
      if (result.success) {
        console.log('영화 영상 정보가 성공적으로 업데이트되었습니다!');
      } else {
        console.error('영화 정보 업데이트 실패:', result.message);
      }
    } else {
      console.log('영상을 찾지 못했거나 API 응답이 올바르지 않습니다');
    }
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

updateVideos(); 