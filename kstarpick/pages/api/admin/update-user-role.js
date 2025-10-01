import { connectToDatabase } from '../../../utils/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, role, adminKey } = req.body;

  // 관리자 키 확인 (보안을 위해)
  const expectedAdminKey = process.env.ADMIN_KEY || 'kstarpick_admin_key_2024';
  if (adminKey !== expectedAdminKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid admin key'
    });
  }

  if (!email || !role) {
    return res.status(400).json({
      success: false,
      message: 'Email and role are required'
    });
  }

  try {
    console.log('[UPDATE USER ROLE API] Starting database connection...');
    const { db } = await connectToDatabase();
    console.log('[UPDATE USER ROLE API] Database connection successful');
    
    // 사용자 찾기
    console.log('[UPDATE USER ROLE API] Looking for user:', email);
    const existingUser = await db.collection('users').findOne({ email });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[UPDATE USER ROLE API] User found, current role:', existingUser.role);
    
    // 이미 해당 역할이면 스킵
    if (existingUser.role === role) {
      return res.status(200).json({
        success: true,
        message: `User already has ${role} role`,
        user: {
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }
    
    // 역할 업데이트
    const updateResult = await db.collection('users').updateOne(
      { email },
      { 
        $set: { 
          role,
          updatedAt: new Date()
        } 
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('[UPDATE USER ROLE API] User role updated successfully');
      return res.status(200).json({
        success: true,
        message: `User role updated to ${role}`,
        user: {
          name: existingUser.name,
          email: existingUser.email,
          role: role
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to update user role'
      });
    }
    
  } catch (error) {
    console.error('[UPDATE USER ROLE API] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
