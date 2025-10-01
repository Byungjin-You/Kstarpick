import nc from 'next-connect';
import { connectToDatabase } from '../../../utils/mongodb';
// import Character from '../../../models/Character';
// import { onError } from '../../../utils/middleware';

const handler = nc();

handler.get(async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    
    const { 
      q, // search term
      page = 1, 
      limit = 10,
      drama,
      actor,
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
        { name: searchRegex },
        { description: searchRegex },
        { slug: searchRegex }
      ];
    }
    
    // Drama filter
    if (drama) {
      // Allow comma-separated drama ids
      const dramaIds = drama.split(',').map(d => d.trim());
      if (dramaIds.length === 1) {
        query.drama = drama;
      } else {
        query.drama = { $in: dramaIds };
      }
    }
    
    // Actor filter
    if (actor) {
      // Allow comma-separated actor ids
      const actorIds = actor.split(',').map(a => a.trim());
      if (actorIds.length === 1) {
        query.actor = actor;
      } else {
        query.actor = { $in: actorIds };
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
    const validSortFields = ['name', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    const sortOptions = {};
    sortOptions[sortField] = sortOrder;
    
    console.log('Search query:', JSON.stringify(query));
    console.log('Sort options:', JSON.stringify(sortOptions));
    
    // Execute query with pagination using direct DB access
    const charactersCollection = db.collection('characters');
    const characters = await charactersCollection
      .find(query, { projection })
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNumber)
      .toArray();
    
    // Get total count for pagination
    const total = await charactersCollection.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      data: {
        characters,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(total / limitNumber)
        },
        query: {
          searchTerm: q || null,
          drama: drama || null,
          actor: actor || null,
          sort: sortField,
          order: order
        }
      }
    });
  } catch (error) {
    console.error('Character Search API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during search',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default handler; 