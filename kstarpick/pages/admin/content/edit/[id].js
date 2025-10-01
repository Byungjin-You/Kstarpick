import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import AdminLayout from '../../../../components/AdminLayout';
import { ArrowLeft, Save, Check, Play, Star, MessageSquare, Plus, XCircle } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

// CSS 애니메이션 스타일
const styles = {
  '@keyframes progress': {
    '0%': { width: '0%' },
    '100%': { width: '100%' }
  },
  '.animate-progress': {
    animation: 'progress 3s ease-in-out infinite'
  },
  '@keyframes pulse': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 }
  },
  '.animate-pulse': {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  },
  '@keyframes ping': {
    '75%, 100%': { transform: 'scale(2)', opacity: 0 }
  },
  '.animate-ping': {
    animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
  },
  '@keyframes sparkle': {
    '0%': { opacity: 0, transform: 'scale(0.8)' },
    '50%': { opacity: 1, transform: 'scale(1.2)' },
    '100%': { opacity: 0, transform: 'scale(0.8)' }
  },
  '.animate-star': {
    animation: 'sparkle 1.5s ease-in-out'
  }
};

// 동적 스타일 삽입
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = Object.entries(styles).map(([selector, style]) => {
    if (selector.startsWith('@keyframes')) {
      return `${selector} ${JSON.stringify(style)}`;
    }
    return `${selector} ${JSON.stringify(style)}`;
  }).join('\n').replace(/"/g, '').replace(/,/g, ';');
  document.head.appendChild(styleEl);
}

// 장르 옵션 정의
const GENRE_OPTIONS = [
  { value: 'romance', label: '로맨스' },
  { value: 'comedy', label: '코미디' },
  { value: 'action', label: '액션' },
  { value: 'drama', label: '드라마' },
  { value: 'thriller', label: '스릴러' },
  { value: 'fantasy', label: '판타지' },
  { value: 'mystery', label: '미스터리' },
  { value: 'horror', label: '호러' },
  { value: 'sci-fi', label: 'SF' },
  { value: 'historical', label: '역사' },
  { value: 'crime', label: '범죄' },
  { value: 'family', label: '가족' },
  { value: 'medical', label: '의학' },
  { value: 'legal', label: '법정' },
  { value: 'sports', label: '스포츠' },
  { value: 'music', label: '음악' },
  { value: 'youth', label: '청춘' },
  { value: 'school', label: '학교' },
  { value: 'office', label: '직장' },
  { value: 'military', label: '군대' }
];

