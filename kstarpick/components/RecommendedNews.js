// This component is a stateless, hooks-free version that prevents React hooks inconsistency
import Link from 'next/link';

const RecommendedNews = ({ allNews = [] }) => {
  if (!Array.isArray(allNews) || allNews.length === 0) {
    return null;
  }
  
  // 로그 출력 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    console.log("RecommendedNews - 전체 뉴스 개수:", allNews.length);
  }
  
  // Helper function to safely get from cookies
  const getCookieValue = (cookieName, defaultValue = []) => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const cookiesModule = require('js-cookie');
      const value = cookiesModule.get(cookieName);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error(`Error reading cookie ${cookieName}:`, e);
      return defaultValue;
    }
  };
  
  // Simple synchronous scoring function
  const getRecommendedNews = () => {
    try {
      // 모든 뉴스를 후보로 사용
      let candidateNews = allNews;
      
      // Get user behavior data (safely for SSR)
      const viewedNews = getCookieValue('viewedNews', []);
      const viewedCategories = getCookieValue('viewedCategories', []);
      
      // Calculate scores for candidate news
      const newsWithScores = candidateNews.map(news => {
        let score = 0;
        const newsId = news?._id || news?.id;
        
        // 기본 점수: 최신성
        score += 5; // 모든 뉴스에 기본 점수 부여
        
        // Category match
        if (viewedCategories.includes(news?.category)) {
          score += 3;
        }
        
        // Recent news boost - 최신 뉴스 가중치
        const daysSincePublished = news?.createdAt 
          ? Math.floor((new Date() - new Date(news.createdAt)) / (1000 * 60 * 60 * 24))
          : 100;
          
        if (daysSincePublished <= 3) {
          score += 5; // 최근 3일 이내의 뉴스
        } else if (daysSincePublished <= 7) {
          score += 3; // 최근 7일 이내의 뉴스
        } else if (daysSincePublished <= 30) {
          score += 1; // 최근 30일 이내의 뉴스
        }
        
        // Popularity boost - 인기 뉴스 가중치
        if (news?.views > 2000) {
          score += 3;
        } else if (news?.views > 1000) {
          score += 2;
        } else if (news?.views > 500) {
          score += 1;
        }
        
        // Already viewed penalty - 이미 본 뉴스 페널티
        if (viewedNews.includes(newsId)) {
          score -= 2;
        }
        
        return { ...news, score };
      });
      
      // Sort by score and take top 6
      const recommendations = newsWithScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
        
      // 최종 선택된 뉴스의 제목 로깅 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development') {
        console.log("RecommendedNews - 최종 선택된 뉴스:", recommendations.map(news => news.title));
      }
      
      return recommendations;
    } catch (error) {
      console.error("Error computing recommendations:", error);
      
      // 오류 발생 시 기본 추천: 단순히 첫 6개 반환
      return allNews.slice(0, 6);
    }
  };
  
  // Get recommendations without hooks
  const recommendedNews = getRecommendedNews();
  
  // Bail if no recommendations
  if (!recommendedNews.length) {
    return null;
  }
  
  // Render without hooks
  return (
    <section className="mt-16 md:mt-24 mb-8 md:mb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          {/* Love Circled Icon */}
          <div className="mr-4 flex-shrink-0">
            <img
              src="/images/icons8-love-circled-94.png"
              alt="Love Circled Icon"
              className="h-12 w-12 object-contain"
            />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-wider uppercase mb-1 block" style={{ color: '#233CFA' }}>For You</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
              Recommended News
            </h2>
          </div>
        </div>
      </div>

      {/* Desktop Grid Layout - use Next.js Link component */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {recommendedNews.map((news, idx) => (
          <div key={news._id || news.id || `desktop-${idx}`} className="bg-white rounded-lg overflow-hidden transition-all duration-300 group relative">
            <Link href={`/news/${news._id || news.id}`} passHref>
              <div className="block cursor-pointer">
                <div className="h-56 overflow-hidden relative rounded-md">
                  {news.coverImage ? (
                    <img
                      src={news.coverImage}
                      alt={news.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-md"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/placeholder.jpg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span>Image Placeholder</span>
                    </div>
                  )}
                  
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 text-xl md:text-2xl mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#8e44ad] transition-colors">
                    {news.title}
                  </h3>
                  
                  <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                    {news.content 
                      ? news.content.replace(/<[^>]*>/g, '') 
                      : news.summary || ''}
                  </p>
                  
                  <div className="flex justify-between items-end">
                    {/* 시간 배지 */}
                    <div className="flex items-center text-gray-500 text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mr-1 text-[#9b59b6]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{new Date(news.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Read more 버튼 */}
                    <span className="inline-flex items-center text-xs font-medium hover:underline cursor-pointer group" style={{ color: '#233CFA' }}>
                      Read more
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="ml-1 group-hover:animate-pulse" style={{ color: '#233CFA' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Mobile Compact Layout - use Next.js Link component */}
      <div className="md:hidden space-y-2">
        {recommendedNews.map((news, idx) => (
          <Link href={`/news/${news._id || news.id}`} key={news._id || news.id || `mobile-${idx}`} passHref>
            <div className="block bg-white overflow-hidden py-3 cursor-pointer">
              <div className="flex gap-1">
                {/* Thumbnail */}
                <div className="w-40 h-32 flex-shrink-0 relative rounded-md overflow-hidden">
                  <img
                    src={news.coverImage || '/images/placeholder.jpg'}
                    alt={news.title}
                    className="w-full h-full object-cover rounded-md"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/placeholder.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
                
                {/* Content */}
                <div className="flex-1 pt-0 pr-3 pb-0 pl-3 flex flex-col justify-between h-32">
                  <div>
                    <h3 className="text-base md:text-lg font-semibold line-clamp-3 text-gray-800 mt-2">
                      {news.title}
                    </h3>
                  </div>
                  <div className="flex items-center text-gray-500 text-xs mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(news.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RecommendedNews; 