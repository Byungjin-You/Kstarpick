import { connectToDatabase } from '../../../utils/mongodb';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const COLLECTION = 'ai_insights';
const INSIGHT_TYPE = 'trending_articles';

async function generateInsight(articles, categoryStats) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('CLAUDE_API_KEY is not configured');

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const articlesSummary = articles.map((a, i) => {
    const daysOld = Math.max(1, Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 86400000));
    const vpd = Math.round((a.viewCount || 0) / daysOld);
    return `${i + 1}. [카테고리: ${a.category}] "${a.title}" - 조회수: ${(a.viewCount || 0).toLocaleString()}, 일평균: ${vpd.toLocaleString()}, 리액션: ${a.totalReactions || 0}, 발행: ${daysOld}일 전`;
  }).join('\n');

  const categorySummary = categoryStats.map(c =>
    `- ${c.displayName}: ${c.count}개 기사, 총 ${(c.totalViews || 0).toLocaleString()} views`
  ).join('\n');

  const totalViews = articles.reduce((s, a) => s + (a.viewCount || 0), 0);
  const totalReactions = articles.reduce((s, a) => s + (a.totalReactions || 0), 0);
  const avgViews = articles.length ? Math.round(totalViews / articles.length) : 0;

  const prompt = `당신은 KStarPick(K-pop/K-drama 뉴스 사이트)의 시니어 콘텐츠 분석 AI입니다.
아래 데이터를 심층 분석하여 구조화된 JSON 리포트를 생성하세요.

날짜: ${dateStr}
분석 대상: 최근 30일 인기 기사 ${articles.length}개
총 조회수: ${totalViews.toLocaleString()}
총 리액션: ${totalReactions.toLocaleString()}
평균 조회수: ${avgViews.toLocaleString()}

## 인기 기사 목록 (조회수 순):
${articlesSummary}

## 카테고리 분포:
${categorySummary}

---

## 분석 지침

### 1. 콘텐츠 세부 타입 분류
각 기사의 제목을 분석하여 세부 콘텐츠 타입을 분류하세요:

**K-pop 기사 세부 타입:**
- comeback: 컴백/신곡 발표 관련
- mv: 뮤직비디오 관련
- award: 시상식/수상 관련
- chart: 차트 성적/순위 관련
- variety: 예능/인터뷰 출연
- sns: SNS 화제/바이럴
- collab: 콜라보/피처링
- personal: 연애/사생활/군입대 등
- debut: 데뷔/신인
- concert: 콘서트/투어
- general-news: 일반 뉴스

**K-drama 기사 세부 타입:**
- drama-review: 드라마 리뷰/감상
- drama-news: 드라마 관련 뉴스 (시청률, 화제성 등)
- actor-profile: 배우 소개/인터뷰
- casting: 캐스팅/제작 소식
- ost: OST 관련
- streaming: 스트리밍/방영 정보
- behind: 비하인드/메이킹

### 2. 패턴 분석
- 어떤 세부 타입이 조회수가 높은지
- 어떤 아티스트/드라마/배우가 반복적으로 등장하는지
- 조회 성과가 좋은 기사의 공통점은 무엇인지

---

## 출력 형식
반드시 아래 JSON 형식만 출력하세요 (한국어로 작성):

{
  "contentHealth": <1-10 숫자>,
  "healthLabel": "<상태 라벨: '매우 활발' | '양호' | '보통' | '개선 필요' | '주의'>",
  "topPerformer": {
    "title": "<1위 기사 제목 요약 (20자 이내)>",
    "metric": "<핵심 지표: 예='조회수 2.3k, 일평균 290'>",
    "contentType": "<세부 타입: 예='chart' | 'comeback' | 'drama-news' 등>",
    "reason": "<왜 이 기사가 잘 됐는지 한 문장>"
  },
  "contentTypeAnalysis": [
    {
      "type": "<세부 타입명>",
      "typeLabel": "<한글 라벨: 예='차트/순위', '컴백', '드라마 뉴스'>",
      "count": <해당 타입 기사 수>,
      "avgViews": <해당 타입 평균 조회수>,
      "verdict": "<한 줄 평가: 예='가장 높은 관심도, 꾸준히 발행 권장'>"
    }
  ],
  "hotEntities": [
    {
      "name": "<아티스트/드라마/배우 이름>",
      "mentions": <등장 횟수>,
      "totalViews": <관련 기사 총 조회수>,
      "note": "<한 줄 코멘트>"
    }
  ],
  "velocityAlert": "<가장 빠르게 성장 중인 기사/주제 한 문장 (일평균 조회수 기준, 수치 포함)>",
  "suggestion": "<다음에 어떤 세부 타입의 기사를 쓰면 좋을지 구체적 제안 한 문장>",
  "keywords": ["<핫 키워드 3-5개>"]
}

contentTypeAnalysis는 실제 데이터에서 발견된 타입만 포함 (최대 5개, avgViews 내림차순).
hotEntities는 기사 제목에서 반복 등장하는 인물/그룹/드라마 (최대 4개, totalViews 내림차순).`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Insight JSON parse error:', e);
  }

  return null;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const { db } = await connectToDatabase();

  if (req.method === 'GET') {
    const latest = await db.collection(COLLECTION)
      .findOne({ type: INSIGHT_TYPE }, { sort: { createdAt: -1 } });

    return res.status(200).json({
      success: true,
      insight: latest ? {
        data: latest.data,
        createdAt: latest.createdAt?.toISOString(),
        articleCount: latest.articleCount
      } : null
    });
  }

  if (req.method === 'POST') {
    try {
      const { articles, categoryStats } = req.body;
      if (!articles || !articles.length) {
        return res.status(400).json({ error: 'Articles data required' });
      }

      const data = await generateInsight(articles, categoryStats || []);
      if (!data) {
        return res.status(500).json({ error: 'Failed to parse AI response' });
      }

      await db.collection(COLLECTION).insertOne({
        type: INSIGHT_TYPE,
        data,
        articleCount: articles.length,
        createdAt: new Date()
      });

      return res.status(200).json({
        success: true,
        insight: {
          data,
          createdAt: new Date().toISOString(),
          articleCount: articles.length
        }
      });
    } catch (error) {
      console.error('Trending insight error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
