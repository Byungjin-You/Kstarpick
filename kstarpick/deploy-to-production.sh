#!/bin/bash

# AWS EC2 Production Deployment Script for KstarPick
# 실제 운영 서버에 배포하는 스크립트입니다.

set -e  # 에러 발생 시 스크립트 중단

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정
SERVER_USER="ec2-user"
SERVER_HOST="43.202.38.79"
SERVER_PORT="22"
SERVER_PATH="/doohub/service/kstarpick"
SSH_KEY="$HOME/Desktop/key_kstarpick.pem"  # pem 파일 경로
LOCAL_PROJECT_PATH="./kstarpick"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 KstarPick Production Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# SSH 키 파일 확인
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
    echo -e "${YELLOW}💡 Desktop에 있는 pem 파일 경로를 확인해주세요.${NC}"
    exit 1
fi

# SSH 키 권한 확인 및 수정
chmod 400 "$SSH_KEY" 2>/dev/null || true

# 사용자 확인
echo -e "${YELLOW}⚠️  실제 운영 서버에 배포하시겠습니까?${NC}"
echo -e "${YELLOW}   서버: ${SERVER_HOST}${NC}"
echo -e "${YELLOW}   경로: ${SERVER_PATH}${NC}"
read -p "계속하시려면 'yes'를 입력하세요: " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}배포가 취소되었습니다.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}Step 1/5: 로컬 변경사항 확인 중...${NC}"
cd "$LOCAL_PROJECT_PATH"

# Git 상태 확인
if [ -d ".git" ]; then
    if [[ -n $(git status -s) ]]; then
        echo -e "${YELLOW}⚠️  커밋되지 않은 변경사항이 있습니다:${NC}"
        git status -s
        echo ""
        read -p "계속하시겠습니까? (yes/no): " git_confirm
        if [ "$git_confirm" != "yes" ]; then
            echo -e "${RED}배포가 취소되었습니다.${NC}"
            exit 0
        fi
    fi
fi

echo ""
echo -e "${GREEN}Step 2/5: 로컬에서 프로젝트 빌드 중...${NC}"
echo -e "${BLUE}npm install 실행 중...${NC}"
npm install --legacy-peer-deps

echo -e "${BLUE}Production 빌드 실행 중...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 빌드 실패! 배포를 중단합니다.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 3/5: 서버로 파일 업로드 중...${NC}"
echo -e "${BLUE}rsync로 파일 전송 중... (몇 분 소요될 수 있습니다)${NC}"

# rsync로 파일 업로드 (node_modules와 캐시 제외)
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.next/cache' \
    --exclude '.git' \
    --exclude '.env.local' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    -e "ssh -i $SSH_KEY -p $SERVER_PORT -o StrictHostKeyChecking=no" \
    ./ ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 파일 업로드 실패!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 4/5: 서버에서 의존성 설치 및 빌드 중...${NC}"

# 서버에서 명령 실행
ssh -i "$SSH_KEY" -p "$SERVER_PORT" -o StrictHostKeyChecking=no \
    ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'

set -e

cd /doohub/service/kstarpick

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 의존성 설치 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm install --legacy-peer-deps

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  Production 빌드 실행 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run build

ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 서버 빌드 실패!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 5/5: 애플리케이션 재시작 중...${NC}"

# PM2로 애플리케이션 재시작
ssh -i "$SSH_KEY" -p "$SERVER_PORT" -o StrictHostKeyChecking=no \
    ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'

set -e

cd /doohub/service/kstarpick

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 PM2로 애플리케이션 재시작 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# PM2가 설치되어 있는지 확인
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2가 설치되어 있지 않습니다. npm으로 직접 시작합니다."

    # 기존 프로세스 종료
    pkill -f "next start" || true

    # 백그라운드로 시작
    nohup npm start > /doohub/service/kstarpick/logs/app.log 2>&1 &
    echo "✅ 애플리케이션이 백그라운드로 시작되었습니다."
else
    # PM2 프로세스 확인
    if pm2 list | grep -q "kstarpick"; then
        echo "🔄 기존 PM2 프로세스 재시작 중..."
        pm2 restart kstarpick
    else
        echo "🚀 PM2로 새로 시작 중..."
        pm2 start npm --name "kstarpick" -- start
    fi

    # PM2 상태 저장
    pm2 save

    echo ""
    echo "📊 PM2 프로세스 상태:"
    pm2 list
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 애플리케이션이 성공적으로 재시작되었습니다!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 애플리케이션 재시작 실패!${NC}"
    echo -e "${YELLOW}💡 서버에 직접 접속하여 확인해주세요:${NC}"
    echo -e "${YELLOW}   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 배포가 성공적으로 완료되었습니다!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📝 배포 정보:${NC}"
echo -e "${BLUE}   - 서버: ${SERVER_HOST}${NC}"
echo -e "${BLUE}   - 애플리케이션: http://${SERVER_HOST}:13001${NC}"
echo -e "${BLUE}   - 로그 확인: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'pm2 logs kstarpick'${NC}"
echo ""
echo -e "${YELLOW}💡 서버 상태 확인:${NC}"
echo -e "${YELLOW}   ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST${NC}"
echo -e "${YELLOW}   cd /doohub/service/kstarpick && pm2 status${NC}"
echo ""