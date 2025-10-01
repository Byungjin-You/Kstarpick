import { connectToDatabase } from '../../../utils/mongodb';

export default async function handler(req, res) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  try {
    const { db } = await connectToDatabase();
    
    // Get all dramas from the collection
    const dramas = await db.collection('dramas').find({}).toArray();
    
    // Extract all genres and flatten the array (since genres are stored as arrays)
    const allGenres = dramas.reduce((acc, drama) => {
      if (drama.genres && Array.isArray(drama.genres)) {
        return [...acc, ...drama.genres];
      }
      return acc;
    }, []);
    
    // Get unique genres
    const uniqueGenres = [...new Set(allGenres)];
    
    // Sort genres alphabetically
    uniqueGenres.sort();
    
    return res.status(200).json({
      success: true,
      data: uniqueGenres
    });
    
  } catch (error) {
    console.error('Get genres error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong'
    });
  }
} 