import { connectToDatabase } from '../utils/mongodb';

// 사이트맵 XML 생성 함수
function generateSiteMap(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${pages.map((page) => {
        return `
          <url>
            <loc>https://kstarpick.com${page.url}</loc>
            <lastmod>${page.lastmod}</lastmod>
            <changefreq>${page.changefreq}</changefreq>
            <priority>${page.priority}</priority>
          </url>
        `;
      }).join('')}
    </urlset>
  `;
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
      }
    ];

    // 뉴스 페이지들
    const newsCollection = db.collection('news');
    const news = await newsCollection.find({}, { 
      projection: { _id: 1, slug: 1, createdAt: 1, updatedAt: 1 } 
    }).sort({ createdAt: -1 }).limit(1000).toArray();

    const newsPages = news.map(item => ({
      url: `/news/${item._id}`,
      lastmod: (item.updatedAt || item.createdAt || new Date()).toISOString(),
      changefreq: 'monthly',
      priority: '0.7'
    }));

    // 드라마 페이지들
    const dramasCollection = db.collection('dramas');
    const dramas = await dramasCollection.find({}, { 
      projection: { _id: 1, slug: 1, createdAt: 1, updatedAt: 1 } 
    }).sort({ createdAt: -1 }).limit(500).toArray();

    const dramaPages = dramas.map(item => ({
      url: `/drama/${item._id}`,
      lastmod: (item.updatedAt || item.createdAt || new Date()).toISOString(),
      changefreq: 'weekly',
      priority: '0.7'
    }));

    // TV/영화 페이지들
    const tvfilmsCollection = db.collection('tvfilms');
    const tvfilms = await tvfilmsCollection.find({}, { 
      projection: { _id: 1, slug: 1, createdAt: 1, updatedAt: 1 } 
    }).sort({ createdAt: -1 }).limit(500).toArray();

    const tvfilmPages = tvfilms.map(item => ({
      url: `/tvfilm/${item._id}`,
      lastmod: (item.updatedAt || item.createdAt || new Date()).toISOString(),
      changefreq: 'weekly',
      priority: '0.7'
    }));

    // 연예인 페이지들
    const celebritiesCollection = db.collection('celebrities');
    const celebrities = await celebritiesCollection.find({}, { 
      projection: { _id: 1, slug: 1, createdAt: 1, updatedAt: 1 } 
    }).sort({ createdAt: -1 }).limit(300).toArray();

    const celebPages = celebrities.map(item => ({
      url: `/celeb/${item.slug || item._id}`,
      lastmod: (item.updatedAt || item.createdAt || new Date()).toISOString(),
      changefreq: 'monthly',
      priority: '0.6'
    }));

    // 음악 페이지들
    let musicPages = [];
    try {
      const musicCollection = db.collection('music');
      const music = await musicCollection.find({}, { 
        projection: { _id: 1, slug: 1, createdAt: 1, updatedAt: 1 } 
      }).sort({ createdAt: -1 }).limit(300).toArray();

      musicPages = music.map(item => ({
        url: `/music/${item._id}`,
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