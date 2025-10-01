"use strict";(()=>{var e={};e.id=660,e.ids=[660],e.modules={65949:(e,t,n)=>{n.r(t),n.d(t,{default:()=>o});var i=n(20997),r=n(56859);function o(){return(0,i.jsxs)(r.Html,{lang:"en",children:[(0,i.jsxs)(r.Head,{children:[i.jsx("meta",{charSet:"utf-8"}),i.jsx("meta",{property:"og:site_name",content:"KstarPick - K-Pop News Portal"}),i.jsx("meta",{property:"og:type",content:"website"}),i.jsx("meta",{property:"og:locale",content:"en_US"}),i.jsx("meta",{property:"og:locale:alternate",content:"ko_KR"}),i.jsx("meta",{name:"twitter:card",content:"summary_large_image"}),i.jsx("meta",{name:"robots",content:"index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"}),i.jsx("meta",{name:"googlebot",content:"index, follow"}),i.jsx("meta",{name:"NaverBot",content:"All"}),i.jsx("meta",{name:"Yeti",content:"All"}),i.jsx("meta",{name:"DaumBot",content:"All"}),i.jsx("meta",{name:"google-site-verification",content:"kstarpick-google-verification"}),i.jsx("meta",{name:"naver-site-verification",content:"kstarpick-naver-verification"}),i.jsx("meta",{name:"msvalidate.01",content:"kstarpick-bing-verification"}),i.jsx("meta",{name:"application-name",content:"KstarPick"}),i.jsx("meta",{name:"apple-mobile-web-app-title",content:"KstarPick"}),i.jsx("meta",{name:"theme-color",content:"#8B5CF6"}),i.jsx("meta",{name:"apple-mobile-web-app-status-bar-style",content:"default"}),i.jsx("meta",{name:"apple-mobile-web-app-capable",content:"yes"}),i.jsx("meta",{name:"mobile-web-app-capable",content:"yes"}),i.jsx("meta",{name:"msapplication-TileColor",content:"#ffffff"}),i.jsx("meta",{name:"msapplication-navbutton-color",content:"#ffffff"}),i.jsx("link",{rel:"preconnect",href:"https://www.instagram.com"}),i.jsx("link",{rel:"preconnect",href:"https://platform.twitter.com"}),i.jsx("link",{rel:"preconnect",href:"https://cdn.riddle.com"}),i.jsx("link",{rel:"dns-prefetch",href:"https://www.instagram.com"}),i.jsx("link",{rel:"dns-prefetch",href:"https://platform.twitter.com"}),i.jsx("link",{rel:"dns-prefetch",href:"https://cdn.riddle.com"}),i.jsx("link",{rel:"icon",type:"image/x-icon",href:"/favicon.ico"}),i.jsx("link",{rel:"icon",type:"image/png",sizes:"16x16",href:"/favicon-16x16.png"}),i.jsx("link",{rel:"icon",type:"image/png",sizes:"32x32",href:"/favicon-32x32.png"}),i.jsx("link",{rel:"icon",type:"image/png",sizes:"48x48",href:"/favicon-48x48.png"}),i.jsx("link",{rel:"apple-touch-icon",sizes:"180x180",href:"/apple-touch-icon.png"}),i.jsx("link",{rel:"icon",type:"image/png",sizes:"192x192",href:"/android-chrome-192x192.png"}),i.jsx("link",{rel:"icon",type:"image/png",sizes:"512x512",href:"/android-chrome-512x512.png"}),i.jsx("link",{rel:"manifest",href:"/site.webmanifest"}),i.jsx("script",{dangerouslySetInnerHTML:{__html:`
              // Instagram 스크립트 로드 함수
              function loadInstagramScript() {
                if (typeof window !== 'undefined' && !window.instgrm) {
                  const script = document.createElement('script');
                  script.async = true;
                  script.src = 'https://www.instagram.com/embed.js';
                  script.onload = function() {
                    console.log('[Global] Instagram 스크립트 로드 완료');
                    window.instagramScriptLoaded = true;
                  };
                  script.onerror = function() {
                    console.error('[Global] Instagram 스크립트 로드 실패');
                  };
                  document.head.appendChild(script);
                }
              }
              
              // Twitter 스크립트 로드 함수
              function loadTwitterScript() {
                if (typeof window !== 'undefined' && !window.twttr) {
                  const script = document.createElement('script');
                  script.async = true;
                  script.src = 'https://platform.twitter.com/widgets.js';
                  script.charset = 'utf-8';
                  script.onload = function() {
                    console.log('[Global] Twitter 스크립트 로드 완료');
                    window.twitterScriptLoaded = true;
                  };
                  script.onerror = function() {
                    console.error('[Global] Twitter 스크립트 로드 실패');
                  };
                  document.head.appendChild(script);
                }
              }
              
              // Riddle 스크립트 로드 함수
              function loadRiddleScript() {
                if (typeof window !== 'undefined' && !window.Riddle) {
                  const script = document.createElement('script');
                  script.async = true;
                  script.src = 'https://www.riddle.com/embed/build-embedjs/embedV2.js';
                  script.onload = function() {
                    console.log('[Global] Riddle 스크립트 로드 완료');
                    window.riddleScriptLoaded = true;
                  };
                  script.onerror = function() {
                    console.error('[Global] Riddle 스크립트 로드 실패');
                  };
                  document.head.appendChild(script);
                }
              }
              
              // 즉시 스크립트 로드 - 하이드레이션 전에 준비
              loadInstagramScript();
              loadTwitterScript();
              loadRiddleScript();
              
              // 추가 안전장치: DOM 로드 완료 후에도 재시도
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                  setTimeout(function() {
                    if (!window.instgrm) loadInstagramScript();
                    if (!window.twttr) loadTwitterScript();
                    if (!window.Riddle) loadRiddleScript();
                  }, 100);
                });
              }
            `}})]}),(0,i.jsxs)("body",{children:[i.jsx(r.Main,{}),i.jsx(r.NextScript,{})]})]})}},62785:e=>{e.exports=require("next/dist/compiled/next-server/pages.runtime.prod.js")},16689:e=>{e.exports=require("react")},20997:e=>{e.exports=require("react/jsx-runtime")},55315:e=>{e.exports=require("path")}};var t=require("../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),i=t.X(0,[3393,6859],()=>n(65949));module.exports=i})();