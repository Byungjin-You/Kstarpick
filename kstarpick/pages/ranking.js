import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Eye, ChevronRight, TrendingUp, Calendar, Star, Heart, Medal, Clock, Bookmark, Music, Tv, Film, Users } from 'lucide-react';
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
    console.log('탭 클릭:', tab);
    setActiveTab(tab);
  };

  // 탭 변경 시 데이터 업데이트
  useEffect(() => {
    console.log('탭 변경:', activeTab);
    console.log('데이터 개수:', {
      mostViewedNews: mostViewedNews.length,
      todayNews: todayNews.length,
      weekNews: weekNews.length,
      monthNews: monthNews.length
    });
    
    switch (activeTab) {
      case 'today':
        setNewsItems(todayNews);
        console.log('오늘 뉴스로 변경:', todayNews.length, '개');
        break;
      case 'week':
        setNewsItems(weekNews);
        console.log('이번 주 뉴스로 변경:', weekNews.length, '개');
        break;
      case 'month':
        setNewsItems(monthNews);
        console.log('이번 달 뉴스로 변경:', monthNews.length, '개');
        break;
      default:
        setNewsItems(todayNews);
        console.log('기본값 오늘 뉴스로 변경:', todayNews.length, '개');
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
        <div className="container mx-auto px-4 py-12">
          {/* 헤더 섹션 - 셀럽 페이지와 동일한 스타일 적용 */}
          <div className="mb-8 relative">
            <div className="absolute -top-10 -left-6 w-32 h-32 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute top-12 right-20 w-40 h-40 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-40"></div>
            
            <div className="relative z-10">
              <div className="flex items-center mb-1">
                <div className="h-1.5 w-16 bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] rounded-full mr-3"></div>
                <TrendingUp size={20} className="text-[#8e44ad] animate-pulse" />
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#8e44ad] via-[#9b59b6] to-[#d35400] text-transparent bg-clip-text ml-2">
                  Top Trending
                </h1>
              </div>
              <p className="text-gray-500 text-sm mt-2">Most viewed articles ranked by popularity</p>
            </div>
          </div>
          
          {/* 일자별 필터 탭 */}
          <div className="mb-8">
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
                    ? 'bg-gradient-to-r from-[#8e44ad] via-[#9b59b6] to-[#e74c3c] text-white shadow-lg shadow-purple-500/30 border border-purple-300/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
                style={{ 
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
                    ? 'bg-gradient-to-r from-[#8e44ad] via-[#9b59b6] to-[#e74c3c] text-white shadow-lg shadow-purple-500/30 border border-purple-300/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
                style={{ 
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
                    ? 'bg-gradient-to-r from-[#8e44ad] via-[#9b59b6] to-[#e74c3c] text-white shadow-lg shadow-purple-500/30 border border-purple-300/50'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
                style={{ 
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
          
          {/* 상위 6개 뉴스는 큰 카드로 표시 */}
          {newsItems.length > 0 && (
            <div className="mb-2">
              {/* 모바일 및 데스크톱 공통 그리드 - 드라마 뉴스와 동일한 디자인 */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
                {newsItems.slice(0, 6).map((news, idx) => (
                  <div 
                    key={`top-${news._id}`}
                    className="bg-white overflow-hidden hover:shadow-sm transition-all duration-300 transform hover:-translate-y-1 group relative"
                  >
                    <Link 
                      href={`/news/${news._id}`}
                      className="absolute inset-0 z-10"
                    >
                      <span className="sr-only">View article</span>
                    </Link>
                    
                    <div className="h-56 overflow-hidden relative rounded-xl">
                      <img
                        src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                        alt={news.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={handleImageError}
                      />
                      
                      {/* 상단 장식 요소 */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8e44ad] via-[#9b59b6] to-[#d35400] opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* 순위 배지 - 이미지 왼쪽 상단에 표시 */}
                      <div className="absolute top-0 left-0 w-10 h-10 bg-gradient-to-r from-black/60 to-transparent flex items-center justify-center">
                        <span className="text-white text-lg font-bold">{idx + 1}</span>
                      </div>
                      
                      {/* 카테고리 태그 - 순위 옆에 표시 */}
                      <div className="absolute top-3 left-12 z-20">
                        <span className="px-2 py-1 text-white text-xs font-medium rounded-full backdrop-blur-sm shadow-md" 
                              style={{ background: 'linear-gradient(to right, #9333ea, #ec4899)' }}>
                          {news.category ? news.category.charAt(0).toUpperCase() + news.category.slice(1) : 'News'}
                        </span>
                      </div>
                      
                      {/* 조회수 배지 - 이미지 오른쪽 상단에 표시 */}
                      <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">
                        <div className="text-white text-xs flex items-center">
                          <Eye size={12} className="mr-1" />
                          <span>{formatCompactNumber(news.viewCount || 0)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#8e44ad] transition-colors">
                        {news.title}
                      </h3>
                      
                      <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                        {news.content 
                          ? truncateText(stripHtml(news.content), 100)
                          : news.summary}
                      </p>
                      
                      <div className="flex justify-between items-end relative z-20">
                        {/* 시간 배지 */}
                        <div className="flex items-center text-gray-500 text-xs">
                          <Calendar size={12} className="mr-1 text-[#9b59b6]" />
                          <span>{formatDate(news.createdAt)}</span>
                        </div>
                        
                        <span className="inline-flex items-center text-[#8e44ad] text-xs font-medium">
                          <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 7-30위 뉴스는 작은 카드로 표시 */}
          {newsItems.length > 6 && (
            <div className="mt-2">
              <div className="md:grid md:grid-cols-2 md:gap-4 hidden"></div>
              <div className="md:hidden space-y-2">
                {newsItems.slice(6).map((news, index) => (
                  <Link 
                    key={`list-${news._id}`}
                    href={`/news/${news._id}`}
                    passHref
                  >
                    <div className="block bg-white overflow-hidden py-3 cursor-pointer">
                      <div className="flex gap-1">
                        {/* 썸네일 */}
                        <div className="w-40 h-32 flex-shrink-0 relative rounded-xl overflow-hidden">
                          <img
                            src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                            alt={news.title}
                            className="w-full h-full object-cover rounded-xl"
                            onError={handleImageError}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          
                          {/* 순위 표시 (이미지 왼쪽 상단에 배치) */}
                          <div className="absolute top-0 left-0 w-8 h-8 bg-gradient-to-r from-black/60 to-transparent flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{index + 7}</span>
                          </div>
                        </div>
                        
                        {/* 콘텐츠 */}
                        <div className="flex-1 pt-0 pr-3 pb-0 pl-3 flex flex-col justify-between h-32">
                          <div>
                            <div className="flex items-center gap-2 items-start mb-2">
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                                    style={{ background: 'linear-gradient(to right, #9333ea, #ec4899)' }}>
                                {news.category ? news.category.charAt(0).toUpperCase() + news.category.slice(1) : 'News'}
                              </span>
                              <span className="text-pink-600 text-xs flex items-center">
                                <Eye size={12} className="mr-1" />
                                {formatCompactNumber(news.viewCount || 0)}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold line-clamp-3 text-gray-800">
                              {news.title}
                            </h3>
                          </div>
                          <div className="flex items-end justify-between w-full mt-2">
                            <div className="flex items-center text-gray-500 text-xs">
                              <Calendar size={12} className="mr-1" />
                              {formatDate(news.createdAt)}
                            </div>
                            <span className="inline-flex items-center text-[#8e44ad] text-xs font-medium">
                              <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* 데스크톱 레이아웃 */}
              <div className="hidden md:grid md:grid-cols-2 md:gap-4">
                {newsItems.slice(6).map((news, index) => (
                  <Link 
                    key={`list-desktop-${news._id}`}
                    href={`/news/${news._id}`}
                    passHref
                  >
                    <div className="block bg-white overflow-hidden py-3 cursor-pointer">
                      <div className="flex gap-1">
                        {/* 썸네일 */}
                        <div className="w-40 h-32 flex-shrink-0 relative rounded-xl overflow-hidden">
                          <img
                            src={news.coverImage || news.thumbnailUrl || '/images/news/default-news.jpg'}
                            alt={news.title}
                            className="w-full h-full object-cover rounded-xl"
                            onError={handleImageError}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          
                          {/* 순위 표시 (이미지 왼쪽 상단에 배치) */}
                          <div className="absolute top-0 left-0 w-8 h-8 bg-gradient-to-r from-black/60 to-transparent flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{index + 7}</span>
                          </div>
                        </div>
                        
                        {/* 콘텐츠 */}
                        <div className="flex-1 pt-0 pr-3 pb-0 pl-3 flex flex-col justify-between h-32">
                          <div>
                            <div className="flex items-center gap-2 items-start mb-2">
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                                    style={{ background: 'linear-gradient(to right, #9333ea, #ec4899)' }}>
                                {news.category ? news.category.charAt(0).toUpperCase() + news.category.slice(1) : 'News'}
                              </span>
                              <span className="text-pink-600 text-xs flex items-center">
                                <Eye size={12} className="mr-1" />
                                {formatCompactNumber(news.viewCount || 0)}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold line-clamp-3 text-gray-800">
                              {news.title}
                            </h3>
                          </div>
                          <div className="flex items-end justify-between w-full mt-2">
                            <div className="flex items-center text-gray-500 text-xs">
                              <Calendar size={12} className="mr-1" />
                              {formatDate(news.createdAt)}
                            </div>
                            <span className="inline-flex items-center text-[#8e44ad] text-xs font-medium">
                              <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" />
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
          
          {/* 데이터가 없는 경우 */}
          {newsItems.length === 0 && !loading && (
            <div className="text-center py-24 bg-white rounded-xl shadow-sm">
              <div className="text-gray-400 mb-6">
                <TrendingUp size={64} className="mx-auto opacity-40" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">No trending news found</h3>
              <p className="text-gray-500 max-w-md mx-auto">Check back later for the most popular news articles.</p>
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