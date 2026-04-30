import { connectToDatabase } from '../utils/mongodb';

const BASE_URL = 'https://kstarpick.com';

// 이미지 URL 절대화 (sitemap image extension 용)
function absImageUrl(img) {
  if (!img || typeof img !== 'string') return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('/')) return `${BASE_URL}${img}`;
  return `${BASE_URL}/${img}`;
}

// XML 안전 escape
function xmlEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 사이트맵 XML 생성 함수
function generateSiteMap(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map((page) => {
  const imageBlock = (page.images || [])
    .map(img => {
      const loc = absImageUrl(img.loc);
      if (!loc) return '';
      const title = img.title ? `<image:title>${xmlEscape(img.title)}</image:title>` : '';
      const caption = img.caption ? `<image:caption>${xmlEscape(img.caption)}</image:caption>` : '';
      return `<image:image><image:loc>${xmlEscape(loc)}</image:loc>${title}${caption}</image:image>`;
    })
    .filter(Boolean)
    .join('');
  return `<url><loc>${BASE_URL}${page.url}</loc><lastmod>${page.lastmod}</lastmod><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority>${imageBlock}</url>`;
}).join('\n')}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  try {
    const { db } = await connectToDatabase();
    
    // 정적 페이지들
    const staticPages = [
      {
        url: '/',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '1.0'
      },
      {
        url: '/news',
        lastmod: new Date().toISOString(),
        changefreq: 'hourly',
        priority: '0.9'
      },
      {
        url: '/drama',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.9'
      },
      {
        url: '/tvfilm',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.9'
      },
      {
        url: '/music',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.8'
      },
      {
        url: '/celeb',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.8'
      },
      {
        url: '/ranking',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.8'
      },
      {
        url: '/schedule',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.8'
      },
      // 월별 아카이브: 현재월 ±6개월 (Phase 2)
      ...(() => {
        const out = [];
        const now = new Date();
        const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const curY = kstNow.getUTCFullYear();
        const curM = kstNow.getUTCMonth() + 1;
        for (let delta = -6; delta <= 6; delta++) {
          if (delta === 0) continue; // 현재월은 /schedule이 대표
          const d = new Date(curY, curM - 1 + delta, 1);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          out.push({
            url: `/schedule/archive/${y}/${m}`,
            lastmod: new Date().toISOString(),
            changefreq: delta < 0 ? 'monthly' : 'daily',
            priority: delta < 0 ? '0.5' : '0.7'
          });
        }
        return out;
      })(),
      {
        url: '/search',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: '0.7'
      },
      {
        url: '/celeb',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.7'
      },
      {
        url: '/ranking',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.7'
      },
      {
        url: '/search',
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: '0.6'
      },
      {
        url: '/photo',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '0.7'
      },
      {
        url: '/about',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: '0.5'
      },
      {
        url: '/contact',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: '0.5'
      },
      {
        url: '/privacy',
        lastmod: new Date().toISOString(),
        changefreq: 'yearly',
        priority: '0.3'
      },
      {
        url: '/terms',
        lastmod: new Date().toISOString(),
        changefreq: 'yearly',
        priority: '0.3'
      }
    ];

    // 뉴스 페이지들
    const newsCollection = db.collection('news');
    const news = await newsCollection.find({}, {
      projection: { _id: 1, slug: 1, title: 1, createdAt: 1, updatedAt: 1, coverImage: 1, thumbnailUrl: 1 }
    }).sort({ createdAt: -1 }).limit(1000).toArray();

    const newsPages = news.map(item => {
      const img = item.coverImage || item.thumbnailUrl;
      return {
        url: `/news/${item.slug || item._id}`,
        lastmod: (item.updatedAt || item.createdAt || new Date()).toISOString(),
        changefreq: 'monthly',
        priority: '0.7',
        images: img ? [{ loc: img, title: item.title || 'KstarPick News' }] : []
      };
    });

    // 드라마 페이지들
    const dramasCollection = db.collection('dramas');
    const dramas = await dramasCollection.find({}, {
      projection: { _id: 1, slug: 1, title: 1, createdAt: 1, updatedAt: 1, coverImage: 1, bannerImage: 1 }
    }).sort({ createdAt: -1 }).limit(500).toArray();

    const dramaPages = dramas.map(item => {
      const img = item.coverImage || item.bannerImage;
      return {
        url: `/drama/${item.slug || item._id}`,
        lastmod: (item.updatedAt || item.createdAt || new Date()).toISOString(),
        changefreq: 'weekly',
        priority: '0.7',
        images: img ? [{ loc: img, title: item.title || 'KstarPick Drama' }] : []
      };
    });

    // TV/영화 페이지들
    const tvfilmsCollection = db.collection('tvfilms');
    const tvfilms = await tvfilmsCollection.find({}, {
      projection: { _id: 1, slug: 1, title: 1, createdAt: 1, updatedAt: 1, coverImage: 1, bannerImage: 1 }
    }).sort({ createdAt: -1 }).limit(500).toArray();

    const tvfilmPages = tvfilms.map(item => {
      const img = item.coverImage || item.bannerImage;
      return {
        url: `/tvfilm/${item.slug || item._id}`,
        lastmod: (item.updatedAt || item.createdAt || new Date()).toISOString(),
        changefreq: 'weekly',
        priority: '0.7',
        images: img ? [{ loc: img, title: item.title || 'KstarPick Movie' }] : []
      };
    });

    // 연예인 페이지들
    const celebritiesCollection = db.collection('celebrities');
    const celebrities = await celebritiesCollection.find({}, {
      projection: { _id: 1, slug: 1, name: 1, createdAt: 1, updatedAt: 1, profileImage: 1 }
    }).sort({ createdAt: -1 }).limit(300).toArray();

    const celebPages = celebrities.map(item => ({
      url: `/celeb/${item.slug || item._id}`,
      lastmod: (item.updatedAt || item.createdAt || new Date()).toISOString(),
      changefreq: 'monthly',
      priority: '0.6',
      images: item.profileImage ? [{ loc: item.profileImage, title: item.name || 'KstarPick Celebrity' }] : []
    }));

    // 음악 페이지들
    let musicPages = [];
    try {
      const musicCollection = db.collection('music');
      const music = await musicCollection.find({}, { 
        projection: { _id: 1, slug: 1, createdAt: 1, updatedAt: 1 } 
      }).sort({ createdAt: -1 }).limit(300).toArray();

      musicPages = music.map(item => ({
        url: `/music/${item.slug || item._id}`,
        lastmod: (item.updatedAt || item.createdAt || new Date()).toISOString(),
        changefreq: 'weekly',
        priority: '0.7'
      }));
    } catch (error) {
      console.log('Music collection not found, skipping music pages');
    }

    // 모든 페이지 합치기
    const allPages = [...staticPages, ...newsPages, ...dramaPages, ...tvfilmPages, ...celebPages, ...musicPages];

    // 사이트맵 XML 생성
    const sitemap = generateSiteMap(allPages);

    res.setHeader('Content-Type', 'text/xml');
    res.write(sitemap);
    res.end();

  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    // 기본 사이트맵 반환
    const basicSitemap = generateSiteMap([
      {
        url: '/',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '1.0'
      }
    ]);
    
    res.setHeader('Content-Type', 'text/xml');
    res.write(basicSitemap);
    res.end();
  }

  return {
    props: {},
  };
}

// 이 컴포넌트는 실제로 렌더링되지 않음
function SiteMap() {
  return null;
}

export default SiteMap; 