const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './.env.production' });

// 실서버 DocumentDB URI
const uri = 'mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1';

async function checkSoompiTags() {
  const client = new MongoClient(uri, {
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
    authMechanism: 'SCRAM-SHA-1',
    retryWrites: false
  });

  try {
    await client.connect();
    console.log('실서버 DocumentDB 연결 성공\n');

    const db = client.db('kstarpick');
    const newsCollection = db.collection('news');

    // 전체 뉴스 개수
    const totalCount = await newsCollection.countDocuments();
    console.log('전체 뉴스 개수: ' + totalCount + '개\n');

    // soompi 태그가 있는 뉴스 검색 (대소문자 구분 없이)
    const soompiNews = await newsCollection.find({
      tags: { $regex: /soompi/i }
    }).limit(10).toArray();

    console.log('\n=== Soompi 태그가 있는 뉴스: ' + soompiNews.length + '개 ===\n');

    if (soompiNews.length > 0) {
      soompiNews.forEach((news, index) => {
        console.log((index + 1) + '. 제목: ' + news.title);
        console.log('   ID: ' + news._id);
        console.log('   태그: ' + (news.tags ? news.tags.join(', ') : '없음'));
        console.log('   URL: https://kstarpick.com/news/' + news._id);
        console.log('');
      });
    } else {
      console.log('Soompi 태그가 있는 뉴스를 찾을 수 없습니다.\n');

      // 모든 태그 샘플 확인
      const sampleNews = await newsCollection.find({ tags: { $exists: true, $ne: [] } }).limit(5).toArray();
      console.log('=== 태그가 있는 뉴스 샘플 5개 ===\n');
      sampleNews.forEach((news, index) => {
        console.log((index + 1) + '. ' + news.title);
        console.log('   태그: ' + (news.tags ? news.tags.join(', ') : '없음'));
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkSoompiTags();