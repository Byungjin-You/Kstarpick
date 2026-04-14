import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../components/MainLayout';
import Seo from '../../../components/Seo';
import { connectToDatabase } from '../../../utils/mongodb';
import { PHOTO_CATEGORIES } from '../../../lib/crawlers/youtube-channels';

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PhotoViewer({ photos, categoryKey, categoryLabel }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);
  const tabRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // 뒤로가기 시 currentIndex 복원
  useEffect(() => {
    const isBack = sessionStorage.getItem('_navWasBack') === 'true';
    if (isBack) {
      const savedIndex = parseInt(sessionStorage.getItem('photo_currentIndex'));
      const savedKey = sessionStorage.getItem('photo_categoryKey');
      if (savedKey === categoryKey && !isNaN(savedIndex) && savedIndex < photos.length) {
        setCurrentIndex(savedIndex);
      }
    }
    setMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 상태 변경 시 sessionStorage에 저장
  useEffect(() => {
    if (!mounted) return;
    sessionStorage.setItem('photo_currentIndex', String(currentIndex));
    sessionStorage.setItem('photo_categoryKey', categoryKey);
  }, [currentIndex, categoryKey, mounted]);

  // 카테고리 탭 현재 항목으로 스크롤
  useEffect(() => {
    if (tabRef.current) {
      const activeTab = tabRef.current.querySelector('[data-active="true"]');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [categoryKey]);

  // 스와이프 감지
  const touchStartX = useRef(0);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < photos.length - 1) setCurrentIndex(prev => prev + 1);
      if (diff < 0 && currentIndex > 0) setCurrentIndex(prev => prev - 1);
    }
  };

  const currentPhoto = photos[currentIndex];

  return (
    <MainLayout>
      <Seo
        title={`${categoryLabel} — K-Pop Photo`}
        description={`Browse ${categoryLabel} photos of K-Pop idols on KstarPick.`}
        url={`/photo/category/${categoryKey}`}
      />

      {/* 모바일: Footer 숨김 */}
      <style jsx global>{`
        @media (max-width: 1023px) {
          footer { display: none !important; }
          body { overflow: hidden !important; }
        }
      `}</style>

      {/* ============ MOBILE — 풀스크린 뷰어 (네이버 포토 동일) ============ */}
      <div className="lg:hidden">
        <main className="bg-white" style={{ height: 'calc(100vh - 48px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* 카테고리 탭 — 랭킹 메뉴 스타일 */}
          <div ref={tabRef} className="overflow-x-auto scrollbar-hide" style={{ padding: '10px 16px' }}>
            <div className="flex gap-[6px] min-w-max">
              {PHOTO_CATEGORIES.map(cat => {
                const isActive = cat.key === categoryKey;
                return (
                  <button
                    key={cat.key}
                    data-active={isActive ? 'true' : 'false'}
                    onClick={() => router.push(`/photo/category/${cat.key}`)}
                    className="flex items-center rounded-full whitespace-nowrap"
                    style={{
                      padding: '0 15px',
                      height: isActive ? '30px' : '31.5px',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      fontSize: '10.5px',
                      lineHeight: '1.43em',
                      letterSpacing: '-0.0107em',
                      color: isActive ? '#FFFFFF' : '#4A5565',
                      ...(isActive
                        ? { background: '#155DFC', boxShadow: '0px 3px 4.5px -3px rgba(0,0,0,0.1), 0px 7.5px 11.25px -2.25px rgba(0,0,0,0.1)' }
                        : { background: '#FFFFFF', border: '0.75px solid #D1D5DC' }
                      ),
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 포토 뷰어 — 남은 공간에 여백으로 센터링 */}
          {photos.length > 0 ? (
            <div
              className="flex-1 min-h-0 flex flex-col justify-start pt-2 px-4"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={() => router.push(`/news/${currentPhoto.slug || currentPhoto._id}`)}
            >
              {/* 이미지 — 3:4 고정 비율 */}
              <div className="relative rounded-card overflow-hidden bg-[#F3F4F6]" style={{ aspectRatio: '4 / 4.5' }}>
                <img
                  src={currentPhoto.coverImage || '/images/placeholder.jpg'}
                  alt={currentPhoto.title}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  style={{ transform: 'scale(1.5)', transformOrigin: 'center center' }}
                  onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                />
              </div>

              {/* 제목 + 날짜 — MoreNews 동일 */}
              <div className="pt-8">
                <h2
                  className="font-bold text-lg leading-[1.375] text-[#101828] line-clamp-2 mb-1"
                  style={{ letterSpacing: '-0.0244em' }}
                >
                  {currentPhoto.title}
                </h2>
                <span className="text-xs text-ksp-meta">
                  {getTimeAgo(currentPhoto.publishedAt || currentPhoto.createdAt)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#98A2B3]">No photos in this category</div>
          )}
        </main>
      </div>

      {/* ============ PC ============ */}
      <div className="hidden lg:block">
        <main className="pt-0 pb-16 bg-[#F8F9FA]">
          <div className="max-w-[1772px] mx-auto px-10 pt-8">
            {/* 카테고리 탭 */}
            <div className="bg-white border-[1.5px] border-ksp-border rounded-xl px-6 py-4 mb-6">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {PHOTO_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => router.push(`/photo/category/${cat.key}`)}
                    className={`px-4 py-2 rounded-full text-[14px] whitespace-nowrap transition-colors ${
                      cat.key === categoryKey
                        ? 'bg-[#101828] text-white font-bold'
                        : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] font-medium'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 포토 그리드 */}
            <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-8 px-6">
              <h2 className="text-[22px] font-bold text-[#101828] mb-6" style={{ fontFamily: 'Inter' }}>
                {categoryLabel}
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {photos.map(photo => (
                  <div
                    key={photo._id}
                    className="cursor-pointer group"
                    onClick={() => router.push(`/news/${photo.slug || photo._id}`)}
                  >
                    <div className="relative rounded-card overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
                      <img
                        src={photo.coverImage || '/images/placeholder.jpg'}
                        alt={photo.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        style={{ transform: 'scale(1.5)', transformOrigin: 'center center' }}
                        onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                      />
                    </div>
                    <div className="pt-2">
                      <h3 className="font-bold text-lg leading-[1.375] text-[#101828] line-clamp-2 mb-2" style={{ letterSpacing: '-0.0244em' }}>{photo.title}</h3>
                      <span className="text-xs text-ksp-meta">{getTimeAgo(photo.publishedAt || photo.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {photos.length === 0 && (
                <div className="text-center py-20 text-[#98A2B3]">No photos in this category</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps({ params, res }) {
  const { key } = params;
  const catConfig = PHOTO_CATEGORIES.find(c => c.key === key);
  if (!catConfig) return { notFound: true };

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    const { db } = await connectToDatabase();
    const query = { contentType: 'photo', status: 'published', tags: { $in: catConfig.tags } };

    const photos = await db.collection('news')
      .find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(30)
      .project({ title: 1, slug: 1, coverImage: 1, tags: 1, createdAt: 1, publishedAt: 1 })
      .toArray();

    return {
      props: {
        photos: JSON.parse(JSON.stringify(photos)),
        categoryLabel: catConfig.label,
        categoryKey: key,
      },
    };
  } catch (e) {
    console.error('[Photo Viewer SSR]', e);
    return { props: { photos: [], categoryLabel: catConfig.label, categoryKey: key } };
  }
}
