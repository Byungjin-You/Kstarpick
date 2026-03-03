const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'kstarpick');

  // 모든 기존 기사에 _seeded 플래그 추가
  const result = await db.collection('news').updateMany(
    { _seeded: { $ne: true } },
    { $set: { _seeded: true } }
  );
  console.log('Marked ' + result.modifiedCount + ' articles as _seeded');

  // 확인
  const total = await db.collection('news').countDocuments({});
  const seeded = await db.collection('news').countDocuments({ _seeded: true });
  const unseeded = await db.collection('news').countDocuments({ _seeded: { $ne: true } });
  console.log('Total: ' + total + ', Seeded: ' + seeded + ', Unseeded: ' + unseeded);

  await client.close();
  process.exit(0);
})();
