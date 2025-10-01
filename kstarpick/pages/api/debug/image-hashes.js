import { MongoClient } from 'mongodb';

// MongoDB 연결
async function connectDB() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
  await client.connect();
  return client.db(process.env.MONGODB_DB || 'kstarpick');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectDB();
    
    // image_hashes 컬렉션 상태 확인
    const hashCollection = db.collection('image_hashes');
    const totalHashes = await hashCollection.countDocuments();
    
    // 샘플 해시 데이터 5개 가져오기
    const sampleHashes = await hashCollection.find({}).limit(5).toArray();
    
    // 특정 해시로 테스트
    const testHash = 'e25975e869141137';
    const testRecord = await hashCollection.findOne({ hash: testHash });
    
    return res.json({
      success: true,
      stats: {
        totalHashes,
        sampleHashes,
        testRecord
      }
    });

  } catch (error) {
    console.error('Debug image hashes error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to check image hashes',
      details: error.message 
    });
  }
} 