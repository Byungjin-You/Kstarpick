import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Calendar, Plus, RefreshCw, Trash2, CheckCircle, Search, ChevronLeft, ChevronRight, ExternalLink, Clock, History } from 'lucide-react';
import AdminLayout from '../../../components/AdminLayout';

const TYPE_COLORS = {
  release: 'bg-pink-100 text-pink-800',
  comeback: 'bg-purple-100 text-purple-800',
  debut: 'bg-blue-100 text-blue-800',
  teaser: 'bg-yellow-100 text-yellow-800',
  concept_photo: 'bg-orange-100 text-orange-800',
  mv: 'bg-red-100 text-red-800',
  tracklist: 'bg-indigo-100 text-indigo-800',
  highlight_medley: 'bg-teal-100 text-teal-800',
  birthday: 'bg-green-100 text-green-800',
  anniversary: 'bg-emerald-100 text-emerald-800',
  pre_release: 'bg-cyan-100 text-cyan-800',
  concert: 'bg-fuchsia-100 text-fuchsia-800',
  fan_meeting: 'bg-lime-100 text-lime-800',
  festival: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800'
};

const SOURCE_COLORS = {
  blip: 'bg-violet-100 text-violet-700',
  kpopschedule: 'bg-sky-100 text-sky-700',
  kprofiles: 'bg-amber-100 text-amber-700',
  kpopofficial: 'bg-rose-100 text-rose-700',
  'kpopofficial-concerts': 'bg-fuchsia-100 text-fuchsia-700',
  manual: 'bg-gray-100 text-gray-700'
};

const TYPE_LABELS = {
  release: '발매', comeback: '컴백', debut: '데뷔', teaser: '티저',
  concept_photo: '컨셉포토', mv: 'MV', tracklist: '트랙리스트',
  highlight_medley: '하이라이트', birthday: '생일', anniversary: '기념일',
  pre_release: '프리릴리즈', concert: '콘서트', fan_meeting: '팬미팅', festival: '페스티벌', other: '기타'
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
  return `${h < 12 ? '오전' : '오후'} ${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')}`;
};

const getTodayKST = () => {
  const now = new Date();
  now.setHours(now.getHours() + 9);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
};

