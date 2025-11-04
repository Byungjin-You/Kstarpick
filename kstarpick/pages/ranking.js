import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Eye, ChevronRight, Calendar, Star, Heart, Medal, Clock, Bookmark, Music, Tv, Film, Users } from 'lucide-react';
import MainLayout from '../components/MainLayout';
import Seo from '../components/Seo';
import { formatCompactNumber } from '../utils/formatHelpers';
import { generateWebsiteJsonLd } from '../utils/seoHelpers';

// HTML 태그 제거 및 텍스트 추출 함수
const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<\/?[^>]+(>|$)/g, '').trim();
};

// 텍스트 길이 제한 함수 (말줄임표 추가)
const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// 날짜 포맷팅 함수
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// 카테고리 아이콘 매핑
const CategoryIconMap = {
  kpop: <Music size={14} className="mr-1" />,
  drama: <Tv size={14} className="mr-1" />,
  movie: <Film size={14} className="mr-1" />,
  variety: <Tv size={14} className="mr-1" />,
  celeb: <Users size={14} className="mr-1" />,
};

// 카테고리별 배경색 매핑
const CategoryColorMap = {
  kpop: 'bg-pink-50 text-pink-700',
  drama: 'bg-blue-50 text-blue-700',
  movie: 'bg-purple-50 text-purple-700',
  variety: 'bg-green-50 text-green-700',
  celeb: 'bg-amber-50 text-amber-700',
  default: 'bg-gray-50 text-gray-700'
};

