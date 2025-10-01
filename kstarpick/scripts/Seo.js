import React from 'react';
import Head from 'next/head';

const Seo = ({ 
  title, 
  description, 
  image, 
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  tags = [],
  author,
  category,
  jsonLd
}) => {
  const siteTitle = 'KstarPick';
  const siteName = 'KstarPick - K-Pop News Portal';
  const defaultDescription = 'Your ultimate source for K-Pop news, Korean drama updates, and entertainment. Get the latest on BTS, BLACKPINK, aespa, NewJeans, IVE, and more Korean celebrities. Breaking news, exclusive content, and trending stories from the Korean entertainment industry.';
  const defaultImage = 'https://kstarpick.com/images/og-image.jpg';
  const baseUrl = 'https://kstarpick.com';

  const fullTitle = title ? `${title} | ${siteTitle}` : siteName;
  const fullDescription = description || defaultDescription;
  const fullImage = image || defaultImage;
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;

  // 기본 JSON-LD 구조화 데이터
  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteName,
    "url": baseUrl,
    "description": defaultDescription,
    "publisher": {
      "@type": "Organization",
      "name": siteTitle,
      "url": baseUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/images/logo.png`
      }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Head>
      {/* 기본 메타 태그 */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={`K-Pop, Korean Pop, Korean Wave, Hallyu, K-Drama, BTS, BLACKPINK, aespa, NewJeans, IVE, Korean Entertainment, ${tags.join(', ')}`} />
      <meta name="author" content={author || siteTitle} />
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      
      {/* Language and region */}
      <meta name="language" content="English" />
      <meta httpEquiv="content-language" content="en-US" />
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph 태그 */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title || siteName} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="ko_KR" />
      
      {/* 발행 및 수정 시간 (아티클인 경우) */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}
      {category && <meta property="article:section" content={category} />}
      {tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter 카드 */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@kstarpick" />
      <meta name="twitter:creator" content="@kstarpick" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={title || siteName} />
      
      {/* 네이버, 다음 등 국내 검색엔진 */}
      <meta name="google-site-verification" content="GLcV-E0KxfaX_SMTaerv3jMkzSvS2rsp4g0RzX0y0yo" />
      <meta name="naver-site-verification" content="0eb12308bf6cbf90b0cdc88b71876d55" />
      <meta name="NaverBot" content="All" />
      <meta name="Yeti" content="All" />
      <meta name="DaumBot" content="All" />
      
      {/* 모바일 최적화 */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#ffffff" />
      
      {/* 파비콘 및 아이콘 */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* DNS 프리펫치 */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//www.google-analytics.com" />
      <link rel="dns-prefetch" href="//connect.facebook.net" />
      
      {/* JSON-LD 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd || defaultJsonLd)
        }}
      />
      
      {/* 추가 SEO 개선 */}
      <meta name="application-name" content={siteTitle} />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      
      {/* RSS 피드 */}
      <link rel="alternate" type="application/rss+xml" title={`${siteName} RSS Feed`} href="/rss.xml" />
      
      {/* 프리로드 중요한 리소스 */}
      {/* Google Fonts를 사용하므로 로컬 폰트 preload 제거 */}
    </Head>
  );
};

export default Seo; 