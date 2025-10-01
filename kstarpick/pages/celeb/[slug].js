import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Instagram, Twitter, Youtube, Music, Award, Calendar, Users, Star, Globe, ArrowLeft, Heart, Share2, ExternalLink, Play, TrendingUp, Flag, Clock, ThumbsUp, Hash, Eye, Facebook, Smartphone, Crown, Mic, Disc, Radio, ChevronRight } from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import { formatCompactNumber } from '../../utils/formatHelpers';

// 소셜 미디어 아이콘 및 색상 매핑
const SocialIconMap = {
  instagram: { icon: <Instagram size={20} />, color: 'bg-gradient-to-br from-purple-500 to-pink-500 text-white', hoverColor: 'hover:from-purple-600 hover:to-pink-600' },
  twitter: { icon: <Twitter size={20} />, color: 'bg-[#1DA1F2] text-white', hoverColor: 'hover:bg-[#0d8bd9]' },
  youtube: { icon: <Youtube size={20} />, color: 'bg-[#FF0000] text-white', hoverColor: 'hover:bg-[#cc0000]' },
  spotify: { icon: <Music size={20} />, color: 'bg-[#1ED760] text-white', hoverColor: 'hover:bg-[#1bb452]' },
  tiktok: { icon: <Hash size={20} />, color: 'bg-black text-white', hoverColor: 'hover:bg-gray-800' },
  fancafe: { icon: <Star size={20} />, color: 'bg-[#FFA500] text-white', hoverColor: 'hover:bg-[#e69500]' }
};

// 뱃지 색상 맵핑
const BadgeColorMap = {
  '200M': 'bg-[#ff7a7a]',
  '100M': 'bg-[#ff7a7a]',
  '90M': 'bg-black',
  '80M': 'bg-black',
  '70M': 'bg-black',
  '60M': 'bg-black',
  '50M': 'bg-black',
  default: 'bg-gray-800'
};

// 뱃지 컴포넌트
const ViewBadge = ({ count, rank, className = "" }) => {
  const formattedCount = formatCompactNumber(count, 0);
  const bgColor = BadgeColorMap[formattedCount] || BadgeColorMap.default;
  
  return (
    <div className={`relative ${className}`}>
      {rank && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#ff3e8e] text-white flex items-center justify-center text-xs font-bold z-10">
          {rank}
        </div>
      )}
      <div className={`hexagon-badge ${bgColor} p-4 text-white flex flex-col items-center justify-center relative`}>
        <span className="text-xl font-bold">{formattedCount}</span>
        <span className="text-[10px] uppercase leading-tight text-center">
          {count >= 1000000 ? 'MILLION VIEWS' : 'THOUSAND VIEWS'}
        </span>
        <div className="absolute top-3 left-3 text-white opacity-70">
          <Play size={12} />
        </div>
      </div>
    </div>
  );
};

// 시간 경과 포맷팅 함수
const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffMonth / 12);
  
  if (diffYear > 0) return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  if (diffMonth > 0) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffMin > 0) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  return 'just now';
};

