import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// 시즌차트 기사 템플릿
const ARTICLE_TEMPLATE = `
제목: [아티스트], 마이원픽 '[시즌]' 시즌차트 [부문] 1위, [SEO 타이틀]

1문단 (수상 현황):
"[아티스트]가 글로벌 팬덤 플랫폼 마이원픽(my1pick)이 발표한 '[시즌] 시즌차트' [부문]에서 1위를 차지했다.
[득표율/표차 수치]의 높은 득표율로 정상에 오르며 팬들의 열렬한 지지를 받았다.

마이원픽 시즌차트 상은 주, 월, 분기 단위로 팬들의 지지를 받은 아티스트에게 수여된다.
각 부문 1위에게는 온라인 어워즈 시상과 함께 수상 콘텐츠가 마이원픽 공식 유튜브를 통해 공개되며, 실물 트로피가 제공된다."

2문단 (시즌차트 소개 - 고정):
"마이원픽 시즌차트 상은 주, 월, 분기 단위로 팬들에게 사랑받은 아티스트에게 수여되는 상으로,
각 부문 1위 아티스트에게는 온라인 어워즈 시상과 함께 수상 콘텐츠가 마이원픽 공식 유튜브를 통해 공개된다.
또한, 실물 트로피도 아티스트에게 전달되어 팬들과의 특별한 연결을 더욱 강화할 예정이다."

3문단 (최근 근황 1):
"[아티스트/인물]는 최근 [앨범/음원/작품명]을 통해 [성과]를 기록했다.
[공식 일정]도 이어가며 활동 폭을 넓히고 있다."

4문단 (최근 근황 2):
"[아티스트/인물]의 [수상/프로젝트/협업] 소식도 주목된다.
[구체 사실]에 더해 [구체 사실]가 겹치며 팬덤 결집이 강화됐다는 평가가 나온다."

5문단 (마이원픽 소개 - 고정):
"마이원픽은 APAN, ASEA, 서울가요대상 등 다양한 시상식 및 방송 프로그램과 협업을 이어가고 있다.
K-팝과 드라마를 넘어 K-콘텐츠 전반으로 서비스 영역을 확장하며, 글로벌 팬과 콘텐츠를 잇는 대표 플랫폼으로 도약하고 있다."
`;

// Claude API로 기사 생성 (계획 단계 포함)
async function generateArticleWithClaude(articlePrompt) {
  const apiKey = process.env.CLAUDE_API_KEY;

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
        content: articlePrompt
      }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

// 고정 문단 템플릿 (팩트체크용)
const FIXED_PARAGRAPH_2 = "마이원픽 시즌차트 상은 주, 월, 분기 단위로 팬들에게 사랑받은 아티스트에게 수여되는 상으로, 각 부문 1위 아티스트에게는 온라인 어워즈 시상과 함께 수상 콘텐츠가 마이원픽 공식 유튜브를 통해 공개된다. 또한, 실물 트로피도 아티스트에게 전달되어 팬들과의 특별한 연결을 더욱 강화할 예정이다.";

const FIXED_PARAGRAPH_5 = "마이원픽은 APAN, ASEA, 서울가요대상 등 다양한 시상식 및 방송 프로그램과 협업을 이어가고 있다. K-팝과 드라마를 넘어 K-콘텐츠 전반으로 서비스 영역을 확장하며, 글로벌 팬과 콘텐츠를 잇는 대표 플랫폼으로 도약하고 있다.";