export default function Ranking({ mostViewedNews = [], todayNews = [], weekNews = [], monthNews = [] }) {
  const [newsItems, setNewsItems] = useState(todayNews);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'week', 'month'

  // 스크롤 위치 복원 로직
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isBackToRanking = sessionStorage.getItem('isBackToRanking');
    const savedScrollPosition = sessionStorage.getItem('rankingScrollPosition');

    if (isBackToRanking === 'true' && savedScrollPosition) {
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
      sessionStorage.removeItem('isBackToRanking');
    }
  }, []);

  // 화면 크기 감지
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 모바일 터치 이벤트 핸들러
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  // 탭 변경 시 데이터 업데이트
  useEffect(() => {
    switch (activeTab) {
      case 'today':
        setNewsItems(todayNews);
        break;
      case 'week':
        setNewsItems(weekNews);
        break;
      case 'month':
        setNewsItems(monthNews);
        break;
      default:
        setNewsItems(todayNews);
    }
  }, [activeTab, mostViewedNews, todayNews, weekNews, monthNews]);
  
  // 이미지 에러 핸들러
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/images/news/default-news.jpg';
  };

  // 메달 렌더링 함수
  const renderRankingBadge = (index) => {
    if (index === 0) {
      return (
        <div className="absolute -left-2 md:left-2 top-4 z-30 shadow-xl">
          <div className="w-12 h-12 bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">1</span>
          </div>
        </div>
      );
    } else if (index === 1) {
      return (
        <div className="absolute -left-2 md:left-2 top-4 z-30 shadow-xl">
          <div className="w-12 h-12 bg-gradient-to-b from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">2</span>
          </div>
        </div>
      );
    } else if (index === 2) {
      return (
        <div className="absolute -left-2 md:left-2 top-4 z-30 shadow-xl">
          <div className="w-12 h-12 bg-gradient-to-b from-amber-600 to-amber-700 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">3</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="absolute -left-2 md:left-2 top-4 z-30 shadow-xl">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">{index + 1}</span>
          </div>
        </div>
      );
    }
  };
  
  return (
    <MainLayout>
      <Seo
        title="Top Trending News | K-Pop Rankings & Popular Stories"
        description="Discover the most popular and trending news in K-Pop, K-Drama, and Korean entertainment. Daily, weekly, and monthly rankings of viral stories and hot topics."
        url="/ranking"
        type="website"
        keywords="K-Pop trending,Korean news rankings,popular K-Pop news,viral Korean entertainment,K-Drama trends,trending Korean celebrities,hot K-Pop topics"
        jsonLd={generateWebsiteJsonLd()}
      />

      <div className="bg-white min-h-screen">
        <div className="container mx-auto px-4 pb-12" style={{ paddingTop: '2rem' }}>
          {/* 일자별 필터 탭 */}
          <div className="mb-12">
            <div className="flex flex-wrap gap-1 md:gap-4 justify-start">
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleTabClick('today')}
                onTouchStart={() => handleTabClick('today')}
                onTouchEnd={(e) => e.preventDefault()}
                onMouseDown={() => handleTabClick('today')}
                className={`relative px-2 py-1.5 md:px-4 md:py-3 rounded-full text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer select-none touch-manipulation min-h-[36px] md:min-h-[48px] min-w-[70px] md:min-w-[100px] flex items-center justify-center ${
                  activeTab === 'today'
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
                style={activeTab === 'today' ? {
                  background: '#233CFA',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'manipulation'
                } : {
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                <div className="absolute inset-0 w-full h-full" onClick={() => handleTabClick('today')} onTouchStart={() => handleTabClick('today')}></div>
                <Clock size={12} className="mr-1 md:mr-2 flex-shrink-0 relative z-10 pointer-events-none md:w-4 md:h-4" />
                <span className="whitespace-nowrap relative z-10 pointer-events-none">Today</span>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleTabClick('week')}
                onTouchStart={() => handleTabClick('week')}
                onTouchEnd={(e) => e.preventDefault()}
                onMouseDown={() => handleTabClick('week')}
                className={`relative px-2 py-1.5 md:px-4 md:py-3 rounded-full text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer select-none touch-manipulation min-h-[36px] md:min-h-[48px] min-w-[70px] md:min-w-[100px] flex items-center justify-center ${
                  activeTab === 'week'
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
                style={activeTab === 'week' ? {
                  background: '#233CFA',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'manipulation'
                } : {
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                <div className="absolute inset-0 w-full h-full" onClick={() => handleTabClick('week')} onTouchStart={() => handleTabClick('week')}></div>
                <Calendar size={12} className="mr-1 md:mr-2 flex-shrink-0 relative z-10 pointer-events-none md:w-4 md:h-4" />
                <span className="whitespace-nowrap relative z-10 pointer-events-none">Week</span>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleTabClick('month')}
                onTouchStart={() => handleTabClick('month')}
                onTouchEnd={(e) => e.preventDefault()}
                onMouseDown={() => handleTabClick('month')}
                className={`relative px-2 py-1.5 md:px-4 md:py-3 rounded-full text-xs md:text-sm font-medium transition-all duration-300 cursor-pointer select-none touch-manipulation min-h-[36px] md:min-h-[48px] min-w-[70px] md:min-w-[100px] flex items-center justify-center ${
                  activeTab === 'month'
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
                style={activeTab === 'month' ? {
                  background: '#233CFA',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'manipulation'
                } : {
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                <div className="absolute inset-0 w-full h-full" onClick={() => handleTabClick('month')} onTouchStart={() => handleTabClick('month')}></div>
                <Star size={12} className="mr-1 md:mr-2 flex-shrink-0 relative z-10 pointer-events-none md:w-4 md:h-4" />
                <span className="whitespace-nowrap relative z-10 pointer-events-none">Month</span>
              </div>
            </div>
          </div>
          
          {/* 상위 6개 뉴스는 큰 카드로 표시 - Featured News 스타일 */}
          {newsItems.length > 0 && (
            <div className="mb-16">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {newsItems.slice(0, 6).map((news, idx) => (
                  <Link
                    key={`top-${news._id}`}
                    href={`/news/${news._id}`}
                    passHref
                  >
                    <div className="block cursor-pointer">
                      <div className="bg-white rounded-lg overflow-hidden transition-all duration-300 group relative">
                        <div className="h-64 overflow-hidden relative rounded-md">
                          {/* 이미지 */}
                          <img
                            src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                            alt={news.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={handleImageError}
                          />

                          {/* 순위 - 왼쪽 상단 (뮤직 차트 스타일) */}
                          <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center">
                            <span className="text-white font-bold text-5xl drop-shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>
                              {idx + 1}
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="font-bold text-gray-800 text-xl md:text-2xl mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#006fff] transition-colors">
                            {news.title}
                          </h3>

                          <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                            {news.content && news.content.trim()
                              ? news.content.replace(/<[^>]*>/g, '').slice(0, 120) + '...'
                              : news.summary
                                ? news.summary.slice(0, 120) + '...'
                                : 'No content available'}
                          </p>

                          <div className="flex justify-between items-end">
                            {/* 시간 배지 */}
                            <div className="flex items-center text-gray-500 text-xs">
                              <Clock size={12} className="mr-1 text-gray-500" />
                              <span>{formatDate(news.createdAt)}</span>
                            </div>

                            {/* Read more 버튼 */}
                            <span className="inline-flex items-center text-xs font-medium hover:underline cursor-pointer group" style={{ color: '#233CFA' }}>
                              Read more <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" style={{ color: '#233CFA' }} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* 7-30위 뉴스는 작은 카드로 표시 - Latest News 스타일 */}
          {newsItems.length > 6 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newsItems.slice(6).map((news, index) => (
                <Link
                  key={`list-${news._id}`}
                  href={`/news/${news._id}`}
                  passHref
                >
                  <div className="block cursor-pointer">
                    <div className="bg-white rounded-lg overflow-hidden transition-all duration-300 group relative flex gap-4">
                      {/* 썸네일 */}
                      <div className="w-32 md:w-40 h-32 flex-shrink-0 relative overflow-hidden rounded-md">
                        <img
                          src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                          alt={news.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={handleImageError}
                        />

                        {/* 순위 - 왼쪽 상단 (뮤직 차트 스타일) */}
                        <div className="absolute top-0 left-0 w-12 h-12 flex items-center justify-center">
                          <span className="text-white font-bold text-3xl drop-shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>
                            {index + 7}
                          </span>
                        </div>
                      </div>

                      {/* 콘텐츠 */}
                      <div className="flex-1 pr-4 flex flex-col justify-between h-32">
                        <div>
                          <h3 className="font-bold text-gray-800 text-base md:text-lg line-clamp-3 group-hover:text-[#006fff] transition-colors">
                            {news.title}
                          </h3>
                        </div>

                        <div className="flex items-center text-gray-500 text-xs">
                          <Clock size={12} className="mr-1 text-gray-500" />
                          <span>{formatDate(news.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          {/* 데이터가 없는 경우 */}
          {newsItems.length === 0 && !loading && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No trending news found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">Check back later for the most popular news articles.</p>
              </div>
            </div>
          )}
          
          {/* 로딩 인디케이터 */}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}
          
          {/* 하단 여백 추가 */}
          <div className="pb-24"></div>
        </div>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps() {
  try {
    // 서버 URL 설정
    const server = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:13001' 
      : 'http://localhost:3000';
    
    console.log('랭킹 페이지 - 서버에서 API 호출 시작');
    
    // 날짜 계산
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 00:00:00
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0); // 3일 전 00:00:00
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0); // 7일 전 00:00:00
    
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0); // 30일 전 00:00:00
    
    // 병렬로 모든 데이터 가져오기
    const [allResponse, todayResponse, weekResponse, monthResponse] = await Promise.all([
      // 전체 랭킹 (viewCount 기준)
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc`),
      // 최근 3일 동안 가장 인기 있는 뉴스 (조회수 기준 상위 30개)
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${threeDaysAgo.toISOString()}`),
      // 이번 주 뉴스 (createdAt 기준)
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${weekAgo.toISOString()}`),
      // 이번 달 뉴스 (createdAt 기준)
      fetch(`${server}/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${monthAgo.toISOString()}`)
    ]);
    
    const [allData, todayData, weekData, monthData] = await Promise.all([
      allResponse.json(),
      todayResponse.json(),
      weekResponse.json(),
      monthResponse.json()
    ]);
    
    console.log('랭킹 API 응답:', {
      all: allData.success ? '성공' : '실패',
      today: todayData.success ? '성공' : '실패',
      week: weekData.success ? '성공' : '실패',
      month: monthData.success ? '성공' : '실패'
    });
    
    return {
      props: {
        mostViewedNews: allData.success && allData.data?.news ? allData.data.news : [],
        todayNews: todayData.success && todayData.data?.news ? todayData.data.news : [],
        weekNews: weekData.success && weekData.data?.news ? weekData.data.news : [],
        monthNews: monthData.success && monthData.data?.news ? monthData.data.news : []
      }
    };
  } catch (error) {
    console.error('랭킹 데이터 가져오기 오류:', error);
    return {
      props: {
        mostViewedNews: [],
        todayNews: [],
        weekNews: [],
        monthNews: []
      }
    };
  }
} 