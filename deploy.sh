#!/bin/bash

# KstarPick 서버 배포 스크립트 (서버에서 실행)
# 사용법: ssh로 서버 접속 후 ./deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/doohub/service/kstarpick"
PM2_APP="kstarpick"

cd "$APP_DIR"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 KstarPick Git Deploy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 1: git pull
echo -e "${GREEN}[1/4] git pull...${NC}"
git pull origin main
echo ""

# Step 2: npm install
echo -e "${GREEN}[2/4] npm install...${NC}"
npm install --legacy-peer-deps
echo ""

# Step 3: 기존 .next 백업 후 빌드
echo -e "${GREEN}[3/4] 빌드 중...${NC}"
if [ -d ".next" ]; then
    rm -rf .next.backup
    cp -r .next .next.backup
    echo -e "${BLUE}  .next 백업 완료${NC}"
fi

npm run build

# 빌드 검증
BUILD_OK=true
for f in ".next/prerender-manifest.json" ".next/build-manifest.json"; do
    if [ ! -f "$f" ]; then
        echo -e "${RED}❌ $f 없음!${NC}"
        BUILD_OK=false
    fi
done

if [ "$BUILD_OK" = false ]; then
    echo -e "${RED}❌ 빌드 검증 실패!${NC}"
    if [ -d ".next.backup" ]; then
        rm -rf .next
        mv .next.backup .next
        echo -e "${YELLOW}🔄 이전 버전으로 복원됨. 서비스 정상 유지.${NC}"
    fi
    exit 1
fi

echo -e "${GREEN}  ✅ 빌드 검증 통과${NC}"
rm -rf .next.backup
echo ""

# Step 4: PM2 재시작
echo -e "${GREEN}[4/4] PM2 재시작...${NC}"
if pm2 list | grep -q "$PM2_APP"; then
    pm2 restart "$PM2_APP"
else
    pm2 start npm --name "$PM2_APP" -- start
fi
pm2 save

echo ""
echo -e "${GREEN}✅ 배포 완료!${NC}"
pm2 list
