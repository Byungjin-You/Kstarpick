import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Instagram, Twitter, Youtube, Music, Award, Calendar, Users, Star, Globe, ArrowLeft, Heart, Share2, ExternalLink, Play, TrendingUp, Flag, Clock, ThumbsUp, Hash, Eye, Facebook, Smartphone, Crown, Mic, Disc, Radio, ChevronRight } from 'lucide-react';
import MainLayout from '../../components/MainLayout';
import { formatCompactNumber } from '../../utils/formatHelpers';
import CommentTicker from '../../components/home/CommentTicker';
import TrendingNow from '../../components/home/TrendingNow';
import MoreNews from '../../components/MoreNews';

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

// Editor's PICK helper
const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function CelebrityDetailPage({ celebrity = null, recentComments, rankingNews }) {
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

  // Sidebar sticky (PC)
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);

  // 뱃지 설명 모달 상태
  const [showBadgeInfoModal, setShowBadgeInfoModal] = useState(false);
  const [showTodayInfoModal, setShowTodayInfoModal] = useState(false);

  // 스크롤 이벤트 리스너 추가
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sidebar sticky ResizeObserver (PC)
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
        setSidebarStickyTop(vH - sH - 40);
      }
    };
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

  // 스크롤 위치 복원 로직 - celeb 페이지에서 뒤로가기 시
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isBackToCeleb = sessionStorage.getItem('isBackToCeleb');
    const savedScrollPosition = sessionStorage.getItem('celebDetailScrollPosition');

    if (isBackToCeleb === 'true' && savedScrollPosition) {
      const scrollPos = parseInt(savedScrollPosition, 10);

      const restoreScroll = () => {
        // body에 직접 스크롤 설정
        document.body.scrollTop = scrollPos;
        document.documentElement.scrollTop = scrollPos;
        window.scrollTo(0, scrollPos);
      };

      // 여러 시도로 동적 콘텐츠 로딩을 고려
      setTimeout(restoreScroll, 0);
      setTimeout(restoreScroll, 50);
      setTimeout(restoreScroll, 100);
      setTimeout(restoreScroll, 200);
      setTimeout(restoreScroll, 300);
      setTimeout(restoreScroll, 500);
      setTimeout(restoreScroll, 800);

      requestAnimationFrame(() => {
        setTimeout(restoreScroll, 100);
        setTimeout(restoreScroll, 300);
        setTimeout(restoreScroll, 500);
      });

      // 플래그 제거
      setTimeout(() => {
        sessionStorage.removeItem('isBackToCeleb');
        sessionStorage.removeItem('celebDetailScrollPosition');
      }, 1000);
    }
  }, [router.asPath]);
  
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

  // Navigate helper
  const navigateToPage = (path, e) => {
    if (e) e.preventDefault();
    if (router.pathname === path || router.asPath === path) return false;
    try {
      router.push(path, undefined, { shallow: false });
    } catch (error) {
      window.location.href = path;
    }
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
          const response = await fetch(`/api/news?q=${encodeURIComponent(celebrity.name)}&limit=12`);
          
          if (response.ok) {
            const data = await response.json();
            
            // 검색 결과가 있으면 사용
            if (data.success && data.data && data.data.news && data.data.news.length > 0) {
              setRelatedNews(data.data.news);
            } else {
              // 검색 결과가 없으면 최신 뉴스 가져오기
              const latestNewsResponse = await fetch(`/api/news?limit=12`);
              
              if (latestNewsResponse.ok) {
                const latestNewsData = await latestNewsResponse.json();
                
                if (latestNewsData.success && latestNewsData.data && latestNewsData.data.news && latestNewsData.data.news.length > 0) {
                  setRelatedNews(latestNewsData.data.news);
                } else {
                  // 최신 뉴스도 없으면 celeb 카테고리 뉴스 가져오기
                  const celebNewsResponse = await fetch(`/api/news/celeb?limit=12`);
                  
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
          width: 130px;
          height: 140px;
          position: relative;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 1;
          filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2));
          border-radius: 16px;
        }
        
        /* 뱃지 테두리 효과 */
        .hexagon-badge::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.03));
          opacity: 0.3;
          z-index: 0;
        }

        /* 뱃지 텍스처 효과 */
        .hexagon-badge::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
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
          font-size: 38px;
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
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.85);
        }

        /* 플레이 아이콘 스타일 */
        .play-icon {
          position: absolute;
          top: 18px;
          left: 24px;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
          transform: scale(1.2);
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
          background: #1d1a27;
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
      
      {/* Mobile layout */}
      <div className="lg:hidden">
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
        <div className="relative z-10 -mt-16 px-4 min-h-screen flex flex-col justify-center">
          {/* 뒤로가기 버튼 */}
          <div className="max-w-7xl mx-auto w-full">
            <Link href="/celeb" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-all">
              <ArrowLeft size={16} />
              <span>Back</span>
            </Link>
          </div>
          
          {/* 프로필 헤더 */}
          <div className="max-w-7xl mx-auto mt-8 md:mt-12 mb-8 w-full">
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
              </div>
              
              {/* 이름 및 기본 정보 */}
              <div className="text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 md:gap-4">
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight text-stroke animate-fadeIn">
                    {celebrity.name}
                  </h1>
                </div>
                
                {/* 기본 정보 */}
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-6 text-white/90">
                  {celebrity.agency && (
                    <div className="flex items-center gap-2">
                      <Globe size={18} />
                      <span>{celebrity.agency}</span>
                    </div>
                  )}

                  {celebrity.debutDate && (
                    <div className="flex items-center gap-2">
                      <Calendar size={18} />
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
            <div className="flex items-center mb-6">
              <h2 className="text-3xl font-bold text-black">
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
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <img src="/images/icons8-globe-94.png" alt="Agency" className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Agency</p>
                        <p className="font-bold text-gray-800 text-lg">{celebrity.agency}</p>
                      </div>
                    </div>
                  )}

                  {celebrity.debutDate && (
                    <div className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <img src="/images/icons8-calendar-94.png" alt="Debut Date" className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Debut Date</p>
                        <p className="font-bold text-gray-800 text-lg">{formatDate(celebrity.debutDate)}</p>
                      </div>
                    </div>
                  )}

                  {celebrity.group && (
                    <div className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <Users size={32} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Group</p>
                        <p className="font-medium text-gray-800 text-lg">{celebrity.group}</p>
                      </div>
                    </div>
                  )}

                  {celebrity.role && (
                    <div className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <img src="/images/icons8-profile-94.png" alt="Role" className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Role</p>
                        <p className="font-bold text-gray-800 text-lg">{celebrity.role}</p>
                      </div>
                    </div>
                  )}

                  {celebrity.followers > 0 && (
                    <div className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <Users size={32} className="text-blue-500" />
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
            <section className="mb-24 -mt-8 md:mt-12">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-3xl font-bold text-black">
                  Badges
                </h2>
                <button
                  onClick={() => setShowBadgeInfoModal(true)}
                  className="text-gray-500 hover:text-gray-700 text-lg cursor-pointer transition-colors"
                  title="More information"
                >
                  ⓘ
                </button>
              </div>

              {/* 모달 */}
              {showBadgeInfoModal && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                  onClick={() => setShowBadgeInfoModal(false)}
                >
                  <div
                    className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800">Music Video Badges</h3>
                      <button
                        onClick={() => setShowBadgeInfoModal(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Check out badges based on music video view counts
                    </p>
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => setShowBadgeInfoModal(false)}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="relative px-4 py-12 max-w-6xl mx-auto">
                {/* 배경 타이틀 텍스트 제거 */}
                
                {/* 뱃지 그리드 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-12 relative z-10">
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
              </div>
            </section>
          )}
          
          {/* SNS 팔로워 통계 섹션 */}
          <section className="mb-24 -mt-8 md:mt-12">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-3xl font-bold text-black">
                Today
              </h2>
              <button
                onClick={() => setShowTodayInfoModal(true)}
                className="text-gray-500 hover:text-gray-700 text-lg cursor-pointer transition-colors"
                title="More information"
              >
                ⓘ
              </button>
            </div>

            {/* 모달 */}
            {showTodayInfoModal && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowTodayInfoModal(false)}
              >
                <div
                  className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">TODAY</h3>
                    <button
                      onClick={() => setShowTodayInfoModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    Current platform subscribers and rankings compared to the previous day ({new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')})
                  </p>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setShowTodayInfoModal(false)}
                      className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* YouTube */}
              {celebrity.socialMediaFollowers?.youtube > 0 && (
                <a
                  href={celebrity.socialMedia?.youtube || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group overflow-hidden rounded-xl transition-all duration-300 relative bg-white"
                >
                  
                  <div className="p-3 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <img src="/images/icons8-youtube-logo-94.png" alt="YouTube" className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-bold">YouTube</h3>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline">
                        <div className="text-2xl font-black" style={{color: '#797585'}}>{celebrity.socialMediaFollowers.youtube.toLocaleString()}</div>
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
                  className="group overflow-hidden rounded-xl transition-all duration-300 relative bg-white"
                >
                  
                  <div className="p-3 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <img src="/images/icons8-instagram-logo-94.png" alt="Instagram" className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-bold">Instagram</h3>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline">
                        <div className="text-2xl font-black" style={{color: '#797585'}}>{celebrity.socialMediaFollowers.instagram.toLocaleString()}</div>
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
                  className="group overflow-hidden rounded-xl transition-all duration-300 relative bg-white"
                >
                  
                  <div className="p-3 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <img src="/images/icons8-x-94.png" alt="X" className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-bold">X</h3>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline">
                        <div className="text-2xl font-black" style={{color: '#797585'}}>{celebrity.socialMediaFollowers.twitter.toLocaleString()}</div>
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
                  className="group overflow-hidden rounded-xl transition-all duration-300 relative bg-white"
                >
                  
                  <div className="p-3 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <img src="/images/icons8-spotify-logo-94.png" alt="Spotify" className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-bold">Spotify</h3>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline">
                        <div className="text-2xl font-black" style={{color: '#797585'}}>{celebrity.socialMediaFollowers.spotify.toLocaleString()}</div>
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
                  className="group overflow-hidden rounded-xl transition-all duration-300 relative bg-white"
                >
                  
                  <div className="p-3 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <img src="/images/icons8-tiktok-logo-94.png" alt="TikTok" className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-bold">TikTok</h3>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline">
                        <div className="text-2xl font-black" style={{color: '#797585'}}>{celebrity.socialMediaFollowers.tiktok.toLocaleString()}</div>
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
          </section>
          
          {/* 뮤직비디오 섹션 */}
          {hasMusicVideos && (
            <section className="mb-24 -mt-8 md:mt-12 scroll-mt-24" id="musicvideos">
              <div className="flex items-center mb-6">
                <h2 className="text-3xl font-bold text-black">
                  Music Videos
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {celebrity.musicVideos.map((video, index) => (
                  <div key={index} className="bg-white rounded-lg transition-all duration-300 group relative">
                    {/* 썸네일 */}
                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative"
                    >
                      <div className="h-64 overflow-hidden relative rounded-md">
                        <img
                          src={video.thumbnails?.medium?.url || video.thumbnails?.default?.url || '/placeholder-video.jpg'}
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-md"
                          onError={handleImageError}
                        />
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-md">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                            <Play size={28} className="text-[#233CFA] ml-1" />
                          </div>
                        </div>
                      </div>

                      {/* 조회수 및 날짜 정보 */}
                      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent rounded-b-md">
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
                        <h3 className="text-lg font-bold text-gray-800 line-clamp-2 mb-2">{video.title}</h3>
                      </a>
                      
                      {video.artists && video.artists.length > 0 && (
                        <p className="text-gray-500 text-sm mb-4 flex items-center gap-1.5">
                          <img src="/images/icons8-youtube-logo-94.png" alt="YouTube" className="w-4 h-4" />
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
                          className="text-[#233CFA] hover:underline text-sm font-medium flex items-center gap-1"
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
          <section className="mb-24 -mt-8 md:mt-12">
            <div className="flex items-center mb-6">
              <h2 className="text-3xl font-bold text-black">
                Recommended Artists
              </h2>
            </div>

            {isLoadingRecommended ? (
              // 로딩 상태
              <div className="flex overflow-x-auto md:grid md:grid-cols-4 lg:grid-cols-6 gap-8 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="text-center animate-pulse flex-shrink-0">
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
              // 추천 아티스트 목록 - 모바일: 가로 스크롤, 데스크톱: 그리드
              <div className="flex overflow-x-auto md:grid md:grid-cols-4 lg:grid-cols-6 gap-8 pb-4 pl-4 md:pl-0 snap-x snap-mandatory md:snap-none">
                {recommendedArtists.map((artist, index) => (
                  <Link
                    href={`/celeb/${artist.slug}`}
                    key={artist._id}
                    className="text-center group flex-shrink-0 snap-start"
                  >
                    <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 border-2 border-transparent group-hover:border-[#233CFA] transition-all shadow-sm group-hover:shadow-md">
                      <img
                        src={artist.profileImage || "/images/placeholder.jpg"}
                        alt={artist.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={handleImageError}
                      />
                    </div>
                    <h3 className="font-bold text-gray-800 group-hover:text-[#233CFA] transition-colors">{artist.name}</h3>
                    <p className="text-xs text-gray-500">
                      {artist.group ? `${artist.group}` : artist.category === 'solo' ? 'Solo' : 'K-POP'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
          
          {/* 관련 소식 섹션 - 드라마 상세페이지와 동일한 디자인 */}
          <section className="mb-24 -mt-8 md:mt-12">
            <div className="mb-8">
              <div className="flex items-center">
                {/* Link Icon */}
                <div className="mr-4 flex-shrink-0">
                  <img
                    src="/images/icons8-link-48.png"
                    alt="Related News"
                    className="h-12 w-12 object-contain"
                  />
                </div>
                <div>
                  <span className="text-sm font-semibold tracking-wider uppercase mb-1 block" style={{ color: '#233CFA' }}>Related Content</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Related News</h2>
                </div>
              </div>
            </div>

            {/* 뉴스 카드 그리드 - 드라마 상세페이지와 동일한 디자인 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedNews && relatedNews.length > 0 ? (
                relatedNews.map((news, index) => (
                  <Link
                    key={index}
                    href={`/news/${news._id}`}
                    passHref
                    onClick={() => {
                      // 현재 스크롤 위치 저장
                      if (typeof window !== 'undefined') {
                        const scrollPosition = document.body.scrollTop || window.pageYOffset || document.documentElement.scrollTop;
                        sessionStorage.setItem('celebDetailScrollPosition', scrollPosition.toString());
                        sessionStorage.setItem('isBackToCeleb', 'true');
                      }
                    }}
                  >
                    <div className="block cursor-pointer">
                      <div className="bg-white rounded-lg overflow-hidden transition-all duration-300 group relative">
                        <div className="h-64 overflow-hidden relative rounded-md">
                          {/* 이미지 */}
                          <img
                            src={news.coverImage || news.thumbnail || '/images/placeholder.jpg'}
                            alt={news.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/images/placeholder.jpg";
                            }}
                          />
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
                              <span>{new Date(news.publishedAt || news.createdAt).toLocaleDateString()}</span>
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
                ))
              ) : (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-100 col-span-full" style={{ boxShadow: 'none' }}>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Related News</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    No news related to this content is currently available.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      </div> {/* end lg:hidden */}

      {/* PC Layout (lg+) */}
      <div className="hidden lg:block">

        {/* PC Main Content: 2-column */}
        <div className="bg-[#F8F9FA]">
          <div className="max-w-[1772px] mx-auto pt-8 pb-16">
            <div className="flex flex-row gap-[60px]">

              {/* Left: single large card (1212px) — matches Figma Frame 234 */}
              <div className="w-[1212px] flex-shrink-0 bg-white rounded-xl overflow-hidden border-[1.5px] border-[#E5E7EB]">

                {/* PC Hero — Figma Frame 232 */}
                <div className="relative overflow-hidden" style={{ height: '650px' }}>
                  {/* Full-width artist photo */}
                  <img
                    src={celebrity.profileImage || '/images/placeholder.jpg'}
                    alt={celebrity.name}
                    className="absolute left-0 w-full object-cover"
                    style={{ top: '-97px', width: '1212px', height: '968px' }}
                    onError={handleImageError}
                  />
                  {/* Layer 1: Blur — gradually increases from top to bottom */}
                  <div
                    className="absolute left-0 right-0 bottom-0 pointer-events-none"
                    style={{
                      top: '304px',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 50%, black 70%)',
                      maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 50%, black 70%)',
                    }}
                  />
                  {/* Layer 2: Gradient color overlay + content */}
                  <div
                    className="absolute left-0 right-0 bottom-0 flex flex-col justify-center"
                    style={{
                      top: '304px',
                      padding: '100px 0px 30px 40px',
                      background: 'linear-gradient(0deg, rgba(255,255,255,1) 0%, rgba(196,203,216,1) 15%, rgba(88,97,113,0.88) 40%, rgba(0,7,20,0.33) 70%, rgba(0,7,20,0) 100%)',
                    }}
                  >
                    {/* Name */}
                    <h1 className="font-bold text-[42px] leading-[1.286em] text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {celebrity.name}
                    </h1>
                    {/* Agency */}
                    {celebrity.agency && (
                      <p className="text-[16px]" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Roboto, sans-serif' }}>
                        {celebrity.agency}
                      </p>
                    )}
                    {/* Bio + More link */}
                    {celebrity.bio && (
                      <div className="pt-4 pb-2" style={{ maxWidth: '640px' }}>
                        <p className="text-[14px] text-white leading-[1.4em] line-clamp-3" style={{ fontFamily: 'Roboto, sans-serif' }}>
                          {celebrity.bio}
                        </p>
                        <button
                          className="text-[14px] font-medium text-white uppercase tracking-wide mt-2 hover:opacity-80 transition-opacity"
                          style={{ fontFamily: 'Roboto, sans-serif' }}
                          onClick={() => {/* scroll to bio or expand */}}
                        >
                          MORE
                        </button>
                      </div>
                    )}
                    {/* Likes pill button — Figma 437:7609 */}
                    <div className="flex items-center pt-4">
                      <div
                        className="flex items-center justify-center gap-1 rounded-full cursor-default"
                        style={{
                          padding: '10px 20px',
                          background: 'rgba(255,255,255,0.9)',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 15.75L7.9125 14.7638C3.9 11.1113 1.125 8.58375 1.125 5.5125C1.125 2.985 3.0975 1.0125 5.625 1.0125C7.0575 1.0125 8.4325 1.67625 9 2.73375C9.5675 1.67625 10.9425 1.0125 12.375 1.0125C14.9025 1.0125 16.875 2.985 16.875 5.5125C16.875 8.58375 14.1 11.1113 10.0875 14.7638L9 15.75Z" fill="#000000"/>
                        </svg>
                        <span className="font-semibold text-[14px] tracking-wide" style={{ color: '#111111', fontFamily: 'Inter, sans-serif', lineHeight: '1.07em' }}>
                          {(() => {
                            const totalFollowers = Object.values(celebrity.socialMediaFollowers || {}).reduce((sum, v) => sum + (v || 0), 0);
                            if (totalFollowers >= 1000000) return `${(totalFollowers / 1000000).toFixed(0)}M Likes`;
                            if (totalFollowers >= 1000) return `${(totalFollowers / 1000).toFixed(0)}K Likes`;
                            return `${totalFollowers} Likes`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badges Section — Figma 437:7614 (YouTube view milestone cards) */}
                {(() => {
                  if (!celebrity.musicVideos || celebrity.musicVideos.length === 0) return null;
                  const badgeThresholds = [
                    { threshold: 1000000000, label: '1B' },
                    { threshold: 500000000, label: '500M' },
                    { threshold: 300000000, label: '300M' },
                    { threshold: 200000000, label: '200M' },
                    { threshold: 100000000, label: '100M' },
                    { threshold: 50000000, label: '50M' },
                    { threshold: 30000000, label: '30M' },
                    { threshold: 10000000, label: '10M' },
                    { threshold: 5000000, label: '5M' },
                  ];
                  badgeThresholds.forEach(b => { b.count = 0; });
                  celebrity.musicVideos.forEach(video => {
                    for (let i = 0; i < badgeThresholds.length; i++) {
                      if (video.views >= badgeThresholds[i].threshold) {
                        badgeThresholds[i].count++;
                        break;
                      }
                    }
                  });
                  const earned = badgeThresholds.filter(b => b.count > 0).slice(0, 4);
                  if (earned.length === 0) return null;
                  const cardStyles = [
                    { bg: 'linear-gradient(46deg, #064AEC 8%, #5491F5 51%, #064AEC 90%)', textGrad: 'linear-gradient(158deg, #fff, #A3D0FF)', iconEnd: '#A3D0FF' },
                    { bg: 'linear-gradient(48deg, #3A43FF 4%, #8B61FF 54%, #5F07EC 100%)', textGrad: 'linear-gradient(158deg, #fff, #fff)', iconEnd: '#EFF7FF' },
                    { bg: 'linear-gradient(47deg, #6A06EC 8%, #BA59FF 56%, #A706EC 100%)', textGrad: 'linear-gradient(158deg, #fff, #FFCBFB)', iconEnd: '#FFCBFB' },
                    { bg: 'linear-gradient(46deg, #1A1D22 8%, #4C5156 51%, #1A1D22 90%)', textGrad: 'linear-gradient(158deg, #fff, #999)', iconEnd: '#999999' },
                  ];
                  return (
                    <div className="px-10 py-[30px]">
                      <div className="flex items-center gap-1 mb-[30px] relative">
                        <h2 className="font-black text-[26px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                          Badges
                        </h2>
                        <button
                          className="cursor-pointer hover:opacity-70 transition-opacity"
                          onClick={(e) => {
                            const popup = e.currentTarget.nextElementSibling;
                            popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
                          }}
                        >
                          <img src="/images/badge-header-icon.svg" alt="info" width={24} height={24} />
                        </button>
                        <div
                          className="absolute left-0 z-50 bg-white rounded-xl shadow-lg border border-[#E5E7EB] p-5"
                          style={{ display: 'none', top: '40px', width: '300px' }}
                          onClick={(e) => { e.currentTarget.style.display = 'none'; }}
                        >
                          <p className="font-bold text-[16px] text-[#111111] mb-2">Music Video Badges</p>
                          <p className="text-[14px] text-[#6B7280]">Check out badges based on music video view counts</p>
                        </div>
                      </div>
                      <div className="flex flex-row gap-4">
                        {earned.map((badge, idx) => {
                          const style = cardStyles[idx % cardStyles.length];
                          return (
                            <div
                              key={badge.label}
                              className="flex flex-row justify-between"
                              style={{
                                width: '200px',
                                background: style.bg,
                                borderRadius: '12px',
                                boxShadow: 'inset -1.5px 1.5px 1.2px rgba(255,255,255,0.4), inset 0px -3px 2px rgba(0,0,0,0.37)',
                                padding: '12px 16px 26px 26px',
                              }}
                            >
                              <div className="flex flex-col gap-3 pt-2">
                                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4.3335 13.0007V9.14399C4.3335 4.35566 7.72433 2.39483 11.8735 4.78899L15.221 6.71733L18.5685 8.64566C22.7177 11.0398 22.7177 14.9615 18.5685 17.3557L15.221 19.284L11.8735 21.2123C7.72433 23.6065 4.3335 21.6457 4.3335 16.8573V13.0007Z" fill={`url(#badge_icon_${idx})`}/>
                                  <defs><linearGradient id={`badge_icon_${idx}`} x1="13" y1="3.77" x2="52.84" y2="33.13" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor={style.iconEnd}/></linearGradient></defs>
                                </svg>
                                <div className="flex flex-col gap-[6px]">
                                  <span
                                    className="font-bold text-[34px] leading-[0.82em]"
                                    style={{
                                      background: style.textGrad,
                                      WebkitBackgroundClip: 'text',
                                      WebkitTextFillColor: 'transparent',
                                      fontFamily: 'Inter, sans-serif',
                                      letterSpacing: '-0.01em',
                                    }}
                                  >
                                    {badge.label}
                                  </span>
                                  <span
                                    className="font-semibold text-[14px]"
                                    style={{
                                      background: style.textGrad,
                                      WebkitBackgroundClip: 'text',
                                      WebkitTextFillColor: 'transparent',
                                      fontFamily: 'Inter, sans-serif',
                                      letterSpacing: '-0.03em',
                                    }}
                                  >
                                    MILLION VIEWS
                                  </span>
                                </div>
                              </div>
                              <div
                                className="flex items-center justify-center self-start rounded-full"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  background: 'rgba(255,255,255,0.25)',
                                }}
                              >
                                <span className="text-white font-bold text-[12px]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                  {badge.count}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Today Section — Figma 437:7666 (SNS follower stats) */}
                {(() => {
                  const platformConfigs = [
                    { key: 'youtube', label: 'Youtube', icon: '/images/icons8-youtube-logo-94.png' },
                    { key: 'instagram', label: 'Instagram', icon: '/images/icons8-instagram-logo-94.png' },
                    { key: 'twitter', label: 'X', icon: '/images/icons8-x-50.png' },
                    { key: 'spotify', label: 'Spotify', icon: '/images/icons8-spotify-logo-94.png' },
                    { key: 'tiktok', label: 'TikTok', icon: '/images/icons8-tiktok-logo-94.png' },
                  ];
                  const activePlatforms = platformConfigs.filter(p => celebrity.socialMediaFollowers?.[p.key] > 0);
                  if (activePlatforms.length === 0) return null;
                  return (
                    <div className="px-10 py-[30px]">
                      <div className="flex items-center gap-1 mb-[30px] relative">
                        <h2 className="font-black text-[26px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                          Today
                        </h2>
                        <button
                          className="cursor-pointer hover:opacity-70 transition-opacity"
                          onClick={(e) => {
                            const popup = e.currentTarget.nextElementSibling;
                            popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
                          }}
                        >
                          <img src="/images/badge-header-icon.svg" alt="info" width={24} height={24} />
                        </button>
                        <div
                          className="absolute left-0 z-50 bg-white rounded-xl shadow-lg border border-[#E5E7EB] p-5"
                          style={{ display: 'none', top: '40px', width: '340px' }}
                          onClick={(e) => { e.currentTarget.style.display = 'none'; }}
                        >
                          <p className="font-bold text-[16px] text-[#111111] mb-2">TODAY</p>
                          <p className="text-[14px] text-[#6B7280]">
                            Current platform subscribers and rankings compared to the previous day ({new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')})
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex flex-row gap-4 overflow-x-auto cursor-grab active:cursor-grabbing"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        ref={(el) => {
                          if (!el) return;
                          let isDown = false, startX, scrollLeft;
                          el.style.cssText += '::-webkit-scrollbar{display:none}';
                          el.onmousedown = (e) => { isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; e.preventDefault(); };
                          el.onmouseleave = () => { isDown = false; };
                          el.onmouseup = () => { isDown = false; };
                          el.onmousemove = (e) => { if (!isDown) return; const x = e.pageX - el.offsetLeft; el.scrollLeft = scrollLeft - (x - startX); };
                        }}
                      >
                        {activePlatforms.map((platform) => (
                          <a
                            key={platform.key}
                            href={celebrity.socialMedia?.[platform.key] || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-[280px] flex-1 p-[26px] transition-all hover:shadow-md select-none"
                            style={{
                              borderRadius: '12px',
                              border: '1.5px solid #E5E7EB',
                            }}
                            onDragStart={(e) => e.preventDefault()}
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-1">
                                <img src={platform.icon} alt={platform.label} className="w-[30px] h-[30px]" />
                                <span className="font-bold text-[18px]" style={{ color: '#111111', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
                                  {platform.label}
                                </span>
                              </div>
                              <div className="flex flex-col gap-2">
                                <div className="font-bold text-[34px]" style={{ color: '#111111', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em', lineHeight: '1.4em' }}>
                                  {celebrity.socialMediaFollowers[platform.key].toLocaleString()}
                                </div>
                                <div className="font-semibold text-[18px]" style={{ color: '#99A1AF', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
                                  {celebrity.socialMediaChanges?.[platform.key]
                                    ? `${celebrity.socialMediaChanges[platform.key].count >= 0 ? '+' : ''}${celebrity.socialMediaChanges[platform.key].count.toLocaleString()} (${celebrity.socialMediaChanges[platform.key].percent.toFixed(2)}%)`
                                    : '0 (0.00%)'}
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Music Videos Section — Figma 437:7709 */}
                {hasMusicVideos && (
                  <div className="px-10 py-[30px]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-[30px]">
                      <h2 className="font-black text-[26px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111' }}>
                        Music Videos
                      </h2>
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(celebrity.name)}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-[10px] text-[14px] font-bold py-0.5" style={{ color: '#2B7FFF', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>
                        See more <ChevronRight size={16} />
                      </a>
                    </div>
                    {/* Row 1: first 3 videos */}
                    <div
                      className="flex flex-row gap-4 overflow-x-auto cursor-grab active:cursor-grabbing"
                      style={{ scrollbarWidth: 'none' }}
                      ref={(el) => {
                        if (!el) return;
                        let isDown = false, startX, scrollLeft;
                        el.onmousedown = (e) => { isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; e.preventDefault(); };
                        el.onmouseleave = () => { isDown = false; };
                        el.onmouseup = () => { isDown = false; };
                        el.onmousemove = (e) => { if (!isDown) return; el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX); };
                      }}
                    >
                      {celebrity.musicVideos.slice(0, 3).map((video, index) => (
                        <a key={index} href={video.youtubeUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 group select-none" style={{ width: '365px' }}
                          onDragStart={(e) => e.preventDefault()}
                        >
                          <div className="relative overflow-hidden rounded-lg" style={{ height: '205px' }}>
                            <img
                              src={video.thumbnails?.medium?.url || video.thumbnails?.default?.url || '/placeholder-video.jpg'}
                              alt={video.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={handleImageError}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                <Play size={22} className="text-black ml-0.5" fill="black" />
                              </div>
                            </div>
                          </div>
                          <div className="pt-[16px]">
                            <h3 className="font-medium text-[16px] line-clamp-2 group-hover:text-[#2B7FFF] transition-colors" style={{ color: '#111111', fontFamily: 'Roboto, sans-serif', lineHeight: '1.2em' }}>
                              {video.title}
                            </h3>
                            <p className="text-[16px] mt-[3px]" style={{ color: '#99A1AF', fontFamily: 'Roboto, sans-serif', fontWeight: 400, lineHeight: '1.2em' }}>
                              {celebrity.name} • {formatCompactNumber(video.views)} views
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                    {/* Row 2: next 3 videos */}
                    {celebrity.musicVideos.length > 3 && (
                      <div
                        className="flex flex-row gap-4 overflow-x-auto mt-[30px] cursor-grab active:cursor-grabbing"
                        style={{ scrollbarWidth: 'none' }}
                        ref={(el) => {
                          if (!el) return;
                          let isDown = false, startX, scrollLeft;
                          el.onmousedown = (e) => { isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; e.preventDefault(); };
                          el.onmouseleave = () => { isDown = false; };
                          el.onmouseup = () => { isDown = false; };
                          el.onmousemove = (e) => { if (!isDown) return; el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX); };
                        }}
                      >
                        {celebrity.musicVideos.slice(3, 6).map((video, index) => (
                          <a key={index} href={video.youtubeUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-shrink-0 group select-none" style={{ width: '365px' }}
                            onDragStart={(e) => e.preventDefault()}
                          >
                            <div className="relative overflow-hidden rounded-lg" style={{ height: '205px' }}>
                              <img
                                src={video.thumbnails?.medium?.url || video.thumbnails?.default?.url || '/placeholder-video.jpg'}
                                alt={video.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={handleImageError}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                  <Play size={22} className="text-black ml-0.5" fill="black" />
                                </div>
                              </div>
                            </div>
                            <div className="pt-2">
                              <h3 className="font-medium text-[16px] line-clamp-2 group-hover:text-[#2B7FFF] transition-colors" style={{ color: '#111111', fontFamily: 'Roboto, sans-serif', lineHeight: '1.2em' }}>
                                {video.title}
                              </h3>
                              <p className="text-[14px] mt-1" style={{ color: '#99A1AF', fontFamily: 'Roboto, sans-serif' }}>
                                {celebrity.name} • {formatCompactNumber(video.views)} views
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recommended Artists Section */}
                <div className="rounded-xl" style={{ padding: '30px 40px' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '30px' }}>
                    <h2 className="font-black text-[26px]" style={{ fontFamily: 'Pretendard, sans-serif', color: '#111111', lineHeight: '1.23em' }}>
                      Recommended Artists
                    </h2>
                  </div>
                  {isLoadingRecommended ? (
                    <div className="flex flex-row gap-[24px] overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {Array.from({ length: 7 }).map((_, idx) => (
                        <div key={idx} className="flex-shrink-0 text-center animate-pulse" style={{ width: '151px' }}>
                          <div className="rounded-full bg-gray-200 mx-auto" style={{ width: '151px', height: '150px' }}></div>
                          <div className="h-4 bg-gray-200 rounded w-20 mx-auto mt-2 mb-1"></div>
                          <div className="h-3 bg-gray-100 rounded w-14 mx-auto"></div>
                        </div>
                      ))}
                    </div>
                  ) : recommendedArtists.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <p className="text-gray-500">No recommended artists available</p>
                    </div>
                  ) : (
                    <div className="flex flex-row gap-[24px] overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', cursor: 'grab' }}
                      ref={(el) => {
                        if (!el) return;
                        el.style.cssText += '::-webkit-scrollbar{display:none}';
                        let isDown = false, startX, scrollLeft, hasMoved = false;
                        el.onmousedown = (e) => { isDown = true; hasMoved = false; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; el.style.cursor = 'grabbing'; e.preventDefault(); };
                        el.onmouseleave = () => { isDown = false; el.style.cursor = 'grab'; };
                        el.onmouseup = () => { isDown = false; el.style.cursor = 'grab'; };
                        el.onmousemove = (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - el.offsetLeft; const walk = (x - startX) * 1.5; if (Math.abs(x - startX) > 3) hasMoved = true; el.scrollLeft = scrollLeft - walk; };
                        el.onclick = (e) => { if (hasMoved) { e.preventDefault(); e.stopPropagation(); } };
                      }}>
                      {recommendedArtists.map((artist) => (
                        <Link href={`/celeb/${artist.slug}`} key={artist._id}
                          className="flex-shrink-0 flex flex-col items-center gap-[8px] group" style={{ width: '151px' }}>
                          <div className="rounded-full overflow-hidden transition-all"
                            style={{ width: '151px', height: '150px' }}>
                            <img
                              src={artist.profileImage || '/images/placeholder.jpg'}
                              alt={artist.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={handleImageError}
                            />
                          </div>
                          <h3 className="text-[16px] text-center line-clamp-1 group-hover:text-[#2B7FFF] transition-colors" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 500, color: '#111111', lineHeight: '1.2em', paddingTop: '8px' }}>{artist.name}</h3>
                          <p className="text-[16px] text-center" style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400, color: '#99A1AF', lineHeight: '1.2em', paddingTop: '3px' }}>{artist.group || (artist.category === 'solo' ? 'Solo' : 'K-POP')}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Related News Section */}
                <div className="bg-white rounded-xl" style={{ padding: '30px 24px' }}>
                  <div className="mb-[30px]">
                    <h2 className="font-black text-[26px]" style={{ fontFamily: 'Pretendard', color: '#101828' }}>
                      Related News
                    </h2>
                  </div>
                  {relatedNews && relatedNews.length > 0 ? (
                    <div className="space-y-[30px]">
                      {/* Row 1 */}
                      <div className="grid grid-cols-3" style={{ gap: '24px', height: '387px' }}>
                        {relatedNews.slice(0, 3).map((news, index) => (
                          <Link key={index} href={`/news/${news.slug || news._id}`}>
                            <div className="cursor-pointer group relative" style={{ height: '387px' }}>
                              <div className="overflow-hidden" style={{ width: '100%', height: '209px', borderRadius: '14px' }}>
                                <img
                                  src={news.coverImage || news.thumbnail || '/images/news/default-news.jpg'}
                                  alt={news.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/images/news/default-news.jpg'; }}
                                />
                              </div>
                              <div style={{ position: 'absolute', top: '229px', width: '100%' }}>
                                <h4 className="line-clamp-2 group-hover:text-[#2B7FFF] transition-colors" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', lineHeight: '1.375em', letterSpacing: '-0.024em', color: '#101828' }}>
                                  {news.title}
                                </h4>
                              </div>
                              <div style={{ position: 'absolute', top: '291px', width: '100%' }}>
                                <p className="line-clamp-3" style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', lineHeight: '1.625em', letterSpacing: '-0.01em', color: '#6A7282' }}>
                                  {news.description || news.summary || ''}
                                </p>
                              </div>
                              <div style={{ position: 'absolute', top: '371px' }}>
                                <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '12px', lineHeight: '1.33em', color: '#99A1AF' }}>
                                  {news.publishedAt ? new Date(news.publishedAt).toLocaleDateString('en-CA') : news.createdAt ? new Date(news.createdAt).toLocaleDateString('en-CA') : ''}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      {/* Row 2 */}
                      {relatedNews.length > 3 && (
                        <div className="grid grid-cols-3" style={{ gap: '24px', height: '387px' }}>
                          {relatedNews.slice(3, 6).map((news, index) => (
                            <Link key={index} href={`/news/${news.slug || news._id}`}>
                              <div className="cursor-pointer group relative" style={{ height: '387px' }}>
                                <div className="overflow-hidden" style={{ width: '100%', height: '209px', borderRadius: '14px' }}>
                                  <img
                                    src={news.coverImage || news.thumbnail || '/images/news/default-news.jpg'}
                                    alt={news.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/news/default-news.jpg'; }}
                                  />
                                </div>
                                <div style={{ position: 'absolute', top: '229px', width: '100%' }}>
                                  <h4 className="line-clamp-2 group-hover:text-[#2B7FFF] transition-colors" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', lineHeight: '1.375em', letterSpacing: '-0.024em', color: '#101828' }}>
                                    {news.title}
                                  </h4>
                                </div>
                                <div style={{ position: 'absolute', top: '291px', width: '100%' }}>
                                  <p className="line-clamp-3" style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', lineHeight: '1.625em', letterSpacing: '-0.01em', color: '#6A7282' }}>
                                    {news.description || news.summary || ''}
                                  </p>
                                </div>
                                <div style={{ position: 'absolute', top: '371px' }}>
                                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '12px', lineHeight: '1.33em', color: '#99A1AF' }}>
                                    {news.publishedAt ? new Date(news.publishedAt).toLocaleDateString('en-CA') : news.createdAt ? new Date(news.createdAt).toLocaleDateString('en-CA') : ''}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No related news available</div>
                  )}
                </div>

                {/* More Celeb News */}
                <div className="bg-white rounded-xl px-6 py-8">
                  <MoreNews category="celeb" storageKey="celeb-detail" />
                </div>

              </div>

              {/* Right: Sidebar (500px) */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarStickyRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    <CommentTicker comments={recentComments || []} onNavigate={navigateToPage} />
                    <TrendingNow items={rankingNews || []} onNavigate={navigateToPage} />
                    {rankingNews && rankingNews.length > 0 && (
                      <div>
                        <h3 className="font-bold text-[23px] leading-[1.5] text-[#101828] mb-4 pl-1">Editor&apos;s <span className="text-ksp-accent">PICK</span></h3>
                        <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-4 space-y-6">
                          {rankingNews.slice(0, 6).map((item) => (
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
                                  <span className="text-xs font-medium text-ksp-meta">
                                    {getTimeAgo(item.createdAt || item.publishedAt)}
                                  </span>
                                </div>
                                <h4 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2 group-hover:text-ksp-accent transition-colors">
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
        </div>
      </div> {/* end hidden lg:block */}

    </MainLayout>
  );
}

export async function getServerSideProps({ params, req }) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${req.headers.host}`;
    const prodUrl = process.env.NEXT_PUBLIC_API_URL || baseUrl;

    // Fetch celeb info + sidebar data in parallel
    const [celebResponse, commentsResponse, rankingResponse] = await Promise.all([
      fetch(`${prodUrl}/api/celeb/slug/${params.slug}`),
      fetch(`${baseUrl}/api/comments/recent?limit=10`).catch(() => ({ json: () => ({ success: false }) })),
      fetch(`${prodUrl}/api/news?limit=10&sort=viewCount`).catch(() => ({ json: () => ({ success: false }) })),
    ]);

    // 응답 확인
    if (!celebResponse.ok) {
      console.error(`Failed to fetch celebrity info: ${celebResponse.status}`);
      return { props: { celebrity: null } };
    }

    const data = await celebResponse.json();
    const commentsData = await commentsResponse.json();
    const rankingData = await rankingResponse.json();

    const recentComments = commentsData.success ? (commentsData.data || commentsData.comments || []) : [];
    const rankingNews = rankingData.success ? (rankingData.data?.news || rankingData.data || []) : [];

    if (data.success && data.data) {
      return {
        props: {
          celebrity: data.data,
          recentComments,
          rankingNews,
        }
      };
    }

    return { props: { celebrity: null, recentComments: [], rankingNews: [] } };
  } catch (error) {
    console.error('Error getting celebrity detail info:', error);
    return { props: { celebrity: null, recentComments: [], rankingNews: [] } };
  }
} 