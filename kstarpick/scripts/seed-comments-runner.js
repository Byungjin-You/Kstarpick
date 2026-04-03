/**
 * Seed Comments Cron Script
 *
 * - Claude API (Haiku 4.5)로 기사 톤에 맞는 팬 댓글 자동 생성
 * - 리액션 수 기반 댓글 수 결정 (8~15%)
 * - 신규 기사(<24h)는 최대 20~40% 수준으로 제한 (점진적 성장)
 * - _commentSeeded / _commentCount로 상태 관리
 *
 * 크론: 매 3시간마다 실행
 */

const cron = require('node-cron');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load env (로컬: kstarpick/.env.local, 서버: .env.local)
let envPath = path.resolve(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '..', '..', '.env.local');
}
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

// ─── 게스트 이름 생성기 ───
function generateGuestName() {
  const adjectives = [
    'Amazing', 'Brave', 'Bright', 'Cool', 'Dazzling', 'Elegant', 'Fancy',
    'Gentle', 'Happy', 'Jolly', 'Kind', 'Lively', 'Magical', 'Noble',
    'Polite', 'Quirky', 'Radiant', 'Sweet', 'Talented', 'Unique', 'Vibrant',
    'Witty', 'Zealous', 'Adorable', 'Cheerful', 'Dreamy', 'Glowing', 'Royal',
    'Purple', 'Pink', 'Blue', 'Red', 'Green', 'Golden', 'Silver'
  ];
  const nouns = [
    'Fan', 'Star', 'Dreamer', 'Angel', 'Melody', 'Beat', 'Rhythm', 'Soul',
    'Voice', 'Heart', 'Dancer', 'Singer', 'Artist', 'Legend', 'Tiger', 'Lion',
    'Eagle', 'Phoenix', 'Dragon', 'Unicorn', 'Fairy', 'Guardian', 'Knight',
    'Blink', 'Once', 'ARMY', 'MooMoo', 'ReVeluv', 'MIDZY', 'STAY', 'MOA', 'NCTzen'
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

// ─── 톤 분류 ───
const TONE_KEYWORDS = {
  celebration: {
    keywords: ['win', 'award', 'debut', 'comeback', 'release', 'chart', 'record', 'milestone', 'congratulat', 'achieve', 'top', 'sells', 'surpass', 'million', 'billion', 'hit', 'success', 'first win', '1st win', 'grand prize', 'daesang', 'triple crown', 'all-kill', 'sweeps'],
  },
  excitement: {
    keywords: ['watch', 'trailer', 'teaser', 'mv', 'music video', 'preview', 'highlight', 'performance', 'stage', 'concert', 'tour', 'confirmed', 'announce', 'upcoming', 'new drama', 'new movie', 'cast', 'poster', 'first look'],
  },
  sad: {
    keywords: ['death', 'die', 'pass away', 'funeral', 'mourn', 'tragedy', 'accident', 'injury', 'hurt', 'hospital', 'scandal', 'controversy', 'arrest', 'suicide', 'cancel', 'disband', 'leave', 'departure', 'farewell', 'military', 'enlist', 'hiatus', 'break up', 'divorce'],
  },
  surprise: {
    keywords: ['reveal', 'secret', 'shock', 'unexpected', 'surprise', 'twist', 'dating', 'relationship', 'marriage', 'pregnant', 'baby', 'real name', 'past', 'truth', 'confess', 'rumor', 'spotted', 'dispatch'],
  },
  heartwarming: {
    keywords: ['love', 'sweet', 'cute', 'adorable', 'chemistry', 'romantic', 'couple', 'friendship', 'bond', 'reunion', 'support', 'fan', 'letter', 'message', 'gift', 'birthday', 'celebrate', 'together', 'family', 'smile', 'happy'],
  }
};

function analyzeTone(title) {
  const lowerTitle = title.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  for (const [tone, config] of Object.entries(TONE_KEYWORDS)) {
    const matchCount = config.keywords.filter(kw => lowerTitle.includes(kw)).length;
    if (matchCount > bestScore) { bestScore = matchCount; bestMatch = tone; }
  }
  return bestMatch || 'default';
}

// ─── 댓글 수 계산 ───
function calculateTargetCommentCount(article) {
  const r = article.reactions || {};
  const totalReactions = (r.like || 0) + (r.congratulations || 0) +
                         (r.surprised || 0) + (r.sad || 0);

  if (totalReactions < 10) return 0;

  // 리액션의 8~15% 랜덤
  const percentage = 0.08 + (Math.random() * 0.07);
  let target = Math.round(totalReactions * percentage);

  const ageHours = (Date.now() - new Date(article.createdAt).getTime()) / (1000 * 60 * 60);

  // 24시간 이내: 목표의 20~40% 수준으로 제한 (점진 성장)
  if (ageHours < 24) {
    const earlyRatio = 0.2 + (Math.random() * 0.2);
    target = Math.max(1, Math.round(target * earlyRatio));
  }
  // 24~48시간: 목표의 50~70%
  else if (ageHours < 48) {
    const midRatio = 0.5 + (Math.random() * 0.2);
    target = Math.round(target * midRatio);
  }

  // 조회수 매우 낮은 기사: 30% 확률로 0개
  if ((article.viewCount || 0) < 10 && Math.random() < 0.3) {
    return 0;
  }

  return Math.max(0, target);
}

function calculateCommentsToAdd(article) {
  const currentCount = article._commentCount || 0;
  const target = calculateTargetCommentCount(article);

  let toAdd = target - currentCount;
  if (toAdd <= 0) return 0;

  // 1회 추가: 목표의 20~40% 또는 최소 3개
  const maxPerCycle = Math.max(3, Math.round(target * (0.2 + Math.random() * 0.2)));
  return Math.min(toAdd, maxPerCycle);
}

// ─── 타임스탬프 분산 ───
function generateSpreadTimestamps(articleCreatedAt, count) {
  const articleTime = new Date(articleCreatedAt).getTime();
  const now = Date.now();
  const range = now - articleTime;

  const timestamps = [];
  for (let i = 0; i < count; i++) {
    const minOffset = range * 0.3;
    const maxOffset = range * 0.95;
    const offset = minOffset + Math.random() * (maxOffset - minOffset);
    timestamps.push(new Date(articleTime + offset));
  }
  timestamps.sort((a, b) => a.getTime() - b.getTime());
  return timestamps;
}

// ─── Claude API 호출 ───
async function generateComments(articleTitle, tone, count) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('CLAUDE_API_KEY not configured');

  const toneInstructions = {
    celebration: 'Sound congratulatory and excited, celebrating an achievement.',
    excitement: 'Sound hyped and eager, expressing anticipation.',
    sad: 'Be sympathetic and supportive, showing concern or sadness.',
    surprise: 'Express shock, curiosity, or amazement.',
    heartwarming: 'Be warm, affectionate, and loving.',
    default: 'Be positive and engaging.'
  };

  const toneGuide = toneInstructions[tone] || toneInstructions.default;

  const prompt = `Generate exactly ${count} short fan comments for this K-pop/K-drama news article:

Title: "${articleTitle}"

Rules:
- Each comment: 1-2 sentences in English, under 150 characters
- ${toneGuide}
- Sound like real fan reactions (casual, enthusiastic, natural)
- Vary style: some use 1-2 emoji, some don't, some use exclamation marks, some are calm
- Do NOT repeat similar phrases across comments
- Do NOT mention being AI

Return ONLY a JSON array of strings: ["comment 1", "comment 2"]`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API ${response.status}: ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const comments = JSON.parse(jsonMatch[0]);
      return comments.filter(c => typeof c === 'string' && c.trim().length > 0).slice(0, count);
    }
  } catch (e) {
    console.error('  JSON parse error:', e.message);
  }
  return [];
}

