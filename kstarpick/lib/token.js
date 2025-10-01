import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import User from '../models/User';
import dbConnect from './dbConnect';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from './mongodb';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || JWT_SECRET;

/**
 * 요청에서 JWT 토큰을 검증하고 사용자 정보를 반환합니다
 */
export async function validateToken(req) {
  console.log('=== 토큰 검증 시작 ===');
  
  // 1. NextAuth 세션 확인 (우선순위)
  try {
    console.log('NextAuth 세션 확인 시도...');
    const nextAuthToken = await getToken({ req, secret: NEXTAUTH_SECRET });
    
    if (nextAuthToken) {
      console.log('NextAuth 세션 토큰 발견:', nextAuthToken);
      
      // 사용자 확인
      await dbConnect();
      const user = await User.findById(nextAuthToken.id || nextAuthToken.sub);
      
      if (user) {
        console.log('NextAuth 세션에서 사용자 확인:', user.email);
        return {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isAdmin: user.role === 'admin'
        };
      }
    }
  } catch (error) {
    console.error('NextAuth 세션 확인 실패:', error.message);
  }
  
  // 2. 토큰 추출
  let token = extractToken(req);
  if (!token) {
    console.log('토큰을 찾을 수 없음');
    return null;
  }
  
  // 3. 토큰 디코딩
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
    console.log('토큰 디코딩 성공:', decoded);
  } catch (error) {
    console.error('토큰 디코딩 실패:', error.message);
    return null;
  }
  
  // 4. 사용자 조회
  const user = await findUserById(decoded.id);
  if (!user) {
    console.log('토큰의 사용자 ID를 찾을 수 없음:', decoded.id);
    return null;
  }
  
  // 5. 사용자 정보 반환
  console.log(`인증된 사용자: ${user.email}, 역할: ${user.role}`);
  return {
    _id: user._id,
    id: user._id,
    name: user.name, 
    email: user.email,
    role: user.role,
    isAdmin: user.role === 'admin'
  };
}

/**
 * 요청에서 토큰을 추출합니다
 */
function extractToken(req) {
  console.log('요청 객체에서 토큰 추출 시도...');
  console.log('Authorization 헤더 확인:', req.headers.authorization ? '존재함' : '없음');
  console.log('Cookie 헤더 확인:', req.headers.cookie ? '존재함' : '없음');
  
  // 헤더에서 추출
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    console.log('헤더에서 토큰 발견:', token.substring(0, 10) + '...');
    return token;
  }
  
  // 쿠키에서 추출
  if (req.headers.cookie) {
    const cookies = parse(req.headers.cookie);
    console.log('쿠키 확인:', Object.keys(cookies).join(', '));
    
    if (cookies.token) {
      console.log('쿠키에서 토큰 발견:', cookies.token.substring(0, 10) + '...');
      return cookies.token;
    }
  }
  
  console.log('토큰을 찾을 수 없음');
  return null;
}

/**
 * 사용자 ID로 사용자를 찾습니다
 */
async function findUserById(userId) {
  // Mongoose로 먼저 시도
  try {
    await dbConnect();
    console.log('Mongoose로 사용자 조회:', userId);
    const user = await User.findById(userId);
    if (user) return user;
  } catch (error) {
    console.error('Mongoose 사용자 조회 실패:', error);
  }
  
  // MongoDB 네이티브 클라이언트로 시도
  try {
    const { db } = await connectToDatabase();
    console.log('MongoDB 네이티브 클라이언트로 사용자 조회:', userId);
    return await db.collection('users').findOne({ _id: new ObjectId(userId) });
  } catch (error) {
    console.error('MongoDB 네이티브 클라이언트 사용자 조회 실패:', error);
    return null;
  }
} 