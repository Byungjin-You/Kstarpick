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

const WatchNewsSection = ({ articles = [], onNavigate, onPlayVideo }) => {
  if (!articles || articles.length === 0) return null;

  const featured = articles[0];
  const listItems = articles.slice(1, 4);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Left: Featured Watch News */}
      <div
        className="relative rounded-[14px] lg:rounded-card overflow-hidden cursor-pointer group flex-1"
        onClick={() => {
          if (featured.youtubeUrl && onPlayVideo) {
            onPlayVideo(featured.youtubeUrl);
          } else {
            onNavigate(`/news/${featured.slug || featured._id}`);
          }
        }}
      >
        <img
          src={featured.coverImage || featured.thumbnailUrl || '/images/placeholder.jpg'}
          alt={featured.title}
          className="w-full h-[227px] lg:h-[320px] object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
        />
        {/* Gradient Overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col justify-end p-4 lg:p-6"
          style={{ height: '114px', background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)' }}
        >
          <h3 className="font-bold text-[14px] lg:text-xl leading-[1.375] lg:leading-[1.6] text-white line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.0107em' }}>
            {featured.title?.replace(/^Watch:\s*/i, '') || featured.title}
          </h3>
        </div>
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/50 transition-colors">
            <svg className="w-5 h-5 lg:w-6 lg:h-6" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right: Watch News List */}
      <div className="flex flex-col gap-4 lg:gap-6 lg:w-[calc(50%-16px)]">
        {listItems.map((item) => (
          <div
            key={item._id}
            className="flex gap-3 lg:gap-4 cursor-pointer group"
            onClick={() => {
              if (item.youtubeUrl && onPlayVideo) {
                onPlayVideo(item.youtubeUrl);
              } else {
                onNavigate(`/news/${item.slug || item._id}`);
              }
            }}
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-[127px] h-[95px] rounded-[8px] lg:rounded-[10px] overflow-hidden bg-[#F3F4F6] relative">
              <img
                src={item.coverImage || item.thumbnailUrl || '/images/placeholder.jpg'}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
              />
              {/* Small play icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
              <h4
                className="font-bold text-[#101828] lg:text-base lg:leading-[1.375] line-clamp-2 group-hover:text-ksp-accent transition-colors"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', lineHeight: '20px', letterSpacing: '-0.21px' }}
              >
                {item.title?.replace(/^Watch:\s*/i, '') || item.title}
              </h4>
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 text-xs font-bold rounded" style={{ backgroundColor: '#DBE6F6', color: '#4A5565' }}>
                  PICK
                </span>
                <span className="text-xs" style={{ color: '#6A7282' }}>
                  {(typeof item.author === 'object' ? item.author?.name : item.author) || 'KstarPick'}
                </span>
                <span className="text-xs text-ksp-meta">
                  {getTimeAgo(item.createdAt || item.publishedAt)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatchNewsSection;
