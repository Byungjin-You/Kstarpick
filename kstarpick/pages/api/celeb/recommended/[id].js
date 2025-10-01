import dbConnect from '../../../../lib/dbConnect';
import Celebrity from '../../../../models/Celebrity';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;
  
  // DB 연결
  await dbConnect();
  
  // HTTP 메소드 확인
  switch (method) {
    case 'GET':
      try {
        // 유효한 MongoDB ID인지 확인
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, error: '유효하지 않은 ID 형식입니다.' });
        }
        
        // 해당 ID의 연예인 찾기
        const celebrity = await Celebrity.findById(id);
        
        // 연예인을 찾을 수 없는 경우
        if (!celebrity) {
          return res.status(404).json({ success: false, error: '해당 연예인을 찾을 수 없습니다.' });
        }
        
        // 1. 동일한 카테고리의 연예인들 찾기
        const sameCategory = await Celebrity.find({
          _id: { $ne: id }, // 현재 연예인 제외
          category: celebrity.category, // 같은 카테고리
          isActive: true
        })
        .select('_id name koreanName profileImage category slug group')
        .sort({ followers: -1 }) // 팔로워 수 기준 정렬
        .limit(12);
        
        // 2. 같은 그룹의 연예인들 찾기 (그룹이 있는 경우)
        let sameGroup = [];
        if (celebrity.group) {
          sameGroup = await Celebrity.find({
            _id: { $ne: id }, // 현재 연예인 제외
            group: celebrity.group, // 같은 그룹
            isActive: true
          })
          .select('_id name koreanName profileImage category slug group')
          .limit(6);
        }
        
        // 3. 추천 결과 조합하기 (중복 제거)
        let recommended = [...sameGroup];
        
        // 같은 카테고리 연예인들 추가 (최대 12명까지)
        for (const celeb of sameCategory) {
          // 이미 추가된 연예인은 건너뛰기
          if (!recommended.some(r => r._id.toString() === celeb._id.toString())) {
            recommended.push(celeb);
            
            // 최대 12명까지만 추가
            if (recommended.length >= 12) break;
          }
        }
        
        // 충분한 수의 추천이 없으면 인기 연예인으로 채우기
        if (recommended.length < 6) {
          const popular = await Celebrity.find({
            _id: { $ne: id }, // 현재 연예인 제외
            isActive: true
          })
          .select('_id name koreanName profileImage category slug group')
          .sort({ followers: -1 }) // 팔로워 수 기준 정렬
          .limit(12 - recommended.length);
          
          // 중복 제거하여 추가
          for (const celeb of popular) {
            if (!recommended.some(r => r._id.toString() === celeb._id.toString())) {
              recommended.push(celeb);
            }
          }
        }
        
        res.status(200).json({ success: true, data: recommended });
      } catch (error) {
        console.error('추천 연예인 조회 오류:', error);
        res.status(400).json({ success: false, error: error.message });
      }
      break;
      
    default:
      res.status(405).json({ success: false, error: '허용되지 않는 메소드입니다.' });
      break;
  }
} 