// ─── 시드 실행 ───
async function runSeedComments() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] Seed comments started`);

  let client;
  try {
    const conn = await connectToDatabase();
    const db = conn.db;
    client = conn.client;

    // 최근 7일 기준
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1) 아직 댓글 시드 안 된 기사
    const unseeded = await db.collection('news').find({
      _commentSeeded: { $ne: true },
      _seeded: true,
      createdAt: { $gte: sevenDaysAgo }
    }).project({
      title: 1, category: 1, reactions: 1, viewCount: 1, createdAt: 1, _commentCount: 1
    }).toArray();

    // 2) 부분 시드된 기사 (점진적 성장 대상)
    const partial = await db.collection('news').find({
      _commentSeeded: true,
      _commentCount: { $lt: 30 },
      createdAt: { $gte: sevenDaysAgo }
    }).project({
      title: 1, category: 1, reactions: 1, viewCount: 1, createdAt: 1, _commentCount: 1
    }).limit(200).toArray();

    const allArticles = [...unseeded, ...partial];
    console.log(`Found ${unseeded.length} unseeded + ${partial.length} partial = ${allArticles.length} articles`);

    if (allArticles.length === 0) {
      console.log('No articles need comments. Done.');
      await client.close();
      return;
    }

    let totalGenerated = 0;
    let totalApiCalls = 0;
    let articlesProcessed = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 0; i < allArticles.length; i++) {
      const article = allArticles[i];
      const commentsToAdd = calculateCommentsToAdd(article);

      if (commentsToAdd <= 0) {
        if (!article._commentSeeded) {
          await db.collection('news').updateOne(
            { _id: article._id },
            { $set: { _commentSeeded: true, _commentCount: article._commentCount || 0 } }
          );
        }
        skipped++;
        continue;
      }

      try {
        const tone = analyzeTone(article.title);
        const comments = await generateComments(article.title, tone, commentsToAdd);
        totalApiCalls++;

        if (comments.length === 0) {
          console.log(`  [SKIP] Empty response: ${article.title.substring(0, 50)}`);
          continue;
        }

        const timestamps = generateSpreadTimestamps(article.createdAt, comments.length);

        const commentDocs = comments.map((content, idx) => ({
          content: content.trim(),
          contentId: article._id,
          contentType: 'news',
          guestName: generateGuestName(),
          isGuest: true,
          createdAt: timestamps[idx],
          _seeded: true
        }));

        await db.collection('comments').insertMany(commentDocs);

        const newCount = (article._commentCount || 0) + comments.length;
        await db.collection('news').updateOne(
          { _id: article._id },
          { $set: { _commentSeeded: true, _commentCount: newCount } }
        );

        totalGenerated += comments.length;
        articlesProcessed++;

        if (articlesProcessed % 50 === 0 || articlesProcessed <= 5) {
          console.log(`  [+${comments.length}] (total:${newCount}) ${article.title.substring(0, 55)}`);
        }

        await new Promise(r => setTimeout(r, 50));

      } catch (err) {
        errors.push({ title: article.title.substring(0, 40), error: err.message });
        console.error(`  [ERROR] ${article.title.substring(0, 40)}: ${err.message.substring(0, 100)}`);
        await new Promise(r => setTimeout(r, 2000));
      }

      if ((i + 1) % 10 === 0) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`\n--- Summary ---`);
    console.log(`Processed: ${articlesProcessed} | Skipped: ${skipped} | Comments: ${totalGenerated} | API calls: ${totalApiCalls}`);
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length}`);
      errors.slice(0, 5).forEach(e => console.log(`  - ${e.title}: ${e.error.substring(0, 80)}`));
    }

    const sample = await db.collection('comments').find({ _seeded: true })
      .sort({ createdAt: -1 }).limit(5)
      .project({ content: 1, guestName: 1 }).toArray();
    if (sample.length > 0) {
      console.log(`\nRecent seeded comments:`);
      for (const s of sample) {
        console.log(`  [${s.guestName}] ${s.content.substring(0, 70)}`);
      }
    }

    await client.close();
  } catch (err) {
    console.error('Seed comments fatal error:', err);
    if (client) await client.close();
  }
}

// 매 3시간마다 실행 (0, 3, 6, 9, 12, 15, 18, 21시)
cron.schedule('30 */3 * * *', () => {
  console.log('[Seed Comments] 크론 실행 (3시간 주기)');
  runSeedComments();
}, { timezone: 'Asia/Seoul' });

console.log('[Seed Comments] 스케줄러 시작됨 - 매 3시간 주기');

// 시작 시 즉시 1회 실행
runSeedComments();
