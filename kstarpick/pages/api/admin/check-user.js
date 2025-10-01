import { connectToDatabase } from '../../../utils/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email parameter is required'
    });
  }

  try {
    console.log('[CHECK USER API] Starting database connection...');
    const { db } = await connectToDatabase();
    console.log('[CHECK USER API] Database connection successful');
    
    // 사용자 찾기
    console.log('[CHECK USER API] Looking for user:', email);
    const user = await db.collection('users').findOne({ email });
    
    if (user) {
      console.log('[CHECK USER API] User found:', {
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      });
      
      return res.status(200).json({
        success: true,
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isAdmin: user.role === 'admin',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } else {
      console.log('[CHECK USER API] User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
  } catch (error) {
    console.error('[CHECK USER API] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
