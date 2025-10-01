import { connectToDatabase } from '../../../utils/mongodb';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    const { name, email, password, adminKey } = req.body;

    // 필수 필드 확인
    if (!name || !email || !password || !adminKey) {
      return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }

    // 관리자 키 확인
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ success: false, message: '관리자 키가 유효하지 않습니다.' });
    }

    const { db } = await connectToDatabase();
    
    // 이메일 중복 확인
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: '이미 등록된 이메일입니다.' });
    }

    // 비밀번호 해싱
    const hashedPassword = bcrypt.hashSync(password, 10);

    // 관리자 사용자 생성
    const newUser = {
      name,
      email,
      password: hashedPassword,
      image: '/images/default-avatar.png',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // DB에 저장
    const result = await db.collection('users').insertOne(newUser);

    // 성공 응답
    return res.status(201).json({
      success: true, 
      message: '관리자 계정이 생성되었습니다.',
      data: {
        id: result.insertedId,
        name,
        email,
        role: 'admin'
      }
    });
    
  } catch (error) {
    console.error('관리자 등록 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
} 