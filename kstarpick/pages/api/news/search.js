import { createRouter } from 'next-connect';
import dbConnect from '../../../lib/dbConnect';
import News from '../../../models/News';
// import { onError } from '../../../utils/middleware';

// Create the handler using next-connect
const router = createRouter();

router.get(async (req, res) => {
  try {
    await dbConnect();
    
    const { 
      q, // search term
      page = 1, 
      limit = 10,
      category,
      tags,
      sort = 'createdAt',
      order = 'desc',
      fields,
      adminMode = 'false' // 어드민 모드 파라미터 추가
    } = req.query;
    
    // Validate page and limit
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ success: false, message: 'Invalid page number' });
    }
    
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({ success: false, message: 'Invalid limit (must be between 1 and 100)' });
    }
    
    // Build query
    const query = {};
    
    // 오류가 발생한 뉴스 필터링 (어드민 모드가 아닐 때만 적용)
    const errorFilter = adminMode !== 'true' ? {
      $and: [
        {
          $or: [
            { title: { $exists: true, $ne: '', $ne: null } },
            { title: { $exists: false } }
          ]
        },
        {
          $or: [
            { content: { $exists: false } },
            { content: { $ne: '<p>상세 기사를 가져오는 중 오류가 발생했습니다. 원본 페이지를 방문해 주세요.</p>' } },
            { content: { $not: { $regex: '^<p>상세 기사를 가져오는 중 오류가 발생했습니다' } } }
          ]
        }
      ]
    } : null;
    
    // Search term query (improved to search in multiple fields)
    if (q) {
      // 특수문자 escape 처리 (따옴표, 괄호 등이 regex를 깨뜨리지 않도록)
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedQ, 'i');
      query.$or = [
        { title: searchRegex },
        { summary: searchRegex },
        { content: searchRegex },
        { slug: searchRegex }
      ];
    }
    
    // Category filter
    if (category) {
      // Allow comma-separated categories
      const categories = category.split(',').map(c => c.trim());
      if (categories.length === 1) {
        query.category = category;
      } else {
        query.category = { $in: categories };
      }
    }
    
    // Tags filter
    if (tags) {
      // Allow comma-separated tags
      const tagList = tags.split(',').map(t => t.trim());
      if (tagList.length === 1) {
        query.tags = tags;
      } else {
        query.tags = { $in: tagList };
      }
    }
    
    // 오류 필터를 기존 쿼리와 결합 (어드민 모드가 아닐 때만)
    if (errorFilter) {
    if (Object.keys(query).length > 0) {
      query.$and = query.$and ? [...query.$and, ...errorFilter.$and] : errorFilter.$and;
    } else {
      Object.assign(query, errorFilter);
      }
    }
    
    // Determine which fields to return
    let projection = {};
    if (fields) {
      const fieldsList = fields.split(',').map(field => field.trim());
      fieldsList.forEach(field => {
        projection[field] = 1;
      });
    }
    
    // Execute query with pagination
    const skip = (pageNumber - 1) * limitNumber;
    
    // Validate sort field and order
    const validSortFields = ['title', 'createdAt', 'updatedAt', 'publishedAt', 'viewCount'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    const sortOptions = {};
    sortOptions[sortField] = sortOrder;
    
    console.log('Search query:', JSON.stringify(query));
    console.log('Sort options:', JSON.stringify(sortOptions));
    
    // Execute query with pagination
    const news = await News.find(query, projection)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNumber);
    
    // Get total count for pagination
    const total = await News.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      data: {
        news,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(total / limitNumber)
        },
        query: {
          searchTerm: q || null,
          category: category || null,
          tags: tags || null,
          sort: sortField,
          order: order
        }
      }
    });
  } catch (error) {
    console.error('News Search API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during search',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Export the handler
export default router.handler({
  onError: (err, req, res) => {
    console.error('API 오류:', err);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  },
  onNoMatch: (req, res) => {
    res.status(405).json({ success: false, message: `지원하지 않는 메소드: ${req.method}` });
  }
}); 