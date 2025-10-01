import { connectToDatabase } from '../../../utils/mongodb';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
  // IMPORTANT: Add proper authentication/authorization checks here
  // For example, check if the user is an admin
  const session = await getSession({ req });
  if (!session || !session.user || session.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '접근 권한이 없습니다. 관리자만 실행할 수 있습니다.' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed. Use POST.` });
  }

  try {
    const { db } = await connectToDatabase();
    const dramasCollection = db.collection('dramas');

    console.log('Attempting to update dramas collection...');

    // 첫 번째 업데이트: contentType 필드가 없는 문서 업데이트
    const result1 = await dramasCollection.updateMany(
      { contentType: { $exists: false } },
      { $set: { contentType: 'drama' } }
    );

    // 두 번째 업데이트: contentType이 null이거나 빈 문자열인 문서 업데이트
    const result2 = await dramasCollection.updateMany(
      { $or: [{ contentType: null }, { contentType: '' }] },
      { $set: { contentType: 'drama' } }
    );

    // 결과 통합
    const totalMatched = result1.matchedCount + result2.matchedCount;
    const totalModified = result1.modifiedCount + result2.modifiedCount;

    console.log('Update results:', {
      contentTypeNotExists: result1,
      contentTypeNullOrEmpty: result2,
      totalMatched,
      totalModified
    });

    return res.status(200).json({
      success: true,
      message: `Drama contentType update complete. Matched: ${totalMatched}, Modified: ${totalModified}`,
      data: {
        contentTypeNotExists: {
          matchedCount: result1.matchedCount,
          modifiedCount: result1.modifiedCount
        },
        contentTypeNullOrEmpty: {
          matchedCount: result2.matchedCount,
          modifiedCount: result2.modifiedCount
        },
        totalMatched,
        totalModified
      }
    });
  } catch (error) {
    console.error('Error during drama migration:', error);
    return res.status(500).json({
      success: false,
      message: '데이터 마이그레이션 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
} 