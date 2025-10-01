import { connectToDatabase } from '../../utils/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('news');
    
    // thumbnailUrl이 없거나 빈 문자열인 뉴스 찾기
    const newsWithoutThumbnail = await collection.find({
      $or: [
        { thumbnailUrl: { $exists: false } },
        { thumbnailUrl: '' },
        { thumbnailUrl: null }
      ],
      coverImage: { $exists: true, $ne: '' }
    }).toArray();
    
    console.log(`썸네일이 없는 뉴스: ${newsWithoutThumbnail.length}개`);
    
    if (newsWithoutThumbnail.length === 0) {
      return res.json({ 
        success: true, 
        message: '수정할 뉴스가 없습니다.',
        updated: 0 
      });
    }
    
    // 각 뉴스의 thumbnailUrl을 coverImage로 업데이트
    let updatedCount = 0;
    
    for (const news of newsWithoutThumbnail) {
      try {
        await collection.updateOne(
          { _id: news._id },
          { $set: { thumbnailUrl: news.coverImage } }
        );
        updatedCount++;
      } catch (error) {
        console.error(`뉴스 ${news._id} 업데이트 실패:`, error.message);
      }
    }
    
    // 결과 확인
    const fixedNews = await collection.countDocuments({
      thumbnailUrl: { $exists: true, $ne: '' }
    });
    
    return res.json({
      success: true,
      message: `${updatedCount}개 뉴스의 thumbnailUrl 업데이트 완료`,
      updated: updatedCount,
      totalWithThumbnail: fixedNews
    });
    
  } catch (error) {
    console.error('오류 발생:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 