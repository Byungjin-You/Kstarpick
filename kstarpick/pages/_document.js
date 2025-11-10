import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta property="og:site_name" content="KstarPick - K-Pop News Portal" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:locale:alternate" content="ko_KR" />
        <meta name="twitter:card" content="summary_large_image" />
        
        {/* Global search engine optimization */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        
        {/* Korean search engines optimization */}
        <meta name="NaverBot" content="All" />
        <meta name="Yeti" content="All" />
        <meta name="DaumBot" content="All" />
        
        {/* Search engine verification tags */}
        <meta name="google-site-verification" content="kstarpick-google-verification" />
        <meta name="naver-site-verification" content="kstarpick-naver-verification" />
        <meta name="msvalidate.01" content="kstarpick-bing-verification" />
        
        {/* App information */}
        <meta name="application-name" content="KstarPick" />
        <meta name="apple-mobile-web-app-title" content="KstarPick" />
        <meta name="theme-color" content="#8B5CF6" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-navbutton-color" content="#ffffff" />
        

        
        {/* Favicon and app icons - 최적화된 순서 */}
        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon/icons8-popular-3d-fluency-16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon/icons8-popular-3d-fluency-32.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/images/favicon/icons8-popular-3d-fluency-96.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/images/favicon/icons8-popular-3d-fluency-57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/images/favicon/icons8-popular-3d-fluency-60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/images/favicon/icons8-popular-3d-fluency-72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/images/favicon/icons8-popular-3d-fluency-76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/images/favicon/icons8-popular-3d-fluency-114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/images/favicon/icons8-popular-3d-fluency-120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/images/favicon/icons8-popular-3d-fluency-144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/favicon/icons8-popular-3d-fluency-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/favicon/icons8-popular-3d-fluency-180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/images/favicon/icons8-popular-3d-fluency-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/images/favicon/icons8-popular-3d-fluency-512.png" />
        <meta name="msapplication-TileImage" content="/images/favicon/icons8-popular-3d-fluency-144.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Structured Data for Google Search - Organization Logo */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "KstarPick",
              "url": "https://kstarpick.com",
              "logo": "https://kstarpick.com/images/icons8-popular-3d-fluency-96.png",
              "sameAs": [
                "https://www.instagram.com/kstarpick",
                "https://twitter.com/kstarpick",
                "https://www.facebook.com/kstarpick"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Customer Service",
                "email": "contact@kstarpick.com"
              }
            })
          }}
        />

        {/* Structured Data for Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "KstarPick",
              "alternateName": "KstarPick - K-Pop & K-Drama News",
              "url": "https://kstarpick.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://kstarpick.com/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        
        {/* 무한 새로고침 방지: logoClicked 플래그 강제 제거 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 즉시 실행: logoClicked 플래그 제거
              (function() {
                try {
                  const logoClicked = sessionStorage.getItem('logoClicked');
                  if (logoClicked) {
                    sessionStorage.removeItem('logoClicked');
                  }
                } catch(e) {
                  console.error('[_document.js CLEANUP] sessionStorage 초기화 오류:', e);
                }
              })();
            `
          }}
        />

        {/* 소셜 미디어 임베드 스크립트 - 뉴스 페이지에서만 로드 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 현재 페이지가 뉴스 상세페이지인지 확인
              function isNewsDetailPage() {
                return window.location.pathname.startsWith('/news/') &&
                       window.location.pathname !== '/news' &&
                       !window.location.pathname.endsWith('/news');
              }
              
              // 전역 상태 초기화
              window.embedScriptStatus = {
                instagram: { loaded: false, loading: false, error: false },
                twitter: { loaded: false, loading: false, error: false },
                riddle: { loaded: false, loading: false, error: false }
              };
              
              // Instagram 스크립트 로드 함수
              window.loadInstagramScript = function() {
                if (window.embedScriptStatus.instagram.loaded || window.embedScriptStatus.instagram.loading) return;
                if (window.instgrm) { 
                  window.embedScriptStatus.instagram.loaded = true; 
                  return; 
                }
                
                window.embedScriptStatus.instagram.loading = true;
                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://www.instagram.com/embed.js';
                script.onload = function() {
                  window.embedScriptStatus.instagram.loaded = true;
                  window.embedScriptStatus.instagram.loading = false;
                  window.dispatchEvent(new CustomEvent('instagramScriptLoaded'));
                };
                script.onerror = function() {
                  console.error('[Global] Instagram 스크립트 로드 실패');
                  window.embedScriptStatus.instagram.error = true;
                  window.embedScriptStatus.instagram.loading = false;
                };
                document.head.appendChild(script);
              };
              
              // Twitter 스크립트 로드 함수
              window.loadTwitterScript = function() {
                if (window.embedScriptStatus.twitter.loaded || window.embedScriptStatus.twitter.loading) return;
                if (window.twttr) { 
                  window.embedScriptStatus.twitter.loaded = true; 
                  return; 
                }
                
                window.embedScriptStatus.twitter.loading = true;
                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://platform.twitter.com/widgets.js';
                script.charset = 'utf-8';
                script.onload = function() {
                  window.embedScriptStatus.twitter.loaded = true;
                  window.embedScriptStatus.twitter.loading = false;
                  window.dispatchEvent(new CustomEvent('twitterScriptLoaded'));
                };
                script.onerror = function() {
                  console.error('[Global] Twitter 스크립트 로드 실패');
                  window.embedScriptStatus.twitter.error = true;
                  window.embedScriptStatus.twitter.loading = false;
                };
                document.head.appendChild(script);
              };
              
              // Riddle 스크립트 로드 함수
              window.loadRiddleScript = function() {
                if (window.embedScriptStatus.riddle.loaded || window.embedScriptStatus.riddle.loading) return;
                if (window.Riddle) { 
                  window.embedScriptStatus.riddle.loaded = true; 
                  return; 
                }
                
                window.embedScriptStatus.riddle.loading = true;
                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://www.riddle.com/embed/build-embedjs/embedV2.js';
                script.onload = function() {
                  window.embedScriptStatus.riddle.loaded = true;
                  window.embedScriptStatus.riddle.loading = false;
                  window.dispatchEvent(new CustomEvent('riddleScriptLoaded'));
                };
                script.onerror = function() {
                  console.error('[Global] Riddle 스크립트 로드 실패');
                  window.embedScriptStatus.riddle.error = true;
                  window.embedScriptStatus.riddle.loading = false;
                };
                document.head.appendChild(script);
              };
              
              // 뉴스 상세페이지에서만 스크립트 즉시 로드
              if (isNewsDetailPage()) {
                // 즉시 스크립트 로드 (대기 없음)
                window.loadInstagramScript();
                window.loadTwitterScript();
                window.loadRiddleScript();
              }
            `
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 