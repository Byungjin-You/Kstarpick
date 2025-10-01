// MongoDB 초기화 스크립트
// Docker 컨테이너 시작 시 자동 실행됨

db = db.getSiblingDB('kstarpick_dev');

// 개발용 사용자 생성
db.createUser({
  user: 'kstarpick_dev',
  pwd: 'dev_password',
  roles: [
    {
      role: 'readWrite',
      db: 'kstarpick_dev'
    }
  ]
});

// 초기 컬렉션 생성
db.createCollection('users');
db.createCollection('news');
db.createCollection('celebs');
db.createCollection('dramas');
db.createCollection('music');
db.createCollection('tvfilms');
db.createCollection('reviews');
db.createCollection('imageHashes');

// 테스트 데이터 삽입 (선택사항)
db.news.insertOne({
  title: '로컬 개발 환경 테스트 뉴스',
  content: '로컬 MongoDB가 정상적으로 작동합니다.',
  category: 'test',
  createdAt: new Date(),
  viewCount: 0
});

print('Database initialized successfully!');