// Claude API로 팩트체크
async function factCheckWithClaude(article, voteData) {
  const apiKey = process.env.CLAUDE_API_KEY;

  const today = new Date();
  const formattedToday = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // 상위 후보자 순위 정보 생성
  const rankingInfo = voteData.topCandidates?.map((c, i) =>
    `${i + 1}위: ${c.candidate_name} (${c.candidate_group_name || '솔로'}) - ${c.total_vote?.toLocaleString()}표`
  ).join('\n') || '';

  // 2위와의 득표수 차이 계산
  const secondPlace = voteData.topCandidates?.[1];
  const voteDifference = secondPlace ? (voteData.totalVotes - secondPlace.total_vote) : 0;

  // 전체 득표수 합계 계산
  const totalAllVotes = voteData.topCandidates?.reduce((sum, c) => sum + (c.total_vote || 0), 0) || 0;

  const prompt = `당신은 K-pop 기사 팩트체커입니다. AI가 생성한 기사를 검증해주세요.

## 오늘 날짜: ${formattedToday}

## 원본 투표 데이터 (아래 정보는 모두 100% 확정된 사실입니다):
- 캠페인: ${voteData.campaignTitle}
- 시즌: ${voteData.season}
- 부문: ${voteData.category}
- 1위 아티스트: ${voteData.artistName} (${voteData.groupName || '솔로'})
- 1위 득표수: ${voteData.totalVotes?.toLocaleString()}표
- 1위 득표율: ${voteData.votePercentage}%
- 전체 득표수 합계: ${totalAllVotes.toLocaleString()}표
- 투표 기간: ${voteData.startDate} ~ ${voteData.endDate}
${secondPlace ? `- 2위: ${secondPlace.candidate_name} - ${secondPlace.total_vote?.toLocaleString()}표` : ''}
${secondPlace ? `- 1위와 2위 득표수 차이: ${voteDifference.toLocaleString()}표` : ''}

## 전체 순위 (확정된 사실):
${rankingInfo}

## 고정 문단 원본 (정확히 일치해야 함):
### 2문단 (시즌차트 소개):
"${FIXED_PARAGRAPH_2}"

### 5문단 (마이원픽 소개):
"${FIXED_PARAGRAPH_5}"

## 생성된 기사:
${article}

## 검증 원칙:
1. **투표 데이터 검증**: 위에 제공된 "원본 투표 데이터"와 "전체 순위"는 모두 확정된 사실입니다.
   - 기사에서 이 데이터를 인용한 내용(득표수, 득표율, 순위, 2위와의 표차 등)은 원본과 일치하면 정확한 것입니다.
   - 숫자가 원본 데이터와 다르면 오류로 표시하세요.

2. **고정 문단 검증**: 2문단과 5문단이 위 "고정 문단 원본"과 의미상 일치하는지 확인하세요.
   - 완전히 동일하지 않아도 핵심 내용이 포함되어 있으면 통과입니다.

3. **근황 정보 검증 (3, 4문단)**:
   - 구체적인 앨범명, 날짜, 공연명 등이 언급되었다면 신뢰성에 주의하세요.
   - "글로벌 팬들의 사랑을 받고 있다" 같은 일반적 표현은 안전합니다.
   - 허위로 단정할 수 없는 정보는 문제로 표시하지 마세요.

## 판정 기준:
- **passed: true** → score가 70점 이상이고 factErrors가 없을 때
- **passed: false** → score가 70점 미만이거나 심각한 factErrors가 있을 때

## 응답 형식 (JSON만 출력):
{
  "passed": true/false,
  "score": 0-100,
  "breakdown": {
    "accuracy": 0-40,
    "template": 0-20,
    "recentInfo": 0-30,
    "quality": 0-10
  },
  "issues": ["문제점1"],
  "factErrors": ["확실히 틀린 사실만 기재"],
  "suggestions": ["수정 제안1"],
  "summary": "전체 평가 요약"
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
      max_tokens: 1024,
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

  // JSON 파싱 시도
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('JSON parse error:', e);
  }

  return {
    passed: false,
    score: 0,
    issues: ['팩트체크 응답 파싱 실패'],
    suggestions: [],
    summary: responseText
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }

  try {
    const { campaign, candidates } = req.body;

    if (!campaign || !candidates || candidates.length === 0) {
      return res.status(400).json({ success: false, message: '캠페인 및 후보자 데이터가 필요합니다.' });
    }

    const winner = candidates[0]; // 1위 후보자
    const totalVotes = candidates.reduce((sum, c) => sum + (c.total_vote || 0), 0);
    const votePercentage = totalVotes > 0 ? ((winner.total_vote / totalVotes) * 100).toFixed(1) : 0;

    // 시즌 정보 추출 (예: "2025 1월 1주차 season chart" -> "2025년 1월 1주차")
    const seasonMatch = campaign.title.match(/(\d{4})\s*(\d{1,2}월)\s*(\d주차)?/i);
    const season = seasonMatch
      ? `${seasonMatch[1]}년 ${seasonMatch[2]}${seasonMatch[3] ? ' ' + seasonMatch[3] : ''}`
      : campaign.title.replace(/season\s*chart/i, '').trim();

    // 부문 추출 (예: "Global K-pop" 등)
    const categoryMatch = campaign.title.match(/season\s*chart\s*[-–]\s*(.+)/i);
    const category = categoryMatch ? categoryMatch[1].trim() : 'K-pop';

    // 현재 날짜 계산
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const formattedToday = `${currentYear}년 ${currentMonth}월 ${today.getDate()}일`;

    // Claude에게 기사 생성 요청 (계획 단계 포함)
    const articlePrompt = `당신은 매우 뛰어난 추론 능력을 갖춘 K-pop 전문 기자입니다.
마이원픽 시즌차트 수상 기사를 작성하기 전에, 먼저 체계적으로 계획을 세우고 기사를 작성해주세요.

## 오늘 날짜: ${formattedToday}

## 투표 결과 정보 (확정된 사실 - 반드시 정확히 사용):
- 캠페인명: ${campaign.title}
- 시즌: ${season}
- 부문: ${category}
- 1위 아티스트: ${winner.candidate_name}
- 소속 그룹: ${winner.candidate_group_name || '솔로'}
- 득표수: ${winner.total_vote?.toLocaleString()}표
- 득표율: ${votePercentage}%
- 투표 기간: ${campaign.start_at} ~ ${campaign.end_at}

## 순위 (상위 5명):
${candidates.slice(0, 5).map((c, i) => `${i + 1}위: ${c.candidate_name} (${c.candidate_group_name || '솔로'}) - ${c.total_vote?.toLocaleString()}표`).join('\n')}

---

## STEP 1: 기사 작성 계획 수립

기사를 작성하기 전에 다음 사항들을 체계적으로 분석하고 계획하세요:

### 1.1 정보 분류
- **확정 정보 (변경 불가)**: 투표 결과, 득표수, 득표율, 순위 - 위에 제공된 데이터 그대로 사용
- **고정 문구 (변경 불가)**: 2문단(시즌차트 소개), 5문단(마이원픽 소개) - 템플릿 그대로 사용
- **작성 필요 정보**: 3, 4문단에 들어갈 아티스트의 최근 활동 정보

### 1.2 아티스트 정보 분석
"${winner.candidate_name}"${winner.candidate_group_name ? ` (${winner.candidate_group_name})` : ''}에 대해 당신이 알고 있는 **검증된 최신 정보**만 사용하세요:

1. **음악 활동**: 최근 발매한 앨범, 싱글, EP, OST
2. **공연/투어**: 진행 중이거나 예정된 콘서트, 팬미팅, 투어
3. **방송 출연**: 예능, 음악방송, 드라마, 영화 등
4. **수상 이력**: 최근 받은 상
5. **특별 활동**: 광고, 앰버서더, 협업 프로젝트 등

### 1.3 리스크 평가 및 원칙
- **확실하지 않은 정보는 절대 포함하지 않기**
- 날짜나 구체적 수치가 불확실하면 생략
- 예정된 일정은 "예정이다"로 명확히 표현
- 정보가 부족하면 일반적이지만 사실인 내용으로 대체 (예: "글로벌 팬들의 사랑을 받고 있다")

---

## STEP 2: 기사 작성

아래 템플릿에 맞춰 기사를 작성하세요.

### 기사 템플릿:
${ARTICLE_TEMPLATE}

### 작성 규칙:
1. **제목**: SEO를 고려하여 아티스트명 + 수상 정보 + 키워드 조합
2. **1문단**: 제공된 투표 데이터(득표수, 득표율)를 정확히 반영
3. **2문단**: 아래 고정 문구 그대로 사용 (수정 금지):
"마이원픽 시즌차트 상은 주, 월, 분기 단위로 팬들에게 사랑받은 아티스트에게 수여되는 상으로, 각 부문 1위 아티스트에게는 온라인 어워즈 시상과 함께 수상 콘텐츠가 마이원픽 공식 유튜브를 통해 공개된다. 또한, 실물 트로피도 아티스트에게 전달되어 팬들과의 특별한 연결을 더욱 강화할 예정이다."
4. **3문단**: 아티스트의 최근 음악/공연 활동 (확실한 정보만!)
5. **4문단**: 아티스트의 수상/프로젝트/협업 또는 팬덤 관련 (확실한 정보만!)
6. **5문단**: 아래 고정 문구 그대로 사용 (수정 금지):
"마이원픽은 APAN, ASEA, 서울가요대상 등 다양한 시상식 및 방송 프로그램과 협업을 이어가고 있다. K-팝과 드라마를 넘어 K-콘텐츠 전반으로 서비스 영역을 확장하며, 글로벌 팬과 콘텐츠를 잇는 대표 플랫폼으로 도약하고 있다."

### 주의사항:
- 모든 내용은 한국어로 작성
- 확실하지 않은 정보(날짜, 앨범명, 공연명 등)는 포함하지 말 것
- 3, 4문단에서 구체적 정보가 없으면 팬덤의 지지, 글로벌 인기 등 일반적 사실로 대체

---

## 최종 출력

최종 기사만 출력해주세요. (계획 과정은 출력하지 말 것)
형식: 제목 한 줄 + 빈 줄 + 본문 5문단

기사를 작성해주세요:`;

    const generatedArticle = await generateArticleWithClaude(articlePrompt);

    // Claude로 팩트체크 (전체 순위 데이터 포함)
    const factCheckResult = await factCheckWithClaude(generatedArticle, {
      campaignTitle: campaign.title,
      season,
      category,
      artistName: winner.candidate_name,
      groupName: winner.candidate_group_name,
      totalVotes: winner.total_vote,
      votePercentage,
      startDate: campaign.start_at,
      endDate: campaign.end_at,
      topCandidates: candidates.slice(0, 5)
    });

    // 제목 추출
    const titleMatch = generatedArticle.match(/^(.+?)[\n\r]/);
    const extractedTitle = titleMatch
      ? titleMatch[1].replace(/^제목[:\s]*/i, '').trim()
      : `${winner.candidate_name}, 마이원픽 '${season}' 시즌차트 ${category} 1위`;

    return res.status(200).json({
      success: true,
      data: {
        title: extractedTitle,
        content: generatedArticle,
        generatedBy: 'claude',
        factCheckResult,
        voteData: {
          campaignIdx: campaign.idx,
          campaignTitle: campaign.title,
          season,
          category,
          artistName: winner.candidate_name,
          groupName: winner.candidate_group_name,
          totalVotes: winner.total_vote,
          votePercentage,
          startDate: campaign.start_at,
          endDate: campaign.end_at,
          topCandidates: candidates.slice(0, 5)
        }
      }
    });

  } catch (error) {
    console.error('Article generation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
}
