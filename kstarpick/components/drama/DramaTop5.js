import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

const DramaTop5 = ({ dramas = [], onNavigate, type = 'drama' }) => {
  if (!dramas || dramas.length === 0) return null;

  const topDrama = dramas[0];
  const restDramas = dramas.slice(1, 10); // #2 ~ #10
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const lastX = useRef(0);
  const velocity = useRef(0);
  const animFrame = useRef(null);
  const [dragged, setDragged] = useState(false);

  const getGenres = (drama) => {
    if (drama.genres && Array.isArray(drama.genres) && drama.genres.length > 0) return drama.genres;
    if (typeof drama.genre === 'string' && drama.genre.trim()) return drama.genre.split(',').map(g => g.trim());
    return [];
  };

  const getRating = (drama) => {
    if (drama.reviewRating && drama.reviewRating > 0) {
      return parseFloat(drama.reviewRating) === 10 ? '10' : parseFloat(drama.reviewRating).toFixed(1);
    }
    return '-';
  };

  // Momentum animation after release
  const momentumScroll = useCallback(() => {
    if (!scrollRef.current || Math.abs(velocity.current) < 0.5) {
      velocity.current = 0;
      return;
    }
    scrollRef.current.scrollLeft -= velocity.current;
    velocity.current *= 0.92; // friction
    animFrame.current = requestAnimationFrame(momentumScroll);
  }, []);

  useEffect(() => {
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current); };
  }, []);

  // Drag-to-scroll handlers
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
    const walk = e.pageX - startX.current;
    if (Math.abs(walk) > 5) setDragged(true);
    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
  }, []);

  const stopDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
      scrollRef.current.style.removeProperty('user-select');
    }
    // Start momentum
    if (Math.abs(velocity.current) > 1) {
      animFrame.current = requestAnimationFrame(momentumScroll);
    }
  }, [momentumScroll]);

  // Block link click if user was dragging
  const handleCardClick = useCallback((e) => {
    if (dragged) {
      e.preventDefault();
      setDragged(false);
    }
  }, [dragged]);

  const genres = getGenres(topDrama);

  return (
    <div className="flex gap-9 items-end">
      {/* ===== Left: #1 Drama poster (296x442) ===== */}
      <Link
        href={`/drama/${topDrama.slug || topDrama._id}`}
        className="relative flex-shrink-0 w-[296px] h-[442px] rounded-[14px] overflow-hidden group cursor-pointer"
      >
        <img
          src={topDrama.coverImage || '/images/dramas/default-poster.jpg'}
          alt={topDrama.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.onerror = null; e.target.src = '/images/dramas/default-poster.jpg'; }}
        />
        {/* Gradient: transparent → black */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 38%, rgba(0,0,0,1) 60%)' }} />

        {/* Large rank "1" */}
        <span
          className="absolute top-0 left-[7px] text-white select-none pointer-events-none"
          style={{ fontSize: '107px', lineHeight: '0.97em', fontWeight: 900, fontFamily: 'Inter, sans-serif', textShadow: '0px 2.5px 2.5px rgba(0,0,0,0.5)' }}
        >
          1
        </span>

        {/* Bottom overlay: title + ★rating + genres */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-4 px-5">
          <h3 className="text-white font-bold text-center line-clamp-2 mb-1 capitalize" style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', lineHeight: '24.75px', letterSpacing: '-0.439px' }}>
            {topDrama.title}
          </h3>
          <div className="flex items-center gap-[7px]">
            <span className="font-bold" style={{ fontSize: '17px', color: '#FDC700' }}>★{getRating(topDrama)}</span>
            <div className="flex items-center gap-[3px]">
              {genres.slice(0, 2).map((genre, idx) => (
                <span key={idx} className="flex items-center gap-[3px]">
                  {idx > 0 && <span className="w-[3px] h-[3px] rounded-full bg-white inline-block" />}
                  <span className="text-[13px]" style={{ color: '#FAFAFA', letterSpacing: '0.015em' }}>
                    {typeof genre === 'string' ? genre.charAt(0).toUpperCase() + genre.slice(1) : genre}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>

      {/* ===== Right: #1 detail info + #2~N drag-scroll ===== */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* ── Top: #1 drama detail ── */}
        <div className="flex-1 min-h-0 pt-3 flex flex-col gap-2">
          {/* Gradient badge */}
          <span
            className="inline-flex self-start items-center px-[15px] py-[6px] rounded-full text-white text-xs font-bold uppercase"
            style={{ background: 'linear-gradient(90deg, #064AEC 0%, #0A4EEC 21%, #175AEE 43%, #2E6FF0 67%, #4D8BF4 91%, #75B0F8 100%)', letterSpacing: '0.02em' }}
          >
            {type === 'tvfilm' ? '#TOP 1 : TV/FILM' : '#TOP 1 : DRAMA'}
          </span>

          {/* Title (36px black) */}
          <h3 className="font-black text-[#101828] line-clamp-2" style={{ fontSize: '36px', lineHeight: 1.25, fontFamily: 'Pretendard, sans-serif' }}>
            {topDrama.title}
          </h3>

          {/* Meta tags: network + HD/4K/CC style tags */}
          <div className="flex items-center gap-4 flex-wrap">
            {topDrama.network && (
              <span className="text-sm" style={{ color: '#2B7FFF', fontFamily: 'Inter, sans-serif' }}>
                {topDrama.network.split(',').map(n => n.trim()).join(' · ')} Series
              </span>
            )}
            {genres.slice(0, 2).map((genre, idx) => (
              <span key={idx} className="text-xs border rounded-full px-[9px] py-[3px]" style={{ color: '#798296', borderColor: '#798296' }}>
                {typeof genre === 'string' ? genre.charAt(0).toUpperCase() + genre.slice(1) : genre}
              </span>
            ))}
            {topDrama.year && (
              <span className="text-xs border rounded-full px-[9px] py-[3px]" style={{ color: '#798296', borderColor: '#798296' }}>{topDrama.year}</span>
            )}
            {topDrama.episodes && (
              <span className="text-xs border rounded-full px-[8px] py-[3px]" style={{ color: '#798296', borderColor: '#798296' }}>{topDrama.episodes} eps</span>
            )}
          </div>

          {/* Synopsis - 2줄 제한 */}
          <p className="line-clamp-2 mt-1" style={{ fontSize: '16px', lineHeight: 1.625, letterSpacing: '-0.02em', color: '#4A5565', fontFamily: 'Pretendard, sans-serif' }}>
            {topDrama.description || topDrama.summary || 'No synopsis available.'}
          </p>
        </div>

        {/* ── Bottom: #2~N drag-to-scroll poster row ── */}
        <div className="flex-shrink-0 mt-4 relative">
          {/* Right fade hint for scroll */}
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 100%)' }} />
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            className="flex gap-5 overflow-x-auto overflow-y-hidden scrollbar-hide pr-8"
            style={{ cursor: 'grab' }}
          >
            {restDramas.map((drama, index) => (
              <Link
                key={drama._id}
                href={`/drama/${drama.slug || drama._id}`}
                onClick={handleCardClick}
                draggable={false}
                className="relative flex-shrink-0 group cursor-pointer overflow-visible"
                style={{ width: '163px', height: '226px' }}
              >
                {/* Poster image */}
                <div className="w-full h-full rounded-[11px] overflow-hidden">
                  <img
                    src={drama.coverImage || '/images/dramas/default-poster.jpg'}
                    alt={drama.title}
                    draggable={false}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/dramas/default-poster.jpg'; }}
                  />
                  {/* Gradient: transparent 42% → black 82% */}
                  <div className="absolute inset-0 rounded-[11px]" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 42%, rgba(0,0,0,1) 82%)' }} />
                </div>

                {/* Large rank number (top-left, overflows left) */}
                <span
                  className="absolute text-white select-none pointer-events-none"
                  style={{
                    fontSize: '84px',
                    fontWeight: 900,
                    fontFamily: 'Inter, sans-serif',
                    lineHeight: '0.97em',
                    top: '0px',
                    left: '-13px',
                    textShadow: '0px 2.8px 2.8px rgba(0,0,0,0.5)',
                  }}
                >
                  {index + 2}
                </span>

                {/* Bottom: title + rating overlay (center aligned) */}
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-3 px-3">
                  <p className="text-white font-bold line-clamp-1 text-center capitalize" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px' }}>{drama.title}</p>
                  <div className="flex items-center gap-[5px] mt-1">
                    <span className="font-bold" style={{ fontSize: '12px', color: '#FDC700' }}>★{getRating(drama)}</span>
                    {getGenres(drama).slice(0, 1).map((genre, idx) => (
                      <span key={idx} className="flex items-center gap-[5px]">
                        <span className="w-[2.3px] h-[2.3px] rounded-full bg-white inline-block" />
                        <span style={{ fontSize: '9px', color: '#FAFAFA', letterSpacing: '0.015em' }}>
                          {typeof genre === 'string' ? genre.charAt(0).toUpperCase() + genre.slice(1) : genre}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DramaTop5;
