import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';
import { getSession } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { verifyToken } from '../../../lib/auth';
import slugify from 'slugify';

/**
 * @swagger
 * /api/news/{id}:
 *   get:
 *     description: Retrieves a specific news article
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB ID of the news article
 *     responses:
 *       200:
 *         description: News article found
 *       404:
 *         description: News article not found
 *   put:
 *     description: Updates a news article
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB ID of the news article
 *     responses:
 *       200:
 *         description: News article updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: News article not found
 *   delete:
 *     description: Deletes a news article
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB ID of the news article
 *     responses:
 *       200:
 *         description: News article deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: News article not found
 */
export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      return getNewsById(req, res, id, db);
    } else if (req.method === 'PUT') {
      return updateNews(req, res, id, db);
    } else if (req.method === 'DELETE') {
      return deleteNews(req, res, id, db);
    } else {
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`[API] Error processing request:`, error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}

async function getNewsById(req, res, id, db) {
  try {
    // 먼저 ObjectId로 조회 시도
    let news;
    try {
      if (ObjectId.isValid(id)) {
        news = await db.collection('news').findOne({ _id: new ObjectId(id) });
      }
    } catch (error) {
      console.error(`[API] 뉴스 조회 ObjectId 오류:`, error);
    }
    
    // ObjectId로 찾지 못했다면 slug로 시도
    if (!news) {
      news = await db.collection('news').findOne({ slug: id });
    }
    
    // 뉴스가 없는 경우
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }
    
    // 조회수 업데이트 (viewCount 필드가 없으면 생성)
    await db.collection('news').updateOne(
      { _id: news._id },
      { $inc: { viewCount: 1 } }
    );
    
    // ObjectId를 문자열로 변환
    news._id = news._id.toString();
    
    // 생성/수정 시간 ISO 문자열로 변환
    if (news.createdAt) news.createdAt = news.createdAt.toISOString();
    if (news.updatedAt) news.updatedAt = news.updatedAt.toISOString();
    
    // 결과 반환
    return res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    console.error(`[API] 뉴스 조회 오류:`, error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function updateNews(req, res, id, db) {
  try {
    // 개발 환경에서는 인증 절차 우회 가능
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment) {
      let isAuthorized = false;
      let userInfo = null;
      
      // 1. NextAuth 세션 확인
      try {
        const session = await getServerSession(req, res, authOptions);
        if (session && session.user && session.user.role === 'admin') {
          isAuthorized = true;
          userInfo = session.user;
          console.log('[NEWS UPDATE] NextAuth session found:', userInfo.email);
        }
      } catch (sessionError) {
        console.log('[NEWS UPDATE] NextAuth session check failed:', sessionError.message);
      }
      
      // 2. JWT 토큰 확인 (NextAuth가 실패한 경우)
      if (!isAuthorized) {
        try {
          const user = await verifyToken(req);
          if (user && (user.role === 'admin' || user.isAdmin)) {
            isAuthorized = true;
            userInfo = user;
            console.log('[NEWS UPDATE] JWT token found:', userInfo.email);
          }
        } catch (tokenError) {
          console.log('[NEWS UPDATE] JWT token check failed:', tokenError.message);
        }
      }
      
      // 3. 직접 데이터베이스에서 사용자 확인 (마지막 수단)
      if (!isAuthorized) {
        const authHeader = req.headers.authorization;
        const email = req.headers['x-user-email']; // 커스텀 헤더로 이메일 전달
        
        if (email) {
          try {
            const user = await db.collection('users').findOne({ email });
            if (user && user.role === 'admin') {
              isAuthorized = true;
              userInfo = user;
              console.log('[NEWS UPDATE] Database user found:', userInfo.email);
            }
          } catch (dbError) {
            console.log('[NEWS UPDATE] Database user check failed:', dbError.message);
          }
        }
      }
      
      if (!isAuthorized) {
        console.log('[NEWS UPDATE] Authorization failed - no valid admin credentials found');
        return res.status(401).json({
          success: false,
          message: 'Unauthorized - Admin access required'
        });
      }
      
      console.log('[NEWS UPDATE] Authorization successful for:', userInfo.email);
    }
    
    // Get update data
    const updateData = req.body;
    
    // Validate required fields
    if (!updateData.title || !updateData.content || !updateData.summary) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Update slug if title changed
    if (updateData.title) {
      updateData.slug = slugify(updateData.title, { lower: true, strict: true });
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date();
    
    // Update news article
    const result = await db.collection('news').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }
    
    // Get updated news article
    const updatedNews = await db.collection('news').findOne({
      _id: new ObjectId(id)
    });
    
    return res.status(200).json({
      success: true,
      data: updatedNews,
      message: 'News article updated successfully'
    });
  } catch (error) {
    console.error('Update news error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong'
    });
  }
}

async function deleteNews(req, res, id, db) {
  try {
    // 개발 환경에서는 인증 절차 우회 가능
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment) {
      let isAuthorized = false;
      let userInfo = null;
      
      // 1. NextAuth 세션 확인
      try {
        const session = await getServerSession(req, res, authOptions);
        if (session && session.user && session.user.role === 'admin') {
          isAuthorized = true;
          userInfo = session.user;
          console.log('[NEWS DELETE] NextAuth session found:', userInfo.email);
        }
      } catch (sessionError) {
        console.log('[NEWS DELETE] NextAuth session check failed:', sessionError.message);
      }
      
      // 2. JWT 토큰 확인 (NextAuth가 실패한 경우)
      if (!isAuthorized) {
        try {
          const user = await verifyToken(req);
          if (user && (user.role === 'admin' || user.isAdmin)) {
            isAuthorized = true;
            userInfo = user;
            console.log('[NEWS DELETE] JWT token found:', userInfo.email);
          }
        } catch (tokenError) {
          console.log('[NEWS DELETE] JWT token check failed:', tokenError.message);
        }
      }
      
      // 3. 직접 데이터베이스에서 사용자 확인 (마지막 수단)
      if (!isAuthorized) {
        const email = req.headers['x-user-email']; // 커스텀 헤더로 이메일 전달
        
        if (email) {
          try {
            const user = await db.collection('users').findOne({ email });
            if (user && user.role === 'admin') {
              isAuthorized = true;
              userInfo = user;
              console.log('[NEWS DELETE] Database user found:', userInfo.email);
            }
          } catch (dbError) {
            console.log('[NEWS DELETE] Database user check failed:', dbError.message);
          }
        }
      }
      
      if (!isAuthorized) {
        console.log('[NEWS DELETE] Authorization failed - no valid admin credentials found');
        return res.status(401).json({
          success: false,
          message: 'Unauthorized - Admin access required'
        });
      }
      
      console.log('[NEWS DELETE] Authorization successful for:', userInfo.email);
    }
    
    // ID 확인
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid news ID'
      });
    }
    
    // 뉴스 항목 삭제
    const result = await db.collection('news').deleteOne({
      _id: new ObjectId(id)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'News article deleted successfully'
    });
  } catch (error) {
    console.error('Delete news error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong'
    });
  }
} 