(()=>{var e={};e.id=2164,e.ids=[2164,2888,660,8505],e.modules={1323:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"hoist",{enumerable:!0,get:function(){return function e(t,r){return r in t?t[r]:"then"in t&&"function"==typeof t.then?t.then(t=>e(t,r)):"function"==typeof t&&"default"===r?t:void 0}}})},68380:(e,t,r)=>{"use strict";r.r(t),r.d(t,{config:()=>x,default:()=>p,getServerSideProps:()=>w,getStaticPaths:()=>g,getStaticProps:()=>u,reportWebVitals:()=>h,routeModule:()=>P,unstable_getServerProps:()=>v,unstable_getServerSideProps:()=>j,unstable_getStaticParams:()=>y,unstable_getStaticPaths:()=>b,unstable_getStaticProps:()=>S});var n={};r.r(n),r.d(n,{default:()=>f,getServerSideProps:()=>m});var a=r(87093),i=r(35244),s=r(1323),o=r(65949),l=r(81928),c=r(75676);function d(e){return`<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${e.map(e=>`
          <url>
            <loc>https://kstarpick.com${e.url}</loc>
            <lastmod>${e.lastmod}</lastmod>
            <changefreq>${e.changefreq}</changefreq>
            <priority>${e.priority}</priority>
          </url>
        `).join("")}
    </urlset>
  `}async function m({res:e}){try{let{db:t}=await (0,c.connectToDatabase)(),r=[{url:"/",lastmod:new Date().toISOString(),changefreq:"daily",priority:"1.0"},{url:"/news",lastmod:new Date().toISOString(),changefreq:"hourly",priority:"0.9"},{url:"/drama",lastmod:new Date().toISOString(),changefreq:"daily",priority:"0.9"},{url:"/tvfilm",lastmod:new Date().toISOString(),changefreq:"daily",priority:"0.9"},{url:"/music",lastmod:new Date().toISOString(),changefreq:"daily",priority:"0.8"},{url:"/celeb",lastmod:new Date().toISOString(),changefreq:"daily",priority:"0.8"},{url:"/ranking",lastmod:new Date().toISOString(),changefreq:"daily",priority:"0.8"},{url:"/search",lastmod:new Date().toISOString(),changefreq:"monthly",priority:"0.7"},{url:"/celeb",lastmod:new Date().toISOString(),changefreq:"daily",priority:"0.7"},{url:"/ranking",lastmod:new Date().toISOString(),changefreq:"daily",priority:"0.7"},{url:"/search",lastmod:new Date().toISOString(),changefreq:"weekly",priority:"0.6"}],n=t.collection("news"),a=(await n.find({},{projection:{_id:1,slug:1,createdAt:1,updatedAt:1}}).sort({createdAt:-1}).limit(1e3).toArray()).map(e=>({url:`/news/${e._id}`,lastmod:(e.updatedAt||e.createdAt||new Date).toISOString(),changefreq:"monthly",priority:"0.7"})),i=t.collection("dramas"),s=(await i.find({},{projection:{_id:1,slug:1,createdAt:1,updatedAt:1}}).sort({createdAt:-1}).limit(500).toArray()).map(e=>({url:`/drama/${e._id}`,lastmod:(e.updatedAt||e.createdAt||new Date).toISOString(),changefreq:"weekly",priority:"0.7"})),o=t.collection("tvfilms"),l=(await o.find({},{projection:{_id:1,slug:1,createdAt:1,updatedAt:1}}).sort({createdAt:-1}).limit(500).toArray()).map(e=>({url:`/tvfilm/${e._id}`,lastmod:(e.updatedAt||e.createdAt||new Date).toISOString(),changefreq:"weekly",priority:"0.7"})),m=t.collection("celebrities"),f=(await m.find({},{projection:{_id:1,slug:1,createdAt:1,updatedAt:1}}).sort({createdAt:-1}).limit(300).toArray()).map(e=>({url:`/celeb/${e.slug||e._id}`,lastmod:(e.updatedAt||e.createdAt||new Date).toISOString(),changefreq:"monthly",priority:"0.6"})),p=[];try{let e=t.collection("music");p=(await e.find({},{projection:{_id:1,slug:1,createdAt:1,updatedAt:1}}).sort({createdAt:-1}).limit(300).toArray()).map(e=>({url:`/music/${e._id}`,lastmod:(e.updatedAt||e.createdAt||new Date).toISOString(),changefreq:"weekly",priority:"0.7"}))}catch(e){}let u=[...r,...a,...s,...l,...f,...p],g=d(u);e.setHeader("Content-Type","text/xml"),e.write(g),e.end()}catch(r){let t=d([{url:"/",lastmod:new Date().toISOString(),changefreq:"daily",priority:"1.0"}]);e.setHeader("Content-Type","text/xml"),e.write(t),e.end()}return{props:{}}}let f=function(){return null},p=(0,s.hoist)(n,"default"),u=(0,s.hoist)(n,"getStaticProps"),g=(0,s.hoist)(n,"getStaticPaths"),w=(0,s.hoist)(n,"getServerSideProps"),x=(0,s.hoist)(n,"config"),h=(0,s.hoist)(n,"reportWebVitals"),S=(0,s.hoist)(n,"unstable_getStaticProps"),b=(0,s.hoist)(n,"unstable_getStaticPaths"),y=(0,s.hoist)(n,"unstable_getStaticParams"),v=(0,s.hoist)(n,"unstable_getServerProps"),j=(0,s.hoist)(n,"unstable_getServerSideProps"),P=new a.PagesRouteModule({definition:{kind:i.RouteKind.PAGES,page:"/sitemap.xml",pathname:"/sitemap.xml",bundlePath:"",filename:""},components:{App:l.default,Document:o.default},userland:n})},93677:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>s});var n=r(20997),a=r(4298),i=r.n(a);let s=()=>{let e="G-S3VJ3Q8WM9",t=process.env.NEXT_PUBLIC_GTM_ID;return e?(0,n.jsxs)(n.Fragment,{children:[n.jsx(i(),{src:`https://www.googletagmanager.com/gtag/js?id=${e}`,strategy:"afterInteractive"}),n.jsx(i(),{id:"google-analytics",strategy:"afterInteractive",children:`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${e}', {
            page_title: document.title,
            page_location: window.location.href,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}),t&&(0,n.jsxs)(n.Fragment,{children:[n.jsx(i(),{id:"google-tag-manager",strategy:"afterInteractive",children:`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${t}');
            `}),n.jsx("noscript",{children:n.jsx("iframe",{src:`https://www.googletagmanager.com/ns.html?id=${t}`,height:"0",width:"0",style:{display:"none",visibility:"hidden"}})})]}),process.env.NEXT_PUBLIC_GSC_VERIFICATION&&n.jsx("meta",{name:"google-site-verification",content:process.env.NEXT_PUBLIC_GSC_VERIFICATION}),process.env.NEXT_PUBLIC_NAVER_VERIFICATION&&n.jsx("meta",{name:"naver-site-verification",content:process.env.NEXT_PUBLIC_NAVER_VERIFICATION}),process.env.NEXT_PUBLIC_DAUM_VERIFICATION&&n.jsx("meta",{name:"daumsite",content:process.env.NEXT_PUBLIC_DAUM_VERIFICATION}),process.env.NEXT_PUBLIC_BING_VERIFICATION&&n.jsx("meta",{name:"msvalidate.01",content:process.env.NEXT_PUBLIC_BING_VERIFICATION}),n.jsx(i(),{id:"web-vitals",strategy:"afterInteractive",children:`
          // Core Web Vitals 측정
          function getCLS(onPerfEntry) {
            if ('PerformanceObserver' in window) {
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if (!entry.hadRecentInput) {
                    if (onPerfEntry && typeof onPerfEntry === 'function') {
                      onPerfEntry(entry);
                    }
                  }
                }
              });
              observer.observe({entryTypes: ['layout-shift']});
            }
          }

          function getFID(onPerfEntry) {
            if ('PerformanceObserver' in window) {
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if (onPerfEntry && typeof onPerfEntry === 'function') {
                    onPerfEntry(entry);
                  }
                }
              });
              observer.observe({entryTypes: ['first-input']});
            }
          }

          function getLCP(onPerfEntry) {
            if ('PerformanceObserver' in window) {
              const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (onPerfEntry && typeof onPerfEntry === 'function') {
                  onPerfEntry(lastEntry);
                }
              });
              observer.observe({entryTypes: ['largest-contentful-paint']});
            }
          }

          // 측정 시작 (성능 데이터 수집만, 로그 출력 안 함)
          getCLS();
          getFID();
          getLCP();
        `})]}):null}},81928:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>p});var n=r(20997);r(86764);var a=r(16689),i=r(41649),s=r(40968),o=r.n(s),l=r(11163),c=r(93677),d=r(99816),m=r.n(d);let f=()=>{let[e,t]=(0,a.useState)(!1),r=(0,l.useRouter)();return((0,a.useEffect)(()=>{let e=e=>{e!==r.asPath&&t(!0)},n=()=>{t(!1)};return r.events.on("routeChangeStart",e),r.events.on("routeChangeComplete",n),r.events.on("routeChangeError",n),()=>{r.events.off("routeChangeStart",e),r.events.off("routeChangeComplete",n),r.events.off("routeChangeError",n)}},[r]),e)?(0,n.jsxs)("div",{className:"jsx-1cf8b692071f6c24 fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center",children:[(0,n.jsxs)("div",{className:"jsx-1cf8b692071f6c24 flex flex-col items-center",children:[(0,n.jsxs)("div",{className:"jsx-1cf8b692071f6c24 relative w-16 h-16 mb-4",children:[n.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-0 rounded-full border-4 border-gray-200"}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-0 rounded-full border-4 border-transparent border-t-[#233CFA] animate-spin"}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-2 rounded-full border-2 border-transparent border-b-[#5a6eff] animate-reverse-spin"})]}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 text-center",children:n.jsx("p",{className:"jsx-1cf8b692071f6c24 text-lg font-medium text-gray-800 mb-1",children:"Loading..."})}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 w-64 h-1 bg-gray-200 rounded-full mt-4 overflow-hidden",children:n.jsx("div",{className:"jsx-1cf8b692071f6c24 h-full bg-gradient-to-r from-[#233CFA] to-[#5a6eff] rounded-full animate-progress"})})]}),n.jsx(m(),{id:"1cf8b692071f6c24",children:"@-webkit-keyframes reverse-spin{from{-webkit-transform:rotate(360deg);transform:rotate(360deg)}to{-webkit-transform:rotate(0deg);transform:rotate(0deg)}}@-moz-keyframes reverse-spin{from{-moz-transform:rotate(360deg);transform:rotate(360deg)}to{-moz-transform:rotate(0deg);transform:rotate(0deg)}}@-o-keyframes reverse-spin{from{-o-transform:rotate(360deg);transform:rotate(360deg)}to{-o-transform:rotate(0deg);transform:rotate(0deg)}}@keyframes reverse-spin{from{-webkit-transform:rotate(360deg);-moz-transform:rotate(360deg);-o-transform:rotate(360deg);transform:rotate(360deg)}to{-webkit-transform:rotate(0deg);-moz-transform:rotate(0deg);-o-transform:rotate(0deg);transform:rotate(0deg)}}@-webkit-keyframes progress{0%{-webkit-transform:translatex(-100%);transform:translatex(-100%)}100%{-webkit-transform:translatex(100%);transform:translatex(100%)}}@-moz-keyframes progress{0%{-moz-transform:translatex(-100%);transform:translatex(-100%)}100%{-moz-transform:translatex(100%);transform:translatex(100%)}}@-o-keyframes progress{0%{-o-transform:translatex(-100%);transform:translatex(-100%)}100%{-o-transform:translatex(100%);transform:translatex(100%)}}@keyframes progress{0%{-webkit-transform:translatex(-100%);-moz-transform:translatex(-100%);-o-transform:translatex(-100%);transform:translatex(-100%)}100%{-webkit-transform:translatex(100%);-moz-transform:translatex(100%);-o-transform:translatex(100%);transform:translatex(100%)}}.animate-reverse-spin.jsx-1cf8b692071f6c24{-webkit-animation:reverse-spin 1s linear infinite;-moz-animation:reverse-spin 1s linear infinite;-o-animation:reverse-spin 1s linear infinite;animation:reverse-spin 1s linear infinite}.animate-progress.jsx-1cf8b692071f6c24{-webkit-animation:progress 2s ease-in-out infinite;-moz-animation:progress 2s ease-in-out infinite;-o-animation:progress 2s ease-in-out infinite;animation:progress 2s ease-in-out infinite}"})]}):null},p=function({Component:e,pageProps:{session:t,...r}}){let s=function(){let[e,t]=(0,a.useState)(!1);return e}();return(0,l.useRouter)(),(0,n.jsxs)(a.Fragment,{children:[(0,n.jsxs)(o(),{children:[n.jsx("meta",{charSet:"utf-8"}),n.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),n.jsx("meta",{name:"theme-color",content:"#ffffff"}),n.jsx("meta",{httpEquiv:"Cache-Control",content:"no-cache, no-store, must-revalidate"}),n.jsx("meta",{httpEquiv:"Pragma",content:"no-cache"}),n.jsx("meta",{httpEquiv:"Expires",content:"0"}),n.jsx("link",{rel:"icon",href:"/favicon.ico"})]}),n.jsx(c.default,{}),n.jsx(f,{}),n.jsx(i.SessionProvider,{session:t,children:s?n.jsx(e,{...r}):n.jsx("div",{className:"min-h-screen bg-white flex items-center justify-center",children:(0,n.jsxs)("div",{className:"text-center",children:[n.jsx("div",{className:"animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4",style:{borderColor:"#233CFA"}}),n.jsx("p",{className:"text-gray-500 text-sm",children:"Loading..."})]})})})]})}},65949:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>i});var n=r(20997),a=r(56859);function i(){return(0,n.jsxs)(a.Html,{lang:"en",children:[(0,n.jsxs)(a.Head,{children:[n.jsx("meta",{charSet:"utf-8"}),n.jsx("meta",{property:"og:site_name",content:"KstarPick - K-Pop News Portal"}),n.jsx("meta",{property:"og:type",content:"website"}),n.jsx("meta",{property:"og:locale",content:"en_US"}),n.jsx("meta",{property:"og:locale:alternate",content:"ko_KR"}),n.jsx("meta",{name:"twitter:card",content:"summary_large_image"}),n.jsx("meta",{name:"robots",content:"index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"}),n.jsx("meta",{name:"googlebot",content:"index, follow"}),n.jsx("meta",{name:"NaverBot",content:"All"}),n.jsx("meta",{name:"Yeti",content:"All"}),n.jsx("meta",{name:"DaumBot",content:"All"}),n.jsx("meta",{name:"google-site-verification",content:"kstarpick-google-verification"}),n.jsx("meta",{name:"naver-site-verification",content:"kstarpick-naver-verification"}),n.jsx("meta",{name:"msvalidate.01",content:"kstarpick-bing-verification"}),n.jsx("meta",{name:"application-name",content:"KstarPick"}),n.jsx("meta",{name:"apple-mobile-web-app-title",content:"KstarPick"}),n.jsx("meta",{name:"theme-color",content:"#8B5CF6"}),n.jsx("meta",{name:"apple-mobile-web-app-status-bar-style",content:"default"}),n.jsx("meta",{name:"apple-mobile-web-app-capable",content:"yes"}),n.jsx("meta",{name:"mobile-web-app-capable",content:"yes"}),n.jsx("meta",{name:"msapplication-TileColor",content:"#ffffff"}),n.jsx("meta",{name:"msapplication-navbutton-color",content:"#ffffff"}),n.jsx("link",{rel:"icon",type:"image/png",href:"/images/icons8-popular-3d-fluency-32.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"16x16",href:"/images/icons8-popular-3d-fluency-16.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"32x32",href:"/images/icons8-popular-3d-fluency-32.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"48x48",href:"/images/icons8-popular-3d-fluency-32.png"}),n.jsx("link",{rel:"apple-touch-icon",sizes:"180x180",href:"/images/icons8-popular-3d-fluency-96.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"192x192",href:"/images/icons8-popular-3d-fluency-96.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"512x512",href:"/images/icons8-popular-3d-fluency-96.png"}),n.jsx("link",{rel:"manifest",href:"/site.webmanifest"}),n.jsx("script",{dangerouslySetInnerHTML:{__html:`
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
            `}}),n.jsx("script",{dangerouslySetInnerHTML:{__html:`
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
            `}})]}),(0,n.jsxs)("body",{children:[n.jsx(a.Main,{}),n.jsx(a.NextScript,{})]})]})}},75676:(e,t,r)=>{"use strict";let n;r.r(t),r.d(t,{connectToDatabase:()=>c,dbConnect:()=>d,default:()=>m});var a=r(38013),i=r(92048),s=r.n(i),o=r(55315),l=r.n(o);{let e=r(25142),t=l().resolve(process.cwd(),".env.production");s().existsSync(t)&&e.config({path:t}).error}async function c(){try{let e=await n,t=e.db("kstarpick");return{client:e,db:t}}catch(e){throw e}}n=new a.MongoClient("mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1",{tls:!1,tlsAllowInvalidCertificates:!0,tlsAllowInvalidHostnames:!0,retryWrites:!1,maxPoolSize:50,serverSelectionTimeoutMS:5e3,socketTimeoutMS:45e3,connectTimeoutMS:1e4,heartbeatFrequencyMS:1e4,maxIdleTimeMS:3e4}).connect();let d=c,m=n},86764:()=>{},35244:(e,t)=>{"use strict";var r;Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"RouteKind",{enumerable:!0,get:function(){return r}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(r||(r={}))},25142:e=>{"use strict";e.exports=require("dotenv")},38013:e=>{"use strict";e.exports=require("mongodb")},41649:e=>{"use strict";e.exports=require("next-auth/react")},62785:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/pages.runtime.prod.js")},40968:e=>{"use strict";e.exports=require("next/head")},16689:e=>{"use strict";e.exports=require("react")},66405:e=>{"use strict";e.exports=require("react-dom")},20997:e=>{"use strict";e.exports=require("react/jsx-runtime")},99816:e=>{"use strict";e.exports=require("styled-jsx/style")},92048:e=>{"use strict";e.exports=require("fs")},55315:e=>{"use strict";e.exports=require("path")},76162:e=>{"use strict";e.exports=require("stream")},71568:e=>{"use strict";e.exports=require("zlib")}};var t=require("../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[3393,1859,6859],()=>r(68380));module.exports=n})();