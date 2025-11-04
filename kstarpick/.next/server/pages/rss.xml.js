(()=>{var e={};e.id=2703,e.ids=[2703,2888,660,8505],e.modules={1323:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"hoist",{enumerable:!0,get:function(){return function e(t,r){return r in t?t[r]:"then"in t&&"function"==typeof t.then?t.then(t=>e(t,r)):"function"==typeof t&&"default"===r?t:void 0}}})},85214:(e,t,r)=>{"use strict";r.r(t),r.d(t,{config:()=>x,default:()=>u,getServerSideProps:()=>w,getStaticPaths:()=>g,getStaticProps:()=>f,reportWebVitals:()=>h,routeModule:()=>P,unstable_getServerProps:()=>S,unstable_getServerSideProps:()=>j,unstable_getStaticParams:()=>v,unstable_getStaticPaths:()=>y,unstable_getStaticProps:()=>b});var n={};r.r(n),r.d(n,{default:()=>p,getServerSideProps:()=>m});var a=r(87093),s=r(35244),o=r(1323),i=r(65949),c=r(81928),l=r(75676);function d(e){let t="https://kstarpick.com";return`<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" 
         xmlns:content="http://purl.org/rss/1.0/modules/content/"
         xmlns:wfw="http://wellformedweb.org/CommentAPI/"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:atom="http://www.w3.org/2005/Atom"
         xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
         xmlns:slash="http://purl.org/rss/1.0/modules/slash/">
      <channel>
        <title>KstarPick - K-Pop News Portal</title>
        <link>${t}</link>
        <description>K-Pop, 한류, 드라마, TV/영화 소식을 한 곳에서 만나보세요.</description>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <language>ko-KR</language>
        <sy:updatePeriod>hourly</sy:updatePeriod>
        <sy:updateFrequency>1</sy:updateFrequency>
        <generator>Next.js</generator>
        <atom:link href="${t}/rss.xml" rel="self" type="application/rss+xml" />
        
        ${e.map(e=>{let r=e.createdAt?new Date(e.createdAt).toUTCString():new Date().toUTCString(),n=e.description||e.summary||"",a=e.content||n;return`
            <item>
              <title><![CDATA[${e.title}]]></title>
              <link>${t}${e.link}</link>
              <description><![CDATA[${n}]]></description>
              <content:encoded><![CDATA[${a}]]></content:encoded>
              <pubDate>${r}</pubDate>
              <guid isPermaLink="true">${t}${e.link}</guid>
              ${e.category?`<category><![CDATA[${e.category}]]></category>`:""}
              ${e.author?`<dc:creator><![CDATA[${e.author}]]></dc:creator>`:""}
            </item>
          `}).join("")}
      </channel>
    </rss>
  `}async function m({res:e}){try{let{db:t}=await (0,l.connectToDatabase)(),r=[],n=t.collection("news");(await n.find({},{projection:{_id:1,title:1,content:1,description:1,category:1,createdAt:1,author:1}}).sort({createdAt:-1}).limit(30).toArray()).forEach(e=>{r.push({title:e.title,link:`/news/${e._id}`,description:e.description||e.content?.substring(0,200)+"...",content:e.content,category:e.category||"K-Pop News",createdAt:e.createdAt,author:e.author||"KstarPick"})});let a=t.collection("dramas");(await a.find({},{projection:{_id:1,title:1,summary:1,createdAt:1}}).sort({createdAt:-1}).limit(10).toArray()).forEach(e=>{r.push({title:`[드라마] ${e.title}`,link:`/drama/${e._id}`,description:e.summary||`${e.title} 드라마 정보`,content:e.summary,category:"K-Drama",createdAt:e.createdAt,author:"KstarPick"})});let s=t.collection("tvfilms");(await s.find({},{projection:{_id:1,title:1,summary:1,createdAt:1}}).sort({createdAt:-1}).limit(10).toArray()).forEach(e=>{r.push({title:`[TV/영화] ${e.title}`,link:`/tvfilm/${e._id}`,description:e.summary||`${e.title} 정보`,content:e.summary,category:"TV/Film",createdAt:e.createdAt,author:"KstarPick"})}),r.sort((e,t)=>new Date(t.createdAt)-new Date(e.createdAt));let o=d(r);e.setHeader("Content-Type","text/xml; charset=utf-8"),e.setHeader("Cache-Control","public, s-maxage=1200, stale-while-revalidate=600"),e.write(o),e.end()}catch(r){let t=d([{title:"KstarPick - K-Pop News Portal",link:"/",description:"K-Pop, 한류, 드라마, TV/영화 소식을 한 곳에서 만나보세요.",content:"K-Pop, 한류, 드라마, TV/영화 소식을 한 곳에서 만나보세요.",category:"K-Pop",createdAt:new Date,author:"KstarPick"}]);e.setHeader("Content-Type","text/xml; charset=utf-8"),e.write(t),e.end()}return{props:{}}}let p=function(){return null},u=(0,o.hoist)(n,"default"),f=(0,o.hoist)(n,"getStaticProps"),g=(0,o.hoist)(n,"getStaticPaths"),w=(0,o.hoist)(n,"getServerSideProps"),x=(0,o.hoist)(n,"config"),h=(0,o.hoist)(n,"reportWebVitals"),b=(0,o.hoist)(n,"unstable_getStaticProps"),y=(0,o.hoist)(n,"unstable_getStaticPaths"),v=(0,o.hoist)(n,"unstable_getStaticParams"),S=(0,o.hoist)(n,"unstable_getServerProps"),j=(0,o.hoist)(n,"unstable_getServerSideProps"),P=new a.PagesRouteModule({definition:{kind:s.RouteKind.PAGES,page:"/rss.xml",pathname:"/rss.xml",bundlePath:"",filename:""},components:{App:c.default,Document:i.default},userland:n})},93677:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>o});var n=r(20997),a=r(4298),s=r.n(a);let o=()=>{let e="G-S3VJ3Q8WM9",t=process.env.NEXT_PUBLIC_GTM_ID;return e?(0,n.jsxs)(n.Fragment,{children:[n.jsx(s(),{src:`https://www.googletagmanager.com/gtag/js?id=${e}`,strategy:"afterInteractive"}),n.jsx(s(),{id:"google-analytics",strategy:"afterInteractive",children:`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${e}', {
            page_title: document.title,
            page_location: window.location.href,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}),t&&(0,n.jsxs)(n.Fragment,{children:[n.jsx(s(),{id:"google-tag-manager",strategy:"afterInteractive",children:`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${t}');
            `}),n.jsx("noscript",{children:n.jsx("iframe",{src:`https://www.googletagmanager.com/ns.html?id=${t}`,height:"0",width:"0",style:{display:"none",visibility:"hidden"}})})]}),process.env.NEXT_PUBLIC_GSC_VERIFICATION&&n.jsx("meta",{name:"google-site-verification",content:process.env.NEXT_PUBLIC_GSC_VERIFICATION}),process.env.NEXT_PUBLIC_NAVER_VERIFICATION&&n.jsx("meta",{name:"naver-site-verification",content:process.env.NEXT_PUBLIC_NAVER_VERIFICATION}),process.env.NEXT_PUBLIC_DAUM_VERIFICATION&&n.jsx("meta",{name:"daumsite",content:process.env.NEXT_PUBLIC_DAUM_VERIFICATION}),process.env.NEXT_PUBLIC_BING_VERIFICATION&&n.jsx("meta",{name:"msvalidate.01",content:process.env.NEXT_PUBLIC_BING_VERIFICATION}),n.jsx(s(),{id:"web-vitals",strategy:"afterInteractive",children:`
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
        `})]}):null}},81928:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>u});var n=r(20997);r(86764);var a=r(16689),s=r(41649),o=r(40968),i=r.n(o),c=r(11163),l=r(93677),d=r(99816),m=r.n(d);let p=()=>{let[e,t]=(0,a.useState)(!1),r=(0,c.useRouter)();return((0,a.useEffect)(()=>{let e=e=>{e!==r.asPath&&t(!0)},n=()=>{t(!1)};return r.events.on("routeChangeStart",e),r.events.on("routeChangeComplete",n),r.events.on("routeChangeError",n),()=>{r.events.off("routeChangeStart",e),r.events.off("routeChangeComplete",n),r.events.off("routeChangeError",n)}},[r]),e)?(0,n.jsxs)("div",{className:"jsx-1cf8b692071f6c24 fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center",children:[(0,n.jsxs)("div",{className:"jsx-1cf8b692071f6c24 flex flex-col items-center",children:[(0,n.jsxs)("div",{className:"jsx-1cf8b692071f6c24 relative w-16 h-16 mb-4",children:[n.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-0 rounded-full border-4 border-gray-200"}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-0 rounded-full border-4 border-transparent border-t-[#233CFA] animate-spin"}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-2 rounded-full border-2 border-transparent border-b-[#5a6eff] animate-reverse-spin"})]}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 text-center",children:n.jsx("p",{className:"jsx-1cf8b692071f6c24 text-lg font-medium text-gray-800 mb-1",children:"Loading..."})}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 w-64 h-1 bg-gray-200 rounded-full mt-4 overflow-hidden",children:n.jsx("div",{className:"jsx-1cf8b692071f6c24 h-full bg-gradient-to-r from-[#233CFA] to-[#5a6eff] rounded-full animate-progress"})})]}),n.jsx(m(),{id:"1cf8b692071f6c24",children:"@-webkit-keyframes reverse-spin{from{-webkit-transform:rotate(360deg);transform:rotate(360deg)}to{-webkit-transform:rotate(0deg);transform:rotate(0deg)}}@-moz-keyframes reverse-spin{from{-moz-transform:rotate(360deg);transform:rotate(360deg)}to{-moz-transform:rotate(0deg);transform:rotate(0deg)}}@-o-keyframes reverse-spin{from{-o-transform:rotate(360deg);transform:rotate(360deg)}to{-o-transform:rotate(0deg);transform:rotate(0deg)}}@keyframes reverse-spin{from{-webkit-transform:rotate(360deg);-moz-transform:rotate(360deg);-o-transform:rotate(360deg);transform:rotate(360deg)}to{-webkit-transform:rotate(0deg);-moz-transform:rotate(0deg);-o-transform:rotate(0deg);transform:rotate(0deg)}}@-webkit-keyframes progress{0%{-webkit-transform:translatex(-100%);transform:translatex(-100%)}100%{-webkit-transform:translatex(100%);transform:translatex(100%)}}@-moz-keyframes progress{0%{-moz-transform:translatex(-100%);transform:translatex(-100%)}100%{-moz-transform:translatex(100%);transform:translatex(100%)}}@-o-keyframes progress{0%{-o-transform:translatex(-100%);transform:translatex(-100%)}100%{-o-transform:translatex(100%);transform:translatex(100%)}}@keyframes progress{0%{-webkit-transform:translatex(-100%);-moz-transform:translatex(-100%);-o-transform:translatex(-100%);transform:translatex(-100%)}100%{-webkit-transform:translatex(100%);-moz-transform:translatex(100%);-o-transform:translatex(100%);transform:translatex(100%)}}.animate-reverse-spin.jsx-1cf8b692071f6c24{-webkit-animation:reverse-spin 1s linear infinite;-moz-animation:reverse-spin 1s linear infinite;-o-animation:reverse-spin 1s linear infinite;animation:reverse-spin 1s linear infinite}.animate-progress.jsx-1cf8b692071f6c24{-webkit-animation:progress 2s ease-in-out infinite;-moz-animation:progress 2s ease-in-out infinite;-o-animation:progress 2s ease-in-out infinite;animation:progress 2s ease-in-out infinite}"})]}):null},u=function({Component:e,pageProps:{session:t,...r}}){let o=function(){let[e,t]=(0,a.useState)(!1);return e}();return(0,c.useRouter)(),(0,n.jsxs)(a.Fragment,{children:[(0,n.jsxs)(i(),{children:[n.jsx("meta",{charSet:"utf-8"}),n.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),n.jsx("meta",{name:"theme-color",content:"#ffffff"}),n.jsx("meta",{httpEquiv:"Cache-Control",content:"no-cache, no-store, must-revalidate"}),n.jsx("meta",{httpEquiv:"Pragma",content:"no-cache"}),n.jsx("meta",{httpEquiv:"Expires",content:"0"}),n.jsx("link",{rel:"icon",href:"/favicon.ico"})]}),n.jsx(l.default,{}),n.jsx(p,{}),n.jsx(s.SessionProvider,{session:t,children:o?n.jsx(e,{...r}):n.jsx("div",{className:"min-h-screen bg-white flex items-center justify-center",children:(0,n.jsxs)("div",{className:"text-center",children:[n.jsx("div",{className:"animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4",style:{borderColor:"#233CFA"}}),n.jsx("p",{className:"text-gray-500 text-sm",children:"Loading..."})]})})})]})}},65949:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>s});var n=r(20997),a=r(56859);function s(){return(0,n.jsxs)(a.Html,{lang:"en",children:[(0,n.jsxs)(a.Head,{children:[n.jsx("meta",{charSet:"utf-8"}),n.jsx("meta",{property:"og:site_name",content:"KstarPick - K-Pop News Portal"}),n.jsx("meta",{property:"og:type",content:"website"}),n.jsx("meta",{property:"og:locale",content:"en_US"}),n.jsx("meta",{property:"og:locale:alternate",content:"ko_KR"}),n.jsx("meta",{name:"twitter:card",content:"summary_large_image"}),n.jsx("meta",{name:"robots",content:"index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"}),n.jsx("meta",{name:"googlebot",content:"index, follow"}),n.jsx("meta",{name:"NaverBot",content:"All"}),n.jsx("meta",{name:"Yeti",content:"All"}),n.jsx("meta",{name:"DaumBot",content:"All"}),n.jsx("meta",{name:"google-site-verification",content:"kstarpick-google-verification"}),n.jsx("meta",{name:"naver-site-verification",content:"kstarpick-naver-verification"}),n.jsx("meta",{name:"msvalidate.01",content:"kstarpick-bing-verification"}),n.jsx("meta",{name:"application-name",content:"KstarPick"}),n.jsx("meta",{name:"apple-mobile-web-app-title",content:"KstarPick"}),n.jsx("meta",{name:"theme-color",content:"#8B5CF6"}),n.jsx("meta",{name:"apple-mobile-web-app-status-bar-style",content:"default"}),n.jsx("meta",{name:"apple-mobile-web-app-capable",content:"yes"}),n.jsx("meta",{name:"mobile-web-app-capable",content:"yes"}),n.jsx("meta",{name:"msapplication-TileColor",content:"#ffffff"}),n.jsx("meta",{name:"msapplication-navbutton-color",content:"#ffffff"}),n.jsx("link",{rel:"icon",type:"image/png",href:"/images/icons8-popular-3d-fluency-32.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"16x16",href:"/images/icons8-popular-3d-fluency-16.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"32x32",href:"/images/icons8-popular-3d-fluency-32.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"48x48",href:"/images/icons8-popular-3d-fluency-32.png"}),n.jsx("link",{rel:"apple-touch-icon",sizes:"180x180",href:"/images/icons8-popular-3d-fluency-96.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"192x192",href:"/images/icons8-popular-3d-fluency-96.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"512x512",href:"/images/icons8-popular-3d-fluency-96.png"}),n.jsx("link",{rel:"manifest",href:"/site.webmanifest"}),n.jsx("script",{dangerouslySetInnerHTML:{__html:`
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
            `}})]}),(0,n.jsxs)("body",{children:[n.jsx(a.Main,{}),n.jsx(a.NextScript,{})]})]})}},75676:(e,t,r)=>{"use strict";let n;r.r(t),r.d(t,{connectToDatabase:()=>l,dbConnect:()=>d,default:()=>m});var a=r(38013),s=r(92048),o=r.n(s),i=r(55315),c=r.n(i);{let e=r(25142),t=c().resolve(process.cwd(),".env.production");o().existsSync(t)&&e.config({path:t}).error}async function l(){try{let e=await n,t=e.db("kstarpick");return{client:e,db:t}}catch(e){throw e}}n=new a.MongoClient("mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1",{tls:!1,tlsAllowInvalidCertificates:!0,tlsAllowInvalidHostnames:!0,retryWrites:!1,maxPoolSize:50,serverSelectionTimeoutMS:5e3,socketTimeoutMS:45e3,connectTimeoutMS:1e4,heartbeatFrequencyMS:1e4,maxIdleTimeMS:3e4}).connect();let d=l,m=n},86764:()=>{},35244:(e,t)=>{"use strict";var r;Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"RouteKind",{enumerable:!0,get:function(){return r}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(r||(r={}))},25142:e=>{"use strict";e.exports=require("dotenv")},38013:e=>{"use strict";e.exports=require("mongodb")},41649:e=>{"use strict";e.exports=require("next-auth/react")},62785:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/pages.runtime.prod.js")},40968:e=>{"use strict";e.exports=require("next/head")},16689:e=>{"use strict";e.exports=require("react")},66405:e=>{"use strict";e.exports=require("react-dom")},20997:e=>{"use strict";e.exports=require("react/jsx-runtime")},99816:e=>{"use strict";e.exports=require("styled-jsx/style")},92048:e=>{"use strict";e.exports=require("fs")},55315:e=>{"use strict";e.exports=require("path")},76162:e=>{"use strict";e.exports=require("stream")},71568:e=>{"use strict";e.exports=require("zlib")}};var t=require("../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[3393,1859,6859],()=>r(85214));module.exports=n})();