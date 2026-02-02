import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// MongoDB 연결 재시도 함수
async function getDbWithRetry(maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await clientPromise;
      const db = client.db('kstarpick');

      // 연결 테스트
      await db.command({ ping: 1 });

      return { client, db };
    } catch (error) {
      lastError = error;
      console.error(`[draft-articles] DB connection attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        // 재시도 전 대기 (지수 백오프)
        const delay = Math.pow(2, attempt) * 500; // 1초, 2초, 4초
        console.log(`[draft-articles] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }

  let db, collection;

  try {
    const connection = await getDbWithRetry();
    db = connection.db;
    collection = db.collection('draft_articles');
  } catch (error) {
    console.error('[draft-articles] Failed to connect to database:', error);
    return res.status(503).json({
      success: false,
      message: '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
    });
  }

  // GET - 임시 기사 목록 조회
  if (req.method === 'GET') {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const query = {};
      if (status && status !== 'all') {
        query.status = status;
      }

      const [articles, total] = await Promise.all([
        collection.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .toArray(),
        collection.countDocuments(query)
      ]);

      // 상태별 통계
      const stats = await collection.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray();

      const statusCounts = {
        draft: 0,
        review: 0,
        approved: 0,
        published: 0,
        rejected: 0
      };
      stats.forEach(s => {
        statusCounts[s._id] = s.count;
      });

      return res.status(200).json({
        success: true,
        data: {
          articles,
          stats: statusCounts,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      console.error('Draft articles fetch error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST - 새 임시 기사 저장
  if (req.method === 'POST') {
    try {
      const {
        campaignIdx,
        campaignTitle,
        artistName,
        groupName,
        voteCategory,
        season,
        title,
        content,
        generatedBy,
        factCheckResult,
        voteData
      } = req.body;

      const article = {
        campaignIdx,
        campaignTitle,
        artistName,
        groupName,
        voteCategory,
        season,
        title,
        content,
        generatedBy, // 'gemini'
        factCheckResult, // Claude 검증 결과
        voteData, // 투표 원본 데이터
        status: 'draft', // draft, review, approved, published, rejected
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: session.user.email
      };

      const result = await collection.insertOne(article);

      return res.status(201).json({
        success: true,
        data: { _id: result.insertedId, ...article }
      });
    } catch (error) {
      console.error('Draft article create error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT - 임시 기사 수정 (상태 변경 포함)
  if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID가 필요합니다.' });
      }

      updateData.updatedAt = new Date();

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: '기사를 찾을 수 없습니다.' });
      }

      return res.status(200).json({ success: true, message: '수정되었습니다.' });
    } catch (error) {
      console.error('Draft article update error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE - 임시 기사 삭제
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, message: 'ID가 필요합니다.' });
      }

      const result = await collection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: '기사를 찾을 수 없습니다.' });
      }

      return res.status(200).json({ success: true, message: '삭제되었습니다.' });
    } catch (error) {
      console.error('Draft article delete error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
