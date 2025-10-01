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
    
    // Check if user already bookmarked this content
    const bookmarkIndex = user.bookmarks ? user.bookmarks.findIndex(
      bookmark => bookmark.contentId.toString() === id && bookmark.contentType === 'tvfilm'
    ) : -1;
    
    let message;
    
    // Toggle bookmark
    if (bookmarkIndex > -1) {
      // Already bookmarked, so remove bookmark
      user.bookmarks.splice(bookmarkIndex, 1);
      message = 'TV/Film removed from bookmarks';
    } else {
      // Not bookmarked, so add bookmark
      if (!user.bookmarks) user.bookmarks = [];
      user.bookmarks.push({
        contentId: id,
        contentType: 'tvfilm',
        timestamp: new Date()
      });
      message = 'TV/Film bookmarked successfully';
    }
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message,
      bookmarked: bookmarkIndex === -1 // true if we just bookmarked, false if we unbookmarked
    });
  } catch (error) {
    console.error('Error bookmarking/unbookmarking TV/Film:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
} 