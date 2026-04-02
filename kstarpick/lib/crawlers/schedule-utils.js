const cheerio = require('cheerio');

function slugify(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
}

async function upsertSchedule(db, item) {
  const now = new Date();
  const result = await db.collection('schedules').updateOne(
    { sourceId: item.sourceId },
    {
      $set: { ...item, updatedAt: now, crawledAt: now },
      $setOnInsert: { createdAt: now, isVerified: false, featured: false, status: 'active' }
    },
    { upsert: true }
  );
  return result.upsertedCount > 0 ? 'inserted' : 'updated';
}

async function ensureIndexes(db) {
  const col = db.collection('schedules');
  await col.createIndex({ sourceId: 1 }, { unique: true });
  await col.createIndex({ startDate: 1, type: 1 });
  await col.createIndex({ artistName: 1, startDate: 1 });
  await col.createIndex({ source: 1, crawledAt: 1 });
  await col.createIndex({ status: 1, startDate: 1 });
}

module.exports = { slugify, upsertSchedule, ensureIndexes, cheerio };
