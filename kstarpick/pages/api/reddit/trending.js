// Reddit K-pop Trend Analysis API
// Fetches hot/top posts from K-pop subreddits and analyzes trends

const SUBREDDITS = ['kpop', 'kpopthoughts', 'kpoppers'];
const USER_AGENT = 'KStarPick/1.0 (Content Trend Analysis)';

// Known K-pop artist names for mention detection
const ARTIST_KEYWORDS = [
  // 4th Gen+
  'aespa', 'NewJeans', 'IVE', 'LE SSERAFIM', 'ILLIT', 'BABYMONSTER',
  'Stray Kids', 'ATEEZ', 'ENHYPEN', 'TXT', 'TREASURE', 'RIIZE', 'ZEROBASEONE', 'ZB1',
  'NMIXX', 'KISS OF LIFE', 'TWS', 'BOYNEXTDOOR', 'PLAVE',
  // 3rd Gen
  'BTS', 'BLACKPINK', 'TWICE', 'EXO', 'Red Velvet', 'GOT7', 'SEVENTEEN', 'SVT',
  'MAMAMOO', 'Stray Kids', 'ITZY', 'NCT', 'NCT 127', 'NCT Dream',
  // Solo
  'Jungkook', 'Jimin', 'SUGA', 'Lisa', 'Jennie', 'Rosé',
  'IU', 'Taeyeon', 'Baekhyun', 'Hwasa', 'Sunmi',
  // 5th Gen / Recent
  'KATSEYE', 'tripleS', 'QWER', 'meovv',
];

// Categorize post by type based on flair and title
function categorizePost(post) {
  const flair = (post.link_flair_text || '').toLowerCase();
  const title = post.title.toLowerCase();

  if (flair.includes('news') || flair.includes('info')) return 'News';
  if (flair.includes('mv') || flair.includes('music video')) return 'MV/Release';
  if (flair.includes('album') || flair.includes('release')) return 'Release';
  if (flair.includes('discussion') || flair.includes('talk')) return 'Discussion';
  if (flair.includes('teaser') || flair.includes('concept')) return 'Teaser';
  if (flair.includes('live') || flair.includes('performance')) return 'Performance';
  if (flair.includes('variety') || flair.includes('interview')) return 'Variety';
  if (flair.includes('chart')) return 'Charts';
  if (flair.includes('rumor') || flair.includes('speculation')) return 'Rumor';

  // Title-based fallback
  if (title.includes('comeback') || title.includes('release')) return 'Release';
  if (title.includes('chart') || title.includes('#1') || title.includes('no.1') || title.includes('first place')) return 'Charts';
  if (title.includes('mv') || title.includes('music video')) return 'MV/Release';
  if (title.includes('teaser') || title.includes('concept photo')) return 'Teaser';
  if (title.includes('concert') || title.includes('tour')) return 'Concert/Tour';
  if (title.includes('scandal') || title.includes('controversy')) return 'Controversy';
  if (title.includes('dating') || title.includes('relationship')) return 'Dating/Personal';

  return 'General';
}

// Extract artist mentions from title using word boundary matching
function extractArtists(title) {
  const found = [];

  for (const artist of ARTIST_KEYWORDS) {
    const escaped = artist.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(title)) {
      const normalized = artist.trim();
      if (!found.includes(normalized)) {
        found.push(normalized);
      }
    }
  }
  return found;
}

// Calculate engagement score
function calculateEngagement(post) {
  const upvotes = post.score || 0;
  const comments = post.num_comments || 0;
  const upvoteRatio = post.upvote_ratio || 0.5;
  // Weighted score: upvotes + (comments * 2) adjusted by ratio
  return Math.round((upvotes + comments * 2) * upvoteRatio);
}

// Small delay helper to avoid Reddit rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch posts from a subreddit using PullPush API (Reddit mirror that works on AWS)
async function fetchSubreddit(subreddit, sort = 'hot', limit = 50) {
  try {
    // PullPush API: sort by score (descending) for hot/top, newest for new
    const sortParam = sort === 'new' ? 'created_utc' : 'score';
    const url = `https://api.pullpush.io/reddit/search/submission/?subreddit=${subreddit}&sort=${sortParam}&sort_type=desc&size=${limit}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`PullPush API error for r/${subreddit}: ${res.status}`, text.substring(0, 200));
      return [];
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error(`PullPush JSON parse error for r/${subreddit}:`, text.substring(0, 200));
      return [];
    }

    if (!data?.data || !Array.isArray(data.data)) {
      console.error(`PullPush no data for r/${subreddit}:`, JSON.stringify(data).substring(0, 200));
      return [];
    }

    return data.data
      .filter((post) => post.title) // Only posts with titles
      .map((post) => {
        return {
          id: post.id,
          subreddit: post.subreddit,
          title: post.title,
          url: `https://reddit.com${post.permalink}`,
          externalUrl: post.url,
          score: post.score || 0,
          upvoteRatio: post.upvote_ratio || 0.5,
          comments: post.num_comments || 0,
          flair: post.link_flair_text || null,
          category: categorizePost(post),
          artists: extractArtists(post.title),
          engagement: calculateEngagement(post),
          createdAt: new Date((post.created_utc || 0) * 1000).toISOString(),
          thumbnail: post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : null,
        };
      });
  } catch (err) {
    console.error(`Error fetching r/${subreddit}:`, err.message);
    return [];
  }
}

