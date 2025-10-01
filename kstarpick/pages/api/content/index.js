import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import Content from '../../../models/Content';
import slugify from 'slugify';
import mongoose from 'mongoose';
import ReviewSchema from '../../../models/Review';

export default async function handler(req, res) {
  const session = await getSession({ req });
  await dbConnect();

  // GET: 콘텐츠 목록 조회
  if (req.method === 'GET') {
    try {
      const { 
        page = 1, 
        limit = 10, 
        sort = 'createdAt', 
        order = 'desc', 
        contentType, 
        featured, 
        search,
        tags,
        genres
      } = req.query;
      
      // 쿼리 빌드
      const query = {};
      
      // 컨텐츠 타입 필터링 (드라마, 영화 등)
      if (contentType) {
        query.contentType = contentType;
      }
      
      // 대표 콘텐츠 필터링
      if (featured === 'true') {
        query.featured = true;
      }
      
      // 검색어 처리
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { originalTitle: { $regex: search, $options: 'i' } },
          { summary: { $regex: search, $options: 'i' } }
        ];
      }
      
      // 태그 필터링
      if (tags) {
        const tagList = tags.split(',').map(tag => tag.trim());
        query.tags = { $in: tagList };
      }
      
      // 장르 필터링
      if (genres) {
        const genreList = genres.split(',').map(genre => genre.trim());
        query.genres = { $in: genreList };
      }
      
      // 페이지네이션 계산
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;
      
      // 정렬 방향 결정
      const sortDirection = order.toLowerCase() === 'asc' ? 1 : -1;
      
      // 정렬 객체 생성
      const sortObj = {};
      sortObj[sort] = sortDirection;
      
      // 쿼리 실행 (필요한 필드만 선택)
      const contents = await Content.find(query)
        .select('title originalTitle slug contentType coverImage releaseDate reviewRating reviewCount featured genres tags status network createdAt updatedAt')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum);
      
      // 전체 개수 확인
      const total = await Content.countDocuments(query);
      
      return res.status(200).json({
        success: true,
        data: contents,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching contents:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // POST: 콘텐츠 생성
  else if (req.method === 'POST') {
    try {
      // 관리자 권한 확인
      if (!session || session.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' });
      }

      const contentData = req.body;
      
      // 필수 필드 검증
      if (!contentData.title || !contentData.contentType || !contentData.summary || !contentData.content) {
        return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
      }

      // 슬러그 생성 또는 사용자 지정 슬러그 사용
      let slug = contentData.slug;
      if (!slug) {
        slug = slugify(contentData.title, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
        
        // 출시년도가 있으면 슬러그에 붙이기
        if (contentData.releaseDate) {
          const releaseYear = new Date(contentData.releaseDate).getFullYear();
          slug = `${slug}-${releaseYear}`;
        }
      }
      
      // 중복된 슬러그 처리
      const existingContent = await Content.findOne({ slug });
      if (existingContent) {
        slug = `${slug}-${Date.now().toString().substring(9)}`;
      }
      
      // 데이터 준비
      const newContent = new Content({
        ...contentData,
        slug,
        reviewRating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 데이터베이스에 저장
      const savedContent = await newContent.save();
      
      // 리뷰 데이터가 있으면 리뷰도 생성
      if (contentData.reviews && contentData.reviews.length > 0) {
        const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
        
        // 리뷰 데이터 처리 및 평균 평점 계산
        let totalRating = 0;
        
        const reviewPromises = contentData.reviews.map(review => {
          // 리뷰 데이터 생성
          const newReview = new Review({
            title: review.title,
            content: review.content,
            rating: review.rating,
            authorName: review.authorName,
            spoiler: review.spoiler || false,
            tags: review.tags || [],
            approved: true, // 관리자가 생성하므로 기본적으로 승인됨
            featured: review.featured || false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // 콘텐츠 타입에 따라 적절한 필드에 콘텐츠 ID 할당
          if (contentData.contentType === 'drama') {
            newReview.dramaId = savedContent._id;
          } else {
            newReview.tvfilmId = savedContent._id;
          }
          
          totalRating += review.rating;
          return newReview.save();
        });
        
        // 모든 리뷰 저장
        await Promise.all(reviewPromises);
        
        // 평균 평점 계산 및 콘텐츠 업데이트
        if (contentData.reviews.length > 0) {
          const averageRating = totalRating / contentData.reviews.length;
          
          // 콘텐츠 평점과 리뷰 수 업데이트
          await Content.findByIdAndUpdate(savedContent._id, {
            reviewRating: averageRating,
            reviewCount: contentData.reviews.length
          });
        }
      }
      
      return res.status(201).json({
        success: true,
        message: '콘텐츠가 성공적으로 생성되었습니다.',
        contentId: savedContent._id,
        slug: savedContent.slug
      });
    } catch (error) {
      console.error('콘텐츠 생성 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
  }
  
  // 지원하지 않는 메소드
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }
} 