// 크롤러 디버깅 스크립트 생성

// React/Next.js 관련 모듈은 제외하고 크롤링 기능만 테스트
const fetch = require('node-fetch');

// 스텔스 크롤러 테스트
async function testStealthCrawler() {
  console.log('\n========== 스텔스 크롤러 테스트 ==========');
  try {
    console.log('스텔스 크롤러에 요청 보내는 중...');
    console.log('요청 URL: http://localhost:3000/api/crawler/stealth-crawler');
    console.log('요청 본문:', JSON.stringify({
      url: 'https://mydramalist.com/search?adv=titles&ty=68,83&co=3&so=newest&or=asc&page=1',
      mode: 'list'
    }, null, 2));
    
    const response = await fetch('http://localhost:3000/api/crawler/stealth-crawler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://mydramalist.com/search?adv=titles&ty=68,83&co=3&so=newest&or=asc&page=1',
        mode: 'list'
      })
    });
    
    console.log('응답 상태:', response.status);
    console.log('응답 헤더:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
    
    const data = await response.json();
    
    if (data.success) {
      console.log('성공! 드라마 수:', data.data.dramas.length);
      console.log('첫 번째 드라마:', data.data.dramas[0].title);
      console.log('다음 페이지 URL:', data.data.nextPage);
    } else {
      console.error('실패:', data.message);
      if (data.error) console.error('오류 메시지:', data.error);
      if (data.stack) console.error('오류 스택:', data.stack);
    }
  } catch (error) {
    console.error('스텔스 크롤러 테스트 오류:', error);
  }
}

// 자동 크롤러 테스트
async function testAutoCrawler() {
  console.log('\n========== 자동 크롤러 테스트 ==========');
  try {
    console.log('자동 크롤러에 요청 보내는 중...');
    console.log('요청 URL: http://localhost:3000/api/crawler/auto-crawler');
    console.log('요청 본문:', JSON.stringify({
      url: 'https://mydramalist.com/search?adv=titles&ty=68,83&co=3&so=newest&or=asc&page=1',
      mode: 'list'
    }, null, 2));
    
    const response = await fetch('http://localhost:3000/api/crawler/auto-crawler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://mydramalist.com/search?adv=titles&ty=68,83&co=3&so=newest&or=asc&page=1',
        mode: 'list'
      })
    });
    
    console.log('응답 상태:', response.status);
    console.log('응답 헤더:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
    
    const data = await response.json();
    
    if (data.success) {
      console.log('성공! 드라마 수:', data.data.dramas.length);
      console.log('첫 번째 드라마:', data.data.dramas[0].title);
      console.log('다음 페이지 URL:', data.data.nextPage);
    } else {
      console.error('실패:', data.message);
      if (data.error) console.error('오류 메시지:', data.error);
      if (data.stack) console.error('오류 스택:', data.stack);
    }
  } catch (error) {
    console.error('자동 크롤러 테스트 오류:', error);
  }
}

// 두 테스트 모두 실행
async function runTests() {
  await testStealthCrawler();
  await testAutoCrawler();
  console.log('\n테스트 완료!');
}

runTests();