// YouTube URL에서 비디오 ID 추출 함수
const getYoutubeIdFromUrl = (url) => {
  if (!url) return null;
  
  // 다양한 YouTube URL 형식 지원
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=)|youtu\.be\/)([^#&?]*).*/;
  const match = url.match(regExp);
  
  // YouTube ID는 11자리
  return (match && match[1] && match[1].length === 11) ? match[1] : null;
};

export default function EditContent() {
  const router = useRouter();
  const { id } = router.query;
  
  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    originalTitle: '',
    englishTitle: '', // 영어 제목 필드 추가
    description: '',
    summary: '',
    status: 'ongoing',
    country: 'KOREA',
    releaseDate: '',
    runtime: '',
    ageRating: '',
    director: '',
    genres: [],
    category: 'drama',
    
    // Media
    coverImage: null,
    bannerImage: null,
    trailerUrl: '',
    
    // Cast & Crew
    cast: [],
    
    // Watch Information
    watchProviders: [],
    streamingLinks: {
      netflix: '',
      apple: '',
      disney: '',
      viki: '',
      wavve: ''
    },
    whereToWatch: [], // 추가된 필드
    
    // Metadata
    tags: [],
    rating: 0,
    views: 0,
    likesCount: 0,
    dislikesCount: 0,
    
    // SEO
    metaDescription: '',
    metaKeywords: '',
    
    // Content
    videos: [],
    reviews: [],
    episodeList: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [isBannerDragging, setIsBannerDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [toastState, setToastState] = useState({ visible: false, message: '', type: '' });
  const [imagesToUpload, setImagesToUpload] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  // 외부 리뷰 관련 상태 (리뷰 컬렉션에서 로드된 리뷰)
  const [externalReviews, setExternalReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  
  // 리뷰 크롤링 상태 관리
  const [reviewCrawlingUrl, setReviewCrawlingUrl] = useState('');
  const [isReviewCrawling, setIsReviewCrawling] = useState(false);
  const [reviewCrawlingResult, setReviewCrawlingResult] = useState(null);
  const [reviewCrawlingError, setReviewCrawlingError] = useState(null);
  const [reviewCrawlingProgress, setReviewCrawlingProgress] = useState(''); // 크롤링 진행 상태 메시지
  const [useStealthCrawler, setUseStealthCrawler] = useState(true); // 스텔스 크롤러 사용 여부
  
  // 비디오 관련 상태
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [videoTypeInput, setVideoTypeInput] = useState('trailer');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  
  // 리뷰 관련 상태
  const [reviewTitleInput, setReviewTitleInput] = useState('');
  const [reviewAuthorInput, setReviewAuthorInput] = useState('');
  const [reviewRatingInput, setReviewRatingInput] = useState(5);
  const [reviewContentInput, setReviewContentInput] = useState('');
  const [reviewTagsInput, setReviewTagsInput] = useState('');
  
  // 제공 플랫폼 관련 상태
  const [providerNameInput, setProviderNameInput] = useState('');
  const [providerUrlInput, setProviderUrlInput] = useState('');
  
  // 출연진 관련 상태
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [roleInput, setRoleInput] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupRoleInput, setGroupRoleInput] = useState('');
  
  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [bannerFileError, setBannerFileError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [bannerUrlError, setBannerUrlError] = useState('');
  
  const coverFileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);
  const editorRef = useRef(null);

  const [castProfileUrls, setCastProfileUrls] = useState([]);
  const [castProfileErrors, setCastProfileErrors] = useState([]);

  const [selectedProviders, setSelectedProviders] = useState({
    netflix: false,
    apple: false,
    disney: false,
    viki: false,
    wavve: false
  });

  // 탭 완료 상태 관리
  const [completedTabs, setCompletedTabs] = useState({
    basic: false,
    videos: false,
    reviews: false,
    episodes: false
  });

  // 탭 완료 상태 체크
  const checkTabCompletion = (tab) => {
    switch (tab) {
      case 'basic':
        return formData.title && formData.description && formData.coverImage;
      case 'videos':
        return formData.videos.length > 0;
      case 'reviews':
        return formData.reviews.length > 0;
      case 'episodes':
        return formData.episodeList && formData.episodeList.length > 0;
      default:
        return false;
    }
  };

  // 탭 변경 시 완료 상태 업데이트
  useEffect(() => {
    setCompletedTabs(prev => ({
      ...prev,
      [activeTab]: checkTabCompletion(activeTab)
    }));
  }, [activeTab, formData]);

  // 시청 플랫폼 상태 업데이트
  useEffect(() => {
    // formData.watchProviders 배열이 있을 때만 실행
    if (formData.watchProviders?.length > 0) {
      const hasNetflix = formData.watchProviders.some(provider => provider.name === 'Netflix');
      const hasDisney = formData.watchProviders.some(provider => provider.name === 'Disney+');
      const hasApple = formData.watchProviders.some(provider => provider.name === 'Apple TV+');
      const hasViki = formData.watchProviders.some(provider => provider.name === 'Viki');
      const hasWavve = formData.watchProviders.some(provider => provider.name === 'Wavve');
      
      // 플랫폼 선택 상태 업데이트
      setSelectedProviders({
        netflix: hasNetflix,
        disney: hasDisney,
        apple: hasApple,
        viki: hasViki,
        wavve: hasWavve
      });
    }
  }, [formData.watchProviders]);

  // 콘텐츠 정보 불러오기
  useEffect(() => {
    if (!id) return;
    
    const fetchContent = async () => {
      try {
        // 인증 토큰 가져오기
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
        
        const response = await fetch(`/api/dramas/${id}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || '콘텐츠를 불러오는 중 오류가 발생했습니다.');
        }
        
        // 디버깅: API에서 받은 방영일 정보 확인
        console.log('API에서 받은 방영일 정보:', data.data.releaseDate);
        
        // 방영일은 원본 데이터 그대로 사용 (text 입력 필드로 변경했으므로 변환이 필요 없음)
        const originalReleaseDate = data.data.releaseDate || '';
        
        // 필수 배열 필드가 없을 경우 빈 배열로 초기화
        const contentData = {
          ...data.data,
          releaseDate: originalReleaseDate,
          genres: data.data.genres || [],
          // description이 비어있다면 summary 값을 사용
          description: data.data.description || data.data.summary || '',
          summary: data.data.summary || data.data.description || '',
          // englishTitle이 없는 경우 title이 영어면 복사 또는 originalTitle에서 가져오기
          englishTitle: data.data.englishTitle || 
                       (isEnglishTitle(data.data.title) ? data.data.title : 
                        isEnglishTitle(data.data.originalTitle) ? data.data.originalTitle : ''),
          cast: processCast(data.data.cast),
          videos: data.data.videos || [],
          reviews: data.data.reviews || [],
          watchProviders: data.data.watchProviders || [],
          streamingLinks: data.data.streamingLinks || {
            netflix: '',
            apple: '',
            disney: '',
            viki: '',
            wavve: ''
          },
          whereToWatch: data.data.whereToWatch || [], // whereToWatch 필드 초기화
          episodeList: data.data.episodeList || []
        };
        
        console.log('최종 설정된 방영일:', contentData.releaseDate);
        console.log('줄거리 정보:', {
          summary: contentData.summary?.substring(0, 100) + '...',
          description: contentData.description?.substring(0, 100) + '...'
        });
        console.log('출연진 정보:', contentData.cast);
        
        setFormData(contentData);
        
        // 리뷰를 별도로 가져옵니다
        fetchReviews();
      } catch (err) {
        console.error('Error fetching content:', err);
        setError(err.message);
        showToast(err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContent();
  }, [id]);
  
  // 입력값 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // 디버깅: 입력 변경 이벤트 추적
    if (name === 'releaseDate') {
      console.log('방영일 입력 변경:', value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 장르 변경 처리
  const handleGenreChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      genres: checked 
        ? [...prev.genres, value]
        : prev.genres.filter(genre => genre !== value)
    }));
  };
  
  // 폼 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 디버깅을 위한 로그 추가
      console.log('전송할 데이터:', formData);
      console.log('비디오 데이터 확인:', formData.videos);
      
      // 인증 토큰 가져오기
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/dramas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      console.log('서버 응답:', data);
      
      if (!response.ok) {
        throw new Error(data.message || '콘텐츠 수정 중 오류가 발생했습니다.');
      }
      
      showToast('콘텐츠가 성공적으로 수정되었습니다.', 'success');
      setTimeout(() => router.push('/admin/content'), 1500);
    } catch (err) {
      console.error('Error updating content:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 토스트 메시지 표시
  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: '' }), 3000);
  };
  
  const removeCastMember = (index) => {
    const updatedCast = [...formData.cast];
    updatedCast.splice(index, 1);
    setFormData(prev => ({ ...prev, cast: updatedCast }));
  };

  // 제공 플랫폼 핸들러
  const handleProviderChange = (provider) => {
    setSelectedProviders(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));

    if (!selectedProviders[provider]) {
      // 스트리밍 서비스별 기본 정보 설정
      let providerInfo = {};
      switch (provider) {
        case 'netflix':
          providerInfo = {
            name: 'Netflix',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png',
            type: 'subscription',
            price: '13,500원/월',
            quality: ['HD', '4K', 'HDR'],
            url: formData.streamingLinks?.netflix || ''
          };
          break;
        case 'apple':
          providerInfo = {
            name: 'Apple TV+',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg',
            type: 'subscription',
            price: '8,900원/월',
            quality: ['HD', '4K'],
            url: formData.streamingLinks?.apple || ''
          };
          break;
        case 'disney':
          providerInfo = {
            name: 'Disney+',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
            type: 'subscription',
            price: '9,900원/월',
            quality: ['HD', '4K'],
            url: formData.streamingLinks?.disney || ''
          };
          break;
        case 'viki':
          providerInfo = {
            name: 'Viki',
            logo: 'https://upload.wikimedia.org/wikipedia/en/5/55/Viki_Logo.png',
            type: 'subscription',
            price: '5,900원/월',
            quality: ['HD'],
            url: formData.streamingLinks?.viki || ''
          };
          break;
        case 'wavve':
          providerInfo = {
            name: 'Wavve',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Wavve_logo.svg',
            type: 'subscription',
            price: '10,900원/월',
            quality: ['HD', '4K'],
            url: formData.streamingLinks?.wavve || ''
          };
          break;
      }

      setFormData(prev => ({
        ...prev,
        watchProviders: [...(prev.watchProviders || []), providerInfo]
      }));
    } else {
      // 서비스 제거
      setFormData(prev => ({
        ...prev,
        watchProviders: (prev.watchProviders || []).filter(p => 
          p.name.toLowerCase() !== (provider === 'apple' ? 'apple tv+' : provider))
      }));
    }
  };

  const handleProviderUrlChange = (provider, url) => {
    setFormData(prev => ({
      ...prev,
      streamingLinks: {
        ...(prev.streamingLinks || {}),
        [provider]: url
      },
      watchProviders: (prev.watchProviders || []).map(p => {
        if (p.name.toLowerCase().includes(provider.toLowerCase())) {
          return { ...p, url };
        }
        return p;
      })
    }));
  };

  const handleSetFeaturedReview = (index) => {
    // 기존 대표 리뷰를 모두 featured: false로 설정
    const updatedReviews = formData.reviews.map(review => ({
      ...review,
      featured: false
    }));
    
    // 선택한 리뷰만 featured: true로 설정
    updatedReviews[index] = {
      ...updatedReviews[index],
      featured: true
    };
    
    setFormData(prev => ({
      ...prev,
      reviews: updatedReviews
    }));
    
    showToast('대표 리뷰가 설정되었습니다.', 'success');
  };

  // 에피소드 관련 상태 추가
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [episodeAirDate, setEpisodeAirDate] = useState('');
  const [episodeSummary, setEpisodeSummary] = useState('');
  const [episodeRuntime, setEpisodeRuntime] = useState('');
  const [episodeRating, setEpisodeRating] = useState('');
  const [episodeViewerRating, setEpisodeViewerRating] = useState('');
  const [episodeImage, setEpisodeImage] = useState('');
  const [episodeMdlUrl, setEpisodeMdlUrl] = useState('');
  const [showEpisodeForm, setShowEpisodeForm] = useState(false);

  // 에피소드 추가 함수
  const addEpisode = () => {
    if (!episodeNumber) {
      showToast('에피소드 번호를 입력해주세요.', 'error');
      return;
    }

    const newEpisode = {
      number: parseInt(episodeNumber),
      title: episodeTitle,
      airDate: episodeAirDate ? new Date(episodeAirDate) : null,
      summary: episodeSummary,
      runtime: episodeRuntime ? parseInt(episodeRuntime) : null,
      rating: episodeRating ? parseFloat(episodeRating) : null,
      viewerRating: episodeViewerRating ? parseFloat(episodeViewerRating) : null,
      image: episodeImage,
      mdlUrl: episodeMdlUrl
    };

    setFormData(prev => ({
      ...prev,
      episodeList: [...(prev.episodeList || []), newEpisode]
    }));

    // 입력 폼 초기화
    resetEpisodeForm();
    setShowEpisodeForm(false);
    showToast('에피소드가 추가되었습니다.', 'success');
  };

  // 에피소드 수정 함수
  const editEpisode = (index) => {
    const episode = formData.episodeList[index];
    setEpisodeNumber(episode.number.toString());
    setEpisodeTitle(episode.title || '');
    setEpisodeAirDate(episode.airDate ? new Date(episode.airDate).toISOString().split('T')[0] : '');
    setEpisodeSummary(episode.summary || '');
    setEpisodeRuntime(episode.runtime ? episode.runtime.toString() : '');
    setEpisodeRating(episode.rating ? episode.rating.toString() : '');
    setEpisodeViewerRating(episode.viewerRating ? episode.viewerRating.toString() : '');
    setEpisodeImage(episode.image || '');
    setEpisodeMdlUrl(episode.mdlUrl || '');
    
    // 현재 수정 중인 에피소드 인덱스 저장
    setFormData(prev => ({
      ...prev,
      _editingEpisodeIndex: index
    }));
    
    setShowEpisodeForm(true);
  };

  // 에피소드 삭제 함수
  const removeEpisode = (index) => {
    setFormData(prev => ({
      ...prev,
      episodeList: prev.episodeList.filter((_, i) => i !== index)
    }));
    showToast('에피소드가 삭제되었습니다.', 'info');
  };

  // 에피소드 폼 초기화 함수
  const resetEpisodeForm = () => {
    setEpisodeNumber('');
    setEpisodeTitle('');
    setEpisodeAirDate('');
    setEpisodeSummary('');
    setEpisodeRuntime('');
    setEpisodeRating('');
    setEpisodeViewerRating('');
    setEpisodeImage('');
    setEpisodeMdlUrl('');
    
    // 에피소드 수정 모드 해제
    setFormData(prev => {
      const { _editingEpisodeIndex, ...rest } = prev;
      return rest;
    });
  };

  // 에피소드 저장 함수 (추가 또는 수정)
  const saveEpisode = () => {
    if (!episodeNumber) {
      showToast('에피소드 번호를 입력해주세요.', 'error');
      return;
    }
    
    const episodeData = {
      number: parseInt(episodeNumber),
      title: episodeTitle,
      airDate: episodeAirDate ? new Date(episodeAirDate) : null,
      summary: episodeSummary,
      runtime: episodeRuntime ? parseInt(episodeRuntime) : null,
      rating: episodeRating ? parseFloat(episodeRating) : null,
      viewerRating: episodeViewerRating ? parseFloat(episodeViewerRating) : null,
      image: episodeImage,
      mdlUrl: episodeMdlUrl
    };
    
    setFormData(prev => {
      // 에피소드 목록이 없으면 새로 생성
      if (!prev.episodeList) {
        return { ...prev, episodeList: [episodeData] };
      }
      
      // 수정 모드인 경우
      if (prev._editingEpisodeIndex !== undefined) {
        const updatedList = [...prev.episodeList];
        updatedList[prev._editingEpisodeIndex] = episodeData;
        
        // 수정 모드 해제 및 업데이트된 목록 반환
        const { _editingEpisodeIndex, ...rest } = prev;
        return { ...rest, episodeList: updatedList };
      }
      
      // 추가 모드인 경우
      return { ...prev, episodeList: [...prev.episodeList, episodeData] };
    });
    
    // 폼 초기화 및 숨기기
    resetEpisodeForm();
    setShowEpisodeForm(false);
    showToast('에피소드가 저장되었습니다.', 'success');
  };

  // 에피소드 크롤링 함수
  const crawlEpisodes = async () => {
    if (!formData.mdlUrl) {
      showToast('MyDramaList URL이 필요합니다.', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      showToast('에피소드 정보를 크롤링 중입니다...', 'info');
      
      // 기본 URL에서 /episodes 페이지 URL 생성
      const episodesUrl = `${formData.mdlUrl}/episodes`;
      
      const response = await fetch('/api/crawler/stealth-crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: episodesUrl,
          mode: 'episodes' 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '에피소드 크롤링 중 오류가 발생했습니다.');
      }
      
      if (result.data && result.data.episodes && result.data.episodes.length > 0) {
        setFormData(prev => ({
          ...prev,
          episodeList: result.data.episodes
        }));
        showToast(`${result.data.episodes.length}개의 에피소드를 가져왔습니다.`, 'success');
      } else {
        showToast('에피소드 정보를 찾을 수 없습니다.', 'warning');
      }
    } catch (error) {
      console.error('에피소드 크롤링 중 오류:', error);
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // "Where to Watch" 정보를 크롤링하는 함수
  const crawlStreamingServices = async () => {
    if (!formData.mdlUrl) {
      showToast('MyDramaList URL이 필요합니다.', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      showToast('스트리밍 서비스 정보를 크롤링 중입니다...', 'info');
      
      // 상세 페이지 URL 사용
      const detailUrl = formData.mdlUrl;
      
      const response = await fetch('/api/crawler/stealth-crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: detailUrl,
          mode: 'streaming' 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '스트리밍 서비스 크롤링 중 오류가 발생했습니다.');
      }
      
      if (result.data && result.data.streamingServices && result.data.streamingServices.length > 0) {
        // 서비스 정보를 개별 상태에 적용
        const services = result.data.streamingServices;
        console.log('크롤링된 스트리밍 서비스:', services);
        
        // 스트리밍 링크 정보 업데이트를 위한 객체
        const newStreamingLinks = { ...formData.streamingLinks };
        
        // 선택된 제공자 목록 업데이트
        const newSelectedProviders = { ...selectedProviders };
        
        // 크롤링된 서비스 정보를 기존 watchProviders 배열로 통합
        const updatedWatchProviders = [];
        
        // 또한 whereToWatch 필드에도 데이터 추가 (스키마와 일치시키기)
        // API에서 이미 변환된 whereToWatch를 사용
        const updatedWhereToWatch = result.data.whereToWatch || [];
        
        services.forEach(service => {
          if (service.providerKey) {
            // 선택된 제공자 업데이트
            newSelectedProviders[service.providerKey] = true;
            
            // 스트리밍 링크 업데이트
            newStreamingLinks[service.providerKey] = service.url;
            
            // watchProviders 배열에 추가
            updatedWatchProviders.push({
              name: service.name,
              logo: service.logo,
              type: service.type,
              url: service.url,
              price: service.providerKey === 'netflix' ? '13,500원/월' :
                     service.providerKey === 'apple' ? '8,900원/월' :
                     service.providerKey === 'disney' ? '9,900원/월' :
                     service.providerKey === 'viki' ? '5,900원/월' :
                     service.providerKey === 'wavve' ? '10,900원/월' : '구독',
              quality: service.providerKey === 'netflix' ? ['HD', '4K', 'HDR'] :
                       service.providerKey === 'apple' ? ['HD', '4K'] :
                       service.providerKey === 'disney' ? ['HD', '4K'] :
                       service.providerKey === 'viki' ? ['HD'] :
                       service.providerKey === 'wavve' ? ['HD', '4K'] : ['HD']
            });
          }
        });
        
        // formData 상태 업데이트
        setFormData(prev => ({
          ...prev,
          watchProviders: updatedWatchProviders,
          streamingLinks: newStreamingLinks,
          whereToWatch: updatedWhereToWatch // API에서 변환된 whereToWatch 사용
        }));
        
        // 선택된 제공자 상태 업데이트
        setSelectedProviders(newSelectedProviders);
        
        showToast(`${services.length}개의 스트리밍 서비스 정보를 가져왔습니다.`, 'success');
      } else {
        showToast('스트리밍 서비스 정보를 찾을 수 없습니다.', 'warning');
      }
    } catch (error) {
      console.error('스트리밍 서비스 크롤링 중 오류:', error);
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 리뷰 크롤링 처리
  const handleReviewCrawling = async () => {
    if (!reviewCrawlingUrl) {
      showToast('리뷰 URL을 입력해주세요.', 'error');
      return;
    }

    // 입력된 URL이 유효한지 확인
    let validUrl = reviewCrawlingUrl;
    if (!validUrl.includes('mydramalist.com')) {
      showToast('올바른 MyDramalist URL을 입력해주세요.', 'error');
      return;
    }

    // URL에 /reviews가 없는 경우 자동으로 추가
    if (!validUrl.endsWith('/reviews')) {
      // URL에서 trailing slash 제거
      if (validUrl.endsWith('/')) {
        validUrl = validUrl.slice(0, -1);
      }
      validUrl = `${validUrl}/reviews`;
      setReviewCrawlingUrl(validUrl);
    }

    try {
      setIsReviewCrawling(true);
      setReviewCrawlingError(null);
      setReviewCrawlingResult(null);
      setReviewCrawlingProgress('리뷰 크롤링 준비 중...');
      showToast('리뷰 크롤링을 시작합니다...', 'info');

      // 스텔스 크롤러 사용 여부에 따라 API 엔드포인트 선택
      const endpoint = useStealthCrawler ? '/api/crawler/reviews-stealth-crawler' : '/api/crawler/reviews-crawler';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: validUrl,
          dramaId: id
        })
      });

      setReviewCrawlingProgress('서버에서 응답 처리 중...');
      const result = await response.json();

      if (result.success) {
        const reviewCount = result.data.reviews?.length || 0;
        showToast(`${reviewCount}개의 리뷰를 성공적으로 가져왔습니다.`, 'success');
        setReviewCrawlingResult(result.data);
        setReviewCrawlingProgress(`${reviewCount}개 리뷰 수집 완료`);
        
        // 드라마 정보를 다시 불러와 리뷰 통계 업데이트
        fetchDramaData();
      } else {
        setReviewCrawlingError(`크롤링 실패: ${result.message}`);
        showToast(`크롤링 실패: ${result.message}`, 'error');
        console.error('크롤링 오류:', result.error);
        setReviewCrawlingProgress('크롤링 실패');
      }
    } catch (error) {
      setReviewCrawlingError(`오류 발생: ${error.message}`);
      showToast(`오류 발생: ${error.message}`, 'error');
      console.error('리뷰 크롤링 오류:', error);
      setReviewCrawlingProgress('');
    } finally {
      setIsReviewCrawling(false);
    }
  };

  // 드라마 데이터 다시 불러오기
  const fetchDramaData = async () => {
    try {
      setReviewCrawlingProgress('드라마 정보 업데이트 중...');
      
      // 인증 토큰 가져오기
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/dramas/${id}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        // 필요한 필드만 업데이트
        setFormData(prev => ({
          ...prev,
          reviewCount: data.data.reviewCount || 0,
          reviewRating: data.data.reviewRating || 0,
          ratingDistribution: data.data.ratingDistribution || []
        }));
        setReviewCrawlingProgress('드라마 정보 업데이트 완료');
        
        // 리뷰를 별도로 가져오기
        fetchReviews();
      } else {
        console.error('드라마 정보 업데이트 실패:', data.message);
        setReviewCrawlingProgress('드라마 정보 업데이트 실패');
      }
    } catch (error) {
      console.error('드라마 정보 조회 오류:', error);
      setReviewCrawlingProgress('드라마 정보 업데이트 실패');
    }
  };

  // 외부 리뷰 데이터 가져오기 (reviews 컬렉션에서)
  const fetchReviews = async () => {
    if (!id) return;
    
    try {
      setIsLoadingReviews(true);
      setReviewsError(null);
      
      const response = await fetch(`/api/reviews/by-drama/${id}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setExternalReviews(data.data || []);
        console.log(`[어드민] ${data.data?.length || 0}개 리뷰 로드 완료`);
      } else {
        setReviewsError(data.message || '리뷰를 불러오는데 실패했습니다.');
        console.error('리뷰 불러오기 실패:', data.message);
      }
    } catch (error) {
      setReviewsError(error.message || '리뷰를 불러오는 중 오류가 발생했습니다.');
      console.error('리뷰 불러오기 오류:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={20} className="mr-1" />
            뒤로 가기
          </button>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="mr-4 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">콘텐츠 수정</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <Save size={18} className="mr-1" />
            {isSubmitting ? '저장 중...' : '저장'}
          </button>
        </div>
        
        {/* 진행 상태 표시 */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${completedTabs.basic ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  completedTabs.basic ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {completedTabs.basic ? <Check size={20} /> : <span>1</span>}
                </div>
                <span className="ml-2">기본 정보</span>
              </div>
              <div className="h-1 w-8 bg-gray-200"></div>
              <div className={`flex items-center ${completedTabs.videos ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  completedTabs.videos ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {completedTabs.videos ? <Check size={20} /> : <span>2</span>}
                </div>
                <span className="ml-2">비디오</span>
              </div>
              <div className="h-1 w-8 bg-gray-200"></div>
              <div className={`flex items-center ${completedTabs.reviews ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  completedTabs.reviews ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {completedTabs.reviews ? <Check size={20} /> : <span>3</span>}
                </div>
                <span className="ml-2">리뷰</span>
              </div>
              <div className="h-1 w-8 bg-gray-200"></div>
              <div className={`flex items-center ${completedTabs.episodes ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  completedTabs.episodes ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {completedTabs.episodes ? <Check size={20} /> : <span>4</span>}
                </div>
                <span className="ml-2">에피소드</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {Object.values(completedTabs).filter(Boolean).length}/4 단계 완료
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="mb-6 border-b border-gray-200 sticky top-0 bg-gray-50 z-10 shadow-sm">
          <nav className="flex flex-nowrap overflow-x-auto px-2 py-1 hide-scrollbar">
            <button
              className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center ${
                activeTab === 'basic'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-500 rounded-t-lg shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
              onClick={() => setActiveTab('basic')}
            >
              <span className="mr-2">기본 정보</span>
              {completedTabs.basic && <Check size={16} className="text-green-500" />}
            </button>
            <button
              className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center ${
                activeTab === 'videos'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-500 rounded-t-lg shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
              onClick={() => setActiveTab('videos')}
            >
              <span className="mr-2">비디오</span>
              {completedTabs.videos && <Check size={16} className="text-green-500" />}
            </button>
            <button
              className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center ${
                activeTab === 'reviews'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-500 rounded-t-lg shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
              onClick={() => setActiveTab('reviews')}
            >
              <span className="mr-2">리뷰</span>
              {completedTabs.reviews && <Check size={16} className="text-green-500" />}
            </button>
            <button
              className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center ${
                activeTab === 'episodes'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-500 rounded-t-lg shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg'
              }`}
              onClick={() => setActiveTab('episodes')}
            >
              <span className="mr-2">에피소드</span>
              {completedTabs.episodes && <Check size={16} className="text-green-500" />}
            </button>
          </nav>
        </div>
        
        {/* 탭 내용 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Category */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">카테고리를 선택하세요</option>
                  <option value="drama">드라마</option>
                  <option value="movie">영화</option>
                  <option value="variety">예능</option>
                  <option value="documentary">다큐멘터리</option>
                  <option value="animation">애니메이션</option>
                  <option value="web_series">웹 시리즈</option>
                  <option value="other">기타</option>
                </select>
                {errors.category && (
                  <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                )}
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="제목을 입력하세요"
                  required
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Original Title */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="originalTitle">
                  원제
                </label>
                <input
                  type="text"
                  id="originalTitle"
                  name="originalTitle"
                  value={formData.originalTitle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="원제를 입력하세요"
                />
              </div>
              
              {/* English Title - 추가 */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="englishTitle">
                  영어 제목 (영상 자동 검색에 사용)
                </label>
                <input
                  type="text"
                  id="englishTitle"
                  name="englishTitle"
                  value={formData.englishTitle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="영어 제목을 입력하세요 (예: Parasite)"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                  줄거리 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description || formData.summary || ''}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="줄거리를 입력하세요"
                  rows={4}
                  required
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>

              {/* Release Date */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="releaseDate">
                  방영일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="releaseDate"
                  name="releaseDate"
                  value={formData.releaseDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.releaseDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="예: 2023-05-15 또는 May 15, 2023"
                  required
                />
                {errors.releaseDate && <p className="text-red-500 text-xs mt-1">{errors.releaseDate}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  원하는 형식으로 방영일을 입력하세요. (예: YYYY-MM-DD, Month DD, YYYY 등)
                </p>
              </div>

              {/* Runtime */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="runtime">
                  런타임 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="runtime"
                  name="runtime"
                  value={formData.runtime}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.runtime ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="예: 1시간 30분"
                  required
                />
                {errors.runtime && <p className="text-red-500 text-xs mt-1">{errors.runtime}</p>}
              </div>

              {/* Country */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="country">
                  국가 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              {/* Age Rating */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ageRating">
                  연령 등급 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="ageRating"
                  name="ageRating"
                  value={formData.ageRating}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.ageRating ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="예: 전체 관람가, 12세 이상, 15세 이상, 18세 이상"
                  required
                />
                {errors.ageRating && <p className="text-red-500 text-xs mt-1">{errors.ageRating}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  크롤링된 등급 정보를 그대로 입력하거나 수정할 수 있습니다.
                </p>
              </div>

              {/* Director */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="director">
                  감독
                </label>
                <input
                  type="text"
                  id="director"
                  name="director"
                  value={formData.director}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="감독을 입력하세요"
                />
              </div>

              {/* Cast (출연진) 등록 */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">출연진</label>
                {formData.cast && formData.cast.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {formData.cast.map((member, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 bg-gray-50 p-2 rounded">
                        {/* 프로필 이미지 미리보기 */}
                        {member.image ? (
                          <img
                            src={member.image}
                            alt={member.name || `cast-${idx}`}
                            className="w-12 h-12 object-cover rounded-full border border-gray-300 bg-white"
                            onError={e => { e.target.onerror = null; e.target.src = '/images/placeholder-profile.png'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                        <input
                          type="text"
                          placeholder="이름"
                          value={member.name || ''}
                          onChange={e => {
                            const updatedCast = [...formData.cast];
                            updatedCast[idx] = { ...updatedCast[idx], name: e.target.value };
                            setFormData(prev => ({ ...prev, cast: updatedCast }));
                          }}
                          className="w-32 px-2 py-1 border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          placeholder="역할 (예: 주연, 조연, 특별출연 등)"
                          value={member.role || ''}
                          onChange={e => {
                            const updatedCast = [...formData.cast];
                            updatedCast[idx] = { ...updatedCast[idx], role: e.target.value };
                            setFormData(prev => ({ ...prev, cast: updatedCast }));
                          }}
                          className="w-40 px-2 py-1 border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          placeholder="프로필 이미지 URL"
                          value={member.image || ''}
                          onChange={e => {
                            const updatedCast = [...formData.cast];
                            updatedCast[idx] = { ...updatedCast[idx], image: e.target.value };
                            setFormData(prev => ({ ...prev, cast: updatedCast }));
                          }}
                          className="w-64 px-2 py-1 border border-gray-300 rounded"
                        />
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700 ml-2"
                          onClick={() => removeCastMember(idx)}
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      cast: [...(prev.cast || []), { name: '', role: '', image: '' }]
                    }));
                  }}
                >
                  <Plus size={16} className="mr-1" /> 출연진 추가
                </button>
              </div>

              {/* Genres */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  장르 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="genresText"
                  name="genresText"
                  value={Array.isArray(formData.genres) ? formData.genres.join(', ') : formData.genres}
                  onChange={(e) => {
                    const genresText = e.target.value;
                    // 쉼표로 구분된 텍스트를 배열로 변환하거나 그대로 저장
                    const genresArray = genresText.split(',').map(g => g.trim()).filter(g => g);
                    setFormData(prev => ({
                      ...prev,
                      genres: genresArray,
                      genresText: genresText
                    }));
                  }}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.genres ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="예: 로맨스, 코미디, 드라마 (쉼표로 구분)"
                  required
                />
                {errors.genres && (
                  <p className="text-red-500 text-xs mt-1">{errors.genres}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  크롤링된 장르 정보를 쉼표(,)로 구분하여 입력하세요.
                </p>
              </div>

              {/* Where to Watch */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">시청 플랫폼</label>
                <div className="bg-white border border-gray-300 rounded-md p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Where to Watch</h3>
                    <button
                      type="button"
                      onClick={crawlStreamingServices}
                      disabled={isSubmitting || !formData.mdlUrl}
                      className={`text-sm bg-blue-500 text-white py-1 px-3 rounded-md flex items-center ${
                        isSubmitting || !formData.mdlUrl ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          크롤링 중...
                        </>
                      ) : (
                        'MyDramalist에서 가져오기'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    {formData.mdlUrl ? (
                      <>MyDramalist에서 제공자 정보를 자동으로 가져올 수 있습니다.</>
                    ) : (
                      <>MyDramalist URL을 설정하면 제공자 정보를 자동으로 가져올 수 있습니다.</>
                    )}
                  </p>
                  
                  <div className="space-y-4">
                    {/* Netflix */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="netflix"
                          checked={selectedProviders.netflix}
                          onChange={() => handleProviderChange('netflix')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="netflix" className="ml-2 text-sm text-gray-700">
                          Netflix
                        </label>
                      </div>
                      {selectedProviders.netflix && (
                        <input
                          type="text"
                          value={formData.streamingLinks?.netflix || ''}
                          onChange={(e) => handleProviderUrlChange('netflix', e.target.value)}
                          placeholder="https://www.netflix.com/title/..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>

                    {/* Apple TV+ */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="apple"
                          checked={selectedProviders.apple}
                          onChange={() => handleProviderChange('apple')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="apple" className="ml-2 text-sm text-gray-700">
                          Apple TV+
                        </label>
                      </div>
                      {selectedProviders.apple && (
                        <input
                          type="text"
                          value={formData.streamingLinks?.apple || ''}
                          onChange={(e) => handleProviderUrlChange('apple', e.target.value)}
                          placeholder="https://tv.apple.com/show/..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>

                    {/* Disney+ */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="disney"
                          checked={selectedProviders.disney}
                          onChange={() => handleProviderChange('disney')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="disney" className="ml-2 text-sm text-gray-700">
                          Disney+
                        </label>
                      </div>
                      {selectedProviders.disney && (
                        <input
                          type="text"
                          value={formData.streamingLinks?.disney || ''}
                          onChange={(e) => handleProviderUrlChange('disney', e.target.value)}
                          placeholder="https://www.disneyplus.com/series/..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    
                    {/* Viki */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="viki"
                          checked={selectedProviders.viki}
                          onChange={() => handleProviderChange('viki')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="viki" className="ml-2 text-sm text-gray-700">
                          Viki
                        </label>
                      </div>
                      {selectedProviders.viki && (
                        <input
                          type="text"
                          value={formData.streamingLinks?.viki || ''}
                          onChange={(e) => handleProviderUrlChange('viki', e.target.value)}
                          placeholder="https://www.viki.com/tv/..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                    
                    {/* Wavve */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="wavve"
                          checked={selectedProviders.wavve}
                          onChange={() => handleProviderChange('wavve')}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="wavve" className="ml-2 text-sm text-gray-700">
                          Wavve
                        </label>
                      </div>
                      {selectedProviders.wavve && (
                        <input
                          type="text"
                          value={formData.streamingLinks?.wavve || ''}
                          onChange={(e) => handleProviderUrlChange('wavve', e.target.value)}
                          placeholder="https://www.wavve.com/player/..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Image (썸네일) 등록 */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">썸네일 이미지</label>
                <div className="flex items-center gap-4 mb-2">
                  {/* 미리보기 */}
                  <div className="w-24 h-32 bg-gray-100 border border-gray-300 rounded flex items-center justify-center overflow-hidden">
                    {imagePreview || formData.coverImage ? (
                      <img
                        src={imagePreview || formData.coverImage}
                        alt="썸네일 미리보기"
                        className="object-cover w-full h-full"
                        onError={e => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.svg'; }}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">No Image</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setImagePreview(ev.target.result);
                              setFormData(prev => ({ ...prev, coverImage: ev.target.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                      ref={coverFileInputRef}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <input
                      type="text"
                      placeholder="이미지 URL 입력"
                      value={imageUrl}
                      onChange={e => {
                        const url = e.target.value;
                        setImageUrl(url);
                        setUrlError('');
                        if (url) {
                          try {
                            new URL(url);
                            setImagePreview(url);
                            setFormData(prev => ({ ...prev, coverImage: url }));
                          } catch (error) {
                            setUrlError('유효한 이미지 URL을 입력해주세요.');
                            setImagePreview(null);
                          }
                        } else {
                          setImagePreview(null);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                    {fileError && <p className="text-red-500 text-xs mt-1">{fileError}</p>}
                    {urlError && <p className="text-red-500 text-xs mt-1">{urlError}</p>}
                  </div>
                </div>
              </div>

              {/* Banner Image (배경) 등록 */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">배경 이미지</label>
                <div className="flex items-center gap-4 mb-2">
                  {/* 미리보기 */}
                  <div className="w-40 h-24 bg-gray-100 border border-gray-300 rounded flex items-center justify-center overflow-hidden">
                    {bannerImagePreview || formData.bannerImage ? (
                      <img
                        src={bannerImagePreview || formData.bannerImage}
                        alt="배경 미리보기"
                        className="object-cover w-full h-full"
                        onError={e => { e.target.onerror = null; e.target.src = '/images/placeholder-tvfilm.svg'; }}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">No Image</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setBannerImagePreview(ev.target.result);
                              setFormData(prev => ({ ...prev, bannerImage: ev.target.result }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }
                      }}
                      ref={bannerFileInputRef}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <input
                      type="text"
                      placeholder="이미지 URL 입력"
                      value={bannerImageUrl}
                      onChange={e => {
                        const url = e.target.value;
                        setBannerImageUrl(url);
                        setBannerUrlError('');
                        if (url) {
                          try {
                            new URL(url);
                            setBannerImagePreview(url);
                            setFormData(prev => ({ ...prev, bannerImage: url }));
                          } catch (error) {
                            setBannerUrlError('유효한 이미지 URL을 입력해주세요.');
                            setBannerImagePreview(null);
                          }
                        } else {
                          setBannerImagePreview(null);
                        }
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                    {bannerFileError && <p className="text-red-500 text-xs mt-1">{bannerFileError}</p>}
                    {bannerUrlError && <p className="text-red-500 text-xs mt-1">{bannerUrlError}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">비디오 정보</h3>
                <p className="text-sm text-gray-500 mt-1">
                  트레일러, 티저, 하이라이트 등 다양한 종류의 비디오를 추가할 수 있습니다.
                </p>
              </div>
              
              {/* 영상 자동 검색 섹션 추가 */}
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium text-blue-700">영상 자동 검색</h4>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          // 검색어로 원제(originalTitle) + '영화' 키워드 사용
                          // 원제가 없으면 영어 제목, 둘 다 없으면 한글 제목 사용
                          let searchTitle = '';
                          
                          if (formData.originalTitle) {
                            // 원제가 있으면 원제 + 영화 키워드 사용
                            searchTitle = `${formData.originalTitle} 영화`;
                            console.log('원제를 사용하여 검색:', searchTitle);
                          } else if (formData.englishTitle) {
                            // 원제가 없고 영어 제목이 있으면 영어 제목 사용
                            searchTitle = formData.englishTitle;
                            console.log('영어 제목을 사용하여 검색:', searchTitle);
                          } else {
                            // 둘 다 없으면 한글 제목 사용
                            searchTitle = `${formData.title} 영화`;
                            console.log('한글 제목을 사용하여 검색:', searchTitle);
                          }
                          
                          if (!searchTitle) {
                            showToast('검색할 제목이 필요합니다.', 'error');
                            return;
                          }
                          
                          showToast(`"${searchTitle}" 관련 영상 검색 중...`, 'info');
                          console.log('영상 검색 시작:', searchTitle);
                          
                          // YouTube API 호출
                          const response = await fetch(`/api/youtube/search-videos?title=${encodeURIComponent(searchTitle)}&maxResults=5`);
                          const result = await response.json();
                          
                          if (!response.ok) {
                            throw new Error(result.message || '영상 검색 중 오류가 발생했습니다.');
                          }
                          
                          if (result.success && result.data.length > 0) {
                            console.log('YouTube 검색 결과:', result.data);
                            
                            // 기존 비디오 데이터와 결합하지 않고 덮어쓰기
                            const newVideos = result.data.map(video => ({
                              title: video.title,
                              type: video.title.toLowerCase().includes('trailer') ? 'trailer' : 
                                    video.title.toLowerCase().includes('teaser') ? 'teaser' : 'other',
                              url: video.url,
                              viewCount: video.viewCount,
                              publishedAt: video.publishedAt
                            }));
                            
                            console.log('새로운 비디오 데이터:', newVideos);
                            console.log('기존 비디오 데이터:', formData.videos);
                            
                            // 기존 데이터에 새 비디오 추가
                            setFormData(prev => {
                              const updatedData = {
                                ...prev,
                                videos: [...(Array.isArray(prev.videos) ? prev.videos : []), ...newVideos]
                              };
                              console.log('업데이트된 formData:', updatedData);
                              return updatedData;
                            });
                            
                            showToast(`${newVideos.length}개의 영상을 성공적으로 가져왔습니다. 저장 버튼을 눌러 변경사항을 저장하세요.`, 'success');
                          } else {
                            showToast('검색 결과가 없습니다.', 'warning');
                          }
                        } catch (error) {
                          console.error('영상 자동 검색 오류:', error);
                          showToast(`오류 발생: ${error.message}`, 'error');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      영상 자동 검색
                    </button>
                  </div>
                </div>
                <p className="text-sm text-blue-600 mb-2">
                  원제(한글) + '영화' 키워드로 YouTube에서 조회수가 높은 상위 5개 영상을 검색하여 추가합니다.
                </p>
                <div className="bg-yellow-50 p-2 rounded text-sm text-yellow-700">
                  <strong>주의:</strong> 영상을 추가한 후 반드시 하단의 <strong>저장</strong> 버튼을 클릭하여 변경사항을 저장해야 합니다.
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-5 bg-white mb-6">
                <div className="space-y-5">
                  {formData.videos && formData.videos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {formData.videos.map((video, index) => {
                        const videoId = getYoutubeIdFromUrl(video.url);
                        console.log("비디오 URL:", video.url, "추출된 ID:", videoId);
                        
                        return (
                          <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="aspect-video bg-gray-100">
                              {videoId ? (
                                <img 
                                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error("YouTube 썸네일 로드 실패:", videoId);
                                    e.target.onerror = null;
                                    e.target.src = '/images/placeholder-tvfilm.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <Play className="w-12 h-12 text-gray-400" />
                                </div>
                              )}
                              {video.viewCount && (
                                <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-tl-md">
                                  조회수: {video.viewCount.toLocaleString()}
                                </div>
                              )}
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900 truncate">{video.title}</h4>
                                <button
                                  onClick={() => {
                                    const updatedVideos = [...formData.videos];
                                    updatedVideos.splice(index, 1);
                                    setFormData(prev => ({
                                      ...prev,
                                      videos: updatedVideos
                                    }));
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <XCircle size={20} />
                                </button>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {video.type === 'trailer' ? '트레일러' : 
                                 video.type === 'teaser' ? '티저' : 
                                 video.type === 'highlight' ? '하이라이트' : 
                                 video.type === 'interview' ? '인터뷰' : '기타'}
                              </p>
                              {video.publishedAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(video.publishedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Play className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">추가된 비디오가 없습니다.</p>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          비디오 제목
                        </label>
                        <input
                          type="text"
                          value={videoTitleInput}
                          onChange={(e) => setVideoTitleInput(e.target.value)}
                          placeholder="비디오 제목을 입력하세요"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          비디오 유형
                        </label>
                        <select
                          value={videoTypeInput}
                          onChange={(e) => setVideoTypeInput(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="trailer">트레일러</option>
                          <option value="teaser">티저</option>
                          <option value="highlight">하이라이트</option>
                          <option value="interview">인터뷰</option>
                          <option value="other">기타</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          YouTube URL
                        </label>
                        <input
                          type="text"
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          if (videoTitleInput.trim() && videoUrlInput.trim()) {
                            // YouTube URL 검증
                            const videoId = getYoutubeIdFromUrl(videoUrlInput);
                            if (!videoId) {
                              showToast('유효한 YouTube URL을 입력해주세요.', 'error');
                              return;
                            }
                            
                            // 콘솔에 디버그 정보
                            console.log("비디오 추가:", {
                              title: videoTitleInput.trim(),
                              type: videoTypeInput,
                              url: videoUrlInput.trim(),
                              extractedId: videoId
                            });
                            
                            setFormData(prev => ({
                              ...prev,
                              videos: [
                                ...(Array.isArray(prev.videos) ? prev.videos : []),
                                {
                                  title: videoTitleInput.trim(),
                                  type: videoTypeInput,
                                  url: videoUrlInput.trim()
                                }
                              ]
                            }));
                            setVideoTitleInput('');
                            setVideoUrlInput('');
                          } else {
                            if (!videoTitleInput.trim()) {
                              showToast('비디오 제목을 입력해주세요.', 'error');
                            } else if (!videoUrlInput.trim()) {
                              showToast('YouTube URL을 입력해주세요.', 'error');
                            }
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        비디오 추가
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">리뷰 정보</h3>
                <p className="text-sm text-gray-500 mt-1">
                  리뷰는 콘텐츠에 대한 사용자의 개인적인 의견을 나타내는 섹션입니다.
                </p>
              </div>
              
              {/* 리뷰 크롤링 섹션 추가 */}
              <div className="border border-gray-200 rounded-lg p-5 bg-white mb-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3">리뷰 크롤링</h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <input
                      type="text"
                      className="form-input flex-1 rounded-md border-gray-300"
                      placeholder="MyDramalist 리뷰 URL (예: https://mydramalist.com/123-drama-title/reviews)"
                      value={reviewCrawlingUrl}
                      onChange={(e) => setReviewCrawlingUrl(e.target.value)}
                    />
                    <button
                      onClick={handleReviewCrawling}
                      disabled={isReviewCrawling || !reviewCrawlingUrl}
                      className={`px-4 py-2 rounded-md flex items-center justify-center ${
                        isReviewCrawling || !reviewCrawlingUrl
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isReviewCrawling ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full"></div>
                          크롤링 중...
                        </>
                      ) : (
                        <>크롤링 시작</>
                      )}
                    </button>
                  </div>
                  
                  {/* 스텔스 모드 토글 */}
                  <div className="flex items-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={useStealthCrawler}
                        onChange={() => setUseStealthCrawler(!useStealthCrawler)}
                      />
                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      <span className="ms-3 text-sm font-medium text-gray-900">스텔스 모드 사용 {useStealthCrawler ? '(활성화)' : '(비활성화)'}</span>
                    </label>
                    <span className="ml-2 text-xs text-gray-500">{useStealthCrawler ? '(Cloudflare 보호 우회)' : ''}</span>
                  </div>
                  
                  {/* 크롤링 진행 상태 표시 */}
                  {reviewCrawlingProgress && (
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-blue-500 rounded-full"></div>
                        <span>{reviewCrawlingProgress}</span>
                      </div>
                    </div>
                  )}

                  {/* 크롤링 오류 표시 */}
                  {reviewCrawlingError && (
                    <div className="mt-2 text-sm text-red-600 p-2 bg-red-50 rounded">
                      <p className="font-medium">오류 발생:</p>
                      <p>{reviewCrawlingError}</p>
                    </div>
                  )}

                  {/* 크롤링 결과 요약 */}
                  {reviewCrawlingResult && (
                    <div className="mt-2 text-sm text-green-600 p-2 bg-green-50 rounded">
                      <p className="font-medium">크롤링 완료:</p>
                      <p>총 {reviewCrawlingResult.reviews?.length || 0}개의 리뷰를 가져왔습니다.</p>
                      <p>평균 평점: {reviewCrawlingResult.averageRating?.toFixed(1) || 'N/A'}</p>
                    </div>
                  )}
                  
                  {/* 다시 가져오기 버튼 */}
                  <div className="mt-4">
                    <button
                      onClick={fetchReviews}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      리뷰 다시 불러오기
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 리뷰 목록 (DB에서 가져온 데이터) */}
              <div className="border border-gray-200 rounded-lg p-5 bg-white mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">크롤링된 리뷰 목록</h3>
                  <span className="text-sm bg-blue-100 text-blue-800 py-1 px-3 rounded-full">
                    {externalReviews.length}개 리뷰
                  </span>
                </div>
                
                {isLoadingReviews ? (
                  <div className="py-10 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">리뷰를 불러오는 중...</p>
                  </div>
                ) : reviewsError ? (
                  <div className="p-4 bg-red-50 text-red-700 rounded-md">
                    <p className="font-medium">리뷰를 불러오는데 실패했습니다:</p>
                    <p>{reviewsError}</p>
                  </div>
                ) : externalReviews.length === 0 ? (
                  <div className="text-center py-10">
                    <Star className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">저장된 리뷰가 없습니다.</p>
                    <p className="text-xs text-gray-400 mt-1">위 크롤링 도구를 사용해 리뷰를 가져오세요.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {externalReviews.map((review, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300 hover:border-pink-200 group relative">
                        {/* Decorative accent */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-pink-100 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        <div className="flex justify-between items-start mb-2 relative">
                          <div className="flex items-center">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-all duration-300">
                              {review.rating || 'N/A'}
                            </div>
                            <div className="ml-2">
                              <div className="text-sm font-semibold text-gray-800 group-hover:text-pink-600 transition-colors duration-300">
                                {review.username || '익명'}
                              </div>
                              <div className="flex mt-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= Math.floor((review.rating || 0) / 2)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">
                              {review.reviewDate || new Date(review.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => {
                                // 추후 삭제 기능 구현
                                if (confirm(`"${review.title}" 리뷰를 삭제하시겠습니까?`)) {
                                  fetch(`/api/reviews/${review.reviewId}`, {
                                    method: 'DELETE'
                                  })
                                  .then(res => res.json())
                                  .then(data => {
                                    if (data.success) {
                                      showToast('리뷰가 삭제되었습니다.', 'success');
                                      fetchReviews();
                                      fetchDramaData();
                                    } else {
                                      showToast(`삭제 실패: ${data.message}`, 'error');
                                    }
                                  })
                                  .catch(err => {
                                    showToast(`오류 발생: ${err.message}`, 'error');
                                  });
                                }
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <XCircle size={20} />
                            </button>
                          </div>
                        </div>
                        
                        <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                        <div className="text-sm text-gray-600 whitespace-pre-wrap mb-3 max-h-28 overflow-y-auto">
                          {review.reviewText}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="border border-gray-200 rounded-lg p-5 bg-white mb-6">
                <div className="space-y-5">
                  {formData.reviews && formData.reviews.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formData.reviews.map((review, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300 hover:border-pink-200 group relative">
                          {/* Decorative accent */}
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-pink-100 to-transparent rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <div className="flex justify-between items-start mb-2 relative">
                            <div className="flex items-center">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:shadow-md transition-all duration-300">
                                {review.rating}
                              </div>
                              <div className="ml-2">
                                <div className="text-sm font-semibold text-gray-800 group-hover:text-pink-600 transition-colors duration-300">
                                  {review.authorName}
                                </div>
                                <div className="flex mt-0.5">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                      key={star}
                                      className={`w-3 h-3 ${
                                        star <= Math.floor(review.rating / 2)
                                          ? 'text-yellow-400 fill-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const updatedReviews = [...formData.reviews];
                                updatedReviews.splice(index, 1);
                                setFormData(prev => ({
                                  ...prev,
                                  reviews: updatedReviews
                                }));
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <XCircle size={20} />
                            </button>
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">{review.content}</p>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex flex-wrap gap-1">
                              {review.tags && review.tags.length > 0 ? (
                                review.tags.map((tag, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full group-hover:bg-pink-50 group-hover:text-pink-600 transition-colors duration-300">
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full">Review</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleSetFeaturedReview(index)}
                              className={`px-3 py-1 rounded-md text-sm ${
                                review.featured
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {review.featured ? '대표 리뷰로 설정됨' : '대표 리뷰로 설정'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Star className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">추가된 리뷰가 없습니다.</p>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-200 pt-5">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          리뷰 제목
                        </label>
                        <input
                          type="text"
                          value={reviewTitleInput}
                          onChange={(e) => setReviewTitleInput(e.target.value)}
                          placeholder="리뷰 제목을 입력하세요"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          작성자
                        </label>
                        <input
                          type="text"
                          value={reviewAuthorInput}
                          onChange={(e) => setReviewAuthorInput(e.target.value)}
                          placeholder="작성자 이름을 입력하세요"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          평점 (1-10)
                        </label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={reviewRatingInput}
                            onChange={(e) => setReviewRatingInput(parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium text-gray-700 w-8 text-center">
                            {reviewRatingInput}
                          </span>
                        </div>
                        <div className="flex mt-1">
                          {[...Array(10)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-xl ${
                                i < reviewRatingInput ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          리뷰 내용
                        </label>
                        <textarea
                          value={reviewContentInput}
                          onChange={(e) => setReviewContentInput(e.target.value)}
                          placeholder="리뷰 내용을 입력하세요"
                          rows={4}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          태그 (쉼표로 구분)
                        </label>
                        <input
                          type="text"
                          value={reviewTagsInput}
                          onChange={(e) => setReviewTagsInput(e.target.value)}
                          placeholder="예: 연기, 스토리, OST"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (reviewTitleInput.trim() && reviewAuthorInput.trim() && reviewContentInput.trim()) {
                            setFormData(prev => ({
                              ...prev,
                              reviews: [
                                ...(prev.reviews || []),
                                {
                                  title: reviewTitleInput.trim(),
                                  authorName: reviewAuthorInput.trim(),
                                  rating: reviewRatingInput,
                                  content: reviewContentInput.trim(),
                                  tags: reviewTagsInput.split(',').map(tag => tag.trim()).filter(Boolean),
                                  featured: prev.reviews.length === 0, // 첫 번째 리뷰는 자동으로 대표 리뷰로 설정
                                  approved: true // 관리자가 추가하는 리뷰는 자동 승인
                                }
                              ]
                            }));
                            setReviewTitleInput('');
                            setReviewAuthorInput('');
                            setReviewRatingInput(5);
                            setReviewContentInput('');
                            setReviewTagsInput('');
                          } else {
                            if (!reviewTitleInput.trim()) {
                              showToast('리뷰 제목을 입력해주세요.', 'error');
                            } else if (!reviewAuthorInput.trim()) {
                              showToast('작성자 이름을 입력해주세요.', 'error');
                            } else if (!reviewContentInput.trim()) {
                              showToast('리뷰 내용을 입력해주세요.', 'error');
                            }
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        리뷰 추가
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'episodes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">에피소드 관리</h2>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => crawlEpisodes()}
                    disabled={isSubmitting}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Play size={18} className="mr-1" />
                    에피소드 크롤링
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetEpisodeForm();
                      setShowEpisodeForm(true);
                    }}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Plus size={18} className="mr-1" />
                    에피소드 추가
                  </button>
                </div>
              </div>
              
              {/* 에피소드 입력 폼 */}
              {showEpisodeForm && (
                <div className="bg-gray-50 p-4 mb-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-3">
                    {formData._editingEpisodeIndex !== undefined ? '에피소드 수정' : '새 에피소드 추가'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        에피소드 번호*
                      </label>
                      <input
                        type="number"
                        value={episodeNumber}
                        onChange={(e) => setEpisodeNumber(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="1"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        제목
                      </label>
                      <input
                        type="text"
                        value={episodeTitle}
                        onChange={(e) => setEpisodeTitle(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="에피소드 제목"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        방영일
                      </label>
                      <input
                        type="date"
                        value={episodeAirDate}
                        onChange={(e) => setEpisodeAirDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        런타임 (분)
                      </label>
                      <input
                        type="number"
                        value={episodeRuntime}
                        onChange={(e) => setEpisodeRuntime(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="1"
                        placeholder="60"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        평점 (0-10)
                      </label>
                      <input
                        type="number"
                        value={episodeRating}
                        onChange={(e) => setEpisodeRating(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                        max="10"
                        step="0.1"
                        placeholder="0.0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        시청률 (%)
                      </label>
                      <input
                        type="number"
                        value={episodeViewerRating}
                        onChange={(e) => setEpisodeViewerRating(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="0.0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        이미지 URL
                      </label>
                      <input
                        type="text"
                        value={episodeImage}
                        onChange={(e) => setEpisodeImage(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        MDL URL
                      </label>
                      <input
                        type="text"
                        value={episodeMdlUrl}
                        onChange={(e) => setEpisodeMdlUrl(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="https://mydramalist.com/..."
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      줄거리
                    </label>
                    <textarea
                      value={episodeSummary}
                      onChange={(e) => setEpisodeSummary(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows="3"
                      placeholder="에피소드 줄거리..."
                    ></textarea>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetEpisodeForm();
                        setShowEpisodeForm(false);
                      }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={saveEpisode}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
              
              {/* 에피소드 목록 */}
              {formData.episodeList && formData.episodeList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">번호</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제목</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">방영일</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평점</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시청률</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.episodeList.sort((a, b) => a.number - b.number).map((episode, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">{episode.number}</td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{episode.title || `에피소드 ${episode.number}`}</div>
                            {episode.summary && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{episode.summary}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {episode.airDate ? new Date(episode.airDate).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {episode.rating ? (
                              <div className="flex items-center">
                                <Star size={16} className="text-yellow-400 mr-1" />
                                <span>{episode.rating.toFixed(1)}</span>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {episode.viewerRating ? `${episode.viewerRating.toFixed(1)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              type="button"
                              onClick={() => editEpisode(index)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEpisode(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-50 p-8 text-center rounded-lg border">
                  <p className="text-gray-500 mb-4">등록된 에피소드가 없습니다.</p>
                  <p className="text-sm text-gray-400">
                    오른쪽 상단의 버튼을 클릭하여 에피소드를 추가하거나 크롤링할 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 기타 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">기타 정보</h2>
          
          {/* ... existing code ... */}
          
          {/* 리뷰 크롤링 섹션 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">리뷰 크롤링</h3>
            <p className="text-sm text-gray-600 mb-2">
              MyDramalist에서 리뷰를 자동으로 수집합니다.
              드라마 URL을 입력하면 /reviews가 없는 경우 자동으로 추가됩니다.
            </p>
            
            <div className="flex items-end space-x-2 mb-2">
              <div className="flex-grow">
                <label className="block text-gray-700 text-sm font-medium mb-1">MyDramalist URL</label>
                <input
                  type="text"
                  value={reviewCrawlingUrl}
                  onChange={(e) => setReviewCrawlingUrl(e.target.value)}
                  placeholder="https://mydramalist.com/드라마ID-드라마제목"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={isReviewCrawling}
                />
                {formData.mdlUrl && !reviewCrawlingUrl && (
                  <button
                    type="button"
                    onClick={() => setReviewCrawlingUrl(formData.mdlUrl)}
                    className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    기존 MDL URL 사용하기
                  </button>
                )}
              </div>
              <button
                onClick={handleReviewCrawling}
                disabled={isReviewCrawling || !reviewCrawlingUrl}
                className={`px-4 py-2 rounded-md ${
                  isReviewCrawling
                    ? 'bg-gray-400 cursor-not-allowed'
                    : !reviewCrawlingUrl
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium transition-colors`}
              >
                {isReviewCrawling ? (
                  <>
                    <span className="inline-block animate-spin mr-1">⟳</span> 크롤링 중...
                  </>
                ) : (
                  '리뷰 크롤링'
                )}
              </button>
            </div>
            
            {/* 크롤링 진행 상태 */}
            {(isReviewCrawling || reviewCrawlingProgress) && (
              <div className="mt-2 mb-3">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${isReviewCrawling ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-sm text-gray-700">{isReviewCrawling ? '크롤링 진행 중...' : reviewCrawlingProgress}</span>
                </div>
                {isReviewCrawling && (
                  <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full animate-progress"></div>
                  </div>
                )}
              </div>
            )}
            
            {/* 에러 메시지 */}
            {reviewCrawlingError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                <p className="font-medium">크롤링 오류 발생:</p>
                <p>{reviewCrawlingError}</p>
                <p className="mt-1 text-xs text-gray-500">
                  URL이 올바른지 확인하고 다시 시도해보세요. Cloudflare 보호가 활성화되어 있을 수 있습니다.
                </p>
              </div>
            )}
            
            {/* 리뷰 크롤링 결과 */}
            {reviewCrawlingResult && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 font-medium">
                  {reviewCrawlingResult.reviews.length}개의 리뷰를 성공적으로 수집했습니다.
                </p>
                <div className="mt-3 space-y-2">
                  {reviewCrawlingResult.reviews.slice(0, 5).map((review, idx) => (
                    <div key={idx} className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold mr-2">
                        {review.rating}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{review.username}</div>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-sm ${
                                i < Math.round(review.rating / 2)
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="text-xs text-gray-500 ml-2">
                            ({new Date(review.createdAt).toLocaleDateString()})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reviewCrawlingResult.reviews.length > 5 && (
                    <div className="pt-2 mt-2 border-t border-green-100 text-gray-500 text-sm">
                      ...외 {reviewCrawlingResult.reviews.length - 5}개
                    </div>
                  )}
                </div>
                
                {/* 전체 평점 정보 표시 */}
                {reviewCrawlingResult.reviews.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">리뷰 요약</h4>
                    <div className="flex items-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-xl shadow-sm mr-4">
                        {(reviewCrawlingResult.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCrawlingResult.reviews.length).toFixed(1)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-green-700">평균 평점 (Overall)</div>
                        <div className="flex mt-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= Math.round(reviewCrawlingResult.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCrawlingResult.reviews.length / 2)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-green-700 mt-1">
                          {reviewCrawlingResult.reviews.length}개 리뷰 기준
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {toast.visible && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <div className={`flex items-center p-4 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-100 text-green-800' :
            toast.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {toast.message}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// 서버 사이드에서 인증 확인
export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  if (!session || !session.user || !['admin', 'editor'].includes(session.user.role)) {
    return {
      redirect: {
        destination: '/login?from=' + encodeURIComponent(context.resolvedUrl),
        permanent: false,
      },
    };
  }
  
  return {
    props: { session },
  };
} 

// cast 데이터 처리 함수
const processCast = (castData) => {
  if (!castData) return [];
  
  // 이미 배열인 경우 (일반 cast 배열)
  if (Array.isArray(castData)) {
    return castData.map(member => ({
      name: member.name || '',
      role: member.role || '',
      image: member.image || member.profileImage || '',
    }));
  }
  
  // cast가 {mainRoles: [], supportRoles: []} 구조인 경우
  if (castData.mainRoles || castData.supportRoles) {
    const allCast = [];
    
    // 주연 배우 추가
    if (Array.isArray(castData.mainRoles)) {
      castData.mainRoles.forEach(actor => {
        allCast.push({
          name: actor.name || '',
          role: (actor.role || '') + ' (주연)',
          image: actor.image || '',
        });
      });
    }
    
    // 조연 배우 추가
    if (Array.isArray(castData.supportRoles)) {
      castData.supportRoles.forEach(actor => {
        allCast.push({
          name: actor.name || '',
          role: (actor.role || '') + ' (조연)',
          image: actor.image || '',
        });
      });
    }
    
    return allCast;
  }
  
  return [];
}; 

// 영어 제목인지 확인하는 함수
const isEnglishTitle = (title) => {
  if (!title) return false;
  
  // 한글 문자가 포함되어 있지 않은지 확인
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(title);
  
  // 영어 문자가 포함되어 있는지 확인
  const hasEnglish = /[a-zA-Z]/.test(title);
  
  // 한글이 없고, 영어가 있으면 영어 제목으로 간주
  return !hasKorean && hasEnglish;
}; 