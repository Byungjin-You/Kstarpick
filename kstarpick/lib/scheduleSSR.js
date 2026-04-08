// 서버 전용: 특정 (year, month)의 스케줄을 DB에서 직접 조회
// pages/* 외부에 위치해야 Next.js가 클라이언트 번들에 mongodb를 포함하지 않음
import { dbConnect } from '../utils/mongodb';

export async function fetchSchedulesForMonth(year, month) {
  try {
    const { db } = await dbConnect();
    const kstStart = new Date(Date.UTC(year, month - 1, 1, -9));
    const kstEnd = new Date(Date.UTC(year, month, 1, -9));
    const kstStartStr = kstStart.toISOString();
    const kstEndStr = kstEnd.toISOString();
    const schedules = await db.collection('schedules')
      .find({
        status: { $ne: 'hidden' },
        $or: [
          { startDate: { $gte: kstStart, $lt: kstEnd } },
          { dates: { $elemMatch: { $gte: kstStartStr, $lt: kstEndStr } } }
        ]
      })
      .sort({ startDate: 1 })
      .batchSize(100)
      .limit(2000)
      .toArray();
    return JSON.parse(JSON.stringify(schedules));
  } catch (e) {
    console.error('[Schedule fetch] Error:', e.message);
    return [];
  }
}
