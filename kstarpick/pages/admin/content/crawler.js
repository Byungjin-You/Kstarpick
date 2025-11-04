import { useState, useEffect } from 'react';
import { getSession } from 'next-auth/react';
import AdminLayout from '../../../components/AdminLayout';
import { 
  Plus, 
  Download, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Save,
  FileText,
  Globe,
  Repeat,
  PauseCircle,
  Shield,
  Search,
  BookOpen,
  Users,
  X
} from 'lucide-react';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';

// 출연진 미리보기 컴포넌트 추가
const CastPreview = ({ actor }) => {
  return (
    <div className="flex items-center mb-2 p-2 border border-gray-200 rounded">
      {actor.image && (
        <div className="w-10 h-10 mr-2 overflow-hidden rounded">
          <img 
            src={actor.image} 
            alt={actor.name} 
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = '/images/placeholder-profile.png'; }}
          />
        </div>
      )}
      <div className="flex-1">
        <div className="font-medium">{actor.name}</div>
        <div className="text-xs text-gray-500">{actor.role}</div>
      </div>
    </div>
  );
};

// 출연진 섹션 컴포넌트 추가
const CastSection = ({ cast }) => {
  // 출연진이 없으면 메시지 표시
  if (!cast || (!cast.mainRoles?.length && !cast.supportRoles?.length)) {
    return <div className="text-gray-500 italic">출연진 정보 없음</div>;
  }

  // 최대 표시할 출연진 수 (메인 + 서포트)
  const maxDisplayActors = 12;
  
  return (
    <div>
      {/* 메인 출연진 */}
      {cast.mainRoles?.length > 0 && (
        <div className="mb-4">
          <h4 className="font-bold mb-2 text-sm">메인 출연진</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cast.mainRoles.slice(0, 6).map((actor, idx) => (
              <CastPreview key={`main-${idx}`} actor={actor} />
            ))}
          </div>
          {cast.mainRoles.length > 6 && (
            <div className="text-sm text-gray-500 mt-1">외 {cast.mainRoles.length - 6}명</div>
          )}
        </div>
      )}

      {/* 조연 출연진 */}
      {cast.supportRoles?.length > 0 && (
        <div>
          <h4 className="font-bold mb-2 text-sm">조연 출연진</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cast.supportRoles.slice(0, 6).map((actor, idx) => (
              <CastPreview key={`support-${idx}`} actor={actor} />
            ))}
          </div>
          {cast.supportRoles.length > 6 && (
            <div className="text-sm text-gray-500 mt-1">외 {cast.supportRoles.length - 6}명</div>
          )}
        </div>
      )}
    </div>
  );
};

