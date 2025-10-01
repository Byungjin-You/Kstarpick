import dbConnect from '../../../lib/dbConnect';
import Music from '../../../models/Music';
import { isAdmin, verifyToken } from '../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connectToDatabase } from '../../../utils/mongodb';

/**
 * 음악 레코드의 position 값을 일일 조회수 기준으로 재설정하는 엔드포인트
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // 강화된 관리자 권한 확인
    let isAuthorized = false;
    let userInfo = null;
    
    // 1. NextAuth 세션 확인
    try {
      const session = await getServerSession(req, res, authOptions);
      if (session && session.user && session.user.role === 'admin') {
        isAuthorized = true;
        userInfo = session.user;
        console.log('[MUSIC POSITION] NextAuth session found:', userInfo.email);
      }
    } catch (sessionError) {
      console.log('[MUSIC POSITION] NextAuth session check failed:', sessionError.message);
    }
    
    // 2. JWT 토큰 확인 (NextAuth가 실패한 경우)
    if (!isAuthorized) {
      try {
        const user = await verifyToken(req);
        if (user && (user.role === 'admin' || user.isAdmin)) {
          isAuthorized = true;
          userInfo = user;
          console.log('[MUSIC POSITION] JWT token found:', userInfo.email);
        }
      } catch (tokenError) {
        console.log('[MUSIC POSITION] JWT token check failed:', tokenError.message);
      }
    }
    
    // 3. 직접 데이터베이스에서 사용자 확인 (마지막 수단)
    if (!isAuthorized) {
      const email = req.headers['x-user-email']; // 커스텀 헤더로 이메일 전달
      
      if (email) {
        try {
          const { db } = await connectToDatabase();
          const user = await db.collection('users').findOne({ email });
          if (user && user.role === 'admin') {
            isAuthorized = true;
            userInfo = user;
            console.log('[MUSIC POSITION] Database user found:', userInfo.email);
          }
        } catch (dbError) {
          console.log('[MUSIC POSITION] Database user check failed:', dbError.message);
        }
      }
    }
    
    if (!isAuthorized) {
      console.log('[MUSIC POSITION] Authorization failed - no valid admin credentials found');
      return res.status(401).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }
    
    console.log('[MUSIC POSITION] Authorization successful for:', userInfo.email);

    await dbConnect();

    console.log('순위 데이터 수정 시작');

    // 1. 모든 음악 가져오기
    const allMusic = await Music.find().exec();
    console.log(`DB에서 가져온 음악 수: ${allMusic.length}`);

    // 2. 일일 조회수 데이터 준비
    const musicWithViews = allMusic.map(music => {
      // 일일 조회수 통합 필드에서 찾기
      let dailyViewCount = 0;
      
      if (typeof music.dailyViews === 'number') {
        dailyViewCount = music.dailyViews;
      } else if (typeof music.dailyview === 'number') {
        dailyViewCount = music.dailyview;
      } else if (typeof music.dailyView === 'number') {
        dailyViewCount = music.dailyView;
      } else {
        // 기본값: 총 조회수의 2%
        dailyViewCount = Math.round((music.views || 0) * 0.02);
      }
      
      console.log(`ID: ${music._id}, 제목: ${music.title}, 조회수: ${dailyViewCount}`);
      
      return {
        _id: music._id,
        title: music.title,
        dailyViews: dailyViewCount,
        originalPosition: typeof music.position === 'number' ? music.position : 99
      };
    });

    // 3. 일일 조회수 기준 정렬
    const sortedMusic = [...musicWithViews].sort((a, b) => b.dailyViews - a.dailyViews);
    
    console.log('정렬 결과 (상위 3개):');
    sortedMusic.slice(0, 3).forEach((item, index) => {
      console.log(`${index + 1}위: ${item.title}, 조회수: ${item.dailyViews}`);
    });

    // 4. 업데이트 실행 (순차적으로)
    const updates = [];
    for (let i = 0; i < sortedMusic.length; i++) {
      const music = sortedMusic[i];
      const newPosition = i + 1;
      const oldPosition = music.originalPosition;
      
      console.log(`순위 업데이트: "${music.title}" → ${newPosition}위 (이전: ${oldPosition}위)`);
      
      try {
        // 직접 모델을 찾아서 업데이트 (save 사용)
        const musicDoc = await Music.findById(music._id);
        
        if (musicDoc) {
          // 속성 직접 설정
          musicDoc.position = newPosition;
          musicDoc.previousPosition = oldPosition;
          
          // 저장
          await musicDoc.save();
          
          updates.push({
            id: music._id.toString(),
            title: music.title,
            oldPosition,
            newPosition
          });
          
          console.log(`저장 성공: "${music.title}" → ${newPosition}위`);
        } else {
          console.log(`음악 찾기 실패: ${music._id}, "${music.title}"`);
        }
      } catch (error) {
        console.error(`업데이트 오류 (${music.title}):`, error.message);
      }
    }

    // 5. 업데이트 결과 확인
    console.log(`총 ${updates.length}개 음악의 순위가 업데이트됨`);
    
    return res.status(200).json({
      success: true,
      message: `${updates.length}개 음악의 순위가 일일 조회수 기준으로 업데이트되었습니다.`,
      updates
    });
    
  } catch (error) {
    console.error('Position 수정 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
} 