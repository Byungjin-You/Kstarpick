import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';
import TVFilm from '../../../models/TVFilm';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Get session for authentication
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    await dbConnect();
    
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'TV/Film ID is required' });
    }
    
    // Check if TV/Film exists
    const tvfilm = await TVFilm.findById(id);
    if (!tvfilm) {
      return res.status(404).json({ success: false, message: 'TV/Film not found' });
    }
    
    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user already disliked this content
    const dislikeIndex = user.dislikes ? user.dislikes.findIndex(
      dislike => dislike.contentId.toString() === id && dislike.contentType === 'tvfilm'
    ) : -1;
    
    // Check if user has liked this content
    const likeIndex = user.likes ? user.likes.findIndex(
      like => like.contentId.toString() === id && like.contentType === 'tvfilm'
    ) : -1;
    
    // Remove from likes if exists
    if (likeIndex > -1) {
      user.likes.splice(likeIndex, 1);
      tvfilm.likes = Math.max(0, tvfilm.likes - 1);
    }
    
    let message;
    
    // Toggle dislike
    if (dislikeIndex > -1) {
      // Already disliked, so undislike
      user.dislikes.splice(dislikeIndex, 1);
      message = 'TV/Film undisliked successfully';
      tvfilm.dislikes = Math.max(0, tvfilm.dislikes - 1);
    } else {
      // Not disliked, so add dislike
      if (!user.dislikes) user.dislikes = [];
      user.dislikes.push({
        contentId: id,
        contentType: 'tvfilm',
        timestamp: new Date()
      });
      message = 'TV/Film disliked successfully';
      tvfilm.dislikes = (tvfilm.dislikes || 0) + 1;
    }
    
    await user.save();
    await tvfilm.save();
    
    return res.status(200).json({
      success: true,
      message,
      disliked: dislikeIndex === -1 // true if we just disliked, false if we undisliked
    });
  } catch (error) {
    console.error('Error disliking/undisliking TV/Film:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
} 