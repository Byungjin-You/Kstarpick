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
    
    // Get distinct status values from dramas collection
    const statusOptions = await db.collection('dramas').distinct('status');
    
    // Sort status options
    statusOptions.sort();
    
    return res.status(200).json({
      success: true,
      data: statusOptions
    });
    
  } catch (error) {
    console.error('Get status options error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong'
    });
  }
} 