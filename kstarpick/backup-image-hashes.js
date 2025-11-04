/**
 * AWS 프로덕션 서버에서 image_hashes 컬렉션을 로컬 DB로 백업하는 스크립트
 * 사용법: node backup-image-hashes.js
 */

const { MongoClient } = require('mongodb');

// 프로덕션 DB URI (AWS DocumentDB)
const PROD_DB_URI = 'mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1';
const PROD_DB_NAME = 'kstarpick';

// 로컬 DB URI
const LOCAL_DB_URI = 'mongodb://localhost:27017/kstarpick_dev';
const LOCAL_DB_NAME = 'kstarpick_dev';

async function backupImageHashes() {
  let prodClient;
  let localClient;

  try {
    console.log('🔗 프로덕션 DB에 연결 중...');
    console.log(`   URI: ${PROD_DB_URI.replace(/:[^:]*@/, ':****@')}\n`);

    // 프로덕션 DB 연결
    prodClient = await MongoClient.connect(PROD_DB_URI, {
      retryWrites: false,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1',
    });

    const prodDb = prodClient.db(PROD_DB_NAME);
    const prodCollection = prodDb.collection('image_hashes');

    console.log('✅ 프로덕션 DB 연결 성공!');

    // image_hashes 데이터 가져오기
    console.log('\n📦 image_hashes 데이터 조회 중...');
    const imageHashes = await prodCollection.find({}).toArray();

    console.log(`✅ ${imageHashes.length}개의 image hash 데이터를 찾았습니다.\n`);

    if (imageHashes.length === 0) {
      console.log('⚠️  백업할 image hash 데이터가 없습니다.');
      return;
    }

    // 샘플 데이터 출력
    console.log('📋 샘플 데이터 (처음 5개):');
    imageHashes.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. hash: ${item.hash}, url: ${item.url?.substring(0, 60)}...`);
    });

    console.log('\n🔗 로컬 DB에 연결 중...');
    localClient = await MongoClient.connect(LOCAL_DB_URI);
    const localDb = localClient.db(LOCAL_DB_NAME);
    const localCollection = localDb.collection('image_hashes');

    console.log('✅ 로컬 DB 연결 성공!');

    // 기존 데이터 삭제
    console.log('\n🗑️  기존 image_hashes 데이터 삭제 중...');
    const deleteResult = await localCollection.deleteMany({});
    console.log(`   삭제됨: ${deleteResult.deletedCount}개`);

    // 새 데이터 삽입
    console.log('\n💾 로컬 DB에 백업 중...');
    if (imageHashes.length > 0) {
      const insertResult = await localCollection.insertMany(imageHashes);
      console.log(`✅ ${insertResult.insertedCount}개의 image hash 데이터가 백업되었습니다.`);
    }

    // 인덱스 생성
    console.log('\n🔍 인덱스 생성 중...');
    await localCollection.createIndex({ hash: 1 }, { unique: true });
    console.log('✅ hash 필드에 인덱스 생성 완료');

    console.log('\n✨ 백업 완료!');
    console.log(`\n📊 통계:`);
    console.log(`   - 총 백업: ${imageHashes.length}개\n`);

  } catch (error) {
    console.error('\n❌ 백업 중 오류 발생:', error);
    throw error;
  } finally {
    if (prodClient) {
      await prodClient.close();
      console.log('🔌 프로덕션 DB 연결 종료');
    }
    if (localClient) {
      await localClient.close();
      console.log('🔌 로컬 DB 연결 종료');
    }
  }
}

// 스크립트 실행
backupImageHashes()
  .then(() => {
    console.log('✅ 백업 프로세스 완료\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 백업 프로세스 실패:', error);
    process.exit(1);
  });
