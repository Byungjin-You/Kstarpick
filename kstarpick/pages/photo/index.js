import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/MainLayout';
import Seo from '../../components/Seo';
import { connectToDatabase } from '../../utils/mongodb';
import { PHOTO_CATEGORIES } from '../../lib/crawlers/youtube-channels';
import CommentTicker from '../../components/home/CommentTicker';
import TrendingNow from '../../components/home/TrendingNow';

// 카테고리 카드 (네이버 포토 스타일)
function CategoryCard({ category, onClick }) {
  const { label, count, coverPhoto, previews } = category;

  return (
    <div className="cursor-pointer group w-full lg:max-w-[353px]" onClick={() => onClick(category.key)}>
      {/* 카드: 정사각형 353px, 이미지 위에 카테고리 정보 오버레이 */}
      <div className="relative overflow-hidden rounded-[14px] w-full" style={{ aspectRatio: '1 / 1' }}>
        {/* 배경 이미지 */}
        {/* Shorts 썸네일 중앙 크롭: 16:9 이미지에서 가운데 세로 영역만 확대 */}
        <img
          src={coverPhoto?.coverImage || '/images/placeholder.jpg'}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.6]"
          style={{ transform: 'scale(1.5)', transformOrigin: 'center center' }}
          onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
        />

        {/* 하단 그라데이션 — 네이버 동일 (355deg, 하단 불투명 → 상단 투명) */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(355deg, rgba(40,40,45,0.85) 3%, rgba(40,40,45,0.85) 21%, rgba(40,40,45,0) 77%, rgba(40,40,45,0) 95%)',
        }} />

        {/* 카테고리 정보 — 이미지 바깥 아래 영역 (네이버: 이미지 밖) */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          {/* 카테고리명 */}
          <h3 className="text-white font-bold leading-[1.3]"
            style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '22px' }}>
            {label}
          </h3>
          {/* 포토수 + 미리보기 — 한 줄 */}
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-white/70 font-medium" style={{ fontFamily: 'Pretendard, sans-serif', fontSize: '13px' }}>
              {count.toLocaleString()} photos
            </span>
            {/* 미리보기 겹침 — 오른쪽이 최신(N뱃지) */}
            {previews && previews.length > 0 && (
              <div className="flex items-center">
                {[...previews].reverse().slice(0, 2).map((p, i, arr) => {
                  const isNewest = i === arr.length - 1;
                  const size = isNewest ? 34 : 28;
                  return (
                    <div key={p._id || i} className="relative"
                      style={{ marginRight: isNewest ? 0 : '-14px', zIndex: i }}>
                      <div className="rounded-[4px] overflow-hidden"
                        style={{ width: `${size}px`, height: `${size}px` }}>
                        <img
                          src={p.coverImage || '/images/placeholder.jpg'}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ transform: 'scale(1.5)', transformOrigin: 'center center' }}
                          onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                        />
                      </div>
                      {isNewest && (
                        <span className="absolute -top-1.5 -right-1.5 z-10">
                          <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="8" r="7.5" fill="#F4361E"/>
                            <path d="M5.3 10.75v.1h1.22V6.94l3.36 3.88.03.03h1.09v-5.7H9.8v3.92l-3.36-3.88-.03-.04H5.3v5.6z" fill="#fff" stroke="#fff" strokeWidth="0.2"/>
                          </svg>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PhotoPage({ categoryData, recentComments, trendingNews, editorsPickNews, rankingNews }) {
  const router = useRouter();
  const sidebarRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  // _app.js의 pageScrollConfig에 등록되어 스크롤 저장/복원 자동 처리됨

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
  }, []);

  const navigateToPage = (path) => router.push(path);

  const handleCategoryClick = (key) => {
    router.push(`/photo/category/${key}`);
  };

  return (
    <MainLayout>
      <Seo
        title="K-Pop Photo — Latest Idol Photos & Moments"
        description="Browse the latest K-Pop idol photos from music shows, airport fashion, fan meetings, events, and more."
        url="/photo"
        type="website"
      />

      {/* ============ MOBILE ============ */}
      <div className="lg:hidden">
        <main className="pb-16 bg-white">
          {/* Header — 드라마 메뉴와 동일 간격 */}
          <div className="px-4 pt-5 pb-0">
            <h2 className="font-bold text-[20px] leading-[1.4] text-[#101828]" style={{ fontFamily: 'Inter' }}>
              <span className="text-ksp-accent">K-POP</span> Photo
            </h2>
          </div>

          {/* 카테고리 그리드 — 1열 (네이버 스타일) */}
          <div className="flex flex-col gap-5 px-4 pt-4">
            {(categoryData || []).map(cat => (
              <CategoryCard key={cat.key} category={cat} onClick={handleCategoryClick} />
            ))}
          </div>

          {categoryData?.length === 0 && (
            <div className="text-center py-16 text-[#98A2B3]">No photos yet</div>
          )}
        </main>
      </div>

      {/* ============ PC (드라마 메뉴와 동일 레이아웃) ============ */}
      <div className="hidden lg:block">
        <main className="pt-0 pb-16 bg-[#F8F9FA]">
          <div className="max-w-[1772px] mx-auto px-10 pt-8">
            <div className="flex flex-row gap-[60px]">
              {/* Left: Main Content */}
              <div className="flex-1 min-w-0">
                <div className="bg-white border-[1.5px] border-ksp-border rounded-xl py-8 px-6 mb-8">
                  <div className="flex items-center justify-between mb-7">
                    <h2 className="text-[26px] font-black" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <span className="text-ksp-accent">K-POP</span>{' '}
                      <span className="text-[#101828]">Photo</span>
                    </h2>
                  </div>

                  {/* 카테고리 그리드 — 3열 */}
                  <div className="grid grid-cols-3 gap-6">
                    {(categoryData || []).map(cat => (
                      <CategoryCard key={cat.key} category={cat} onClick={handleCategoryClick} />
                    ))}
                  </div>

                  {categoryData?.length === 0 && (
                    <div className="text-center py-20 text-[#98A2B3] text-lg">No photos yet</div>
                  )}
                </div>
              </div>

              {/* Right: Sidebar (500px) */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    <CommentTicker comments={recentComments || []} onNavigate={navigateToPage} />
                    <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews || []} onNavigate={navigateToPage} />

                    {/* Editor's PICK */}
                    {(editorsPickNews.length > 0 || (rankingNews && rankingNews.length > 0)) && (
                      <div>
                        <h3 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-4 pl-1">Editor&apos;s <span className="text-ksp-accent">PICK</span></h3>
                        <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
                          {(editorsPickNews.length > 0 ? editorsPickNews : rankingNews).slice(0, 6).map((item) => (
                            <div
                              key={item._id}
                              className="flex gap-4 cursor-pointer group"
                              onClick={() => navigateToPage(`/news/${item.slug || item._id}`)}
                            >
                              <div className="flex-shrink-0 w-[140px] h-[90px] rounded overflow-hidden">
                                <img
                                  src={item.coverImage || item.thumbnailUrl || '/images/placeholder.jpg'}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                                />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block px-1.5 py-0.5 bg-ksp-accent text-white text-[10px] font-bold uppercase tracking-wider rounded">
                                    {item.category === 'kpop' ? 'K-POP' : item.category === 'drama' ? 'DRAMA' : item.category === 'movie' ? 'FILM' : item.category === 'celeb' ? 'CELEB' : 'NEWS'}
                                  </span>
                                </div>
                                <h4 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2">
                                  {item.title}
                                </h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

export async function getServerSideProps({ req, res }) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    const { db } = await connectToDatabase();

    // 카테고리별 데이터 집계
    const categoryData = [];
    for (const cat of PHOTO_CATEGORIES) {
      // 해당 카테고리 태그에 매칭되는 photo 기사 수
      const query = { contentType: 'photo', status: 'published', tags: { $in: cat.tags } };
      const count = await db.collection('news').countDocuments(query);

      if (count === 0) continue;

      // 대표 이미지 (가장 최근)
      const coverPhoto = await db.collection('news')
        .findOne(query, { sort: { publishedAt: -1, createdAt: -1 }, projection: { coverImage: 1, title: 1 } });

      // 최신 사진 미리보기 4개
      const previews = await db.collection('news')
        .find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(4)
        .project({ coverImage: 1, _id: 1 })
        .toArray();

      categoryData.push({
        key: cat.key,
        label: cat.label,
        count,
        coverPhoto: JSON.parse(JSON.stringify(coverPhoto)),
        previews: JSON.parse(JSON.stringify(previews)),
      });
    }

    // count 많은 순으로 정렬
    categoryData.sort((a, b) => b.count - a.count);

    // 사이드바: music 메뉴와 동일한 API 호출 방식
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${req.headers.host}`;

    const [commentsRes, trendingRes, editorsPickRes, rankingRes] = await Promise.all([
      fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${baseUrl}/api/news/trending?limit=5`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${baseUrl}/api/news/editors-pick?limit=6`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${baseUrl}/api/news?limit=10&sort=viewCount`).catch(() => ({ json: () => ({ success: false }) })),
    ]);

    const [commentsData, trendingData, editorsPickData, rankingData] = await Promise.all([
      commentsRes.json(), trendingRes.json(), editorsPickRes.json(), rankingRes.json(),
    ]);

    const recentComments = commentsData?.success ? (commentsData.data?.slice(0, 10) || []) : [];
    const trendingNews = trendingData?.success ? (trendingData.data || []).slice(0, 5) : [];
    const editorsPickNews = editorsPickData?.success ? (editorsPickData.data || []) : [];
    const rankingNews = rankingData?.success ? (rankingData.data?.news || []) : [];

    return {
      props: {
        categoryData,
        recentComments: JSON.parse(JSON.stringify(recentComments)),
        trendingNews: JSON.parse(JSON.stringify(trendingNews)),
        editorsPickNews: JSON.parse(JSON.stringify(editorsPickNews)),
        rankingNews: JSON.parse(JSON.stringify(rankingNews)),
      },
    };
  } catch (e) {
    console.error('[Photo SSR]', e);
    return { props: { categoryData: [], recentComments: [], trendingNews: [], editorsPickNews: [], rankingNews: [] } };
  }
}
