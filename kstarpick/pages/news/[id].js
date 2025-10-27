import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Heart, MessageCircle, Share2, Calendar, Clock, User, ChevronLeft, ChevronRight, ArrowUp, Bookmark, Facebook, Twitter, Copy, Eye, TrendingUp, ExternalLink, MessageSquare, ThumbsUp, Send, X, Smile } from 'lucide-react';
import Cookies from 'js-cookie';
import { connectToDatabase } from "../../utils/mongodb";
import { ObjectId } from 'mongodb';
import { useSession } from 'next-auth/react';
import DirectRiddleContent from '../../components/DirectRiddleContent';

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

  console.log('[InstagramEmbed] 컴포넌트 렌더링:', { url, postId, isClient, hasRef: !!blockquoteRef.current });

  // 클라이언트 사이드 확인
  useEffect(() => {
    console.log('[InstagramEmbed] isClient useEffect 실행');
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
      console.log('[InstagramEmbed] 조건 불충족 - isClient:', isClient, 'blockquoteRef:', !!blockquoteRef.current);
      return;
    }

    console.log('[InstagramEmbed] 초기화 시작 - blockquote 렌더링 확인됨');
    console.log('[InstagramEmbed] window.instgrm 상태:', !!window.instgrm);

    // 스크립트가 없으면 로드
    if (!window.instgrm && window.loadInstagramScript) {
      console.log('[InstagramEmbed] Instagram 스크립트 로드 요청');
      window.loadInstagramScript();
    }

    let processTimer = null;
    let eventListener = null;

    const processInstagramEmbed = () => {
      // blockquote가 실제로 DOM에 있는지 확인
      if (!blockquoteRef.current || !document.body.contains(blockquoteRef.current)) {
        console.log('[InstagramEmbed] blockquote가 DOM에 없음');
        return false;
      }

      console.log('[InstagramEmbed] 처리 시도 - instgrm:', !!window.instgrm, 'Embeds:', !!window.instgrm?.Embeds);

      if (window.instgrm?.Embeds) {
        try {
          console.log('[InstagramEmbed] process() 실행 중...');
          window.instgrm.Embeds.process();
          console.log('[InstagramEmbed] process() 성공');
          return true;
        } catch (error) {
          console.error('[InstagramEmbed] process() 실행 오류:', error);
        }
      }
      return false;
    };

    // 즉시 처리 시도
    if (processInstagramEmbed()) {
      console.log('[InstagramEmbed] 즉시 처리 성공');
      return;
    }

    // 스크립트 로드 완료 이벤트 리스너
    eventListener = () => {
      console.log('[InstagramEmbed] Instagram 스크립트 로드 완료 이벤트 수신');
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
        console.warn('[InstagramEmbed] 최대 재시도 횟수 도달');
        return;
      }

      if (!processInstagramEmbed()) {
        retryCount++;
        console.log(`[InstagramEmbed] 재시도 #${retryCount}/${maxRetries}`);
        // 처음 10번은 빠르게 (100ms), 이후는 느리게 (500ms)
        const delay = retryCount <= 10 ? 100 : 500;
        processTimer = setTimeout(retryProcess, delay);
      } else {
        console.log('[InstagramEmbed] 재시도 성공!');
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
      console.log('[TwitterEmbed] 조건 불충족 - isClient:', isClient, 'embedRef:', !!embedRef.current);
      return;
    }

    console.log('[TwitterEmbed] 초기화 시작 - embedRef 렌더링 확인됨');
    console.log('[TwitterEmbed] window.twttr 상태:', !!window.twttr);

    // 스크립트가 없으면 로드
    if (!window.twttr && window.loadTwitterScript) {
      console.log('[TwitterEmbed] Twitter 스크립트 로드 요청');
      window.loadTwitterScript();
    }

    let processTimer = null;
    let eventListener = null;

    const processTwitterEmbed = () => {
      // embedRef가 실제로 DOM에 있는지 확인
      if (!embedRef.current || !document.body.contains(embedRef.current)) {
        console.log('[TwitterEmbed] embedRef가 DOM에 없음');
        return false;
      }

      console.log('[TwitterEmbed] 처리 시도 - twttr:', !!window.twttr, 'widgets:', !!window.twttr?.widgets);

      if (window.twttr?.widgets) {
        try {
          const container = embedRef.current;

          // 컨테이너 초기화
          container.innerHTML = '';

          // 트윗 ID 추출
          const tweetIdMatch = url.match(/\/status(?:es)?\/(\d+)/);
          if (tweetIdMatch) {
            const tweetId = tweetIdMatch[1];
            console.log('[TwitterEmbed] 트윗 ID 추출:', tweetId);

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
                console.log('[TwitterEmbed] 트위터 위젯 생성 성공');
                // 높이 자동 조정
                setTimeout(() => {
                  const iframe = element.querySelector('iframe');
                  if (iframe) {
                    const height = iframe.offsetHeight || iframe.scrollHeight;
                    console.log('[TwitterEmbed] 감지된 높이:', height);
                    setEmbedHeight(Math.min(height + 20, 600));
                  }
                }, 1000);
                return true;
              } else {
                console.warn('[TwitterEmbed] 트위터 위젯 생성 결과가 null');
                return false;
              }
            }).catch((error) => {
              console.error('[TwitterEmbed] 트위터 위젯 생성 실패:', error);
              return false;
            });
            return true; // Promise 반환으로 성공으로 간주
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
      console.log('[TwitterEmbed] 즉시 처리 시작됨');
      return;
    }

    // 스크립트 로드 완료 이벤트 리스너
    eventListener = () => {
      console.log('[TwitterEmbed] Twitter 스크립트 로드 완료 이벤트 수신');
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
        console.warn('[TwitterEmbed] 최대 재시도 횟수 도달');
        return;
      }

      if (!processTwitterEmbed()) {
        retryCount++;
        console.log(`[TwitterEmbed] 재시도 #${retryCount}/${maxRetries}`);
        // 처음 10번은 빠르게 (100ms), 이후는 느리게 (500ms)
        const delay = retryCount <= 10 ? 100 : 500;
        processTimer = setTimeout(retryProcess, delay);
      } else {
        console.log('[TwitterEmbed] 재시도 성공!');
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
    console.log('[RiddleEmbed] 초기화 - riddleId:', riddleId, 'isClient:', isClient);
    
    if (!isClient || !riddleId) {
      if (!riddleId) {
        console.error('[RiddleEmbed] riddleId가 없습니다');
        setError(true);
        setLoading(false);
      }
      return;
    }

    // 직접 iframe 방식 사용 - 스크립트 의존성 제거
    console.log('[RiddleEmbed] 직접 iframe 방식으로 초기화');
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
            console.log(`[RiddleEmbed] iframe 로드 완료 - ID: ${riddleId}`);
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

// 콘텐츠에서 Instagram 링크를 임베드로 변환하는 함수
const processInstagramEmbeds = (content) => {
  if (!content) return content;
  
  // Instagram URL 패턴 (포스트와 릴)
  const instagramRegex = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)(?:\/[^?\s]*)?(?:\?[^?\s]*)?/g;
  
  let processedContent = content;
  const matches = [...content.matchAll(instagramRegex)];
  
  matches.forEach((match, index) => {
    const fullUrl = match[0];
    const postId = match[1];
    
    // 임베드 플레이스홀더 생성
    const embedPlaceholder = `<div class="instagram-embed-placeholder" data-url="${fullUrl}" data-index="${index}"></div>`;
    
    // 링크를 플레이스홀더로 교체
    processedContent = processedContent.replace(fullUrl, embedPlaceholder);
  });
  
  return processedContent;
};

// 콘텐츠에서 Riddle 임베드를 처리하는 함수 (개선된 버전)
const processRiddleEmbeds = (content) => {
  if (!content) return content;
  
  console.log('[processRiddleEmbeds] 원본 콘텐츠 길이:', content.length);
  
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
    console.log(`[processRiddleEmbeds] 패턴 ${patternIndex + 1}에서 ${matches.length}개 발견`);
    
    matches.forEach((match, index) => {
      const fullMatch = match[0];
      const riddleId = match[1];
      
      if (riddleId && !foundRiddles.some(r => r.id === riddleId)) {
        console.log(`[processRiddleEmbeds] Riddle ID 발견: ${riddleId}`);
        foundRiddles.push({ id: riddleId, fullMatch });
        
        // Riddle 플레이스홀더 생성
        const riddlePlaceholder = `<div class="riddle-embed-placeholder" data-riddle-id="${riddleId}" data-index="${foundRiddles.length - 1}"></div>`;
        
        // 원본 HTML을 플레이스홀더로 교체
        processedContent = processedContent.replace(fullMatch, riddlePlaceholder);
      }
    });
  });
  
  console.log(`[processRiddleEmbeds] 총 ${foundRiddles.length}개의 Riddle 발견`);
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
    console.log('[ArticleContent] 클라이언트 마운트됨');
    console.log('[ArticleContent] content prop 받음:', content ? content.substring(0, 100) + '...' : 'null');
    setIsClient(true);
  }, []);

  // processedContent 상태 변경 추적
  useEffect(() => {
    console.log('[ArticleContent] processedContent 상태 변경됨:', {
      hasProcessedContent: !!processedContent,
      length: processedContent?.length || 0,
      includesInstagram: processedContent?.includes('instagram-media') || false,
      includesTwitter: processedContent?.includes('twitter-tweet') || false
    });
  }, [processedContent]);

  useEffect(() => {
    if (!content || !isClient) {
      console.log('[ArticleContent] content 처리 건너뜀:', { hasContent: !!content, isClient });
      return;
    }

    console.log('[ArticleContent] content 처리 시작, 원본 길이:', content.length);

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
      
      console.log('[ArticleContent] 디코딩 전:', str.substring(0, 100));
      console.log('[ArticleContent] 디코딩 후:', decoded.substring(0, 100));
      
      return decoded;
    };
    
    // 콘텐츠를 먼저 디코딩
    let decodedContent = decodeHtmlEntities(content);
    console.log('[ArticleContent] HTML 디코딩 후:', decodedContent.substring(0, 200));

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
      console.log('[ArticleContent] Instagram blockquote가 이미 존재 - 그대로 사용');
      console.log('[ArticleContent] processed content 길이:', processed.length);
      console.log('[ArticleContent] processed content includes instagram-media:', processed.includes('instagram-media'));
      // Instagram 임베드 콘텐츠 감지를 위해 즉시 스크립트 로드
      if (typeof window !== 'undefined' && window.loadInstagramScript) {
        window.loadInstagramScript();
      }
      setProcessedContent(processed);
      console.log('[ArticleContent] setProcessedContent 호출됨');
      setInstagramUrls([]);
    } else {
      // Instagram 링크 찾기 및 추출 (기존 방식)
      const instagramRegex = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)(?:\/)?(?:\?[^"'\s]*)?/g;
      const matches = [...processed.matchAll(instagramRegex)];
      const urls = matches.map(match => match[0]);
      
      console.log('Found Instagram URLs:', urls);
      
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

      console.log('Processed content with placeholders:', processed);
      console.log('Placeholder map:', placeholderMap);

      setInstagramUrls(urls);
    }
    
    // 4. Twitter 임베드 처리
    const hasTwitterEmbed = processed.includes('twitter-tweet');
    
    if (hasTwitterEmbed) {
      console.log('Twitter 임베드 코드가 이미 존재');
      // Twitter 임베드 코드가 이미 있으면 그대로 사용
      setTwitterUrls([]);
    } else {
      // Twitter/X URL 찾기
      const twitterRegex = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(?:@)?([A-Za-z0-9_]+)\/status(?:es)?\/(\d+)/g;
      const twitterMatches = [...processed.matchAll(twitterRegex)];
      const twitterUrlList = twitterMatches.map(match => match[0]);
      
      console.log('Found Twitter URLs:', twitterUrlList);
      
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
    console.log('[ArticleContent] Riddle 임베드 처리 시작');
    console.log('[ArticleContent] 처리할 콘텐츠 샘플:', processed.substring(0, 500));
    
    // Riddle 관련 키워드 존재 여부 확인
    const hasRiddleKeyword = processed.includes('riddle') || processed.includes('Riddle');
    const hasDataRidId = processed.includes('data-rid-id');
    console.log('[ArticleContent] Riddle 키워드 존재:', hasRiddleKeyword);
    console.log('[ArticleContent] data-rid-id 존재:', hasDataRidId);
    
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
      console.log(`[ArticleContent] 패턴 ${patternIndex + 1} 시도:`, regex.toString().substring(0, 100));
      const riddleMatches = [...processed.matchAll(regex)];
      console.log(`[ArticleContent] 패턴 ${patternIndex + 1}에서 ${riddleMatches.length}개 Riddle 발견`);
      
      if (riddleMatches.length > 0) {
        riddleMatches.forEach((match, matchIndex) => {
          console.log(`[ArticleContent] 매치 ${matchIndex + 1}:`, match[0].substring(0, 150));
          const fullMatch = match[0];
          const riddleId = match[1];
          
          if (riddleId && !riddlePlaceholderMap.has(fullMatch)) {
            console.log(`[ArticleContent] 새로운 Riddle ID 처리: ${riddleId}`);
            const uniqueId = `RIDDLE_PLACEHOLDER_${riddlePlaceholderIndex}`;
            riddlePlaceholderMap.set(fullMatch, uniqueId);
            processed = processed.replace(fullMatch, uniqueId);
            riddleIdList.push(riddleId);
            riddlePlaceholderIndex++;
            
            console.log(`[ArticleContent] Riddle ${riddleId}를 ${uniqueId}로 교체 완료`);
          }
        });
      }
    });
    
    console.log(`[ArticleContent] 총 ${riddleIdList.length}개의 Riddle ID 추출:`, riddleIdList);
    setRiddleIds(riddleIdList);
    
    setProcessedContent(processed);
  }, [content, isClient]);

  // Instagram 스크립트 로딩 및 처리
  useEffect(() => {
    console.log('[ArticleContent] Instagram useEffect 진입:', {
      isClient,
      hasProcessedContent: !!processedContent,
      processedContentLength: processedContent?.length || 0,
      includesInstagram: processedContent?.includes('instagram-media') || false
    });

    if (!isClient || !processedContent || !processedContent.includes('instagram-media')) {
      console.log('[ArticleContent] Instagram useEffect 건너뜀 - 조건 미충족');
      return;
    }
    console.log('[ArticleContent] Instagram blockquote 감지 - 처리 시작');

    let retryCount = 0;
    const maxRetries = 30;
    let timer = null;

    const processInstagram = () => {
      console.log(`[ArticleContent] Instagram 처리 시도 #${retryCount + 1}`);

      // 스크립트가 로드되었는지 확인
      if (window.instgrm && window.instgrm.Embeds) {
        const blockquotes = document.querySelectorAll('blockquote.instagram-media');
        console.log(`[ArticleContent] Instagram blockquote 요소 발견: ${blockquotes.length}개`);

        if (blockquotes.length > 0) {
          try {
            console.log('[ArticleContent] instgrm.Embeds.process() 실행');
            window.instgrm.Embeds.process();
            console.log('[ArticleContent] Instagram 처리 완료');
            return true;
          } catch (error) {
            console.error('[ArticleContent] Instagram 처리 오류:', error);
          }
        } else {
          console.log('[ArticleContent] Instagram blockquote가 DOM에 없음');
        }
      } else {
        console.log('[ArticleContent] Instagram 스크립트 대기 중...');
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
        console.warn('[ArticleContent] Instagram 처리 최대 재시도 도달');
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
    console.log('[ArticleContent] Twitter blockquote 감지 - 처리 시작');

    let retryCount = 0;
    const maxRetries = 30;
    let timer = null;

    const processTwitter = () => {
      console.log(`[ArticleContent] Twitter 처리 시도 #${retryCount + 1}`);

      // 스크립트가 로드되었는지 확인
      if (window.twttr && window.twttr.widgets) {
        const blockquotes = document.querySelectorAll('blockquote.twitter-tweet');
        console.log(`[ArticleContent] Twitter blockquote 요소 발견: ${blockquotes.length}개`);

        if (blockquotes.length > 0) {
          try {
            console.log('[ArticleContent] twttr.widgets.load() 실행');
            window.twttr.widgets.load();
            console.log('[ArticleContent] Twitter 처리 완료');
            return true;
          } catch (error) {
            console.error('[ArticleContent] Twitter 처리 오류:', error);
          }
        } else {
          console.log('[ArticleContent] Twitter blockquote가 DOM에 없음');
        }
      } else {
        console.log('[ArticleContent] Twitter 스크립트 대기 중...');
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
        console.warn('[ArticleContent] Twitter 처리 최대 재시도 도달');
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
    
    console.log('Split parts:', parts);
    
    return parts.map((part, index) => {
      // Instagram 플레이스홀더 처리
      if (parts[index - 1] === 'INSTAGRAM_PLACEHOLDER_' && /^\d+$/.test(part)) {
        const placeholderIndex = parseInt(part);
        const url = instagramUrls[placeholderIndex];
        
        if (url) {
          console.log('Rendering Instagram embed for URL:', url);
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
          console.log('Rendering Twitter embed for URL:', url);
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
          console.log('[renderContent] Riddle 임베드 렌더링 - ID:', riddleId, 'Index:', placeholderIndex);
          return (
            <RiddleEmbed 
              key={`riddle-${placeholderIndex}`} 
              riddleId={riddleId} 
              className="my-4"
            />
          );
        } else {
          console.warn('[renderContent] Riddle ID를 찾을 수 없음 - Index:', placeholderIndex, 'Available IDs:', riddleIds);
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
const formatCommentDate = (date) => {
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

// English translations for Korean titles and summaries
const getEnglishTitle = (koreanTitle) => {
  if (koreanTitle.includes('방탄소년단')) return 'BTS Announces New Album Release';
  if (koreanTitle.includes('블랙핑크')) return 'BLACKPINK Announces Additional World Tour Dates';
  if (koreanTitle.includes('아이브')) return 'IVE Prepares for June Comeback with New Song';
  if (koreanTitle.includes('뉴진스')) return 'NewJeans Releases New Digital Single for Summer';
  if (koreanTitle.includes('스트레이 키즈')) return 'Stray Kids Successfully Completes US Tour';
  if (koreanTitle.includes('에스파')) return 'aespa Reveals Teaser Images for New Album';
  return 'K-POP News: ' + koreanTitle;
};

const getEnglishSummary = (koreanSummary) => {
  if (koreanSummary.includes('방탄소년단')) return 'BTS is scheduled to release a new album this summer.';
  if (koreanSummary.includes('블랙핑크')) return 'BLACKPINK has announced additional concerts for their world tour.';
  if (koreanSummary.includes('아이브')) return 'IVE is preparing a new song ahead of their June comeback.';
  if (koreanSummary.includes('뉴진스')) return 'NewJeans has released a new digital single aimed at summer.';
  if (koreanSummary.includes('스트레이 키즈')) return 'Stray Kids has successfully concluded their US tour.';
  if (koreanSummary.includes('에스파')) return 'aespa has revealed teaser images for their new album.';
  return 'Latest K-POP news and updates.';
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

export default function NewsDetail({ newsArticle, relatedArticles }) {
  const router = useRouter();
  // All hooks must be called unconditionally at the top level
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(42);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [estimatedReadTime, setEstimatedReadTime] = useState('6');
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
  
  // For optimized scroll handling and position saving
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const previousPathRef = useRef(null);
  
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

  // 최적화된 스크롤 이벤트 핸들러 - requestAnimationFrame 사용
  const handleScroll = useCallback(() => {
    if (typeof window === 'undefined') return;

    // window.scrollY와 document.documentElement.scrollTop 모두 확인
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
    lastScrollY.current = scrollY;

    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        const currentScrollY = lastScrollY.current;

        // 백투탑 버튼 표시 여부
        if (currentScrollY > 300) {
          setShowBackToTop(true);
        } else {
          setShowBackToTop(false);
        }

        // 헤더 높이 계산 - 계산 간소화
        const windowHeight = window.innerHeight;
        const maxScroll = windowHeight * 0.4; // 조금 더 빠르게 축소되도록 조정

        // 스크롤에 따라 헤더 높이 조절 (60vh에서 최소 25vh까지)
        if (currentScrollY <= maxScroll) {
          // 값을 직접 계산하여 상태 설정 횟수 최소화
          const newHeight = Math.max(25, 60 - (currentScrollY / maxScroll) * 35);
          // 소수점 첫째 자리까지만 사용하여 상태 업데이트 최소화
          setHeaderHeight(Math.round(newHeight * 10) / 10);
        } else {
          setHeaderHeight(25); // 최소 높이
        }

        ticking.current = false;
      });

      ticking.current = true;
    }
  }, []);

  // 스크롤 이벤트 등록 - 패시브 이벤트로 성능 향상
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scrollHandler = () => {
      // document.body.scrollTop을 우선순위로 확인
      const scrollY = document.body.scrollTop || window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;

      // 백투탑 버튼 표시 여부
      if (scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }

      // 헤더 높이 계산
      const windowHeight = window.innerHeight;
      const maxScroll = windowHeight * 0.4;

      if (scrollY <= maxScroll) {
        const newHeight = Math.max(25, 60 - (scrollY / maxScroll) * 35);
        setHeaderHeight(Math.round(newHeight * 10) / 10);
      } else {
        setHeaderHeight(25);
      }
    };

    // 여러 방법으로 스크롤 이벤트 등록
    window.addEventListener('scroll', scrollHandler, { passive: true });
    document.addEventListener('scroll', scrollHandler, { passive: true });
    document.body.addEventListener('scroll', scrollHandler, { passive: true });

    // 초기 상태 체크
    setTimeout(() => {
      scrollHandler();
    }, 100);

    return () => {
      window.removeEventListener('scroll', scrollHandler);
      document.removeEventListener('scroll', scrollHandler);
      document.body.removeEventListener('scroll', scrollHandler);
    };
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      // 스크롤 복원 함수
      const restoreScroll = () => {
        window.scrollTo(0, scrollPos);
        document.documentElement.scrollTop = scrollPos;
        document.body.scrollTop = scrollPos;
      };

      // 1차: 즉시 복원 시도
      restoreScroll();

      // 2차: DOM 렌더링 직후 (RAF 2번 중첩으로 레이아웃 재계산 대기)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          restoreScroll();
        });
      });

      // 3차: 이미지 로딩 등을 고려한 지연 복원
      setTimeout(() => restoreScroll(), 100);

      // 최종: 확실한 복원 및 플래그 제거
      setTimeout(() => {
        restoreScroll();
        sessionStorage.removeItem('isBackToNewsDetail');
      }, 300);
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

  // Handle share functionality - copy link to clipboard
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      // slug 기반의 정확한 URL 생성
      const correctUrl = `https://www.kstarpick.com/news/${newsArticle.slug || newsArticle._id}`;
      navigator.clipboard.writeText(correctUrl);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    }
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
      
      const response = await fetch(`/api/news/comment?id=${newsArticle._id}`);
      
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
            likes: 0,
            liked: false,
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
  const jsonLd = newsArticle ? generateNewsArticleJsonLd(newsArticle) : null;
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
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
            {/* Hero Header Section - 높이 동적 변경 */}
            <div 
              className="relative w-full overflow-hidden"
              style={{ height: `${headerHeight}vh` }}
            >
              {/* 단일 이미지 컨테이너 */}
              <div className="absolute inset-0">
                <img 
                  src={newsArticle.coverImage || '/images/placeholder.jpg'} 
                  alt={newsArticle.title}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'center 20%' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/placeholder.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
              </div>
              
              <div className="absolute inset-0 flex items-end">
                <div className="container mx-auto px-4 pb-8 md:pb-12 w-full">
                  <div className="max-w-4xl">
                    <h1 className={`text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight transition-all duration-300 ${headerHeight < 40 ? 'opacity-70 scale-90' : 'opacity-100 scale-100'}`} style={{ transformOrigin: 'left bottom' }}>
                      {newsArticle.title}
                    </h1>
                    <div className={`bg-black/30 backdrop-blur-md p-3 rounded-xl border border-white/10 mt-auto transition-all duration-300 ${headerHeight < 40 ? 'opacity-70 scale-95' : 'opacity-100 scale-100'}`} style={{ transformOrigin: 'left bottom' }}>
                      <div className="flex flex-wrap justify-between items-center text-white text-sm">
                        <div className="flex items-center flex-wrap gap-3 w-full md:w-auto justify-between md:justify-start">
                          <div className="flex items-center px-3 py-1 rounded-full" style={{ backgroundColor: '#233CFA' }}>
                            <span className="font-medium capitalize">{newsArticle.category || 'K-pop'}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <Calendar size={16} className="mr-2 text-[#009efc]" />
                            <span className="font-medium">{
                              (() => {
                                const date = new Date(newsArticle.createdAt);
                                const year = date.getFullYear().toString().slice(-2);
                                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                const day = date.getDate().toString().padStart(2, '0');
                                return `${year}.${month}.${day}`;
                              })()
                            }</span>
                          </div>

                          <div className="flex items-center bg-white/20 px-3 py-1 rounded-full md:hidden">
                            <User size={16} className="mr-2 text-[#009efc]" />
                            <span className="font-medium">By {newsArticle.author?.name || 'Admin'}</span>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-4">
                          <div className="flex items-center">
                            <Clock size={16} className="mr-2 text-[#009efc]" />
                            <span className="font-medium">{estimatedReadTime} min read</span>
                          </div>
                          <div className="flex items-center">
                            <Eye size={16} className="mr-2 text-[#009efc]" />
                            <span className="font-medium">{newsArticle.viewCount?.toLocaleString() || '0'} views</span>
                          </div>

                          <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                            <User size={16} className="mr-2 text-[#009efc]" />
                            <span className="font-medium">By {newsArticle.author?.name || 'Admin'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="container mx-auto px-2 sm:px-4 py-8 sm:py-12">
              <div className="flex flex-col lg:flex-row gap-3 lg:gap-8">
                {/* Main Content */}
                <div className="lg:w-2/3">
                  <div className="bg-white rounded-xl p-3 sm:p-6 md:p-10 mb-4">
                    {/* Article content */}
                    <div className="prose prose-lg max-w-none">
                      <DirectRiddleContent content={newsArticle.content} />
                    </div>
                    
                    {/* Riddle 전용 CSS 스타일 - 매우 강력한 버전 */}
                    <style jsx global>{`
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
                      
                      /* 인라인 스타일보다 우선하는 CSS */
                      iframe[style*="height"] {
                        height: 1000px !important;
                        min-height: 1000px !important;
                      }
                      
                      /* 강제 클래스 스타일 */
                      .riddle-force-height {
                        height: 1000px !important;
                        min-height: 1000px !important;
                        max-height: none !important;
                      }

                      /* Twitter 임베드 여백 제거 */
                      .article-content .twitter-tweet,
                      .prose .twitter-tweet {
                        margin-top: 1rem !important;
                        margin-bottom: 1rem !important;
                      }

                      .article-content .twitter-tweet-rendered,
                      .prose .twitter-tweet-rendered {
                        margin-top: 1rem !important;
                        margin-bottom: 1rem !important;
                      }

                      /* Twitter iframe 여백 제거 */
                      .article-content iframe[id^="twitter-widget-"],
                      .prose iframe[id^="twitter-widget-"] {
                        margin-top: 1rem !important;
                        margin-bottom: 1rem !important;
                        max-width: 550px !important;
                      }

                      /* Instagram 임베드 여백 조정 */
                      .article-content .instagram-media,
                      .prose .instagram-media {
                        margin-top: 1rem !important;
                        margin-bottom: 1rem !important;
                      }

                      .article-content .instagram-media-rendered,
                      .prose .instagram-media-rendered {
                        margin-top: 1rem !important;
                        margin-bottom: 1rem !important;
                      }
                    `}</style>
                    
                    {/* Tags */}
                    {newsArticle.tags && newsArticle.tags.length > 0 && (
                      <TagsSection tags={newsArticle.tags} />
                    )}
                  </div>
                  
                  {/* Comments Section */}
                  <div className="rounded-xl p-3 sm:p-6 md:p-10 mb-8 bg-white border border-gray-200 shadow-sm relative overflow-hidden">

                    <h3 className="text-xl md:text-2xl font-bold text-black mb-6 flex items-center">
                      <img src="/images/icons8-messaging-48.png" alt="Comments" className="mr-2 w-5 h-5" />
                      <span className="text-black">
                        Comments ({localComments.length})
                      </span>
                    </h3>
                    
                    {/* Comment Form */}
                    <form onSubmit={handleCommentSubmit} className="mb-5 relative">
                      <div className="bg-white rounded-xl border border-purple-100 overflow-hidden shadow-sm">
                        <textarea 
                          className={`w-full px-4 py-3 bg-transparent focus:outline-none resize-none transition-all duration-300 ${textareaFocused ? 'h-[80px] md:h-[100px]' : 'h-[40px]'}`}
                          placeholder="Write your comment here..."
                          value={newComment}
                          onChange={handleCommentChange}
                          onFocus={() => setTextareaFocused(true)}
                          style={{ minHeight: 'unset' }}
                        ></textarea>
                        
                        {textareaFocused && (
                          <div className="flex items-center justify-between bg-gray-50 p-3 border-t border-purple-100/60">
                            <div className="flex items-center text-gray-500 relative">
                              <Smile 
                                size={18} 
                                className="mr-2 cursor-pointer hover:text-[#ff3e8e] transition-colors" 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              />
                              <span className="text-xs">Add emoji</span>
                              
                              {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 mb-1 bg-white p-2 rounded-lg shadow-md z-50 flex gap-2 flex-wrap border border-purple-100" style={{ width: '200px' }}>
                                  {['😊', '👍', '❤️', '🔥', '👏', '😂', '🎉', '👀', '🙏', '😍'].map(emoji => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      className="w-8 h-8 text-xl hover:bg-purple-50 rounded flex items-center justify-center"
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
                            </div>
                            
                            <button
                              type="submit"
                              disabled={!newComment.trim() || submittingComment}
                              className={`flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all text-sm md:text-base ${
                                !newComment.trim() || submittingComment
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'text-white hover:shadow-md'
                              }`}
                              style={!newComment.trim() || submittingComment ? {} : { backgroundColor: '#233CFA' }}
                            >
                              {submittingComment ? 'Posting...' : 'Post Comment'}
                              <Send size={14} className={`md:w-4 md:h-4 ${submittingComment ? 'animate-pulse' : ''}`} />
                            </button>
                          </div>
                        )}
                      </div>
                    </form>
                    
                    {/* Comments List */}
                    <div className="space-y-6">
                      {localComments.length > 0 ? (
                        localComments.map((comment, index) => {
                          const colors = getColorFromNickname(comment.author);
                          return (
                          <div key={comment.id || index} className="flex gap-3 pb-6 border-b border-purple-100/40 last:border-0">
                            {/* Avatar */}
                            <div className="shrink-0">
                              <div className="w-7 h-7 rounded-full bg-white overflow-hidden flex items-center justify-center">
                                <img
                                  src={comment.avatar}
                                  alt={comment.author}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    // Add gradient background and initial
                                    const parentNode = e.target.parentNode;
                                    parentNode.classList.add('overflow-hidden');
                                    const gradientDiv = document.createElement('div');
                                    gradientDiv.className = "w-full h-full flex items-center justify-center";
                                    gradientDiv.style.background = `linear-gradient(135deg, ${colors.main} 0%, ${colors.secondary} 100%)`;

                                    const initial = document.createElement('span');
                                    initial.textContent = comment.author.charAt(0).toUpperCase();
                                    initial.className = 'text-white font-bold text-xs';

                                    gradientDiv.appendChild(initial);
                                    parentNode.appendChild(gradientDiv);
                                  }}
                                />
                              </div>
                            </div>

                            {/* Comment Content */}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-black">{comment.author}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-xs">
                                    {comment.timestamp 
                                      ? formatCommentDate(new Date(comment.timestamp))
                                      : comment.date}
                                  </span>
                                  
                                  {/* Delete button (only shown to comment author or admin) */}
                                  {session && (session.user.role === 'admin' || session.user.id === comment.authorId) && (
                                    <button 
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-100/30">
                                <p className="text-gray-700">{comment.text}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                      ) : null}
                    </div>
                  </div>
                </div>
                
                {/* Sidebar */}
                <div className="lg:w-1/3">
                  {/* Related News */}
                  <div className="bg-white rounded-xl px-0 py-3 mb-8 mt-0 md:mt-12">
                    <div className="flex items-center mb-4">
                      <div className="flex items-center">
                        <img src="/images/icons8-link-48.png" alt="Related News" className="mr-2 w-5 h-5" />
                        <h3 className="text-xl md:text-2xl font-bold text-gray-800">
                          Related News
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const filtered = relatedArticles.filter(news => {
                          const isDifferentById = news._id !== newsArticle._id;
                          const isDifferentBySlug = news.slug !== newsArticle.slug;
                          return isDifferentById && isDifferentBySlug;
                        });

                        const displayedNews = relatedArticles && relatedArticles.length > 0
                          ? filtered.slice(0, 6)
                          : [];

                        return displayedNews.length > 0 ? (
                          displayedNews.map((news, idx) => (
                          <Link href={`/news/${news.slug || news._id || news.id}`} key={news._id || news.id || `related-${idx}`} passHref>
                            <div className="block bg-white overflow-hidden py-3 cursor-pointer">
                              <div className="flex gap-1">
                                {/* Thumbnail */}
                                <div className="w-40 h-32 flex-shrink-0 relative rounded-md overflow-hidden">
                                  <img
                                    src={news.coverImage || '/images/placeholder.jpg'}
                                    alt={news.title}
                                    className="w-full h-full object-cover rounded-md"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "/images/placeholder.jpg";
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-0 pr-3 pb-0 pl-3 flex flex-col justify-between h-32">
                                  <div>
                                    <h3 className="text-base md:text-lg font-semibold line-clamp-3 text-gray-800 mt-2">
                                      {news.title}
                                    </h3>
                                  </div>
                                  <div className="flex items-center text-gray-500 text-xs mt-2">
                                    <Clock size={12} className="mr-1" />
                                    {new Date(news.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                          ))
                        ) : (
                          <div className="text-center p-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No related articles found</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* More News Section */}
              <div className="mb-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
                    <img src="/images/icons8-copy-48.png" alt="More News" className="mr-2 w-5 h-5" />
                    More K-POP News
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {relatedArticles && relatedArticles.length > 0 ? (
                    // 현재 뉴스와 Related News 섹션에 표시된 뉴스 제외
                    relatedArticles
                      .filter(news => news._id !== newsArticle._id && news.slug !== newsArticle.slug && !relatedNewsIds.includes(news._id))
                      .slice(0, 6)
                      .map((news, index) => (
                      <Link key={index} href={`/news/${news.slug || news._id}`} className="group">
                        <div className="bg-white rounded-lg overflow-hidden transition-all duration-300 group relative cursor-pointer">
                          <div className="h-64 overflow-hidden relative rounded-md">
                            <img
                              src={news.coverImage || '/images/placeholder.jpg'}
                              alt={news.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-md"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/images/placeholder.jpg";
                              }}
                            />

                            {/* 반투명 그라디언트 오버레이 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          </div>

                          <div className="p-4">
                            <h3 className="font-bold text-gray-800 text-xl md:text-2xl mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#233CFA] transition-colors">
                              {news.title}
                            </h3>

                            <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                              {news.content
                                ? news.content.replace(/<[^>]*>/g, '')
                                : news.summary || ''}
                            </p>

                            <div className="flex justify-between items-end">
                              {/* 시간 배지 */}
                              <div className="flex items-center text-gray-500 text-xs">
                                <Clock size={12} className="mr-1 text-gray-500" />
                                <span>{new Date(news.createdAt || news.date).toLocaleDateString()}</span>
                              </div>

                              {/* Read more 버튼 */}
                              <span className="inline-flex items-center text-xs font-medium hover:underline cursor-pointer group" style={{ color: '#233CFA' }}>
                                Read more <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" style={{ color: '#233CFA' }} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-10 text-gray-500">
                      No related articles available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Back to Top Button */}
      {isMounted && showBackToTop && (
        <button
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 p-3 text-white rounded-full shadow-lg transition-colors hover:animate-none animate-bounce-custom transform hover:scale-110"
              aria-label="Back to top"
              style={{
                backgroundColor: '#233CFA',
                animation: 'bounce-button 2s infinite',
                zIndex: 9999,
              }}
            >
              <style jsx>{`
                @keyframes bounce-button {
                  0%, 100% {
                    transform: translateY(0);
                  }
                  50% {
                    transform: translateY(-10px);
                  }
                  70% {
                    transform: translateY(-5px);
                  }
                }
                button {
                  animation: bounce-button 2s ease-in-out infinite;
                  transition: all 0.3s;
                }
                button:hover {
                  animation: none;
                  transform: scale(1.15);
                  box-shadow: 0 10px 25px -5px rgba(35, 60, 250, 0.4);
                }
              `}</style>
              <ArrowUp size={20} />
            </button>
      )}

      <Footer />
    </div>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const { id } = params;
    
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
    
    // 뉴스를 찾지 못한 경우
    if (!newsArticle) {
      console.log(`News not found for ID/slug: ${id}`);
      return {
        notFound: true
      };
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
      thumbnailUrl: newsArticle.thumbnailUrl || newsArticle.coverImage
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
    
    return {
      props: {
        newsArticle: processedNewsArticle,
        relatedArticles: processedRelatedArticles
      }
    };
  } catch (error) {
    console.error('Error in getServerSideProps for News detail:', error);
    return {
      notFound: true
    };
  }
} 