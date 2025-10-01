import { connectToDatabase } from '../../../../utils/mongodb';
import { verifyToken } from '../../../../lib/auth';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { id } = req.query;
  const token = req.headers.authorization?.split(' ')[1] || '';

  try {
    // 관리자 인증 확인
    const decodedToken = await verifyToken(token);
    if (!decodedToken || !decodedToken.isAdmin) {
      return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }

    // DB 연결
    const { db } = await connectToDatabase();
    const tvfilmCollection = db.collection('tvfilms');

    // Convert string ID to ObjectId if valid
    let objectId;
    try {
      objectId = ObjectId.isValid(id) ? new ObjectId(id) : id;
    } catch (error) {
      console.error(`Invalid ID format: ${id}`, error);
      return res.status(400).json({ success: false, message: '유효하지 않은 ID 형식입니다.' });
    }

    // GET 요청: TV/Film 정보 조회
    if (req.method === 'GET') {
      const tvfilm = await tvfilmCollection.findOne({ _id: objectId });
      
      if (!tvfilm) {
        return res.status(404).json({ success: false, message: '해당 TV/Film을 찾을 수 없습니다.' });
      }

      return res.status(200).json({ success: true, data: tvfilm });
    }

    // PUT 요청: TV/Film 정보 업데이트
    if (req.method === 'PUT') {
      const updateData = req.body;
      updateData.updatedAt = new Date();
      
      const result = await tvfilmCollection.updateOne(
        { _id: objectId },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: '해당 TV/Film을 찾을 수 없습니다.' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'TV/Film 정보가 성공적으로 업데이트되었습니다.',
        modifiedCount: result.modifiedCount
      });
    }

    // DELETE 요청: TV/Film 삭제
    if (req.method === 'DELETE') {
      const result = await tvfilmCollection.deleteOne({ _id: objectId });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: '해당 TV/Film을 찾을 수 없습니다.' });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'TV/Film이 성공적으로 삭제되었습니다.'
      });
    }

    // 허용되지 않는 메소드
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });

  } catch (error) {
    console.error('TV/Film API 처리 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: error.message 
    });
  }
} 