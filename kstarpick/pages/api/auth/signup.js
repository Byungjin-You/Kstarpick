import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../../../models/User';

// MongoDB URI 설정
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false';

export default async function handler(req, res) {
  // POST 요청만 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않는 요청 방식입니다.' });
  }

  try {
    // MongoDB 연결
    if (!mongoose.connections[0].readyState) {
      await mongoose.connect(MONGODB_URI, {
        useUnifiedTopology: true,
      });
    }

    const { name, email, password } = req.body;

    // 필수 입력값 검증
    if (!name || !email || !password) {
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    // 이메일 중복 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 암호화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 새 사용자 생성
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      // 기본 이미지와 역할은 모델의 기본값 사용
    });

    await newUser.save();

    // 비밀번호 제외하고 응답
    const user = newUser.toObject();
    delete user.password;

    return res.status(201).json({ message: '회원가입이 완료되었습니다.', user });
  } catch (error) {
    console.error('회원가입 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다. 나중에 다시 시도해주세요.' });
  }
} 