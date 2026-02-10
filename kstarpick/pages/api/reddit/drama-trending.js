// Reddit K-Drama Trend Analysis API
// Fetches hot/top posts from K-Drama subreddits and analyzes trends

const SUBREDDITS = ['KDRAMA', 'kdramarecommends', 'koreanvariety', 'koreanfilm'];
const USER_AGENT = 'KStarPick/1.0 (Drama Trend Analysis)';

// Known K-Drama titles and actors for mention detection
const DRAMA_KEYWORDS = [
  // Popular Recent Dramas
  'Squid Game', 'Queen of Tears', 'Lovely Runner', 'Marry My Husband',
  'Business Proposal', 'Extraordinary Attorney Woo', 'Alchemy of Souls',
  'All of Us Are Dead', 'My Mister', 'Signal', 'Reply 1988',
  'Crash Landing on You', 'Itaewon Class', 'Vincenzo', 'Hometown Cha-Cha-Cha',
  'Hospital Playlist', 'Mr. Sunshine', 'My Name', 'Sweet Home',
  'Move to Heaven', 'D.P.', 'Hellbound', 'The Glory',
  'Physical 100', 'Revenant', 'Mask Girl', 'A Shop for Killers',
  'Gyeongseong Creature', 'Doctor Slump', 'Knight Flower',
  'Captivating the King', 'Welcome to Samdalri', 'Twinkling Watermelon',
  'Daily Dose of Sunshine', 'Behind Your Touch', 'King the Land',
  'See You in My 19th Life', 'Bloodhounds',
  'When the Phone Rings', 'Light Shop', 'Love Scout',
];

const ACTOR_KEYWORDS = [
  // Popular Actors/Actresses
  'Song Hye-kyo', 'Song Hye Kyo', 'Jun Ji-hyun', 'Jun Ji Hyun',
  'Kim Soo-hyun', 'Kim Soo Hyun', 'Lee Min-ho', 'Lee Min Ho',
  'Park Seo-joon', 'Park Seo Joon', 'Hyun Bin', 'Son Ye-jin', 'Son Ye Jin',
  'Bae Suzy', 'Suzy', 'IU', 'Kim Go-eun', 'Kim Go Eun',
  'Park Bo-young', 'Park Bo Young', 'Nam Joo-hyuk', 'Nam Joo Hyuk',
  'Ahn Hyo-seop', 'Ahn Hyo Seop', 'Kim Se-jeong', 'Kim Se Jeong',
  'Shin Hye-sun', 'Shin Hye Sun', 'Wi Ha-joon', 'Wi Ha Joon',
  'Lee Do-hyun', 'Lee Do Hyun', 'Byeon Woo-seok', 'Byeon Woo Seok',
  'Kim Ji-won', 'Kim Ji Won', 'Park Min-young', 'Park Min Young',
  'Song Kang', 'Cha Eun-woo', 'Cha Eun Woo',
  'Jung Hae-in', 'Jung Hae In', 'Lee Sung-kyung', 'Lee Sung Kyung',
  'Park Shin-hye', 'Park Shin Hye', 'Jung So-min', 'Jung So Min',
];

// Categorize post by type
function categorizePost(post) {
  const flair = (post.link_flair_text || '').toLowerCase();
  const title = post.title.toLowerCase();

  if (flair.includes('news')) return 'News';
  if (flair.includes('preview') || flair.includes('teaser')) return 'Preview/Teaser';
  if (flair.includes('review') || flair.includes('on-air')) return 'Review';
  if (flair.includes('discussion') || flair.includes('episode')) return 'Episode Discussion';
  if (flair.includes('recommend') || flair.includes('rec')) return 'Recommendation';
  if (flair.includes('help') || flair.includes('question')) return 'Question';
  if (flair.includes('meta') || flair.includes('featured')) return 'Featured';
  if (flair.includes('cast') || flair.includes('lineup')) return 'Casting';
  if (flair.includes('ost') || flair.includes('soundtrack')) return 'OST';
  if (flair.includes('variety')) return 'Variety';

  // Title-based fallback
  if (title.includes('recommend') || title.includes('looking for')) return 'Recommendation';
  if (title.includes('review') || title.includes('thoughts on')) return 'Review';
  if (title.includes('episode') || title.includes('ep.') || title.includes('ep ')) return 'Episode Discussion';
  if (title.includes('premiere') || title.includes('upcoming')) return 'Preview/Teaser';
  if (title.includes('ost') || title.includes('soundtrack')) return 'OST';
  if (title.includes('casting') || title.includes('confirmed to star')) return 'Casting';
  if (title.includes('rating') || title.includes('viewership')) return 'Ratings';
  if (title.includes('netflix') || title.includes('streaming')) return 'Streaming';

  return 'General';
}

// Extract drama/actor mentions from title
function extractMentions(title) {
  const dramas = [];
  const actors = [];

  for (const drama of DRAMA_KEYWORDS) {
    const escaped = drama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(title)) {
      if (!dramas.includes(drama)) dramas.push(drama);
    }
  }

  for (const actor of ACTOR_KEYWORDS) {
    const escaped = actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(title)) {
      if (!actors.includes(actor)) actors.push(actor);
    }
  }

  return { dramas, actors };
}