const formatDateLabel = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const today = getTodayKST();
  const tomorrow = (() => {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  })();

  let label = `${m}월 ${d}일 (${days[dt.getDay()]})`;
  if (dateStr === today) label = `🔴 오늘 — ${label}`;
  else if (dateStr === tomorrow) label = `내일 — ${label}`;
  return label;
};

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return parseInt(sessionStorage.getItem('schedule_currentPage') || '1');
  });
  const [totalPages, setTotalPages] = useState(1);

  // 필터 상태를 sessionStorage에서 복원
  const getStored = (key, fallback) => {
    if (typeof window === 'undefined') return fallback;
    return sessionStorage.getItem(`schedule_${key}`) || fallback;
  };

  const [viewMode, setViewMode] = useState(() => getStored('viewMode', 'upcoming'));
  const [filterType, setFilterType] = useState(() => getStored('filterType', ''));
  const [filterSource, setFilterSource] = useState(() => getStored('filterSource', ''));
  const [filterMonth, setFilterMonth] = useState(() => {
    const stored = getStored('filterMonth', '');
    if (stored) return stored;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState(() => getStored('searchQuery', ''));

  // 필터 변경 시 sessionStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('schedule_viewMode', viewMode);
    sessionStorage.setItem('schedule_filterType', filterType);
    sessionStorage.setItem('schedule_filterSource', filterSource);
    sessionStorage.setItem('schedule_filterMonth', filterMonth);
    sessionStorage.setItem('schedule_searchQuery', searchQuery);
    sessionStorage.setItem('schedule_currentPage', String(currentPage));
  }, [viewMode, filterType, filterSource, filterMonth, searchQuery, currentPage]);

  // Crawl options
  const [crawlSources, setCrawlSources] = useState(['blip', 'kprofiles', 'kpopofficial', 'kpopofficial-concerts']);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 100 });
      if (viewMode === 'upcoming') {
        params.set('upcoming', 'true');
      } else {
        params.set('month', filterMonth);
      }
      if (filterType) params.set('type', filterType);
      if (filterSource) params.set('source', filterSource);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/schedules?${params}`);
      const data = await res.json();
      if (data.success) {
        setSchedules(data.schedules);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
      }
    } catch(e) {
      console.error('Fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSchedules(); }, [currentPage, filterType, filterSource, filterMonth, viewMode]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSchedules();
  };

  const handleCrawl = async () => {
    if (crawling) return;
    setCrawling(true);
    setCrawlResult(null);
    try {
      const [y, m] = filterMonth.split('-').map(Number);
      const res = await fetch('/api/schedules/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: crawlSources, year: y, month: m })
      });
      const data = await res.json();
      setCrawlResult(data);
      fetchSchedules();
    } catch(e) {
      setCrawlResult({ error: e.message });
    }
    setCrawling(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
    fetchSchedules();
  };

  const handleVerify = async (id, current) => {
    await fetch(`/api/schedules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVerified: !current })
    });
    setSchedules(prev => prev.map(s => s._id === id ? { ...s, isVerified: !current } : s));
  };

  const changeMonth = (delta) => {
    const [y, m] = filterMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setCurrentPage(1);
  };

  // Group schedules by date (KST)
  const groupedByDate = {};
  schedules.forEach(s => {
    const dateKey = toKSTDateKey(s.startDate);
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(s);
  });

  const todayKST = getTodayKST();
  const [y, m] = filterMonth.split('-').map(Number);
  const monthLabel = `${y}년 ${m}월`;

  // Stats
  const todayCount = groupedByDate[todayKST]?.length || 0;
  const releaseCount = schedules.filter(s => ['release', 'comeback', 'debut'].includes(s.type)).length;

  return (
    <AdminLayout>
      <Head><title>스케줄 관리 | KstarPick Admin</title></Head>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="text-pink-500" /> K-POP 스케줄 관리
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              총 {totalItems}개 {viewMode === 'upcoming' && todayCount > 0 && `· 오늘 ${todayCount}건`}
              {viewMode === 'upcoming' && ` · 발매/컴백/데뷔 ${releaseCount}건`}
            </p>
          </div>
          <Link href="/admin/schedules/new"
            className="inline-flex items-center gap-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm">
            <Plus size={16} /> 수동 추가
          </Link>
        </div>

        {/* Crawl Section */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 border">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">크롤링:</span>
              {['blip', 'kprofiles', 'kpopofficial', 'kpopofficial-concerts'].map(src => (
                <label key={src} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={crawlSources.includes(src)}
                    onChange={(e) => {
                      if (e.target.checked) setCrawlSources([...crawlSources, src]);
                      else setCrawlSources(crawlSources.filter(s => s !== src));
                    }} className="rounded" />
                  <span className={`px-2 py-0.5 rounded text-xs ${SOURCE_COLORS[src]}`}>{src}</span>
                </label>
              ))}
            </div>
            <button onClick={handleCrawl} disabled={crawling || crawlSources.length === 0}
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm">
              <RefreshCw size={16} className={crawling ? 'animate-spin' : ''} />
              {crawling ? '크롤링 중...' : '크롤링 시작'}
            </button>
          </div>
          {crawlResult && (
            <div className="mt-3 p-3 bg-white rounded-lg border text-sm">
              {crawlResult.error ? (
                <p className="text-red-500">에러: {crawlResult.error}</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium text-green-600">크롤링 완료! (DB 총 {crawlResult.totalCount}건)</p>
                  {Object.entries(crawlResult.results || {}).map(([src, r]) => (
                    <p key={src} className="text-gray-600">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${SOURCE_COLORS[src]}`}>{src}</span>
                      {r.error ? ` 에러: ${r.error}` : ` → ${r.total}개 파싱, ${r.inserted}개 신규, ${r.updated}개 업데이트${r.details ? `, ${r.details}개 상세` : ''}`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* View Mode Toggle + Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          {/* View Mode */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => { setViewMode('upcoming'); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'upcoming' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>
              <Clock size={14} /> 오늘 + 다가오는
            </button>
            <button onClick={() => { setViewMode('past'); setCurrentPage(1); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition ${viewMode === 'past' ? 'bg-white shadow text-gray-700' : 'text-gray-500'}`}>
              <History size={14} /> 지난 일정
            </button>
          </div>

          {/* Month Navigator (past mode only) */}
          {viewMode === 'past' && (
            <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={18} /></button>
              <span className="text-sm font-medium w-24 text-center">{monthLabel}</span>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={18} /></button>
            </div>
          )}

          <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">전체 타입</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setCurrentPage(1); }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white">
            <option value="">전체 소스</option>
            <option value="blip">blip</option>
            <option value="kprofiles">kprofiles</option>
            <option value="kpopofficial">kpopofficial</option>
          </select>

          <form onSubmit={handleSearch} className="flex gap-1 flex-1">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="아티스트 / 제목 검색" className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-0" />
            <button type="submit" className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"><Search size={18} /></button>
          </form>
        </div>

        {/* Schedule List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : Object.keys(groupedByDate).length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {viewMode === 'upcoming' ? '다가오는 스케줄이 없습니다. 크롤링을 실행해보세요.' : '해당 월에 스케줄이 없습니다.'}
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, items]) => {
              const isToday = dateKey === todayKST;
              return (
                <div key={dateKey}>
                  <div className={`sticky top-0 z-10 py-1.5 mb-2 ${isToday ? 'bg-pink-50 border-b-2 border-pink-300 px-2 -mx-2 rounded' : 'bg-white border-b-2 border-gray-200'}`}>
                    <h3 className={`text-sm font-bold ${isToday ? 'text-pink-700' : 'text-gray-700'}`}>
                      {formatDateLabel(dateKey)} <span className="text-gray-400 font-normal">({items.length})</span>
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {items.map(s => (
                      <Link key={s._id} href={`/admin/schedules/edit/${s._id}`}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 group text-sm cursor-pointer ${isToday ? 'bg-white border-pink-100' : 'bg-white'}`}>
                        {/* Type badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${TYPE_COLORS[s.type] || TYPE_COLORS.other}`}>
                          {TYPE_LABELS[s.type] || s.type}
                        </span>

                        {/* Image */}
                        {s.imageUrl && (
                          <img src={s.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0 truncate">
                          {s.artistName ? (
                            <>
                              <span className="font-medium text-gray-900">{s.artistName}</span>
                              {s.title && s.title !== s.artistName && (
                                <span className="text-gray-500"> — {s.title.replace(s.artistName, '').replace(/^\s*-\s*/, '').trim() || s.title}</span>
                              )}
                            </>
                          ) : (
                            <span className="font-medium text-gray-900">{s.title}</span>
                          )}
                        </div>

                        {/* Time */}
                        {toKSTTime(s.startDate) && (
                          <span className="text-xs text-gray-400 whitespace-nowrap">{toKSTTime(s.startDate)}</span>
                        )}

                        {/* Source */}
                        <span className={`px-1.5 py-0.5 rounded text-xs hidden md:inline ${SOURCE_COLORS[s.source] || 'bg-gray-100'}`}>
                          {s.source}
                        </span>

                        {/* Verified */}
                        <span onClick={(e) => { e.preventDefault(); handleVerify(s._id, s.isVerified); }}
                          className={`p-1 rounded ${s.isVerified ? 'text-green-500' : 'text-gray-300 hover:text-green-400'}`}
                          title={s.isVerified ? '검증됨' : '미검증'}>
                          <CheckCircle size={16} />
                        </span>

                        {/* Delete */}
                        <span onClick={(e) => { e.preventDefault(); handleDelete(s._id); }}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-30">이전</button>
            <span className="text-sm text-gray-500">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-30">다음</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
