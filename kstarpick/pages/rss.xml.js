import { connectToDatabase } from '../utils/mongodb';

// RSS XML 생성 함수
function generateRssFeed(items) {
  const baseUrl = 'https://kstarpick.com';
  const siteName = 'KstarPick - K-Pop News Portal';
  const siteDescription = 'K-Pop, 한류, 드라마, TV/영화 소식을 한 곳에서 만나보세요.';

  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" 
         xmlns:content="http://purl.org/rss/1.0/modules/content/"
         xmlns:wfw="http://wellformedweb.org/CommentAPI/"
         xmlns:dc="http://purl.org/dc/elements/1.1/"
         xmlns:atom="http://www.w3.org/2005/Atom"
         xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
         xmlns:slash="http://purl.org/rss/1.0/modules/slash/">
      <channel>
        <title>${siteName}</title>
        <link>${baseUrl}</link>
        <description>${siteDescription}</description>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <language>ko-KR</language>
        <sy:updatePeriod>hourly</sy:updatePeriod>
        <sy:updateFrequency>1</sy:updateFrequency>
        <generator>Next.js</generator>
        <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
        
        ${items.map((item) => {
          const pubDate = item.createdAt ? new Date(item.createdAt).toUTCString() : new Date().toUTCString();
          const description = item.description || item.summary || '';
          const content = item.content || description;
          
          return `
            <item>
              <title><![CDATA[${item.title}]]></title>
              <link>${baseUrl}${item.link}</link>
              <description><![CDATA[${description}]]></description>
              <content:encoded><![CDATA[${content}]]></content:encoded>
              <pubDate>${pubDate}</pubDate>
              <guid isPermaLink="true">${baseUrl}${item.link}</guid>
              ${item.category ? `<category><![CDATA[${item.category}]]></category>` : ''}
              ${item.author ? `<dc:creator><![CDATA[${item.author}]]></dc:creator>` : ''}
            </item>
          `;
        }).join('')}
      </channel>
    </rss>
  `;
}

export async function getServerSideProps({ res }) {
  try {
    const { db } = await connectToDatabase();
    
    const rssItems = [];

    // 최신 뉴스 가져오기 (30개)
    const newsCollection = db.collection('news');
    const news = await newsCollection.find({}, {
      projection: { 
        _id: 1, 
        title: 1, 
        content: 1, 
        description: 1,
        category: 1,
        createdAt: 1,
        author: 1
      }
    }).sort({ createdAt: -1 }).limit(30).toArray();

    news.forEach(item => {
      rssItems.push({
        title: item.title,
        link: `/news/${item._id}`,
        description: item.description || item.content?.substring(0, 200) + '...',
        content: item.content,
        category: item.category || 'K-Pop News',
        createdAt: item.createdAt,
        author: item.author || 'KstarPick'
      });
    });

    // 최신 드라마 정보 추가 (10개)
    const dramasCollection = db.collection('dramas');
    const dramas = await dramasCollection.find({}, {
      projection: { 
        _id: 1, 
        title: 1, 
        summary: 1,
        createdAt: 1
      }
    }).sort({ createdAt: -1 }).limit(10).toArray();

    dramas.forEach(item => {
      rssItems.push({
        title: `[드라마] ${item.title}`,
        link: `/drama/${item._id}`,
        description: item.summary || `${item.title} 드라마 정보`,
        content: item.summary,
        category: 'K-Drama',
        createdAt: item.createdAt,
        author: 'KstarPick'
      });
    });

    // 최신 TV/영화 정보 추가 (10개)
    const tvfilmsCollection = db.collection('tvfilms');
    const tvfilms = await tvfilmsCollection.find({}, {
      projection: { 
        _id: 1, 
        title: 1, 
        summary: 1,
        createdAt: 1
      }
    }).sort({ createdAt: -1 }).limit(10).toArray();

    tvfilms.forEach(item => {
      rssItems.push({
        title: `[TV/영화] ${item.title}`,
        link: `/tvfilm/${item._id}`,
        description: item.summary || `${item.title} 정보`,
        content: item.summary,
        category: 'TV/Film',
        createdAt: item.createdAt,
        author: 'KstarPick'
      });
    });

    // 날짜순으로 정렬
    rssItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // RSS XML 생성
    const rss = generateRssFeed(rssItems);

    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=600'); // 20분 캐시
    res.write(rss);
    res.end();

  } catch (error) {
    console.error('RSS generation error:', error);
    
    // 기본 RSS 반환
    const basicRss = generateRssFeed([
      {
        title: 'KstarPick - K-Pop News Portal',
        link: '/',
        description: 'K-Pop, 한류, 드라마, TV/영화 소식을 한 곳에서 만나보세요.',
        content: 'K-Pop, 한류, 드라마, TV/영화 소식을 한 곳에서 만나보세요.',
        category: 'K-Pop',
        createdAt: new Date(),
        author: 'KstarPick'
      }
    ]);
    
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.write(basicRss);
    res.end();
  }

  return {
    props: {},
  };
}

// 이 컴포넌트는 실제로 렌더링되지 않음
function RSSFeed() {
  return null;
}

export default RSSFeed; 