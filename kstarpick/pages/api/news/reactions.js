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
    // 리액션 추가 (중복 클릭 허용 - 쿠키 없음)
    const { newsId, reactionType } = req.body;

    if (!newsId || !reactionType) {
      return res.status(400).json({ error: 'newsId and reactionType are required' });
    }

    const validReactions = ['like', 'congratulations', 'surprised', 'sad'];
    if (!validReactions.includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    try {
      // 단순히 클릭한 리액션만 1 증가 (중복 클릭 허용)
      const result = await db.collection('news').findOneAndUpdate(
        { _id: new ObjectId(newsId) },
        { $inc: { [`reactions.${reactionType}`]: 1 } },
        {
          returnDocument: 'after',
          projection: { reactions: 1 }
        }
      );

      // reactions 필드가 없으면 초기화
      if (!result.value?.reactions) {
        const initReactions = {
          like: 0,
          congratulations: 0,
          surprised: 0,
          sad: 0
        };
        initReactions[reactionType] = 1;

        await db.collection('news').updateOne(
          { _id: new ObjectId(newsId) },
          { $set: { reactions: initReactions } }
        );

        return res.status(200).json({ reactions: initReactions });
      }

      return res.status(200).json({ reactions: result.value.reactions });
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