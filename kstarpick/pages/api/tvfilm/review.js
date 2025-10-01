import { getSession } from 'next-auth/react';
import dbConnect from '../../../lib/dbConnect';
import TVFilm from '../../../models/TVFilm';
import Review from '../../../models/Review';
import User from '../../../models/User';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const session = await getSession({ req });
  
  // Connect to database
  await dbConnect();

  // GET: Fetch reviews for a specific TVFilm
  if (req.method === 'GET') {
    try {
      const { id, page = 1, limit = 10, sort = 'createdAt', order = 'desc', featured = false } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, message: 'TVFilm ID is required' });
      }

      // Validate TVFilm exists
      const tvfilm = await TVFilm.findById(id);
      if (!tvfilm) {
        return res.status(404).json({ success: false, message: 'TVFilm not found' });
      }

      // Build query
      const query = { tvfilm: id, approved: true };
      
      // Add featured filter if requested
      if (featured === 'true') {
        query.featured = true;
      }
      
      // Calculate pagination
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;
      
      // Determine sort direction
      const sortDirection = order.toLowerCase() === 'asc' ? 1 : -1;
      
      // Create sort object
      const sortObj = {};
      sortObj[sort] = sortDirection;
      
      // Execute query with pagination
      const reviews = await Review.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('author', 'name image');
      
      // Get total count for pagination
      const total = await Review.countDocuments(query);
      
      return res.status(200).json({
        success: true,
        data: reviews,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // POST: Create a new review
  else if (req.method === 'POST') {
    // Check authentication
    if (!session) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    try {
      const { id, rating, title, content, spoiler = false, isCritic = false } = req.body;
      
      // Validate required fields
      if (!id) {
        return res.status(400).json({ success: false, message: 'TVFilm ID is required' });
      }
      
      if (!rating || rating < 1 || rating > 10) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 10' });
      }
      
      if (!title) {
        return res.status(400).json({ success: false, message: 'Review title is required' });
      }
      
      if (!content) {
        return res.status(400).json({ success: false, message: 'Review content is required' });
      }
      
      // 평론가 리뷰 작성 시 관리자 권한 확인
      if (isCritic && (!session.user.role || session.user.role !== 'admin')) {
        return res.status(403).json({ 
          success: false, 
          message: '평론가 리뷰는 관리자만 작성할 수 있습니다.'
        });
      }
      
      // Validate TVFilm exists
      const tvfilm = await TVFilm.findById(id);
      if (!tvfilm) {
        return res.status(404).json({ success: false, message: 'TVFilm not found' });
      }
      
      // Check if user already reviewed this TVFilm
      const existingReview = await Review.findOne({ 
        tvfilm: id, 
        author: session.user.id 
      });
      
      if (existingReview) {
        return res.status(400).json({ 
          success: false, 
          message: 'You have already reviewed this TV/Film',
          reviewId: existingReview._id
        });
      }
      
      // Get user
      const user = await User.findById(session.user.id);
      
      // Create new review
      const review = new Review({
        tvfilm: id,
        author: session.user.id,
        authorName: user.name,
        rating: parseInt(rating, 10),
        title,
        content,
        isCritic: Boolean(isCritic),
        spoiler: spoiler === true || spoiler === 'true',
        featured: false,
        approved: true,  // Auto-approve for now, can be changed for moderation
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Save review
      await review.save();
      
      // Update TVFilm with new review stats
      const allReviews = await Review.find({ tvfilm: id, approved: true });
      const reviewCount = allReviews.length;
      let reviewRating = 0;
      let ratingDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      
      if (reviewCount > 0) {
        // Calculate average rating
        const ratingSum = allReviews.reduce((acc, rev) => acc + rev.rating, 0);
        reviewRating = parseFloat((ratingSum / reviewCount).toFixed(1));
        
        // Update rating distribution
        allReviews.forEach(rev => {
          const index = Math.min(Math.max(Math.floor(rev.rating) - 1, 0), 9);
          ratingDistribution[index]++;
        });
      }
      
      await TVFilm.findByIdAndUpdate(id, {
        reviewCount,
        reviewRating,
        ratingDistribution
      });
      
      // Include stats in the response for UI updates
      const reviewWithStats = review.toObject();
      reviewWithStats.tvfilmStats = {
        reviewCount,
        reviewRating,
        ratingDistribution
      };
      
      return res.status(201).json({
        success: true,
        data: reviewWithStats
      });
    } catch (error) {
      console.error('Error creating review:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // PUT: Update an existing review
  else if (req.method === 'PUT') {
    // Check authentication
    if (!session) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    try {
      const { reviewId, rating, title, content, spoiler, isCritic } = req.body;
      
      // Validate required fields
      if (!reviewId) {
        return res.status(400).json({ success: false, message: 'Review ID is required' });
      }
      
      // Find the review
      const review = await Review.findById(reviewId);
      
      if (!review) {
        return res.status(404).json({ success: false, message: 'Review not found' });
      }
      
      // Check if the user is the author of the review
      if (review.author.toString() !== session.user.id && session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to update this review' });
      }
      
      // 평론가 리뷰로 변경 시 관리자 권한 확인
      if (isCritic !== undefined && isCritic && (!session.user.role || session.user.role !== 'admin')) {
        return res.status(403).json({ 
          success: false, 
          message: '평론가 리뷰는 관리자만 수정할 수 있습니다.' 
        });
      }
      
      // Update fields
      if (rating !== undefined && (rating < 1 || rating > 10)) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 10' });
      }
      
      // Update the review
      const updateData = {
        updatedAt: new Date()
      };
      
      if (rating !== undefined) updateData.rating = parseInt(rating, 10);
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (spoiler !== undefined) updateData.spoiler = spoiler === true || spoiler === 'true';
      if (isCritic !== undefined) updateData.isCritic = Boolean(isCritic);
      
      const updatedReview = await Review.findByIdAndUpdate(
        reviewId,
        updateData,
        { new: true }
      );
      
      // Update TVFilm with new review stats if rating changed
      if (rating !== undefined) {
        const tvfilmId = review.tvfilm;
        const allReviews = await Review.find({ tvfilm: tvfilmId, approved: true });
        const reviewCount = allReviews.length;
        let reviewRating = 0;
        let ratingDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        
        if (reviewCount > 0) {
          // Calculate average rating
          const ratingSum = allReviews.reduce((acc, rev) => acc + rev.rating, 0);
          reviewRating = parseFloat((ratingSum / reviewCount).toFixed(1));
          
          // Update rating distribution
          allReviews.forEach(rev => {
            const index = Math.min(Math.max(Math.floor(rev.rating) - 1, 0), 9);
            ratingDistribution[index]++;
          });
        }
        
        await TVFilm.findByIdAndUpdate(tvfilmId, {
          reviewRating,
          ratingDistribution
        });
        
        // Add stats to the updated review response
        const updatedReviewWithStats = updatedReview.toObject();
        updatedReviewWithStats.tvfilmStats = {
          reviewCount,
          reviewRating,
          ratingDistribution
        };
        
        return res.status(200).json({
          success: true,
          data: updatedReviewWithStats
        });
      }
      
      return res.status(200).json({
        success: true,
        data: updatedReview
      });
    } catch (error) {
      console.error('Error updating review:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // DELETE: Delete a review
  else if (req.method === 'DELETE') {
    // Check authentication
    if (!session) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    try {
      const { reviewId } = req.body;
      
      if (!reviewId) {
        return res.status(400).json({ success: false, message: 'Review ID is required' });
      }
      
      // Find the review
      const review = await Review.findById(reviewId);
      
      if (!review) {
        return res.status(404).json({ success: false, message: 'Review not found' });
      }
      
      // Check if the user is the author of the review or an admin
      if (review.author.toString() !== session.user.id && session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
      }
      
      // Store TVFilm ID for later update
      const tvfilmId = review.tvfilm;
      
      // Delete the review
      await Review.findByIdAndDelete(reviewId);
      
      // Update TVFilm with new review stats
      const allReviews = await Review.find({ tvfilm: tvfilmId, approved: true });
      const reviewCount = allReviews.length;
      let reviewRating = 0;
      let ratingDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      
      if (reviewCount > 0) {
        // Calculate average rating
        const ratingSum = allReviews.reduce((acc, rev) => acc + rev.rating, 0);
        reviewRating = parseFloat((ratingSum / reviewCount).toFixed(1));
        
        // Update rating distribution
        allReviews.forEach(rev => {
          const index = Math.min(Math.max(Math.floor(rev.rating) - 1, 0), 9);
          ratingDistribution[index]++;
        });
      }
      
      await TVFilm.findByIdAndUpdate(tvfilmId, {
        reviewCount,
        reviewRating,
        ratingDistribution
      });
      
      return res.status(200).json({
        success: true,
        message: 'Review deleted successfully',
        tvfilmStats: {
          reviewCount,
          reviewRating,
          ratingDistribution
        }
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
  
  // Method not allowed
  else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
  }
} 