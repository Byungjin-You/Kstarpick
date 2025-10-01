require('dotenv').config({ path: '.env.production' });
const { MongoClient } = require('mongodb');

async function checkNewsTitle() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('kstarpick');
    
    const news = await db.collection('news').findOne({ 
      slug: 'head-over-heels-soars-to-new-alltime-best-for-finale' 
    });
    
    if (news) {
      console.log('=== 원본 뉴스 title 확인 ===');
      console.log('Title:', JSON.stringify(news.title));
      console.log('Title length:', news.title.length);
      console.log('Contains quotes:', news.title.includes('"'));
      console.log('Contains HTML entities:', news.title.includes('&'));
      console.log('Char codes:', [...news.title].map(char => `${char}(${char.charCodeAt(0)})`).join(' '));
      
      // cleanText 함수 테스트 - 업데이트된 버전
      const cleanText = (text, maxLength = 160) => {
        if (!text) return '';
        
        return text
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ')
          .replace(/&#x27;/g, "'")
          .replace(/&#x2F;/g, '/')
          .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
          // 문제가 되는 따옴표들을 안전한 문자로 변환
          .replace(/["""]/g, '') // 이중 따옴표 제거
          .replace(/[''']/g, '') // 작은 따옴표 제거
          // 기타 특수 문자 정리
          .replace(/[<>]/g, '') // 꺾쇠 괄호 제거
          .replace(/[&]/g, 'and') // & 문자를 'and'로 변환
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, maxLength);
      };
      
      console.log('\n=== cleanText 결과 ===');
      const cleanedTitle = cleanText(news.title, 90);
      console.log('Cleaned title:', JSON.stringify(cleanedTitle));
      console.log('Cleaned length:', cleanedTitle.length);
      
      const fullTitle = cleanedTitle ? `${cleanedTitle} | KstarPick` : 'KstarPick - K-Pop News Portal';
      console.log('Full title:', JSON.stringify(fullTitle));
      console.log('Full title length:', fullTitle.length);
    } else {
      console.log('뉴스를 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    await client.close();
  }
}

checkNewsTitle();