/**
 * 기존 hash-image 프록시 URL을 로컬 디스크 이미지로 마이그레이션
 *
 * 실행: cd /doohub/service/kstarpick && node scripts/migrate-images-to-disk.js
 *
 * 1. image_hashes 컬렉션에서 모든 해시→URL 매핑을 읽음
 * 2. 각 이미지를 다운로드하여 public/images/news/{hash}.{ext}로 저장
 * 3. News 문서의 coverImage, thumbnailUrl, content 내 프록시 URL을 로컬 경로로 업데이트
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';
const IMAGE_DIR = path.join(__dirname, '..', 'public', 'images', 'news');
const CONCURRENT = 5; // 동시 다운로드 수
const DELAY_MS = 200; // 요청 간 딜레이

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

function findExistingFile(hash) {
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  for (const ext of exts) {
    if (fs.existsSync(path.join(IMAGE_DIR, `${hash}${ext}`))) {
      return `/images/news/${hash}${ext}`;
    }
  }
  return null;
}

async function downloadImage(url, hash) {
  // 이미 디스크에 있으면 스킵
  const existing = findExistingFile(hash);
  if (existing) return existing;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.soompi.com/',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return null;

    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 10 * 1024 * 1024) return null;

    const filePath = path.join(IMAGE_DIR, `${hash}${ext}`);
    fs.writeFileSync(filePath, buffer);

    return `/images/news/${hash}${ext}`;
  } catch (e) {
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== 이미지 디스크 마이그레이션 시작 ===');

  const client = new MongoClient(MONGODB_URI, {
    retryWrites: false,
    authSource: 'admin',
    authMechanism: 'SCRAM-SHA-1',
    tls: false,
    serverSelectionTimeoutMS: 10000,
  });

  await client.connect();
  const db = client.db(MONGODB_DB);

  // 1. 모든 해시 매핑 가져오기
  const hashes = await db.collection('image_hashes').find({}).toArray();
  console.log(`총 ${hashes.length}개 이미지 해시 발견`);

  // 2. 이미지 다운로드 (배치 처리)
  const hashToPath = {};
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < hashes.length; i += CONCURRENT) {
    const batch = hashes.slice(i, i + CONCURRENT);
    const results = await Promise.all(
      batch.map(async (h) => {
        const localPath = await downloadImage(h.url, h.hash);
        return { hash: h.hash, localPath };
      })
    );

    for (const r of results) {
      if (r.localPath) {
        hashToPath[r.hash] = r.localPath;
        if (r.localPath === findExistingFile(r.hash)) {
          skipped++;
        } else {
          downloaded++;
        }
      } else {
        failed++;
      }
    }

    const total = downloaded + skipped + failed;
    if (total % 50 === 0 || i + CONCURRENT >= hashes.length) {
      console.log(`진행: ${total}/${hashes.length} (다운로드: ${downloaded}, 스킵: ${skipped}, 실패: ${failed})`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n다운로드 완료: ${downloaded}개 다운, ${skipped}개 스킵, ${failed}개 실패`);

  // 3. News 문서 업데이트
  const newsCollection = db.collection('news');
  const newsDocs = await newsCollection.find({
    $or: [
      { coverImage: { $regex: '/api/proxy/hash-image' } },
      { thumbnailUrl: { $regex: '/api/proxy/hash-image' } },
    ]
  }).toArray();

  console.log(`\n${newsDocs.length}개 뉴스 문서 업데이트 필요`);

  let updated = 0;
  for (const doc of newsDocs) {
    const updates = {};

    if (doc.coverImage && doc.coverImage.includes('/api/proxy/hash-image')) {
      const hash = new URL(doc.coverImage, 'http://localhost').searchParams.get('hash');
      if (hash && hashToPath[hash]) {
        updates.coverImage = hashToPath[hash];
      }
    }

    if (doc.thumbnailUrl && doc.thumbnailUrl.includes('/api/proxy/hash-image')) {
      const hash = new URL(doc.thumbnailUrl, 'http://localhost').searchParams.get('hash');
      if (hash && hashToPath[hash]) {
        updates.thumbnailUrl = hashToPath[hash];
      }
    }

    // content 내 이미지 URL도 교체
    if (doc.content) {
      const langs = ['en', 'ko', 'ja', 'zh', 'es'];
      for (const lang of langs) {
        if (doc.content[lang] && doc.content[lang].includes('/api/proxy/hash-image')) {
          const replaced = doc.content[lang].replace(
            /\/api\/proxy\/hash-image\?hash=([a-f0-9]{16})/g,
            (match, hash) => hashToPath[hash] || match
          );
          if (replaced !== doc.content[lang]) {
            if (!updates.content) updates.content = { ...doc.content };
            updates.content[lang] = replaced;
          }
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await newsCollection.updateOne({ _id: doc._id }, { $set: updates });
      updated++;
    }
  }

  console.log(`${updated}개 뉴스 문서 업데이트 완료`);
  console.log('\n=== 마이그레이션 완료 ===');

  await client.close();
}

main().catch(e => {
  console.error('마이그레이션 실패:', e);
  process.exit(1);
});
