import { connectToDatabase } from '../../../../utils/mongodb';
import { getSession } from 'next-auth/react';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // 관리자 권한 확인
  const session = await getSession({ req });
  if (!session || session.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' });
  }
  
  const { db } = await connectToDatabase();
  const reviewsCollection = db.collection('reviews');
  
  if (req.method === 'GET') {
    try {
      // 필터 파라미터 처리
      const { status, contentType, page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * parseInt(limit);
      
      const filter = {};
      
      if (status === 'approved') filter.approved = true;
      if (status === 'pending') filter.approved = false;
      if (status === 'reported') filter.reportCount = { $gt: 0 };
      if (contentType === 'drama') filter.dramaId = { $exists: true };
      if (contentType === 'movie') filter.tvfilmId = { $exists: true };
      
      // 리뷰 가져오기
      const reviews = await reviewsCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();
      
      // 카운트 통계
      const stats = {
        total: await reviewsCollection.countDocuments({}),
        approved: await reviewsCollection.countDocuments({ approved: true }),
        pending: await reviewsCollection.countDocuments({ approved: false }),
        reported: await reviewsCollection.countDocuments({ reportCount: { $gt: 0 } }),
        featured: await reviewsCollection.countDocuments({ featured: true })
      };
      
      return res.status(200).json({
        success: true,
        reviews,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: stats.total,
          pages: Math.ceil(stats.total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('리뷰 조회 중 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const { contentId, contentType, review } = req.body;
      
      if (!contentId || !contentType || !review) {
        return res.status(400).json({ success: false, message: '필수 데이터가 누락되었습니다.' });
      }
      
      // 새 리뷰 생성
      const newReview = {
        ...review,
        [contentType === 'drama' ? 'dramaId' : 'tvfilmId']: contentId,
        createdAt: new Date(),
        updatedAt: new Date(),
        approved: true, // 관리자가 만드는 리뷰는 자동 승인
        authorId: session.user.id,
        reportCount: 0
      };
      
      const result = await reviewsCollection.insertOne(newReview);
      
      return res.status(201).json({
        success: true,
        message: '리뷰가 성공적으로 생성되었습니다.',
        reviewId: result.insertedId
      });
    } catch (error) {
      console.error('리뷰 생성 중 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  }
  
  return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' });
} 