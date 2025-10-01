import dbConnect from '../../../lib/dbConnect';
import Celebrity from '../../../models/Celebrity';
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;
  
  // DB 연결
  await dbConnect();
  
  switch (method) {
    case 'GET':
      try {
        // ID로 셀럽 찾기
        const celebrity = await Celebrity.findById(id);
        
        if (!celebrity) {
          return res.status(404).json({ success: false, error: '셀럽을 찾을 수 없습니다.' });
        }
        
        // 소셜 미디어 팔로워 데이터가 없는 경우 빈 객체로 초기화
        if (!celebrity.socialMediaFollowers) {
          celebrity.socialMediaFollowers = {
            instagram: 0,
            twitter: 0,
            youtube: 0,
            spotify: 0,
            tiktok: 0,
            fancafe: 0
          };
        }
        
        // 뮤직비디오 정보 로깅
        if (celebrity.musicVideos && celebrity.musicVideos.length > 0) {
          console.log(`GET /api/celeb/${id} - musicVideos 필드 확인: ${celebrity.musicVideos.length}개의 뮤직비디오 있음`);
          console.log('변환된 데이터의 키:', Object.keys(celebrity.toObject()));
        }
        
        // MongoDB 문서를 일반 객체로 변환
        const celebData = celebrity.toObject();
        
        // 뮤직비디오 필드를 명시적으로 응답에 포함
        const responseData = {
          ...celebData,
          musicVideos: celebrity.musicVideos || []
        };
        
        res.status(200).json({ success: true, data: responseData });
      } catch (error) {
        console.error('셀럽 조회 오류:', error);
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
      }
      break;
      
    case 'PUT':
      try {
        // 인증 및 권한 확인
        const session = await unstable_getServerSession(req, res, authOptions);
        
        if (!session) {
          return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
        }
        
        if (session.user.role !== 'admin') {
          return res.status(403).json({ success: false, error: '관리자 권한이 필요합니다.' });
        }
        
        const updateData = req.body;
        
        // 데이터 유효성 검사
        if (!updateData.name) {
          return res.status(400).json({ success: false, error: 'Celebrity name is required' });
        }
        
        // 필요한 경우 기본값 설정
        if (!updateData.slug && updateData.name) {
          updateData.slug = updateData.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
        }
        
        // 소셜 미디어 관련 필드가 객체인지 확인하고, 없으면 초기화
        if (!updateData.socialMedia) updateData.socialMedia = {};
        if (!updateData.socialMediaFollowers) updateData.socialMediaFollowers = {};
        if (!updateData.socialMediaRankings) updateData.socialMediaRankings = {};
        if (!updateData.socialMediaChanges) updateData.socialMediaChanges = {};
        
        // 업데이트 타임스탬프 설정
        updateData.updatedAt = new Date();
        
        // 소셜 미디어 업데이트 날짜가 있으면 설정
        if (!updateData.socialMediaUpdatedAt) {
          updateData.socialMediaUpdatedAt = new Date();
        }
        
        // Celebrity 업데이트
        const celebrity = await Celebrity.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true
        });
        
        if (!celebrity) {
          return res.status(404).json({ success: false, error: 'Celebrity not found' });
        }
        
        return res.status(200).json({ 
          success: true, 
          data: celebrity 
        });
      } catch (error) {
        console.error('셀럽 업데이트 오류:', error);
        res.status(400).json({ success: false, error: error.message });
      }
      break;
      
    case 'DELETE':
      try {
        // 인증 및 권한 확인
        const session = await unstable_getServerSession(req, res, authOptions);
        
        if (!session) {
          return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
        }
        
        if (session.user.role !== 'admin') {
          return res.status(403).json({ success: false, error: '관리자 권한이 필요합니다.' });
        }
        
        // 셀럽 삭제
        const deletedCelebrity = await Celebrity.deleteOne({ _id: id });
        
        if (deletedCelebrity.deletedCount === 0) {
          return res.status(404).json({ success: false, error: '셀럽을 찾을 수 없습니다.' });
        }
        
        res.status(200).json({ success: true, data: {} });
      } catch (error) {
        console.error('셀럽 삭제 오류:', error);
        res.status(400).json({ success: false, error: error.message });
      }
      break;
      
    default:
      res.status(405).json({ success: false, error: '허용되지 않는 메소드입니다.' });
      break;
  }
} 