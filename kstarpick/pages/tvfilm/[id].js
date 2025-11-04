import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import MainLayout from '../../components/MainLayout';
import { Calendar, Clock, Eye, Network, Star, Tag, Play, User, Bookmark, Share2, Heart, Info, Film, Tv, ListFilter, X, Check, ChevronRight, Award, Download, Users, FileImage, List, ThumbsDown, Plus, MessageCircle, MessageSquare, FileText, ThumbsUp, ChevronLeft, TrendingUp } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faBookmark, faShare, faStar, faEye, faCalendarAlt, faTv } from '@fortawesome/free-solid-svg-icons';
import { faHeart as farHeart, faBookmark as farBookmark } from '@fortawesome/free-regular-svg-icons';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import useSWR from 'swr';
import Loading from '../../components/Loading';
import ErrorMessage from '../../components/ErrorMessage';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import Seo from '../../components/Seo';
import Footer from '../../components/Footer';
import CastSection from '../../components/CastSection';

const fetcher = url => axios.get(url).then(res => res.data);

// 이미지 URL 오류 처리 함수
const ensureLocalImage = (imageUrl) => {
  // 이미지가 없거나 undefined, null인 경우
  if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
    return '/images/placeholder-tvfilm.jpg';
  }

  // 애플 TV+ 로고 특별 처리 (기존 로고 URL도 새 SVG로 변환)
  if (imageUrl && (
    imageUrl.includes('Apple_TV_Plus_logo.png') ||
    imageUrl.includes('apple') && imageUrl.includes('tv') && imageUrl.includes('logo') ||
    imageUrl.includes('favicon') && imageUrl.includes('apple')
  )) {
    return 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg';
  }

  // 상대 경로가 잘못된 경우(public/ 포함)
  if (imageUrl.startsWith('public/')) {
    return imageUrl.replace('public/', '/');
  }

  // 이미 절대 경로로 되어 있는 경우 그대로 사용
  if (imageUrl.startsWith('/')) {
    return imageUrl;
  }

  // 외부 URL (http, https)인 경우 그대로 사용
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // 외부 URL은 그대로 반환 (안전한 도메인인 경우)
    const safeDomains = [
      'i.imgur.com', 'imgur.com',
      'images.unsplash.com', 'unsplash.com',
      'mydramalist.com', 'i.mydramalist.com',
      'via.placeholder.com', 'placeholder.com',
      'picsum.photos', 'loremflickr.com',
      'upload.wikimedia.org', 'wikimedia.org',
      'images.justwatch.com', 'justwatch.com'
    ];

    try {
      const url = new URL(imageUrl, 'https://example.com');
      const domain = url.hostname;

      // JustWatch 이미지 특별 처리
      if (domain.includes('justwatch.com')) {
        // 이미지 URL이 http:// 로 시작하면 https:// 로 변경
        if (imageUrl.startsWith('http://')) {
          imageUrl = imageUrl.replace('http://', 'https://');
        }
        return imageUrl;
      }

      if (safeDomains.some(safeDomain => domain.includes(safeDomain))) {
        return imageUrl;
      }
    } catch (error) {
      console.error('URL 파싱 오류:', error);
      return '/images/placeholder-tvfilm.jpg';
    }

    return '/images/placeholder-tvfilm.jpg';
  }

  // 그 외의 경우에는 상대 경로로 간주하고 /images/ 접두사 추가
  if (!imageUrl.startsWith('/images/')) {
    return `/images/${imageUrl}`;
  }

  // 그 외의 경우에는 기존 URL 사용
  return imageUrl;
};

