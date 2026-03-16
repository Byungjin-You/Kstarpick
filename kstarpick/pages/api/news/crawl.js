import axios from 'axios';
import * as cheerio from 'cheerio';
import { connectToDatabase } from '../../../utils/mongodb';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import puppeteer from 'puppeteer';

const LOG_PATH = '/tmp/news-crawl-debug.log';

// 디버깅 헬퍼 함수
function logDebug(message, data = null) {
  const logMsg = `[DEBUG] ${message} ${data ? JSON.stringify(data) : ''}`;
  console.log(logMsg);
  // 파일 쓰기 제거 - 권한 문제 가능성
}

// 강제 로그 함수 추가
function forceLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[FORCE LOG] ${timestamp}: ${message}`;
  console.log(logMessage);
  
  // 로그를 파일에도 저장
  const fs = require('fs');
  try {
    fs.appendFileSync('/tmp/news-crawl-debug.log', logMessage + '\n');
  } catch (e) {
    // 파일 쓰기 실패해도 무시
  }
}

// 뉴스 제목 필터링 함수 - 제외할 뉴스 유형 확인
function shouldSkipNews(title) {
  if (!title) return true; // 제목이 없으면 제외
  
  const lowerTitle = title.toLowerCase();
  
  // 제외할 키워드들
  const excludeKeywords = [
    'quiz:',
    'soompi'
  ];
  
  // 제외 키워드가 포함된 경우 true 반환 (제외)
  for (const keyword of excludeKeywords) {
    if (lowerTitle.includes(keyword)) {
      logDebug(`뉴스 제외: "${title}" (키워드: "${keyword}")`);
      return true;
    }
  }
  
  return false; // 제외하지 않음
}

// 해시 기반 이미지 프록시를 위한 함수들
const crypto = require('crypto');

// URL을 해시로 변환
function createImageHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
}

// 이미지 해시를 DB에 저장하는 함수
async function saveImageHash(url, hash) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('image_hashes');
    
    // 이미 존재하는지 확인
    const existing = await collection.findOne({ hash });
    if (!existing) {
      await collection.insertOne({
        hash,
        url,
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error('이미지 해시 저장 오류:', error);
  }
}

// 이미지를 다운로드하여 로컬 디스크에 저장하는 함수
async function downloadImageToDisk(url, hash) {
  const fs = require('fs');
  const path = require('path');

  const imageDir = path.join(process.cwd(), 'public', 'images', 'news');

  // 디렉토리 생성
  if (!fs.existsSync(imageDir)) {
    fs.mkdirSync(imageDir, { recursive: true });
  }

  // 이미 파일이 존재하면 스킵
  const possibleExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  for (const ext of possibleExts) {
    if (fs.existsSync(path.join(imageDir, `${hash}${ext}`))) {
      return `/images/news/${hash}${ext}`;
    }
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.soompi.com/',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[Image Download] HTTP ${response.status} for ${url}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';

    const buffer = Buffer.from(await response.arrayBuffer());

    // 10MB 초과 이미지는 저장하지 않음
    if (buffer.length > 10 * 1024 * 1024) {
      console.warn(`[Image Download] Image too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB): ${url}`);
      return null;
    }

    const filePath = path.join(imageDir, `${hash}${ext}`);
    fs.writeFileSync(filePath, buffer);
    console.log(`[Image Download] Saved: ${hash}${ext} (${(buffer.length / 1024).toFixed(0)}KB)`);

    return `/images/news/${hash}${ext}`;
  } catch (error) {
    console.error(`[Image Download] Failed to download ${url}:`, error.message);
    return null;
  }
}

// Soompi 이미지 URL을 로컬 이미지 경로로 변환
async function convertSoompiImageToProxy(soompiImageUrl) {
  if (!soompiImageUrl) return null;

  // 이미 로컬 이미지면 그대로 반환
  if (soompiImageUrl.startsWith('/images/')) {
    return soompiImageUrl;
  }

  // 이미 해시 프록시 URL이면 로컬 이미지로 변환 시도
  if (soompiImageUrl.startsWith('/api/proxy/hash-image')) {
    return soompiImageUrl; // 기존 URL은 hash-image API가 처리 (점진적 마이그레이션)
  }

  // 외부 이미지 URL인 경우 다운로드 후 hash-image URL 반환
  if (soompiImageUrl.startsWith('http://') || soompiImageUrl.startsWith('https://')) {
    const hash = createImageHash(soompiImageUrl);

    // DB에 해시 저장
    await saveImageHash(soompiImageUrl, hash);

    // 이미지를 디스크에 미리 다운로드 (hash-image API에서 디스크 캐시로 즉시 응답)
    await downloadImageToDisk(soompiImageUrl, hash);

    return `/api/proxy/hash-image?hash=${hash}`;
  }

  return soompiImageUrl;
}

// 기사 내용에 마침표 뒤 줄바꿈 추가 유틸리티 함수
function addLineBreakAfterPeriods(htmlContent) {
  try {
    const $ = cheerio.load(htmlContent);
    
    // 각 단락(p 태그)에 대해 처리
    $('p').each(function(i, elem) {
      const paragraphText = $(this).html();
      if (!paragraphText) return;
      
      // 문장을 마침표로 분리 (단, HTML 태그 내부의 마침표는 제외)
      let sentences = [];
      let currentPos = 0;
      let inTag = false;
      let currentSentence = '';
      
      for (let i = 0; i < paragraphText.length; i++) {
        const char = paragraphText[i];
        currentSentence += char;
        
        // HTML 태그 안인지 밖인지 추적
        if (char === '<') inTag = true;
        else if (char === '>') inTag = false;
        
        // 마침표를 만나고, 태그 내부가 아니고, 다음 문자가 공백이거나 태그의 시작일 때
        if (char === '.' && !inTag && 
            (i + 1 >= paragraphText.length || 
             paragraphText[i + 1] === ' ' || 
             paragraphText[i + 1] === '\t' || 
             paragraphText[i + 1] === '<')) {
          
          sentences.push(currentSentence);
          currentSentence = '';
        }
      }
      
      // 마지막 문장이 남아있다면 추가
      if (currentSentence.trim()) {
        sentences.push(currentSentence);
      }
      
      // 문장이 하나 이상이면 각 문장을 별도의 p 태그로 분리
      if (sentences.length > 1) {
        const newHtml = sentences.map(s => `<p>${s.trim()}</p>`).join('\n\n');
        $(this).replaceWith(newHtml);
      }
    });
    
    return $.html();
  } catch (error) {
    console.error('addLineBreakAfterPeriods 함수 오류:', error);
    // 오류 발생 시 원본 HTML 반환
    return htmlContent;
  }
}

// 기사 가독성을 위한 HTML 포맷팅 함수
function formatArticleForReadability(htmlContent) {
  if (!htmlContent) return htmlContent;
  
  let formattedContent = htmlContent;
  
  // 1. <p> 태그 사이에 명확한 줄바꿈 추가 (단락 구분을 위해)
  formattedContent = formattedContent.replace(/<\/p>\s*<p>/g, '</p>\n\n<p>');
  
  // 2. 빈 <p> 태그 제거
  formattedContent = formattedContent.replace(/<p>\s*<\/p>/gi, '');
  formattedContent = formattedContent.replace(/<p>&nbsp;<\/p>/gi, '');
  formattedContent = formattedContent.replace(/<p><br\s*\/?><\/p>/gi, '');
  
  // 3. <p> 태그 내부의 불필요한 <br> 태그를 공백으로 변환
  formattedContent = formattedContent.replace(/<p>([^<]*)<br\s*\/?>\s*([^<]*)<\/p>/gi, '<p>$1 $2</p>');
  
  // 3.5. <ol>과 <ul> 태그 사이에 적절한 줄바꿈 추가
  formattedContent = formattedContent.replace(/<\/ol>\s*<p>/g, '</ol>\n\n<p>');
  formattedContent = formattedContent.replace(/<\/p>\s*<ol>/g, '</p>\n\n<ol>');
  formattedContent = formattedContent.replace(/<\/ul>\s*<p>/g, '</ul>\n\n<p>');
  formattedContent = formattedContent.replace(/<\/p>\s*<ul>/g, '</p>\n\n<ul>');
  
  // 4. 모든 <hr> 회색줄 완전 제거 (강화)
  formattedContent = formattedContent.replace(/<hr[^>]*>/gi, '');
  formattedContent = formattedContent.replace(/<hr\s*\/?>/gi, '');
  formattedContent = formattedContent.replace(/<hr>/gi, '');
  
  // 5. 기사 맨 마지막의 <hr> 및 관련 요소들 제거
  formattedContent = formattedContent.replace(/\s*<hr[^>]*>\s*$/gi, '');
  formattedContent = formattedContent.replace(/\s*<hr\s*\/?>\s*$/gi, '');
  
  // 6. 연속된 줄바꿈 정리 (3개 이상의 연속 줄바꿈을 2개로 제한)
  formattedContent = formattedContent.replace(/\n{3,}/g, '\n\n');
  
  // 7. 시작과 끝의 불필요한 줄바꿈 제거
  formattedContent = formattedContent.trim();
  
  return formattedContent;
}

// 카테고리별 작성자 이름 생성 함수 (이름만 표출)
function generateAuthorByCategory(category) {
  const authorsByCategory = {
    'kpop': [
      'Sarah',
      'Michael',
      'Jessica',
      'David',
      'Emma',
      'Ryan'
    ],
    'drama': [
      'Jennifer',
      'James',
      'Sophie',
      'Daniel',
      'Grace',
      'Alex'
    ],
    'movie': [
      'Rachel',
      'Kevin',
      'Lily',
      'Steven',
      'Mia',
      'Eric'
    ],
    'variety': [
      'Chloe',
      'Tyler',
      'Zoe',
      'Noah',
      'Aria',
      'Lucas'
    ],
    'celeb': [
      'Olivia',
      'Ethan',
      'Ava',
      'Mason',
      'Isabella',
      'Logan'
    ]
  };
  
  // 카테고리에 맞는 작성자 목록에서 랜덤 선택
  const categoryAuthors = authorsByCategory[category] || authorsByCategory['kpop'];
  const randomIndex = Math.floor(Math.random() * categoryAuthors.length);
  return categoryAuthors[randomIndex];
}

// Instagram 텍스트를 임베드 코드로 변환하는 함수
function convertInstagramTextToEmbed(htmlContent) {
  if (!htmlContent) return htmlContent;
  
  let convertedContent = htmlContent;
  
  console.log('[convertInstagramTextToEmbed] 시작 - content 길이:', convertedContent.length);
  
  // Instagram URL 찾기
  const instagramUrlPattern = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/g;
  const instagramUrls = [...convertedContent.matchAll(instagramUrlPattern)];
  
  if (instagramUrls.length === 0) {
    console.log('[convertInstagramTextToEmbed] Instagram URL이 없음');
    return convertedContent;
  }
  
  console.log(`[convertInstagramTextToEmbed] ${instagramUrls.length}개의 Instagram URL 발견`);
  
  // 각 Instagram URL에 대해 처리
  instagramUrls.forEach((urlMatch, index) => {
    const instagramUrl = urlMatch[0];
    const postId = urlMatch[1];
    
    console.log(`[convertInstagramTextToEmbed] Instagram URL ${index + 1} 처리:`, instagramUrl);
    
    // 표준 Instagram 임베드 코드 생성
    const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${instagramUrl}" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">
<div style="padding:16px;">
<a href="${instagramUrl}" style="background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank">
<div style=" display: flex; flex-direction: row; align-items: center;">
<div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div>
<div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;">
<div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div>
<div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div>
</div>
</div>
<div style="padding: 19% 0;"></div>
<div style="display:block; height:50px; margin:0 auto 12px; width:50px;">
<svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink">
<g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
<g transform="translate(-511.000000, -20.000000)" fill="#000000">
<g>
<path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path>
</g>
</g>
</g>
</svg>
</div>
<div style="padding-top: 8px;">
<div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;"></div>
</div>
<div style="padding: 12.5% 0;"></div>
<div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;">
<div>
<div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div>
<div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div>
<div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div>
</div>
<div style="margin-left: 8px;">
<div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div>
<div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div>
</div>
<div style="margin-left: auto;">
<div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div>
<div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div>
<div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div>
</div>
</div>
<div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;">
<div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div>
<div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div>
</div>
</a>
<p><a href="${instagramUrl}" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"></a></p>
<p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="${instagramUrl}" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank"></a></p>
</div>
</blockquote>`;

    // 이미 Instagram 임베드 코드가 있는지 확인
    if (convertedContent.includes('instagram-media')) {
      console.log('[convertInstagramTextToEmbed] 이미 Instagram 임베드 코드 존재, 텍스트만 정리');
      // 기존 임베드는 유지하고 텍스트만 제거
      convertedContent = convertedContent.replace(/View this post on Instagram/gi, '');
      convertedContent = convertedContent.replace(/A post shared by[^<\n\)]*[\)\n]?/gi, '');
      return convertedContent;
    }
    
    // 다양한 Instagram 텍스트 패턴들을 찾아서 임베드 코드로 교체
    const textPatterns = [
      // 패턴 1: blockquote 전체
      /<blockquote[^>]*>[\s\S]*?View this post on Instagram[\s\S]*?<\/blockquote>/gi,
      // 패턴 2: > 형태의 인용문
      />\s*View this post on Instagram[\s\S]*?A post shared by[^<\n]*[\)\n]/gi,
      // 패턴 3: 단순 텍스트 (여러 줄)
      /View this post on Instagram[\s\S]*?A post shared by[^\n\)]*[\)\n]?/gi,
      // 패턴 4: p 태그들로 분리된 형태
      /<p[^>]*>\s*View this post on Instagram\s*<\/p>[\s\S]*?<p[^>]*>\s*A post shared by[^<]*<\/p>/gi,
      // 패턴 5: 단일 p 태그에 모든 내용
      /<p[^>]*>\s*View this post on Instagram[\s\S]*?A post shared by[^<]*<\/p>/gi
    ];
    
    let replaced = false;
    for (let i = 0; i < textPatterns.length; i++) {
      const pattern = textPatterns[i];
      const matches = convertedContent.match(pattern);
      
      if (matches && matches.length > 0) {
        console.log(`[convertInstagramTextToEmbed] 패턴 ${i + 1} 매칭 성공:`, matches[0].substring(0, 150) + '...');
        convertedContent = convertedContent.replace(pattern, embedCode);
        replaced = true;
        break;
      }
    }
    
    // 패턴 매칭이 실패한 경우, Instagram URL 주변의 텍스트를 강제로 제거하고 임베드 추가
    if (!replaced) {
      console.log(`[convertInstagramTextToEmbed] 패턴 매칭 실패, 강제 변환 시도`);
      
      // Instagram URL을 찾아서 그 주변의 텍스트를 제거
      const urlIndex = convertedContent.indexOf(instagramUrl);
      if (urlIndex !== -1) {
        // Instagram URL 앞뒤 500자 범위에서 관련 텍스트 찾기
        const beforeText = convertedContent.substring(Math.max(0, urlIndex - 500), urlIndex);
        const afterText = convertedContent.substring(urlIndex + instagramUrl.length, Math.min(convertedContent.length, urlIndex + instagramUrl.length + 500));
        
        // "View this post"가 있는 위치부터 "A post shared by" 이후까지 제거
        const viewPostIndex = beforeText.lastIndexOf('View this post');
        const sharedByMatch = afterText.match(/A post shared by[^<\n\)]*[\)\n]?/);
        
        if (viewPostIndex !== -1 && sharedByMatch) {
          const startIndex = urlIndex - (beforeText.length - viewPostIndex);
          const endIndex = urlIndex + instagramUrl.length + sharedByMatch.index + sharedByMatch[0].length;
          
          const beforePart = convertedContent.substring(0, startIndex);
          const afterPart = convertedContent.substring(endIndex);
          
          convertedContent = beforePart + embedCode + afterPart;
          console.log('[convertInstagramTextToEmbed] 강제 변환 완료');
          replaced = true;
        }
      }
    }
    
    if (!replaced) {
      console.log(`[convertInstagramTextToEmbed] Instagram URL ${instagramUrl}에 대한 텍스트 변환 실패`);
    }
  });
  
  // 추가 정리: 남아있는 Instagram 관련 텍스트 제거
  convertedContent = convertedContent.replace(/View this post on Instagram/gi, '');
  convertedContent = convertedContent.replace(/A post shared by[^<\n\)]*[\)\n]?/gi, '');
  convertedContent = convertedContent.replace(/<p[^>]*>\s*<\/p>/gi, ''); // 빈 p 태그 제거
  convertedContent = convertedContent.replace(/\s*\n\s*\n\s*/g, '\n\n'); // 연속된 줄바꿈 정리
  
  console.log('[convertInstagramTextToEmbed] 완료 - 최종 content 길이:', convertedContent.length);
  return convertedContent.trim();
}