// 제작진 정보 컴포넌트 추가
const StaffSection = ({ directors, screenwriters, castingDirectors }) => {
  // 제작진 정보가 없으면 메시지 표시
  if ((!directors || !directors.length) && 
      (!screenwriters || !screenwriters.length) &&
      (!castingDirectors || !castingDirectors.length)) {
    return <div className="text-gray-500 italic">제작진 정보 없음</div>;
  }
  
  return (
    <div className="mt-3">
      {/* 감독 정보 */}
      {directors?.length > 0 && (
        <div className="mb-3">
          <h4 className="font-bold mb-1 text-sm">감독</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {directors.slice(0, 3).map((staff, idx) => (
              <div key={`director-${idx}`} className="flex items-center mb-1">
                {staff.image && (
                  <div className="w-8 h-8 mr-2 overflow-hidden rounded">
                    <img 
                      src={staff.image} 
                      alt={staff.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/images/placeholder-profile.png'; }}
                    />
                  </div>
                )}
                <div>{staff.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 작가 정보 */}
      {screenwriters?.length > 0 && (
        <div className="mb-3">
          <h4 className="font-bold mb-1 text-sm">작가</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {screenwriters.slice(0, 3).map((staff, idx) => (
              <div key={`writer-${idx}`} className="flex items-center mb-1">
                {staff.image && (
                  <div className="w-8 h-8 mr-2 overflow-hidden rounded">
                    <img 
                      src={staff.image} 
                      alt={staff.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/images/placeholder-profile.png'; }}
                    />
                  </div>
                )}
                <div>{staff.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 캐스팅 디렉터 정보 */}
      {castingDirectors?.length > 0 && (
        <div>
          <h4 className="font-bold mb-1 text-sm">캐스팅 디렉터</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {castingDirectors.slice(0, 3).map((staff, idx) => (
              <div key={`casting-${idx}`} className="flex items-center mb-1">
                {staff.image && (
                  <div className="w-8 h-8 mr-2 overflow-hidden rounded">
                    <img 
                      src={staff.image} 
                      alt={staff.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/images/placeholder-profile.png'; }}
                    />
                  </div>
                )}
                <div>{staff.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function DramaCrawler() {
  // 상태 관리
  const [url, setUrl] = useState('https://mydramalist.com/search?adv=titles&ty=68,83&co=3&so=newest&or=asc&page=1');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [crawlingInProgress, setCrawlingInProgress] = useState(false);
  const [error, setError] = useState(null);
  const [crawledDramas, setCrawledDramas] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [selectedDramas, setSelectedDramas] = useState({});
  const [savingDramas, setSavingDramas] = useState({});
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailHtmlContent, setDetailHtmlContent] = useState('');
  const [currentDrama, setCurrentDrama] = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchQueue, setBatchQueue] = useState([]);
  
  // 자동 크롤링 관련 상태
  const [autoMode, setAutoMode] = useState(false);
  const [autoUrl, setAutoUrl] = useState('https://mydramalist.com/search?adv=titles&ty=68,83&co=3&so=newest&or=asc&page=1');
  const [autoPageCount, setAutoPageCount] = useState(1);
  const [autoCrawling, setAutoCrawling] = useState(false);
  const [autoProgress, setAutoProgress] = useState({ page: 0, totalPages: 0, dramas: 0 });
  const [autoDetailProcessing, setAutoDetailProcessing] = useState(false);
  const [autoDetailQueue, setAutoDetailQueue] = useState([]);
  const [autoSavedCount, setAutoSavedCount] = useState(0);
  const [puppeteerEnabled, setPuppeteerEnabled] = useState(true); // Puppeteer 사용 여부
  const [detailProgress, setDetailProgress] = useState({ current: 0, total: 0 }); // 상세 페이지 진행 상태

  // 크롤링 중지 상태를 추적하는 상태 변수 추가
  const [isCrawlingStopped, setIsCrawlingStopped] = useState(false);
  const [abortController, setAbortController] = useState(null);

  // 토스트 메시지 표시 함수
  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: '' }), duration);
  };

  // HTML 파싱 함수
  const parseHtml = (html) => {
    // 임시 DOM 요소 생성
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const dramaLinks = [];
    
    // 모든 드라마 박스 요소 찾기
    const dramaElements = doc.querySelectorAll('div[id^="mdl-"]');
    
    dramaElements.forEach(element => {
      // ID 추출
      const id = element.id.replace('mdl-', '');
      
      // 제목 및 링크 추출
      const titleElement = element.querySelector('h6.text-primary.title a');
      if (!titleElement) return;
      
      const title = titleElement.textContent.trim();
      const url = 'https://mydramalist.com' + titleElement.getAttribute('href');
      
      // 메타 정보 추출
      const metaElement = element.querySelector('span.text-muted');
      const metaText = metaElement ? metaElement.textContent.trim() : '';
      const metaParts = metaText.split(' - ');
      
      const category = metaParts[0]?.includes('Drama') ? 'drama' : 
                       metaParts[0]?.includes('Movie') ? 'movie' : 'other';
      
      let year = null;
      let episodes = null;
      if (metaParts[1]) {
        const yearMatch = metaParts[1].match(/(\d{4})/);
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
        }
        
        const episodesMatch = metaParts[1].match(/(\d+) episodes/);
        if (episodesMatch) {
          episodes = parseInt(episodesMatch[1]);
        }
      }
      
      // 이미지 URL 추출
      const imageElement = element.querySelector('img.img-responsive.cover');
      const imageUrl = imageElement ? 
        (imageElement.getAttribute('src') || imageElement.getAttribute('data-src')) : 
        null;
      
      // 평점 추출
      const ratingElement = element.querySelector('span.p-l-xs.score');
      const rating = ratingElement?.textContent ? parseFloat(ratingElement.textContent) : 0;
      
      // 줄거리 추출
      const summaryElements = element.querySelectorAll('p');
      let summary = '';
      
      summaryElements.forEach(p => {
        if (!p.querySelector('span') && p.textContent.trim() && !p.className.includes('rating')) {
          summary = p.textContent.trim();
        }
      });
      
      // 드라마 정보 저장
      dramaLinks.push({
        id,
        url,
        title,
        category,
        year,
        episodes,
        imageUrl,
        rating,
        summary
      });
    });
    
    // 다음 페이지 URL 확인
    const nextPageElement = doc.querySelector('.pagination .page-item.next a');
    const nextPageUrl = nextPageElement ? 
      'https://mydramalist.com' + nextPageElement.getAttribute('href') : 
      null;
    
    return { dramas: dramaLinks, nextPage: nextPageUrl };
  };
  
  // 상세 페이지 HTML 파싱 함수
  const parseDetailHtml = (html, mdlId, dramaUrl) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 기본 정보 추출
    const title = doc.querySelector('h1.film-title')?.textContent.trim() || '';
    
    // Native Title (원제) 추출
    let nativeTitle = '';
    const nativeTitleElement = doc.querySelector('.show-detailsxss .list-item:has(b:contains("Native Title")) a');
    if (nativeTitleElement) {
      nativeTitle = nativeTitleElement.textContent.trim();
    }
    
    // 줄거리(Synopsis) 추출 - 전체 텍스트 포함
    let synopsis = '';
    
    // 다양한 선택자를 시도하여 시놉시스 추출
    const synopsisSelectors = [
      '.show-synopsis p span',       // 가장 일반적인 구조
      '.show-synopsis p',            // span이 없는 경우
      '.show-synopsis',              // 전체 컨테이너
      '.film-description',           // 다른 구조
      '.box-body .box-inset',        // 또 다른 구조
      '.show-synopsis .synopsis',    // 다른 가능한 구조
      'div.box:contains("Synopsis") .box-body' // Synopsis 라벨이 있는 박스
    ];
    
    // 각 선택자를 시도해보고 내용 추출
    for (const selector of synopsisSelectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim()) {
        // 숨겨진 텍스트도 포함하여 모든 텍스트 추출
        synopsis = element.textContent.trim().replace(/\s+/g, ' ');
        
        // "read-more-hidden" 클래스 요소 확인 - 숨겨진 내용도 포함
        const hiddenElements = element.querySelectorAll('.read-more-hidden');
        if (hiddenElements.length > 0) {
          console.log('숨겨진 추가 시놉시스 텍스트 발견');
          
          // 숨겨진 내용이 이미 포함되어 있는지 확인
          for (const hiddenEl of hiddenElements) {
            const hiddenText = hiddenEl.textContent.trim();
            if (hiddenText && !synopsis.includes(hiddenText)) {
              synopsis += ' ' + hiddenText;
              console.log('숨겨진 시놉시스 텍스트 추가됨');
            }
          }
        }
        
        break;
      }
    }
    
    // 내용 정리
    if (synopsis) {
      // "Edit Translation" 텍스트 제거
      synopsis = synopsis.replace(/Edit Translation/g, '').trim();
      
      // 소스 정보 정리 (괄호 안의 Source 부분)
      synopsis = synopsis.replace(/\(Source:.+?\)/g, '').trim();
      
      // 언어 선택 UI 관련 텍스트 제거 (여러 버전 지원)
      synopsis = synopsis.replace(/English한국어हिन्दीEspañol.+/s, '').trim();
      synopsis = synopsis.replace(/English[\s\n]+한국어[\s\n]+हिन्दी[\s\n]+Español.+/s, '').trim();
      synopsis = synopsis.replace(/English[\s\n]*ภาษาไทย[\s\n]*Arabic[\s\n]*Русский.+/s, '').trim();
      
      // 불필요한 텍스트 제거
      synopsis = synopsis.replace(/Expand$/g, '').trim();
      synopsis = synopsis.replace(/Show\s+Less$/g, '').trim();
      synopsis = synopsis.replace(/Synopsis\s+/g, '').trim();
      synopsis = synopsis.replace(/Edit$/g, '').trim();
    }
    
    // 여전히 시놉시스가 없으면 메타 설명을 대안으로 사용
    if (!synopsis || synopsis.length < 10) {
      const metaElement = doc.querySelector('meta[name="description"]');
      if (metaElement) {
        synopsis = metaElement.getAttribute('content') || '';
      }
    }
    
    // 감독(Director) 추출
    let director = '';
    const directorElement = doc.querySelector('.show-detailsxss .list-item:has(b:contains("Director")) a');
    if (directorElement) {
      director = directorElement.textContent.trim();
    }
    
    // 장르(Genres) 추출
    const genres = [];
    doc.querySelectorAll('.show-genres a').forEach(element => {
      genres.push(element.textContent.trim());
    });
    
    // 태그(Tags) 추출
    const tags = [];
    doc.querySelectorAll('.show-tags a').forEach(element => {
      const tag = element.textContent.trim();
      if (tag && !tag.includes('Vote or add tags')) {
        tags.push(tag);
      }
    });
    
    // 국가(Country) 추출
    let country = 'South Korea'; // 기본값
    const countryElement = doc.querySelector('.list-item:has(b:contains("Country"))');
    if (countryElement) {
      const countryText = countryElement.textContent.replace('Country:', '').trim();
      if (countryText) {
        country = countryText;
      }
    }
    
    // 유형(Type) 추출
    let type = '';
    const typeElement = doc.querySelector('.list-item:has(b:contains("Type"))');
    if (typeElement) {
      type = typeElement.textContent.replace('Type:', '').trim();
    }
    
    // 에피소드 수(Episodes) 추출
    let episodes = null;
    const episodesElement = doc.querySelector('.list-item:has(b:contains("Episodes"))');
    if (episodesElement) {
      const episodesText = episodesElement.textContent.replace('Episodes:', '').trim();
      if (episodesText && !isNaN(parseInt(episodesText))) {
        episodes = parseInt(episodesText);
      }
    }
    
    // 방영 정보(Airs) 추출
    let airsInfo = '';
    let startDate = '';
    let endDate = '';
    
    // 방영일 항목명이 "Aired:" 또는 "Airs:"인 경우를 모두 처리
    const airsElement = doc.querySelector('.list-item:has(b:contains("Aired"))') || 
                       doc.querySelector('.list-item:has(b:contains("Airs"))'); 
    
    if (airsElement && !airsElement.textContent.includes('Airs On')) {
      // b 태그를 제외한 텍스트 내용 추출
      const bElement = airsElement.querySelector('b');
      const label = bElement ? bElement.textContent.trim() : '';
      
      if (label === 'Aired:' || label === 'Airs:') {
        airsInfo = airsElement.textContent.replace(label, '').trim();
        console.log(`방영일 정보 추출: "${airsInfo}"`);
        
        // 다양한 날짜 형식 지원
        // 예: "Apr 30, 2025 - Jun 5, 2025" 형식
        const dateMatch1 = airsInfo.match(/([A-Za-z]+\s+\d+,\s+\d{4})\s*-\s*([A-Za-z]+\s+\d+,\s+\d{4})/);
        // 예: "Apr 30, 2025" 형식 (단일 날짜)
        const dateMatch2 = airsInfo.match(/([A-Za-z]+\s+\d+,\s+\d{4})/);
        // 예: "2025-04-30" 형식
        const dateMatch3 = airsInfo.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
        // 예: "2025" 형식 (연도만)
        const dateMatch4 = airsInfo.match(/(\d{4})/);
        
        if (dateMatch1) {
          startDate = dateMatch1[1];
          endDate = dateMatch1[2];
          console.log(`방영 시작일: ${startDate}, 종료일: ${endDate}`);
        } else if (dateMatch2) {
          startDate = dateMatch2[1];
          console.log(`방영일: ${startDate}`);
        } else if (dateMatch3) {
          startDate = dateMatch3[1];
          endDate = dateMatch3[2];
          console.log(`방영 시작일: ${startDate}, 종료일: ${endDate}`);
        } else if (dateMatch4) {
          startDate = dateMatch4[1];
          console.log(`방영 연도: ${startDate}`);
        } else {
          // 추가 파싱 시도: "Apr 2025" 형식 (월과 연도만)
          const monthYearMatch = airsInfo.match(/([A-Za-z]+\s+\d{4})/);
          if (monthYearMatch) {
            startDate = monthYearMatch[1];
            console.log(`방영 월/연도: ${startDate}`);
          } else {
            // 날짜 범위가 있는지 확인 (예: "2025 - 2026")
            const yearRangeMatch = airsInfo.match(/(\d{4})\s*-\s*(\d{4})/);
            if (yearRangeMatch) {
              startDate = yearRangeMatch[1];
              endDate = yearRangeMatch[2];
              console.log(`방영 시작 연도: ${startDate}, 종료 연도: ${endDate}`);
            } else {
              // 파싱 실패 시 원본 텍스트 그대로 사용
              startDate = airsInfo;
              console.log(`방영일 파싱 실패, 원본 텍스트 사용: ${airsInfo}`);
            }
          }
        }
      }
    }
    
    // 방영 요일(Airs On) 추출
    let airsOn = '';
    const airsOnElement = doc.querySelector('.list-item:has(b:contains("Airs On"))');
    if (airsOnElement) {
      airsOn = airsOnElement.textContent.replace('Airs On:', '').trim();
    }
    
    // 방송국(Original Network) 추출
    let network = '';
    const networkElement = doc.querySelector('.list-item:has(b:contains("Original Network")) a');
    if (networkElement) {
      network = networkElement.textContent.trim();
    }
    
    // 콘텐츠 등급(Content Rating) 추출
    let contentRating = '';
    const contentRatingElement = doc.querySelector('.list-item:has(b:contains("Content Rating"))');
    if (contentRatingElement) {
      contentRating = contentRatingElement.textContent.replace('Content Rating:', '').trim();
    }
    
    // 이미지 URL 추출
    const coverImage = doc.querySelector('.film-cover img.img-responsive')?.getAttribute('src') || '';
    
    // URL의 slug 추출
    const urlParts = dramaUrl.split('/');
    const slug = urlParts[urlParts.length - 1];
    
    // 평점 추출
    let rating = 0;
    const ratingElement = doc.querySelector('.box[itemtype="http://schema.org/AggregateRating"] .list-item:has(b:contains("Score"))');
    if (ratingElement) {
      const ratingMatch = ratingElement.textContent.match(/(\d+\.\d+)/);
      if (ratingMatch) {
        rating = parseFloat(ratingMatch[1]);
      }
    }
    
    // 출연진(Cast) 정보 추출
    const cast = {
      mainRoles: [],
      supportRoles: []
    };
    
    // 출연진 추출 함수
    const extractCast = () => {
      console.log('[크롤러] 출연진 정보 추출 시작');
      
      // 출연진 섹션 찾기 함수 - 전용 출연진 페이지(/cast)와 기본 페이지 모두 지원
      const findActorsInSection = (sectionHeader, isMain) => {
        // 전용 출연진 페이지의 섹션 형식 (h3.header.b-b.p-b)
        const castPageSection = doc.querySelector(`h3.header.b-b.p-b:contains("${sectionHeader}")`);
        if (castPageSection) {
          console.log(`[크롤러] 전용 출연진 페이지에서 ${sectionHeader} 섹션 발견`);
          const actorList = castPageSection.nextElementSibling;
          
          if (actorList && actorList.tagName === 'UL') {
            actorList.querySelectorAll('li.list-item').forEach(item => {
              const name = item.querySelector('a.text-primary b')?.textContent.trim() || '';
              
              // 역할/캐릭터 이름 추출 - small[title] 태그에서 추출
              let role = '';
              const smallWithTitle = item.querySelector('small[title]');
              if (smallWithTitle) {
                role = smallWithTitle.textContent.trim() || smallWithTitle.getAttribute('title')?.trim() || '';
              }
              
              // title 속성이 없는 경우 일반 small 태그에서 추출
              if (!role) {
                const regularSmall = item.querySelector('small:not(.text-muted)');
                if (regularSmall) {
                  role = regularSmall.textContent.trim();
                }
              }
              
              // 이미지 URL 추출
              const image = item.querySelector('img')?.getAttribute('src') || '';
              
              if (name) {
                console.log(`[크롤러] ${sectionHeader} 배우 발견: ${name}, 역할: ${role || (isMain ? '주연' : '조연')}, 이미지: ${image || '없음'}`);
                
                if (isMain) {
                  cast.mainRoles.push({ name, role: role || '주연', image });
                } else {
                  cast.supportRoles.push({ name, role: role || '조연', image });
                }
              }
            });
            return true;
          }
          return false;
        }
        
        // 일반 상세 페이지의 섹션 형식 (h3.header)
        const regularSection = doc.querySelector(`h3.header:contains("${sectionHeader}")`);
        if (regularSection) {
          console.log(`[크롤러] 기본 페이지에서 ${sectionHeader} 섹션 발견`);
          const actorList = regularSection.nextElementSibling;
          
          if (actorList && actorList.tagName === 'UL') {
            actorList.querySelectorAll('li.list-item').forEach(item => {
              const name = item.querySelector('a.text-primary b')?.textContent.trim() || '';
              
              // 역할/캐릭터 이름 추출
              let role = item.querySelector('small[title]')?.textContent.trim() || '';
              
              // title 속성이 없는 경우
              if (!role) {
                role = item.querySelector('small:not(.text-muted)')?.textContent.trim() || '';
              }
              
              const image = item.querySelector('img')?.getAttribute('src') || '';
              
              if (name) {
                console.log(`[크롤러] ${sectionHeader} 배우 발견: ${name}, 역할: ${role || (isMain ? '주연' : '조연')}, 이미지: ${image || '없음'}`);
                
                if (isMain) {
                  cast.mainRoles.push({ name, role: role || '주연', image });
                } else {
                  cast.supportRoles.push({ name, role: role || '조연', image });
                }
              }
            });
            return true;
          }
        }
        
        return false;
      };
      
      // 메인 역할과 서포트 역할 찾기
      const foundMain = findActorsInSection('Main Role', true);
      const foundSupport = findActorsInSection('Support Role', false);
      
      // 게스트 역할도 서포트 역할로 포함
      const foundGuest = findActorsInSection('Guest Role', false);
      
      // 만약 표준 방식으로 찾지 못했다면 다른 방법 시도
      if (cast.mainRoles.length === 0 && cast.supportRoles.length === 0) {
        console.log('[크롤러] 표준 방식으로 출연진을 찾지 못함. 대체 방식 시도');
        
        // 모든 list-item에서 배우 정보 검색
        doc.querySelectorAll('.list-item').forEach(item => {
          const name = item.querySelector('a.text-primary b')?.textContent.trim() || '';
          const roleText = item.querySelector('small.text-muted')?.textContent.trim() || '';
          let role = item.querySelector('small[title]')?.textContent.trim() || '';
          
          // title 속성이 없는 경우
          if (!role) {
            role = item.querySelector('small:not(.text-muted)')?.textContent.trim() || '';
          }
          
          const image = item.querySelector('img')?.getAttribute('src') || '';
          
          if (name && (roleText.includes('Role') || roleText.includes('Cast'))) {
            console.log(`[크롤러] 대체 방식으로 배우 발견: ${name}, 역할 타입: ${roleText}, 캐릭터: ${role}, 이미지: ${image || '없음'}`);
            
            const isMain = roleText.includes('Main');
            
            if (isMain) {
              cast.mainRoles.push({ name, role: role || '주연', image });
            } else {
              cast.supportRoles.push({ name, role: role || '조연', image });
            }
          }
        });
      }
      
      console.log(`[크롤러] 출연진 정보 추출 완료: 메인 ${cast.mainRoles.length}명, 서포트 ${cast.supportRoles.length}명`);
    };
    
    // 출연진 정보 추출 실행
    extractCast();
    
    // 데이터 객체 생성
    const dramaData = {
      title,
      originalTitle: nativeTitle || '',
      description: synopsis,
      synopsis,
      summary: synopsis,
      content: synopsis,
      directorName: director,
      director,
      genres,
      tags,
      country,
      type,
      episodes,
      rating,
      releaseDate: startDate,
      startDate,
      endDate,
      airTime: airsOn,
      airsOn,
      airsInfo,
      network,
      contentRating,
      coverImage,
      posterUrl: coverImage,
      slug,
      mdlId,
      mdlUrl: dramaUrl,
      category: type && type.toLowerCase().includes('movie') ? 'movie' : 'drama',
      // 변경: cast 객체의 구조를 유지하여 메인롤과 서포트롤 정보가 모두 DB에 저장되도록 함
      cast: {
        mainRoles: cast.mainRoles || [],
        supportRoles: cast.supportRoles || []
      },
      
      // 추가 표시용 속성 (UI 렌더링에 사용)
      _sourceUrl: dramaUrl,
      _dateString: startDate
    };
    
    return dramaData;
  };

  // HTML 직접 입력 처리
  const handleHtmlInputChange = (e) => {
    setHtmlContent(e.target.value);
  };

  // HTML 파싱 및 크롤링 처리
  const parseHtmlContent = () => {
    if (!htmlContent.trim()) {
      showToast('HTML 콘텐츠를 입력해주세요.', 'error');
      return;
    }

    try {
      setCrawlingInProgress(true);
      const result = parseHtml(htmlContent);
      setCrawledDramas(result.dramas);
      setNextPage(result.nextPage);
      showToast(`${result.dramas.length}개의 드라마를 찾았습니다.`, 'success');
    } catch (err) {
      console.error('HTML 파싱 중 오류:', err);
      setError(err.message);
      showToast('HTML 파싱 중 오류가 발생했습니다: ' + err.message, 'error');
    }
  };

  // 상세 페이지 HTML 입력 및 파싱
  const handleDetailHtmlSubmit = (drama) => {
    if (savingDramas[drama.id]) {
      return; // 이미 저장 중인 드라마는 처리하지 않음
    }

    // 모달 열기
    setCurrentDrama(drama);
    setDetailHtmlContent('');
    setDetailModalOpen(true);
  };

  // HTML 입력 처리 - 상세/목록 공통 사용
  const handleHtmlSubmit = async () => {
    if (!detailHtmlContent.trim() || !currentDrama) {
      showToast('HTML 콘텐츠를 입력해주세요.', 'error');
      return;
    }
    
    setDetailModalOpen(false);
    
    try {
      console.log('HTML 제출 시작:', currentDrama.id);
      console.log('HTML 길이:', detailHtmlContent.length);
      showToast(`HTML 처리 중... (${detailHtmlContent.length} 바이트)`, 'info');
      
      // 자동 목록 크롤링 모드
      if (currentDrama.id === 'auto-list') {
        console.log('자동 목록 크롤링 모드 HTML 제출');
        
        // HTML을 서버로 전송하여 파싱
        const response = await fetch('/api/crawler/auto-crawler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: currentDrama.url,
            mode: 'list',
            htmlContent: detailHtmlContent
          })
        });
        
        console.log('목록 파싱 API 응답 상태:', response.status);
        
        if (!response.ok) {
          const result = await response.json();
          console.error('목록 파싱 오류 응답:', result);
          throw new Error(result.message || 'HTML 파싱 실패');
        }
        
        const result = await response.json();
        console.log('목록 파싱 결과:', result);
        
        if (!result.success) {
          throw new Error(result.message || 'HTML 파싱 결과 처리 실패');
        }
        
        // 크롤링된 드라마 추가
        const newDramas = result.data.dramas;
        console.log(`${newDramas.length}개의 드라마 발견:`, newDramas.map(d => d.title).join(', '));
        setCrawledDramas(prev => [...prev, ...newDramas]);
        
        // 진행 상태 업데이트
        setAutoProgress(prev => ({ 
          ...prev, 
          dramas: prev.dramas + newDramas.length 
        }));
        
        // 상세 정보 자동 크롤링 큐에 추가
        setAutoDetailQueue(prev => [...prev, ...newDramas]);
        
        // 다음 페이지가 있고, 설정한 페이지 수보다 적게 크롤링했다면 다음 페이지 크롤링
        if (result.data.nextPage && autoProgress.page < autoProgress.totalPages) {
          console.log('다음 페이지 크롤링 예약:', result.data.nextPage);
          showToast(`다음 페이지로 이동합니다: ${autoProgress.page + 1}/${autoProgress.totalPages}`, 'info');
          
          // 사용자에게 다음 페이지 안내
          window.open(result.data.nextPage, '_blank');
          
          // 다음 페이지 크롤링 준비
          setTimeout(() => {
            crawlNextPage(result.data.nextPage);
          }, 1000);
              } else {
          // 모든 페이지 크롤링 완료 - 상세 정보 크롤링 시작
          console.log('모든 페이지 크롤링 완료, 상세 정보 크롤링 시작');
          showToast(`총 ${autoProgress.dramas}개의 드라마 목록을 불러왔습니다. 상세 정보 크롤링을 시작합니다.`, 'success');
          startAutoDetailCrawling();
        }
        return;
      }
      
      // 자동 상세 페이지 크롤링 모드
      if (currentDrama.id === 'auto-detail') {
        // HTML을 서버로 전송하여 파싱
        const response = await fetch('/api/crawler/auto-crawler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: currentDrama.url,
            mode: 'detail',
            htmlContent: detailHtmlContent
          })
        });
        
        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || 'HTML 파싱 실패');
        }
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'HTML 파싱 결과 처리 실패');
        }
        
        // 데이터베이스에 저장
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
        const saveResponse = await fetch('/api/crawler/save-drama', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            data: result.data
          })
        });
        
        if (!saveResponse.ok) {
          const saveResult = await saveResponse.json();
          throw new Error(saveResult.message || '저장 실패');
        }
        
        // 저장 완료 표시
        const originalDrama = currentDrama.originalDrama;
        if (originalDrama) {
          setSavingDramas(prev => ({ ...prev, [originalDrama.id]: 'saved' }));
          setAutoSavedCount(prev => prev + 1);
        }
        
        // 다음 드라마 처리 진행
        setTimeout(() => {
          processNextDramaDetail();
        }, Math.random() * 500 + 500);
        
        return;
      }
      
      // 일반 상세 페이지 모드 (기존 코드)
      setSavingDramas(prev => ({ ...prev, [currentDrama.id]: 'loading' }));
      
      try {
        // HTML 파싱
        const dramaData = parseDetailHtml(detailHtmlContent, currentDrama.id, currentDrama.url);
        
        // 데이터베이스에 저장
        saveDramaToDatabase(dramaData, currentDrama);
        
        // 배치 프로세싱 중이면 다음 항목 처리
        if (batchProcessing) {
          // 현재 처리한 항목을 큐에서 제거
          const newQueue = batchQueue.filter(drama => drama.id !== currentDrama.id);
          setBatchQueue(newQueue);
          
          // 남은 항목이 있으면 다음 항목 처리
          if (newQueue.length > 0) {
            setTimeout(() => {
              handleDetailHtmlSubmit(newQueue[0]);
            }, 500);
        } else {
            // 모든 항목 처리 완료
            setBatchProcessing(false);
            showToast('선택한 모든 드라마 저장이 완료되었습니다.', 'success');
          }
        }
      } catch (err) {
        console.error('상세 페이지 파싱 중 오류:', err);
        setSavingDramas(prev => ({ ...prev, [currentDrama.id]: 'error' }));
        showToast(`'${currentDrama.title}' 파싱 실패: ${err.message}`, 'error');
        
        // 배치 프로세싱 중이면 다음 항목 처리
        if (batchProcessing) {
          // 현재 처리한 항목을 큐에서 제거
          const newQueue = batchQueue.filter(drama => drama.id !== currentDrama.id);
          setBatchQueue(newQueue);
          
          // 남은 항목이 있으면 다음 항목 처리
          if (newQueue.length > 0) {
            setTimeout(() => {
              handleDetailHtmlSubmit(newQueue[0]);
            }, 500);
          } else {
            // 모든 항목 처리 완료
            setBatchProcessing(false);
            showToast('선택한 모든 드라마 저장이 완료되었습니다.', 'success');
          }
        }
      }
    } catch (err) {
      console.error('HTML 제출 중 오류:', err);
      showToast(`HTML 처리 오류: ${err.message}`, 'error');
      
      // 자동 상세 페이지 크롤링 모드에서 에러 발생 시 다음 드라마 진행
      if (currentDrama.id === 'auto-detail') {
        setTimeout(() => {
          processNextDramaDetail();
        }, 1000);
      }
    }
  };

  // 상세 페이지 HTML 저장
  const saveDetailHtml = () => {
    handleHtmlSubmit();
  };

  // 데이터베이스에 저장
  const saveDramaToDatabase = async (dramaData, originalDrama) => {
    try {
      // 어드민 인증 확인 - 강화된 방식
      console.log('[saveDramaToDatabase] 인증 확인 시작');
      
      // 1단계: 로컬 토큰 확인
      let token = localStorage.getItem('token') || 
                  localStorage.getItem('adminToken') || 
                  sessionStorage.getItem('token') ||
                  sessionStorage.getItem('adminToken');
      
      console.log('[saveDramaToDatabase] 로컬 토큰 확인:', token ? `토큰 존재 (길이: ${token.length})` : '토큰 없음');
      
      // 2단계: NextAuth 세션 확인
      let sessionValid = false;
      try {
        console.log('[saveDramaToDatabase] NextAuth 세션 확인 시도');
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        console.log('[saveDramaToDatabase] 세션 응답:', {
          hasUser: !!sessionData?.user,
          userRole: sessionData?.user?.role,
          userEmail: sessionData?.user?.email
        });
        
        if (sessionData?.user?.role === 'admin') {
          console.log('[saveDramaToDatabase] NextAuth 세션에서 admin 권한 확인됨');
          sessionValid = true;
          if (!token) {
            token = 'session-based-auth';
          }
        }
      } catch (sessionError) {
        console.error('[saveDramaToDatabase] 세션 확인 실패:', sessionError);
      }
      
      // 3단계: 어드민 권한 API 직접 확인
      if (!sessionValid) {
        try {
          console.log('[saveDramaToDatabase] 어드민 권한 API 직접 확인');
          const adminCheckResponse = await fetch('/api/auth/check-admin', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          const adminCheck = await adminCheckResponse.json();
          console.log('[saveDramaToDatabase] 어드민 권한 확인 결과:', adminCheck);
          
          if (adminCheck.isAdmin) {
            console.log('[saveDramaToDatabase] 어드민 권한 확인됨');
            sessionValid = true;
          }
        } catch (adminError) {
          console.error('[saveDramaToDatabase] 어드민 권한 확인 실패:', adminError);
        }
      }
      
      if (!sessionValid && !token) {
        throw new Error('인증되지 않은 사용자입니다. 어드민으로 로그인해주세요.');
      }
      
      console.log('[saveDramaToDatabase] 인증 확인 완료:', {
        hasToken: !!token,
        sessionValid: sessionValid
      });
      
      console.log('드라마 저장 API 호출 시작:', {
        url: '/api/crawler/save-drama',
        method: 'POST',
        hasToken: !!token,
        dataTitle: dramaData.title
      });

      const saveResponse = await fetch('/api/crawler/save-drama', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          data: dramaData
        }),
      });

      console.log('드라마 저장 API 응답 상태:', saveResponse.status);
      console.log('드라마 저장 API 응답 헤더:', Object.fromEntries(saveResponse.headers.entries()));

      let saveResult;
      try {
        saveResult = await saveResponse.json();
        console.log('드라마 저장 API 응답 데이터:', saveResult);
      } catch (parseError) {
        console.error('응답 파싱 실패:', parseError);
        throw new Error(`서버 응답 파싱 실패 (상태: ${saveResponse.status})`);
      }

      if (!saveResponse.ok) {
        console.error('드라마 저장 실패 - 상세 정보:', {
          status: saveResponse.status,
          statusText: saveResponse.statusText,
          errorMessage: saveResult.message,
          errorDetails: saveResult.error
        });
        throw new Error(saveResult.message || `저장 실패 (상태: ${saveResponse.status})`);
      }

      // 저장 완료 표시
      setSavingDramas(prev => ({ ...prev, [originalDrama.id]: 'saved' }));
      showToast(`'${originalDrama.title}' 저장 완료`, 'success');
    } catch (err) {
      console.error('드라마 저장 중 오류:', err);
      setSavingDramas(prev => ({ ...prev, [originalDrama.id]: 'error' }));
      showToast(`'${originalDrama.title}' 저장 실패: ${err.message}`, 'error');
    }
  };

  // 자동 크롤링 시작
  const handleStealthCrawlingClick = async () => {
    console.log("===== 스텔스 크롤링 버튼 클릭 핸들러 실행 =====");
    
    try {
      // 크롤링 시작 전 백업 수행
      showToast('크롤링 시작 전 드라마 데이터 백업을 진행합니다...', 'info');
      const backupSuccess = await backupDramas();
      
      if (!backupSuccess && !confirm('백업에 실패했습니다. 그래도 크롤링을 계속하시겠습니까?')) {
        return;
      }
      
      // 스텔스 모드로 설정
      setAutoMode(true);
      setPuppeteerEnabled(true);
      
      // 약간의 지연 후 크롤링 시작 - 스텔스 모드 명시적 전달
      setTimeout(() => {
        // API 호출 시 명시적으로 스텔스 모드 사용
        console.log('스텔스 모드로 자동 크롤링 시작');
        showToast('스텔스 모드로 크롤링을 시작합니다...', 'info');
        
        // 크롤링 시작 시 중지 상태 초기화
        setIsCrawlingStopped(false);
        
        // 새 AbortController 생성
        const controller = new AbortController();
        setAbortController(controller);
        
        setAutoCrawling(true);
        setAutoProgress({ page: 0, totalPages: parseInt(autoPageCount), dramas: 0 });
        setAutoSavedCount(0);
        
        // 명시적으로 스텔스 크롤러 API 호출
        crawlNextPageWithStealth(autoUrl);
      }, 100);
    } catch (err) {
      console.error('스텔스 크롤링 시작 오류:', err);
      showToast(`크롤링 시작 오류: ${err.message}`, 'error');
      setAutoCrawling(false);
    }
  };
  
  // 스텔스 모드로 페이지 크롤링 (명시적 스텔스 모드 사용)
  const crawlNextPageWithStealth = async (pageUrl) => {
    try {
      if (!autoCrawling) return;
      
      console.log('스텔스 모드로 페이지 크롤링 시작:', pageUrl);
      
      // 크롤링 진행 상태 업데이트
      setAutoProgress(prev => ({ 
        ...prev, 
        page: prev.page + 1 
      }));
      
      // 크롤링 시작 메시지
      showToast(`${autoProgress.page + 1}/${autoProgress.totalPages} 페이지 스텔스 크롤링 중...`, 'info');
      
      // 항상 스텔스 크롤러 API 사용
      const apiEndpoint = '/api/crawler/stealth-crawler';
      
      // API 호출
      console.log(`스텔스 API 호출: ${apiEndpoint}`);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: pageUrl,
          mode: 'list',
          usePuppeteer: true // 항상 Puppeteer 사용
        })
      });
      
      console.log('API 응답 상태:', response.status);
      
      if (!response.ok) {
        const result = await response.json();
        console.error('API 오류 응답:', result);
        
        // 오류 발생 시 디버깅 정보 추가
        let errorMsg = result.message || '크롤링 실패';
        if (result.error) {
          errorMsg += `: ${result.error}`;
          console.error('상세 오류:', result.error);
        }
        
        throw new Error(errorMsg);
      }
      
      const result = await response.json();
      console.log('API 응답 결과:', result);
      
      if (!result.success) {
        throw new Error(result.message || '크롤링 데이터 처리 실패');
      }
      
      // 크롤링된 드라마 추가
      const newDramas = result.data.dramas;
      console.log(`${newDramas.length}개의 드라마 발견`);
      setCrawledDramas(prev => [...prev, ...newDramas]);
      
      // 진행 상태 업데이트
      setAutoProgress(prev => ({ 
        ...prev, 
        dramas: prev.dramas + newDramas.length 
      }));
      
      // 상세 정보 자동 크롤링 큐에 추가
      setAutoDetailQueue(prev => [...prev, ...newDramas]);
      
      // 다음 페이지가 있고, 설정한 페이지 수보다 적게 크롤링했다면 다음 페이지 크롤링
      if (result.data.nextPage && autoProgress.page < autoProgress.totalPages) {
        console.log('스텔스 모드로 다음 페이지 크롤링 예약:', result.data.nextPage);
        // 0.5~1초 딜레이 후 다음 페이지 크롤링
        setTimeout(() => {
          crawlNextPageWithStealth(result.data.nextPage);
        }, Math.random() * 500 + 500);
      } else {
        // 모든 페이지 크롤링 완료 - 상세 정보 크롤링 시작
        console.log('모든 페이지 스텔스 크롤링 완료, 상세 정보 크롤링 시작');
        showToast(`총 ${autoProgress.dramas}개의 드라마 목록을 불러왔습니다. 상세 정보 크롤링을 시작합니다.`, 'success');
        startStealthDetailCrawling();
      }
    } catch (err) {
      console.error('페이지 스텔스 크롤링 오류:', err);
      setAutoCrawling(false);
      showToast(`페이지 스텔스 크롤링 오류: ${err.message}`, 'error');
    }
  };
  
  // 스텔스 모드로 상세 정보 크롤링 시작
  const startStealthDetailCrawling = async () => {
    if (autoDetailProcessing || autoDetailQueue.length === 0) return;
    
    try {
      setAutoDetailProcessing(true);
      processNextDramaDetailWithStealth();
    } catch (err) {
      console.error('상세 정보 스텔스 크롤링 시작 오류:', err);
      setAutoDetailProcessing(false);
      showToast(`상세 정보 스텔스 크롤링 오류: ${err.message}`, 'error');
    }
  };
  
  // 스텔스 모드로 다음 드라마 상세 정보 처리
  const processNextDramaDetailWithStealth = async () => {
    try {
      if (!autoDetailProcessing || autoDetailQueue.length === 0) {
        setAutoDetailProcessing(false);
        setAutoCrawling(false);
        showToast('모든 드라마 크롤링 및 저장이 완료되었습니다.', 'success');
        return;
      }
      
      // 다음 드라마 가져오기
      const drama = autoDetailQueue[0];
      setAutoDetailQueue(prev => prev.slice(1));
      
      // 이미 저장된 드라마는 건너뛰기
      if (savingDramas[drama.id] === 'saved') {
        processNextDramaDetailWithStealth();
        return;
      }
      
      // 저장 중 표시
      setSavingDramas(prev => ({ ...prev, [drama.id]: 'loading' }));
      
      // 항상 스텔스 크롤러 API 사용
      const apiEndpoint = '/api/crawler/stealth-crawler';
      
      // 상세 정보 크롤링
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: drama.url,
          mode: 'detail',
          usePuppeteer: true // 항상 Puppeteer 사용
        })
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || '상세 정보 스텔스 크롤링 실패');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '상세 정보 처리 실패');
      }
      
      // 데이터베이스에 저장
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      console.log('저장 시 토큰 확인:', token ? '토큰 존재' : '토큰 없음');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }
      
      const saveResponse = await fetch('/api/crawler/save-drama', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: result.data
        })
      });
      
      if (!saveResponse.ok) {
        const saveResult = await saveResponse.json();
        throw new Error(saveResult.message || '저장 실패');
      }
      
      // 저장 완료 표시
      setSavingDramas(prev => ({ ...prev, [drama.id]: 'saved' }));
      setAutoSavedCount(prev => prev + 1);
      
      // 다음 드라마 처리 (약간의 지연 후)
      setTimeout(() => {
        processNextDramaDetailWithStealth();
      }, Math.random() * 500 + 500);
    } catch (err) {
      console.error('드라마 상세 스텔스 크롤링 오류:', err);
      
      // 저장 실패 표시
      if (autoDetailQueue.length > 0) {
        const drama = autoDetailQueue[0];
        setSavingDramas(prev => ({ ...prev, [drama.id]: 'error' }));
      }
      
      showToast(`상세 정보 크롤링 오류: ${err.message}, 다음 항목으로 진행합니다.`, 'error');
      
      // 다음 드라마로 진행
      setTimeout(() => {
        processNextDramaDetailWithStealth();
      }, 1000);
    }
  };

  // 자동 크롤링 중지
  const stopAutoCrawling = () => {
    console.log('크롤링 중지 요청 처리 시작');
    
    // 크롤링 중단 플래그 설정
    setIsCrawlingStopped(true);
    
    // AbortController로 모든 진행 중인 fetch 요청 중단
    if (abortController) {
      console.log('진행 중인 모든 API 요청 중단');
      abortController.abort();
      setAbortController(null);
    }
    
    // 크롤링 관련 모든 상태 변수 초기화
    setAutoCrawling(false);
    setAutoDetailProcessing(false);
    setAutoDetailQueue([]);
    
    // 진행 상태 초기화
    setDetailProgress({ current: 0, total: 0 });
    
    // 디버깅을 위한 알림창
    alert('크롤링이 중지되었습니다. 모든 진행 중인 요청이 취소되었습니다.');
    
    // 토스트 메시지 표시
    showToast("자동 크롤링이 중지되었습니다.", "info");
    
    // 강제로 페이지를 새로고침하여 모든 진행 중인 작업 종료
    if (confirm('페이지를 새로고침하여 모든 크롤링 작업을 강제 종료하시겠습니까?')) {
      window.location.reload();
    }
    
    console.log('크롤링 중지 처리 완료');
  };

  // 선택한 드라마 모두 저장
  const saveSelectedDramas = async () => {
    const selectedIds = Object.keys(selectedDramas).filter(id => selectedDramas[id]);
    
    if (selectedIds.length === 0) {
      showToast('저장할 드라마를 선택해주세요.', 'info');
      return;
    }

    // 선택된 드라마들의 ID 목록을 큐에 저장
    const dramaQueue = selectedIds.map(id => {
      return crawledDramas.find(d => d.id === id);
    }).filter(drama => drama); // undefined 제거
    
    // 큐 설정
    setBatchQueue(dramaQueue);
    setBatchProcessing(true);
    
    // 첫 번째 드라마 처리 시작
    if (dramaQueue.length > 0) {
      handleDetailHtmlSubmit(dramaQueue[0]);
    }
  };

  // 드라마 선택 상태 토글
  const toggleDramaSelection = (id) => {
    setSelectedDramas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 모든 드라마 선택/해제
  const toggleSelectAll = () => {
    const allSelected = crawledDramas.every(drama => selectedDramas[drama.id]);
    
    if (allSelected) {
      // 모두 선택 해제
      setSelectedDramas({});
    } else {
      // 모두 선택
      const selectAll = {};
      crawledDramas.forEach(drama => {
        selectAll[drama.id] = true;
      });
      setSelectedDramas(selectAll);
    }
  };

  // 드라마 저장 상태에 따른 아이콘 반환
  const getSavingStatusIcon = (id) => {
    switch (savingDramas[id]) {
      case 'loading':
        return <RefreshCw size={16} className="animate-spin text-blue-500" />;
      case 'saved':
        return <Check size={16} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Plus size={16} />;
    }
  };

  // 자동 크롤링 모드 상태 변경 핸들러
  const handleModeChange = (newMode) => {
    console.log(`크롤링 모드 변경 시작: ${newMode ? '스텔스 모드' : '일반 모드'}`);
    console.log('변경 전 상태:', { autoMode, puppeteerEnabled });
    
    // 상태 업데이트
    setAutoMode(newMode);
    setPuppeteerEnabled(true); // 항상 Puppeteer 활성화
    
    // 비동기적으로 상태가 업데이트된 후 로깅하기 위해 setTimeout 사용
    setTimeout(() => {
      console.log('변경 후 상태 (타임아웃 내부):', { autoMode: newMode, puppeteerEnabled: true });
      
      // 모드 변경 알림
      showToast(`${newMode ? '스텔스' : '일반'} 크롤링 모드로 변경되었습니다.`, 'info');
      
      // 디버깅용 알림창
      if (typeof window !== 'undefined') {
        window.alert(`모드 변경: ${newMode ? '스텔스' : '일반'} 크롤링 모드로 변경되었습니다.`);
      }
    }, 0);
  };

  // 페이지 로드 시 상태 로깅
  useEffect(() => {
    console.log('페이지 마운트됨, 크롤링 상태:', {
      autoMode,
      autoCrawling,
      puppeteerEnabled
    });
    
    // DOM 로드 확인
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        console.log('DOM 요소 확인:');
        console.log('스텔스 모드 버튼:', document.getElementById('stealth-mode-button'));
        console.log('스텔스 크롤링 시작 버튼:', document.getElementById('start-stealth-crawling-button'));
        
        // 버튼 이벤트 핸들러 테스트
        console.log('버튼 이벤트 핸들러 테스트:');
        const stealthModeBtn = document.getElementById('stealth-mode-button');
        const startCrawlingBtn = document.getElementById('start-stealth-crawling-button');
        
        if (stealthModeBtn) {
          console.log('스텔스 모드 버튼 onclick 속성:', stealthModeBtn.onclick);
        }
        
        if (startCrawlingBtn) {
          console.log('스텔스 크롤링 시작 버튼 onclick 속성:', startCrawlingBtn.onclick);
        }
      }, 1000);
    }
  }, []);

  // 상세 페이지 처리 함수 - 직접 API 호출 방식
  const processDetailPages = async (dramas) => {
    if (!dramas || dramas.length === 0 || isCrawlingStopped) {
      showToast('처리할 드라마가 없거나 중지되었습니다.', 'info');
      setAutoCrawling(false);
      return;
    }

    try {
      setAutoDetailProcessing(true);
      setDetailProgress({ current: 0, total: dramas.length });
      showToast(`${dramas.length}개 드라마의 상세 정보를 가져옵니다...`, 'info');
      alert(`${dramas.length}개 드라마의 상세 정보를 가져옵니다...`);

      // 각 드라마에 대해 순차적으로 상세 정보 크롤링
      for (let i = 0; i < dramas.length; i++) {
        // 크롤링 중지 여부 확인 - 중지 요청이 있으면 즉시 종료
        if (isCrawlingStopped || !autoCrawling || !autoDetailProcessing) {
          console.log('크롤링 중지 플래그가 감지되어 처리를 중단합니다.');
          showToast('크롤링이 사용자 요청에 의해 중단되었습니다.', 'info');
          setAutoDetailProcessing(false);
          setAutoCrawling(false);
          return;
        }
        
        const drama = dramas[i];
        
        try {
          // 현재 진행 상태 업데이트
          setDetailProgress({ current: i + 1, total: dramas.length });
          
          // 이미 저장된 드라마는 건너뛰기
          if (savingDramas[drama.id] === 'saved') {
            console.log(`드라마 '${drama.title}'는 이미 저장되어 있어 건너뜁니다.`);
            continue;
          }
          
          console.log(`드라마 상세 정보 크롤링 시작 (${i+1}/${dramas.length}): ${drama.title}`);
          // 저장 중 표시
          setSavingDramas(prev => ({ ...prev, [drama.id]: 'loading' }));
          
          // 상세 페이지 가져오는 중임을 알림
          showToast(`'${drama.title}' 상세 정보 가져오는 중... (${i+1}/${dramas.length})`, 'info');
          
          // 크롤링 중지 여부 한 번 더 확인
          if (isCrawlingStopped || !autoCrawling || !autoDetailProcessing) {
            console.log('크롤링 중지 플래그가 감지되어 처리를 중단합니다.');
            showToast('크롤링이 사용자 요청에 의해 중단되었습니다.', 'info');
            setAutoDetailProcessing(false);
            setAutoCrawling(false);
            return;
          }
          
          // 새로운 AbortController 생성 - 매 요청마다 새로 생성
          const controller = new AbortController();
          setAbortController(controller);
          
          // 스텔스 크롤러 API 직접 호출
          console.log(`API 요청: ${drama.url}`);
          const authToken = localStorage.getItem('token') || localStorage.getItem('adminToken');
          const response = await fetch('/api/crawler/stealth-crawler', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authToken ? `Bearer ${authToken}` : '',
            },
            body: JSON.stringify({
              url: drama.url,
              mode: 'detail'
            }),
            signal: controller.signal // AbortController 연결
          });
          
          // 중지 여부 다시 확인
          if (isCrawlingStopped) {
            console.log('요청은 완료되었지만 이미 중지 플래그가 설정되어 있어 처리를 중단합니다.');
            return;
          }
          
          if (!response.ok) {
            throw new Error(`API 응답 오류: ${response.status}`);
          }
          
          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.message || '상세 정보 처리 실패');
          }
          
          console.log(`${drama.title} 상세 정보 크롤링 성공:`, result.data.title);
          
          // 크롤링 중지 여부 다시 확인
          if (isCrawlingStopped || !autoCrawling || !autoDetailProcessing) {
            console.log('크롤링 중지 플래그가 감지되어 처리를 중단합니다.');
            showToast('크롤링이 사용자 요청에 의해 중단되었습니다.', 'info');
            setAutoDetailProcessing(false);
            setAutoCrawling(false);
            return;
          }
          
          // 데이터베이스에 저장
          const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
          const saveResponse = await fetch('/api/crawler/save-drama', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              data: result.data
            }),
            signal: controller.signal // 같은 AbortController 사용
          });
          
          if (!saveResponse.ok) {
            const saveResult = await saveResponse.json();
            throw new Error(saveResult.message || '저장 실패');
          }
          
          // 저장 완료 표시
          setSavingDramas(prev => ({ ...prev, [drama.id]: 'saved' }));
          setAutoSavedCount(prev => prev + 1);
          
          showToast(`'${drama.title}' 저장 완료 (${i+1}/${dramas.length})`, 'success');
          
          // 중지 상태 한 번 더 확인
          if (isCrawlingStopped) {
            console.log('저장은 완료되었지만 이미 중지 플래그가 설정되어 있어 처리를 중단합니다.');
            setAutoDetailProcessing(false);
            setAutoCrawling(false);
            return;
          }
          
          // 요청 간 딜레이 추가 (1~2초)
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, Math.random() * 1000 + 1000);
            
            // 타임아웃 중에 중지 요청이 오면 즉시 reject하여 딜레이도 중단
            const checkInterval = setInterval(() => {
              if (isCrawlingStopped) {
                clearTimeout(timeoutId);
                clearInterval(checkInterval);
                reject(new Error('중지 요청으로 처리가 중단되었습니다.'));
              }
            }, 100);
            
            // 타임아웃이 완료되면 interval도 정리
            setTimeout(() => clearInterval(checkInterval), Math.random() * 1000 + 1000);
          });
          
        } catch (err) {
          // AbortError인 경우는 사용자의 중지 요청이므로 조용히 처리
          if (err.name === 'AbortError') {
            console.log('사용자 요청으로 인해 API 요청이 취소되었습니다.');
            return;
          }
          
          // 중지 상태면 더 이상 오류 처리하지 않음
          if (isCrawlingStopped) {
            return;
          }
          
          console.error(`드라마 '${drama.title}' 상세 정보 크롤링 중 오류:`, err);
          setSavingDramas(prev => ({ ...prev, [drama.id]: 'error' }));
          showToast(`'${drama.title}' 처리 중 오류: ${err.message}`, 'error');
          
          // 오류 발생 후에도 계속 진행 (2초 대기)
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, 2000);
            
            // 타임아웃 중에 중지 요청이 오면 즉시 reject
            const checkInterval = setInterval(() => {
              if (isCrawlingStopped) {
                clearTimeout(timeoutId);
                clearInterval(checkInterval);
                reject(new Error('중지 요청으로 처리가 중단되었습니다.'));
              }
            }, 100);
            
            // 타임아웃이 완료되면 interval도 정리
            setTimeout(() => clearInterval(checkInterval), 2000);
          }).catch(() => {
            // 중지 요청으로 인한 reject는 무시
            return;
          });
        }
      }
      
      // 모든 처리 완료
      setAutoDetailProcessing(false);
      setAutoCrawling(false);
      showToast('모든 드라마 상세 정보 크롤링이 완료되었습니다.', 'success');
      alert('모든 드라마 상세 정보 크롤링이 완료되었습니다.');
    } catch (err) {
      // AbortError인 경우는 사용자의 중지 요청이므로 조용히 처리
      if (err.name === 'AbortError') {
        console.log('사용자 요청으로 인해 API 요청이 취소되었습니다.');
        setAutoDetailProcessing(false);
        setAutoCrawling(false);
        return;
      }
      
      console.error('상세 정보 일괄 처리 중 오류:', err);
      setAutoDetailProcessing(false);
      setAutoCrawling(false);
      showToast(`상세 정보 처리 중 오류: ${err.message}`, 'error');
    }
  };

  // 크롤링한 드라마를 직접 등록하는 함수
  const registerDrama = (drama) => {
    try {
      console.log(`'${drama.title}'을 데이터베이스에 직접 등록합니다.`);
      
      // 드라마 상세 정보가 없는 경우에도 기본 정보로 등록 허용
      if (!drama.mdlId && !drama.summary && !savingDramas[drama.id] === 'saved') {
        if (!confirm('상세 정보가 적은 드라마입니다. 등록하시겠습니까?')) {
          return;
        }
      }
      
      // 등록 중임을 표시
      setSavingDramas(prev => ({ ...prev, [drama.id]: 'loading' }));
      showToast(`'${drama.title}' 등록 중...`, 'info');
      
      // 데이터 디버깅을 위한 로그
      console.log('드라마 원본 데이터:', {
        title: drama.title,
        summary: drama.summary,
        description: drama.description,
        synopsis: drama.synopsis,
        releaseDate: drama.releaseDate,
        startDate: drama.startDate,
        endDate: drama.endDate,
        contentRating: drama.contentRating,
        genres: drama.genres,
        availableFields: Object.keys(drama).join(', ')
      });
      
      // 방영일 데이터를 변환하지 않고 원본 그대로 사용
      const originalReleaseDate = drama.releaseDate || drama.startDate || '';
      console.log('방영일 원본 데이터 사용:', originalReleaseDate);
      
      // 시놉시스 데이터 정리
      const summary = drama.summary || drama.description || drama.synopsis || '';
      console.log('시놉시스 데이터 확인:', summary ? (summary.substring(0, 100) + '...') : '없음');
      
      // 장르 데이터 처리 - 배열이면 문자열로 변환, 아니면 그대로 사용
      let genresText = '';
      if (drama.genres) {
        if (Array.isArray(drama.genres)) {
          genresText = drama.genres.join(', ');
        } else if (typeof drama.genres === 'string') {
          genresText = drama.genres;
        }
      }
      console.log('장르 정보:', genresText || '없음');
      
      // 연령 등급 처리
      const ageRating = drama.contentRating || drama.ageRating || '';
      console.log('연령 등급:', ageRating || '없음');
      
      // 원본 데이터의 모든 필드 보존 (API로 전달될 객체 생성)
    const dramaData = {
        // 원본 데이터의 중요 필드를 복사
        ...drama,
        
        // 필수 필드 재정의 (우선순위 지정)
        title: drama.title || '',
        originalTitle: drama.originalTitle || drama.nativeTitle || '',
        summary: summary,
        content: summary, // content 필드에도 시놉시스 복사 (DB 구조와 일치시키기 위함)
        description: summary, // description 필드도 추가
        network: drama.network || '',
        status: drama.status || 'ongoing',
        releaseDate: originalReleaseDate,
        endDate: drama.endDate || '',
        rating: drama.rating || drama.reviewRating || 0,
        runtime: drama.runtime || '',
        
        // 연령 등급 - 텍스트 형태로 저장
        ageRating: ageRating,
        contentRating: ageRating, // 두 필드 모두에 저장
        
        // 장르 - 텍스트와 배열 모두 저장
        genres: drama.genres || [], // 원본 배열 유지
        genresText: genresText, // 텍스트 버전 추가
        
        director: drama.director || '',
        // 제작진 정보 추가
        directors: drama.directors || [],
        screenwriters: drama.screenwriters || [],
        castingDirectors: drama.castingDirectors || [],
        producers: drama.producers || [],
        
        country: drama.country || 'KOREA',
        coverImage: drama.posterImage || drama.posterUrl || drama.coverImage || '',
        posterImage: drama.posterImage || drama.posterUrl || drama.coverImage || '',
        backgroundImage: drama.backgroundImage || drama.bannerImage || '',
        bannerImage: drama.backgroundImage || drama.bannerImage || '',
        mdlId: drama.mdlId || null,
        mdlRating: drama.rating || null,
        mdlVotes: drama.votes || null,
        category: drama.category || 'drama',
        
        // 출연진 정보 - 새로운 구조 (메인/서포트 구분)
        cast: (() => {
          // 새로운 구조 (mainRoles, supportRoles)가 있는 경우
          if (drama.cast && (Array.isArray(drama.cast.mainRoles) || Array.isArray(drama.cast.supportRoles))) {
            // 메인 캐스트와 서포트 캐스트를 단일 배열로 변환하되, 역할 구분 정보 유지
            const mainRoles = Array.isArray(drama.cast.mainRoles) 
              ? drama.cast.mainRoles.map((person, index) => ({
                  name: person.name || '',
                  role: person.role || '',  // 원래 역할 이름 그대로 사용
                  profileImage: person.profileImage || person.image || '',
                  order: index
                }))
              : [];
              
            const supportRoles = Array.isArray(drama.cast.supportRoles)
              ? drama.cast.supportRoles.map((person, index) => ({
                  name: person.name || '',
                  role: person.role || '',  // 원래 역할 이름 그대로 사용
                  profileImage: person.profileImage || person.image || '',
                  order: mainRoles.length + index
                }))
              : [];
              
            // 메인 캐스트를 먼저 배치하고 그 다음에 서포트 캐스트 배치
            return [...mainRoles, ...supportRoles];
          }
          
          // 기존 구조 (배열)가 있는 경우
          if (Array.isArray(drama.cast)) {
            return drama.cast.map((person, index) => ({
              name: person.name || '',
              role: person.role || '',
              profileImage: person.profileImage || person.image || '',
              order: index
            }));
          }
          
          return [];
        })(),
        
        watchProviders: drama.whereToWatch || [],
        
        // 메타데이터 설정
        createdAt: new Date(),
        updatedAt: new Date(),
        
        // 원본 데이터 저장 (디버깅 및 참조용)
        originalData: {
          ...drama
        }
      };
      
      // 최종 데이터 로깅
      console.log('등록할 드라마 데이터:', {
        제목: dramaData.title,
        시놉시스: dramaData.summary ? `${dramaData.summary.substring(0, 50)}... (길이: ${dramaData.summary.length}자)` : '없음',
        방영일: dramaData.releaseDate,
        종영일: dramaData.endDate,
        연령등급: dramaData.ageRating,
        장르: dramaData.genresText,
        출연진: Array.isArray(dramaData.cast) ? {
          총인원: dramaData.cast.length,
          첫번째_배우: dramaData.cast[0]?.name || '없음',
          첫번째_역할: dramaData.cast[0]?.role || '없음'
        } : '없음',
        필드수: Object.keys(dramaData).length,
        주요필드: ['title', 'summary', 'content', 'description', 'releaseDate', 'ageRating', 'genresText', 'cast'].map(field => {
          if (field === 'cast') {
            return `${field}: ${Array.isArray(dramaData[field]) && dramaData[field].length > 0 ? '있음' : '없음'}`;
          }
          return `${field}: ${dramaData[field] ? '있음' : '없음'}`;
        })
      });
      
      // 출연진 정보 미리 확인
      const totalCastCount = Array.isArray(dramaData.cast) ? dramaData.cast.length : 0;
      
      // 메인/서포트 정보는 내부적으로만 구분하여 로깅
      const mainCastMembers = dramaData.cast?.mainRoles || [];
      const supportCastMembers = dramaData.cast?.supportRoles || [];
        
      if (totalCastCount > 0) {
        console.log(`총 출연진 정보: ${totalCastCount}명 추가됨`);
        console.log('주요 출연진:', dramaData.cast.slice(0, 3).map(person => `${person.name} (${person.role})`).join(', '));
      } else if (mainCastMembers.length > 0 || supportCastMembers.length > 0) {
        // 아직 배열로 변환되기 전인 경우
        console.log(`출연진 정보: 메인 ${mainCastMembers.length}명, 서포트 ${supportCastMembers.length}명`);
        if (mainCastMembers.length > 0) {
          console.log('메인 출연진:', mainCastMembers.slice(0, 3).map(person => `${person.name} (${person.role})`).join(', '));
        }
        if (supportCastMembers.length > 0) {
          console.log('서포트 출연진:', supportCastMembers.slice(0, 3).map(person => `${person.name} (${person.role})`).join(', '));
        }
      } else {
        console.log('출연진 정보가 없습니다.');
      }
      
      // API 호출하여 직접 등록 - 개선된 토큰 처리
      let token = localStorage.getItem('token') || 
                  localStorage.getItem('adminToken') || 
                  sessionStorage.getItem('token') ||
                  sessionStorage.getItem('adminToken');
      
      console.log('[registerDrama] 토큰 확인:', token ? `토큰 존재 (길이: ${token.length})` : '토큰 없음');
      
      if (!token) {
        console.log('[registerDrama] 토큰이 없어서 session-based-auth 사용');
        token = 'session-based-auth';
      }
      
      console.log('[registerDrama] API 호출 시작:', {
        url: '/api/dramas',
        method: 'POST',
        hasToken: !!token,
        dataTitle: dramaData.title
      });
      
      fetch('/api/dramas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(dramaData),
      })
      .then(response => {
        console.log('[registerDrama] API 응답 상태:', response.status);
        console.log('[registerDrama] API 응답 헤더:', Object.fromEntries(response.headers.entries()));
        return response.json();
      })
      .then(data => {
        console.log('[registerDrama] API 응답 데이터:', data);
        if (data.success) {
          // 등록 성공
          setSavingDramas(prev => ({ ...prev, [drama.id]: 'saved' }));
          showToast(`'${drama.title}'이(가) 성공적으로 등록되었습니다.`, 'success');
          console.log('[registerDrama] 등록 성공:', data);
        } else {
          // 등록 실패
          setSavingDramas(prev => ({ ...prev, [drama.id]: 'error' }));
          showToast(`'${drama.title}' 등록 실패: ${data.message}`, 'error');
          console.error('[registerDrama] 등록 실패:', data);
        }
      })
      .catch(error => {
        console.error('[registerDrama] API 호출 오류:', error);
        setSavingDramas(prev => ({ ...prev, [drama.id]: 'error' }));
        showToast(`'${drama.title}' 등록 중 오류 발생: ${error.message}`, 'error');
      });
      
    } catch (error) {
      console.error('Error registering drama:', error);
      setSavingDramas(prev => ({ ...prev, [drama.id]: 'error' }));
      showToast(`등록 중 오류가 발생했습니다: ${error.message}`, 'error');
    }
  };

  // 백업 기능 추가
  const backupDramas = async () => {
    try {
      setLoading(true);
      showToast('드라마 데이터 백업 중...', 'info');
      
      const response = await fetch('/api/crawler/backup-dramas', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '백업 중 오류가 발생했습니다.');
      }
      
      const result = await response.json();
      showToast(`${result.data.count}개의 드라마가 성공적으로 백업되었습니다.`, 'success');
      return true;
    } catch (error) {
      console.error('백업 중 오류:', error);
      showToast(`백업 중 오류: ${error.message}`, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">MyDramalist 크롤러</h1>
          <Link
            href="/admin/content"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800"
          >
            콘텐츠 목록으로 돌아가기
          </Link>
        </div>

        {/* 디버깅 도우미 스크립트 */}
        <script dangerouslySetInnerHTML={{ __html: `
          // 페이지 로드 완료 후 실행
          document.addEventListener('DOMContentLoaded', function() {
            console.log('디버깅 스크립트 로드됨');
            
            // 스텔스 모드 버튼에 이벤트 리스너 직접 추가
            const stealthModeBtn = document.getElementById('stealth-mode-button');
            if (stealthModeBtn) {
              stealthModeBtn.addEventListener('click', function() {
                console.log('스텔스 모드 버튼 클릭 - 직접 이벤트 리스너');
              });
            }
            
            // 크롤링 시작 버튼에 이벤트 리스너 직접 추가
            const startCrawlingBtn = document.getElementById('start-stealth-crawling-button');
            if (startCrawlingBtn) {
              startCrawlingBtn.addEventListener('click', function() {
                console.log('스텔스 크롤링 시작 버튼 클릭 - 직접 이벤트 리스너');
                // 이벤트 발생 확인용 알림창
                alert('스텔스 크롤링 버튼 클릭됨 (직접 이벤트 리스너에서 감지)');
              });
            }
          });
          
          // 진단 함수
          function diagnoseCrawler() {
            console.log('크롤러 진단 시작');
            
            // 버튼 요소 확인
            const stealthModeBtn = document.getElementById('stealth-mode-button');
            const startCrawlingBtn = document.getElementById('start-stealth-crawling-button');
            
            console.log('스텔스 모드 버튼 존재:', !!stealthModeBtn);
            console.log('스텔스 크롤링 시작 버튼 존재:', !!startCrawlingBtn);
            
            // window에 노출된 함수 확인
            console.log('startAutoCrawling 함수 노출 여부:', typeof window.startAutoCrawling === 'function');
            console.log('debugState 객체 노출 여부:', !!window.debugState);
            
            if (window.debugState) {
              console.log('현재 상태:', {
                autoMode: window.debugState.getAutoMode(),
                puppeteerEnabled: window.debugState.getPuppeteerEnabled(),
                autoCrawling: window.debugState.getAutoCrawling()
              });
            }
            
            // 직접 함수 호출 테스트
            console.log('직접 함수 호출을 시도하려면 브라우저 콘솔에서 window.startAutoCrawling()을 실행하세요.');
          }
          
          // 전역 객체에 진단 함수 노출
          window.diagnoseCrawler = diagnoseCrawler;
          
          // 1초 후 자동 실행
          setTimeout(diagnoseCrawler, 1000);
        `}} />

        {/* 자동 크롤링 설정 카드 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Shield size={20} className="mr-2 text-purple-600" />
              스텔스 크롤링 모드
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              URL을 입력하고 페이지 수를 설정한 후 시작하면 자동으로 드라마 목록과 상세 정보를 크롤링하고 저장합니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">최대 페이지 수</label>
                <input 
                  type="number" 
                  min="1"
                  max="10"
                  value={autoPageCount}
                  onChange={(e) => setAutoPageCount(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={autoCrawling}
                />
              </div>
              <div className="flex items-end">
                {!autoCrawling ? (
                  <button
                    id="start-stealth-crawling-button"
                    onClick={() => {
                      console.log("스텔스 크롤링 시작 버튼 클릭됨");
                      // 직접 함수 호출하여 처리 명확화
                      // 스텔스 모드로 설정
                      setAutoMode(true);
                      setPuppeteerEnabled(true);
                      
                      // 크롤링 시작 시 중지 상태 초기화
                      setIsCrawlingStopped(false);
                      
                      // 진행 상태 초기화
                      setAutoProgress({ page: 0, totalPages: parseInt(autoPageCount), dramas: 0 });
                      setAutoSavedCount(0);
                      setAutoCrawling(true);
                      
                      // 새 AbortController 생성
                      const controller = new AbortController();
                      setAbortController(controller);
                      
                      // 약간의 지연 후 크롤링 시작
                      setTimeout(() => {
                        // 스텔스 크롤러 API 직접 호출
                        fetch('/api/crawler/stealth-crawler', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ 
                            url: autoUrl,
                            mode: 'list',
                            usePuppeteer: true
                          })
                        })
                        .then(response => {
                          console.log('스텔스 API 응답 상태:', response.status);
                          return response.json();
                        })
                        .then(result => {
                          console.log('스텔스 API 응답 결과:', result);
                          
                          if (!result.success) {
                            throw new Error(result.message || '크롤링 데이터 처리 실패');
                          }
                          
                          // 크롤링된 드라마 추가
                          const newDramas = result.data.dramas;
                          console.log(`${newDramas.length}개의 드라마 발견`);
                          setCrawledDramas(prev => [...prev, ...newDramas]);
                          
                          // 진행 상태 업데이트
                          setAutoProgress(prev => ({ 
                            ...prev, 
                            page: prev.page + 1,
                            dramas: prev.dramas + newDramas.length 
                          }));
                          
                          // 상세 정보 자동 크롤링 큐에 추가
                          setAutoDetailQueue(prev => [...prev, ...newDramas]);
                          
                          // 다음 페이지가 있고, 설정한 페이지 수보다 적게 크롤링했다면 다음 페이지 크롤링
                          if (result.data.nextPage && autoProgress.page < autoProgress.totalPages) {
                            console.log('스텔스 모드로 다음 페이지 크롤링 예약:', result.data.nextPage);
                            // 다음 페이지 크롤링
                            crawlNextPageWithStealth(result.data.nextPage);
                          } else {
                            // 모든 페이지 크롤링 완료 - 상세 정보 크롤링 시작
                            console.log('모든 페이지 스텔스 크롤링 완료, 상세 정보 크롤링 시작');
                            showToast(`총 ${autoProgress.dramas}개의 드라마 목록을 불러왔습니다. 상세 정보 크롤링을 시작합니다.`, 'success');
                            startStealthDetailCrawling();
                          }
                        })
                        .catch(err => {
                          console.error('스텔스 크롤링 오류:', err);
                          setAutoCrawling(false);
                          showToast(`스텔스 크롤링 오류: ${err.message}`, 'error');
                        });
                      }, 100);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
                  >
                    <Shield size={18} className="mr-2" />
                    스텔스 크롤링 시작
                  </button>
                ) : (
                  <button
                    onClick={stopAutoCrawling}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
                  >
                    <PauseCircle size={18} className="mr-2" />
                    크롤링 중지
                  </button>
                )}
              </div>
            </div>
            
            {/* Puppeteer 옵션 추가 - 스텔스 모드에서는 항상 활성화되므로 비활성화 */}
            <div className="mb-4 hidden">
              <label className="flex items-center mb-1">
                <input 
                  type="checkbox" 
                  checked={puppeteerEnabled}
                  onChange={(e) => setPuppeteerEnabled(e.target.checked)}
                  className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded"
                  disabled={autoCrawling}
                />
                <span className="text-gray-700 text-sm font-medium">
                  Puppeteer 사용 (자동화된 브라우저를 통한 크롤링)
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                {puppeteerEnabled 
                  ? "Puppeteer를 사용하면 Cloudflare 보호를 우회하여 자동으로 크롤링할 수 있습니다. 서버 부하가 높을 수 있습니다." 
                  : "비활성화된 경우 HTML을 수동으로 입력해야 합니다."}
              </p>
            </div>
            
            {/* 자동 크롤링 진행 상태 */}
            {autoCrawling && (
              <div className="bg-gray-100 p-4 rounded-md">
                <h3 className="font-medium text-gray-800 mb-2">스텔스 크롤링 진행 상태</h3>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <span className="text-sm text-gray-600">페이지:</span>
                    <span className="ml-2 font-medium">{autoProgress.page} / {autoProgress.totalPages}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">불러온 드라마:</span>
                    <span className="ml-2 font-medium">{autoProgress.dramas}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">저장된 드라마:</span>
                    <span className="ml-2 font-medium">{autoSavedCount}</span>
                  </div>
                </div>
                
                {/* 목록 진행 바 */}
                <div className="mb-4">
                  <span className="text-sm text-gray-600">목록 크롤링:</span>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, Math.round((autoProgress.page / autoProgress.totalPages) * 100))}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* 상세 정보 진행 바 */}
                {autoDetailProcessing && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-600">상세 정보 크롤링: {detailProgress.current} / {detailProgress.total}</span>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, Math.round((detailProgress.current / detailProgress.total) * 100))}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 크롤링 결과 */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <p>{error}</p>
          </div>
        )}

        {crawlingInProgress && (
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">크롤링 결과 ({crawledDramas.length})</h2>
            <div className="flex space-x-2">
              <button
                onClick={toggleSelectAll}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
              >
                {crawledDramas.every(drama => selectedDramas[drama.id]) ? '전체 선택 해제' : '전체 선택'}
              </button>
              <button
                onClick={saveSelectedDramas}
                disabled={Object.keys(selectedDramas).filter(id => selectedDramas[id]).length === 0}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center disabled:opacity-50"
              >
                <Save size={16} className="mr-1" />
                선택 항목 저장
              </button>
            </div>
          </div>
        )}

        {/* 드라마 목록 */}
        {crawledDramas.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      선택
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      이미지
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      제목
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      카테고리
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      방영년도
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      에피소드
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      평점
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {crawledDramas.map((drama) => (
                    <tr key={drama.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input 
                          type="checkbox"
                          checked={!!selectedDramas[drama.id]}
                          onChange={() => toggleDramaSelection(drama.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {drama.imageUrl && (
                          <div className="w-12 h-16 relative">
                            <img 
                              src={drama.imageUrl} 
                              alt={drama.title}
                              className="object-cover w-full h-full rounded"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {drama.title}
                        </div>
                        <div className="text-xs text-gray-500 max-w-md line-clamp-2">
                          {drama.summary}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {drama.category === 'drama' ? '드라마' : 
                         drama.category === 'movie' ? '영화' : drama.category}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {drama.year || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {drama.episodes || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {drama.rating > 0 ? drama.rating.toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDetailHtmlSubmit(drama)}
                            disabled={savingDramas[drama.id] === 'loading' || savingDramas[drama.id] === 'saved'}
                            className={`inline-flex items-center px-2 py-1 border rounded-md text-xs font-medium
                              ${savingDramas[drama.id] === 'saved' 
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : savingDramas[drama.id] === 'error'
                                  ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                              }`}
                          >
                            {getSavingStatusIcon(drama.id)}
                            <span className="ml-1">
                              {savingDramas[drama.id] === 'loading' ? '저장 중...' : 
                               savingDramas[drama.id] === 'saved' ? '저장됨' : 
                               savingDramas[drama.id] === 'error' ? '재시도' : '상세 HTML 입력'}
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              try {
                                console.log(`드라마 '${drama.title}'의 상세 정보 직접 크롤링 시작`);
                                alert(`'${drama.title}' 상세 정보를 크롤링합니다.`);
                                
                                // 저장 중 표시
                                setSavingDramas(prev => ({ ...prev, [drama.id]: 'loading' }));
                                
                                // 스텔스 크롤러 API 직접 호출
                                fetch('/api/crawler/stealth-crawler', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    url: drama.url,
                                    mode: 'detail'
                                  })
                                })
                                .then(response => {
                                  console.log('API 응답 상태:', response.status);
                                  return response.json();
                                })
                                .then(data => {
                                  if (data.success) {
                                    console.log('상세 정보 크롤링 성공:', data.data.title);
                                    
                                    // 드라마 객체에 상세 정보 추가
                                    Object.assign(drama, data.data);
                                    
                                    // 데이터베이스에 저장
                                    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
                                    return fetch('/api/crawler/save-drama', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': token ? `Bearer ${token}` : '',
                                      },
                                      body: JSON.stringify({
                                        data: data.data
                                      })
                                    });
                                  } else {
                                    throw new Error(data.message || '상세 정보 크롤링 실패');
                                  }
                                })
                                .then(saveResponse => saveResponse.json())
                                .then(saveResult => {
                                  // 저장 완료 표시
                                  setSavingDramas(prev => ({ ...prev, [drama.id]: 'saved' }));
                                  showToast(`'${drama.title}' 저장 완료`, 'success');
                                })
                                .catch(error => {
                                  console.error('상세 정보 처리 오류:', error);
                                  setSavingDramas(prev => ({ ...prev, [drama.id]: 'error' }));
                                  showToast(`'${drama.title}' 처리 중 오류: ${error.message}`, 'error');
                                });
                              } catch (err) {
                                console.error('버튼 클릭 처리 중 오류:', err);
                                alert(`처리 중 오류: ${err.message}`);
                              }
                            }}
                            disabled={savingDramas[drama.id] === 'loading' || savingDramas[drama.id] === 'saved'}
                            className="ml-2 text-purple-600 hover:text-purple-800 text-xs hover:underline disabled:opacity-50 disabled:hover:no-underline"
                          >
                            스텔스 크롤링
                          </button>
                          <a
                            href={drama.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                          >
                            상세
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 토스트 메시지 */}
        {toast.visible && (
          <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {toast.message}
          </div>
        )}
      </div>

      {/* 상세 페이지 HTML 입력 모달 */}
      {detailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                "{currentDrama?.title}"
              </h2>
              <button 
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              {currentDrama?.id === 'auto-list' ? (
                <>MyDramalist 목록 페이지에서 <code>&lt;body&gt;</code> 요소를 우클릭하여 Copy &gt; outerHTML을 선택해 붙여넣으세요.</>
              ) : currentDrama?.id === 'auto-detail' ? (
                <>MyDramalist 상세 페이지에서 <code>&lt;body&gt;</code> 요소를 우클릭하여 Copy &gt; outerHTML을 선택해 붙여넣으세요.</>
              ) : (
                <>MyDramalist 사이트에서 드라마 상세 페이지에 접속한 후, 개발자 도구를 열고 &lt;body&gt; 요소를 우클릭하여 Copy &gt; outerHTML을 선택해 붙여넣으세요.</>
              )}
            </p>
            <textarea
              rows="10"
              value={detailHtmlContent}
              onChange={(e) => setDetailHtmlContent(e.target.value)}
              placeholder="HTML 코드를 붙여넣으세요."
              className="w-full border border-gray-300 rounded-md px-4 py-2 font-mono text-sm"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleHtmlSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                {currentDrama?.id === 'auto-list' || currentDrama?.id === 'auto-detail' ? '계속하기' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  if (!session || session.user.role !== 'admin') {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }
  
  return {
    props: {
      session,
    },
  };
} 