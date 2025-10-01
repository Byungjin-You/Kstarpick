#!/bin/bash

# 실서버 데이터를 로컬 MongoDB로 가져오는 스크립트
# SSH 터널을 통해 AWS DocumentDB에서 데이터를 덤프하고 로컬로 복원

echo "🚀 실서버 데이터를 로컬 MongoDB로 가져오기 시작..."

# 변수 설정
EC2_HOST="ec2-user@43.202.38.79"
REMOTE_MONGO_URI="mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1"
LOCAL_DB="kstarpick_dev"
DUMP_DIR="/tmp/kstarpick_dump"

# 1. SSH를 통해 EC2에서 MongoDB 덤프 실행
echo "📥 Step 1: EC2 서버에서 데이터 덤프 중..."
ssh $EC2_HOST << 'ENDSSH'
    # mongodump이 설치되어 있는지 확인
    if ! command -v mongodump &> /dev/null; then
        echo "mongodump 설치 중..."
        wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-amazon2-x86_64-100.9.0.rpm
        sudo rpm -i mongodb-database-tools-amazon2-x86_64-100.9.0.rpm
    fi

    # 덤프 디렉토리 생성
    rm -rf /tmp/kstarpick_dump
    mkdir -p /tmp/kstarpick_dump

    # DocumentDB에서 데이터 덤프
    mongodump --uri="mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1" --out=/tmp/kstarpick_dump

    # tar로 압축
    cd /tmp
    tar czf kstarpick_dump.tar.gz kstarpick_dump
    echo "✅ 덤프 완료!"
ENDSSH

# 2. EC2에서 로컬로 덤프 파일 복사
echo "📦 Step 2: 덤프 파일을 로컬로 복사 중..."
rm -rf $DUMP_DIR
mkdir -p $DUMP_DIR
scp $EC2_HOST:/tmp/kstarpick_dump.tar.gz /tmp/

# 3. 압축 해제
echo "📂 Step 3: 압축 해제 중..."
cd /tmp
tar xzf kstarpick_dump.tar.gz

# 4. 로컬 MongoDB에 복원
echo "💾 Step 4: 로컬 MongoDB에 데이터 복원 중..."

# 로컬 MongoDB가 실행 중인지 확인
if ! pgrep -x "mongod" > /dev/null; then
    echo "MongoDB 시작 중..."
    brew services start mongodb-community
    sleep 3
fi

# 기존 로컬 데이터 백업
echo "🔒 기존 로컬 데이터 백업 중..."
mongodump --db=$LOCAL_DB --out=/tmp/local_backup_$(date +%Y%m%d_%H%M%S)

# 데이터 복원 (기존 데이터 삭제 후 복원)
mongorestore --drop --db=$LOCAL_DB /tmp/kstarpick_dump/kstarpick

# 5. 정리
echo "🧹 Step 5: 임시 파일 정리 중..."
rm -f /tmp/kstarpick_dump.tar.gz
rm -rf /tmp/kstarpick_dump
ssh $EC2_HOST "rm -f /tmp/kstarpick_dump.tar.gz && rm -rf /tmp/kstarpick_dump"

echo "✅ 완료! 실서버 데이터가 로컬 MongoDB로 복사되었습니다."
echo ""
echo "📊 데이터 확인:"
mongo $LOCAL_DB --eval "db.getCollectionNames().forEach(function(c) { print(c + ': ' + db[c].count()) })"