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
        

        
        {/* Favicon and app icons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
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
              
              console.log('[Global Script] 페이지 확인:', {
                path: window.location.pathname,
                isNewsDetail: isNewsDetailPage()
              });
              
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
                
                console.log('[Global] Instagram 스크립트 로드 시작');
                window.embedScriptStatus.instagram.loading = true;
                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://www.instagram.com/embed.js';
                script.onload = function() {
                  console.log('[Global] Instagram 스크립트 로드 완료');
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
                
                console.log('[Global] Twitter 스크립트 로드 시작');
                window.embedScriptStatus.twitter.loading = true;
                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://platform.twitter.com/widgets.js';
                script.charset = 'utf-8';
                script.onload = function() {
                  console.log('[Global] Twitter 스크립트 로드 완료');
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
                
                console.log('[Global] Riddle 스크립트 로드 시작');
                window.embedScriptStatus.riddle.loading = true;
                const script = document.createElement('script');
                script.async = true;
                script.src = 'https://www.riddle.com/embed/build-embedjs/embedV2.js';
                script.onload = function() {
                  console.log('[Global] Riddle 스크립트 로드 완료');
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
              
              // 뉴스 상세페이지에서만 스크립트 로드
              if (isNewsDetailPage()) {
                console.log('[Global Script] 뉴스 상세페이지 - 임베드 스크립트 로드 시작');
                window.loadInstagramScript();
                window.loadTwitterScript();
                window.loadRiddleScript();
              } else {
                console.log('[Global Script] 뉴스 페이지가 아님 - 임베드 스크립트 로드 생략');
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