// 외부 URL인지 확인하는 함수
const isExternalUrl = (url) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
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
  
  // Apple TV+ 로고 특별 처리 (항상 SVG 사용)
  if (alt && alt.toLowerCase().includes('apple') && type === 'logo') {
    imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg';
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

export default function TVFilmDetail({ tvfilm, relatedNews }) {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [tvfilmData, setTvfilmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTVFilm, setCurrentTVFilm] = useState(null);
  const [relatedItems, setRelatedItems] = useState([]);
  const [cast, setCast] = useState([]);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeSection, setActiveSection] = useState('watch');
  // YouTube ID를 저장할 상태 변수
  const [youtubeId, setYoutubeId] = useState('');
  // 선택된 비디오 ID를 저장할 상태 변수 추가
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [trailerTitle, setTrailerTitle] = useState('Official Trailer');
  // 리뷰 모달 관련 상태 변수 추가
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  // Add state for watch provider filtering
  const [watchProviderFilter, setWatchProviderFilter] = useState('all');
  
  // 리뷰 스크롤 관련 참조 객체 추가
  const reviewsContainerRef = useRef(null);

  const { data, error: swrError } = useSWR(
    id ? `/api/dramas/${id}?view=true` : null,
    fetcher
  );
  
  const { data: relatedData } = useSWR(
    data?.data ? `/api/dramas?limit=4&category=movie` : null,
    fetcher
  );

  // YouTube URL에서 ID 추출 함수
  const getYoutubeIdFromUrl = (url) => {
    if (!url) return null;
    
    // 유튜브 URL 패턴 매칭
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // 스크롤 위치 복원 로직 - tvfilm 페이지에서 뒤로가기 시
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isBackToTvfilm = sessionStorage.getItem('isBackToTvfilm');
    const savedScrollPosition = sessionStorage.getItem('tvfilmDetailScrollPosition');

    if (isBackToTvfilm === 'true' && savedScrollPosition) {
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
        sessionStorage.removeItem('isBackToTvfilm');
        sessionStorage.removeItem('tvfilmDetailScrollPosition');
      }, 1000);
    }
  }, [router.asPath]);

  useEffect(() => {
    if (data?.data || tvfilm) {
      // 데이터가 있는 경우 이미지 URL 수정 및 보강
      const updatedData = { ...(data?.data || tvfilm) };

      // 이미지 URL 수정
      // 썸네일 이미지 확인 및 처리
      updatedData.coverImage = ensureLocalImage(updatedData.coverImage);

      // 배너 이미지 확인 및 처리
      updatedData.bannerImage = ensureLocalImage(updatedData.bannerImage);

      // watchProviders 배열의 모든 항목에 대해 로고 URL을 내부 이미지로 변경
      if (updatedData.watchProviders && Array.isArray(updatedData.watchProviders)) {
        updatedData.watchProviders = updatedData.watchProviders.map(provider => {
          // logo 또는 imageUrl 필드 확인
          const logoUrl = provider.logo || provider.imageUrl || '';
          const processedLogo = logoUrl ? ensureLocalImage(logoUrl) : '/images/placeholder-image.jpg';
          return {
            ...provider,
            logo: processedLogo,
            imageUrl: processedLogo // 양쪽 필드 모두 설정
          };
        });
      }
      
      // 캐스트 이미지 처리 - 이미지가 없거나 외부 URL인 경우 로컬 이미지로 교체
      if (updatedData.cast && Array.isArray(updatedData.cast)) {
        updatedData.cast = updatedData.cast.map(actor => {
          // profileImage 필드를 우선 사용하고, 없으면 image 필드를 사용
          const imageUrl = actor.profileImage || actor.image || '';
          
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
          { name: 'Actor 1', role: 'Role 1', image: '/images/placeholder-tvfilm.jpg' },
          { name: 'Actor 2', role: 'Role 2', image: '/images/placeholder-tvfilm.jpg' },
          { name: 'Actor 3', role: 'Role 3', image: '/images/placeholder-tvfilm.jpg' }
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
      
      setTvfilmData(updatedData);
      setCurrentTVFilm(updatedData);
      setCast(updatedData.cast);
      setLikesCount(updatedData.likes || 0);
      setDislikesCount(updatedData.dislikes || 0);
      
      // 사용자 상호작용 확인
      const checkUserInteractions = async () => {
        if (session?.user) {
          try {
            const res = await axios.get(`/api/user/interactions?contentId=${id}&type=tvfilm`);
            if (res.data.success) {
              setIsLiked(res.data.liked);
              setIsDisliked(res.data.disliked);
              setIsBookmarked(res.data.bookmarked);
            }
          } catch (error) {
            console.error('Error checking user interactions:', error);
          }
        }
      };
      
      checkUserInteractions();
    }
    
    // Add loading state handling
    if (data) {
      setLoading(false);
    }
    
    if (swrError) {
      setError(swrError);
      setLoading(false);
    }
  }, [data, id, session, swrError, tvfilm]);

  useEffect(() => {
    if (data?.data) {
      // Mock cast data if not available in API
      if (!data.data.cast) {
        setCast([
          { id: 1, name: 'Actor 1', role: 'Role 1', image: '/images/placeholder-tvfilm.jpg' },
          { id: 2, name: 'Actor 2', role: 'Role 2', image: '/images/placeholder-tvfilm.jpg' },
          { id: 3, name: 'Actor 3', role: 'Role 3', image: '/images/placeholder-tvfilm.jpg' },
        ]);
      } else {
        // cast가 배열인지 객체인지 확인
        let castArray = [];

        if (Array.isArray(data.data.cast)) {
          // 배열 형식 (영화 크롤러의 cast 배열)
          castArray = data.data.cast;
        } else if (data.data.cast.mainRoles || data.data.cast.supportRoles) {
          // 객체 형식 (드라마 크롤러의 {mainRoles: [], supportRoles: []} 형식)
          castArray = [
            ...(data.data.cast.mainRoles || []),
            ...(data.data.cast.supportRoles || [])
          ];
        }

        // 각 배우 이미지 URL 확인 및 수정
        const processedCast = castArray.map(actor => {
          // API에서는 profileImage 필드를 사용하므로 이를 직접 사용
          const imageUrl = actor.profileImage || actor.image || '';

          return {
            ...actor,
            name: actor.name || 'Unknown Actor',
            role: actor.role || 'Unknown Role',
            image: ensureLocalImage(imageUrl) || '/images/placeholder-tvfilm.jpg',
            // profileImage 원본 필드도 유지
            profileImage: imageUrl
          };
        });
        setCast(processedCast);
      }
      
      // Fetch related items
      const fetchRelatedItems = async () => {
        try {
          const relatedResponse = await axios.get('/api/tvfilm', {
            params: {
              category: data.data.category,
              limit: 4,
            }
          });
          
          if (relatedResponse.data.success) {
            // Filter out the current item and limit to 4 items
            const filtered = relatedResponse.data.data
              .filter(item => item._id !== id)
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
  }, [data, id]);

  useEffect(() => {
    if (tvfilmData) {
      // Set page title
      if (tvfilmData.title) {
        document.title = `${tvfilmData.title} - KDrama&Movie`;
      }
    }
  }, [tvfilmData, relatedNews]);

  // Get status badge class based on status
  const getStatusClass = (status) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'Upcoming':
        return 'bg-purple-100 text-purple-800';
      case 'Cancelled':
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
    return `${date.toLocaleDateString()}`;
  };

  const handleLike = async () => {
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
    setIsLiked(!isLiked);
    setLikesCount(prev => !isLiked ? prev + 1 : prev - 1);
    
    // 만약 이전에 싫어요를 눌렀었다면, 싫어요 제거
    if (!isLiked && isDisliked) {
      setIsDisliked(false);
      setDislikesCount(prev => prev > 0 ? prev - 1 : 0);
    }
    
    try {
      const res = await axios.post('/api/user/like', {
        contentId: id,
        contentType: 'tvfilm'
      });
      
      if (!res.data.success) {
        // API 호출 실패 시 UI 롤백
        setIsLiked(previousLiked);
        setIsDisliked(previousDisliked);
        setLikesCount(previousLikesCount);
        setDislikesCount(previousDislikesCount);
        console.error('API response error:', res.data.message);
      }
    } catch (error) {
      // 에러 발생 시 UI 롤백
      setIsLiked(previousLiked);
      setIsDisliked(previousDisliked);
      setLikesCount(previousLikesCount);
      setDislikesCount(previousDislikesCount);
      console.error('Error liking content:', error);
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
      const res = await axios.post('/api/user/dislike', {
        contentId: id,
        contentType: 'tvfilm'
      });
      
      if (!res.data.success) {
        // API 호출 실패 시 UI 롤백
        setIsLiked(previousLiked);
        setIsDisliked(previousDisliked);
        setLikesCount(previousLikesCount);
        setDislikesCount(previousDislikesCount);
        console.error('API response error:', res.data.message);
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

  const handleBookmark = async () => {
    if (!session) {
      router.push('/login?returnUrl=' + router.asPath);
      return;
    }
    
    try {
      const res = await axios.post('/api/user/bookmark', {
        contentId: id,
        contentType: 'tvfilm'
      });
      
      if (res.data.success) {
        setIsBookmarked(res.data.bookmarked);
      }
    } catch (error) {
      console.error('Error bookmarking content:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: tvfilmData?.title,
        text: tvfilmData?.summary,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard.');
    }
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
    if (!currentTVFilm?.reviews || currentTVFilm.reviews.length <= 1) return;
    
    const sortedReviews = [...currentTVFilm.reviews]
      .filter(review => review.approved !== false)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    
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
    if (!currentTVFilm?.reviews || currentTVFilm.reviews.length <= 1) return;
    
    const sortedReviews = [...currentTVFilm.reviews]
      .filter(review => review.approved !== false)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    
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

  // 필터링된 시청 제공자 목록 계산
  const filteredWatchProviders = useMemo(() => {
    if (!currentTVFilm?.watchProviders) {
      return [];
    }
    
    // Apple TV+ 로고 URL 수정
    const updatedProviders = currentTVFilm.watchProviders.map(provider => {
      if (provider.name.toLowerCase().includes('apple')) {
      return {
        ...provider,
          logo: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg'
      };
      }
      return provider;
    });
    
    // 필터 적용
    if (watchProviderFilter === 'all') {
      return updatedProviders;
    }
    
    return updatedProviders.filter(provider => provider.type === watchProviderFilter);
  }, [currentTVFilm?.watchProviders, watchProviderFilter]);

  // 리뷰 스크롤 함수 추가
  const scrollReviews = (direction) => {
    if (reviewsContainerRef.current) {
      const container = reviewsContainerRef.current;
      const scrollAmount = 350; // 카드 한 개 너비 + 여백
      
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  // 비디오 스크롤을 위한 ref 객체 추가
  const videosContainerRef = useRef(null);
  
  // 비디오 스크롤 상태 추가
  const [videoScrollState, setVideoScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: true
  });
  
  // 비디오 스크롤 함수
  const scrollVideos = (direction) => {
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
      console.log(`Scrolling to item ${targetIndex} (direction: ${direction})`);
      scrolledItems[targetIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start'
      });
    }
    
    // 화살표 상태 업데이트
    setTimeout(() => {
      updateVideoScrollState();
    }, 300);
  };
  
  // 비디오 스크롤 상태 업데이트 함수
  const updateVideoScrollState = () => {
    if (videosContainerRef.current) {
      const container = videosContainerRef.current;
      
      // 왼쪽으로 스크롤 가능 여부 확인
      const canScrollLeft = container.scrollLeft > 0;
      
      // 오른쪽으로 스크롤 가능 여부 확인
      const canScrollRight = container.scrollWidth > container.clientWidth + container.scrollLeft;
      
      setVideoScrollState({
        canScrollLeft,
        canScrollRight
      });
    }
  };
  
  // Add useEffect to add hide-scrollbar styles
  useEffect(() => {
    // 스타일시트에 스크롤바를 숨기는 클래스 추가
    const style = document.createElement('style');
    style.textContent = `
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      
      /* 단순하게 모든 가상요소 제거 */
      .tab-container::before,
      .tab-container::after {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add useEffect to monitor video container scroll (기존 것 제거)
  useEffect(() => {
    const videoContainer = videosContainerRef.current;
    if (videoContainer) {
      // 윈도우 크기 변경 시 스크롤 상태 업데이트
      window.addEventListener('resize', updateVideoScrollState);
      
      return () => {
        // 이벤트 리스너 제거
        window.removeEventListener('resize', updateVideoScrollState);
      };
    }
  }, []);

  // 비디오 컨테이너 스크롤 이벤트 감지
  useEffect(() => {
    const container = videosContainerRef.current;
    if (!container || !currentTVFilm?.videos?.length) return;
    
    // 터치 이벤트를 위한 로컬 변수
    let touchStartXPos = 0;
    
    const handleScroll = () => {
      // 스크롤 상태 업데이트
      updateVideoScrollState();
    };
    
    // 터치 이벤트 핸들러 추가
    const handleTouchStart = (e) => {
      touchStartXPos = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e) => {
      const touchEndXPos = e.changedTouches[0].clientX;
      
      const touchDiff = touchStartXPos - touchEndXPos;
      
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
    updateVideoScrollState();
    
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
  }, [currentTVFilm?.videos]);

  // 리뷰 스크롤을 위한 상태 변수들
  const [showReviewLeftArrow, setShowReviewLeftArrow] = useState(false);
  const [showReviewRightArrow, setShowReviewRightArrow] = useState(true);

  // 리뷰 컨테이너 스크롤 이벤트 감지
  useEffect(() => {
    const container = reviewsContainerRef.current;
    if (!container || !currentTVFilm?.reviews?.length) return;
    
    const handleScroll = () => {
      // 왼쪽 화살표 표시 여부 (스크롤 위치가 0보다 크면 표시)
      setShowReviewLeftArrow(container.scrollLeft > 10);
      
      // 오른쪽 화살표 표시 여부 (스크롤이 끝에 도달하지 않았으면 표시)
      const isAtEnd = Math.abs(
        (container.scrollWidth - container.clientWidth) - container.scrollLeft
      ) < 10;
      
      setShowReviewRightArrow(!isAtEnd);
    };
    
    // 초기 상태 설정
    handleScroll();
    
    // 스크롤 이벤트 리스너 등록
    container.addEventListener('scroll', handleScroll);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [currentTVFilm?.reviews]);

  // 배우 클릭 핸들러 - 배우 이름으로 검색 (CastSection 컴포넌트에서 사용)
  const handleActorClick = (actorName, e) => {
    if (!actorName) return;
    
    // 배우 이름을 URL 인코딩하여 검색 페이지로 이동
    const encodedName = encodeURIComponent(actorName);
    router.push(`/search?q=${encodedName}&type=actor`);
  };

  // Add early return for loading and error states
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loading />
        </div>
      </MainLayout>
    );
  }

  if (error || !currentTVFilm) {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <ErrorMessage message={error?.message || "영화/TV 프로그램을 찾을 수 없습니다."} />
          <button
            onClick={() => router.push('/tvfilm')}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </MainLayout>
    );
  }
  
  // Now we can safely use currentTVFilm because we've checked it's not null

  return (
    <MainLayout>
      <Seo
        title={currentTVFilm.title || "TV/Film Details"}
        description={currentTVFilm.summary || ""}
        image={currentTVFilm.coverImage || ""}
      />
      
      <div className="min-h-screen text-gray-800">
        {/* Hero Section - Modern Design with Glassmorphism */}
        <div className="relative flex flex-col h-auto w-full hidden sm:flex">
          {/* Background Image with Enhanced Overlay */}
          <div className="relative w-full h-[280px] sm:h-[350px] md:h-[450px] overflow-hidden">
              <div className="relative w-full h-full">
              {renderImage(currentTVFilm.bannerImage || currentTVFilm.coverImage, currentTVFilm.title, "object-cover object-top", 0, 0, true)}
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
                  {renderImage(currentTVFilm.coverImage, currentTVFilm.title, "object-cover", 0, 0, true)}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                </div>
                
                {/* Mobile poster (smaller and floating at top left) */}
                <div className="sm:hidden relative float-left w-[120px] h-[180px] mr-4 mb-4 rounded-lg overflow-hidden shadow-xl flex-shrink-0 border-2 border-white/10">
                  {renderImage(currentTVFilm.coverImage, currentTVFilm.title, "object-cover", 0, 0, true)}
                </div>
                
                {/* Content - Text details with improved typography */}
                <div className="flex-1 sm:pt-2">
                  {/* Category tag */}
                  <div className="mb-3 sm:mb-4 flex space-x-2">
                    <span className="px-3 py-1 backdrop-blur-sm rounded-full text-xs font-medium inline-flex items-center" style={{ backgroundColor: 'rgba(35, 60, 250, 0.3)', color: '#93b4ff' }}>
                      <Film className="w-3 h-3 mr-1" />
                      {currentTVFilm.category || "Movie"}
                    </span>
                    {currentTVFilm.releaseDate && (
                      <span className="px-3 py-1 bg-white/10 text-white/80 backdrop-blur-sm rounded-full text-xs font-medium inline-flex items-center">
                        <Calendar className="w-3 h-3 mr-1" style={{ color: '#93b4ff' }} />
                        {formatDate(currentTVFilm.releaseDate) || "2023"}
                      </span>
                    )}
                  </div>
                  
                  {/* Title with enhanced typography */}
                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2 text-white leading-tight">
                    {currentTVFilm.title}
                  </h1>
                  
                  {/* Original title with improved styling */}
                  <div className="text-white/80 text-sm sm:text-lg mb-4 sm:mb-6">
                    {currentTVFilm.originalTitle && currentTVFilm.originalTitle !== currentTVFilm.title && 
                      <span className="font-medium">{currentTVFilm.originalTitle}</span>
                    }
                  </div>
                  
                  {/* Metrics row with modern design */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center bg-black/40 backdrop-blur-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm mr-2 shadow-lg" style={{ backgroundColor: '#1d1a27' }}>
                        {currentTVFilm.reviewRating != null && currentTVFilm.reviewRating !== undefined && parseFloat(currentTVFilm.reviewRating) > 0
                          ? parseFloat(currentTVFilm.reviewRating) === 10
                            ? "10"
                            : parseFloat(currentTVFilm.reviewRating).toFixed(1)
                          : "-"
                        }
                      </div>
                      <span className="text-white/90 text-xs sm:text-sm">Rating</span>
                    </div>

                    {currentTVFilm.ageRating && (
                      <div className="flex items-center bg-black/40 backdrop-blur-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full">
                        <div className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-full text-white font-bold text-xs sm:text-sm mr-2 shadow-lg" style={{ backgroundColor: '#233cfa' }}>
                          {typeof currentTVFilm.ageRating === 'string' && currentTVFilm.ageRating.includes('+')
                            ? currentTVFilm.ageRating.split('+')[0]
                            : currentTVFilm.ageRating === 'Not Rated' || currentTVFilm.ageRating === 'Not Yet Rated'
                              ? "NR"
                              : currentTVFilm.ageRating === 'ALL' ? "All"
                              : typeof currentTVFilm.ageRating === 'string' && currentTVFilm.ageRating.includes(' - ')
                                ? currentTVFilm.ageRating.split(' - ')[0]
                                : currentTVFilm.ageRating || "15"
                          }
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white/90 text-xs sm:text-sm">Age</span>
                          {typeof currentTVFilm.ageRating === 'string' && currentTVFilm.ageRating.includes('+') && (
                            <span className="text-white/70 text-[10px] sm:text-xs">
                              {currentTVFilm.ageRating.includes('Teen') ? 'Teen' : 
                               currentTVFilm.ageRating.includes('older') ? 'and older' : ''}
                            </span>
                          )}
                          {(currentTVFilm.ageRating === 'Not Rated' || currentTVFilm.ageRating === 'Not Yet Rated') && (
                            <span className="text-white/70 text-[10px] sm:text-xs">Not Rated</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {currentTVFilm.runtime && (
                      <div className="flex items-center bg-black/40 backdrop-blur-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" style={{ color: '#93b4ff' }} />
                        <span className="text-white/90 text-xs sm:text-sm">{currentTVFilm.runtime || "2h 17min"}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons with enhanced design */}
                  <div className="flex mt-4 sm:mt-6">
                    <button
                      onClick={() => setShowTrailer(true)}
                      className="text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-full flex items-center font-medium text-sm sm:text-base shadow-lg hover:shadow-xl transition-all group transform hover:translate-y-[-2px]"
                      style={{ backgroundColor: '#233cfa' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d31cb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#233cfa'}
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 group-hover:animate-pulse" />
                      Watch Trailer
                    </button>
                    {currentTVFilm.genres && currentTVFilm.genres.length > 0 && (
                      <div className="ml-3 sm:ml-4 flex items-center">
                        <div className="hidden sm:flex flex-wrap gap-1 ml-1">
                          {currentTVFilm.genres.slice(0, 2).map((genre, index) => (
                            <span key={index} className="px-2.5 py-1 bg-white/10 text-white/80 backdrop-blur-sm rounded-full text-xs font-medium">
                              {genre}
                            </span>
                          ))}
                          {currentTVFilm.genres.length > 2 && (
                            <span className="px-2 py-1 text-white/70 text-xs">+{currentTVFilm.genres.length - 2}</span>
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
        
        {/* 모바일 전용 상단 정보 영역 */}
        <div className="sm:hidden pt-4 pb-2 px-4 bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
          {/* 첫 번째 트레일러 영상 섹션 */}
          {currentTVFilm.videos && currentTVFilm.videos.length > 0 && (
            <div className="mt-8 mb-4">
              <div className="relative rounded-2xl overflow-hidden shadow-xl border-2 border-white/50 bg-black">
                {/* 영상 썸네일 */}
                <div className="relative aspect-video">
                  {(() => {
                    const firstVideo = currentTVFilm.videos[0];
                    const videoId = getYoutubeIdFromUrl(firstVideo.url);
                    return videoId ? (
                      <Image
                        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                        alt={firstVideo.title || "Trailer"}
                        fill
                        className="object-cover"
                        unoptimized={true}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }}
                      />
                    ) : null;
                  })()}

                  {/* 그라데이션 오버레이 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

                  {/* 재생 버튼 */}
                  <button
                    onClick={() => {
                      const firstVideo = currentTVFilm.videos[0];
                      const videoId = getYoutubeIdFromUrl(firstVideo.url);
                      setSelectedVideoId(videoId);
                      setTrailerTitle(firstVideo.title || "Official Trailer");
                      setShowTrailer(true);
                    }}
                    className="absolute inset-0 flex items-center justify-center group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center transform opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 shadow-2xl">
                      <Play className="w-6 h-6 text-[#233cfa] ml-1" />
                    </div>
                  </button>

                  {/* 영상 제목 - 하단 */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-[#233cfa] flex items-center justify-center mr-2">
                        <Play className="w-3 h-3 text-white ml-0.5" />
                      </div>
                      <h4 className="text-white text-sm font-semibold line-clamp-1">
                        {currentTVFilm.videos[0].title || "Official Trailer"}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-white via-purple-50/20 to-pink-50/20 rounded-3xl overflow-hidden shadow-xl border border-purple-100/50 mb-4 relative">
            {/* 배경 장식 요소 */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-pink-200/30 to-purple-200/30 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-gradient-to-tr from-purple-200/30 to-pink-200/30 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              {/* 헤더 영역 - 개선된 디자인 */}
              <div className="pt-6 px-6 pb-5 border-b border-gradient-to-r from-purple-100/50 to-pink-100/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent leading-tight">
                      {currentTVFilm.title}
                    </h3>
                    {currentTVFilm.originalTitle && currentTVFilm.originalTitle !== currentTVFilm.title && (
                      <p className="text-sm text-gray-500 mt-1 italic">
                        {currentTVFilm.originalTitle}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center px-3 py-2 rounded-2xl shadow-lg" style={{ backgroundColor: '#233cfa' }}>
                    <div className="h-7 w-7 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm mr-2 shadow-md">
                      {currentTVFilm.reviewRating != null && currentTVFilm.reviewRating !== undefined && parseFloat(currentTVFilm.reviewRating) > 0
                        ? parseFloat(currentTVFilm.reviewRating) === 10
                          ? "10"
                          : parseFloat(currentTVFilm.reviewRating).toFixed(1)
                        : "NR"
                      }
                    </div>
                    <span className="text-white text-sm font-medium">Rating</span>
                  </div>
                </div>
              </div>
              
              {/* 포스터와 기본 정보 - 개선된 레이아웃 */}
              <div className="p-6">
                <div className="flex items-start">
                  {/* 포스터 섬네일 - 더 현대적인 디자인 */}
                  <div className="relative w-[110px] h-[165px] flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/50 backdrop-blur-sm">
                    {currentTVFilm && currentTVFilm.coverImage && renderImage(currentTVFilm.coverImage, currentTVFilm.title || "Movie Image", "object-cover", 0, 0, true)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  
                  {/* 기본 정보 - 개선된 스타일링 */}
                  <div className="ml-5 flex flex-col flex-1">
                    <div className="space-y-2">
                      {currentTVFilm.runtime && (
                        <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-white/50">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 shadow-sm" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                            <img src="/images/icons8-clock-24.png" alt="Runtime" className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{currentTVFilm.runtime}</span>
                        </div>
                      )}

                      {currentTVFilm.releaseDate && (
                        <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-white/50">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 shadow-sm" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                            <img src="/images/icons8-calendar-94.png" alt="Release Date" className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{formatDate(currentTVFilm.releaseDate)}</span>
                        </div>
                      )}

                      {currentTVFilm.ageRating && (
                        <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-white/50">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 shadow-sm" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                            <img src="/images/icons8-warning-shield-94.png" alt="Age Rating" className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {currentTVFilm.ageRating === '15' || currentTVFilm.ageRating?.includes('15+') ? '15 and over' :
                             currentTVFilm.ageRating === '12' || currentTVFilm.ageRating?.includes('12+') ? '12 and over' :
                             currentTVFilm.ageRating === '18' || currentTVFilm.ageRating?.includes('18+') ? 'Adults only' :
                             currentTVFilm.ageRating === 'ALL' ? 'All ages' :
                             currentTVFilm.ageRating === 'Not Rated' ? 'Not Rated' :
                             currentTVFilm.ageRating || 'Not rated'}
                          </span>
                        </div>
                      )}

                      {currentTVFilm.director && (
                        <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-white/50">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 shadow-sm" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                            <img src="/images/icons8-documentary-94.png" alt="Director" className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{currentTVFilm.director}</span>
                        </div>
                      )}

                      {currentTVFilm.country && (
                        <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm border border-white/50">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 shadow-sm" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                            <img src="/images/icons8-globe-94.png" alt="Country" className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{currentTVFilm.country || "South Korea"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 장르 태그들 - 하단에 1열로 배치 */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {(currentTVFilm && currentTVFilm.genres && Array.isArray(currentTVFilm.genres) && currentTVFilm.genres.length > 0) ? (
                    currentTVFilm.genres.map((genre, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-colors cursor-pointer"
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
                        onTouchStart={(e) => {
                          e.currentTarget.style.backgroundColor = '#009efc';
                          e.currentTarget.style.color = 'white';
                        }}
                        onTouchEnd={(e) => {
                          setTimeout(() => {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.style.color = '#1f2937';
                          }, 200);
                        }}
                      >
                        {genre}
                      </span>
                    ))
                  ) : (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 rounded-full text-xs font-semibold">{currentTVFilm.category || "Movie"}</span>
                  )}
                </div>
              </div>

              {/* 리뷰 평가 점수 (모���일 전용) */}
              {currentTVFilm.reviewCount > 0 && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-1">
                  <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                    <img src="/images/icons8-star-94.png" alt="Star" className="w-4 h-4 mr-1.5" />
                    Viewer Ratings
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Acting/Cast</span>
                      <div className="flex items-center">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(currentTVFilm.reviewStats?.castRating || 8.0) * 10}%`, backgroundColor: '#233cfa' }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-800 w-8 text-right">{currentTVFilm.reviewStats?.castRating || 8.0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Story</span>
                      <div className="flex items-center">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(currentTVFilm.reviewStats?.storyRating || 8.0) * 10}%`, backgroundColor: '#233cfa' }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-800 w-8 text-right">{currentTVFilm.reviewStats?.storyRating || 8.0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Music</span>
                      <div className="flex items-center">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(currentTVFilm.reviewStats?.musicRating || 7.5) * 10}%`, backgroundColor: '#233cfa' }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-800 w-8 text-right">{currentTVFilm.reviewStats?.musicRating || 7.5}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Rewatch Value</span>
                      <div className="flex items-center">
                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(currentTVFilm.reviewStats?.rewatchRating || 7.0) * 10}%`, backgroundColor: '#233cfa' }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-800 w-8 text-right">{currentTVFilm.reviewStats?.rewatchRating || 7.0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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
              
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                <h3 className="text-white text-lg font-medium">{currentTVFilm.title}</h3>
                <p className="text-white/70 text-sm">{trailerTitle}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 리뷰 모달 */}
        {showReviewModal && selectedReview && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeReviewModal}>
            {/* 이전 리뷰 버튼 - 모달 컨테이너 바깥으로 이동 */}
            {currentTVFilm?.reviews?.length > 1 && (
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
            {currentTVFilm?.reviews?.length > 1 && (
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
                
                <div className="flex items-start sm:items-center mb-3 sm:mb-4 gap-2.5 sm:gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg" style={{ background: 'linear-gradient(to bottom right, #233cfa, #009efc)' }}>
                    {selectedReview.rating}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-gray-900 font-bold text-base sm:text-lg truncate pr-8">{selectedReview.title}</h3>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                      <span className="text-xs sm:text-sm text-gray-600 font-medium truncate max-w-[120px] sm:max-w-none">{selectedReview.username || selectedReview.authorName || 'Anonymous'}</span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        {selectedReview.reviewDate || new Date(selectedReview.createdAt || Date.now()).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
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
                    <span className="text-xs sm:text-sm text-gray-600">Acting/Cast</span>
                    <span className="text-xs sm:text-sm font-medium" style={{ color: '#233cfa' }}>
                      {selectedReview.castRating ? selectedReview.castRating : (selectedReview.rating * 0.9).toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-xs sm:text-sm text-gray-600">Story</span>
                    <span className="text-xs sm:text-sm font-medium" style={{ color: '#233cfa' }}>
                      {selectedReview.storyRating ? selectedReview.storyRating : (selectedReview.rating * 0.95).toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-xs sm:text-sm text-gray-600">Music</span>
                    <span className="text-xs sm:text-sm font-medium" style={{ color: '#233cfa' }}>
                      {selectedReview.musicRating ? selectedReview.musicRating : (selectedReview.rating * 0.9).toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-xs sm:text-sm text-gray-600">Rewatch Value</span>
                    <span className="text-xs sm:text-sm font-medium" style={{ color: '#233cfa' }}>
                      {selectedReview.rewatchValue ? selectedReview.rewatchValue : (selectedReview.rating * 0.85).toFixed(1)}/10
                    </span>
                  </div>
                </div>
                
                {/* 리뷰 내용 */}
                <div className="prose prose-sm sm:prose max-w-none mb-3 sm:mb-4">
                  <div className="text-gray-700 text-sm sm:text-base whitespace-pre-line">
                    {selectedReview.reviewText?.replace(/^This review may contain spoilers\s+/i, '') || 
                     selectedReview.content || 
                     "No detailed review provided."}
                  </div>
                </div>
                
                {/* 태그 */}
                {selectedReview.tags && selectedReview.tags.length > 0 && (
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                    {selectedReview.tags.map((tag, index) => (
                      <span key={index} className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)', color: '#233cfa' }}>
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
        
        {/* Tab Navigation - Modernized */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
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
                style={activeSection === 'watch' ? { color: '#233cfa' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'watch' ? '' : 'text-gray-400 group-hover:text-gray-600'}`}
                  style={activeSection === 'watch' ? { color: '#233cfa' } : {}}>
                  <Eye className="w-4 h-4 mr-2" />
                  <span>Where to Watch</span>
                </div>
                {activeSection === 'watch' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#233cfa' }}></div>
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
                style={activeSection === 'synopsis' ? { color: '#233cfa' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'synopsis' ? '' : 'text-gray-400 group-hover:text-gray-600'}`}
                  style={activeSection === 'synopsis' ? { color: '#233cfa' } : {}}>
                  <Info className="w-4 h-4 mr-2" />
                  <span>Synopsis</span>
                </div>
                {activeSection === 'synopsis' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#233cfa' }}></div>
                )}
              </a>
              <a
                href="#tvfilm-trailers"
                onClick={(e) => { e.preventDefault(); setActiveSection('trailers'); document.getElementById('tvfilm-trailers').scrollIntoView({ behavior: 'smooth' }); }}
                className={`group relative flex items-center px-5 py-4 text-sm transition-all whitespace-nowrap ${
                  activeSection === 'trailers'
                    ? 'font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                style={activeSection === 'trailers' ? { color: '#233cfa' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'trailers' ? '' : 'text-gray-400 group-hover:text-gray-600'}`}
                  style={activeSection === 'trailers' ? { color: '#233cfa' } : {}}>
                  <Play className="w-4 h-4 mr-2" />
                  <span>Trailers</span>
                </div>
                {activeSection === 'trailers' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#233cfa' }}></div>
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
                style={activeSection === 'cast' ? { color: '#233cfa' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'cast' ? '' : 'text-gray-400 group-hover:text-gray-600'}`}
                  style={activeSection === 'cast' ? { color: '#233cfa' } : {}}>
                  <User className="w-4 h-4 mr-2" />
                  <span>Cast</span>
                </div>
                {activeSection === 'cast' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#233cfa' }}></div>
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
                style={activeSection === 'reviews' ? { color: '#233cfa' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'reviews' ? '' : 'text-gray-400 group-hover:text-gray-600'}`}
                  style={activeSection === 'reviews' ? { color: '#233cfa' } : {}}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  <span>Reviews</span>
                </div>
                {activeSection === 'reviews' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#233cfa' }}></div>
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
                style={activeSection === 'similar' ? { color: '#233cfa' } : {}}
              >
                <div className={`flex items-center justify-center ${activeSection === 'similar' ? '' : 'text-gray-400 group-hover:text-gray-600'}`}
                  style={activeSection === 'similar' ? { color: '#233cfa' } : {}}>
                  <ListFilter className="w-4 h-4 mr-2" />
                  <span>Similar</span>
                </div>
                {activeSection === 'similar' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: '#233cfa' }}></div>
                )}
              </a>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="bg-white pt-10">
          <div className="container mx-auto px-4 lg:px-8 py-10">
            <div className="flex flex-col lg:flex-row gap-12">
              {/* Left Column - with flex ordering for mobile */}
              <div className="lg:w-2/3 flex flex-col">
                {/* Where to Watch section */}
                <div id="watch" className="mb-12 scroll-mt-24 order-1">
                  <h2 className="text-2xl font-bold mb-5 text-gray-900 py-1">
                    Where to Watch
                  </h2>
                  
                  {/* Streaming services list */}
                  <div className="space-y-4">
                    {filteredWatchProviders && filteredWatchProviders.length > 0 ? (
                      filteredWatchProviders.map((provider, index) => (
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
                        {currentTVFilm.summary || "Detective Seo Do-cheol and his violent crimes unit combat criminals without family backing or connections. One day, a professor's death is linked to previous murder cases, causing nationwide uproar about a serial killer. As the detectives begin tracking down clues, the serial killer taunts the public by releasing a preview of his next victim online. The violent crimes unit deploys rookie detective Park Sun-woo, who impresses Do-cheol with his sense of justice. As the investigation progresses, the case takes an unexpected turn..."}
                      </p>
                    </div>
                    
                    {/* Read more 기능 제거 */}
                  </div>
                </div>
                
                {/* User Reviews Section - Enhanced Modern Design */}
                <div id="reviews" className="mb-6 scroll-mt-24 order-5">
                  <div className="flex items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 py-1">
                      Reviews
                      <span className="ml-2 text-sm font-normal text-gray-500 align-middle">{currentTVFilm.reviewCount || '0'}</span>
                    </h2>
                  </div>

                  <div className="bg-white rounded-xl overflow-hidden">
                    {/* 평점 가로형 레이아웃 - 상단 배치 */}
                    <div className="p-4 sm:p-6 border-b border-gray-50">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        {/* 메인 평점 표시 */}
                        <div className="flex items-center">
                          <div className="bg-white p-4 sm:p-5 rounded-full shadow-lg relative" style={{ border: '1px solid rgba(35, 60, 250, 0.2)' }}>
                            <div className="text-3xl sm:text-4xl md:text-5xl font-bold" style={{ background: 'linear-gradient(to right, #233cfa, #009efc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                              {currentTVFilm.reviewRating ? parseFloat(currentTVFilm.reviewRating).toFixed(1) : '0.0'}
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
                                      star <= Math.round(parseFloat(currentTVFilm.reviewRating || 0)/2)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="ml-2 text-sm text-gray-600 font-medium">({currentTVFilm.reviewCount || 0} reviews)</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 평점 분포 - 모바일에서는 세로형, 데스크탑에서는 가로형 */}
                        <div className="flex-1 mt-2 md:mt-0">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rating Distribution</h4>
                          
                          {/* 데스크탑용 가로형 레이아웃 - 모바일에서는 숨김 */}
                          <div className="hidden md:grid grid-cols-5 gap-2">
                            {(currentTVFilm.ratingDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).slice(5).reverse().map((count, index) => {
                              // Calculate percentage for ratings 6-10
                              const ratingNumber = 10 - index;
                              const percentage = currentTVFilm.reviewCount && currentTVFilm.reviewCount > 0
                                ? Math.round((count / currentTVFilm.reviewCount) * 100)
                                : 0;
                              
                              
                              return (
                                <div key={ratingNumber} className="flex flex-col items-center group">
                                  <span className="text-xs font-medium text-gray-600 mb-1">{ratingNumber}</span>
                                  <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                                      style={{ width: `${percentage}%`, backgroundColor: '#233cfa' }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium text-gray-500 mt-1">{percentage}%</span>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* 모바일용 세로형 레이아웃 - 데스크탑에서는 숨김 */}
                          <div className="md:hidden space-y-1">
                            {(currentTVFilm.ratingDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).slice(5).reverse().map((count, index) => {
                              // Calculate percentage for ratings 6-10
                              const ratingNumber = 10 - index;
                              const percentage = currentTVFilm.reviewCount && currentTVFilm.reviewCount > 0
                                ? Math.round((count / currentTVFilm.reviewCount) * 100)
                                : 0;
                              
                              return (
                                <div key={ratingNumber} className="flex items-center group">
                                  <span className="w-6 text-xs font-medium text-gray-600 text-center">{ratingNumber}</span>
                                  <div className="flex-grow mx-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                                      style={{ width: `${percentage}%`, backgroundColor: '#233cfa' }}
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
                          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" style={{ color: '#233cfa' }} />
                          Featured Reviews
                        </h3>
                      </div>
                      
                      {/* 가로 스크롤 리뷰 컨테이너 */}
                      {currentTVFilm.reviews && currentTVFilm.reviews.length > 0 ? (
                        <div className="relative">
                          <div className="overflow-x-auto hide-scrollbar pb-3" ref={reviewsContainerRef}>
                            <div className="flex space-x-2 md:space-x-4" style={{ 
                              minWidth: 'min-content',
                              scrollSnapType: 'x mandatory',
                              WebkitOverflowScrolling: 'touch'
                            }}>
                              {currentTVFilm.reviews
                                .filter(review => review.approved !== false) // undefined나 true인 경우 모두 포함
                                // 날짜 기준으로 정렬 (최신순)
                                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                                .map((review, index) => {
                                  // 날짜 계산 함수 - n일 전 형식으로 변환
                                  const getTimeAgo = (dateString) => {
                                    const today = new Date();
                                    const reviewDate = new Date(dateString);
                                    const diffTime = Math.abs(today - reviewDate);
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    return `${diffDays} days ago`;
                                  };
                                  
                                  return (
                                    <div
                                      key={review._id || review.reviewId || index}
                                      className="w-[calc(100vw-56px)] max-w-[260px] sm:w-[280px] md:w-[320px] flex-shrink-0 bg-white border rounded-xl p-2.5 sm:p-3 hover:shadow-md transition-all duration-300 group relative flex flex-col cursor-pointer"
                                      onClick={() => openReviewModal(review)}
                                      style={{ scrollSnapAlign: 'start', borderColor: '#e5e7eb' }}
                                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(35, 60, 250, 0.3)'}
                                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                    >
                                      {/* Decorative accent */}
                                      <div className="absolute top-0 right-0 w-16 h-16 rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to bottom left, rgba(35, 60, 250, 0.1), transparent)' }}></div>

                                      <div className="flex justify-between items-start mb-1.5 sm:mb-2 relative">
                                        <div className="flex items-center">
                                          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm group-hover:shadow-md transition-all duration-300" style={{ background: 'linear-gradient(to bottom right, #233cfa, #009efc)' }}>
                                            {review.rating}
                                          </div>
                                          <div className="ml-2">
                                            <div className="text-xs sm:text-sm font-semibold text-gray-800 transition-colors duration-300 truncate max-w-[120px] sm:max-w-[160px] group-hover:text-[#009efc]">{review.username || review.authorName || 'Anonymous'}</div>
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
                                          {getTimeAgo(review.createdAt)}
                                        </span>
                                      </div>
                                      
                                      <h4 className="font-bold text-gray-900 text-xs sm:text-sm mb-1 sm:mb-1.5 line-clamp-1 transition-colors duration-300 group-hover:text-[#009efc]">{review.title || 'First Impressions'}</h4>
                                      <p className="text-gray-600 text-xs sm:text-sm line-clamp-3 group-hover:text-gray-700 transition-colors duration-300 flex-grow">{review.reviewText?.replace(/\s{2,}/g, ' ').replace(/^This review may contain spoilers\s+/i, '') || review.content}</p>
                                      
                                      <div className="mt-2 flex justify-between items-center">
                                        <div></div>
                                        <span className="text-[10px] sm:text-xs font-medium flex items-center group-hover:opacity-100 transition-opacity duration-300" style={{ color: '#233cfa' }}
                                          onMouseEnter={(e) => e.currentTarget.style.color = '#009efc'}
                                          onMouseLeave={(e) => e.currentTarget.style.color = '#233cfa'}>
                                          Read more
                                          <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5" />
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })
                              }
                            </div>
                          </div>
                          
                          {/* 스크롤 네비게이션 버튼 */}
                          {showReviewRightArrow && (
                            <div className="absolute top-1/2 -right-2 sm:-right-4 transform -translate-y-1/2 z-10">
                              <button 
                                onClick={() => scrollReviews('right')}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-pink-500 hover:border-pink-200 transition-all group"
                              >
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          )}
                          
                          {showReviewLeftArrow && (
                            <div className="absolute top-1/2 -left-2 sm:-left-4 transform -translate-y-1/2 z-10">
                              <button 
                                onClick={() => scrollReviews('left')}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-pink-500 hover:border-pink-200 transition-all group"
                              >
                                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 rotate-180 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl p-8 text-center border border-gray-100" style={{ boxShadow: 'none' }}>
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Reviews Yet</h3>
                          <p className="text-gray-500 max-w-md mx-auto">
                            No reviews available for this title.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Trailers Section - 예고편 */}
                <div id="tvfilm-trailers" className="mb-12 scroll-mt-24 order-3">
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
                      {currentTVFilm.videos && currentTVFilm.videos.length > 0 ? (
                        <>
                          {currentTVFilm.videos.map((video, index) => {
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
                                    <div
                                      className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white/20 backdrop-blur-md group-hover:backdrop-blur-none border border-white/30 flex items-center justify-center transform group-hover:scale-110 transition-all duration-300"
                                      style={{ transition: 'all 0.3s' }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#233cfa'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                                    >
                                      <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-0.5" />
                                    </div>
                                  </button>
                                </div>

                                {/* 타이틀을 썸네일 아래에 추가 */}
                                {video.title && (
                                  <div className="p-3">
                                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 transition-colors group-hover:text-[#009efc]">
                                      {video.title || "Official Trailer"}
                                    </h3>
                                  </div>
                                )}
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
                    
                    {/* 스크롤 네비게이션 버튼 */}
                    {currentTVFilm.videos && currentTVFilm.videos.length > 1 && (
                      <>
                        <div className={`absolute top-1/2 -right-2 sm:-right-4 transform -translate-y-1/2 ${
                          videoScrollState.canScrollRight ? 'visible' : 'invisible'
                        }`}>
                          <button
                            onClick={() => scrollVideos('right')}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg border flex items-center justify-center transition-all group"
                            style={{ borderColor: '#e5e7eb', color: '#4b5563' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#233cfa';
                              e.currentTarget.style.borderColor = '#233cfa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#4b5563';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                          >
                            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>

                        <div className={`absolute top-1/2 -left-2 sm:-left-4 transform -translate-y-1/2 ${
                          videoScrollState.canScrollLeft ? 'visible' : 'invisible'
                        }`}>
                          <button
                            onClick={() => scrollVideos('left')}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white shadow-lg border flex items-center justify-center transition-all group"
                            style={{ borderColor: '#e5e7eb', color: '#4b5563' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#233cfa';
                              e.currentTarget.style.borderColor = '#233cfa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#4b5563';
                              e.currentTarget.style.borderColor = '#e5e7eb';
                            }}
                          >
                            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 rotate-180 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
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
                <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 sticky top-24 max-h-[700px] overflow-y-auto">
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
                      {renderImage(currentTVFilm.coverImage, currentTVFilm.title, "object-cover", 0, 0, true)}
                    </div>
                    
                    {/* Quick info beside poster */}
                    <div className="ml-4 flex flex-col py-1 flex-1">
                      <h3 className="font-bold text-base text-gray-800 mb-2 leading-tight line-clamp-2">{currentTVFilm.title}</h3>
                      
                      {/* Rating */}
                      <div className="flex items-center mb-3 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 shadow-md" style={{ backgroundColor: '#1d1a27' }}>
                          {currentTVFilm.reviewRating != null && currentTVFilm.reviewRating !== undefined && parseFloat(currentTVFilm.reviewRating) > 0
                            ? parseFloat(currentTVFilm.reviewRating) === 10
                              ? "10"
                              : parseFloat(currentTVFilm.reviewRating).toFixed(1)
                            : "NR"
                          }
                        </div>
                        <span className="text-gray-700 font-medium">Rating</span>
                      </div>

                      {/* Genres */}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(currentTVFilm.genres && currentTVFilm.genres.length > 0) ? (
                          currentTVFilm.genres.map((genre, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                              style={{
                                backgroundColor: '#f3f4f6',
                                color: '#1f2937',
                                borderColor: '#e5e7eb',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#009efc';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.borderColor = '#009efc';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.color = '#1f2937';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                              }}
                            >
                              {genre}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-700 text-xs">{currentTVFilm.category || "Movie"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Like/Dislike buttons - 삭제 */}
                  
                  {/* Additional Movie Information */}
                  <div className="border-t border-gray-100">
                    <div className="p-5 space-y-3">
                      {/* Director */}
                      {currentTVFilm.director && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                              <img src="/images/icons8-documentary-94.png" alt="Director" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm text-gray-500 font-medium">Director</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-900 font-semibold text-sm">
                              {currentTVFilm.director}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Runtime */}
                      {currentTVFilm.runtime && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                              <img src="/images/icons8-clock-24.png" alt="Runtime" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm text-gray-500 font-medium">Runtime</h4>
                          </div>
                          <span className="text-gray-900 font-semibold text-sm">{currentTVFilm.runtime}</span>
                        </div>
                      )}

                      {/* Age Rating */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                            <img src="/images/icons8-warning-shield-94.png" alt="Age Rating" className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm text-gray-500 font-medium">Age Rating</h4>
                        </div>
                        <span className="text-gray-900 font-semibold text-sm whitespace-nowrap">
                          {currentTVFilm.ageRating === '15' || currentTVFilm.ageRating?.includes('15+') ? '15 and over' :
                           currentTVFilm.ageRating === '12' || currentTVFilm.ageRating?.includes('12+') ? '12 and over' :
                           currentTVFilm.ageRating === '18' || currentTVFilm.ageRating?.includes('18+') ? 'Adults only' :
                           currentTVFilm.ageRating === 'ALL' ? 'All ages' :
                           currentTVFilm.ageRating === 'Not Rated' || currentTVFilm.ageRating === 'Not Yet Rated' ? 'Not Rated' :
                           currentTVFilm.ageRating || 'Not rated'}
                        </span>
                      </div>

                      {/* Production Country */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                            <img src="/images/icons8-globe-94.png" alt="Country" className="w-5 h-5" />
                          </div>
                          <h4 className="text-sm text-gray-500 font-medium">Country</h4>
                        </div>
                        <div className="flex items-center text-gray-900 font-semibold">
                          <span className="mr-1.5 text-sm">🇰🇷</span>
                          <span className="text-sm">{currentTVFilm.country || "South Korea"}</span>
                        </div>
                      </div>

                      {/* Release Date */}
                      {currentTVFilm.releaseDate && (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3" style={{ backgroundColor: 'rgba(35, 60, 250, 0.1)' }}>
                              <img src="/images/icons8-calendar-94.png" alt="Release Date" className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm text-gray-500 font-medium">Release Date</h4>
                          </div>
                          <span className="text-gray-900 font-semibold text-sm text-right break-words">
                            {formatDate(currentTVFilm.releaseDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 리뷰 평가 점수 - 리뷰 수가 있을 때만 표시 */}
                  {currentTVFilm.reviewCount > 0 && (
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
                                  style={{ width: `${(currentTVFilm.reviewStats?.castRating || 8.0) * 10}%`, backgroundColor: '#233cfa' }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-800 w-8 text-right">{currentTVFilm.reviewStats?.castRating || 8.0}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Story</span>
                            <div className="flex items-center">
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${(currentTVFilm.reviewStats?.storyRating || 8.0) * 10}%`, backgroundColor: '#233cfa' }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-800 w-8 text-right">{currentTVFilm.reviewStats?.storyRating || 8.0}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Music</span>
                            <div className="flex items-center">
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${(currentTVFilm.reviewStats?.musicRating || 7.5) * 10}%`, backgroundColor: '#233cfa' }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-800 w-8 text-right">{currentTVFilm.reviewStats?.musicRating || 7.5}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Rewatch Value</span>
                            <div className="flex items-center">
                              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${(currentTVFilm.reviewStats?.rewatchRating || 7.0) * 10}%`, backgroundColor: '#233cfa' }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-800 w-8 text-right">{currentTVFilm.reviewStats?.rewatchRating || 7.0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related News Section - 카드뉴스와 동일한 디자인 */}
        <div className="pt-0 pb-10 bg-transparent">
          <div className="container mx-auto px-4 lg:px-8">
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
                    <span className="text-sm font-semibold tracking-wider uppercase mb-1 block" style={{ color: '#233CFA' }}>Related Content</span>
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
                          sessionStorage.setItem('tvfilmDetailScrollPosition', scrollPosition.toString());
                          sessionStorage.setItem('isBackToTvfilm', 'true');
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
                      No news related to this movie is currently available.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// 데이터 가져오기
export async function getServerSideProps({ params, req, query, resolvedUrl }) {
  const { id } = params;
  
  try {
    // TV/Film 상세 정보 조회 - /api/dramas API 사용
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/dramas/${id}?view=true`);
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      console.error('TV/Film 데이터 조회 실패:', data.message);
      return {
        notFound: true
      };
    }
    
    const tvfilm = data.data;
    
    // 카테고리 검사는 일단 주석 처리 (테스트를 위해)
    // if (tvfilm.category !== 'movie') {
    //   console.error('잘못된 콘텐츠 타입:', tvfilm.category);
    //   return {
    //     notFound: true
    //   };
    // }
    
    // 관련 뉴스 가져오기
    const newsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/news/movie?limit=50`);
    const newsData = await newsRes.json();
    
    let relatedNews = [];
    try {
      // 뉴스 데이터가 있는 경우에만 필터링 수행
      relatedNews = newsData.success ? newsData.data.filter(item => {
        const filmTitle = tvfilm?.title?.toLowerCase() || '';
        
        // 영화 제목에서 주요 키워드 추출 (3글자 이상의 단어들)
        const titleKeywords = filmTitle
          .split(/\s+/)
          .filter(word => word.length >= 3)
          .map(word => word.toLowerCase());
        
        // 제목 매칭 (키워드 기반)
        const titleMatch = titleKeywords.length > 0 && 
          titleKeywords.some(keyword => 
            item?.title?.toLowerCase().includes(keyword)
          );
        
        // 요약 매칭 (키워드 기반)
        const summaryMatch = titleKeywords.length > 0 && 
          item?.summary && 
          titleKeywords.some(keyword => 
            item.summary.toLowerCase().includes(keyword)
          );
        
        // 내용 매칭 (키워드 기반)
        const contentMatch = titleKeywords.length > 0 && 
          item?.content && 
          titleKeywords.some(keyword => 
            item.content.toLowerCase().includes(keyword)
          );
        
        // 태그 매칭
        const tagMatch = Array.isArray(item?.tags) && (
          item.tags.includes(id) || 
          item.tags.includes(tvfilm.title) || 
          (titleKeywords.length > 0 && titleKeywords.some(keyword => 
            item.tags.some(tag => tag?.toLowerCase().includes(keyword))
          ))
        );
        
        // 출연진 이름 매칭
        const castMatch = Array.isArray(tvfilm.cast) && tvfilm.cast.some(actor => {
          if (!actor?.name) return false;
          const name = actor.name.toLowerCase();
          return (
            item?.title?.toLowerCase().includes(name) ||
            (item?.summary && item.summary.toLowerCase().includes(name)) ||
            (item?.content && item.content.toLowerCase().includes(name)) ||
            (Array.isArray(item?.tags) && item.tags.some(tag => tag?.toLowerCase().includes(name)))
          );
        });
        
        // 부제목 또는 장르 매칭
        const genreMatch = 
          (tvfilm.genres && Array.isArray(tvfilm.genres) && item?.content && 
           tvfilm.genres.some(genre => item.content.toLowerCase().includes(genre.toLowerCase()))) ||
          (tvfilm.genres && Array.isArray(tvfilm.genres) && item?.title && 
           tvfilm.genres.some(genre => item.title.toLowerCase().includes(genre.toLowerCase())));
        
        return titleMatch || summaryMatch || contentMatch || tagMatch || castMatch || genreMatch;
      }) : [];
      
      // 디버깅 로그 추가
      console.log('필터링 후 관련 뉴스 수:', relatedNews.length);
      
      // 관련 뉴스가 3개 미만인 경우 랭킹 뉴스 추가
      if (relatedNews.length < 3) {
        console.log('관련 뉴스가 3개 미만입니다. 랭킹 뉴스를 추가합니다.');
        
        // 랭킹 뉴스 가져오기
        const rankingNewsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/news?limit=30&sort=views&category=movie`);
        
        if (!rankingNewsRes.ok) {
          console.error('랭킹 뉴스 API 호출 실패:', rankingNewsRes.status, rankingNewsRes.statusText);
        }
        
        const rankingNewsData = await rankingNewsRes.json();
        console.log('랭킹 뉴스 API 응답:', rankingNewsData.success, '데이터 수:', rankingNewsData.data?.length || 0);
        
        if (rankingNewsData.success && Array.isArray(rankingNewsData.data)) {
          // 이미 포함된 뉴스 ID 목록 생성
          const existingNewsIds = relatedNews.map(news => news._id);
          console.log('기존 뉴스 ID 목록:', existingNewsIds);
          
          // 중복되지 않은 인기 뉴스만 필터링
          const filteredRankingNews = rankingNewsData.data.filter(
            rankingNews => !existingNewsIds.includes(rankingNews._id)
          );
          console.log('필터링된 랭킹 뉴스 수:', filteredRankingNews.length);
          
          // 필요한 만큼 랭킹 뉴스 추가 (총 6개까지)
          const neededCount = 6 - relatedNews.length;
          console.log('필요한 추가 뉴스 수:', neededCount);
          
          const additionalNews = filteredRankingNews.slice(0, neededCount);
          console.log('추가할 랭킹 뉴스 수:', additionalNews.length);
          
          // 관련 뉴스에 추가
          relatedNews = [...relatedNews, ...additionalNews];
          console.log('최종 뉴스 수:', relatedNews.length);
          
          // 여전히 뉴스가 3개 미만이면 일반 인기 뉴스도 가져오기
          if (relatedNews.length < 3) {
            console.log('영화 카테고리 뉴스로도 부족합니다. 일반 인기 뉴스를 추가합니다.');
            
            // 일반 인기 뉴스 가져오기
            const generalNewsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/news?limit=20&sort=views`);
            
            if (generalNewsRes.ok) {
              const generalNewsData = await generalNewsRes.json();
              
              if (generalNewsData.success && Array.isArray(generalNewsData.data)) {
                // 이미 포함된 뉴스 ID 목록 업데이트
                const updatedExistingIds = relatedNews.map(news => news._id);
                
                // 중복되지 않은 일반 인기 뉴스만 필터링
                const filteredGeneralNews = generalNewsData.data.filter(
                  news => !updatedExistingIds.includes(news._id)
                );
                
                // 필요한 만큼 일반 인기 뉴스 추가
                const stillNeededCount = 6 - relatedNews.length;
                const additionalGeneralNews = filteredGeneralNews.slice(0, stillNeededCount);
                
                // 관련 뉴스에 추가
                relatedNews = [...relatedNews, ...additionalGeneralNews];
                console.log('일반 인기 뉴스 추가 후 최종 뉴스 수:', relatedNews.length);
              }
            }
          }
        } else {
          console.error('랭킹 뉴스 데이터가 없거나 형식이 잘못됨');
        }
      }
      
      // 최대 6개까지만 표시
      relatedNews = relatedNews.slice(0, 6);
      console.log('최종 표시할 뉴스 수:', relatedNews.length);
    } catch (newsError) {
      console.error('관련 뉴스 로딩 오류:', newsError);
      // 뉴스 오류가 있어도 영화 페이지는 표시
    }
    
    return {
      props: {
        tvfilm,
        relatedNews
      }
    };
  } catch (error) {
    console.error('TV/Film 데이터 로딩 오류:', error);
    return {
      notFound: true
    };
  }
}
