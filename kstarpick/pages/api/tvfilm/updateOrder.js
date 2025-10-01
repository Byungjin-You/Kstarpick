import dbConnect from '../../../lib/dbConnect';
import TVFilm from '../../../models/TVFilm';
import { getSession } from 'next-auth/react';
import { validateToken } from '../../../lib/token';

export default async function handler(req, res) {
  const { method } = req;
  
  // Only allow POST requests
  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
  }
  
  // Connect to database
  await dbConnect();
  
  try {
    // 관리자 권한 확인
    const user = await validateToken(req);
    const session = await getSession({ req });
    
    if ((!user || user.role !== 'admin') && (!session || session.user.role !== 'admin')) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Admin access required' });
    }
    
    // Request body should contain an array of objects with id and order
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid request format. Expected array of items with id and order.' });
    }
    
    // Update each item's order in the database
    const updatePromises = items.map(async (item) => {
      if (!item.id) {
        throw new Error('Missing id in item');
      }
      
      const updateData = {
        featured: item.featured === true, // 추천 콘텐츠 여부
        orderNumber: item.order || 0 // 표시 순서
      };
      
      // 업데이트 타임스탬프 추가
      updateData.updatedAt = new Date();
      
      const result = await TVFilm.findByIdAndUpdate(
        item.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      if (!result) {
        throw new Error(`Item with id ${item.id} not found`);
      }
      
      return result;
    });
    
    try {
      await Promise.all(updatePromises);
      return res.status(200).json({ success: true, message: 'Order updated successfully' });
    } catch (error) {
      console.error('Error updating order:', error);
      return res.status(404).json({ success: false, message: error.message });
    }
    
  } catch (error) {
    console.error('Error in updateOrder API:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
} 