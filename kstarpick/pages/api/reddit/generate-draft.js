// AI-powered Reddit Post Draft Generator
// Takes a content idea + trend data and generates a full Reddit post

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

async function generateDraftWithClaude(idea, trendData, category) {
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY is not configured');
  }

  // Build relevant trend context
  const trendContext = buildTrendContext(trendData, category, idea.subject);

  const prompt = `당신은 Reddit ${idea.subreddit || 'r/kpop'} 커뮤니티의 파워 유저입니다.
아래 콘텐츠 아이디어를 기반으로 실제 Reddit 포스트 초안을 작성하세요.

## 콘텐츠 아이디어
- 유형: ${idea.type}
- 대상: ${idea.subject}
- 서브레딧: ${idea.subreddit}
- 제목: ${idea.redditTitle}
- 포맷: ${idea.postFormat}
- 본문 구조: ${idea.bodyOutline}
- 필요 데이터: ${idea.dataNeeded}

## 사용 가능한 데이터 (Reddit 트렌드에서 수집)
${trendContext}

---

## 작성 규칙

1. **톤**: Reddit 커뮤니티 멤버처럼 자연스럽고 캐주얼하게. 기자나 마케터 느낌 절대 금지.
2. **구조**: Reddit markdown 활용 (##, **, -, |표|, >인용)
3. **데이터**: 위에 제공된 실제 데이터를 활용. 없는 데이터는 "[데이터 필요: 설명]"으로 표시하여 사람이 채울 수 있게.
4. **길이**: 포스트 유형에 맞게 적절히. 데이터 포스트는 길어도 OK, 토론은 간결하게.
5. **언어**: 영어로 작성 (Reddit 해외 커뮤니티 타겟)
6. **마무리**: 토론을 유도하는 질문이나 코멘트 요청으로 끝내기

## 출력 형식

JSON으로 출력하세요:
{
  "title": "최종 Reddit 포스트 제목",
  "body": "포스트 본문 (Reddit markdown 형식, 줄바꿈은 \\n 사용)",
  "flairSuggestion": "추천 flair (예: Discussion, Data, Analysis 등)",
  "postingTips": ["포스팅 시 참고할 팁 1", "팁 2"]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  const responseText = data.content?.[0]?.text || '';

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('JSON parse error:', e);
  }

  return null;
}

// Build relevant trend context for the draft
function buildTrendContext(trendData, category, subject) {
  const lines = [];

  // Trending items
  if (category === 'kpop' && trendData.trendingArtists) {
    const relevant = trendData.trendingArtists.filter(a =>
      a.name.toLowerCase().includes(subject.toLowerCase()) ||
      subject.toLowerCase().includes(a.name.toLowerCase())
    );
    const artists = relevant.length > 0 ? relevant : trendData.trendingArtists.slice(0, 5);
    lines.push('### Trending Artists:');
    artists.forEach((a, i) => {
      lines.push(`${i + 1}. ${a.name} - ${a.mentions} mentions, engagement: ${a.totalEngagement}, upvotes: ${a.totalScore}, comments: ${a.totalComments}`);
    });
  }

  if (category === 'kdrama') {
    if (trendData.trendingDramas) {
      lines.push('### Trending Dramas:');
      trendData.trendingDramas.slice(0, 5).forEach((d, i) => {
        lines.push(`${i + 1}. ${d.name} - ${d.mentions} mentions, engagement: ${d.totalEngagement}`);
      });
    }
    if (trendData.trendingActors) {
      lines.push('\n### Trending Actors:');
      trendData.trendingActors.slice(0, 5).forEach((a, i) => {
        lines.push(`${i + 1}. ${a.name} - ${a.mentions} mentions, engagement: ${a.totalEngagement}`);
      });
    }
  }

  // Related posts
  if (trendData.topPosts) {
    const relatedPosts = trendData.topPosts.filter(p => {
      const titleLower = p.title.toLowerCase();
      const subjectLower = subject.toLowerCase();
      return titleLower.includes(subjectLower) || subjectLower.split(' ').some(w => w.length > 2 && titleLower.includes(w));
    }).slice(0, 10);

    const posts = relatedPosts.length > 0 ? relatedPosts : trendData.topPosts.slice(0, 10);
    lines.push('\n### Related Hot Posts:');
    posts.forEach((p, i) => {
      lines.push(`${i + 1}. [${p.category}] ${p.title}`);
      lines.push(`   r/${p.subreddit} | Score: ${p.score} | Comments: ${p.comments}`);
      if (p.artists?.length) lines.push(`   Artists: ${p.artists.join(', ')}`);
      if (p.dramas?.length) lines.push(`   Dramas: ${p.dramas.join(', ')}`);
    });
  }

  // Category breakdown
  if (trendData.categoryBreakdown) {
    lines.push('\n### Category Stats:');
    trendData.categoryBreakdown.forEach(cat => {
      lines.push(`- ${cat.name}: ${cat.count} posts (engagement: ${cat.totalEngagement})`);
    });
  }

  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    const { idea, trendData, category = 'kpop' } = req.body;

    if (!idea || !trendData) {
      return res.status(400).json({ error: 'Idea and trend data are required' });
    }

    const draft = await generateDraftWithClaude(idea, trendData, category);

    if (!draft) {
      return res.status(500).json({ error: 'Failed to parse draft response' });
    }

    return res.status(200).json({
      success: true,
      draft,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Draft generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate draft',
      details: error.message
    });
  }
}
