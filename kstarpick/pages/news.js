import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import MainLayout from '../components/MainLayout';
import CardNews from '../components/CardNews';
import LoadingSpinner from '../components/LoadingSpinner';
import PaginationControls from '../components/PaginationControls';
import CommentTicker from '../components/home/CommentTicker';
import TrendingNow from '../components/home/TrendingNow';
import { generateWebsiteJsonLd } from '../utils/seoHelpers';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'kpop', label: 'K-Pop' },
  { key: 'drama', label: 'Drama' },
  { key: 'movie', label: 'Movie' },
  { key: 'celeb', label: 'Celeb' },
];

const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function NewsListPage({ news, pagination, recentComments, rankingNews, trendingNews, editorsPickNews, currentCategory, currentPage }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const sidebarStickyRef = useRef(null);

  const navigateToPage = useCallback((path) => {
    router.push(path);
  }, [router]);

  const handleCategoryChange = (cat) => {
    const query = { ...router.query };
    if (cat === 'all') delete query.category;
    else query.category = cat;
    delete query.page;
    router.push({ pathname: '/news', query });
  };

  const handlePageChange = (page) => {
    const query = { ...router.query, page };
    router.push({ pathname: '/news', query });
  };

  const categoryLabel = CATEGORIES.find(c => c.key === currentCategory)?.label || 'All';
  const pageTitle = currentCategory === 'all'
    ? 'Latest K-Pop News'
    : `${categoryLabel} News`;

  const seoTitle = currentPage > 1
    ? `${pageTitle} - Page ${currentPage}`
    : pageTitle;
  const seoDescription = `Browse the latest ${categoryLabel.toLowerCase()} K-Pop news, Korean drama updates, celebrity stories, and entertainment headlines. Updated daily with breaking K-Pop coverage from KstarPick.`;
  const canonicalPath = currentCategory === 'all'
    ? `/news${currentPage > 1 ? `?page=${currentPage}` : ''}`
    : `/news?category=${currentCategory}${currentPage > 1 ? `&page=${currentPage}` : ''}`;

  return (
    <MainLayout>
      <Seo
        title={seoTitle}
        description={seoDescription}
        url={canonicalPath}
        jsonLd={generateWebsiteJsonLd()}
      />
      <Header />
      <div className="min-h-screen bg-[#FAFAFA]">
        <main className="max-w-[1772px] mx-auto px-4 lg:px-10 pt-[68px] lg:pt-[100px] pb-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Main column */}
            <div className="lg:col-span-8">
              {/* Page heading */}
              <div className="mb-6 lg:mb-8">
                <h1 className="text-[26px] lg:text-[34px] font-black leading-tight text-[#101828]">
                  <span style={{ color: '#2B7FFF' }}>{pageTitle.split(' ')[0]}</span>{' '}
                  <span style={{ color: '#101828' }}>{pageTitle.split(' ').slice(1).join(' ')}</span>
                </h1>
                <p className="text-sm lg:text-base text-ksp-meta mt-2">
                  Breaking K-Pop news, K-Drama coverage, and Korean entertainment headlines updated throughout the day.
                </p>
              </div>

              {/* Category filter */}
              <nav className="flex flex-wrap gap-2 mb-6 lg:mb-8" aria-label="News categories">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryChange(cat.key)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      currentCategory === cat.key
                        ? 'bg-ksp-accent text-white shadow-md'
                        : 'bg-white text-[#101828] border border-[#E5E7EB] hover:border-ksp-accent'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </nav>

              {/* News grid */}
              {news.length === 0 ? (
                <div className="bg-white border border-[#F3F4F6] rounded-2xl p-12 text-center">
                  <p className="text-ksp-meta">No news articles found for this category.</p>
                </div>
              ) : (
                <CardNews cards={news} />
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-8">
                  <PaginationControls
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block lg:col-span-4">
              <div ref={sidebarStickyRef} className="sticky top-[120px] space-y-8">
                <CommentTicker comments={recentComments || []} onNavigate={navigateToPage} />
                <TrendingNow items={trendingNews?.length > 0 ? trendingNews : rankingNews || []} onNavigate={navigateToPage} />

                {(editorsPickNews?.length > 0 || (rankingNews && rankingNews.length > 0)) && (
                  <div>
                    <h2 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-4 pl-1">
                      Editor&apos;s <span className="text-ksp-accent">PICK</span>
                    </h2>
                    <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
                      {(editorsPickNews?.length > 0 ? editorsPickNews : rankingNews).slice(0, 6).map(item => (
                        <Link
                          key={item._id}
                          href={`/news/${item.slug || item._id}`}
                          className="flex gap-4 cursor-pointer group"
                        >
                          <div className="flex-shrink-0 w-[140px] h-[90px] rounded overflow-hidden">
                            <img
                              src={item.coverImage || item.thumbnailUrl || '/images/placeholder.jpg'}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-block px-1.5 py-0.5 bg-ksp-accent text-white text-[10px] font-bold uppercase tracking-wider rounded">
                                {item.category === 'kpop' ? 'K-POP' : item.category === 'drama' ? 'DRAMA' : item.category === 'movie' ? 'FILM' : item.category === 'celeb' ? 'CELEB' : 'NEWS'}
                              </span>
                              <span className="text-xs font-medium text-ksp-meta">
                                {getTimeAgo(item.createdAt || item.publishedAt)}
                              </span>
                            </div>
                            <h3 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2">
                              {item.title}
                            </h3>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </main>
        <Footer />
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  try {
    context.res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${context.req.headers.host}`;

    const rawCategory = (context.query.category || 'all').toString().toLowerCase();
    const validCategories = ['all', 'kpop', 'drama', 'movie', 'celeb'];
    const currentCategory = validCategories.includes(rawCategory) ? rawCategory : 'all';
    const currentPage = Math.max(1, parseInt(context.query.page) || 1);
    const limit = 24;

    const listFields = 'fields=_id,title,slug,coverImage,thumbnailUrl,category,source,sourceUrl,timeText,summary,createdAt,publishedAt,viewCount,featured,tags,author';

    const newsApiUrl = currentCategory === 'all'
      ? `${baseUrl}/api/news?page=${currentPage}&limit=${limit}&sort=createdAt&order=desc&${listFields}`
      : `${baseUrl}/api/news?category=${currentCategory}&page=${currentPage}&limit=${limit}&sort=createdAt&order=desc&${listFields}`;

    const [newsResponse, commentsResponse, rankingResponse, trendingResponse, editorsPickResponse] = await Promise.all([
      fetch(newsApiUrl).catch(() => null),
      fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => null),
      fetch(`${baseUrl}/api/news?limit=10&sort=viewCount&${listFields}`).catch(() => null),
      fetch(`${baseUrl}/api/news/trending?limit=5`).catch(() => null),
      fetch(`${baseUrl}/api/news/editors-pick?limit=6`).catch(() => null),
    ]);

    const newsData = newsResponse ? await newsResponse.json().catch(() => ({})) : {};
    const commentsData = commentsResponse ? await commentsResponse.json().catch(() => ({})) : {};
    const rankingData = rankingResponse ? await rankingResponse.json().catch(() => ({})) : {};
    const trendingData = trendingResponse ? await trendingResponse.json().catch(() => ({})) : {};
    const editorsPickData = editorsPickResponse ? await editorsPickResponse.json().catch(() => ({})) : {};

    const fixImageUrl = (url) => {
      if (!url) return url;
      if (url.startsWith('/api/proxy/hash-image')) return `${baseUrl}${url}`;
      return url;
    };

    const newsList = Array.isArray(newsData?.data?.news)
      ? newsData.data.news
      : (Array.isArray(newsData?.data) ? newsData.data : []);

    const processedNews = newsList.map(n => ({
      ...n,
      coverImage: fixImageUrl(n.coverImage) || '/images/news/default-news.jpg',
      thumbnailUrl: fixImageUrl(n.thumbnailUrl),
    }));

    const pagination = newsData?.data?.pagination || {
      total: processedNews.length,
      page: currentPage,
      limit,
      totalPages: Math.max(1, Math.ceil(processedNews.length / limit)),
      hasNextPage: false,
      hasPrevPage: currentPage > 1,
    };

    const rankingNews = rankingData?.success
      ? (rankingData.data?.news || []).slice(0, 10).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    const trendingNews = trendingData?.success
      ? (trendingData.data || []).slice(0, 5).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    const editorsPickNews = editorsPickData?.success
      ? (editorsPickData.data || []).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
      : [];

    return {
      props: {
        news: processedNews,
        pagination,
        recentComments: commentsData?.success ? (commentsData.data || []).slice(0, 10) : [],
        rankingNews,
        trendingNews,
        editorsPickNews,
        currentCategory,
        currentPage,
      },
    };
  } catch (error) {
    console.error('news.js getServerSideProps error:', error);
    return {
      props: {
        news: [],
        pagination: { total: 0, page: 1, limit: 24, totalPages: 0, hasNextPage: false, hasPrevPage: false },
        recentComments: [],
        rankingNews: [],
        trendingNews: [],
        editorsPickNews: [],
        currentCategory: 'all',
        currentPage: 1,
      },
    };
  }
}
