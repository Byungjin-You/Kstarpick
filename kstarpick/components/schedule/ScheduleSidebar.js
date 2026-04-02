import { useState, useEffect, useRef } from 'react';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TYPE_LABELS = {
  release: 'Release', comeback: 'Comeback', debut: 'Debut', teaser: 'Teaser',
  concept_photo: 'Concept Photo', mv: 'MV', tracklist: 'Tracklist',
  highlight_medley: 'Highlight', birthday: 'Birthday', anniversary: 'Anniversary',
  pre_release: 'Pre-Release', concert: 'Concert', fan_meeting: 'Fan Meeting', festival: 'Festival', other: 'Other'
};

const toKSTDateKey = (utcStr) => {
  const d = new Date(utcStr);
  d.setHours(d.getHours() + 9);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

const formatShortDate = (utcStr) => {
  const dk = toKSTDateKey(utcStr);
  const [, m, d] = dk.split('-').map(Number);
  const dt = new Date(2026, m - 1, d);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${MONTH_NAMES[m - 1].substring(0, 3)} ${d} (${dayNames[dt.getDay()]})`;
};

export function UpcomingComebacks({ items = [], onNavigate, showCard = true }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef(null);
  const itemCount = Math.min(items.length, 5);

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

  if (items.length === 0) return null;

  return (
    <div className={showCard ? 'bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4' : ''}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold leading-[1.5] text-black ${showCard ? 'text-[21px] lg:text-[23px]' : 'text-[20px]'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
          Upcoming <span className="text-ksp-accent">Comebacks</span>
        </h3>
      </div>

      <div className="space-y-3">
        {items.slice(0, 5).map((s, index) => {
          const isActive = index === activeIndex;
          const img = s.imageUrl || s.ogImage;
          const dateStr = formatShortDate(s.startDate);

          return (
            <div key={s._id} className="rounded-xl transition-colors duration-300"
              style={{ backgroundColor: isActive ? '#E4EFFF' : 'transparent' }}>
              <div
                className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 min-h-[60px]"
                style={{
                  backgroundColor: isActive ? '#FFFFFF' : '#F9FAFB',
                  border: isActive ? '1.5px solid #2B7FFF' : '1.5px solid transparent',
                }}
                onClick={() => isActive && onNavigate ? onNavigate(`/schedule/${s._id}`) : handleItemClick(index)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`text-[11px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded transition-colors duration-300 ${isActive ? 'bg-ksp-accent text-white' : 'bg-[#F3F4F6] text-[#6A7282]'}`}>
                    {s.subType || TYPE_LABELS[s.type] || s.type}
                  </span>
                  <span className={`font-bold text-[15px] leading-[1.5] line-clamp-1 transition-colors duration-300 ${isActive ? 'text-black' : 'text-[#1E2939]'}`}>
                    {s.artistName || s.title}
                  </span>
                </div>
                {img && !isActive && (
                  <img src={img} alt="" className="w-11 h-11 rounded-md object-cover flex-shrink-0 ml-2"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                )}
              </div>

              <div className="transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ display: 'grid', gridTemplateRows: isActive ? '1fr' : '0fr' }}>
                <div className="overflow-hidden">
                  <div className="px-3 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#101828] line-clamp-2 leading-[1.43]">
                          {s.title || `${s.artistName} - ${s.albumName}`}
                        </p>
                        <span className="text-xs text-ksp-meta mt-1 block">{dateStr}</span>
                      </div>
                      {img && (
                        <img src={img} alt="" className="w-[67px] h-[67px] rounded-md object-cover flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConcertCard({ schedule: s, onNavigate }) {
  const dateLabel = s.totalDates && s.totalDates.length > 0
    ? s.totalDates.map(d => {
        const [, m, day] = d.split('-').map(Number);
        const dt = new Date(2026, m - 1, day);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${MONTH_NAMES[m - 1].substring(0, 3)} ${day} (${dayNames[dt.getDay()]})`;
      }).join(' · ')
    : formatShortDate(s.startDate);

  return (
    <div className="flex gap-4 cursor-pointer group" onClick={() => onNavigate && onNavigate(`/schedule/${s._id}`)}>
      <div className="flex-shrink-0 w-[140px] h-[90px] rounded overflow-hidden">
        <img src={s.imageUrl || s.ogImage || '/images/placeholder.jpg'} alt={s.title || ''}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = '/images/placeholder.jpg'; }} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <span className="inline-block px-1.5 py-0.5 bg-ksp-accent text-white text-[10px] font-bold uppercase tracking-wider rounded w-fit">
          {TYPE_LABELS[s.type] || s.type}
        </span>
        <h4 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2">{s.title || s.eventName}</h4>
        <p className="text-[11px] text-[#98A2B3] truncate">{dateLabel}</p>
        {(s.venue || s.location) && (
          <p className="text-[11px] text-[#6A7282] truncate flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {[s.venue, s.location].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}

export function ConcertsList({ items = [], onNavigate, showCard = true }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className={`font-bold leading-[1.5] text-[#101828] mb-4 ${showCard ? 'text-[23px] pl-1' : 'text-[20px]'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
        Kpop <span className="text-ksp-accent">Concerts</span> Schedule
      </h3>
      {showCard ? (
        <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
          {items.map(s => <ConcertCard key={s._id} schedule={s} onNavigate={onNavigate} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map(s => (
            <div key={s._id} className="flex items-center gap-4 cursor-pointer"
              onClick={() => onNavigate && onNavigate(`/schedule/${s._id}`)}>
              <div className="flex-shrink-0 w-[127px] h-[95px] rounded-lg overflow-hidden" style={{ background: '#F3F4F6' }}>
                <img src={s.imageUrl || s.ogImage || '/images/placeholder.jpg'} alt={s.title || ''}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/images/placeholder.jpg'; }} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <p className="text-[#101828] font-bold line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px' }}>
                  {s.title || s.eventName}
                </p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-[2px] rounded bg-[#DBE6F6] text-[#2B7FFF] font-bold text-[12px]" style={{ fontFamily: 'Inter' }}>
                    {TYPE_LABELS[s.type] || s.type}
                  </span>
                  <span className="text-[#6A7282] text-[12px]" style={{ fontFamily: 'Inter' }}>
                    {formatShortDate(s.startDate)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
