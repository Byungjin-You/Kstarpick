import nc from 'next-connect';
import dbConnect from '../../../lib/dbConnect';
import TVFilm from '../../../models/TVFilm';
// import { onError } from '../../../utils/middleware';
import mongoose from 'mongoose';

const handler = nc();

handler.get(async (req, res) => {
  try {
    await dbConnect();
    
    const { 
      q, // search term
      page = 1, 
      limit = 10,
      category,
      genre,
      status,
      sort = 'createdAt',
      order = 'desc',
      fields
    } = req.query;
    
    // Validate page and limit
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    
    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ success: false, message: 'Invalid page number' });
    }
    
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
      return res.status(400).json({ success: false, message: 'Invalid limit (must be between 1 and 50)' });
    }
    
    // Build query
    const query = {};
    
    // Search term query (improved to search in multiple fields)
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      query.$or = [
        { title: searchRegex },
        { alternativeTitle: searchRegex },
        { originalTitle: searchRegex },
        { description: searchRegex },
        { slug: searchRegex }
      ];
    }
    
    // Category filter (TV or Film)
    if (category) {
      query.category = category;
    }
    
    // Genre filter
    if (genre) {
      // Allow comma-separated genres
      const genres = genre.split(',').map(g => g.trim());
      if (genres.length === 1) {
        query.genres = genre;
      } else {
        query.genres = { $in: genres };
      }
    }
    
    // Status filter
    if (status) {
      // Allow comma-separated statuses
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        query.status = status;
      } else {
        query.status = { $in: statuses };
      }
    }
    
    // Determine which fields to return
    let projection = {};
    if (fields) {
      const fieldsList = fields.split(',').map(field => field.trim());
      fieldsList.forEach(field => {
        projection[field] = 1;
      });
    }
    
    // Execute query with pagination
    const skip = (pageNumber - 1) * limitNumber;
    
    // Validate sort field and order
    const validSortFields = ['title', 'createdAt', 'updatedAt', 'releaseDate', 'rating'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    const sortOptions = {};
    sortOptions[sortField] = sortOrder;
    
    console.log('Search query:', JSON.stringify(query));
    console.log('Sort options:', JSON.stringify(sortOptions));
    
    // Execute query with pagination
    const tvfilms = await TVFilm.find(query, projection)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNumber);
    
    // Get total count for pagination
    const total = await TVFilm.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      data: {
        tvfilms,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(total / limitNumber)
        },
        query: {
          searchTerm: q || null,
          category: category || null,
          genre: genre || null,
          status: status || null,
          sort: sortField,
          order: order
        }
      }
    });
  } catch (error) {
    console.error('TVFilm Search API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during search',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default handler; 