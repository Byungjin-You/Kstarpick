// SEO 헬퍼 함수들

// Basic website information
export const SITE_CONFIG = {
  name: 'KstarPick',
  fullName: 'KstarPick - K-Pop News Portal',
  url: 'https://kstarpick.com',
  description: 'Your ultimate source for K-Pop news, Korean drama updates, and entertainment. Get the latest on BTS, BLACKPINK, aespa, NewJeans, IVE, and more Korean celebrities. Breaking news, exclusive content, and trending stories from the Korean entertainment industry.',
  descriptionKo: 'K-Pop, 한류, 드라마, TV/영화 소식을 한 곳에서 만나보세요. 최신 K-Pop 뉴스, BTS, 블랙핑크, 에스파 등 아이돌 소식과 한국 드라마 정보를 실시간으로 제공합니다.',
  logo: 'https://kstarpick.com/images/logo.png',
  socialMedia: {
    twitter: '@kstarpick',
    facebook: 'https://facebook.com/kstarpick',
    instagram: 'https://instagram.com/kstarpick'
  }
};

// 뉴스 아티클용 JSON-LD 생성
export function generateNewsArticleJsonLd(article) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "description": article.description || article.content?.substring(0, 200),
    "image": article.featuredImage || `${SITE_CONFIG.url}/images/og-image.jpg`,
    "datePublished": article.createdAt,
    "dateModified": article.updatedAt || article.createdAt,
    "author": {
      "@type": "Person",
      "name": article.author || SITE_CONFIG.name
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_CONFIG.fullName,
      "url": SITE_CONFIG.url,
      "logo": {
        "@type": "ImageObject",
        "url": SITE_CONFIG.logo
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_CONFIG.url}/news/${article._id}`
    },
    "articleSection": article.category || "K-Pop News",
    "keywords": [
      "K-Pop",
      "케이팝",
      "한류",
      article.category,
      ...(article.tags || [])
    ].filter(Boolean).join(", ")
  };
}

// 드라마/TV 프로그램용 JSON-LD 생성
export function generateTVSeriesJsonLd(drama) {
  if (!drama) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": drama.title,
    "alternateName": drama.originalTitle || drama.englishTitle,
    "description": drama.summary || drama.synopsis,
    "image": drama.coverImage || drama.posterImage,
    "url": `${SITE_CONFIG.url}/drama/${drama._id}`,
    "datePublished": drama.releaseDate || drama.firstAirDate,
    "startDate": drama.startDate,
    "endDate": drama.endDate,
    "numberOfEpisodes": drama.episodes,
    "numberOfSeasons": drama.seasons || 1,
    "inLanguage": "ko",
    "countryOfOrigin": {
      "@type": "Country",
      "name": "South Korea"
    },
    "genre": Array.isArray(drama.genres) ? drama.genres : (drama.genre ? drama.genre.split(',').map(g => g.trim()) : ["Drama"]),
    "director": drama.directors ? drama.directors.map(director => ({
      "@type": "Person",
      "name": director.name || director
    })) : undefined,
    "actor": drama.cast ? drama.cast.map(actor => ({
      "@type": "Person",
      "name": actor.name || actor.actorName || actor,
      "characterName": actor.character || actor.characterName
    })) : undefined,
    "productionCompany": drama.productionCompany ? {
      "@type": "Organization",
      "name": drama.productionCompany
    } : undefined,
    "broadcaster": drama.network ? {
      "@type": "Organization",
      "name": drama.network
    } : undefined,
    "aggregateRating": drama.rating || drama.reviewRating ? {
      "@type": "AggregateRating",
      "ratingValue": drama.rating || drama.reviewRating,
      "bestRating": "10",
      "worstRating": "1",
      "reviewCount": drama.reviewCount || 1
    } : undefined,
    "review": drama.reviews ? drama.reviews.slice(0, 5).map(review => ({
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating || 4,
        "bestRating": "5"
      },
      "author": {
        "@type": "Person",
        "name": review.author || "KstarPick User"
      },
      "reviewBody": review.content || review.comment
    })) : undefined
  };

  // 방송 정보가 있는 경우
  if (drama.broadcastInfo) {
    jsonLd.numberOfEpisodes = drama.broadcastInfo.totalEpisodes;
    jsonLd.startDate = drama.broadcastInfo.startDate;
    jsonLd.endDate = drama.broadcastInfo.endDate;
  }

  // 출연진 정보가 있는 경우
  if (drama.cast && drama.cast.length > 0) {
    jsonLd.actor = drama.cast.map(actor => ({
      "@type": "Person",
      "name": actor.name,
      "image": actor.profileImage
    }));
  }

  // 제작진 정보가 있는 경우
  if (drama.directors && drama.directors.length > 0) {
    jsonLd.director = drama.directors.map(director => ({
      "@type": "Person",
      "name": director.name
    }));
  }

  // 평점 정보가 있는 경우
  if (drama.rating) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": drama.rating.average,
      "ratingCount": drama.rating.count,
      "bestRating": 10,
      "worstRating": 1
    };
  }

  return jsonLd;
}

// 영화용 JSON-LD 생성
export function generateMovieJsonLd(movie) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": movie.title,
    "description": movie.summary,
    "image": movie.coverImage || movie.bannerImage,
    "dateCreated": movie.createdAt,
    "url": `${SITE_CONFIG.url}/tvfilm/${movie._id}`,
    "genre": movie.genres || ["Drama", "Film"],
    "inLanguage": "ko-KR",
    "countryOfOrigin": {
      "@type": "Country",
      "name": "South Korea"
    }
  };

  // 개봉일이 있는 경우
  if (movie.releaseDate) {
    jsonLd.datePublished = movie.releaseDate;
  }

  // 러닝타임이 있는 경우
  if (movie.duration) {
    jsonLd.duration = `PT${movie.duration}M`;
  }

  // 출연진 정보
  if (movie.cast && movie.cast.length > 0) {
    jsonLd.actor = movie.cast.map(actor => ({
      "@type": "Person",
      "name": actor.name,
      "image": actor.profileImage
    }));
  }

  // 감독 정보
  if (movie.directors && movie.directors.length > 0) {
    jsonLd.director = movie.directors.map(director => ({
      "@type": "Person",
      "name": director.name
    }));
  }

  // 평점 정보
  if (movie.rating) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": movie.rating.average,
      "ratingCount": movie.rating.count,
      "bestRating": 10,
      "worstRating": 1
    };
  }

  return jsonLd;
}

// 연예인/인물용 JSON-LD 생성
export function generatePersonJsonLd(celebrity) {
  if (!celebrity) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": celebrity.name,
    "alternateName": celebrity.alternateName || celebrity.englishName,
    "description": celebrity.biography || `${celebrity.name} is a popular Korean celebrity known for their work in K-Pop and Korean entertainment.`,
    "image": celebrity.profileImage || celebrity.image,
    "url": `${SITE_CONFIG.url}/celeb/${celebrity.slug || celebrity._id}`,
    "sameAs": [
      celebrity.instagramUrl,
      celebrity.twitterUrl,
      celebrity.youtubeUrl,
      celebrity.tiktokUrl,
      celebrity.officialWebsite
    ].filter(Boolean),
    "birthDate": celebrity.birthDate,
    "birthPlace": celebrity.birthPlace,
    "nationality": celebrity.nationality || "South Korean",
    "gender": celebrity.gender,
    "height": celebrity.height,
    "weight": celebrity.weight,
    "jobTitle": celebrity.occupation || celebrity.role || "Korean Celebrity",
    "worksFor": celebrity.agency ? {
      "@type": "Organization",
      "name": celebrity.agency,
      "url": celebrity.agencyUrl
    } : undefined,
    "memberOf": celebrity.group ? {
      "@type": "MusicGroup",
      "name": celebrity.group,
      "genre": "K-Pop"
    } : undefined,
    "knowsAbout": [
      "K-Pop Music",
      "Korean Entertainment",
      "Korean Drama",
      "Korean Culture"
    ],
    "award": celebrity.awards ? celebrity.awards.map(award => ({
      "@type": "Award",
      "name": award.name,
      "dateReceived": award.date
    })) : undefined,
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionType": { "@type": "http://schema.org/FollowAction" },
        "name": "Instagram Followers",
        "userInteractionCount": celebrity.instagramFollowers || 0
      },
      {
        "@type": "InteractionCounter",
        "interactionType": { "@type": "http://schema.org/FollowAction" },
        "name": "Twitter Followers", 
        "userInteractionCount": celebrity.twitterFollowers || 0
      },
      {
        "@type": "InteractionCounter",
        "interactionType": { "@type": "http://schema.org/SubscribeAction" },
        "name": "YouTube Subscribers",
        "userInteractionCount": celebrity.youtubeSubscribers || 0
      }
    ].filter(stat => stat.userInteractionCount > 0)
  };
}

// 조직/그룹용 JSON-LD 생성 (K-Pop 그룹 등)
export function generateMusicGroupJsonLd(group) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "name": group.name,
    "description": group.description,
    "image": group.profileImage,
    "url": `${SITE_CONFIG.url}/celeb/${group.slug || group._id}`,
    "genre": ["K-Pop", "Pop", ...(group.genres || [])],
    "foundingDate": group.debutDate,
    "member": group.members?.map(member => ({
      "@type": "Person",
      "name": member.name,
      "image": member.profileImage
    })) || [],
    "sameAs": [
      group.instagramUrl,
      group.twitterUrl,
      group.youtubeUrl,
      group.tiktokUrl,
      group.spotifyUrl
    ].filter(Boolean)
  };
}

// 사이트 리뷰 JSON-LD 생성 (전체 사이트에 대한 리뷰)
export function generateSiteReviewJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_CONFIG.fullName,
    "url": SITE_CONFIG.url,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "2847",
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": [
      {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "author": {
          "@type": "Person",
          "name": "K-Pop Enthusiast"
        },
        "reviewBody": "Best source for K-Pop news and Korean entertainment updates. Always first with breaking news!"
      },
      {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "author": {
          "@type": "Person",
          "name": "Drama Lover"
        },
        "reviewBody": "Excellent coverage of Korean dramas and celebrity news. Very reliable and up-to-date information."
      }
    ]
  };
}

// FAQ JSON-LD 생성
export function generateFAQJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is KstarPick?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "KstarPick is your ultimate source for K-Pop news, Korean drama updates, and Korean entertainment content. We provide the latest updates on BTS, BLACKPINK, aespa, NewJeans, IVE, and other Korean celebrities."
        }
      },
      {
        "@type": "Question",
        "name": "How often is KstarPick updated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "KstarPick is updated daily with the latest K-Pop news, Korean drama reviews, and celebrity updates. We ensure you get breaking news as soon as it happens."
        }
      },
      {
        "@type": "Question",
        "name": "What type of content does KstarPick cover?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We cover K-Pop music, Korean dramas, Korean movies and TV shows, celebrity news, entertainment industry updates, concert information, and trending Korean culture topics."
        }
      },
      {
        "@type": "Question",
        "name": "Is KstarPick content available in English?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, KstarPick provides content in English to serve our global K-Pop and Korean entertainment fans worldwide."
        }
      }
    ]
  };
}

// 비디오 JSON-LD 생성 (유튜브 컨텐츠용)
export function generateVideoJsonLd(videoData) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": videoData.title,
    "description": videoData.description,
    "thumbnailUrl": videoData.thumbnail,
    "uploadDate": videoData.publishedAt,
    "duration": videoData.duration,
    "embedUrl": `https://www.youtube.com/embed/${videoData.videoId}`,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "http://schema.org/WatchAction" },
      "userInteractionCount": videoData.viewCount
    },
    "author": {
      "@type": "Organization",
      "name": videoData.channelTitle
    }
  };
}

