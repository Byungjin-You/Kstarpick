#!/bin/bash

# AWS EC2를 통한 SSH 터널링으로 실서버 DB 연결
# DocumentDB는 VPC 내부에서만 접근 가능하므로 EC2를 통해 터널링 필요

echo "🔒 AWS DocumentDB SSH 터널 생성 중..."

# SSH 터널 생성 (로컬 27018 포트를 DocumentDB로 포워딩)
ssh -N -L 27018:kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017 ec2-user@43.202.38.79 &

echo "✅ SSH 터널이 생성되었습니다!"
echo ""
echo "📝 .env.local 파일을 다음과 같이 수정하세요:"
echo ""
echo "MONGODB_URI=mongodb://kstarpick:zpdltmxkvlr0%212@localhost:27018/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1"
echo "MONGODB_DB=kstarpick"
echo ""
echo "종료하려면 Ctrl+C를 누르세요."

# 프로세스 유지
wait