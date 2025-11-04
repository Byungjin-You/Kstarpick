import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import Link from 'next/link';
import { Music as MusicIcon, TrendingUp, Calendar, BarChart2, Disc, Play, Award, ArrowRight, ChevronRight, X, RefreshCcw, Star, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import MainLayout from '../components/MainLayout';
import { decodeHtmlEntities } from '../utils/helpers';
import MoreNews from '../components/MoreNews';
import { generateWebsiteJsonLd } from '../utils/seoHelpers';

export default function Music({ musicNews = [], topSongs = [], newsPagination }) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState('');
  const [processedSongs, setProcessedSongs] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [visibleSongs, setVisibleSongs] = useState(10);
  const [isLoadingMoreSongs, setIsLoadingMoreSongs] = useState(false);
  const [allSongs, setAllSongs] = useState([]);
  const [autoPlayVideoId, setAutoPlayVideoId] = useState(null);
  const cardRefs = useRef({});
  const [showAll, setShowAll] = useState(false);
  const initialDisplayCount = 10;

  // 스크롤 위치 복원 로직
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isBackToMusic = sessionStorage.getItem('isBackToMusic');
    const savedScrollPosition = sessionStorage.getItem('musicScrollPosition');

    if (isBackToMusic === 'true' && savedScrollPosition) {
      const scrollPos = parseInt(savedScrollPosition, 10);

      const restoreScroll = () => {
        window.scrollTo(0, scrollPos);
        document.documentElement.scrollTop = scrollPos;
        document.body.scrollTop = scrollPos;
      };

      // 여러 시도로 동적 콘텐츠 로딩을 고려
      setTimeout(restoreScroll, 50);
      setTimeout(restoreScroll, 100);
      setTimeout(restoreScroll, 200);
      setTimeout(restoreScroll, 300);
      setTimeout(restoreScroll, 500);

      requestAnimationFrame(() => {
        setTimeout(restoreScroll, 100);
        setTimeout(restoreScroll, 300);
      });

      // 플래그 제거
      sessionStorage.removeItem('isBackToMusic');
    }
  }, []);

  // 화면 크기 감지를 위한 useEffect
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    // 초기 로드 시 모바일 체크
    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // 음악 데이터 처리
  useEffect(() => {
    if (topSongs && topSongs.length > 0) {
      // position 값이 없거나 문자열인 경우 처리
      const processed = topSongs.map((song, index) => {
        const ensureNumber = (value, defaultValue) => {
          if (typeof value === 'number') return value;
          if (value === undefined || value === null) return defaultValue;
          const parsed = parseInt(value);
          return isNaN(parsed) ? defaultValue : parsed;
        };
        
        // 순위 처리 (1부터 시작) - 기본값은 인덱스 + 1로 설정
        const position = ensureNumber(song.position, index + 1);
        
        // 이전 순위 처리 - 유효하지 않으면 현재 순위와 동일하게 설정
        const previousPosition = ensureNumber(song.previousPosition, position);

        // 일일 조회수와 전체 조회수 처리
        const dailyViews = ensureNumber(song.dailyViews, 0);
        const totalViews = ensureNumber(song.totalViews, 0);

        return {
          ...song,
          position,
          previousPosition,
          dailyViews,
          totalViews
        };
      });

      // 순위(position) 기준으로 정렬
      const sorted = processed.sort((a, b) => a.position - b.position);
      setProcessedSongs(sorted.slice(0, visibleSongs));
      setAllSongs(sorted);
    } else {
      setProcessedSongs([]);
      setAllSongs([]);
    }
  }, [topSongs, visibleSongs]);

  // Intersection Observer로 화면 중앙 카드 자동재생
  useEffect(() => {
    if (typeof window === 'undefined' || processedSongs.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px', // 화면 중앙 20% 영역만 감지
      threshold: 0.5
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const songId = entry.target.dataset.songId;
          setAutoPlayVideoId(songId);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // 모든 카드 관찰
    Object.values(cardRefs.current).forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => {
      observer.disconnect();
    };
  }, [processedSongs]);

  // 더 많은 음악 로드 또는 접기
  const loadMoreSongs = async () => {
    // 이미 모든 노래를 보여주고 있다면 접기
    if (showAll && visibleSongs >= allSongs.length) {
      setVisibleSongs(initialDisplayCount);
      setShowAll(false);
      // 페이지 상단으로 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsLoadingMoreSongs(true);
    try {
      // 이미 모든 노래를 불러온 경우, 더 많은 노래 불러오기
      if (allSongs.length <= visibleSongs) {
        const response = await fetch(`/api/music/popular?limit=${visibleSongs + 10}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            // 새로운 데이터 처리
            const processed = data.data.map((song, index) => {
              const ensureNumber = (value, defaultValue) => {
                if (typeof value === 'number') return value;
                if (value === undefined || value === null) return defaultValue;
                const parsed = parseInt(value);
                return isNaN(parsed) ? defaultValue : parsed;
              };

              return {
                ...song,
                position: ensureNumber(song.position, index + 1),
                previousPosition: ensureNumber(song.previousPosition, ensureNumber(song.position, index + 1)),
                dailyViews: ensureNumber(song.dailyViews, 0),
                totalViews: ensureNumber(song.totalViews, 0)
              };
            });

            setAllSongs(processed);
          }
        }
      }

      // 더 보여줄 노래 수 증가
      setVisibleSongs(prev => prev + 10);

      // 모든 노래를 불러왔는지 확인
      if (visibleSongs + 10 >= allSongs.length) {
        setShowAll(true);
      }
    } catch (error) {
      console.error('더 많은 음악 로드 오류:', error);
    } finally {
      setIsLoadingMoreSongs(false);
    }
  };

  // YouTube URL에서 비디오 ID 추출
  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // 유튜브 모달 열기
  const openYoutubeModal = (url, e) => {
    if (!url) return;
    
    // 이벤트 전파 중지
    e.preventDefault();
    e.stopPropagation();
    
    // YouTube URL을 embed 형식으로 변환
    let embedUrl = url;
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    
    if (match && match[1]) {
      embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    
    setCurrentYoutubeUrl(embedUrl);
    setShowYoutubeModal(true);
  };

  // 유튜브 모달 닫기
  const closeYoutubeModal = () => {
    setShowYoutubeModal(false);
    setCurrentYoutubeUrl('');
  };

  // 순위 데이터 업데이트
  const updateRankings = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      // 관리자 API 호출해 순위 업데이트
      const response = await fetch('/api/music/fix-positions', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('순위 업데이트 실패');
      }
      
      const result = await response.json();
      console.log('순위 업데이트 결과:', result);
      
      // 페이지 새로고침
      router.reload();
    } catch (error) {
      console.error('순위 업데이트 오류:', error);
      alert('순위 업데이트 중 오류가 발생했습니다. 관리자에게 문의하세요.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Mock chart data
  const chartData = [
    { position: 1, trend: 'up', artist: 'NewJeans', title: 'Super Shy', album: 'Get Up', lastWeek: 2 },
    { position: 2, trend: 'down', artist: 'BTS', title: 'Dynamite', album: 'BE', lastWeek: 1 },
    { position: 3, trend: 'same', artist: 'IVE', title: 'I AM', album: 'I\'ve IVE', lastWeek: 3 },
    { position: 4, trend: 'up', artist: 'aespa', title: 'Spicy', album: 'MY WORLD', lastWeek: 6 },
    { position: 5, trend: 'up', artist: 'SEVENTEEN', title: 'Super', album: 'FML', lastWeek: 7 }
  ];
  
  return (
    <MainLayout>
      <Seo
        title="K-Pop Music | Korean Music Charts & Latest Songs"
        description="Discover the latest K-Pop music releases, trending songs, and music charts. Listen to hits from BTS, BLACKPINK, NewJeans, aespa, and more Korean artists."
        url="/music"
        type="website"
        keywords="K-Pop music,Korean music,K-Pop charts,Korean songs,BTS music,BLACKPINK songs,NewJeans,aespa,Korean music videos,K-Pop hits"
        jsonLd={generateWebsiteJsonLd()}
      />
      <div className="bg-white min-h-screen">

        <div className="container mx-auto px-4 pt-0 pb-12">
          {/* 제목 영역 */}
          <div className="mb-8 mt-8">
            <h1 className="font-bold text-black" style={{ fontSize: '20px' }}>
              <span style={{ color: '#233CFA' }}>Music News</span> at a Glance
            </h1>
          </div>
          
          {/* Top K-POP Songs 섹션 */}
          <section className="mb-12">
            {/* Masonry Grid */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div>

                {/* Masonry Layout - Pinterest 스타일 */}
                <style dangerouslySetInnerHTML={{__html: `
                  .masonry-grid {
                    column-count: 2;
                    column-gap: 12px;
                  }
                  @media (min-width: 640px) {
                    .masonry-grid {
                      column-count: 3;
                      column-gap: 16px;
                    }
                  }
                  @media (min-width: 1024px) {
                    .masonry-grid {
                      column-count: 4;
                    }
                  }
                  @media (min-width: 1280px) {
                    .masonry-grid {
                      column-count: 5;
                    }
                  }
                  @media (min-width: 1536px) {
                    .masonry-grid {
                      column-count: 6;
                    }
                  }
                  .masonry-item {
                    break-inside: avoid;
                    page-break-inside: avoid;
                    -webkit-column-break-inside: avoid;
                  }
                `}} />
                <div className="masonry-grid">

                  {processedSongs.map((song, index) => {
                    // 다양한 높이를 위한 랜덤 계산 (80% ~ 200% 범위)
                    const heightVariation = 80 + (index * 23) % 120; // 80 ~ 200 사이의 값
                    const videoId = getYoutubeVideoId(song.youtubeUrl);
                    const isAutoPlaying = autoPlayVideoId === song._id;

                    return (
                      <div
                        key={song._id}
                        ref={(el) => (cardRefs.current[song._id] = el)}
                        data-song-id={song._id}
                        className="masonry-item group cursor-pointer mb-3 sm:mb-4"
                        onClick={(e) => {
                          if (song.youtubeUrl) {
                            openYoutubeModal(song.youtubeUrl, e);
                          } else if (song.slug || song._id) {
                            e.preventDefault();
                            router.push(`/music/song/${song.slug || song._id}`);
                          }
                        }}
                      >
                        {/* Card Container */}
                        <div
                          className="relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                        >

                          {/* Album Cover Image - 다양한 높이 */}
                          <div className="relative w-full bg-gray-100" style={{ paddingBottom: `${heightVariation}%` }}>
                            {/* YouTube 자동재생 임베드 - 화면 중앙에 있을 때만 */}
                            {isAutoPlaying && videoId ? (
                              <iframe
                                className="absolute inset-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&loop=1&playlist=${videoId}`}
                                title={song.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ border: 'none' }}
                              />
                            ) : (
                              <>
                                {/* 일반 이미지 표시 */}
                                {song.coverImage ? (
                                  <img
                                    src={song.coverImage}
                                    alt={song.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/images/placeholder.jpg';
                                    }}
                                  />
                                ) : (
                                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                    <MusicIcon size={48} className="text-gray-400" />
                                  </div>
                                )}

                                {/* Ranking - Top Left (드라마 스타일) */}
                                <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center">
                                  <span className="text-white font-bold text-5xl drop-shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>
                                    {song.position}
                                  </span>
                                </div>

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                                  <div className="p-4 w-full">
                                    <p className="text-white font-medium line-clamp-1">{decodeHtmlEntities(song.title)}</p>
                                  </div>
                                </div>

                                {/* Play Button - Center Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <button
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-2xl transition-transform transform group-hover:scale-110"
                                    style={{ background: 'linear-gradient(to bottom right, #233cfa, #009efc)' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openYoutubeModal(song.youtubeUrl, e);
                                    }}
                                  >
                                    <Play size={16} className="text-white ml-0.5 sm:ml-1" fill="white" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Song Info */}
                          <div className="p-3">
                            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-[#233cfa] transition-colors">
                              {decodeHtmlEntities(song.title)}
                            </h3>
                            <div className="flex items-center mt-2 gap-2">
                              {/* YouTube Channel Profile Image */}
                              <div className="flex-shrink-0">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-white flex items-center justify-center">
                                  {song.channelThumbnail ? (
                                    <img
                                      src={song.channelThumbnail}
                                      alt={song.artist}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    style={{ display: song.channelThumbnail ? 'none' : 'flex' }}
                                    className="w-full h-full items-center justify-center"
                                  >
                                    <img
                                      src="/images/icons8-youtube-logo-94.png"
                                      alt="YouTube"
                                      className="w-4 h-4 object-contain"
                                    />
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-1 flex-1">
                                {decodeHtmlEntities(song.artist)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {processedSongs.length === 0 && (
                    <div className="col-span-full bg-white rounded-xl p-8 text-center border border-gray-100" style={{ boxShadow: 'none' }}>
                      <MusicIcon size={40} className="mx-auto text-gray-300 mb-3" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">No Music Available</h3>
                      <p className="text-gray-500">
                        No music data available at the moment.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* "더 보기" 버튼 추가 */}
              <div className="text-center mt-8 mb-4 pb-4">
              <button
                onClick={loadMoreSongs}
                disabled={isLoadingMoreSongs}
                className="w-full max-w-md mx-auto py-3 bg-white text-black font-medium rounded-2xl border-2 border-gray-300 hover:border-gray-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMoreSongs ? (
                  <span className="flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></span>
                    Loading...
                  </span>
                ) : showAll && visibleSongs >= allSongs.length ? (
                  <span className="flex items-center justify-center">
                    Fold
                    <ChevronUp className="ml-2" size={20} />
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    See more
                    <ChevronDown className="ml-2" size={20} />
                  </span>
                )}
              </button>
            </div>
            </div>
          </section>
          
          {/* YouTube Modal */}
          {showYoutubeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
              <div className="relative max-w-5xl w-full overflow-hidden rounded-lg">
                <button 
                  className="absolute top-3 right-3 p-1.5 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white z-10 transition-all"
                  onClick={closeYoutubeModal}
                >
                  <X size={24} className="text-white" />
                </button>
                <div className="aspect-video w-full">
                  <iframe
                    src={currentYoutubeUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube video player"
                  ></iframe>
                </div>
              </div>
            </div>
          )}
          
          {/* 뉴스 섹션 - MoreNews 컴포넌트로 대체 */}
          <div className="mt-16">
            {/* MoreNews 컴포넌트 추가, category 속성에 'kpop' 지정 */}
            <MoreNews initialNews={musicNews} category="kpop" />
          </div>
          
          {/* 애니메이션 스타일 추가 */}
          <style jsx>{`
            .animate-shimmer-sync {
              background-size: 800px 100%;
              animation: shimmer 2s infinite linear;
              animation-delay: 0s !important;
            }
            @keyframes shimmer {
              0% {
                background-position: -400px 0;
              }
              100% {
                background-position: 400px 0;
              }
            }
            .animate-wave-sync {
              animation: wave 2s infinite ease-in-out;
              animation-delay: 0s !important;
            }
            @keyframes wave {
              0% {
                transform: translateX(-100%);
              }
              50% {
                transform: translateX(100%);
              }
              100% {
                transform: translateX(100%);
              }
            }
            .mobile-last-item {
              margin-bottom: 50px;
              position: relative;
            }
            .mobile-last-item::after {
              content: '';
              position: absolute;
              left: 0;
              right: 0;
              bottom: -30px;
              height: 30px;
              background: transparent;
            }
            .desktop-last-item {
              margin-bottom: 80px;
              position: relative;
            }
            .desktop-last-item::after {
              content: '';
              position: absolute;
              left: 0;
              right: 0;
              bottom: -30px;
              height: 30px;
              background: transparent;
            }
          `}</style>
        </div>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps(context) {
  try {
    // API 기본 URL 설정
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${context.req.headers.host}`;
    
    // 모든 드라마 관련 뉴스 가져오기 (필터링용)
    const dramaNewsResponse = await fetch(`${baseUrl}/api/news/drama?limit=100`);
    const dramaNewsData = await dramaNewsResponse.json();
    
    // 모든 드라마 관련 뉴스 ID 추출
    const dramaNewsIds = new Set();
    if (dramaNewsData && dramaNewsData.success && Array.isArray(dramaNewsData.data)) {
      dramaNewsData.data.forEach(news => {
        if (news._id) {
          dramaNewsIds.add(news._id);
        }
      });
    }
    
    console.log(`드라마 관련 뉴스 ID's: ${dramaNewsIds.size}개`);
    
    // 음악 관련 뉴스 가져오기 - 다시 100개로 증가
    const newsResponse = await fetch(`${baseUrl}/api/news?category=kpop&limit=100`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    const newsData = await newsResponse.json();
    
    // 인기 음악 목록 가져오기 - 20개로 유지
    const musicResponse = await fetch(`${baseUrl}/api/music/popular?limit=20`);
    const musicData = await musicResponse.json();
    
    // 뉴스 데이터 처리
    let musicNews = [];
    
    console.log('뉴스 API 응답:', JSON.stringify(newsData).slice(0, 200));
    
    // API 응답 형식에 따라 데이터 추출
    if (Array.isArray(newsData)) {
      musicNews = newsData;
    } else if (newsData && newsData.success) {
      if (Array.isArray(newsData.data)) {
        musicNews = newsData.data;
      } else if (newsData.data && newsData.data.news && Array.isArray(newsData.data.news)) {
        musicNews = newsData.data.news;
      }
    } else if (newsData && newsData.news && Array.isArray(newsData.news)) {
      musicNews = newsData.news;
    }
    
    console.log(`음악 관련 뉴스 데이터: ${musicNews ? musicNews.length : 0}개 항목`);
    
    // 이미지 필드 확인 및 누락된 경우 기본 이미지 설정
    musicNews = Array.isArray(musicNews) ? musicNews.map(news => {
      if (!news.coverImage) {
        news.coverImage = '/images/news/default-news.jpg';
      }
      return news;
    }) : [];
    
    // 1. 드라마 관련 뉴스와 중복되는 뉴스 제외
    const filteredMusicNews = musicNews.filter(news => {
      const result = news._id && !dramaNewsIds.has(news._id);
      return result;
    });
    
    console.log(`중복 제거 후 음악 뉴스: ${filteredMusicNews.length}개 항목`);
    
    // 2. 단순히 createdAt 기준으로 최신순 정렬 (복잡한 다양성 로직 제거)
    let finalMusicNews = filteredMusicNews.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.publishedAt || 0);
      const dateB = new Date(b.createdAt || b.publishedAt || 0);
      return dateB - dateA; // 최신순
    });
    
    console.log(`최종 음악 뉴스 (최신순 정렬): ${finalMusicNews.length}개 항목`);
    console.log(`첫 번째 뉴스: ${finalMusicNews.length > 0 ? finalMusicNews[0].title : 'None'}`);
    console.log(`첫 번째 뉴스 날짜: ${finalMusicNews.length > 0 ? finalMusicNews[0].createdAt : 'None'}`);
    
    // 음악 데이터 처리
    let topSongs = [];
    if (musicData && musicData.success && Array.isArray(musicData.data)) {
      topSongs = musicData.data;
    }
    
    // 페이지네이션 정보 추가 (tvfilm 페이지와 동일하게)
    const newsPagination = {
      total: finalMusicNews.length,
      page: 1,
      limit: 12,
      totalPages: Math.ceil(finalMusicNews.length / 12),
      hasNextPage: finalMusicNews.length > 12,
      hasPrevPage: false
    };
    
    return {
      props: {
        musicNews: finalMusicNews,
        topSongs,
        newsPagination
      }
    };
  } catch (error) {
    console.error('Data fetching error:', error);
    return {
      props: {
        musicNews: [],
        topSongs: [],
        newsPagination: null
      }
    };
  }
}