// 검색 결과 페이지 JSON-LD 개선
export function generateSearchResultsJsonLd(query, results) {
  return {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": results.length,
      "itemListElement": results.map((result, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "WebPage",
          "name": result.title,
          "url": `${SITE_CONFIG.url}${result.url}`,
          "description": result.description
        }
      }))
    },
    "about": {
      "@type": "Thing",
      "name": query
    }
  };
}

// SEO 메타 태그 생성 헬퍼
export function generateMetaTags({
  title,
  description,
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  tags = [],
  author,
  category
}) {
  const fullTitle = title ? `${title} | ${SITE_CONFIG.name}` : SITE_CONFIG.fullName;
  const fullDescription = description || SITE_CONFIG.description;
  const fullImage = image || `${SITE_CONFIG.url}/images/og-image.jpg`;
  const fullUrl = url ? `${SITE_CONFIG.url}${url}` : SITE_CONFIG.url;

  return {
    title: fullTitle,
    description: fullDescription,
    image: fullImage,
    url: fullUrl,
    type,
    publishedTime,
    modifiedTime,
    tags,
    author,
    category
  };
}

// 키워드 생성 헬퍼
export function generateKeywords(baseKeywords = [], additionalKeywords = []) {
  const defaultKeywords = [
    'K-Pop', '케이팝', '한류', 'Korean Wave', 'Hallyu',
    'BTS', '블랙핑크', 'BLACKPINK', '에스파', 'aespa',
    '뉴진스', 'NewJeans', '아이브', 'IVE', '(여자)아이들', 'GIDLE',
    '스트레이 키즈', 'Stray Kids', '세븐틴', 'SEVENTEEN',
    '트와이스', 'TWICE', '레드벨벳', 'Red Velvet',
    '한국 드라마', 'K-Drama', 'Korean Drama',
    '한국 영화', 'Korean Movie', 'K-Movie'
  ];

  return [...new Set([...defaultKeywords, ...baseKeywords, ...additionalKeywords])];
}

