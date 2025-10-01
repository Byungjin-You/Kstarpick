import { connectToDatabase } from '../../../../utils/mongodb';
import { getSession } from 'next-auth/react';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // 관리자 권한 확인
  const session = await getSession({ req });
  if (!session || session.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' });
  }
  
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, message: '리뷰 ID가 필요합니다.' });
  }
  
  try {
    const { db } = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');
    
    // ObjectId 변환 시도
    let reviewId;
    try {
      reviewId = new ObjectId(id);
    } catch (error) {
      return res.status(400).json({ success: false, message: '유효하지 않은 리뷰 ID입니다.' });
    }
    
    // GET 요청 처리 - 특정 리뷰 조회
    if (req.method === 'GET') {
      const review = await reviewsCollection.findOne({ _id: reviewId });
      
      if (!review) {
        return res.status(404).json({ success: false, message: '리뷰를 찾을 수 없습니다.' });
      }
      
      // 리뷰 응답과 함께 관련 콘텐츠 정보도 제공
      let contentInfo = null;
      if (review.dramaId || review.tvfilmId) {
        const contentId = review.dramaId || review.tvfilmId;
        const contentCollection = review.dramaId ? db.collection('dramas') : db.collection('tvfilms');
        
        try {
          const contentObjectId = typeof contentId === 'string' ? new ObjectId(contentId) : contentId;
          contentInfo = await contentCollection.findOne({ _id: contentObjectId });
        } catch (contentError) {
          console.error('관련 콘텐츠 조회 중 오류:', contentError);
        }
      }
      
      return res.status(200).json({
        success: true,
        review,
        contentInfo
      });
    }
    
    // PUT 요청 처리 - 리뷰 업데이트
    if (req.method === 'PUT') {
      const { title, content, rating, authorName, featured, approved, spoiler, tags } = req.body;
      
      // 기본 유효성 검사
      if (!title || !content || !rating || !authorName) {
        return res.status(400).json({ success: false, message: '필수 필드가 누락되었습니다.' });
      }
      
      // 업데이트할 데이터
      const updateData = {
        title,
        content,
        rating: parseInt(rating),
        authorName,
        featured: featured || false,
        approved: approved || false,
        spoiler: spoiler || false,
        tags: tags || [],
        updatedAt: new Date()
      };
      
      const result = await reviewsCollection.updateOne(
        { _id: reviewId },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: '리뷰를 찾을 수 없습니다.' });
      }
      
      return res.status(200).json({
        success: true,
        message: '리뷰가 성공적으로 업데이트되었습니다.'
      });
    }
    
    // DELETE 요청 처리 - 리뷰 삭제
    if (req.method === 'DELETE') {
      const result = await reviewsCollection.deleteOne({ _id: reviewId });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: '리뷰를 찾을 수 없습니다.' });
      }
      
      return res.status(200).json({
        success: true,
        message: '리뷰가 성공적으로 삭제되었습니다.'
      });
    }
    
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' });
  } catch (error) {
    console.error('리뷰 처리 중 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
} 