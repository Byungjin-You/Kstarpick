import Head from 'next/head';

export default function StructuredData({ type = 'website', data = {} }) {
  // 기본 웹사이트 구조화 데이터
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "KstarPick",
    "alternateName": ["K-Star Pick", "케이스타픽"],
    "url": "https://www.kstarpick.com",
    "description": "Latest K-Pop, K-Drama, Korean Entertainment News, Celeb Profiles & Reviews",
    "publisher": {
      "@type": "Organization",
      "name": "KstarPick",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.kstarpick.com/logo.png"
      }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://www.kstarpick.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "sameAs": [
      "https://www.facebook.com/kstarpick",
      "https://twitter.com/kstarpick",
      "https://www.instagram.com/kstarpick",
      "https://www.youtube.com/kstarpick"
    ]
  };

  // 사이트 네비게이션 구조화 데이터 (사이트링크를 위한 핵심)
  const siteNavigationSchema = {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    "name": "Main Navigation",
    "hasPart": [
      {
        "@type": "SiteNavigationElement",
        "name": "Drama",
        "url": "https://www.kstarpick.com/drama",
        "position": 1
      },
      {
        "@type": "SiteNavigationElement", 
        "name": "TV/Film",
        "url": "https://www.kstarpick.com/tvfilm",
        "position": 2
      },
      {
        "@type": "SiteNavigationElement",
        "name": "Music",
        "url": "https://www.kstarpick.com/music",
        "position": 3
      },
      {
        "@type": "SiteNavigationElement",
        "name": "Celeb",
        "url": "https://www.kstarpick.com/celeb",
        "position": 4
      },
      {
        "@type": "SiteNavigationElement",
        "name": "Ranking",
        "url": "https://www.kstarpick.com/ranking",
        "position": 5
      }
    ]
  };

  // 조직 구조화 데이터
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "KstarPick",
    "url": "https://www.kstarpick.com",
    "logo": "https://www.kstarpick.com/logo.png",
    "description": "Your ultimate source for K-Pop news, K-Drama updates, and Korean entertainment",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "KR"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": "contact@kstarpick.com",
      "availableLanguage": ["English", "Korean"]
    }
  };

  // 뉴스 기사 구조화 데이터
  const articleSchema = type === 'article' ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": data.title,
    "description": data.description,
    "image": data.image || "https://www.kstarpick.com/default-news.jpg",
    "datePublished": data.publishedDate,
    "dateModified": data.modifiedDate || data.publishedDate,
    "author": {
      "@type": "Person",
      "name": data.author || "KstarPick Editorial Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "KstarPick",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.kstarpick.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": data.url
    }
  } : null;

  // TV/Film 구조화 데이터
  const tvShowSchema = type === 'tvshow' ? {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": data.title,
    "description": data.description,
    "image": data.image,
    "datePublished": data.releaseDate,
    "genre": data.genres,
    "actor": data.cast?.map(actor => ({
      "@type": "Person",
      "name": actor.name
    })),
    "director": data.directors?.map(director => ({
      "@type": "Person", 
      "name": director.name
    })),
    "aggregateRating": data.rating ? {
      "@type": "AggregateRating",
      "ratingValue": data.rating,
      "bestRating": "10",
      "ratingCount": data.ratingCount
    } : undefined
  } : null;

  // BreadcrumbList 구조화 데이터
  const breadcrumbSchema = data.breadcrumbs ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": data.breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  } : null;

  const schemas = [
    websiteSchema,
    siteNavigationSchema,
    organizationSchema,
    articleSchema,
    tvShowSchema,
    breadcrumbSchema
  ].filter(Boolean);

  return (
    <Head>
      {schemas.map((schema, index) => (
        <script
          key={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Head>
  );
}