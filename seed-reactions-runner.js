/**
 * Seed Reactions Cron Script
 *
 * - _seeded 플래그로 seed 여부 관리 (유저 리액션과 무관하게 판별)
 * - $inc로 기존 유저 리액션에 더하기 (유저 데이터 보존)
 * - 톤 분석 기반 자연스러운 리액션 분배
 *
 * 크론: 매 6시간마다 실행 (새 기사 크롤링 주기에 맞춤)
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, 'kstarpick', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'kstarpick';
  const client = new MongoClient(uri);
  await client.connect();
  return { db: client.db(dbName), client };
}

// ─── 톤 분류 키워드 ───
const TONE_KEYWORDS = {
  celebration: {
    keywords: ['win', 'award', 'debut', 'comeback', 'release', 'chart', 'record', 'milestone', 'congratulat', 'achieve', 'top', 'sells', 'surpass', 'million', 'billion', 'hit', 'success', 'first win', '1st win', 'grand prize', 'daesang', 'triple crown', 'all-kill', 'sweeps'],
    distribution: { like: 0.30, congratulations: 0.50, surprised: 0.15, sad: 0.05 }
  },
  excitement: {
    keywords: ['watch', 'trailer', 'teaser', 'mv', 'music video', 'preview', 'highlight', 'performance', 'stage', 'concert', 'tour', 'confirmed', 'announce', 'upcoming', 'new drama', 'new movie', 'cast', 'poster', 'first look'],
    distribution: { like: 0.50, congratulations: 0.15, surprised: 0.30, sad: 0.05 }
  },
  sad: {
    keywords: ['death', 'die', 'pass away', 'funeral', 'mourn', 'tragedy', 'accident', 'injury', 'hurt', 'hospital', 'scandal', 'controversy', 'arrest', 'suicide', 'cancel', 'disband', 'leave', 'departure', 'farewell', 'military', 'enlist', 'hiatus', 'break up', 'divorce'],
    distribution: { like: 0.20, congratulations: 0.02, surprised: 0.18, sad: 0.60 }
  },
  surprise: {
    keywords: ['reveal', 'secret', 'shock', 'unexpected', 'surprise', 'twist', 'dating', 'relationship', 'marriage', 'pregnant', 'baby', 'real name', 'past', 'truth', 'confess', 'rumor', 'spotted', 'dispatch'],
    distribution: { like: 0.25, congratulations: 0.10, surprised: 0.55, sad: 0.10 }
  },
  heartwarming: {
    keywords: ['love', 'sweet', 'cute', 'adorable', 'chemistry', 'romantic', 'couple', 'friendship', 'bond', 'reunion', 'support', 'fan', 'letter', 'message', 'gift', 'birthday', 'celebrate', 'together', 'family', 'smile', 'happy'],
    distribution: { like: 0.55, congratulations: 0.25, surprised: 0.15, sad: 0.05 }
  }
};
const DEFAULT_DISTRIBUTION = { like: 0.45, congratulations: 0.20, surprised: 0.25, sad: 0.10 };

function analyzeTone(title) {
  const lowerTitle = title.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  for (const [tone, config] of Object.entries(TONE_KEYWORDS)) {
    const matchCount = config.keywords.filter(kw => lowerTitle.includes(kw)).length;
    if (matchCount > bestScore) { bestScore = matchCount; bestMatch = tone; }
  }
  return bestMatch
    ? { tone: bestMatch, distribution: TONE_KEYWORDS[bestMatch].distribution }
    : { tone: 'default', distribution: DEFAULT_DISTRIBUTION };
}

function generateReactions(total, dist) {
  const reactions = {};
  let remaining = total;
  const keys = Object.keys(dist);
  for (let i = 0; i < keys.length; i++) {
    if (i === keys.length - 1) {
      reactions[keys[i]] = Math.max(1, remaining);
    } else {
      const ratio = dist[keys[i]] * (0.85 + Math.random() * 0.30);
      const value = Math.round(total * ratio);
      reactions[keys[i]] = Math.max(1, value);
      remaining -= reactions[keys[i]];
    }
  }
  return reactions;
}

// ─── 메인 실행 ───
(async () => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Seed reactions cron started`);

  let client;
  try {
    const conn = await connectToDatabase();
    const db = conn.db;
    client = conn.client;

    // _seeded 플래그가 없는 기사만 대상 (유저 리액션 유무와 무관)
    const articles = await db.collection('news').find({
      _seeded: { $ne: true }
    }).project({ title: 1, category: 1, reactions: 1 }).toArray();

    if (articles.length === 0) {
      console.log('No unseeded articles found. Done.');
      await client.close();
      process.exit(0);
    }

    console.log(`Found ${articles.length} unseeded articles`);

    const bulkOps = [];
    const toneStats = {};

    for (const article of articles) {
      const { tone, distribution } = analyzeTone(article.title);
      const total = 150 + Math.floor(Math.random() * 350);
      const seedReactions = generateReactions(total, distribution);
      toneStats[tone] = (toneStats[tone] || 0) + 1;

      // $inc로 기존 유저 리액션에 더하기 + _seeded 플래그 설정
      bulkOps.push({
        updateOne: {
          filter: { _id: article._id },
          update: {
            $inc: {
              'reactions.like': seedReactions.like,
              'reactions.congratulations': seedReactions.congratulations,
              'reactions.surprised': seedReactions.surprised,
              'reactions.sad': seedReactions.sad
            },
            $set: { _seeded: true }
          }
        }
      });
    }

    // 500개씩 배치 실행
    const batchSize = 500;
    let modified = 0;
    for (let i = 0; i < bulkOps.length; i += batchSize) {
      const batch = bulkOps.slice(i, i + batchSize);
      const result = await db.collection('news').bulkWrite(batch);
      modified += result.modifiedCount;
    }

    console.log(`Seeded ${modified} articles. Tone: ${JSON.stringify(toneStats)}`);

    // 샘플 확인 (최근 seed된 기사 3개)
    const sample = await db.collection('news').find({ _seeded: true })
      .sort({ createdAt: -1 }).limit(3)
      .project({ title: 1, reactions: 1 }).toArray();
    for (const s of sample) {
      const r = s.reactions;
      const t = (r.like || 0) + (r.congratulations || 0) + (r.surprised || 0) + (r.sad || 0);
      console.log(`  [${t}] ${s.title.substring(0, 55)}`);
    }

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed reactions error:', err);
    if (client) await client.close();
    process.exit(1);
  }
})();
