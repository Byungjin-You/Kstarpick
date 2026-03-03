import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const TopRatedDramaGrid = ({ dramas = [], onNavigate }) => {
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const lastX = useRef(0);
  const velocity = useRef(0);
  const animFrame = useRef(null);
  const [dragged, setDragged] = useState(false);

  if (!dramas || dramas.length === 0) return null;

  const sorted = [...dramas]
    .filter(d => d.reviewRating && d.reviewRating > 0)
    .sort((a, b) => (b.reviewRating || 0) - (a.reviewRating || 0))
    .slice(0, 10);

  if (sorted.length === 0) return null;

  const getRating = (drama) => {
    if (drama.reviewRating && drama.reviewRating > 0) {
      return parseFloat(drama.reviewRating) === 10 ? '10' : parseFloat(drama.reviewRating).toFixed(1);
    }
    return '-';
  };

  const getGenres = (drama) => {
    if (drama.genres && Array.isArray(drama.genres) && drama.genres.length > 0) return drama.genres;
    if (typeof drama.genre === 'string' && drama.genre.trim()) return drama.genre.split(',').map(g => g.trim());
    return [];
  };

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = 354;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // Drag-to-scroll
  const momentumScroll = useCallback(() => {
    if (!scrollRef.current || Math.abs(velocity.current) < 0.5) { velocity.current = 0; return; }
    scrollRef.current.scrollLeft -= velocity.current;
    velocity.current *= 0.92;
    animFrame.current = requestAnimationFrame(momentumScroll);
  }, []);

  useEffect(() => { return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current); }; }, []);

  const handleMouseDown = useCallback((e) => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    isDragging.current = true;
    setDragged(false);
    startX.current = e.pageX;
    lastX.current = e.pageX;
    scrollLeftStart.current = scrollRef.current.scrollLeft;
    velocity.current = 0;
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const dx = e.pageX - lastX.current;
    velocity.current = dx;
    lastX.current = e.pageX;
    if (Math.abs(e.pageX - startX.current) > 5) setDragged(true);
    scrollRef.current.scrollLeft = scrollLeftStart.current - (e.pageX - startX.current);
  }, []);

  const stopDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (scrollRef.current) { scrollRef.current.style.cursor = 'grab'; scrollRef.current.style.removeProperty('user-select'); }
    if (Math.abs(velocity.current) > 1) animFrame.current = requestAnimationFrame(momentumScroll);
  }, [momentumScroll]);

  const handleCardClick = useCallback((e) => {
    if (dragged) { e.preventDefault(); setDragged(false); }
  }, [dragged]);

  return (
    <div className="relative group/scroll">
      {/* Scroll buttons */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-[#374151] hover:bg-white transition-all opacity-0 group-hover/scroll:opacity-100"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-[#374151] hover:bg-white transition-all opacity-0 group-hover/scroll:opacity-100"
      >
        <ChevronRight size={18} />
      </button>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        className="flex gap-6 overflow-x-auto scrollbar-hide"
        style={{ cursor: 'grab' }}
      >
        {sorted.map((drama) => {
          const genres = getGenres(drama);
          return (
            <Link
              key={drama._id}
              href={`/drama/${drama.slug || drama._id}`}
              onClick={handleCardClick}
              draggable={false}
              className="flex-shrink-0 w-[330px] h-[186px] rounded-2xl overflow-hidden relative group cursor-pointer"
              style={{ backgroundColor: '#1E2939' }}
            >
              {/* Background image */}
              <img
                src={drama.coverImage || '/images/dramas/default-poster.jpg'}
                alt={drama.title}
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => { e.target.onerror = null; e.target.src = '/images/dramas/default-poster.jpg'; }}
              />

              {/* Left gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 18%, rgba(0,0,0,0) 69%)' }}
              />

              {/* Content - left aligned, bottom justified */}
              <div className="absolute inset-0 flex flex-col justify-end" style={{ padding: '0 50px 36px 18px' }}>
                <div className="flex flex-col" style={{ gap: '4px' }}>
                  {/* Title */}
                  <h4
                    className="text-white font-bold line-clamp-1"
                    style={{ fontSize: '17.5px', lineHeight: 1.5, letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif' }}
                  >
                    {drama.title}
                  </h4>

                  {/* Star + Rating */}
                  <div className="flex items-center" style={{ gap: '9px' }}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path
                        d="M7.5 0L9.18 5.18H14.64L10.23 8.38L11.91 13.56L7.5 10.36L3.09 13.56L4.77 8.38L0.36 5.18H5.82L7.5 0Z"
                        fill="#F0B100"
                        stroke="#F0B100"
                        strokeWidth="1.28"
                      />
                    </svg>
                    <span
                      className="font-semibold"
                      style={{ fontSize: '15.3px', lineHeight: 1.43, letterSpacing: '-0.01em', color: '#F0B100', fontFamily: 'Inter, sans-serif' }}
                    >
                      {getRating(drama)}
                    </span>
                  </div>

                  {/* Genres */}
                  {genres.length > 0 && (
                    <span style={{ fontSize: '13px', lineHeight: 1.33, color: '#D1D5DC', fontFamily: 'Inter, sans-serif' }}>
                      {genres.slice(0, 2).map(g => typeof g === 'string' ? g.charAt(0).toUpperCase() + g.slice(1) : g).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TopRatedDramaGrid;
