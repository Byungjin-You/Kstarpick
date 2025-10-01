import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import Link from 'next/link';
import { Music as MusicIcon, TrendingUp, Calendar, BarChart2, Disc, Play, Award, ArrowRight, ChevronRight, ArrowUp, ArrowDown, X, RefreshCcw, Star, Clock } from 'lucide-react';
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
        
        console.log(`음악 처리 (${index}): ${song.title} - position: ${position}, prev: ${previousPosition}`);
        
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
      
      console.log('음악 차트 데이터 처리 완료:', sorted.length, '개 항목');
    } else {
      setProcessedSongs([]);
      setAllSongs([]);
    }
  }, [topSongs, visibleSongs]);
  
  // 더 많은 음악 로드
  const loadMoreSongs = async () => {
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
    } catch (error) {
      console.error('더 많은 음악 로드 오류:', error);
    } finally {
      setIsLoadingMoreSongs(false);
    }
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
        
        <div className="container mx-auto px-4 py-12">
          {/* 헤더 섹션 - 셀럽 페이지와 동일한 스타일 적용 */}
          <div className="mb-8 relative">
            <div className="absolute -top-10 -left-6 w-32 h-32 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute top-12 right-20 w-40 h-40 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-40"></div>
            
            <div className="relative z-10">
              <div className="flex items-center mb-1">
                <div className="h-1.5 w-16 bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] rounded-full mr-3"></div>
                <MusicIcon size={20} className="text-[#ff3e8e] animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#ff3e8e] via-[#ff8360] to-[#ff61ab] text-transparent bg-clip-text ml-2">
                  K-POP Music
                </h1>
              </div>
              <p className="text-gray-500 text-sm mt-2">Discover the latest music releases and trending songs from K-POP artists</p>
            </div>
          </div>
          
          {/* Top K-POP Songs 섹션 */}
          <section className="mb-12">
            <div className="bg-white rounded-xl p-5 md:p-5 sm:p-3 shadow-sm overflow-hidden">
              {/* 데스크톱 환경에서는 테이블로 표시 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-pink-100/50">
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[#ff3e8e] uppercase tracking-wider w-16 text-center">
                        #
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[#ff3e8e] uppercase tracking-wider">
                        Song / Artist
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[#ff3e8e] uppercase tracking-wider hidden md:table-cell">
                        Daily Views
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[#ff3e8e] uppercase tracking-wider hidden md:table-cell">
                        Total Views
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[#ff3e8e] uppercase tracking-wider hidden md:table-cell">
                        Release Date
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-[#ff3e8e] uppercase tracking-wider w-16">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedSongs.map((song, index) => (
                      <tr 
                        key={song._id} 
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                        onClick={(e) => {
                          if (song.youtubeUrl) {
                            openYoutubeModal(song.youtubeUrl, e);
                          } else if (song.slug || song._id) {
                            e.preventDefault();
                            router.push(`/music/song/${song.slug || song._id}`);
                          }
                        }}
                      >
                        <td className="px-3 py-4 whitespace-nowrap text-center">
                          <div className="text-lg font-semibold text-gray-800">{song.position}</div>
                          <div className="text-xs font-medium">
                            {song.previousPosition !== song.position ? (
                              song.previousPosition > song.position ? (
                                <span className="text-green-500 flex items-center justify-center">
                                  <ArrowUp size={12} className="mr-1" />
                                  {song.previousPosition - song.position}
                                </span>
                              ) : (
                                <span className="text-red-500 flex items-center justify-center">
                                  <ArrowDown size={12} className="mr-1" />
                                  {song.position - song.previousPosition}
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-12 w-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden shadow-sm">
                              {song.coverImage ? (
                                <img 
                                  src={song.coverImage} 
                                  alt={song.title}
                                  className="w-full h-full object-cover transition-transform hover:scale-105"
                                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/placeholder.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                  {song.title.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900">{decodeHtmlEntities(song.title)}</div>
                              <div className="text-xs text-gray-500">{decodeHtmlEntities(song.artist)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell text-center">
                          <div className="flex justify-center">
                            <span className="font-medium bg-pink-50 text-[#ff3e8e] px-3 py-1 rounded-full flex items-center inline-flex">
                              <span className="text-red-400 mr-1 text-xs translate-y-px animate-pulse">▲</span> 
                              {song.dailyViews?.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                          <span className="font-medium">{song.totalViews?.toLocaleString()}</span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                          {song.releaseDate ? new Date(song.releaseDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="bg-[#ff3e8e] hover:bg-[#ff8360] p-2 rounded-full transition-all inline-flex items-center justify-center shadow-md hover:shadow-lg transform hover:scale-105"
                            onClick={(e) => openYoutubeModal(song.youtubeUrl, e)}
                          >
                            <Play size={16} className="text-white" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {processedSongs.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-500">
                          No music data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* 모바일 환경에서는 카드 형식으로 표시 */}
              <div className="md:hidden -mx-3">
                <div className="flex justify-between mb-4 pb-2 border-b border-pink-100/50 px-2">
                  <div className="text-xs font-medium text-[#ff3e8e] uppercase tracking-wider">K-POP Chart</div>
                  <div className="text-xs font-medium text-[#ff3e8e] uppercase tracking-wider">Top {processedSongs.length}</div>
                </div>
                
                <div className="space-y-2">
                  {processedSongs.map((song, index) => (
                    <div 
                      key={song._id} 
                      className={`rounded-xl p-2.5 shadow-sm flex items-center justify-between ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} relative mx-1`}
                      onClick={(e) => {
                        if (song.youtubeUrl) {
                          openYoutubeModal(song.youtubeUrl, e);
                        } else if (song.slug || song._id) {
                          e.preventDefault();
                          router.push(`/music/song/${song.slug || song._id}`);
                        }
                      }}
                    >
                      {/* 순위 및 변동사항 */}
                      <div className="flex-shrink-0 w-8 h-full flex flex-col items-center justify-center">
                        <div className="text-lg font-bold text-gray-800">{song.position}</div>
                        <div className="text-xs font-medium">
                          {song.previousPosition !== song.position ? (
                            song.previousPosition > song.position ? (
                              <span className="text-green-500 flex items-center justify-center">
                                <ArrowUp size={10} className="mr-0.5" />
                                {song.previousPosition - song.position}
                              </span>
                            ) : (
                              <span className="text-red-500 flex items-center justify-center">
                                <ArrowDown size={10} className="mr-0.5" />
                                {song.position - song.previousPosition}
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </div>
                      
                      {/* 앨범아트 및 정보 */}
                      <div className="flex-1 flex items-center min-w-0 pl-0.5">
                        <div className="h-14 w-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden shadow-sm">
                          {song.coverImage ? (
                            <img 
                              src={song.coverImage} 
                              alt={song.title}
                              className="w-full h-full object-cover transition-transform hover:scale-105"
                              style={{ objectFit: 'cover', objectPosition: 'center' }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/placeholder.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                              {song.title.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="ml-3.5 min-w-0 flex-1">
                          <div className="text-sm font-bold text-gray-900 truncate">{decodeHtmlEntities(song.title)}</div>
                          <div className="text-xs text-gray-500 truncate">{decodeHtmlEntities(song.artist)}</div>
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-[#ff3e8e] font-medium bg-pink-50 px-2 py-0.5 rounded-full inline-flex items-center">
                              <span className="text-red-400 mr-0.5 text-[10px] animate-pulse">▲</span> 
                              {song.dailyViews?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 재생 버튼 */}
                      <div className="flex-shrink-0 ml-1.5">
                        <button 
                          className="bg-[#ff3e8e] hover:bg-[#ff8360] p-1.5 rounded-full transition-all inline-flex items-center justify-center shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            openYoutubeModal(song.youtubeUrl, e);
                          }}
                        >
                          <Play size={14} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {processedSongs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No music data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* "더 보기" 버튼 추가 */}
            <div className="text-center mt-8 mb-4">
              <button 
                onClick={loadMoreSongs}
                disabled={isLoadingMoreSongs || (allSongs.length <= visibleSongs && visibleSongs > allSongs.length)}
                className="px-6 py-2 bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] text-white rounded-full hover:shadow-lg transition-all transform hover:-translate-y-1 animate-pulse inline-block disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMoreSongs ? (
                  <span className="flex items-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Loading...
                  </span>
                ) : allSongs.length > visibleSongs ? (
                  "View More Songs ✨"
                ) : (
                  "All Songs Loaded ✨"
                )}
              </button>
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

