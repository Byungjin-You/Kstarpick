import { connectToDatabase } from '../../../utils/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const SUPER_ADMIN_EMAIL = 'y@fsn.co.kr';

const DEFAULT_SCALING_PARAMS = {
  noiseRange: 8,
  spikeChance: 15,
  spikeMin: 30,
  spikeMax: 80,
  decayDays: 3,
  decayFactor: 0.4,
};

function sanitizeScalingParams(input) {
  const out = { ...DEFAULT_SCALING_PARAMS };
  if (!input || typeof input !== 'object') return out;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v)));
  if (input.noiseRange != null) out.noiseRange = clamp(input.noiseRange, 0, 50);
  if (input.spikeChance != null) out.spikeChance = clamp(input.spikeChance, 0, 100);
  if (input.spikeMin != null) out.spikeMin = clamp(input.spikeMin, 0, 500);
  if (input.spikeMax != null) out.spikeMax = clamp(input.spikeMax, 0, 500);
  if (input.decayDays != null) out.decayDays = clamp(input.decayDays, 0, 14);
  if (input.decayFactor != null) out.decayFactor = clamp(input.decayFactor, 0, 1);
  if (out.spikeMin > out.spikeMax) out.spikeMin = out.spikeMax;
  return out;
}

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const [multiplierDoc, paramsDoc] = await Promise.all([
        db.collection('adminSettings').findOne({ key: 'dataMultiplier' }),
        db.collection('adminSettings').findOne({ key: 'scalingParams' }),
      ]);

      return res.status(200).json({
        success: true,
        multiplier: multiplierDoc?.value || 1,
        scalingParams: { ...DEFAULT_SCALING_PARAMS, ...(paramsDoc?.value || {}) },
        updatedAt: multiplierDoc?.updatedAt || null,
        updatedBy: multiplierDoc?.updatedBy || null,
      });
    }

    if (req.method === 'POST') {
      if (session.user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({
          success: false,
          message: '배율 설정은 지정된 관리자만 변경할 수 있습니다.'
        });
      }

      const { multiplier, scalingParams } = req.body;
      const ops = [];

      if (multiplier !== undefined) {
        if (typeof multiplier !== 'number' || multiplier < 1 || multiplier > 1000) {
          return res.status(400).json({
            success: false,
            message: '배율 값은 1~1000 사이의 숫자여야 합니다.'
          });
        }
        ops.push(
          db.collection('adminSettings').updateOne(
            { key: 'dataMultiplier' },
            {
              $set: {
                key: 'dataMultiplier',
                value: multiplier,
                updatedAt: new Date(),
                updatedBy: session.user.email,
              },
            },
            { upsert: true }
          )
        );
      }

      let savedParams = null;
      if (scalingParams !== undefined) {
        savedParams = sanitizeScalingParams(scalingParams);
        ops.push(
          db.collection('adminSettings').updateOne(
            { key: 'scalingParams' },
            {
              $set: {
                key: 'scalingParams',
                value: savedParams,
                updatedAt: new Date(),
                updatedBy: session.user.email,
              },
            },
            { upsert: true }
          )
        );
      }

      if (ops.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'multiplier 또는 scalingParams 중 하나는 필수입니다.'
        });
      }

      await Promise.all(ops);

      return res.status(200).json({
        success: true,
        multiplier: multiplier !== undefined ? multiplier : undefined,
        scalingParams: savedParams || undefined,
        message: '설정이 저장되었습니다.'
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
