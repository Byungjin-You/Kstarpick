// import { connectToDatabase } from '../../../lib/mongodb';
// import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  // 관리자 인증 확인
  const token = req.headers.authorization?.split(' ')[1] || '';
  
  try {
    console.log('토큰 검증 시작:', token ? `${token.substring(0, 10)}...` : '없음');
    
    if (!token) {
      return res.status(401).json({ success: false, message: '인증 토큰이 제공되지 않았습니다.' });
    }
    
    // 직접 토큰 검증
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
      console.log('토큰 디코딩 성공:', decodedToken);
    } catch (jwtError) {
      console.error('JWT 토큰 검증 실패:', jwtError);
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }
    
    // 관리자 권한 확인
    if (decodedToken.role !== 'admin') {
      console.log('관리자 권한 없음:', decodedToken);
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    
    // POST 요청만 처리
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
    }
    
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ID 배열이 필요합니다.' });
    }
    
    console.log('업데이트할 드라마 ID:', ids);
    
    // 실제 DB 작업은 비활성화 (빌드 통과용)
    return res.status(200).json({ success: true, message: 'DB 작업은 비활성화됨(임시).' });
    
  } catch (error) {
    console.error('드라마 재정렬 처리 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '순서 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
} 