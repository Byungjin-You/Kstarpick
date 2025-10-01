import { useState, useEffect, useRef } from 'react';
import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { TrendingUp, Music as MusicIcon, Star, Tv, ChevronDown, Bookmark, Heart, Share2, ArrowUp, ArrowDown, Play, Hash, ChevronRight, Eye, Instagram, Clock, Clapperboard, Users, ChevronLeft, X } from 'lucide-react';
import Link from 'next/link';
import MainLayout from '../components/MainLayout';
import CardNews from '../components/CardNews';
import { useRouter } from 'next/router';
import { decodeHtmlEntities } from '../utils/helpers';
import Seo from '../components/Seo';
import StructuredData from '../components/StructuredData';
import { generateWebsiteJsonLd, generateHomePageJsonLd } from '../utils/seoHelpers';
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
// Import required modules
import { Pagination, Navigation, Autoplay } from 'swiper/modules';
// Import RecommendedNews dynamically with no SSR to avoid hooks consistency issues
const RecommendedNews = dynamic(() => import('../components/RecommendedNews'), { ssr: false });
// Import MoreNews component (also with no SSR to avoid hooks issues with Intersection Observer)
const MoreNews = dynamic(() => import('../components/MoreNews').then(mod => {
  // 컴포넌트를 React.memo로 감싸서 불필요한 리렌더링 방지
  const MemoizedMoreNews = React.memo(mod.default, () => true); // 항상 true 반환하여 재렌더링 방지
  return { default: MemoizedMoreNews };
}), { 
  ssr: false,
  // 고정 키 사용으로 리마운트 방지
  key: "moreNews-component",
  loading: () => (
    <div className="py-8 text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
      <p className="mt-2 text-gray-500">Loading more news...</p>
    </div>
  )
});

