import { dbConnect } from '../../../utils/mongodb';
import { ensureIndexes } from '../../../lib/crawlers/schedule-utils';
import { crawlBlip } from '../../../lib/crawlers/schedule-blip';
import { crawlKpopSchedule } from '../../../lib/crawlers/schedule-kpopschedule';
import { crawlKprofiles } from '../../../lib/crawlers/schedule-kprofiles';
import { crawlKpopOfficial } from '../../../lib/crawlers/schedule-kpopofficial';
import { crawlKpopOfficialConcerts } from '../../../lib/crawlers/schedule-kpopofficial-concerts';

export const config = {
  api: { bodyParser: true, responseLimit: false },
  maxDuration: 120
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { db } = await dbConnect();
    await ensureIndexes(db);

    const { sources = ['blip', 'kprofiles', 'kpopofficial'], year, month } = req.body || {};
    const results = {};

    if (sources.includes('blip')) {
      try { results.blip = await crawlBlip(db); }
      catch(e) { results.blip = { error: e.message }; }
    }

    if (sources.includes('kpopschedule')) {
      try { results.kpopschedule = await crawlKpopSchedule(db); }
      catch(e) { results.kpopschedule = { error: e.message }; }
    }

    if (sources.includes('kprofiles')) {
      try { results.kprofiles = await crawlKprofiles(db, year, month); }
      catch(e) { results.kprofiles = { error: e.message }; }
    }

    if (sources.includes('kpopofficial')) {
      try { results.kpopofficial = await crawlKpopOfficial(db); }
      catch(e) { results.kpopofficial = { error: e.message }; }
    }

    if (sources.includes('kpopofficial-concerts')) {
      try { results['kpopofficial-concerts'] = await crawlKpopOfficialConcerts(db); }
      catch(e) { results['kpopofficial-concerts'] = { error: e.message }; }
    }

    const totalCount = await db.collection('schedules').countDocuments();
    return res.status(200).json({ success: true, results, totalCount });
  } catch(e) {
    console.error('[Schedule Crawl] Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
