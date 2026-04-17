import { connectToDatabase } from '../utils/mongodb';

const BASE_URL = 'https://kstarpick.com';
const PUBLICATION_NAME = 'KstarPick';
const PUBLICATION_LANGUAGE = 'en';

// Google News Sitemap: 최근 48시간 이내 기사만 포함, 최대 1,000건
const MAX_ARTICLES = 1000;
const WINDOW_HOURS = 48;

function xmlEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absImageUrl(img) {
  if (!img || typeof img !== 'string') return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('/')) return `${BASE_URL}${img}`;
  return `${BASE_URL}/${img}`;
}

function buildNewsSitemap(articles) {
  const urls = articles.map(article => {
    const url = `${BASE_URL}/news/${article.slug || article._id}`;
    const pubDate = new Date(article.publishedAt || article.createdAt).toISOString();
    const title = xmlEscape(article.title || 'KstarPick News');
    const keywords = Array.isArray(article.tags) ? article.tags.slice(0, 10).join(', ') : '';
    const img = absImageUrl(article.coverImage || article.thumbnailUrl);

    const imageBlock = img
      ? `<image:image><image:loc>${xmlEscape(img)}</image:loc><image:title>${title}</image:title></image:image>`
      : '';

    return `<url>
  <loc>${xmlEscape(url)}</loc>
  <news:news>
    <news:publication>
      <news:name>${PUBLICATION_NAME}</news:name>
      <news:language>${PUBLICATION_LANGUAGE}</news:language>
    </news:publication>
    <news:publication_date>${pubDate}</news:publication_date>
    <news:title>${title}</news:title>
    ${keywords ? `<news:keywords>${xmlEscape(keywords)}</news:keywords>` : ''}
  </news:news>
  ${imageBlock}
</url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  try {
    const { db } = await connectToDatabase();

    const cutoff = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

    const articles = await db.collection('news')
      .find(
        {
          status: 'published',
          $or: [
            { publishedAt: { $gte: cutoff } },
            { publishedAt: { $exists: false }, createdAt: { $gte: cutoff } },
          ],
        },
        {
          projection: {
            _id: 1, slug: 1, title: 1, tags: 1,
            coverImage: 1, thumbnailUrl: 1,
            publishedAt: 1, createdAt: 1,
          },
        }
      )
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(MAX_ARTICLES)
      .toArray();

    const xml = buildNewsSitemap(articles);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // 뉴스 사이트맵은 변화가 잦으니 짧은 캐시
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.write(xml);
    res.end();
  } catch (error) {
    console.error('[news-sitemap] generation error:', error);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.write(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"/>`);
    res.end();
  }

  return { props: {} };
}

export default function NewsSitemap() {
  return null;
}
