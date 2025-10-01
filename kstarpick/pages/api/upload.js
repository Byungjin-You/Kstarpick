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

    // FormidableV3에 맞게 설정
    const formOptions = {
      maxFiles: 1,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      keepExtensions: true,
      multiples: false,
    };

    const [fields, files] = await new Promise((resolve, reject) => {
      const form = formidable(formOptions);
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('파싱 오류:', err);
          reject(err);
          return;
        }
        resolve([fields, files]);
      });
    });

    console.log('Fields:', fields);
    console.log('Files:', files);
    
    // formidable v3에서는 files.file이 배열이므로 첫 번째 항목을 가져옴
    const fileField = files.file;
    if (!fileField || fileField.length === 0) {
      console.error('파일을 찾을 수 없음');
      return res.status(400).json({ success: false, message: '이미지 파일이 필요합니다.' });
    }

    const imageFile = fileField[0];
    console.log('파일 정보:', {
      name: imageFile.originalFilename,
      type: imageFile.mimetype,
      size: imageFile.size,
      filepath: imageFile.filepath,
    });

    // 파일 타입 확인
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ 
        success: false, 
        message: '지원되지 않는 파일 형식입니다. JPEG, PNG, WebP, GIF만 허용됩니다.' 
      });
    }

    try {
      // 업로드 디렉토리 확인 및 생성 - TVFilm 전용 폴더 사용
      const uploadDir = path.join(process.cwd(), 'public/uploads/tvfilm');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // 파일명 생성 및 저장
      const fileName = `${Date.now()}-${imageFile.originalFilename}`;
      const newPath = path.join(uploadDir, fileName);

      // 파일 복사
      fs.copyFileSync(imageFile.filepath, newPath);
      console.log('파일 저장 성공:', newPath);

      // 응답 반환
      return res.status(200).json({
        success: true,
        message: '이미지가 성공적으로 업로드되었습니다.',
        fileUrl: `/uploads/tvfilm/${fileName}`,
        data: {
          url: `/uploads/tvfilm/${fileName}`,
          fileName: fileName,
          originalName: imageFile.originalFilename,
          size: imageFile.size
        }
      });
    } catch (error) {
      console.error('파일 저장 중 오류:', error);
      return res.status(500).json({ success: false, message: '파일 저장 중 오류가 발생했습니다.' });
    }
  } catch (error) {
    console.error('서버 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
} 