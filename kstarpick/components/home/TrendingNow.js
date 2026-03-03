import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

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

const TrendingNow = ({ items = [], onNavigate, showCard = true }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const heightLocked = useRef(false);
  const itemCount = Math.min(items.length, 5);

  useEffect(() => {
    if (containerRef.current && !heightLocked.current && items.length > 0) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.minHeight = `${containerRef.current.offsetHeight}px`;
          heightLocked.current = true;
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [items.length]);

  useEffect(() => {
    if (itemCount <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % itemCount);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [itemCount]);

  const handleItemClick = (index) => {
    setActiveIndex(index);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % itemCount);
    }, 5000);
  };

  if (!items.length) return null;

  return (
    <div className={showCard ? 'bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4' : ''}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold leading-[1.5] text-black ${showCard ? 'text-[21px] lg:text-[23px]' : 'text-[20px]'}`} style={{ fontFamily: 'Inter, sans-serif' }}>Trending <span className="text-ksp-accent">NOW</span></h3>
        <span className="text-xs text-ksp-meta" style={{ fontFamily: "'Pretendard', sans-serif" }}>See more</span>
      </div>

      <div className="space-y-3" ref={containerRef}>
        {items.slice(0, 5).map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={item._id}
              className="rounded-xl transition-colors duration-300"
              style={{ backgroundColor: isActive ? '#E4EFFF' : 'transparent' }}
            >
              <div
                className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 min-h-[60px]"
                style={{
                  backgroundColor: isActive ? '#FFFFFF' : '#F9FAFB',
                  border: isActive ? '1.5px solid #2B7FFF' : '1.5px solid transparent',
                }}
                onClick={() => isActive ? onNavigate(`/news/${item.slug || item._id}`) : handleItemClick(index)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Search size={18} className={`flex-shrink-0 transition-colors duration-300 ${isActive ? 'text-ksp-accent' : 'text-ksp-meta'}`} />
                  <span className={`font-bold text-[15px] leading-[1.5] line-clamp-1 transition-colors duration-300 ${isActive ? 'text-black' : 'text-[#1E2939]'}`}>{item.title}</span>
                </div>
                {item.coverImage && !isActive && (
                  <img
                    src={item.coverImage || item.thumbnailUrl}
                    alt=""
                    className="w-11 h-11 rounded-md object-cover flex-shrink-0 ml-2"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>

              <div
                className="transition-[grid-template-rows] duration-300 ease-in-out"
                style={{
                  display: 'grid',
                  gridTemplateRows: isActive ? '1fr' : '0fr',
                }}
              >
                <div className="overflow-hidden">
                  <div className="px-3 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#101828] line-clamp-2 leading-[1.43]">{item.title}</p>
                        <span className="text-xs text-ksp-meta mt-1 block">{getTimeAgo(item.createdAt || item.publishedAt)}</span>
                      </div>
                      {item.coverImage && (
                        <img
                          src={item.coverImage || item.thumbnailUrl}
                          alt=""
                          className="w-[67px] h-[67px] rounded-md object-cover flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="w-full mt-4 py-4 rounded-full text-sm font-semibold text-[#2D3138] hover:bg-gray-50 transition-colors"
        style={{ border: '0.86px solid #E5E7EB', fontFamily: 'Inter, sans-serif' }}
        onClick={() => onNavigate('/news')}
      >
        More Content
      </button>
    </div>
  );
};

export default TrendingNow;
