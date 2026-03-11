import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Seo from '../../components/Seo';
import StructuredData from '../../components/StructuredData';
import Analytics from '../../components/Analytics';
import { generateNewsArticleJsonLd, generateMetaTags, generateKeywords } from '../../utils/seoHelpers';
import { Heart, Share2, Clock, ChevronRight, ArrowUp, Send, X, Smile } from 'lucide-react';
import Cookies from 'js-cookie';
import { connectToDatabase } from "../../utils/mongodb";
import { ObjectId } from 'mongodb';
import { useSession } from 'next-auth/react';
import DirectRiddleContent from '../../components/DirectRiddleContent';
import CommentTicker from '../../components/home/CommentTicker';
import TrendingNow from '../../components/home/TrendingNow';
import MoreNews from '../../components/MoreNews';

// Riddle 임베드 지원을 위한 뉴스 페이지

// TagsSection 컴포넌트 - 태그가 많을 때 "Show more" 버튼으로 관리
const TagsSection = ({ tags }) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const MAX_VISIBLE_TAGS = 10; // 처음에 보여줄 태그 개수

  const visibleTags = showAllTags ? tags : tags.slice(0, MAX_VISIBLE_TAGS);
  const hasMoreTags = tags.length > MAX_VISIBLE_TAGS;

  return (
    <div className="mt-10 pt-6 border-t border-gray-100">
      <div className="flex flex-wrap gap-2">
        {visibleTags.map((tag, index) => (
          <Link
            key={index}
            href={`/search?q=${encodeURIComponent(tag)}`}
            className="bg-gray-100 text-gray-800 text-sm px-4 py-2 rounded-full transition-all duration-300 cursor-pointer hover:text-white active:text-white"
            style={{
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#009efc';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#1f2937';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = '#009efc';
              e.currentTarget.style.color = 'white';
            }}
            onTouchEnd={(e) => {
              const target = e.currentTarget;
              setTimeout(() => {
                if (target) {
                  target.style.backgroundColor = '#f3f4f6';
                  target.style.color = '#1f2937';
                }
              }, 200);
            }}
          >
            #{tag}
          </Link>
        ))}
      </div>

      {hasMoreTags && (
        <button
          onClick={() => setShowAllTags(!showAllTags)}
          className="mt-4 text-sm text-gray-600 hover:text-pink-500 transition-colors duration-300 flex items-center gap-1 font-medium"
        >
          {showAllTags ? (
            <>
              <ChevronRight size={16} className="-rotate-90 transition-transform" />
              Show less tags
            </>
          ) : (
            <>
              <ChevronRight size={16} className="rotate-90 transition-transform" />
              Show {tags.length - MAX_VISIBLE_TAGS} more tags
            </>
          )}
        </button>
      )}
    </div>
  );
};

// InstagramEmbed 컴포넌트 - 초기 로딩 개선
const InstagramEmbed = ({ url, className = "" }) => {
  const [isClient, setIsClient] = useState(false);
  const blockquoteRef = useRef(null);
  const postId = extractInstagramPostId(url);


  // 클라이언트 사이드 확인
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!postId) {
    return (
      <div className={`instagram-embed-error ${className}`} style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: '8px', margin: '20px 0', backgroundColor: '#f8f9fa' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>Instagram 게시물을 로드할 수 없습니다.</p>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#3897f0', textDecoration: 'none', fontSize: '14px' }}>
            Instagram에서 직접 보기 →
          </a>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!isClient || !blockquoteRef.current) {
      return;
    }


    // 스크립트가 없으면 로드
    if (!window.instgrm && window.loadInstagramScript) {
      window.loadInstagramScript();
    }

    let processTimer = null;
    let eventListener = null;

    const processInstagramEmbed = () => {
      // blockquote가 실제로 DOM에 있는지 확인
      if (!blockquoteRef.current || !document.body.contains(blockquoteRef.current)) {
        return false;
      }


      if (window.instgrm?.Embeds) {
        try {
          window.instgrm.Embeds.process();
          return true;
        } catch (error) {
          console.error('[InstagramEmbed] process() 실행 오류:', error);
        }
      }
      return false;
    };

    // 즉시 처리 시도
    if (processInstagramEmbed()) {
      return;
    }

    // 스크립트 로드 완료 이벤트 리스너
    eventListener = () => {
      setTimeout(() => {
        processInstagramEmbed();
      }, 50);
    };

    window.addEventListener('instagramScriptLoaded', eventListener);

    // 재시도 로직 - 더 빠르고 자주
    let retryCount = 0;
    const maxRetries = 30;

    const retryProcess = () => {
      if (retryCount >= maxRetries) {
        return;
      }

      if (!processInstagramEmbed()) {
        retryCount++;
        // 처음 10번은 빠르게 (100ms), 이후는 느리게 (500ms)
        const delay = retryCount <= 10 ? 100 : 500;
        processTimer = setTimeout(retryProcess, delay);
      } else {
      }
    };

    // 즉시 시작
    processTimer = setTimeout(retryProcess, 0);

    return () => {
      if (processTimer) clearTimeout(processTimer);
      if (eventListener) window.removeEventListener('instagramScriptLoaded', eventListener);
    };
  }, [isClient]);

  // 클라이언트 사이드가 아닌 경우 로딩 표시
  if (!isClient) {
    return (
      <div className={`instagram-loading ${className}`} style={{ 
        margin: '20px 0', 
        padding: '20px',
        textAlign: 'center',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mx-auto mb-3"></div>
          <p className="text-gray-500">Instagram 게시물 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`instagram-embed-container ${className}`} style={{ margin: '20px 0' }}>
      <blockquote
        ref={blockquoteRef}
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: '#FFF',
          border: '0',
          borderRadius: '3px',
          boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
          margin: '1px auto',
          maxWidth: '540px',
          minWidth: '326px',
          padding: '0',
          width: '99.375%'
        }}
      >
        <div style={{ padding: '16px' }}>
          <a 
            href={url} 
            style={{ 
              background: '#FFFFFF', 
              lineHeight: '0', 
              padding: '0 0', 
              textAlign: 'center', 
              textDecoration: 'none', 
              width: '100%' 
            }} 
            target="_blank"
            rel="noopener noreferrer"
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ backgroundColor: '#F4F4F4', borderRadius: '50%', flexGrow: '0', height: '40px', marginRight: '14px', width: '40px' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: '1', justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#F4F4F4', borderRadius: '4px', flexGrow: '0', height: '14px', marginBottom: '6px', width: '100px' }}></div>
                <div style={{ backgroundColor: '#F4F4F4', borderRadius: '4px', flexGrow: '0', height: '14px', width: '60px' }}></div>
              </div>
            </div>
            <div style={{ padding: '19% 0' }}></div>
            <div style={{ display: 'block', height: '50px', margin: '0 auto 12px', width: '50px' }}>
              <svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                  <g transform="translate(-511.000000, -20.000000)" fill="#000000">
                    <path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101"></path>
                  </g>
                </g>
              </svg>
            </div>
            <div style={{ paddingTop: '8px' }}>
              <div style={{ color: '#3897f0', fontFamily: 'Arial,sans-serif', fontSize: '14px', fontStyle: 'normal', fontWeight: '550', lineHeight: '18px' }}>
                Instagram에서 이 게시물 보기
              </div>
            </div>
          </a>
        </div>
      </blockquote>
    </div>
  );
};

// TwitterEmbed 컴포넌트 - 크기 자동 조정 및 초기 로딩 개선
const TwitterEmbed = ({ url, className = "" }) => {
  const [isClient, setIsClient] = useState(false);
  const [embedHeight, setEmbedHeight] = useState(400);
  const embedRef = useRef(null);

  // 클라이언트 사이드 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !embedRef.current) {
      return;
    }


    // 스크립트가 없으면 로드
    if (!window.twttr && window.loadTwitterScript) {
      window.loadTwitterScript();
    }

    let processTimer = null;
    let eventListener = null;

    const processTwitterEmbed = () => {
      // embedRef가 실제로 DOM에 있는지 확인
      if (!embedRef.current || !document.body.contains(embedRef.current)) {
        return false;
      }


      if (window.twttr?.widgets) {
        try {
          const container = embedRef.current;

          // 컨테이너 초기화
          container.innerHTML = '';

          // 트윗 ID 추출
          const tweetIdMatch = url.match(/\/status(?:es)?\/(\d+)/);
          if (tweetIdMatch) {
            const tweetId = tweetIdMatch[1];

            // 트위터 위젯 생성
            window.twttr.widgets.createTweet(
              tweetId,
              container,
              {
                theme: 'light',
                lang: 'ko',
                dnt: true,
                conversation: 'none',
                cards: 'hidden'
              }
            ).then((element) => {
              if (element) {
                // 높이 자동 조정
                setTimeout(() => {
                  const iframe = element.querySelector('iframe');
                  if (iframe) {
                    const height = iframe.offsetHeight || iframe.scrollHeight;
                    setEmbedHeight(Math.min(height + 20, 600));
                  }
                }, 1000);
                return true;
              } else {
                return false;
              }
            }).catch((error) => {
              console.error('[TwitterEmbed] 트위터 위젯 생성 실패:', error);
              return false;
            });
            return true; // Promise 반환���로 성공으로 간주
          } else {
            console.error('[TwitterEmbed] 유효하지 않은 트윗 URL:', url);
            return false;
          }
        } catch (error) {
          console.error('[TwitterEmbed] widgets 처리 오류:', error);
          return false;
        }
      }
      return false;
    };

    // 즉시 처리 시도
    if (processTwitterEmbed()) {
      return;
    }

    // 스크립트 로드 완료 이벤트 리스너
    eventListener = () => {
      setTimeout(() => {
        processTwitterEmbed();
      }, 50);
    };

    window.addEventListener('twitterScriptLoaded', eventListener);

    // 재시도 로직 - 더 빠르고 자주
    let retryCount = 0;
    const maxRetries = 30;

    const retryProcess = () => {
      if (retryCount >= maxRetries) {
        return;
      }

      if (!processTwitterEmbed()) {
        retryCount++;
        // 처음 10번은 빠르게 (100ms), 이후는 느리게 (500ms)
        const delay = retryCount <= 10 ? 100 : 500;
        processTimer = setTimeout(retryProcess, delay);
      } else {
      }
    };

    // 즉시 시작
    processTimer = setTimeout(retryProcess, 0);

    return () => {
      if (processTimer) clearTimeout(processTimer);
      if (eventListener) window.removeEventListener('twitterScriptLoaded', eventListener);
    };
  }, [isClient, url]);

  // 클라이언트 사이드가 아닌 경우 로딩 표시
  if (!isClient) {
    return (
      <div className={`twitter-loading ${className}`} style={{ 
        margin: '20px 0', 
        padding: '20px',
        textAlign: 'center',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        backgroundColor: '#f8f9fa'
      }}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-3"></div>
        <p className="text-gray-500">트위터 게시물 로딩 중...</p>
      </div>
    );
  }

  return (
    <div 
      ref={embedRef}
      className={`twitter-embed-container ${className}`} 
      style={{ 
        margin: '20px 0',
        minHeight: `${embedHeight}px`,
        maxHeight: '600px',
        overflow: 'hidden'
      }}
    >
      {/* 트위터 위젯이 여기에 동적으로 생성됩니다 */}
    </div>
  );
};

// RiddleEmbed 컴포넌트 - Riddle 퀴즈/설문 임베드 (개선된 버전)
const RiddleEmbed = ({ riddleId, className = "" }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const embedRef = useRef(null);

  // 클라이언트 사이드 확인
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    
    if (!isClient || !riddleId) {
      if (!riddleId) {
        console.error('[RiddleEmbed] riddleId가 없습니다');
        setError(true);
        setLoading(false);
      }
      return;
    }

    // 직접 iframe 방식 사용 - 스크립트 의존성 제거
    setLoading(false); // 스크립트 로딩 필요 없음
  }, [riddleId, isClient]);

  // 클라이언트 사이드가 아닌 경우 로딩 표시
  if (!isClient) {
    return (
      <div className={`riddle-loading ${className}`} style={{ 
        padding: '20px', 
        border: '1px solid #e9ecef', 
        borderRadius: '8px', 
        textAlign: 'center',
        color: '#666',
        margin: '20px 0',
        backgroundColor: '#f8f9fa',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Riddle 로딩 중...</p>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#999' }}>ID: {riddleId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`riddle-embed-error ${className}`} style={{ 
        padding: '20px', 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        textAlign: 'center',
        color: '#666',
        margin: '20px 0',
        backgroundColor: '#f9f9f9'
      }}>
        <p>❌ Riddle을 로드할 수 없습니다.</p>
        <p style={{ fontSize: '12px', marginTop: '10px' }}>Riddle ID: {riddleId}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`riddle-embed-loading ${className}`} style={{ 
        padding: '40px', 
        textAlign: 'center',
        margin: '20px 0',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px'
      }}>
        <div style={{ 
          display: 'inline-block', 
          width: '20px', 
          height: '20px', 
          border: '2px solid #f3f3f3', 
          borderTop: '2px solid #3498db', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <p style={{ marginTop: '10px', color: '#666' }}>🔄 Riddle 로딩 중...</p>
        <p style={{ fontSize: '12px', color: '#999' }}>ID: {riddleId}</p>
      </div>
    );
  }

  // 직접 iframe 방식으로 변경 - 더 안정적
  return (
    <div ref={embedRef} className={`riddle-embed-container ${className}`} style={{ margin: '20px 0', width: '100%' }}>
      <div 
        className="riddle2-wrapper" 
        data-rid-id={riddleId}
        data-auto-scroll="true" 
        data-is-fixed-height-enabled="false" 
        data-bg="#fff" 
        data-fg="#00205b" 
        style={{ 
          margin: '0 auto', 
          maxWidth: '100%', 
          width: '100%',
          minHeight: '500px',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <iframe 
          title={`Riddle Quiz ${riddleId}`}
          src={`https://www.riddle.com/embed/a/${riddleId}?lazyImages=false&staticHeight=false`}
          allow="autoplay"
          referrerPolicy="strict-origin"
          style={{
            width: '100%',
            height: '500px',
            border: 'none',
            display: 'block'
          }}
          onLoad={() => {
            setLoading(false);
          }}
          onError={() => {
            console.error(`[RiddleEmbed] iframe 로드 실패 - ID: ${riddleId}`);
            setError(true);
            setLoading(false);
          }}
        />
      </div>
    </div>
  );
};

// Instagram 포스트 ID 추출 함수
const extractInstagramPostId = (url) => {
  const regex = /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};


// 콘텐츠에서 Riddle 임베드를 처리하는 함수 (개선된 버전)
const processRiddleEmbeds = (content) => {
  if (!content) return content;
  
  
  // 더 강력한 Riddle 임베드 HTML 패턴 매칭 (여러 패턴 지원)
  const riddlePatterns = [
    // 기본 riddle2-wrapper 패턴
    /<div[^>]*class="riddle2-wrapper"[^>]*data-rid-id="([^"]+)"[^>]*>.*?<\/div>/gs,
    // data-rid-id가 먼저 오는 경우
    /<div[^>]*data-rid-id="([^"]+)"[^>]*class="riddle2-wrapper"[^>]*>.*?<\/div>/gs,
    // 단일 따옴표 사용하는 경우
    /<div[^>]*class='riddle2-wrapper'[^>]*data-rid-id='([^']+)'[^>]*>.*?<\/div>/gs,
    // script와 iframe이 포함된 복잡한 형태 (사용자가 제공한 형태)
    /<div[^>]*data-rid-id="([^"]+)"[^>]*>[\s\S]*?<script[^>]*riddle[^>]*><\/script>[\s\S]*?<iframe[^>]*><\/iframe>[\s\S]*?<\/div>/gs,
    // 간단한 패턴 (스크립트와 iframe만 있는 경우)
    /data-rid-id=["']([^"']+)["'][^>]*>/g
  ];
  
  let processedContent = content;
  const foundRiddles = [];
  
  // 각 패턴으로 매칭 시도
  riddlePatterns.forEach((regex, patternIndex) => {
    const matches = [...processedContent.matchAll(regex)];
    
    matches.forEach((match, index) => {
      const fullMatch = match[0];
      const riddleId = match[1];
      
      if (riddleId && !foundRiddles.some(r => r.id === riddleId)) {
        foundRiddles.push({ id: riddleId, fullMatch });
        
        // Riddle 플레이스홀더 생성
        const riddlePlaceholder = `<div class="riddle-embed-placeholder" data-riddle-id="${riddleId}" data-index="${foundRiddles.length - 1}"></div>`;
        
        // 원본 HTML을 플레이스홀더로 교체
        processedContent = processedContent.replace(fullMatch, riddlePlaceholder);
      }
    });
  });
  
  return processedContent;
};

