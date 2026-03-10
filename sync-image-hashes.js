const { MongoClient } = require('mongodb');

(async () => {
  const c = await MongoClient.connect('mongodb://localhost:27017/kstarpick');
  const db = c.db();

  // Get all news with coverImage containing hash
  const allNews = await db.collection('news').find(
    { coverImage: { $regex: 'hash-image' } },
    { projection: { coverImage: 1, content: 1, title: 1 } }
  ).toArray();

  console.log('News with hash images:', allNews.length);

  // Try to get original URLs from production API
  console.log('Fetching from production API...');
  const categories = ['drama', 'kpop', 'tvfilm', 'celeb'];
  const prodNews = [];

  for (const cat of categories) {
    try {
      const r = await fetch(`http://43.202.38.79:13001/api/news/${cat}?limit=100`);
      const d = await r.json();
      if (d.success && d.data) prodNews.push(...d.data);
    } catch (e) {
      console.log('Skip category:', cat);
    }
  }

  // Also try general news
  try {
    const r = await fetch('http://43.202.38.79:13001/api/news?limit=200');
    const d = await r.json();
    if (d.success && d.data?.news) prodNews.push(...d.data.news);
  } catch (e) {}

  console.log('Production news fetched:', prodNews.length);

  // Build hash -> original URL map from production content
  let synced = 0;
  const seen = new Set();

  for (const item of prodNews) {
    if (!item.coverImage) continue;
    const hashMatch = item.coverImage.match(/hash=([a-f0-9]+)/);
    if (!hashMatch) continue;
    const hash = hashMatch[1];
    if (seen.has(hash)) continue;
    seen.add(hash);

    // Check if already exists locally
    const exists = await db.collection('image_hashes').findOne({ hash });
    if (exists) continue;

    // Try to find original URL from content
    if (item.content) {
      // Find first img src that's NOT a hash-image proxy
      const imgMatches = item.content.match(/<img[^>]+src=["']([^"']+)["']/g) || [];
      for (const match of imgMatches) {
        const srcMatch = match.match(/src=["']([^"']+)["']/);
        if (srcMatch && !srcMatch[1].includes('hash-image') && !srcMatch[1].includes('proxy')) {
          await db.collection('image_hashes').insertOne({
            hash,
            url: srcMatch[1],
            createdAt: new Date().toISOString()
          });
          console.log('SYNCED:', hash, '->', srcMatch[1].slice(0, 80));
          synced++;
          break;
        }
      }
    }
  }

  // For remaining missing hashes, try to extract from local news content
  for (const item of allNews) {
    const hashMatch = item.coverImage.match(/hash=([a-f0-9]+)/);
    if (!hashMatch) continue;
    const hash = hashMatch[1];

    const exists = await db.collection('image_hashes').findOne({ hash });
    if (exists) continue;

    if (item.content) {
      const imgMatches = item.content.match(/<img[^>]+src=["']([^"']+)["']/g) || [];
      for (const match of imgMatches) {
        const srcMatch = match.match(/src=["']([^"']+)["']/);
        if (srcMatch && !srcMatch[1].includes('hash-image') && !srcMatch[1].includes('proxy')) {
          await db.collection('image_hashes').insertOne({
            hash,
            url: srcMatch[1],
            createdAt: new Date().toISOString()
          });
          console.log('SYNCED (local):', hash, '->', srcMatch[1].slice(0, 80));
          synced++;
          break;
        }
      }
    }
  }

  console.log('\nTotal synced:', synced);

  // Verify drama news
  const dramaNews = await db.collection('news').find({ category: 'drama' }, { projection: { coverImage: 1, title: 1 } }).limit(6).toArray();
  for (const n of dramaNews) {
    const hash = n.coverImage?.match(/hash=([a-f0-9]+)/)?.[1];
    if (hash) {
      const found = await db.collection('image_hashes').findOne({ hash });
      console.log(hash, found ? 'OK' : 'STILL MISSING', '-', n.title?.slice(0, 40));
    }
  }

  c.close();
})();
