import CategoryTag from './CategoryTag';

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
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ArticleCardGrid = ({ articles = [], onNavigate }) => {
  if (!articles || articles.length === 0) return null;

  const featured = articles[0];
  const listItems = articles.slice(1);

  return (
    <>
      {/* Mobile Layout: Featured + List */}
      <div className="md:hidden">
        {/* Featured Card */}
        <div
          className="cursor-pointer group mb-4"
          onClick={() => onNavigate(`/news/${featured.slug || featured._id}`)}
        >
          <div className="relative rounded-[14px] overflow-hidden mb-3 bg-[#F3F4F6]">
            <img
              src={featured.coverImage || featured.thumbnailUrl || '/images/placeholder.jpg'}
              alt={featured.title}
              className="w-full h-[222px] object-cover"
              onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
            />
          </div>
          <h3
            className="font-bold text-[18px] leading-[1.33] text-[#0A0A0A] line-clamp-2 mb-1"
            style={{ letterSpacing: '-0.0244em' }}
          >
            {featured.title}
          </h3>
          <span className="text-[13px] font-medium" style={{ color: '#99A1AF', fontFamily: 'Inter, sans-serif' }}>
            {getTimeAgo(featured.createdAt || featured.publishedAt)}
          </span>
        </div>

        {/* List Items */}
        <div className="flex flex-col gap-3">
          {listItems.map((article) => (
            <div
              key={article._id}
              className="flex gap-3 cursor-pointer group"
              onClick={() => onNavigate(`/news/${article.slug || article._id}`)}
            >
              <div className="flex-shrink-0 w-[100px] h-[70px] rounded-[6px] overflow-hidden bg-[#F3F4F6]">
                <img
                  src={article.coverImage || article.thumbnailUrl || '/images/placeholder.jpg'}
                  alt={article.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4
                  className="font-medium text-[15px] leading-[1.375] text-[#0A0A0A] line-clamp-2 group-hover:text-ksp-accent transition-colors"
                  style={{ letterSpacing: '-0.0244em' }}
                >
                  {article.title}
                </h4>
                <span className="text-[12px] mt-1" style={{ color: '#99A1AF', fontFamily: 'Inter, sans-serif' }}>
                  {getTimeAgo(article.createdAt || article.publishedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Layout: 3-column Grid */}
      <div className="hidden md:grid grid-cols-3 gap-6">
        {articles.map((article) => (
          <div
            key={article._id}
            className="cursor-pointer group"
            onClick={() => onNavigate(`/news/${article.slug || article._id}`)}
          >
            <div className="relative rounded-card overflow-hidden mb-4 bg-[#F3F4F6]">
              <img
                src={article.coverImage || article.thumbnailUrl || '/images/placeholder.jpg'}
                alt={article.title}
                className="w-full h-[209px] object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
              />
              <CategoryTag category={article.category} variant="overlay" className="absolute top-3 left-3" />
            </div>
            <h3
              className="font-bold text-lg leading-[1.375] text-[#101828] line-clamp-2 mb-2 group-hover:text-ksp-accent transition-colors"
              style={{ letterSpacing: '-0.0244em' }}
            >
              {article.title}
            </h3>
            <p
              className="text-sm leading-[1.625] line-clamp-2 mb-2"
              style={{ color: '#6A7282', letterSpacing: '-0.0107em', fontFamily: 'Pretendard, Inter, sans-serif' }}
            >
              {article.content ? article.content.replace(/<[^>]*>/g, '').slice(0, 120) : (article.summary || '')}
            </p>
            <span className="text-xs text-ksp-meta">
              {getTimeAgo(article.createdAt || article.publishedAt)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

export default ArticleCardGrid;
