// AI-powered Content Ideas Generator
// Analyzes Reddit trending data using structured reasoning framework

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// Generate content ideas using Claude API with reasoning framework
async function generateContentIdeasWithClaude(trendData, category) {
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY is not configured');
  }

  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // Prepare trend summary
  const trendingSummary = category === 'kpop'
    ? prepareKPopSummary(trendData)
    : prepareKDramaSummary(trendData);

  const categoryLabel = category === 'kpop' ? 'Pop' : 'Drama';
  const subjectLabel = category === 'kpop' ? '아티스트' : '드라마/배우';
  const subreddits = category === 'kpop'
    ? 'r/kpop, r/kpopthoughts, r/kpoprants, r/kpoopheads'
    : 'r/kdrama, r/KDRAMA, r/koreanvariety';

  const prompt = `당신은 Reddit K-${categoryLabel} 커뮤니티에서 활동하는 파워 유저이자 콘텐츠 전략가입니다.
당신은 Reddit 문화를 깊이 이해하고 있으며, 어떤 포스트가 upvote를 받고 어떤 포스트가 무시되는지 정확히 알고 있습니다.

**핵심 원칙: Reddit에서는 "커뮤니티에 가치를 주는 콘텐츠"만 살아남는다.**

## 오늘 날짜: ${formattedDate}

## 타겟 서브레딧: ${subreddits}

---

## [입력 데이터] 현재 Reddit 트렌드

### Trending ${category === 'kpop' ? 'Artists' : 'Dramas/Actors'}:
${trendingSummary.trending}

### Hot Posts (인기 게시물):
${trendingSummary.hotPosts}

### Category Breakdown:
${trendingSummary.categories}

---

## [Reddit 콘텐츠 전략] 다음 단계를 순서대로 수행하세요:

### STEP 1: 커뮤니티 갈증 파악
현재 트렌드에서:
- 댓글에서 반복적으로 나오는 질문이나 궁금증은?
- "누가 이거 정리해줬으면 좋겠다"는 니즈가 있는 주제는?
- 팬들 사이에서 의견이 갈리는 논쟁적 토픽은?
- 한국어 소스에만 있어서 해외 팬들이 접근 못하는 정보는?

### STEP 2: Reddit에서 통하는 포맷 매칭
각 아이디어에 가장 적합한 Reddit 포맷을 선택하세요:

**높은 성공률 포맷:**
- 📊 데이터 컴필레이션: 직접 수집/정리한 비교 데이터 (표, 차트)
  예: "I tracked every 4th gen group's first week sales for the past 2 years"
- 📝 심층 텍스트 분석: 잘 구조화된 장문 포스트 (헤딩, 볼드, 리스트 활용)
  예: "A deep dive into why X's marketing strategy worked differently in Japan vs US"
- 🔄 번역/정리: 한국 미디어 소스를 영어로 번역 + 맥락 설명
  예: "Translated: Key points from X's Korean interview that international fans missed"
- ❓ 토론 유발: 데이터나 관찰을 기반으로 한 개방형 질문
  예: "Has anyone else noticed that X trend? Here's what I think is happening"
- 📅 타임라인/히스토리: 사건이나 변화의 시간순 정리
  예: "A complete timeline of X's journey from debut to now"

**피해야 할 포맷:**
- 외부 사이트 링크만 걸린 홍보성 포스트
- 이미 모두가 아는 뉴스의 재탕
- 근거 없는 의견/추측 글
- 클릭베이트 제목

### STEP 3: Reddit 제목 최적화
Reddit에서 통하는 제목의 특징:
- 구체적이고 명확함 (모호한 낚시 X)
- 포스트가 제공하는 가치를 미리 알려줌
- 대괄호 태그 활용: [Discussion], [Data], [Analysis], [Translation], [Throwback]
- 제목만 봐도 "이건 읽어봐야겠다"는 반응이 나와야 함

### STEP 4: 실행 가능성 체크
각 아이디어에 대해:
- 필요한 데이터를 실제로 수집할 수 있는가?
- 어느 정도의 작업량이 필요한가?
- KStarPick이 가진 강점(한국어 소스 접근, 데이터 분석 능력)을 활용할 수 있는가?

---

## [금지 사항]
- 외부 링크 홍보형 콘텐츠 제안 금지
- "OO 컴백!", "OO 화제!" 같은 이미 올라와 있는 뉴스 재탕 금지
- 근거 없는 루머/추측 기반 콘텐츠 금지
- Reddit 규칙 위반 콘텐츠 (팬워, 비하, 사생활 침해) 금지

## [출력 형식]

5개의 Reddit 콘텐츠 아이디어를 JSON 배열로 출력하세요.
**추론 과정은 출력하지 말고, 최종 JSON만 출력하세요.**

[
  {
    "priority": 1,
    "type": "data-compilation | deep-analysis | translation | discussion | timeline | guide | comparison",
    "subject": "주요 대상 (${subjectLabel}명)",
    "subreddit": "가장 적합한 서브레딧 (예: r/kpop)",
    "redditTitle": "Reddit 포스트 제목 (영어, Reddit 스타일, 태그 포함)",
    "postFormat": "text | image | link",
    "bodyOutline": "포스트 본문 구조 요약 (3-4줄, 어떤 섹션으로 구성할지)",
    "dataNeeded": "이 콘텐츠를 만들기 위해 수집해야 할 데이터/자료",
    "executionSteps": ["실행 단계 1", "실행 단계 2", "실행 단계 3"],
    "effortLevel": "low | medium | high",
    "whyItWorks": "이 포스트가 Reddit에서 통하는 이유 (1-2문장, Reddit 커뮤니티 심리 기반)",
    "engagementPotential": "high | medium | low",
    "riskLevel": "low | medium | high",
    "sourceUrls": ["영감을 받은 Reddit URL"]
  }
]`;

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

  // Parse JSON response
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('JSON parse error:', e);
  }

  return [];
}

