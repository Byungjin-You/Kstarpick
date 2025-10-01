#!/bin/bash

# 스마트 배포 스크립트
# 사용법: ./smart-deploy.sh [파일경로1] [파일경로2] ...

SERVER_IP="43.202.38.79"
SERVER_USER="ec2-user"
KEY_FILE="~/Desktop/key_kstarpick.pem"

echo "🚀 스마트 배포 시작..."

# 인자가 없으면 사용법 표시
if [ $# -eq 0 ]; then
    echo "사용법: $0 <파일1> [파일2] [파일3] ..."
    echo "예시: $0 pages/admin/login.js pages/api/dramas/index.js"
    exit 1
fi

# 변경된 파일들 업로드
echo "📤 변경된 파일들 업로드 중..."
for file in "$@"; do
    if [ -f "$file" ]; then
        echo "  📄 업로드: $file"
        # 디렉토리 구조 유지하면서 업로드
        scp -i "$KEY_FILE" "$file" "$SERVER_USER@$SERVER_IP:/doohub/service/kstarpick/$file"
    else
        echo "  ❌ 파일 없음: $file"
    fi
done

# 빌드가 필요한지 확인
NEED_BUILD=false
for file in "$@"; do
    case "$file" in
        pages/*|components/*|lib/*|utils/*|styles/*|next.config.js|package.json)
            NEED_BUILD=true
            break
            ;;
    esac
done

# 서버에서 처리
echo "🔧 서버에서 처리 중..."
ssh -i "$KEY_FILE" "$SERVER_USER@$SERVER_IP" << EOF
cd /doohub/service/kstarpick

if [ "$NEED_BUILD" = true ]; then
    echo "🔨 빌드가 필요한 파일이 변경됨. 빌드 중..."
    npm run build
    echo "🔄 PM2 재시작 중..."
    pm2 restart kstarpick
else
    echo "🔄 PM2 리로드 중... (빌드 불필요)"
    pm2 reload kstarpick
fi

echo "✅ 배포 완료!"
pm2 status kstarpick
EOF

echo "🎉 스마트 배포 완료!" 