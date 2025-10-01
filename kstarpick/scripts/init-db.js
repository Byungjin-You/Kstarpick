// 데이터베이스 초기화 스크립트
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// MongoDB URI 가져오기
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('환경 변수 MONGODB_URI가 설정되지 않았습니다.');
  process.exit(1);
}

// 사용자 스키마 정의
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  image: {
    type: String,
    default: '/images/default-avatar.png',
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'editor'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// 관리자 계정 생성 함수
async function createAdminUser() {
  try {
    // MongoDB 연결
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB에 연결되었습니다.');

    // 관리자 이메일로 사용자 검색
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('관리자 계정이 이미 존재합니다.');
    } else {
      // 비밀번호 해시 생성
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // 관리자 계정 생성
      const adminUser = new User({
        name: '관리자',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      });
      
      await adminUser.save();
      console.log('관리자 계정이 생성되었습니다.');
      console.log('이메일: admin@example.com, 비밀번호: admin123');
    }
    
    // 기본 사용자 계정 생성
    const existingUser = await User.findOne({ email: 'user@example.com' });
    
    if (existingUser) {
      console.log('사용자 계정이 이미 존재합니다.');
    } else {
      // 비밀번호 해시 생성
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('user123', salt);
      
      // 일반 사용자 계정 생성
      const normalUser = new User({
        name: '일반 사용자',
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user',
      });
      
      await normalUser.save();
      console.log('일반 사용자 계정이 생성되었습니다.');
      console.log('이메일: user@example.com, 비밀번호: user123');
    }
    
    console.log('데이터베이스 초기화가 완료되었습니다.');
  } catch (error) {
    console.error('데이터베이스 초기화 중 오류가 발생했습니다:', error);
  } finally {
    // 연결 종료
    await mongoose.disconnect();
    console.log('MongoDB 연결이 종료되었습니다.');
  }
}

// 관리자 계정 생성 실행
createAdminUser(); 