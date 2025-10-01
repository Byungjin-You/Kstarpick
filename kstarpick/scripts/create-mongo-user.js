// MongoDB 사용자 생성 스크립트
use('kpop-news-portal');

db.createUser({
  user: "kstarpick",
  pwd: "Kstar!@pick2024",
  roles: [
    { role: "readWrite", db: "kpop-news-portal" }
  ]
});

print("User created successfully"); 