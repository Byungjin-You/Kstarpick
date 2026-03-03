import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);

    // 최근 댓글 가져오기 (최신순)
    const comments = await db.collection('comments')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    if (!comments.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    // 작성자 정보 조회 (author가 있는 댓글)
    const authorIds = comments
      .filter(c => c.author)
      .map(c => {
        try { return new ObjectId(c.author); } catch { return null; }
      })
      .filter(Boolean);

    let usersMap = {};
    if (authorIds.length > 0) {
      const users = await db.collection('users')
        .find({ _id: { $in: authorIds } })
        .project({ name: 1, image: 1 })
        .toArray();
      usersMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));
    }

    // 관련 콘텐츠 제목 조회 (news, tvfilm)
    const newsIds = comments.filter(c => c.contentType === 'news' && c.contentId).map(c => {
      try { return new ObjectId(c.contentId); } catch { return null; }
    }).filter(Boolean);
    const tvfilmIds = comments.filter(c => c.contentType === 'tvfilm' && c.contentId).map(c => {
      try { return new ObjectId(c.contentId); } catch { return null; }
    }).filter(Boolean);

    let newsMap = {};
    let tvfilmMap = {};

    if (newsIds.length > 0) {
      const newsItems = await db.collection('news')
        .find({ _id: { $in: newsIds } })
        .project({ title: 1, slug: 1 })
        .toArray();
      newsMap = Object.fromEntries(newsItems.map(n => [n._id.toString(), n]));
    }
    if (tvfilmIds.length > 0) {
      const tvfilmItems = await db.collection('tvfilms')
        .find({ _id: { $in: tvfilmIds } })
        .project({ title: 1, slug: 1 })
        .toArray();
      tvfilmMap = Object.fromEntries(tvfilmItems.map(t => [t._id.toString(), t]));
    }

    // 댓글 데이터 조합
    const enriched = comments.map(c => {
      const authorId = c.author?.toString();
      const user = authorId ? usersMap[authorId] : null;
      const contentId = c.contentId?.toString();
      const content = c.contentType === 'news' ? newsMap[contentId] : tvfilmMap[contentId];

      return {
        _id: c._id,
        content: c.content,
        createdAt: c.createdAt,
        contentType: c.contentType,
        contentSlug: content?.slug || contentId,
        contentTitle: content?.title || '',
        authorName: user?.name || c.guestName || 'Guest',
        authorImage: user?.image || null,
      };
    });

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error('[Recent Comments API] Error:', error);
    // 로컬 개발 환경에서 DB 연결 실패 시 로컬 데이터 fallback
    if (process.env.NODE_ENV === 'development' || process.env.USE_LOCAL_DATA === 'true') {
      try {
        const fs = require('fs');
        const path = require('path');
        const localPath = path.join(process.cwd(), 'data', 'local-comments.json');
        if (fs.existsSync(localPath)) {
          const localData = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
          console.log('[Comments API] Falling back to local data');
          return res.status(200).json(localData);
        }
      } catch (e) { /* ignore */ }
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
