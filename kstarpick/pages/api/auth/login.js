import { connectToDatabase } from '../../../utils/mongodb';
import bcrypt from 'bcryptjs';
import { createToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    console.log('[LOGIN API] Starting database connection...');
    const { db } = await connectToDatabase();
    console.log('[LOGIN API] Database connection successful');
    
    // Find user by email
    console.log('[LOGIN API] Looking for user:', email);
    const user = await db.collection('users').findOne({ email });
    console.log('[LOGIN API] User search result:', user ? 'found' : 'not found');
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('User is not admin:', email);
      return res.status(403).json({
        success: false,
        message: 'You do not have admin privileges'
      });
    }
    
    // Create and return JWT token
    console.log('[LOGIN API] Creating token for user:', email);
    const tokenPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.role === 'admin'
    };
    console.log('[LOGIN API] Token payload:', tokenPayload);
    
    const token = createToken(tokenPayload);
    console.log('[LOGIN API] Token created successfully');
    
    console.log('Login successful for admin user:', email);
    
    return res.status(200).json({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
} 