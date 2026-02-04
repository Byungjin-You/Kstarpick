// 기존 기사에서 soompi 관련 태그를 일괄 제거하는 API
// POST /api/news/remove-soompi-tags

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret } = req.body || {};
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    const collection = db.collection('news');

    // soompi 태그가 포함된 기사 수 확인
    const count = await collection.countDocuments({ tags: { $regex: 'soompi', $options: 'i' } });

    // $pull로 soompi 관련 태그 제거
    const result = await collection.updateMany(
      { tags: { $regex: 'soompi', $options: 'i' } },
      { $pull: { tags: { $regex: 'soompi', $options: 'i' } } }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount}개 기사에서 soompi 태그를 제거했습니다.`,
      found: count,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('Remove soompi tags error:', error);
    return res.status(500).json({ error: 'Failed to remove soompi tags', details: error.message });
  } finally {
    await client.close();
  }
}