// ArticleContent 컴포넌트
const ArticleContent = ({ content }) => {
  const [processedContent, setProcessedContent] = useState('');
  const [instagramUrls, setInstagramUrls] = useState([]);
  const [twitterUrls, setTwitterUrls] = useState([]);
  const [riddleIds, setRiddleIds] = useState([]);
  const [isClient, setIsClient] = useState(false);

  // 클라이언트 사이드 확인
  useEffect(() => {
    setIsClient(true);
  }, []);


  useEffect(() => {
    if (!content || !isClient) {
      return;
    }


    // HTML 엔티티 디코딩 함수 - 강화된 버전
    const decodeHtmlEntities = (str) => {
      if (!str) return str;
      
      // 먼저 textarea를 이용한 기본 디코딩
      const textarea = document.createElement('textarea');
      textarea.innerHTML = str;
      let decoded = textarea.value;
      
      // 추가적인 HTML 엔티티 디코딩 (리들 코드에서 자주 발생)
      decoded = decoded
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&'); // 이것은 마지막에 해야 함
      
      
      return decoded;
    };
    
    // 콘텐츠를 먼저 디코딩
    let decodedContent = decodeHtmlEntities(content);

    // 1. 유튜브 임베드 처리
    let processed = decodedContent.replace(
      /<iframe\s+[^>]*src=[\"'](https:\/\/www\.youtube\.com\/embed\/([^\"'&?]+))[\"'][^>]*><\/iframe>/g, 
      function(match, url, videoId) {
        return `<div style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; max-width:100%; margin:10px 0;">
          <iframe 
            src="https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0" 
            style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen 
            title="YouTube video player" 
            frameborder="0">
          </iframe>
        </div>`;
      }
    );

    // 2. Instagram 임베드 코드가 이미 있는지 확인
    const hasInstagramEmbed = processed.includes('instagram-media');

    if (hasInstagramEmbed) {
      // Instagram 임베드 콘텐츠 감지를 위해 즉시 스크립트 로드
      if (typeof window !== 'undefined' && window.loadInstagramScript) {
        window.loadInstagramScript();
      }
      setProcessedContent(processed);
      setInstagramUrls([]);
    } else {
      // Instagram 링크 찾기 및 추출 (기존 방식)
      const instagramRegex = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)(?:\/)?(?:\?[^"'\s]*)?/g;
      const matches = [...processed.matchAll(instagramRegex)];
      const urls = matches.map(match => match[0]);
      
      
      // 3. Instagram 링크를 고유한 플레이스홀더로 교체 (순서대로 처리)
      let placeholderIndex = 0;
      const placeholderMap = new Map();
      
      matches.forEach((match) => {
        const fullUrl = match[0];
        if (!placeholderMap.has(fullUrl)) {
          const uniqueId = `INSTAGRAM_PLACEHOLDER_${placeholderIndex}`;
          placeholderMap.set(fullUrl, uniqueId);
          processed = processed.replace(fullUrl, uniqueId);
          placeholderIndex++;
        }
      });


      setInstagramUrls(urls);
    }
    
    // 4. Twitter 임베드 처리
    const hasTwitterEmbed = processed.includes('twitter-tweet');
    
    if (hasTwitterEmbed) {
      // Twitter 임베드 코드가 이미 있으면 그대로 사용
      setTwitterUrls([]);
    } else {
      // Twitter/X URL 찾기
      const twitterRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(?:@)?([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)/g;
      const twitterMatches = [...processed.matchAll(twitterRegex)];
      const twitterUrlList = twitterMatches.map(match => match[0]);
      
      
      // Twitter 링크를 플레이스홀더로 교체
      let twitterPlaceholderIndex = 0;
      const twitterPlaceholderMap = new Map();
      
      twitterMatches.forEach((match) => {
        const fullUrl = match[0];
        if (!twitterPlaceholderMap.has(fullUrl)) {
          const uniqueId = `TWITTER_PLACEHOLDER_${twitterPlaceholderIndex}`;
          twitterPlaceholderMap.set(fullUrl, uniqueId);
          processed = processed.replace(fullUrl, uniqueId);
          twitterPlaceholderIndex++;
        }
      });
      
      setTwitterUrls(twitterUrlList);
    }
    
    // 5. Riddle 임베드 처리 (개선된 버전)
    
    // Riddle 관련 키워드 존재 여부 확인
    const hasRiddleKeyword = processed.includes('riddle') || processed.includes('Riddle');
    const hasDataRidId = processed.includes('data-rid-id');
    
    // 여러 Riddle 패턴으로 검색 (HTML 엔티티 디코딩된 형태도 매칭)
    const riddlePatterns = [
      // 기본 riddle2-wrapper 패턴 (class 속성이 먼저)
      /<div[^>]*class=["']riddle2-wrapper["'][^>]*data-rid-id=["']([^"']+)["'][^>]*>.*?<\/div>/gs,
      // data-rid-id가 먼저 오는 경우
      /<div[^>]*data-rid-id=["']([^"']+)["'][^>]*class=["']riddle2-wrapper["'][^>]*>.*?<\/div>/gs,
      // script와 iframe이 포함된 복잡한 형태 (사용자가 제공한 형태)
      /<div[^>]*class=["']riddle2-wrapper["'][^>]*data-rid-id=["']([^"']+)["'][^>]*>[\s\S]*?<script[^>]*><\/script>[\s\S]*?<iframe[^>]*><\/iframe>[\s\S]*?<\/div>/gs,
      // iframe만 있는 형태
      /<div[^>]*data-rid-id=["']([^"']+)["'][^>]*>[\s\S]*?<iframe[^>]*riddle\.com[^>]*><\/iframe>[\s\S]*?<\/div>/gs,
      // 매우 단순한 형태 (data-rid-id만 있는 경우)
      /data-rid-id=["']([^"']+)["']/g
    ];
    
    const riddleIdList = [];
    let riddlePlaceholderIndex = 0;
    const riddlePlaceholderMap = new Map();
    
    riddlePatterns.forEach((regex, patternIndex) => {
      const riddleMatches = [...processed.matchAll(regex)];
      
      if (riddleMatches.length > 0) {
        riddleMatches.forEach((match, matchIndex) => {
          const fullMatch = match[0];
          const riddleId = match[1];
          
          if (riddleId && !riddlePlaceholderMap.has(fullMatch)) {
            const uniqueId = `RIDDLE_PLACEHOLDER_${riddlePlaceholderIndex}`;
            riddlePlaceholderMap.set(fullMatch, uniqueId);
            processed = processed.replace(fullMatch, uniqueId);
            riddleIdList.push(riddleId);
            riddlePlaceholderIndex++;
            
          }
        });
      }
    });
    
    setRiddleIds(riddleIdList);
    
    setProcessedContent(processed);
  }, [content, isClient]);

  // Instagram 스크립트 로딩 및 처리
  useEffect(() => {
    if (!isClient || !processedContent || !processedContent.includes('instagram-media')) {
      return;
    }

    let retryCount = 0;
    const maxRetries = 30;
    let timer = null;

    const processInstagram = () => {

      // 스크립트가 로드되었는지 확인
      if (window.instgrm && window.instgrm.Embeds) {
        const blockquotes = document.querySelectorAll('blockquote.instagram-media');

        if (blockquotes.length > 0) {
          try {
            window.instgrm.Embeds.process();
            return true;
          } catch (error) {
            console.error('[ArticleContent] Instagram 처리 오류:', error);
          }
        } else {
        }
      } else {
        // 스크립트 로드 요청
        if (window.loadInstagramScript) {
          window.loadInstagramScript();
        }
      }

      // 재시도
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = retryCount <= 10 ? 100 : 500;
        timer = setTimeout(processInstagram, delay);
      } else {
      }

      return false;
    };

    // 즉시 시작
    timer = setTimeout(processInstagram, 0);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isClient, processedContent]);

  // Twitter 스크립트 로딩 및 처리
  useEffect(() => {
    if (!isClient || !processedContent || !processedContent.includes('twitter-tweet')) return;

    let retryCount = 0;
    const maxRetries = 30;
    let timer = null;

    const processTwitter = () => {

      // 스크립트가 로드되었는지 확인
      if (window.twttr && window.twttr.widgets) {
        const blockquotes = document.querySelectorAll('blockquote.twitter-tweet');

        if (blockquotes.length > 0) {
          try {
            window.twttr.widgets.load();
            return true;
          } catch (error) {
            console.error('[ArticleContent] Twitter 처리 오류:', error);
          }
        } else {
        }
      } else {
        // 스크립트 로드 요청
        if (window.loadTwitterScript) {
          window.loadTwitterScript();
        }
      }

      // 재시도
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = retryCount <= 10 ? 100 : 500;
        timer = setTimeout(processTwitter, delay);
      } else {
      }

      return false;
    };

    // 즉시 시작
    timer = setTimeout(processTwitter, 0);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isClient, processedContent]);

  // 콘텐츠를 파싱하여 Instagram 임베드와 HTML을 분리
  const renderContent = () => {
    if (!processedContent || !isClient) return null;

    // 고유한 플레이스홀더로 분리
    const placeholderRegex = /(INSTAGRAM_PLACEHOLDER_|TWITTER_PLACEHOLDER_|RIDDLE_PLACEHOLDER_)(\d+)/g;
    const parts = processedContent.split(placeholderRegex);
    
    
    return parts.map((part, index) => {
      // Instagram 플레이스홀더 처리
      if (parts[index - 1] === 'INSTAGRAM_PLACEHOLDER_' && /^\d+$/.test(part)) {
        const placeholderIndex = parseInt(part);
        const url = instagramUrls[placeholderIndex];
        
        if (url) {
          return (
            <InstagramEmbed 
              key={`instagram-${placeholderIndex}`} 
              url={url} 
              className="my-4"
            />
          );
        }
      }
      
      // Twitter 플레이스홀더 처리
      if (parts[index - 1] === 'TWITTER_PLACEHOLDER_' && /^\d+$/.test(part)) {
        const placeholderIndex = parseInt(part);
        const url = twitterUrls[placeholderIndex];
        
        if (url) {
          return (
            <TwitterEmbed 
              key={`twitter-${placeholderIndex}`} 
              url={url} 
              className="my-4"
            />
          );
        }
      }
      
      // Riddle 플레이스홀더 처리
      if (parts[index - 1] === 'RIDDLE_PLACEHOLDER_' && /^\d+$/.test(part)) {
        const placeholderIndex = parseInt(part);
        const riddleId = riddleIds[placeholderIndex];
        
        if (riddleId) {
          return (
            <RiddleEmbed 
              key={`riddle-${placeholderIndex}`} 
              riddleId={riddleId} 
              className="my-4"
            />
          );
        } else {
        }
      }
      
      // 플레이스홀더 타입인 경우 건너뛰기
      if (part === 'INSTAGRAM_PLACEHOLDER_' || part === 'TWITTER_PLACEHOLDER_' || part === 'RIDDLE_PLACEHOLDER_') {
        return null;
      }
      
      // 일반 HTML 콘텐츠
      if (part.trim()) {
        return (
          <div 
            key={index}
            dangerouslySetInnerHTML={{ __html: part }}
          />
        );
      }
      
      return null;
    }).filter(Boolean);
  };

  // 클라이언트 사이드가 준비되지 않은 경우 로딩 표시
  if (!isClient) {
    return (
      <div 
        className="ql-editor"
        style={{
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#333',
          padding: '20px',
          border: 'none',
          textAlign: 'center'
        }}
      >
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3"></div>
          <span className="text-gray-500">콘텐츠를 로딩하는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="ql-editor"
      style={{
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#333',
        padding: '0',
        border: 'none'
      }}
    >
      {renderContent()}
    </div>
  );
};

// ReactQuill 스타일은 _app.js 또는 globals.css에서 로드됨

// 랜덤 영어 닉네임 생성 함수
const generateRandomNickname = () => {
  const adjectives = [
    'Amazing', 'Brave', 'Bright', 'Cool', 'Dazzling', 'Elegant', 'Fancy', 
    'Gentle', 'Happy', 'Jolly', 'Kind', 'Lively', 'Magical', 'Noble', 
    'Polite', 'Quirky', 'Radiant', 'Sweet', 'Talented', 'Unique', 'Vibrant', 
    'Witty', 'Zealous', 'Adorable', 'Cheerful', 'Dreamy', 'Glowing', 'Royal',
    'Purple', 'Pink', 'Blue', 'Red', 'Green', 'Golden', 'Silver'
  ];
  
  const nouns = [
    'Fan', 'Star', 'Dreamer', 'Angel', 'Melody', 'Beat', 'Rhythm', 'Soul', 
    'Voice', 'Heart', 'Dancer', 'Singer', 'Artist', 'Legend', 'Tiger', 'Lion', 
    'Eagle', 'Phoenix', 'Dragon', 'Unicorn', 'Fairy', 'Guardian', 'Knight',
    'Blink', 'Once', 'ARMY', 'MooMoo', 'ReVeluv', 'MIDZY', 'STAY', 'MOA', 'NCTzen'
  ];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 100);
  
  return `${randomAdjective}${randomNoun}${randomNumber}`;
};

// 닉네임 기반 색상 생성 함수
const getColorFromNickname = (nickname) => {
  // 첫 글자를 기준으로 색상 결정
  const firstChar = nickname.charAt(0).toLowerCase();
  const colorMap = {
    'a': '#FF3E8E', 'b': '#FF5252', 'c': '#FF7043', 'd': '#FFB74D',
    'e': '#FFEB3B', 'f': '#C0CA33', 'g': '#43A047', 'h': '#26A69A',
    'i': '#00ACC1', 'j': '#42A5F5', 'k': '#5C6BC0', 'l': '#7E57C2',
    'm': '#AB47BC', 'n': '#EC407A', 'o': '#EF5350', 'p': '#FFA726',
    'q': '#FFCA28', 'r': '#9CCC65', 's': '#66BB6A', 't': '#4DB6AC',
    'u': '#4DD0E1', 'v': '#29B6F6', 'w': '#5C6BC0', 'x': '#7986CB',
    'y': '#9575CD', 'z': '#BA68C8'
  };
  
  // 기본 색상과 부가 색상
  const mainColor = colorMap[firstChar] || '#FF3E8E';
  
  // 부가 색상은 색상환에서 반대편 or 인접한 색상
  const hue = mainColor.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  let secondaryColor = '#4A5568';
  
  if (hue) {
    // 기본 색상의 밝기를 조정하여 부가 색상 생성
    const r = parseInt(hue[1], 16);
    const g = parseInt(hue[2], 16);
    const b = parseInt(hue[3], 16);
    
    // 더 어두운 색상으로 변환 (약 70% 밝기)
    const darkenFactor = 0.7;
    const dr = Math.floor(r * darkenFactor);
    const dg = Math.floor(g * darkenFactor);
    const db = Math.floor(b * darkenFactor);
    
    secondaryColor = `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  }
  
  return {
    main: mainColor,
    secondary: secondaryColor
  };
};

// 댓글 날짜 포맷팅 함수
const formatCommentDate = (dateInput) => {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};


// Sample comments data
const comments = [
  {
    author: "K-POP Fan 1",
    date: "3 hours ago",
    text: "I'm so excited about this news! Love this artist and their music. Looking forward to their upcoming activities! 💕",
    likes: 18
  },
  {
    author: "DramaLover",
    date: "5 hours ago",
    text: "This is amazing news! Can't wait to see what happens next. The cinematography looks incredible based on these preview images.",
    likes: 12
  },
  {
    author: "SeoulVibes",
    date: "Yesterday",
    text: "I've been following this story for a while now. Really happy to see this development. The industry needs more of this kind of content!",
    likes: 27
  }
];

// 사용자별 고정 아바타 선택 함수
const getAvatarByUser = (userId, userName) => {
  const avatars = [
    '/images/icons8-bt21-koya-50.png',
    '/images/icons8-bt21-rj-50.png',
    '/images/icons8-bt21-shooky-50.png',
    '/images/icons8-bt21-mang-50.png',
    '/images/icons8-bt21-chimmy-50.png',
    '/images/icons8-bt21-tata-50.png',
    '/images/icons8-bt21-cooky-50.png'
  ];

  // userId 또는 userName을 기반으로 해시값 생성
  const identifier = userId || userName || 'guest';
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = ((hash << 5) - hash) + identifier.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  const selectedAvatar = avatars[Math.abs(hash) % avatars.length];

  // 항상 같은 인덱스 반환
  return selectedAvatar;
};

export default function NewsDetail({ newsArticle, relatedArticles, recentComments = [], rankingNews = [], trendingNews = [], editorsPickNews = [] }) {
  const router = useRouter();
  // All hooks must be called unconditionally at the top level
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(42);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [userId, setUserId] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localComments, setLocalComments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [headerHeight, setHeaderHeight] = useState(60); // Initial height 60vh
  const [textareaFocused, setTextareaFocused] = useState(false);
  const [relatedNewsIds, setRelatedNewsIds] = useState([]); // 상단 관련 뉴스 ID 저장용 상태
  const [currentRelatedIndex, setCurrentRelatedIndex] = useState(0); // Related News 썸네일 인덱스
  const [showRelatedThumbnail, setShowRelatedThumbnail] = useState(true); // Related News 썸네일 표시 상태
  const { data: session } = useSession();

  // Reactions state - DB에서 초기값 로드
  const [reactions, setReactions] = useState({
    like: newsArticle?.reactions?.like || 0,
    dislike: newsArticle?.reactions?.dislike || 0
  });
  const [userReaction, setUserReaction] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [isCopiedToastHiding, setIsCopiedToastHiding] = useState(false);
  const [showMoreNewsSection, setShowMoreNewsSection] = useState(false);
  const [isMoreNewsSectionHiding, setIsMoreNewsSectionHiding] = useState(false);
  const [commentSort, setCommentSort] = useState('latest');
  const [visibleCommentCount, setVisibleCommentCount] = useState(5);

  const previousPathRef = useRef(null);

  // PC sidebar sticky
  const pcSidebarRef = useRef(null);
  const [pcSidebarTop, setPcSidebarTop] = useState(92);

  const navigateToPage = (path) => {
    router.push(path);
  };

  // PC sidebar sticky calculation
  useEffect(() => {
    const el = pcSidebarRef.current;
    if (!el) return;
    const HEADER_H = 92;
    const calcTop = () => {
      const sH = el.offsetHeight;
      const vH = window.innerHeight;
      if (sH <= vH - HEADER_H) {
        setPcSidebarTop(HEADER_H);
      } else {
        setPcSidebarTop(vH - sH - 40);
      }
    };
    const timer = setTimeout(calcTop, 300);
    const observer = new ResizeObserver(calcTop);
    observer.observe(el);
    window.addEventListener('resize', calcTop);
    return () => { clearTimeout(timer); observer.disconnect(); window.removeEventListener('resize', calcTop); };
  }, []);

  // 컴포넌트 마운트 상태 설정
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsMounted(true);
  }, []);

  // For handling loading state during SSR - use conditional rendering, not early return
  const isLoading = router.isFallback;
  
  // User identifier management
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get existing user ID or create new one
      let userIdFromCookie = Cookies.get('userId');
      if (!userIdFromCookie) {
        // Generate random ID
        userIdFromCookie = 'user_' + Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
        // Set cookie expiry to 1 year
        Cookies.set('userId', userIdFromCookie, { expires: 365 });
      }
      setUserId(userIdFromCookie);
    }
  }, []);

  // Load like status from cookies on page load
  useEffect(() => {
    if (typeof window !== 'undefined' && newsArticle?._id && userId) {
      // Get liked info from cookies
      const likedNewsFromCookie = Cookies.get('likedNews');
      if (likedNewsFromCookie) {
        const likedNews = JSON.parse(likedNewsFromCookie);
        if (likedNews[newsArticle._id]) {
          setLiked(true);
        }
      }
    }
  }, [newsArticle, userId]);

  // Load user's own reaction selection from cookie
  useEffect(() => {
    if (typeof window !== 'undefined' && newsArticle?._id) {
      const userReactionsFromCookie = Cookies.get('newsReactions');
      if (userReactionsFromCookie) {
        try {
          const userReactions = JSON.parse(userReactionsFromCookie);
          if (userReactions[newsArticle._id]) {
            setUserReaction(userReactions[newsArticle._id]);
          }
        } catch (e) {}
      }
    }
  }, [newsArticle]);

  // 스크롤 이벤트 등록 - 패시브 이벤트로 성능 향상
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scrollHandler = () => {
      const scrollY = window.scrollY || 0;

      setShowBackToTop(scrollY > 300);

      // 헤더 높이 계산 (60vh → 25vh)
      const maxScroll = window.innerHeight * 0.4;
      if (scrollY <= maxScroll) {
        const newHeight = Math.max(25, 60 - (scrollY / maxScroll) * 35);
        setHeaderHeight(Math.round(newHeight * 10) / 10);
      } else {
        setHeaderHeight(25);
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    scrollHandler();

    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, []);

  // "Want to know more news?" 섹션 - 3초 후 자동 표시, 5초 후 자동 숨김
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowMoreNewsSection(true);
      setIsMoreNewsSectionHiding(false);

      // 표시된 후 5초 뒤 자동 숨김
      const hideTimer = setTimeout(() => {
        // 숨김 애니메이션 시작
        setIsMoreNewsSectionHiding(true);

        // 애니메이션 완료 후 실제로 숨김 (0.5초 후)
        setTimeout(() => {
          setShowMoreNewsSection(false);
          setIsMoreNewsSectionHiding(false);
        }, 500);
      }, 5000);

      return () => clearTimeout(hideTimer);
    }, 3000);

    return () => clearTimeout(showTimer);
  }, []);

  // Track viewed news for recommendations
  useEffect(() => {
    if (newsArticle) {
      try {
        // Track viewed news
        const viewedNews = JSON.parse(Cookies.get('viewedNews') || '[]');
        if (!viewedNews.includes(newsArticle._id)) {
          viewedNews.push(newsArticle._id);
          // Keep only last 20 viewed news
          if (viewedNews.length > 20) {
            viewedNews.shift();
          }
          Cookies.set('viewedNews', JSON.stringify(viewedNews), { expires: 30 });

          // Track viewed category
          const viewedCategories = JSON.parse(Cookies.get('viewedCategories') || '[]');
          if (!viewedCategories.includes(newsArticle.category)) {
            viewedCategories.push(newsArticle.category);
            // Keep only last 10 categories
            if (viewedCategories.length > 10) {
              viewedCategories.shift();
            }
            Cookies.set('viewedCategories', JSON.stringify(viewedCategories), { expires: 30 });
          }
        }
      } catch (error) {
        console.error("Error tracking viewership:", error);
      }
    }
  }, [newsArticle]);

  const scrollToTop = () => {
    // document.body가 실제 스크롤 컨테이너이므로 body.scrollTo 사용
    const scrollContainer = document.body;
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // "Want to know more news?" 버튼 클릭 시 Related News로 스크롤
  const handleScrollToRelatedNews = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 스크롤 복원 플래그 제거 (간섭 방지)
    sessionStorage.removeItem('isBackToNewsDetail');

    // 숨김 애니메이션 시작
    setIsMoreNewsSectionHiding(true);

    // 애니메이션 완료 후 실제로 숨김
    setTimeout(() => {
      setShowMoreNewsSection(false);
      setIsMoreNewsSectionHiding(false);
    }, 500);

    // Related News 섹션 위치 확인
    const relatedSection = document.getElementById('explore-category-section');

    if (relatedSection) {
      const scrollContainer = document.body;
      const currentScroll = scrollContainer.scrollTop;
      const rect = relatedSection.getBoundingClientRect();

      // Related News가 뷰포트보다 아래에 있는 경우에만 스크롤
      // rect.top이 양수면 Related News가 화면 아래쪽에 있음 (아직 안 보임)
      if (rect.top > 0) {
        const headerOffset = 80; // 헤더 높이
        const absoluteTop = currentScroll + rect.top;
        const scrollToPosition = absoluteTop - headerOffset;


        // 스크롤 실행
        setTimeout(() => {
          scrollContainer.scrollTo({
            top: scrollToPosition,
            behavior: 'smooth'
          });
        }, 100);
      } else {
      }
      // rect.top이 0 이하면 Related News가 이미 화면에 보이거나 위에 있음 -> 스크롤 안 함
    }
  };

  // 뉴스 상세 페이지 스크롤 위치 저장 및 복원
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // URL 슬러그를 사용 (MongoDB ID가 아닌)
    const newsSlug = window.location.pathname.split('/news/')[1];
    if (!newsSlug) return;

    // 뒤로가기로 돌아온 경우 스크롤 위치 복원
    const savedScrollPosition = sessionStorage.getItem(`newsScroll_${newsSlug}`);
    const isBackNavigation = sessionStorage.getItem('isBackToNewsDetail') === 'true';

    if (isBackNavigation && savedScrollPosition) {
      const scrollPos = parseInt(savedScrollPosition, 10);

      const restoreScroll = () => {
        window.scrollTo(0, scrollPos);
        document.documentElement.scrollTop = scrollPos;
        document.body.scrollTop = scrollPos;
      };

      restoreScroll();
      [100, 300, 800].forEach(delay => {
        setTimeout(restoreScroll, delay);
      });

      sessionStorage.removeItem('isBackToNewsDetail');
    }

  }, [router]);

  // Handle like functionality
  const handleLike = () => {
    // 좋아요 상태 토글
    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikeCount(newLikedState ? likeCount + 1 : likeCount - 1);
    
    // 쿠키에 좋아요 상태 저장 (1년 유효기간)
    if (typeof window !== 'undefined' && newsArticle?._id) {
      const likedNewsFromCookie = Cookies.get('likedNews');
      const likedNews = likedNewsFromCookie ? JSON.parse(likedNewsFromCookie) : {};
      
      if (newLikedState) {
        likedNews[newsArticle._id] = true;
      } else {
        delete likedNews[newsArticle._id];
      }
      
      Cookies.set('likedNews', JSON.stringify(likedNews), { expires: 365 });
    }
  };

  // Handle bookmark functionality
  const handleBookmark = () => {
    setBookmarked(!bookmarked);
  };

  // 페이지 로드 시 로컬 저장소 및 서버에서 댓글을 가져옴
  useEffect(() => {
    if (newsArticle?._id) {
      fetchComments();
    }
  }, [newsArticle]);
  
  // 댓글 불러오기 함수
  const fetchComments = async () => {
    try {
      if (!newsArticle?._id) return;
      
      const response = await fetch(`/api/news/comment?id=${newsArticle._id}`, {
        headers: { 'x-visitor-id': getVisitorId() }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // API에서 받은 댓글 형식으로 변환
        const formattedComments = data.comments.map(comment => {
          const userId = comment.author?._id || comment._id;
          const userName = comment.author?.name || comment.guestName || 'Guest';
          const avatarUrl = comment.author?.image || getAvatarByUser(userId, userName);
          return {
            id: comment._id,
            author: userName,
            authorId: comment.author?._id || '',
            avatar: avatarUrl,
            text: comment.content,
            timestamp: comment.createdAt,
            likes: comment.likes || 0,
            dislikes: comment.dislikes || 0,
            userReaction: comment.userReaction || null,
            isGuest: comment.isGuest || comment.author?.isGuest || false
          };
        });
        setLocalComments(formattedComments);
      } else {
        console.error('API error fetching comments:', data.message);
        initializeDefaultComments();
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      initializeDefaultComments();
    }
  };
  
  // 기본 댓글 초기화 함수
  const initializeDefaultComments = () => {
    // 기존 댓글에 아바타 추가
    const commentsWithAvatars = comments.map(comment => ({
      ...comment,
      avatar: getAvatarByUser(comment.id, comment.author) // 사용자별 고정 아바타 적용
    }));

    setLocalComments(commentsWithAvatars);
  };
  
  // 방문자 ID 생성/조회 (댓글 좋아요/싫어요 추적용)
  const getVisitorId = () => {
    if (typeof window === 'undefined') return 'anonymous';
    let vid = localStorage.getItem('ksp_visitor_id');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('ksp_visitor_id', vid);
    }
    return vid;
  };

  // 댓글 좋아요/싫어요 처리
  const handleCommentReaction = async (commentId, type) => {
    try {
      const res = await fetch('/api/news/comment-reaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-visitor-id': getVisitorId()
        },
        body: JSON.stringify({ commentId, type })
      });
      const data = await res.json();
      if (data.success) {
        setLocalComments(prev => prev.map(c =>
          c.id === commentId
            ? { ...c, likes: data.likes, dislikes: data.dislikes, userReaction: data.userReaction }
            : c
        ));
      }
    } catch (error) {
      console.error('Error reacting to comment:', error);
    }
  };

  // 댓글 입력 처리
  const handleCommentChange = (e) => {
    setNewComment(e.target.value);
  };
  
  // 댓글 제출 처리
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    // 게스트 댓글 작성 시 이름 확인
    const currentGuestName = guestName.trim() || generateRandomNickname();
    if (!session && !currentGuestName) {
      alert('댓글을 작성하려면 이름을 입력해주세요.');
      return;
    }
    
    setSubmittingComment(true);
    
    try {
      // 디버깅용 로그 추가
      // API를 통해 댓글 등록
      const response = await fetch('/api/news/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: newsArticle._id,
          content: newComment,
          guestName: session ? undefined : currentGuestName
        })
      });
      
      const result = await response.json();

      if (response.ok && result.success) {
        // 댓글 등록 성공 시 댓글 목록 갱신
        fetchComments();
        setNewComment('');
      } else {
        alert(`댓글 등록에 실패했습니다: ${result.message || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      alert('댓글 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmittingComment(false);
    }
  };
  
  // 댓글 삭제 처리
  const handleDeleteComment = async (commentId) => {
    if (!session) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    if (confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
      try {
        const response = await fetch('/api/news/comment', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            commentId
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // 댓글 삭제 성공 시 댓글 목록 갱신
            fetchComments();
          } else {
            alert('댓글 삭제에 실패했습니다: ' + result.message);
          }
        } else {
          const errorData = await response.json();
          alert('댓글 삭제 실패: ' + (errorData.message || '알 수 없는 오류'));
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        alert('댓글 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 컴포넌트 마운트 시 랜덤 닉네임 생성
  useEffect(() => {
    if (!session && !guestName) {
      const randomName = generateRandomNickname();
      setGuestName(randomName);
    }
  }, [session, guestName]);

  // relatedArticles가 변경될 때 relatedNewsIds를 업데이트 (현재 뉴스 제외)
  useEffect(() => {
    if (relatedArticles && relatedArticles.length > 0 && newsArticle) {
      const displayedNewsIds = relatedArticles
        .filter(news => news._id !== newsArticle._id && news.slug !== newsArticle.slug)
        .slice(0, 6)
        .map(news => news._id);
      setRelatedNewsIds(displayedNewsIds);
    }
  }, [relatedArticles, newsArticle]);


  // 뉴스 기사를 찾을 수 없는 경우
  if (!newsArticle) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center p-10 animate-pulse">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Article not found</h1>
            <Link href="/news" className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-full inline-block hover:shadow-lg transition-all">
              Return to news
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // SEO 데이터 생성
  const jsonLd = generateNewsArticleJsonLd(newsArticle);
  // 뉴스 기사에서 첫 번째 이미지 추출
  const extractFirstImageFromContent = (content) => {
    if (!content) return null;
    
    // img 태그에서 src 추출
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch && imgMatch[1]) {
      const src = imgMatch[1];
      // 상대 경로면 절대 경로로 변환
      if (src.startsWith('http')) {
        return src;
      } else if (src.startsWith('/')) {
        return `https://www.kstarpick.com${src}`;
      }
    }
    return null;
  };

  // 뉴스 기사 이미지 우선순위: coverImage > featuredImage > 본문 첫 이미지 > 기본 이미지
  const getNewsImage = (article) => {
    // OG 메타태그용: 서버에서 조회한 원본 이미지 URL 우선 사용 (카카오톡 등 봇 호환)
    if (article.ogImageUrl) {
      return article.ogImageUrl;
    }

    let imageUrl = null;

    if (article.coverImage) imageUrl = article.coverImage;
    else if (article.featuredImage) imageUrl = article.featuredImage;
    else if (article.thumbnailUrl) imageUrl = article.thumbnailUrl;
    else {
      const contentImage = extractFirstImageFromContent(article.content);
      if (contentImage) imageUrl = contentImage;
    }

    // 기본 이미지가 없으면 기본값 사용
    if (!imageUrl) {
      imageUrl = '/images/default-news.jpg';
    }

    // 상대경로를 절대경로로 변환
    if (imageUrl && !imageUrl.startsWith('http')) {
      return `https://www.kstarpick.com${imageUrl}`;
    }

    return imageUrl || 'https://www.kstarpick.com/images/default-news.jpg';
  };

  // 제목과 설명 정리 함수 - HTML 태그와 링크를 완전히 제거
  const cleanTextForMeta = (text, maxLength = 280) => {
    if (!text) return '';
    
    return text
      // HTML 태그 완전 제거 (모든 태그와 속성 포함)
      .replace(/<[^>]*>/g, '')
      // 불완전한 HTML 태그 정리 (예: "a target=_blank href=...")
      .replace(/\b\w+\s*=\s*[^"\s>]*[^>\s]/g, '')
      .replace(/target=_blank/gi, '')
      .replace(/href=https?:\/\/[^\s>]*/gi, '')
      .replace(/href=[^\s>]*/gi, '')
      // HTML 엔티티 디코딩
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&hellip;/g, '...')
      // 문제가 되는 따옴표들을 안전한 문자로 변환
      .replace(/["""]/g, '') // 이중 따옴표 제거
      .replace(/[''']/g, '') // 작은 따옴표 제거
      // 기타 특수 문자 정리
      .replace(/[<>]/g, '') // 꺾쇠 괄호 제거
      .replace(/[&]/g, 'and') // & 문자를 'and'로 변환
      // URL 패턴 제거
      .replace(/https?:\/\/[^\s]*/g, '')
      .replace(/www\.[^\s]*/g, '')
      // 연속된 공백 제거
      .replace(/\s+/g, ' ')
      // 앞뒤 공백 제거
      .trim()
      // 길이 제한
      .substring(0, maxLength);
  };

  const metaTags = newsArticle ? generateMetaTags({
    title: cleanTextForMeta(newsArticle.title, 90),
    description: cleanTextForMeta(newsArticle.description || newsArticle.content?.substring(0, 200), 280) || 'Latest Korean entertainment news from KstarPick',
    image: getNewsImage(newsArticle),
    url: `/news/${newsArticle.slug || newsArticle._id}`,
    type: 'article',
    publishedTime: newsArticle.createdAt,
    modifiedTime: newsArticle.updatedAt,
    category: newsArticle.category,
    tags: newsArticle.tags || [],
    author: newsArticle.author?.name
  }) : {};

  const keywords = newsArticle ? generateKeywords(
    newsArticle.tags || [],
    [newsArticle.category, newsArticle.author?.name].filter(Boolean)
  ) : [];

  // 공유 함수들
  const handleShareFacebook = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `https://www.kstarpick.com/news/${newsArticle?.slug || newsArticle?._id}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareTwitter = () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `https://www.kstarpick.com/news/${newsArticle?.slug || newsArticle?._id}`;
    const shareTitle = newsArticle?.title || '';
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `https://www.kstarpick.com/news/${newsArticle?.slug || newsArticle?._id}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for mobile / non-secure context
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Copy failed:', err);
    }
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
    setShowShareMenu(false);
    // Show floating toast
    setShowCopiedToast(true);
    setIsCopiedToastHiding(false);
    setTimeout(() => {
      setIsCopiedToastHiding(true);
      setTimeout(() => setShowCopiedToast(false), 500);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Head>
        {newsArticle ? (
          <>
            <title>{cleanTextForMeta(newsArticle.title, 90)} | KstarPick</title>
            <meta name="description" content={cleanTextForMeta(newsArticle.description || newsArticle.content?.substring(0, 200), 280) || 'Latest Korean entertainment news from KstarPick'} />
            
            {/* Open Graph 메타태그 */}
            <meta property="og:title" content={cleanTextForMeta(newsArticle.title, 90)} />
            <meta property="og:description" content={cleanTextForMeta(newsArticle.description || newsArticle.content?.substring(0, 200), 280) || 'Latest Korean entertainment news from KstarPick'} />
            <meta property="og:image" content={getNewsImage(newsArticle)} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:type" content="image/jpeg" />
            <meta property="og:image:alt" content={cleanTextForMeta(newsArticle.title, 90)} />
            <meta property="og:url" content={`https://www.kstarpick.com/news/${newsArticle.slug || newsArticle._id}`} />
            <meta property="og:type" content="article" />
            <meta property="og:site_name" content="KstarPick - K-Pop News Portal" />
            <meta property="og:locale" content="en_US" />
            
            {/* Twitter 메타태그 */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={cleanTextForMeta(newsArticle.title, 90)} />
            <meta name="twitter:description" content={cleanTextForMeta(newsArticle.description || newsArticle.content?.substring(0, 200), 280) || 'Latest Korean entertainment news from KstarPick'} />
            <meta name="twitter:image" content={getNewsImage(newsArticle)} />
            <meta name="twitter:url" content={`https://www.kstarpick.com/news/${newsArticle.slug || newsArticle._id}`} />
            
            {/* 추가 메타태그 */}
            <meta name="author" content={newsArticle.author?.name || 'KstarPick'} />
            <meta name="keywords" content={keywords.join(', ')} />
            <meta property="article:published_time" content={newsArticle.createdAt} />
            <meta property="article:modified_time" content={newsArticle.updatedAt} />
            <meta property="article:section" content={newsArticle.category} />
            <meta name="robots" content="index, follow" />
            
            <link rel="canonical" href={`https://www.kstarpick.com/news/${newsArticle.slug || newsArticle._id}`} />
          </>
        ) : (
          <>
            <title>Loading Article... | KstarPick</title>
            <meta name="description" content="Loading Korean entertainment news from KstarPick" />
            <meta property="og:title" content="Loading Article... | KstarPick" />
            <meta property="og:description" content="Loading Korean entertainment news from KstarPick" />
            <meta property="og:image" content="https://www.kstarpick.com/images/default-news.jpg" />
            <meta property="og:type" content="website" />
            <meta name="robots" content="noindex, nofollow" />
          </>
        )}
        
        {/* Riddle 로딩 애니메이션을 위한 CSS */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .ranking-number-stroke {
            -webkit-text-stroke-width: 1px;
            -webkit-text-stroke-color: #1D1D1D;
          }
        `}} />
      </Head>
      <Seo 
        {...metaTags}
        jsonLd={jsonLd}
        tags={keywords}
      />
      <StructuredData 
        type="article" 
        data={{
          title: newsArticle.title,
          description: newsArticle.description || newsArticle.content?.substring(0, 200).replace(/<[^>]*>/g, '') + '...',
          image: newsArticle.coverImage || newsArticle.featuredImage,
          publishedDate: newsArticle.createdAt,
          modifiedDate: newsArticle.updatedAt,
          author: newsArticle.author?.name,
          url: `https://www.kstarpick.com/news/${newsArticle.slug || newsArticle._id}`,
          breadcrumbs: [
            { name: 'Home', url: 'https://www.kstarpick.com' },
            { name: 'News', url: 'https://www.kstarpick.com/news' },
            { name: newsArticle.title, url: `https://www.kstarpick.com/news/${newsArticle.slug || newsArticle._id}` }
          ]
        }}
      />
      <Analytics />

      <Header />

      <main className="flex-grow">
        {isLoading ? (
          // Loading state - previously was an early return
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center p-10 animate-pulse">
              <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg className="w-12 h-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4 text-gray-800">Loading article...</h1>
            </div>
          </div>
        ) : !newsArticle ? (
          // Error/not found state
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="bg-white p-8 rounded-xl shadow-md inline-block mb-8">
              <div className="text-5xl mb-4">😢</div>
              <h1 className="text-2xl font-bold mb-4 text-gray-800">Article Not Found</h1>
              <p className="text-gray-600 mb-8">The article you're looking for doesn't seem to exist or has been removed.</p>
              <Link href="/news" className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-full inline-block hover:shadow-lg transition-all">
                Return to news
              </Link>
            </div>
          </div>
        ) : (
          // Actual content
          <>
            {/* Mobile Layout */}
            <div className="lg:hidden" style={{ paddingTop: '48px', overflowX: 'hidden' }}>

            {/* Section 2: Article Meta */}
            <div className="flex flex-col" style={{ padding: '24px 16px 0', gap: '8px' }}>
              <div className="flex flex-col" style={{ gap: '4px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '1.14em', color: '#2B7FFF' }}>
                  {(newsArticle.category || 'K-pop').toUpperCase()}
                </span>
                <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '22px', lineHeight: '1.375em', letterSpacing: '-0.0117em', color: '#111111', margin: 0 }}>
                  {newsArticle.title}
                </h1>
              </div>
              <div className="flex justify-between items-end">
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.33em', letterSpacing: '-0.0333em', color: '#99A1AF' }}>
                  {(() => {
                    const date = new Date(newsArticle.createdAt);
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    return `${year}.${month}.${day} ${hours}:${minutes}`;
                  })()}
                </span>
                <div className="flex items-center" style={{ gap: '12px', height: '18px' }}>
                  <button onClick={handleShareFacebook} className="hover:opacity-70 transition-opacity" title="Share to Facebook">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#99A1AF"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </button>
                  <button onClick={handleShareTwitter} className="hover:opacity-70 transition-opacity" title="Share to X">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#99A1AF"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </button>
                  <button onClick={handleCopyLink} className="hover:opacity-70 transition-opacity" title="Copy link">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#99A1AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div style={{ padding: '20px 16px 0' }}>
              <img
                src={newsArticle.coverImage || '/images/placeholder.jpg'}
                alt={newsArticle.title}
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: '260px' }}
                onError={(e) => { e.target.onerror = null; e.target.src = "/images/placeholder.jpg"; }}
              />
            </div>

            {/* Section 3: Article Body */}
            <div className="flex flex-col" style={{ padding: '24px 16px 42px', gap: '20px' }}>
              <div className="article-content" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '16px', lineHeight: '1.73em', letterSpacing: '-0.027em', color: '#333333' }}>
                <DirectRiddleContent content={newsArticle.content} />
              </div>
                    
                    {/* Riddle 전용 CSS 스타일 - 매우 강력한 버전 */}
                    <style dangerouslySetInnerHTML={{__html: `
                      /* 최강 Riddle wrapper 스타일 */
                      .article-content .riddle2-wrapper,
                      .prose .riddle2-wrapper,
                      div[class*="riddle2-wrapper"] {
                        height: auto !important;
                        min-height: 1000px !important;
                        max-height: none !important;
                        overflow: visible !important;
                        display: block !important;
                        position: relative !important;
                        width: 100% !important;
                        max-width: none !important;
                      }

                      /* 최강 Riddle iframe 스타일 */
                      .article-content .riddle2-wrapper iframe,
                      .prose .riddle2-wrapper iframe,
                      div[class*="riddle2-wrapper"] iframe,
                      iframe[src*="riddle.com"],
                      iframe[title*="Movies, music, series"] {
                        height: 1000px !important;
                        min-height: 1000px !important;
                        width: 100% !important;
                        max-height: none !important;
                        overflow: visible !important;
                        display: block !important;
                        border: none !important;
                      }

                      /* 모든 Riddle 관련 요소에 강제 적용 */
                      [data-rid-id] {
                        height: auto !important;
                        min-height: 1000px !important;
                        max-height: none !important;
                        overflow: visible !important;
                        width: 100% !important;
                        max-width: none !important;
                      }

                      [data-rid-id] iframe {
                        height: 1000px !important;
                        min-height: 1000px !important;
                        width: 100% !important;
                        max-height: none !important;
                      }

                      /* 인라인 스타일보다 우선하는 CSS - Riddle only */
                      .riddle2-wrapper iframe[style*="height"],
                      [data-rid-id] iframe[style*="height"] {
                        height: 1000px !important;
                        min-height: 1000px !important;
                      }

                      /* 강제 클래스 스타일 */
                      .riddle-force-height {
                        height: 1000px !important;
                        min-height: 1000px !important;
                        max-height: none !important;
                      }

                      /* YouTube embed 반응형 */
                      .article-content iframe[src*="youtube.com"] {
                        max-width: 100% !important;
                      }
                      .article-content div[style*="padding-bottom"] {
                        max-width: 100% !important;
                        overflow: hidden !important;
                      }

                      /* Twitter blockquote - prose 기본 스타일 완전 오버라이드 */
                      .prose blockquote.twitter-tweet,
                      .prose-lg blockquote.twitter-tweet,
                      .article-content blockquote.twitter-tweet {
                        margin: 0 0 1rem 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        border-left: none !important;
                        quotes: none !important;
                        font-style: normal !important;
                        font-weight: normal !important;
                        color: inherit !important;
                      }

                      .prose blockquote.twitter-tweet::before,
                      .prose blockquote.twitter-tweet::after,
                      .prose-lg blockquote.twitter-tweet::before,
                      .prose-lg blockquote.twitter-tweet::after {
                        content: none !important;
                      }

                      /* Twitter 위젯 렌더 후 컨테이너 */
                      .article-content .twitter-tweet-rendered,
                      .prose .twitter-tweet-rendered {
                        margin: 0 0 1rem 0 !important;
                      }

                      /* Twitter iframe */
                      .article-content iframe[id^="twitter-widget-"],
                      .prose iframe[id^="twitter-widget-"] {
                        margin: 0 auto 1rem auto !important;
                        max-width: 550px !important;
                      }

                      /* figure 여백 제거 (wp-block-embed 래퍼) */
                      .prose figure,
                      .prose-lg figure,
                      .article-content figure {
                        margin: 0 !important;
                      }

                      /* Instagram blockquote - prose 스타일 오버라이드 */
                      .prose blockquote.instagram-media,
                      .prose-lg blockquote.instagram-media,
                      .article-content blockquote.instagram-media {
                        margin: 0 0 1rem 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        border-left: none !important;
                      }

                      .article-content .instagram-media-rendered,
                      .prose .instagram-media-rendered {
                        margin: 0 0 1rem 0 !important;
                      }
                    `}} />
                    
            </div> {/* end Section 3: Article Body */}

            {/* Section 4: Related Tags */}
            {newsArticle.tags && newsArticle.tags.length > 0 && (
              <div className="flex flex-col" style={{ padding: '0 16px', gap: '10px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px', color: '#333333', textTransform: 'capitalize' }}>
                  Related Tags
                </span>
                <div className="flex flex-wrap" style={{ gap: '6px' }}>
                  {newsArticle.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: 'rgba(153, 161, 175, 0.15)',
                        borderRadius: '60px',
                        padding: '3px 8px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: '10px',
                        lineHeight: '1.5em',
                        letterSpacing: '0.12px',
                        color: '#99A1AF',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Section 5: Like it / Not for me */}
            <div className="flex justify-center" style={{ padding: '36px 16px', gap: '10px' }}>
              {[
                { key: 'like', label: 'Like it!', icon: '/images/like-thumb-blue.svg', borderColor: '#2B7FFF', textColor: '#2B7FFF', iconPosition: 'left' },
                { key: 'dislike', label: 'Not for me', icon: '/images/notforme-thumb-gray.svg', borderColor: '#A7A7A7', textColor: '#7D7F85', iconPosition: 'right' }
              ].map(({ key, label, icon, borderColor, textColor, iconPosition }) => (
                <button
                  key={key}
                  onClick={async () => {
                    const isCancel = userReaction === key;
                    const newUserReaction = isCancel ? null : key;
                    const previousReaction = userReaction || null;

                    const newReactions = { ...reactions };
                    if (previousReaction) {
                      newReactions[previousReaction] = Math.max(0, newReactions[previousReaction] - 1);
                    }
                    if (!isCancel) {
                      newReactions[key] = (newReactions[key] || 0) + 1;
                    }
                    setReactions(newReactions);
                    setUserReaction(newUserReaction);

                    if (typeof window !== 'undefined' && newsArticle?._id) {
                      const userReactionsFromCookie = Cookies.get('newsReactions');
                      const userReactionsMap = userReactionsFromCookie ? JSON.parse(userReactionsFromCookie) : {};
                      if (newUserReaction) {
                        userReactionsMap[newsArticle._id] = newUserReaction;
                      } else {
                        delete userReactionsMap[newsArticle._id];
                      }
                      Cookies.set('newsReactions', JSON.stringify(userReactionsMap), { expires: 365 });
                    }

                    try {
                      const res = await fetch('/api/news/reactions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          newsId: newsArticle._id,
                          reactionType: isCancel ? null : key,
                          previousReaction
                        })
                      });
                      const data = await res.json();
                      if (data.reactions) {
                        setReactions(data.reactions);
                      }
                    } catch (err) {
                      console.error('Reaction API error:', err);
                    }
                  }}
                  style={{
                    position: 'relative',
                    flex: 1,
                    maxWidth: '194px',
                    height: '71px',
                    backgroundColor: userReaction === key ? (key === 'like' ? 'rgba(43,127,255,0.05)' : 'rgba(125,127,133,0.05)') : '#FFFFFF',
                    border: `1px solid ${userReaction === key ? borderColor : borderColor}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  {/* Decorative thumb icon */}
                  <img
                    src={icon}
                    alt=""
                    style={{
                      position: 'absolute',
                      top: iconPosition === 'left' ? '8px' : '-18px',
                      [iconPosition === 'left' ? 'left' : 'right']: '-14px',
                      width: iconPosition === 'left' ? '70px' : '65px',
                      height: iconPosition === 'left' ? '83px' : '80px',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Text content */}
                  <div style={{
                    position: 'absolute',
                    top: '28px',
                    left: iconPosition === 'left' ? '57px' : '36px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                  }}>
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 900,
                      fontSize: '16px',
                      lineHeight: '1em',
                      color: textColor,
                    }}>
                      {reactions[key] || 0}
                    </span>
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      lineHeight: '1em',
                      color: textColor,
                    }}>
                      {label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Section 7: Comments */}
            <div style={{ padding: '32px 0 24px' }}>
              <div style={{ padding: '16px 0 8px', borderTop: '8px solid #F2F3F6', borderBottom: '8px solid #F2F3F6' }}>
                {/* Header: Comments count + sort */}
                <div className="flex items-center justify-between" style={{ padding: '0 16px 12px' }}>
                  <div className="flex items-center" style={{ gap: '6px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '27px', letterSpacing: '-0.44px', color: '#1E2939' }}>
                      Comments <span style={{ color: '#2B7FFF' }}>{localComments.length}</span>
                    </span>
                  </div>
                  <div className="flex" style={{ gap: '4px' }}>
                    {['latest', 'popular'].map((sort) => (
                      <button
                        key={sort}
                        onClick={() => setCommentSort(sort)}
                        style={{
                          border: `1px solid ${commentSort === sort ? '#1E2939' : '#D1D5DC'}`,
                          borderRadius: '4px',
                          padding: '5px 9px',
                          fontFamily: 'Pretendard, sans-serif',
                          fontWeight: 500,
                          fontSize: '12px',
                          lineHeight: '16px',
                          color: commentSort === sort ? '#1E2939' : '#99A1AF',
                          backgroundColor: 'transparent',
                        }}
                      >
                        {sort === 'latest' ? 'Latest' : 'Popular'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Input Area */}
                <div style={{ padding: '12px 16px' }}>
                  <form onSubmit={handleCommentSubmit}>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DC', borderRadius: '10px', padding: '13px 13px 1px' }}>
                      <textarea
                        className="w-full focus:outline-none resize-none"
                        placeholder="Write your comment here"
                        value={newComment}
                        onChange={handleCommentChange}
                        onFocus={() => setTextareaFocused(true)}
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 400,
                          fontSize: '14px',
                          lineHeight: '20px',
                          letterSpacing: '-0.15px',
                          color: '#333',
                          minHeight: '40px',
                          border: 'none',
                          background: 'transparent',
                        }}
                      />
                      <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          style={{ position: 'relative' }}
                        >
                          <Smile size={20} color="#99A1AF" />
                          {showEmojiPicker && (
                            <div className="absolute bottom-full left-0 mb-1 bg-white p-2 rounded-lg shadow-md z-50 flex gap-2 flex-wrap border border-gray-200" style={{ width: '200px' }}>
                              {['😊', '👍', '❤️', '🔥', '👏', '😂', '🎉', '👀', '🙏', '😍'].map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className="w-8 h-8 text-xl hover:bg-gray-50 rounded flex items-center justify-center"
                                  onClick={() => {
                                    setNewComment(prev => prev + ' ' + emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </button>
                        <div className="flex items-center" style={{ gap: '8px' }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '16px', color: '#99A1AF' }}>
                            {newComment.length}/300
                          </span>
                          <button
                            type="submit"
                            disabled={!newComment.trim() || submittingComment}
                            style={{
                              backgroundColor: !newComment.trim() || submittingComment ? '#D1D5DC' : '#233CFA',
                              borderRadius: '4px',
                              padding: '6px 9px',
                              fontFamily: 'Inter, sans-serif',
                              fontWeight: 700,
                              fontSize: '12px',
                              lineHeight: '16px',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: !newComment.trim() || submittingComment ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {submittingComment ? '...' : 'Post'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Comments List */}
                <div className="flex flex-col">
                  {localComments.length > 0 ? (
                    [...localComments].sort((a, b) => {
                      if (commentSort === 'popular') return ((b.likes || 0) - (a.likes || 0));
                      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
                    }).slice(0, visibleCommentCount || 5).map((comment, index) => {
                      const colors = getColorFromNickname(comment.author);
                      return (
                        <div
                          key={comment.id || index}
                          className="flex flex-col"
                          style={{
                            padding: index === 0 ? '20px 16px' : '12px 16px',
                            gap: index === 0 ? '12px' : '4px',
                            borderBottom: '1px solid #F3F4F6',
                            backgroundColor: index === 0 ? 'rgba(242, 244, 254, 0.5)' : '#FFFFFF',
                          }}
                        >
                          {/* Comment header: avatar + name + date + menu */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center" style={{ gap: '8px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '100px', overflow: 'hidden', flexShrink: 0, border: '1px solid #E9EBEF' }}>
                                <img
                                  src={comment.avatar}
                                  alt={comment.author}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    const parentNode = e.target.parentNode;
                                    const gradientDiv = document.createElement('div');
                                    gradientDiv.className = "flex items-center justify-center";
                                    gradientDiv.style.cssText = `width:100%;height:100%;background:linear-gradient(135deg, ${colors.main} 0%, ${colors.secondary} 100%)`;
                                    const initial = document.createElement('span');
                                    initial.textContent = comment.author.charAt(0).toUpperCase();
                                    initial.className = 'text-white font-bold text-sm';
                                    gradientDiv.appendChild(initial);
                                    parentNode.appendChild(gradientDiv);
                                  }}
                                />
                              </div>
                              <div className="flex flex-col" style={{ gap: '2px' }}>
                                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px', color: '#101828' }}>
                                  {comment.author}
                                </span>
                                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '16px', letterSpacing: '-0.4px', color: '#99A1AF' }}>
                                  {comment.timestamp ? formatCommentDate(new Date(comment.timestamp)) : comment.date}
                                </span>
                              </div>
                            </div>
                            {session && (session.user.role === 'admin' || session.user.id === comment.authorId) && (
                              <button onClick={() => handleDeleteComment(comment.id)} style={{ color: '#D1D5DC' }}>
                                <X size={20} />
                              </button>
                            )}
                          </div>

                          {/* Comment text */}
                          <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '19.25px', letterSpacing: '-0.15px', color: '#333333', margin: 0 }}>
                            {comment.text}
                          </p>

                          {/* Comment footer: likes/dislikes */}
                          <div className="flex items-center justify-end">
                            <div className="flex items-center" style={{ gap: '20px' }}>
                              <button className="flex items-center" style={{ gap: '2px' }} onClick={() => handleCommentReaction(comment.id, 'like')}>
                                <img src="/images/comment-like.svg" alt="like" style={{ width: '16px', height: '16px', opacity: comment.userReaction === 'like' ? 1 : 0.5 }} />
                                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px', lineHeight: '20px', letterSpacing: '-0.15px', color: comment.userReaction === 'like' ? '#2B7FFF' : '#99A1AF' }}>
                                  {comment.likes || 0}
                                </span>
                              </button>
                              <button className="flex items-center" style={{ gap: '2px' }} onClick={() => handleCommentReaction(comment.id, 'dislike')}>
                                <img src="/images/comment-dislike.svg" alt="dislike" style={{ width: '16px', height: '16px', opacity: comment.userReaction === 'dislike' ? 1 : 0.5 }} />
                                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px', lineHeight: '20px', letterSpacing: '-0.15px', color: comment.userReaction === 'dislike' ? '#2B7FFF' : '#99A1AF' }}>
                                  {comment.dislikes || 0}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : null}
                </div>

                {/* Show more / Collapse comments */}
                {localComments.length > 5 && (
                  <div className="flex justify-end" style={{ padding: '16px' }}>
                    {visibleCommentCount < localComments.length ? (
                      <button
                        onClick={() => setVisibleCommentCount(visibleCommentCount + 5)}
                        className="flex items-center" style={{ gap: '4px' }}
                      >
                        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px', color: '#101828', textTransform: 'capitalize' }}>
                          Show More Comments
                        </span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="#99A1AF" strokeWidth="1.14"/></svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => setVisibleCommentCount(5)}
                        className="flex items-center" style={{ gap: '4px' }}
                      >
                        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px', color: '#101828', textTransform: 'capitalize' }}>
                          Collapse Comments
                        </span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 10L8 6L4 10" stroke="#99A1AF" strokeWidth="1.14"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 8: Explore CELEB */}
            <div id="explore-category-section" className="flex flex-col" style={{ padding: '25px 16px 0', gap: '16px' }}>
              <div className="flex items-center justify-between">
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.56em', letterSpacing: '-0.024em', color: '#101828', margin: 0 }}><span style={{ color: '#2B7FFF' }}>Related</span> News</h2>
              </div>
              <div className="flex flex-col" style={{ gap: '16px' }}>
                {(() => {
                  const filtered = relatedArticles.filter(news => news._id !== newsArticle._id && news.slug !== newsArticle.slug);
                  const displayedNews = filtered.slice(0, 5);
                  return displayedNews.map((news, idx) => (
                    <Link href={`/news/${news.slug || news._id || news.id}`} key={news._id || news.id || `celeb-${idx}`}>
                      <div className="flex items-center gap-[10px] cursor-pointer">
                        <div className="w-[78px] h-[78px] flex-shrink-0 rounded-[10px] overflow-hidden bg-[#F3F4F6]">
                          <img
                            src={news.coverImage || '/images/placeholder.jpg'}
                            alt={news.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.onerror = null; e.target.src = "/images/placeholder.jpg"; }}
                          />
                        </div>
                        <div className="flex-1 flex flex-col" style={{ gap: '10px' }}>
                          <h3 className="line-clamp-2" style={{ fontFamily: 'Pretendard, Inter, sans-serif', fontWeight: 500, fontSize: '14px', lineHeight: '1.25em', letterSpacing: '-0.0107em', color: '#333333', margin: 0 }}>
                            {news.title}
                          </h3>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.33em', letterSpacing: '-0.0333em', color: '#99A1AF' }}>
                            {(() => { const d = new Date(news.createdAt); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}. ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ));
                })()}
              </div>
            </div>

            <div className="h-2 bg-[#F3F4F6] mt-5" />

            {/* Section 9: Today's Ranking news */}
            <div className="flex flex-col" style={{ padding: '24px 16px 20px', gap: '16px' }}>
              <div className="flex items-center justify-between">
                <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.56em', letterSpacing: '-0.024em', color: '#101828', margin: 0 }}>Today&apos;s <span style={{ color: '#2B7FFF' }}>Ranking news</span></h2>
              </div>
              <div className="grid grid-cols-2 gap-2" style={{ overflow: 'hidden' }}>
                {(rankingNews || []).slice(0, 4).map((news, idx) => (
                  <Link key={news._id || idx} href={`/news/${news.slug || news._id}`}>
                    <div className="relative flex flex-col cursor-pointer" style={{ gap: '8px' }}>
                      <div className="relative w-full rounded-[10px] overflow-hidden bg-[#F3F4F6]" style={{ height: '146px' }}>
                        <img
                          src={news.coverImage || '/images/placeholder.jpg'}
                          alt={news.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.onerror = null; e.target.src = "/images/placeholder.jpg"; }}
                        />
                        <span className="absolute bottom-0 left-0 ranking-number-stroke" style={{
                          color: '#FFFFFF',
                          textShadow: '0 4px 10px rgba(0, 0, 0, 0.40)',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '40px',
                          fontStyle: 'italic',
                          fontWeight: 900,
                          lineHeight: '48px',
                          letterSpacing: '0.352px',
                          padding: '0 8px 4px',
                        }}>
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex flex-col" style={{ gap: '6px' }}>
                        <h3 className="line-clamp-2" style={{ fontFamily: 'Pretendard, Inter, sans-serif', fontWeight: 500, fontSize: '14px', lineHeight: '1.25em', letterSpacing: '-0.0107em', color: '#101828', margin: 0, height: '35px' }}>
                          {news.title}
                        </h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="h-2 bg-[#F3F4F6] mt-5" />

            {/* Section 10: Trending NOW */}
            <div style={{ padding: '24px 16px 12px' }}>
              <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews || []} onNavigate={navigateToPage} showCard={false} />
            </div>

            <div className="h-2 bg-[#F3F4F6]" />

            {/* Section 11: More News */}
            <div style={{ padding: '12px 16px 24px' }}>
              <MoreNews category={newsArticle.category || 'celeb'} storageKey="news-detail-mobile" />
            </div>

            </div> {/* end lg:hidden (Mobile Layout) */}

            {/* PC Layout */}
            <div className="hidden lg:block bg-[#F8F9FA] pb-16">
              <div className="mx-auto" style={{ maxWidth: '1786px', padding: '121px 74px 0' }}>
                <div className="flex flex-row gap-[60px]">
                  {/* Left: Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-[25px]">

                      {/* Card 1: Article Body */}
                      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[12px] flex flex-col" style={{ padding: '30px 25px 40px', gap: '30px' }}>

                        {/* Header: Category + Title + Date/Share */}
                        <div className="flex flex-col" style={{ gap: '6px' }}>
                          <div className="flex flex-col" style={{ gap: '8px' }}>
                            <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', lineHeight: '1.68em', letterSpacing: '-0.014em', color: '#2B7FFF' }}>
                              {(newsArticle.category || 'NEWS').toUpperCase()}
                            </span>
                            <h1 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '30px', lineHeight: '1.4em', letterSpacing: '-0.0086em', color: '#111111', margin: 0 }}>
                              {newsArticle.title}
                            </h1>
                          </div>
                          <div className="flex justify-between items-end">
                            <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '13px', lineHeight: '1.23em', letterSpacing: '-0.031em', color: '#99A1AF' }}>
                              {newsArticle.createdAt ? (() => {
                                const d = new Date(newsArticle.createdAt);
                                return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                              })() : ''}
                            </span>
                            <div className="flex" style={{ gap: '12px' }}>
                              <button onClick={handleShareFacebook} className="hover:opacity-70 transition-opacity" title="Share to Facebook">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#99A1AF"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                              </button>
                              <button onClick={handleShareTwitter} className="hover:opacity-70 transition-opacity" title="Share to X">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#99A1AF"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                              </button>
                              <button onClick={handleCopyLink} className="hover:opacity-70 transition-opacity" title="Copy link">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#99A1AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Cover Image */}
                        <img
                          src={newsArticle.coverImage || '/images/placeholder.jpg'}
                          alt={newsArticle.title}
                          className="w-full rounded-lg object-cover"
                          style={{ maxHeight: '480px' }}
                          onError={(e) => { e.target.onerror = null; e.target.src = "/images/placeholder.jpg"; }}
                        />

                        {/* Article Body Content */}
                        <div className="flex flex-col" style={{ gap: '24px' }}>
                          <div className="prose prose-lg max-w-none" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '18px', lineHeight: '1.534em', letterSpacing: '-0.024em', color: '#333333' }}>
                            <DirectRiddleContent content={newsArticle.content} />
                          </div>
                        </div>

                        {/* Related Tags */}
                        {newsArticle.tags && newsArticle.tags.length > 0 && (
                          <div className="flex flex-col" style={{ gap: '10px' }}>
                            <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '20px', lineHeight: '1.625em', letterSpacing: '-0.022em', color: '#101828' }}>Related Tags</span>
                            <div className="flex flex-wrap" style={{ gap: '6px' }}>
                              {newsArticle.tags.map((tag, idx) => (
                                <Link key={idx} href={`/search?q=${encodeURIComponent(tag)}`}>
                                  <span className="inline-flex items-center cursor-pointer hover:opacity-80 transition-opacity" style={{ background: 'rgba(153, 161, 175, 0.15)', borderRadius: '60px', padding: '8px 12px', fontFamily: 'Inter', fontWeight: 600, fontSize: '14px', lineHeight: '1.07em', letterSpacing: '0.008em', color: '#99A1AF' }}>
                                    #{tag}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Like it / Not for me */}
                        <div className="flex justify-center" style={{ padding: '20px 0', gap: '30px' }}>
                          {[
                            { key: 'like', label: 'Like it!', activeColor: '#2B7FFF', activeBg: 'rgba(43, 127, 255, 0.4)' },
                            { key: 'dislike', label: 'Not for me', activeColor: '#2B7FFF', activeBg: 'rgba(43, 127, 255, 0.4)' }
                          ].map(({ key, label, activeColor }) => {
                            const isSelected = userReaction === key;
                            const borderColor = isSelected ? activeColor : '#A7A7A7';
                            const textColor = isSelected ? activeColor : '#7D7F85';
                            return (
                              <button
                                key={key}
                                onClick={async () => {
                                  const isCancel = userReaction === key;
                                  const newUserReaction = isCancel ? null : key;
                                  const previousReaction = userReaction || null;

                                  const newReactions = { ...reactions };
                                  if (previousReaction) {
                                    newReactions[previousReaction] = Math.max(0, newReactions[previousReaction] - 1);
                                  }
                                  if (!isCancel) {
                                    newReactions[key] = (newReactions[key] || 0) + 1;
                                  }
                                  setReactions(newReactions);
                                  setUserReaction(newUserReaction);

                                  if (typeof window !== 'undefined' && newsArticle?._id) {
                                    const userReactionsFromCookie = Cookies.get('newsReactions');
                                    const userReactionsMap = userReactionsFromCookie ? JSON.parse(userReactionsFromCookie) : {};
                                    if (newUserReaction) {
                                      userReactionsMap[newsArticle._id] = newUserReaction;
                                    } else {
                                      delete userReactionsMap[newsArticle._id];
                                    }
                                    Cookies.set('newsReactions', JSON.stringify(userReactionsMap), { expires: 365 });
                                  }

                                  try {
                                    const res = await fetch('/api/news/reactions', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        newsId: newsArticle._id,
                                        reactionType: isCancel ? null : key,
                                        previousReaction
                                      })
                                    });
                                    const data = await res.json();
                                    if (data.reactions) setReactions(data.reactions);
                                  } catch (err) {
                                    console.error('Reaction API error:', err);
                                  }
                                }}
                                className="relative overflow-hidden bg-white transition-all duration-200 hover:scale-[1.02]"
                                style={{ width: '232px', height: '85px', borderRadius: '10px', border: `1.5px solid ${borderColor}` }}
                              >
                                {/* Thumbs icon (clipped, positioned like Figma) */}
                                <img
                                  src={key === 'like' ? '/images/like-hand.png' : '/images/notforme-hand.png'}
                                  alt=""
                                  className="absolute pointer-events-none"
                                  style={{
                                    [key === 'like' ? 'left' : 'right']: '-20px',
                                    top: key === 'like' ? '7px' : '-17px',
                                    width: key === 'like' ? '80px' : '74px',
                                    height: key === 'like' ? '95px' : '91px',
                                  }}
                                />
                                {/* Text content */}
                                <div className="absolute flex items-center" style={{ left: key === 'like' ? '74px' : '58px', top: '50%', transform: 'translateY(-50%)', gap: '9px' }}>
                                  <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '18px', lineHeight: '1em', color: textColor }}>
                                    {reactions[key] || 0}
                                  </span>
                                  <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '16px', lineHeight: '1em', color: textColor }}>
                                    {label}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                      </div>

                      {/* Card 2: Comments */}
                      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[12px] flex flex-col" style={{ padding: '30px 25px 40px', gap: '30px' }}>
                        <div className="flex flex-col" style={{ gap: '10px' }}>
                          {/* Header */}
                          <div className="flex flex-col" style={{ gap: '6px' }}>
                            <div className="flex items-center" style={{ gap: '6px' }}>
                              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', lineHeight: '1.5em', letterSpacing: '-0.024em', color: '#1E2939' }}>
                                Comments {localComments.length > 0 && localComments.length}
                              </span>
                              <img src="/images/icons8-messaging-48.png" alt="" className="w-6 h-6" />
                            </div>
                          </div>

                          {/* Comment input */}
                          <div className="rounded-[12px] overflow-hidden">
                            <div style={{ padding: '16px 16px 1px' }}>
                              <form onSubmit={handleCommentSubmit}>
                                <div className="bg-white rounded-[10px] border border-[#D1D5DC] flex flex-col" style={{ padding: '13px', height: '132px', gap: '14px' }}>
                                  <textarea
                                    className="w-full flex-1 bg-transparent focus:outline-none resize-none"
                                    placeholder="Write your comment here"
                                    value={newComment}
                                    onChange={handleCommentChange}
                                    maxLength={300}
                                    style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '1.43em', letterSpacing: '-0.011em', color: '#111111' }}
                                  />
                                  <div className="flex justify-end items-center">
                                    <div className="flex items-center" style={{ gap: '8px' }}>
                                      <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '12px', lineHeight: '1.33em', color: '#99A1AF' }}>
                                        {newComment.length}/300
                                      </span>
                                      <button
                                        type="submit"
                                        disabled={!newComment.trim() || submittingComment}
                                        className="transition-all"
                                        style={{
                                          fontFamily: 'Inter', fontWeight: 700, fontSize: '12px', lineHeight: '1.33em', color: '#FFFFFF',
                                          background: !newComment.trim() || submittingComment ? '#D1D5DC' : '#2B7FFF',
                                          borderRadius: '4px',
                                          padding: '6px 9px',
                                          cursor: !newComment.trim() || submittingComment ? 'not-allowed' : 'pointer'
                                        }}
                                      >
                                        {submittingComment ? '...' : 'Post'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </form>
                            </div>
                          </div>

                          {/* Sort tabs */}
                          <div style={{ padding: '16px 0 17px', borderBottom: '1px solid #F3F4F6' }}>
                            <div className="flex items-center" style={{ gap: '8px' }}>
                              <button onClick={() => setCommentSort('latest')} style={{ fontFamily: 'Inter', fontWeight: commentSort === 'latest' ? 700 : 400, fontSize: '14px', lineHeight: '1.36em', letterSpacing: '-0.021em', color: commentSort === 'latest' ? '#111111' : '#99A1AF' }}>Latest</button>
                              <div style={{ width: '3px', height: '3px', borderRadius: '1.5px', background: '#99A1AF' }} />
                              <button onClick={() => setCommentSort('popular')} style={{ fontFamily: 'Inter', fontWeight: commentSort === 'popular' ? 700 : 400, fontSize: '14px', lineHeight: '1.36em', letterSpacing: '-0.021em', color: commentSort === 'popular' ? '#111111' : '#99A1AF' }}>Popular</button>
                            </div>
                          </div>

                          {/* Comments list */}
                          <div className="flex flex-col rounded-[12px] overflow-hidden">
                            {localComments.length > 0 ? (
                              <>
                                <div style={{ background: 'rgba(242, 244, 254, 0.5)' }}>
                                  {[...localComments].sort((a, b) => {
                                    if (commentSort === 'popular') return ((b.likes || 0) + (b.dislikes || 0)) - ((a.likes || 0) + (a.dislikes || 0));
                                    return new Date(b.timestamp) - new Date(a.timestamp);
                                  }).slice(0, 4).map((comment, index) => {
                                    const colors = getColorFromNickname(comment.author);
                                    return (
                                      <div key={comment.id || index} className="flex flex-col" style={{ padding: '16px 25px', borderBottom: '1px solid #F3F4F6', gap: '8px' }}>
                                        {/* Row 1: Avatar + Name/Badge + ··· */}
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center" style={{ gap: '8px' }}>
                                            <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: '40px', height: '40px', background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.secondary} 100%)` }}>
                                              <img src={comment.avatar} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                            </div>
                                            <div className="flex flex-col" style={{ gap: '2px' }}>
                                              <div className="flex items-center" style={{ gap: '4px' }}>
                                                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px', lineHeight: '1.36em', letterSpacing: '-0.021em', color: '#151517' }}>{comment.author}</span>
                                              </div>
                                              <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '1.14em', letterSpacing: '-0.029em', color: '#99A1AF' }}>{formatCommentDate(comment.timestamp)}</span>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Row 2: Comment text */}
                                        <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '15px', lineHeight: '1.33em', letterSpacing: '-0.02em', color: '#151517', margin: 0 }}>{comment.text}</p>
                                        {/* Row 3: Like/Dislike */}
                                        <div className="flex justify-end items-center">
                                          <div className="flex items-center" style={{ gap: '12px' }}>
                                            <button className="flex items-center" style={{ gap: '4px' }} onClick={() => handleCommentReaction(comment.id, 'like')}>
                                              <img src="/images/comment-like.svg" alt="like" style={{ width: '12px', height: '12px', opacity: comment.userReaction === 'like' ? 1 : 0.5 }} />
                                              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '16px', lineHeight: '1.5em', letterSpacing: '-0.02em', color: comment.userReaction === 'like' ? '#2B7FFF' : '#99A1AF' }}>{comment.likes || 0}</span>
                                            </button>
                                            <button className="flex items-center" style={{ gap: '4px' }} onClick={() => handleCommentReaction(comment.id, 'dislike')}>
                                              <img src="/images/comment-dislike.svg" alt="dislike" style={{ width: '12px', height: '12px', opacity: comment.userReaction === 'dislike' ? 1 : 0.5 }} />
                                              <span style={{ fontFamily: 'Inter', fontWeight: comment.userReaction === 'dislike' ? 700 : 500, fontSize: '16px', lineHeight: '1.5em', letterSpacing: '-0.02em', color: comment.userReaction === 'dislike' ? '#2B7FFF' : '#99A1AF' }}>{comment.dislikes || 0}</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {localComments.length > 4 && (
                                  <div style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
                                    {localComments.slice(4, 8).map((comment, index) => {
                                      const colors = getColorFromNickname(comment.author);
                                      return (
                                        <div key={comment.id || `extra-${index}`} className="flex flex-col" style={{ padding: '16px 25px', borderBottom: '1px solid #F3F4F6', gap: '8px' }}>
                                          <div className="flex justify-between items-center">
                                            <div className="flex items-center" style={{ gap: '8px' }}>
                                              <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: '40px', height: '40px', background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.secondary} 100%)` }}>
                                                <img src={comment.avatar} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                              </div>
                                              <div className="flex flex-col" style={{ gap: '2px' }}>
                                                <div className="flex items-center" style={{ gap: '4px' }}>
                                                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px', lineHeight: '1.36em', letterSpacing: '-0.021em', color: '#151517' }}>{comment.author}</span>
                                                </div>
                                                <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '1.14em', letterSpacing: '-0.029em', color: '#99A1AF' }}>{formatCommentDate(comment.timestamp)}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '15px', lineHeight: '1.33em', letterSpacing: '-0.02em', color: '#151517', margin: 0 }}>{comment.text}</p>
                                          <div className="flex justify-end items-center">
                                            <div className="flex items-center" style={{ gap: '12px' }}>
                                              <button className="flex items-center" style={{ gap: '4px' }} onClick={() => handleCommentReaction(comment.id, 'like')}>
                                                <img src="/images/comment-like.svg" alt="like" style={{ width: '12px', height: '12px', opacity: comment.userReaction === 'like' ? 1 : 0.5 }} />
                                                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '16px', lineHeight: '1.5em', letterSpacing: '-0.02em', color: comment.userReaction === 'like' ? '#2B7FFF' : '#99A1AF' }}>{comment.likes || 0}</span>
                                              </button>
                                              <button className="flex items-center" style={{ gap: '4px' }} onClick={() => handleCommentReaction(comment.id, 'dislike')}>
                                                <img src="/images/comment-dislike.svg" alt="dislike" style={{ width: '12px', height: '12px', opacity: comment.userReaction === 'dislike' ? 1 : 0.5 }} />
                                                <span style={{ fontFamily: 'Inter', fontWeight: comment.userReaction === 'dislike' ? 700 : 500, fontSize: '16px', lineHeight: '1.5em', letterSpacing: '-0.02em', color: comment.userReaction === 'dislike' ? '#2B7FFF' : '#99A1AF' }}>{comment.dislikes || 0}</span>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-8" style={{ background: 'rgba(242, 244, 254, 0.5)' }}>
                                <p style={{ fontFamily: 'Inter', fontSize: '14px', color: '#99A1AF' }}>No comments yet. Be the first to comment!</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Latest News */}
                      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[12px] flex flex-col" style={{ padding: '30px 24px', gap: '30px' }}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center" style={{ gap: '10px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 900, fontSize: '26px', lineHeight: '1.23em', color: '#101828' }}>Latest News</span>
                          </div>
                          <Link href="/news" className="flex items-center" style={{ gap: '4px' }}>
                            <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px', lineHeight: '1.43em', letterSpacing: '-0.011em', color: '#2B7FFF' }}>See more</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B7FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                          </Link>
                        </div>
                        {relatedArticles && relatedArticles.length > 0 ? (
                          <div className="grid grid-cols-3" style={{ gap: '24px', height: '387px' }}>
                            {relatedArticles.filter(n => n._id !== newsArticle._id).slice(0, 3).map((news, index) => (
                              <Link key={index} href={`/news/${news.slug || news._id}`}>
                                <div className="cursor-pointer group relative" style={{ height: '387px' }}>
                                  <div className="overflow-hidden" style={{ width: '100%', height: '209px', borderRadius: '14px' }}>
                                    <img
                                      src={news.coverImage || news.thumbnail || '/images/news/default-news.jpg'}
                                      alt={news.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      onError={(e) => { e.target.onerror = null; e.target.src = '/images/news/default-news.jpg'; }}
                                    />
                                  </div>
                                  <div style={{ position: 'absolute', top: '229px', width: '100%' }}>
                                    <h4 className="line-clamp-2 group-hover:text-[#2B7FFF] transition-colors" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', lineHeight: '1.375em', letterSpacing: '-0.024em', color: '#101828' }}>
                                      {news.title}
                                    </h4>
                                  </div>
                                  <div style={{ position: 'absolute', top: '291px', width: '100%' }}>
                                    <p className="line-clamp-3" style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', lineHeight: '1.625em', letterSpacing: '-0.01em', color: '#6A7282' }}>
                                      {news.description || news.summary || ''}
                                    </p>
                                  </div>
                                  <div style={{ position: 'absolute', top: '371px' }}>
                                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '12px', lineHeight: '1.33em', color: '#99A1AF' }}>
                                      {news.publishedAt ? new Date(news.publishedAt).toLocaleDateString('en-CA') : news.createdAt ? new Date(news.createdAt).toLocaleDateString('en-CA') : ''}
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">No related news available</div>
                        )}
                      </div>

                      {/* Card 4: More News */}
                      <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-[12px]" style={{ padding: '30px 24px' }}>
                        <MoreNews category={newsArticle.category || 'celeb'} storageKey="news-detail" />
                      </div>

                    </div>
                  </div>

                  {/* Right: Sidebar (500px) */}
                  <div className="w-[500px] flex-shrink-0">
                    <div ref={pcSidebarRef} className="sticky" style={{ top: pcSidebarTop + 'px' }}>
                      <div className="w-full space-y-8">
                        <CommentTicker comments={recentComments || []} onNavigate={navigateToPage} />
                        <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews || []} onNavigate={navigateToPage} />
                        {(editorsPickNews.length > 0 || (rankingNews && rankingNews.length > 0)) && (
                          <div>
                            <h3 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-4 pl-1">Editor&apos;s <span className="text-ksp-accent">PICK</span></h3>
                            <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
                              {(editorsPickNews.length > 0 ? editorsPickNews : rankingNews).slice(0, 6).map((item) => (
                                <div
                                  key={item._id}
                                  className="flex gap-4 cursor-pointer group"
                                  onClick={() => navigateToPage(`/news/${item.slug || item._id}`)}
                                >
                                  <div className="flex-shrink-0 w-[140px] h-[90px] rounded overflow-hidden">
                                    <img
                                      src={item.coverImage || item.thumbnailUrl || '/images/placeholder.jpg'}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="inline-block px-1.5 py-0.5 bg-ksp-accent text-white text-[10px] font-bold uppercase tracking-wider rounded">
                                        {item.category === 'kpop' ? 'K-POP' : item.category === 'drama' ? 'DRAMA' : item.category === 'movie' ? 'FILM' : item.category === 'celeb' ? 'CELEB' : 'NEWS'}
                                      </span>
                                      <span className="text-xs font-medium text-ksp-meta">
                                        {formatCommentDate(item.createdAt || item.publishedAt)}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2 group-hover:text-ksp-accent transition-colors">
                                      {item.title}
                                    </h4>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div> {/* end PC Layout */}

          </>
        )}
      </main>

      {/* Back to Top Button */}
      {isMounted && showBackToTop && (
        <button
              onClick={scrollToTop}
              className="back-to-top-btn fixed bottom-6 right-6 p-3 bg-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-110"
              aria-label="Back to top"
              style={{
                border: '2px solid #233CFA',
                zIndex: 9999,
              }}
            >
              <style dangerouslySetInnerHTML={{__html: `
                .back-to-top-btn:hover {
                  transform: scale(1.15);
                  box-shadow: 0 10px 25px -5px rgba(35, 60, 250, 0.4);
                }
              `}} />
              <ArrowUp size={20} color="#233CFA" />
            </button>
      )}

      {/* 공유 모달 (PC: 중앙 팝업, 모바일: 하단 모달) */}
      {showShareMenu && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
            onClick={() => setShowShareMenu(false)}
          />

          {/* 모달 - PC: 중앙 팝업, 모바일: 하단 */}
          <div className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full bg-white rounded-t-3xl md:rounded-2xl z-50 animate-slide-up-mobile shadow-2xl">
            <div className="p-6">
              {/* 핸들 바 (모바일만) */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 md:hidden"></div>

              {/* 제목과 닫기 버튼 */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Share this article</h3>
                <button
                  onClick={() => setShowShareMenu(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X size={24} color="#374151" />
                </button>
              </div>

              {/* 공유 버튼들 */}
              <div className="flex justify-center gap-6 mb-4">
                {/* Facebook */}
                <button
                  onClick={handleShareFacebook}
                  className="w-14 h-14 flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <img src="/images/icons8-facebook-logo-50.png" alt="Facebook" className="w-12 h-12" />
                </button>

                {/* X (Twitter) */}
                <button
                  onClick={handleShareTwitter}
                  className="w-14 h-14 flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <img src="/images/icons8-x-50.png" alt="X" className="w-12 h-12" />
                </button>
              </div>

              {/* URL 표시 */}
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate flex-1">
                    {typeof window !== 'undefined' ? `https://www.kstarpick.com/news/${newsArticle?.slug || newsArticle?._id}` : ''}
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="ml-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* URL Copied 토스트 팝업 */}
      {showCopiedToast && (
        <div className={`fixed top-6 left-0 right-0 z-50 flex justify-center px-4 ${isCopiedToastHiding ? 'animate-slide-up-hide' : 'animate-slide-down-show'}`}>
          <div className="py-2.5 px-5 rounded-full shadow-2xl border-2" style={{ backgroundColor: '#332c49', borderColor: '#233CFA' }}>
            <p className="text-sm font-bold text-white whitespace-nowrap">URL Copied</p>
          </div>
        </div>
      )}

      {/* Want to know more news? 섹션 - 모바일 전용 */}
      {showMoreNewsSection && (
        <div className={`md:hidden fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 ${isMoreNewsSectionHiding ? 'animate-slide-down-smooth' : 'animate-slide-up-smooth'}`}>
          <button onClick={handleScrollToRelatedNews} className="block">
            <div className="py-2.5 px-5 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 active:scale-95 border-2" style={{ backgroundColor: '#332c49', borderColor: '#233CFA' }}>
              <div className="flex items-center gap-2.5 text-white">
                <p className="text-sm font-bold whitespace-nowrap">Want to know more news?</p>
                <ChevronRight size={18} className="rotate-90" />
              </div>
            </div>
          </button>
        </div>
      )}

      <Footer />

      <style dangerouslySetInnerHTML={{__html: `
        /* 모바일 하단 슬라이드 업 애니메이션 */
        @keyframes slide-up-mobile {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        /* 모바일에만 애니메이션 적용 */
        @media (max-width: 767px) {
          .animate-slide-up-mobile {
            animation: slide-up-mobile 0.3s ease-out;
          }
        }

        /* Want to know more news? 슬라이드 업 애니메이션 */
        @keyframes slide-up-smooth {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Want to know more news? 슬라이드 다운 애니메이션 */
        @keyframes slide-down-smooth {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(100%);
            opacity: 0;
          }
        }

        .animate-slide-up-smooth {
          animation: slide-up-smooth 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-slide-down-smooth {
          animation: slide-down-smooth 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* URL Copied 토스트 - 위에서 슬라이드 다운 */
        @keyframes slide-down-show {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* URL Copied 토스트 - 위로 슬라이드 업 (사라짐) */
        @keyframes slide-up-hide {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100%);
            opacity: 0;
          }
        }

        .animate-slide-down-show {
          animation: slide-down-show 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-slide-up-hide {
          animation: slide-up-hide 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* PC 중앙 페이드 인 애니메이션 */
        @keyframes fade-in-center {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .animate-fade-in-center {
          animation: fade-in-center 0.25s ease-out;
        }

        /* 토스트 페이드 인 애니메이션 */
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}} />
    </div>
  );
}

export async function getServerSideProps({ params, req }) {
  const { id } = params;

  // USE_LOCAL_DATA=true일 때 DB 연결 없이 로컬 데이터 사용
  if (process.env.USE_LOCAL_DATA === 'true') {
    try {
      const fs = require('fs');
      const path = require('path');
      const localPath = path.join(process.cwd(), 'data', 'local-news.json');
      if (fs.existsSync(localPath)) {
        const rawData = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
        const allNews = rawData.data.news || [];
        const newsArticle = allNews.find(n => n._id === id || n.slug === id);
        if (newsArticle) {
          const relatedArticles = allNews
            .filter(n => n._id !== newsArticle._id && n.category === newsArticle.category)
            .slice(0, 12);
          // 사이드바 데이터 가져오기
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const baseUrl = `${protocol}://${req.headers.host}`;
          let recentComments = [];
          let rankingNews = [];
          let trendingNews = [];
          let editorsPickNews = [];
          try {
            const articleCategory = newsArticle.category || '';
            const [commentsRes, rankingRes, trendingRes, editorsPickRes] = await Promise.all([
              fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => null),
              fetch(`${baseUrl}/api/news?limit=10&sort=viewCount`).catch(() => null),
              fetch(`${baseUrl}/api/news/trending?limit=5${articleCategory ? `&category=${articleCategory}` : ''}`).catch(() => null),
              fetch(`${baseUrl}/api/news/editors-pick?limit=6${articleCategory ? `&category=${articleCategory}` : ''}`).catch(() => null),
            ]);
            if (commentsRes) { const cd = await commentsRes.json(); recentComments = cd.success ? (cd.data || cd.comments || []) : []; }
            if (rankingRes) { const rd = await rankingRes.json(); rankingNews = rd.success ? (rd.data?.news || rd.data || []) : []; }
            if (trendingRes) { const td = await trendingRes.json(); trendingNews = td.success ? (td.data || []) : []; }
            if (editorsPickRes) { const ep = await editorsPickRes.json(); editorsPickNews = ep.success ? (ep.data || []) : []; }
          } catch (e) {}
          return {
            props: {
              newsArticle: { ...newsArticle, thumbnailUrl: newsArticle.thumbnailUrl || newsArticle.coverImage },
              relatedArticles,
              recentComments,
              rankingNews,
              trendingNews,
              editorsPickNews,
            }
          };
        }
      }
    } catch (e) {
      console.error('[News Detail] Local data error:', e);
    }
    // Local data에 없으면 프로덕션 API fallback
    const prodUrl = process.env.NEXT_PUBLIC_API_URL;
    if (prodUrl) {
      try {
        const prodRes = await fetch(`${prodUrl}/api/news/${encodeURIComponent(id)}`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const article = prodData.data || prodData;
          if (article && article.title) {
            let relatedArticles = [];
            let recentComments = [];
            let rankingNews = [];
            let trendingNews = [];
            let editorsPickNews = [];
            try {
              const protocol = req.headers['x-forwarded-proto'] || 'http';
              const baseUrl = `${protocol}://${req.headers.host}`;
              const artCat = article.category || '';
              const [relRes, commentsRes, rankingRes, trendingRes, editorsPickRes] = await Promise.all([
                fetch(`${baseUrl}/api/news?limit=12&category=${artCat}`).catch(() => null),
                fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => null),
                fetch(`${baseUrl}/api/news?limit=10&sort=viewCount`).catch(() => null),
                fetch(`${baseUrl}/api/news/trending?limit=5${artCat ? `&category=${artCat}` : ''}`).catch(() => null),
                fetch(`${baseUrl}/api/news/editors-pick?limit=6${artCat ? `&category=${artCat}` : ''}`).catch(() => null),
              ]);
              if (relRes && relRes.ok) {
                const relData = await relRes.json();
                relatedArticles = (relData.data?.news || relData.data || [])
                  .filter(n => (n._id || n.id) !== (article._id || article.id))
                  .slice(0, 12);
              }
              if (commentsRes) { const cd = await commentsRes.json(); recentComments = cd.success ? (cd.data || cd.comments || []) : []; }
              if (rankingRes) { const rd = await rankingRes.json(); rankingNews = rd.success ? (rd.data?.news || rd.data || []) : []; }
              if (trendingRes) { const td = await trendingRes.json(); trendingNews = td.success ? (td.data || []) : []; }
              if (editorsPickRes) { const ep = await editorsPickRes.json(); editorsPickNews = ep.success ? (ep.data || []) : []; }
            } catch (e) {}
            return {
              props: {
                newsArticle: { ...article, _id: (article._id || article.id || '').toString(), thumbnailUrl: article.thumbnailUrl || article.coverImage },
                relatedArticles,
                recentComments,
                rankingNews,
                trendingNews,
                editorsPickNews,
              }
            };
          }
        }
      } catch (e) {
        console.error('[News Detail] Production fallback error:', e.message);
      }
    }
    return { notFound: true };
  }

  try {
    // MongoDB에서 데이터 가져오기
    const { db } = await connectToDatabase();
    
    let newsArticle;
    let shouldRedirect = false;
    
    // 먼저 slug로 조회 시도 (SEO 우선)
    newsArticle = await db.collection('news').findOne({ slug: id });
    
    // slug로 찾지 못했고 ObjectId 형태라면 ObjectId로 조회 후 리다이렉트
    if (!newsArticle && ObjectId.isValid(id)) {
      try {
        newsArticle = await db.collection('news').findOne({ _id: new ObjectId(id) });
        if (newsArticle && newsArticle.slug) {
          // ObjectId로 찾았지만 slug가 있으면 리다이렉트
          shouldRedirect = true;
        }
      } catch (error) {
        console.error('Error finding news by ObjectId:', error);
      }
    }
    
    // 뉴스를 찾지 못한 경우 프로덕션 API fallback
    if (!newsArticle) {
      const prodUrl = process.env.NEXT_PUBLIC_API_URL;
      if (prodUrl) {
        try {
          const prodRes = await fetch(`${prodUrl}/api/news/${encodeURIComponent(id)}`);
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            const article = prodData.data || prodData;
            if (article && article.title) {
              const protocol = req.headers['x-forwarded-proto'] || 'http';
              const baseUrl = `${protocol}://${req.headers.host}`;
              let recentComments = [];
              let rankingNews = [];
              let trendingNews = [];
              let editorsPickNews = [];
              try {
                const artCat2 = article.category || '';
                const [commentsRes, rankingRes, trendingRes, editorsPickRes] = await Promise.all([
                  fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => null),
                  fetch(`${baseUrl}/api/news?limit=10&sort=viewCount`).catch(() => null),
                  fetch(`${baseUrl}/api/news/trending?limit=5${artCat2 ? `&category=${artCat2}` : ''}`).catch(() => null),
                  fetch(`${baseUrl}/api/news/editors-pick?limit=6${artCat2 ? `&category=${artCat2}` : ''}`).catch(() => null),
                ]);
                if (commentsRes) { const cd = await commentsRes.json(); recentComments = cd.success ? (cd.data || cd.comments || []) : []; }
                if (rankingRes) { const rd = await rankingRes.json(); rankingNews = rd.success ? (rd.data?.news || rd.data || []) : []; }
                if (trendingRes) { const td = await trendingRes.json(); trendingNews = td.success ? (td.data || []) : []; }
                if (editorsPickRes) { const ep = await editorsPickRes.json(); editorsPickNews = ep.success ? (ep.data || []) : []; }
              } catch (e) {}
              // related articles from production
              let relatedArticles = [];
              try {
                const relRes = await fetch(`${prodUrl}/api/news?limit=12&category=${article.category || ''}`);
                if (relRes.ok) {
                  const relData = await relRes.json();
                  relatedArticles = (relData.data?.news || relData.data || [])
                    .filter(n => (n._id || n.id) !== (article._id || article.id))
                    .slice(0, 12);
                }
              } catch (e) {}
              return {
                props: {
                  newsArticle: { ...article, _id: (article._id || article.id || '').toString(), thumbnailUrl: article.thumbnailUrl || article.coverImage },
                  relatedArticles,
                  recentComments,
                  rankingNews,
                  trendingNews,
                  editorsPickNews,
                }
              };
            }
          }
        } catch (e) {
          console.error('[News Detail] Production fallback error:', e.message);
        }
      }
      return { notFound: true };
    }
    
    // SEO 리다이렉트: ObjectId로 접근했지만 slug가 있는 경우
    if (shouldRedirect && newsArticle.slug) {
      return {
        redirect: {
          destination: `/news/${newsArticle.slug}`,
          permanent: true, // 301 리다이렉트
        },
      };
    }
    
    // 뉴스를 찾은 경우 조회수 업데이트 (viewCount 필드가 없으면 생성)
    await db.collection('news').updateOne(
      { _id: newsArticle._id },
      { $inc: { viewCount: 1 } }
    );
    
    // 🚀 성능 최적화: 관련 뉴스 검색 간소화 (한 번의 쿼리로 처리)
    const relatedArticles = await db.collection('news')
      .find({ 
        $and: [
          { _id: { $ne: newsArticle._id } },
          {
            $or: [
              { category: newsArticle.category },
              ...(newsArticle.tags && newsArticle.tags.length > 0 
                ? [{ tags: { $in: newsArticle.tags } }]
                : [])
            ]
          }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(12) // 12개로 제한
      .project({ // 필요한 필드만 선택
        _id: 1,
        slug: 1,
        title: 1,
        coverImage: 1,
        thumbnailUrl: 1,
        category: 1,
        createdAt: 1,
        summary: 1,
        content: 1
      })
      .toArray();
    
    // 관련 뉴스가 부족한 경우 최신 뉴스로 보완 (한 번의 추가 쿼리)
    let finalRelatedArticles = relatedArticles;
    if (relatedArticles.length < 6) {
      const additionalArticles = await db.collection('news')
        .find({ 
          _id: { 
            $nin: [
              newsArticle._id,
              ...relatedArticles.map(a => a._id)
            ]
          }
        })
        .sort({ createdAt: -1 })
        .limit(6 - relatedArticles.length)
        .project({
          _id: 1,
          slug: 1,
          title: 1,
          coverImage: 1,
          thumbnailUrl: 1,
          category: 1,
          createdAt: 1,
          summary: 1,
          content: 1
        })
        .toArray();
        
      finalRelatedArticles = [...relatedArticles, ...additionalArticles];
    }
    
    // OG 이미지용 원본 URL 조회 (프록시 해시 → 원본 URL 변환)
    let ogImageUrl = null;
    const thumbUrl = newsArticle.thumbnailUrl || newsArticle.coverImage || '';
    if (thumbUrl.includes('hash-image') || thumbUrl.includes('hash=')) {
      try {
        const hashMatch = thumbUrl.match(/hash=([a-f0-9]+)/);
        if (hashMatch) {
          const imageRecord = await db.collection('image_hashes').findOne({ hash: hashMatch[1] });
          if (imageRecord && imageRecord.url) {
            ogImageUrl = imageRecord.url;
          }
        }
      } catch (e) {
        console.error('OG image hash lookup failed:', e.message);
      }
    }

    // 🚀 성능 최적화: 데이터 변환 최적화
    const processedNewsArticle = {
      ...newsArticle,
      _id: newsArticle._id.toString(),
      createdAt: newsArticle.createdAt 
        ? (newsArticle.createdAt instanceof Date 
           ? newsArticle.createdAt.toISOString() 
           : newsArticle.createdAt) 
        : null,
      updatedAt: newsArticle.updatedAt 
        ? (newsArticle.updatedAt instanceof Date 
           ? newsArticle.updatedAt.toISOString() 
           : newsArticle.updatedAt) 
        : null,
      publishedAt: newsArticle.publishedAt 
        ? (newsArticle.publishedAt instanceof Date 
           ? newsArticle.publishedAt.toISOString() 
           : newsArticle.publishedAt) 
        : null,
      // thumbnailUrl이 없으면 coverImage를 사용
      thumbnailUrl: newsArticle.thumbnailUrl || newsArticle.coverImage,
      // OG 메타태그용 원본 이미지 URL (프록시 대신 직접 URL)
      ogImageUrl: ogImageUrl || null
    };

    // 현재 뉴스를 명시적으로 제외 (slug와 _id 모두 체크)
    const filteredRelatedArticles = finalRelatedArticles.filter(article => {
      const isDifferentById = article._id.toString() !== newsArticle._id.toString();
      const isDifferentBySlug = !article.slug || !newsArticle.slug || article.slug !== newsArticle.slug;
      return isDifferentById && isDifferentBySlug;
    });

    const processedRelatedArticles = filteredRelatedArticles.map(article => ({
      ...article,
      _id: article._id.toString(),
      createdAt: article.createdAt
        ? (article.createdAt instanceof Date
           ? article.createdAt.toISOString()
           : article.createdAt)
        : null,
      // thumbnailUrl이 없으면 coverImage를 사용
      thumbnailUrl: article.thumbnailUrl || article.coverImage
    }));
    
    // Sidebar data fetch
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${req.headers.host}`;
    const prodUrl = baseUrl;

    let recentComments = [];
    let rankingNews = [];
    let trendingNews = [];
    let editorsPickNews = [];
    try {
      const newsCat = processedNewsArticle.category || '';
      const [commentsRes, rankingRes, trendingRes] = await Promise.all([
        fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => null),
        fetch(`${prodUrl}/api/news?limit=10&sort=viewCount`).catch(() => null),
        fetch(`${prodUrl}/api/news/trending?limit=5${newsCat ? `&category=${newsCat}` : ''}`).catch(() => null),
      ]);
      if (commentsRes) {
        const cd = await commentsRes.json();
        recentComments = cd.success ? (cd.data || cd.comments || []) : [];
      }
      if (rankingRes) {
        const rd = await rankingRes.json();
        rankingNews = rd.success ? (rd.data?.news || rd.data || []) : [];
      }
      if (trendingRes) {
        const td = await trendingRes.json();
        trendingNews = td.success ? (td.data || []) : [];
      }
      // Editor's PICK: trending ID 제외
      const trendingIdStr = trendingNews.map(n => n._id).join(',');
      const editorsPickRes = await fetch(`${prodUrl}/api/news/editors-pick?limit=6${newsCat ? `&category=${newsCat}` : ''}${trendingIdStr ? `&exclude=${trendingIdStr}` : ''}`).catch(() => null);
      if (editorsPickRes) {
        const ep = await editorsPickRes.json();
        editorsPickNews = ep.success ? (ep.data || []) : [];
      }
    } catch (e) {
      console.error('[News Detail] Sidebar data fetch error:', e.message);
    }

    return {
      props: {
        newsArticle: processedNewsArticle,
        relatedArticles: processedRelatedArticles,
        recentComments,
        rankingNews,
        trendingNews,
        editorsPickNews,
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps for News detail:', error);
    return {
      notFound: true
    };
  }
} 