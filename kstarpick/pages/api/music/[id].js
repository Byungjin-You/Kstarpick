import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import Music from '../../../models/Music';
import { ObjectId } from 'mongodb';
import dbConnect from '../../../lib/dbConnect';
import { isAdmin } from '../../../lib/auth';

/**
 * @swagger
 * /api/music/{id}:
 *   get:
 *     description: 특정 음악 정보를 가져옵니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 음악 ID
 *     responses:
 *       200:
 *         description: 음악 정보
 *       404:
 *         description: 음악을 찾을 수 없음
 *   put:
 *     description: 음악 정보를 수정합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 음악 ID
 *     responses:
 *       200:
 *         description: 음악 정보가 성공적으로 수정됨
 *       400:
 *         description: 유효하지 않은 입력
 *       401:
 *         description: 인증되지 않음
 *       404:
 *         description: 음악을 찾을 수 없음
 *   delete:
 *     description: 음악을 삭제합니다.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: 음악 ID
 *     responses:
 *       200:
 *         description: 음악이 성공적으로 삭제됨
 *       401:
 *         description: 인증되지 않음
 *       404:
 *         description: 음악을 찾을 수 없음
 */
export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  await dbConnect();

  switch (method) {
    // 단일 음악 조회
    case 'GET':
      try {
        const music = await Music.findById(id);
        
        if (!music) {
          return res.status(404).json({ 
            success: false, 
            message: '해당 음악을 찾을 수 없습니다.' 
          });
        }

        // 조회수 증가
        await Music.findByIdAndUpdate(id, { $inc: { views: 1 } });
        
        // 일일 조회수 필드 확인 및 응답에 추가
        const dailyViewsFields = {
          dailyViews: music.dailyViews,
          dailyview: music.dailyview,
          dailyView: music.dailyView
        };
        
        console.log('GET API 음악 상세 조회, 일일 조회수 관련 필드:', dailyViewsFields);
        
        // 필드가 없으면 dailyViews 필드를 views의 2%로 설정
        if (music.dailyViews === undefined && music.dailyview === undefined && music.dailyView === undefined) {
          music.dailyViews = Math.round((music.views || 0) * 0.02);
        }
        // dailyViews가 undefined지만 다른 필드가 있는 경우
        else if (music.dailyViews === undefined) {
          if (music.dailyview !== undefined) {
            music.dailyViews = music.dailyview;
          } else if (music.dailyView !== undefined) {
            music.dailyViews = music.dailyView;
          }
        }
        
        return res.status(200).json({ 
          success: true, 
          music 
        });
      } catch (error) {
        console.error('음악 조회 오류:', error);
        return res.status(500).json({ 
          success: false, 
          message: '서버 오류가 발생했습니다.' 
        });
      }
      break;
      
    // 음악 정보 업데이트
    case 'PUT':
      try {
        // 관리자 권한 확인 - 임시 제거
        /*
        const adminCheck = await isAdmin(req);
        if (!adminCheck) {
          return res.status(401).json({ 
            success: false, 
            message: '관리자 권한이 필요합니다.' 
          });
        }
        */
        
        // 데이터 유효성 검사 및 변환
        const updateData = { ...req.body };
        
        // 숫자 필드 변환
        if (updateData.dailyViews !== undefined) {
          const dailyViewsValue = parseInt(updateData.dailyViews) || 0;
          updateData.dailyViews = dailyViewsValue;
          // 다른 필드명으로도 저장
          updateData.dailyview = dailyViewsValue;
          updateData.dailyView = dailyViewsValue;
        }
        
        if (updateData.views !== undefined) {
          updateData.views = parseInt(updateData.views) || 0;
        }
        
        if (updateData.likes !== undefined) {
          updateData.likes = parseInt(updateData.likes) || 0;
        }
        
        console.log('음악 업데이트 데이터:', {
          id,
          dailyViews: updateData.dailyViews,
          dailyview: updateData.dailyview,
          dailyView: updateData.dailyView,
          views: updateData.views
        });
        
        const music = await Music.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true
        });
        
        if (!music) {
          return res.status(404).json({ 
            success: false, 
            message: '해당 음악을 찾을 수 없습니다.' 
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: '음악 정보가 업데이트되었습니다.',
          music 
        });
      } catch (error) {
        console.error('음악 업데이트 오류:', error);
        
        // MongoDB 유효성 검사 오류
        if (error.name === 'ValidationError') {
          const messages = Object.values(error.errors).map(val => val.message);
          return res.status(400).json({ 
            success: false, 
            message: messages[0]
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          message: '서버 오류가 발생했습니다.' 
        });
      }
      break;
      
    // 음악 삭제
    case 'DELETE':
      try {
        // 관리자 권한 확인 - 임시 제거
        /*
        const adminCheck = await isAdmin(req);
        if (!adminCheck) {
          return res.status(401).json({ 
            success: false, 
            message: '관리자 권한이 필요합니다.' 
          });
        }
        */
        
        const deletedMusic = await Music.findByIdAndDelete(id);
        
        if (!deletedMusic) {
          return res.status(404).json({ 
            success: false, 
            message: '해당 음악을 찾을 수 없습니다.' 
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: '음악이 삭제되었습니다.' 
        });
      } catch (error) {
        console.error('음악 삭제 오류:', error);
        return res.status(500).json({ 
          success: false, 
          message: '서버 오류가 발생했습니다.' 
        });
      }
      break;
      
    // 좋아요 증가
    case 'PATCH':
      try {
        if (req.body.action === 'like') {
          const music = await Music.findByIdAndUpdate(
            id, 
            { $inc: { likes: 1 } },
            { new: true }
          );
          
          if (!music) {
            return res.status(404).json({ 
              success: false, 
              message: '해당 음악을 찾을 수 없습니다.' 
            });
          }
          
          return res.status(200).json({ 
            success: true, 
            message: '좋아요가 추가되었습니다.',
            likes: music.likes 
          });
        } else {
          return res.status(400).json({ 
            success: false, 
            message: '지원되지 않는 작업입니다.' 
          });
        }
      } catch (error) {
        console.error('좋아요 처리 오류:', error);
        return res.status(500).json({ 
          success: false, 
          message: '서버 오류가 발생했습니다.' 
        });
      }
      break;
      
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
      res.status(405).json({ 
        success: false, 
        message: `Method ${method} Not Allowed` 
      });
  }
}

// YouTube URL에서 비디오 ID 추출하는 함수
function extractYoutubeVideoId(url) {
  if (!url) return null;
  
  // YouTube URL 패턴
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^?]+)/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^?]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
} 