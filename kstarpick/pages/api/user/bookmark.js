import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';

export default async function handler(req, res) {
  // Only accept POST requests
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
    
    const { contentId, contentType } = req.body;
    
    if (!contentId || !contentType) {
      return res.status(400).json({ success: false, message: 'Content ID and type are required' });
    }
    
    // Get user
    let user = await User.findById(session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user already bookmarked this content
    const userBookmarks = user.bookmarks || [];
    const bookmarkIndex = userBookmarks.findIndex(
      bookmark => bookmark.contentId.toString() === contentId && bookmark.contentType === contentType
    );
    
    let bookmarked = false;
    
    if (bookmarkIndex >= 0) {
      // User already bookmarked this content, so remove the bookmark
      userBookmarks.splice(bookmarkIndex, 1);
      bookmarked = false;
    } else {
      // User hasn't bookmarked this content yet, so add the bookmark
      userBookmarks.push({
        contentId,
        contentType,
        timestamp: new Date()
      });
      bookmarked = true;
    }
    
    // Update user
    user.bookmarks = userBookmarks;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: bookmarked ? 'Content bookmarked successfully' : 'Bookmark removed successfully',
      bookmarked
    });
  } catch (error) {
    console.error('Error handling bookmark:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
} 