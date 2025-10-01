import { connectToDatabase } from '../../../utils/mongodb';
import { fetchArticleDetail } from './crawl';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { articleUrl, newsId } = req.body;
    
    if (!articleUrl && !newsId) {
      return res.status(400).json({ 
        success: false, 
        message: 'articleUrl 또는 newsId가 필요합니다.' 
      });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('news');
    
    // 뉴스 찾기
    let query = {};
    if (newsId) {
      const { ObjectId } = require('mongodb');
      query._id = new ObjectId(newsId);
    } else if (articleUrl) {
      query.articleUrl = articleUrl;
    }
    
    const news = await collection.findOne(query);
    
    if (!news) {
      return res.status(404).json({ 
        success: false, 
        message: '뉴스를 찾을 수 없습니다.' 
      });
    }
    
    console.log('찾은 뉴스:', {
      title: news.title,
      category: news.category,
      detailCategory: news.detailCategory,
      mappedCategory: news.mappedCategory,
      articleUrl: news.articleUrl
    });
    
    // 상세 페이지에서 카테고리 정보 가져오기
    console.log('상세 페이지에서 카테고리 정보 가져오는 중...');
    const detailContent = await fetchArticleDetail(news.articleUrl);
    
    if (detailContent.detailCategory && detailContent.mappedCategory) {
      const updateData = {
        detailCategory: detailContent.detailCategory,
        mappedCategory: detailContent.mappedCategory,
        category: detailContent.mappedCategory,
        updatedAt: new Date()
      };
      
      // 태그 업데이트
      if (detailContent.tags && detailContent.tags.length > 0) {
        updateData.tags = detailContent.tags;
      }
      
      const updateResult = await collection.updateOne(
        { _id: news._id },
        { $set: updateData }
      );
      
      if (updateResult.modifiedCount > 0) {
        const updatedNews = await collection.findOne({ _id: news._id });
        
        return res.status(200).json({
          success: true,
          message: `카테고리가 ${news.category}에서 ${detailContent.mappedCategory}로 업데이트되었습니다.`,
          original: {
            category: news.category,
            detailCategory: news.detailCategory,
            mappedCategory: news.mappedCategory
          },
          updated: {
            category: updatedNews.category,
            detailCategory: updatedNews.detailCategory,
            mappedCategory: updatedNews.mappedCategory
          }
        });
      } else {
        return res.status(200).json({
          success: true,
          message: '이미 최신 카테고리입니다.',
          current: {
            category: news.category,
            detailCategory: news.detailCategory,
            mappedCategory: news.mappedCategory
          }
        });
      }
    } else {
      return res.status(200).json({
        success: false,
        message: '상세 페이지에서 카테고리 정보를 찾을 수 없습니다.',
        detailContent: {
          detailCategory: detailContent.detailCategory,
          mappedCategory: detailContent.mappedCategory
        }
      });
    }
    
  } catch (error) {
    console.error('카테고리 업데이트 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다: ' + error.message 
    });
  }
} 