import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Get session for authentication
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    await dbConnect();
    
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'TV/Film ID is required' });
    }
    
    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user has liked this content
    const hasLiked = user.likes && user.likes.some(
      like => like.contentId.toString() === id && like.contentType === 'tvfilm'
    );
    
    // Check if user has disliked this content
    const hasDisliked = user.dislikes && user.dislikes.some(
      dislike => dislike.contentId.toString() === id && dislike.contentType === 'tvfilm'
    );
    
    // Check if user has bookmarked this content
    const hasBookmarked = user.bookmarks && user.bookmarks.some(
      bookmark => bookmark.contentId.toString() === id && bookmark.contentType === 'tvfilm'
    );
    
    return res.status(200).json({
      success: true,
      interactions: {
        liked: hasLiked || false,
        disliked: hasDisliked || false,
        bookmarked: hasBookmarked || false
      }
    });
  } catch (error) {
    console.error('Error checking TV/Film interactions:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
} 