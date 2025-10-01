import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import News from '../../../models/News';

// 로그 함수
function forceLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[FORCE LOG] ${timestamp}: ${message}`;
  console.log(logMessage);
}

// MongoDB 연결
async function connectDB() {
  try {
    // 환경변수 기반 MongoDB 연결
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kstarpick';
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    forceLog('MongoDB 연결 성공');
    return true;
  } catch (error) {
    forceLog(`MongoDB 연결 실패: ${error.message}`);
    return false;
  }
}

// 뉴스 아이템 생성 함수
function createNewsItem(title, url, thumbnailUrl, category, timeText, order) {
  const sanitizeSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  };

  const now = new Date();
  const slug = sanitizeSlug(title);
  
  return {
    title: title.trim(),
    content: '',
    author: 'Soompi Crawler',
    publishedAt: now,
    tags: ['크롤링', category || 'General'].filter(Boolean),
    category: category || 'General',
    slug: slug || `news-${now.getTime()}`,
    featuredImage: thumbnailUrl || '',
    articleUrl: url,
    source: 'Soompi',
    status: 'published',
    views: 0,
    likes: 0,
    createdAt: now,
    updatedAt: now,
    order: order || 0
  };
}

// 메인 크롤링 함수 - /latest 페이지에서 Load More
async function scrapeSoompiLatestWithLoadMore(maxItemsLimit = 300) {
  let browser;
  try {
    forceLog('=== Soompi /latest Load More 크롤링 시작 ===');
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // /latest 페이지로 이동
    forceLog('https://www.soompi.com/latest 접속 시도...');
    await page.goto('https://www.soompi.com/latest', { waitUntil: 'networkidle2', timeout: 30000 });
    
    forceLog('페이지 로드 완료');
    const title = await page.title();
    forceLog(`페이지 제목: ${title}`);
    
    let newsItems = [];
    let attempt = 0;
    const maxAttempts = Math.ceil(maxItemsLimit / 15); // 15개씩 로드되므로
    
    forceLog(`Load More 크롤링 시작: 목표 ${maxItemsLimit}개, 최대 ${maxAttempts}번 시도`);
    
    while (attempt < maxAttempts && newsItems.length < maxItemsLimit) {
      attempt++;
      
      // 현재 페이지의 모든 뉴스 링크 수집
      const currentNewsLinks = await page.evaluate(() => {
        const links = [];
        document.querySelectorAll('a').forEach(link => {
          if (link.href && 
              link.href.includes('soompi.com') && 
              link.href.includes('/article/')) {
            const title = link.textContent?.trim() || '';
            if (title.length > 3) {
              links.push({ title, url: link.href });
            }
          }
        });
        
        // 중복 제거
        const unique = [];
        links.forEach(article => {
          if (!unique.some(existing => existing.url === article.url)) {
            unique.push(article);
          }
        });
        
        return unique;
      });
      
      forceLog(`시도 ${attempt}: 현재 ${currentNewsLinks.length}개 뉴스 링크 발견`);
      
      // 새로운 뉴스 아이템 생성
      for (const link of currentNewsLinks) {
        if (newsItems.length >= maxItemsLimit) break;
        
        if (!newsItems.some(item => item.articleUrl === link.url)) {
          try {
            const newsItem = createNewsItem(link.title, link.url, '', '', 'Recently', newsItems.length);
            newsItems.push(newsItem);
            forceLog(`뉴스 링크 추가: "${link.title}"`);
          } catch (error) {
            forceLog(`뉴스 아이템 생성 실패: ${link.title} - ${error.message}`);
          }
        }
      }
      
      forceLog(`현재까지 수집된 뉴스: ${newsItems.length}개`);
      
      // 목표 달성하거나 더 이상 클릭할 수 없으면 중단
      if (newsItems.length >= maxItemsLimit || attempt >= maxAttempts) {
        forceLog(`수집 완료: ${newsItems.length}개 (목표: ${maxItemsLimit}개)`);
        break;
      }
      
      // 페이지 끝까지 스크롤
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Load More 버튼 찾기 및 클릭
      const loadMoreResult = await page.evaluate(() => {
        // 텍스트로 Load More 버튼 찾기
        const allButtons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        for (const btn of allButtons) {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('load more') || 
              (text.includes('load') && text.includes('more'))) {
            
            if (btn.offsetParent !== null && btn.style.display !== 'none') {
              btn.click();
              return `Load More 클릭 성공: "${btn.textContent.trim()}"`;
            }
          }
        }
        
        return false;
      });
      
      if (loadMoreResult) {
        forceLog(`🎯 ${loadMoreResult}`);
        
        // 로딩 대기
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 새로운 콘텐츠 로딩 대기
        try {
          await page.waitForFunction((previousCount) => {
            const current = document.querySelectorAll('a[href*="/article/"]').length;
            return current > previousCount;
          }, { timeout: 10000 }, currentNewsLinks.length);
          
          forceLog('✅ 새 콘텐츠 로딩 완료');
        } catch (e) {
          forceLog('⏰ 새 콘텐츠 로딩 대기 시간 초과');
        }
        
      } else {
        forceLog('❌ Load More 버튼을 찾을 수 없음 - 크롤링 완료');
        break;
      }
    }
    
    forceLog(`총 ${newsItems.length}개의 뉴스 항목을 수집했습니다.`);
    
    // 브라우저 종료
    if (browser) {
      try {
        await browser.close();
        forceLog('Puppeteer 브라우저 종료');
      } catch (closeError) {
        forceLog(`브라우저 종료 중 오류: ${closeError.message}`);
      }
    }
    
    return newsItems;
    
  } catch (error) {
    forceLog(`Puppeteer 크롤링 중 오류: ${error.message}`);
    console.error('Puppeteer 오류 상세:', error);
    
    // 에러 발생 시에도 브라우저 종료
    if (browser) {
      try {
        await browser.close();
        forceLog('에러 발생 시 Puppeteer 브라우저 종료');
      } catch (closeError) {
        forceLog(`에러 시 브라우저 종료 중 오류: ${closeError.message}`);
      }
    }
    
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다.' });
  }

  try {
    forceLog('=== 새로운 Load More 크롤러 API 호출 ===');
    
    const { maxItems = 300 } = req.body;
    forceLog(`요청된 최대 아이템 수: ${maxItems}`);

    // MongoDB 연결
    const dbConnected = await connectDB();
    if (!dbConnected) {
      return res.status(500).json({ error: 'MongoDB 연결 실패' });
    }

    // 크롤링 실행
    const scrapedNewsItems = await scrapeSoompiLatestWithLoadMore(maxItems);
    
    if (!scrapedNewsItems || scrapedNewsItems.length === 0) {
      forceLog('크롤링된 뉴스가 없습니다.');
      return res.status(200).json({ 
        message: '크롤링할 뉴스를 찾을 수 없습니다.',
        newNewsCount: 0,
        totalNews: 0
      });
    }

    forceLog(`크롤링 완료: ${scrapedNewsItems.length}개 뉴스 수집`);

    // 새로운 뉴스만 필터링하여 데이터베이스에 저장
    let savedCount = 0;
    
    for (const newsItem of scrapedNewsItems) {
      try {
        // 기존 뉴스 확인 (URL 또는 제목으로)
        const existingNews = await News.findOne({
          $or: [
            { articleUrl: newsItem.articleUrl },
            { title: newsItem.title }
          ]
        });

        if (!existingNews) {
          const news = new News(newsItem);
          await news.save();
          savedCount++;
          forceLog(`새 뉴스 저장: "${newsItem.title}"`);
        } else {
          forceLog(`기존 뉴스 스킵: "${newsItem.title}"`);
        }
      } catch (saveError) {
        forceLog(`뉴스 저장 실패: "${newsItem.title}" - ${saveError.message}`);
      }
    }

    // 총 뉴스 개수 확인
    const totalNewsCount = await News.countDocuments();
    
    forceLog(`=== 크롤링 완료 ===`);
    forceLog(`수집된 뉴스: ${scrapedNewsItems.length}개`);
    forceLog(`새로 저장된 뉴스: ${savedCount}개`);
    forceLog(`전체 뉴스: ${totalNewsCount}개`);

    res.status(200).json({
      message: `크롤링 완료: ${scrapedNewsItems.length}개 뉴스 중 ${savedCount}개 새 뉴스 추가`,
      scrapedCount: scrapedNewsItems.length,
      newNewsCount: savedCount,
      totalNews: totalNewsCount
    });

  } catch (error) {
    forceLog(`API 핸들러 오류: ${error.message}`);
    console.error('API 오류:', error);
    res.status(500).json({ 
      error: '크롤링 중 오류 발생',
      details: error.message 
    });
  }
} 