import { connectToDatabase } from '../../../utils/mongodb';

export default async function handler(req, res) {
  // DELETE 요청만 허용
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // 데이터베이스 연결
    const { db } = await connectToDatabase();
    
    // Soompi 뉴스 삭제 (source가 'Soompi'인 기사)
    const result = await db.collection('news').deleteMany({
      source: 'Soompi'
    });
    
    return res.status(200).json({
      success: true,
      message: `${result.deletedCount}개의 Soompi 뉴스 항목이 성공적으로 삭제되었습니다.`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Soompi 뉴스 삭제 중 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Soompi 뉴스 삭제 중 오류가 발생했습니다. ' + error.message 
    });
  }
} 