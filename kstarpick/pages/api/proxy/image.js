export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Soompi URL 검증
  if (!url.includes('soompi.io') && !url.includes('soompi.com')) {
    return res.status(400).json({ error: 'Invalid image source' });
  }

  try {
    // 외부 이미지 가져오기
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.soompi.com/',
      },
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const contentType = response.headers.get('content-type');
    
    // 이미지 타입 검증
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // 캐시 헤더 설정 (24시간)
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', contentType);
    
    // 이미지 데이터 스트리밍
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
} 