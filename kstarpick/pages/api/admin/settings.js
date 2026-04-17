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

// 파라미터 최초 도입 전 과거 날짜까지 커버하는 초기 effectiveFrom
const EPOCH_DATE = '1970-01-01';

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

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// 히스토리 조회 + 레거시 scalingParams를 히스토리로 마이그레이션
async function loadHistory(db) {
  const historyDoc = await db.collection('adminSettings').findOne({ key: 'scalingParamsHistory' });
  if (historyDoc?.value && Array.isArray(historyDoc.value) && historyDoc.value.length > 0) {
    return historyDoc.value;
  }
  // 레거시: scalingParams 단일값을 히스토리의 첫 엔트리로 마이그레이션
  const legacy = await db.collection('adminSettings').findOne({ key: 'scalingParams' });
  const initialParams = legacy?.value ? sanitizeScalingParams(legacy.value) : { ...DEFAULT_SCALING_PARAMS };
  return [{ params: initialParams, effectiveFrom: EPOCH_DATE }];
}

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || session.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const [multiplierDoc, history] = await Promise.all([
        db.collection('adminSettings').findOne({ key: 'dataMultiplier' }),
        loadHistory(db),
      ]);

      return res.status(200).json({
        success: true,
        multiplier: multiplierDoc?.value || 1,
        scalingParams: history[history.length - 1].params, // 최신 파라미터 (UI 표시용)
        scalingParamsHistory: history,
        updatedAt: multiplierDoc?.updatedAt || null,
        updatedBy: multiplierDoc?.updatedBy || null,
      });
    }

    if (req.method === 'POST') {
      if (session.user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({
          success: false,
          message: '설정 변경은 지정된 관리자만 가능합니다.'
        });
      }

      const { multiplier, scalingParams } = req.body;
      const ops = [];
      let savedParams = null;
      let savedHistory = null;

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

      if (scalingParams !== undefined) {
        savedParams = sanitizeScalingParams(scalingParams);
        const history = await loadHistory(db);
        const today = todayStr();
        const last = history[history.length - 1];

        if (last.effectiveFrom === today) {
          // 같은 날 안에서 여러 번 조정 시 오늘자 엔트리를 덮어씀
          history[history.length - 1] = { params: savedParams, effectiveFrom: today };
        } else {
          history.push({ params: savedParams, effectiveFrom: today });
        }

        savedHistory = history;
        ops.push(
          db.collection('adminSettings').updateOne(
            { key: 'scalingParamsHistory' },
            {
              $set: {
                key: 'scalingParamsHistory',
                value: history,
                updatedAt: new Date(),
                updatedBy: session.user.email,
              },
            },
            { upsert: true }
          ),
          // 레거시 호환: 최신 파라미터를 scalingParams에도 보관
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
        scalingParamsHistory: savedHistory || undefined,
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
