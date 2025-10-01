import axios from 'axios';

export default async function handler(req, res) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  try {
    console.log(`Proxying request to: ${url}`);
    
    // URL 유효성 검사
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // 이미지 데이터 가져오기
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // 콘텐츠 타입 확인
    const contentType = response.headers['content-type'];
    console.log(`Received content type: ${contentType}`);
    
    // 응답 헤더 설정
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24시간 캐싱
    
    // 이미지 데이터 반환
    return res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch the requested resource' });
  }
} 