// 기본 웹사이트 JSON-LD 생성 (구글 검색 결과에서 구조화된 정보 표시용)
export function generateWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_CONFIG.url}/#website`,
        "url": SITE_CONFIG.url,
        "name": SITE_CONFIG.fullName,
        "description": SITE_CONFIG.description,
        "publisher": {
          "@id": `${SITE_CONFIG.url}/#organization`
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${SITE_CONFIG.url}/search?q={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          }
        ],
        "inLanguage": "en-US"
      },
      {
        "@type": "Organization",
        "@id": `${SITE_CONFIG.url}/#organization`,
        "name": SITE_CONFIG.name,
        "alternateName": SITE_CONFIG.fullName,
        "url": SITE_CONFIG.url,
        "logo": {
          "@type": "ImageObject",
          "inLanguage": "en-US",
          "@id": `${SITE_CONFIG.url}/#/schema/logo/image/`,
          "url": SITE_CONFIG.logo,
          "contentUrl": SITE_CONFIG.logo,
          "width": 512,
          "height": 512,
          "caption": SITE_CONFIG.name
        },
        "image": {
          "@id": `${SITE_CONFIG.url}/#/schema/logo/image/`
        },
        "description": SITE_CONFIG.description,
        "foundingDate": "2024",
        "sameAs": [
          SITE_CONFIG.socialMedia.facebook,
          SITE_CONFIG.socialMedia.instagram,
          `https://twitter.com${SITE_CONFIG.socialMedia.twitter.replace('@', '/')}`
        ].filter(Boolean),
        "areaServed": [
          {
            "@type": "Country",
            "name": "United States"
          },
          {
            "@type": "Country", 
            "name": "South Korea"
          },
          {
            "@type": "Country",
            "name": "United Kingdom"
          },
          {
            "@type": "Country",
            "name": "Canada"
          },
          {
            "@type": "Country",
            "name": "Australia"
          },
          {
            "@type": "Country",
            "name": "Japan"
          }
        ],
        "knowsAbout": [
          "K-Pop",
          "Korean Pop Music",
          "Korean Wave",
          "Hallyu",
          "K-Drama", 
          "Korean Drama",
          "Korean Entertainment",
          "BTS",
          "BLACKPINK",
          "aespa",
          "NewJeans",
          "IVE",
          "Stray Kids",
          "TWICE",
          "Red Velvet",
          "SEVENTEEN",
          "ITZY",
          "GIDLE",
          "LE SSERAFIM"
        ]
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_CONFIG.url}/#webpage`,
        "url": SITE_CONFIG.url,
        "name": `${SITE_CONFIG.fullName} - Home`,
        "isPartOf": {
          "@id": `${SITE_CONFIG.url}/#website`
        },
        "about": {
          "@id": `${SITE_CONFIG.url}/#organization`
        },
        "description": SITE_CONFIG.description,
        "breadcrumb": {
          "@id": `${SITE_CONFIG.url}/#breadcrumb`
        },
        "inLanguage": "en-US",
        "potentialAction": [
          {
            "@type": "ReadAction",
            "target": [SITE_CONFIG.url]
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_CONFIG.url}/#breadcrumb`,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": SITE_CONFIG.url
          }
        ]
      },
      {
        "@type": "CollectionPage",
        "@id": `${SITE_CONFIG.url}/drama#collectionpage`,
        "url": `${SITE_CONFIG.url}/drama`,
        "name": "Korean Drama | KstarPick",
        "description": "Discover the latest Korean drama news, reviews, cast updates, and everything K-Drama. Your ultimate guide to Korean television series.",
        "isPartOf": {
          "@id": `${SITE_CONFIG.url}/#website`
        },
        "about": {
          "@type": "Thing",
          "name": "K-Drama",
          "description": "Korean Drama"
        }
      },
      {
        "@type": "CollectionPage", 
        "@id": `${SITE_CONFIG.url}/music#collectionpage`,
        "url": `${SITE_CONFIG.url}/music`,
        "name": "K-Pop Music | KstarPick", 
        "description": "Get the latest K-Pop news, music charts, and idol updates in real-time. Follow BTS, BLACKPINK, aespa, and more popular Korean artists.",
        "isPartOf": {
          "@id": `${SITE_CONFIG.url}/#website`
        },
        "about": {
          "@type": "Thing",
          "name": "K-Pop",
          "description": "Korean Pop Music"
        }
      },
      {
        "@type": "CollectionPage",
        "@id": `${SITE_CONFIG.url}/celeb#collectionpage`, 
        "url": `${SITE_CONFIG.url}/celeb`,
        "name": "Korean Celebrities | KstarPick",
        "description": "Explore profiles and latest news of Korean celebrities, K-Pop idols, actors, and entertainers. Stay updated with your favorite Korean stars.",
        "isPartOf": {
          "@id": `${SITE_CONFIG.url}/#website`
        },
        "about": {
          "@type": "Thing", 
          "name": "Korean Celebrities",
          "description": "Korean Celebrities"
        }
      },
      {
        "@type": "CollectionPage",
        "@id": `${SITE_CONFIG.url}/tvfilm#collectionpage`,
        "url": `${SITE_CONFIG.url}/tvfilm`, 
        "name": "Korean Movies & TV | KstarPick",
        "description": "Discover Korean movies, TV shows, and entertainment programs with reviews and latest updates. Your guide to Korean cinema and television.",
        "isPartOf": {
          "@id": `${SITE_CONFIG.url}/#website`
        },
        "about": {
          "@type": "Thing",
          "name": "Korean Movies and TV",
          "description": "Korean Movies and Television"
        }
      }
    ]
  };
}

