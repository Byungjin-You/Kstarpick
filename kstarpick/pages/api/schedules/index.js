import { dbConnect } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
  return res.status(405).json({ error: 'Method Not Allowed' });
}

async function handleGet(req, res) {
  try {
    const { db } = await dbConnect();
    const { page = 1, limit = 50, type, source, month, artist, status, search, upcoming } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 2000);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (type) filter.type = type;
    if (source) filter.source = source;
    if (status) filter.status = status;
    else filter.status = { $ne: 'hidden' };
    if (artist) filter.artistName = { $regex: artist, $options: 'i' };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artistName: { $regex: search, $options: 'i' } },
        { albumName: { $regex: search, $options: 'i' } }
      ];
    }

    // Upcoming: 오늘(KST) 00:00부터 앞으로의 일정 (dates 배열도 포함)
    if (upcoming === 'true') {
      const now = new Date();
      const kstToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), -9));
      const kstTodayStr = kstToday.toISOString();
      filter.$or = [
        ...(filter.$or || []),
        { startDate: { $gte: kstToday } },
        { dates: { $elemMatch: { $gte: kstTodayStr } } }
      ];
    } else if (month) {
      // Month filter: YYYY-MM (KST 기준), dates 배열도 포함
      const [y, m] = month.split('-').map(Number);
      const kstStart = new Date(Date.UTC(y, m - 1, 1, -9));
      const kstEnd = new Date(Date.UTC(y, m, 1, -9));
      const kstStartStr = kstStart.toISOString();
      const kstEndStr = kstEnd.toISOString();
      filter.$or = [
        ...(filter.$or || []),
        { startDate: { $gte: kstStart, $lt: kstEnd } },
        { dates: { $elemMatch: { $gte: kstStartStr, $lt: kstEndStr } } }
      ];
    }

    const [schedules, totalItems] = await Promise.all([
      db.collection('schedules').find(filter).sort({ startDate: 1 }).skip(skip).limit(limitNum).toArray(),
      db.collection('schedules').countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      schedules,
      currentPage: pageNum,
      totalPages: Math.ceil(totalItems / limitNum),
      totalItems
    });
  } catch(e) {
    console.error('[Schedules API] GET error:', e);
    return res.status(500).json({ error: e.message });
  }
}

async function handlePost(req, res) {
  try {
    const { db } = await dbConnect();
    const { title, artistName, type, startDate, albumName, description, imageUrl, status } = req.body;

    if (!title || !artistName || !startDate || !type) {
      return res.status(400).json({ error: 'title, artistName, startDate, type are required' });
    }

    const now = new Date();
    const doc = {
      sourceId: `manual-${Date.now()}`,
      source: 'manual',
      title,
      artistName,
      albumName: albumName || '',
      type,
      startDate: new Date(startDate),
      description: description || '',
      imageUrl: imageUrl || '',
      status: status || 'active',
      isVerified: true,
      featured: false,
      rawData: null,
      createdAt: now,
      updatedAt: now,
      crawledAt: now
    };

    const result = await db.collection('schedules').insertOne(doc);
    return res.status(201).json({ success: true, id: result.insertedId });
  } catch(e) {
    console.error('[Schedules API] POST error:', e);
    return res.status(500).json({ error: e.message });
  }
}
