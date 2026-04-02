import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '../../../../components/AdminLayout';

const TYPES = [
  { value: 'release', label: '발매' }, { value: 'comeback', label: '컴백' },
  { value: 'debut', label: '데뷔' }, { value: 'teaser', label: '티저' },
  { value: 'concept_photo', label: '컨셉포토' }, { value: 'mv', label: 'MV' },
  { value: 'birthday', label: '생일' }, { value: 'anniversary', label: '기념일' },
  { value: 'tracklist', label: '트랙리스트' }, { value: 'highlight_medley', label: '하이라이트' },
  { value: 'pre_release', label: '프리릴리즈' }, { value: 'other', label: '기타' },
];

export default function EditSchedule() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/schedules/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const s = data.schedule;
          setForm({
            ...s,
            startDate: s.startDate ? new Date(s.startDate).toISOString().substring(0, 10) : ''
          });
        }
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          artistName: form.artistName,
          type: form.type,
          startDate: form.startDate,
          albumName: form.albumName,
          description: form.description,
          imageUrl: form.imageUrl,
          isVerified: form.isVerified,
          status: form.status
        })
      });
      const data = await res.json();
      if (data.success) router.push('/admin/schedules');
      else alert('저장 실패');
    } catch(e) {
      alert('에러: ' + e.message);
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout><div className="p-6 text-center text-gray-400">로딩 중...</div></AdminLayout>;
  if (!form) return <AdminLayout><div className="p-6 text-center text-red-500">스케줄을 찾을 수 없습니다.</div></AdminLayout>;

  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <AdminLayout>
      <Head><title>스케줄 수정 | KstarPick Admin</title></Head>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Link href="/admin/schedules" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft size={16} /> 목록으로
        </Link>
        <h1 className="text-xl font-bold mb-6">스케줄 수정</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 items-center text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            <span>소스: <b>{form.source}</b></span>
            <span>ID: {form.sourceId}</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">아티스트</label>
            <input type="text" value={form.artistName || ''} onChange={e => update('artistName', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">제목</label>
            <input type="text" value={form.title || ''} onChange={e => update('title', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">타입</label>
              <select value={form.type || ''} onChange={e => update('type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">날짜</label>
              <input type="date" value={form.startDate || ''} onChange={e => update('startDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">앨범명</label>
            <input type="text" value={form.albumName || ''} onChange={e => update('albumName', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea value={form.description || ''} onChange={e => update('description', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">이미지 URL</label>
            <input type="text" value={form.imageUrl || ''} onChange={e => update('imageUrl', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isVerified || false} onChange={e => update('isVerified', e.target.checked)} />
              검증됨
            </label>
            <select value={form.status || 'active'} onChange={e => update('status', e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 text-sm font-medium">
            {saving ? '저장 중...' : '저장'}
          </button>
        </form>

        {/* 상세 데이터 (top-level 필드 기반) */}
        {(form.titleSong || form.tracklist || form.youtubeUrls || form.images || form.buyLinks || form.albumFull || form.officialLinks || form.venue || form.totalDates || form.ticketingPlatform || form.eventName) && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-bold text-blue-800 mb-3">상세 데이터</h3>

            {form.albumFull && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">앨범:</span> {form.albumFull}</p>
            )}
            {form.titleSong && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">타이틀곡:</span> {form.titleSong}</p>
            )}
            {form.releaseDateKST && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">발매일:</span> {form.releaseDateKST}</p>
            )}
            {form.label && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">레이블:</span> {form.label}</p>
            )}
            {form.genre && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">장르:</span> {form.genre}</p>
            )}
            {form.groupName && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">그룹:</span> {form.groupName}</p>
            )}
            {form.country && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">국가:</span> {form.country}</p>
            )}

            {form.tracklist && form.tracklist.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">트랙리스트:</p>
                <ol className="list-decimal list-inside text-sm text-gray-600 pl-2">
                  {form.tracklist.map((t, i) => <li key={i}>{t}</li>)}
                </ol>
              </div>
            )}

            {form.youtubeUrls && form.youtubeUrls.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">MV / 티저:</p>
                {form.youtubeUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-xs text-red-500 hover:underline">{url}</a>
                ))}
              </div>
            )}

            {form.buyLinks && form.buyLinks.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">구매 링크:</p>
                <div className="flex gap-2 flex-wrap">
                  {form.buyLinks.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="px-2 py-1 bg-white border rounded text-xs text-blue-600 hover:bg-blue-50">{link.name}</a>
                  ))}
                </div>
              </div>
            )}

            {form.officialSource && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">공식 소스:</p>
                <p className="text-xs text-gray-600 whitespace-pre-line">{form.officialSource}</p>
              </div>
            )}
            {form.officialLinks && form.officialLinks.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">공식 링크:</p>
                <div className="flex gap-2 flex-wrap">
                  {form.officialLinks.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="px-2 py-1 bg-white border rounded text-xs text-blue-600 hover:bg-blue-50">{link.name}</a>
                  ))}
                </div>
              </div>
            )}

            {form.images && form.images.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">이미지:</p>
                <div className="flex gap-2 flex-wrap">
                  {form.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded border hover:opacity-80" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {form.ogImage && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">OG 이미지:</p>
                <a href={form.ogImage} target="_blank" rel="noopener noreferrer">
                  <img src={form.ogImage} alt="" className="w-32 h-32 object-cover rounded border hover:opacity-80" />
                </a>
              </div>
            )}

            {/* 콘서트/이벤트 전용 필드 */}
            {form.eventName && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">Event:</span> {form.eventName}</p>
            )}
            {form.venue && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">Venue:</span> {form.venue}</p>
            )}
            {form.location && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">Location:</span> {form.location}</p>
            )}
            {form.totalDates && form.totalDates.length > 0 && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">All Dates:</span> {form.totalDates.join(', ')}</p>
            )}
            {form.ticketingPlatform && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">Ticketing:</span> {form.ticketingPlatform}</p>
            )}
            {form.ticketingSchedule && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">Ticketing Schedule:</p>
                <p className="text-xs text-gray-600 whitespace-pre-line">{form.ticketingSchedule}</p>
              </div>
            )}
            {form.liveStreaming && (
              <p className="text-sm mb-1"><span className="font-medium text-gray-700">Live Streaming:</span> {form.liveStreaming}</p>
            )}
            {form.ticketPrice && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">Ticket Price:</p>
                <p className="text-xs text-gray-600 whitespace-pre-line">{form.ticketPrice}</p>
              </div>
            )}
            {form.ticketSalesSchedule && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">Ticket Sales Schedule:</p>
                <p className="text-xs text-gray-600 whitespace-pre-line">{form.ticketSalesSchedule}</p>
              </div>
            )}
            {form.buyTicketUrl && (
              <p className="text-sm mb-1">
                <span className="font-medium text-gray-700">Buy Ticket:</span>{' '}
                <a href={form.buyTicketUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">{form.buyTicketUrl}</a>
              </p>
            )}
            {form.promoter && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">Promoter:</p>
                <p className="text-xs text-gray-600">{form.promoter}</p>
                {form.promoterLinks?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-1">
                    {form.promoterLinks.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 bg-white border rounded text-xs text-blue-600 hover:bg-blue-50">{link.name}</a>
                    ))}
                  </div>
                )}
              </div>
            )}
            {form.lineup && (
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700 mb-1">Lineup:</p>
                <p className="text-xs text-gray-600">{form.lineup}</p>
              </div>
            )}

            {form.detailUrl && (
              <p className="text-sm mt-2"><a href={form.detailUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">원본 페이지 →</a></p>
            )}
          </div>
        )}

        {/* Raw Data */}
        {form.rawData && (
          <div className="mt-4">
            <button onClick={() => setShowRaw(!showRaw)} className="text-sm text-gray-400 hover:text-gray-600">
              {showRaw ? '원본 데이터 숨기기' : '원본 데이터 보기'} ▾
            </button>
            {showRaw && (
              <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-64 border">
                {JSON.stringify(form.rawData, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
