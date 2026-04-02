import { dbConnect } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });

  const { db } = await dbConnect();

  if (req.method === 'GET') {
    const schedule = await db.collection('schedules').findOne({ _id: new ObjectId(id) });
    if (!schedule) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json({ success: true, schedule });
  }

  if (req.method === 'PUT') {
    const updates = { ...req.body, updatedAt: new Date() };
    delete updates._id;
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    await db.collection('schedules').updateOne({ _id: new ObjectId(id) }, { $set: updates });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    await db.collection('schedules').deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
