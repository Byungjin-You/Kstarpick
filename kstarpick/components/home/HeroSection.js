import { useMemo } from 'react';

const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getCategoryLabel = (category) => {
  const map = { kpop: 'K-pop', drama: 'Drama', movie: 'Film', celeb: 'Celebrity', variety: 'Variety' };
  return map[category] || 'News';
};

const HeroSection = ({ article, onNavigate, children }) => {
  if (!article) return null;

  const timeAgo = useMemo(() => getTimeAgo(article.createdAt || article.publishedAt), [article]);
  const categoryLabel = getCategoryLabel(article.category);
  const dateStr = useMemo(() => {
    const d = new Date(article.createdAt || article.publishedAt || Date.now());
    return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }, [article]);

  const summary = useMemo(() => {
    if (article.content) return article.content.replace(/<[^>]*>/g, '').slice(0, 200);
    if (article.summary) return article.summary;
    return '';
  }, [article]);

  const handleClick = () => {
    onNavigate(`/news/${article.slug || article._id}`);
  };

  return (
    <section className="mb-0 lg:mb-8">
      <div className="bg-white border-0 lg:border-[1.5px] border-ksp-border rounded-none lg:rounded-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center gap-1.5 lg:gap-9 pt-2 px-4 pb-1.5 lg:pt-10 lg:px-4 lg:pb-10" style={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}>
          {/* Left: Featured Image */}
          <div
            className="relative cursor-pointer overflow-hidden rounded-[10px] lg:rounded-2xl flex-shrink-0 shadow-sm lg:shadow-card w-full"
            style={{ maxWidth: '664px' }}
            onClick={handleClick}
          >
            <img
              src={article.coverImage || article.thumbnailUrl || '/images/placeholder.jpg'}
              alt={article.title}
              className="w-full h-[227px] lg:h-[378px] object-cover hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
            />
            {/* Desktop Badge */}
            <span
              className="hidden lg:inline-block absolute top-4 left-4 px-5 py-1.5 rounded-badge text-white text-xs font-bold uppercase tracking-wider"
              style={{ background: 'linear-gradient(90deg, rgba(6,74,236,1) 0%, rgba(10,78,236,1) 21%, rgba(23,90,238,1) 43%, rgba(46,111,240,1) 67%, rgba(77,139,244,1) 91%, rgba(117,176,248,1) 100%)' }}
            >
              no.1 hot news
            </span>
            {/* Mobile Rank Number */}
            <span
              className="lg:hidden absolute bottom-3 left-3 text-white font-black italic leading-none"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '67px', fontStyle: 'italic', textShadow: '0 3px 6px rgba(0,0,0,0.3)' }}
            >
              1
            </span>
          </div>

          {/* Right: Content */}
          <div className="flex flex-col justify-center flex-1 gap-1 lg:gap-4 px-0 pb-0">
            {/* Today's News + Date - Desktop only */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: '#518EF4' }}>Today&apos;s News</span>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#518EF4' }}></span>
              <span className="text-sm font-bold" style={{ color: '#518EF4' }}>{dateStr}</span>
            </div>

            {/* Headline */}
            <h1
              className="text-[18px] leading-[1.33] lg:text-[36px] lg:leading-[1.25] font-bold lg:font-black text-[#0A0A0A] lg:text-[#101828] cursor-pointer hover:text-ksp-accent transition-colors line-clamp-2 lg:line-clamp-3"
              style={{ fontFamily: 'Pretendard, Inter, sans-serif', letterSpacing: '-0.0244em' }}
              onClick={handleClick}
            >
              {article.title}
            </h1>

            {/* Description - Desktop only */}
            <p className="hidden lg:block text-base leading-[1.625] line-clamp-3" style={{ color: '#4A5565', fontFamily: 'Pretendard, Inter, sans-serif' }}>
              {summary}
            </p>

            {/* Meta */}
            <div className="flex items-center text-[14px] lg:text-sm font-normal lg:font-medium" style={{ color: '#99A1AF', fontFamily: 'Inter, sans-serif', lineHeight: '16px' }}>
              <span>{timeAgo}</span>
              <span className="mx-2 text-[12px]">·</span>
              <span>{categoryLabel}</span>
            </div>
          </div>
        </div>

        {/* Sub-cards (4-card grid below hero) */}
        {children && (
          <div className="px-4 pb-3 pt-6 lg:px-6 lg:pb-6">
            {children}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroSection;
