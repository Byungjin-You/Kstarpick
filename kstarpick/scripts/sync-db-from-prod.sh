#!/bin/bash

# 실서버 DB에서 로컬로 데이터 동기화 스크립트

echo "🔄 실서버 DB 데이터를 로컬로 동기화합니다..."

# MongoDB 연결 정보
PROD_URI="mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1"
LOCAL_URI="mongodb://localhost:27017/kstarpick_dev"

# 컬렉션 목록
COLLECTIONS=("news" "users" "categories" "image_hashes" "featured_news" "watch_news")

# 각 컬렉션 동기화
for COLLECTION in "${COLLECTIONS[@]}"
do
    echo "📥 $COLLECTION 컬렉션 동기화 중..."

    # 실서버에서 데이터 내보내기
    mongodump --uri="$PROD_URI" --collection="$COLLECTION" --out="/tmp/mongodb_dump"

    # 로컬로 데이터 가져오기
    mongorestore --uri="$LOCAL_URI" --collection="$COLLECTION" --drop "/tmp/mongodb_dump/kstarpick/$COLLECTION.bson"
done

# 임시 파일 삭제
rm -rf /tmp/mongodb_dump

echo "✅ DB 동기화 완료!"