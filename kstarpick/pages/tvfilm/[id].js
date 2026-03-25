import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
// PC layout sidebar components
import CommentTicker from '../../components/home/CommentTicker';
import TrendingNow from '../../components/home/TrendingNow';
import MoreNews from '../../components/MoreNews';

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

export default function TVFilmDetail({ tvfilm, relatedNews, recentComments, rankingNews }) {
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
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
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
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [mobileVisibleComments, setMobileVisibleComments] = useState(3);
  // 댓글 데이터 (SSR fallback)
  const [commentsData, setCommentsData] = useState(recentComments || []);
  // 리뷰 세부 평점
  const [castRating, setCastRating] = useState(0);
  const [storyRating, setStoryRating] = useState(0);
  const [musicRating, setMusicRating] = useState(0);
  const [rewatchRating, setRewatchRating] = useState(0);
  const [reviewSortMode, setReviewSortMode] = useState('recent');

  const sortReviews = (reviewsList, mode) => {
    if (!reviewsList) return [];
    const sorted = [...reviewsList];
    switch (mode) {
      case 'popular': return sorted.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
      case 'rated': return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default: return sorted.sort((a, b) => new Date(b.reviewDate || b.createdAt) - new Date(a.reviewDate || a.createdAt));
    }
  };

  const reviews = currentTVFilm?.reviews || [];

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

  const navigateToPage = useCallback((path) => {
    router.push(path);
  }, [router]);

  // 스크롤 복원은 _app.js의 pageScrollConfig에서 처리 (tvfilmDetailScrollPosition 키 사용)

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

  // 리뷰 세부 평점 계산
  useEffect(() => {
    if (!currentTVFilm) return;
    const reviewList = currentTVFilm.reviews || [];
    if (reviewList.length === 0) return;
    let validReviews = 0;
    let castTotal = 0, storyTotal = 0, musicTotal = 0, rewatchTotal = 0;
    reviewList.forEach((review, idx) => {
      if (review && review.rating) {
        validReviews++;
        const seed1 = ((idx * 13 + 7) % 20) / 100 + 0.9;
        const seed2 = ((idx * 17 + 3) % 20) / 100 + 0.9;
        const seed3 = ((idx * 23 + 11) % 20) / 100 + 0.9;
        const seed4 = ((idx * 29 + 5) % 40) / 100 + 0.7;
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
  }, [currentTVFilm]);

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

  const handleShare = () => setShowShareMenu(true);

  const getTVFilmShareUrl = () => `https://www.kstarpick.com/tvfilm/${currentTVFilm?.slug || currentTVFilm?._id}`;

  const handleShareFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getTVFilmShareUrl())}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareTwitter = () => {
    const title = currentTVFilm?.title || '';
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(getTVFilmShareUrl())}&text=${encodeURIComponent(title)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleCopyLink = () => {
    const url = getTVFilmShareUrl();
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
    <>
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
        
        {/* ============ MOBILE POSTER HERO ============ */}
        <div className="sm:hidden relative w-full" style={{ backgroundColor: '#111111' }}>
          {/* Background poster image - 625px tall, absolute */}
          <div className="absolute top-0 left-0 right-0" style={{ height: '625px' }}>
            {currentTVFilm.coverImage ? (
              <img
                src={currentTVFilm.coverImage}
                alt={currentTVFilm.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = "/images/placeholder-tvfilm.jpg"; }}
              />
            ) : (
              <div className="w-full h-full bg-gray-800" />
            )}
            {/* Top gradient overlay */}
            <div className="absolute top-0 left-0 right-0" style={{
              height: '173px',
              background: 'linear-gradient(0deg, rgba(17,17,17,0) 0%, rgba(17,17,17,0.6) 47%, rgba(17,17,17,1) 100%)'
            }} />
          </div>

          {/* Content overlay */}
          <div className="relative flex flex-col" style={{ paddingTop: '259px' }}>
            <div className="flex flex-col" style={{
              background: 'linear-gradient(180deg, rgba(17,17,17,0) 0%, rgba(17,17,17,1) 37%)',
              padding: '100px 16px 40px',
              gap: '24px',
            }}>
              {/* Title + Rating + Genre + Description */}
              <div className="flex flex-col" style={{ gap: '22px' }}>
                <div className="flex flex-col" style={{ gap: '11px' }}>
                  <div className="flex flex-col" style={{ gap: '5px' }}>
                    <h1 style={{
                      fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '22px',
                      lineHeight: '1.5em', letterSpacing: '-0.042em', textTransform: 'capitalize',
                      color: '#FFFFFF', margin: 0,
                    }}>
                      {currentTVFilm.title}
                    </h1>
                    <div className="flex items-center" style={{ gap: '7px' }}>
                      <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: '13px', lineHeight: '1.43em', color: '#FDC700' }}>
                        ★ {currentTVFilm.reviewRating && parseFloat(currentTVFilm.reviewRating) > 0 ? parseFloat(currentTVFilm.reviewRating).toFixed(1) : '-'}
                      </span>
                      <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400, fontSize: '13px', color: '#D1D5DC' }}>•</span>
                      <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.54em', color: '#AFB7C6' }}>
                        {currentTVFilm.genres && currentTVFilm.genres.length > 0 ? currentTVFilm.genres.join(' · ') : currentTVFilm.category || 'Movie'}
                      </span>
                    </div>
                  </div>
                  {currentTVFilm.description && (
                    <p className="line-clamp-2" style={{
                      fontFamily: 'Pretendard, sans-serif', fontWeight: 400, fontSize: '12px',
                      lineHeight: '1.54em', color: '#AFB7C6', margin: 0,
                    }}>
                      {currentTVFilm.description}
                    </p>
                  )}
                </div>

                {/* Buttons: Watch Trailer + Platform + More */}
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (currentTVFilm.videos && currentTVFilm.videos.length > 0) {
                        const firstVideo = currentTVFilm.videos[0];
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
                      width: '140px', padding: '10px 14px', backgroundColor: '#FFFFFF',
                      borderRadius: '4px', border: 'none', gap: '2px',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 3L20 12L6 21V3Z" fill="#111111" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', letterSpacing: '0.008em', color: '#111111' }}>Watch Trailer</span>
                  </button>
                  {currentTVFilm.whereToWatch && currentTVFilm.whereToWatch.length > 0 && (() => {
                    const platformName = currentTVFilm.whereToWatch[0]?.name || '';
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
                          width: '140px', padding: '10px 14px', backgroundColor: '#101010',
                          border: '1px solid #737373', borderRadius: '4px', gap: '2px',
                        }}
                        onClick={() => {
                          const link = currentTVFilm.whereToWatch[0]?.link;
                          if (link) { window.open(link, '_blank'); }
                        }}
                      >
                        {logo && (
                          <div style={{ flexShrink: 0, backgroundImage: `url(${logo.src})`, backgroundRepeat: 'no-repeat', ...logo.style }} />
                        )}
                        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px', letterSpacing: '0.008em', color: '#FFFFFF' }}>
                          {platformName}
                        </span>
                      </button>
                    );
                  })()}
                  <button onClick={handleShare} className="flex items-center justify-center cursor-pointer"
                    style={{ width: '36px', height: '36px', borderRadius: '18px', backgroundColor: 'transparent', border: 'none' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="4" r="1.5" fill="#FFFFFF"/>
                      <circle cx="10" cy="10" r="1.5" fill="#FFFFFF"/>
                      <circle cx="10" cy="16" r="1.5" fill="#FFFFFF"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Trailer Video Thumbnail */}
              {currentTVFilm.videos && currentTVFilm.videos.length > 0 && (() => {
                const firstVideo = currentTVFilm.videos[0];
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
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }}
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,11,18,1) 0%, rgba(8,11,18,0) 60%)' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center justify-center" style={{
                        width: '54px', height: '54px', borderRadius: '50%',
                        backgroundColor: 'rgba(196, 196, 196, 0.6)', border: '1.25px solid #C2C2C2',
                      }}>
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute" style={{
                      bottom: '12px', right: '12px', backgroundColor: 'rgba(38, 38, 42, 0.6)',
                      backdropFilter: 'blur(1.5px)', borderRadius: '60px', padding: '4px 12px',
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
            fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '20px',
            lineHeight: '1.4em', letterSpacing: '-0.022em', color: '#000000', marginBottom: '16px',
          }}>Synopsis</h2>
          <div className="relative">
            <div style={{ height: synopsisExpanded ? 'auto' : '260px', overflow: 'hidden', position: 'relative' }}>
              <p style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '16px',
                lineHeight: '1.75em', color: '#333333', margin: 0,
              }}>
                {currentTVFilm.description || currentTVFilm.synopsis || 'No synopsis available.'}
              </p>
            </div>
            {!synopsisExpanded && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '228px',
                background: 'linear-gradient(180deg, transparent 0%, #FFFFFF 100%)', pointerEvents: 'none',
              }} />
            )}
          </div>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => setSynopsisExpanded(!synopsisExpanded)} style={{
              borderRadius: '9999px', border: '1px solid #D5D8DF', padding: '16px 150px',
              fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px',
              color: '#2D3138', backgroundColor: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {synopsisExpanded ? 'See less' : 'See more'}
            </button>
          </div>
        </div>

        {/* Reviews Section - Mobile */}
        <div className="sm:hidden" style={{ paddingBottom: '12px', backgroundColor: '#FFFFFF' }}>
          <div style={{ padding: '24px 16px 16px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.333em', letterSpacing: '-0.017em', color: '#000000' }}>
              Reviews
            </span>
          </div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex items-center justify-between" style={{ gap: '16px' }}>
              <div className="flex flex-col items-center" style={{ gap: '10px', padding: '0 20px' }}>
                <div style={{
                  width: '70px', height: '70px', borderRadius: '50%',
                  background: `conic-gradient(#F0B100 ${((currentTVFilm?.reviewRating || 7.4) / 10) * 100}%, #FFFFFF ${((currentTVFilm?.reviewRating || 7.4) / 10) * 100}%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: '58px', height: '58px', borderRadius: '50%', backgroundColor: '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '2em', color: '#000000' }}>
                      {currentTVFilm?.reviewRating ? parseFloat(currentTVFilm.reviewRating).toFixed(1) : '0.0'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: '1.6px' }}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const rating = (currentTVFilm?.reviewRating || 0) / 2;
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
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.333em', color: '#99A1AF' }}>
                  {reviews.length || 0} reviews
                </span>
              </div>
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
          <div style={{ padding: '16px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.333em', letterSpacing: '-0.017em', color: '#000000' }}>
              Comments <span style={{ color: '#2B7FFF' }}>{reviews.length || 0}</span>
            </span>
          </div>
          {reviews.length > 0 ? sortReviews(reviews, reviewSortMode).slice(0, mobileVisibleComments).map((review, index) => (
            <div key={review._id || index} onClick={() => openReviewModal(review)} className="cursor-pointer" style={{
              padding: '20px 16px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E9EBEF',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E9EBEF',
                    border: '1px solid #E9EBEF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" fill="#99A1AF"/>
                    </svg>
                  </div>
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
          {reviews.length > 3 && (
            <div style={{ marginTop: '16px', padding: '0 16px', display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => setMobileVisibleComments(prev => prev >= reviews.length ? 3 : prev + 3)} style={{
                width: '100%', borderRadius: '9999px', border: '1px solid #D5D8DF', padding: '16px 150px',
                fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '14px',
                color: '#2D3138', backgroundColor: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                {mobileVisibleComments >= reviews.length ? 'Fold' : 'See more'}
              </button>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="sm:hidden" style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6' }} />

        {/* Videos: Trailer & Teasers - Mobile */}
        {currentTVFilm.videos && currentTVFilm.videos.length > 0 && (
          <div className="sm:hidden" style={{ paddingBottom: '16px' }}>
            <div className="flex items-center justify-between" style={{ padding: '24px 16px 16px' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.333em', letterSpacing: '-0.017em', color: '#000000' }}>
                Videos: Trailer & Teasers
              </span>
            </div>
            <div className="overflow-x-auto hide-scrollbar" style={{ display: 'flex', gap: '10px', padding: '0 16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {currentTVFilm.videos.map((video, index) => {
                const videoId = getYoutubeIdFromUrl(video.url);
                return (
                  <div key={index} className="flex-shrink-0 relative overflow-hidden cursor-pointer"
                    style={{ width: '286px', height: '156px', borderRadius: '12px', backgroundColor: '#1E2939' }}
                    onClick={() => { setSelectedVideoId(videoId); setTrailerTitle(video.title || 'Trailer'); setShowTrailer(true); }}>
                    {videoId && (
                      <Image src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt={video.title || 'Video'} fill className="object-cover" unoptimized
                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.jpg'; }} />
                    )}
                    <div className="absolute inset-0" style={{ backgroundColor: 'rgba(17, 17, 17, 0.2)' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div style={{ width: '39px', height: '39px', borderRadius: '50%', backgroundColor: 'rgba(196, 196, 196, 0.6)', border: '0.9px solid #C2C2C2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <div style={{ padding: '24px 16px 16px' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.333em', letterSpacing: '-0.017em', color: '#000000' }}>
                Cast
              </span>
            </div>
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="overflow-x-auto hide-scrollbar" style={{ display: 'flex', gap: '3px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {cast.map((actor, index) => (
                  <div key={index} className="flex-shrink-0 cursor-pointer"
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'none', border: 'none', boxShadow: 'none' }}
                    onClick={() => handleActorClick(actor.name, null)}>
                    <div style={{ width: '120px', height: '150px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#E5E7EB', boxShadow: 'none' }}>
                      {actor.image || actor.profileImage ? (
                        <Image src={actor.image || actor.profileImage} alt={actor.name || 'Actor'} width={120} height={150}
                          className="object-cover" style={{ width: '120px', height: '150px' }} unoptimized
                          onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.jpg'; }} />
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

        {/* Mobile: Comment Ticker */}
        <div className="sm:hidden" style={{ padding: '24px 16px 4px', backgroundColor: '#FFFFFF' }}>
          <CommentTicker comments={commentsData} onNavigate={navigateToPage} />
        </div>

        {/* Mobile: Related News */}
        {relatedNews && relatedNews.length > 0 && (
          <div className="sm:hidden" style={{ backgroundColor: '#FFFFFF', padding: '24px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 900, fontSize: '20px', lineHeight: '1.35em', color: '#101828' }}>
                    <span style={{ color: '#2B7FFF' }}>Related</span> News
                  </span>
                </div>
                <Link href={`/news/${relatedNews[0]?.slug || relatedNews[0]?._id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ width: '100%', height: '222px', borderRadius: '14px', overflow: 'hidden', backgroundColor: '#E5E7EB' }}>
                      <img src={relatedNews[0]?.coverImage || relatedNews[0]?.thumbnail || '/images/news/default-news.jpg'} alt={relatedNews[0]?.title || ''}
                        style={{ width: '100%', height: '222px', objectFit: 'cover' }}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/news/default-news.jpg'; }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h3 className="line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '1.25em', color: '#101828', margin: 0 }}>
                        {relatedNews[0]?.title || ''}
                      </h3>
                      <p className="line-clamp-3" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '1.5em', color: '#6A7282', margin: 0 }}>
                        {relatedNews[0]?.description || relatedNews[0]?.summary || ''}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
              {relatedNews.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {relatedNews.slice(1, 3).map((news, index) => (
                    <Link key={index} href={`/news/${news.slug || news._id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', gap: '12px', height: '70px' }}>
                        <div style={{ width: '100px', height: '70px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#E5E7EB', flexShrink: 0 }}>
                          <img src={news.coverImage || news.thumbnail || '/images/news/default-news.jpg'} alt={news.title || ''}
                            style={{ width: '100px', height: '70px', objectFit: 'cover' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/news/default-news.jpg'; }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 400, fontSize: '10px', lineHeight: '1.6em', color: '#99A1AF' }}>
                            {news.publishedAt ? new Date(news.publishedAt).toLocaleDateString('en-CA') : news.createdAt ? new Date(news.createdAt).toLocaleDateString('en-CA') : ''}
                          </span>
                          <p className="line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '1.43em', letterSpacing: '-0.01em', color: '#101828', margin: 0 }}>
                            {news.title || ''}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {relatedNews.length > 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {relatedNews.slice(3, 5).map((news, index) => (
                    <Link key={index} href={`/news/${news.slug || news._id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', gap: '12px', height: '70px' }}>
                        <div style={{ width: '100px', height: '70px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#E5E7EB', flexShrink: 0 }}>
                          <img src={news.coverImage || news.thumbnail || '/images/news/default-news.jpg'} alt={news.title || ''}
                            style={{ width: '100px', height: '70px', objectFit: 'cover' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/images/news/default-news.jpg'; }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                          <span style={{ fontFamily: 'Pretendard, sans-serif', fontWeight: 400, fontSize: '10px', lineHeight: '1.6em', color: '#99A1AF' }}>
                            {news.publishedAt ? new Date(news.publishedAt).toLocaleDateString('en-CA') : news.createdAt ? new Date(news.createdAt).toLocaleDateString('en-CA') : ''}
                          </span>
                          <p className="line-clamp-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '1.43em', letterSpacing: '-0.01em', color: '#101828', margin: 0 }}>
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

        {/* Mobile: More TV/Film News */}
        <div className="sm:hidden" style={{ backgroundColor: '#FFFFFF', padding: '24px 16px 32px' }}>
          <MoreNews category="movie" storageKey="tvfilm-detail-mobile" />
        </div>

        {/* Trailer Modal - portal to body to avoid swipe transform */}
        {showTrailer && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
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
          </div>,
          document.body
        )}
        
        {/* 리뷰 모달 */}
        {showReviewModal && selectedReview && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm" onClick={closeReviewModal}>
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
          </div>,
          document.body
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
                          sessionStorage.setItem('tvfilmDetailScrollPositionPath', window.location.pathname);
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

      {/* 공유 모달 */}
      {showShareMenu && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] transition-opacity" onClick={() => setShowShareMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full bg-white rounded-t-3xl md:rounded-2xl z-[10001] shadow-2xl">
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
                  <p className="text-sm text-gray-600 truncate flex-1">{getTVFilmShareUrl()}</p>
                  <button onClick={handleCopyLink} className="ml-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 링크 복사 토스트 */}
      {isLinkCopied && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-lg shadow-lg z-[10000] whitespace-nowrap text-base">
          Link copied to clipboard!
        </div>,
        document.body
      )}
    </>
  );
}

// 데이터 가져오기
export async function getServerSideProps({ params, req, res: sRes, query, resolvedUrl }) {
  const { id } = params;
  const listFields = 'fields=_id,title,slug,coverImage,thumbnailUrl,category,source,sourceUrl,timeText,summary,content,createdAt,publishedAt,updatedAt,viewCount,featured,tags,author,youtubeUrl,articleUrl';

  try {
    // 뒤로가기 시 브라우저 캐시 사용 → 서버 요청 없이 즉시 렌더링
    sRes.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
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
        const rankingNewsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/news?limit=30&sort=views&category=movie&${listFields}`);
        
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
            const generalNewsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/news?limit=20&sort=views&${listFields}`);
            
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

    // 댓글 및 랭킹 뉴스 병렬 fetch
    let recentComments = [];
    let rankingNews = [];
    try {
      const [commentsResult, rankingResult] = await Promise.allSettled([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/comments/recent?limit=10`).then(r => r.json()),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/news?limit=10&sort=viewCount&category=movie&${listFields}`).then(r => r.json()),
      ]);
      if (commentsResult.status === 'fulfilled' && commentsResult.value?.success) {
        recentComments = commentsResult.value.data || [];
      }
      if (rankingResult.status === 'fulfilled' && rankingResult.value?.success) {
        rankingNews = rankingResult.value.data || [];
      }
    } catch (extraError) {
      console.error('추가 데이터 로딩 오류:', extraError);
    }

    return {
      props: {
        tvfilm,
        relatedNews,
        recentComments,
        rankingNews,
      }
    };
  } catch (error) {
    console.error('TV/Film 데이터 로딩 오류:', error);
    return {
      notFound: true
    };
  }
}
