import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }

  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: '제목과 본문이 필요합니다.' });
  }

  try {
    const translationPrompt = `You are a professional translator specializing in K-pop and Korean entertainment news. Translate the following Korean article to English.

IMPORTANT GUIDELINES:
1. Keep all K-pop artist names, group names, and fandom names in their official English spellings (e.g., "방탄소년단" → "BTS", "블랙핑크" → "BLACKPINK")
2. Keep Korean honorifics if they add cultural context (e.g., "-nim", "sunbae")
3. Translate naturally for an international K-pop fan audience
4. Maintain the news article tone and structure
5. Keep any image tags like [이미지: /path/to/image.jpg] as [Image: /path/to/image.jpg]
6. Do NOT add any explanations or notes - only provide the translation

TITLE (Korean):
${title}

CONTENT (Korean):
${content}

Respond in this exact JSON format:
{
  "title": "Translated English title here",
  "content": "Translated English content here"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: translationPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // JSON 파싱
    let translatedData;
    try {
      // JSON 블록 추출
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translatedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON not found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);
      return res.status(500).json({
        success: false,
        message: '번역 결과 파싱에 실패했습니다.',
        error: parseError.message
      });
    }

    console.log('[Translate] Successfully translated article');

    return res.status(200).json({
      success: true,
      data: {
        titleEn: translatedData.title,
        contentEn: translatedData.content
      }
    });

  } catch (error) {
    console.error('Translation API error:', error);
    return res.status(500).json({
      success: false,
      message: '번역 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}
