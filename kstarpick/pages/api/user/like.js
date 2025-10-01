import { getSession } from 'next-auth/react';
import { parseCookies, setCookie, destroyCookie } from 'nookies';
import User from '../../../models/User';
import TVFilm from '../../../models/TVFilm';
import dbConnect from '../../../lib/dbConnect';
// import { onError } from '../../../utils/middleware';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Check for required fields
    const { contentId, type } = req.body;
    if (!contentId || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Connect to database
    await dbConnect();

    // Check if content exists
    const content = await TVFilm.findById(contentId);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const session = await getSession({ req });
    let isLiked = false;
    let wasLiked = false;
    let wasDisliked = false;

    // Handle authenticated users
    if (session) {
      // Get user data
      const user = await User.findOne({ email: session.user.email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Check if user already liked this content
      wasLiked = user.likes.includes(contentId);
      wasDisliked = user.dislikes.includes(contentId);

      // Toggle like status
      if (wasLiked) {
        // If already liked, remove from likes
        user.likes = user.likes.filter(id => id.toString() !== contentId);
        isLiked = false;
        console.log(`User ${user._id} unliked ${contentId}`);
      } else {
        // If not liked, add to likes and remove from dislikes if present
        user.likes.push(contentId);
        if (wasDisliked) {
          user.dislikes = user.dislikes.filter(id => id.toString() !== contentId);
        }
        isLiked = true;
        console.log(`User ${user._id} liked ${contentId}`);
      }

      // Save user data
      await user.save();
    } 
    // Handle non-authenticated users with cookies
    else {
      try {
        const cookies = parseCookies({ req });
        const likesCookie = cookies.likes ? JSON.parse(cookies.likes) : [];
        const dislikesCookie = cookies.dislikes ? JSON.parse(cookies.dislikes) : [];

        // Check if content already liked
        wasLiked = likesCookie.includes(contentId);
        wasDisliked = dislikesCookie.includes(contentId);

        // Toggle like status
        if (wasLiked) {
          // If already liked, remove from likes
          const newLikes = likesCookie.filter(id => id !== contentId);
          setCookie({ res }, 'likes', JSON.stringify(newLikes), {
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
          });
          isLiked = false;
          console.log(`Cookie user unliked ${contentId}`);
        } else {
          // If not liked, add to likes and remove from dislikes if present
          const newLikes = [...likesCookie, contentId];
          setCookie({ res }, 'likes', JSON.stringify(newLikes), {
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
          });
          
          if (wasDisliked) {
            const newDislikes = dislikesCookie.filter(id => id !== contentId);
            setCookie({ res }, 'dislikes', JSON.stringify(newDislikes), {
              maxAge: 30 * 24 * 60 * 60,
              path: '/',
            });
          }
          
          isLiked = true;
          console.log(`Cookie user liked ${contentId}`);
        }
      } catch (error) {
        console.error('Error parsing cookies:', error);
        return res.status(500).json({ success: false, message: 'Error processing cookies' });
      }
    }

    // Update content like/dislike counts only if status changed
    if (wasLiked !== isLiked || wasDisliked) {
      // Calculate the changes needed
      let likeChange = 0;
      let dislikeChange = 0;
      
      if (wasLiked && !isLiked) {
        // User removed like
        likeChange = -1;
      } else if (!wasLiked && isLiked) {
        // User added like
        likeChange = 1;
      }
      
      if (wasDisliked && isLiked) {
        // User switched from dislike to like
        dislikeChange = -1;
      }
      
      // Only update if there are changes to make
      if (likeChange !== 0 || dislikeChange !== 0) {
        await TVFilm.findByIdAndUpdate(
          contentId,
          { 
            $inc: { 
              likes: likeChange,
              dislikes: dislikeChange
            } 
          }
        );
        console.log(`Updated ${contentId} counts: likes ${likeChange > 0 ? '+' : ''}${likeChange}, dislikes ${dislikeChange > 0 ? '+' : ''}${dislikeChange}`);
      }
    }

    // Return success with like status
    return res.status(200).json({ 
      success: true, 
      message: isLiked ? 'Successfully liked content' : 'Successfully unliked content',
      isLiked
    });
  } catch (error) {
    console.error('Error in like API:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
} 