# Kstarpick 로컬 개발 환경 설정 가이드

## 🚀 빠른 시작

### 1. 환경변수 설정
```bash
# 환경변수 템플릿 복사
cp .env.local.example .env.local
```

### 2. MongoDB 설정 (3가지 옵션)

#### 옵션 A: Docker 사용 (추천)
```bash
# Docker 설치 후
npm run docker:up    # MongoDB 컨테이너 시작
npm run docker:down  # MongoDB 컨테이너 중지
```

#### 옵션 B: MongoDB Atlas 사용 (무료)
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)에서 무료 계정 생성
2. 클러스터 생성
3. 연결 문자열을 `.env.local`에 추가
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kstarpick_dev?retryWrites=true&w=majority
```

#### 옵션 C: 로컬 MongoDB 설치
```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# 연결 문자열
MONGODB_URI=mongodb://localhost:27017/kstarpick_dev
```

### 3. 서버 실행

```bash
# 개발 서버 실행 (로컬 DB 사용)
npm run dev:local

# Docker와 함께 실행
npm run dev:docker
```

## 📂 파일 구조

```
kstarpick/
├── .env.local              # 로컬 환경변수 (git에서 제외)
├── .env.local.example      # 환경변수 템플릿
├── .env.production         # 프로덕션 환경변수
├── docker-compose.yml      # Docker 설정
├── deploy-config.js        # 배포 환경 설정
└── ecosystem.config.local.js  # 로컬 PM2 설정
```

## 🔧 npm 스크립트

### 개발
- `npm run dev:local` - 로컬 개발 서버 (포트 3000)
- `npm run dev:docker` - Docker MongoDB와 함께 개발 서버 실행

### Docker
- `npm run docker:up` - MongoDB 컨테이너 시작
- `npm run docker:down` - MongoDB 컨테이너 중지
- `npm run docker:reset` - MongoDB 데이터 초기화 및 재시작

### 배포
- `npm run deploy:test` - 테스트 서버로 배포
- `npm run deploy:prod` - 프로덕션 서버로 배포

### 데이터베이스
- `npm run db:backup` - 로컬 DB 백업
- `npm run db:sync` - 프로덕션 데이터 샘플 가져오기

## 🔄 워크플로우

### 로컬 개발
1. 기능 개발/수정
2. 로컬 테스트 (`npm run dev:local`)
3. 커밋 및 푸시

### 프로덕션 배포
1. 로컬 테스트 완료
2. `npm run build:prod` - 프로덕션 빌드
3. `npm run deploy:prod` - 프로덕션 배포

## 🔐 환경별 접속 정보

### 로컬 개발
- URL: http://localhost:3000
- MongoDB: mongodb://localhost:27017/kstarpick_dev
- Mongo Express: http://localhost:8081 (Docker 사용 시)

### 프로덕션
- URL: http://43.202.38.79:13001
- MongoDB: AWS DocumentDB (VPC 내부만 접근 가능)

## 📝 주의사항

1. **환경변수 파일 관리**
   - `.env.local`은 절대 커밋하지 마세요
   - `.env.local.example`을 템플릿으로 사용하세요

2. **데이터베이스**
   - 로컬 개발은 반드시 로컬 DB 사용
   - 프로덕션 DB에 직접 연결 금지

3. **배포**
   - 항상 로컬에서 테스트 후 배포
   - `deploy:prod`는 신중히 사용

## 🐛 문제 해결

### MongoDB 연결 실패
```bash
# Docker 컨테이너 상태 확인
docker ps

# 컨테이너 재시작
npm run docker:reset
```

### 포트 충돌
```bash
# 포트 3000 사용 중인 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

### 환경변수 인식 실패
```bash
# .env.local 파일 확인
cat .env.local

# 서버 재시작
npm run dev:local
```