// Prepare K-Pop trend summary
function prepareKPopSummary(data) {
  const trending = (data.trendingArtists || []).slice(0, 10).map((artist, i) =>
    `${i + 1}. ${artist.name} - ${artist.mentions}회 언급, engagement ${artist.totalEngagement}`
  ).join('\n');

  const hotPosts = (data.topPosts || []).slice(0, 15).map((post, i) =>
    `${i + 1}. [${post.category}] ${post.title}
   - r/${post.subreddit} | Score: ${post.score} | Comments: ${post.comments}
   - Artists: ${(post.artists || []).join(', ') || 'N/A'}
   - URL: ${post.url}`
  ).join('\n\n');

  const categories = (data.categoryBreakdown || []).map(cat =>
    `- ${cat.name}: ${cat.count}개 게시물 (engagement: ${cat.totalEngagement})`
  ).join('\n');

  return { trending, hotPosts, categories };
}

// Prepare K-Drama trend summary
function prepareKDramaSummary(data) {
  const trendingDramas = (data.trendingDramas || []).slice(0, 5).map((drama, i) =>
    `${i + 1}. ${drama.name} - ${drama.mentions}회 언급, engagement ${drama.totalEngagement}`
  ).join('\n');

  const trendingActors = (data.trendingActors || []).slice(0, 5).map((actor, i) =>
    `${i + 1}. ${actor.name} - ${actor.mentions}회 언급, engagement ${actor.totalEngagement}`
  ).join('\n');

  const trending = `[드라마]\n${trendingDramas || '없음'}\n\n[배우]\n${trendingActors || '없음'}`;

  const hotPosts = (data.topPosts || []).slice(0, 15).map((post, i) =>
    `${i + 1}. [${post.category}] ${post.title}
   - r/${post.subreddit} | Score: ${post.score} | Comments: ${post.comments}
   - Dramas: ${(post.dramas || []).join(', ') || 'N/A'}
   - Actors: ${(post.actors || []).join(', ') || 'N/A'}
   - URL: ${post.url}`
  ).join('\n\n');

  const categories = (data.categoryBreakdown || []).map(cat =>
    `- ${cat.name}: ${cat.count}개 게시물 (engagement: ${cat.totalEngagement})`
  ).join('\n');

  return { trending, hotPosts, categories };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  try {
    const { trendData, category = 'kpop' } = req.body;

    if (!trendData) {
      return res.status(400).json({ error: 'Trend data is required' });
    }

    const ideas = await generateContentIdeasWithClaude(trendData, category);

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      category,
      ideas,
      dataSource: {
        totalPosts: trendData.topPosts?.length || 0,
        trendingCount: category === 'kpop'
          ? trendData.trendingArtists?.length || 0
          : (trendData.trendingDramas?.length || 0) + (trendData.trendingActors?.length || 0)
      }
    });

  } catch (error) {
    console.error('Content ideas generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate content ideas',
      details: error.message
    });
  }
}
