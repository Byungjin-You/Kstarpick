const axios = require('axios');
const cheerio = require('cheerio');

async function testSpecificCrawl() {
  try {
    const url = 'https://www.soompi.com/article/1690883wpp/kim-ji-min-and-kim-joon-ho-get-married-share-photos-from-wedding';
    console.log('테스트 URL:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // 1. 카테고리 추출 테스트
    console.log('\n=== 카테고리 추출 테스트 ===');
    const metaCategory = $('meta[property="article:section"]').attr('content');
    console.log('메타 카테고리:', metaCategory);
    
    const tagsContainer = $('.tags-container');
    console.log('tags-container 존재:', tagsContainer.length > 0);
    
    if (tagsContainer.length > 0) {
      console.log('tags-container HTML:', tagsContainer.html().substring(0, 500));
      const categoryLink = tagsContainer.find('a[href*="/category/"]').first();
      console.log('카테고리 링크 href:', categoryLink.attr('href'));
      console.log('카테고리 링크 text:', categoryLink.text());
      console.log('카테고리 링크 title:', categoryLink.attr('title'));
    }
    
    // 2. Viki 콘텐츠 확인
    console.log('\n=== Viki 콘텐츠 확인 ===');
    const vikiLinks = $('a[href*="viki.com"]');
    console.log('Viki 링크 개수:', vikiLinks.length);
    
    vikiLinks.each((i, el) => {
      console.log('Viki 링크', i + 1, ':', $(el).attr('href'));
      console.log('Viki 링크 텍스트:', $(el).text());
      console.log('Viki 링크 부모 HTML:', $(el).parent().html());
    });
    
    const watchNowButtons = $('a.btn-watch-now');
    console.log('Watch Now 버튼 개수:', watchNowButtons.length);
    
    // Watch 텍스트 포함 p 태그 찾기
    const watchParagraphs = $('p:contains("Watch")');
    console.log('Watch 텍스트 포함 p 태그 개수:', watchParagraphs.length);
    
    watchParagraphs.each((i, el) => {
      const text = $(el).text();
      if (text.toLowerCase().includes('viki')) {
        console.log('Watch on Viki 텍스트:', text);
      }
    });
    
    // 3. 제목 확인
    console.log('\n=== 제목 확인 ===');
    const title = $('h1').first().text().trim();
    console.log('제목:', title);
    
    // 4. 실제 기사 내용에서 Viki 관련 콘텐츠 찾기
    console.log('\n=== 기사 내용 Viki 콘텐츠 확인 ===');
    const articleWrapper = $('.article-wrapper');
    if (articleWrapper.length > 0) {
      const contentDiv = articleWrapper.find('> div').first();
      if (contentDiv.length > 0) {
        const content = contentDiv.html();
        
        // Viki 관련 콘텐츠 찾기
        const vikiMatches = content.match(/.*viki\.com.*|.*Watch.*on\s+Viki.*|.*btn-watch-now.*/gi);
        if (vikiMatches) {
          console.log('기사 내용에서 발견된 Viki 관련 콘텐츠:');
          vikiMatches.forEach((match, i) => {
            console.log(`${i + 1}:`, match.substring(0, 200));
          });
        } else {
          console.log('기사 내용에서 Viki 관련 콘텐츠를 찾을 수 없습니다.');
        }
      }
    }
    
  } catch (error) {
    console.error('오류:', error.message);
  }
}

testSpecificCrawl(); 