function Home({ initialData }) {
  // React hooks
  const [activeTab, setActiveTab] = useState("recent");
  const [sliderIndex, setSliderIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const router = useRouter();
  
  // 🚀 서버에서 받은 초기 데이터로 상태 초기화
  const [loading, setLoading] = useState(false);
  const [newsArticles, setNewsArticles] = useState(initialData?.newsArticles || []);
  const [featuredArticles, setFeaturedArticles] = useState(initialData?.featuredArticles || []);
  const [topSongs, setTopSongs] = useState(initialData?.topSongs || []);
  const [watchNews, setWatchNews] = useState(initialData?.watchNews || []);
  const [popularNews, setPopularNews] = useState(initialData?.popularNews || {
    drama: [],
    movie: [],
    kpop: [],
    celeb: []
  });
  const [rankingNews, setRankingNews] = useState(initialData?.rankingNews || []);
  const [moreNews, setMoreNews] = useState(initialData?.moreNews || []);
  const [error, setError] = useState(null);
  
  // 로고 클릭 감지를 위한 상태
  const [logoClickTrigger, setLogoClickTrigger] = useState(0);
  
  // 클라이언트 마운트 상태 (하이드레이션 에러 방지)
  const [isClientMounted, setIsClientMounted] = useState(false);
  
  // 기존 상태들
  const [loadedMoreNews, setLoadedMoreNews] = useState(false);
  const [initialMoreNews, setInitialMoreNews] = useState([]);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: true });
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [currentYoutubeUrl, setCurrentYoutubeUrl] = useState('');
  
  // 홈에서 다른 페이지로 이동하는 함수
  const navigateToPage = (path, e) => {
    if (e) {
      e.preventDefault(); // 기본 동작 방지
    }
    
    // 로고 클릭으로 인한 홈페이지 새로고침인지 확인
    const isLogoClick = sessionStorage.getItem('logoClicked') === 'true';
    
    // 로고 클릭이 아닌 경우에만 동일한 페이지로 이동 시도를 무시
    if (!isLogoClick && (router.pathname === path || router.asPath === path)) {
      console.log('동일한 페이지로 이동 시도 무시:', path);
      return false;
    }
    
    // 로고 클릭이 아닌 경우에만 홈페이지로의 중복 이동을 무시
    if (!isLogoClick && path === '/' && (router.pathname === '/' || router.asPath === '/')) {
      console.log('홈페이지로 이동 시도 무시:', path);
      return false;
    }
    
    console.log('홈에서 다른 페이지로 이동:', path);
    
    // 페이지 이동 전에 현재 featured 뉴스와 watch 뉴스를 캐시에 저장
    if (typeof window !== 'undefined') {
      if (featuredArticles.length > 0) {
        sessionStorage.setItem('cachedFeaturedNews', JSON.stringify(featuredArticles));
        sessionStorage.setItem('featuredNewsCacheTime', Date.now().toString());
        console.log('📦 Featured 뉴스 캐시 저장:', featuredArticles.length, '개');
      }
      if (watchNews.length > 0) {
        sessionStorage.setItem('cachedWatchNews', JSON.stringify(watchNews));
        sessionStorage.setItem('watchNewsCacheTime', Date.now().toString());
        console.log('📦 Watch 뉴스 캐시 저장:', watchNews.length, '개');
      }
    }
    
    // 동일한 페이지로 이동하려는 경우 방지
    if (path === router.pathname || path === router.asPath || path === window.location.pathname) {
      console.log('동일한 페이지로의 이동 시도 방지:', path);
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
  
  // 카테고리 탭 상태 관리
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");
  
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [currentDramaIndex, setCurrentDramaIndex] = useState(0);
  const [currentMovieIndex, setCurrentMovieIndex] = useState(0);
  const [currentMusicIndex, setCurrentMusicIndex] = useState(0);
  const [currentCelebIndex, setCurrentCelebIndex] = useState(0);
  const [showDramaThumbnail, setShowDramaThumbnail] = useState(true);
  const [showMovieThumbnail, setShowMovieThumbnail] = useState(true);
  const [showMusicThumbnail, setShowMusicThumbnail] = useState(true);
  const [showCelebThumbnail, setShowCelebThumbnail] = useState(true);
  const [topStoriesData, setTopStoriesData] = useState([]);
  const [todayRankingNews, setTodayRankingNews] = useState([]);
  
  // 뉴스 데이터가 없으면 빈 배열을 사용
  const articles = newsArticles || [];
  const featured = featuredArticles || [];

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

  // 랭킹 뉴스와 피처링 뉴스를 섞어서 랜덤으로 표시
  useEffect(() => {
    if (todayRankingNews.length > 0) {
      // Today 랭킹 뉴스에서 최대 6개를 랜덤으로 선택
      const randomTodayNews = shuffleArray([...todayRankingNews]).slice(0, 6);
      setTopStoriesData(randomTodayNews);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Top Stories 데이터 설정 (Today 랭킹 기준):', randomTodayNews.length, '개');
      }
    } else if (featured.length > 0) {
      // Today 랭킹 뉴스가 없으면 피처드 뉴스를 기본값으로 사용
      setTopStoriesData(featured.slice(0, 6));
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Top Stories 데이터 설정 (피처드 뉴스 기본값):', featured.slice(0, 6).length, '개');
      }
    }
  }, [todayRankingNews, featured]);

  // topSongs 데이터 검사 및 수정
  useEffect(() => {
    if (topSongs && topSongs.length > 0) {
      console.log('Top Songs 데이터:', topSongs.length, '개');
      
      // youtubeUrl이 없는 노래 항목 찾기
      const songsWithoutUrl = topSongs.filter(song => !song.youtubeUrl);
      if (songsWithoutUrl.length > 0) {
        console.log('유튜브 URL이 없는 노래:', songsWithoutUrl.length, '개');
        
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
              console.log(`'${song.title}' 노래에 기본 유튜브 URL 추가:`, song.youtubeUrl);
            } else {
              // 기본 K-pop 인기 곡 URL
              song.youtubeUrl = 'https://www.youtube.com/watch?v=gdZLi9oWNZg'; // BTS Dynamite
              console.log(`'${song.title}' 노래에 BTS Dynamite URL 추가`);
            }
          }
        });
      } else {
        console.log('모든 노래에 유튜브 URL이 있습니다.');
      }
    } else {
      console.log('Top Songs 데이터가 없습니다.');
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

  // 피처드 뉴스 롤링을 위한 useEffect
  useEffect(() => {
    // featured 배열이 비어있으면 타이머를 설정하지 않음
    if (!featured || featured.length <= 1) return;
    
    // 5초마다 다음 피처드 뉴스로 변경
    const timer = setInterval(() => {
      setCurrentFeatureIndex((prevIndex) => (prevIndex + 1) % featured.length);
    }, 5000);
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => clearInterval(timer);
  }, [featured]);

  // 이미지 에러 핸들러
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/images/placeholder.jpg';
    console.log('이미지 로딩 에러:', e.target.alt);
  };

  // 현재 카테고리의 현재 뉴스 가져오기
  const getCurrentNews = (category, index) => {
    const news = popularNews[category] || [];
    return news.length > 0 ? news[index] : null;
  };

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
    console.log('=== Featured News 초기화 ===');
    console.log('서버 데이터:', serverFeaturedNews.length, '개');
    console.log('현재 featured 상태:', featuredArticles.length, '개');
    
    // 로고 클릭 플래그 확인 (최우선)
    const logoClicked = sessionStorage.getItem('logoClicked');
    console.log('로고 클릭 플래그:', logoClicked);
    
    if (logoClicked === 'true') {
      // 로고 클릭으로 인한 새로고침이므로 캐시 무시하고 새로운 랜덤 뉴스 생성
      sessionStorage.removeItem('logoClicked');
      sessionStorage.removeItem('cachedFeaturedNews');
      sessionStorage.removeItem('featuredNewsCacheTime');
      console.log('✅ 로고 클릭으로 인한 새로고침 - 새로운 랜덤 뉴스 생성');
      
      if (serverFeaturedNews.length > 0) {
        const randomNews = shuffleArray([...serverFeaturedNews]).slice(0, 6);
        setFeaturedArticles(randomNews);
        console.log('✅ 새로운 랜덤 Featured 뉴스 생성:', randomNews.length, '개');
        console.log('✅ 랜덤 뉴스 제목들:', randomNews.map(news => news.title));
        
        // 새로운 랜덤 뉴스를 캐시에 저장
        sessionStorage.setItem('cachedFeaturedNews', JSON.stringify(randomNews));
        sessionStorage.setItem('featuredNewsCacheTime', Date.now().toString());
      }
      return;
    }
    
    // 뒤로가기로 인한 접근인지 확인
    const cached = sessionStorage.getItem('cachedFeaturedNews');
    const cacheTime = sessionStorage.getItem('featuredNewsCacheTime');
    console.log('캐시 상태:', cached ? '있음' : '없음', cacheTime ? '시간 있음' : '시간 없음');
    
    if (cached && cacheTime) {
      const timeDiff = Date.now() - parseInt(cacheTime);
      console.log('캐시 시간 차이:', Math.floor(timeDiff / 1000), '초');
      
      // 캐시가 10분 이내라면 사용
      if (timeDiff < 10 * 60 * 1000) {
        try {
          const cachedNews = JSON.parse(cached);
          if (cachedNews.length > 0) {
            setFeaturedArticles(cachedNews);
            console.log('✅ 캐시된 Featured 뉴스 복원:', cachedNews.length, '개');
            console.log('✅ 캐시 복원 뉴스 제목들:', cachedNews.map(news => news.title));
            return; // 캐시 복원 성공 시 여기서 종료
          }
        } catch (error) {
          console.error('❌ Featured 뉴스 캐시 복원 오류:', error);
        }
      } else {
        // 캐시가 만료된 경우 정리
        sessionStorage.removeItem('cachedFeaturedNews');
        sessionStorage.removeItem('featuredNewsCacheTime');
        console.log('⏰ Featured 뉴스 캐시 만료로 정리');
      }
    }
    
    // 캐시가 없거나 만료된 경우 새로운 랜덤 뉴스 생성
    if (serverFeaturedNews.length > 0) {
      const randomNews = shuffleArray([...serverFeaturedNews]).slice(0, 6);
      setFeaturedArticles(randomNews);
      console.log('✅ 첫 방문 - 새로운 랜덤 Featured 뉴스 생성:', randomNews.length, '개');
      console.log('✅ 첫 방문 뉴스 제목들:', randomNews.map(news => news.title));
      
      // 새로운 랜덤 뉴스를 캐시에 저장
      sessionStorage.setItem('cachedFeaturedNews', JSON.stringify(randomNews));
      sessionStorage.setItem('featuredNewsCacheTime', Date.now().toString());
    } else {
      console.log('❌ 서버 Featured 뉴스 데이터가 없습니다.');
    }
  }, [logoClickTrigger]); // logoClickTrigger 변경 시에만 재실행

  // 클라이언트 마운트 감지 useEffect (하이드레이션 에러 방지)
  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // Watch News 클라이언트 로딩 로직 (하이드레이션 에러 방지)
  useEffect(() => {
    if (typeof window === 'undefined' || !isClientMounted) return;
    
    const loadWatchNews = async () => {
      try {
        // 전체 뉴스에서 Watch: 필터링
        const response = await fetch('/api/news?limit=200');
        const data = await response.json();
        
        if (data.success && data.data.news) {
          const watchNewsFiltered = data.data.news
            .filter(news => news.title && news.title.startsWith('Watch:'))
            .slice(0, 6);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Watch News 클라이언트 로딩:', watchNewsFiltered.length, '개');
          }
          setWatchNews(watchNewsFiltered);
        }
      } catch (error) {
        console.error('Watch News 로딩 오류:', error);
      }
    };
    
    loadWatchNews();
  }, [isClientMounted]);
  
  // 로고 클릭 감지를 위한 useEffect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkLogoClick = () => {
      const logoClicked = sessionStorage.getItem('logoClicked');
      if (logoClicked === 'true') {
        console.log('[Home] 로고 클릭 감지 - 트리거 업데이트');
        setLogoClickTrigger(prev => prev + 1);
      }
    };
    
    // 페이지 로드 시 즉시 확인
    checkLogoClick();
    
    // 주기적으로 확인 (100ms마다)
    const interval = setInterval(checkLogoClick, 100);
    
    return () => clearInterval(interval);
  }, []);

  // useEffect to prepare moreNews data for MoreNews component
  useEffect(() => {
    // 세션 스토리지에서 저장된 MoreNews 데이터 먼저 복원 시도
    if (typeof window !== 'undefined') {
      try {
        const savedMoreNewsData = JSON.parse(sessionStorage.getItem('moreNewsData') || '[]');
        if (savedMoreNewsData.length > 0) {
          console.log("Home - restoring MoreNews data from session storage:", savedMoreNewsData.length);
          setInitialMoreNews(savedMoreNewsData);
          setLoadedMoreNews(true);
          return; // 세션 스토리지에서 복원 성공 시 아래 로직 실행하지 않음
        }
      } catch (e) {
        console.error("Error restoring MoreNews data:", e);
      }
    }
    
    // 세션 스토리지에 데이터가 없는 경우에만 실행
    if (!loadedMoreNews) {  // 이미 로드된 경우 실행하지 않음
      console.log("Home - preparing moreNews data for client-side rendering");
      if (moreNews?.length > 0) {
        setInitialMoreNews(moreNews);
        console.log("Home - using moreNews data:", moreNews.length);
        setLoadedMoreNews(true);
      } else if (newsArticles?.length > 0) {
        // moreNews가 없으면 newsArticles 배열에서 데이터 가져옴
        const newsForMoreNews = newsArticles.slice(0, 20);
        setInitialMoreNews(newsForMoreNews);
        console.log("Home - using newsArticles for moreNews:", newsForMoreNews.length);
        setLoadedMoreNews(true);
      }
    }
  }, [moreNews, newsArticles, loadedMoreNews]); // 의존성 배열에 데이터 추가

  // 클라이언트 사이드에서 추가 데이터 로드 (성능 최적화)
  const loadAdditionalData = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      console.log('🔄 추가 데이터 로딩 시작...');
      
      // 오늘 날짜 계산
      const today = new Date();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      threeDaysAgo.setHours(0, 0, 0, 0);

      // 병렬로 나머지 API 호출 (Watch News 제외)
      const [
        dramaNewsRes,
        movieNewsRes,
        kpopNewsRes,
        celebNewsRes,
        rankingNewsRes,
        todayRankingNewsRes,
        moreNewsRes
      ] = await Promise.all([
        fetch(`/api/news/drama?limit=5`), // 드라마 뉴스 3개 → 5개로 변경
        fetch(`/api/news/movie?limit=5`),
        fetch(`/api/news?category=kpop&limit=5`),
        fetch(`/api/news/celeb?limit=5`),
        fetch(`/api/news?limit=10&sort=viewCount`),
        fetch(`/api/news?limit=30&sort=viewCount&order=desc&createdAfter=${threeDaysAgo.toISOString()}`), // today 랭킹 뉴스
        fetch(`/api/news?limit=20&sort=createdAt&order=desc`)
      ]);

      const [
        dramaNews,
        movieNews,
        kpopNews,
        celebNews,
        rankingNews,
        todayRankingNews,
        moreNews
      ] = await Promise.all([
        dramaNewsRes.json(),
        movieNewsRes.json(),
        kpopNewsRes.json(),
        celebNewsRes.json(),
        rankingNewsRes.json(),
        todayRankingNewsRes.json(),
        moreNewsRes.json()
      ]);

      // 상태 업데이트 (Watch News 제외)
      setPopularNews(prev => ({
        ...prev,
        drama: dramaNews.success ? dramaNews.data || [] : [],
        movie: movieNews.success ? movieNews.data || [] : [],
        kpop: kpopNews.success ? kpopNews.data?.news || [] : [],
        celeb: celebNews.success ? celebNews.data || [] : []
      }));
      
      setRankingNews(rankingNews.success ? rankingNews.data.news || [] : []);
      setTodayRankingNews(todayRankingNews.success ? todayRankingNews.data.news || [] : []); // today 랭킹 뉴스 설정
      setMoreNews(moreNews.success ? moreNews.data.news || [] : []);
      
      console.log('✅ 추가 데이터 로딩 완료');
      
    } catch (error) {
      console.error('❌ 추가 데이터 로딩 오류:', error);
    }
  };

  // 컴포넌트 마운트 시 추가 데이터 로드
  useEffect(() => {
    // 초기 데이터가 있는 경우에만 추가 데이터 로드
    if (initialData && Object.keys(initialData).length > 0) {
      // 즉시 추가 데이터 로드 시작 (지연 시간 제거)
      loadAdditionalData();
    }
  }, []);

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

      <main className="pt-0 pb-12 bg-white">
        <div className="container mx-auto px-4">
          {/* 히어로 섹션 - 현대적 디자인 */}
          <section className="mb-8 md:mb-16">
            <div className="relative overflow-hidden md:rounded-2xl shadow-xl">
              {/* 그라디언트 배경 */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-800 via-pink-700 to-rose-600 z-0"></div>
              
              {/* 장식용 배경 요소들 */}
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-bl from-purple-500/30 to-pink-500/30 blur-3xl z-0"></div>
              <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-rose-500/30 to-yellow-500/30 blur-3xl z-0"></div>
              <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-white/10 blur-2xl z-0 animate-pulse"></div>
              <div className="absolute bottom-1/3 right-1/3 w-36 h-36 rounded-full bg-white/10 blur-3xl z-0 animate-pulse" style={{ animationDelay: '1s' }}></div>
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 md:gap-8 relative z-10">
                {/* 콘텐츠 영역 - 왼쪽 */}
                <div className="lg:col-span-3 p-4 md:p-16 flex items-center">
                  <div className="max-w-2xl">
                    {/* 실시간 속보 배너 - 최신 뉴스 기준 */}
                    {articles && articles.length > 0 ? (
                      <Link href={`/news/${articles[0]._id || articles[0].id}`} className="block relative mt-4 pt-2">
                        <div className="absolute -top-2.5 left-0 z-20">
                          <div className="bg-gradient-to-r from-red-500 to-pink-600 px-3 py-1 text-white text-xs font-bold rounded-md shadow-md transform hover:scale-105 transition-all relative overflow-hidden inline-flex items-center border border-white/30">
                            {/* 번개 아이콘 */}
                            <div className="lightning-container relative">
                              <svg 
                                viewBox="0 0 24 24" 
                                fill="white" 
                                width="16" 
                                height="16" 
                                className="lightning-bolt"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" />
                              </svg>
                              <style jsx>{`
                                .lightning-container {
                                  margin-right: 6px;
                                  display: inline-flex;
                                }
                                .lightning-bolt {
                                  animation: flash 1.5s ease-in-out infinite;
                                }
                                @keyframes flash {
                                  0% { opacity: 0.4; transform: scale(0.95); filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5)); }
                                  5% { opacity: 1; transform: scale(1.2); filter: drop-shadow(0 0 10px rgba(255, 255, 255, 1)); }
                                  20% { opacity: 0.6; transform: scale(1); filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7)); }
                                  30% { opacity: 1; transform: scale(1.05); filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.9)); }
                                  50% { opacity: 0.7; transform: scale(1); filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6)); }
                                  100% { opacity: 0.4; transform: scale(0.95); filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5)); }
                                }
                              `}</style>
                            </div>
                            <span className="relative z-10 tracking-wide">BREAKING</span>
                            <span className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-white/20 to-red-500/0 animate-shimmer"></span>
                          </div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md rounded-lg mb-0 md:mb-4 overflow-hidden hover:bg-white/30 transition-all cursor-pointer group border border-white/10">
                          <div className="px-4 py-2 pt-3 md:py-3 md:pt-4 text-white text-sm font-medium group-hover:text-white/90">
                            <span className="line-clamp-2 text-xs sm:text-sm">{articles[0].title}</span>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="relative mt-4 pt-2">
                        <div className="absolute -top-2.5 left-0 z-20">
                          <div className="bg-gradient-to-r from-red-500 to-pink-600 px-3 py-1 text-white text-xs font-bold rounded-md shadow-md relative overflow-hidden inline-flex items-center border border-white/30">
                            {/* 번개 아이콘 */}
                            <div className="lightning-container relative">
                              <svg 
                                viewBox="0 0 24 24" 
                                fill="white" 
                                width="16" 
                                height="16" 
                                className="lightning-bolt"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path d="M13 3L4 14H12L11 21L20 10H12L13 3Z" />
                              </svg>
                              <style jsx>{`
                                .lightning-container {
                                  margin-right: 6px;
                                  display: inline-flex;
                                }
                                .lightning-bolt {
                                  animation: flash 1.5s ease-in-out infinite;
                                }
                                @keyframes flash {
                                  0% { opacity: 0.4; transform: scale(0.95); filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5)); }
                                  5% { opacity: 1; transform: scale(1.2); filter: drop-shadow(0 0 10px rgba(255, 255, 255, 1)); }
                                  20% { opacity: 0.6; transform: scale(1); filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.7)); }
                                  30% { opacity: 1; transform: scale(1.05); filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.9)); }
                                  50% { opacity: 0.7; transform: scale(1); filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6)); }
                                  100% { opacity: 0.4; transform: scale(0.95); filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.5)); }
                                }
                              `}</style>
                            </div>
                            <span className="relative z-10 tracking-wide">BREAKING</span>
                            <span className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-white/20 to-red-500/0 animate-shimmer"></span>
                          </div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-md rounded-lg mb-0 md:mb-4 overflow-hidden border border-white/10">
                          <div className="px-4 py-2 pt-3 md:py-3 md:pt-4 text-white text-sm font-medium">
                            <span className="line-clamp-2 text-xs sm:text-sm">Latest K-POP and K-Drama Updates</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Latest Updates 라벨 - md 이상에서만 보임 */}
                    <div className="hidden md:flex items-center space-x-3 mb-4 md:mb-6">
                      <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-sm font-medium inline-flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                        Latest Updates
                      </div>
                      <div className="h-px flex-grow bg-gradient-to-r from-white/40 to-transparent"></div>
                    </div>
                    
                    {/* 헤드라인과 설명 텍스트 - 모바일에서는 숨김 */}
                    <div className="hidden md:block">
                      <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-6 leading-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-100">
                          Your K-POP News Hub
                        </span>
                      </h1>
                      
                      <p className="text-white/80 text-base md:text-xl mb-4 md:mb-8 leading-relaxed">
                        Breaking news, exclusive interviews, and trending stories from the world of K-POP, K-drama, and Korean entertainment.
                      </p>
                    </div>
                    
                    {/* 카테고리 빠른 링크 - 모바일에서 숨김, 데스크탑에서만 표시 */}
                    <div className="hidden md:flex flex-wrap gap-2 md:gap-3 mt-4">
                      <a href="/music" onClick={(e) => navigateToPage('/music', e)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-200 flex items-center">
                        <MusicIcon size={16} className="mr-2" />
                        Music
                      </a>
                      <a href="/drama" onClick={(e) => navigateToPage('/drama', e)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-200 flex items-center">
                        <Tv size={16} className="mr-2" />
                        Drama
                      </a>
                      <a href="/celeb" onClick={(e) => navigateToPage('/celeb', e)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-200 flex items-center">
                        <Users size={16} className="mr-2" />
                        Celebs
                      </a>
                      <a href="/tvfilm" onClick={(e) => navigateToPage('/tvfilm', e)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-200 flex items-center">
                        <Clapperboard size={16} className="mr-2" />
                        TV/Film
                      </a>
                    </div>
                  </div>
                </div>
                
                {/* 피처드 카드 - 오른쪽 */}
                <div className="lg:col-span-2 p-0 md:p-12 flex flex-col items-center">
                  {topStoriesData && topStoriesData.length > 0 && (
                    <>
                      <div className="w-full flex justify-between items-center mb-4 hidden md:flex">
                        <h3 className="text-white font-bold text-lg">Today's Top Stories</h3>
                        <div 
                          className="text-pink-300 hover:text-white text-sm font-medium flex items-center transition-colors cursor-pointer" 
                          onClick={() => {
                            navigateToPage('/ranking');
                          }}
                        >
                          <ChevronRight size={16} className="ml-1" />
                        </div>
                      </div>
                      
                      {/* 모바일에서만 패딩 없이 확장되는 슬라이더 */}
                      <div className="w-full relative md:static -mx-4 md:mx-0">
                        <Swiper
                          modules={[Pagination, Navigation, Autoplay]}
                          autoplay={{
                            delay: 7000,
                            disableOnInteraction: false,
                          }}
                          loop={true}
                          className="w-full rounded-0 md:rounded-2xl relative"
                          grabCursor={true}
                          touchEventsTarget="container"
                          navigation={{
                            nextEl: '.swiper-button-next',
                            prevEl: '.swiper-button-prev',
                          }}
                        >
                          {topStoriesData.map((item, index) => (
                            <SwiperSlide key={item._id || item.id}>
                              <div
                                className="w-full block cursor-pointer"
                                onClick={() => {
                                  navigateToPage(`/news/${item._id || item.id}`);
                                }}
                              >
                                <div className="w-full transform transition-all duration-500 hover:scale-[1.02] animate-fadeIn">
                                  <div className="bg-black/30 backdrop-blur-md rounded-0 md:rounded-2xl overflow-hidden border-0 md:border md:border-white/10 hover:md:border-white/30 transition-all shadow-md md:shadow-2xl group cursor-pointer">
                                    <div className="relative h-72 md:h-64 overflow-hidden rounded-0">
                                      {item.coverImage && (
                                        <img 
                                          src={item.coverImage} 
                                          alt={item.title}
                                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 animate-fadeIn"
                                          style={{ animation: "fadeIn 0.5s ease-in-out" }}
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "/images/placeholder.jpg";
                                          }}
                                        />
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                                      <div className="absolute bottom-2 md:bottom-6 left-4 right-4 md:left-6 md:right-6">
                                        <h3 className="text-white font-bold text-lg md:text-2xl line-clamp-2 animate-fadeIn" style={{ animation: "fadeIn 0.5s ease-in-out" }}>{item.title}</h3>
                                      </div>
                                    </div>
                                    <div className="hidden md:block p-2 md:p-6">
                                      <p className={`text-white/70 line-clamp-2 mb-2 md:mb-4 text-xs md:text-sm animate-fadeIn pl-2 md:pl-0`} style={{ animation: "fadeIn 0.5s ease-in-out" }}>
                                        {item.content 
                                          ? item.content.replace(/<[^>]*>/g, '').slice(0, 150) + '...'
                                          : item.summary}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </SwiperSlide>
                          ))}
                        </Swiper>
                        <div className="pagination-wrapper mt-4">
                          <div className="flex justify-center">
                            {/* 모바일에서는 숨기고 데스크탑에서만 표시 */}
                            <div className="story-indicator hidden md:flex items-center justify-center">
                              <div className="text-white/80 text-xs font-medium flex items-center">
                                <ChevronLeft size={14} className="mr-1 animate-pulse" />
                                Swipe for more stories
                                <ChevronRight size={14} className="ml-1 animate-pulse" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* 모바일 전용 카테고리 필터 - featured news 위에 배치 */}
            <div className="mt-8 md:mt-16">
              <div style={{ marginBottom: 'max(0px, min(8vw, 96px))' }}>
              <CardNews 
                cards={articles}
                featured={featured}
              />
              </div>
              <RecommendedNews allNews={articles} />
              
              {/* 모바일 전용 카테고리 필터 - Recommended News 아래에 배치 */}
              <div className="block md:hidden w-full my-6">
                <div className="grid grid-cols-4 gap-2">
                  <a href="/music" onClick={(e) => navigateToPage('/music', e)} className="flex flex-col items-center justify-center py-3 bg-white rounded-xl transition-all">
                    <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mb-2">
                      <MusicIcon size={24} />
                    </div>
                    <span className="text-xs font-medium text-gray-800">Music</span>
                  </a>
                  <a href="/drama" onClick={(e) => navigateToPage('/drama', e)} className="flex flex-col items-center justify-center py-3 bg-white rounded-xl transition-all">
                    <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-2">
                      <Tv size={24} />
                    </div>
                    <span className="text-xs font-medium text-gray-800">Drama</span>
                  </a>
                  <a href="/celeb" onClick={(e) => navigateToPage('/celeb', e)} className="flex flex-col items-center justify-center py-3 bg-white rounded-xl transition-all">
                    <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-2">
                      <Users size={24} />
                    </div>
                    <span className="text-xs font-medium text-gray-800">Celebs</span>
                  </a>
                  <a href="/tvfilm" onClick={(e) => navigateToPage('/tvfilm', e)} className="flex flex-col items-center justify-center py-3 bg-white rounded-xl transition-all">
                    <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-2">
                      <Clapperboard size={24} />
                    </div>
                    <span className="text-xs font-medium text-gray-800">TV/Film</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Watch News Section - 영상 뉴스 전용 섹션 (클라이언트에서만 렌더링) */}
          {isClientMounted && watchNews && watchNews.length > 0 && (
          <section className="mb-8 md:mb-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="w-2 h-16 bg-gradient-to-b from-purple-600 to-pink-500 rounded-full mr-5"></div>
                <div>
                  <span className="text-pink-600 text-sm font-semibold tracking-wider uppercase mb-1 block">Video Content</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center group">
                    <Play size={28} className="text-pink-600 mr-3 group-hover:animate-pulse" />
                    Watch News
                  </h2>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {watchNews.slice(0, 6).map((video) => (
                <div 
                  key={video._id || video.id} 
                  className="bg-white rounded-xl overflow-hidden transition-all duration-300 group relative cursor-pointer"
                  onClick={() => {
                    navigateToPage(`/news/${video._id || video.id}`);
                  }}
                >
                  <div className="h-56 overflow-hidden relative rounded-xl">
                    <img
                      src={video.coverImage || '/images/news/default-news.jpg'}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-xl"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/images/news/default-news.jpg";
                      }}
                    />
                    
                    {/* Add top decorative element */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8e44ad] via-[#9b59b6] to-[#d35400] opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* 비디오 배지 */}
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20">
                      <span className="px-2 py-1 md:px-3 md:py-1.5 text-white text-xs font-medium rounded-full backdrop-blur-sm flex items-center"
                            style={{ background: 'linear-gradient(to right, #9333ea, #ec4899)' }}>
                        {video.category || 'Video'}
                      </span>
                    </div>
                    
                    {/* 반투명 그라디언트 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#8e44ad] transition-colors">
                      {video.title.replace('Watch:', '')}
                    </h3>
                    
                    <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                      {video.content 
                        ? video.content.replace(/<[^>]*>/g, '') 
                        : video.summary || ''}
                    </p>
                    
                    <div className="flex justify-between items-end">
                      {/* 시간 배지 */}
                      <div className="flex items-center text-gray-500 text-xs">
                        <Clock size={12} className="mr-1 text-[#9b59b6]" />
                        <span>{new Date(video.createdAt || video.date).toLocaleDateString()}</span>
                      </div>
                      
                      {/* Watch now 버튼 */}
                      <span className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-xs font-medium hover:underline">
                        Watch now <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          )}

          {/* Popular News Section - 카테고리별 인기 뉴스 롤링 */}
          <section className="mb-8 md:mb-16">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div className="flex items-center">
                <div className="w-2 h-16 bg-gradient-to-b from-purple-600 to-pink-500 rounded-full mr-5"></div>
                <div>
                  <span className="text-pink-600 text-sm font-semibold tracking-wider uppercase mb-1 block">Discover More</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center group">
                    <Star size={28} className="text-pink-600 mr-3" />
                    Popular News
                  </h2>
                </div>
              </div>
            </div>
            
            {/* 카테고리 그리드 레이아웃 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* 드라마 섹션 */}
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                  <h3 className="font-bold flex items-center justify-between text-gray-900">
                    <div className="flex items-center">
                      <Tv size={16} className="mr-2" style={{ stroke: 'url(#drama-gradient)', fill: 'none', strokeWidth: 2 }}/> 
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Drama</span>
                      {/* SVG 그라데이션 정의 */}
                      <svg width="0" height="0" className="absolute">
                        <linearGradient id="drama-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#9333ea" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </svg>
                    </div>
                    <Link 
                      href="/drama"
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <ChevronRight size={20} className="hover:scale-110 transition-transform" />
                    </Link>
                  </h3>
                </div>
                
                <div className="p-4">
                  {popularNews.drama && popularNews.drama.length > 0 ? (
                    <>
                      {/* 썸네일 영역 */}
                      <div className="relative h-48 md:h-56 mb-4 rounded-lg overflow-hidden">
                        <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                          showDramaThumbnail ? 'opacity-100' : 'opacity-0'
                        }`}>
                          {getCurrentNews('drama', currentDramaIndex)?.coverImage && (
                            <div 
                              className="block h-full cursor-pointer"
                              onClick={() => {
                                navigateToPage(`/news/${getCurrentNews('drama', currentDramaIndex)._id || getCurrentNews('drama', currentDramaIndex).id}`);
                              }}
                            >
                              <div className="relative h-full">
                                <img 
                                  src={getCurrentNews('drama', currentDramaIndex).coverImage}
                                  alt={getCurrentNews('drama', currentDramaIndex).title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/images/placeholder.jpg";
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                  <h4 className="font-medium text-base line-clamp-2">
                                    {getCurrentNews('drama', currentDramaIndex)?.title}
                                  </h4>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 뉴스 목록 */}
                      <div className="space-y-4">
                        {popularNews.drama.slice(0, 4).map((news, index) => (
                          <div 
                            key={news._id || news.id || index}
                            className={`flex items-center py-2.5 cursor-pointer ${
                              currentDramaIndex === index 
                                ? 'bg-white rounded-lg px-3 border border-transparent hover:border-purple-200 relative overflow-hidden' 
                                : 'hover:bg-gray-50 px-3 rounded-lg'
                            }`}
                            onClick={() => {
                              // 현재 섹션의 뉴스가 선택되면 페이지 이동
                              if (currentDramaIndex === index) {
                                navigateToPage(`/news/${news._id || news.id || news.slug}`);
                              } else {
                                // 다른 뉴스를 선택하면 썸네일 변경만 수행
                                setShowDramaThumbnail(false);
                                setTimeout(() => {
                                  setCurrentDramaIndex(index);
                                  setShowDramaThumbnail(true);
                                }, 300);
                              }
                            }}
                          >
                            {currentDramaIndex === index && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-pink-500"></div>
                            )}
                            <div className={`flex-shrink-0 w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center font-bold text-xs mr-3 overflow-hidden ${
                              currentDramaIndex === index 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md border border-white' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {currentDramaIndex === index && (
                                <div className="absolute inset-0 bg-white/20 scale-x-0 animate-shine"></div>
                              )}
                              {index + 1}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className={`text-sm ${
                                currentDramaIndex === index ? 'font-bold' : 'font-medium'
                              } line-clamp-2 text-gray-900 transition-all ${
                                currentDramaIndex === index ? 'text-purple-800' : ''
                              }`}>
                                {news.title}
                              </h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p>No drama news available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 영화 섹션 */}
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                  <h3 className="font-bold flex items-center justify-between text-gray-900">
                    <div className="flex items-center">
                      <Clapperboard size={16} className="mr-2" style={{ stroke: 'url(#movie-gradient)', fill: 'none', strokeWidth: 2 }}/> 
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Movie</span>
                      {/* SVG 그라데이션 정의 */}
                      <svg width="0" height="0" className="absolute">
                        <linearGradient id="movie-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#9333ea" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </svg>
                    </div>
                    <Link 
                      href="/movie"
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <ChevronRight size={20} className="hover:scale-110 transition-transform" />
                    </Link>
                  </h3>
                </div>
                
                <div className="p-4">
                  {popularNews.movie && popularNews.movie.length > 0 ? (
                    <>
                      {/* 썸네일 영역 */}
                      <div className="relative h-48 md:h-56 mb-4 rounded-lg overflow-hidden">
                        <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                          showMovieThumbnail ? 'opacity-100' : 'opacity-0'
                        }`}>
                          {getCurrentNews('movie', currentMovieIndex)?.coverImage && (
                            <div 
                              className="block h-full cursor-pointer" 
                              onClick={() => {
                                navigateToPage(`/news/${getCurrentNews('movie', currentMovieIndex)._id || getCurrentNews('movie', currentMovieIndex).id}`);
                              }}
                            >
                              <div className="relative h-full">
                                <img 
                                  src={getCurrentNews('movie', currentMovieIndex).coverImage}
                                  alt={getCurrentNews('movie', currentMovieIndex).title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/images/placeholder.jpg";
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                  <h4 className="font-medium text-base line-clamp-2">
                                    {getCurrentNews('movie', currentMovieIndex)?.title}
                                  </h4>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 뉴스 목록 */}
                      <div className="space-y-4">
                        {popularNews.movie.slice(0, 4).map((news, index) => (
                          <div 
                            key={news._id || news.id || index}
                            className={`flex items-center py-2.5 cursor-pointer ${
                              currentMovieIndex === index 
                                ? 'bg-white rounded-lg px-3 border border-transparent hover:border-purple-200 relative overflow-hidden' 
                                : 'hover:bg-gray-50 px-3 rounded-lg'
                            }`}
                            onClick={() => {
                              // 현재 섹션의 뉴스가 선택되면 페이지 이동
                              if (currentMovieIndex === index) {
                                navigateToPage(`/news/${news._id || news.id || news.slug}`);
                              } else {
                                // 다른 뉴스를 선택하면 썸네일 변경만 수행
                                setShowMovieThumbnail(false);
                                setTimeout(() => {
                                  setCurrentMovieIndex(index);
                                  setShowMovieThumbnail(true);
                                }, 300);
                              }
                            }}
                          >
                            {currentMovieIndex === index && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-pink-500"></div>
                            )}
                            <div className={`flex-shrink-0 w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center font-bold text-xs mr-3 overflow-hidden ${
                              currentMovieIndex === index 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md border border-white' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {currentMovieIndex === index && (
                                <div className="absolute inset-0 bg-white/20 scale-x-0 animate-shine"></div>
                              )}
                              {index + 1}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className={`text-sm ${
                                currentMovieIndex === index ? 'font-bold' : 'font-medium'
                              } line-clamp-2 text-gray-900 transition-all ${
                                currentMovieIndex === index ? 'text-purple-800' : ''
                              }`}>
                                {news.title}
                              </h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p>No movie news available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 음악 섹션 */}
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                  <h3 className="font-bold flex items-center justify-between text-gray-900">
                    <div className="flex items-center">
                      <MusicIcon size={16} className="mr-2" style={{ stroke: 'url(#music-gradient)', fill: 'none', strokeWidth: 2 }}/> 
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">K-pop</span>
                      {/* SVG 그라데이션 정의 */}
                      <svg width="0" height="0" className="absolute">
                        <linearGradient id="music-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#9333ea" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </svg>
                    </div>
                    <Link 
                      href="/music"
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <ChevronRight size={20} className="hover:scale-110 transition-transform" />
                    </Link>
                  </h3>
                </div>
                
                <div className="p-4">
                  {popularNews.kpop && popularNews.kpop.length > 0 ? (
                    <>
                      {/* 썸네일 영역 */}
                      <div className="relative h-48 md:h-56 mb-4 rounded-lg overflow-hidden">
                        <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                          showMusicThumbnail ? 'opacity-100' : 'opacity-0'
                        }`}>
                          {(() => {
                            const currentKpopNews = getCurrentNews('kpop', currentMusicIndex);
                            console.log('🎵 K-POP 디버그:', {
                              popularNewsKpop: popularNews.kpop,
                              currentMusicIndex,
                              showMusicThumbnail,
                              currentKpopNews,
                              hasCoverImage: !!currentKpopNews?.coverImage
                            });
                            return currentKpopNews?.coverImage;
                          })() && (
                            <div 
                              className="block h-full cursor-pointer"
                              onClick={() => {
                                navigateToPage(`/news/${getCurrentNews('kpop', currentMusicIndex)._id || getCurrentNews('kpop', currentMusicIndex).id}`);
                              }}
                            >
                              <div className="relative h-full">
                                <img 
                                  src={getCurrentNews('kpop', currentMusicIndex).coverImage}
                                  alt={getCurrentNews('kpop', currentMusicIndex).title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/images/placeholder.jpg";
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                  <h4 className="font-medium text-base line-clamp-2">
                                    {getCurrentNews('kpop', currentMusicIndex)?.title}
                                  </h4>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 뉴스 목록 */}
                      <div className="space-y-4">
                        {popularNews.kpop.slice(0, 4).map((news, index) => (
                          <div 
                            key={news._id || news.id || index}
                            className={`flex items-center py-2.5 cursor-pointer ${
                              currentMusicIndex === index 
                                ? 'bg-white rounded-lg px-3 border border-transparent hover:border-purple-200 relative overflow-hidden' 
                                : 'hover:bg-gray-50 px-3 rounded-lg'
                            }`}
                            onClick={() => {
                              // 현재 섹션의 뉴스가 선택되면 페이지 이동
                              if (currentMusicIndex === index) {
                                navigateToPage(`/news/${news._id || news.id || news.slug}`);
                              } else {
                                // 다른 뉴스를 선택하면 썸네일 변경만 수행
                                setShowMusicThumbnail(false);
                                setTimeout(() => {
                                  setCurrentMusicIndex(index);
                                  setShowMusicThumbnail(true);
                                }, 300);
                              }
                            }}
                          >
                            {currentMusicIndex === index && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-pink-500"></div>
                            )}
                            <div className={`flex-shrink-0 w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center font-bold text-xs mr-3 overflow-hidden ${
                              currentMusicIndex === index 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md border border-white' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {currentMusicIndex === index && (
                                <div className="absolute inset-0 bg-white/20 scale-x-0 animate-shine"></div>
                              )}
                              {index + 1}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className={`text-sm ${
                                currentMusicIndex === index ? 'font-bold' : 'font-medium'
                              } line-clamp-2 text-gray-900 transition-all ${
                                currentMusicIndex === index ? 'text-purple-800' : ''
                              }`}>
                                {news.title}
                              </h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p>No K-pop news available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 셀럽 섹션 */}
              <div className="bg-white rounded-xl overflow-hidden">
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                  <h3 className="font-bold flex items-center justify-between text-gray-900">
                    <div className="flex items-center">
                      <Users size={16} className="mr-2" style={{ stroke: 'url(#celeb-gradient)', fill: 'none', strokeWidth: 2 }}/> 
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Celebrity</span>
                      {/* SVG 그라데이션 정의 */}
                      <svg width="0" height="0" className="absolute">
                        <linearGradient id="celeb-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#9333ea" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </svg>
                    </div>
                    <Link 
                      href="/celebrity"
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <ChevronRight size={20} className="hover:scale-110 transition-transform" />
                    </Link>
                  </h3>
                </div>
                
                <div className="p-4">
                  {popularNews.celeb && popularNews.celeb.length > 0 ? (
                    <>
                      {/* 썸네일 영역 */}
                      <div className="relative h-48 md:h-56 mb-4 rounded-lg overflow-hidden">
                        <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                          showCelebThumbnail ? 'opacity-100' : 'opacity-0'
                        }`}>
                          {getCurrentNews('celeb', currentCelebIndex)?.coverImage && (
                            <div 
                              className="block h-full cursor-pointer"
                              onClick={() => {
                                navigateToPage(`/news/${getCurrentNews('celeb', currentCelebIndex)._id || getCurrentNews('celeb', currentCelebIndex).id}`);
                              }}
                            >
                              <div className="relative h-full">
                                <img 
                                  src={getCurrentNews('celeb', currentCelebIndex).coverImage}
                                  alt={getCurrentNews('celeb', currentCelebIndex).title}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/images/placeholder.jpg";
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                  <h4 className="font-medium text-base line-clamp-2">
                                    {getCurrentNews('celeb', currentCelebIndex)?.title}
                                  </h4>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* 뉴스 목록 */}
                      <div className="space-y-4">
                        {popularNews.celeb.slice(0, 4).map((news, index) => (
                          <div 
                            key={news._id || news.id || index}
                            className={`flex items-center py-2.5 cursor-pointer ${
                              currentCelebIndex === index 
                                ? 'bg-white rounded-lg px-3 border border-transparent hover:border-purple-200 relative overflow-hidden' 
                                : 'hover:bg-gray-50 px-3 rounded-lg'
                            }`}
                            onClick={() => {
                              // 현재 섹션의 뉴스가 선택되면 페이지 이동
                              if (currentCelebIndex === index) {
                                navigateToPage(`/news/${news._id || news.id || news.slug}`);
                              } else {
                                // 다른 뉴스를 선택하면 썸네일 변경만 수행
                                setShowCelebThumbnail(false);
                                setTimeout(() => {
                                  setCurrentCelebIndex(index);
                                  setShowCelebThumbnail(true);
                                }, 300);
                              }
                            }}
                          >
                            {currentCelebIndex === index && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-pink-500"></div>
                            )}
                            <div className={`flex-shrink-0 w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center font-bold text-xs mr-3 overflow-hidden ${
                              currentCelebIndex === index 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md border border-white' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {currentCelebIndex === index && (
                                <div className="absolute inset-0 bg-white/20 scale-x-0 animate-shine"></div>
                              )}
                              {index + 1}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className={`text-sm ${
                                currentCelebIndex === index ? 'font-bold' : 'font-medium'
                              } line-clamp-2 text-gray-900 transition-all ${
                                currentCelebIndex === index ? 'text-purple-800' : ''
                              }`}>
                                {news.title}
                              </h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p>No celebrity news available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Top K-POP Songs Section - 고급스러운 디자인 */}
          <section className="mb-8 md:mb-16">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div className="flex items-center">
                <div className="w-2 h-16 bg-gradient-to-b from-purple-600 to-pink-500 rounded-full mr-5"></div>
                <div>
                  <span className="text-pink-600 text-sm font-semibold tracking-wider uppercase mb-1 block">WEEKLY CHART</span>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center group">
                    <MusicIcon size={28} className="text-pink-600 mr-3 group-hover:animate-bounce" />
                    Top K-POP Songs
                  </h2>
                </div>
                </div>
              </div>
              
              {/* 배경 장식과 메인 컨테이너 */}
              <div className="relative rounded-[32px] shadow-2xl overflow-hidden">
                {/* 배경 그라디언트 */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100"></div>
                
                {/* 장식용 원형 요소들 */}
                <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-pink-200/40 to-purple-300/40 blur-3xl"></div>
                <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-200/30 to-pink-200/30 blur-3xl"></div>
                <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-full bg-yellow-100/50 blur-2xl"></div>
                
                {/* 장식용 아이콘들 */}
                <div className="absolute top-12 right-12 text-purple-300/30">
                  <MusicIcon size={60} strokeWidth={1} />
                </div>
                <div className="absolute bottom-12 left-16 text-pink-300/30">
                  <MusicIcon size={80} strokeWidth={1} />
              </div>
              
                <div className="relative p-8 md:p-12 z-10">
                  {/* 최상위 1위 곡 - 스포트라이트 디자인 */}
                  {topSongs && topSongs.length > 0 && (
                    <div className="mb-12 relative">
                      <div className="absolute -top-5 -left-5 text-xs font-bold bg-gradient-to-r from-pink-400 to-pink-600 text-white px-3 py-1 rounded-full shadow-lg z-10">
                        #1 TOP SONG
                      </div>
                      
                      <div 
                        onClick={(e) => {
                          e.preventDefault(); 
                          openYoutubeModal(topSongs[0].youtubeUrl, e);
                        }}
                        className="group bg-white/70 backdrop-blur-lg rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer border border-white/80"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-7 overflow-hidden">
                          {/* 왼쪽 앨범 커버와 순위 */}
                          <div className="md:col-span-3 p-6 md:p-10 relative overflow-hidden flex items-center justify-center">
                            {/* 빛나는 배경 효과 */}
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-100 opacity-50"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
                            
                            {/* 1위 태그 */}
                            <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-yellow-400 to-amber-600 text-white text-xl font-bold w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                              1
                    </div>
                            
                            {/* 커버 이미지 */}
                            <div className="relative h-56 w-56 rounded-full overflow-hidden border-[6px] border-white shadow-2xl rotate-0 group-hover:rotate-[5deg] transition-all duration-700 z-10">
                              {topSongs[0].coverImage ? (
                                <img 
                                  src={topSongs[0].coverImage} 
                                  alt={topSongs[0].title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/placeholder.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-600 text-white font-bold text-4xl">
                                  {topSongs[0].title && topSongs[0].title.charAt(0)}
                                </div>
                              )}
                              
                              {/* CD 효과 - 가운데 구멍 */}
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 border border-gray-300 shadow-inner z-10"></div>
                              
                              {/* 플레이 버튼 오버레이 */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                <button 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openYoutubeModal(topSongs[0].youtubeUrl, e);
                                  }}
                                  className="bg-white/90 text-pink-600 p-3 rounded-full hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg"
                                >
                                  <Play size={32} className="ml-1" />
                                </button>
                              </div>
                            </div>
                            
                            {/* 순위 변동 표시 */}
                            {topSongs[0].previousPosition !== topSongs[0].position && (
                              <div className="absolute bottom-4 right-4 z-10">
                                {topSongs[0].previousPosition > topSongs[0].position ? (
                                  <span className="bg-emerald-500 text-white text-sm font-bold px-3 py-1.5 rounded-full flex items-center shadow-lg">
                                    <ArrowUp size={16} className="mr-1" />
                                    {topSongs[0].previousPosition - topSongs[0].position}
                          </span>
                        ) : (
                                  <span className="bg-rose-500 text-white text-sm font-bold px-3 py-1.5 rounded-full flex items-center shadow-lg">
                                    <ArrowDown size={16} className="mr-1" />
                                    {topSongs[0].position - topSongs[0].previousPosition}
                        </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* 오른쪽 곡 정보 */}
                          <div className="md:col-span-4 p-6 md:px-10 md:py-14 flex flex-col justify-center">
                            <div className="text-sm font-semibold text-pink-600 mb-2 uppercase tracking-wider">Hot Track</div>
                            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-800 group-hover:text-pink-600 transition-colors mb-3 line-clamp-2">
                              {decodeHtmlEntities(topSongs[0].title)}
                            </h3>
                            <p className="text-lg md:text-xl font-bold text-purple-600 mb-4">{decodeHtmlEntities(topSongs[0].artist)}</p>
                            
                            <div className="mt-3 flex flex-wrap gap-4">
                              {/* 조회수 */}
                              <div className="flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
                                <Eye size={18} className="text-pink-500 mr-2" />
                                <span className="text-gray-700 font-medium">{(topSongs[0].dailyViews || topSongs[0].dailyViewsFields?.dailyViews || 0).toLocaleString()} views</span>
                    </div>
                    
                    {/* 재생 버튼 */}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openYoutubeModal(topSongs[0].youtubeUrl, e);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-full hover:shadow-lg transition-all hover:scale-105"
                      >
                        <Play size={18} className="mr-2" /> Watch MV
                      </button>
                    </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 2-10위 곡 - 그리드 레이아웃 조정 */}
                  <div className="grid grid-cols-1 gap-8 sm:gap-6 md:gap-8">
                    {/* 2-3위 곡 - 더 큰 카드 (2개를 한 줄에) */}
                    {topSongs && topSongs.length > 1 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-3 md:gap-8 mb-2 sm:mb-3 md:mb-6">
                        {topSongs.slice(1, 3).map((song, index) => (
                          <div key={song._id || song.id} className="relative">
                            {/* 순위 배지 - 절대 위치로 배치하고 높은 z-index 부여 */}
                            <div className="absolute -top-4 -left-4 z-50">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg border-2 border-white ${
                                index === 0 
                                  ? 'bg-gradient-to-r from-slate-400 to-slate-600' 
                                  : 'bg-gradient-to-r from-amber-400 to-amber-600'
                              }`}>
                                {index + 2}
                              </div>
                            </div>
                            
                            <div
                              onClick={(e) => {
                                e.preventDefault(); 
                                openYoutubeModal(song.youtubeUrl, e);
                              }}
                              className="group bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl border border-white/80 hover:bg-white/90 hover:translate-y-[-5px] p-6 pt-7"
                            >
                              <div className="flex items-center">
                                {/* 앨범 커버 - 더 크게, 비율 고정 */}
                                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mr-5 group-hover:scale-105 transition-all duration-500 flex-shrink-0">
                      {song.coverImage ? (
                        <img 
                          src={song.coverImage} 
                          alt={song.title}
                                      className="w-full h-full object-cover"
                                      style={{ aspectRatio: "1/1" }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/placeholder.jpg';
                          }}
                        />
                      ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-600 text-white font-bold text-2xl">
                        {song.title && song.title.charAt(0)}
                      </div>
                      )}
                                
                                {/* CD 효과 - 가운데 구멍 */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/80 border border-gray-300 shadow-inner"></div>
                                
                                {/* 플레이 버튼 오버레이 */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openYoutubeModal(song.youtubeUrl, e);
                                    }}
                                    className="bg-white/90 text-pink-600 p-2 rounded-full hover:bg-white hover:scale-110 transition-all"
                                  >
                                    <Play size={18} className="ml-0.5" />
                                  </button>
                                </div>
                  </div>
                  
                                {/* 곡 정보 - 더 크게 */}
                                <div className="flex-grow pr-7">
                                  <h4 className="font-bold text-gray-800 text-lg line-clamp-1 group-hover:text-pink-600 transition-colors">
                        {song.title}
                                  </h4>
                                  <p className="text-sm text-purple-600 font-medium line-clamp-1 mt-1">{song.artist}</p>
                                  
                                  <div className="flex items-center mt-2 md:mt-3">
                                    <Eye size={12} className="text-gray-400 mr-1" />
                                    <span className="text-[10px] md:text-xs text-gray-500 whitespace-nowrap">{(song.dailyViews || song.dailyViewsFields?.dailyViews || 0).toLocaleString()} views</span>
                                  </div>
                  </div>
                                
                                {/* 순위 변동 표시 */}
                                {song.previousPosition !== song.position && (
                                  <div className="absolute top-3 right-3 z-10">
                                    {song.previousPosition > song.position ? (
                                      <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center shadow-md">
                                        <ArrowUp size={14} className="mr-1" />
                                        {song.previousPosition - song.position}
                                      </span>
                                    ) : (
                                      <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center shadow-md">
                                        <ArrowDown size={14} className="mr-1" />
                                        {song.position - song.previousPosition}
                                      </span>
                                    )}
                </div>
                                )}
                  </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 4-5위 곡 - 중간 크기 카드 (2개를 한 줄에) */}
                    {topSongs && topSongs.length > 3 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-3 md:gap-8">
                        {topSongs.slice(3, 5).map((song, index) => (
                          <div key={song._id || song.id} className="relative">
                            {/* 순위 배지 */}
                            <div className="absolute -top-3 -left-3 z-50">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold shadow-lg border-2 border-white bg-gradient-to-r from-pink-500 to-purple-600">
                                {index + 4}
            </div>
                            </div>
                            
                            <div
                              onClick={(e) => {
                                e.preventDefault(); 
                                openYoutubeModal(song.youtubeUrl, e);
                              }}
                              className="group bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl border border-white/80 hover:bg-white/90 hover:translate-y-[-5px] p-3 sm:p-4 md:p-6 pt-5 md:pt-7"
                            >
                              <div className="flex items-center">
                                {/* 앨범 커버 - 더 크게, 비율 고정 */}
                                <div className="relative w-20 sm:w-24 h-20 sm:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mr-3 sm:mr-5 group-hover:scale-105 transition-all duration-500 flex-shrink-0">
                      {song.coverImage ? (
                                  <img 
                                    src={song.coverImage} 
                                    alt={song.title}
                                    className="w-full h-full object-cover"
                                    style={{ aspectRatio: "1/1" }}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/images/placeholder.jpg';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-600 text-white font-bold text-2xl">
                        {song.title && song.title.charAt(0)}
                      </div>
                                )}
                                
                                {/* CD 효과 - 가운데 구멍 */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/80 border border-gray-300 shadow-inner"></div>
                                
                                {/* 플레이 버튼 오버레이 */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openYoutubeModal(song.youtubeUrl, e);
                                    }}
                                    className="bg-white/90 text-pink-600 p-1.5 rounded-full hover:bg-white hover:scale-110 transition-all"
                                  >
                                    <Play size={16} className="ml-0.5" />
                                  </button>
                  </div>
                </div>
                
                                {/* 곡 정보 */}
                                <div className="flex-grow pr-7">
                                  <h4 className="font-bold text-gray-800 line-clamp-1 group-hover:text-pink-600 transition-colors">
                                    {decodeHtmlEntities(song.title)}
                                  </h4>
                                  <p className="text-sm text-purple-600 font-medium line-clamp-1 mt-1">{decodeHtmlEntities(song.artist)}</p>
                                  
                                  <div className="flex items-center mt-2">
                                    <Eye size={12} className="text-gray-400 mr-1" />
                                    <span className="text-[10px] md:text-xs text-gray-500 whitespace-nowrap">{(song.dailyViews || song.dailyViewsFields?.dailyViews || 0).toLocaleString()} views</span>
                                  </div>
              </div>
              
                                {/* 순위 변동 표시 - 더 작게 */}
                                {song.previousPosition !== song.position && (
                                  <div className="absolute top-3 right-3 z-10">
                                    {song.previousPosition > song.position ? (
                                      <span className="bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center shadow-md">
                                        <ArrowUp size={10} />
                                        {song.previousPosition - song.position}
                                      </span>
                                    ) : (
                                      <span className="bg-rose-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center shadow-md">
                                        <ArrowDown size={10} />
                                        {song.position - song.previousPosition}
                                      </span>
                                    )}
                        </div>
                                )}
                      </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 6-10위 곡 - 작은 카드 (3개를 한 줄에) */}
                    {topSongs && topSongs.length > 5 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {topSongs.slice(5, 10).map((song, index) => (
                          <div key={song._id || song.id} className="relative">
                            {/* 순위 배지 */}
                            <div className="absolute -top-2.5 -left-2.5 z-50">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg border-2 border-white bg-gradient-to-r from-pink-500 to-purple-600">
                                {index + 6}
                              </div>
                            </div>
                            
                            <div
                              onClick={(e) => {
                                e.preventDefault(); 
                                openYoutubeModal(song.youtubeUrl, e);
                              }}
                              className="group bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-xl border border-white/80 hover:bg-white/90 hover:translate-y-[-5px] p-4 pt-5"
                            >
                              <div className="flex items-center">
                                {/* 앨범 커버 - 더 작게 */}
                                <div className="relative w-16 h-16 rounded-full overflow-hidden border-3 border-white shadow-lg mr-3 group-hover:scale-105 transition-all duration-500 flex-shrink-0">
                                  {song.coverImage ? (
                                    <img 
                                      src={song.coverImage} 
                                      alt={song.title}
                                      className="w-full h-full object-cover"
                                      style={{ aspectRatio: "1/1" }}
                        onError={(e) => {
                          e.target.onerror = null;
                                      e.target.src = '/images/placeholder.jpg';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-600 text-white font-bold text-lg">
                        {song.title && song.title.charAt(0)}
                      </div>
                                )}
                                
                                {/* CD 효과 - 가운데 구멍 */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/80 border border-gray-300 shadow-inner"></div>
                                
                                {/* 플레이 버튼 오버레이 */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openYoutubeModal(song.youtubeUrl, e);
                                    }}
                                    className="bg-white/90 text-pink-600 p-1 rounded-full hover:bg-white hover:scale-110 transition-all"
                                  >
                                    <Play size={14} className="ml-0.5" />
                                  </button>
                        </div>
                      </div>
                      
                              {/* 곡 정보 - 더 작게 */}
                              <div className="flex-grow pr-6">
                                <h4 className="font-bold text-gray-800 text-sm line-clamp-1 group-hover:text-pink-600 transition-colors">
                                  {decodeHtmlEntities(song.title)}
                                </h4>
                                <p className="text-xs text-purple-600 font-medium line-clamp-1 mt-0.5">{decodeHtmlEntities(song.artist)}</p>
                              </div>
                              
                              {/* 순위 변동 표시 - 더 작게 */}
                              {song.previousPosition !== song.position && (
                                <div className="absolute top-2 right-2 z-10">
                                  {song.previousPosition > song.position ? (
                                    <span className="bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center shadow-md">
                                      <ArrowUp size={10} />
                                      {song.previousPosition - song.position}
                                    </span>
                                  ) : (
                                    <span className="bg-rose-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center shadow-md">
                                      <ArrowDown size={10} />
                                      {song.position - song.previousPosition}
                                    </span>
                                  )}
                                </div>
                              )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
                  )}
                  
                  {/* 데이터가 없는 경우 */}
                  {(!topSongs || topSongs.length <= 1) && (
                    <div className="text-center p-10 text-gray-500">
                      No more music data available
                    </div>
                  )}
                </div>
              </div>
              </div>
            </section>
        </div>
      </main>

      {/* YouTube Modal */}
      {showYoutubeModal && (
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto overflow-x-hidden flex items-center justify-center bg-black/90 backdrop-blur-md p-4" 
          onClick={closeYoutubeModal}
        >
          <div className="relative w-full max-w-4xl mx-auto">
            {/* 닫기 버튼 - 더 크고 모바일에서 쉽게 탭할 수 있게 조정 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeYoutubeModal();
              }}
              className="absolute -top-16 right-0 md:-top-12 p-4 md:p-3 text-white bg-black/60 rounded-full hover:bg-black/80 transition-colors z-10 shadow-lg"
              aria-label="Close modal"
            >
              <X size={32} className="md:w-6 md:h-6" />
            </button>
            
            {/* 모달 내용 */}
            <div 
              className="bg-black rounded-xl overflow-hidden shadow-2xl" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="relative pb-[56.25%] h-0">
                <iframe 
                  src={currentYoutubeUrl}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                  allowFullScreen
                  frameBorder="0"
                  playsInline
                  webkit-playsinline="true"
                  title="YouTube video player"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* More News You Might Like - 모바일에서만 보이는 섹션 */}
      <div className="bg-white">
        <div className="container mx-auto px-4">
          {loadedMoreNews && (
            <MoreNews 
              initialNews={initialMoreNews} 
              // 뒤로가기 시 컴포넌트가 다시 마운트되지 않도록 고정 키 사용
              key="more-news-permanent-instance" 
            />
          )}
        </div>
      </div>

      {/* 푸터 영역 */}
      {/* ... existing footer content */}
    </MainLayout>
  );
}

// 캐시 문제 해결을 위해 서버 사이드 렌더링으로 임시 변경
export async function getServerSideProps() {
  try {
    // 서버 URL 설정
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? 'https://kstarpick.com'
      : 'http://43.202.38.79:13001';

    console.log('🚀 Static Generation으로 홈페이지 데이터 로딩 시작');
    
    // 7일 전 날짜 계산
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    // 병렬로 핵심 API 호출 (Watch News 추가)
    const [
      mainNewsRes,
      featuredNewsRes,
      musicRes,
      watchNewsRes
    ] = await Promise.all([
      fetch(`${serverUrl}/api/news?limit=20`),
      fetch(`${serverUrl}/api/news?featured=true&limit=20&createdAfter=${sevenDaysAgo.toISOString()}`),
      fetch(`${serverUrl}/api/music/popular?limit=5`),
      fetch(`${serverUrl}/api/music/popular?limit=5`) // 임시로 중복 호출 (Watch News는 클라이언트에서)
    ]);

    // 응답을 JSON으로 파싱
    const [
      mainNews,
      featuredNews,
      music,
      watchNewsInitial
    ] = await Promise.all([
      mainNewsRes.json(),
      featuredNewsRes.json(),
      musicRes.json(),
      watchNewsRes.json()
    ]);

    // Watch News는 클라이언트에서 처리 (하이드레이션 에러 방지)
    const watchNews = { success: true, data: { news: [] } };

    // 홈페이지 표시를 위한 충분한 데이터 구성
    const initialData = {
      newsArticles: mainNews.success ? mainNews.data.news?.slice(0, 20) || [] : [],
      featuredArticles: featuredNews.success ? featuredNews.data.news?.slice(0, 20) || [] : [],
      watchNews: watchNews.success ? watchNews.data.news?.slice(0, 6) || [] : [], // Watch News 추가
      popularNews: {
        drama: [], // 클라이언트에서 로드
        movie: [], // 클라이언트에서 로드
        kpop: [], // 클라이언트에서 로드
        celeb: [] // 클라이언트에서 로드
      },
      rankingNews: [], // 클라이언트에서 로드
      topSongs: music.success ? (music.data || music.musics)?.slice(0, 5) || [] : [],
      moreNews: [] // 클라이언트에서 로드
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
          watchNews: [],
          popularNews: { drama: [], movie: [], kpop: [], celeb: [] },
          rankingNews: [],
          topSongs: [],
          moreNews: []
        }
      }
    };
  }
}

export default Home;

// 🚀 Client-side rendering으로 변경하여 로딩 속도 대폭 개선!
// getServerSideProps 제거 - 클라이언트에서 데이터 로드 