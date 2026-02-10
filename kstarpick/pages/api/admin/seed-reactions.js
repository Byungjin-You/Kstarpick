import { connectToDatabase } from '../../../utils/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// 톤 분류 키워드
const TONE_KEYWORDS = {
  celebration: {
    keywords: ['win', 'award', 'debut', 'comeback', 'release', 'chart', 'record', 'milestone', 'congratulat', 'achieve', 'top', 'sells', 'surpass', 'million', 'billion', 'hit', 'success', 'first win', '1st win', 'grand prize', 'daesang', 'triple crown', 'all-kill', 'sweeps'],
    // like 높고, congratulations 매우 높고, surprised 약간, sad 거의 없음
    distribution: { like: 0.30, congratulations: 0.50, surprised: 0.15, sad: 0.05 }
  },
  excitement: {
    keywords: ['watch', 'trailer', 'teaser', 'mv', 'music video', 'preview', 'highlight', 'performance', 'stage', 'concert', 'tour', 'confirmed', 'announce', 'upcoming', 'new drama', 'new movie', 'cast', 'poster', 'first look'],
    // like 매우 높고, surprised 약간, congratulations 약간
    distribution: { like: 0.50, congratulations: 0.15, surprised: 0.30, sad: 0.05 }
  },
  sad: {
    keywords: ['death', 'die', 'pass away', 'funeral', 'mourn', 'tragedy', 'accident', 'injury', 'hurt', 'hospital', 'scandal', 'controversy', 'arrest', 'suicide', 'cancel', 'disband', 'leave', 'departure', 'farewell', 'military', 'enlist', 'hiatus', 'break up', 'divorce'],
    // sad 매우 높고, like는 위로/공감 의미
    distribution: { like: 0.20, congratulations: 0.02, surprised: 0.18, sad: 0.60 }
  },
  surprise: {
    keywords: ['reveal', 'secret', 'shock', 'unexpected', 'surprise', 'twist', 'dating', 'relationship', 'marriage', 'pregnant', 'baby', 'real name', 'past', 'truth', 'confess', 'rumor', 'spotted', 'dispatch'],
    // surprised 매우 높고, like 약간
    distribution: { like: 0.25, congratulations: 0.10, surprised: 0.55, sad: 0.10 }
  },
  heartwarming: {
    keywords: ['love', 'sweet', 'cute', 'adorable', 'chemistry', 'romantic', 'couple', 'friendship', 'bond', 'reunion', 'support', 'fan', 'letter', 'message', 'gift', 'birthday', 'celebrate', 'together', 'family', 'smile', 'happy'],
    // like 매우 높고, congratulations 약간
    distribution: { like: 0.55, congratulations: 0.25, surprised: 0.15, sad: 0.05 }
  }
};

// 기본 분배 (매칭 안 되는 일반 기사)
const DEFAULT_DISTRIBUTION = { like: 0.45, congratulations: 0.20, surprised: 0.25, sad: 0.10 };

function analyzeTone(title) {
  const lowerTitle = title.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const [tone, config] of Object.entries(TONE_KEYWORDS)) {
    const matchCount = config.keywords.filter(kw => lowerTitle.includes(kw)).length;
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = tone;
    }
  }

  return bestMatch
    ? { tone: bestMatch, distribution: TONE_KEYWORDS[bestMatch].distribution }
    : { tone: 'default', distribution: DEFAULT_DISTRIBUTION };
}

function generateReactions(totalReactions, distribution) {
  const reactions = {};
  let remaining = totalReactions;

  const keys = Object.keys(distribution);
  for (let i = 0; i < keys.length; i++) {
    if (i === keys.length - 1) {
      reactions[keys[i]] = remaining;
    } else {
      // 분배 비율 +-15% 랜덤 변동
      const ratio = distribution[keys[i]] * (0.85 + Math.random() * 0.30);
      const value = Math.round(totalReactions * ratio);
      reactions[keys[i]] = Math.max(1, value);
      remaining -= reactions[keys[i]];
    }
  }

  // 음수 방지
  for (const key of keys) {
    reactions[key] = Math.max(1, reactions[key]);
  }

  return reactions;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const { db } = await connectToDatabase();

  // GET: 미리보기 (실제 DB 변경 없음)
  if (req.method === 'GET') {
    const { limit = 20 } = req.query;

    const articles = await db.collection('news')
      .find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .project({ title: 1, category: 1, viewCount: 1, reactions: 1 })
      .toArray();

    const preview = articles.map(article => {
      const { tone, distribution } = analyzeTone(article.title);
      const total = 150 + Math.floor(Math.random() * 350); // 150~500
      const reactions = generateReactions(total, distribution);
      const existing = article.reactions || {};
      const hasReactions = Object.values(existing).some(v => v > 0);

      return {
        _id: article._id.toString(),
        title: article.title,
        category: article.category,
        viewCount: article.viewCount || 0,
        tone,
        currentReactions: existing,
        hasExistingReactions: hasReactions,
        proposedReactions: reactions,
        proposedTotal: Object.values(reactions).reduce((s, v) => s + v, 0)
      };
    });

    return res.status(200).json({
      success: true,
      preview,
      totalArticles: preview.length,
      withExisting: preview.filter(p => p.hasExistingReactions).length,
      withoutExisting: preview.filter(p => !p.hasExistingReactions).length
    });
  }

  // POST: 실제 시드 실행
  if (req.method === 'POST') {
    const { minReactions = 150, maxReactions = 500, overwrite = false, dryRun = false } = req.body;

    try {
      // 대상 기사 조회
      const query = overwrite ? {} : {
        $or: [
          { reactions: { $exists: false } },
          { 'reactions.like': 0, 'reactions.congratulations': 0, 'reactions.surprised': 0, 'reactions.sad': 0 },
          { reactions: null }
        ]
      };

      const articles = await db.collection('news')
        .find(query)
        .project({ title: 1, category: 1, viewCount: 1, reactions: 1 })
        .toArray();

      const results = [];
      const bulkOps = [];

      for (const article of articles) {
        const { tone, distribution } = analyzeTone(article.title);
        const total = minReactions + Math.floor(Math.random() * (maxReactions - minReactions + 1));
        const reactions = generateReactions(total, distribution);

        results.push({
          _id: article._id.toString(),
          title: article.title.substring(0, 60),
          tone,
          reactions,
          total: Object.values(reactions).reduce((s, v) => s + v, 0)
        });

        if (!dryRun) {
          bulkOps.push({
            updateOne: {
              filter: { _id: article._id },
              update: { $set: { reactions } }
            }
          });
        }
      }

      let writeResult = null;
      if (!dryRun && bulkOps.length > 0) {
        writeResult = await db.collection('news').bulkWrite(bulkOps);
      }

      // 톤 분포 통계
      const toneStats = {};
      for (const r of results) {
        toneStats[r.tone] = (toneStats[r.tone] || 0) + 1;
      }

      return res.status(200).json({
        success: true,
        dryRun,
        totalProcessed: results.length,
        toneDistribution: toneStats,
        modified: writeResult?.modifiedCount || 0,
        sample: results.slice(0, 10),
        settings: { minReactions, maxReactions, overwrite }
      });
    } catch (error) {
      console.error('Seed reactions error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
