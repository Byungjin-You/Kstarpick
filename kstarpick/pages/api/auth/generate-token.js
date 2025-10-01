import { connectToDatabase } from '../../../utils/mongodb';
import jwt from 'jsonwebtoken';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  // 개발 환경에서만 실행되도록 제한
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: '개발 환경에서만 사용 가능한 API입니다.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { email, password } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: '이메일은 필수 입력 항목입니다.' });
    }
    
    console.log(`${email} 사용자에 대한 관리자 토큰 생성 요청`);
    
    // 사용자 검색 (Mongoose 모델 사용)
    await dbConnect();
    let user = await User.findOne({ email });
    
    // Mongoose에서 사용자를 찾지 못한 경우 MongoDB 네이티브 클라이언트로 시도
    if (!user) {
      console.log(`Mongoose로 ${email} 사용자를 찾지 못함, MongoDB 네이티브 시도 중...`);
      const { db } = await connectToDatabase();
      user = await db.collection('users').findOne({ email });
    }
    
    // 사용자가 없는 경우
    if (!user) {
      console.log(`${email} 사용자를 찾을 수 없음`);
      
      // 패스워드가 제공된 경우, 테스트용 어드민 계정 생성
      if (password && password.length >= 6) {
        const newUser = new User({
          name: '테스트 관리자',
          email,
          password, // 모델에서 자동으로 해싱됨
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await newUser.save();
        user = newUser;
        console.log(`${email} 테스트 어드민 계정 생성 완료`);
      } else {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
      }
    }
    
    // 사용자가 관리자가 아닌 경우 역할 업데이트
    if (user.role !== 'admin') {
      console.log(`${email} 사용자의 역할을 'admin'으로 업데이트 중...`);
      user.role = 'admin';
      await user.save();
    }
    
    // 토큰 생성
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: 'admin',
      name: user.name || 'Admin User'
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
    
    console.log(`${email} 사용자를 위한 30일 유효 관리자 토큰 생성 완료`);
    
    return res.status(200).json({
      success: true,
      message: '관리자 토큰이 성공적으로 생성되었습니다.',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('토큰 생성 중 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
} 