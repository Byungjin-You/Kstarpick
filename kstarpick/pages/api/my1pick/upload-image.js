import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }

  try {
    // 업로드 디렉토리 확인 및 생성
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'articles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    return new Promise((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Form parse error:', err);
          return resolve(res.status(500).json({
            success: false,
            message: '파일 업로드 중 오류가 발생했습니다.'
          }));
        }

        try {
          const file = files.file?.[0] || files.file;

          if (!file) {
            return resolve(res.status(400).json({
              success: false,
              message: '파일이 없습니다.'
            }));
          }

          // 유효한 이미지 파일 확인
          const validFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if (!validFileTypes.includes(file.mimetype)) {
            // 잘못된 파일 삭제
            if (fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
            return resolve(res.status(400).json({
              success: false,
              message: '유효한 이미지 파일이 아닙니다. (JPEG, PNG, GIF, WebP만 허용됩니다)',
            }));
          }

          // 파일명 생성
          const timestamp = Date.now();
          const ext = path.extname(file.originalFilename || file.newFilename);
          const newFilename = `article-${timestamp}${ext}`;
          const newPath = path.join(uploadDir, newFilename);

          // 파일 이동 (formidable이 임시 위치에 저장하므로)
          fs.renameSync(file.filepath, newPath);

          const imageUrl = `/uploads/articles/${newFilename}`;
          console.log('[Upload] Image saved:', imageUrl);

          return resolve(res.status(200).json({
            success: true,
            data: {
              url: imageUrl,
              filename: newFilename
            }
          }));

        } catch (error) {
          console.error('File processing error:', error);
          return resolve(res.status(500).json({
            success: false,
            message: '파일 처리 중 오류가 발생했습니다.',
            error: error.message
          }));
        }
      });
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
