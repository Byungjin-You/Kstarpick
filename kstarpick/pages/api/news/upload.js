import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { getSession } from 'next-auth/react';

// formidable을 사용하기 위해 bodyParser 사용 중지
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * @swagger
 * /api/news/upload:
 *   post:
 *     description: Uploads an image for news articles
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid file
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    // 세션 확인 (개발 모드에서는 생략)
    const session = await getSession({ req });
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment && (!session || !session.user)) {
      return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
    }

    // 폼 데이터 파싱
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB 제한
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('이미지 업로드 중 오류 발생:', err);
        return res.status(500).json({ success: false, message: '이미지 업로드 중 오류가 발생했습니다.' });
      }

      // formidable v3에서는 files.image가 배열로 반환됨
      const imageFileRaw = files.image;
      const imageFile = Array.isArray(imageFileRaw) ? imageFileRaw[0] : imageFileRaw;

      if (!imageFile) {
        return res.status(400).json({ success: false, message: '이미지 파일이 필요합니다.' });
      }

      // 파일 타입 확인
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(imageFile.mimetype)) {
        return res.status(400).json({ 
          success: false, 
          message: '지원되지 않는 파일 형식입니다. JPEG, PNG, WebP, GIF만 허용됩니다.' 
        });
      }

      try {
        // 업로드 디렉토리 확인 및 생성
        const uploadDir = path.join(process.cwd(), 'public/uploads/news');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        // 파일명 생성 및 저장
        const fileName = `${Date.now()}-${imageFile.originalFilename}`;
        const newPath = path.join(uploadDir, fileName);

        // 파일 복사
        fs.copyFileSync(imageFile.filepath, newPath);

        // 응답 반환
        return res.status(200).json({
          success: true,
          message: '이미지가 성공적으로 업로드되었습니다.',
          data: {
            url: `/uploads/news/${fileName}`,
            fileName: fileName,
            originalName: imageFile.originalFilename,
            size: imageFile.size
          }
        });
      } catch (error) {
        console.error('파일 저장 중 오류:', error);
        return res.status(500).json({ success: false, message: '파일 저장 중 오류가 발생했습니다.' });
      }
    });
  } catch (error) {
    console.error('서버 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
} 