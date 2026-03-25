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
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NewsCardGrid = ({ articles = [], onNavigate }) => {
  if (!articles || articles.length === 0) return null;

  return (
    <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-6 lg:gap-4">
      {articles.map((article, index) => (
        <div
          key={article._id}
          className="cursor-pointer group"
          onClick={() => onNavigate(`/news/${article.slug || article._id}`)}
        >
          {/* Image */}
          <div className="relative rounded-[8px] lg:rounded-card overflow-hidden mb-2 bg-[#F3F4F6]">
            <img
              src={article.coverImage || article.thumbnailUrl || '/images/placeholder.jpg'}
              alt={article.title}
              className="w-full h-[145px] lg:h-[173px] object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
            />
            {/* Desktop: Category tag */}
            <div className="hidden lg:block">
              <CategoryTag category={article.category} variant="overlay" className="absolute top-3 left-3" />
            </div>
            {/* Mobile: Rank number - top left */}
            <div className="lg:hidden absolute top-0 left-0 w-8 h-8 flex items-center justify-center">
              <span
                className="text-white font-black italic leading-none"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '30px', fontStyle: 'italic', lineHeight: '30px', letterSpacing: '0.396px', filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.12))' }}
              >
                {index + 2}
              </span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-medium lg:font-bold text-[15px] lg:text-lg leading-[1.375] lg:leading-[1.56] text-[#101828] line-clamp-2 mb-1 lg:mb-2 transition-colors" style={{ fontFamily: 'Pretendard, Inter, sans-serif', letterSpacing: '-0.015625em' }}>
            {article.title}
          </h3>

          {/* Time - mobile: relative, desktop: absolute date */}
          <span className="text-xs" style={{ color: '#99A1AF', fontFamily: 'Inter, sans-serif', lineHeight: '16px' }}>
            <span className="lg:hidden">{getTimeAgo(article.createdAt || article.publishedAt)}</span>
            <span className="hidden lg:inline">
              {new Date(article.createdAt || article.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric', month: '2-digit', day: '2-digit'
              })}
            </span>
          </span>
        </div>
      ))}
    </div>
    {/* Mobile: More Content button */}
    <button
      className="lg:hidden w-full mt-6 py-4 rounded-full text-sm font-semibold text-[#2D3138] hover:bg-gray-50 transition-colors"
      style={{ border: '0.86px solid #E5E7EB', fontFamily: 'Inter, sans-serif' }}
      onClick={() => {
        sessionStorage.removeItem('rankingActiveTab');
        onNavigate('/ranking');
      }}
    >
      More Content
    </button>
    </>
  );
};

export default NewsCardGrid;
