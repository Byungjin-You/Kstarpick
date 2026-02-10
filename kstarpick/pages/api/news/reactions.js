import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { db } = await connectToDatabase();

  if (req.method === 'GET') {
    // 특정 뉴스의 리액션 가져오기
    const { newsId } = req.query;

    if (!newsId) {
      return res.status(400).json({ error: 'newsId is required' });
    }

    try {
      const news = await db.collection('news').findOne(
        { _id: new ObjectId(newsId) },
        { projection: { reactions: 1 } }
      );

      const reactions = news?.reactions || {
        like: 0,
        congratulations: 0,
        surprised: 0,
        sad: 0
      };

      return res.status(200).json({ reactions });
    } catch (error) {
      console.error('Error fetching reactions:', error);
      return res.status(500).json({ error: 'Failed to fetch reactions' });
    }
  }

  else if (req.method === 'POST') {
    const { newsId, reactionType, previousReaction } = req.body;

    if (!newsId) {
      return res.status(400).json({ error: 'newsId is required' });
    }

    const validReactions = ['like', 'congratulations', 'surprised', 'sad'];

    if (reactionType && !validReactions.includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }
    if (previousReaction && !validReactions.includes(previousReaction)) {
      return res.status(400).json({ error: 'Invalid previous reaction type' });
    }

    try {
      const update = {};

      if (previousReaction) {
        update[`reactions.${previousReaction}`] = -1;
      }
      if (reactionType) {
        update[`reactions.${reactionType}`] = (update[`reactions.${reactionType}`] || 0) + 1;
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'reactionType or previousReaction required' });
      }

      // reactions 필드가 없을 수 있으므로 먼저 초기화
      await db.collection('news').updateOne(
        { _id: new ObjectId(newsId), reactions: { $exists: false } },
        { $set: { reactions: { like: 0, congratulations: 0, surprised: 0, sad: 0 } } }
      );

      const result = await db.collection('news').findOneAndUpdate(
        { _id: new ObjectId(newsId) },
        { $inc: update },
        { returnDocument: 'after', projection: { reactions: 1 } }
      );

      const doc = result.value || result;
      const reactions = doc?.reactions || { like: 0, congratulations: 0, surprised: 0, sad: 0 };

      // 음수 방지
      const sanitized = {};
      for (const key of validReactions) {
        sanitized[key] = Math.max(0, reactions[key] || 0);
      }

      // 음수가 있었으면 DB도 보정
      const needsFix = validReactions.some(k => (reactions[k] || 0) < 0);
      if (needsFix) {
        await db.collection('news').updateOne(
          { _id: new ObjectId(newsId) },
          { $set: { reactions: sanitized } }
        );
      }

      return res.status(200).json({ reactions: sanitized });
    } catch (error) {
      console.error('Error updating reactions:', error);
      return res.status(500).json({ error: 'Failed to update reactions' });
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}