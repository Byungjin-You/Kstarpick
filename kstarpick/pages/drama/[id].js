import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import MainLayout from '../../components/MainLayout';
import CastSection from '../../components/CastSection';
import { Calendar, Clock, Eye, Network, Star, Tag, Play, User, Share2, Heart, Info, Film, Tv, ListFilter, X, Check, ChevronRight, Award, Download, Users, FileImage, List, ThumbsDown, Plus, MessageCircle, MessageSquare, FileText, ChevronLeft, ThumbsUp, Bookmark, TrendingUp } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faShare, faStar, faEye, faCalendarAlt, faTv } from '@fortawesome/free-solid-svg-icons';
import { faHeart as farHeart } from '@fortawesome/free-regular-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import useSWR from 'swr';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import Seo from '../../components/Seo';
import StructuredData from '../../components/StructuredData';
import Footer from '../../components/Footer';

// PC layout sidebar components
import CommentTicker from '../../components/home/CommentTicker';
import TrendingNow from '../../components/home/TrendingNow';
import MoreNews from '../../components/MoreNews';

const fetcher = url => axios.get(url).then(res => res.data);

// Editor's PICK time ago helper
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

// 외부 이미지 허용 도메인 목록 추가
const safeDomains = [
  'mydramalist.com',
  'kakaocdn.net',
  'naver.net',
  'daumcdn.net',
  'tmdb.org',
  'justwatch.com',
  'wikimedia.org',
  'wikipedia.org',
  // 필요한 도메인 추가
];

// 이미지 URL 오류 처리 함수
const ensureLocalImage = (imageUrl) => {
  if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
    return '/images/placeholder-tvfilm.jpg';
  }
  // 애플 TV+ 로고 특별 처리 (기존 로고 URL도 새 SVG로 변환)
  if (imageUrl && (
    imageUrl.includes('Apple_TV_Plus_logo.png') ||
    (imageUrl.includes('apple') && imageUrl.includes('tv') && imageUrl.includes('logo')) ||
    (imageUrl.includes('favicon') && imageUrl.includes('apple'))
  )) {
    return 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg';
  }
  if (imageUrl.startsWith('public/')) {
    return imageUrl.replace('public/', '/');
  }
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      const url = new URL(imageUrl);
      const domain = url.hostname;
      if (safeDomains.some(safeDomain => domain.includes(safeDomain))) {
        return imageUrl;
      }
    } catch (error) {
      console.error('URL 파싱 오류:', error, imageUrl);
      return '/images/placeholder-tvfilm.jpg';
    }
    return '/images/placeholder-tvfilm.jpg';
  }
  if (!imageUrl.startsWith('/images/')) {
    return `/images/${imageUrl}`;
  }
  return imageUrl;
};

// 외부 URL인지 확인하는 함수
const isExternalUrl = (url) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
};

// reviewHtml에서 helpful count 파싱
const getHelpfulCount = (review) => {
  if (review.helpfulCount > 0) return review.helpfulCount;
  const match = review.reviewHtml?.match(/<b>(\d+)<\/b>\s*people found this review helpful/);
  return match ? parseInt(match[1], 10) : 0;
};

// 리뷰 정렬 함수
const sortReviews = (reviewList, mode) => {
  const sorted = [...reviewList];
  switch (mode) {
    case 'popular': {
      // helpful 데이터가 하나라도 있으면 helpful 기준, 없으면 rating + 텍스트 길이 기준
      const hasHelpful = sorted.some(r => getHelpfulCount(r) > 0);
      if (hasHelpful) {
        return sorted.sort((a, b) => getHelpfulCount(b) - getHelpfulCount(a));
      }
      return sorted.sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.reviewText?.length || 0) - (a.reviewText?.length || 0);
      });
    }
    case 'rated':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'recent':
    default:
      return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }
};

// YouTube URL에서 비디오 ID를 추출하는 함수
const getYoutubeIdFromUrl = (url) => {
  if (!url) return null;
  
  // YouTube URL 형식들
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*&v=)([^#&?]*).*/,
    /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)(?:\?.*)?$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

// 이미지 컴포넌트를 렌더링하는 함수
const renderImage = (imageUrl, alt, className = "object-cover", width = 0, height = 0, priority = false, type = 'general') => {
  // 이미지 URL이 없는 경우 플레이스홀더 사용
  if (!imageUrl) {
    if (type === 'logo') {
      return <span className="text-gray-800 font-bold text-base sm:text-lg">{alt || "Logo"}</span>;
    }
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#FF8DC7] to-[#FF5CAA] flex items-center justify-center">
        <Film className="w-1/4 h-1/4 text-white" />
      </div>
    );
  }
  
  // 특정 서비스 로고 특별 처리
  if (alt && typeof alt === 'string' && type === 'logo') {
    // Wavve 로고 특별 처리
    if (alt.toLowerCase() === 'wavve') {
      imageUrl = 'https://i.mydramalist.com/pgAd8_3m.jpg';
    }
    // Viki 로고 특별 처리
    else if (alt.toLowerCase() === 'viki') {
      imageUrl = 'https://i.mydramalist.com/kEBdrm.jpg';
    }
    // Apple TV+ 로고 특별 처리
    else if (alt.toLowerCase().includes('apple')) {
      imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg';
    }
  }

  // JustWatch 이미지 여부 확인
  const isJustWatchImage = imageUrl.includes('justwatch.com');

  const imgProps = {
    src: imageUrl,
    alt: alt || "Image",
    className: className,
    unoptimized: isJustWatchImage ? false : true,  // JustWatch 이미지는 최적화 활성화
    onError: (e) => {
      e.target.onerror = null; // 무한 루프 방지
      // 이미지 타입에 따라 다른 플레이스홀더 사용
      if (type === 'logo') {
        e.target.src = '/images/placeholder-image.jpg';
      } else {
        e.target.src = '/images/placeholder-tvfilm.jpg';
      }
    }
  };

  if (priority) {
    imgProps.priority = true;
  }
  
  // width, height가 제공된 경우 (예: 로고 이미지)
  if (width > 0 && height > 0) {
    return (
      <Image
        {...imgProps}
        width={width}
        height={height}
      />
    );
  }
  
  // 로고 타입이지만 width, height가 제공되지 않은 경우
  if (type === 'logo') {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Image
          {...imgProps}
          width={150}
          height={70}
        />
      </div>
    );
  }
  
  // width, height가 제공되지 않은 경우 (일반 이미지)
  return <Image {...imgProps} fill sizes="100vw" />;
};

