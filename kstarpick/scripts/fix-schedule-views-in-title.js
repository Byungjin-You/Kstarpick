/**
 * Fix Schedule Views Bug
 *
 * 기존 schedules 컬렉션에서 title/albumName 등에 "1,353Views" 같은
 * 조회수 텍스트가 포함된 데이터를 정리.
 *
 * Usage:
 *   node scripts/fix-schedule-views-in-title.js          # dry-run (변경 없음)
 *   node scripts/fix-schedule-views-in-title.js --apply  # 실제 업데이트
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

let envPath = path.resolve(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) envPath = path.resolve(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const APPLY = process.argv.includes('--apply');
const VIEWS_RE = /\s*\d[\d,]*\s*Views/gi;

function clean(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(VIEWS_RE, '').trim();
}

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'kstarpick');
  const col = db.collection('schedules');

  const dirty = await col.find({
    $or: [
      { title: /\d[\d,]*\s*Views/i },
      { albumName: /\d[\d,]*\s*Views/i },
      { description: /\d[\d,]*\s*Views/i },
      { titleSong: /\d[\d,]*\s*Views/i },
    ],
  }).toArray();

  console.log(`발견: ${dirty.length}건`);
  if (dirty.length === 0) { await client.close(); return; }

  let fixed = 0, deleted = 0;
  const seen = new Map(); // sourceId → 첫 문서

  for (const doc of dirty) {
    const newTitle = clean(doc.title);
    const newAlbum = clean(doc.albumName);
    const newDesc = clean(doc.description);
    const newTitleSong = clean(doc.titleSong);

    console.log(`  [${doc._id}] sourceId: ${doc.sourceId}`);
    console.log(`    title: "${doc.title}" → "${newTitle}"`);
    if (doc.albumName !== newAlbum) console.log(`    albumName: "${doc.albumName}" → "${newAlbum}"`);

    if (APPLY) {
      // 동일 sourceId의 더 깨끗한 문서가 이미 있으면 이 문서 삭제
      const existing = await col.findOne({
        sourceId: doc.sourceId,
        _id: { $ne: doc._id },
        title: { $not: /\d[\d,]*\s*Views/i },
      });

      if (existing) {
        await col.deleteOne({ _id: doc._id });
        deleted++;
        console.log(`    → 동일 sourceId 깨끗한 문서 존재, 삭제`);
      } else {
        await col.updateOne(
          { _id: doc._id },
          { $set: { title: newTitle, albumName: newAlbum, description: newDesc, titleSong: newTitleSong } }
        );
        fixed++;
      }
    }
  }

  console.log(`\n${APPLY ? '✅ 적용 완료' : '⚠️  dry-run'}: 수정 ${fixed}건, 삭제 ${deleted}건`);
  if (!APPLY) console.log('실제 적용: --apply 플래그 추가');

  await client.close();
})();
