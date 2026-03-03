import CommentTicker from './CommentTicker';
import TrendingNow from './TrendingNow';

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

const Sidebar = ({ rankingNews = [], popularArticles = [], recentComments = [], onSearch, onNavigate }) => {
  return (
    <div className="w-full space-y-8">
      {/* Comment Ticker */}
      <CommentTicker comments={recentComments} onNavigate={onNavigate} />

      {/* Trending NOW Widget */}
      <TrendingNow items={rankingNews} onNavigate={onNavigate} />

      {/* Editor's PICK Widget */}
      {popularArticles.length > 0 && (
        <div>
          <h3 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-4 pl-1">Editor&apos;s <span className="text-ksp-accent">PICK</span></h3>
          <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
            {popularArticles.slice(0, 5).map((item) => (
              <div
                key={item._id}
                className="flex gap-4 cursor-pointer group"
                onClick={() => onNavigate(`/news/${item.slug || item._id}`)}
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
                  {/* Category Badge + Time */}
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-1.5 py-0.5 bg-ksp-accent text-white text-[10px] font-bold uppercase tracking-wider rounded">
                      {item.category === 'kpop' ? 'K-POP' : item.category === 'drama' ? 'DRAMA' : item.category === 'movie' ? 'FILM' : item.category === 'celeb' ? 'CELEB' : 'NEWS'}
                    </span>
                    <span className="text-xs font-medium text-ksp-meta">
                      {getTimeAgo(item.createdAt || item.publishedAt)}
                    </span>
                  </div>
                  <h4 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2 group-hover:text-ksp-accent transition-colors">
                    {item.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
