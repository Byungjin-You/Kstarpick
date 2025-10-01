import dbConnect from '../../../../lib/dbConnect';
import Celebrity from '../../../../models/Celebrity';

export default async function handler(req, res) {
  const { method } = req;
  const { slug } = req.query;
  
  // DB 연결
  await dbConnect();
  
  // HTTP 메소드 확인
  switch (method) {
    case 'GET':
      try {
        // slug로 셀럽 찾기
        const celebrity = await Celebrity.findOne({ slug: slug });
        
        // 셀럽을 찾을 수 없는 경우
        if (!celebrity) {
          return res.status(404).json({ success: false, error: '해당 셀럽을 찾을 수 없습니다.' });
        }
        
        res.status(200).json({ success: true, data: celebrity });
      } catch (error) {
        console.error('셀럽 조회 오류:', error);
        res.status(400).json({ success: false, error: error.message });
      }
      break;
      
    default:
      res.status(405).json({ success: false, error: '허용되지 않는 메소드입니다.' });
      break;
  }
} 