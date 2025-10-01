import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { 
  X, 
  Plus, 
  Upload, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Loader,
  Save,
  ArrowLeft,
  Star,
  MessageSquare,
  Edit,
  XCircle,
  User,
  Users,
  Check,
  Play
} from 'lucide-react';
import Toast from '../../../components/common/Toast';
import slugify from 'slugify';
import GenresEditor from '../../../components/admin/GenresEditor';
import { uploadImages, deleteImages } from '../../../lib/upload';
import axios from 'axios';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Import QuillEditor dynamically to avoid SSR issues
const QuillEditor = dynamic(() => import('../../../components/Editor'), {
  ssr: false
});

// 임시 컴포넌트 - PersonSelect
const PersonSelect = ({ onSelect }) => {
  return (
    <select 
      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      onChange={(e) => {
        if (e.target.value) {
          onSelect({
            id: e.target.value,
            name: e.target.options[e.target.selectedIndex].text,
            profileImage: ''
          });
        }
      }}
    >
      <option value="">인물 선택...</option>
      <option value="person1">홍길동</option>
      <option value="person2">김철수</option>
      <option value="person3">이영희</option>
    </select>
  );
};

// 임시 컴포넌트 - GroupSelect
const GroupSelect = ({ onSelect }) => {
  return (
    <select 
      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      onChange={(e) => {
        if (e.target.value) {
          onSelect({
            id: e.target.value,
            name: e.target.options[e.target.selectedIndex].text,
            profileImage: ''
          });
        }
      }}
    >
      <option value="">그룹 선택...</option>
      <option value="group1">BTS</option>
      <option value="group2">BLACKPINK</option>
      <option value="group3">EXO</option>
    </select>
  );
};

// 카테고리 옵션
const CATEGORY_OPTIONS = [
  { value: 'drama', label: '드라마' },
  { value: 'movie', label: '영화' },
  { value: 'variety', label: '예능' },
  { value: 'documentary', label: '다큐멘터리' },
  { value: 'animation', label: '애니메이션' },
  { value: 'web_series', label: '웹 시리즈' },
  { value: 'other', label: '기타' }
];

// 장르 옵션
const GENRE_OPTIONS = [
  { value: 'romance', label: 'Romance' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'action', label: 'Action' },
  { value: 'drama', label: 'Drama' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'historical', label: 'Historical' },
  { value: 'crime', label: 'Crime' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'horror', label: 'Horror' },
  { value: 'sports', label: 'Sports' },
  { value: 'music', label: 'Music' },
  { value: 'family', label: 'Family' },
  { value: 'youth', label: 'Youth' },
  { value: 'medical', label: 'Medical' },
  { value: 'legal', label: 'Legal' },
  { value: 'military', label: 'Military' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'reality', label: 'Reality' }
];

