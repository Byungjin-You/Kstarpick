import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/utils/mongodb';

const IMAGE_DIR = path.join(process.cwd(), 'public', 'images', 'news');

// 디스크 캐시에서 이미지 찾기
function findCachedImage(hash) {
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  for (const ext of exts) {
    const filePath = path.join(IMAGE_DIR, `${hash}${ext}`);
    if (fs.existsSync(filePath)) {
      return { filePath, ext };
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { hash } = req.query;

  if (!hash || !/^[a-f0-9]{16}$/.test(hash)) {
    return res.status(400).json({ error: 'Invalid hash parameter' });
  }

  // 1. 디스크 캐시 확인 (가장 빠름 - DB 조회 없음)
  const cached = findCachedImage(hash);
  if (cached) {
    const contentTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
    };
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Content-Type', contentTypes[cached.ext] || 'image/jpeg');
    const stream = fs.createReadStream(cached.filePath);
    return stream.pipe(res);
  }

  // 2. DB에서 원본 URL 조회 (공유 연결 풀 사용)
  try {
    const { db } = await connectToDatabase();
    const imageRecord = await db.collection('image_hashes').findOne({ hash });

    if (!imageRecord) {
      if (process.env.NODE_ENV === 'development') {
        return res.redirect(307, '/images/news/default-news.jpg');
      }
      return res.status(404).json({ error: 'Image hash not found' });
    }

    // 3. 외부에서 이미지 다운로드
    const response = await fetch(imageRecord.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.soompi.com/',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // 10MB 초과 시 거부
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image too large' });
    }

    // 4. 디스크에 캐시 저장 (다음 요청부터 DB/외부 요청 불필요)
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';

    try {
      if (!fs.existsSync(IMAGE_DIR)) {
        fs.mkdirSync(IMAGE_DIR, { recursive: true });
      }
      fs.writeFileSync(path.join(IMAGE_DIR, `${hash}${ext}`), buffer);
    } catch (e) {
      console.error('[Hash Image] Failed to cache to disk:', e.message);
    }

    // 5. 응답
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Content-Type', contentType);
    res.send(buffer);

  } catch (error) {
    console.error('[Hash Image] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
}