export default function DramaDetail({ drama, relatedNews, metaTags, recentComments, rankingNews, trendingNews = [], editorsPickNews = [] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentDrama, setCurrentDrama] = useState(drama || null);
  const [relatedItems, setRelatedItems] = useState([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [mobileVisibleComments, setMobileVisibleComments] = useState(3);
  const [selectedTrailerUrl, setSelectedTrailerUrl] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [watchProviders, setWatchProviders] = useState([]);
  const [cast, setCast] = useState(drama?.cast || []);
  const [youtubeId, setYoutubeId] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [trailerTitle, setTrailerTitle] = useState('');
  // 리뷰 세부 평점을 위한 상태 추가
  const [castRating, setCastRating] = useState(0);
  const [storyRating, setStoryRating] = useState(0);
  const [musicRating, setMusicRating] = useState(0);
  const [rewatchRating, setRewatchRating] = useState(0);
  
  // 댓글 데이터 (SSR fallback)
  const [commentsData, setCommentsData] = useState(recentComments || []);

  // 스크롤 위치에 따른 비디오 화살표 표시 상태
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  
  // 스크롤 위치에 따른 리뷰 화살표 표시 상태
  const [showReviewLeftArrow, setShowReviewLeftArrow] = useState(false);
  const [showReviewRightArrow, setShowReviewRightArrow] = useState(true);
  
  // 비디오 스와이프 기능을 위한 상태 추가
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  
  // 리뷰 관련 상태 추가 (중복 제거)
  const [reviews, setReviews] = useState(() => {
    const raw = drama?.reviews || [];
    const map = new Map();
    raw.forEach(r => {
      const key = r.reviewId || r._id?.toString() || `${r.username}-${r.rating}`;
      if (!map.has(key)) map.set(key, r);
    });
    return Array.from(map.values());
  });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [visibleReviewCount, setVisibleReviewCount] = useState(3);
  const [reviewSortMode, setReviewSortMode] = useState('recent'); // recent | popular | rated
  const [selectedReview, setSelectedReview] = useState(null);
  
  // session 정보 가져오기
  const { data: session } = useSession();
  
  // 리뷰 컨테이너 참조
  const reviewsContainerRef = useRef(null);
  // 비디오 컨테이너 참조 + 드래그 스크롤
  const videosContainerRef = useRef(null);       // 모바일
  const videosContainerRefPC = useRef(null);     // PC
  const videoDragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  // Cast 컨테이너 드래그 스크롤
  const castScrollRef = useRef(null);
  const castDragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  
  // 리뷰 터치 이벤트를 위한 상태 추가
  const [reviewTouchStartX, setReviewTouchStartX] = useState(0);
  const [reviewTouchEndX, setReviewTouchEndX] = useState(0);

  // PC sidebar sticky
  const sidebarStickyRef = useRef(null);
  const [sidebarStickyTop, setSidebarStickyTop] = useState(92);
  
  // 데이터 불러오기 - slug 사용 (URL params와 동일, _id 대신 slug로 조회)
  const { data: dramaData, error: dramaError } = useSWR(
    currentDrama && router.query.id ? `/api/dramas/${router.query.id}` : null,
    fetcher
  );

  // filteredWatchProviders useMemo 제거

  // SSR 데이터에서 youtubeId 초기화 (SWR 로딩 전에도 트레일러 재생 가능)
  useEffect(() => {
    if (!drama) return;
    if (drama.videos && Array.isArray(drama.videos) && drama.videos.length > 0) {
      const mainVideoId = getYoutubeIdFromUrl(drama.videos[0].url);
      if (mainVideoId) setYoutubeId(mainVideoId);
    } else if (drama.trailerUrl) {
      const trailerVideoId = getYoutubeIdFromUrl(drama.trailerUrl);
      if (trailerVideoId) setYoutubeId(trailerVideoId);
    }
  }, [drama]);

  // 댓글 데이터 클라이언트 fallback
  useEffect(() => {
    if (commentsData.length > 0) return;
    fetch('/api/comments/recent?limit=10')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.length > 0) {
          setCommentsData(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // 스크롤 위치 복원 로직 - drama 페이지에서 뒤로가기 시
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isBack = sessionStorage.getItem('isBackToDramaDetail') === 'true';
    const wasBack = sessionStorage.getItem('_navWasBack') === 'true';
    const savedPath = sessionStorage.getItem('dramaDetailScrollPositionPath');
    const savedScrollPosition = sessionStorage.getItem('dramaDetailScrollPosition');
    const currentPath = window.location.pathname;

    if (isBack && wasBack && savedScrollPosition && savedPath === currentPath) {
      const scrollPos = parseInt(savedScrollPosition, 10);

      const restoreScroll = () => {
        window.scrollTo(0, scrollPos);
        document.documentElement.scrollTop = scrollPos;
        document.body.scrollTop = scrollPos;
      };

      restoreScroll();
      [50, 150, 300, 500, 800, 1200, 2000].forEach(delay => {
        setTimeout(restoreScroll, delay);
      });

      sessionStorage.removeItem('dramaDetailScrollPosition');
      sessionStorage.removeItem('dramaDetailScrollPositionPath');
    }

    // 순방향이든 뒤로가기든 플래그 정리 (isBackToDrama는 드라마 목록용이므로 건드리지 않음)
    sessionStorage.removeItem('isBackToDramaDetail');
  }, [router.asPath]);

  // 리뷰 데이터 불러오기
  useEffect(() => {
    if (!currentDrama) return;

    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const response = await fetch(`/api/reviews/by-drama/${currentDrama._id}`);
        const result = await response.json();

        if (response.ok && result.success) {
          // 로컬 API가 빈 배열 반환 시 기존 SSR 리뷰 데이터 유지
          if (result.data && result.data.length > 0) {
            setReviews(result.data);
          }
        }
      } catch (error) {
        console.error('리뷰 API 호출 오류:', error);
        setReviewsError('리뷰 데이터를 가져오는 중 오류가 발생했습니다.');
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [currentDrama]);

  // 리뷰 스크롤 함수 추가
  const scrollReviews = (direction) => {
    if (reviewsContainerRef.current) {
      const container = reviewsContainerRef.current;
      
      // 모바일인지 확인
      const isMobile = window.innerWidth <= 768;
      
      // 모바일일 경우 카드 하나의 너비 + 여백으로 계산
      const cardWidth = isMobile 
        ? Math.min(container.querySelector('div[style*="scrollSnapAlign"]')?.offsetWidth || 260, container.clientWidth * 0.8)
        : 300;
      
      const scrollAmount = cardWidth + (isMobile ? 8 : 16); // 카드 너비 + 간격
      
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
      
      // 스크롤 후 상태 업데이트를 위한 타이머 설정
      setTimeout(() => {
        // 왼쪽 화살표 표시 여부 (스크롤 위치가 0보다 크면 표시)
        setShowReviewLeftArrow(container.scrollLeft > 10);
        
        // 오른쪽 화살표 표시 여부 (스크롤이 끝에 도달하지 않았으면 표시)
        const isAtEnd = Math.abs(
          (container.scrollWidth - container.clientWidth) - container.scrollLeft
        ) < 10;
        
        setShowReviewRightArrow(!isAtEnd);
      }, 300);
    }
  };

  // 비디오 스크롤 함수 추가
  const scrollVideos = useCallback((direction) => {
    if (!videosContainerRef.current) return;
    
    const container = videosContainerRef.current;
    const scrolledItems = Array.from(container.children);
    
    // 현재 화면에 보이는 아이템의 인덱스 찾기
    let visibleIndex = 0;
    const containerLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    
    for (let i = 0; i < scrolledItems.length; i++) {
      const item = scrolledItems[i];
      const itemLeft = item.offsetLeft;
      // 아이템의 왼쪽 경계가 컨테이너 안에 있는지 확인
      if (itemLeft >= containerLeft && itemLeft < (containerLeft + containerWidth * 0.5)) {
        visibleIndex = i;
        break;
      }
    }
    
    // 스크롤할 다음/이전 아이템 결정
    const targetIndex = direction === 'right' 
      ? Math.min(visibleIndex + 1, scrolledItems.length - 1)
      : Math.max(visibleIndex - 1, 0);
    
    // 해당 아이템으로 스크롤
    if (scrolledItems[targetIndex]) {
      scrolledItems[targetIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start'
      });
    }
    
    // 화살표 상태 업데이트
    setTimeout(() => {
      setShowLeftArrow(targetIndex > 0);
      setShowRightArrow(targetIndex < scrolledItems.length - 1);
    }, 300);
  }, []);

  // 캐스트 스크롤 함수 추가 (경계 처리 개선)


  // 비디오 컨테이너 스크롤 이벤트 감지
  useEffect(() => {
    const container = videosContainerRef.current;
    if (!container || !currentDrama?.videos?.length) return;
    
    const handleScroll = () => {
      // 왼쪽 화살표 표시 여부 (스크롤 위치가 0보다 크면 표시)
      setShowLeftArrow(container.scrollLeft > 10);
      
      // 오른쪽 화살표 표시 여부 (스크롤이 끝에 도달하지 않았으면 표시)
      const isAtEnd = Math.abs(
        (container.scrollWidth - container.clientWidth) - container.scrollLeft
      ) < 10;
      
      setShowRightArrow(!isAtEnd);
    };
    
    // 터치 이벤트 핸들러 추가
    const handleTouchStart = (e) => {
      setTouchStartX(e.touches[0].clientX);
    };
    
    const handleTouchEnd = (e) => {
      setTouchEndX(e.changedTouches[0].clientX);
      
      const touchDiff = touchStartX - touchEndX;
      
      // 터치 움직임이 충분히 클 경우에만 스크롤 (작은 터치는 무시)
      if (Math.abs(touchDiff) > 50) {
        if (touchDiff > 0) {
          // 왼쪽으로 스와이프 - 다음 항목으로
          scrollVideos('right');
        } else {
          // 오른쪽으로 스와이프 - 이전 항목으로
          scrollVideos('left');
        }
      }
    };
    
    // 초기 상태 설정
    handleScroll();
    
    // 스크롤 이벤트 리스너 등록
    container.addEventListener('scroll', handleScroll);
    // 터치 이벤트 리스너 등록
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentDrama?.videos, scrollVideos, touchStartX, touchEndX]);



  // 리뷰 컨테이너 스크롤 이벤트 감지
  useEffect(() => {
    const container = reviewsContainerRef.current;
    if (!container || !reviews?.length) return;
    
    const handleScroll = () => {
      // 왼쪽 화살표 표시 여부 (스크롤 위치가 0보다 크면 표시)
      setShowReviewLeftArrow(container.scrollLeft > 10);
      
      // 오른쪽 화살표 표시 여부 (스크롤이 끝에 도달하지 않았으면 표시)
      const isAtEnd = Math.abs(
        (container.scrollWidth - container.clientWidth) - container.scrollLeft
      ) < 10;
      
      setShowReviewRightArrow(!isAtEnd);
    };
    
    // 터치 이벤트 핸들러 추가
    const handleReviewTouchStart = (e) => {
      setReviewTouchStartX(e.touches[0].clientX);
    };
    
    const handleReviewTouchEnd = (e) => {
      setReviewTouchEndX(e.changedTouches[0].clientX);
      
      const touchDiff = reviewTouchStartX - reviewTouchEndX;
      
      // 터치 움직임이 충분히 클 경우에만 스크롤 (작은 터치는 무시)
      if (Math.abs(touchDiff) > 50) {
        if (touchDiff > 0) {
          // 왼쪽으로 스와이프 - 다음 항목으로
          scrollReviews('right');
        } else {
          // 오른쪽으로 스와이프 - 이전 항목으로
          scrollReviews('left');
        }
      }
    };
    
    // 초기 상태 설정
    handleScroll();
    
    // 스크롤 이벤트 리스너 등록
    container.addEventListener('scroll', handleScroll);
    
    // 터치 이벤트 리스너 등록
    container.addEventListener('touchstart', handleReviewTouchStart);
    container.addEventListener('touchend', handleReviewTouchEnd);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('touchstart', handleReviewTouchStart);
      container.removeEventListener('touchend', handleReviewTouchEnd);
    };
  }, [reviews, reviewTouchStartX, reviewTouchEndX]);

  useEffect(() => {
    if (dramaData?.data) {
      // 데이터가 있는 경우 이미지 URL 수정 및 보강
      const updatedData = { ...dramaData.data };

      // whereToWatch 확인 및 처리
      if (updatedData.whereToWatch && Array.isArray(updatedData.whereToWatch)) {
        updatedData.whereToWatch.forEach((provider, index) => {
          // 웨이브와 비키 로고 URL 특별 처리
          if (provider.name && provider.name.toLowerCase() === 'wavve') {
            provider.imageUrl = 'https://i.mydramalist.com/pgAd8_3m.jpg';
          } else if (provider.name && provider.name.toLowerCase() === 'viki') {
            provider.imageUrl = 'https://i.mydramalist.com/kEBdrm.jpg';
          }
        });
      }

      // 이미지 URL 수정 - SWR 데이터가 placeholder로 변환되면 기존 SSR 이미지 유지
      const newCoverImage = ensureLocalImage(updatedData.coverImage);
      updatedData.coverImage = (newCoverImage === '/images/placeholder-tvfilm.jpg' && currentDrama?.coverImage)
        ? currentDrama.coverImage
        : newCoverImage;

      const newBannerImage = ensureLocalImage(updatedData.bannerImage);
      updatedData.bannerImage = (newBannerImage === '/images/placeholder-tvfilm.jpg' && currentDrama?.bannerImage)
        ? currentDrama.bannerImage
        : newBannerImage;

      // watchProviders 배열의 모든 항목에 대해 로고 URL을 내부 이미지로 변경
      if (updatedData.watchProviders && Array.isArray(updatedData.watchProviders)) {
        updatedData.watchProviders = updatedData.watchProviders.map(provider => {
          const processedLogo = provider.logo ? ensureLocalImage(provider.logo) : '/images/placeholder-image.jpg';
          return {
            ...provider,
            logo: processedLogo
          };
        });
      }
      
      // Cast 데이터 처리
      if (updatedData.cast && Array.isArray(updatedData.cast)) {
        updatedData.cast = updatedData.cast.map(actor => {
          // API에서는 profileImage 필드를 사용하므로 이를 직접 사용
          const imageUrl = actor.profileImage || actor.image || '';
          
          // 필드 이름 표준화 - 모든 cast 항목에 확실히 image 필드 추가
          return {
            ...actor,
            name: actor.name || 'Unknown Actor',
            role: actor.role || 'Unknown Role',
            image: ensureLocalImage(imageUrl),
            // profileImage 원본 필드도 유지
            profileImage: imageUrl
          };
        });
      } else if (!updatedData.cast || !Array.isArray(updatedData.cast) || updatedData.cast.length === 0) {
        // 캐스트 데이터가 없는 경우 기본 배우 데이터 생성
        updatedData.cast = [
          { name: 'Actor 1', role: 'Role 1', image: '/images/placeholder-tvfilm.jpg', profileImage: '/images/placeholder-tvfilm.jpg' },
          { name: 'Actor 2', role: 'Role 2', image: '/images/placeholder-tvfilm.jpg', profileImage: '/images/placeholder-tvfilm.jpg' },
          { name: 'Actor 3', role: 'Role 3', image: '/images/placeholder-tvfilm.jpg', profileImage: '/images/placeholder-tvfilm.jpg' }
        ];
      }
      
      // 비디오 데이터에서 메인 트레일러 ID 추출
      if (updatedData.videos && Array.isArray(updatedData.videos) && updatedData.videos.length > 0) {
        // 첫 번째 비디오 URL에서 YouTube ID 추출
        const mainVideoId = getYoutubeIdFromUrl(updatedData.videos[0].url);
        if (mainVideoId) {
          setYoutubeId(mainVideoId);
        } else if (updatedData.trailerUrl) {
          // 만약 첫 번째 비디오 URL에서 ID 추출이 실패하면 trailerUrl 시도
          const trailerVideoId = getYoutubeIdFromUrl(updatedData.trailerUrl);
          if (trailerVideoId) {
            setYoutubeId(trailerVideoId);
          }
        }
      } else if (updatedData.trailerUrl) {
        // videos 배열이 없는 경우 trailerUrl에서 추출
        const trailerVideoId = getYoutubeIdFromUrl(updatedData.trailerUrl);
        if (trailerVideoId) {
          setYoutubeId(trailerVideoId);
        }
      }

      // 리뷰 데이터의 유효성 확인
      const hasValidReviewData = 
        typeof updatedData.reviewCount === 'number' && 
        typeof updatedData.reviewRating === 'number' && 
        Array.isArray(updatedData.ratingDistribution) &&
        updatedData.ratingDistribution.length === 10;
      
      if (!hasValidReviewData) {
        console.warn("⚠️ 유효한 리뷰 데이터가 없습니다. 기본값을 사용합니다.");
        // 기본값 설정
        updatedData.reviewCount = 0;
        updatedData.reviewRating = 0;
        updatedData.ratingDistribution = [0,0,0,0,0,0,0,0,0,0];
      }
      
      // SWR 데이터와 SSR 데이터 머지: SWR에서 빈 값이면 SSR 값 유지
      // (로컬 MongoDB에 불완전한 데이터가 있을 수 있으므로)
      const mergedData = { ...currentDrama };
      Object.entries(updatedData).forEach(([key, val]) => {
        const ssrVal = currentDrama?.[key];
        // SWR 값이 유효하면 덮어쓰기
        const isEmptyVal = val === '' || val === null || val === undefined || (Array.isArray(val) && val.length === 0);
        const ssrHasVal = ssrVal !== '' && ssrVal !== null && ssrVal !== undefined && !(Array.isArray(ssrVal) && ssrVal.length === 0);
        if (!isEmptyVal || !ssrHasVal) {
          mergedData[key] = val;
        }
      });
      // reviewRating/reviewCount는 SWR 재계산값이 0이어도 유효하므로, SSR 값이 더 정확하면 유지
      if (updatedData.reviewRating === 0 && currentDrama?.reviewRating > 0) {
        mergedData.reviewRating = currentDrama.reviewRating;
      }
      if (updatedData.reviewCount === 0 && currentDrama?.reviewCount > 0) {
        mergedData.reviewCount = currentDrama.reviewCount;
      }

      setCurrentDrama(mergedData);
      setCast(mergedData.cast);
      setLikesCount(mergedData.likes || 0);
      setDislikesCount(mergedData.dislikes || 0);
      
      // 사용자 상호작용 확인
      const checkUserInteractions = async () => {
        if (session?.user) {
          try {
            const res = await axios.get(`/api/user/interactions?contentId=${currentDrama._id}&type=drama`);
            if (res.data.success) {
              setIsLiked(res.data.liked);
              setIsDisliked(res.data.disliked);
            }
          } catch (error) {
            console.error('Error checking user interactions:', error);
          }
        }
      };
      
      checkUserInteractions();
    }
    
    // Add loading state handling
    if (dramaData) {
      setLoading(false);
    }
    
    if (dramaError) {
      // SWR 404는 무시 - SSR 데이터가 이미 있으므로 치명적 오류로 처리하지 않음
      console.warn('SWR fetch error (non-fatal):', dramaError?.message);
      setLoading(false);
    }
  }, [dramaData, session, dramaError]);

  useEffect(() => {
    if (dramaData?.data) {
      // Cast 데이터 처리 개선
      if (!dramaData.data.cast) {
        setCast([
          { id: 1, name: 'Actor 1', role: 'Role 1', image: '/images/placeholder-tvfilm.jpg' },
          { id: 2, name: 'Actor 2', role: 'Role 2', image: '/images/placeholder-tvfilm.jpg' },
          { id: 3, name: 'Actor 3', role: 'Role 3', image: '/images/placeholder-tvfilm.jpg' },
        ]);
      } else {
        // 출연진 정보가 객체 형태로 되어 있는지 확인 (mainRoles, supportRoles 구조)
        if (dramaData.data.cast.mainRoles || dramaData.data.cast.supportRoles) {
          // 메인 역할과 서포트 역할을 합친 배열 생성
          const mainActors = Array.isArray(dramaData.data.cast.mainRoles) ? dramaData.data.cast.mainRoles : [];
          const supportActors = Array.isArray(dramaData.data.cast.supportRoles) ? dramaData.data.cast.supportRoles : [];

          // 배우 정보 처리 (이미지 URL 등 필드 표준화)
          const processedCast = [...mainActors, ...supportActors].map(actor => ({
            ...actor,
            image: actor.image || '/images/placeholder-tvfilm.jpg'
          }));

          setCast(processedCast);
        } else if (Array.isArray(dramaData.data.cast)) {
          // 기존 방식 지원 (단일 배열 형태인 경우)
          const processedCast = dramaData.data.cast.map(actor => ({
            ...actor,
            image: actor.image || '/images/placeholder-tvfilm.jpg'
          }));
          setCast(processedCast);
        } else {
          console.warn('Unexpected cast data format:', dramaData.data.cast);
          setCast([]);
        }
      }
      
      // Fetch related items
      const fetchRelatedItems = async () => {
        try {
          const relatedResponse = await axios.get('/api/dramas', {
            params: {
              category: dramaData.data.category,
              limit: 4,
            }
          });
          
          if (relatedResponse.data.success) {
            // Filter out the current item and limit to 4 items
            const filtered = relatedResponse.data.data
              .filter(item => item._id !== currentDrama._id)
              .slice(0, 4)
              .map(item => ({
                ...item,
                coverImage: item.coverImage || '/images/placeholder-tvfilm.jpg'
              }));
            
            setRelatedItems(filtered);
          }
        } catch (error) {
          console.error('Error fetching related items:', error);
        }
      };
      
      fetchRelatedItems();
    }
  }, [dramaData, currentDrama]);

  useEffect(() => {
    if (dramaData) {
      // Set page title
      if (dramaData.title) {
        document.title = `${dramaData.title} - KDrama&Movie`;
      }

      // No need to fetch related items here as it's already done in the previous useEffect
    }
  }, [dramaData]);

  // Get status badge class based on status
  const getStatusClass = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return null;

    // 날짜 범위인 경우 (예: "Oct 10, 2025 - Nov 15, 2025")
    if (dateString.includes(' - ')) {
      return dateString; // 원본 그대로 반환
    }

    // 단일 날짜인 경우
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // 파싱 실패 시 원본 문자열 반환
      return dateString;
    }
    return `${date.toLocaleDateString('en-US')}`;
  };

  const handleLike = async () => {
    if (!session) {
      router.push('/login?returnUrl=' + router.asPath);
      return;
    }

    try {
      // 이미 disliked 상태라면 해제
      if (isDisliked) {
        setIsDisliked(false);
        setDislikesCount(prev => Math.max(0, prev - 1));
      }
      
      // 좋아요 상태 토글 및 카운트 업데이트
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
      
      // dramas API로 요청 변경
      await axios.post(`/api/dramas/${currentDrama._id}/like`, {
        action: newLikedState ? 'like' : 'unlike',
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      // 에러 발생 시 UI 롤백
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? Math.max(0, prev - 1) : prev + 1);
    }
  };

  const handleDislike = async () => {
    if (!session) {
      router.push('/login?returnUrl=' + router.asPath);
      return;
    }
    
    // 즉시 UI 업데이트 (낙관적 업데이트)
    const previousLiked = isLiked;
    const previousDisliked = isDisliked;
    const previousLikesCount = likesCount;
    const previousDislikesCount = dislikesCount;
    
    // 새로운 상태로 UI 업데이트
    setIsDisliked(!isDisliked);
    setDislikesCount(prev => !isDisliked ? prev + 1 : prev - 1);
    
    // 만약 이전에 좋아요를 눌렀었다면, 좋아요 제거
    if (!isDisliked && isLiked) {
      setIsLiked(false);
      setLikesCount(prev => prev > 0 ? prev - 1 : 0);
    }
    
    try {
      // dramas API로 요청 변경
      const res = await axios.post(`/api/dramas/${currentDrama._id}/dislike`, {
        action: !isDisliked ? 'dislike' : 'undislike',
      });
      
      if (!res.data || !res.data.success) {
        // API 호출 실패 시 UI 롤백
        setIsLiked(previousLiked);
        setIsDisliked(previousDisliked);
        setLikesCount(previousLikesCount);
        setDislikesCount(previousDislikesCount);
        console.error('API response error:', res.data?.message);
      }
    } catch (error) {
      // 에러 발생 시 UI 롤백
      setIsLiked(previousLiked);
      setIsDisliked(previousDisliked);
      setLikesCount(previousLikesCount);
      setDislikesCount(previousDislikesCount);
      console.error('Error disliking content:', error);
    }
  };

  const handleShare = () => setShowShareMenu(true);

  const getDramaShareUrl = () => `https://www.kstarpick.com/drama/${currentDrama?.slug || currentDrama?._id}`;

  const handleShareFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getDramaShareUrl())}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareTwitter = () => {
    const title = currentDrama?.title || '';
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(getDramaShareUrl())}&text=${encodeURIComponent(title)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleCopyLink = () => {
    const url = getDramaShareUrl();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
    setShowShareMenu(false);
  };

  // 배우 클릭 핸들러 - 배우 이름으로 검색 (CastSection 컴포넌트에서 사용)
  const handleActorClick = (actorName, e) => {
    if (!actorName) return;

    // 배우 이름을 URL 인코딩하여 검색 페이지로 이동
    const encodedName = encodeURIComponent(actorName);
    router.push(`/search?q=${encodedName}&type=actor`);
  };

  // 리뷰 모달 열기
  const openReviewModal = (review) => {
    setSelectedReview(review);
    setShowReviewModal(true);
    // 모달이 열릴 때 스크롤 방지
    document.body.style.overflow = 'hidden';
  };

  // 리뷰 모달 닫기
  const closeReviewModal = () => {
    setShowReviewModal(false);
    setSelectedReview(null);
    // 모달이 닫힐 때 스크롤 허용
    document.body.style.overflow = 'auto';
  };

  // 다음 리뷰로 이동
  const goToNextReview = () => {
    if (reviews.length <= 1) return;
    
    const sortedReviews = [...reviews].sort((a, b) => (b.featured === true) - (a.featured === true));
    const currentIndex = sortedReviews.findIndex(review => 
      review._id === selectedReview._id || 
      review.reviewId === selectedReview.reviewId
    );
    
    if (currentIndex !== -1 && currentIndex < sortedReviews.length - 1) {
      setSelectedReview(sortedReviews[currentIndex + 1]);
    } else {
      // 마지막 리뷰인 경우 첫 번째 리뷰로 순환
      setSelectedReview(sortedReviews[0]);
    }
  };

  // 이전 리뷰로 이동
  const goToPrevReview = () => {
    if (reviews.length <= 1) return;
    
    const sortedReviews = [...reviews].sort((a, b) => (b.featured === true) - (a.featured === true));
    const currentIndex = sortedReviews.findIndex(review => 
      review._id === selectedReview._id || 
      review.reviewId === selectedReview.reviewId
    );
    
    if (currentIndex !== -1 && currentIndex > 0) {
      setSelectedReview(sortedReviews[currentIndex - 1]);
    } else {
      // 첫 번째 리뷰인 경우 마지막 리뷰로 순환
      setSelectedReview(sortedReviews[sortedReviews.length - 1]);
    }
  };

  // Scroll to section function
  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 리뷰 데이터 로드 및 세부 평점 계산 useEffect 추가
  useEffect(() => {
    if (reviews && reviews.length > 0) {
      // 리뷰 세부 평점 계산 로직
      let castTotal = 0;
      let storyTotal = 0;
      let musicTotal = 0;
      let rewatchTotal = 0;
      let validReviews = 0;
      
      reviews.forEach((review, idx) => {
        if (review && review.rating) {
          validReviews++;
          // 만약 리뷰에 세부 평점이 있다면 사용, 없다면 리뷰의 전체 평점을 기준으로 고정 차등 적용
          // idx 기반 고정 시드로 PC/모바일 동일 값 보장
          const seed1 = ((idx * 13 + 7) % 20) / 100 + 0.9;  // 0.9 ~ 1.1
          const seed2 = ((idx * 17 + 3) % 20) / 100 + 0.9;
          const seed3 = ((idx * 23 + 11) % 20) / 100 + 0.9;
          const seed4 = ((idx * 29 + 5) % 40) / 100 + 0.7;  // 0.7 ~ 1.1
          castTotal += review.castRating || (review.rating * seed1);
          storyTotal += review.storyRating || (review.rating * seed2);
          musicTotal += review.musicRating || (review.rating * seed3);
          rewatchTotal += review.rewatchValue || (review.rating * seed4);
        }
      });
      
      if (validReviews > 0) {
        setCastRating((castTotal / validReviews).toFixed(1));
        setStoryRating((storyTotal / validReviews).toFixed(1));
        setMusicRating((musicTotal / validReviews).toFixed(1));
        setRewatchRating((rewatchTotal / validReviews).toFixed(1));
      }
    }
  }, [reviews]);

  // PC sidebar sticky positioning
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

  // Navigate helper for sidebar components
  const navigateToPage = useCallback((path) => {
    router.push(path);
  }, [router]);

  // 스타일시트에 스크롤바를 숨기는 클래스 추가
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .hide-scrollbar:after,
      .hide-scrollbar:before,
      .tab-container:after,
      .tab-container:before,
      .tab-scroll:after,
      .tab-scroll:before {
        content: none !important;
        display: none !important;
        background: none !important;
        background-image: none !important;
        opacity: 0 !important;
        box-shadow: none !important;
        pointer-events: none !important;
      }
      @media (max-width: 768px) {
        .hide-scrollbar:after,
        .hide-scrollbar:before,
        .tab-container:after,
        .tab-container:before {
          display: none !important;
          opacity: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 오류가 있거나 로딩 중인 경우 표시할 UI
  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl p-6 text-center border border-red-200">
            <p className="text-red-500 mb-4">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <p className="text-gray-700 mb-4">{error.toString()}</p>
            <button
              onClick={() => router.push('/drama')}
              className="inline-flex items-center justify-center rounded-md bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              드라마 목록으로 돌아가기
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (loading || !currentDrama) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">드라마 정보를 불러오는 중...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Seo
        title={currentDrama.title || "TV/Film Details"}
        description={currentDrama.summary || ""}
        image={currentDrama.coverImage || ""}
      />
      
      <div className="min-h-screen bg-white text-gray-800">
        {/* ============ PC HERO (>= lg) ============ */}
        <div className="hidden lg:block relative w-full" style={{ height: '713px' }}>
          {/* Background layers */}
          <div className="absolute inset-0 bg-[#101828]" />
          <div className="absolute inset-0 overflow-hidden">
            {currentDrama.bannerImage || currentDrama.coverImage ? (
              <img
                src={ensureLocalImage(currentDrama.bannerImage || currentDrama.coverImage)}
                alt=""
                className="w-full h-full object-cover"
                style={{ filter: 'blur(12px)', transform: 'scale(1.1)' }}
                onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.jpg'; }}
              />
            ) : null}
          </div>
          {/* Gradient overlays */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 39%, rgba(0,0,0,0) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 14%)' }} />

          {/* Right: Trailer thumbnail with play button (Figma: x=904, y=95) */}
          <div
            className="absolute z-10 group cursor-pointer"
            style={{ top: '95px', right: '60px', width: '956px', height: '524px' }}
            onClick={() => {
              if (currentDrama.videos && currentDrama.videos.length > 0) {
                const videoId = getYoutubeIdFromUrl(currentDrama.videos[0].url);
                if (videoId) {
                  setSelectedVideoId(videoId);
                  setTrailerTitle(currentDrama.videos[0].title || 'Official Trailer');
                  setShowTrailer(true);
                }
              } else if (youtubeId) {
                setSelectedVideoId(youtubeId);
                setTrailerTitle('Official Trailer');
                setShowTrailer(true);
              }
            }}
          >
            {/* YouTube trailer thumbnail (fallback to cover image) */}
            <img
              src={
                youtubeId
                  ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
                  : ensureLocalImage(currentDrama.coverImage || currentDrama.bannerImage)
              }
              alt={currentDrama.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = ensureLocalImage(currentDrama.coverImage || currentDrama.bannerImage) || '/images/placeholder-tvfilm.jpg';
              }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,11,18,1) 0%, rgba(8,11,18,0) 60%)' }} />

            {/* Play button overlay (Figma: 130px circle, centered on poster) */}
            {(currentDrama.videos?.length > 0 || youtubeId) && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ paddingLeft: '15%' }}>
                <div
                  className="flex items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                  style={{
                    width: '130px',
                    height: '130px',
                    backgroundColor: 'rgba(196, 196, 196, 0.6)',
                    border: '3px solid #C2C2C2',
                  }}
                >
                  {/* Play triangle icon */}
                  <svg width="58" height="58" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 12L48 29L20 46V12Z" fill="white" stroke="white" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            )}

            {/* Duration badge (bottom-right of poster) */}
            {currentDrama.videos?.length > 0 && currentDrama.videos[0]?.duration && (
              <div className="absolute" style={{ right: '20px', bottom: '20px' }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    minWidth: '75px',
                    padding: '6px 0',
                    backgroundColor: 'rgba(0, 0, 0, 0.48)',
                    borderRadius: '30px',
                  }}
                >
                  <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '16px', lineHeight: '1.25', color: '#FFFFFF', letterSpacing: '0.125em' }}>
                    {currentDrama.videos[0].duration}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Left: Content area */}
          <div className="absolute left-0 top-[119px] pl-[100px] z-20" style={{ width: '864px', height: '500px' }}>
            <div style={{ width: '576px' }}>
              {/* Title */}
              <h1 className="text-white font-bold leading-[1.25]" style={{ fontFamily: 'Pretendard JP, Pretendard, sans-serif', fontSize: '48px' }}>
                {currentDrama.title}
              </h1>

              {/* Original title */}
              {currentDrama.originalTitle && currentDrama.originalTitle !== currentDrama.title && (
                <p className="mt-1" style={{ fontFamily: 'Inter', fontSize: '24px', color: '#D1D5DC' }}>
                  {currentDrama.originalTitle}
                </p>
              )}

              {/* Meta info row */}
              <div className="flex items-center gap-3 mt-6 flex-wrap" style={{ fontFamily: 'Inter', fontSize: '16px', color: '#D1D5DC', letterSpacing: '-0.02em' }}>
                <span className="font-bold" style={{ fontFamily: 'Arial', fontSize: '19.5px', color: '#FDC700' }}>
                  ★{currentDrama.reviewRating && currentDrama.reviewRating > 0 ? parseFloat(currentDrama.reviewRating).toFixed(1) : '-'}
                </span>
                {(() => {
                  // releaseDate가 "Nov 7, 2025 - Dec 20, 2025" 형식이므로 첫 번째 날짜만 파싱
                  const dateStr = currentDrama.releaseDate;
                  if (!dateStr) return null;
                  const firstDate = dateStr.split(' - ')[0]?.trim();
                  const parsed = new Date(firstDate);
                  const year = !isNaN(parsed.getTime()) ? parsed.getFullYear() : dateStr.match(/\d{4}/)?.[0];
                  return year ? <><span>•</span><span>{year}</span></> : null;
                })()}
                {currentDrama.episodes && (<><span>•</span><span>{currentDrama.episodes} Episodes</span></>)}
                {currentDrama.runtime && (<><span>•</span><span>{currentDrama.runtime}</span></>)}
                {currentDrama.ageRating && (<><span>•</span><span>{currentDrama.ageRating.includes('+') ? currentDrama.ageRating.split('+')[0] + '+' : currentDrama.ageRating}</span></>)}
              </div>

              {/* Description */}
              <p className="mt-6 line-clamp-3" style={{ fontFamily: 'Inter', fontSize: '18px', lineHeight: '1.625', color: '#E5E7EB', letterSpacing: '-0.024em' }}>
                {currentDrama.description || currentDrama.summary || ''}
              </p>

              {/* Buttons */}
              <div className="flex items-center gap-5 mt-10">
                {/* Watch Trailer + Platform group */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (currentDrama.videos && currentDrama.videos.length > 0) {
                        const videoId = getYoutubeIdFromUrl(currentDrama.videos[0].url);
                        if (videoId) {
                          setSelectedVideoId(videoId);
                          setTrailerTitle(currentDrama.videos[0].title || 'Official Trailer');
                          setShowTrailer(true);
                        }
                      } else if (youtubeId) {
                        setSelectedVideoId(youtubeId);
                        setTrailerTitle('Official Trailer');
                        setShowTrailer(true);
                      }
                    }}
                    className={`flex items-center gap-[6px] px-3 py-[11px] rounded font-bold ${
                      (currentDrama.videos?.length > 0 || youtubeId)
                        ? 'bg-white text-black cursor-pointer hover:bg-gray-100'
                        : 'bg-white/30 text-white/60 cursor-not-allowed'
                    }`}
                    style={{ fontFamily: 'Inter', fontSize: '16px' }}
                    disabled={!(currentDrama.videos?.length > 0 || youtubeId)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M6 3L20 12L6 21V3Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Watch Trailer
                  </button>

                  {currentDrama.whereToWatch && currentDrama.whereToWatch.length > 0 && (() => {
                    const platformName = currentDrama.whereToWatch[0]?.name || '';
                    const nameL = platformName.toLowerCase();
                    // Platform logo config: { src, style }
                    const logoMap = {
                      netflix:      { src: '/images/netflix-icon-crop-564dcf.png', style: { width: '17px', height: '24px', backgroundSize: '340%', backgroundPosition: 'center' } },
                      tving:        { src: '/images/platforms/tving.png',          style: { width: '24px', height: '24px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      wavve:        { src: '/images/platforms/wavve.png',          style: { width: '24px', height: '24px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      watcha:       { src: '/images/platforms/watcha.png',         style: { width: '24px', height: '24px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      disney:       { src: '/images/platforms/disneyplus.png',     style: { width: '24px', height: '24px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      coupang:      { src: '/images/platforms/coupangplay.png',    style: { width: '24px', height: '24px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      viki:         { src: '/images/platforms/viki.png',           style: { width: '24px', height: '24px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      hulu:         { src: '/images/platforms/hulu.svg',           style: { width: '24px', height: '16px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      apple:        { src: '/images/platforms/appletv.svg',        style: { width: '24px', height: '24px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      prime:        { src: '/images/platforms/primevideo.svg',     style: { width: '24px', height: '24px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      amazon:       { src: '/images/platforms/primevideo.svg',     style: { width: '24px', height: '24px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                    };
                    const key = Object.keys(logoMap).find(k => nameL.includes(k));
                    const logo = logoMap[key];
                    return (
                      <button
                        className="flex items-center justify-center gap-2 rounded text-white font-bold border border-[#737373] hover:border-white/60 transition-colors"
                        style={{ width: '159px', height: '46px', backgroundColor: '#101010', fontFamily: 'Inter', fontSize: '16px' }}
                        onClick={() => {
                          const el = document.getElementById('watch');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        {logo ? (
                          <div style={{
                            flexShrink: 0,
                            backgroundImage: `url(${logo.src})`,
                            backgroundRepeat: 'no-repeat',
                            ...logo.style,
                          }} />
                        ) : (
                          <Tv className="w-5 h-5" />
                        )}
                        {platformName} series
                      </button>
                    );
                  })()}
                </div>

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center rounded-full border-2 border-[#99A1AF] hover:border-white/80 transition-colors"
                  style={{ width: '48px', height: '48px' }}
                >
                  <svg width="24" height="24" viewBox="12 12 24 24" fill="none">
                    <path d="M32.25 13.5C31.0074 13.5 30 14.5074 30 15.75C30 16.9926 31.0074 18 32.25 18C33.4926 18 34.5 16.9926 34.5 15.75C34.5 14.5074 33.4926 13.5 32.25 13.5ZM28.5 15.75C28.5 13.6789 30.1789 12 32.25 12C34.3211 12 36 13.6789 36 15.75C36 17.8211 34.3211 19.5 32.25 19.5C31.1116 19.5 30.0917 18.9927 29.4039 18.1919L19.3275 22.8723C19.4396 23.2282 19.5 23.6071 19.5 24C19.5 24.3929 19.4396 24.7718 19.3275 25.1277L29.4039 29.8081C30.0917 29.0073 31.1116 28.5 32.25 28.5C34.3211 28.5 36 30.1789 36 32.25C36 34.3211 34.3211 36 32.25 36C30.1789 36 28.5 34.3211 28.5 32.25C28.5 31.8571 28.5604 31.4782 28.6725 31.1223L18.5961 26.4419C17.9083 27.2427 16.8884 27.75 15.75 27.75C13.6789 27.75 12 26.0711 12 24C12 21.9289 13.6789 20.25 15.75 20.25C16.8884 20.25 17.9083 20.7573 18.5961 21.5581L28.6725 16.8777C28.5604 16.5218 28.5 16.1429 28.5 15.75ZM15.75 21.75C14.5074 21.75 13.5 22.7574 13.5 24C13.5 25.2426 14.5074 26.25 15.75 26.25C16.9926 26.25 18 25.2426 18 24C18 22.7574 16.9926 21.75 15.75 21.75ZM32.25 30C31.0074 30 30 31.0074 30 32.25C30 33.4926 31.0074 34.5 32.25 34.5C33.4926 34.5 34.5 33.4926 34.5 32.25C34.5 31.0074 33.4926 30 32.25 30Z" fill="white"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============ PC 2-COLUMN LAYOUT (>= lg) ============ */}
        <div className="hidden lg:block bg-[#F8F9FA] pb-16">
          <div className="max-w-[1772px] mx-auto px-10 pt-8">
            <div className="flex flex-row gap-[60px]">
              {/* Left: Main Content (1212px) */}
              <div className="flex-1 min-w-0 max-w-content">

                {/* Synopsis */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl px-6 py-8 mb-6">
                  <div className="flex items-center justify-between mb-7">
                    <h2 className="font-black text-[26px]" style={{ fontFamily: 'Pretendard' }}>
                      <span style={{ color: '#000000' }}>Synopsis</span>
                    </h2>
                  </div>
                  <div className="px-4">
                    {(() => {
                      const text = currentDrama.description || currentDrama.summary || 'No synopsis available.';
                      let paras;
                      if (text.includes('\n\n')) {
                        paras = text.split('\n\n').filter(Boolean);
                      } else if (text.includes('\n')) {
                        paras = text.split('\n').filter(Boolean);
                      } else {
                        // 자동 단락: 문장 3개씩 묶기
                        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
                        paras = [];
                        for (let i = 0; i < sentences.length; i += 3) {
                          paras.push(sentences.slice(i, i + 3).join(' ').trim());
                        }
                      }
                      return paras.map((para, i) => (
                        <p key={i} style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '16px', lineHeight: '1.75em', color: '#000000', marginBottom: i < paras.length - 1 ? '1.25em' : 0 }}>
                          {para}
                        </p>
                      ));
                    })()}
                  </div>
                </div>

                {/* Episodes (Figma: 431:13224) - 임시 주석처리 */}
                {/* {currentDrama.episodes && (
                  <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl mb-6" style={{ padding: '30px 24px' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '30px' }}>
                      <h2 className="font-black text-[26px] text-black" style={{ fontFamily: 'Pretendard' }}>
                        Episodes
                      </h2>
                      <span className="font-bold text-[14px] text-[#2B7FFF]" style={{ fontFamily: 'Inter', letterSpacing: '-0.01em' }}>
                        {currentDrama.episodes} Episodes
                      </span>
                    </div>
                    <div className="flex flex-col gap-6">
                      {Array.from({ length: Math.min(3, currentDrama.episodes || 0) }, (_, i) => {
                        const episode = currentDrama.episodeList?.[i];
                        return (
                          <div key={i} className="flex items-center gap-4 rounded-lg" style={{ padding: '0 24px' }}>
                            <div className="flex-shrink-0 flex justify-center" style={{ width: '48px' }}>
                              <span className="font-bold text-black" style={{ fontFamily: 'Inter', fontSize: '36px', lineHeight: '1.1' }}>
                                {i + 1}
                              </span>
                            </div>
                            <div className="flex-shrink-0 rounded overflow-hidden bg-[#262626]" style={{ width: '144px', height: '80px' }}>
                              {currentDrama.videos && currentDrama.videos[i] ? (
                                <img
                                  src={`https://img.youtube.com/vi/${getYoutubeIdFromUrl(currentDrama.videos[i]?.url)}/mqdefault.jpg`}
                                  alt={`Episode ${i + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.jpg'; }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="w-8 h-8 text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 flex justify-between" style={{ height: '80px' }}>
                              <div className="flex flex-col gap-2" style={{ flex: 1 }}>
                                <h4 className="font-semibold text-[16px] text-black" style={{ fontFamily: 'Inter', lineHeight: '1.5' }}>
                                  Episode {i + 1}{episode?.title ? `. ${episode.title}` : '.'}
                                </h4>
                                <p className="text-[14px] line-clamp-2" style={{ fontFamily: 'Inter', lineHeight: '1.625', color: '#545454' }}>
                                  {episode?.summary || currentDrama.summary?.substring(0, 120) || ''}
                                </p>
                              </div>
                              <div className="flex-shrink-0 flex items-start" style={{ width: '40px' }}>
                                <span className="text-[14px]" style={{ fontFamily: 'Inter', color: '#6A7282' }}>
                                  {currentDrama.runtime?.replace(/\s/g, '').replace('hr.', 'h ').replace('min.', 'm').replace('min', 'm') || ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {currentDrama.episodes > 3 && (
                      <button className="w-full rounded-full border border-[#D5D8DF] text-[#2D3138] font-semibold text-[14px] text-center hover:bg-gray-50 transition-colors" style={{ height: '46px', marginTop: '30px', fontFamily: 'Inter' }}>
                        See More
                      </button>
                    )}
                  </div>
                )} */}

                {/* Reviews (Figma: 431:13272) */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl mb-6 flex flex-col" style={{ padding: '30px 24px', gap: '30px' }}>
                  {/* Header */}
                  <h2 className="font-black text-[26px] text-black" style={{ fontFamily: 'Pretendard' }}>
                    Reviews
                  </h2>

                  {/* Rating area: score circle | divider | rating bars (Figma: padding 0 32px, gap 32px) */}
                  <div className="flex items-center" style={{ gap: '32px', padding: '0 32px', borderRadius: '12px' }}>
                    {/* Left: Score circle (80x80) + stars + review count = 194px */}
                    <div className="flex items-center flex-shrink-0" style={{ width: '194px', height: '80px', gap: '16px' }}>
                      <div
                        className="flex items-center justify-center rounded-full flex-shrink-0"
                        style={{
                          width: '80px',
                          height: '80px',
                          background: '#FFFFFF',
                          border: '6px solid transparent',
                          backgroundImage: `conic-gradient(#F0B100 0deg, #F0B100 ${(parseFloat(currentDrama.reviewRating || 0) / 10) * 360}deg, #E5E7EB ${(parseFloat(currentDrama.reviewRating || 0) / 10) * 360}deg, #E5E7EB 360deg)`,
                          backgroundOrigin: 'border-box',
                          backgroundClip: 'border-box',
                        }}
                      >
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className="font-bold text-black" style={{ fontFamily: 'Inter', fontSize: '30px', lineHeight: '1.2' }}>
                            {currentDrama.reviewRating ? parseFloat(currentDrama.reviewRating).toFixed(1) : '0.0'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col" style={{ gap: '4px' }}>
                        <div className="flex" style={{ gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <svg key={star} width="18" height="18" viewBox="0 0 18 18" fill="none">
                              <path d="M9 1.5L11.3 6.2L16.5 6.9L12.7 10.6L13.6 15.8L9 13.3L4.4 15.8L5.3 10.6L1.5 6.9L6.7 6.2L9 1.5Z"
                                fill={star <= Math.round(parseFloat(currentDrama.reviewRating || 0) / 2) ? '#F0B100' : 'none'}
                                stroke="#F0B100" strokeWidth="1.5" />
                            </svg>
                          ))}
                        </div>
                        <span style={{ fontFamily: 'Inter', fontSize: '12px', color: '#99A1AF' }}>
                          {currentDrama.reviewCount || 0} reviews
                        </span>
                      </div>
                    </div>

                    {/* Vertical divider (1px x 64px) */}
                    <div className="flex-shrink-0" style={{ width: '1px', height: '64px', backgroundColor: 'rgba(64, 64, 64, 0.4)' }} />

                    {/* Right: Rating bars 2x2 grid (Figma: gap 20px between rows group, 64px between columns) */}
                    <div style={{ flex: '1 1 auto' }}>
                      <div className="flex" style={{ gap: '64px' }}>
                        {/* Column 1 */}
                        <div className="flex flex-col" style={{ gap: '16px' }}>
                          {[
                            { label: 'Acting/Cast', val: castRating, labelW: '90px' },
                            { label: 'Story', val: storyRating, labelW: '90px' },
                          ].map(({ label, val, labelW }) => (
                            <div key={label} className="flex items-center" style={{ gap: '12px' }}>
                              <span style={{ fontFamily: 'Inter', fontSize: '14px', color: '#4A5565', width: labelW, flexShrink: 0 }}>{label}</span>
                              <div className="rounded-full overflow-hidden" style={{ width: '140px', height: '8px', backgroundColor: '#E5E7EB', flexShrink: 0 }}>
                                <div className="h-full rounded-full" style={{ width: `${(val || 0) * 10}%`, backgroundColor: '#2B7FFF' }} />
                              </div>
                              <span className="text-right" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '14px', color: '#101828', width: '24px', flexShrink: 0 }}>{val || '-'}</span>
                            </div>
                          ))}
                        </div>
                        {/* Column 2 */}
                        <div className="flex flex-col" style={{ gap: '16px' }}>
                          {[
                            { label: 'Music', val: musicRating, labelW: '105px' },
                            { label: 'Rewatch Value', val: rewatchRating, labelW: '105px' },
                          ].map(({ label, val, labelW }) => (
                            <div key={label} className="flex items-center" style={{ gap: '12px' }}>
                              <span style={{ fontFamily: 'Inter', fontSize: '14px', color: '#4A5565', width: labelW, flexShrink: 0 }}>{label}</span>
                              <div className="rounded-full overflow-hidden" style={{ width: '140px', height: '8px', backgroundColor: '#E5E7EB', flexShrink: 0 }}>
                                <div className="h-full rounded-full" style={{ width: `${(val || 0) * 10}%`, backgroundColor: '#2B7FFF' }} />
                              </div>
                              <span className="text-right" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '14px', color: '#101828', width: '24px', flexShrink: 0 }}>{val || '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments section (Figma: Frame 207, gap 16px) */}
                  <div className="flex flex-col" style={{ gap: '16px' }}>
                    {/* Comments header: top border, padding 0 16px */}
                    <div className="flex items-center justify-between" style={{ padding: '0 16px', borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
                      <div className="flex items-center" style={{ gap: '24px' }}>
                        <span className="flex items-center" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', color: '#1E2939', gap: '6px' }}>
                          Comments
                          <span className="text-[#2B7FFF]">{reviews.length || 0}</span>
                        </span>
                        <div className="flex items-center" style={{ gap: '8px' }}>
                          {['recent', 'popular', 'rated'].map((mode, i) => (
                            <React.Fragment key={mode}>
                              {i > 0 && <span style={{ width: '0px', height: '10px', border: '0.6px solid #99A1AF' }} />}
                              <span
                                className="cursor-pointer transition-colors"
                                style={{ fontFamily: 'Inter', fontWeight: reviewSortMode === mode ? 700 : 400, fontSize: '14px', color: reviewSortMode === mode ? '#1E2939' : '#99A1AF' }}
                                onClick={() => { setReviewSortMode(mode); setVisibleReviewCount(3); }}
                              >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Comment cards (Figma: each card has white bg, ~25px radius, padding 4px 24px, gap 12px between avatar & text) */}
                    {reviews.length > 0 ? sortReviews(reviews, reviewSortMode).slice(0, visibleReviewCount).map((review, index) => (
                      <div key={review._id || index} className="cursor-pointer" style={{ borderRadius: '25px', backgroundColor: '#FFFFFF', padding: '4px 24px' }} onClick={() => openReviewModal(review)}>
                        <div className="flex items-center" style={{ gap: '12px' }}>
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                            style={{ backgroundColor: ['#4F46E5', '#0891B2', '#D97706', '#DC2626', '#059669'][index % 5] }}>
                            {(review.username || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '3px' }}>
                            {/* Username + badge + stars */}
                            <div className="flex items-center" style={{ gap: '10px' }}>
                              <span className="font-bold text-[15px]" style={{ color: '#1E2939' }}>{review.username || 'Anonymous'}</span>
                              {review.featured && (
                                <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: '#2B7FFF' }}>VIP</span>
                              )}
                              <div className="flex" style={{ gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                  <svg key={star} width="14" height="14" viewBox="0 0 18 18" fill="none">
                                    <path d="M9 1.5L11.3 6.2L16.5 6.9L12.7 10.6L13.6 15.8L9 13.3L4.4 15.8L5.3 10.6L1.5 6.9L6.7 6.2L9 1.5Z"
                                      fill={star <= Math.round(parseFloat(review.rating || 0) / 2) ? '#F0B100' : 'none'}
                                      stroke="#F0B100" strokeWidth="1.5" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                            {/* Comment text */}
                            <p className="line-clamp-2" style={{ fontFamily: 'Inter', fontSize: '14px', color: '#545454', lineHeight: '1.625' }}>
                              {review.reviewText?.replace(/^This review may contain spoilers\s+/i, '') || review.title || ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center py-4 text-[14px]" style={{ color: '#99A1AF' }}>No reviews yet. Be the first to review!</p>
                    )}

                    {/* See More / Fold button */}
                    {reviews.length > 3 && (
                      <button
                        onClick={() => setVisibleReviewCount(prev => prev >= reviews.length ? 3 : prev + 3)}
                        className="w-full rounded-full border border-[#D5D8DF] text-[#2D3138] font-semibold text-[14px] text-center hover:bg-gray-50 transition-colors"
                        style={{ height: '46px', fontFamily: 'Inter' }}
                      >
                        {visibleReviewCount >= reviews.length ? 'Fold' : 'See More'}
                      </button>
                    )}
                  </div>

                  {/* Write review input - 임시 비활성화
                  <div style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '16px 16px 1px', height: '165px' }}>
                    <div className="bg-white border border-[#D1D5DC] rounded-[10px]" style={{ height: '132px', padding: '13px 13px 1px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                      <div className="flex flex-col" style={{ gap: '2px' }}>
                        <div className="flex" style={{ gap: '6px' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <svg key={star} width="20" height="20" viewBox="0 0 18 18" fill="none" className="cursor-pointer">
                              <path d="M9 1.5L11.3 6.2L16.5 6.9L12.7 10.6L13.6 15.8L9 13.3L4.4 15.8L5.3 10.6L1.5 6.9L6.7 6.2L9 1.5Z"
                                fill="none" stroke="#D1D5DC" strokeWidth="1.5" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-sm text-gray-400">Write your comment here</p>
                      </div>
                      <div className="flex items-center justify-between" style={{ padding: '0 0 16px' }}>
                        <span className="text-xs text-gray-400">0/300</span>
                        <button className="px-4 py-1.5 rounded-md text-white text-sm font-semibold" style={{ backgroundColor: '#2B7FFF' }}>Post</button>
                      </div>
                    </div>
                  </div>
                  */}
                </div>

                {/* Videos: Trailer & Teasers */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl mb-6" style={{ padding: '30px 24px 36px' }}>
                  <div className="flex items-center justify-between mb-[30px]">
                    <h2 className="font-black text-[26px]" style={{ fontFamily: 'Pretendard', color: '#000000' }}>
                      Videos: Trailer & Teasers
                    </h2>
                  </div>
                  <div className="relative rounded-xl" style={{ maxWidth: '1148px', height: '434px' }}>
                    {currentDrama.videos && currentDrama.videos.length > 0 ? (
                      <div
                        ref={videosContainerRefPC}
                        className="overflow-x-auto hide-scrollbar h-full"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', display: 'flex', gap: '30px', paddingLeft: '16px', cursor: 'grab', userSelect: 'none' }}
                        onMouseDown={(e) => {
                          const d = videoDragState.current;
                          d.isDown = true; d.startX = e.pageX - videosContainerRefPC.current.offsetLeft; d.scrollLeft = videosContainerRefPC.current.scrollLeft; d.moved = false;
                          videosContainerRefPC.current.style.cursor = 'grabbing';
                        }}
                        onMouseLeave={() => { videoDragState.current.isDown = false; videosContainerRefPC.current.style.cursor = 'grab'; }}
                        onMouseUp={() => { videoDragState.current.isDown = false; videosContainerRefPC.current.style.cursor = 'grab'; }}
                        onMouseMove={(e) => {
                          const d = videoDragState.current;
                          if (!d.isDown) return;
                          e.preventDefault();
                          const x = e.pageX - videosContainerRefPC.current.offsetLeft;
                          const walk = (x - d.startX) * 1.5;
                          if (Math.abs(walk) > 5) d.moved = true;
                          videosContainerRefPC.current.scrollLeft = d.scrollLeft - walk;
                        }}
                      >
                        {currentDrama.videos.map((video, index) => {
                          const videoId = getYoutubeIdFromUrl(video.url);
                          return (
                            <div key={index} className="flex-shrink-0 rounded-xl overflow-hidden group cursor-pointer" style={{ width: '762px', height: '434px' }}
                              onClick={() => {
                                if (videoDragState.current.moved) return;
                                setSelectedVideoId(videoId); setTrailerTitle(video.title || 'Trailer'); setShowTrailer(true);
                              }}
                            >
                              <div className="relative w-full h-full bg-gray-100 pointer-events-none">
                                {videoId ? (
                                  <Image src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} alt={video.title} fill className="object-cover" unoptimized onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.jpg'; }} />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center"><Film className="w-12 h-12 text-gray-400" /></div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:bg-[#2B7FFF] transition-all">
                                    <Play className="w-7 h-7 text-white ml-0.5" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">No videos available</div>
                    )}
                  </div>
                </div>

                {/* Cast */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl mb-6" style={{ padding: '30px 24px' }}>
                  <div className="flex items-center justify-between mb-[30px]">
                    <h2 className="font-black text-[26px]" style={{ fontFamily: 'Pretendard', color: '#000000' }}>
                      Cast
                    </h2>
                  </div>
                  {cast && cast.length > 0 ? (
                    <div className="flex items-center" style={{ gap: '16px' }}>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <div
                          ref={castScrollRef}
                          className="overflow-x-auto hide-scrollbar cast-scroll-container"
                          style={{ scrollbarWidth: 'none', display: 'flex', gap: '24px', cursor: 'grab', userSelect: 'none' }}
                          onMouseDown={(e) => {
                            const d = castDragState.current;
                            d.isDown = true; d.startX = e.pageX - castScrollRef.current.offsetLeft; d.scrollLeft = castScrollRef.current.scrollLeft; d.moved = false;
                            castScrollRef.current.style.cursor = 'grabbing';
                          }}
                          onMouseLeave={() => { castDragState.current.isDown = false; if (castScrollRef.current) castScrollRef.current.style.cursor = 'grab'; }}
                          onMouseUp={() => { castDragState.current.isDown = false; if (castScrollRef.current) castScrollRef.current.style.cursor = 'grab'; }}
                          onMouseMove={(e) => {
                            const d = castDragState.current;
                            if (!d.isDown) return;
                            e.preventDefault();
                            const x = e.pageX - castScrollRef.current.offsetLeft;
                            const walk = (x - d.startX) * 1.5;
                            if (Math.abs(walk) > 5) d.moved = true;
                            castScrollRef.current.scrollLeft = d.scrollLeft - walk;
                          }}
                        >
                          {cast.map((actor, index) => (
                            <div key={index} className="flex-shrink-0 cursor-pointer group" style={{ width: '130px' }}
                              onClick={() => handleActorClick(actor.name, null)}
                            >
                              <div className="overflow-hidden pointer-events-none" style={{ width: '130px', height: '182px', borderRadius: '20px', backgroundColor: '#E5E7EB' }}>
                                {actor.image || actor.profileImage ? (
                                  <Image
                                    src={actor.image || actor.profileImage}
                                    alt={actor.name || 'Actor'}
                                    width={130}
                                    height={182}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    unoptimized
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.jpg'; }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-200 to-gray-300">
                                    <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center">
                                      <User className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div style={{ marginTop: '16px' }}>
                                <p className="line-clamp-1 transition-colors" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '22px', lineHeight: '1.45em', color: '#0A0A0A' }}>
                                  {actor.name || 'Unknown'}
                                </p>
                                <p className="line-clamp-1" style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '16px', lineHeight: '1.875em', letterSpacing: '0.015em', color: '#6A7282' }}>
                                  {actor.role || actor.character || ''}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* 스크롤 화살표 - Figma: 48x48 clickable, 12x24 chevron, #99A1AF, stroke 4px */}
                      <button
                        className="flex-shrink-0 flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
                        style={{ width: '48px', height: '48px' }}
                        onClick={() => {
                          if (castScrollRef.current) castScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                        }}
                      >
                        <svg width="12" height="24" viewBox="0 0 12 24" fill="none">
                          <path d="M2 2L10 12L2 22" stroke="#99A1AF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full text-center py-10">
                      <Users size={40} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No cast information available</p>
                    </div>
                  )}
                </div>

                {/* Related News */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl mb-6" style={{ padding: '30px 24px' }}>
                  <div className="flex items-center justify-between mb-[30px]">
                    <h2 className="font-black text-[26px]" style={{ fontFamily: 'Pretendard', color: '#101828' }}>
                      Related News
                    </h2>
                    {relatedNews && relatedNews.length > 6 && (
                      <button className="flex items-center gap-2.5 py-0.5" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px', color: '#2B7FFF', letterSpacing: '-0.01em' }}>
                        See more
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#2B7FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
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
                                <h4 className="line-clamp-2 transition-colors" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', lineHeight: '1.375em', letterSpacing: '-0.024em', color: '#101828' }}>
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
                                  <h4 className="line-clamp-2 transition-colors" style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', lineHeight: '1.375em', letterSpacing: '-0.024em', color: '#101828' }}>
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

                {/* More Drama News */}
                <div className="bg-white border-[1.5px] border-[#E5E7EB] rounded-xl mb-6 px-6 py-8">
                  <MoreNews category="drama" storageKey="drama-detail" />
                </div>
              </div>

              {/* Right: Sidebar (500px) */}
              <div className="w-[500px] flex-shrink-0">
                <div ref={sidebarStickyRef} className="sticky" style={{ top: sidebarStickyTop + 'px' }}>
                  <div className="space-y-8">
                    {/* Comment Ticker */}
                    <CommentTicker comments={commentsData} onNavigate={navigateToPage} />

                    {/* Trending NOW */}
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
                                  src={item.coverImage || item.thumbnailUrl || '/images/news/default-news.jpg'}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.src = '/images/news/default-news.jpg'; }}
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
                                <h4 className="font-bold text-[15px] leading-[1.375] text-[#121212] line-clamp-2 transition-colors">
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

        {/* ============ MOBILE/TABLET HERO (< lg) ============ */}
        <div className="relative flex-col h-auto w-full hidden sm:flex lg:hidden">
          {/* Background Image with Enhanced Overlay */}
          <div className="relative w-full h-[280px] sm:h-[350px] md:h-[450px] overflow-hidden">
              <div className="relative w-full h-full">
              {renderImage(currentDrama.bannerImage || currentDrama.coverImage, currentDrama.title, "object-cover object-top", 0, 0, true)}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
              </div>
              </div>
          
          {/* Content overlay with improved layout */}
          <div className="absolute inset-0 flex flex-col justify-end sm:justify-center p-6 md:p-12 z-10">
            <div className="container mx-auto max-w-screen-xl">
              <div className="sm:flex items-start gap-8">
                {/* Poster - With enhanced shadow and hover effect */}
                <div className="hidden sm:block relative w-[180px] h-[270px] sm:w-[200px] sm:h-[300px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 border-4 border-white/10 backdrop-blur-sm transform hover:scale-105 transition-all duration-300 group">
                  {renderImage(currentDrama.coverImage && currentDrama.coverImage.trim() !== '' ? currentDrama.coverImage : '/images/placeholder-tvfilm.jpg', currentDrama.title, "object-cover", 0, 0, true)}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                </div>
                
                {/* Mobile poster (smaller and floating at top left) */}
                <div className="sm:hidden relative float-left w-[120px] h-[180px] mr-4 mb-4 rounded-lg overflow-hidden shadow-xl flex-shrink-0 border-2 border-white/10">
                  {renderImage(currentDrama.coverImage && currentDrama.coverImage.trim() !== '' ? currentDrama.coverImage : '/images/placeholder-tvfilm.jpg', currentDrama.title, "object-cover", 0, 0, true)}
                </div>
                
                {/* Content - Text details with improved typography */}
                <div className="flex-1 sm:pt-2">
                  {/* Category tag */}
                  <div className="mb-3 sm:mb-4 flex space-x-2">
                    <span className="px-3 py-1 backdrop-blur-sm rounded-full text-xs font-medium inline-flex items-center" style={{ backgroundColor: 'rgba(35, 60, 250, 0.3)', color: '#93b4ff' }}>
                      <Film className="w-3 h-3 mr-1" />
                      {currentDrama.category || "Movie"}
                    </span>
                    {currentDrama.releaseDate && (
                      <span className="px-3 py-1 bg-white/10 text-white/80 backdrop-blur-sm rounded-full text-xs font-medium inline-flex items-center">
                        <Calendar className="w-3 h-3 mr-1" style={{ color: '#93b4ff' }} />
                        {formatDate(currentDrama.releaseDate) || "2023"}
                      </span>
                    )}
                  </div>
                  
                  {/* Title with enhanced typography */}
                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2 text-white leading-tight">
                    {currentDrama.title}
                  </h1>
                  
                  {/* Original title with improved styling */}
                  <div className="text-white/80 text-sm sm:text-lg mb-4 sm:mb-6">
                    {currentDrama.originalTitle && currentDrama.originalTitle !== currentDrama.title && 
                      <span className="font-medium">{currentDrama.originalTitle}</span>
                    }
                  </div>
                  
                  {/* Metrics row with modern design */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center bg-black/40 backdrop-blur-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm mr-2 shadow-lg" style={{ backgroundColor: '#1d1a27' }}>
                        {currentDrama.reviewRating && currentDrama.reviewRating > 0
                          ? parseFloat(currentDrama.reviewRating) === 10
                            ? "10"
                            : parseFloat(currentDrama.reviewRating).toFixed(1)
                          : "-"
                        }
                      </div>
                      <span className="text-white/90 text-xs sm:text-sm">Rating</span>
                    </div>
                    
                    {currentDrama.ageRating && (
                      <div className="flex items-center bg-black/40 backdrop-blur-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full">
                        <div className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full text-white font-bold text-xs sm:text-sm mr-2 shadow-lg" style={{ backgroundColor: '#2B7FFF' }}>
                          {typeof currentDrama.ageRating === 'string' && currentDrama.ageRating.includes('+')
                            ? currentDrama.ageRating.split('+')[0]
                            : currentDrama.ageRating === 'Not Rated' || currentDrama.ageRating === 'Not Yet Rated'
                              ? "NR"
                              : typeof currentDrama.ageRating === 'string' && currentDrama.ageRating.includes(' - ')
                                ? currentDrama.ageRating.split(' - ')[0]
                                : currentDrama.ageRating
                          }
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white/90 text-xs sm:text-sm">Age</span>
                          {typeof currentDrama.ageRating === 'string' && currentDrama.ageRating.includes('+') && (
                            <span className="text-white/70 text-[10px] sm:text-xs">
                              {currentDrama.ageRating.includes('Teen') ? 'Teen' :
                               currentDrama.ageRating.includes('older') ? 'and older' : ''}
                            </span>
                          )}
                          {(currentDrama.ageRating === 'Not Rated' || currentDrama.ageRating === 'Not Yet Rated') && (
                            <span className="text-white/70 text-[10px] sm:text-xs">Not Rated</span>
                          )}
                        </div>
                      </div>
                    )}

                    {currentDrama.runtime && (
                      <div className="flex items-center bg-black/40 backdrop-blur-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" style={{ color: '#93b4ff' }} />
                        <span className="text-white/90 text-xs sm:text-sm">{currentDrama.runtime}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons with enhanced design */}
                  <div className="flex mt-4 sm:mt-6">
                    <button
                      onClick={() => setShowTrailer(true)}
                      className="text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transition-all group transform hover:translate-y-[-2px]"
                      style={{ backgroundColor: '#2B7FFF' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6de0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2B7FFF'}
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 group-hover:animate-pulse" />
                      Watch Trailer
                    </button>
                    {currentDrama.genres && currentDrama.genres.length > 0 && (
                      <div className="ml-3 sm:ml-4 flex items-center">
                        <div className="hidden sm:flex flex-wrap gap-1 ml-1">
                          {currentDrama.genres.slice(0, 2).map((genre, index) => (
                            <span key={index} className="px-2.5 py-1 bg-white/10 text-white/80 backdrop-blur-sm rounded-full text-xs font-medium">
                              {genre}
                            </span>
                          ))}
                          {currentDrama.genres.length > 2 && (
                            <span className="px-2 py-1 text-white/70 text-xs">+{currentDrama.genres.length - 2}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* ============ MOBILE POSTER HERO (Figma) ============ */}
        <div className="sm:hidden relative w-full" style={{ backgroundColor: '#111111' }}>
          {/* Background poster image - 625px tall, absolute */}
          <div className="absolute top-0 left-0 right-0" style={{ height: '625px' }}>
            {currentDrama.coverImage ? (
              <img
                src={currentDrama.coverImage}
                alt={currentDrama.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = "/images/placeholder-tvfilm.jpg"; }}
              />
            ) : (
              <div className="w-full h-full bg-gray-800" />
            )}
            {/* Top gradient overlay - darkens top for header */}
            <div className="absolute top-0 left-0 right-0" style={{
              height: '173px',
              background: 'linear-gradient(0deg, rgba(17,17,17,0) 0%, rgba(17,17,17,0.6) 47%, rgba(17,17,17,1) 100%)'
            }} />
          </div>

          {/* Content overlay - starts at y:259, extends below image */}
          <div className="relative flex flex-col" style={{
            paddingTop: '259px',
          }}>
            <div className="flex flex-col" style={{
              background: 'linear-gradient(180deg, rgba(17,17,17,0) 0%, rgba(17,17,17,1) 37%)',
              padding: '100px 16px 40px',
              gap: '24px',
            }}>
              {/* Title + Rating + Genre + Description */}
              <div className="flex flex-col" style={{ gap: '22px' }}>
                <div className="flex flex-col" style={{ gap: '11px' }}>
                  {/* Title + Rating row */}
                  <div className="flex flex-col" style={{ gap: '5px' }}>
                    <h1 style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 700,
                      fontSize: '22px',
                      lineHeight: '1.5em',
                      letterSpacing: '-0.042em',
                      textTransform: 'capitalize',
                      color: '#FFFFFF',
                      margin: 0,
                    }}>
                      {currentDrama.title}
                    </h1>
                    <div className="flex items-center" style={{ gap: '7px' }}>
                      <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '13px', lineHeight: '1.43em', color: '#FDC700' }}>
                        ★ {currentDrama.reviewRating && parseFloat(currentDrama.reviewRating) > 0 ? parseFloat(currentDrama.reviewRating).toFixed(1) : '-'}
                      </span>
                      <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400, fontSize: '13px', color: '#D1D5DC' }}>•</span>
                      <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.54em', color: '#AFB7C6' }}>
                        {currentDrama.genres && currentDrama.genres.length > 0 ? currentDrama.genres.join(' · ') : currentDrama.category || 'Drama'}
                      </span>
                    </div>
                  </div>
                  {/* Description */}
                  {currentDrama.description && (
                    <p className="line-clamp-2" style={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontWeight: 400,
                      fontSize: '12px',
                      lineHeight: '1.54em',
                      color: '#AFB7C6',
                      margin: 0,
                    }}>
                      {currentDrama.description}
                    </p>
                  )}
                </div>

                {/* Buttons: Watch Trailer + Platform + More */}
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (currentDrama.videos && currentDrama.videos.length > 0) {
                        const firstVideo = currentDrama.videos[0];
                        const videoId = getYoutubeIdFromUrl(firstVideo.url);
                        if (videoId) {
                          setSelectedVideoId(videoId);
                          setTrailerTitle(firstVideo.title || "Official Trailer");
                          setShowTrailer(true);
                        }
                      }
                    }}
                    className="flex items-center justify-center cursor-pointer"
                    style={{
                      width: '140px',
                      padding: '10px 14px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '4px',
                      border: 'none',
                      gap: '2px',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 3L20 12L6 21V3Z" fill="#111111" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', letterSpacing: '0.008em', color: '#111111' }}>Watch Trailer</span>
                  </button>
                  {currentDrama.whereToWatch && currentDrama.whereToWatch.length > 0 && (() => {
                    const platformName = currentDrama.whereToWatch[0]?.name || '';
                    const nameL = platformName.toLowerCase();
                    const logoMap = {
                      netflix:  { src: '/images/netflix-icon-crop-564dcf.png', style: { width: '17px', height: '24px', backgroundSize: '340%', backgroundPosition: 'center' } },
                      tving:    { src: '/images/platforms/tving.png',          style: { width: '18px', height: '18px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      wavve:    { src: '/images/platforms/wavve.png',          style: { width: '18px', height: '18px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      watcha:   { src: '/images/platforms/watcha.png',         style: { width: '18px', height: '18px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      disney:   { src: '/images/platforms/disneyplus.png',     style: { width: '18px', height: '18px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      coupang:  { src: '/images/platforms/coupangplay.png',    style: { width: '18px', height: '18px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      viki:     { src: '/images/platforms/viki.png',           style: { width: '18px', height: '18px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      hulu:     { src: '/images/platforms/hulu.svg',           style: { width: '18px', height: '14px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      apple:    { src: '/images/platforms/appletv.svg',        style: { width: '18px', height: '18px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      prime:    { src: '/images/platforms/primevideo.svg',     style: { width: '18px', height: '18px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                      amazon:   { src: '/images/platforms/primevideo.svg',     style: { width: '18px', height: '18px', backgroundSize: 'contain', backgroundPosition: 'center' } },
                    };
                    const key = Object.keys(logoMap).find(k => nameL.includes(k));
                    const logo = logoMap[key];
                    return (
                      <button
                        className="flex items-center justify-center cursor-pointer"
                        style={{
                          width: '140px',
                          padding: '10px 14px',
                          backgroundColor: '#101010',
                          border: '1px solid #737373',
                          borderRadius: '4px',
                          gap: '2px',
                        }}
                        onClick={() => {
                          const link = currentDrama.whereToWatch[0]?.link;
                          if (link) {
                            window.open(link, '_blank');
                          } else {
                            const el = document.getElementById('watch');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        {logo && (
                          <div style={{
                            flexShrink: 0,
                            backgroundImage: `url(${logo.src})`,
                            backgroundRepeat: 'no-repeat',
                            ...logo.style,
                          }} />
                        )}
                        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', letterSpacing: '0.008em', color: '#FFFFFF' }}>
                          {platformName}
                        </span>
                      </button>
                    );
                  })()}
                  {/* Share button (⋮) */}
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center cursor-pointer"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '18px',
                      backgroundColor: 'transparent',
                      border: 'none',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="4" r="1.5" fill="#FFFFFF"/>
                      <circle cx="10" cy="10" r="1.5" fill="#FFFFFF"/>
                      <circle cx="10" cy="16" r="1.5" fill="#FFFFFF"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Trailer Video Thumbnail */}
              {currentDrama.videos && currentDrama.videos.length > 0 && (() => {
                const firstVideo = currentDrama.videos[0];
                const videoId = getYoutubeIdFromUrl(firstVideo.url);
                return videoId ? (
                  <div
                    className="relative w-full overflow-hidden cursor-pointer"
                    style={{ borderRadius: '12px', height: '218px' }}
                    onClick={() => {
                      setSelectedVideoId(videoId);
                      setTrailerTitle(firstVideo.title || "Official Trailer");
                      setShowTrailer(true);
                    }}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                      alt={firstVideo.title || "Trailer"}
                      className="w-full h-full object-cover"
                      style={{ background: 'linear-gradient(90deg, rgba(8,11,18,1) 0%, rgba(8,11,18,0) 60%)' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }}
                    />
                    {/* Dark left gradient */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,11,18,1) 0%, rgba(8,11,18,0) 60%)' }} />
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center justify-center" style={{
                        width: '54px', height: '54px', borderRadius: '50%',
                        backgroundColor: 'rgba(196, 196, 196, 0.6)',
                        border: '1.25px solid #C2C2C2',
                      }}>
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </div>
                    </div>
                    {/* Time badge */}
                    <div className="absolute" style={{
                      bottom: '12px', right: '12px',
                      backgroundColor: 'rgba(38, 38, 42, 0.6)',
                      backdropFilter: 'blur(1.5px)',
                      borderRadius: '60px',
                      padding: '4px 12px',
                    }}>
                      <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 500, fontSize: '12px', lineHeight: '1.4em', color: '#FFFFFF' }}>
                        {firstVideo.duration || ''}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Synopsis Section - Mobile */}
        <div className="sm:hidden" style={{ backgroundColor: '#FFFFFF', padding: '36px 16px 20px' }}>
          <h2 style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '20px',
            lineHeight: '1.4em',
            letterSpacing: '-0.022em',
            color: '#000000',
            marginBottom: '16px',
          }}>Synopsis</h2>
          <div className="relative">
            <div style={{
              height: synopsisExpanded ? 'auto' : '260px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: '1.75em',
                color: '#333333',
                margin: 0,
              }}>
                {currentDrama.description || currentDrama.synopsis || 'No synopsis available.'}
              </p>
            </div>
            {!synopsisExpanded && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '228px',
                background: 'linear-gradient(180deg, transparent 0%, #FFFFFF 100%)',
                pointerEvents: 'none',
              }} />
            )}
          </div>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setSynopsisExpanded(!synopsisExpanded)}
              style={{
                borderRadius: '9999px',
                border: '1px solid #D5D8DF',
                padding: '16px 150px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '14px',
                color: '#2D3138',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {synopsisExpanded ? 'See less' : 'See more'}
            </button>
          </div>
        </div>

        {/* Reviews Section - Mobile */}
        <div className="sm:hidden" style={{ paddingBottom: '12px', backgroundColor: '#FFFFFF' }}>
          {/* Header */}
          <div style={{ padding: '24px 16px 16px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.333em', letterSpacing: '-0.017em', color: '#000000' }}>
              Reviews
            </span>
          </div>
          {/* Rating circle + bars */}
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex items-center justify-between" style={{ gap: '16px' }}>
              {/* Left: Rating circle */}
              <div className="flex flex-col items-center" style={{ gap: '10px', padding: '0 20px' }}>
                {/* Circle with conic gradient border */}
                <div style={{
                  width: '70px', height: '70px', borderRadius: '50%',
                  background: `conic-gradient(#F0B100 ${((currentDrama?.reviewRating || 7.4) / 10) * 100}%, #FFFFFF ${((currentDrama?.reviewRating || 7.4) / 10) * 100}%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: '58px', height: '58px', borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '2em', color: '#000000' }}>
                      {currentDrama?.reviewRating ? parseFloat(currentDrama.reviewRating).toFixed(1) : '0.0'}
                    </span>
                  </div>
                </div>
                {/* Stars */}
                <div className="flex items-center" style={{ gap: '1.6px' }}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const rating = (currentDrama?.reviewRating || 0) / 2;
                    const filled = star <= Math.floor(rating);
                    const partial = !filled && star === Math.ceil(rating) && rating % 1 > 0;
                    const pct = partial ? Math.round((rating % 1) * 100) : 0;
                    return (
                      <svg key={star} width="14" height="14" viewBox="0 0 18 18" fill="none">
                        {partial && (
                          <defs>
                            <linearGradient id={`star-grad-mobile-${star}`} x1="0" x2="1" y1="0" y2="0">
                              <stop offset={`${pct}%`} stopColor="#F0B100" />
                              <stop offset={`${pct}%`} stopColor="#FFFFFF" />
                            </linearGradient>
                          </defs>
                        )}
                        <path d="M9 1.5L11.3 6.2L16.5 6.9L12.7 10.6L13.6 15.8L9 13.3L4.4 15.8L5.3 10.6L1.5 6.9L6.7 6.2L9 1.5Z"
                          fill={filled ? '#F0B100' : partial ? `url(#star-grad-mobile-${star})` : 'none'}
                          stroke="#F0B100" strokeWidth="1.2" />
                      </svg>
                    );
                  })}
                </div>
                {/* Review count */}
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.333em', color: '#99A1AF' }}>
                  {reviews.length || 0} reviews
                </span>
              </div>
              {/* Right: Rating bars */}
              <div className="flex-1 flex flex-col justify-center">
                {[
                  { label: 'Acting/Cast', value: parseFloat(castRating) || 0 },
                  { label: 'Music', value: parseFloat(musicRating) || 0 },
                  { label: 'Story', value: parseFloat(storyRating) || 0 },
                  { label: 'Rewatch Value', value: parseFloat(rewatchRating) || 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center" style={{ gap: '15px', height: '24px' }}>
                    <span style={{ width: '94px', flexShrink: 0, fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '1.714em', letterSpacing: '-0.022em', color: '#4A5565' }}>
                      {item.label}
                    </span>
                    <div className="flex items-center flex-1" style={{ gap: '10px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#E5E7EB', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.value * 10}%`, height: '100%', backgroundColor: '#2B7FFF', borderRadius: '9999px' }} />
                      </div>
                      <span style={{ width: '20px', textAlign: 'right', fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '14px', lineHeight: '1.714em', letterSpacing: '-0.022em', color: '#101828' }}>
                        {item.value % 1 === 0 ? item.value : item.value.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section - Mobile */}
        <div className="sm:hidden" style={{ paddingBottom: '20px' }}>
          {/* Header: Comments count */}
          <div style={{ padding: '16px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.333em', letterSpacing: '-0.017em', color: '#000000' }}>
              Comments <span style={{ color: '#2B7FFF' }}>{reviews.length || 0}</span>
            </span>
          </div>

          {/* Review cards */}
          {reviews.length > 0 ? sortReviews(reviews, reviewSortMode).slice(0, mobileVisibleComments).map((review, index) => (
            <div key={review._id || index} onClick={() => openReviewModal(review)} className="cursor-pointer" style={{
              padding: '20px 16px',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E9EBEF',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {/* User info row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: '8px' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    backgroundColor: '#E9EBEF', border: '1px solid #E9EBEF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" fill="#99A1AF"/>
                    </svg>
                  </div>
                  {/* Name + Stars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '1.43em', letterSpacing: '-0.01em', color: '#101828' }}>
                      {review.username || 'Anonymous'}
                    </span>
                    <div className="flex" style={{ gap: '1.6px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <svg key={star} width="14" height="14" viewBox="0 0 18 18" fill="none">
                          <path d="M9 1.5L11.3 6.2L16.5 6.9L12.7 10.6L13.6 15.8L9 13.3L4.4 15.8L5.3 10.6L1.5 6.9L6.7 6.2L9 1.5Z"
                            fill={star <= Math.round(parseFloat(review.rating || 0) / 2) ? '#F0B100' : 'none'}
                            stroke="#F0B100" strokeWidth="1.2" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Comment text */}
              <p className="line-clamp-2" style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '14px',
                lineHeight: '1.375em', letterSpacing: '-0.01em', color: '#6A7282', margin: 0,
              }}>
                {review.reviewText?.replace(/^This review may contain spoilers\s+/i, '') || review.title || ''}
              </p>
            </div>
          )) : (
            <p className="text-center" style={{ padding: '20px 16px', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#99A1AF' }}>
              No reviews yet. Be the first to review!
            </p>
          )}

          {/* See more / Fold button */}
          {reviews.length > 3 && (
            <div style={{ marginTop: '16px', padding: '0 16px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setMobileVisibleComments(prev => prev >= reviews.length ? 3 : prev + 3)}
                style={{
                  width: '100%',
                  borderRadius: '9999px',
                  border: '1px solid #D5D8DF',
                  padding: '16px 150px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#2D3138',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {mobileVisibleComments >= reviews.length ? 'Fold' : 'See more'}
              </button>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="sm:hidden" style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6' }} />

        {/* Videos: Trailer & Teasers - Mobile */}
        {currentDrama.videos && currentDrama.videos.length > 0 && (
          <div className="sm:hidden" style={{ paddingBottom: '16px' }}>
            {/* Header */}
            <div className="flex items-center justify-between" style={{ padding: '24px 16px 16px' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.333em', letterSpacing: '-0.017em', color: '#000000' }}>
                Videos: Trailer & Teasers
              </span>
            </div>
            {/* Horizontal scroll video cards */}
            <div
              className="overflow-x-auto hide-scrollbar"
              style={{ display: 'flex', gap: '10px', padding: '0 16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {currentDrama.videos.map((video, index) => {
                const videoId = getYoutubeIdFromUrl(video.url);
                return (
                  <div
                    key={index}
                    className="flex-shrink-0 relative overflow-hidden cursor-pointer"
                    style={{ width: '286px', height: '156px', borderRadius: '12px', backgroundColor: '#1E2939' }}
                    onClick={() => {
                      setSelectedVideoId(videoId);
                      setTrailerTitle(video.title || 'Trailer');
                      setShowTrailer(true);
                    }}
                  >
                    {videoId && (
                      <Image
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                        alt={video.title || 'Video'}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.jpg'; }}
                      />
                    )}
                    {/* Dark overlay */}
                    <div className="absolute inset-0" style={{ backgroundColor: 'rgba(17, 17, 17, 0.2)' }} />
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div style={{
                        width: '39px', height: '39px', borderRadius: '50%',
                        backgroundColor: 'rgba(196, 196, 196, 0.6)',
                        border: '0.9px solid #C2C2C2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="sm:hidden" style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6' }} />

        {/* Cast - Mobile */}
        {cast && cast.length > 0 && (
          <div className="sm:hidden" style={{ paddingBottom: '20px' }}>
            {/* Header */}
            <div style={{ padding: '24px 16px 16px' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.333em', letterSpacing: '-0.017em', color: '#000000' }}>
                Cast
              </span>
            </div>
            {/* Content */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Horizontal scroll cast cards */}
              <div
                className="overflow-x-auto hide-scrollbar"
                style={{ display: 'flex', gap: '3px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {cast.map((actor, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 cursor-pointer"
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'none', border: 'none', boxShadow: 'none' }}
                    onClick={() => handleActorClick(actor.name, null)}
                  >
                    <div style={{ width: '120px', height: '150px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#E5E7EB', boxShadow: 'none' }}>
                      {actor.image || actor.profileImage ? (
                        <Image
                          src={actor.image || actor.profileImage}
                          alt={actor.name || 'Actor'}
                          width={120}
                          height={150}
                          className="object-cover"
                          style={{ width: '120px', height: '150px' }}
                          unoptimized
                          onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.jpg'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#E5E7EB' }}>
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div style={{ width: '120px', background: 'none', border: 'none', boxShadow: 'none', padding: 0 }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '1.4em', color: '#0A0A0A', margin: 0, padding: 0, background: 'none', border: 'none', boxShadow: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {actor.name || 'Unknown'}
                      </p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.4em', color: '#6A7282', margin: 0, padding: 0, background: 'none', border: 'none', boxShadow: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {actor.role || actor.character || ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8px Spacer */}
        <div className="sm:hidden" style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6' }} />

        {/* Mobile: Comment Ticker (rolling, gradient border) */}
        <div className="sm:hidden" style={{ padding: '24px 16px 4px', backgroundColor: '#FFFFFF' }}>
          <CommentTicker comments={commentsData} onNavigate={navigateToPage} />
        </div>

        {/* Mobile: Related News */}
        {relatedNews && relatedNews.length > 0 && (
          <div className="sm:hidden" style={{ backgroundColor: '#FFFFFF', padding: '24px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Header + Big Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 900, fontSize: '20px', lineHeight: '1.35em', color: '#101828' }}>
                    <span style={{ color: '#2B7FFF' }}>Related</span> News
                  </span>
                </div>

                {/* Big card (first news) */}
                <Link href={`/news/${relatedNews[0]?.slug || relatedNews[0]?._id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ width: '100%', height: '222px', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#E5E7EB' }}>
                      <img
                        src={relatedNews[0]?.coverImage || relatedNews[0]?.thumbnail || '/images/news/default-news.jpg'}
                        alt={relatedNews[0]?.title || ''}
                        style={{ width: '100%', height: '222px', objectFit: 'cover' }}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/news/default-news.jpg'; }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h3 className="line-clamp-2" style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px',
                        lineHeight: '1.25em', color: '#101828', margin: 0
                      }}>
                        {relatedNews[0]?.title || ''}
                      </h3>
                      <p className="line-clamp-2" style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px',
                        lineHeight: '1.5em', color: '#6A7282', margin: 0
                      }}>
                        {relatedNews[0]?.description || relatedNews[0]?.summary || ''}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Small cards - Row 1 (2 cards) */}
              {relatedNews.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {relatedNews.slice(1, 3).map((news, index) => (
                    <Link key={index} href={`/news/${news.slug || news._id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', gap: '12px', height: '70px' }}>
                        <div style={{ width: '100px', height: '70px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#E5E7EB', flexShrink: 0 }}>
                          <img
                            src={news.coverImage || news.thumbnail || '/images/news/default-news.jpg'}
                            alt={news.title || ''}
                            style={{ width: '100px', height: '70px', objectFit: 'cover' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/news/default-news.jpg'; }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontFamily: 'Pretendard, sans-serif', fontWeight: 400, fontSize: '10px',
                            lineHeight: '1.6em', color: '#99A1AF'
                          }}>
                            {news.publishedAt ? new Date(news.publishedAt).toLocaleDateString('en-CA') : news.createdAt ? new Date(news.createdAt).toLocaleDateString('en-CA') : ''}
                          </span>
                          <p className="line-clamp-2" style={{
                            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
                            lineHeight: '1.43em', letterSpacing: '-0.01em', color: '#101828', margin: 0
                          }}>
                            {news.title || ''}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Small cards - Row 2 (2 more cards) */}
              {relatedNews.length > 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {relatedNews.slice(3, 5).map((news, index) => (
                    <Link key={index} href={`/news/${news.slug || news._id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', gap: '12px', height: '70px' }}>
                        <div style={{ width: '100px', height: '70px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#E5E7EB', flexShrink: 0 }}>
                          <img
                            src={news.coverImage || news.thumbnail || '/images/news/default-news.jpg'}
                            alt={news.title || ''}
                            style={{ width: '100px', height: '70px', objectFit: 'cover' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/news/default-news.jpg'; }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                          <span style={{
                            fontFamily: 'Pretendard, sans-serif', fontWeight: 400, fontSize: '10px',
                            lineHeight: '1.6em', color: '#99A1AF'
                          }}>
                            {news.publishedAt ? new Date(news.publishedAt).toLocaleDateString('en-CA') : news.createdAt ? new Date(news.createdAt).toLocaleDateString('en-CA') : ''}
                          </span>
                          <p className="line-clamp-2" style={{
                            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px',
                            lineHeight: '1.43em', letterSpacing: '-0.01em', color: '#101828', margin: 0
                          }}>
                            {news.title || ''}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}


            </div>
          </div>
        )}

        {/* Mobile: More Drama News */}
        <div className="sm:hidden" style={{ backgroundColor: '#FFFFFF', padding: '24px 16px 32px' }}>
          <MoreNews category="drama" storageKey="drama-detail-mobile" />
        </div>


        {/* Trailer Modal */}
        {showTrailer && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <div className="aspect-video">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${selectedVideoId || youtubeId}?autoplay=1`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  className="absolute inset-0"
                ></iframe>
              </div>
              <button 
                onClick={() => setShowTrailer(false)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
              >
                <X className="w-6 h-6" />
              </button>
              
            </div>
          </div>
        )}
        
        {/* 리뷰 모달 */}
        {showReviewModal && selectedReview && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeReviewModal}>
            {/* 이전 리뷰 버튼 - 모달 컨테이너 바깥으로 이동 */}
            {reviews.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevReview();
                }}
                className="absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 shadow-lg hover:shadow-xl text-white transition-all z-20"
                aria-label="Previous review"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            
            {/* 다음 리뷰 버튼 - 모달 컨테이너 바깥으로 이동 */}
            {reviews.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextReview();
                }}
                className="absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 shadow-lg hover:shadow-xl text-white transition-all z-20"
                aria-label="Next review"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
            
            <div
              className="relative w-full max-w-3xl bg-white rounded-xl overflow-hidden shadow-2xl mx-4 my-4 sm:my-8"
              style={{ border: '1px solid rgba(35, 60, 250, 0.2)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 max-h-[calc(100vh-4rem)] overflow-y-auto">
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                  <button 
                    onClick={closeReviewModal}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 sm:p-2 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                
                {/* 이전 리뷰 버튼과 다음 리뷰 버튼 제거 - 상위로 이동시킴 */}
                
                <div className="flex items-start sm:items-center mb-3 sm:mb-4 gap-2.5 sm:gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg" style={{ background: 'linear-gradient(to bottom right, #2B7FFF, #009efc)' }}>
                    {selectedReview.rating}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-gray-900 font-bold text-base sm:text-lg truncate pr-8">{selectedReview.title}</h3>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                      <span className="text-xs sm:text-sm text-gray-600 font-medium truncate max-w-[120px] sm:max-w-none">{selectedReview.username || 'Anonymous'}</span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        {selectedReview.reviewDate || new Date(selectedReview.createdAt || Date.now()).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        star <= Math.floor(selectedReview.rating / 2)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                {/* 세부 평점 (있는 경우) */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Acting/Cast</span>
                    <div className="flex-grow mx-2 h-1 bg-gray-200 rounded-full hidden sm:block"></div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: '#2B7FFF' }}>
                      {selectedReview.castRating ? selectedReview.castRating : (selectedReview.rating * 0.9).toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Story</span>
                    <div className="flex-grow mx-2 h-1 bg-gray-200 rounded-full hidden sm:block"></div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: '#2B7FFF' }}>
                      {selectedReview.storyRating ? selectedReview.storyRating : (selectedReview.rating * 0.95).toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Music</span>
                    <div className="flex-grow mx-2 h-1 bg-gray-200 rounded-full hidden sm:block"></div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: '#2B7FFF' }}>
                      {selectedReview.musicRating ? selectedReview.musicRating : (selectedReview.rating * 0.9).toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Rewatch Value</span>
                    <div className="flex-grow mx-2 h-1 bg-gray-200 rounded-full hidden sm:block"></div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap" style={{ color: '#2B7FFF' }}>
                      {selectedReview.rewatchValue ? selectedReview.rewatchValue : (selectedReview.rating * 0.85).toFixed(1)}/10
                    </span>
                  </div>
                </div>
                
                {/* 리뷰 내용 */}
                <div className="prose prose-sm sm:prose max-w-none mb-3 sm:mb-4">
                  <div className="text-gray-700 text-sm sm:text-base whitespace-pre-line">
                    {selectedReview.reviewText?.replace(/^This review may contain spoilers\s+/i, '') || 
                     "No detailed review provided."}
                  </div>
                </div>
                
                {/* 태그 */}
                {selectedReview.tags && selectedReview.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedReview.tags.map((tag, index) => (
                      <span key={index} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)', color: '#2B7FFF' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* 하단 메타 정보 */}
                <div className="mt-4 sm:mt-6 border-t border-gray-100 pt-3 sm:pt-4 flex flex-wrap justify-between items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedReview.helpfulCount > 0 && (
                      <span className="text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 sm:px-2.5 bg-gray-100 text-gray-700 rounded-full">
                        <ThumbsUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1" />
                        {selectedReview.helpfulCount} helpful
                      </span>
                    )}
                    
                    {selectedReview.watched && (
                      <span className="text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 sm:px-2.5 bg-green-50 text-green-700 rounded-full">
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-1" />
                        Watched
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Tab Navigation - Modernized (mobile/tablet only) */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 lg:hidden">
          <div className="container mx-auto px-4 lg:px-8">
            <div 
              className="flex overflow-x-auto" 
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <style jsx>{`
                div.flex.overflow-x-auto::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <a
                href="#watch"
                onClick={(e) => { e.preventDefault(); setActiveSection('watch'); document.getElementById('watch').scrollIntoView({ behavior: 'smooth' }); }}
                className={`group relative flex items-center px-5 py-4 text-sm transition-all whitespace-nowrap ${
                  activeSection === 'watch'
                    ? 'font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={activeSection === 'watch' ? { color: '#2B7FFF' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'watch' ? '' : 'text-gray-400 group-hover:text-gray-600'}`} style={activeSection === 'watch' ? { color: '#2B7FFF' } : {}}>
                  <Eye className="w-4 h-4 mr-2" />
                  <span>Where to Watch</span>
                </div>
                {activeSection === 'watch' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#2B7FFF' }}></div>
                )}
              </a>
              <a
                href="#synopsis"
                onClick={(e) => { e.preventDefault(); setActiveSection('synopsis'); document.getElementById('synopsis').scrollIntoView({ behavior: 'smooth' }); }}
                className={`group relative flex items-center px-5 py-4 text-sm transition-all whitespace-nowrap ${
                  activeSection === 'synopsis'
                    ? 'font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={activeSection === 'synopsis' ? { color: '#2B7FFF' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'synopsis' ? '' : 'text-gray-400 group-hover:text-gray-600'}`} style={activeSection === 'synopsis' ? { color: '#2B7FFF' } : {}}>
                  <Info className="w-4 h-4 mr-2" />
                  <span>Synopsis</span>
                </div>
                {activeSection === 'synopsis' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#2B7FFF' }}></div>
                )}
              </a>
              <a
                href="#trailers"
                onClick={(e) => { e.preventDefault(); setActiveSection('trailers'); document.getElementById('trailers').scrollIntoView({ behavior: 'smooth' }); }}
                className={`group relative flex items-center px-5 py-4 text-sm transition-all whitespace-nowrap ${
                  activeSection === 'trailers'
                    ? 'font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={activeSection === 'trailers' ? { color: '#2B7FFF' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'trailers' ? '' : 'text-gray-400 group-hover:text-gray-600'}`} style={activeSection === 'trailers' ? { color: '#2B7FFF' } : {}}>
                  <Play className="w-4 h-4 mr-2" />
                  <span>Trailers</span>
                </div>
                {activeSection === 'trailers' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#2B7FFF' }}></div>
                )}
              </a>
              <a
                href="#cast"
                onClick={(e) => { e.preventDefault(); setActiveSection('cast'); document.getElementById('cast').scrollIntoView({ behavior: 'smooth' }); }}
                className={`group relative flex items-center px-5 py-4 text-sm transition-all whitespace-nowrap ${
                  activeSection === 'cast'
                    ? 'font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={activeSection === 'cast' ? { color: '#2B7FFF' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'cast' ? '' : 'text-gray-400 group-hover:text-gray-600'}`} style={activeSection === 'cast' ? { color: '#2B7FFF' } : {}}>
                  <User className="w-4 h-4 mr-2" />
                  <span>Cast</span>
                </div>
                {activeSection === 'cast' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#2B7FFF' }}></div>
                )}
              </a>
              <a
                href="#reviews"
                onClick={(e) => { e.preventDefault(); setActiveSection('reviews'); document.getElementById('reviews').scrollIntoView({ behavior: 'smooth' }); }}
                className={`group relative flex items-center px-5 py-4 text-sm transition-all whitespace-nowrap ${
                  activeSection === 'reviews'
                    ? 'font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={activeSection === 'reviews' ? { color: '#2B7FFF' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'reviews' ? '' : 'text-gray-400 group-hover:text-gray-600'}`} style={activeSection === 'reviews' ? { color: '#2B7FFF' } : {}}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  <span>Reviews</span>
                </div>
                {activeSection === 'reviews' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#2B7FFF' }}></div>
                )}
              </a>
              <a
                href="#similar"
                onClick={(e) => { e.preventDefault(); setActiveSection('similar'); document.getElementById('similar').scrollIntoView({ behavior: 'smooth' }); }}
                className={`group relative flex items-center px-5 py-4 text-sm transition-all whitespace-nowrap ${
                  activeSection === 'similar'
                    ? 'font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={activeSection === 'similar' ? { color: '#2B7FFF' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'similar' ? '' : 'text-gray-400 group-hover:text-gray-600'}`} style={activeSection === 'similar' ? { color: '#2B7FFF' } : {}}>
                  <ListFilter className="w-4 h-4 mr-2" />
                  <span>Similar</span>
                </div>
                {activeSection === 'similar' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#2B7FFF' }}></div>
                )}
              </a>
            </div>
          </div>
        </div>
        
        {/* Main Content (mobile/tablet only) */}
        <div className="bg-white pt-10 lg:hidden">
          <div className="container mx-auto px-4 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Left Column - with flex ordering for mobile */}
              <div className="lg:w-2/3 flex flex-col">
                {/* Where to Watch section */}
                <div id="watch" className="mb-12 scroll-mt-24 order-1">
                  <h2 className="text-2xl font-bold mb-5 text-gray-900 py-1">
                    Where to Watch
                  </h2>
                  
                  {/* 필터 선택 영역 완전히 제거 */}
                  
                  {/* Streaming services list */}
                  <div className="space-y-4">
                    {currentDrama?.watchProviders && currentDrama.watchProviders.length > 0 ? (
                      currentDrama.watchProviders.map((provider, index) => (
                        <div
                          key={index}
                          className="rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:translate-y-[-3px] border border-gray-100 shadow-sm relative group"
                          style={{ backgroundColor: '#1d1a27' }}
                        >
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to right, rgba(0, 158, 252, 0.1), rgba(0, 158, 252, 0.05))' }}></div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 relative">
                            <div className="flex items-center w-full sm:w-auto">
                              {/* Watch Provider logo */}
                              <div className="h-12 w-24 sm:h-14 sm:w-32 flex items-center justify-center rounded-xl overflow-hidden">
                                {provider.logo || provider.imageUrl ?
                                  renderImage(provider.imageUrl || provider.logo, provider.name, "object-contain w-full h-full rounded-xl", 0, 0, false, 'logo') :
                                  <span className="text-white font-bold text-base sm:text-lg">{provider.name}</span>
                                }
                              </div>
                              <div className="ml-3 sm:ml-4">
                                <h3 className="text-base font-semibold transition-colors duration-300" style={{ color: 'white' }} onMouseEnter={(e) => e.currentTarget.style.color = '#009efc'} onMouseLeave={(e) => e.currentTarget.style.color = 'white'}>{provider.name}</h3>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {provider.quality && provider.quality.map((quality, qIndex) => (
                                    <div
                                      key={qIndex}
                                      className="text-xs px-2.5 py-1 rounded-full font-medium border transition-all duration-300"
                                      style={{ backgroundColor: '#f9fafb', color: '#4b5563', borderColor: '#f3f4f6' }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#e0f2fe';
                                        e.currentTarget.style.color = '#009efc';
                                        e.currentTarget.style.borderColor = '#009efc';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f9fafb';
                                        e.currentTarget.style.color = '#4b5563';
                                        e.currentTarget.style.borderColor = '#f3f4f6';
                                      }}
                                    >{quality}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            {/* 데스크탑에서만 보이는 타입 영역 */}
                            <div className="hidden sm:flex items-center justify-end w-full sm:w-auto mt-4 sm:mt-0 border-t sm:border-t-0 pt-3 sm:pt-0 mt-3 sm:mt-0">
                              <div className="text-left sm:text-right">
                                <div className="text-white font-semibold text-sm sm:text-base">
                                  {provider?.type ? provider.type.charAt(0).toUpperCase() + provider.type.slice(1) : 'Unknown'}
                                </div>
                                {provider.price && (
                                  <div className="text-xs sm:text-sm font-medium" style={{ color: '#009efc' }}>{provider.price}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white rounded-xl p-8 text-center border border-gray-100" style={{ boxShadow: 'none' }}>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Providers Found</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          No watch providers available for this content.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Synopsis section - 시놉시스 */}
                <div id="synopsis" className="mb-16 scroll-mt-24 order-2">
                  <h2 className="text-2xl font-bold mb-5 text-gray-900 py-1">
                    Synopsis
                  </h2>
                  
                  <div className="px-1 py-2">
                    <div className="prose prose-lg max-w-none">
                      <p className="text-gray-700 leading-relaxed">
                        {currentDrama.description || currentDrama.summary || "시놉시스 정보가 없습니다."}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Episodes 섹션 바로 앞에 추가 */}
                {/* Reviews Section */}
                <div id="reviews" className="mb-4 scroll-mt-24 order-5">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-2xl font-bold text-gray-900 py-1 flex items-center">
                      Reviews
                      <span className="ml-2 text-sm font-normal text-gray-500 align-middle">{dramaData?.data?.reviewCount || '0'}</span>
                    </h2>
                  </div>
                  
                  <div className="bg-white rounded-xl overflow-hidden">
                    {/* 평점 가로형 레이아웃 - 상단 배치 */}
                    <div className="p-4 sm:p-6 border-b border-gray-50">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        {/* 메인 평점 표시 */}
                        <div className="flex items-center">
                          <div className="bg-white p-4 sm:p-5 rounded-full shadow-lg relative" style={{ border: '1px solid rgba(35, 60, 250, 0.2)' }}>
                            <div className="text-3xl sm:text-4xl md:text-5xl font-bold" style={{ background: 'linear-gradient(to right, #2B7FFF, #009efc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                              {dramaData?.data?.reviewRating ? parseFloat(dramaData.data.reviewRating).toFixed(1) : '0.0'}
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full text-xs text-white flex items-center justify-center shadow-sm font-bold">
                              10
                            </div>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-gray-700 font-medium text-sm uppercase tracking-wider mb-1">Overall Rating</h3>
                            <div className="flex items-center">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`w-5 h-5 ${
                                      star <= Math.round(parseFloat(dramaData?.data?.reviewRating || 0)/2)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="ml-2 text-sm text-gray-600 font-medium">({dramaData?.data?.reviewCount || 0} reviews)</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 평점 분포 - 모바일에서는 세로형, 데스크탑에서는 가로형 */}
                        <div className="flex-1 mt-2 md:mt-0">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rating Distribution</h4>
                            {dramaData?.data?.reviewCount === 0 && (
                              <span className="text-xs px-2 py-1 rounded-full" style={{ color: '#2B7FFF', backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>No ratings yet</span>
                            )}
                          </div>
                          
                          {/* 데스크탑용 가로형 레이아웃 - 모바일에서는 숨김 */}
                          <div className="hidden md:grid grid-cols-5 gap-2">
                            {(dramaData?.data?.ratingDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).slice(5).reverse().map((count, index) => {
                              // Calculate percentage for ratings 6-10
                              const ratingNumber = 10 - index;
                              const percentage = dramaData?.data?.reviewCount && dramaData.data.reviewCount > 0
                                ? Math.round((count / dramaData.data.reviewCount) * 100)
                                : 0;
                              
                              return (
                                <div key={ratingNumber} className="flex flex-col items-center group">
                                  <span className="text-xs font-medium text-gray-600 mb-1">{ratingNumber}</span>
                                  <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                                      style={{
                                        width: percentage > 0 ? `${percentage}%` : '5%',
                                        backgroundColor: percentage > 0 ? '#2B7FFF' : (dramaData?.data?.reviewCount === 0 ? 'rgba(35, 60, 250, 0.2)' : '#f3f4f6')
                                      }}
                                      onMouseEnter={(e) => {
                                        if (percentage > 0) e.currentTarget.style.backgroundColor = '#1a6de0';
                                      }}
                                      onMouseLeave={(e) => {
                                        if (percentage > 0) e.currentTarget.style.backgroundColor = '#2B7FFF';
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium text-gray-500 mt-1">{percentage}%</span>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* 모바일용 세로형 레이아웃 - 데스크탑에서는 숨김 */}
                          <div className="md:hidden space-y-1">
                            {(dramaData?.data?.ratingDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).slice(5).reverse().map((count, index) => {
                              // Calculate percentage for ratings 6-10
                              const ratingNumber = 10 - index;
                              const percentage = dramaData?.data?.reviewCount && dramaData.data.reviewCount > 0
                                ? Math.round((count / dramaData.data.reviewCount) * 100)
                                : 0;
                              
                              return (
                                <div key={ratingNumber} className="flex items-center group">
                                  <span className="w-6 text-xs font-medium text-gray-600 text-center">{ratingNumber}</span>
                                  <div className="flex-grow mx-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                                      style={{ width: `${percentage}%`, backgroundColor: '#2B7FFF' }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6de0'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2B7FFF'}
                                    ></div>
                                  </div>
                                  <span className="w-8 text-right text-xs font-medium text-gray-500">{percentage}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 리뷰 목록 섹션 - 하단 배치 */}
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <h3 className="font-bold text-sm sm:text-lg text-gray-800 flex items-center">
                          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" style={{ color: '#2B7FFF' }} />
                          Featured Reviews
                        </h3>
                      </div>
                      
                      {/* 가로 스크롤 리뷰 컨테이너 */}
                      {loadingReviews ? (
                        <div className="flex justify-center items-center h-40">
                          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent" style={{ borderColor: '#2B7FFF', borderTopColor: 'transparent' }}></div>
                        </div>
                      ) : reviewsError ? (
                        <div className="bg-red-50 p-4 rounded-lg text-red-600 text-center">
                          <p>{reviewsError}</p>
                        </div>
                      ) : reviews.length === 0 ? (
                        <div className="bg-white rounded-xl p-8 text-center border border-gray-100" style={{ boxShadow: 'none' }}>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Reviews Yet</h3>
                          <p className="text-gray-500 max-w-md mx-auto">
                            No reviews available for this title.
                          </p>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="overflow-x-auto hide-scrollbar pb-3" ref={reviewsContainerRef}>
                            <div className="flex space-x-2 md:space-x-4" style={{ 
                              minWidth: 'min-content',
                              scrollSnapType: 'x mandatory',
                              WebkitOverflowScrolling: 'touch'
                            }}>
                              {reviews
                                .sort((a, b) => (b.featured === true) - (a.featured === true))
                                .map((review, index) => (
                                  <div
                                    key={review._id || review.reviewId || index}
                                    className={`w-[calc(100vw-56px)] max-w-[260px] sm:w-[280px] md:w-[320px] flex-shrink-0 bg-white border ${review.featured ? 'shadow-md' : 'border-gray-200'} rounded-xl p-2.5 sm:p-3 hover:shadow-md transition-all duration-300 group relative cursor-pointer`}
                                    onClick={() => openReviewModal(review)}
                                    style={{
                                      scrollSnapAlign: 'start',
                                      borderColor: review.featured ? '#2B7FFF' : '#e5e7eb'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2B7FFF'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = review.featured ? '#2B7FFF' : '#e5e7eb'}
                                  >
                                    {/* Decorative accent */}
                                    <div className="absolute top-0 right-0 w-16 h-16 rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to bottom left, rgba(35, 60, 250, 0.1), transparent)' }}></div>

                                    {/* 대표 리뷰 배지 표시 */}
                                    {review.featured && (
                                      <div className="absolute -top-2 -right-2 text-white text-xs px-2 py-0.5 rounded-full shadow-sm z-10" style={{ backgroundColor: '#2B7FFF' }}>
                                        Featured
                                      </div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-1.5 sm:mb-2 relative">
                                      <div className="flex items-center">
                                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm group-hover:shadow-md transition-all duration-300" style={{ background: 'linear-gradient(to bottom right, #2B7FFF, #009efc)' }}>
                                          {review.rating}
                                        </div>
                                        <div className="ml-2">
                                          <div className="text-xs sm:text-sm font-semibold text-gray-800 transition-colors duration-300 line-clamp-1" onMouseEnter={(e) => e.currentTarget.style.color = '#2B7FFF'} onMouseLeave={(e) => e.currentTarget.style.color = '#1f2937'}>{review.username || 'Anonymous'}</div>
                                          <div className="flex mt-0.5">
                                            {[1, 2, 3, 4, 5].map(star => (
                                              <Star
                                                key={star}
                                                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                                                  star <= Math.floor(review.rating / 2)
                                                    ? 'text-yellow-400 fill-yellow-400'
                                                    : 'text-gray-300'
                                                }`}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                      <span className="text-[10px] sm:text-xs text-gray-400 group-hover:text-gray-500 transition-colors duration-300">
                                        {review.reviewDate || new Date(review.createdAt || Date.now()).toLocaleDateString('ko-KR', {
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                    
                                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 mb-1.5 sm:mb-2.5 line-clamp-1 transition-colors duration-300" onMouseEnter={(e) => e.currentTarget.style.color = '#2B7FFF'} onMouseLeave={(e) => e.currentTarget.style.color = '#111827'}>{review.title}</h4>
                                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 group-hover:text-gray-700 transition-colors duration-300">
                                      {review.reviewText?.replace(/\s{2,}/g, ' ').replace(/^This review may contain spoilers\s+/i, '')}
                                    </p>
                                    
                                    <div className="mt-2 flex justify-between items-center">
                                      <div className="flex flex-wrap gap-1">
                                        {review.helpfulCount > 0 && (
                                          <span
                                            className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full transition-colors duration-300"
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.backgroundColor = 'rgba(35, 60, 250, 0.1)';
                                              e.currentTarget.style.color = '#2B7FFF';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                                              e.currentTarget.style.color = '#4b5563';
                                            }}
                                          >
                                            <ThumbsUp className="w-2 h-2 sm:w-3 sm:h-3 inline mr-0.5 sm:mr-1" />
                                            {review.helpfulCount}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] sm:text-xs font-medium flex items-center group-hover:opacity-100 transition-opacity duration-300" style={{ color: '#2B7FFF' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1a6de0'} onMouseLeave={(e) => e.currentTarget.style.color = '#2B7FFF'}>
                                        Read more
                                        <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5" />
                                      </span>
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                          
                          {/* 스크롤 네비게이션 버튼 */}
                          {showReviewRightArrow && (
                            <div className="absolute top-1/2 -right-2 sm:-right-4 transform -translate-y-1/2 z-10">
                              <button
                                onClick={() => scrollReviews('right')}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 transition-all group"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#2B7FFF';
                                  e.currentTarget.style.borderColor = '#2B7FFF';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#4b5563';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                              >
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          )}

                          {showReviewLeftArrow && (
                            <div className="absolute top-1/2 -left-2 sm:-left-4 transform -translate-y-1/2 z-10">
                              <button
                                onClick={() => scrollReviews('left')}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 transition-all group"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#2B7FFF';
                                  e.currentTarget.style.borderColor = '#2B7FFF';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#4b5563';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                              >
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 rotate-180 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Trailers Section - 예고편 */}
                <div id="trailers" className="mb-12 scroll-mt-24 order-3">
                  <h2 className="text-2xl font-bold mb-5 text-gray-900 py-1">
                    Videos: Trailers & Teasers
                  </h2>
                  
                  <div className="relative">
                    <div 
                      className="overflow-x-auto pb-4 hide-scrollbar" 
                      style={{ 
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        scrollSnapType: 'x mandatory',
                        display: 'flex',
                        gap: '0.5rem'
                      }}
                      ref={videosContainerRef}
                    >
                      {currentDrama.videos && currentDrama.videos.length > 0 ? (
                        <>
                          {currentDrama.videos.map((video, index) => {
                            const videoId = getYoutubeIdFromUrl(video.url);
                            return (
                              <div 
                                key={index} 
                                className="w-72 sm:w-80 md:w-96 flex-shrink-0 rounded-xl overflow-hidden group border border-gray-100 shadow-sm hover:shadow-md transition-all"
                                style={{ scrollSnapAlign: 'center' }}
                              >
                                <div className="relative aspect-video bg-gray-100">
                                  {videoId ? (
                                    <Image 
                                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                      alt={video.title}
                                      fill
                                      className="object-cover"
                                      unoptimized={true}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/images/placeholder-tvfilm.jpg';
                                      }}
                                    />
                                  ) : (
                                    renderImage('/images/placeholder-tvfilm.jpg', video.title)
                                  )}
                                  
                                  {/* 썸네일 왼쪽 상단에 타이틀 제거 */}
                                  
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setSelectedVideoId(videoId);
                                      setTrailerTitle(video.title || "Official Trailer");
                                      setShowTrailer(true);
                                    }}
                                    className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/0 transition-all"
                                  >
                                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white/20 backdrop-blur-md group-hover:backdrop-blur-none border border-white/30 flex items-center justify-center transform group-hover:scale-110 transition-all duration-300" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2B7FFF'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}>
                                      <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-0.5" />
                                    </div>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <div className="bg-white rounded-xl p-8 text-center border border-gray-100 w-full" style={{ boxShadow: 'none' }}>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Videos Available</h3>
                          <p className="text-gray-500 max-w-md mx-auto">
                            No trailers or teasers available for this content.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* 비디오 스크롤 네비게이션 버튼 */}
                    {currentDrama.videos && currentDrama.videos.length > 1 && (
                      <>
                        {/* 오른쪽 화살표 버튼 - 오른쪽 끝이 아닐 때만 표시 */}
                        {showRightArrow && (
                          <div className="absolute top-1/2 -right-2 sm:-right-4 transform -translate-y-1/2 z-10">
                            <button
                              onClick={() => scrollVideos('right')}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 transition-all group"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#2B7FFF';
                                e.currentTarget.style.borderColor = '#2B7FFF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#4b5563';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                              }}
                            >
                              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        )}
                        
                        {/* 왼쪽 화���표 버튼 - 왼쪽 끝이 아닐 때만 표시 */}
                        {showLeftArrow && (
                          <div className="absolute top-1/2 -left-2 sm:-left-4 transform -translate-y-1/2 z-10">
                            <button
                              onClick={() => scrollVideos('left')}
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 transition-all group"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#2B7FFF';
                                e.currentTarget.style.borderColor = '#2B7FFF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#4b5563';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                              }}
                            >
                              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 rotate-180 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Cast Section - 출연진 */}
                <div className="order-4">
                  <CastSection
                    cast={cast}
                    onActorClick={(actor) => handleActorClick(actor.name, null)}
                  />
                </div>
              </div>
              
              {/* Right sidebar - Movie Information - Desktop Only */}
              <div className="lg:w-1/3 space-y-6 hidden lg:block">
                {/* Film info card */}
                <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 sticky top-24">
                  {/* Movie Information title */}
                  <div className="pt-5 px-5 border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900">
                      Movie Information
              </h3>
                  </div>
                  
                  {/* Poster and quick info */}
                  <div className="px-5 py-5 flex">
                    {/* Poster thumbnail */}
                    <div className="relative w-[110px] h-[165px] flex-shrink-0 rounded-xl overflow-hidden shadow-lg border border-gray-200">
                      {currentDrama && currentDrama.coverImage && renderImage(currentDrama.coverImage, currentDrama.title || "Drama Image", "object-cover", 0, 0, true)}
                    </div>
                    
                    {/* Quick info beside poster */}
                    <div className="ml-4 flex flex-col py-1 flex-1">
                      <h3 className="font-bold text-base text-gray-800 mb-2 leading-tight line-clamp-2">{currentDrama && currentDrama.title ? currentDrama.title : "제목 없음"}</h3>
                      
                      {/* Rating */}
                      <div className="flex items-center mb-3 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 shadow-md" style={{ backgroundColor: '#2B7FFF' }}>
                          {currentDrama && currentDrama.reviewRating && currentDrama.reviewRating > 0
                    ? parseFloat(currentDrama.reviewRating) === 10
                      ? "10"
                      : parseFloat(currentDrama.reviewRating).toFixed(1)
                    : "NR"
                  }
                </div>
                        <span className="text-gray-700 font-medium">Rating</span>
                      </div>
                      
                      {/* Genres */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(currentDrama && currentDrama.genres && Array.isArray(currentDrama.genres) && currentDrama.genres.length > 0) ? (
                          currentDrama.genres.map((genre, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
                              style={{
                                backgroundColor: '#f3f4f6',
                                color: '#1f2937'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#009efc';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.color = '#1f2937';
                              }}
                            >
                              {genre}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-700 text-xs">{currentDrama.category || "Movie"}</span>
                        )}
                      </div>
              </div>
            </div>
            
                  {/* Like/Dislike buttons - 완전히 제거 */}

                  {/* Additional Movie Information */}
                  <div className="border-t border-gray-100">
                    <div className="p-5 space-y-3">
                      {/* Director */}
                      {currentDrama.director && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                              <img src="/images/icons8-documentary-94.png" alt="Director" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm text-gray-500 font-medium">Director</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-900 font-semibold text-sm">
                              {currentDrama.director}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Runtime */}
                      {currentDrama.runtime && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                              <img src="/images/icons8-clock-24.png" alt="Time" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm text-gray-500 font-medium">Runtime</h4>
                          </div>
                          <span className="text-gray-900 font-semibold text-sm">{currentDrama.runtime}</span>
                        </div>
                      )}

                      {/* Age Rating */}
                      {currentDrama.ageRating && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                              <img src="/images/icons8-warning-shield-94.png" alt="Age Rating" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm text-gray-500 font-medium">Age Rating</h4>
                          </div>
                          <span className="text-gray-900 font-semibold text-sm whitespace-nowrap">
                            {currentDrama.ageRating === '15' || currentDrama.ageRating?.includes('15+') ? '15 and over' :
                             currentDrama.ageRating === '12' || currentDrama.ageRating?.includes('12+') ? '12 and over' :
                             currentDrama.ageRating === '18' || currentDrama.ageRating?.includes('18+') ? 'Adults only' :
                             currentDrama.ageRating === 'ALL' ? 'All ages' :
                             currentDrama.ageRating === 'Not Rated' || currentDrama.ageRating === 'Not Yet Rated' ? 'Not Rated' :
                             currentDrama.ageRating}
                          </span>
                        </div>
                      )}

                      {/* Production Country */}
                      {currentDrama.country && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                              <img src="/images/icons8-globe-94.png" alt="Country" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm text-gray-500 font-medium">Country</h4>
                          </div>
                          <div className="flex items-center text-gray-900 font-semibold">
                            <span className="text-sm">{currentDrama.country}</span>
                          </div>
                        </div>
                      )}

                      {/* 첫 방영 날짜 추가 */}
                      {currentDrama.releaseDate && (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                              <img src="/images/icons8-calendar-94.png" alt="Calendar" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm text-gray-500 font-medium">Release Date</h4>
                          </div>
                          <span className="text-gray-900 font-semibold text-sm text-right break-words">
                            {formatDate(currentDrama.releaseDate)}
                          </span>
                        </div>
                      )}

                      {/* 에피소드 수 추가 */}
                      {currentDrama.episodes && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                              <img src="/images/icons8-tv-94.png" alt="Episodes" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm text-gray-500 font-medium">Episodes</h4>
                          </div>
                          <span className="text-gray-900 font-semibold text-sm">
                            {currentDrama.episodes} episodes
                      </span>
                        </div>
                  )}
                    </div>
                </div>
                
                  {/* 리뷰 평가 점수 */}
                  {currentDrama.reviewCount > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="p-5">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                          <img src="/images/icons8-star-94.png" alt="Star" className="w-4 h-4 mr-2" />
                          Viewer Ratings
                        </h4>

                        <div className="space-y-3">
                          {/* 각 평가 항목 */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Acting/Cast</span>
                            <div className="flex items-center">
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${(currentDrama?.reviewStats?.castRating || 8.0) * 10}%`, backgroundColor: '#2B7FFF' }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-800 w-8 text-right">{currentDrama?.reviewStats?.castRating || 8.0}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Story</span>
                            <div className="flex items-center">
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${(currentDrama?.reviewStats?.storyRating || 8.0) * 10}%`, backgroundColor: '#2B7FFF' }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-800 w-8 text-right">{currentDrama?.reviewStats?.storyRating || 8.0}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Music</span>
                            <div className="flex items-center">
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${(currentDrama?.reviewStats?.musicRating || 7.5) * 10}%`, backgroundColor: '#2B7FFF' }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-800 w-8 text-right">{currentDrama?.reviewStats?.musicRating || 7.5}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Rewatch Value</span>
                            <div className="flex items-center">
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${(currentDrama?.reviewStats?.rewatchRating || 7.0) * 10}%`, backgroundColor: '#2B7FFF' }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-800 w-8 text-right">{currentDrama?.reviewStats?.rewatchRating || 7.0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Related News Section - 카드뉴스와 동일한 디자인 */}
            <div className="mt-16 mb-20" id="similar">
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
                    <span className="text-sm font-semibold tracking-wider uppercase mb-1 block" style={{ color: '#2B7FFF' }}>Related Content</span>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Related News</h2>
                  </div>
                </div>
              </div>
              
              {/* 뉴스 카드 그리드 - 카드뉴스와 동일한 디자인 */}
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
                          sessionStorage.setItem('dramaDetailScrollPosition', scrollPosition.toString());
                          sessionStorage.setItem('isBackToDrama', 'true');
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
                            <h3 className="font-bold text-gray-800 text-xl md:text-2xl mb-2 line-clamp-2 min-h-[3.5rem] transition-colors">
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
                                <span>{new Date(news.publishedAt || news.createdAt).toLocaleDateString('en-US')}</span>
                              </div>

                              {/* Read more 버튼 */}
                              <span className="inline-flex items-center text-xs font-medium hover:underline cursor-pointer group" style={{ color: '#2B7FFF' }}>
                                Read more <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" style={{ color: '#2B7FFF' }} />
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
            </div>
          </div>
        </div>
      </div>
      {/* 공유 모달 */}
      {showShareMenu && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity" onClick={() => setShowShareMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full bg-white rounded-t-3xl md:rounded-2xl z-50 shadow-2xl">
            <div className="p-6">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 md:hidden"></div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Share</h3>
                <button onClick={() => setShowShareMenu(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} color="#374151" />
                </button>
              </div>
              <div className="flex justify-center gap-6 mb-4">
                <button onClick={handleShareFacebook} className="w-14 h-14 flex items-center justify-center hover:scale-110 transition-transform">
                  <img src="/images/icons8-facebook-logo-50.png" alt="Facebook" className="w-12 h-12" />
                </button>
                <button onClick={handleShareTwitter} className="w-14 h-14 flex items-center justify-center hover:scale-110 transition-transform">
                  <img src="/images/icons8-x-50.png" alt="X" className="w-12 h-12" />
                </button>
              </div>
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate flex-1">{getDramaShareUrl()}</p>
                  <button onClick={handleCopyLink} className="ml-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 링크 복사 토스트 */}
      {isLinkCopied && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-lg shadow-lg z-50 whitespace-nowrap text-base">
          Link copied to clipboard!
        </div>
      )}
    </MainLayout>
  );
}

// 메타 태그 생성 함수 추가
function generateMetaTags(drama) {
  if (!drama) return {
    title: '드라마 정보',
    description: '드라마 정보를 확인하세요',
    image: '/images/placeholder-tvfilm.svg',
    url: '/drama'
  };
  
  return {
    title: `${drama.title} - 상세정보`,
    description: drama.summary || `${drama.title} 드라마 정보 페이지입니다`,
    image: drama.coverImage || '/images/placeholder-tvfilm.svg',
    url: `/drama/${drama.slug}`
  };
}

// 데이터 가져오기
export async function getServerSideProps({ params, req, res: sRes, query, resolvedUrl }) {
  const { id } = params;

  try {
    // 뒤로가기 시 브라우저 캐시 사용 → 서버 요청 없이 즉시 렌더링
    sRes.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    // 드라마 상세 정보 조회 - 기존 드라마 API 사용
    console.log(`드라마 데이터 요청: /api/dramas/${id}?view=true`);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/dramas/${id}?view=true`);
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      console.error('드라마 데이터 조회 실패:', data.message || '알 수 없는 오류');
      return {
        notFound: true
      };
    }
    
    const drama = data.data;
    
    // 필수 데이터 확인
    if (!drama || !drama.title) {
      console.error('유효하지 않은 드라마 데이터:', drama);
      return {
        notFound: true
      };
    }
    
    // 데이터 정제 및 기본값 설정
    const processedDrama = {
      ...drama,
      contentType: 'drama', // 드라마 타입 명시
      // 필수 필드에 기본값 설정
      summary: drama.summary || '요약 정보가 없습니다.',
      cast: Array.isArray(drama.cast)
        ? drama.cast
        : (drama.cast?.mainRoles || drama.cast?.supportRoles)
          ? [...(drama.cast.mainRoles || []), ...(drama.cast.supportRoles || [])].map(a => ({ ...a, image: a.image || a.profileImage || '/images/placeholder-tvfilm.jpg' }))
          : [],
      tags: Array.isArray(drama.tags) ? drama.tags : [],
      genres: Array.isArray(drama.genres) ? drama.genres : [],
      // 필드가 없을 경우를 대비한 기본값
      reviewRating: drama.reviewRating || 0,
      reviewCount: drama.reviewCount || 0,
      watchProviders: drama.watchProviders || []
    };
    
    // 관련 뉴스 + 사이드바 데이터 가져오기
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    let relatedNews = [];
    let recentComments = [];
    let rankingNews = [];

    const fixImageUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('http')) {
        if (process.env.NODE_ENV === 'development' && url.includes('kstarpick.com/api/proxy')) {
          return url.replace('https://kstarpick.com', 'http://43.202.38.79:13001');
        }
        return url;
      }
      // 상대 경로는 그대로 유지 (브라우저가 현재 도메인 기준으로 로딩 → mixed content 방지)
      if (url.startsWith('/api/proxy/') || url.startsWith('/uploads/')) {
        return url;
      }
      return url;
    };

    const listFields = 'fields=_id,title,slug,coverImage,thumbnailUrl,category,source,sourceUrl,timeText,summary,createdAt,publishedAt,updatedAt,viewCount,featured,tags,author,youtubeUrl,articleUrl';

    // 각 API를 개별 try/catch로 감싸서 하나가 실패해도 나머지 데이터는 유지
    const [newsRes, commentsRes, rankingRes, trendingRes, editorsPickRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/news/drama?limit=50`),
      fetch(`${baseUrl}/api/comments/recent?limit=10`),
      fetch(`${baseUrl}/api/news?limit=10&sort=viewCount&category=drama&${listFields}`),
      fetch(`${baseUrl}/api/news/trending?limit=5`),
      fetch(`${baseUrl}/api/news/editors-pick?limit=6`),
    ]);

    // 관련 뉴스
    try {
      if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
        const newsData = await newsRes.value.json();
        const stripHtml = (html) => {
          if (!html) return '';
          return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
        };
        if (newsData.success && newsData.data) {
          const allNews = newsData.data;
          // 1) 드라마 제목/출연진 매칭 뉴스 우선
          const matched = allNews.filter(item => {
            const dramaTitle = drama?.title?.toLowerCase() || '';
            const titleMatch = item?.title?.toLowerCase().includes(dramaTitle);
            const summaryMatch = item?.summary?.toLowerCase().includes(dramaTitle);
            const contentMatch = item?.content?.toLowerCase().includes(dramaTitle);
            const tagMatch = Array.isArray(item?.tags) && item.tags.some(tag => tag?.toLowerCase().includes(dramaTitle));
            const castMatch = Array.isArray(drama.cast) && drama.cast.some(actor => {
              if (!actor?.name) return false;
              const name = actor.name.toLowerCase();
              return (
                item?.title?.toLowerCase().includes(name) ||
                item?.summary?.toLowerCase().includes(name) ||
                item?.content?.toLowerCase().includes(name) ||
                (Array.isArray(item?.tags) && item.tags.some(tag => tag?.toLowerCase().includes(name)))
              );
            });
            return titleMatch || summaryMatch || contentMatch || tagMatch || castMatch;
          }).slice(0, 6);

          // 2) 6개 미만이면 최신순으로 나머지 채움
          const usedIds = new Set(matched.map(m => m._id?.toString()));
          const filler = allNews
            .filter(item => !usedIds.has(item._id?.toString()))
            .slice(0, 6 - matched.length);

          relatedNews = [...matched, ...filler].map(item => ({
            ...item,
            coverImage: fixImageUrl(item.coverImage) || fixImageUrl(item.thumbnailUrl) || '/images/news/default-news.jpg',
            thumbnailUrl: fixImageUrl(item.thumbnailUrl),
            description: stripHtml(item.content).slice(0, 200),
            content: null,
          }));
        }
      }
    } catch (e) { console.error('관련 뉴스 로딩 오류:', e.message); }

    // 최근 댓글
    try {
      if (commentsRes.status === 'fulfilled' && commentsRes.value.ok) {
        const commentsData = await commentsRes.value.json();
        recentComments = commentsData.success ? (commentsData.data || []).slice(0, 10) : [];
      }
    } catch (e) { console.error('최근 댓글 로딩 오류:', e.message); }

    // 랭킹 뉴스
    try {
      if (rankingRes.status === 'fulfilled' && rankingRes.value.ok) {
        const rankingData = await rankingRes.value.json();
        rankingNews = rankingData.success
          ? (rankingData.data?.news || []).slice(0, 10).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) }))
          : [];
      }
    } catch (e) { console.error('랭킹 뉴스 로딩 오류:', e.message); }

    // 트렌딩 뉴스
    let trendingNews = [];
    try {
      if (trendingRes.status === 'fulfilled' && trendingRes.value.ok) {
        const trendingData = await trendingRes.value.json();
        trendingNews = trendingData.success ? (trendingData.data || []) : [];
      }
    } catch (e) { console.error('트렌딩 뉴스 로딩 오류:', e.message); }

    // Editor's Pick 뉴스
    let editorsPickNews = [];
    try {
      if (editorsPickRes.status === 'fulfilled' && editorsPickRes.value.ok) {
        const editorsPickData = await editorsPickRes.value.json();
        editorsPickNews = editorsPickData.success ? (editorsPickData.data || []).map(n => ({ ...n, coverImage: fixImageUrl(n.coverImage), thumbnailUrl: fixImageUrl(n.thumbnailUrl) })) : [];
      }
    } catch (e) { console.error('Editor\'s Pick 뉴스 로딩 오류:', e.message); }

    return {
      props: {
        drama: processedDrama,
        relatedNews,
        recentComments,
        rankingNews,
        trendingNews,
        editorsPickNews,
        metaTags: generateMetaTags(processedDrama)
      }
    };
  } catch (error) {
    console.error('드라마 데이터 로딩 오류:', error);
    return {
      notFound: true
    };
  }
}