export default function ContentForm() {
  const router = useRouter();
  const { id } = router.query;
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    // Basic Information
    title: '',
    originalTitle: '',
    description: '',
    summary: '',
    status: 'ongoing',
    country: 'KOREA',
    releaseDate: format(new Date(), 'yyyy-MM-dd'),
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
      disney: ''
    },
    
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
    reviews: []
  });
  
  const [isLoading, setIsLoading] = useState(isEditMode);
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
    disney: false
  });

  // 탭 완료 상태 관리
  const [completedTabs, setCompletedTabs] = useState({
    basic: false,
    videos: false,
    reviews: false
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

  // 폼 입력값 변경 처리
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 필드 에러 지우기
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: null
      }));
    }
  };

  // 컨텐츠 본문 에디터 내용 변경 처리
  const handleEditorChange = (content) => {
    setFormData(prevData => ({
      ...prevData,
      content
    }));
    
    if (errors.content) {
      setErrors(prevErrors => ({
        ...prevErrors,
        content: null
      }));
    }
  };

  // YouTube URL에서 비디오 ID 추출
  const getYoutubeIdFromUrl = (url) => {
    if (!url) return null;
    
    // 유튜브 URL 패턴 매칭
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // 토스트 메시지 표시
  const showToast = (message, type = 'info') => {
    setToastState({ visible: true, message, type });
    setTimeout(() => setToastState({ visible: false, message: '', type: '' }), 3000);
  };

  // URL 이미지 핸들러
  const handleCoverImageUrlChange = (e) => {
    const url = e.target.value;
    setImageUrl(url);
    setUrlError('');

    if (url) {
      // URL 유효성 검사
      try {
        new URL(url);
        // 이미지 미리보기 설정
        setImagePreview(url);
        setFormData({
          ...formData,
          coverImage: url
        });
      } catch (error) {
        setUrlError('유효한 이미지 URL을 입력해주세요.');
        setImagePreview(null);
      }
    } else {
      setImagePreview(null);
    }
  };

  const handleBannerImageUrlChange = (e) => {
    const url = e.target.value;
    setBannerImageUrl(url);
    setBannerUrlError('');

    if (url) {
      // URL 유효성 검사
      try {
        new URL(url);
        // 이미지 미리보기 설정
        setBannerImagePreview(url);
        setFormData({
          ...formData,
          bannerImage: url
        });
      } catch (error) {
        setBannerUrlError('유효한 이미지 URL을 입력해주세요.');
        setBannerImagePreview(null);
      }
    } else {
      setBannerImagePreview(null);
    }
  };

  // 이미지 업로드 핸들러
  const handleCoverImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
          setFormData({
            ...formData,
            coverImage: e.target.result
          });
          setFileError('');
        };
        reader.readAsDataURL(file);
      } else {
        setFileError('이미지 파일만 업로드 가능합니다.');
      }
    }
  };

  const handleBannerImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setBannerImagePreview(e.target.result);
          setFormData({
            ...formData,
            bannerImage: e.target.result
          });
          setBannerFileError('');
        };
        reader.readAsDataURL(file);
      } else {
        setBannerFileError('이미지 파일만 업로드 가능합니다.');
      }
    }
  };

  const handleGalleryImagesChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const imagePromises = files.map(file => {
        if (file.type.startsWith('image/')) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
        }
        return null;
      });

      Promise.all(imagePromises.filter(Boolean)).then(images => {
        setFormData({
          ...formData,
          galleryImages: [...formData.galleryImages, ...images]
        });
      });
    }
  };

  const removeGalleryImage = (index) => {
    const updatedImages = [...formData.galleryImages];
    updatedImages.splice(index, 1);
    setFormData({
      ...formData,
      galleryImages: updatedImages
    });
  };

  // 출연진 관련 핸들러
  const handleCastChange = (index, field, value) => {
    const updatedCast = [...formData.cast];
    updatedCast[index] = {
      ...updatedCast[index],
      [field]: value
    };
    setFormData({
      ...formData,
      cast: updatedCast
    });
  };

  // 출연진 프로필 이미지 URL 핸들러
  const handleCastProfileUrlChange = (index, url) => {
    const newUrls = [...castProfileUrls];
    const newErrors = [...castProfileErrors];
    
    newUrls[index] = url;
    newErrors[index] = '';

    if (url) {
      try {
        new URL(url);
        // 유효한 URL인 경우 cast 정보 업데이트
        const updatedCast = [...formData.cast];
        updatedCast[index] = {
          ...updatedCast[index],
          profileImage: url
        };
        setFormData({
          ...formData,
          cast: updatedCast
        });
      } catch (error) {
        newErrors[index] = '유효한 이미지 URL을 입력해주세요.';
      }
    } else {
      // URL이 비어있는 경우 cast 정보 업데이트
      const updatedCast = [...formData.cast];
      updatedCast[index] = {
        ...updatedCast[index],
        profileImage: ''
      };
      setFormData({
        ...formData,
        cast: updatedCast
      });
    }

    setCastProfileUrls(newUrls);
    setCastProfileErrors(newErrors);
  };

  const addCastMember = () => {
    setFormData({
      ...formData,
      cast: [...formData.cast, { name: '', role: '', profileImage: '' }]
    });
    setCastProfileUrls([...castProfileUrls, '']);
    setCastProfileErrors([...castProfileErrors, '']);
  };

  const removeCastMember = (index) => {
    const updatedCast = [...formData.cast];
    updatedCast.splice(index, 1);
    setFormData({
      ...formData,
      cast: updatedCast
    });

    const newUrls = [...castProfileUrls];
    newUrls.splice(index, 1);
    setCastProfileUrls(newUrls);

    const newErrors = [...castProfileErrors];
    newErrors.splice(index, 1);
    setCastProfileErrors(newErrors);
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
            url: formData.streamingLinks.netflix
          };
          break;
        case 'apple':
          providerInfo = {
            name: 'Apple TV+',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg',
            type: 'subscription',
            price: '8,900원/월',
            quality: ['HD', '4K'],
            url: formData.streamingLinks.apple
          };
          break;
        case 'disney':
          providerInfo = {
            name: 'Disney+',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
            type: 'subscription',
            price: '9,900원/월',
            quality: ['HD', '4K'],
            url: formData.streamingLinks.disney
          };
          break;
      }

      setFormData(prev => ({
        ...prev,
        watchProviders: [...prev.watchProviders, providerInfo]
      }));
    } else {
      // 서비스 제거
      setFormData(prev => ({
        ...prev,
        watchProviders: prev.watchProviders.filter(p => p.name.toLowerCase() !== provider)
      }));
    }
  };

  const handleProviderUrlChange = (provider, url) => {
    setFormData(prev => ({
      ...prev,
      streamingLinks: {
        ...prev.streamingLinks,
        [provider]: url
      },
      watchProviders: prev.watchProviders.map(p => {
        if (p.name.toLowerCase().includes(provider)) {
          return { ...p, url };
        }
        return p;
      })
    }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // 필수 필드 검증
    const newErrors = {};
    if (!formData.title) newErrors.title = '제목을 입력해주세요.';
    if (!formData.description) newErrors.description = '줄거리를 입력해주세요.';
    if (!formData.status) newErrors.status = '상태를 선택해주세요.';
    if (!formData.releaseDate) newErrors.releaseDate = '방영일을 선택해주세요.';
    if (formData.genres.length === 0) newErrors.genres = '최소 하나의 장르를 선택해주세요.';
    if (!formData.category) newErrors.category = '카테고리를 선택해주세요.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // 인증 토큰 가져오기
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      const url = isEditMode ? `/api/dramas/${id}` : '/api/dramas';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '콘텐츠 저장 중 오류가 발생했습니다.');
      }
      
      showToast(`콘텐츠가 성공적으로 ${isEditMode ? '수정' : '등록'}되었습니다.`, 'success');
      setTimeout(() => router.push('/admin/content'), 1500);
    } catch (err) {
      console.error('Error saving content:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 대표 리뷰 설정 핸들러
  const handleSetFeaturedReview = (index) => {
    setFormData(prev => ({
      ...prev,
      reviews: prev.reviews.map((review, i) => ({
        ...review,
        isFeatured: i === index
      }))
    }));
  };

  const addGenre = () => {
    const selectedGenre = GENRE_OPTIONS.find(genre => genre.value === genreInput);
    if (selectedGenre && !formData.genres.includes(selectedGenre.value)) {
      setFormData(prev => ({
        ...prev,
        genres: [...prev.genres, selectedGenre.value]
      }));
      setGenreInput('');
    }
  };

  const removeGenre = (genreToRemove) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(genre => genre !== genreToRemove)
    }));
  };

  // UI 반환
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
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditMode ? '콘텐츠 수정' : '새 콘텐츠 등록'}
            </h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <Save size={18} className="mr-1" />
            {isEditMode ? '저장' : '등록'}
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
            </div>
            <div className="text-sm text-gray-500">
              {Object.values(completedTabs).filter(Boolean).length}/3 단계 완료
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
                  onChange={(e) => {
                    handleInputChange(e);
                    // 카테고리가 드라마가 아닌 경우 방송사와 상태 필드 초기화
                    if (e.target.value !== 'drama') {
                      setFormData(prev => ({
                        ...prev,
                        network: '',
                        status: ''
                      }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">카테고리를 선택하세요</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
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
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
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
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="원제를 입력하세요"
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
                  value={formData.description}
                  onChange={handleInputChange}
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
                  type="date"
                  id="releaseDate"
                  name="releaseDate"
                  value={formData.releaseDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.releaseDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.releaseDate && <p className="text-red-500 text-xs mt-1">{errors.releaseDate}</p>}
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
                  onChange={handleInputChange}
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
                <select
                  id="ageRating"
                  name="ageRating"
                  value={formData.ageRating}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.ageRating ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">연령 등급을 선택하세요</option>
                  <option value="ALL">전체 관람가</option>
                  <option value="12">12세 이상</option>
                  <option value="15">15세 이상</option>
                  <option value="18">18세 이상</option>
                </select>
                {errors.ageRating && <p className="text-red-500 text-xs mt-1">{errors.ageRating}</p>}
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
                  onChange={handleInputChange}
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
                        {member.profileImage ? (
                          <img
                            src={member.profileImage}
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
                          onChange={e => handleCastChange(idx, 'name', e.target.value)}
                          className="w-32 px-2 py-1 border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          placeholder="역할 (예: 주연, 조연, 특별출연 등)"
                          value={member.role || ''}
                          onChange={e => handleCastChange(idx, 'role', e.target.value)}
                          className="w-40 px-2 py-1 border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          placeholder="프로필 이미지 URL"
                          value={member.profileImage || ''}
                          onChange={e => handleCastChange(idx, 'profileImage', e.target.value)}
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
                  onClick={addCastMember}
                >
                  <Plus size={16} className="mr-1" /> 출연진 추가
                </button>
              </div>

              {/* Genres */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  장르 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {GENRE_OPTIONS.map((genre) => (
                    <div key={genre.value} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`genre-${genre.value}`}
                        checked={formData.genres.includes(genre.value)}
                        onChange={() => {
                          setFormData(prev => ({
                            ...prev,
                            genres: prev.genres.includes(genre.value)
                              ? prev.genres.filter(g => g !== genre.value)
                              : [...prev.genres, genre.value]
                          }));
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`genre-${genre.value}`}
                        className="ml-2 text-sm text-gray-700"
                      >
                        {genre.label}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.genres && (
                  <p className="text-red-500 text-xs mt-1">{errors.genres}</p>
                )}
              </div>

              {/* Where to Watch */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Where to Watch
                </label>
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
                        value={formData.streamingLinks.netflix}
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
                        value={formData.streamingLinks.apple}
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
                        value={formData.streamingLinks.disney}
                        onChange={(e) => handleProviderUrlChange('disney', e.target.value)}
                        placeholder="https://www.disneyplus.com/series/..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
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
                      onChange={handleCoverImageChange}
                      ref={coverFileInputRef}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <input
                      type="text"
                      placeholder="이미지 URL 입력"
                      value={imageUrl}
                      onChange={handleCoverImageUrlChange}
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
                      onChange={handleBannerImageChange}
                      ref={bannerFileInputRef}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <input
                      type="text"
                      placeholder="이미지 URL 입력"
                      value={bannerImageUrl}
                      onChange={handleBannerImageUrlChange}
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
              
              <div className="border border-gray-200 rounded-lg p-5 bg-white mb-6">
                <div className="space-y-5">
                  {formData.videos && formData.videos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {formData.videos.map((video, index) => {
                        const videoId = getYoutubeIdFromUrl(video.url);
                        return (
                          <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="aspect-video bg-gray-100">
                              {videoId ? (
                                <img 
                                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <Play className="w-12 h-12 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">{video.title}</h4>
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
                            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
                            if (!youtubeRegex.test(videoUrlInput)) {
                              toast.error('유효한 YouTube URL을 입력해주세요.');
                              return;
                            }
                            
                            setFormData(prev => ({
                              ...prev,
                              videos: [
                                ...(prev.videos || []),
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
                              toast.error('비디오 제목을 입력해주세요.');
                            } else if (!videoUrlInput.trim()) {
                              toast.error('YouTube URL을 입력해주세요.');
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
                                review.isFeatured
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {review.isFeatured ? '대표 리뷰로 설정됨' : '대표 리뷰로 설정'}
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
                                  isFeatured: prev.reviews.length === 0, // 첫 번째 리뷰는 자동으로 대표 리뷰로 설정
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
                              toast.error('리뷰 제목을 입력해주세요.');
                            } else if (!reviewAuthorInput.trim()) {
                              toast.error('작성자 이름을 입력해주세요.');
                            } else if (!reviewContentInput.trim()) {
                              toast.error('리뷰 내용을 입력해주세요.');
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
        </div>
      </div>
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