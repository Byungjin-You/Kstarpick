import axios from 'axios';
import * as cheerio from 'cheerio';
import { MongoClient } from "mongodb";
import { ObjectId } from 'mongodb';
import fs from 'fs';
import puppeteer from 'puppeteer';

const LOG_PATH = '/tmp/news-crawl-ajax-debug.log';

// 디버깅 헬퍼 함수
function logDebug(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(LOG_PATH, logMessage);
  } catch (error) {
    console.error('로그 파일 쓰기 실패:', error);
  }
}

function forceLog(message) {
  logDebug(`[FORCE] ${message}`);
}

// 뉴스 아이템 생성 함수
function createNewsItem(title, url, thumbnailUrl, category, timeText, index) {
  // URL에서 slug 추출
  let slug = '';
  if (url && url.includes('/article/')) {
    const matches = url.match(/\/article\/([^\/]+)/);
    if (matches && matches[1]) {
      slug = matches[1];
    }
  }
  
  if (!slug) {
    slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  return {
    title: title.trim(),
    slug: slug,
    content: '',
    summary: '',
    thumbnailUrl: thumbnailUrl || '',
    category: category || 'K-Pop',
    tags: [],
    articleUrl: url,
    timeText: timeText || 'Recently',
    createdAt: new Date(),
    updatedAt: new Date(),
    source: 'Soompi',
    status: 'published',
    views: 0,
    likes: 0,
    index: index
  };
}

// AJAX 기반 Soompi 크롤링 함수
async function scrapeSoompiNewsWithAjax(maxItemsLimit = 300) {
  let browser;
  try {
    forceLog('=== AJAX 기반 Soompi 크롤링 시작 ===');
    forceLog(`목표 뉴스 개수: ${maxItemsLimit}개`);
    
    // Puppeteer 브라우저 시작
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36');
    
    // 결과를 저장할 배열
    const newsItems = [];
    
    // Soompi Latest 페이지 접속
    forceLog('https://www.soompi.com/latest 접속 중...');
    
    await page.goto('https://www.soompi.com/latest', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    forceLog('페이지 로드 완료');
    
    // 첫 번째 페이지의 뉴스 수집
    let currentNewsLinks = await page.evaluate(() => {
      const links = [];
      
      // Soompi의 뉴스 링크 셀렉터들
      const selectors = [
        '.col-sm-12.col-md-4 h4.media-heading a',  // 메인 뉴스 링크
        'h4.media-heading a',                       // 백업 셀렉터 1
        '.media-heading a',                         // 백업 셀렉터 2
        'a[href*="/article/"]'                      // 일반 article 링크
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const url = element.href;
          const title = element.textContent?.trim();
          
          if (url && title && url.includes('/article/') && !links.some(link => link.url === url)) {
            links.push({
              url: url,
              title: title
            });
          }
        });
        
        if (links.length > 10) break; // 충분한 링크를 찾으면 중단
      }
      
      return links;
    });
    
    forceLog(`첫 페이지에서 ${currentNewsLinks.length}개 뉴스 발견`);
    
    // 첫 페이지 뉴스 추가
    for (const link of currentNewsLinks) {
      if (newsItems.length >= maxItemsLimit) break;
      
      if (!newsItems.some(item => item.articleUrl === link.url)) {
        const newsItem = createNewsItem(link.title, link.url, '', '', 'Recently', newsItems.length);
        newsItems.push(newsItem);
        forceLog(`뉴스 추가 [${newsItems.length}]: "${link.title}"`);
      }
    }
    
    // AJAX Load More를 통해 추가 뉴스 로드
    let currentPage = 2;
    const maxPages = Math.ceil(maxItemsLimit / 15); // 페이지당 약 15개씩 로드
    
    forceLog(`Load More를 통해 최대 ${maxPages}페이지까지 로드 시도`);
    
    while (newsItems.length < maxItemsLimit && currentPage <= maxPages) {
      try {
        forceLog(`=== 페이지 ${currentPage} AJAX 로드 시작 ===`);
        
        // AJAX 요청으로 추가 뉴스 로드
        const ajaxResponse = await page.evaluate(async (pageNum) => {
          try {
            const formData = new FormData();
            formData.append('action', 'get_ltp_search_articles');
            formData.append('ltp', '1');
            formData.append('page', pageNum.toString());
            
            const response = await fetch('https://www.soompi.com/wp-admin/admin-ajax.php', {
              method: 'POST',
              headers: {
                'X-Requested-With': 'XMLHttpRequest'
              },
              body: formData
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            return html;
          } catch (error) {
            console.error('AJAX 요청 실패:', error);
            return null;
          }
        }, currentPage);
        
        if (!ajaxResponse) {
          forceLog(`페이지 ${currentPage} AJAX 요청 실패`);
          break;
        }
        
        if (ajaxResponse.trim().length < 100) {
          forceLog(`페이지 ${currentPage} 응답이 너무 짧음 (${ajaxResponse.length} bytes) - 더 이상 데이터 없음`);
          break;
        }
        
        forceLog(`페이지 ${currentPage} AJAX 응답 수신 (${ajaxResponse.length} bytes)`);
        
        // 응답 HTML에서 뉴스 링크 추출
        const $ = cheerio.load(ajaxResponse);
        const newLinks = [];
        
        // 다양한 셀렉터로 링크 추출 시도
        const selectors = [
          'h4.media-heading a',
          '.media-heading a', 
          'a[href*="/article/"]'
        ];
        
        for (const selector of selectors) {
          $(selector).each((index, element) => {
            let url = $(element).attr('href');
            const title = $(element).text()?.trim();
            
            if (url && title) {
              // 상대 URL을 절대 URL로 변환
              if (!url.startsWith('http')) {
                url = url.startsWith('/') ? `https://www.soompi.com${url}` : `https://www.soompi.com/${url}`;
              }
              
              if (url.includes('/article/') && !newLinks.some(link => link.url === url)) {
                newLinks.push({
                  url: url,
                  title: title
                });
              }
            }
          });
          
          if (newLinks.length > 0) break; // 첫 번째 성공한 셀렉터로 충분
        }
        
        forceLog(`페이지 ${currentPage}에서 ${newLinks.length}개 새 뉴스 발견`);
        
        if (newLinks.length === 0) {
          forceLog('더 이상 새 뉴스가 없습니다.');
          break;
        }
        
        // 새 뉴스 추가
        let addedCount = 0;
        for (const link of newLinks) {
          if (newsItems.length >= maxItemsLimit) break;
          
          if (!newsItems.some(item => item.articleUrl === link.url)) {
            const newsItem = createNewsItem(link.title, link.url, '', '', 'Recently', newsItems.length);
            newsItems.push(newsItem);
            addedCount++;
            forceLog(`새 뉴스 추가 [${newsItems.length}]: "${link.title}"`);
          }
        }
        
        forceLog(`페이지 ${currentPage}에서 ${addedCount}개 뉴스 추가됨 (총 ${newsItems.length}개)`);
        
        if (addedCount === 0) {
          forceLog('새로 추가된 뉴스가 없습니다. 크롤링 종료.');
          break;
        }
        
        currentPage++;
        
        // 서버 부하 방지를 위한 대기
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (pageError) {
        forceLog(`페이지 ${currentPage} 로드 중 오류: ${pageError.message}`);
        break;
      }
    }
    
    forceLog(`=== AJAX 크롤링 완료: 총 ${newsItems.length}개 뉴스 수집 ===`);
    
    return newsItems;
    
  } catch (error) {
    forceLog(`AJAX 크롤링 중 오류: ${error.message}`);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// API 핸들러
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    forceLog('=== AJAX 크롤링 시작 ===');
    
    // 요청에서 최대 크롤링 아이템 수 가져오기 (기본값: 50, 최대: 300)
    const maxItems = Math.min(parseInt(req.body.maxItems) || 50, 300);
    forceLog(`최대 크롤링 아이템 수: ${maxItems}`);
    
    // Soompi 뉴스 AJAX 크롤링
    let newsItems;
    try {
      newsItems = await scrapeSoompiNewsWithAjax(maxItems);
    } catch (crawlError) {
      forceLog('크롤링 중 오류 발생: ' + crawlError.message);
      return res.status(500).json({ 
        success: false, 
        message: '크롤링 중 오류가 발생했습니다: ' + crawlError.message 
      });
    }
    
    if (newsItems.length === 0) {
      forceLog('크롤링할 뉴스를 찾을 수 없음');
      return res.status(404).json({ 
        success: false, 
        message: '크롤링할 뉴스를 찾을 수 없습니다.' 
      });
    }
    
    forceLog('=== 데이터베이스 연결 시작 ===');
    
    // MongoDB 연결 (환경변수 기반)
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kstarpick';
    const client = new MongoClient(uri, {
      tls: process.env.MONGODB_URI ? true : false,
      tlsAllowInvalidHostnames: true,
      tlsAllowInvalidCertificates: true
    });
    await client.connect();
    const db = client.db('kstarpick');
    const collection = db.collection('news');
    
    forceLog('MongoDB 연결 성공');
    
    // 중복 뉴스 확인 및 새 뉴스만 저장
    let newNewsCount = 0;
    const savedNews = [];
    
    for (const newsItem of newsItems) {
      try {
        // URL 기반 중복 확인
        const existingNews = await collection.findOne({ 
          $or: [
            { articleUrl: newsItem.articleUrl },
            { slug: newsItem.slug }
          ]
        });
        
        if (!existingNews) {
          const result = await collection.insertOne(newsItem);
          if (result.insertedId) {
            newNewsCount++;
            savedNews.push({
              title: newsItem.title,
              slug: newsItem.slug,
              id: result.insertedId
            });
            forceLog(`새 뉴스 저장: "${newsItem.title}"`);
          }
        } else {
          forceLog(`중복 뉴스 스킵: "${newsItem.title}"`);
        }
      } catch (saveError) {
        forceLog(`뉴스 저장 오류: ${saveError.message}`);
      }
    }
    
    await client.close();
    
    const message = newNewsCount > 0 
      ? `${newNewsCount}개의 새 뉴스 항목을 추가했습니다.`
      : '새로운 뉴스가 없습니다.';
    
    forceLog(`=== 크롤링 완료: ${message} ===`);
    
    return res.status(200).json({
      success: true,
      message: message,
      total: newsItems.length,
      new: newNewsCount,
      savedNews: savedNews.slice(0, 5) // 처음 5개만 반환
    });
    
  } catch (error) {
    forceLog('API 핸들러 오류: ' + error.message);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다: ' + error.message
    });
  }
} 