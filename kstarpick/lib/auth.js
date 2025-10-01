const jwt = require('jsonwebtoken');
const { connectToDatabase } = require('../utils/mongodb');
const { ObjectId } = require('mongodb');
const { parse } = require('cookie');
const dbConnect = require('./dbConnect');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

async function verifyToken(req) {
  // Extract token from request (Authorization header or cookies)
  let token = null;
  
  // Try to get token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Token from Authorization header:', token ? `${token.substring(0, 10)}...` : 'None');
  }
  
  // If no token from header, try cookies
  if (!token && req.headers.cookie) {
    const cookies = parse(req.headers.cookie);
    token = cookies.token;
    console.log('Token from cookies:', token ? `${token.substring(0, 10)}...` : 'None');
  }
  
  if (!token) {
    console.log('No token found in request');
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token decoded:', decoded);
    
    // Try mongoose model first
    try {
      await dbConnect();
      const user = await User.findById(decoded.id);
      
      if (user) {
        return {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.role === 'admin',
          role: user.role
        };
      }
    } catch (mongooseError) {
      console.error('Error finding user with mongoose:', mongooseError);
    }
    
    // Fallback to MongoDB native client
    try {
      const { db } = await connectToDatabase();
      const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.id) });
      
      if (user) {
        return {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.role === 'admin',
          role: user.role
        };
      }
    } catch (mongodbError) {
      console.error('Error finding user with MongoDB native client:', mongodbError);
    }
    
    console.log('User not found with ID:', decoded.id);
    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// Check if the user is an admin
async function isAdmin(req) {
  try {
    // NextAuth의 getServerSession은 API 라우트에서만 호출 가능하므로 시도하지 않음
    // 대신 JWT 토큰을 직접 확인하는 방식으로 변경
    
    // JWT 검증으로 사용자 정보 가져오기
    const user = await verifyToken(req);
    
    // 관리자 권한 확인
    return user && (user.isAdmin === true || user.role === 'admin');
  } catch (error) {
    console.error('isAdmin check error:', error);
    return false;
  }
} 
module.exports = {
  createToken,
  verifyToken,
  isAdmin
};