// 메인 페이지용 간단한 구조화 데이터 생성 (임시 버전)
export function generateHomePageJsonLd(newsArticles = [], featuredArticles = [], topSongs = []) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_CONFIG.fullName,
    "alternateName": SITE_CONFIG.name,
    "description": SITE_CONFIG.description,
    "url": SITE_CONFIG.url,
    "inLanguage": "en-US",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint", 
        "urlTemplate": `${SITE_CONFIG.url}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": SITE_CONFIG.name,
      "url": SITE_CONFIG.url,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_CONFIG.url}/logo.png`
      }
    }
  };
}

// 음악 앨범/노래 JSON-LD 생성
export function generateMusicJsonLd(music) {
  if (!music) return null;

  const isAlbum = music.type === 'album' || music.tracks;
  
  return {
    "@context": "https://schema.org",
    "@type": isAlbum ? "MusicAlbum" : "MusicRecording",
    "name": music.title,
    "alternateName": music.englishTitle,
    "description": music.description || `${music.title} by ${music.artist} - Latest K-Pop release`,
    "image": music.coverImage || music.albumArt,
    "url": `${SITE_CONFIG.url}/music/${music._id}`,
    "datePublished": music.releaseDate,
    "inLanguage": music.language || "ko",
    "genre": "K-Pop",
    "byArtist": {
      "@type": "MusicGroup",
      "name": music.artist,
      "genre": "K-Pop"
    },
    "recordLabel": music.label ? {
      "@type": "Organization",
      "name": music.label
    } : undefined,
    "duration": music.duration,
    "track": isAlbum && music.tracks ? music.tracks.map((track, index) => ({
      "@type": "MusicRecording",
      "name": track.title || track.name,
      "position": index + 1,
      "duration": track.duration
    })) : undefined,
    "aggregateRating": music.rating ? {
      "@type": "AggregateRating",
      "ratingValue": music.rating,
      "bestRating": "5",
      "reviewCount": music.reviewCount || 1
    } : undefined
  };
} 