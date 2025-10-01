import dbConnect from '../../../lib/dbConnect';
import Music from '../../../models/Music';
import { isAdmin, verifyToken } from '../../../lib/auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connectToDatabase } from '../../../utils/mongodb';

/**
 * 음악 레코드의 조회수(일일/총) 정보를 업데이트하는 엔드포인트
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
        console.log('[MUSIC UPDATE] NextAuth session found:', userInfo.email);
      }
    } catch (sessionError) {
      console.log('[MUSIC UPDATE] NextAuth session check failed:', sessionError.message);
    }
    
    // 2. JWT 토큰 확인 (NextAuth가 실패한 경우)
    if (!isAuthorized) {
      try {
        const user = await verifyToken(req);
        if (user && (user.role === 'admin' || user.isAdmin)) {
          isAuthorized = true;
          userInfo = user;
          console.log('[MUSIC UPDATE] JWT token found:', userInfo.email);
        }
      } catch (tokenError) {
        console.log('[MUSIC UPDATE] JWT token check failed:', tokenError.message);
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
            console.log('[MUSIC UPDATE] Database user found:', userInfo.email);
          }
        } catch (dbError) {
          console.log('[MUSIC UPDATE] Database user check failed:', dbError.message);
        }
      }
    }
    
    if (!isAuthorized) {
      console.log('[MUSIC UPDATE] Authorization failed - no valid admin credentials found');
      return res.status(401).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }
    
    console.log('[MUSIC UPDATE] Authorization successful for:', userInfo.email);

    await dbConnect();

    // 모든 음악 레코드 조회 (lean() 사용하지 않음)
    const allMusic = await Music.find({});
    console.log(`전체 음악 레코드 수: ${allMusic.length}`);

    // 업데이트 결과 추적
    const updates = [];

    // 각 음악 레코드 업데이트
    for (const music of allMusic) {
      // 현재 값 로깅
      console.log(`업데이트 전 - ID: ${music._id}, 제목: ${music.title}, views: ${music.views}, dailyViews: ${music.dailyViews || music.dailyview || music.dailyView || '미설정'}`);
      
      // 기존 값 형식 변환 (문자열 → 숫자)
      const oldViews = typeof music.views === 'number' ? music.views : parseInt(music.views) || 0;
      
      // 일일 조회수 필드 찾기
      let oldDailyViews = 0;
      if (typeof music.dailyViews === 'number') {
        oldDailyViews = music.dailyViews;
      } else if (typeof music.dailyview === 'number') {
        oldDailyViews = music.dailyview;
      } else if (typeof music.dailyView === 'number') {
        oldDailyViews = music.dailyView;
      } else {
        // 기본값: 총 조회수의 2%
        oldDailyViews = Math.round(oldViews * 0.02);
      }
      
      // 기존 포지션 값 가져오기
      const oldPosition = music.position || 99;
      const oldPreviousPosition = music.previousPosition || oldPosition;
      
      // 새로운 총 조회수 계산 (기존 + 0~5% 증가)
      const viewsIncrease = Math.max(100, Math.round(oldViews * (Math.random() * 0.05)));
      const newViews = oldViews + viewsIncrease;
      
      // 새로운 일일 조회수 계산 (총 조회수의 1~3%)
      const newDailyViews = Math.max(50, Math.round(newViews * (Math.random() * 0.02 + 0.01)));
      
      try {
        // 직접 모델 인스턴스 속성 변경
        music.views = newViews;
        music.totalViews = newViews;
        music.dailyViews = newDailyViews;
        music.dailyview = newDailyViews;
        music.dailyView = newDailyViews;
        
        // 저장
        await music.save();
        
        console.log(`업데이트 후 - ID: ${music._id}, 제목: ${music.title}, 신규 views: ${newViews}, 신규 dailyViews: ${newDailyViews}`);
        
        updates.push({
          id: music._id.toString(),
          title: music.title,
          oldViews,
          newViews,
          oldDailyViews,
          newDailyViews,
          position: oldPosition,
          previousPosition: oldPreviousPosition,
          diff: `+${viewsIncrease} / +${newDailyViews - oldDailyViews}`
        });
      } catch (error) {
        console.error(`음악 조회수 업데이트 오류 - ${music.title}:`, error);
      }
    }
    
    // 업데이트 후 데이터베이스 상태 확인
    const updatedMusic = await Music.find({}).sort({ dailyViews: -1 }).limit(3);
    console.log("조회수 업데이트 후 상위 3개 음악 (일일 조회수 기준):");
    for (const music of updatedMusic) {
      console.log(`ID: ${music._id}, 제목: ${music.title}, dailyViews: ${music.dailyViews}, views: ${music.views}, position: ${music.position}`);
    }

    // 조회수 기준으로 순위 재정렬
    console.log('조회수 기준으로 순위 정렬을 시작합니다.');
    
    // 일일 조회수 기준으로 정렬하여 새로 조회
    const musicForSorting = await Music.find({}).sort({ dailyViews: -1 });
    
    // 순위 업데이트
    const positionUpdates = [];
    for (let i = 0; i < musicForSorting.length; i++) {
      const music = musicForSorting[i];
      const newPosition = i + 1;
      const oldPosition = typeof music.position === 'number' ? music.position : 99;
      
      if (newPosition !== oldPosition) {
        console.log(`"${music.title}" 순위 변경: ${oldPosition} → ${newPosition}`);
        
        // 순위 업데이트
        music.previousPosition = oldPosition;
        music.position = newPosition;
        
        // 저장
        await music.save();
        
        positionUpdates.push({
          id: music._id.toString(),
          title: music.title,
          oldPosition,
          newPosition
        });
      }
    }
    
    // 결과 반환
    return res.status(200).json({
      success: true,
      message: `${updates.length}개 음악의 조회수가 업데이트되었으며, ${positionUpdates.length}개 음악의 순위가 재조정되었습니다.`,
      updates,
      positionUpdates
    });
  } catch (error) {
    console.error('조회수 업데이트 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}