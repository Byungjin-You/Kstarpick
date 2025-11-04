# 로컬 개발 환경 설정 완료! ✅

## 현재 상태

### ✅ 설정 완료
- **로컬 MongoDB**: 실행 중 (localhost:27017)
- **환경변수**: .env.local 설정 완료
- **데이터베이스**: kstarpick_dev

### 📊 현재 로컬 데이터
- 뉴스: 2,221개
- 드라마: 20개
- 셀럽: 23개
- 리뷰: 157개
- 음악: 20개
- 사용자: 140개

---

## 🚀 개발 서버 시작

```bash
cd /Users/byungjinyou/Desktop/kstarpick-server-backup/kstarpick

# 개발 서버 실행
npm run dev

# 또는
npm run dev:local
```

서버가 시작되면 http://localhost:3000 에서 확인하세요.

---

## 📝 환경변수 설정 (.env.local)

현재 설정된 환경변수:
```bash
# MongoDB (로컬)
MONGODB_URI=mongodb://localhost:27017/kstarpick_dev
MONGODB_DB=kstarpick_dev

# NextAuth (로컬)
NEXTAUTH_SECRET=local_dev_secret_key_change_in_production
NEXTAUTH_URL=http://localhost:3000

# Admin Key (로컬)
ADMIN_KEY=local_admin_key_for_testing
JWT_SECRET=local_jwt_secret_key_for_testing

# API URLs (로컬)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 개발 환경
NODE_ENV=development
IS_LOCAL_DEV=true
```

---

## 🔄 프로덕션 데이터 백업 & 복원

### 방법 1: SSH 터널 이용 (EC2 키 필요)

SSH 키 파일(.pem)이 있다면:

```bash
# 1. 키 파일 경로 확인
# 예: ~/Desktop/key_kstarpick.pem

# 2. 스크립트 실행
bash scripts/import-prod-data-simple.sh
```

### 방법 2: EC2 서버에서 직접 백업

```bash
# 1. EC2 서버 접속
ssh -i /path/to/key.pem ec2-user@43.202.38.79

# 2. EC2에서 백업 생성
mongodump --uri="mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production..." \
  --out=/tmp/backup

# 3. 로컬로 복사
scp -i /path/to/key.pem -r ec2-user@43.202.38.79:/tmp/backup ./prod_backup

# 4. 로컬 MongoDB에 복원
mongorestore --db=kstarpick_dev --drop ./prod_backup/kstarpick
```

### 방법 3: 현재 데이터로 개발 시작 (추천)

이미 충분한 테스트 데이터가 있으므로 바로 개발을 시작하셔도 됩니다!

---

## 🛠️ 유용한 명령어

### MongoDB 관리

```bash
# MongoDB 상태 확인
brew services list | grep mongodb

# MongoDB 시작
brew services start mongodb-community

# MongoDB 중지
brew services stop mongodb-community

# MongoDB Shell 접속
mongosh kstarpick_dev

# 데이터베이스 통계
mongosh kstarpick_dev --eval "db.stats()"

# 컬렉션별 문서 개수
mongosh kstarpick_dev --eval "db.getCollectionNames().forEach(c => print(c + ': ' + db[c].countDocuments()))"
```

### 개발 서버

```bash
# 개발 서버 시작
npm run dev

# 빌드
npm run build

# 프로덕션 모드 실행 (로컬)
npm run start
```

### 데이터베이스 초기화

```bash
# 로컬 데이터베이스 완전 삭제 (주의!)
mongosh kstarpick_dev --eval "db.dropDatabase()"

# 특정 컬렉션만 삭제
mongosh kstarpick_dev --eval "db.news.drop()"
```

---

## 🔐 보안 주의사항

### ✅ 안전한 개발 방법
- **항상 로컬 MongoDB 사용** (localhost:27017)
- **프로덕션 DB 직접 연결 금지**
- **.env.local 파일 절대 커밋 금지** (.gitignore에 포함됨)
- **테스트 데이터 사용**

### ❌ 절대 하지 말 것
- 프로덕션 DB URI를 .env.local에 직접 입력
- 프로덕션 DB에 직접 쓰기 작업
- 자격증명 정보 코드에 하드코딩
- .env 파일 Git에 커밋

---

## 🐛 문제 해결

### MongoDB 연결 실패

```bash
# MongoDB 서비스 상태 확인
brew services list | grep mongodb

# MongoDB 재시작
brew services restart mongodb-community

# 포트 확인
lsof -i :27017
```

### 환경변수 인식 안 됨

```bash
# .env.local 파일 확인
cat .env.local

# 서버 완전 재시작
pkill -f "next"
npm run dev
```

### 포트 충돌

```bash
# 3000 포트 사용 중인 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

---

## 📚 추가 자료

- [README_LOCAL_SETUP.md](README_LOCAL_SETUP.md) - 상세 설정 가이드
- [server-connection-guide.md](server-connection-guide.md) - 서버 연결 가이드
- [.env.local.example](.env.local.example) - 환경변수 예제

---

## ✅ 다음 단계

1. **개발 서버 시작**: `npm run dev`
2. **브라우저 확인**: http://localhost:3000
3. **개발 시작**: 코드 수정 및 테스트
4. **필요시**: 프로덕션 데이터 백업 복원

---

## 📞 도움이 필요하신가요?

문제가 발생하면:
1. 이 문서의 "문제 해결" 섹션 확인
2. MongoDB 로그 확인: `brew services info mongodb-community`
3. Next.js 로그 확인: 터미널 출력 확인

**축하합니다! 로컬 개발 환경 설정이 완료되었습니다.** 🎉
