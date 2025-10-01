import Script from 'next/script';

const Analytics = () => {
  const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

  if (!GA_TRACKING_ID) return null;

  return (
    <>
      {/* Google Analytics */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_TRACKING_ID}', {
            page_title: document.title,
            page_location: window.location.href,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>

      {/* Google Tag Manager (옵션) */}
      {GTM_ID && (
        <>
          <Script id="google-tag-manager" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {/* Google Search Console 검증 (환경변수로 설정) */}
      {process.env.NEXT_PUBLIC_GSC_VERIFICATION && (
        <meta 
          name="google-site-verification" 
          content={process.env.NEXT_PUBLIC_GSC_VERIFICATION} 
        />
      )}

      {/* 네이버 웹마스터 도구 검증 */}
      {process.env.NEXT_PUBLIC_NAVER_VERIFICATION && (
        <meta 
          name="naver-site-verification" 
          content={process.env.NEXT_PUBLIC_NAVER_VERIFICATION} 
        />
      )}

      {/* 다음/카카오 검색등록 */}
      {process.env.NEXT_PUBLIC_DAUM_VERIFICATION && (
        <meta 
          name="daumsite" 
          content={process.env.NEXT_PUBLIC_DAUM_VERIFICATION} 
        />
      )}

      {/* 빙 웹마스터 도구 */}
      {process.env.NEXT_PUBLIC_BING_VERIFICATION && (
        <meta 
          name="msvalidate.01" 
          content={process.env.NEXT_PUBLIC_BING_VERIFICATION} 
        />
      )}

      {/* 성능 모니터링 */}
      <Script id="web-vitals" strategy="afterInteractive">
        {`
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
        `}
      </Script>
    </>
  );
};

export default Analytics; 