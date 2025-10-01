import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';

/**
 * 드라마 데이터 백업 API
 * 현재 드라마 컬렉션의 데이터를 dramas_backup 컬렉션에 저장합니다.
 */
export default async function handler(req, res) {
  // GET 또는 POST 요청만 허용
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    // 데이터베이스 연결
    const { db } = await connectToDatabase();
    
    // 현재 시간을 백업 ID로 사용
    const backupId = new Date().toISOString();
    
    // 드라마 컬렉션의 모든 문서 가져오기
    const dramas = await db.collection('dramas').find({}).toArray();
    
    if (dramas.length === 0) {
      return res.status(404).json({
        success: false,
        message: '백업할 드라마 데이터가 없습니다.'
      });
    }
    
    // 각 드라마에 백업 메타데이터 추가
    const dramasWithBackupInfo = dramas.map(drama => ({
      ...drama,
      _originalId: drama._id,
      backupId,
      backupDate: new Date()
    }));
    
    // _id 필드 제거 (새 ID로 저장하기 위해)
    for (const drama of dramasWithBackupInfo) {
      delete drama._id;
    }
    
    // 백업 컬렉션에 저장
    const result = await db.collection('dramas_backup').insertMany(dramasWithBackupInfo);
    
    return res.status(200).json({
      success: true,
      message: `${result.insertedCount}개의 드라마 데이터가 성공적으로 백업되었습니다.`,
      data: {
        backupId,
        count: result.insertedCount,
        date: new Date()
      }
    });
    
  } catch (error) {
    console.error('드라마 백업 중 오류 발생:', error);
    return res.status(500).json({
      success: false,
      message: '드라마 백업 중 오류가 발생했습니다.',
      error: error.message
    });
  }
} 