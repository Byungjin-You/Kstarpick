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

const LatestNewsList = ({ articles = [], onNavigate, title = 'Latest News' }) => {
  if (!articles || articles.length === 0) return null;

  return (
    <div>
      {title && (
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[26px] font-black text-[#101828]">{title}</h2>
            <span className="text-2xl">📋</span>
          </div>
          <span className="flex items-center gap-1 text-sm font-bold text-ksp-accent">See more <span>›</span></span>
        </div>
      )}
      <div className="space-y-6">
        {articles.map((article) => (
          <div
            key={article._id}
            className="flex gap-4 cursor-pointer group"
            onClick={() => onNavigate(`/news/${article.slug || article._id}`)}
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-[140px] h-[90px] rounded overflow-hidden bg-[#F3F4F6]">
              <img
                src={article.coverImage || article.thumbnailUrl || '/images/placeholder.jpg'}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2">
                <CategoryTag category={article.category} />
                <span className="text-xs font-medium text-ksp-meta">
                  {getTimeAgo(article.createdAt || article.publishedAt)}
                </span>
              </div>
              <h4 className="font-bold text-[16px] leading-[1.375] text-[#101828] line-clamp-2 group-hover:text-ksp-accent transition-colors" style={{ letterSpacing: '-0.0195em' }}>
                {article.title}
              </h4>
              {article.source && (
                <span className="text-xs text-ksp-meta">{article.source}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LatestNewsList;