// Aggregate artist mentions across all posts
function aggregateArtists(posts) {
  const artistMap = {};

  for (const post of posts) {
    for (const artist of post.artists) {
      if (!artistMap[artist]) {
        artistMap[artist] = {
          name: artist,
          mentions: 0,
          totalScore: 0,
          totalComments: 0,
          totalEngagement: 0,
          posts: [],
        };
      }
      artistMap[artist].mentions += 1;
      artistMap[artist].totalScore += post.score;
      artistMap[artist].totalComments += post.comments;
      artistMap[artist].totalEngagement += post.engagement;
      artistMap[artist].posts.push({
        title: post.title,
        score: post.score,
        comments: post.comments,
        url: post.url,
        subreddit: post.subreddit,
      });
    }
  }

  return Object.values(artistMap)
    .sort((a, b) => b.totalEngagement - a.totalEngagement);
}

// Aggregate categories
function aggregateCategories(posts) {
  const categoryMap = {};

  for (const post of posts) {
    if (!categoryMap[post.category]) {
      categoryMap[post.category] = { name: post.category, count: 0, totalEngagement: 0 };
    }
    categoryMap[post.category].count += 1;
    categoryMap[post.category].totalEngagement += post.engagement;
  }

  return Object.values(categoryMap)
    .sort((a, b) => b.count - a.count);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sort = 'hot', limit = '50', subreddit } = req.query;
    const postLimit = Math.min(parseInt(limit) || 50, 100);

    // Determine which subreddits to fetch
    const targetSubs = subreddit ? [subreddit] : SUBREDDITS;

    // Fetch subreddits in pairs with delay between batches
    const allPosts = [];
    for (let i = 0; i < targetSubs.length; i += 2) {
      if (i > 0) await delay(500);
      const batch = targetSubs.slice(i, i + 2);
      const results = await Promise.all(batch.map((sub) => fetchSubreddit(sub, sort, postLimit)));
      for (const posts of results) allPosts.push(...posts);
    }

    // Sort all posts by engagement
    allPosts.sort((a, b) => b.engagement - a.engagement);

    // Aggregate data
    const trendingArtists = aggregateArtists(allPosts);
    const categoryBreakdown = aggregateCategories(allPosts);

    // Top posts (top 20 by engagement)
    const topPosts = allPosts.slice(0, 20);

    // Subreddit breakdown
    const subredditStats = {};
    for (const sub of targetSubs) {
      const subPosts = allPosts.filter((p) => p.subreddit.toLowerCase() === sub.toLowerCase());
      subredditStats[sub] = {
        totalPosts: subPosts.length,
        totalEngagement: subPosts.reduce((sum, p) => sum + p.engagement, 0),
        avgScore: subPosts.length ? Math.round(subPosts.reduce((sum, p) => sum + p.score, 0) / subPosts.length) : 0,
      };
    }

    // Content suggestions based on trending
    const suggestions = trendingArtists.slice(0, 5).map((artist) => {
      const topPost = artist.posts.sort((a, b) => b.score - a.score)[0];
      return {
        artist: artist.name,
        reason: `${artist.mentions} mentions, ${artist.totalEngagement} engagement`,
        suggestedTitle: `${artist.name}: ${topPost?.title?.substring(0, 60) || 'Trending Now'}`,
        topPostUrl: topPost?.url,
      };
    });

    return res.status(200).json({
      success: true,
      fetchedAt: new Date().toISOString(),
      summary: {
        totalPosts: allPosts.length,
        subreddits: targetSubs,
        sort,
      },
      trendingArtists,
      categoryBreakdown,
      topPosts,
      subredditStats,
      suggestions,
    });
  } catch (error) {
    console.error('Reddit trending API error:', error);
    return res.status(500).json({ error: 'Failed to fetch Reddit trends', details: error.message });
  }
}
