(()=>{var e={};e.id=4820,e.ids=[4820,2888,660,8505],e.modules={1323:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"hoist",{enumerable:!0,get:function(){return function e(t,r){return r in t?t[r]:"then"in t&&"function"==typeof t.then?t.then(t=>e(t,r)):"function"==typeof t&&"default"===r?t:void 0}}})},78826:(e,t,r)=>{"use strict";r.r(t),r.d(t,{config:()=>m,default:()=>d,getServerSideProps:()=>u,getStaticPaths:()=>f,getStaticProps:()=>c,reportWebVitals:()=>p,routeModule:()=>y,unstable_getServerProps:()=>h,unstable_getServerSideProps:()=>b,unstable_getStaticParams:()=>x,unstable_getStaticPaths:()=>w,unstable_getStaticProps:()=>g});var n=r(87093),s=r(35244),a=r(1323),o=r(65949),i=r(81928),l=r(26971);let d=(0,a.hoist)(l,"default"),c=(0,a.hoist)(l,"getStaticProps"),f=(0,a.hoist)(l,"getStaticPaths"),u=(0,a.hoist)(l,"getServerSideProps"),m=(0,a.hoist)(l,"config"),p=(0,a.hoist)(l,"reportWebVitals"),g=(0,a.hoist)(l,"unstable_getStaticProps"),w=(0,a.hoist)(l,"unstable_getStaticPaths"),x=(0,a.hoist)(l,"unstable_getStaticParams"),h=(0,a.hoist)(l,"unstable_getServerProps"),b=(0,a.hoist)(l,"unstable_getServerSideProps"),y=new n.PagesRouteModule({definition:{kind:s.RouteKind.PAGES,page:"/_error",pathname:"/_error",bundlePath:"",filename:""},components:{App:i.default,Document:o.default},userland:l})},93677:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>o});var n=r(20997),s=r(4298),a=r.n(s);let o=()=>{let e="G-S3VJ3Q8WM9",t=process.env.NEXT_PUBLIC_GTM_ID;return e?(0,n.jsxs)(n.Fragment,{children:[n.jsx(a(),{src:`https://www.googletagmanager.com/gtag/js?id=${e}`,strategy:"afterInteractive"}),n.jsx(a(),{id:"google-analytics",strategy:"afterInteractive",children:`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${e}', {
            page_title: document.title,
            page_location: window.location.href,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}),t&&(0,n.jsxs)(n.Fragment,{children:[n.jsx(a(),{id:"google-tag-manager",strategy:"afterInteractive",children:`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${t}');
            `}),n.jsx("noscript",{children:n.jsx("iframe",{src:`https://www.googletagmanager.com/ns.html?id=${t}`,height:"0",width:"0",style:{display:"none",visibility:"hidden"}})})]}),process.env.NEXT_PUBLIC_GSC_VERIFICATION&&n.jsx("meta",{name:"google-site-verification",content:process.env.NEXT_PUBLIC_GSC_VERIFICATION}),process.env.NEXT_PUBLIC_NAVER_VERIFICATION&&n.jsx("meta",{name:"naver-site-verification",content:process.env.NEXT_PUBLIC_NAVER_VERIFICATION}),process.env.NEXT_PUBLIC_DAUM_VERIFICATION&&n.jsx("meta",{name:"daumsite",content:process.env.NEXT_PUBLIC_DAUM_VERIFICATION}),process.env.NEXT_PUBLIC_BING_VERIFICATION&&n.jsx("meta",{name:"msvalidate.01",content:process.env.NEXT_PUBLIC_BING_VERIFICATION}),n.jsx(a(),{id:"web-vitals",strategy:"afterInteractive",children:`
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
        `})]}):null}},26971:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"default",{enumerable:!0,get:function(){return c}});let n=r(50167),s=r(20997),a=n._(r(16689)),o=n._(r(7828)),i={400:"Bad Request",404:"This page could not be found",405:"Method Not Allowed",500:"Internal Server Error"};function l(e){let{res:t,err:r}=e;return{statusCode:t&&t.statusCode?t.statusCode:r?r.statusCode:404}}let d={error:{fontFamily:'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',height:"100vh",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},desc:{lineHeight:"48px"},h1:{display:"inline-block",margin:"0 20px 0 0",paddingRight:23,fontSize:24,fontWeight:500,verticalAlign:"top"},h2:{fontSize:14,fontWeight:400,lineHeight:"28px"},wrap:{display:"inline-block"}};class c extends a.default.Component{render(){let{statusCode:e,withDarkMode:t=!0}=this.props,r=this.props.title||i[e]||"An unexpected error has occurred";return(0,s.jsxs)("div",{style:d.error,children:[(0,s.jsx)(o.default,{children:(0,s.jsx)("title",{children:e?e+": "+r:"Application error: a client-side exception has occurred"})}),(0,s.jsxs)("div",{style:d.desc,children:[(0,s.jsx)("style",{dangerouslySetInnerHTML:{__html:"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}"+(t?"@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}":"")}}),e?(0,s.jsx)("h1",{className:"next-error-h1",style:d.h1,children:e}):null,(0,s.jsx)("div",{style:d.wrap,children:(0,s.jsxs)("h2",{style:d.h2,children:[this.props.title||e?r:(0,s.jsx)(s.Fragment,{children:"Application error: a client-side exception has occurred (see the browser console for more information)"}),"."]})})]})]})}}c.displayName="ErrorPage",c.getInitialProps=l,c.origGetInitialProps=l,("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},85495:(e,t)=>{"use strict";function r(e){let{ampFirst:t=!1,hybrid:r=!1,hasQuery:n=!1}=void 0===e?{}:e;return t||r&&n}Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"isInAmpMode",{enumerable:!0,get:function(){return r}})},7828:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{default:function(){return g},defaultHead:function(){return f}});let n=r(50167),s=r(28760),a=r(20997),o=s._(r(16689)),i=n._(r(67215)),l=r(98039),d=r(41988),c=r(85495);function f(e){void 0===e&&(e=!1);let t=[(0,a.jsx)("meta",{charSet:"utf-8"})];return e||t.push((0,a.jsx)("meta",{name:"viewport",content:"width=device-width"})),t}function u(e,t){return"string"==typeof t||"number"==typeof t?e:t.type===o.default.Fragment?e.concat(o.default.Children.toArray(t.props.children).reduce((e,t)=>"string"==typeof t||"number"==typeof t?e:e.concat(t),[])):e.concat(t)}r(1997);let m=["name","httpEquiv","charSet","itemProp"];function p(e,t){let{inAmpMode:r}=t;return e.reduce(u,[]).reverse().concat(f(r).reverse()).filter(function(){let e=new Set,t=new Set,r=new Set,n={};return s=>{let a=!0,o=!1;if(s.key&&"number"!=typeof s.key&&s.key.indexOf("$")>0){o=!0;let t=s.key.slice(s.key.indexOf("$")+1);e.has(t)?a=!1:e.add(t)}switch(s.type){case"title":case"base":t.has(s.type)?a=!1:t.add(s.type);break;case"meta":for(let e=0,t=m.length;e<t;e++){let t=m[e];if(s.props.hasOwnProperty(t)){if("charSet"===t)r.has(t)?a=!1:r.add(t);else{let e=s.props[t],r=n[t]||new Set;("name"!==t||!o)&&r.has(e)?a=!1:(r.add(e),n[t]=r)}}}}return a}}()).reverse().map((e,t)=>{let n=e.key||t;if(!r&&"link"===e.type&&e.props.href&&["https://fonts.googleapis.com/css","https://use.typekit.net/"].some(t=>e.props.href.startsWith(t))){let t={...e.props||{}};return t["data-href"]=t.href,t.href=void 0,t["data-optimized-fonts"]=!0,o.default.cloneElement(e,t)}return o.default.cloneElement(e,{key:n})})}let g=function(e){let{children:t}=e,r=(0,o.useContext)(l.AmpStateContext),n=(0,o.useContext)(d.HeadManagerContext);return(0,a.jsx)(i.default,{reduceComponentsToState:p,headManager:n,inAmpMode:(0,c.isInAmpMode)(r),children:t})};("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},67215:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"default",{enumerable:!0,get:function(){return o}});let n=r(16689),s=()=>{},a=()=>{};function o(e){var t;let{headManager:r,reduceComponentsToState:o}=e;function i(){if(r&&r.mountedInstances){let t=n.Children.toArray(Array.from(r.mountedInstances).filter(Boolean));r.updateHead(o(t,e))}}return null==r||null==(t=r.mountedInstances)||t.add(e.children),i(),s(()=>{var t;return null==r||null==(t=r.mountedInstances)||t.add(e.children),()=>{var t;null==r||null==(t=r.mountedInstances)||t.delete(e.children)}}),s(()=>(r&&(r._pendingUpdate=i),()=>{r&&(r._pendingUpdate=i)})),a(()=>(r&&r._pendingUpdate&&(r._pendingUpdate(),r._pendingUpdate=null),()=>{r&&r._pendingUpdate&&(r._pendingUpdate(),r._pendingUpdate=null)})),null}},1997:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"warnOnce",{enumerable:!0,get:function(){return r}});let r=e=>{}},81928:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>m});var n=r(20997);r(86764);var s=r(16689),a=r(41649),o=r(40968),i=r.n(o),l=r(11163),d=r(93677),c=r(99816),f=r.n(c);let u=()=>{let[e,t]=(0,s.useState)(!1),r=(0,l.useRouter)();return((0,s.useEffect)(()=>{let e=e=>{e!==r.asPath&&t(!0)},n=()=>{t(!1)};return r.events.on("routeChangeStart",e),r.events.on("routeChangeComplete",n),r.events.on("routeChangeError",n),()=>{r.events.off("routeChangeStart",e),r.events.off("routeChangeComplete",n),r.events.off("routeChangeError",n)}},[r]),e)?(0,n.jsxs)("div",{className:"jsx-1cf8b692071f6c24 fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center",children:[(0,n.jsxs)("div",{className:"jsx-1cf8b692071f6c24 flex flex-col items-center",children:[(0,n.jsxs)("div",{className:"jsx-1cf8b692071f6c24 relative w-16 h-16 mb-4",children:[n.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-0 rounded-full border-4 border-gray-200"}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-0 rounded-full border-4 border-transparent border-t-[#233CFA] animate-spin"}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-2 rounded-full border-2 border-transparent border-b-[#5a6eff] animate-reverse-spin"})]}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 text-center",children:n.jsx("p",{className:"jsx-1cf8b692071f6c24 text-lg font-medium text-gray-800 mb-1",children:"Loading..."})}),n.jsx("div",{className:"jsx-1cf8b692071f6c24 w-64 h-1 bg-gray-200 rounded-full mt-4 overflow-hidden",children:n.jsx("div",{className:"jsx-1cf8b692071f6c24 h-full bg-gradient-to-r from-[#233CFA] to-[#5a6eff] rounded-full animate-progress"})})]}),n.jsx(f(),{id:"1cf8b692071f6c24",children:"@-webkit-keyframes reverse-spin{from{-webkit-transform:rotate(360deg);transform:rotate(360deg)}to{-webkit-transform:rotate(0deg);transform:rotate(0deg)}}@-moz-keyframes reverse-spin{from{-moz-transform:rotate(360deg);transform:rotate(360deg)}to{-moz-transform:rotate(0deg);transform:rotate(0deg)}}@-o-keyframes reverse-spin{from{-o-transform:rotate(360deg);transform:rotate(360deg)}to{-o-transform:rotate(0deg);transform:rotate(0deg)}}@keyframes reverse-spin{from{-webkit-transform:rotate(360deg);-moz-transform:rotate(360deg);-o-transform:rotate(360deg);transform:rotate(360deg)}to{-webkit-transform:rotate(0deg);-moz-transform:rotate(0deg);-o-transform:rotate(0deg);transform:rotate(0deg)}}@-webkit-keyframes progress{0%{-webkit-transform:translatex(-100%);transform:translatex(-100%)}100%{-webkit-transform:translatex(100%);transform:translatex(100%)}}@-moz-keyframes progress{0%{-moz-transform:translatex(-100%);transform:translatex(-100%)}100%{-moz-transform:translatex(100%);transform:translatex(100%)}}@-o-keyframes progress{0%{-o-transform:translatex(-100%);transform:translatex(-100%)}100%{-o-transform:translatex(100%);transform:translatex(100%)}}@keyframes progress{0%{-webkit-transform:translatex(-100%);-moz-transform:translatex(-100%);-o-transform:translatex(-100%);transform:translatex(-100%)}100%{-webkit-transform:translatex(100%);-moz-transform:translatex(100%);-o-transform:translatex(100%);transform:translatex(100%)}}.animate-reverse-spin.jsx-1cf8b692071f6c24{-webkit-animation:reverse-spin 1s linear infinite;-moz-animation:reverse-spin 1s linear infinite;-o-animation:reverse-spin 1s linear infinite;animation:reverse-spin 1s linear infinite}.animate-progress.jsx-1cf8b692071f6c24{-webkit-animation:progress 2s ease-in-out infinite;-moz-animation:progress 2s ease-in-out infinite;-o-animation:progress 2s ease-in-out infinite;animation:progress 2s ease-in-out infinite}"})]}):null},m=function({Component:e,pageProps:{session:t,...r}}){let o=function(){let[e,t]=(0,s.useState)(!1);return e}();return(0,l.useRouter)(),(0,n.jsxs)(s.Fragment,{children:[(0,n.jsxs)(i(),{children:[n.jsx("meta",{charSet:"utf-8"}),n.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),n.jsx("meta",{name:"theme-color",content:"#ffffff"}),n.jsx("meta",{httpEquiv:"Cache-Control",content:"no-cache, no-store, must-revalidate"}),n.jsx("meta",{httpEquiv:"Pragma",content:"no-cache"}),n.jsx("meta",{httpEquiv:"Expires",content:"0"}),n.jsx("link",{rel:"icon",href:"/favicon.ico"})]}),n.jsx(d.default,{}),n.jsx(u,{}),n.jsx(a.SessionProvider,{session:t,children:o?n.jsx(e,{...r}):n.jsx("div",{className:"min-h-screen bg-white flex items-center justify-center",children:(0,n.jsxs)("div",{className:"text-center",children:[n.jsx("div",{className:"animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4",style:{borderColor:"#233CFA"}}),n.jsx("p",{className:"text-gray-500 text-sm",children:"Loading..."})]})})})]})}},65949:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>a});var n=r(20997),s=r(56859);function a(){return(0,n.jsxs)(s.Html,{lang:"en",children:[(0,n.jsxs)(s.Head,{children:[n.jsx("meta",{charSet:"utf-8"}),n.jsx("meta",{property:"og:site_name",content:"KstarPick - K-Pop News Portal"}),n.jsx("meta",{property:"og:type",content:"website"}),n.jsx("meta",{property:"og:locale",content:"en_US"}),n.jsx("meta",{property:"og:locale:alternate",content:"ko_KR"}),n.jsx("meta",{name:"twitter:card",content:"summary_large_image"}),n.jsx("meta",{name:"robots",content:"index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"}),n.jsx("meta",{name:"googlebot",content:"index, follow"}),n.jsx("meta",{name:"NaverBot",content:"All"}),n.jsx("meta",{name:"Yeti",content:"All"}),n.jsx("meta",{name:"DaumBot",content:"All"}),n.jsx("meta",{name:"google-site-verification",content:"kstarpick-google-verification"}),n.jsx("meta",{name:"naver-site-verification",content:"kstarpick-naver-verification"}),n.jsx("meta",{name:"msvalidate.01",content:"kstarpick-bing-verification"}),n.jsx("meta",{name:"application-name",content:"KstarPick"}),n.jsx("meta",{name:"apple-mobile-web-app-title",content:"KstarPick"}),n.jsx("meta",{name:"theme-color",content:"#8B5CF6"}),n.jsx("meta",{name:"apple-mobile-web-app-status-bar-style",content:"default"}),n.jsx("meta",{name:"apple-mobile-web-app-capable",content:"yes"}),n.jsx("meta",{name:"mobile-web-app-capable",content:"yes"}),n.jsx("meta",{name:"msapplication-TileColor",content:"#ffffff"}),n.jsx("meta",{name:"msapplication-navbutton-color",content:"#ffffff"}),n.jsx("link",{rel:"icon",type:"image/png",href:"/images/icons8-popular-3d-fluency-32.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"16x16",href:"/images/icons8-popular-3d-fluency-16.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"32x32",href:"/images/icons8-popular-3d-fluency-32.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"48x48",href:"/images/icons8-popular-3d-fluency-32.png"}),n.jsx("link",{rel:"apple-touch-icon",sizes:"180x180",href:"/images/icons8-popular-3d-fluency-96.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"192x192",href:"/images/icons8-popular-3d-fluency-96.png"}),n.jsx("link",{rel:"icon",type:"image/png",sizes:"512x512",href:"/images/icons8-popular-3d-fluency-96.png"}),n.jsx("link",{rel:"manifest",href:"/site.webmanifest"}),n.jsx("script",{dangerouslySetInnerHTML:{__html:`
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
            `}})]}),(0,n.jsxs)("body",{children:[n.jsx(s.Main,{}),n.jsx(s.NextScript,{})]})]})}},86764:()=>{},35244:(e,t)=>{"use strict";var r;Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"RouteKind",{enumerable:!0,get:function(){return r}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(r||(r={}))},98039:(e,t,r)=>{"use strict";e.exports=r(87093).vendored.contexts.AmpContext},41649:e=>{"use strict";e.exports=require("next-auth/react")},62785:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/pages.runtime.prod.js")},40968:e=>{"use strict";e.exports=require("next/head")},16689:e=>{"use strict";e.exports=require("react")},66405:e=>{"use strict";e.exports=require("react-dom")},20997:e=>{"use strict";e.exports=require("react/jsx-runtime")},99816:e=>{"use strict";e.exports=require("styled-jsx/style")},92048:e=>{"use strict";e.exports=require("fs")},55315:e=>{"use strict";e.exports=require("path")},76162:e=>{"use strict";e.exports=require("stream")},71568:e=>{"use strict";e.exports=require("zlib")}};var t=require("../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[3393,1859,6859],()=>r(78826));module.exports=n})();