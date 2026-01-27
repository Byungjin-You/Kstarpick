import { connectToDatabase } from '../../../utils/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// 배율 설정을 변경할 수 있는 관리자 이메일
const SUPER_ADMIN_EMAIL = 'y@fsn.co.kr';

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    // 로그인 체크
    if (!session || session.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      // 배율 설정 조회 (모든 관리자 가능)
      const settings = await db.collection('adminSettings').findOne({ key: 'dataMultiplier' });

      return res.status(200).json({
        success: true,
        multiplier: settings?.value || 1,
        updatedAt: settings?.updatedAt || null,
        updatedBy: settings?.updatedBy || null
      });
    }

    if (req.method === 'POST') {
      // 배율 설정 변경 (SUPER_ADMIN_EMAIL만 가능)
      if (session.user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({
          success: false,
          message: '배율 설정은 지정된 관리자만 변경할 수 있습니다.'
        });
      }

      const { multiplier } = req.body;

      if (typeof multiplier !== 'number' || multiplier < 1 || multiplier > 1000) {
        return res.status(400).json({
          success: false,
          message: '배율 값은 1~1000 사이의 숫자여야 합니다.'
        });
      }

      await db.collection('adminSettings').updateOne(
        { key: 'dataMultiplier' },
        {
          $set: {
            key: 'dataMultiplier',
            value: multiplier,
            updatedAt: new Date(),
            updatedBy: session.user.email
          }
        },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        multiplier: multiplier,
        message: '배율 설정이 저장되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('[ADMIN SETTINGS API] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}
