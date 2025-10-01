// 배포 환경 설정 파일
module.exports = {
  // 로컬 개발 환경
  local: {
    name: 'Local Development',
    envFile: '.env.local',
    mongoUri: 'mongodb://localhost:27017/kstarpick_dev',
    port: 3000,
    host: 'localhost'
  },

  // 테스트 서버 환경
  test: {
    name: 'Test Server',
    envFile: '.env.test',
    server: {
      host: '43.202.38.79',
      user: 'ec2-user',
      path: '/doohub/service/kstarpick-test',
      port: 3001
    },
    mongoUri: process.env.TEST_MONGODB_URI,
    pemKey: '~/Desktop/key_kstarpick.pem'
  },

  // 프로덕션 서버 환경
  production: {
    name: 'Production Server',
    envFile: '.env.production',
    server: {
      host: '43.202.38.79',
      user: 'ec2-user',
      path: '/doohub/service/kstarpick',
      port: 13001
    },
    mongoUri: process.env.MONGODB_URI,
    pemKey: '~/Desktop/key_kstarpick.pem'
  }
};

// 환경별 PM2 설정
module.exports.pm2Config = {
  local: {
    name: 'kstarpick-local',
    script: 'npm',
    args: 'start:local',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    }
  },
  test: {
    name: 'kstarpick-test',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'test',
      PORT: 3001
    }
  },
  production: {
    name: 'kstarpick',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 13001
    }
  }
};