import dbConnect from '../../../lib/dbConnect';
import Celebrity from '../../../models/Celebrity';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  const { method } = req;
  
  await dbConnect();
  
  switch (method) {
    case 'GET':
      try {
        // Build query from request query parameters
        const query = {};
        
        // Filter by category if provided
        if (req.query.category) {
          query.category = req.query.category;
        }
        
        // Filter by featured status if provided
        if (req.query.featured === 'true') {
          query.isFeatured = true;
        }
        
        // Filter by active status if provided
        if (req.query.active === 'true') {
          query.isActive = true;
        }
        
        // Sorting
        const sort = {};
        if (req.query.sort) {
          const sortField = req.query.sort;
          const sortDirection = req.query.desc === 'true' ? -1 : 1;
          sort[sortField] = sortDirection;
        } else {
          // Default sort by createdAt descending
          sort.createdAt = -1;
        }
        
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        // Execute query
        const celebrities = await Celebrity.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit);
          
        // Get total count for pagination
        const total = await Celebrity.countDocuments(query);
        
        res.status(200).json({
          success: true,
          data: {
            celebrities,
            pagination: {
              total,
              page,
              limit,
              pages: Math.ceil(total / limit)
            }
          }
        });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
      
    case 'POST':
      try {
        // Check authentication and authorization
        const session = await getSession({ req });
        if (!session || session.user.role !== 'admin') {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        // 요청 데이터 검증
        if (!req.body.name) {
          return res.status(400).json({ success: false, error: '이름이 필요합니다.' });
        }
        
        // 슬러그가 없는 경우 이름에서 생성
        if (!req.body.slug && req.body.name) {
          req.body.slug = req.body.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
        }
        
        // 소셜 미디어 관련 필드 초기화
        if (!req.body.socialMedia) req.body.socialMedia = {};
        if (!req.body.socialMediaFollowers) req.body.socialMediaFollowers = {};
        if (!req.body.socialMediaRankings) req.body.socialMediaRankings = {};
        if (!req.body.socialMediaChanges) req.body.socialMediaChanges = {};
        
        // 타임스탬프 설정
        req.body.createdAt = new Date();
        req.body.updatedAt = new Date();
        req.body.socialMediaUpdatedAt = new Date();
        
        // 셀럽 데이터 생성
        const celebrity = await Celebrity.create(req.body);
        res.status(201).json({ success: true, data: celebrity });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
      break;
      
    default:
      res.status(400).json({ success: false, error: 'Invalid method' });
      break;
  }
} 