// Twitter(X) 텍스트를 임베드 코드로 변환하는 함수
function convertTwitterTextToEmbed(htmlContent) {
  if (!htmlContent) return htmlContent;
  
  let convertedContent = htmlContent;
  
  console.log('[convertTwitterTextToEmbed] 시작 - content 길이:', convertedContent.length);
  
  // Twitter/X URL 찾기 (다양한 패턴 지원)
  const twitterUrlPattern = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(?:@)?([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)/g;
  const twitterUrls = [...convertedContent.matchAll(twitterUrlPattern)];
  
  if (twitterUrls.length === 0) {
    console.log('[convertTwitterTextToEmbed] Twitter/X URL이 없음');
    return convertedContent;
  }
  
  console.log(`[convertTwitterTextToEmbed] ${twitterUrls.length}개의 Twitter/X URL 발견`);
  
  // 각 Twitter URL에 대해 처리
  twitterUrls.forEach((urlMatch, index) => {
    const twitterUrl = urlMatch[0];
    const username = urlMatch[1];
    const tweetId = urlMatch[2];
    
    console.log(`[convertTwitterTextToEmbed] Twitter/X URL ${index + 1} 처리:`, twitterUrl);
    
    // Twitter 임베드 코드 생성 (개선된 버전)
    const embedCode = `<blockquote class="twitter-tweet" data-lang="ko" data-theme="light" data-dnt="true" style="margin: 20px auto; max-width: 550px;">
<p lang="ko" dir="ltr">트위터 게시물을 로드하는 중...</p>
<a href="${twitterUrl}" target="_blank" rel="noopener noreferrer">트위터에서 보기</a>
</blockquote>`;
    
    // URL을 임베드 코드로 교체
    convertedContent = convertedContent.replace(twitterUrl, embedCode);
    console.log(`[convertTwitterTextToEmbed] Twitter/X URL ${index + 1} 변환 완료`);
  });
  
  console.log('[convertTwitterTextToEmbed] 완료 - 최종 content 길이:', convertedContent.length);
  return convertedContent.trim();
}

// Source 내용 제거 함수
function removeSourceContent(htmlContent) {
  if (!htmlContent) return htmlContent;
  
  let cleanedContent = htmlContent;
  
  // 3. 숨피 뉴스 하단 source 내용 크롤링 영역 주석처리
  // "Source" 텍스트를 포함한 p 태그를 주석으로 변환
  cleanedContent = cleanedContent.replace(/<p[^>]*>Source(?:\s*\(\d+\))?:?.*?<\/p>/gi, '<!-- Source information removed for readability -->');
  
  // "Source:" 로 시작하는 모든 p 태그 주석 처리
  cleanedContent = cleanedContent.replace(/<p[^>]*>Source:.*?<\/p>/gi, '<!-- Source information removed for readability -->');
  
  return cleanedContent;
}

// Puppeteer를 사용한 동적 크롤링 함수
async function scrapeSoompiNewsWithPuppeteer(maxItemsLimit = 50) {
  forceLog(`!!!!! 함수 진입 확인: maxItemsLimit=${maxItemsLimit} !!!!!`);
  forceLog(`!!!!! maxItemsLimit 타입: ${typeof maxItemsLimit} !!!!!`);
  forceLog(`!!!!! maxItemsLimit 값: ${JSON.stringify(maxItemsLimit)} !!!!!`);
  let browser;
  try {
    logDebug('Puppeteer 크롤링 시작...');
    forceLog('=== Puppeteer 크롤링 시작 ===');
    forceLog(`=== DEBUG: Puppeteer 함수 진입, maxItemsLimit=${maxItemsLimit} ===`);
    
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
    
    // 페이지 로드
    logDebug('https://www.soompi.com/ 접속 시도...');
    forceLog('https://www.soompi.com/ 접속 시도...');
    await page.goto('https://www.soompi.com/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    logDebug('페이지 로드 완료');
    forceLog('페이지 로드 완료');
    
    // 페이지 제목 확인
    const pageTitle = await page.title();
    forceLog(`페이지 제목: ${pageTitle}`);
    
    // 결과를 저장할 배열
    const newsItems = [];
    
    // 현재 페이지의 뉴스 링크와 이미지 수집
    const currentNewsLinks = await page.evaluate(() => {
      const links = [];
      
      // 간단한 셀렉터들로 뉴스 링크 찾기
      const selectors = [
        'a[href*="/article/"]',         // /article/ 포함하는 모든 링크
        'a[href*="soompi.com/article"]', // soompi.com/article 포함하는 모든 링크
        'h4.media-heading a',           // 기존 셀렉터
        'h3 a',                         // h3 태그 내 링크
        'h2 a',                         // h2 태그 내 링크
        '.entry-title a',               // WordPress 스타일
        '.post-title a',                // 포스트 제목
        'article a',                    // article 태그 내 링크
        '.news-item a',                 // 뉴스 아이템
        '.article-title a'              // 기사 제목
      ];
      
      console.log('=== 셀렉터 테스트 시작 ===');
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`셀렉터 "${selector}"에서 ${elements.length}개 요소 발견`);
        
        elements.forEach((link, index) => {
          const title = link.textContent.trim();
          const url = link.href;
          
          console.log(`링크 ${index + 1}: title="${title}", url="${url}"`);
          
          // 유효한 뉴스 링크인지 확인
          if (title && url && 
              url.includes('soompi.com') && 
              url.includes('/article/') &&
              title.length > 5 && 
              !links.some(existing => existing.url === url)) {
            
            // 이미지 찾기 - 링크 내부 또는 인근 이미지
            let thumbnailUrl = '';
            
            // 1. 링크 내부 img 태그
            const imgInLink = link.querySelector('img');
            if (imgInLink && imgInLink.src) {
              thumbnailUrl = imgInLink.src;
            }
            
            // 2. 링크의 부모/형제 요소에서 이미지 찾기
            if (!thumbnailUrl) {
              const parent = link.closest('article, .post, .news-item, div[class*="article"], div[class*="post"]');
              if (parent) {
                const nearbyImg = parent.querySelector('img');
                if (nearbyImg && nearbyImg.src) {
                  thumbnailUrl = nearbyImg.src;
                }
              }
            }
            
            // 3. 형제 요소에서 이미지 찾기
            if (!thumbnailUrl && link.previousElementSibling) {
              const prevImg = link.previousElementSibling.querySelector('img');
              if (prevImg && prevImg.src) {
                thumbnailUrl = prevImg.src;
              }
            }
            
            if (!thumbnailUrl && link.nextElementSibling) {
              const nextImg = link.nextElementSibling.querySelector('img');
              if (nextImg && nextImg.src) {
                thumbnailUrl = nextImg.src;
              }
            }
            
            links.push({ 
              title, 
              url, 
              thumbnailUrl: thumbnailUrl || '',
              index, 
              selector 
            });
            console.log(`유효한 링크 추가: "${title}"`);
          }
        });
        
        // 충분한 링크를 찾았으면 중단 (제한을 늘림) - evaluate 함수 밖에서 처리
      }
      
      console.log(`총 ${links.length}개의 유효한 링크 발견`);
      return links;
    });
    
    forceLog(`currentNewsLinks 개수: ${currentNewsLinks.length}`);
    logDebug(`currentNewsLinks 개수: ${currentNewsLinks.length}`);
    logDebug(`현재 페이지에서 ${currentNewsLinks.length}개 뉴스 링크 발견`);
    
    // 링크가 너무 많으면 잘라내기 (첫 페이지에서는 적당히)
    const initialLinkLimit = Math.min(maxItemsLimit * 2, 100);
    const limitedCurrentNewsLinks = currentNewsLinks.slice(0, initialLinkLimit);
    if (currentNewsLinks.length > initialLinkLimit) {
      forceLog(`첫 페이지 링크를 ${currentNewsLinks.length}개에서 ${initialLinkLimit}개로 제한`);
    }
    
    // 새로운 뉴스 링크만 추가
    for (const link of limitedCurrentNewsLinks) {
      if (newsItems.length >= maxItemsLimit) break;
      
      // 제목 필터링 확인
      if (shouldSkipNews(link.title)) {
        forceLog(`뉴스 제외됨: "${link.title}"`);
        continue;
      }
      
      // 중복 확인
      if (!newsItems.some(item => item.articleUrl === link.url)) {
        const timeText = 'Recently';
        
        // 이미지 URL을 프록시 URL로 변환
        let proxyThumbnailUrl = '';
        if (link.thumbnailUrl) {
          proxyThumbnailUrl = `/api/proxy/image?url=${encodeURIComponent(link.thumbnailUrl)}`;
          forceLog(`🖼️ 홈페이지 이미지 프록시 변환: ${link.thumbnailUrl} → ${proxyThumbnailUrl}`);
        }
        
        // 카테고리 추출
        let category = '';
        if (link.url && link.url.includes('/category/')) {
          const categoryMatch = link.url.match(/\/category\/([^\/]+)/);
          if (categoryMatch && categoryMatch[1]) {
            category = categoryMatch[1];
          }
        }
        
        try {
          const newsItem = await createNewsItem(link.title, link.url, proxyThumbnailUrl, category, timeText, newsItems.length);
          newsItems.push(newsItem);
          logDebug(`뉴스 링크 추가: title="${link.title}", slug="${newsItem.slug}"`);
          forceLog(`뉴스 링크 추가: "${link.title}"`);
        } catch (error) {
          logDebug(`뉴스 아이템 생성 실패: ${link.title}`, error);
          forceLog(`뉴스 아이템 생성 실패: ${link.title} - ${error.message}`);
        }
      }
    }
    
    logDebug(`총 ${newsItems.length}개의 뉴스 항목을 찾았습니다.`);
    forceLog(`총 ${newsItems.length}개의 뉴스 항목을 찾았습니다.`);
    forceLog(`=== 추가 뉴스 수집 시작 ===`);
    forceLog(`현재 newsItems.length: ${newsItems.length}, maxItemsLimit: ${maxItemsLimit}`);
    forceLog(`조건 체크: newsItems.length < maxItemsLimit = ${newsItems.length < maxItemsLimit}`);
    
    // /latest 페이지에서 Load More 기능을 사용하여 더 많은 뉴스 수집
    if (newsItems.length < maxItemsLimit) {
      forceLog(`=== /latest 페이지 Load More 크롤링 시작 ===`);
      
      try {
        await page.goto('https://www.soompi.com/latest', { waitUntil: 'networkidle2', timeout: 30000 });
        forceLog('/latest 페이지 로드 완료');
        
        let latestAttempt = 0;
        const maxLatestAttempts = Math.ceil((maxItemsLimit - newsItems.length) / 15); // 15개씩 로드
        
        forceLog(`/latest Load More 시작: 현재 ${newsItems.length}개, 목표 ${maxItemsLimit}개, 최대 ${maxLatestAttempts}번 시도`);
        
        while (latestAttempt < maxLatestAttempts && newsItems.length < maxItemsLimit) {
          latestAttempt++;
          
                     // 현재 페이지의 뉴스 링크와 이미지 수집
           const latestNewsLinks = await page.evaluate(() => {
             const links = [];
             
             // 뉴스 링크와 이미지를 함께 수집
             document.querySelectorAll('a').forEach(link => {
               if (link.href && 
                   link.href.includes('soompi.com') && 
                   link.href.includes('/article/')) {
                 const title = link.textContent?.trim() || '';
                 
                 if (title.length > 3) {
                   // 이미지 찾기 - 링크 내부 또는 인근 이미지
                   let thumbnailUrl = '';
                   
                   // 1. 링크 내부 img 태그
                   const imgInLink = link.querySelector('img');
                   if (imgInLink && imgInLink.src) {
                     thumbnailUrl = imgInLink.src;
                   }
                   
                   // 2. 링크의 부모/형제 요소에서 이미지 찾기
                   if (!thumbnailUrl) {
                     const parent = link.closest('article, .post, .news-item, div[class*="article"], div[class*="post"]');
                     if (parent) {
                       const nearbyImg = parent.querySelector('img');
                       if (nearbyImg && nearbyImg.src) {
                         thumbnailUrl = nearbyImg.src;
                       }
                     }
                   }
                   
                   // 3. 형제 요소에서 이미지 찾기
                   if (!thumbnailUrl && link.previousElementSibling) {
                     const prevImg = link.previousElementSibling.querySelector('img');
                     if (prevImg && prevImg.src) {
                       thumbnailUrl = prevImg.src;
                     }
                   }
                   
                   if (!thumbnailUrl && link.nextElementSibling) {
                     const nextImg = link.nextElementSibling.querySelector('img');
                     if (nextImg && nextImg.src) {
                       thumbnailUrl = nextImg.src;
                     }
                   }
                   
                   links.push({ 
                     title, 
                     url: link.href, 
                     thumbnailUrl: thumbnailUrl || '' 
                   });
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
          
          forceLog(`/latest 시도 ${latestAttempt}: ${latestNewsLinks.length}개 뉴스 링크 발견`);
          
          // 새로운 뉴스만 추가
          let addedFromLatest = 0;
          for (const link of latestNewsLinks) {
            if (newsItems.length >= maxItemsLimit) break;
            
            // 제목 필터링 확인
            if (shouldSkipNews(link.title)) {
              forceLog(`/latest에서 뉴스 제외됨: "${link.title}"`);
              continue;
            }
            
            if (!newsItems.some(item => item.articleUrl === link.url)) {
              try {
                // 이미지 URL을 프록시 URL로 변환
                let proxyThumbnailUrl = '';
                if (link.thumbnailUrl) {
                  // 프록시 URL로 변환
                  proxyThumbnailUrl = `/api/proxy/image?url=${encodeURIComponent(link.thumbnailUrl)}`;
                  forceLog(`🖼️ 이미지 프록시 변환: ${link.thumbnailUrl} → ${proxyThumbnailUrl}`);
                }
                
                const newsItem = await createNewsItem(link.title, link.url, proxyThumbnailUrl, '', 'Recently', newsItems.length);
                newsItems.push(newsItem);
                addedFromLatest++;
                forceLog(`/latest에서 새 뉴스 추가 [총 ${newsItems.length}개]: "${link.title}"`);
              } catch (error) {
                forceLog(`뉴스 아이템 생성 실패: ${link.title} - ${error.message}`);
              }
            }
          }
          
          forceLog(`/latest 시도 ${latestAttempt}에서 ${addedFromLatest}개 새 뉴스 추가됨 (총 ${newsItems.length}개)`);
          
          // 목표 달성하거나 더 이상 클릭할 수 없으면 중단
          if (newsItems.length >= maxItemsLimit || latestAttempt >= maxLatestAttempts) {
            forceLog(`/latest 크롤링 완료: ${newsItems.length}개 (목표: ${maxItemsLimit}개)`);
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
            forceLog(`🎯 /latest ${loadMoreResult}`);
            
            // 로딩 대기
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 새로운 콘텐츠 로딩 대기
            try {
              await page.waitForFunction((previousCount) => {
                const current = document.querySelectorAll('a[href*="/article/"]').length;
                return current > previousCount;
              }, { timeout: 10000 }, latestNewsLinks.length);
              
              forceLog('✅ /latest 새 콘텐츠 로딩 완료');
            } catch (e) {
              forceLog('⏰ /latest 새 콘텐츠 로딩 대기 시간 초과');
            }
            
          } else {
            forceLog('❌ /latest Load More 버튼을 찾을 수 없음 - 완료');
            break;
          }
        }
        
        forceLog(`/latest Load More 크롤링 완료: 총 ${newsItems.length}개 뉴스 수집`);
        
      } catch (latestError) {
        forceLog(`/latest 페이지 크롤링 실패: ${latestError.message}`);
      }
    }
    forceLog(`=== 추가 페이지 크롤링 시작 ===`);
    
    // 여러 페이지에서 더 많은 뉴스 수집
    if (newsItems.length < maxItemsLimit) {
      forceLog(`추가 페이지 크롤링 시작: 현재 ${newsItems.length}개, 목표 ${maxItemsLimit}개`);
      
      const additionalPages = [
        'https://www.soompi.com/k-pop',
        'https://www.soompi.com/k-dramas', 
        'https://www.soompi.com/page/2',
        'https://www.soompi.com/page/3'
      ];
      
             for (const pageUrl of additionalPages) {
         if (newsItems.length >= maxItemsLimit) break;
         
         forceLog(`=== ${pageUrl} 페이지 크롤링 시작 ===`);
         
         try {
           await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
           forceLog(`${pageUrl} 페이지 로드 완료`);
           
           // 해당 페이지의 뉴스 링크 수집
           const pageNewsLinks = await page.evaluate(() => {
             const links = [];
             document.querySelectorAll('a').forEach(link => {
               if (link.href && 
                   link.href.includes('soompi.com') && 
                   link.href.includes('/article/')) {
                 const title = link.textContent?.trim() || '';
                 const url = link.href;
                 
                 if (title.length > 3) {
                   links.push({ title, url });
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
           
           forceLog(`${pageUrl}에서 ${pageNewsLinks.length}개 뉴스 링크 발견`);
           
           // 새로운 뉴스만 추가
           let addedFromPage = 0;
           for (const link of pageNewsLinks) {
             if (newsItems.length >= maxItemsLimit) break;
             
             // 제목 필터링 확인
             if (shouldSkipNews(link.title)) {
               forceLog(`${pageUrl}에서 뉴스 제외됨: "${link.title}"`);
               continue;
             }
             
             if (!newsItems.some(item => item.articleUrl === link.url)) {
               try {
                                       const newsItem = await createNewsItem(link.title, link.url, '', '', 'Recently', newsItems.length);
                                newsItems.push(newsItem);
                addedFromPage++;
                forceLog(`${pageUrl}에서 새 뉴스 추가 [총 ${newsItems.length}개]: "${link.title}"`);
              } catch (error) {
                forceLog(`뉴스 아이템 생성 실패: ${link.title} - ${error.message}`);
              }
            }
          }
          
          forceLog(`${pageUrl}에서 ${addedFromPage}개 새 뉴스 추가됨 (총 ${newsItems.length}개)`);
          
        } catch (pageError) {
          forceLog(`${pageUrl} 크롤링 실패: ${pageError.message}`);
        }
      }
      
      forceLog(`추가 페이지 크롤링 완료: 최종 ${newsItems.length}개 뉴스 수집`);
    } else {
      forceLog(`목표 달성: ${newsItems.length}개 >= ${maxItemsLimit}개`);
    }
    
    // 브라우저 종료
    if (browser) {
      try {
        await browser.close();
        logDebug('Puppeteer 브라우저 종료');
        forceLog('Puppeteer 브라우저 종료');
      } catch (closeError) {
        logDebug('브라우저 종료 중 오류:', closeError);
        forceLog(`브라우저 종료 중 오류: ${closeError.message}`);
      }
    }
    
    return newsItems;
    
  } catch (error) {
    logDebug('Puppeteer 크롤링 중 오류:', error);
    forceLog(`Puppeteer 크롤링 중 오류: ${error.message}`);
    console.error('Puppeteer 오류 상세:', error);
    console.error('Puppeteer 오류 스택:', error.stack);
    
    // 에러 발생 시에도 브라우저 종료
    if (browser) {
      try {
        await browser.close();
        logDebug('에러 발생 시 Puppeteer 브라우저 종료');
        forceLog('에러 발생 시 Puppeteer 브라우저 종료');
      } catch (closeError) {
        logDebug('에러 시 브라우저 종료 중 오류:', closeError);
        forceLog(`에러 시 브라우저 종료 중 오류: ${closeError.message}`);
      }
    }
    
    return [];
  }
}

// 기존 정적 크롤링 함수 (백업용)
async function scrapeSoompiNewsStatic(maxItemsLimit = 50) {
  try {
    logDebug('정적 크롤링 시작...');
    forceLog('=== 정적 크롤링 시작 ===');
    
    // 웹사이트 HTML 가져오기 - 올바른 URL 사용
    logDebug('https://www.soompi.com/latest 접속 시도...');
    forceLog('https://www.soompi.com/latest 접속 시도...');
    
    try {
      const response = await axios.get('https://www.soompi.com/latest', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000 // 10초 타임아웃
      });
      
      forceLog('axios 요청 성공');
      
      const html = response.data;
      
      logDebug(`HTML 데이터 가져옴, 길이: ${html?.length}`);
      forceLog(`HTML 데이터 가져옴, 길이: ${html?.length}`);
      
      if (!html || html.length < 1000) {
        logDebug('HTML 데이터가 너무 짧습니다. 차단되었을 수 있습니다.');
        forceLog('HTML 데이터가 너무 짧습니다. 차단되었을 수 있습니다.');
        return [];
      }
      
      // cheerio로 HTML 파싱
      forceLog('cheerio 로드 시작...');
      const $ = cheerio.load(html);
      forceLog('cheerio 로드 완료');
      
      // HTML 구조 디버깅
      logDebug('페이지 제목: ' + $('title').text());
      forceLog('페이지 제목: ' + $('title').text());
      
      // 결과를 저장할 배열
      const newsItems = [];
      
      // 올바른 셀렉터로 뉴스 링크 찾기
      forceLog('뉴스 링크 검색 시작...');
      const newsLinks = $('.col-sm-12.col-md-4 .media-heading a');
      logDebug(`뉴스 링크 수: ${newsLinks.length}`);
      forceLog(`뉴스 링크 수: ${newsLinks.length}`);
      
      // 개별 뉴스 링크 처리
      if (newsLinks.length > 0) {
        logDebug('=== 개별 뉴스 링크 처리 시작 ===');
        forceLog('=== 개별 뉴스 링크 처리 시작 ===');
        
        const linkElements = newsLinks.toArray();
        for (let i = 0; i < linkElements.length; i++) {
          try {
            const link = linkElements[i];
            const $link = $(link);
            
            // 제목과 URL 추출
            const title = $link.text().trim();
            const url = $link.attr('href');
            
            logDebug(`링크 ${i+1}: title="${title}", url="${url}"`);
            
            // 제목 필터링 확인
            if (shouldSkipNews(title)) {
              forceLog(`정적 크롤링에서 뉴스 제외됨: "${title}"`);
              continue;
            }
            
            // 이미 수집된 URL인지 확인
            if (url && title && !newsItems.some(item => item.articleUrl === url)) {
              // 시간 정보 추출
              const $parent = $link.closest('.col-sm-12.col-md-4');
              const timeText = $parent.find('.date-time').text().trim() || 'Recently';
              
              // 썸네일 이미지 추출
              const thumbnailUrl = $parent.find('.thumbnail-wrapper img').attr('src') || '';
              
              // 카테고리 추출 (URL에서)
              let category = '';
              if (url && url.includes('/category/')) {
                const categoryMatch = url.match(/\/category\/([^\/]+)/);
                if (categoryMatch && categoryMatch[1]) {
                  category = categoryMatch[1];
                }
              }
              
              const newsItem = await createNewsItem(title, url, thumbnailUrl, category, timeText, i);
              newsItems.push(newsItem);
              logDebug(`뉴스 링크 추가 (항목 ${i+1}): title="${title}", slug="${newsItem.slug}"`);
              forceLog(`뉴스 링크 추가 (항목 ${i+1}): title="${title}", slug="${newsItem.slug}"`);
            } else {
              logDebug(`링크 ${i+1} 스킵: ${url && title ? '중복 URL' : '제목 또는 URL 없음'}`);
            }
            
            // 최대 아이템 수 제한 도달 시 루프 중단
            if (newsItems.length >= maxItemsLimit) {
              logDebug(`최대 아이템 수(${maxItemsLimit}) 도달, 루프 중단`);
              forceLog(`최대 아이템 수(${maxItemsLimit}) 도달, 루프 중단`);
              break;
            }
          } catch (itemError) {
            logDebug('뉴스 링크 파싱 중 오류:', itemError);
            forceLog('뉴스 링크 파싱 중 오류: ' + itemError.message);
          }
        }
        logDebug('=== 개별 뉴스 링크 처리 완료 ===');
        forceLog('=== 개별 뉴스 링크 처리 완료 ===');
      } else {
        logDebug('.col-sm-12.col-md-4 .media-heading a 셀렉터로 뉴스 링크를 찾을 수 없음');
        forceLog('.col-sm-12.col-md-4 .media-heading a 셀렉터로 뉴스 링크를 찾을 수 없음');
        
        // 백업 셀렉터 시도
        const backupLinks = $('h4.media-heading a');
        logDebug(`백업 셀렉터로 찾은 뉴스 링크 수: ${backupLinks.length}`);
        forceLog(`백업 셀렉터로 찾은 뉴스 링크 수: ${backupLinks.length}`);
        
        if (backupLinks.length > 0) {
          const backupElements = backupLinks.toArray();
          for (let i = 0; i < backupElements.length; i++) {
            try {
              const link = backupElements[i];
              const $link = $(link);
              const title = $link.text().trim();
              const url = $link.attr('href');
              
              // 제목 필터링 확인
              if (shouldSkipNews(title)) {
                forceLog(`백업 셀렉터에서 뉴스 제외됨: "${title}"`);
                continue;
              }
              
              if (url && title && !newsItems.some(item => item.articleUrl === url)) {
                const timeText = 'Recently';
                const thumbnailUrl = '';
                let category = '';
                
                if (url && url.includes('/category/')) {
                  const categoryMatch = url.match(/\/category\/([^\/]+)/);
                  if (categoryMatch && categoryMatch[1]) {
                    category = categoryMatch[1];
                  }
                }
                
                const newsItem = await createNewsItem(title, url, thumbnailUrl, category, timeText, i);
                newsItems.push(newsItem);
                forceLog(`백업 셀렉터로 뉴스 링크 추가 (항목 ${i+1}): title="${title}"`);
              }
              
              if (newsItems.length >= maxItemsLimit) {
                break;
              }
            } catch (itemError) {
              forceLog('백업 셀렉터 파싱 중 오류: ' + itemError.message);
            }
          }
        }
      }
      
      // 결과 로깅
      logDebug(`총 ${newsItems.length}개의 뉴스 항목을 찾았습니다.`);
      forceLog(`총 ${newsItems.length}개의 뉴스 항목을 찾았습니다.`);
      
      return newsItems;
      
    } catch (axiosError) {
      forceLog('axios 요청 실패: ' + axiosError.message);
      throw axiosError;
    }
    
  } catch (error) {
    logDebug('정적 뉴스 크롤링 중 오류:', error);
    forceLog('정적 뉴스 크롤링 중 오류: ' + error.message);
    forceLog('오류 스택: ' + error.stack);
    return [];
  }
}

// 기사 상세 페이지에서 내용과 태그 가져오기
export async function fetchArticleDetail(articleUrl) {
  let browser;
  
  // 서버 환경에서는 대체 크롤링을 먼저 시도
    console.log(`[fetchArticleDetail] 함수 호출됨: ${articleUrl}`);
    forceLog(`[fetchArticleDetail 시작] ${articleUrl}`);
    logDebug(`[fetchArticleDetail] 상세 페이지 크롤링 시작: ${articleUrl}`);
    forceLog(`[fetchArticleDetail] 상세 페이지 크롤링 시작: ${articleUrl}`);
    
  // 서버 환경에서는 대체 크롤링을 먼저 시도
  console.log('[fetchArticleDetail] 대체 크롤링 방식 우선 시도...');
  try {
    const fallbackResult = await fetchArticleDetailFallback(articleUrl);
    if (fallbackResult && fallbackResult.content && fallbackResult.content.length > 100) {
      console.log('[fetchArticleDetail] 대체 크롤링 성공');
      return fallbackResult;
    }
  } catch (fallbackError) {
    console.error('[fetchArticleDetail] 대체 크롤링 실패:', fallbackError.message);
  }
  
  // 대체 크롤링 실패 시에만 Puppeteer 시도
  console.log('[fetchArticleDetail] Puppeteer 크롤링 시도...');
  
  try {
    // 봇 차단 방지를 위한 랜덤 지연
    const randomDelay = Math.floor(Math.random() * 2000) + 500; // 0.5-2.5초로 단축
    console.log(`[fetchArticleDetail] 랜덤 지연 ${randomDelay}ms 적용`);
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    // Puppeteer 브라우저 시작 (서버 환경 최적화)
    console.log('[DEBUG] Puppeteer 브라우저 시작 시도...');
    browser = await puppeteer.launch({
      headless: true, // 'new' 대신 true 사용 (서버 호환성)
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-images',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-background-networking',
        '--disable-component-extensions-with-background-pages',
        '--disable-ipc-flooding-protection',
        '--memory-pressure-off',
        '--max_old_space_size=2048', // 메모리 제한 (서버 환경)
        '--single-process', // 단일 프로세스 모드 (서버 안정성)
        '--no-zygote',
        '--disable-accelerated-2d-canvas',
        '--disable-accelerated-jpeg-decoding',
        '--disable-accelerated-mjpeg-decode',
        '--disable-accelerated-video-decode',
        '--disable-canvas-aa',
        '--disable-2d-canvas-clip-aa',
        '--disable-gl-drawing-for-tests'
      ],
      timeout: 60000, // 60초로 감소 (서버 안정성)
      ignoreHTTPSErrors: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      defaultViewport: { width: 1024, height: 768 }, // 해상도 감소
      pipe: true // IPC 대신 pipe 사용 (서버 안정성)
    });
    
    const page = await browser.newPage();
    
    // 메모리 및 성능 최적화
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // 페이지 설정 최적화
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 추가 헤더 설정
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // 쿠키 및 로컬 스토리지 설정
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Chrome 객체 추가
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
      
      // 플러그인 정보 추가
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // 언어 설정
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ko-KR', 'ko', 'en'],
      });
    });
    
    // 페이지 로드 (재시도 로직 포함)
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`[DEBUG] 페이지 로딩 시도 ${retryCount + 1}/${maxRetries}: ${articleUrl}`);
        
    await page.goto(articleUrl, { 
          waitUntil: ['networkidle0', 'domcontentloaded'],
          timeout: 90000 // 90초로 증가
    });
    
        // 페이지 로딩 완료 후 추가 대기
    console.log('[DEBUG] 페이지 로딩 완료, 추가 대기 중...');
        await page.waitForTimeout(5000); // 5초 추가 대기
        
        // 페이지 내용 확인
        const pageContent = await page.content();
        if (pageContent && pageContent.length > 1000) {
          console.log('[DEBUG] 페이지 로딩 성공');
          break;
        } else {
          throw new Error('페이지 내용이 충분하지 않습니다');
        }
        
      } catch (error) {
        retryCount++;
        console.log(`[DEBUG] 페이지 로딩 실패 (시도 ${retryCount}/${maxRetries}):`, error.message);
        
        if (retryCount >= maxRetries) {
          throw error;
        }
        
        // 재시도 전 대기
        await page.waitForTimeout(3000);
      }
    }
    
    // 페이지 콘텐츠 가져오기
    const html = await page.content();
    const $ = cheerio.load(html);
    
    // HTML에 tags-container가 있는지 확인
    const hasTagsContainer = $('.tags-container').length > 0;
    logDebug(`[fetchArticleDetail] tags-container 존재: ${hasTagsContainer}`);
    if (!hasTagsContainer) {
      // HTML 샘플 로깅 (디버깅용)
      const htmlSample = html.substring(0, 500);
      logDebug(`[fetchArticleDetail] HTML 샘플: ${htmlSample}`);
      
      // article-info 영역 확인
      const articleInfo = $('.article-info').html();
      if (articleInfo) {
        logDebug(`[fetchArticleDetail] article-info HTML: ${articleInfo.substring(0, 300)}`);
      }
    }
    
    // 실제 기사 제목 추출
    let articleTitle = '';
    
    // 방법 1: 기사 정보 영역의 h1 태그
    const h1Title = $('.article-info h1, .article-wrapper h1, .article-section h1').first();
    if (h1Title.length) {
      articleTitle = h1Title.text().trim();
      logDebug(`h1 태그에서 추출한 기사 제목: ${articleTitle}`);
    }
    
    // 방법 2: 페이지 타이틀에서 추출
    if (!articleTitle) {
      const pageTitle = $('title').text().trim();
      // "- Soompi" 부분 제거
      const titleParts = pageTitle.split(' - ');
      if (titleParts.length > 0) {
        articleTitle = titleParts[0].trim();
        logDebug(`페이지 title에서 추출한 기사 제목: ${articleTitle}`);
      }
    }
    
    // 방법 3: meta 태그에서 추출
    if (!articleTitle || articleTitle === 'Trending Now') {
      const metaTitle = $('meta[property="og:title"]').attr('content');
      if (metaTitle) {
        articleTitle = metaTitle.trim();
        logDebug(`meta 태그에서 추출한 기사 제목: ${articleTitle}`);
      }
    }
    
    // "Trending Now"와 같은 섹션 제목이면 무시
    if (articleTitle === 'Trending Now' || articleTitle === 'Latest Articles' || articleTitle === 'Popular Articles') {
      articleTitle = '';
      logDebug('섹션 제목 감지: 제목을 재설정합니다');
    }
    
    // 태그 추출 개선 (실제 Soompi HTML 구조에 맞게 수정)
    const tags = [];
    
    // 방법 1: .article-tags 클래스 내부의 태그 항목 추출
    $('.article-tags .tag-item a').each((i, el) => {
      const tag = $(el).text().trim();
      if (tag) tags.push(tag);
    });
    
    // 방법 2: tags-container 내부의 새로운 구조에서 태그 추출
    if (tags.length === 0) {
      // 새로운 구조: .tags-container .uppercase.badges.tags a
      $('.tags-container .uppercase.badges.tags a, .tags-container .badges.tags a').each((i, el) => {
        const tag = $(el).text().trim();
        if (tag && !tag.includes('category')) {
          tags.push(tag);
          logDebug(`새로운 구조에서 태그 추출: ${tag}`);
        }
      });
    }
    
    // 방법 3: tags-container 내부의 일반적인 링크에서 태그 추출 (백업)
    if (tags.length === 0) {
      $('.tags-container a').each((i, el) => {
        const tag = $(el).text().trim();
        if (tag && !tag.includes('category')) {
          tags.push(tag);
          logDebug(`일반 구조에서 태그 추출: ${tag}`);
        }
      });
    }
    
    // 원본 URL에서 태그 검색 (백업)
    if (tags.length === 0 && articleUrl.includes('/tag/')) {
      const tagMatch = articleUrl.match(/\/tag\/([^\/]+)/);
      if (tagMatch && tagMatch[1]) {
        tags.push(tagMatch[1].replace(/-/g, ' '));
      }
    }
    
    // soompi 관련 태그 제거
    const filteredTags = tags.filter(tag => !/soompi/i.test(tag));
    tags.length = 0;
    filteredTags.forEach(t => tags.push(t));

    logDebug(`추출된 태그: ${tags.join(', ')}`);

    // 작성자 추출
    let author = '';
    const authorEl = $('.info-emphasis.right a, .author-date a[href*="/author/"]').first();
    if (authorEl.length) {
      author = authorEl.text().trim();
    }
    
    // 대표 이미지 추출
    let coverImage = '';
    const mainImg = $('.article-section .image-wrapper img, .article-wrapper img').first();
    if (mainImg.length) {
      const originalImageUrl = mainImg.attr('src') || mainImg.attr('data-src') || '';
      coverImage = await convertSoompiImageToProxy(originalImageUrl);
    }
    
    // 기사 내용 추출을 위한 다양한 시도
    logDebug('기사 내용 추출 시도...');
    
    // 시도 1: article-wrapper 내부의 div에서 추출
    let contentHtml = '';
    const articleWrapper = $('.article-wrapper');
    
    if (articleWrapper.length) {
      logDebug('article-wrapper 요소 발견: ' + articleWrapper.length);
      
      // 첫 번째 div 찾기
      const contentDiv = articleWrapper.find('> div').first();
      if (contentDiv.length) {
        logDebug('article-wrapper > div 요소 발견');
        
        // 불필요한 요소 미리 제거
        const clonedDiv = contentDiv.clone();
        
        // iframe 중에서 YouTube가 아닌 것만 제거 (YouTube iframe은 유지)
        clonedDiv.find('iframe').each((i, el) => {
          const src = $(el).attr('src') || '';
          // YouTube iframe이 아닌 경우에만 제거
          if (!src.includes('youtube.com/embed/') && !src.includes('youtu.be/')) {
            $(el).remove();
          }
        });
        
        // 하단 배너 이미지 제거 (SoompiRecommendedWatch 배너 및 유사한 이미지)
        clonedDiv.find('p > a[target="_blank"][rel="noopener noreferrer"] > img[class*="wp-image-"], hr + p > a > img').each((i, el) => {
          logDebug('하단 배너 이미지 제거');
          $(el).parent().parent().remove();
        });
        
        // 하단 회색 줄(HR 태그) 완전 제거 (강화)
        clonedDiv.find('hr').each((i, el) => {
          logDebug('하단 회색 줄(HR 태그) 제거');
          $(el).remove();
        });
        
        // 모든 형태의 hr 태그 제거
        clonedDiv.find('hr, HR').remove();
        
        // "원본 기사: Soompi" 관련 요소 제거
        clonedDiv.find('p:contains("원본 기사:")').remove();
        
        // hr 태그 다음에 오는 배너 제거 (일반적인 배너 패턴)
        clonedDiv.find('hr').next('p').each((i, el) => {
          const $el = $(el);
          if ($el.find('img, a[target="_blank"]').length > 0) {
            logDebug('hr 태그 다음 배너 제거');
            $el.remove();
          }
        });
        
        // "text-align: center" 스타일을 가진 모든 p 태그 제거 (간단하고 효율적인 방법)
        clonedDiv.find('p[style*="text-align: center"], p[style*="text-align:center"]').each((i, el) => {
          const $el = $(el);
          logDebug('중앙 정렬 p 태그 제거:', $el.text().trim().substring(0, 50));
          $el.remove();
        });
        
        // 방법 3: Viki 링크만 제거하고 텍스트는 유지 (개선된 필터링)
        clonedDiv.find('a[href*="viki.com"]').each((i, el) => {
          const $el = $(el);
          const linkText = $el.text().trim();
          
          // UTM 파라미터가 있는 Viki 링크인 경우 (광고성 링크)
          const href = $el.attr('href') || '';
          if (href.includes('utm_source=soompi')) {
            // 링크만 제거하고 텍스트는 유지
            logDebug(`Viki UTM 링크를 텍스트로 변환: "${linkText}"`);
            $el.replaceWith(linkText);
          } else {
            // 일반 Viki 링크도 텍스트로 변환
            logDebug(`Viki 링크를 텍스트로 변환: "${linkText}"`);
            $el.replaceWith(linkText);
          }
        });
        
        contentHtml = clonedDiv.html();
        logDebug('추출된 HTML 내용 (처음 100자): ' + contentHtml?.substring(0, 100));
      }
    }
    
    // 시도 2: article-paragraph에서 추출
    if (!contentHtml) {
      logDebug('시도 2: article-paragraph에서 추출');
      const articleParagraph = $('.article-paragraph');
      if (articleParagraph.length) {
        // 복제본 생성
        const clonedParagraph = articleParagraph.clone();
        
        // 불필요한 요소 제거
        clonedParagraph.find('.social-share-container, .article-reactions, .article-footer, script, .ad, .disqus_thread, .comment-container').remove();
        
        // iframe 중에서 YouTube가 아닌 것만 제거 (YouTube iframe은 유지)
        clonedParagraph.find('iframe').each((i, el) => {
          const src = $(el).attr('src') || '';
          // YouTube iframe이 아닌 경우에만 제거
          if (!src.includes('youtube.com/embed/') && !src.includes('youtu.be/')) {
            $(el).remove();
          }
        });
        
        // 하단 배너 이미지 제거
        clonedParagraph.find('p > a[target="_blank"][rel="noopener noreferrer"] > img[class*="wp-image-"], hr + p > a > img').each((i, el) => {
          logDebug('하단 배너 이미지 제거');
          $(el).parent().parent().remove();
        });
        
        // 하단 회색 줄(HR 태그) 완전 제거 (강화)
        clonedParagraph.find('hr').each((i, el) => {
          logDebug('하단 회색 줄(HR 태그) 제거');
          $(el).remove();
        });
        
        // 모든 형태의 hr 태그 제거
        clonedParagraph.find('hr, HR').remove();
        
        // "원본 기사: Soompi" 관련 요소 제거
        clonedParagraph.find('p:contains("원본 기사:")').remove();
        
        // hr 태그 다음에 오는 배너 제거
        clonedParagraph.find('hr').next('p').each((i, el) => {
          const $el = $(el);
          if ($el.find('img, a[target="_blank"]').length > 0) {
            logDebug('hr 태그 다음 배너 제거');
            $el.remove();
          }
        });
        
        // "text-align: center" 스타일을 가진 모든 p 태그 제거 (간단하고 효율적인 방법)
        clonedParagraph.find('p[style*="text-align: center"], p[style*="text-align:center"]').each((i, el) => {
          const $el = $(el);
          logDebug('중앙 정렬 p 태그 제거 (paragraph):', $el.text().trim().substring(0, 50));
          $el.remove();
        });
        
        // Viki 링크만 제거하고 텍스트는 유지 (개선된 필터링)
        clonedParagraph.find('a[href*="viki.com"]').each((i, el) => {
          const $el = $(el);
          const linkText = $el.text().trim();
          
          // UTM 파라미터가 있는 Viki 링크인 경우 (광고성 링크)
          const href = $el.attr('href') || '';
          if (href.includes('utm_source=soompi')) {
            // 링크만 제거하고 텍스트는 유지
            logDebug(`Viki UTM 링크를 텍스트로 변환 (paragraph): "${linkText}"`);
            $el.replaceWith(linkText);
          } else {
            // 일반 Viki 링크도 텍스트로 변환
            logDebug(`Viki 링크를 텍스트로 변환 (paragraph): "${linkText}"`);
            $el.replaceWith(linkText);
          }
        });
        
        contentHtml = clonedParagraph.html();
        logDebug('article-paragraph에서 HTML 추출됨');
      }
    }
    
    // 시도 3: article-section에서 추출
    if (!contentHtml) {
      logDebug('시도 3: article-section에서 추출');
      const articleSection = $('.article-section');
      if (articleSection.length) {
        // 복제본 생성
        const clonedSection = articleSection.clone();
        
        // 불필요한 요소 제거 (YouTube iframe 제외)
        clonedSection.find('.social-share-container, .article-reactions, .article-footer, script, .ad, .disqus_thread, .comment-container').remove();
        
        // iframe 중에서 YouTube가 아닌 것만 제거 (YouTube iframe은 유지)
        clonedSection.find('iframe').each((i, el) => {
          const src = $(el).attr('src') || '';
          // YouTube iframe이 아닌 경우에만 제거
          if (!src.includes('youtube.com/embed/') && !src.includes('youtu.be/')) {
            $(el).remove();
          }
        });
        
        // 하단 배너 이미지 제거
        clonedSection.find('p > a[target="_blank"][rel="noopener noreferrer"] > img[class*="wp-image-"], hr + p > a > img').each((i, el) => {
          logDebug('하단 배너 이미지 제거');
          $(el).parent().parent().remove();
        });
        
        // 하단 회색 줄(HR 태그) 완전 제거 (강화)
        clonedSection.find('hr').each((i, el) => {
          logDebug('하단 회색 줄(HR 태그) 제거');
          $(el).remove();
        });
        
        // 모든 형태의 hr 태그 제거
        clonedSection.find('hr, HR').remove();
        
        // "원본 기사: Soompi" 관련 요소 제거
        clonedSection.find('p:contains("원본 기사:")').remove();
        
        // hr 태그 다음에 오는 배너 제거
        clonedSection.find('hr').next('p').each((i, el) => {
          const $el = $(el);
          if ($el.find('img, a[target="_blank"]').length > 0) {
            logDebug('hr 태그 다음 배너 제거');
            $el.remove();
          }
        });
        
        // "text-align: center" 스타일을 가진 모든 p 태그 제거 (간단하고 효율적인 방법)
        clonedSection.find('p[style*="text-align: center"], p[style*="text-align:center"]').each((i, el) => {
          const $el = $(el);
          logDebug('중앙 정렬 p 태그 제거 (section):', $el.text().trim().substring(0, 50));
          $el.remove();
        });
        
        // Viki 링크만 제거하고 텍스트는 유지 (개선된 필터링)
        clonedSection.find('a[href*="viki.com"]').each((i, el) => {
          const $el = $(el);
          const linkText = $el.text().trim();
          
          // UTM 파라미터가 있는 Viki 링크인 경우 (광고성 링크)
          const href = $el.attr('href') || '';
          if (href.includes('utm_source=soompi')) {
            // 링크만 제거하고 텍스트는 유지
            logDebug(`Viki UTM 링크를 텍스트로 변환 (section): "${linkText}"`);
            $el.replaceWith(linkText);
          } else {
            // 일반 Viki 링크도 텍스트로 변환
            logDebug(`Viki 링크를 텍스트로 변환 (section): "${linkText}"`);
            $el.replaceWith(linkText);
          }
        });
        
        contentHtml = clonedSection.html();
        logDebug('article-section에서 HTML 추출됨');
      }
    }
    
    // 내용이 없으면 간단한 메시지 제공
    if (!contentHtml) {
      logDebug('HTML 내용 추출 실패');
      contentHtml = '<p>상세 내용을 가져올 수 없습니다. 원본 페이지를 방문해 주세요.</p>';
    }
    
    // 이미지 경로를 절대 경로로 변환
    contentHtml = contentHtml.replace(/src="\/wp-content/g, 'src="https://www.soompi.com/wp-content');
    
    // 추가적인 원본 기사 링크 제거 (이미 위에서 대부분 제거되지만 확실히 하기 위함)
    contentHtml = contentHtml.replace(/<p>.*?원본 기사.*?<\/p>/g, '');
    
    // 링크는 남기고 원본 기사 텍스트만 제거
    contentHtml = contentHtml.replace(/원본 기사: Soompi/g, '');
    
    // "Watch Now" 관련 텍스트 및 버튼 최종 정리 (강화된 정규식)
    contentHtml = contentHtml.replace(/<p[^>]*>.*?Watch.*?(on Viki|below).*?<\/p>/gi, '');
    contentHtml = contentHtml.replace(/<p[^>]*>.*?<a[^>]*class="btn-watch-now"[^>]*>.*?<\/a>.*?<\/p>/gi, '');
    
    // Viki 링크를 포함한 모든 p 태그 제거 (강화된 정규식)
    contentHtml = contentHtml.replace(/<p[^>]*>.*?<a[^>]*href="[^"]*viki\.com[^"]*"[^>]*>.*?<\/a>.*?<\/p>/gi, '');
    
    // "Watch ... on Viki" 패턴을 포함한 모든 p 태그 제거
    contentHtml = contentHtml.replace(/<p[^>]*>.*?[Ww]atch.*?on\s+[Vv]iki.*?<\/p>/gi, '');
    
    // "My Little Old Boy" 같은 제목과 Viki 링크를 포함한 패턴 제거
    contentHtml = contentHtml.replace(/<p[^>]*>.*?Watch.*?on\s+"[^"]*".*?on\s+Viki.*?<\/p>/gi, '');
    
    // 이미지 형태의 Viki 광고 완전 제거 (새로 추가)
    contentHtml = contentHtml.replace(/<a[^>]*href="[^"]*viki\.com[^"]*"[^>]*>.*?<\/a>/gi, '');
    contentHtml = contentHtml.replace(/<a[^>]*href="[^"]*utm_source=soompi[^"]*viki\.com[^"]*"[^>]*>.*?<\/a>/gi, '');
    
    // 모든 <hr> 태그 완전 제거 (최종 정리)
    contentHtml = contentHtml.replace(/<hr[^>]*>/gi, '');
    contentHtml = contentHtml.replace(/<hr\s*\/?>/gi, '');
    contentHtml = contentHtml.replace(/<hr>/gi, '');
    contentHtml = contentHtml.replace(/\s*<hr[^>]*>\s*$/gi, '');
    
    // Viki URL 완전히 제거 - 링크만 제거하고 텍스트는 유지
    contentHtml = contentHtml.replace(/<a[^>]*href="https?:\/\/(?:www\.)?viki\.com[^"]*"[^>]*>(.*?)<\/a>/gi, '$1');

    // Soompi 하단 홍보 문구 통째로 제거 (링크 제거 전에 실행해야 함)
    // "In the meantime, watch/check out ...", "Also watch ...", "And watch ...", "Start watching ...", "Catch ... below" 등
    contentHtml = contentHtml.replace(/<p[^>]*>\s*(?:In the meantime,?\s*)?(?:Also\s+|And\s+)?(?:watch|check out|catch|start watching|you can (?:also )?watch|don'?t forget to (?:also )?(?:watch|check out))\b.*?<\/p>/gi, '');
    // 콜론/따옴표로 끝나면서 임베드를 전제하는 문단 ("Pretty Crazy":", ... below!:")
    contentHtml = contentHtml.replace(/<p[^>]*>[^<]*(?:below|here)\s*!?\s*:?\s*<\/p>/gi, '');

    // 소셜 미디어 임베드 blockquote를 플레이스홀더로 보호 (내부 <a> 태그 보존)
    const embeds1 = [];
    contentHtml = contentHtml.replace(/<blockquote[^>]*class="(?:twitter-tweet|instagram-media)"[^>]*>[\s\S]*?<\/blockquote>/gi, (match) => {
      embeds1.push(match);
      return `__SOCIAL_EMBED_${embeds1.length - 1}__`;
    });

    // 크롤링된 기사의 링크를 텍스트로 변환 (Instagram/Twitter 링크는 보존)
    contentHtml = contentHtml.replace(/<a[^>]*>(.*?)<\/a>/gi, (match, text) => {
      if (/instagram\.com\/(?:p|reel)\//i.test(match)) return match;
      if (/(?:twitter\.com|x\.com)\/.*\/status\//i.test(match)) return match;
      return text;
    });

    // 보호된 blockquote 복원
    contentHtml = contentHtml.replace(/__SOCIAL_EMBED_(\d+)__/g, (_, index) => embeds1[parseInt(index)]);

    // Source 형식 조정 (기사 내용과 Source 사이에 한 줄 띄우기, Source 뒤에는 빈줄 없음)
    contentHtml = contentHtml.replace(/(.*?)(<p[^>]*>Source(?:\s*\(\d+\))?:?.*?<\/p>)/is, '$1<p>&nbsp;</p>$2');
    
    // Instagram 텍스트를 임베드 코드로 변환 (fallback에서도 적용)
    contentHtml = convertInstagramTextToEmbed(contentHtml);
    
    // Twitter(X) 텍스트를 임베드 코드로 변환 (fallback에서도 적용)
    contentHtml = convertTwitterTextToEmbed(contentHtml);
    
    // Source 내용 제거 (가독성 개선)
    contentHtml = removeSourceContent(contentHtml);
    
    // 기사 가독성을 위한 포맷팅 적용
    contentHtml = formatArticleForReadability(contentHtml);
    
    // 마침표(.) 뒤에 줄바꿈(<br>) 추가
    contentHtml = addLineBreakAfterPeriods(contentHtml);
    
    // 내용이 없으면 간단한 메시지 제공
    if (!contentHtml) {
      logDebug('HTML 내용 추출 실패');
      contentHtml = '<p>상세 내용을 가져올 수 없습니다. 원본 페이지를 방문해 주세요.</p>';
    }
    
    // 이미지 경로를 절대 경로로 변환
    contentHtml = contentHtml.replace(/src="\/wp-content/g, 'src="https://www.soompi.com/wp-content');
    
    // 모든 Soompi 이미지 URL을 프록시 URL로 변환
    const cheerioContent = cheerio.load(contentHtml);
    const imgElements = cheerioContent('img').toArray();
    
    for (const img of imgElements) {
      const originalSrc = cheerioContent(img).attr('src');
      if (originalSrc && originalSrc.startsWith('http')) {
        const proxySrc = await convertSoompiImageToProxy(originalSrc);
        cheerioContent(img).attr('src', proxySrc);
        logDebug(`이미지 URL 변환: ${originalSrc} → ${proxySrc}`);
      }
    }
    
    contentHtml = cheerioContent.html();
    
    // Soompi 카테고리 정보 추출 (우선순위 1 적용)
    let detailCategory = '';
    
    // 우선순위 1-0: JSON-LD 스크립트에서 카테고리 추출
    const jsonLdScripts = $('script[type="application/ld+json"]');
    jsonLdScripts.each((index, element) => {
      if (detailCategory) return; // 이미 찾았으면 종료
      
      const scriptText = $(element).text();
      if (scriptText) {
        try {
          const jsonData = JSON.parse(scriptText);
          if (jsonData.articleSection) {
            detailCategory = jsonData.articleSection.trim();
            logDebug(`[우선순위 1-0] JSON-LD에서 추출한 카테고리: ${detailCategory}`);
            forceLog(`[JSON-LD 카테고리] "${articleUrl}" → "${detailCategory}"`);
          }
        } catch (e) {
          logDebug(`JSON-LD 파싱 오류 (스크립트 ${index}):`, e.message);
        }
      }
    });
    
    // 우선순위 1-1: 메타 태그에서 카테고리 정보 추출 (가장 정확)
    if (!detailCategory) {
      const metaCategory = $('meta[property="article:section"]').attr('content');
      if (metaCategory) {
        detailCategory = metaCategory.trim();
        logDebug(`[우선순위 1-1] 메타 태그에서 추출한 카테고리: ${detailCategory}`);
      }
    }
    
    
    // 우선순위 1-2: tags-container에서 카테고리 추출 (Soompi의 실제 구조)
      console.log("[DEBUG] tags-container 셀렉터 확인 시작");
    if (!detailCategory) {
      // 여러 셀렉터 시도 (새로운 HTML 구조에 맞게 수정)
      const selectors = [
        '.tags-container .uppercase.badges.tags a',
        '.tags-container .badges.tags a',
        '.tags-container .badges a',
        '.tags-container a[href*="/category/"]',
        '.article-info .tags-container a',
        'div.tags-container a'
      ];
      
      let tagLink = null;
      for (const selector of selectors) {
        tagLink = $(selector).first();
        if (tagLink.length) {
          console.log(`[DEBUG] 셀렉터 '${selector}'로 요소 발견`);
          break;
        }
      }
      
      console.log("[DEBUG] tagLink.length:", tagLink ? tagLink.length : 0);
      if (tagLink && tagLink.length) {
        const href = tagLink.attr('href') || '';
        const text = tagLink.text().trim();
        const title = tagLink.attr('title') || '';
      console.log("[DEBUG] tagLink href:", href, "text:", text, "title:", title);
        
        // href에서 카테고리 추출 (최우선)
        if (href.includes('/category/')) {
          const categoryMatch = href.match(/\/category\/([^\/]+)/);
          if (categoryMatch && categoryMatch[1]) {
            detailCategory = categoryMatch[1];
            logDebug(`[우선순위 1-2] tags-container href에서 추출한 카테고리: ${detailCategory} (텍스트: ${text}, title: ${title})`);
            forceLog(`[카테고리 추출] "${articleUrl}" → "${detailCategory}" (from href)`);
          }
        } 
        // title 속성에서 카테고리 추출
        else if (title) {
          detailCategory = title.toLowerCase();
          logDebug(`[우선순위 1-2] tags-container title에서 추출한 카테고리: ${detailCategory}`);
          forceLog(`[카테고리 추출] "${articleUrl}" → "${detailCategory}" (from title)`);
        }
        // 텍스트에서 카테고리 추출
        else if (text) {
          detailCategory = text.toLowerCase();
          logDebug(`[우선순위 1-2] tags-container 텍스트에서 추출한 카테고리: ${detailCategory}`);
          forceLog(`[카테고리 추출] "${articleUrl}" → "${detailCategory}" (from text)`);
        }
      } else {
        console.log("[DEBUG] tags-container에서 카테고리 링크를 찾을 수 없음");
        // HTML 구조 디버깅
        const tagsContainer = $('.tags-container').first();
        if (tagsContainer.length) {
          console.log("[DEBUG] tags-container HTML:", tagsContainer.html());
        } else {
          console.log("[DEBUG] tags-container 요소를 찾을 수 없음");
        }
      }
    }
    
    // 우선순위 1-3: 브레드크럼에서 카테고리 추출
    if (!detailCategory) {
      const breadcrumbs = $('.breadcrumbs a, .breadcrumb a, .nav-breadcrumb a');
      breadcrumbs.each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('/category/')) {
          const categoryMatch = href.match(/\/category\/([^\/]+)/);
          if (categoryMatch && categoryMatch[1]) {
            detailCategory = categoryMatch[1].replace('-', ' ');
            logDebug(`[우선순위 1-3] 브레드크럼에서 추출한 카테고리: ${detailCategory}`);
            return false; // 루프 종료
          }
        }
      });
    }
    
    // 우선순위 1-4: URL에서 카테고리 추출
    if (!detailCategory && articleUrl) {
      if (articleUrl.includes('/category/')) {
        const categoryMatch = articleUrl.match(/\/category\/([^\/]+)/);
        if (categoryMatch && categoryMatch[1]) {
          detailCategory = categoryMatch[1].replace('-', ' ');
          logDebug(`[우선순위 1-4] URL에서 추출한 카테고리: ${detailCategory}`);
        }
      }
    }
    
    // 우선순위 1-5: 태그에서 카테고리 추론
    if (!detailCategory && tags.length > 0) {
      // 카테고리 관련 키워드 (더 정확한 매칭을 위해 확장)
      const categoryKeywords = {
        'K-Drama': 'drama',
        'Drama': 'drama',
        'Korean Drama': 'drama',
        'K-Pop': 'kpop',
        'Music': 'kpop',
        'Korean Music': 'kpop',
        'Movie': 'movie',
        'Film': 'movie',
        'Korean Movie': 'movie',
        'Variety': 'variety',
        'Variety Show': 'variety',
        'Celebrity': 'celeb',
        'Interview': 'celeb',
        'Fashion': 'celeb',
        'Style': 'celeb'
      };
      
      // 태그에서 카테고리 키워드 찾기
      for (const tag of tags) {
        const normalizedTag = tag.trim();
        if (categoryKeywords[normalizedTag]) {
          detailCategory = normalizedTag;
          logDebug(`[우선순위 1-5] 태그에서 추론한 카테고리: ${detailCategory}`);
          break;
        }
      }
    }
    
    // Soompi 카테고리를 로컬 카테고리로 매핑 (최종 결정)
    let mappedCategory = '';
    if (detailCategory) {
      mappedCategory = mapSoompiCategoryToLocal(detailCategory);
      logDebug(`[Soompi 카테고리 매핑] '${detailCategory}' → '${mappedCategory}'`);
      forceLog(`[Soompi 카테고리 발견] "${articleUrl}" → 원본: "${detailCategory}", 매핑: "${mappedCategory}"`);
    } else {
      logDebug(`[Soompi 카테고리 없음] 상세 페이지에서 카테고리 정보를 찾을 수 없음`);
      forceLog(`[Soompi 카테고리 없음] "${articleUrl}" - 카테고리 정보를 찾을 수 없음`);
    }
    
    // 작성자가 없거나 기본값인 경우 카테고리별 작성자 이름 생성 (강화)
    if (!author || 
        author === 'Admin' || 
        author === 'By Admin' || 
        author === 'admin' || 
        author === 'by admin' ||
        author.toLowerCase().includes('admin') ||
        author.toLowerCase().includes('soompi') ||
        author.trim() === '' ||
        author === 'Staff') {
      // 매핑된 카테고리를 기반으로 작성자 이름 생성
      const finalCategory = mappedCategory || 'kpop';
      author = generateAuthorByCategory(finalCategory);
      logDebug(`[작성자 생성] 카테고리 "${finalCategory}"에 대해 작성자 "${author}" 생성`);
    }
    
    logDebug(`상세 페이지 파싱 완료: 태그 ${tags.length}개, 카테고리: ${detailCategory || '없음'}, 작성자: ${author || '없음'}`);
    forceLog(`[fetchArticleDetail 완료] "${articleUrl}" - 카테고리: ${detailCategory || '없음'}, 매핑: ${mappedCategory || '없음'}`);
    
    // 브라우저 종료
    if (browser) {
      try {
        await browser.close();
        logDebug('Puppeteer 브라우저 정상 종료');
      } catch (closeError) {
        logDebug('브라우저 종료 중 오류:', closeError);
      }
    }
    
    return {
      content: contentHtml,
      tags: tags,
      author: {
        name: author,
        id: 'soompi-crawler',
        email: 'crawler@soompi.com',
        image: '/images/default-avatar.png'
      },
      coverImage: coverImage,
      title: articleTitle,
      detailCategory: detailCategory,
      mappedCategory: mappedCategory
    };
  } catch (error) {
    logDebug('기사 상세 페이지 크롤링 중 오류:', error);
    console.error('[fetchArticleDetail] 상세 오류 정보:', {
      url: articleUrl,
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // 타임아웃 오류인 경우 더 자세한 로그
    if (error.name === 'TimeoutError') {
      console.error('[fetchArticleDetail] 타임아웃 오류 - 페이지 로딩 시간 초과');
    }
    
    // Puppeteer 실패 시 최종 대체 크롤링 시도 (다른 User-Agent로)
    console.log('[fetchArticleDetail] Puppeteer 실패, 최종 대체 크롤링 시도...');
    try {
      const fallbackResult = await fetchArticleDetailFallback(articleUrl, true); // 다른 설정으로 재시도
      if (fallbackResult && fallbackResult.content && fallbackResult.content.length > 100) {
        console.log('[fetchArticleDetail] 최종 대체 크롤링 성공');
        return fallbackResult;
      }
    } catch (fallbackError) {
      console.error('[fetchArticleDetail] 최종 대체 크롤링도 실패:', fallbackError.message);
    }
    
    return {
      content: '<p>상세 기사를 가져오는 중 오류가 발생했습니다. 원본 페이지를 방문해 주세요.</p>',
      tags: [],
      author: '',
      coverImage: '',
      title: '',
      detailCategory: '',
      mappedCategory: ''
    };
  } finally {
    // Puppeteer 브라우저 종료 (강제 종료 포함)
    if (browser) {
      try {
        // 모든 페이지 닫기
        const pages = await browser.pages();
        await Promise.all(pages.map(page => page.close()));
        
        // 브라우저 종료
        await browser.close();
        logDebug('에러 발생 시 Puppeteer 브라우저 종료');
        forceLog('에러 발생 시 Puppeteer 브라우저 종료');
      } catch (closeError) {
        logDebug('에러 시 브라우저 종료 중 오류:', closeError);
        forceLog(`에러 시 브라우저 종료 중 오류: ${closeError.message}`);
        
        // 강제 종료 시도
        try {
          const browserProcess = browser.process();
          if (browserProcess) {
            browserProcess.kill('SIGKILL');
      }
        } catch (killError) {
          logDebug('브라우저 프로세스 강제 종료 실패:', killError);
        }
      }
    }
  }
}

// Puppeteer 실패 시 대체 크롤링 방식 (axios 사용)
async function fetchArticleDetailFallback(articleUrl, useAlternativeAgent = false) {
  try {
    console.log(`[fetchArticleDetailFallback] 대체 크롤링 시작: ${articleUrl}`);
    
    // 여러 User-Agent를 번갈아 사용
    const userAgents = useAlternativeAgent ? [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
    ] : [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // 랜덤 지연 추가
    const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3초
    console.log(`[fetchArticleDetailFallback] ${delay}ms 지연 후 요청`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const response = await axios.get(articleUrl, {
      headers: {
        'User-Agent': randomUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive'
      },
      timeout: 30000, // 30초 타임아웃
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // 3xx 리다이렉트도 허용
      }
    });
    
    const html = response.data;
    
    if (!html || html.length < 1000) {
      console.log('[fetchArticleDetailFallback] HTML 데이터가 너무 짧습니다.');
      return null;
    }
    
    const $ = cheerio.load(html);
    
    // 기본 정보 추출 (기존 로직과 동일)
    let articleTitle = '';
    const h1Title = $('.article-info h1, .article-wrapper h1, .article-section h1').first();
    if (h1Title.length) {
      articleTitle = h1Title.text().trim();
    }
    
    if (!articleTitle) {
      const pageTitle = $('title').text().trim();
      const titleParts = pageTitle.split(' - ');
      if (titleParts.length > 0) {
        articleTitle = titleParts[0].trim();
      }
    }
    
    // 태그 추출 (soompi 관련 태그 제외)
    const tags = [];
    $('.article-tags .tag-item a').each((i, el) => {
      const tag = $(el).text().trim();
      if (tag && !/soompi/i.test(tag)) tags.push(tag);
    });

    // 작성자 추출
    let author = '';
    const authorEl = $('.info-emphasis.right a, .author-date a[href*="/author/"]').first();
    if (authorEl.length) {
      author = authorEl.text().trim();
    }
    
    // 대표 이미지 추출
    let coverImage = '';
    const mainImg = $('.article-section .image-wrapper img, .article-wrapper img').first();
    if (mainImg.length) {
      const originalImageUrl = mainImg.attr('src') || mainImg.attr('data-src') || '';
      coverImage = await convertSoompiImageToProxy(originalImageUrl);
    }
    
    // 기사 내용 추출 (Viki 필터링 포함)
    let contentHtml = '';
    const articleWrapper = $('.article-wrapper');
    
    if (articleWrapper.length) {
      const contentDiv = articleWrapper.find('> div').first();
      if (contentDiv.length) {
        const clonedDiv = contentDiv.clone();
        
        // 불필요한 요소 제거
        clonedDiv.find('script, .ad, .social-share-container, .article-reactions, .article-footer').remove();
        clonedDiv.find('iframe').each((i, el) => {
          const src = $(el).attr('src') || '';
          if (!src.includes('youtube.com/embed/') && !src.includes('youtu.be/')) {
            $(el).remove();
          }
        });
        
        // "text-align: center" 스타일을 가진 모든 p 태그 제거 (간단하고 효율적인 방법 - fallback)
        clonedDiv.find('p[style*="text-align: center"], p[style*="text-align:center"]').each((i, el) => {
          const $el = $(el);
          console.log('[fetchArticleDetailFallback] 중앙 정렬 p 태그 제거:', $el.text().trim().substring(0, 50));
          $el.remove();
        });
        
        // Viki 링크만 제거하고 텍스트는 유지 (개선된 필터링 - fallback)
        clonedDiv.find('a[href*="viki.com"]').each((i, el) => {
          const $el = $(el);
          const linkText = $el.text().trim();
          
          // UTM 파라미터가 있는 Viki 링크인 경우 (광고성 링크)
          const href = $el.attr('href') || '';
          if (href.includes('utm_source=soompi')) {
            // 링크만 제거하고 텍스트는 유지
            console.log(`[fetchArticleDetailFallback] Viki UTM 링크를 텍스트로 변환: "${linkText}"`);
            $el.replaceWith(linkText);
          } else {
            // 일반 Viki 링크도 텍스트로 변환
            console.log(`[fetchArticleDetailFallback] Viki 링크를 텍스트로 변환: "${linkText}"`);
            $el.replaceWith(linkText);
          }
        });
        
        contentHtml = clonedDiv.html();
      }
    }
    
    // 내용이 없으면 다른 선택자 시도
    if (!contentHtml) {
      const articleSection = $('.article-section');
      if (articleSection.length) {
        const clonedSection = articleSection.clone();
        clonedSection.find('script, .ad, .social-share-container').remove();
        
        // 여기서도 Viki 필터링 적용
        clonedSection.find('p').each((i, el) => {
          const $el = $(el);
          if ($el.find('a[href*="viki.com"]').length > 0) {
            console.log('[fetchArticleDetailFallback] Viki 링크 포함 p 태그 제거 (article-section)');
            $el.remove();
          }
        });
        
        clonedSection.find('a.btn-watch-now').each((i, el) => {
          console.log('[fetchArticleDetailFallback] btn-watch-now 링크 제거 (article-section)');
          $(el).closest('p').remove();
        });
        
        // 이미지 형태의 Viki 광고 제거 (새로 추가)
        clonedSection.find('a[href*="viki.com"]').each((i, el) => {
          const $el = $(el);
          console.log('[fetchArticleDetailFallback] Viki 링크 제거 (이미지 광고 포함) (article-section)');
          $el.remove();
        });
        
        // Viki UTM 파라미터를 포함한 모든 링크 제거
        clonedSection.find('a[href*="utm_source=soompi"]').each((i, el) => {
          const $el = $(el);
          const href = $el.attr('href') || '';
          if (href.includes('viki.com')) {
            console.log('[fetchArticleDetailFallback] Viki UTM 링크 제거 (article-section)');
            $el.remove();
          }
        });
        
        contentHtml = clonedSection.html();
      }
    }
    
    if (!contentHtml) {
      console.log('[fetchArticleDetailFallback] 내용 추출 실패');
      return null;
    }
    
    // 이미지 경로를 절대 경로로 변환
    contentHtml = contentHtml.replace(/src="\/wp-content/g, 'src="https://www.soompi.com/wp-content');
    
    // Instagram 텍스트를 임베드 코드로 변환 (fallback에서도 적용)
    contentHtml = convertInstagramTextToEmbed(contentHtml);
    
    // 정규식 기반 최종 Viki 필터링 (fallback에서도 적용)
    contentHtml = contentHtml.replace(/<p[^>]*>.*?<a[^>]*href="[^"]*viki\.com[^"]*"[^>]*>.*?<\/a>.*?<\/p>/gi, '');
    contentHtml = contentHtml.replace(/<p[^>]*>.*?Watch.*?on\s+Viki.*?<\/p>/gi, '');
    contentHtml = contentHtml.replace(/<p[^>]*>.*?<a[^>]*class="btn-watch-now"[^>]*>.*?<\/a>.*?<\/p>/gi, '');
    contentHtml = contentHtml.replace(/<p[^>]*>.*?Watch.*?on\s+"[^"]*".*?on\s+Viki.*?<\/p>/gi, '');
    
    // 이미지 형태의 Viki 광고 제거 (새로 추가)
    contentHtml = contentHtml.replace(/<a[^>]*href="[^"]*viki\.com[^"]*"[^>]*>.*?<\/a>/gi, '');
    contentHtml = contentHtml.replace(/<a[^>]*href="[^"]*utm_source=soompi[^"]*viki\.com[^"]*"[^>]*>.*?<\/a>/gi, '');

    // Soompi 하단 홍보 문구 통째로 제거 (링크 제거 전에 실행해야 함)
    contentHtml = contentHtml.replace(/<p[^>]*>\s*(?:In the meantime,?\s*)?(?:Also\s+|And\s+)?(?:watch|check out|catch|start watching|you can (?:also )?watch|don'?t forget to (?:also )?(?:watch|check out))\b.*?<\/p>/gi, '');
    contentHtml = contentHtml.replace(/<p[^>]*>[^<]*(?:below|here)\s*!?\s*:?\s*<\/p>/gi, '');

    // 소셜 미디어 임베드 blockquote를 플레이스홀더로 보호 (내부 <a> 태그 보존)
    const embeds2 = [];
    contentHtml = contentHtml.replace(/<blockquote[^>]*class="(?:twitter-tweet|instagram-media)"[^>]*>[\s\S]*?<\/blockquote>/gi, (match) => {
      embeds2.push(match);
      return `__SOCIAL_EMBED_${embeds2.length - 1}__`;
    });

    // 크롤링된 기사의 링크를 텍스트로 변환 (Instagram/Twitter 링크는 보존)
    contentHtml = contentHtml.replace(/<a[^>]*>(.*?)<\/a>/gi, (match, text) => {
      if (/instagram\.com\/(?:p|reel)\//i.test(match)) return match;
      if (/(?:twitter\.com|x\.com)\/.*\/status\//i.test(match)) return match;
      return text;
    });

    // 보호된 blockquote 복원
    contentHtml = contentHtml.replace(/__SOCIAL_EMBED_(\d+)__/g, (_, index) => embeds2[parseInt(index)]);

    console.log('[fetchArticleDetailFallback] Viki 필터링, 홍보 문구 및 링크 제거 완료');

    // 모든 Soompi 이미지 URL을 프록시 URL로 변환
    const cheerioContent = cheerio.load(contentHtml);
    const imgElements = cheerioContent('img').toArray();
    
    for (const img of imgElements) {
      const originalSrc = cheerioContent(img).attr('src');
      if (originalSrc && originalSrc.startsWith('http')) {
        const proxySrc = await convertSoompiImageToProxy(originalSrc);
        cheerioContent(img).attr('src', proxySrc);
      }
    }
    
    contentHtml = cheerioContent.html();
    
    // 카테고리 추출 (fallback에서도 강화된 로직 적용)
    let detailCategory = '';
    
    // 방법 1: 메타 태그에서 카테고리 추출
    const metaCategory = $('meta[property="article:section"]').attr('content');
    if (metaCategory) {
      detailCategory = metaCategory.trim();
      console.log(`[fetchArticleDetailFallback] 메타 태그에서 카테고리 추출: ${detailCategory}`);
    }
    
    // 방법 2: tags-container에서 카테고리 추출 (새로운 HTML 구조 지원)
    if (!detailCategory) {
      const selectors = [
        '.tags-container .uppercase.badges.tags a',
        '.tags-container .badges.tags a',
        '.tags-container .badges a',
        '.tags-container a[href*="/category/"]',
        '.article-info .tags-container a',
        'div.tags-container a'
      ];
      
      let tagLink = null;
      for (const selector of selectors) {
        tagLink = $(selector).first();
        if (tagLink.length) {
          console.log(`[fetchArticleDetailFallback] 셀렉터 '${selector}'로 요소 발견`);
          break;
        }
      }
      
      if (tagLink && tagLink.length) {
        const href = tagLink.attr('href') || '';
        const text = tagLink.text().trim();
        const title = tagLink.attr('title') || '';
        console.log(`[fetchArticleDetailFallback] tagLink href: ${href}, text: ${text}, title: ${title}`);
        
        // href에서 카테고리 추출
        if (href.includes('/category/')) {
          const categoryMatch = href.match(/\/category\/([^\/]+)/);
          if (categoryMatch && categoryMatch[1]) {
            detailCategory = categoryMatch[1];
            console.log(`[fetchArticleDetailFallback] href에서 카테고리 추출: ${detailCategory}`);
          }
        } 
        // title 속성에서 카테고리 추출
        else if (title) {
          detailCategory = title.toLowerCase();
          console.log(`[fetchArticleDetailFallback] title에서 카테고리 추출: ${detailCategory}`);
        }
        // 텍스트에서 카테고리 추출
        else if (text) {
          detailCategory = text.toLowerCase();
          console.log(`[fetchArticleDetailFallback] text에서 카테고리 추출: ${detailCategory}`);
        }
      }
    }
    
    const mappedCategory = mapSoompiCategoryToLocal(detailCategory);
    console.log(`[fetchArticleDetailFallback] 카테고리 매핑: ${detailCategory} → ${mappedCategory}`);
    
    // 작성자가 없거나 기본값인 경우 카테고리별 작성자 이름 생성 (강화)
    if (!author || 
        author === 'Admin' || 
        author === 'By Admin' || 
        author === 'admin' || 
        author === 'by admin' ||
        author.toLowerCase().includes('admin') ||
        author.toLowerCase().includes('soompi') ||
        author.trim() === '' ||
        author === 'Staff') {
      // 매핑된 카테고리를 기반으로 작성자 이름 생성
      const finalCategory = mappedCategory || 'kpop';
      author = generateAuthorByCategory(finalCategory);
      console.log(`[fetchArticleDetailFallback] 작성자 생성: 카테고리 "${finalCategory}"에 대해 작성자 "${author}" 생성`);
    }
    
    // fallback에서도 가독성 개선 적용
    contentHtml = removeSourceContent(contentHtml);
    contentHtml = formatArticleForReadability(contentHtml);
    
    console.log(`[fetchArticleDetailFallback] 대체 크롤링 성공: ${articleTitle}`);
    
    return {
      content: contentHtml,
      tags: tags,
      author: {
        name: author,
        id: 'soompi-crawler',
        email: 'crawler@soompi.com',
        image: '/images/default-avatar.png'
      },
      coverImage: coverImage,
      title: articleTitle,
      detailCategory: detailCategory,
      mappedCategory: mappedCategory
    };
    
  } catch (error) {
    console.error('[fetchArticleDetailFallback] 대체 크롤링 오류:', error.message);
    return null;
  }
}

// Soompi 카테고리를 로컬 카테고리로 매핑하는 함수
function mapSoompiCategoryToLocal(soompiCategory) {
  if (!soompiCategory) return 'kpop';
  
  // 소문자로 변환하고 공백 및 특수문자 제거
  const normalizedCategory = soompiCategory.toLowerCase().trim().replace(/[-_\s]/g, '');
  
  // 숨피 공식 카테고리 맵핑 (정확한 매칭 우선)
  const exactCategoryMap = {
    // 드라마 관련
    'drama': 'drama',
    'kdrama': 'drama',
    'koreandrama': 'drama',
    'dramapreview': 'drama',
    'previewdrama': 'drama',
    'previewdramas': 'drama',
    'dramapreviews': 'drama',
    'tv': 'drama',
    'tvfilm': 'movie',
    'television': 'drama',
    
    // 음악 관련
    'music': 'kpop',
    'kpop': 'kpop',
    'koreanmusic': 'kpop',
    'idol': 'kpop',
    'comeback': 'kpop',
    'album': 'kpop',
    'mv': 'kpop',
    'musicvideo': 'kpop',
    'song': 'kpop',
    'concert': 'kpop',
    'performance': 'kpop',
    'tour': 'kpop',
    
    // 영화 관련
    'movie': 'movie',
    'film': 'movie',
    'cinema': 'movie',
    'koreanfilm': 'movie',
    'koreanmovie': 'movie',
    
    // 예능 관련
    'variety': 'variety',
    'varietyshow': 'variety',
    'show': 'variety',
    'entertainment': 'variety',
    'reality': 'variety',
    'realityshow': 'variety',
    
    // 셀럽 관련 (확장)
    'celeb': 'celeb',
    'celebrity': 'celeb',
    'celebrities': 'celeb',
    'actor': 'celeb',
    'actress': 'celeb',
    'star': 'celeb',
    'stars': 'celeb',
    'style': 'celeb',
    'fashion': 'celeb',
    'culture': 'celeb',
    'features': 'celeb',
    'interview': 'celeb',
    'lifestyle': 'celeb',
    'personal': 'celeb',
    'news': 'celeb',  // 일반 뉴스는 celeb으로
    'announcement': 'celeb',
    'update': 'celeb',
    'wedding': 'celeb',
    'marriage': 'celeb',
    'married': 'celeb',
    'relationship': 'celeb',
    'dating': 'celeb',
    'couple': 'celeb',
    'family': 'celeb',
    'birth': 'celeb',
    'birthday': 'celeb',
    'death': 'celeb',
    'dies': 'celeb',
    'passed': 'celeb',
    'passaway': 'celeb',
    'cancer': 'celeb',
    'illness': 'celeb',
    'health': 'celeb',
    'social': 'celeb',
    'instagram': 'celeb',
    'twitter': 'celeb',
    'sns': 'celeb'
  };
  
  // 정확한 매칭 시도
  if (exactCategoryMap[normalizedCategory]) {
    return exactCategoryMap[normalizedCategory];
  }
  
  // 부분 매칭 시도 (키워드 포함)
  for (const [keyword, category] of Object.entries(exactCategoryMap)) {
    if (normalizedCategory.includes(keyword)) {
      return category;
    }
  }
  
  // 기본값은 kpop
  return 'kpop';
}

// 기사 항목을 추가하는 공통 헬퍼 함수
async function createNewsItem(title, url, thumbnailUrl, category, timeText, order) {
  // URL 정규화
  const articleUrl = url.startsWith('http') ? url : `https://www.soompi.com${url.startsWith('/') ? '' : '/'}${url}`;
  
  // 카테고리 설정 우선순위:
  // 1. Soompi 카테고리 매핑 (상세 페이지에서 추출) - 최우선
  // 2. URL 기반 카테고리 추출
  // 3. 제목 기반 카테고리 추론
  // 4. 기본값 (kpop)
  
  let enhancedCategory = category;
  
  // 우선순위 2: URL에서 카테고리 정보 추출 (상세 페이지 정보가 없을 때만)
  if (!enhancedCategory && articleUrl) {
    // 'category' 키워드 검색
    if (articleUrl.includes('/category/')) {
      const categoryMatch = articleUrl.match(/\/category\/([^\/]+)/);
      if (categoryMatch && categoryMatch[1]) {
        enhancedCategory = categoryMatch[1];
        logDebug(`URL에서 카테고리 추출: ${enhancedCategory}`);
      }
    }
    
    // 특정 키워드로 카테고리 추론
    if (!enhancedCategory) {
      if (articleUrl.includes('drama') || articleUrl.includes('k-drama')) {
        enhancedCategory = 'drama';
      } else if (articleUrl.includes('music') || articleUrl.includes('k-pop') || articleUrl.includes('kpop')) {
        enhancedCategory = 'kpop';
      } else if (articleUrl.includes('movie') || articleUrl.includes('film')) {
        enhancedCategory = 'movie';
      } else if (articleUrl.includes('variety') || articleUrl.includes('show')) {
        enhancedCategory = 'variety';
      } else if (articleUrl.includes('celeb') || articleUrl.includes('actor') || articleUrl.includes('style')) {
        enhancedCategory = 'celeb';
      }
      
      if (enhancedCategory) {
        logDebug(`URL 키워드에서 카테고리 추론: ${enhancedCategory}`);
      }
    }
  }
  
  // 우선순위 3: 제목에서 카테고리 힌트 찾기 (URL에서도 찾지 못했을 때만)
  if (!enhancedCategory && title) {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('drama') || lowerTitle.includes('series')) {
      enhancedCategory = 'drama';
    } else if (lowerTitle.includes('comeback') || lowerTitle.includes('mv') || lowerTitle.includes('album') || 
               lowerTitle.includes('music') || lowerTitle.includes('song') || lowerTitle.includes('concert')) {
      enhancedCategory = 'kpop';
    } else if (lowerTitle.includes('movie') || lowerTitle.includes('film')) {
      enhancedCategory = 'movie';
    } else if (lowerTitle.includes('variety') || lowerTitle.includes('show')) {
      enhancedCategory = 'variety';
    }
    
    if (enhancedCategory) {
      logDebug(`제목에서 카테고리 추론: ${enhancedCategory}`);
    }
  }
  
  // 임시 로컬 카테고리로 변환 (상세 페이지에서 최종 결정됨)
  const localCategory = mapSoompiCategoryToLocal(enhancedCategory);
  
  // 디버깅
  if (enhancedCategory !== category) {
    logDebug(`카테고리 향상: '${category || 'none'}' → '${enhancedCategory}' → '${localCategory}'`);
  }
  
  // slug 생성 (제목이 없는 경우를 대비한 안전장치)
  let slug = '';
  if (title) {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣\s]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-|-$/g, '');
    
    // slug가 비어있거나 너무 짧은 경우 타임스탬프 추가
    if (!slug || slug.length < 3) {
      const timestamp = Date.now().toString().slice(-6);
      slug = `soompi-news-${timestamp}`;
    }
  } else {
    // 제목이 없는 경우 타임스탬프로 slug 생성
    const timestamp = Date.now().toString().slice(-6);
    slug = `soompi-news-${timestamp}`;
  }
  
  // slug 생성 디버깅 로그
  logDebug(`Slug 생성: 제목="${title}", 생성된 slug="${slug}"`);
  
  // 뉴스 아이템 생성
  const newsItem = {
    title,
    slug,
    thumbnailUrl,
    articleUrl,
    timeText: timeText || 'Recently',
    summary: `${title} - From Soompi ${enhancedCategory ? `(${enhancedCategory})` : ''}${timeText ? ` (${timeText})` : ''}`,
    category: localCategory,
    source: 'Soompi',
    sourceUrl: 'https://www.soompi.com',
    coverImage: await convertSoompiImageToProxy(thumbnailUrl) || '/images/default-news.jpg',
    tags: ['K-POP', 'News'].concat(enhancedCategory ? [enhancedCategory] : []),
    author: {
      name: generateAuthorByCategory(localCategory), // 카테고리별 작성자 이름 생성
      id: 'soompi-crawler',
      email: 'crawler@soompi.com',
      image: '/images/default-avatar.png'
    },
    status: 'published',
    createdAt: new Date(),
    publishedAt: new Date(), // 홈페이지 정렬을 위해 publishedAt 필드 추가
    updatedAt: new Date(),
    featured: order < 5, // 처음 5개 아이템은 featured로 표시
    viewCount: 0,
    content: '',  // 내용은 나중에 fetchArticleDetail 함수에서 채웁니다
    needsDetailFetch: true,  // 상세 페이지에서 내용을 가져와야 함을 표시
    detailCategory: '',  // 상세 페이지에서 추출한 원본 카테고리
    mappedCategory: ''   // 매핑된 카테고리
  };
  
  // 최종 뉴스 아이템 디버깅 로그
  logDebug(`뉴스 아이템 생성 완료: slug="${newsItem.slug}", title="${newsItem.title}"`);
  
  return newsItem;
}

export default async function handler(req, res) {
  // 강제 로그 추가
  forceLog('=== API ROUTE START ===');
  forceLog(`요청 메서드: ${req.method}`);
  forceLog(`요청 바디: ${JSON.stringify(req.body)}`);
  forceLog(`요청 URL: ${req.url}`);
  forceLog(`요청 헤더: ${JSON.stringify(req.headers)}`);
  
  // API 라우트 진입 로그 추가
  logDebug('=== API ROUTE START ===');
  logDebug('요청 메서드:', req.method);
  logDebug('요청 바디:', req.body);
  logDebug('요청 URL:', req.url);
  
  // POST 요청만 허용
  if (req.method !== 'POST') {
    logDebug('잘못된 메서드 요청:', req.method);
    forceLog(`잘못된 메서드 요청: ${req.method}`);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    forceLog('=== 크롤링 시작 ===');
    
    // 요청에서 최대 크롤링 아이템 수 가져오기 (기본값: 15)
    const maxItems = parseInt(req.body.maxItems) || 15;
    logDebug(`최대 크롤링 아이템 수: ${maxItems}`);
    forceLog(`최대 크롤링 아이템 수: ${maxItems}`);
    
    // 동시에 처리할 상세 페이지 요청 수 (병렬 처리)
    const concurrentRequests = parseInt(req.body.concurrentRequests) || 3;
    logDebug(`동시 상세 페이지 요청 수: ${concurrentRequests}`);
    forceLog(`동시 상세 페이지 요청 수: ${concurrentRequests}`);
    
    // Soompi 뉴스 크롤링
    logDebug('=== SOOMPI 크롤링 시작 ===');
    forceLog('=== SOOMPI 크롤링 시작 ===');
    
    // 크롤링 방식 선택 (기본값: 동적 크롤링)
    const useDynamicCrawling = req.body.useDynamicCrawling !== false; // 기본값 true
    logDebug(`크롤링 방식: ${useDynamicCrawling ? '동적(Puppeteer)' : '정적(Cheerio)'}`);
    forceLog(`크롤링 방식: ${useDynamicCrawling ? '동적(Puppeteer)' : '정적(Cheerio)'}`);
    
    let newsItems;
    try {
      forceLog('=== 크롤링 함수 호출 시작 ===');
      
      if (useDynamicCrawling) {
        forceLog('=== Puppeteer 크롤링 시작 ===');
        newsItems = await scrapeSoompiNewsWithPuppeteer(maxItems);
        forceLog('=== Puppeteer 크롤링 완료 ===');
      } else {
        forceLog('=== 정적 크롤링 시작 ===');
        newsItems = await scrapeSoompiNewsStatic(maxItems);
        forceLog('=== 정적 크롤링 완료 ===');
      }
      
      forceLog('=== 크롤링 함수 호출 완료 ===');
      
    } catch (crawlError) {
      forceLog('크롤링 중 오류 발생: ' + crawlError.message);
      forceLog('크롤링 오류 스택: ' + crawlError.stack);
      return res.status(500).json({ success: false, message: '크롤링 중 오류가 발생했습니다: ' + crawlError.message });
    }
    
    logDebug('=== SOOMPI 크롤링 완료 ===');
    logDebug('크롤링된 뉴스 아이템 수:', newsItems.length);
    forceLog(`크롤링된 뉴스 아이템 수: ${newsItems.length}`);
    logDebug('크롤링된 뉴스 아이템들:', newsItems.map(item => ({ title: item.title, slug: item.slug, articleUrl: item.articleUrl })));
    
    if (newsItems.length === 0) {
      logDebug('크롤링할 뉴스를 찾을 수 없음');
      forceLog('크롤링할 뉴스를 찾을 수 없음');
      return res.status(404).json({ success: false, message: '크롤링할 뉴스를 찾을 수 없습니다.' });
    }
    
    forceLog('=== 데이터베이스 연결 시작 ===');
    
    try {
      // 데이터베이스 연결
      logDebug('MongoDB 연결 시도...');
      forceLog('MongoDB 연결 시도...');
      const { db } = await connectToDatabase();
      forceLog('MongoDB 연결 성공');
      const collection = db.collection('news');
      
      // 중복 URL 확인
      forceLog('중복 URL 확인 시작...');
      const existingUrls = await collection.find({
        articleUrl: { $in: newsItems.map(item => item.articleUrl) }
      }).project({ articleUrl: 1 }).toArray();
      
      const existingUrlSet = new Set(existingUrls.map(item => item.articleUrl));
      logDebug(`기존 URL ${existingUrlSet.size}개 필터링`);
      forceLog(`기존 URL ${existingUrlSet.size}개 필터링`);
      
      // 새 아이템 필터링 (중복 제외)
      const newItems = newsItems.filter(item => !existingUrlSet.has(item.articleUrl));
      logDebug(`새 아이템 수: ${newItems.length}`);
      forceLog(`새 아이템 수: ${newItems.length}`);
      
      // 기존 뉴스 카테고리 업데이트 옵션이 켜져 있는 경우
      const updateExistingCategories = req.body.updateExistingCategories || false;
      let updatedCount = 0;
      
      forceLog(`[DEBUG] updateExistingCategories 옵션: ${updateExistingCategories}, req.body: ${JSON.stringify(req.body)}`);
      
      if (updateExistingCategories) {
        forceLog('=== 기존 뉴스 카테고리 업데이트 시작 ===');
        
        // Soompi 뉴스 중 카테고리가 잘못 매핑된 것들 찾기
        const soompiNews = await collection.find({
          source: 'Soompi',
          $or: [
            { detailCategory: { $exists: false } },
            { detailCategory: '' },
            { mappedCategory: { $exists: false } },
            { mappedCategory: '' },
            // 카테고리가 kpop인데 detailCategory가 celeb인 경우 등
            { 
              $expr: {
                $and: [
                  { $ne: ['$detailCategory', ''] },
                  { $ne: ['$category', '$mappedCategory'] }
                ]
              }
            }
          ]
        }).limit(50).toArray(); // 한 번에 50개씩만 처리
        
        forceLog(`업데이트 대상 뉴스 수: ${soompiNews.length}개`);
        
        const updateBatchSize = 5; // 5개씩 병렬 처리
        
        for (let i = 0; i < soompiNews.length; i += updateBatchSize) {
          const batch = soompiNews.slice(i, i + updateBatchSize);
          
          const updatePromises = batch.map(async (news) => {
            try {
              forceLog(`[카테고리 업데이트] "${news.title}" 처리 중...`);
              
              // 상세 페이지에서 카테고리 정보 다시 가져오기
              const detailContent = await fetchArticleDetail(news.articleUrl);
              
              if (detailContent.detailCategory && detailContent.mappedCategory) {
                const updateData = {
                  detailCategory: detailContent.detailCategory,
                  mappedCategory: detailContent.mappedCategory,
                  category: detailContent.mappedCategory,
                  updatedAt: new Date()
                };
                
                // 태그 업데이트
                if (detailContent.tags && detailContent.tags.length > 0) {
                  updateData.tags = detailContent.tags;
                }
                
                const updateResult = await collection.updateOne(
                  { _id: news._id },
                  { $set: updateData }
                );
                
                if (updateResult.modifiedCount > 0) {
                  forceLog(`[카테고리 업데이트 성공] "${news.title}": ${news.category} → ${detailContent.mappedCategory} (Soompi: ${detailContent.detailCategory})`);
                  return true;
                }
              }
              
              return false;
            } catch (error) {
              forceLog(`[카테고리 업데이트 실패] "${news.title}": ${error.message}`);
              return false;
            }
          });
          
          const results = await Promise.all(updatePromises);
          updatedCount += results.filter(r => r === true).length;
          
          // 서버 부하 방지를 위한 지연
          if (i + updateBatchSize < soompiNews.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        forceLog(`=== 기존 뉴스 카테고리 업데이트 완료: ${updatedCount}개 업데이트됨 ===`);
      }
      
      if (newItems.length === 0) {
        forceLog('새로운 뉴스가 없음');
        const message = updateExistingCategories && updatedCount > 0 
          ? `새로운 뉴스가 없습니다. ${updatedCount}개의 기존 뉴스 카테고리를 업데이트했습니다.`
          : '새로운 뉴스가 없습니다.';
        
        return res.status(200).json({
          success: true,
          message: message,
          total: newsItems.length,
          new: 0,
          updated: updateExistingCategories ? updatedCount : undefined
        });
      }
      
      // 새 아이템에 대해 상세 내용 가져오기 (병렬 처리)
      logDebug(`${newItems.length}개 항목의 상세 내용 가져오기 시작...`);
      forceLog(`${newItems.length}개 항목의 상세 내용 가져오기 시작...`);
      
      // 디버깅: newItems 내용 확인
      console.log('[DEBUG] newItems:', newItems.map(item => ({
        title: item.title,
        needsDetailFetch: item.needsDetailFetch,
        articleUrl: item.articleUrl
      })));
      forceLog(`[DEBUG] newItems 수: ${newItems.length}, 첫번째 아이템: ${newItems[0]?.title}`);
      
      // 병렬 처리 그룹으로 상세 내용 가져오기
      let processedItems = 0;
      let detailFetchedItems = [];
      
      // 작은 그룹으로 나누어 병렬 처리
      for (let i = 0; i < newItems.length; i += concurrentRequests) {
        const itemBatch = newItems.slice(i, i + concurrentRequests);
        logDebug(`배치 ${Math.floor(i/concurrentRequests) + 1} 처리 중: ${itemBatch.length}개 항목`);
        forceLog(`배치 ${Math.floor(i/concurrentRequests) + 1} 처리 중: ${itemBatch.length}개 항목`);
        
        // 현재 배치의 상세 내용을 병렬로 가져오기
        const detailFetchPromises = itemBatch.map(async (item) => {
          try {
            console.log(`[DEBUG] 아이템 처리: ${item.title}, needsDetailFetch: ${item.needsDetailFetch}`);
            if (item.needsDetailFetch) {
              console.log(`[DEBUG] fetchArticleDetail 호출 예정: ${item.articleUrl}`);
              const detailContent = await fetchArticleDetail(item.articleUrl);
              
              // 우선순위 1: 상세 페이지에서 추출한 Soompi 카테고리 매핑을 최우선 적용
              if (detailContent.mappedCategory) {
                const originalCategory = item.category;
                item.category = detailContent.mappedCategory;
                
                if (originalCategory !== detailContent.mappedCategory) {
                  logDebug(`[우선순위 1] Soompi 카테고리 매핑 적용: '${originalCategory}' → '${detailContent.mappedCategory}' (원본: ${detailContent.detailCategory})`);
      console.log("[DEBUG] 최종 detailCategory:", detailContent.detailCategory, "mappedCategory:", detailContent.mappedCategory);
                  forceLog(`[카테고리 최종 결정] "${item.title}" → ${detailContent.mappedCategory} (Soompi: ${detailContent.detailCategory})`);
                } else {
                  logDebug(`[우선순위 1] 카테고리 일치 확인: '${detailContent.mappedCategory}' (원본: ${detailContent.detailCategory})`);
                }
                
                // 태그에도 Soompi 원본 카테고리 추가
                if (detailContent.detailCategory && !item.tags.includes(detailContent.detailCategory)) {
                  item.tags.push(detailContent.detailCategory);
                }
              } else {
                // 상세 페이지에서 카테고리를 찾지 못한 경우 기존 로직 유지
                logDebug(`[우선순위 2-3] 상세 페이지 카테고리 없음, 기존 카테고리 유지: '${item.category}'`);
              }
              
              // 디버깅 로그 추가
              console.log(`[DEBUG] 아이템 업데이트 전: category=${item.category}`);
              console.log(`[DEBUG] detailContent: detailCategory=${detailContent.detailCategory}, mappedCategory=${detailContent.mappedCategory}`);
              
              const updatedItem = { 
                ...item, 
                ...detailContent, 
                needsDetailFetch: false,
                detailCategory: detailContent.detailCategory || '',
                mappedCategory: detailContent.mappedCategory || ''
              };
              
              console.log(`[DEBUG] 아이템 업데이트 후: category=${updatedItem.category}, detailCategory=${updatedItem.detailCategory}, mappedCategory=${updatedItem.mappedCategory}`);
              
              return updatedItem;
            }
            return item;
          } catch (error) {
            console.log(`[ERROR] 상세 내용 가져오기 실패: ${item.articleUrl}`, error.message);
            forceLog(`[ERROR] fetchArticleDetail 오류: ${item.articleUrl} - ${error.message}`);
            logDebug(`상세 내용 가져오기 실패: ${item.articleUrl}`, error);
            return item; // 오류 발생 시 원본 항목 반환
          }
        });
        
        // 현재 배치 처리 결과 기다리기
        const batchResults = await Promise.all(detailFetchPromises);
        detailFetchedItems = [...detailFetchedItems, ...batchResults];
        
        processedItems += itemBatch.length;
        logDebug(`진행 상황: ${processedItems}/${newItems.length} 항목 처리됨`);
        forceLog(`진행 상황: ${processedItems}/${newItems.length} 항목 처리됨`);
        
        // 서버 부하 방지를 위한 지연
        if (i + concurrentRequests < newItems.length) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      logDebug(`${detailFetchedItems.length}개 항목의 상세 내용 가져오기 완료`);
      forceLog(`${detailFetchedItems.length}개 항목의 상세 내용 가져오기 완료`);
      
      // 카테고리 분포 로깅
      const categoryCount = {};
      detailFetchedItems.forEach(item => {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      });
      logDebug('카테고리 분포:', categoryCount);
      forceLog(`카테고리 분포: ${JSON.stringify(categoryCount)}`);
      
      // 데이터베이스에 삽입
      if (detailFetchedItems.length > 0) {
        forceLog('=== 데이터베이스 삽입 시작 ===');
        
        // 저장 전 slug 검증 및 강제 설정
        detailFetchedItems.forEach((item, index) => {
          logDebug(`=== 아이템 ${index} 검증 시작 ===`);
          logDebug(`원본 아이템 구조:`, JSON.stringify(item, null, 2));
          
          if (!item.slug || item.slug === null || item.slug === undefined) {
            logDebug(`경고: 인덱스 ${index}의 아이템에 slug가 없습니다. 제목: "${item.title}"`);
            // slug가 없는 경우 임시 slug 생성
            const timestamp = Date.now().toString().slice(-6);
            item.slug = `soompi-news-${timestamp}-${index}`;
            logDebug(`임시 slug 생성: "${item.slug}"`);
          }
          
          // 최종 검증: slug가 여전히 null이면 강제로 설정
          if (!item.slug || item.slug === null || item.slug === undefined) {
            const fallbackSlug = `soompi-fallback-${Date.now()}-${index}`;
            item.slug = fallbackSlug;
            logDebug(`강제 fallback slug 설정: "${fallbackSlug}"`);
          }
          
          logDebug(`최종 아이템 ${index}: slug="${item.slug}", title="${item.title}"`);
          logDebug(`=== 아이템 ${index} 검증 완료 ===`);
        });
        
        logDebug(`데이터베이스 저장 시작: ${detailFetchedItems.length}개 항목`);
        
        // 저장 전 최종 검증
        const itemsWithSlug = detailFetchedItems.filter(item => item.slug && item.slug !== null && item.slug !== undefined);
        logDebug(`slug가 있는 아이템 수: ${itemsWithSlug.length}/${detailFetchedItems.length}`);
        
        if (itemsWithSlug.length !== detailFetchedItems.length) {
          logDebug('경고: 일부 아이템에 slug가 없습니다!');
          logDebug('slug가 없는 아이템들:', detailFetchedItems.filter(item => !item.slug || item.slug === null || item.slug === undefined));
          return res.status(500).json({
            success: false,
            message: '일부 뉴스 항목에 slug가 없어 저장할 수 없습니다.',
            error: 'Slug validation failed'
          });
        }
        
        logDebug('저장할 아이템들:', itemsWithSlug.map(item => ({ title: item.title, slug: item.slug })));
        
        const result = await collection.insertMany(itemsWithSlug);
        logDebug(`${result.insertedCount}개 항목을 데이터베이스에 추가`);
        
        const message = updateExistingCategories && updatedCount > 0
          ? `${result.insertedCount}개의 새 뉴스 항목을 추가했습니다. ${updatedCount}개의 기존 뉴스 카테고리를 업데이트했습니다.`
          : `${result.insertedCount}개의 새 뉴스 항목을 추가했습니다.`;
        
        return res.status(200).json({
          success: true,
          message: message,
          total: newsItems.length,
          new: result.insertedCount,
          updated: updateExistingCategories ? updatedCount : undefined
        });
      } else {
        const message = updateExistingCategories && updatedCount > 0
          ? `크롤링은 완료되었지만 새로운 뉴스가 추가되지 않았습니다. ${updatedCount}개의 기존 뉴스 카테고리를 업데이트했습니다.`
          : '크롤링은 완료되었지만 새로운 뉴스가 추가되지 않았습니다.';
          
        return res.status(200).json({
          success: true,
          message: message,
          total: newsItems.length,
          new: 0,
          updated: updateExistingCategories ? updatedCount : undefined
        });
      }
    } catch (dbError) {
      logDebug('데이터베이스 작업 중 오류:', dbError);
      return res.status(500).json({
        success: false,
        message: '데이터베이스 작업 중 오류가 발생했습니다: ' + dbError.message,
        error: dbError.toString()
      });
    }
  } catch (error) {
    logDebug('전체 처리 중 오류:', error);
    forceLog('전체 처리 중 오류: ' + error.message);
    forceLog('전체 오류 스택: ' + error.stack);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다: ' + error.message });
  }
} 