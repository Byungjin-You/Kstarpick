import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';

const TYPES = [
  { value: 'release', label: '발매' },
  { value: 'comeback', label: '컴백' },
  { value: 'debut', label: '데뷔' },
  { value: 'teaser', label: '티저' },
  { value: 'concept_photo', label: '컨셉포토' },
  { value: 'mv', label: 'MV' },
  { value: 'birthday', label: '생일' },
  { value: 'anniversary', label: '기념일' },
  { value: 'other', label: '기타' },
];

export default function NewSchedule() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', artistName: '', type: 'release', startDate: '',
    albumName: '', description: '', imageUrl: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.artistName || !form.startDate || !form.type) {
      alert('제목, 아티스트, 날짜, 타입은 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) router.push('/admin/schedules');
      else alert('저장 실패: ' + (data.error || ''));
    } catch(e) {
      alert('에러: ' + e.message);
    }
    setSaving(false);
  };

  const update = (field, value) => setForm({ ...form, [field]: value });

  return (
    <AdminLayout>
      <Head><title>스케줄 추가 | KstarPick Admin</title></Head>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Link href="/admin/schedules" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft size={16} /> 목록으로
        </Link>
        <h1 className="text-xl font-bold mb-6">스케줄 수동 추가</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">아티스트 *</label>
            <input type="text" value={form.artistName} onChange={e => update('artistName', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="BLACKPINK" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">제목 *</label>
            <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Born Pink - 2nd Album" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">타입 *</label>
              <select value={form.type} onChange={e => update('type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">날짜 *</label>
              <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">앨범명</label>
            <input type="text" value={form.albumName} onChange={e => update('albumName', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="앨범/싱글명" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">이미지 URL</label>
            <input type="text" value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 text-sm font-medium">
            {saving ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
