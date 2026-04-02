const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TYPE_COLORS = {
  release: { bg: '#FFF1F5', text: '#E11D6E', dot: '#E11D6E' },
  comeback: { bg: '#F3E8FF', text: '#7C3AED', dot: '#7C3AED' },
  debut: { bg: '#EFF6FF', text: '#2563EB', dot: '#2563EB' },
  teaser: { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
  concept_photo: { bg: '#FFF7ED', text: '#EA580C', dot: '#F97316' },
  mv: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  tracklist: { bg: '#EEF2FF', text: '#4F46E5', dot: '#6366F1' },
  highlight_medley: { bg: '#F0FDFA', text: '#0D9488', dot: '#14B8A6' },
  birthday: { bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E' },
  anniversary: { bg: '#ECFDF5', text: '#059669', dot: '#10B981' },
  pre_release: { bg: '#ECFEFF', text: '#0891B2', dot: '#06B6D4' },
  concert: { bg: '#FDF4FF', text: '#A21CAF', dot: '#D946EF' },
  fan_meeting: { bg: '#F7FEE7', text: '#65A30D', dot: '#84CC16' },
  festival: { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  other: { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF' }
};

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

const toKSTTime = (utcStr) => {
  const d = new Date(utcStr);
  d.setHours(d.getHours() + 9);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  if (h === 0 && m === 0) return '';
  return `${h < 12 ? 'AM' : 'PM'} ${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} KST`;
};

export default function ScheduleCard({ schedule: s, onNavigate }) {
  const color = TYPE_COLORS[s.type] || TYPE_COLORS.other;
  const kstTime = toKSTTime(s.startDate);
  const dateKey = toKSTDateKey(s.startDate);
  const [, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(parseInt(dateKey.split('-')[0]), m - 1, d);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const displayTitle = s.title
    ? (s.artistName ? s.title.replace(s.artistName, '').replace(/^\s*-\s*/, '').trim() || s.title : s.title)
    : '';

  return (
    <div className="cursor-pointer overflow-hidden rounded-xl bg-white border border-[#F3F4F6] p-4 hover:bg-[#F9FAFB] transition-colors"
      onClick={() => onNavigate && onNavigate(`/schedule/${s._id}`)}>
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Type Icon */}
        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full" style={{ backgroundColor: color.bg }}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{ color: color.dot }}>
            {s.type === 'birthday' || s.type === 'anniversary' ? (
              <>
                <path clipRule="evenodd" d="m4.75 18.364 5.358-11.061a.554.554 0 0 1 .888-.15l5.77 5.736c.27.268.191.719-.151.882L5.486 19.097c-.47.225-.963-.266-.736-.733z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path fillRule="evenodd" clipRule="evenodd" d="M18.388 7.187a1.102 1.102 0 0 0 1.23-.955 1.099 1.099 0 0 0-.961-1.224 1.098 1.098 0 1 0-.269 2.18M14.012 7.187a1.097 1.097 0 1 0 .27-2.18 1.103 1.103 0 0 0-1.23.957c-.075.602.356 1.15.96 1.223M17.642 10.966a1.098 1.098 0 1 0 .269-2.18 1.098 1.098 0 1 0-.269 2.18" fill="currentColor" />
                <path d="m9.115 10.013 4.754 4.726" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              <>
                <path d="m14.484 10.6-3.11 3.11L9.3 11.636" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path clipRule="evenodd" d="M12.899 4.534a3.608 3.608 0 0 0 3.263 1.352 1.398 1.398 0 0 1 1.553 1.553 3.602 3.602 0 0 0 1.352 3.262c.71.56.71 1.638 0 2.198a3.602 3.602 0 0 0-1.352 3.262c.107.9-.655 1.66-1.553 1.554a3.605 3.605 0 0 0-3.263 1.351 1.396 1.396 0 0 1-2.197 0 3.603 3.603 0 0 0-3.262-1.35 1.4 1.4 0 0 1-1.554-1.555A3.602 3.602 0 0 0 4.534 12.9a1.397 1.397 0 0 1 0-2.198A3.602 3.602 0 0 0 5.886 7.44c-.107-.9.655-1.66 1.554-1.553a3.606 3.606 0 0 0 3.262-1.352 1.396 1.396 0 0 1 2.197 0z" stroke="currentColor" strokeWidth="1.3" />
              </>
            )}
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-[15px] font-bold leading-6 text-[#101828]" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.21px' }}>
            {displayTitle || s.artistName || s.title}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-[#6A7282]">
            {MONTH_NAMES[m - 1]} {d} ({dayNames[dt.getDay()]})
            {kstTime && ` · ${kstTime}`}
          </p>
          <div className="mt-2 flex items-center">
            {(s.imageUrl || s.ogImage) && (
              <div className="relative mr-1.5 w-[18px] h-[18px] flex-shrink-0 overflow-hidden rounded-sm">
                <img alt="" src={s.imageUrl || s.ogImage} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}
            {s.artistName && (
              <span className="text-[13px] font-medium text-[#344054] mr-2">{s.artistName}</span>
            )}
            <span className="text-[10px] font-bold px-1.5 py-[1px] rounded" style={{ backgroundColor: color.bg, color: color.text }}>
              {TYPE_LABELS[s.type] || s.type}
            </span>
          </div>
        </div>

        {/* Right: Image */}
        {(s.imageUrl || s.ogImage) && (
          <div className="flex-shrink-0 w-[80px] self-stretch rounded-lg overflow-hidden -m-4 ml-0">
            <img src={s.imageUrl || s.ogImage} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}
      </div>
    </div>
  );
}
