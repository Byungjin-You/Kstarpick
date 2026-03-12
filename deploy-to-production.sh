#!/bin/bash

# AWS EC2 Production Deployment Script for KstarPick
# Git pull 기반 배포 스크립트

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 설정
SERVER_USER="ec2-user"
SERVER_HOST="43.202.38.79"
SERVER_PORT="22"
SERVER_PATH="/doohub/service/kstarpick"
SSH_KEY="$HOME/Desktop/key_kstarpick.pem"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 KstarPick Production Deployment (Git)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# SSH 키 파일 확인
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
    exit 1
fi

chmod 400 "$SSH_KEY" 2>/dev/null || true

# Step 1: 로컬 git 상태 확인
echo -e "${GREEN}Step 1/4: 로컬 Git 상태 확인${NC}"
echo ""

LOCAL_BRANCH=$(git branch --show-current)
LOCAL_COMMIT=$(git log --oneline -1)
echo -e "${BLUE}  브랜치: ${LOCAL_BRANCH}${NC}"
echo -e "${BLUE}  최신 커밋: ${LOCAL_COMMIT}${NC}"

# 커밋 안 된 변경사항 확인
if [[ -n $(git diff --name-only HEAD -- kstarpick/) ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  커밋되지 않은 변경사항이 있습니다:${NC}"
    git diff --name-only HEAD -- kstarpick/
    echo ""
    read -p "커밋하지 않고 계속하시겠습니까? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo -e "${RED}배포가 취소되었습니다. 먼저 커밋해주세요.${NC}"
        exit 0
    fi
fi

# GitHub에 푸시 안 된 커밋 확인
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null)
if [ -n "$UNPUSHED" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  푸시되지 않은 커밋이 있습니다:${NC}"
    echo "$UNPUSHED"
    echo ""
    echo -e "${BLUE}GitHub에 푸시 중...${NC}"
    git push origin main
    echo -e "${GREEN}✅ 푸시 완료${NC}"
fi

echo ""

# Step 2: 사용자 확인
echo -e "${YELLOW}⚠️  운영 서버에 배포하시겠습니까?${NC}"
echo -e "${YELLOW}   서버: ${SERVER_HOST}${NC}"
echo -e "${YELLOW}   커밋: ${LOCAL_COMMIT}${NC}"
read -p "계속하시려면 'yes'를 입력하세요: " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}배포가 취소되었습니다.${NC}"
    exit 0
fi

echo ""

# Step 3: 서버에서 git pull + npm install + build
echo -e "${GREEN}Step 2/4: 서버에서 git pull 중...${NC}"

ssh -i "$SSH_KEY" -p "$SERVER_PORT" -o StrictHostKeyChecking=no \
    ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'

set -e
cd /doohub/service/kstarpick

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 git pull 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 서버 로컬 변경사항 리셋 (있을 경우)
git checkout -- . 2>/dev/null || true

# 최신 코드 pull
git pull origin main

echo ""
echo "📌 현재 서버 버전:"
git log --oneline -1

ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ git pull 실패!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 3/4: 서버에서 의존성 설치 및 빌드 중...${NC}"

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
echo -e "${GREEN}Step 4/4: 애플리케이션 재시작 중...${NC}"

ssh -i "$SSH_KEY" -p "$SERVER_PORT" -o StrictHostKeyChecking=no \
    ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'

set -e
cd /doohub/service/kstarpick

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 PM2로 애플리케이션 재시작 중..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if pm2 list | grep -q "kstarpick"; then
    pm2 restart kstarpick
else
    pm2 start npm --name "kstarpick" -- start
fi

pm2 save

echo ""
echo "📊 PM2 프로세스 상태:"
pm2 list

echo ""
echo "📌 배포된 버전:"
git log --oneline -1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 배포 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 재시작 실패!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 배포 완료!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}   🌐 http://${SERVER_HOST}:13001${NC}"
echo -e "${BLUE}   📋 로그: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'pm2 logs kstarpick'${NC}"
echo ""
