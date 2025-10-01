import { getSession } from 'next-auth/react';
import { connectToDatabase } from '../../../utils/mongodb';
import { verifyToken } from '../../../lib/auth';
import { ObjectId } from 'mongodb';
import { parse } from 'cookie';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('===== 관리자 권한 확인 API 호출됨 =====');
  console.log('요청 헤더:', JSON.stringify({
    auth: req.headers.authorization ? '있음' : '없음',
    cookie: req.headers.cookie ? '있음' : '없음'
  }));

  try {
    // First check NextAuth session
    const session = await getSession({ req });
    
    if (session?.user?.role === 'admin') {
      console.log('NextAuth 세션으로 admin 권한 확인됨:', session.user.email);
      return res.status(200).json({ isAdmin: true });
    }

    // If no session, check for token in authorization header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Authorization 헤더에서 토큰 추출:', token.substring(0, 10) + '...');
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('토큰 디코딩 성공:', decoded);
        
        // MongoDB 직접 연결 사용
        const { connectToDatabase } = require('../../../utils/mongodb');
        const { db } = await connectToDatabase();
        const { ObjectId } = require('mongodb');
        
        console.log('사용자 ID로 검색:', decoded.id);
        const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
        
        if (user) {
          console.log('사용자 찾음:', user.email, '역할:', user.role);
          
          if (user.role === 'admin') {
            console.log('헤더 토큰으로 admin 권한 확인됨');
            return res.status(200).json({ isAdmin: true });
          }
        } else {
          console.log('토큰의 사용자 ID로 사용자를 찾을 수 없음:', decoded.id);
        }
      } catch (error) {
        console.error('헤더 토큰 검증 실패:', error.message);
      }
    }

    // If no session or invalid token, check for token in cookies
    if (req.headers.cookie) {
      const cookies = parse(req.headers.cookie);
      const tokenCookie = cookies.token;
      
      if (tokenCookie) {
        console.log('쿠키에서 토큰 추출:', tokenCookie.substring(0, 10) + '...');
        
        try {
          const decoded = jwt.verify(tokenCookie, JWT_SECRET);
          console.log('쿠키 토큰 디코딩 성공:', decoded);
          
          // MongoDB 직접 연결 사용
          const { connectToDatabase } = require('../../../utils/mongodb');
          const { db } = await connectToDatabase();
          const { ObjectId } = require('mongodb');
          
          console.log('쿠키 토큰 - 사용자 ID로 검색:', decoded.id);
          const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
          
          if (user) {
            console.log('사용자 찾음:', user.email, '역할:', user.role);
            
            if (user.role === 'admin') {
              console.log('쿠키 토큰으로 admin 권한 확인됨');
              return res.status(200).json({ isAdmin: true });
            }
          } else {
            console.log('토큰의 사용자 ID로 사용자를 찾을 수 없음:', decoded.id);
          }
        } catch (error) {
          console.error('쿠키 토큰 검증 실패:', error.message);
        }
      } else {
        console.log('쿠키에 토큰이 없음');
      }
    } else {
      console.log('요청에 쿠키가 없음');
    }

    // If no admin user found
    console.log('Admin 권한을 찾을 수 없음');
    return res.status(200).json({ isAdmin: false });
  } catch (error) {
    console.error('Admin 권한 확인 중 서버 오류:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 