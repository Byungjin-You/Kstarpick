#!/bin/bash

# 배포 스크립트
# 사용법: ./deploy.sh [키파일경로]

SERVER_IP="43.202.38.79"
SERVER_PORT="22"
SERVER_USER="ec2-user"
KEY_FILE=${1:-"~/Desktop/your-key.pem"}

echo "🚀 K-POP News Portal 배포 시작..."
echo "서버: $SERVER_USER@$SERVER_IP:$SERVER_PORT"

# 1. 프로젝트 압축 (macOS 메타데이터 파일 제외)
echo "📦 프로젝트 압축 중..."
tar --exclude='node_modules' --exclude='.next' --exclude='*.tar.gz' --exclude='crawled-data' --exclude='crawled-reviews' --exclude='debug' --exclude='logs' --exclude='temp' --exclude='test-results' --exclude='downloads' --exclude='drama-details' --exclude='backup' --exclude='fixed-files' --exclude='kstarpick' --exclude='._*' --exclude='.DS_Store' -czf kpop-news-portal-production.tar.gz .

# 2. 서버에 파일 업로드
echo "📤 서버에 파일 업로드 중..."
scp -i "$KEY_FILE" -P "$SERVER_PORT" kpop-news-portal-production.tar.gz "$SERVER_USER@$SERVER_IP":/doohub/service/

# 3. 서버에서 배포 실행
echo "🔧 서버에서 배포 실행 중..."
ssh -i "$KEY_FILE" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /doohub/service

# kstarpick 디렉토리 생성
echo "📁 kstarpick 디렉토리 생성 중..."
mkdir -p kstarpick
cd kstarpick

# 기존 앱 백업
if [ -d "app" ]; then
    echo "📋 기존 앱 백업 중..."
    mv app "app-backup-$(date +%Y%m%d-%H%M%S)"
fi

# 새 압축 파일 압축 해제
echo "📦 압축 해제 중..."
tar -xzf ../kpop-news-portal-production.tar.gz

# macOS 메타데이터 파일들 삭제
echo "🧹 macOS 메타데이터 파일 정리 중..."
find . -name "._*" -delete
find . -name ".DS_Store" -delete

# Node.js 버전 확인
echo "📋 Node.js 버전 확인 중..."
node --version
npm --version

# 의존성 설치
echo "📚 의존성 설치 중..."
npm install --legacy-peer-deps

# 프로덕션 빌드
echo "🔨 프로덕션 빌드 중..."
npm run build

# 기존 프로세스 종료
echo "🛑 기존 프로세스 종료 중..."
sudo lsof -ti:13001 | xargs kill -9 2>/dev/null || true

# 새 프로세스 시작
echo "🚀 새 프로세스 시작 중..."
PORT=13001 npm start > app.log 2>&1 &

echo "✅ 배포 완료!"
echo "📊 로그 확인: tail -f app.log"
echo "🌐 서버 접속: http://43.202.38.79:13001"
echo "📁 프로젝트 위치: /doohub/service/kstarpick"
EOF

echo "🎉 배포가 완료되었습니다!"
echo "서버 접속: http://43.202.38.79:13001" 