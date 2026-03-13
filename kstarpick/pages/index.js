import { useState, useEffect, useMemo, useRef } from 'react';
import React from 'react';
import { X } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import { useRouter } from 'next/router';
import Seo from '../components/Seo';
import StructuredData from '../components/StructuredData';
import { generateHomePageJsonLd } from '../utils/seoHelpers';
// New homepage components
import HeroSection from '../components/home/HeroSection';
import NewsCardGrid from '../components/home/NewsCardGrid';
import ArticleCardGrid from '../components/home/ArticleCardGrid';
import WatchNewsSection from '../components/home/WatchNewsSection';
import KpopRankingSection from '../components/home/KpopRankingSection';
import Sidebar from '../components/home/Sidebar';
import CommentTicker from '../components/home/CommentTicker';
import TrendingNow from '../components/home/TrendingNow';
import MoreNews from '../components/MoreNews';

function Home({ initialData }) {
  const router = useRouter();
  
  // 🚀 서버에서 받은 초기 데이터로 상태 초기화
  const [newsArticles, setNewsArticles] = useState(initialData?.newsArticles || []);
  const [featuredArticles, setFeaturedArticles] = useState(initialData?.featuredArticles || []);
  const recommendedNews = initialData?.recommendedNews || [];
  const [topSongs, setTopSongs] = useState(initialData?.topSongs || []);
  const watchNews = initialData?.watchNews || [];
  const rankingNews = initialData?.rankingNews || [];
  const trendingNews = initialData?.trendingNews || [];
  const editorsPickNews = initialData?.editorsPickNews || [];
  const moreNews = initialData?.moreNews || [];
  const [error, setError] = useState(null);

  
  // 기존 상태들
  const [loadedMoreNews, setLoadedMoreNews] = useState(false);
  const [initialMoreNews, setInitialMoreNews] = useState([]);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState('');

  // 사이드바 sticky top 계산 (사이드바가 뷰포트보다 길면 음수 top으로 하단 고정)
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);
  useEffect(() => {
    const el = sidebarStickyRef.current;
    if (!el) return;
    const HEADER_H = 92;

    const calcTop = () => {
      const sH = el.offsetHeight;
      const vH = window.innerHeight;
      if (sH <= vH - HEADER_H) {
        setSidebarStickyTop(HEADER_H);
      } else {
        // 사이드바 하단이 뷰포트 하단에 닿으면 고정
        setSidebarStickyTop(vH - sH - 40);
      }
    };

    // 초기 계산 + 사이드바 높이 변화 감지
    const timer = setTimeout(calcTop, 300);
    const observer = new ResizeObserver(calcTop);
    observer.observe(el);
    window.addEventListener('resize', calcTop);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', calcTop);
    };
  }, []);

  // 홈에서 다른 페이지로 이동하는 함수
  const navigateToPage = (path, e) => {
    if (e) {
      e.preventDefault(); // 기본 동작 방지
    }

    // 로고 클릭으로 인한 홈페이지 새로고침인지 확인
    const isLogoClick = sessionStorage.getItem('logoClicked') === 'true';

    // 로고 클릭이 아닌 경우에만 동일한 페이지로 이동 시도를 무시
    if (!isLogoClick && (router.pathname === path || router.asPath === path)) {
      return false;
    }

    // 로고 클릭이 아닌 경우에만 홈페이지로의 중복 이동을 무시
    if (!isLogoClick && path === '/' && (router.pathname === '/' || router.asPath === '/')) {
      return false;
    }

    // 페이지 이동 전에 현재 스크롤 위치 저장 (홈 페이지에서 떠날 때)
    // _app.js의 routeChangeStart에서 저장하므로 여기서는 제거

    // 페이지 이동 전에 현재 featured 뉴스와 watch 뉴스를 캐시에 저장
    if (typeof window !== 'undefined') {
      if (featuredArticles.length > 0) {
        sessionStorage.setItem('cachedFeaturedNews', JSON.stringify(featuredArticles));
        sessionStorage.setItem('featuredNewsCacheTime', Date.now().toString());
      }
    }

    // 동일한 페이지로 이동하려는 경우 방지
    if (path === router.pathname || path === router.asPath || path === window.location.pathname) {
      return false;
    }

    try {
      // Next.js 라우터를 사용하여 페이지 이동
      router.push(path, undefined, { shallow: false });
    } catch (error) {
      console.error('라우터 이동 시도 중 에러:', error);
      // 에러 발생 시에도 동일한 페이지가 아닌 경우에만 이동
      if (path !== router.pathname && path !== router.asPath && path !== window.location.pathname) {
        window.location.href = path;
      }
    }

    return false; // 이벤트 전파 중지
  };
  
  // 뉴스 데이터가 없으면 빈 배열을 사용 - useMemo로 메모이제이션하여 불필요한 재렌더링 방지
  const articles = useMemo(() => newsArticles || [], [newsArticles]);
  const featured = useMemo(() => featuredArticles || [], [featuredArticles]);

  // 배열을 랜덤하게 섞는 함수
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // SSR로 데이터를 받으므로 클라이언트 사이드 로딩 함수들은 더 이상 필요 없음

  // 이제 SSR로 데이터를 받으므로 클라이언트 사이드 로딩 불필요

  // 스크롤 위치 복원은 _app.js handleRouteChangeComplete에서 중앙 처리

  // 🔧 무한 새로고침 방지: logoClicked 플래그 강제 제거
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const logoClicked = sessionStorage.getItem('logoClicked');
      if (logoClicked) {
        console.log('[CLEANUP] logoClicked 플래그 발견 및 제거:', logoClicked);
        sessionStorage.removeItem('logoClicked');
      }
    }
  }, []); // 페이지 로드 시 한 번만 실행

  // topSongs 데이터 검사 및 수정
  useEffect(() => {
    if (topSongs && topSongs.length > 0) {
      // youtubeUrl이 없는 노래 항목 찾기
      const songsWithoutUrl = topSongs.filter(song => !song.youtubeUrl);
      if (songsWithoutUrl.length > 0) {
        
        // 기본 아티스트별 유튜브 URL 매핑
        const defaultArtistUrls = {
          'BTS': 'https://www.youtube.com/watch?v=gdZLi9oWNZg', // Dynamite
          'BLACKPINK': 'https://www.youtube.com/watch?v=2S24-y0Ij3Y', // Kill This Love
          'TWICE': 'https://www.youtube.com/watch?v=mH0_XpSHkZo', // Fancy
          'EXO': 'https://www.youtube.com/watch?v=KSH-FVVtTf0', // Love Shot
          'IVE': 'https://www.youtube.com/watch?v=Y8JFxS1HlDo', // LOVE DIVE
          'NewJeans': 'https://www.youtube.com/watch?v=js1CtxSY38I', // Attention
          'aespa': 'https://www.youtube.com/watch?v=H69tJmsgd9I', // Next Level
          'Stray Kids': 'https://www.youtube.com/watch?v=EaswWiwMVs8' // God's Menu
        };
        
        // 각 노래에 대해 유튜브 URL 보정
        topSongs.forEach(song => {
          if (!song.youtubeUrl) {
            // 아티스트 기반으로 URL 찾기
            if (song.artist && defaultArtistUrls[song.artist]) {
              song.youtubeUrl = defaultArtistUrls[song.artist];
            } else {
              // 기본 K-pop 인기 곡 URL
              song.youtubeUrl = 'https://www.youtube.com/watch?v=gdZLi9oWNZg'; // BTS Dynamite
            }
          }
        });
      }
    }
  }, [topSongs]);

  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    // 브라우저 환경에서만 실행
    if (typeof window === 'undefined') return;
    
    // document.body가 존재하는지 확인
    if (!document.body) {
      console.warn('document.body가 아직 로드되지 않았습니다.');
      return;
    }
    
    try {
      if (showYoutubeModal) {
        // 모달이 열렸을 때 body 스크롤 방지
        document.body.style.overflow = 'hidden';
      } else {
        // 모달이 닫혔을 때 body 스크롤 복원
        document.body.style.overflow = 'auto';
      }
    } catch (error) {
      console.error('body 스타일 설정 중 에러:', error);
    }
    
    // 컴포넌트 언마운트 시 스크롤 복원
    return () => {
      try {
        if (document.body) {
          document.body.style.overflow = 'auto';
        }
      } catch (error) {
        console.error('body 스타일 복원 중 에러:', error);
      }
    };
  }, [showYoutubeModal]);


  // 유튜브 모달 열기
  const openYoutubeModal = (url, e) => {
    // 이벤트 전파 중지
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!url) {
      console.log('유튜브 URL이 없습니다.');
      return; // URL이 없으면 모달을 열지 않음
    }
    
    console.log('유튜브 모달 열기:', url);
    
    // YouTube URL을 embed 형식으로 변환
    let embedUrl = url;
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    
    if (match && match[1]) {
      // 모바일 호환성을 위한 파라미터 추가
      embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
      console.log('변환된 임베드 URL:', embedUrl);
    } else {
      console.log('URL 변환에 실패했습니다:', url);
      return; // 변환 실패 시 모달을 열지 않음
    }
    
    setCurrentYoutubeUrl(embedUrl);
    setShowYoutubeModal(true);
    console.log('모달 열림 상태:', true);
  };

  // 유튜브 모달 닫기
  const closeYoutubeModal = () => {
    console.log('유튜브 모달 닫기');
    setShowYoutubeModal(false);
    setCurrentYoutubeUrl('');
  };

  // Featured News 초기화 및 캐시 복원 로직
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 서버 데이터 확인
    const serverFeaturedNews = initialData?.featuredArticles || [];

    // 로고 클릭 플래그 확인 (최우선)
    const logoClicked = sessionStorage.getItem('logoClicked');

    if (logoClicked === 'true') {
      // 로고 클릭으로 인한 새로고침이므로 플래그 즉시 제거
      sessionStorage.removeItem('logoClicked');
      sessionStorage.removeItem('cachedFeaturedNews');
      sessionStorage.removeItem('featuredNewsCacheTime');

      if (serverFeaturedNews.length > 0) {
        const randomNews = shuffleArray([...serverFeaturedNews]).slice(0, 6);
        setFeaturedArticles(randomNews);

        // 새로운 랜덤 뉴스를 캐시에 저장
        sessionStorage.setItem('cachedFeaturedNews', JSON.stringify(randomNews));
        sessionStorage.setItem('featuredNewsCacheTime', Date.now().toString());
      }
      return;
    }

    // 뒤로가기로 인한 접근인지 확인
    const cached = sessionStorage.getItem('cachedFeaturedNews');
    const cacheTime = sessionStorage.getItem('featuredNewsCacheTime');

    if (cached && cacheTime) {
      const timeDiff = Date.now() - parseInt(cacheTime);

      // 캐시가 10분 이내라면 사용
      if (timeDiff < 10 * 60 * 1000) {
        try {
          let cachedNews = JSON.parse(cached);
          // Fix relative image URLs in cached data (from before prodUrl fix)
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          if (apiUrl) {
            cachedNews = cachedNews.map(n => ({
              ...n,
              coverImage: n.coverImage?.startsWith('/api/proxy/') ? `${apiUrl}${n.coverImage}` : n.coverImage,
              thumbnailUrl: n.thumbnailUrl?.startsWith('/api/proxy/') ? `${apiUrl}${n.thumbnailUrl}` : n.thumbnailUrl,
            }));
          }
          if (cachedNews.length > 0) {
            setFeaturedArticles(cachedNews);
            return; // 캐시 복원 성공 시 여기서 종료
          }
        } catch (error) {
          console.error('❌ Featured 뉴스 캐시 복원 오류:', error);
        }
      } else {
        // 캐시가 만료된 경우 정리
        sessionStorage.removeItem('cachedFeaturedNews');
        sessionStorage.removeItem('featuredNewsCacheTime');
      }
    }

    // 캐시가 없거나 만료된 경우 새로운 랜덤 뉴스 생성
    if (serverFeaturedNews.length > 0) {
      const randomNews = shuffleArray([...serverFeaturedNews]).slice(0, 6);
      setFeaturedArticles(randomNews);

      // 새로운 랜덤 뉴스를 캐시에 저장
      sessionStorage.setItem('cachedFeaturedNews', JSON.stringify(randomNews));
      sessionStorage.setItem('featuredNewsCacheTime', Date.now().toString());
    }
  }, []); // logoClickTrigger 제거 - 페이지 로드 시 한 번만 실행

  // Watch News는 SSR에서 로딩 (getServerSideProps → initialData.watchNews)

  // useEffect to prepare moreNews data for MoreNews component
  useEffect(() => {
    // 이미 로드된 경우 실행하지 않음 (무한 루프 방지)
    if (loadedMoreNews) return;

    // 세션 스토리지에서 저장된 MoreNews 데이터 먼저 복원 시도
    if (typeof window !== 'undefined') {
      try {
        const savedMoreNewsData = JSON.parse(sessionStorage.getItem('moreNewsData') || '[]');
        if (savedMoreNewsData.length > 0) {
            setInitialMoreNews(savedMoreNewsData);
          setLoadedMoreNews(true);
          return; // 세션 스토리지에서 복원 성공 시 아래 로직 실행하지 않음
        }
      } catch (e) {
        console.error("Error restoring MoreNews data:", e);
      }
    }

    // 세션 스토리지에 데이터가 없는 경우에만 실행
    if (moreNews?.length > 0) {
      setInitialMoreNews(moreNews);
      setLoadedMoreNews(true);
    } else if (newsArticles?.length > 0) {
      // 다른 섹션에서 이미 사용 중인 기사(0~10)를 제외하고 11번째부터 사용
      const newsForMoreNews = newsArticles.slice(11);
      setInitialMoreNews(newsForMoreNews);
      setLoadedMoreNews(true);
    }
  }, [moreNews, newsArticles]); // loadedMoreNews를 의존성에서 제거하여 무한 루프 방지

  // rankingNews, moreNews는 SSR에서 로딩 (getServerSideProps → initialData)


  return (
    <MainLayout>
      <Seo
        title="KstarPick - Your Ultimate K-Pop News Portal"
        description="Your ultimate source for K-Pop news, Korean drama updates, and entertainment. Get the latest on BTS, BLACKPINK, aespa, NewJeans, IVE, and more Korean celebrities. Breaking news, exclusive content, and trending stories from the Korean entertainment industry."
        url="/"
        type="website"
        jsonLd={generateHomePageJsonLd(articles, featured, topSongs)}
      />
      <StructuredData type="website" />

      <main className="pt-0 pb-16 bg-white lg:bg-[#F8F9FA]">
        {/* Full-width 2-column layout: Main (1212px) + Sidebar (500px) */}
        <div className="max-w-[1772px] mx-auto px-0 lg:px-10 pt-0 lg:pt-8">
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-[60px]">
            {/* Left: Main Content Area (1212px) */}
            <div className="flex-1 min-w-0 lg:max-w-content">

              {/* Mobile Comment Ticker - above hero */}
              <div className="lg:hidden px-4 py-3">
                <CommentTicker comments={initialData?.recentComments || []} onNavigate={navigateToPage} />
              </div>

              {/* Hero Section + 4-card grid */}
              <HeroSection
                article={articles[0]}
                onNavigate={navigateToPage}
              >
                <NewsCardGrid
                  articles={articles.slice(1, 5)}
                  onNavigate={navigateToPage}
                />
              </HeroSection>

              {/* Mobile separator */}
              <div className="lg:hidden h-2 bg-[#F3F4F6]" />

              {/* Mobile Trending NOW - below hero */}
              <div className="lg:hidden px-4 py-4">
                <TrendingNow items={trendingNews.length > 0 ? trendingNews : rankingNews} onNavigate={navigateToPage} showCard={false} />
              </div>

              {/* Mobile separator */}
              <div className="lg:hidden h-2 bg-[#F3F4F6]" />

              {/* Mobile Video News - below Trending NOW */}
              {watchNews && watchNews.length > 0 && (
                <div className="lg:hidden bg-white" style={{ borderTop: '2px solid #F3F4F6', padding: '24px 16px 16px' }}>
                  <div className="flex flex-col" style={{ gap: '16px' }}>
                    {/* Title */}
                    <div className="flex items-center gap-2">
                      <h2 className="text-[21px] font-black text-[#101828]" style={{ fontFamily: 'Inter, sans-serif' }}><span className="text-ksp-accent">Video</span> News</h2>
                      <span className="text-xl">📷</span>
                    </div>

                    {/* Featured video card */}
                    <div
                      className="relative overflow-hidden cursor-pointer group"
                      style={{ borderRadius: '12px', height: '224px' }}
                      onClick={() => {
                        if (watchNews[0].youtubeUrl) {
                          openYoutubeModal(watchNews[0].youtubeUrl);
                        } else {
                          navigateToPage(`/news/${watchNews[0].slug || watchNews[0]._id}`);
                        }
                      }}
                    >
                      <img
                        src={watchNews[0].coverImage || watchNews[0].thumbnailUrl || '/images/placeholder.jpg'}
                        alt={watchNews[0].title}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                      />
                      <div className="absolute bottom-0 left-0 right-0" style={{ padding: '12px 12px 0', background: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 100%)', height: '82px' }}>
                        <div className="flex flex-col" style={{ gap: '4px' }}>
                          <span className="font-bold text-[12px]" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '16px', color: '#2B7FFF' }}>
                            {watchNews[0].category ? watchNews[0].category.charAt(0).toUpperCase() + watchNews[0].category.slice(1) : 'Pick'}
                          </span>
                          <h3 className="text-white font-bold text-[14px] line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.375em', letterSpacing: '-0.0107em' }}>
                            {watchNews[0].title?.replace(/^Watch:\s*/i, '') || watchNews[0].title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* 2x2 Video grid */}
                    {watchNews.length > 1 && (
                      <div className="grid grid-cols-2" style={{ gap: '12px', rowGap: '16px' }}>
                        {watchNews.slice(1, 5).map((news) => (
                          <div
                            key={news._id}
                            className="flex flex-col cursor-pointer"
                            style={{ gap: '8px' }}
                            onClick={() => {
                              if (news.youtubeUrl) {
                                openYoutubeModal(news.youtubeUrl);
                              } else {
                                navigateToPage(`/news/${news.slug || news._id}`);
                              }
                            }}
                          >
                            <div className="relative overflow-hidden" style={{ borderRadius: '12px', height: '268px', background: '#E5E7EB' }}>
                              <img
                                src={news.coverImage || news.thumbnailUrl || '/images/placeholder.jpg'}
                                alt={news.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                              />
                            </div>
                            <p className="font-bold text-[13px] line-clamp-2 text-[#0A0A0A] text-left" style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.23em' }}>
                              {news.title?.replace(/^Watch:\s*/i, '') || news.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* Mobile separator */}
              <div className="lg:hidden h-2 bg-[#F3F4F6]" />

              {/* Latest News - 3-col large cards with descriptions */}
              <div className="bg-white border-0 lg:border-[1.5px] border-ksp-border rounded-none lg:rounded-xl py-5 lg:py-8 px-4 lg:px-6 mb-0 lg:mb-8">
                <div className="flex items-center justify-between mb-5 lg:mb-7">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[21px] lg:text-[26px] font-black"><span style={{ color: '#2B7FFF' }}>Latest</span> <span style={{ color: '#101828' }}>News</span></h2>
                    <span className="text-xl lg:text-2xl">🔥</span>
                  </div>
                </div>
                <ArticleCardGrid
                  articles={articles.slice(5, 8)}
                  onNavigate={navigateToPage}
                />
              </div>

              {/* Mobile separator */}
              <div className="lg:hidden h-2 bg-[#F3F4F6]" />

              {/* Recommended News - 3-col large cards with descriptions */}
              <div className="bg-white border-0 lg:border-[1.5px] border-ksp-border rounded-none lg:rounded-xl py-5 lg:py-8 px-4 lg:px-6 mb-0 lg:mb-8">
                <div className="flex items-center justify-between mb-5 lg:mb-7">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[21px] lg:text-[26px] font-black"><span style={{ color: '#2B7FFF' }}>Recommended</span> <span style={{ color: '#101828' }}>News</span></h2>
                    <span className="text-xl lg:text-2xl">💓</span>
                  </div>
                </div>
                <ArticleCardGrid
                  articles={recommendedNews.length >= 3 ? recommendedNews.slice(0, 3) : articles.slice(8, 11)}
                  onNavigate={navigateToPage}
                />
              </div>

              {/* Mobile separator */}
              <div className="lg:hidden h-2 bg-[#F3F4F6]" />

              {/* Watch News - Featured video + list (uses items 5+ to avoid overlap with Video News) */}
              {watchNews && watchNews.length > 5 && (
                <>
                <div className="bg-white border-0 lg:border-[1.5px] border-ksp-border rounded-none lg:rounded-xl py-5 lg:py-8 px-4 lg:px-6 mb-0 lg:mb-8">
                  <div className="flex items-center justify-between mb-5 lg:mb-7">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[21px] lg:text-[26px] font-black"><span style={{ color: '#2B7FFF' }}>Watch</span> <span style={{ color: '#101828' }}>News</span></h2>
                      <span className="text-xl lg:text-2xl">👀</span>
                    </div>
                  </div>
                  <WatchNewsSection
                    articles={watchNews.slice(5)}
                    onNavigate={navigateToPage}
                    onPlayVideo={openYoutubeModal}
                  />
                </div>
                {/* Mobile separator */}
                <div className="lg:hidden h-2 bg-[#F3F4F6]" />
                </>
              )}

              {/* K-POP Ranking */}
              {topSongs && topSongs.length > 0 && (
                <>
                <div className="bg-white border-0 lg:border-[1.5px] border-ksp-border rounded-none lg:rounded-xl py-5 lg:py-8 px-4 lg:px-6 mb-0 lg:mb-8">
                  <div className="flex items-center justify-between mb-5 lg:mb-7">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[21px] lg:text-[26px] font-black"><span style={{ color: '#2B7FFF' }}>K-POP</span> <span style={{ color: '#101828' }}>Ranking</span></h2>
                      <span className="text-xl lg:text-2xl">⭐</span>
                    </div>
                  </div>
                  <KpopRankingSection
                    songs={topSongs}
                    onPlayVideo={openYoutubeModal}
                  />
                </div>
                </>
              )}

              <div className="lg:hidden h-2 bg-[#F3F4F6]" />

              {/* MoreNews - Infinite Scroll */}
              <div className="bg-white border-0 lg:border-[1.5px] border-ksp-border rounded-none lg:rounded-xl py-5 lg:py-8 px-4 lg:px-6">
                <MoreNews
                  initialNews={initialMoreNews}
                  key="more-news-permanent-instance"
                />
              </div>
            </div>

            {/* Right: Sidebar (500px, Naver-style bi-directional sticky) */}
            <div className="hidden lg:block w-[500px] flex-shrink-0">
              <div ref={sidebarStickyRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                <Sidebar
                  rankingNews={rankingNews}
                  trendingNews={trendingNews}
                  popularArticles={editorsPickNews.length > 0 ? editorsPickNews : rankingNews}
                  recentComments={initialData?.recentComments || []}
                  onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
                  onNavigate={navigateToPage}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* YouTube Modal */}
      {showYoutubeModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={closeYoutubeModal}
        >
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeYoutubeModal}
              className="absolute -top-12 right-0 p-3 text-white bg-black/60 rounded-full hover:bg-black/80 transition-colors z-10"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
            <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  src={currentYoutubeUrl}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                  allowFullScreen
                  title="YouTube video player"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
}
// 캐시 문제 해결을 위해 서버 사이드 렌더링으로 임시 변경
export async function getServerSideProps(context) {
  try {
    // 서버 URL 설정 (context.req.headers.host를 사용하여 현재 서버에 API 호출)
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${context.req.headers.host}`;
    const prodUrl = baseUrl;

    // 뒤로가기 시 브라우저 캐시 사용 → 서버 요청 없이 즉시 렌더링
    context.res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');

    console.log('🚀 Static Generation으로 홈페이지 데이터 로딩 시작');

    // 7일 전 날짜 계산
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 홈에서 필요한 필드만 지정 (content 제외 → MongoDB 프로젝션으로 DB 부하 감소)
    const listFields = 'fields=_id,title,slug,coverImage,thumbnailUrl,category,source,sourceUrl,timeText,summary,createdAt,publishedAt,updatedAt,viewCount,featured,tags,author,youtubeUrl,articleUrl';

    // 병렬로 핵심 API 호출 (Watch News + Recent Comments 추가)
    const [
      mainNewsRes,
      featuredNewsRes,
      recommendedNewsRes,
      trendingNewsRes,
      , // editors-pick은 trending 결과 후 호출
      musicRes,
      watchNewsRes,
      recentCommentsRes,
      rankingNewsRes,
      moreNewsRes
    ] = await Promise.all([
      fetch(`${prodUrl}/api/news?limit=20&${listFields}`),
      fetch(`${prodUrl}/api/news?featured=true&limit=20&createdAfter=${sevenDaysAgo.toISOString()}&${listFields}`),
      fetch(`${prodUrl}/api/news/related?limit=6`),
      fetch(`${prodUrl}/api/news/trending?limit=5`).catch(() => ({ json: () => ({ success: false }) })),
      null, // editors-pick은 trending 결과 후 호출
      fetch(`${prodUrl}/api/music/popular?limit=5`),
      fetch(`${prodUrl}/api/news?title=Watch:&limit=11&${listFields}`),
      fetch(`${prodUrl}/api/comments/recent?limit=10`),
      fetch(`${prodUrl}/api/news?limit=10&sort=viewCount&${listFields}`),
      fetch(`${prodUrl}/api/news?limit=20&sort=createdAt&order=desc&${listFields}`)
    ]);

    // 응답을 JSON으로 파싱
    const [
      mainNews,
      featuredNews,
      recommendedNews,
      trendingNewsData,
      ,
      music,
      watchNewsInitial,
      recentComments,
      rankingNewsData,
      moreNewsData
    ] = await Promise.all([
      mainNewsRes.json(),
      featuredNewsRes.json(),
      recommendedNewsRes.json(),
      trendingNewsRes.json(),
      Promise.resolve(null),
      musicRes.json(),
      watchNewsRes.json(),
      recentCommentsRes.json(),
      rankingNewsRes.json(),
      moreNewsRes.json()
    ]);

    // Editor's PICK: trending ID 제외하여 호출
    const trendingIds = (trendingNewsData.success ? trendingNewsData.data || [] : []).map(n => n._id).join(',');
    const editorsPickRes = await fetch(`${prodUrl}/api/news/editors-pick?limit=6${trendingIds ? `&exclude=${trendingIds}` : ''}`).catch(() => ({ json: () => ({ success: false }) }));
    const editorsPickData = await editorsPickRes.json();

    // Watch News: API에서 이미 title=Watch: 필터링 완료
    const watchNewsFiltered = watchNewsInitial.success && watchNewsInitial.data?.news
      ? watchNewsInitial.data.news.slice(0, 11)
      : [];

    // Fix relative image URLs to absolute production URLs
    const fixImageUrl = (url) => {
      if (!url) return url;
      if (url.startsWith('/api/proxy/hash-image')) return `${prodUrl}${url}`;
      // 로컬 개발 시 kstarpick.com 프록시 → 프로덕션 서버 직접 접근
      if (process.env.NODE_ENV === 'development' && url.includes('kstarpick.com/api/proxy')) {
        return url.replace('https://kstarpick.com', 'http://43.202.38.79:13001');
      }
      return url;
    };
    const processNews = (articles) => (articles || []).map(({ content, ...n }) => ({
      ...n,
      coverImage: fixImageUrl(n.coverImage) || '/images/news/default-news.jpg',
      thumbnailUrl: fixImageUrl(n.thumbnailUrl)
    }));

    // 홈페이지 표시를 위한 충분한 데이터 구성
    const initialData = {
      newsArticles: processNews(mainNews.success ? mainNews.data.news?.slice(0, 20) : []),
      featuredArticles: processNews(featuredNews.success ? featuredNews.data.news?.slice(0, 20) : []),
      recommendedNews: processNews(recommendedNews.success ? recommendedNews.data?.slice(0, 6) : []),
      trendingNews: processNews(trendingNewsData.success ? trendingNewsData.data?.slice(0, 5) : []),
      editorsPickNews: processNews(editorsPickData.success ? editorsPickData.data?.slice(0, 6) : []),
      watchNews: processNews(watchNewsFiltered),
      popularNews: {
        drama: [], // 클라이언트에서 로드
        movie: [], // 클라이언트에서 로드
        kpop: [], // 클라이언트에서 로드
        celeb: [] // 클라이언트에서 로드
      },
      rankingNews: processNews(rankingNewsData.success ? rankingNewsData.data?.news?.slice(0, 10) : []),
      topSongs: music.success ? (music.data || music.musics)?.slice(0, 5) || [] : [],
      moreNews: processNews(moreNewsData.success ? moreNewsData.data?.news?.slice(0, 20) : []),
      recentComments: recentComments.success ? recentComments.data?.slice(0, 10) || [] : []
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ 홈페이지 데이터 로딩 완료:', {
        뉴스: initialData.newsArticles.length,
        피처드: initialData.featuredArticles.length,
        워치뉴스: initialData.watchNews.length,
        음악: initialData.topSongs.length
      });
    }

    return {
      props: {
        initialData
      }
    };
  } catch (error) {
    console.error('❌ 홈페이지 데이터 로딩 오류:', error);
    
    // 오류 발생 시 빈 데이터 반환
    return {
      props: {
        initialData: {
          newsArticles: [],
          featuredArticles: [],
          recommendedNews: [],
          trendingNews: [],
          editorsPickNews: [],
          watchNews: [],
          popularNews: { drama: [], movie: [], kpop: [], celeb: [] },
          rankingNews: [],
          topSongs: [],
          moreNews: [],
          recentComments: []
        }
      }
    };
  }
}

export default Home;

// 🚀 Client-side rendering으로 변경하여 로딩 속도 대폭 개선!
// getServerSideProps 제거 - 클라이언트에서 데이터 로드 