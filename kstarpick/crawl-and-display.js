const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// pages/api/news/crawl.js에서 가져온 Twitter 변환 함수
function convertTwitterTextToEmbed(htmlContent) {
  if (!htmlContent) return htmlContent;
  
  let convertedContent = htmlContent;
  
  // Twitter/X URL 찾기
  const twitterUrlPattern = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(?:@)?([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)/g;
  const twitterUrls = [...convertedContent.matchAll(twitterUrlPattern)];
  
  if (twitterUrls.length === 0) {
    console.log('Twitter/X URL이 없음');
    return convertedContent;
  }
  
  console.log(`${twitterUrls.length}개의 Twitter/X URL 발견`);
  
  // 각 Twitter URL에 대해 처리
  twitterUrls.forEach((urlMatch, index) => {
    const twitterUrl = urlMatch[0];
    const username = urlMatch[1];
    const tweetId = urlMatch[2];
    
    console.log(`Twitter/X URL ${index + 1} 처리:`, twitterUrl);
    
    // Twitter 임베드 코드 생성
    const embedCode = `<blockquote class="twitter-tweet" data-lang="en" data-theme="light">
<p lang="en" dir="ltr">Loading tweet...</p>
<a href="${twitterUrl}"></a>
</blockquote>`;
    
    // URL을 임베드 코드로 교체
    convertedContent = convertedContent.replace(twitterUrl, embedCode);
  });
  
  return convertedContent.trim();
}

async function crawlSoompiArticle(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('페이지 로딩 중...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // 기사 내용 추출
    const articleData = await page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent || 'No title';
      const author = document.querySelector('.author-name')?.textContent || 
                     document.querySelector('.article-author')?.textContent || 'Unknown';
      
      // 기사 본문 찾기
      const contentElement = document.querySelector('.article-content') || 
                           document.querySelector('.content-article') ||
                           document.querySelector('[class*="article-body"]') ||
                           document.querySelector('article');
      
      let content = '';
      if (contentElement) {
        content = contentElement.innerHTML;
      }
      
      return { title, author, content };
    });
    
    console.log('기사 제목:', articleData.title);
    console.log('기사 작성자:', articleData.author);
    
    // Twitter 임베드 변환
    articleData.content = convertTwitterTextToEmbed(articleData.content);
    
    // HTML 생성
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${articleData.title} - KstarPick Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2em;
            line-height: 1.3;
        }
        .meta {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .content {
            color: #333;
            font-size: 1.1em;
        }
        .content img {
            max-width: 100%;
            height: auto;
            margin: 20px 0;
            border-radius: 5px;
        }
        .twitter-embed-container {
            margin: 30px 0;
            display: flex;
            justify-content: center;
        }
        blockquote.twitter-tweet {
            margin: 20px auto !important;
        }
        .status {
            background-color: #e7f3ff;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #2196F3;
        }
        .instagram-media {
            margin: 20px auto !important;
            max-width: 540px !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status">
            <strong>🔍 크롤링 테스트 페이지</strong><br>
            원본: <a href="${url}" target="_blank">${url}</a><br>
            Twitter 임베드 자동 변환 적용됨
        </div>
        
        <h1>${articleData.title}</h1>
        
        <div class="meta">
            <strong>작성자:</strong> ${articleData.author}<br>
            <strong>크롤링 시간:</strong> ${new Date().toLocaleString('ko-KR')}
        </div>
        
        <div class="content">
            ${articleData.content}
        </div>
    </div>
    
    <!-- Twitter 위젯 스크립트 -->
    <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
    
    <!-- Instagram 위젯 스크립트 -->
    <script async src="//www.instagram.com/embed.js"></script>
</body>
</html>`;
    
    // HTML 파일 저장
    const outputPath = path.join(__dirname, 'crawled-article-test.html');
    fs.writeFileSync(outputPath, html);
    
    console.log('✅ HTML 파일 생성 완료:', outputPath);
    return outputPath;
    
  } catch (error) {
    console.error('크롤링 중 오류 발생:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// 실행
const targetUrl = 'https://www.soompi.com/article/1762915wpp/cha-eun-woo-enlists-in-the-military-with-support-from-astro-and-choi-yoojung';

crawlSoompiArticle(targetUrl)
  .then(outputPath => {
    console.log('\n📄 브라우저에서 확인하려면:');
    console.log(`open ${outputPath}`);
  })
  .catch(error => {
    console.error('실행 실패:', error);
  }); 