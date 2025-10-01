import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';
import cookie from 'cookie';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { contentId, type } = req.query;
    
    if (!contentId || !type) {
      return res.status(400).json({ success: false, message: 'Content ID and type are required' });
    }
    
    // Get session for authentication
    const session = await getSession({ req });
    
    // 비로그인 사용자 처리 - 쿠키 사용
    if (!session) {
      try {
        // 클라이언트에서 쿠키 가져오기
        const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
        
        // 안전하게 JSON 파싱
        let likesCookie = {};
        let dislikesCookie = {};
        let bookmarksCookie = {};
        
        try {
          likesCookie = cookies.likes ? JSON.parse(cookies.likes) : {};
        } catch (e) {
          console.log('쿠키 파싱 오류 (likes):', e);
          likesCookie = {};
        }
        
        try {
          dislikesCookie = cookies.dislikes ? JSON.parse(cookies.dislikes) : {};
        } catch (e) {
          console.log('쿠키 파싱 오류 (dislikes):', e);
          dislikesCookie = {};
        }
        
        try {
          bookmarksCookie = cookies.bookmarks ? JSON.parse(cookies.bookmarks) : {};
        } catch (e) {
          console.log('쿠키 파싱 오류 (bookmarks):', e);
          bookmarksCookie = {};
        }
        
        // 정확한 boolean 값으로 변환
        const liked = likesCookie[contentId] === true;
        const disliked = dislikesCookie[contentId] === true;
        const bookmarked = bookmarksCookie[contentId] === true;
        
        console.log(`Cookie interactions for content ${contentId}: liked=${liked}, disliked=${disliked}, bookmarked=${bookmarked}`);
        
        return res.status(200).json({
          success: true,
          liked,
          disliked,
          bookmarked
        });
      } catch (error) {
        console.error('Error checking cookie interactions:', error);
        // 오류 시 기본값 반환
        return res.status(200).json({
          success: true,
          liked: false,
          disliked: false,
          bookmarked: false
        });
      }
    }
    
    // 로그인 사용자 처리
    try {
      // 연결 시도 (최대 3회)
      let connectionAttempts = 0;
      let db = null;
      
      while (connectionAttempts < 3 && !db) {
        try {
          connectionAttempts++;
          console.log(`[API] MongoDB 연결 시도 (${connectionAttempts}/3)...`);
          db = await dbConnect();
        } catch (connError) {
          console.error(`[API] MongoDB 연결 실패 (시도 ${connectionAttempts}/3):`, connError);
          
          if (connectionAttempts < 3) {
            console.log('[API] 2초 후 재시도...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            // 연결 실패 시 빈 응답 반환
            console.error('[API] MongoDB 연결 최종 실패, 기본값 반환');
            return res.status(200).json({
              success: true,
              liked: false,
              disliked: false,
              bookmarked: false,
              message: 'Database connection failed, returning defaults'
            });
          }
        }
      }
      
      // 연결 상태 확인
      if (mongoose.connection.readyState !== 1) {
        console.error(`[API] MongoDB 연결 상태 불량: ${mongoose.connection.readyState}, 기본값 반환`);
        return res.status(200).json({
          success: true,
          liked: false,
          disliked: false,
          bookmarked: false,
          message: 'Database not connected, returning defaults'
        });
      }
      
      // Get user with their likes and dislikes
      const user = await User.findById(session.user.id);
      if (!user) {
        return res.status(200).json({
          success: true,
          liked: false,
          disliked: false,
          bookmarked: false,
          message: 'User not found, but request succeeded'
        });
      }
      
      // Check if user has liked this content
      const userLikes = user.likes || [];
      const liked = userLikes.some(
        like => like.contentId && like.contentId.toString() === contentId && like.contentType === type
      );
      
      // Check if user has disliked this content
      const userDislikes = user.dislikes || [];
      const disliked = userDislikes.some(
        dislike => dislike.contentId && dislike.contentId.toString() === contentId && dislike.contentType === type
      );
      
      // Check if user has bookmarked this content
      const userBookmarks = user.bookmarks || [];
      const bookmarked = userBookmarks.some(
        bookmark => bookmark.contentId && bookmark.contentId.toString() === contentId && bookmark.contentType === type
      );
      
      console.log(`DB interactions for user ${user._id}, content ${contentId}: liked=${liked}, disliked=${disliked}, bookmarked=${bookmarked}`);
      
      return res.status(200).json({
        success: true,
        liked,
        disliked,
        bookmarked
      });
    } catch (error) {
      console.error('Database error checking user interactions:', error);
      
      // 데이터베이스 오류 시 쿠키 값 사용 (폴백)
      try {
        const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
        
        let likesCookie = {};
        let dislikesCookie = {};
        let bookmarksCookie = {};
        
        try {
          likesCookie = cookies.likes ? JSON.parse(cookies.likes) : {};
        } catch (e) {
          likesCookie = {};
        }
        
        try {
          dislikesCookie = cookies.dislikes ? JSON.parse(cookies.dislikes) : {};
        } catch (e) {
          dislikesCookie = {};
        }
        
        try {
          bookmarksCookie = cookies.bookmarks ? JSON.parse(cookies.bookmarks) : {};
        } catch (e) {
          bookmarksCookie = {};
        }
        
        // 정확한 boolean 값으로 변환
        const liked = likesCookie[contentId] === true;
        const disliked = dislikesCookie[contentId] === true;
        const bookmarked = bookmarksCookie[contentId] === true;
        
        console.log(`DB 오류 시 쿠키 값 사용: liked=${liked}, disliked=${disliked}, bookmarked=${bookmarked}`);
        
        return res.status(200).json({
          success: true,
          liked,
          disliked,
          bookmarked,
          message: 'Using cookie values due to database error'
        });
      } catch (cookieError) {
        console.error('쿠키 처리 오류:', cookieError);
        return res.status(200).json({ 
          success: true,
          liked: false,
          disliked: false,
          bookmarked: false,
          message: 'Error processing database and cookies, using defaults'
        });
      }
    }
  } catch (error) {
    console.error('Error checking user interactions:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
} 