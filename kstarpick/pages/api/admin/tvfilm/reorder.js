import { connectToDatabase } from '../../../../utils/mongodb';
import { verifyToken } from '../../../../lib/auth';
import { ObjectId } from 'mongodb';
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
    
    console.log('업데이트할 영화 ID:', ids);
    
    // 데이터베이스 연결
    const { db } = await connectToDatabase();
    
    // 영화 정보 컬렉션
    const tvfilmCollection = db.collection('tvfilms');
    
    // 각 영화에 순서 번호(orderNumber)를 업데이트
    const updatePromises = ids.map(async (id, index) => {
      // Convert string ID to ObjectId
      let objectId;
      try {
        objectId = ObjectId.isValid(id) ? new ObjectId(id) : id;
      } catch (error) {
        console.error(`ID 변환 오류 (${id}):`, error);
        return null;
      }
      
      return tvfilmCollection.updateOne(
        { _id: objectId },
        { $set: { orderNumber: index + 1, updatedAt: new Date() } }
      );
    });
    
    // 모든 업데이트 완료 대기
    const results = await Promise.all(updatePromises);
    
    // 업데이트 결과 확인
    const successCount = results.filter(r => r && r.modifiedCount > 0).length;
    
    // 항목이 하나도 업데이트되지 않았지만 오류는 아닌 경우를 처리
    return res.status(200).json({ 
      success: true, 
      message: successCount > 0 
        ? `영화/TV 순서가 성공적으로 업데이트되었습니다. (${successCount}/${ids.length} 항목 업데이트)`
        : `업데이트할 항목을 찾을 수 없습니다. ID를 확인해주세요.`,
      updatedCount: successCount,
      idsProcessed: ids
    });
    
  } catch (error) {
    console.error('영화/TV 재정렬 처리 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '순서 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
} 