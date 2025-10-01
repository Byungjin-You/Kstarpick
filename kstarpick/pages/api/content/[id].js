import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import Content from '../../../models/Content';
import ContentReview from '../../../models/ContentReview';
import slugify from 'slugify';

export default async function handler(req, res) {
  const { id } = req.query;
  const session = await getSession({ req });
  
  await dbConnect();
  
  // Validate ID
  if (!id) {
    return res.status(400).json({ success: false, message: 'Content ID is required' });
  }
  
  // GET: 특정 콘텐츠 조회
  if (req.method === 'GET') {
    try {
      // 콘텐츠 조회 (by ID or slug)
      let content;
      
      // ObjectId 형식인지 확인
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        content = await Content.findById(id);
      } else {
        // 슬러그로 조회
        content = await Content.findOne({ slug: id });
      }
      
      if (!content) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      
      // 조회수 증가
      try {
        content.views += 1;
        
        // 유효하지 않은 ageRating 값 처리
        const validAgeRatings = ['ALL', '12', '15', '18', 'R'];
        if (content.ageRating && !validAgeRatings.includes(content.ageRating)) {
          content.ageRating = 'ALL'; // 기본값으로 설정
        }
        
        // watchProviders 필드 검증 및 수정
        if (content.watchProviders && Array.isArray(content.watchProviders)) {
          content.watchProviders = content.watchProviders.map(provider => {
            if (!provider.name) provider.name = 'Unknown';
            if (!provider.type) provider.type = 'subscription';
            return provider;
          });
        }
        
        await Content.findByIdAndUpdate(content._id, { 
          views: content.views,
          ageRating: content.ageRating,
          watchProviders: content.watchProviders
        });
      } catch (updateError) {
        console.warn('조회수 업데이트 중 오류 발생:', updateError);
        // 업데이트 실패해도 콘텐츠는 반환
      }
      
      return res.status(200).json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Error fetching content:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // PUT: 콘텐츠 수정
  else if (req.method === 'PUT') {
    // 관리자 권한 확인
    if (!session || !session.user.role || !['admin', 'editor'].includes(session.user.role)) {
      return res.status(403).json({ success: false, message: '콘텐츠 수정 권한이 없습니다.' });
    }
    
    try {
      // 콘텐츠 존재 확인
      const content = await Content.findById(id);
      if (!content) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      
      const { 
        title, 
        originalTitle, 
        contentType,
        content: contentData, 
        summary, 
        coverImage, 
        releaseDate,
        status,
        network,
        director,
        country,
        runtime,
        ageRating,
        tags,
        genres,
        cast,
        featured,
        bannerImage,
        trailerUrl,
        watchProviders,
        videos
      } = req.body;
      
      // 필수 필드 검증
      if (!title) {
        return res.status(400).json({ success: false, message: '제목은 필수입니다.' });
      }
      
      if (!contentType) {
        return res.status(400).json({ success: false, message: '콘텐츠 타입은 필수입니다.' });
      }
      
      if (!contentData) {
        return res.status(400).json({ success: false, message: '내용은 필수입니다.' });
      }
      
      if (!summary) {
        return res.status(400).json({ success: false, message: '요약은 필수입니다.' });
      }
      
      if (!coverImage) {
        return res.status(400).json({ success: false, message: '커버 이미지는 필수입니다.' });
      }
      
      if (!releaseDate) {
        return res.status(400).json({ success: false, message: '출시일은 필수입니다.' });
      }
      
      // 제목이 변경된 경우 슬러그 업데이트
      let slug = content.slug;
      if (title !== content.title) {
        slug = slugify(title, { 
          lower: true, 
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
        
        // 다른 콘텐츠와 슬러그 중복 확인
        const slugExists = await Content.findOne({ 
          slug,
          _id: { $ne: id },
          lang: content.lang 
        });
        
        if (slugExists) {
          slug = `${slug}-${Date.now().toString().slice(-4)}`;
        }
      }
      
      // 콘텐츠 업데이트
      const updatedContent = await Content.findByIdAndUpdate(
        id,
        {
          title,
          originalTitle: originalTitle || '',
          slug,
          contentType,
          content: contentData,
          summary,
          coverImage,
          bannerImage: bannerImage || '',
          trailerUrl: trailerUrl || '',
          releaseDate,
          status: status || 'ongoing',
          network: network || '',
          director: director || '',
          country: country || '',
          runtime: runtime || '',
          ageRating: ageRating || '',
          tags: tags || [],
          genres: genres || [],
          cast: cast || [],
          watchProviders: watchProviders || [],
          videos: videos || [],
          featured: featured === true,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      return res.status(200).json({
        success: true,
        data: updatedContent
      });
    } catch (error) {
      console.error('Error updating content:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // DELETE: 콘텐츠 삭제
  else if (req.method === 'DELETE') {
    // 관리자 권한 확인 제거됨 (크롤링 작업 편의성을 위해)
    console.log('[콘텐츠 API] DELETE 토큰 검사 생략됨 - 크롤링 모드');
    
    try {
      // 콘텐츠 존재 확인
      const content = await Content.findById(id);
      if (!content) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      
      // 관련 리뷰 삭제 (cascade)
      await ContentReview.deleteMany({ content: id });
      
      // 콘텐츠 삭제
      await Content.findByIdAndDelete(id);
      
      return res.status(200).json({
        success: true,
        message: '콘텐츠가 성공적으로 삭제되었습니다.'
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // 지원하지 않는 메소드
  else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }
} 