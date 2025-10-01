require('dotenv').config({ path: '.env.production' });
const { MongoClient } = require('mongodb');

async function checkSampleNews() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('kstarpick');
    
    const sampleNews = await db.collection('news').find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ title: 1, slug: 1, _id: 1 })
      .toArray();
    
    console.log('=== 최신 뉴스 5개의 URL 샘플 ===\n');
    sampleNews.forEach((news, index) => {
      console.log(`${index + 1}. ${news.title}`);
      console.log(`   ObjectId URL: https://www.kstarpick.com/news/${news._id}`);
      console.log(`   Slug URL: https://www.kstarpick.com/news/${news.slug}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await client.close();
  }
}

checkSampleNews();