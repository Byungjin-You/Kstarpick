import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';
import TVFilm from '../../../models/TVFilm';
import cookie from 'cookie';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { contentId, type } = req.body;

    if (!contentId || !type) {
      return res.status(400).json({ success: false, message: 'Content ID and type are required' });
    }

    // Get session for authenticated users
    const session = await getSession({ req });

    // For non-authenticated users, use cookies
    if (!session) {
      try {
        // Parse cookies from the request
        const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
        
        // Safely parse JSON cookies with fallbacks
        let likesCookie = {};
        let dislikesCookie = {};
        
        try {
          likesCookie = cookies.likes ? JSON.parse(cookies.likes) : {};
        } catch (e) {
          console.log('Error parsing likes cookie:', e);
          likesCookie = {};
        }
        
        try {
          dislikesCookie = cookies.dislikes ? JSON.parse(cookies.dislikes) : {};
        } catch (e) {
          console.log('Error parsing dislikes cookie:', e);
          dislikesCookie = {};
        }
        
        // Toggle dislike status for this content
        const wasDisliked = dislikesCookie[contentId] === true;
        
        if (wasDisliked) {
          // If already disliked, remove the dislike
          delete dislikesCookie[contentId];
        } else {
          // Add dislike and remove like if exists
          dislikesCookie[contentId] = true;
          
          if (likesCookie[contentId]) {
            delete likesCookie[contentId];
          }
        }
        
        // Set updated cookies
        const likesCookieStr = JSON.stringify(likesCookie);
        const dislikesCookieStr = JSON.stringify(dislikesCookie);
        
        // Set cookies with httpOnly: false so they can be read by client JavaScript
        res.setHeader('Set-Cookie', [
          cookie.serialize('likes', likesCookieStr, {
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
            httpOnly: false
          }),
          cookie.serialize('dislikes', dislikesCookieStr, {
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
            httpOnly: false
          })
        ]);
        
        console.log(`Cookie dislike toggle for content ${contentId}: wasDisliked=${wasDisliked}, newStatus=${!wasDisliked}`);
        
        // Update content like/dislike count in the database
        await dbConnect();
        
        const content = await TVFilm.findById(contentId);
        if (!content) {
          return res.status(404).json({ success: false, message: 'Content not found' });
        }
        
        // Only update the counts if the dislike status actually changed
        if (!wasDisliked) {
          // Increment dislikes (new dislike added)
          content.dislikesCount = (content.dislikesCount || 0) + 1;
          
          // Decrement likes if user had liked previously
          if (likesCookie[contentId] === undefined && cookies.likes && 
              JSON.parse(cookies.likes)[contentId] === true) {
            content.likesCount = Math.max((content.likesCount || 0) - 1, 0);
          }
        } else {
          // Decrement dislikes (dislike removed)
          content.dislikesCount = Math.max((content.dislikesCount || 0) - 1, 0);
        }
        
        await content.save();
        
        return res.status(200).json({
          success: true,
          disliked: !wasDisliked,
          message: wasDisliked ? 'Dislike removed' : 'Content disliked'
        });
      } catch (error) {
        console.error('Error processing cookie-based dislike:', error);
        return res.status(500).json({ success: false, message: 'Error processing dislike' });
      }
    }

    // For authenticated users
    try {
      await dbConnect();
      
      // Get user and content
      const user = await User.findById(session.user.id);
      const content = await TVFilm.findById(contentId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      if (!content) {
        return res.status(404).json({ success: false, message: 'Content not found' });
      }
      
      // Initialize likes and dislikes arrays if they don't exist
      if (!user.likes) user.likes = [];
      if (!user.dislikes) user.dislikes = [];
      
      // Check if user has already disliked this content
      const dislikeIndex = user.dislikes.findIndex(
        dislike => dislike.contentId && dislike.contentId.toString() === contentId && dislike.contentType === type
      );
      
      const alreadyDisliked = dislikeIndex !== -1;
      
      if (alreadyDisliked) {
        // Remove dislike
        user.dislikes.splice(dislikeIndex, 1);
        content.dislikesCount = Math.max((content.dislikesCount || 0) - 1, 0);
      } else {
        // Add dislike
        user.dislikes.push({ contentId, contentType: type });
        content.dislikesCount = (content.dislikesCount || 0) + 1;
        
        // Remove like if exists
        const likeIndex = user.likes.findIndex(
          like => like.contentId && like.contentId.toString() === contentId && like.contentType === type
        );
        
        if (likeIndex !== -1) {
          user.likes.splice(likeIndex, 1);
          content.likesCount = Math.max((content.likesCount || 0) - 1, 0);
        }
      }
      
      // Save changes
      await user.save();
      await content.save();
      
      console.log(`User ${user._id} toggled dislike for content ${contentId}: now disliked=${!alreadyDisliked}`);
      
      return res.status(200).json({
        success: true,
        disliked: !alreadyDisliked,
        message: alreadyDisliked ? 'Dislike removed' : 'Content disliked'
      });
    } catch (dbError) {
      console.error('Database error processing dislike:', dbError);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
  } catch (error) {
    console.error('Error processing dislike:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
} 