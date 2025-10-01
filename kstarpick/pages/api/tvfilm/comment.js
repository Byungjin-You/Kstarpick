import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import User from '../../../models/User';
import TVFilm from '../../../models/TVFilm';
import Comment from '../../../models/Comment';

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  await dbConnect();

  // Handle POST request (add comment)
  if (req.method === 'POST') {
    try {
      const { id, content } = req.body;

      if (!id || !content) {
        return res.status(400).json({ 
          success: false, 
          message: 'TV/Film ID and comment content are required' 
        });
      }

      // Validate content length
      if (content.trim().length < 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'Comment cannot be empty' 
        });
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

      // Create comment
      const comment = await Comment.create({
        content,
        author: user._id,
        contentId: tvfilm._id,
        contentType: 'tvfilm',
        createdAt: new Date()
      });

      // Populate author info before sending response
      await comment.populate('author', 'name image');

      return res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        comment
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
  
  // Handle GET request (get comments for a TV/Film)
  else if (req.method === 'GET') {
    try {
      const { id, page = 1, limit = 10 } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, message: 'TV/Film ID is required' });
      }

      // Check if TV/Film exists
      const tvfilm = await TVFilm.findById(id);
      if (!tvfilm) {
        return res.status(404).json({ success: false, message: 'TV/Film not found' });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Get comments
      const comments = await Comment.find({ 
        contentId: id, 
        contentType: 'tvfilm' 
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'name image');

      // Get total count for pagination
      const total = await Comment.countDocuments({ 
        contentId: id, 
        contentType: 'tvfilm' 
      });

      return res.status(200).json({
        success: true,
        comments,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error getting comments:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
  
  // Handle DELETE request (delete a comment)
  else if (req.method === 'DELETE') {
    try {
      const { commentId } = req.body;
      
      if (!commentId) {
        return res.status(400).json({ success: false, message: 'Comment ID is required' });
      }

      // Find comment
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ success: false, message: 'Comment not found' });
      }

      // Check if user is the author of the comment or an admin
      if (comment.author.toString() !== session.user.id && session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
      }

      // Delete comment
      await Comment.deleteOne({ _id: commentId });

      return res.status(200).json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
  
  else {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
} 