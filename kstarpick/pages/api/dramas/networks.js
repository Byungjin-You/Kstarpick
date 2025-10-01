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
    
    // Get distinct network values from dramas collection
    const networks = await db.collection('dramas').distinct('network');
    
    // Sort networks alphabetically
    networks.sort();
    
    return res.status(200).json({
      success: true,
      data: networks
    });
    
  } catch (error) {
    console.error('Get networks error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong'
    });
  }
} 