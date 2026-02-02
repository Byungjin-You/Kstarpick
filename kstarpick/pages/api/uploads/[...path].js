import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { path: pathSegments } = req.query;
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments);

    // 보안: 경로 탐색 공격 방지
    const normalizedPath = path.normalize(filePath);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!normalizedPath.startsWith(uploadsDir)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // 파일 읽기
    const file = fs.readFileSync(filePath);

    // MIME 타입 결정
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // 캐시 헤더 설정
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return res.send(file);
  } catch (error) {
    console.error('File serve error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
