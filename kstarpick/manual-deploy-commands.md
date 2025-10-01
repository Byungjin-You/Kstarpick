# 수동 배포 명령어 가이드

## 1. 로컬에서 파일 업로드

### pem 파일이 Desktop에 있는 경우:
```bash
# 압축 파일 업로드
scp -i ~/Desktop/your-key.pem -P 22 kpop-news-portal-production.tar.gz ec2-user@43.202.38.79:/doohub/service/
```

### pem 파일의 정확한 경로를 알고 있는 경우:
```bash
# 압축 파일 업로드 (정확한 경로로 수정)
scp -i /path/to/your/actual-key.pem -P 22 kpop-news-portal-production.tar.gz ec2-user@43.202.38.79:/doohub/service/
```

## 2. 서버에 SSH 접속

```bash
# SSH 접속
ssh -i ~/Desktop/your-key.pem -p 22 ec2-user@43.202.38.79
```

## 3. 서버에서 배포 실행

```bash
# 서비스 디렉토리로 이동
cd /doohub/service

# kstarpick 디렉토리 생성
mkdir -p kstarpick
cd kstarpick

# 기존 앱 백업 (있는 경우)
if [ -d "app" ]; then
    mv app "app-backup-$(date +%Y%m%d-%H%M%S)"
fi

# 압축 파일 압축 해제
tar -xzf ../kpop-news-portal-production.tar.gz

# Node.js 버전 확인
node --version
npm --version

# 의존성 설치
npm install --legacy-peer-deps

# 프로덕션 빌드
npm run build

# 기존 프로세스 종료 (포트 13001에서 실행 중인 경우)
sudo lsof -ti:13001 | xargs kill -9

# 새 프로세스 시작
PORT=13001 npm start > app.log 2>&1 &

# 로그 확인
tail -f app.log
```

## 4. 환경 변수 설정

```bash
# 환경 변수 파일 생성
nano .env.production
```

다음 내용을 추가:
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:13001
MONGODB_URI=mongodb://kstarpick:zpdltmxkvlr0!2@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false
MONGODB_DB=kstarpick
JWT_SECRET=your_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_key_here
NEXTAUTH_URL=http://localhost:13001
ADMIN_KEY=your_admin_key_here
```

## 5. 서비스 상태 확인

```bash
# 프로세스 확인
ps aux | grep node

# 포트 사용 확인
sudo lsof -i :13001

# 로그 확인
tail -f app.log

# 서비스 접속 테스트
curl http://localhost:13001
```

## 6. 문제 해결

### 포트가 이미 사용 중인 경우:
```bash
# 포트 사용 프로세스 확인
sudo lsof -i :13001

# 프로세스 강제 종료
sudo kill -9 [PID]
```

### 권한 문제가 있는 경우:
```bash
# 파일 권한 확인
ls -la

# 필요한 경우 권한 수정
chmod +x package.json
```

### 빌드 실패 시:
```bash
# 캐시 삭제 후 재시도
rm -rf .next
npm run build
``` 