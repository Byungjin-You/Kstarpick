import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../components/MainLayout';
import Seo from '../components/Seo';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { UpcomingComebacks, ConcertsList } from '../components/schedule/ScheduleSidebar';
import MoreNews from '../components/MoreNews';

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

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'releases', label: 'Releases', types: ['release', 'pre_release'] },
  { key: 'comebacks', label: 'Comebacks', types: ['comeback', 'debut'] },
  { key: 'concerts', label: 'Concerts', types: ['concert', 'fan_meeting', 'festival'] },
  { key: 'celebrations', label: 'Celebrations', types: ['birthday', 'anniversary'] },
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
  return `${h < 12 ? 'AM' : 'PM'} ${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')}`;
};

const getTodayKST = () => {
  const now = new Date();
  now.setHours(now.getHours() + 9);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
};

// ==================== SCHEDULE CARD ====================
function ScheduleCard({ schedule: s }) {
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
      onClick={() => { if (s.onNavigate) s.onNavigate(`/schedule/${s._id}`); }}>
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
            {kstTime && ` · ${kstTime} KST`}
          </p>

          {/* Artist row */}
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

// ==================== MAIN PAGE ====================
export default function SchedulePage({ initialSchedules, initialYear, initialMonth }) {
  const router = useRouter();
  const navigateToPage = (path) => router.push(path);
  const [schedules, setSchedules] = useState(initialSchedules || []);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getTodayKST());
  const [mounted, setMounted] = useState(false);

  // 마운트 시: 뒤로가기면 복원, 새로고침이면 리셋
  useEffect(() => {
    const isBack = sessionStorage.getItem('_navWasBack') === 'true';
    sessionStorage.removeItem('_navWasBack');

    if (isBack) {
      const savedDate = sessionStorage.getItem('cal_selectedDate');
      const savedYear = parseInt(sessionStorage.getItem('cal_year'));
      const savedMonth = parseInt(sessionStorage.getItem('cal_month'));
      const savedFilter = sessionStorage.getItem('cal_filter');

      if (savedDate) setSelectedDate(savedDate);
      if (savedFilter) setActiveFilter(savedFilter);
      if (savedYear && savedMonth && (savedYear !== initialYear || savedMonth !== initialMonth)) {
        setYear(savedYear);
        setMonth(savedMonth);
        fetchSchedules(savedYear, savedMonth);
      }
    }
    setMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 상태 변경 시 sessionStorage에 저장 (마운트 완료 후에만)
  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem('cal_year', String(year));
    sessionStorage.setItem('cal_month', String(month));
    sessionStorage.setItem('cal_filter', activeFilter);
    if (selectedDate) sessionStorage.setItem('cal_selectedDate', selectedDate);
  }, [year, month, activeFilter, selectedDate, mounted]);
  const [loading, setLoading] = useState(false);
  const sidebarRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const HEADER_H = 92;
    const calcTop = () => {
      const sH = el.offsetHeight;
      const vH = window.innerHeight;
      setSidebarStickyTop(sH <= vH - HEADER_H ? HEADER_H : vH - sH - 40);
    };
    const timer = setTimeout(calcTop, 300);
    const observer = new ResizeObserver(calcTop);
    observer.observe(el);
    window.addEventListener('resize', calcTop);
    return () => { clearTimeout(timer); observer.disconnect(); window.removeEventListener('resize', calcTop); };
  }, [schedules]);

  const fetchSchedules = async (y, m) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedules?month=${y}-${String(m).padStart(2, '0')}&limit=2000`);
      const data = await res.json();
      if (data.success) setSchedules(data.schedules || []);
    } catch(e) {}
    setLoading(false);
  };


  const changeMonth = (delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    const newY = d.getFullYear();
    const newM = d.getMonth() + 1;
    setYear(newY);
    setMonth(newM);
    // 오늘이 해당 월이면 오늘, 아니면 선택 해제
    const today = getTodayKST();
    const [ty, tm] = today.split('-').map(Number);
    setSelectedDate(ty === newY && tm === newM ? today : null);
    fetchSchedules(newY, newM);
  };

  // Filter
  const filteredSchedules = schedules.filter(s => {
    if (activeFilter === 'all') return true;
    const tab = FILTER_TABS.find(t => t.key === activeFilter);
    return tab?.types?.includes(s.type);
  });

  // Group by date (startDate + dates 배열 모두 반영)
  const groupedByDate = {};
  filteredSchedules.forEach(s => {
    const dateKey = toKSTDateKey(s.startDate);
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(s);

    // 콘서트/팬미팅 등 여러 날짜가 있는 경우 각 날짜에도 표시
    if (s.dates && s.dates.length > 1) {
      s.dates.forEach(d => {
        const dk = toKSTDateKey(d);
        if (dk !== dateKey) {
          if (!groupedByDate[dk]) groupedByDate[dk] = [];
          if (!groupedByDate[dk].some(existing => existing._id === s._id)) {
            groupedByDate[dk].push(s);
          }
        }
      });
    }
  });

  // 각 날짜 내 정렬: 발매(이미지 있는 것 우선) → 기타 → 기념일/생일
  const typePriority = (s) => {
    const hasImg = s.imageUrl || s.ogImage;
    if (['release', 'comeback', 'debut'].includes(s.type)) return hasImg ? 0 : 1;
    if (['concert', 'fan_meeting', 'festival'].includes(s.type)) return hasImg ? 2 : 3;
    if (['teaser', 'concept_photo', 'mv', 'tracklist', 'highlight_medley', 'pre_release'].includes(s.type)) return hasImg ? 4 : 5;
    if (s.type === 'birthday' || s.type === 'anniversary') return 9;
    return hasImg ? 6 : 7;
  };
  Object.keys(groupedByDate).forEach(dateKey => {
    groupedByDate[dateKey].sort((a, b) => typePriority(a) - typePriority(b));
  });

  // Calendar
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();
  const todayKST = getTodayKST();

  const calendarDays = [];
  for (let i = firstDay - 1; i >= 0; i--) calendarDays.push({ day: daysInPrevMonth - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ day: d, current: true, dateKey, events: groupedByDate[dateKey] || [] });
  }
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) for (let i = 1; i <= remaining; i++) calendarDays.push({ day: i, current: false });

  // Selected date events
  const selectedEvents = selectedDate ? (groupedByDate[selectedDate] || []) : [];
  const selectedDateLabel = selectedDate ? (() => {
    const [, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(year, m - 1, d);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${MONTH_NAMES[m - 1]} ${d} (${dayNames[dt.getDay()]})`;
  })() : '';

  // All dates sorted for mobile list
  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <MainLayout>
      <Seo
        title={`K-POP Schedule ${MONTH_NAMES[month - 1]} ${year} | KstarPick`}
        description={`K-POP comeback schedule for ${MONTH_NAMES[month - 1]} ${year}. Track all K-pop releases, comebacks, and events.`}
        url="/schedule"
      />

      {/* ============ MOBILE LAYOUT ============ */}
      <div className="lg:hidden">
        <main className="pt-0 pb-16 bg-white">
          {/* Title */}
          <div className="px-4 pt-4 pb-0">
            <h2 className="text-[21px] font-extrabold" style={{ fontFamily: 'Pretendard, sans-serif', lineHeight: '1.29em', color: '#101828' }}>
              <span className="text-ksp-accent">K-POP</span> Schedule
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto scrollbar-hide">
            {FILTER_TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                  activeFilter === tab.key
                    ? 'bg-[#101828] text-white' : 'bg-[#F3F4F6] text-[#6A7282]'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mini Calendar */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => changeMonth(-1)} className="p-1"><ChevronLeft size={18} className="text-[#6A7282]" /></button>
              <span className="text-[15px] font-bold text-[#101828]">{MONTH_NAMES[month - 1]} {year}</span>
              <button onClick={() => changeMonth(1)} className="p-1"><ChevronRight size={18} className="text-[#6A7282]" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className={`text-center text-[11px] font-semibold py-1 ${i === 0 ? 'text-red-400' : 'text-[#98A2B3]'}`}>{d}</div>
              ))}
              {calendarDays.map((cell, i) => {
                const isToday = cell.dateKey === todayKST;
                const isSelected = cell.dateKey === selectedDate;
                const hasEvents = cell.events && cell.events.length > 0;
                return (
                  <div key={i} onClick={() => cell.current && cell.dateKey && setSelectedDate(cell.dateKey)}
                    className={`flex flex-col items-center py-1 rounded-lg cursor-pointer ${!cell.current ? 'opacity-25' : ''} ${isSelected ? 'bg-[#101828]' : isToday ? 'bg-pink-50' : ''}`}>
                    <span className={`text-[12px] font-medium ${isSelected ? 'text-white' : isToday ? 'text-ksp-accent font-bold' : 'text-[#344054]'}`}>{cell.day}</span>
                    {hasEvents && (
                      <div className="flex gap-[2px] mt-0.5">
                        {cell.events.slice(0, 3).map((e, j) => (
                          <div key={j} className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: isSelected ? '#fff' : (TYPE_COLORS[e.type]?.dot || '#9CA3AF') }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Separator */}
          <div className="h-2 bg-[#F3F4F6]" />

          {/* Schedule List */}
          <div className="bg-white" style={{ padding: '24px 16px' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-black text-[#101828]" style={{ fontFamily: 'Inter, sans-serif' }}>
                <span className="text-ksp-accent">Today&apos;s</span> Schedule
                {selectedEvents.length > 0 && <span className="text-[14px] font-medium text-[#98A2B3] ml-2">({selectedEvents.length})</span>}
              </h2>
              {selectedDate && (
                <span className="text-[13px] text-[#98A2B3]">{selectedDateLabel}</span>
              )}
            </div>
            {selectedDate && selectedEvents.length > 0 ? (
              <div>
                <div className="space-y-2">
                  {selectedEvents.map(s => <ScheduleCard key={s._id} schedule={{...s, onNavigate: navigateToPage}} />)}
                </div>
              </div>
            ) : selectedDate ? (
              <p className="text-center py-8 text-[13px] text-[#98A2B3]">No events on this date</p>
            ) : (
              sortedDates.map(dateKey => {
                const items = groupedByDate[dateKey];
                const [, m, d] = dateKey.split('-').map(Number);
                const isToday = dateKey === todayKST;
                return (
                  <div key={dateKey} className="mb-5">
                    <p className={`text-[13px] font-bold mb-1 ${isToday ? 'text-ksp-accent' : 'text-[#101828]'}`}>
                      {isToday && 'TODAY · '}{MONTH_NAMES[m - 1]} {d} <span className="text-[#98A2B3] font-normal">({items.length})</span>
                    </p>
                    {items.map(s => <ScheduleCard key={s._id} schedule={{...s, onNavigate: navigateToPage}} />)}
                  </div>
                );
              })
            )}
          </div>

          {/* Separator */}
          <div className="h-2 bg-[#F3F4F6]" />

          {/* Upcoming Comebacks */}
          <div className="bg-white px-4 py-5">
            <UpcomingComebacks
              items={schedules
                .filter(s => ['comeback', 'debut', 'release'].includes(s.type))
                .filter(s => toKSTDateKey(s.startDate) >= todayKST)
                .filter(s => s.imageUrl || s.ogImage)
                .filter((s, i, arr) => arr.findIndex(x => x.artistName === s.artistName && x.albumName === s.albumName) === i)
                .slice(0, 5)}
              onNavigate={navigateToPage}
              showCard={false}
            />
          </div>

          {/* Separator */}
          <div className="h-2 bg-[#F3F4F6]" />

          {/* Kpop Concerts */}
          <div className="bg-white px-4 py-5">
            <ConcertsList
              items={schedules
                .filter(s => ['concert', 'fan_meeting', 'festival'].includes(s.type))
                .filter(s => toKSTDateKey(s.startDate) >= todayKST)
                .filter((s, i, arr) => arr.findIndex(x => x.title === s.title && x.venue === s.venue) === i)
                .slice(0, 6)}
              onNavigate={navigateToPage}
              showCard={false}
            />
          </div>

          {/* Separator */}
          <div className="h-2 bg-[#F3F4F6]" />

          {/* More News */}
          <div className="bg-white py-5 px-4">
            <MoreNews category="kpop" storageKey="schedule_mobile" />
          </div>
        </main>
      </div>

      {/* ============ PC LAYOUT ============ */}
      <div className="hidden lg:block">
        <main className="pt-0 pb-16 bg-[#F8F9FA]">
          <div className="max-w-[1772px] mx-auto px-10 pt-8">
            <div className="flex flex-row gap-[60px]">
              {/* Left: Main Content */}
              <div className="flex-1 min-w-0 max-w-content">

                {/* Calendar Card */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-[30px] px-8 mb-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[26px] font-black" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                      <span className="text-ksp-accent">K-POP</span> <span style={{ color: '#101828' }}>Schedule</span>
                    </h2>
                    {/* Filter Tabs */}
                    <div className="flex gap-2">
                      {FILTER_TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
                          className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                            activeFilter === tab.key
                              ? 'bg-[#101828] text-white' : 'bg-[#F3F4F6] text-[#6A7282] hover:bg-[#E5E7EB]'
                          }`}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Month Navigator */}
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
                      <ChevronLeft size={20} className="text-[#6A7282]" />
                    </button>
                    <h3 className="text-[20px] font-bold text-[#101828] w-[200px] text-center">
                      {MONTH_NAMES[month - 1]} {year}
                    </h3>
                    <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
                      <ChevronRight size={20} className="text-[#6A7282]" />
                    </button>
                  </div>

                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                      <div key={d} className={`text-center text-[12px] font-semibold py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[#98A2B3]'}`}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((cell, i) => {
                      const isToday = cell.dateKey === todayKST;
                      const isSelected = cell.dateKey === selectedDate;
                      const hasEvents = cell.events && cell.events.length > 0;
                      const dayIdx = i % 7;

                      return (
                        <div key={i}
                          onClick={() => cell.current && cell.dateKey && setSelectedDate(cell.dateKey)}
                          className={`flex flex-col items-center py-2.5 cursor-pointer transition-all rounded-xl min-h-[72px]
                            ${!cell.current ? 'opacity-20 cursor-default' : ''}
                            ${isSelected ? 'bg-[#101828] shadow-md' : isToday && !isSelected ? 'bg-pink-50' : cell.current ? 'hover:bg-[#F9FAFB]' : ''}
                          `}>
                          <span className={`text-[14px] font-semibold leading-none ${
                            isSelected ? 'text-white' : isToday ? 'text-ksp-accent font-bold' : dayIdx === 0 ? 'text-red-400' : dayIdx === 6 ? 'text-blue-400' : 'text-[#344054]'
                          }`}>
                            {cell.day}
                          </span>
                          {hasEvents && (
                            <div className="flex flex-wrap justify-center gap-[3px] mt-2 max-w-[44px]">
                              {cell.events.slice(0, 4).map((e, j) => (
                                <div key={j} className="w-[6px] h-[6px] rounded-full" style={{
                                  backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : (TYPE_COLORS[e.type]?.dot || '#9CA3AF')
                                }} />
                              ))}
                            </div>
                          )}
                          {hasEvents && cell.events.length > 4 && (
                            <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-gray-400' : 'text-[#98A2B3]'}`}>+{cell.events.length - 4}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Date Events (below calendar) */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-[30px] px-8">
                  <h3 className="text-[21px] lg:text-[26px] font-black mb-4" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    <span className="text-ksp-accent">Today&apos;s</span> <span style={{ color: '#101828' }}>Schedule</span>
                    {selectedDate && (
                      <span className="text-[16px] text-[#98A2B3] font-normal ml-2">{selectedDateLabel} · {selectedEvents.length} events</span>
                    )}
                  </h3>
                  {selectedDate && selectedEvents.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedEvents.map(s => <ScheduleCard key={s._id} schedule={{...s, onNavigate: navigateToPage}} />)}
                    </div>
                  ) : selectedDate ? (
                    <p className="text-center py-8 text-[#98A2B3]">No events on this date</p>
                  ) : (
                    <p className="text-center py-8 text-[#98A2B3]">Select a date from the calendar</p>
                  )}
                </div>

                {/* More News */}
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-[30px] px-8 mt-8">
                  <MoreNews category="kpop" storageKey="schedule_pc" />
                </div>
              </div>

              {/* Right: Sidebar (500px) */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    {/* Upcoming Comebacks */}
                    <UpcomingComebacks
                      items={schedules
                        .filter(s => ['comeback', 'debut', 'release'].includes(s.type))
                        .filter(s => toKSTDateKey(s.startDate) >= todayKST)
                        .filter(s => s.imageUrl || s.ogImage)
                        .filter((s, i, arr) => arr.findIndex(x => x.artistName === s.artistName && x.albumName === s.albumName) === i)
                        .slice(0, 5)}
                      onNavigate={navigateToPage}
                    />

                    {/* Kpop Concerts Schedule */}
                    <ConcertsList
                      items={schedules
                        .filter(s => ['concert', 'fan_meeting', 'festival'].includes(s.type))
                        .filter(s => toKSTDateKey(s.startDate) >= todayKST)
                        .filter((s, i, arr) => arr.findIndex(x => x.title === s.title && x.venue === s.venue) === i)
                        .slice(0, 6)}
                      onNavigate={navigateToPage}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps({ query }) {
  const { dbConnect } = await import('../utils/mongodb');
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = parseInt(query.year) || kstNow.getUTCFullYear();
  const month = parseInt(query.month) || kstNow.getUTCMonth() + 1;

  try {
    const { db } = await dbConnect();
    const kstStart = new Date(Date.UTC(year, month - 1, 1, -9));
    const kstEnd = new Date(Date.UTC(year, month, 1, -9));

    const kstStartStr = kstStart.toISOString();
    const kstEndStr = kstEnd.toISOString();
    const schedules = await db.collection('schedules')
      .find({
        status: { $ne: 'hidden' },
        $or: [
          { startDate: { $gte: kstStart, $lt: kstEnd } },
          { dates: { $elemMatch: { $gte: kstStartStr, $lt: kstEndStr } } }
        ]
      })
      .sort({ startDate: 1 })
      .batchSize(100)
      .limit(2000)
      .toArray();

    return {
      props: {
        initialSchedules: JSON.parse(JSON.stringify(schedules)),
        initialYear: year,
        initialMonth: month
      }
    };
  } catch(e) {
    console.error('[Schedule SSR] Error:', e.message);
    return { props: { initialSchedules: [], initialYear: year, initialMonth: month } };
  }
}
