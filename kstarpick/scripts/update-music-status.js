require('dotenv').config({ path: '.env.production' });
const { MongoClient } = require('mongodb');

async function updateMusicStatus() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('MongoDB 연결 성공\n');
    
    const db = client.db('kstarpick');
    const musicCollection = db.collection('musics');
    
    // status가 없거나 undefined인 음악들 찾기
    const musicsWithoutStatus = await musicCollection.find({
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: undefined }
      ]
    }).toArray();
    
    console.log(`Status가 없는 음악: ${musicsWithoutStatus.length}개`);
    
    if (musicsWithoutStatus.length > 0) {
      console.log('\n=== Status 업데이트할 음악들 ===');
      musicsWithoutStatus.forEach((music, index) => {
        console.log(`${index + 1}. ${music.title} - ${music.artist}`);
        console.log(`   Current status: ${music.status}`);
        console.log(`   ID: ${music._id}`);
        console.log('');
      });
      
      // 모든 음악의 status를 'active'로 업데이트
      const updateResult = await musicCollection.updateMany(
        {
          $or: [
            { status: { $exists: false } },
            { status: null },
            { status: undefined }
          ]
        },
        {
          $set: { 
            status: 'active',
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`✅ ${updateResult.modifiedCount}개 음악의 status를 'active'로 업데이트했습니다.`);
    } else {
      console.log('모든 음악이 이미 status를 가지고 있습니다.');
    }
    
    // 업데이트 후 확인
    const activeMusics = await musicCollection.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    console.log(`\n=== 활성 음악 목록 (최신 10개) ===`);
    activeMusics.forEach((music, index) => {
      console.log(`${index + 1}. ${music.title} - ${music.artist} (Status: ${music.status})`);
    });
    
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB 연결 종료');
  }
}

// 실행
updateMusicStatus().catch(console.error);