export default function CelebrityDetailPage({ celebrity = null }) {
  const router = useRouter();
  const { slug } = router.query;
  
  // 페이지 로딩 상태
  const [isLoading, setIsLoading] = useState(!celebrity);
  const [isLiked, setIsLiked] = useState(false);

  // 스크롤 애니메이션을 위한 상태
  const [scrollY, setScrollY] = useState(0);

  // 추천 아티스트 상태 추가
  const [recommendedArtists, setRecommendedArtists] = useState([]);
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(true);
  
  // 관련 뉴스 상태 추가
  const [relatedNews, setRelatedNews] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // 스크롤 이벤트 리스너 추가
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 이미지 에러 핸들러
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/images/placeholder.jpg';
  };
  
  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // 좋아요 토글 함수
  const toggleLike = () => {
    setIsLiked(!isLiked);
  };
  
  // 추천 아티스트 가져오기
  useEffect(() => {
    if (celebrity && celebrity._id) {
      const fetchRecommendedArtists = async () => {
        try {
          setIsLoadingRecommended(true);
          const response = await fetch(`/api/celeb/recommended/${celebrity._id}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              setRecommendedArtists(data.data);
            }
          }
        } catch (error) {
          console.error('추천 아티스트 가져오기 오류:', error);
        } finally {
          setIsLoadingRecommended(false);
        }
      };
      
      fetchRecommendedArtists();
    }
  }, [celebrity]);
  
  // 관련 뉴스 가져오기
  useEffect(() => {
    if (celebrity && celebrity.name) {
      const fetchRelatedNews = async () => {
        try {
          setIsLoadingNews(true);
          
          // 먼저 연예인 이름으로 검색하여 관련 뉴스 가져오기
          const response = await fetch(`/api/news?q=${encodeURIComponent(celebrity.name)}&limit=6`);
          
          if (response.ok) {
            const data = await response.json();
            
            // 검색 결과가 있으면 사용
            if (data.success && data.data && data.data.news && data.data.news.length > 0) {
              setRelatedNews(data.data.news);
            } else {
              // 검색 결과가 없으면 최신 뉴스 가져오기
              const latestNewsResponse = await fetch('/api/news?limit=6');
              
              if (latestNewsResponse.ok) {
                const latestNewsData = await latestNewsResponse.json();
                
                if (latestNewsData.success && latestNewsData.data && latestNewsData.data.news && latestNewsData.data.news.length > 0) {
                  setRelatedNews(latestNewsData.data.news);
                } else {
                  // 최신 뉴스도 없으면 celeb 카테고리 뉴스 가져오기
                  const celebNewsResponse = await fetch('/api/news/celeb?limit=6');
                  
                  if (celebNewsResponse.ok) {
                    const celebNewsData = await celebNewsResponse.json();
                    
                    if (celebNewsData.success && celebNewsData.data && celebNewsData.data.length > 0) {
                      setRelatedNews(celebNewsData.data);
                    } else {
                      // 모든 API에서 데이터를 가져오지 못한 경우 빈 배열 설정
                      setRelatedNews([]);
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('뉴스 가져오기 오류:', error);
          setRelatedNews([]);
        } finally {
          setIsLoadingNews(false);
        }
      };
      
      fetchRelatedNews();
    }
  }, [celebrity]);
  
  // 데이터가 없는 경우 로딩 또는 오류 표시
  if (router.isFallback || isLoading) {
    return (
      <MainLayout>
        <div className="min-h-[90vh] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-[3px] border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#ff3e8e] animate-spin"></div>
            </div>
            <p className="mt-6 text-gray-600 font-medium">Loading celebrity information...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (!celebrity) {
    return (
      <MainLayout>
        <div className="min-h-[90vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Celebrity not found</h2>
            <p className="text-gray-600 mb-6">The requested celebrity information does not exist or has been removed.</p>
            <Link href="/celeb" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ff3e8e] to-[#ff7461] text-white rounded-lg font-medium transition-transform hover:scale-105">
              <ArrowLeft size={18} />
              <span>Return to Celebrity List</span>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // 셀럽 카테고리에 따른 아이콘 및 색상 설정
  const isSolo = celebrity.category === 'solo';
  const categoryIcon = isSolo ? <Mic size={20} /> : <Users size={20} />;
  const categoryText = isSolo ? 'Solo Artist' : 'Group';

  // 뮤직비디오 개수 확인
  const hasMusicVideos = celebrity.musicVideos && celebrity.musicVideos.length > 0;
  
  return (
    <MainLayout>
      <Head>
        <title>{celebrity.name} - K-POP News Portal</title>
        <meta name="description" content={`${celebrity.name}의 상세 정보와 소셜 미디어 통계`} />
        <meta property="og:title" content={`${celebrity.name} - K-POP News Portal`} />
        <meta property="og:description" content={`${celebrity.name}의 상세 정보와 소셜 미디어 통계`} />
        <meta property="og:image" content={celebrity.profileImage || '/images/placeholder.jpg'} />
        <meta property="og:url" content={`https://kpop-news-portal.vercel.app/celeb/${slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${celebrity.name} - K-POP News Portal`} />
        <meta name="twitter:description" content={`${celebrity.name}의 상세 정보와 소셜 미디어 통계`} />
        <meta name="twitter:image" content={celebrity.profileImage || '/images/placeholder.jpg'} />
      </Head>
      
      {/* 글로벌 스타일 */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .clip-hex {
          clip-path: polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%);
        }
        
        .triangle {
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }
        
        .bg-gradient {
          background: linear-gradient(120deg, #ff3e8e, #ff7461);
        }
        
        .frosted-blur {
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        
        .text-stroke {
          -webkit-text-stroke: 1px rgba(0,0,0,0.1);
        }
        
        .section-header {
          position: relative;
          overflow: hidden;
          padding: 0.7rem 1.5rem 0.7rem 1rem;
          border-radius: 0;
          background: transparent;
          transition: all 0.3s ease;
          box-shadow: none;
          border-left: 4px solid transparent;
          border-image: linear-gradient(to bottom, #ff3e8e, #ff7461) 1;
        }
        
        .section-header:hover {
          background: transparent;
          transform: translateY(-2px);
          box-shadow: none;
        }
        
        .section-header .icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          transition: all 0.3s ease;
        }
        
        .section-header:hover .icon-wrapper {
          transform: scale(1.1) rotate(5deg);
        }
        
        .section-title {
          position: relative;
          display: inline-block;
          margin-bottom: 0;
          padding-left: 0.5rem;
          font-weight: 800;
          background: linear-gradient(120deg, #ff3e8e, #ff7461);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }
        
        .section-title::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #ff3e8e, #ff7461);
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        
        .section-header:hover .section-title::after {
          width: 100%;
        }
        
        .progress-gradient {
          background: linear-gradient(90deg, #ff3e8e, #ff7461);
        }
        
        .video-card-shadow {
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }
        
        .scroll-indicator {
          position: absolute;
          bottom: 3rem;
          left: 50%;
          transform: translateX(-50%);
          width: 30px;
          height: 50px;
          border: 2px solid rgba(255, 255, 255, 0.8);
          border-radius: 15px;
          display: flex;
          justify-content: center;
          z-index: 10;
        }
        
        .scroll-indicator::before {
          content: '';
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 8px;
          animation: scroll 2s infinite;
        }
        
        @keyframes scroll {
          0% { opacity: 1; transform: translateY(0); }
          70% { opacity: 1; transform: translateY(20px); }
          100% { opacity: 0; transform: translateY(25px); }
        }
        
        /* 뱃지 애니메이션 */
        @keyframes pulse-subtle {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }

        @keyframes shine {
          0% { background-position: -100px; }
          100% { background-position: 300px; }
        }
        
        /* 업그레이드된 뱃지 스타일 */
        .hexagon-badge {
          clip-path: polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%);
          width: 100px;
          height: 110px;
          position: relative;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 1;
          filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2));
        }
        
        /* 뱃지 테두리 효과 */
        .hexagon-badge::after {
          content: '';
          position: absolute;
          inset: 0;
          clip-path: polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03));
          opacity: 0.3;
          z-index: 0;
        }
        
        /* 뱃지 텍스처 효과 */
        .hexagon-badge::before {
          content: '';
          position: absolute;
          inset: 0;
          clip-path: polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%);
          background-image: 
            linear-gradient(45deg, rgba(255, 255, 255, 0) 45%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0) 55%);
          background-size: 250px;
          animation: shine 3s infinite linear;
          z-index: 1;
        }
        
        /* 1억~10억 단위 뱃지 스타일 */
        .badge-1b, .badge-2b, .badge-5b {
          background: linear-gradient(135deg, #843cf6, #2878fe, #843cf6);
          box-shadow: 
            0 15px 30px rgba(132, 60, 246, 0.4), 
            inset 0 -4px 0 rgba(0, 0, 0, 0.3), 
            inset 0 2px 0 rgba(255, 255, 255, 0.4);
          animation: pulse-subtle 3s infinite;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        /* 1억~10억 단위 뱃지 스타일 */
        .badge-300m, .badge-500m, .badge-700m, .badge-900m {
          background: linear-gradient(135deg, #ff3838, #ff5757, #ff3838);
          box-shadow: 
            0 15px 25px rgba(255, 56, 56, 0.3), 
            inset 0 -4px 0 rgba(0, 0, 0, 0.3), 
            inset 0 2px 0 rgba(255, 255, 255, 0.4);
        }
        
        /* 200M 뱃지 스타일 */
        .badge-200m {
          background: linear-gradient(135deg, #ff4d4d, #ff0066, #ff3333);
          box-shadow: 
            0 15px 25px rgba(255, 0, 102, 0.3), 
            inset 0 -4px 0 rgba(0, 0, 0, 0.3), 
            inset 0 2px 0 rgba(255, 255, 255, 0.4);
          animation: pulse-subtle 3s infinite;
        }
        
        /* 100M 뱃지 스타일 */
        .badge-100m {
          background: linear-gradient(135deg, #ff5e62, #ff8c66, #ff5e62);
          box-shadow: 
            0 15px 25px rgba(255, 94, 98, 0.3), 
            inset 0 -4px 0 rgba(0, 0, 0, 0.3), 
            inset 0 2px 0 rgba(255, 255, 255, 0.4);
        }
        
        /* 90M-50M 뱃지 스타일 */
        .badge-90m, .badge-80m, .badge-70m, .badge-60m, .badge-50m {
          background: linear-gradient(135deg, #111, #333, #222);
          box-shadow: 
            0 15px 25px rgba(0, 0, 0, 0.4), 
            inset 0 -4px 0 rgba(0, 0, 0, 0.5), 
            inset 0 2px 0 rgba(255, 255, 255, 0.1);
        }
        
        /* 40M-10M 뱃지 스타일 */
        .badge-40m, .badge-30m, .badge-20m, .badge-10m, .badge-5m {
          background: linear-gradient(135deg, #333, #444, #333);
          box-shadow: 
            0 15px 20px rgba(0, 0, 0, 0.3), 
            inset 0 -4px 0 rgba(0, 0, 0, 0.4), 
            inset 0 2px 0 rgba(255, 255, 255, 0.1);
        }
        
        /* 뱃지 내부 컨텐츠 */
        .badge-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        
        /* 조회수 텍스트 스타일 */
        .view-count {
          font-size: 32px;
          font-weight: 800;
          font-family: 'Montserrat', sans-serif;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          letter-spacing: -1px;
          color: white;
          margin-top: -5px;
          transform: scale(1, 0.95);
        }
        
        /* MILLION VIEWS 텍스트 스타일 */
        .million-text {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          white-space: nowrap;
          transform: rotate(-30deg);
          position: absolute;
          bottom: 18px;
          right: 5px;
          color: rgba(255, 255, 255, 0.9);
        }
        
        /* 플레이 아이콘 스타일 */
        .play-icon {
          position: absolute;
          top: 14px;
          left: 14px;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
          transform: scale(1.1);
        }
        
        /* 호버 효과 */
        .hexagon-badge:hover {
          transform: translateY(-5px) scale(1.05);
          filter: drop-shadow(0 20px 25px rgba(0, 0, 0, 0.3));
          animation: flip-y-rotation 1.5s ease-in-out;
          transform-style: preserve-3d;
          perspective: 1000px;
        }
        
        /* Y축 기준으로 한 바퀴 도는 애니메이션 */
        @keyframes flip-y-rotation {
          0% { transform: translateY(-5px) scale(1.05) rotateY(0deg); }
          100% { transform: translateY(-5px) scale(1.05) rotateY(360deg); }
        }
        
        /* 뱃지 카운트 스타일 */
        .badge-count-bubble {
          position: absolute;
          top: -10px;
          right: -15px;
          min-width: 28px;
          height: 28px;
          border-radius: 14px;
          background: linear-gradient(to bottom right, #ff3e8e, #ff6a8e);
          color: white;
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 5px 10px rgba(255, 77, 141, 0.4),
            inset 0 -2px 0 rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          border: 2px solid white;
          transition: all 0.3s ease;
          z-index: 20;
          padding: 0 4px;
          transform: scale(1);
        }
        
        .hexagon-badge:hover + .badge-count-bubble,
        .badge-count-bubble:hover {
          transform: scale(1.15);
        }
        
        /* 뱃지 호버시 내부 콘텐츠는 반대 방향으로 회전하여 고정 효과 */
        .hexagon-badge:hover .badge-content {
          animation: none; /* 내부 콘텐츠 애니메이션 제거 */
        }
        
        @keyframes counter-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
      `}</style>
      
      <div className="relative">
        {/* 배경 이미지 & 오버레이 */}
        <div className="absolute inset-0 h-[100vh] overflow-hidden">
          {celebrity.profileImage ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-white z-10"></div>
              <img 
                src={celebrity.profileImage} 
                alt="" 
                className="w-full h-full object-cover object-center scale-110 filter blur-sm"
                onError={handleImageError}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-[#ff3e8e]/50 to-white"></div>
          )}
          
          {/* 장식 요소 */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-pink-300 animate-float" style={{ animationDelay: '0s' }}></div>
            <div className="absolute top-[40%] left-[15%] w-3 h-3 rounded-full bg-pink-400 animate-float" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-[30%] left-[25%] w-2 h-2 rounded-full bg-pink-200 animate-float" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-[50%] left-[80%] w-2 h-2 rounded-full bg-pink-400 animate-float" style={{ animationDelay: '1.5s' }}></div>
            <div className="absolute top-[25%] left-[70%] w-3 h-3 rounded-full bg-pink-300 animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-[60%] left-[60%] w-2 h-2 rounded-full bg-pink-200 animate-float" style={{ animationDelay: '2.5s' }}></div>
          </div>
        </div>
        
        {/* 메인 콘텐츠 */}
        <div className="relative z-10 pt-8 px-4 min-h-screen flex flex-col justify-center">
          {/* 뒤로가기 버튼 */}
          <div className="max-w-7xl mx-auto w-full">
            <Link href="/celeb" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-all">
              <ArrowLeft size={16} />
              <span>Back</span>
            </Link>
          </div>
          
          {/* 프로필 헤더 */}
          <div className="max-w-7xl mx-auto mt-16 md:mt-20 mb-8 w-full">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-end text-white">
              {/* 프로필 이미지 */}
              <div className="relative">
                <div className="w-40 h-40 md:w-60 md:h-60 rounded-full overflow-hidden border-4 border-white/80 shadow-xl">
                  <img 
                    src={celebrity.profileImage} 
                    alt={celebrity.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                </div>
                
                {/* 카테고리 배지 */}
                <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-[#ff3e8e] to-[#ff7461] flex items-center justify-center shadow-lg">
                  {categoryIcon}
                </div>
              </div>
              
              {/* 이름 및 기본 정보 */}
              <div className="text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 md:gap-4">
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight text-stroke animate-fadeIn">
                    {celebrity.name}
                  </h1>
                  {celebrity.koreanName && (
                    <p className="text-xl md:text-2xl font-medium text-white/90">
                      {celebrity.koreanName}
                    </p>
                  )}
                </div>
                
                {/* 기본 정보 */}
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-6 text-white/90">
                  {celebrity.agency && (
                    <div className="flex items-center gap-2">
                      <Globe size={18} className="text-pink-200" />
                      <span>{celebrity.agency}</span>
                    </div>
                  )}
                  
                  {celebrity.debutDate && (
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-pink-200" />
                      <span>{formatDate(celebrity.debutDate)}</span>
                    </div>
                  )}
                  
                  {celebrity.followers > 0 && (
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-pink-200" />
                      <span>{formatCompactNumber(celebrity.followers)} Followers</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 스크롤 다운 인디케이터 */}
          <div className="scroll-indicator">
            <span className="sr-only">스크롤하여 더 보기</span>
          </div>
        </div>
      </div>
      
      {/* 메인 콘텐츠 영역 */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          {/* 프로필 섹션 - 데이터 그리드 */}
          <section className="mb-24">
            <div className="flex items-center mb-6 section-header">
              <h2 className="text-3xl font-bold text-gray-800 section-title flex items-center">
                <span className="icon-wrapper">
                  <Users size={24} className="text-[#ff3e8e]" />
                </span>
                Profile Information
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
              {/* 왼쪽 컬럼 - 상세 정보 */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* 정보 아이템들 */}
                  {celebrity.agency && (
                    <div className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-[#ff3e8e]">
                        <Globe size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Agency</p>
                        <p className="font-medium text-gray-800 text-lg">{celebrity.agency}</p>
                      </div>
                    </div>
                  )}
                  
                  {celebrity.debutDate && (
                    <div className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Debut Date</p>
                        <p className="font-medium text-gray-800 text-lg">{formatDate(celebrity.debutDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  {celebrity.group && (
                    <div className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                        <Users size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Group</p>
                        <p className="font-medium text-gray-800 text-lg">{celebrity.group}</p>
                      </div>
                    </div>
                  )}
                  
                  {celebrity.role && (
                    <div className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                        <Mic size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Role</p>
                        <p className="font-medium text-gray-800 text-lg">{celebrity.role}</p>
                      </div>
                    </div>
                  )}
                  
                  {celebrity.followers > 0 && (
                    <div className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                        <Users size={24} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Followers</p>
                        <p className="font-medium text-gray-800 text-lg">{formatCompactNumber(celebrity.followers)}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 바이오그래피 */}
                {celebrity.bio && (
                  <div className="mt-10">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Star size={18} className="text-[#ff3e8e]" />
                      <span>Biography</span>
                    </h3>
                    <div className="prose max-w-none text-gray-600 leading-relaxed bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <p>{celebrity.bio}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          
          {/* 뮤직비디오 뱃지 섹션 */}
          {hasMusicVideos && (
            <section className="mb-24">
              <div className="flex items-center mb-6 section-header">
                <h2 className="text-3xl font-bold text-gray-800 section-title flex items-center">
                  <span className="icon-wrapper">
                    <Award size={24} className="text-[#ff3e8e]" />
                  </span>
                  MUSIC VIDEO BADGES
                </h2>
              </div>
              <p className="text-gray-500 mb-10 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full flex items-center justify-center bg-gray-200 text-gray-500 text-xs">ⓘ</span>
                <span>Check out badges based on music video view counts</span>
              </p>
              
              <div className="relative px-4 py-12 max-w-6xl mx-auto">
                {/* 배경 타이틀 텍스트 제거 */}
                
                {/* 뱃지 그리드 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 relative z-10">
                  {(() => {
                    // 뮤직비디오를 조회수 기준으로 그룹화
                    const badges = [
                      { threshold: 5000000000, label: '5B', class: 'badge-5b', count: 0 },
                      { threshold: 2000000000, label: '2B', class: 'badge-2b', count: 0 },
                      { threshold: 1000000000, label: '1B', class: 'badge-1b', count: 0 },
                      { threshold: 900000000, label: '900M', class: 'badge-900m', count: 0 },
                      { threshold: 700000000, label: '700M', class: 'badge-700m', count: 0 },
                      { threshold: 500000000, label: '500M', class: 'badge-500m', count: 0 },
                      { threshold: 300000000, label: '300M', class: 'badge-300m', count: 0 },
                      { threshold: 200000000, label: '200M', class: 'badge-200m', count: 0 },
                      { threshold: 100000000, label: '100M', class: 'badge-100m', count: 0 },
                      { threshold: 90000000, label: '90M', class: 'badge-90m', count: 0 },
                      { threshold: 80000000, label: '80M', class: 'badge-80m', count: 0 },
                      { threshold: 70000000, label: '70M', class: 'badge-70m', count: 0 },
                      { threshold: 60000000, label: '60M', class: 'badge-60m', count: 0 },
                      { threshold: 50000000, label: '50M', class: 'badge-50m', count: 0 },
                      { threshold: 40000000, label: '40M', class: 'badge-40m', count: 0 },
                      { threshold: 30000000, label: '30M', class: 'badge-30m', count: 0 },
                      { threshold: 20000000, label: '20M', class: 'badge-20m', count: 0 },
                      { threshold: 10000000, label: '10M', class: 'badge-10m', count: 0 },
                      { threshold: 5000000, label: '5M', class: 'badge-5m', count: 0 }
                    ];
                    
                    // 각 뱃지별 뮤직비디오 개수 계산
                    celebrity.musicVideos.forEach(video => {
                      for (let i = 0; i < badges.length; i++) {
                        if (video.views >= badges[i].threshold) {
                          badges[i].count++;
                          break;
                        }
                      }
                    });
                    
                    // 개수가 있는 뱃지만 필터링
                    return badges
                      .filter(badge => badge.count > 0)
                      .map((badge, idx) => {
                        // 뱃지별 특별 스타일 적용
                        let badgeStyle = {};
                        let fontStyle = {};
                        
                        // 1000만~1억 미만 범위의 뱃지에 특별 스타일 적용
                        if (badge.threshold >= 10000000 && badge.threshold < 100000000) {
                          // 90M, 80M은 이미 스타일이 있으니 70M부터 10M까지 추가 스타일링
                          if (badge.threshold === 70000000) {
                            badgeStyle = {
                              background: 'linear-gradient(135deg, #1a1a1a, #333, #1a1a1a)',
                              boxShadow: '0 15px 25px rgba(0, 0, 0, 0.4), inset 0 -4px 0 rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                            };
                          } else if (badge.threshold === 60000000) {
                            badgeStyle = {
                              background: 'linear-gradient(135deg, #222, #383838, #222)',
                              boxShadow: '0 15px 25px rgba(0, 0, 0, 0.35), inset 0 -4px 0 rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                            };
                          } else if (badge.threshold === 50000000) {
                            badgeStyle = {
                              background: 'linear-gradient(135deg, #252525, #3d3d3d, #252525)',
                              boxShadow: '0 15px 25px rgba(0, 0, 0, 0.35), inset 0 -4px 0 rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                            };
                          } else if (badge.threshold === 40000000) {
                            badgeStyle = {
                              background: 'linear-gradient(135deg, #2a2a2a, #444, #2a2a2a)',
                              boxShadow: '0 15px 20px rgba(0, 0, 0, 0.3), inset 0 -4px 0 rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                            };
                          } else if (badge.threshold === 30000000) {
                            badgeStyle = {
                              background: 'linear-gradient(135deg, #303030, #4a4a4a, #303030)',
                              boxShadow: '0 15px 20px rgba(0, 0, 0, 0.3), inset 0 -4px 0 rgba(0, 0, 0, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.1)'
                            };
                          } else if (badge.threshold === 20000000) {
                            badgeStyle = {
                              background: 'linear-gradient(135deg, #353535, #505050, #353535)',
                              boxShadow: '0 15px 20px rgba(0, 0, 0, 0.25), inset 0 -4px 0 rgba(0, 0, 0, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.15)'
                            };
                          } else if (badge.threshold === 10000000) {
                            badgeStyle = {
                              background: 'linear-gradient(135deg, #3a3a3a, #555, #3a3a3a)',
                              boxShadow: '0 15px 20px rgba(0, 0, 0, 0.25), inset 0 -4px 0 rgba(0, 0, 0, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.15)'
                            };
                            fontStyle = { textShadow: '0 2px 3px rgba(0, 0, 0, 0.6)' };
                          }
                        }
                        
                        // 10억 이상 뱃지 특별 스타일
                        if (badge.threshold >= 1000000000) {
                          // 특별 빛나는 효과와 색상 적용
                          badgeStyle = {
                            background: `linear-gradient(135deg, ${badge.threshold >= 5000000000 ? '#843cf6, #2878fe, #843cf6' : 
                                                                  badge.threshold >= 2000000000 ? '#7a42f4, #3980f5, #7a42f4' : 
                                                                  '#704cf2, #478bf2, #704cf2'})`,
                            boxShadow: '0 20px 30px rgba(132, 60, 246, 0.4), inset 0 -4px 0 rgba(0, 0, 0, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.3)'
                          };
                          fontStyle = { 
                            color: 'white',
                            textShadow: '0 0 10px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.6)',
                            fontWeight: '900'
                          };
                        }
                        // 1억~10억 미만 뱃지 특별 스타일
                        else if (badge.threshold >= 100000000 && badge.threshold < 1000000000) {
                          if (badge.threshold >= 300000000) {
                            const intensity = badge.threshold >= 700000000 ? '0.4' : 
                                           badge.threshold >= 500000000 ? '0.35' : '0.3';
                            badgeStyle = {
                              background: `linear-gradient(135deg, #ff3838, #ff5757, #ff3838)`,
                              boxShadow: `0 15px 25px rgba(255, 56, 56, ${intensity}), inset 0 -4px 0 rgba(0, 0, 0, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.4)`
                            };
                            fontStyle = { 
                              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                              fontWeight: badge.threshold >= 500000000 ? '900' : '800'
                            };
                          }
                        }
                        
                        return (
                          <div key={badge.label} className="flex justify-center relative">
                            <div className={`hexagon-badge ${badge.class}`} style={badgeStyle}>
                              <div className="badge-content">
                                <span className="view-count" style={fontStyle}>{badge.label}</span>
                                <span className="million-text">
                                  {badge.threshold >= 1000000000 ? 'BILLION VIEWS' :
                                   badge.threshold >= 1000000 ? 'MILLION VIEWS' : 'THOUSAND VIEWS'}
                                </span>
                                <div className="play-icon">
                                  <Play size={16} strokeWidth={2.5} />
                                </div>
                              </div>
                            </div>
                            
                            {/* 뱃지 개수 카운트 */}
                            <div className="badge-count-bubble">
                              {badge.count}
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
                
                {/* 설명 텍스트 */}
                <div className="text-center mt-10 text-gray-500 text-sm">
                  <p>The numbers indicate the count of music videos that reached the respective view count</p>
                </div>
              </div>
            </section>
          )}
          
          {/* SNS 팔로워 통계 섹션 */}
          <section className="mb-24">
            <div className="flex items-center mb-6 section-header">
              <h2 className="text-3xl font-bold text-gray-800 section-title flex items-center">
                <span className="icon-wrapper">
                  <TrendingUp size={24} className="text-[#ff3e8e]" />
                </span>
                TODAY
              </h2>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-10">
              <p className="text-gray-500 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full flex items-center justify-center bg-gray-200 text-gray-500 text-xs">ⓘ</span>
                <span>Current platform subscribers and rankings compared to the previous day ({new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')})</span>
              </p>
              <div className="inline-flex items-center gap-1 text-sm text-gray-500 px-2 py-1 bg-gray-50 rounded-full">
                <ExternalLink size={14} />
                <span>Click each card to visit official social media</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* YouTube */}
              {celebrity.socialMediaFollowers?.youtube > 0 && (
                <a 
                  href={celebrity.socialMedia?.youtube || "#"}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 opacity-70 group-hover:opacity-90 transition-opacity"></div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-red-500 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  
                  <div className="p-6 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Youtube className="text-red-500" size={24} />
                        </div>
                        <h3 className="text-2xl font-bold">YouTube</h3>
                      </div>
                      
                      {celebrity.socialMedia?.youtube && (
                        <div className="rounded-full p-2 bg-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                          <ExternalLink size={16} className="text-red-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline">
                        <div className="text-4xl font-black text-gray-800">{celebrity.socialMediaFollowers.youtube.toLocaleString()}</div>
                        {celebrity.socialMediaRankings?.youtube > 0 && (
                          <div className="ml-3 py-1 px-2 bg-white/50 rounded-full text-sm font-semibold text-gray-700">
                            Rank <span className="text-red-500">{celebrity.socialMediaRankings.youtube}</span>
                          </div>
                        )}
                      </div>
                      
                      {celebrity.socialMediaChanges?.youtube && (
                        <div className={`flex items-center gap-2 ${
                          celebrity.socialMediaChanges.youtube.count > 0 
                            ? 'text-red-600' 
                            : celebrity.socialMediaChanges.youtube.count < 0 
                              ? 'text-blue-600' 
                              : 'text-gray-500'
                        }`}>
                          <div className="flex items-center text-sm font-medium bg-white/50 rounded-full py-1 px-3">
                            <span className="mr-1">
                              {celebrity.socialMediaChanges.youtube.count > 0 
                                ? '▲' 
                                : celebrity.socialMediaChanges.youtube.count < 0 
                                  ? '▼' 
                                  : '⊖'
                              }
                            </span>
                            <span>
                              {Math.abs(celebrity.socialMediaChanges.youtube.count).toLocaleString()} 
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            ({celebrity.socialMediaChanges.youtube.percent.toFixed(2)}%)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              )}
              
              {/* Instagram */}
              {celebrity.socialMediaFollowers?.instagram > 0 && (
                <a 
                  href={celebrity.socialMedia?.instagram || "#"}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-100 opacity-70 group-hover:opacity-90 transition-opacity"></div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-pink-500 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  
                  <div className="p-6 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Instagram className="text-pink-500" size={24} />
                        </div>
                        <h3 className="text-2xl font-bold">Instagram</h3>
                      </div>
                      
                      {celebrity.socialMedia?.instagram && (
                        <div className="rounded-full p-2 bg-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                          <ExternalLink size={16} className="text-pink-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline">
                        <div className="text-4xl font-black text-gray-800">{celebrity.socialMediaFollowers.instagram.toLocaleString()}</div>
                        {celebrity.socialMediaRankings?.instagram > 0 && (
                          <div className="ml-3 py-1 px-2 bg-white/50 rounded-full text-sm font-semibold text-gray-700">
                            Rank <span className="text-pink-500">{celebrity.socialMediaRankings.instagram}</span>
                          </div>
                        )}
                      </div>
                      
                      {celebrity.socialMediaChanges?.instagram && (
                        <div className={`flex items-center gap-2 ${
                          celebrity.socialMediaChanges.instagram.count > 0 
                            ? 'text-red-600' 
                            : celebrity.socialMediaChanges.instagram.count < 0 
                              ? 'text-blue-600' 
                              : 'text-gray-500'
                        }`}>
                          <div className="flex items-center text-sm font-medium bg-white/50 rounded-full py-1 px-3">
                            <span className="mr-1">
                              {celebrity.socialMediaChanges.instagram.count > 0 
                                ? '▲' 
                                : celebrity.socialMediaChanges.instagram.count < 0 
                                  ? '▼' 
                                  : '⊖'
                              }
                            </span>
                            <span>
                              {Math.abs(celebrity.socialMediaChanges.instagram.count).toLocaleString()} 
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            ({celebrity.socialMediaChanges.instagram.percent.toFixed(2)}%)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              )}
              
              {/* Twitter */}
              {celebrity.socialMediaFollowers?.twitter > 0 && (
                <a 
                  href={celebrity.socialMedia?.twitter || "#"}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-70 group-hover:opacity-90 transition-opacity"></div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-blue-500 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  
                  <div className="p-6 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Twitter className="text-blue-500" size={24} />
                        </div>
                        <h3 className="text-2xl font-bold">Twitter</h3>
                      </div>
                      
                      {celebrity.socialMedia?.twitter && (
                        <div className="rounded-full p-2 bg-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                          <ExternalLink size={16} className="text-blue-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline">
                        <div className="text-4xl font-black text-gray-800">{celebrity.socialMediaFollowers.twitter.toLocaleString()}</div>
                        {celebrity.socialMediaRankings?.twitter > 0 && (
                          <div className="ml-3 py-1 px-2 bg-white/50 rounded-full text-sm font-semibold text-gray-700">
                            Rank <span className="text-blue-500">{celebrity.socialMediaRankings.twitter}</span>
                          </div>
                        )}
                      </div>
                      
                      {celebrity.socialMediaChanges?.twitter && (
                        <div className={`flex items-center gap-2 ${
                          celebrity.socialMediaChanges.twitter.count > 0 
                            ? 'text-red-600' 
                            : celebrity.socialMediaChanges.twitter.count < 0 
                              ? 'text-blue-600' 
                              : 'text-gray-500'
                        }`}>
                          <div className="flex items-center text-sm font-medium bg-white/50 rounded-full py-1 px-3">
                            <span className="mr-1">
                              {celebrity.socialMediaChanges.twitter.count > 0 
                                ? '▲' 
                                : celebrity.socialMediaChanges.twitter.count < 0 
                                  ? '▼' 
                                  : '⊖'
                              }
                            </span>
                            <span>
                              {Math.abs(celebrity.socialMediaChanges.twitter.count).toLocaleString()} 
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            ({celebrity.socialMediaChanges.twitter.percent.toFixed(2)}%)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              )}
              
              {/* Spotify */}
              {celebrity.socialMediaFollowers?.spotify > 0 && (
                <a 
                  href={celebrity.socialMedia?.spotify || "#"}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-70 group-hover:opacity-90 transition-opacity"></div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-green-500 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  
                  <div className="p-6 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Music className="text-green-500" size={24} />
                        </div>
                        <h3 className="text-2xl font-bold">Spotify</h3>
                      </div>
                      
                      {celebrity.socialMedia?.spotify && (
                        <div className="rounded-full p-2 bg-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                          <ExternalLink size={16} className="text-green-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline">
                        <div className="text-4xl font-black text-gray-800">{celebrity.socialMediaFollowers.spotify.toLocaleString()}</div>
                        {celebrity.socialMediaRankings?.spotify > 0 && (
                          <div className="ml-3 py-1 px-2 bg-white/50 rounded-full text-sm font-semibold text-gray-700">
                            Rank <span className="text-green-500">{celebrity.socialMediaRankings.spotify}</span>
                          </div>
                        )}
                      </div>
                      
                      {celebrity.socialMediaChanges?.spotify && (
                        <div className={`flex items-center gap-2 ${
                          celebrity.socialMediaChanges.spotify.count > 0 
                            ? 'text-red-600' 
                            : celebrity.socialMediaChanges.spotify.count < 0 
                              ? 'text-blue-600' 
                              : 'text-gray-500'
                        }`}>
                          <div className="flex items-center text-sm font-medium bg-white/50 rounded-full py-1 px-3">
                            <span className="mr-1">
                              {celebrity.socialMediaChanges.spotify.count > 0 
                                ? '▲' 
                                : celebrity.socialMediaChanges.spotify.count < 0 
                                  ? '▼' 
                                  : '⊖'
                              }
                            </span>
                            <span>
                              {Math.abs(celebrity.socialMediaChanges.spotify.count).toLocaleString()} 
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            ({celebrity.socialMediaChanges.spotify.percent.toFixed(2)}%)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              )}
              
              {/* TikTok */}
              {celebrity.socialMediaFollowers?.tiktok > 0 && (
                <a 
                  href={celebrity.socialMedia?.tiktok || "#"}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-70 group-hover:opacity-90 transition-opacity"></div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-black opacity-10 group-hover:opacity-20 transition-opacity"></div>
                  
                  <div className="p-6 relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Hash className="text-black" size={24} />
                        </div>
                        <h3 className="text-2xl font-bold">TikTok</h3>
                      </div>
                      
                      {celebrity.socialMedia?.tiktok && (
                        <div className="rounded-full p-2 bg-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2">
                          <ExternalLink size={16} className="text-black" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-baseline">
                        <div className="text-4xl font-black text-gray-800">{celebrity.socialMediaFollowers.tiktok.toLocaleString()}</div>
                        {celebrity.socialMediaRankings?.tiktok > 0 && (
                          <div className="ml-3 py-1 px-2 bg-white/50 rounded-full text-sm font-semibold text-gray-700">
                            Rank <span className="text-black">{celebrity.socialMediaRankings.tiktok}</span>
                          </div>
                        )}
                      </div>
                      
                      {celebrity.socialMediaChanges?.tiktok && (
                        <div className={`flex items-center gap-2 ${
                          celebrity.socialMediaChanges.tiktok.count > 0 
                            ? 'text-red-600' 
                            : celebrity.socialMediaChanges.tiktok.count < 0 
                              ? 'text-blue-600' 
                              : 'text-gray-500'
                        }`}>
                          <div className="flex items-center text-sm font-medium bg-white/50 rounded-full py-1 px-3">
                            <span className="mr-1">
                              {celebrity.socialMediaChanges.tiktok.count > 0 
                                ? '▲' 
                                : celebrity.socialMediaChanges.tiktok.count < 0 
                                  ? '▼' 
                                  : '⊖'
                              }
                            </span>
                            <span>
                              {Math.abs(celebrity.socialMediaChanges.tiktok.count).toLocaleString()} 
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            ({celebrity.socialMediaChanges.tiktok.percent.toFixed(2)}%)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              )}
              
              {/* Fallback message if no social media data is available */}
              {!celebrity.socialMediaFollowers || 
               Object.values(celebrity.socialMediaFollowers).every(count => count === 0) && (
                <div className="lg:col-span-2 bg-gray-50 rounded-xl p-8 text-center border border-gray-100">
                  <div className="text-gray-400 mb-4">
                    <Users size={32} className="mx-auto" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Social Media Data Available</h3>
                  <p className="text-gray-500">Social media data for this artist has not been collected yet.</p>
                </div>
              )}
            </div>
            
            {/* Display update time if available */}
            {celebrity.socialMediaUpdatedAt && (
              <p className="text-right text-xs text-gray-400 mt-3 italic">
                Last updated: {new Date(celebrity.socialMediaUpdatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </section>
          
          {/* 뮤직비디오 섹션 */}
          {hasMusicVideos && (
            <section className="mb-24 scroll-mt-24" id="musicvideos">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
                <div className="flex items-center section-header">
                  <h2 className="text-3xl font-bold text-gray-800 section-title flex items-center">
                    <span className="icon-wrapper">
                      <Play size={24} className="text-[#ff3e8e]" />
                    </span>
                    Music Videos
                  </h2>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2 mt-2 md:mt-0">
                  <Youtube size={16} className="text-[#ff3e8e]" />
                  <span>Based on YouTube views</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {celebrity.musicVideos.map((video, index) => (
                  <div key={index} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] video-card-shadow">
                    {/* 썸네일 */}
                    <a 
                      href={video.youtubeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block relative group"
                    >
                      <div className="aspect-video overflow-hidden">
                        <img 
                          src={video.thumbnails?.medium?.url || video.thumbnails?.default?.url || '/placeholder-video.jpg'} 
                          alt={video.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={handleImageError}
                        />
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                            <Play size={28} className="text-[#ff3e8e] ml-1" />
                          </div>
                        </div>
                      </div>
                      
                      {/* 조회수 및 날짜 정보 */}
                      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="flex items-center justify-between text-white">
                          <div className="flex items-center gap-2">
                            <Eye size={14} />
                            <span className="text-sm font-medium">{formatCompactNumber(video.views)}</span>
                          </div>
                          
                          {video.publishedAt && (
                            <div className="text-xs">
                              {new Date(video.publishedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </a>
                    
                    {/* 비디오 정보 */}
                    <div className="p-5">
                      <a 
                        href={video.youtubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <h3 className="text-lg font-bold text-gray-800 hover:text-[#ff3e8e] transition-colors line-clamp-2 mb-2">{video.title}</h3>
                      </a>
                      
                      {video.artists && video.artists.length > 0 && (
                        <p className="text-gray-500 text-sm mb-4 flex items-center gap-1.5">
                          <Users size={14} />
                          <span>{video.artists.join(', ')}</span>
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        {video.likes > 0 && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <ThumbsUp size={14} />
                            <span className="text-sm">{formatCompactNumber(video.likes)}</span>
                          </div>
                        )}
                        
                        <a 
                          href={video.youtubeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#ff3e8e] hover:underline text-sm font-medium flex items-center gap-1"
                        >
                          <span>Watch Video</span>
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          {/* 추천 아티스트 섹션 - 뮤직비디오 아래로 이동 */}
          <section className="mb-24">
            <div className="flex items-center mb-6 section-header">
              <h2 className="text-3xl font-bold text-gray-800 section-title flex items-center">
                <span className="icon-wrapper">
                  <Star size={24} className="text-[#ff3e8e]" />
                </span>
                Recommended Artists
              </h2>
            </div>
            <p className="text-gray-500 mb-10">
              K-POP artists to check out with {celebrity.name}
            </p>
            
            {isLoadingRecommended ? (
              // 로딩 상태
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="text-center animate-pulse">
                    <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 bg-gray-200"></div>
                    <div className="h-5 bg-gray-200 rounded w-20 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded w-16 mx-auto"></div>
                  </div>
                ))}
              </div>
            ) : recommendedArtists.length === 0 ? (
              // 데이터 없음
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <p className="text-gray-500">No recommended artists available</p>
              </div>
            ) : (
              // 추천 아티스트 목록
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                {recommendedArtists.map((artist) => (
                  <Link 
                    href={`/celeb/${artist.slug}`} 
                    key={artist._id}
                    className="text-center group"
                  >
                    <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 border-2 border-transparent group-hover:border-[#ff3e8e] transition-all shadow-sm group-hover:shadow-md">
                      <img 
                        src={artist.profileImage || "/images/placeholder.jpg"} 
                        alt={artist.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={handleImageError}
                      />
                    </div>
                    <h3 className="font-bold text-gray-800 group-hover:text-[#ff3e8e] transition-colors">{artist.name}</h3>
                    <p className="text-xs text-gray-500">
                      {artist.group ? `${artist.group}` : artist.category === 'solo' ? 'Solo' : 'K-POP'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
          
          {/* 관련 소식 섹션 */}
          <section className="mb-24">
            <div className="flex items-center mb-6 section-header">
              <h2 className="text-3xl font-bold text-gray-800 section-title flex items-center">
                <span className="icon-wrapper">
                  <Globe size={24} className="text-[#ff3e8e]" />
                </span>
                Related News
              </h2>
            </div>
            
            {isLoadingNews ? (
              // 로딩 상태 UI
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm animate-pulse">
                    <div className="h-56 bg-gray-200 rounded-xl"></div>
                    <div className="p-4">
                      <div className="h-5 bg-gray-200 rounded mb-3 w-3/4"></div>
                      <div className="h-3 bg-gray-100 rounded mb-2 w-full"></div>
                      <div className="h-3 bg-gray-100 rounded mb-2 w-5/6"></div>
                      <div className="h-3 bg-gray-100 rounded w-4/6"></div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="h-3 bg-gray-100 rounded w-20"></div>
                        <div className="h-3 bg-gray-100 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : relatedNews.length === 0 ? (
              // 데이터가 없는 경우
              <div className="mt-10 flex flex-col items-center justify-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="text-center max-w-lg">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">No Related News</h3>
                  <p className="text-gray-600">
                    We couldn't find any news related to {celebrity.name} at the moment.<br />
                    Please check back later.
                  </p>
                </div>
              </div>
            ) : (
              // 뉴스 목록
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                {relatedNews.map((news) => (
                  <div 
                    key={news._id} 
                    className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group relative"
                  >
                    <Link 
                      href={`/news/${news.slug || news._id}`}
                      className="absolute inset-0 z-10"
                    >
                      <span className="sr-only">View article</span>
                    </Link>
                    
                    <div className="h-56 overflow-hidden relative rounded-xl">
                      <img
                        src={news.thumbnail || news.coverImage || '/images/news/default-news.jpg'}
                        alt={news.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-xl"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/news/default-news.jpg';
                        }}
                      />
                      
                      {/* 상단 그라데이션 바 */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff3e8e] via-[#ff8360] to-[#ff61ab] opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* 카테고리 배지 */}
                      {news.category && (
                        <div className="absolute top-3 left-3 bg-[#ff3e8e]/80 text-white text-xs font-medium py-1 px-2 rounded backdrop-blur-sm">
                          {news.category}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#ff3e8e] transition-colors">
                        {news.title}
                      </h3>
                      
                      <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                        {news.summary || news.content?.substring(0, 120)}
                      </p>
                      
                      <div className="flex justify-between items-end relative z-20">
                        {/* 시간 배지 */}
                        <div className="flex items-center text-gray-500 text-xs">
                          <Clock size={12} className="mr-1 text-[#ff3e8e]" />
                          <span>{formatTimeAgo(news.createdAt || news.publishedAt)}</span>
                        </div>
                        
                        {/* Read more 버튼 */}
                        <span className="inline-flex items-center text-[#ff3e8e] text-xs font-medium hover:underline cursor-pointer">
                          Read more <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

export async function getServerSideProps({ params }) {
  try {
    // 서버 URL 설정
    const server = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:13001'
      : 'http://localhost:3000';
    
    // 셀럽 정보 가져오기
    const response = await fetch(`${server}/api/celeb/slug/${params.slug}`);
    
    // 응답 확인
    if (!response.ok) {
      console.error(`Failed to fetch celebrity info: ${response.status}`);
      return {
        props: {
          celebrity: null
        }
      };
    }
    
    const data = await response.json();
    
    // 데이터 성공적으로 가져왔는지 확인
    if (data.success && data.data) {
      return {
        props: {
          celebrity: data.data
        }
      };
    }
    
    // 데이터가 없는 경우
    return {
      props: {
        celebrity: null
      }
    };
  } catch (error) {
    console.error('Error getting celebrity detail info:', error);
    return {
      props: {
        celebrity: null
      }
    };
  }
} 