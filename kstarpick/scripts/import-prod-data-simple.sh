#!/bin/bash

# 실서버 데이터를 로컬 MongoDB로 가져오는 간단한 스크립트

echo "🚀 실서버 데이터를 로컬 MongoDB로 가져오기..."
echo "⚠️  이 작업은 SSH 키가 설정되어 있어야 합니다."

# 설정
EC2_HOST="43.202.38.79"
EC2_USER="ec2-user"
PEM_FILE="$HOME/Desktop/key_kstarpick.pem"
LOCAL_PORT="27018"
LOCAL_DB="kstarpick_dev"

# PEM 파일 권한 설정
chmod 400 "$PEM_FILE"

# 1. SSH 터널 생성
echo "🔒 Step 1: SSH 터널 생성 중..."
ssh -i "$PEM_FILE" -f -N -L ${LOCAL_PORT}:kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017 ${EC2_USER}@${EC2_HOST}
sleep 3

# SSH 터널 PID 저장
SSH_PID=$(ps aux | grep "ssh -i.*-f -N -L ${LOCAL_PORT}" | grep -v grep | awk '{print $2}')
echo "SSH 터널 PID: $SSH_PID"

# 2. 로컬 MongoDB 확인
echo "📊 Step 2: 로컬 MongoDB 상태 확인..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "MongoDB 시작 중..."
    brew services start mongodb-community
    sleep 3
fi

# 3. mongodump와 mongorestore 설치 확인
if ! command -v mongodump &> /dev/null; then
    echo "📦 MongoDB Database Tools 설치 중..."
    brew install mongodb-database-tools
fi

# 4. 기존 로컬 데이터 백업
echo "💾 Step 3: 기존 로컬 데이터 백업 중..."
BACKUP_DIR="/tmp/kstarpick_backup_$(date +%Y%m%d_%H%M%S)"
mongodump --db=$LOCAL_DB --out=$BACKUP_DIR
echo "백업 위치: $BACKUP_DIR"

# 5. 실서버에서 데이터 덤프 (SSH 터널 통해)
echo "📥 Step 4: 실서버 데이터 덤프 중..."
DUMP_DIR="/tmp/kstarpick_prod_dump"
rm -rf $DUMP_DIR

mongodump \
    --host=localhost:${LOCAL_PORT} \
    --username=kstarpick \
    --password='zpdltmxkvlr0!2' \
    --authenticationDatabase=admin \
    --db=kstarpick \
    --out=$DUMP_DIR

# 6. 로컬 MongoDB에 복원
echo "📤 Step 5: 로컬 MongoDB에 데이터 복원 중..."
# --noOptionsRestore: DocumentDB의 storage engine 옵션을 무시
# --noIndexRestore: 인덱스는 나중에 재생성 (호환성 문제 방지)
mongorestore --drop --noOptionsRestore --noIndexRestore --db=$LOCAL_DB $DUMP_DIR/kstarpick

# 7. SSH 터널 종료
echo "🧹 Step 6: 정리 중..."
if [ ! -z "$SSH_PID" ]; then
    kill $SSH_PID
    echo "SSH 터널 종료됨"
fi

# 임시 파일 정리
rm -rf $DUMP_DIR

# 8. 데이터 확인
echo ""
echo "✅ 완료! 실서버 데이터가 로컬 MongoDB로 복사되었습니다."
echo ""
echo "📊 복사된 데이터:"
mongo $LOCAL_DB --quiet --eval "
db.getCollectionNames().forEach(function(c) {
    var count = db[c].count();
    if(count > 0) {
        print(c + ': ' + count + '개');
    }
})"

echo ""
echo "🚀 서버를 시작하려면: npm run dev:local"