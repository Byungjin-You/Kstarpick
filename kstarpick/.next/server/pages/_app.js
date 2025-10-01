(()=>{var e={};e.id=2888,e.ids=[2888],e.modules={93677:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>o});var s=r(20997),n=r(4298),a=r.n(n);let o=()=>{let e="G-S3VJ3Q8WM9",t=process.env.NEXT_PUBLIC_GTM_ID;return e?(0,s.jsxs)(s.Fragment,{children:[s.jsx(a(),{src:`https://www.googletagmanager.com/gtag/js?id=${e}`,strategy:"afterInteractive"}),s.jsx(a(),{id:"google-analytics",strategy:"afterInteractive",children:`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${e}', {
            page_title: document.title,
            page_location: window.location.href,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}),t&&(0,s.jsxs)(s.Fragment,{children:[s.jsx(a(),{id:"google-tag-manager",strategy:"afterInteractive",children:`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${t}');
            `}),s.jsx("noscript",{children:s.jsx("iframe",{src:`https://www.googletagmanager.com/ns.html?id=${t}`,height:"0",width:"0",style:{display:"none",visibility:"hidden"}})})]}),process.env.NEXT_PUBLIC_GSC_VERIFICATION&&s.jsx("meta",{name:"google-site-verification",content:process.env.NEXT_PUBLIC_GSC_VERIFICATION}),process.env.NEXT_PUBLIC_NAVER_VERIFICATION&&s.jsx("meta",{name:"naver-site-verification",content:process.env.NEXT_PUBLIC_NAVER_VERIFICATION}),process.env.NEXT_PUBLIC_DAUM_VERIFICATION&&s.jsx("meta",{name:"daumsite",content:process.env.NEXT_PUBLIC_DAUM_VERIFICATION}),process.env.NEXT_PUBLIC_BING_VERIFICATION&&s.jsx("meta",{name:"msvalidate.01",content:process.env.NEXT_PUBLIC_BING_VERIFICATION}),s.jsx(a(),{id:"web-vitals",strategy:"afterInteractive",children:`
          // Core Web Vitals 측정
          function getCLS(onPerfEntry) {
            if ('PerformanceObserver' in window) {
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  if (!entry.hadRecentInput) {
                    console.log('CLS:', entry.value);
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
                  console.log('FID:', entry.processingStart - entry.startTime);
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
                console.log('LCP:', lastEntry.startTime);
                if (onPerfEntry && typeof onPerfEntry === 'function') {
                  onPerfEntry(lastEntry);
                }
              });
              observer.observe({entryTypes: ['largest-contentful-paint']});
            }
          }

          // 측정 시작
          getCLS(console.log);
          getFID(console.log);
          getLCP(console.log);
        `})]}):null}},81928:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>g});var s=r(20997);r(86764);var n=r(16689),a=r(41649),o=r(40968),i=r.n(o),f=r(11163),c=r(93677),l=r(99816),m=r.n(l);let d=()=>{let[e,t]=(0,n.useState)(!1),r=(0,f.useRouter)();return((0,n.useEffect)(()=>{let e=e=>{e!==r.asPath&&t(!0)},s=()=>{t(!1)};return r.events.on("routeChangeStart",e),r.events.on("routeChangeComplete",s),r.events.on("routeChangeError",s),()=>{r.events.off("routeChangeStart",e),r.events.off("routeChangeComplete",s),r.events.off("routeChangeError",s)}},[r]),e)?(0,s.jsxs)("div",{className:"jsx-1cf8b692071f6c24 fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center",children:[(0,s.jsxs)("div",{className:"jsx-1cf8b692071f6c24 flex flex-col items-center",children:[(0,s.jsxs)("div",{className:"jsx-1cf8b692071f6c24 relative w-16 h-16 mb-4",children:[s.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-0 rounded-full border-4 border-gray-200"}),s.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-0 rounded-full border-4 border-transparent border-t-[#ff3e8e] animate-spin"}),s.jsx("div",{className:"jsx-1cf8b692071f6c24 absolute inset-2 rounded-full border-2 border-transparent border-b-[#ff8360] animate-reverse-spin"})]}),(0,s.jsxs)("div",{className:"jsx-1cf8b692071f6c24 text-center",children:[s.jsx("p",{className:"jsx-1cf8b692071f6c24 text-lg font-medium text-gray-800 mb-1",children:"Loading..."}),s.jsx("p",{className:"jsx-1cf8b692071f6c24 text-sm text-gray-500",children:"페이지를 불러오고 있습니다"})]}),s.jsx("div",{className:"jsx-1cf8b692071f6c24 w-64 h-1 bg-gray-200 rounded-full mt-4 overflow-hidden",children:s.jsx("div",{className:"jsx-1cf8b692071f6c24 h-full bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] rounded-full animate-progress"})})]}),s.jsx(m(),{id:"1cf8b692071f6c24",children:"@-webkit-keyframes reverse-spin{from{-webkit-transform:rotate(360deg);transform:rotate(360deg)}to{-webkit-transform:rotate(0deg);transform:rotate(0deg)}}@-moz-keyframes reverse-spin{from{-moz-transform:rotate(360deg);transform:rotate(360deg)}to{-moz-transform:rotate(0deg);transform:rotate(0deg)}}@-o-keyframes reverse-spin{from{-o-transform:rotate(360deg);transform:rotate(360deg)}to{-o-transform:rotate(0deg);transform:rotate(0deg)}}@keyframes reverse-spin{from{-webkit-transform:rotate(360deg);-moz-transform:rotate(360deg);-o-transform:rotate(360deg);transform:rotate(360deg)}to{-webkit-transform:rotate(0deg);-moz-transform:rotate(0deg);-o-transform:rotate(0deg);transform:rotate(0deg)}}@-webkit-keyframes progress{0%{-webkit-transform:translatex(-100%);transform:translatex(-100%)}100%{-webkit-transform:translatex(100%);transform:translatex(100%)}}@-moz-keyframes progress{0%{-moz-transform:translatex(-100%);transform:translatex(-100%)}100%{-moz-transform:translatex(100%);transform:translatex(100%)}}@-o-keyframes progress{0%{-o-transform:translatex(-100%);transform:translatex(-100%)}100%{-o-transform:translatex(100%);transform:translatex(100%)}}@keyframes progress{0%{-webkit-transform:translatex(-100%);-moz-transform:translatex(-100%);-o-transform:translatex(-100%);transform:translatex(-100%)}100%{-webkit-transform:translatex(100%);-moz-transform:translatex(100%);-o-transform:translatex(100%);transform:translatex(100%)}}.animate-reverse-spin.jsx-1cf8b692071f6c24{-webkit-animation:reverse-spin 1s linear infinite;-moz-animation:reverse-spin 1s linear infinite;-o-animation:reverse-spin 1s linear infinite;animation:reverse-spin 1s linear infinite}.animate-progress.jsx-1cf8b692071f6c24{-webkit-animation:progress 2s ease-in-out infinite;-moz-animation:progress 2s ease-in-out infinite;-o-animation:progress 2s ease-in-out infinite;animation:progress 2s ease-in-out infinite}"})]}):null},g=function({Component:e,pageProps:{session:t,...r}}){let o=function(){let[e,t]=(0,n.useState)(!1);return e}();return(0,f.useRouter)(),(0,s.jsxs)(n.Fragment,{children:[(0,s.jsxs)(i(),{children:[s.jsx("meta",{charSet:"utf-8"}),s.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),s.jsx("meta",{name:"theme-color",content:"#ffffff"}),s.jsx("link",{rel:"icon",href:"/favicon.ico"})]}),s.jsx(c.default,{}),s.jsx(d,{}),s.jsx(a.SessionProvider,{session:t,children:o?s.jsx(e,{...r}):s.jsx("div",{className:"min-h-screen bg-white flex items-center justify-center",children:(0,s.jsxs)("div",{className:"text-center",children:[s.jsx("div",{className:"animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"}),s.jsx("p",{className:"text-gray-500 text-sm",children:"콘텐츠 로딩 중..."})]})})})]})}},86764:()=>{},41649:e=>{"use strict";e.exports=require("next-auth/react")},62785:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/pages.runtime.prod.js")},40968:e=>{"use strict";e.exports=require("next/head")},16689:e=>{"use strict";e.exports=require("react")},66405:e=>{"use strict";e.exports=require("react-dom")},20997:e=>{"use strict";e.exports=require("react/jsx-runtime")},99816:e=>{"use strict";e.exports=require("styled-jsx/style")},92048:e=>{"use strict";e.exports=require("fs")},76162:e=>{"use strict";e.exports=require("stream")},71568:e=>{"use strict";e.exports=require("zlib")}};var t=require("../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[3393,1859],()=>r(81928));module.exports=s})();