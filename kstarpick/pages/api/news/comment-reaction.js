import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { commentId, type } = req.body;

    if (!commentId || !['like', 'dislike'].includes(type)) {
      return res.status(400).json({ success: false, message: 'commentId and type (like/dislike) are required' });
    }

    if (!ObjectId.isValid(commentId)) {
      return res.status(400).json({ success: false, message: 'Invalid comment ID' });
    }

    const { db } = await connectToDatabase();

    // Identify user by visitorId from cookie header or generate from IP
    const visitorId = req.headers['x-visitor-id'] || req.socket.remoteAddress || 'anonymous';

    // Check if this visitor already reacted to this comment
    const existingReaction = await db.collection('commentReactions').findOne({
      commentId: new ObjectId(commentId),
      visitorId
    });

    const commentObjId = new ObjectId(commentId);

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Same reaction = toggle off (remove)
        await db.collection('commentReactions').deleteOne({ _id: existingReaction._id });

        // Decrement the count
        const field = type === 'like' ? 'likes' : 'dislikes';
        await db.collection('comments').updateOne(
          { _id: commentObjId },
          { $inc: { [field]: -1 } }
        );

        const comment = await db.collection('comments').findOne({ _id: commentObjId });
        return res.status(200).json({
          success: true,
          action: 'removed',
          likes: Math.max(0, comment?.likes || 0),
          dislikes: Math.max(0, comment?.dislikes || 0),
          userReaction: null
        });
      } else {
        // Different reaction = switch
        const oldField = existingReaction.type === 'like' ? 'likes' : 'dislikes';
        const newField = type === 'like' ? 'likes' : 'dislikes';

        await db.collection('commentReactions').updateOne(
          { _id: existingReaction._id },
          { $set: { type, updatedAt: new Date() } }
        );

        await db.collection('comments').updateOne(
          { _id: commentObjId },
          { $inc: { [oldField]: -1, [newField]: 1 } }
        );

        const comment = await db.collection('comments').findOne({ _id: commentObjId });
        return res.status(200).json({
          success: true,
          action: 'switched',
          likes: Math.max(0, comment?.likes || 0),
          dislikes: Math.max(0, comment?.dislikes || 0),
          userReaction: type
        });
      }
    } else {
      // New reaction
      await db.collection('commentReactions').insertOne({
        commentId: commentObjId,
        visitorId,
        type,
        createdAt: new Date()
      });

      const field = type === 'like' ? 'likes' : 'dislikes';
      await db.collection('comments').updateOne(
        { _id: commentObjId },
        { $inc: { [field]: 1 } }
      );

      const comment = await db.collection('comments').findOne({ _id: commentObjId });
      return res.status(200).json({
        success: true,
        action: 'added',
        likes: Math.max(0, comment?.likes || 0),
        dislikes: Math.max(0, comment?.dislikes || 0),
        userReaction: type
      });
    }
  } catch (error) {
    console.error('[Comment Reaction API] Error:', error);
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
}