// Calculate engagement score
function calculateEngagement(post) {
  const upvotes = post.score || 0;
  const comments = post.num_comments || 0;
  const upvoteRatio = post.upvote_ratio || 0.5;
  return Math.round((upvotes + comments * 2) * upvoteRatio);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch posts from a subreddit using Reddit's public JSON API
async function fetchSubreddit(subreddit, sort = 'hot', limit = 50) {
  try {
    // Reddit public JSON API - real-time data
    const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Reddit API error for r/${subreddit}: ${res.status}`);
      return [];
    }

    const data = await res.json();

    if (!data?.data?.children || !Array.isArray(data.data.children)) {
      console.error(`Reddit no data for r/${subreddit}`);
      return [];
    }

    return data.data.children
      .filter((item) => item.data && item.data.title)
      .map((item) => {
        const post = item.data;
        const mentions = extractMentions(post.title);
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
          dramas: mentions.dramas,
          actors: mentions.actors,
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

// Aggregate drama mentions
function aggregateDramas(posts) {
  const dramaMap = {};
  for (const post of posts) {
    for (const drama of post.dramas) {
      if (!dramaMap[drama]) {
        dramaMap[drama] = { name: drama, mentions: 0, totalScore: 0, totalComments: 0, totalEngagement: 0, posts: [] };
      }
      dramaMap[drama].mentions += 1;
      dramaMap[drama].totalScore += post.score;
      dramaMap[drama].totalComments += post.comments;
      dramaMap[drama].totalEngagement += post.engagement;
      dramaMap[drama].posts.push({ title: post.title, score: post.score, comments: post.comments, url: post.url, subreddit: post.subreddit });
    }
  }
  return Object.values(dramaMap).sort((a, b) => b.totalEngagement - a.totalEngagement);
}

// Aggregate actor mentions
function aggregateActors(posts) {
  const actorMap = {};
  for (const post of posts) {
    for (const actor of post.actors) {
      if (!actorMap[actor]) {
        actorMap[actor] = { name: actor, mentions: 0, totalScore: 0, totalComments: 0, totalEngagement: 0, posts: [] };
      }
      actorMap[actor].mentions += 1;
      actorMap[actor].totalScore += post.score;
      actorMap[actor].totalComments += post.comments;
      actorMap[actor].totalEngagement += post.engagement;
      actorMap[actor].posts.push({ title: post.title, score: post.score, comments: post.comments, url: post.url, subreddit: post.subreddit });
    }
  }
  return Object.values(actorMap).sort((a, b) => b.totalEngagement - a.totalEngagement);
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
  return Object.values(categoryMap).sort((a, b) => b.count - a.count);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sort = 'hot', limit = '50', subreddit } = req.query;
    const postLimit = Math.min(parseInt(limit) || 50, 100);
    const targetSubs = subreddit ? [subreddit] : SUBREDDITS;

    // Fetch subreddits in pairs with delay between batches
    let allPosts = [];
    for (let i = 0; i < targetSubs.length; i += 2) {
      if (i > 0) await delay(500);
      const batch = targetSubs.slice(i, i + 2);
      const results = await Promise.all(batch.map((sub) => fetchSubreddit(sub, sort, postLimit)));
      for (const posts of results) allPosts.push(...posts);
    }

    // Note: PullPush data is archived and may be months old
    // Skip time filtering since the data is already sorted by recency/score from PullPush

    allPosts.sort((a, b) => b.engagement - a.engagement);

    const trendingDramas = aggregateDramas(allPosts);
    const trendingActors = aggregateActors(allPosts);
    const categoryBreakdown = aggregateCategories(allPosts);
    const topPosts = allPosts.slice(0, 20);

    // Subreddit stats
    const subredditStats = {};
    for (const sub of targetSubs) {
      const subPosts = allPosts.filter((p) => p.subreddit.toLowerCase() === sub.toLowerCase());
      subredditStats[sub] = {
        totalPosts: subPosts.length,
        totalEngagement: subPosts.reduce((sum, p) => sum + p.engagement, 0),
        avgScore: subPosts.length ? Math.round(subPosts.reduce((sum, p) => sum + p.score, 0) / subPosts.length) : 0,
      };
    }

    // Content suggestions
    const suggestions = [];
    for (const drama of trendingDramas.slice(0, 3)) {
      const topPost = drama.posts.sort((a, b) => b.score - a.score)[0];
      suggestions.push({
        type: 'drama',
        name: drama.name,
        reason: `${drama.mentions} mentions, ${drama.totalEngagement} engagement`,
        suggestedTitle: `${drama.name}: ${topPost?.title?.substring(0, 60) || 'Trending Now'}`,
        topPostUrl: topPost?.url,
      });
    }
    for (const actor of trendingActors.slice(0, 3)) {
      const topPost = actor.posts.sort((a, b) => b.score - a.score)[0];
      suggestions.push({
        type: 'actor',
        name: actor.name,
        reason: `${actor.mentions} mentions, ${actor.totalEngagement} engagement`,
        suggestedTitle: `${actor.name}: ${topPost?.title?.substring(0, 60) || 'Trending Now'}`,
        topPostUrl: topPost?.url,
      });
    }

    return res.status(200).json({
      success: true,
      fetchedAt: new Date().toISOString(),
      summary: {
        totalPosts: allPosts.length,
        subreddits: targetSubs,
        sort,
      },
      trendingDramas,
      trendingActors,
      categoryBreakdown,
      topPosts,
      subredditStats,
      suggestions,
    });
  } catch (error) {
    console.error('Reddit drama trending API error:', error);
    return res.status(500).json({ error: 'Failed to fetch Reddit drama trends', details: error.message });
  }
}
