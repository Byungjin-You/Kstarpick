import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../../../components/AdminLayout';
import { useRouter } from 'next/router';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { X, Plus, Upload, ExternalLink, Eye, EyeOff, Loader } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Cookies from 'js-cookie';
import CastEditor from '../../../../components/admin/CastEditor';
import WatchProvidersEditor from '../../../../components/admin/WatchProvidersEditor';
import VideosEditor from '../../../../components/admin/VideosEditor';
import ReviewsEditor from '../../../../components/admin/ReviewsEditor';
import { toast } from 'react-hot-toast';

// Import QuillEditor dynamically to avoid SSR issues
const QuillEditor = dynamic(() => import('../../../../components/Editor'), {
  ssr: false
});

// 이미지 업로드 함수 추가
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

function EditTVFilm() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [isDragging, setIsDragging] = useState(false);
  const [isBannerDragging, setIsBannerDragging] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'media', 'cast', 'providers', 'videos', 'info', 'reviews'
  const [formData, setFormData] = useState({
    title: '',
    originalTitle: '',
    category: '',
    coverImage: null,
    bannerImage: null,
    summary: '',
    network: '',
    status: 'Ongoing',
    releaseDate: '',
    rating: '',
    runtime: '',
    ageRating: '',
    director: '',
    country: '',
    tags: [],
    trailerUrl: '',
    cast: [],
    watchProviders: [],
    videos: [],
    genres: [],
    productionCountry: '',
    content: '',
    reviews: [],
    reviewRating: 0,
    reviewCount: 0,
    ratingDistribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  });
  const [originalCoverImage, setOriginalCoverImage] = useState('');
  const [originalBannerImage, setOriginalBannerImage] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [bannerFileError, setBannerFileError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewsLastSaved, setReviewsLastSaved] = useState([]);
  const [hasReviewChanges, setHasReviewChanges] = useState(false);
  
  const coverFileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);
  const editorRef = useRef(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // NextAuth 세션 확인
        if (status === 'loading') return; // 세션 로딩 중이면 기다립니다
        
        if (session?.user?.role === 'admin') {
          console.log('NextAuth 세션으로 인증됨:', session.user);
          setAuthChecked(true);
          return; // 인증 성공, 다음 코드를 진행합니다
        }
        
        // 토큰 확인
        const token = Cookies.get('token') || localStorage.getItem('token');
        console.log('저장된 토큰 확인:', token ? token.substring(0, 10) + '...' : '토큰 없음');
        
        if (!token) {
          console.log('토큰이 없어 로그인 페이지로 이동합니다.');
          router.push('/admin/login');
          return;
        }
        
        // 토큰 유효성 확인 (선택적)
        try {
          console.log('관리자 권한 확인 API 호출...');
          const authCheck = await axios.get('/api/auth/check-admin', {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          });
          
          console.log('관리자 권한 확인 결과:', authCheck.data);
          
          if (!authCheck.data.isAdmin) {
            console.log('관리자 권한이 없어 로그인 페이지로 이동합니다.');
            // 토큰이 더 이상 유효하지 않으므로 제거
            Cookies.remove('token');
            localStorage.removeItem('token');
            router.push('/admin/login');
          } else {
            console.log('관리자 권한 확인됨, 페이지 접근 허용');
            // 토큰이 유효하므로 쿠키에도 저장 (혹시 로컬 스토리지에만 있는 경우)
            if (!Cookies.get('token')) {
              Cookies.set('token', token, { expires: 7 });
            }
            setAuthChecked(true);
          }
        } catch (err) {
          console.error('인증 확인 중 오류:', err);
          console.error('에러 응답:', err.response?.data);
          console.error('에러 상태:', err.response?.status);
          
          // 토큰이 더 이상 유효하지 않으므로 제거
          Cookies.remove('token');
          localStorage.removeItem('token');
          router.push('/admin/login');
        }
      } catch (err) {
        console.error('인증 과정에서 오류 발생:', err);
        router.push('/admin/login');
      }
    };
    
    checkAuth();
  }, [router, session, status]);

  // 편집할 TV/Film 데이터 로드
  useEffect(() => {
    if (!id || !authChecked) return;
    
    const fetchTVFilm = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching TV/Film with ID:', id);
        const response = await axios.get(`/api/tvfilm/${id}`);
        
        // API 응답 전체 로깅
        console.log("Raw API response:", response);
        
        // data 필드 확인
        if (!response.data || !response.data.data) {
          console.error("Invalid API response format - missing data field:", response.data);
          setErrors({ general: 'API 응답 형식이 잘못되었습니다. data 필드가 없습니다.' });
          setIsLoading(false);
          return;
        }
        
        const tvfilmData = response.data.data;
        console.log("Fetched TV/Film raw data:", JSON.stringify(tvfilmData, null, 2));
        
        // 문제가 되는 필드 확인
        console.log("Checking problematic fields:");
        console.log("- Category:", tvfilmData.category);
        console.log("- Original Title:", tvfilmData.originalTitle);
        console.log("- Cover Image:", tvfilmData.coverImage);
        console.log("- Banner Image:", tvfilmData.bannerImage);
        console.log("- Cast:", typeof tvfilmData.cast, Array.isArray(tvfilmData.cast));
        console.log("- Watch Providers:", typeof tvfilmData.watchProviders, Array.isArray(tvfilmData.watchProviders));
        console.log("- Videos:", typeof tvfilmData.videos, Array.isArray(tvfilmData.videos));
        console.log("- Director:", tvfilmData.director);
        console.log("- Runtime:", tvfilmData.runtime);
        console.log("- Rating:", tvfilmData.rating);
        console.log("- Country:", tvfilmData.country);
        console.log("- Age Rating:", tvfilmData.ageRating);
        console.log("- Reviews:", typeof tvfilmData.reviews, Array.isArray(tvfilmData.reviews));
        
        // 명시적으로 필드 데이터 할당
        const parsedCast = Array.isArray(tvfilmData.cast) ? tvfilmData.cast : [];
        const parsedWatchProviders = Array.isArray(tvfilmData.watchProviders) ? tvfilmData.watchProviders : [];
        const parsedVideos = Array.isArray(tvfilmData.videos) ? tvfilmData.videos : [];
        const parsedTags = Array.isArray(tvfilmData.tags) ? tvfilmData.tags : [];
        const parsedGenres = Array.isArray(tvfilmData.genres) ? tvfilmData.genres : [];
        const parsedReviews = Array.isArray(tvfilmData.reviews) ? tvfilmData.reviews : [];
        
        // 직접 각 필드를 설정하여 데이터 구조 문제 해결
        const formDataUpdate = {
          title: tvfilmData.title || '',
          originalTitle: tvfilmData.originalTitle || '',
          category: tvfilmData.category || '',
          coverImage: tvfilmData.coverImage || null,
          bannerImage: tvfilmData.bannerImage || null,
          summary: tvfilmData.summary || '',
          content: tvfilmData.content || '',
          network: tvfilmData.network || '',
          status: tvfilmData.status || 'Ongoing',
          releaseDate: tvfilmData.releaseDate ? 
            new Date(tvfilmData.releaseDate).toISOString().split('T')[0] : '',
          rating: tvfilmData.rating || '',
          runtime: tvfilmData.runtime || '',
          ageRating: tvfilmData.ageRating || '',
          director: tvfilmData.director || '',
          country: tvfilmData.country || '',
          tags: parsedTags,
          trailerUrl: tvfilmData.trailerUrl || '',
          cast: parsedCast,
          watchProviders: parsedWatchProviders,
          videos: parsedVideos,
          genres: parsedGenres, 
          productionCountry: tvfilmData.productionCountry || '',
          reviews: parsedReviews,
          reviewRating: tvfilmData.reviewRating || 0,
          reviewCount: tvfilmData.reviewCount || 0,
          ratingDistribution: tvfilmData.ratingDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        };
        
        console.log("Setting form data with fields:", Object.keys(formDataUpdate));
        console.log("Category in form data:", formDataUpdate.category);
        console.log("Original Title in form data:", formDataUpdate.originalTitle);
        console.log("Director in form data:", formDataUpdate.director);
        console.log("Watch Providers array check:", Array.isArray(formDataUpdate.watchProviders), formDataUpdate.watchProviders.length);
        console.log("Videos array check:", Array.isArray(formDataUpdate.videos), formDataUpdate.videos.length);
        
        setFormData(formDataUpdate);
        // 데이터 로드 후 마지막 저장 상태 업데이트
        setReviewsLastSaved(JSON.parse(JSON.stringify(parsedReviews)));
        setHasReviewChanges(false);
        
        // 기존 이미지 URL 저장
        if (tvfilmData.coverImage) {
          console.log("Setting original cover image:", tvfilmData.coverImage);
          setOriginalCoverImage(tvfilmData.coverImage);
          if (tvfilmData.coverImage.startsWith('http')) {
            setImagePreview(`/api/proxy?url=${encodeURIComponent(tvfilmData.coverImage)}`);
          } else {
            setImagePreview(tvfilmData.coverImage);
          }
        }
        
        if (tvfilmData.bannerImage) {
          console.log("Setting original banner image:", tvfilmData.bannerImage);
          setOriginalBannerImage(tvfilmData.bannerImage);
          if (tvfilmData.bannerImage.startsWith('http')) {
            setBannerImagePreview(`/api/proxy?url=${encodeURIComponent(tvfilmData.bannerImage)}`);
          } else {
            setBannerImagePreview(tvfilmData.bannerImage);
          }
        }
      } catch (error) {
        console.error('Error fetching TV/Film:', error);
        console.error('Error details:', error.response?.data || error.message);
        console.error('Error stack:', error.stack);
        
        // 오류 상세 정보 확인
        if (error.response) {
          // 서버가 응답을 반환했지만 2xx 범위 밖의 상태 코드
          console.error('Error response status:', error.response.status);
          console.error('Error response headers:', error.response.headers);
          console.error('Error response data:', error.response.data);
        } else if (error.request) {
          // 요청이 만들어졌지만 응답을 받지 못함
          console.error('Error request:', error.request);
        }
        
        // 오류 메시지 표시
        let errorMessage = 'TV/Film 데이터를 불러오는데 실패했습니다';
        if (error.response?.data?.message) {
          errorMessage += `: ${error.response.data.message}`;
        } else if (error.message) {
          errorMessage += `: ${error.message}`;
        }
        
        setErrors({ general: errorMessage });
        
        // 오류 발생 시 기본 데이터로 초기화
        setFormData({
          title: '',
          originalTitle: '',
          category: '',
          coverImage: null,
          bannerImage: null,
          summary: '',
          content: '',
          network: '',
          status: 'Ongoing',
          releaseDate: '',
          rating: '',
          runtime: '',
          ageRating: '',
          director: '',
          country: '',
          tags: [],
          trailerUrl: '',
          cast: [],
          watchProviders: [],
          videos: [],
          genres: [],
          productionCountry: '',
          reviews: [],
          reviewRating: 0,
          reviewCount: 0,
          ratingDistribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTVFilm();
  }, [id, authChecked]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: null
      }));
    }
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prevData => ({
        ...prevData,
        tags: [...prevData.tags, trimmedTag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prevData => ({
      ...prevData,
      tags: prevData.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUrlChange = (e) => {
    setImageUrl(e.target.value);
    setFileError('');
  };

  const setImageFromUrl = async () => {
    if (!imageUrl) return;

    try {
      setFileError('');
      // Basic URL validation
      const urlPattern = /^(https?:\/\/)/i;
      if (!urlPattern.test(imageUrl)) {
        setFileError('Please enter a valid URL starting with http:// or https://');
        return;
      }

      console.log('이미지 URL 설정:', imageUrl);
      
      // 프록시 URL 설정 - 외부 이미지를 위해 프록시 사용
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(imageUrl)}`;
      
      // 이미지 미리보기용으로는 프록시 URL 사용
      setImagePreview(proxyUrl);
      
      // 실제 저장은 원본 URL 사용
      setFormData(prevData => ({
        ...prevData,
        coverImage: imageUrl
      }));
      
      console.log('외부 이미지 URL 설정 완료:', imageUrl);
      
      // 입력 필드 초기화
      setImageUrl('');
    } catch (error) {
      console.error('Error setting image from URL:', error);
      setFileError('Failed to load image from URL');
    }
  };

  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  const formatFileSize = (size) => {
    if (size < 1024) return size + ' bytes';
    else if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
    else return (size / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // 파일 업로드 핸들러
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleBannerFileChange = (e) => {
    const file = e.target.files[0];
    handleBannerFile(file);
  };

  // 드래그 앤 드롭 이벤트 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleBannerDragOver = (e) => {
    e.preventDefault();
    setIsBannerDragging(true);
  };

  const handleBannerDragLeave = (e) => {
    e.preventDefault();
    setIsBannerDragging(false);
  };

  const handleBannerDrop = (e) => {
    e.preventDefault();
    setIsBannerDragging(false);
    const file = e.dataTransfer.files[0];
    handleBannerFile(file);
  };

  // 커버 이미지 파일 유효성 검사 및 처리
  const handleFile = (file) => {
    if (file) {
      if (file.type.startsWith('image/')) {
        // Maximum size check (5MB)
        if (file.size > 5 * 1024 * 1024) {
          setFileError('Image file size must be less than 5MB');
          return;
        }
        
        setFormData({
          ...formData,
          coverImage: file
        });
        setFileError('');
        
        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setFileError('Please upload an image file');
      }
    }
  };

  // 배너 이미지 파일 유효성 검사 및 처리
  const handleBannerFile = (file) => {
    if (file) {
      if (file.type.startsWith('image/')) {
        // Maximum size check (5MB)
        if (file.size > 5 * 1024 * 1024) {
          setBannerFileError('Image file size must be less than 5MB');
          return;
        }
        
        setFormData({
          ...formData,
          bannerImage: file
        });
        setBannerFileError('');
        
        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setBannerImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setBannerFileError('Please upload an image file');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setIsLoading(true);
    setErrors({});
    
    // toast.loading 사용
    const loadingToast = toast.loading('TV/Film 수정 중...');
    
    try {
      // 원본 이미지 URL을 저장
      let coverImageUrl = formData.coverImage;
      let bannerImageUrl = formData.bannerImage;
      
      // 커버 이미지가 File 객체인 경우 업로드 처리
      if (formData.coverImage instanceof File) {
        try {
          const imageData = await uploadImage(formData.coverImage);
          coverImageUrl = imageData.url;
          console.log('Cover image uploaded:', coverImageUrl);
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          toast.error('커버 이미지 업로드 중 오류가 발생했습니다.');
          setErrors(prev => ({
            ...prev,
            coverImage: '이미지 업로드 중 오류가 발생했습니다.'
          }));
          setIsSubmitting(false);
          setIsLoading(false);
          return;
        }
      }
      
      // 배너 이미지가 File 객체인 경우 업로드 처리
      if (formData.bannerImage instanceof File) {
        try {
          const imageData = await uploadImage(formData.bannerImage);
          bannerImageUrl = imageData.url;
          console.log('Banner image uploaded:', bannerImageUrl);
        } catch (uploadError) {
          console.error('Error uploading banner image:', uploadError);
          toast.error('배너 이미지 업로드 중 오류가 발생했습니다.');
          setErrors(prev => ({
            ...prev,
            bannerImage: '이미지 업로드 중 오류가 발생했습니다.'
          }));
          setIsSubmitting(false);
          setIsLoading(false);
          return;
        }
      }
      
      // JSON 데이터 방식으로 변경하여 대용량 전송 개선
      const tvfilmData = {
        title: formData.title,
        originalTitle: formData.originalTitle,
        category: formData.category,
        summary: formData.summary,
        content: formData.content || formData.summary,
        coverImage: coverImageUrl,
        bannerImage: bannerImageUrl,
        releaseDate: formData.releaseDate || undefined,
        country: formData.country || undefined,
        runtime: formData.runtime || undefined,
        ageRating: formData.ageRating || undefined,
        director: formData.director || undefined,
        trailerUrl: formData.trailerUrl || undefined,
        network: formData.network || undefined,
        status: formData.status || undefined,
        tags: formData.tags && formData.tags.length > 0 ? formData.tags : undefined,
        genres: formData.genres && formData.genres.length > 0 ? formData.genres : undefined,
        cast: formData.cast && formData.cast.length > 0 ? formData.cast : undefined,
        watchProviders: formData.watchProviders && formData.watchProviders.length > 0 ? formData.watchProviders : undefined,
        videos: formData.videos && formData.videos.length > 0 ? formData.videos : undefined,
        reviewRating: formData.reviewRating,
        reviewCount: formData.reviewCount,
        ratingDistribution: formData.ratingDistribution
      };
      
      // 리뷰 변경사항이 있는 경우만 저장
      if (hasReviewChanges && formData.reviews && formData.reviews.length > 0) {
        try {
          await handleSyncReviews(formData.reviews);
        } catch (reviewError) {
          console.error('Error syncing reviews:', reviewError);
          toast.error('리뷰 저장 중 문제가 발생했지만, 계속 진행합니다.');
        }
      }
      
      // 토큰을 가져오는 코드 추가
      const token = Cookies.get('token') || localStorage.getItem('token');
      
      // PUT 요청으로 변경 (JSON 형식으로 전송)
      const response = await axios.put(`/api/tvfilm/${id}`, tvfilmData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // 요청 타임아웃 60초로 증가
        timeout: 60000
      });
         
      toast.dismiss(loadingToast);
      toast.success('TV/Film 수정이 완료되었습니다');
      
      // 성공 후 즉시 영화 목록으로 이동
      router.push('/admin/tvfilm');
    } catch (error) {
      toast.dismiss(loadingToast);
      if (axios.isCancel(error)) {
        console.log('요청이 취소되었습니다:', error.message);
        toast.error('요청이 취소되었습니다.');
      } else if (error.code === 'ECONNABORTED') {
        console.error('Request timeout:', error);
        toast.error('요청 시간이 초과되었습니다. 데이터가 너무 큽니다.');
        setErrors({ general: '요청 시간이 초과되었습니다. 리뷰나 출연진 데이터의 양을 줄여보세요.' });
      } else {
        console.error('Error updating TV/Film:', error);
        toast.error('TV/Film 수정 중 오류가 발생했습니다.');
        setErrors({ general: 'TV/Film 수정 중 오류가 발생했습니다. 다시 시도해주세요.' });
      }
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleAddGenre = () => {
    if (genreInput.trim() !== '') {
      // Check if genre already exists
      if (!formData.genres.includes(genreInput.trim())) {
        setFormData(prevData => ({
          ...prevData,
          genres: [...prevData.genres, genreInput.trim()]
        }));
      }
      setGenreInput('');
    }
  };

  const handleRemoveGenre = (index) => {
    console.log("Removing genre at index:", index, "Current genres:", formData.genres);
    setFormData(prevData => ({
      ...prevData,
      genres: prevData.genres.filter((_, i) => i !== index)
    }));
  };

  const handleKeyPressGenre = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddGenre();
    }
  };

  // 외부 URL 처리하는 유틸리티 함수 추가
  const prepareExternalImageUrl = (url) => {
    if (!url) return '/images/placeholder-tvfilm.svg';
    
    // 이미 내부 URL이면 그대로 사용
    if (url.startsWith('/')) return url;
    
    // 외부 URL은 프록시 사용
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  };

  // 리뷰 데이터를 API를 통해 동기화
  const handleSyncReviews = async (newReviews) => {
    // 이미 제출 중이면 중복 제출 방지
    if (isReviewSubmitting) {
      return;
    }
    
    try {
      setIsReviewSubmitting(true);
      setErrors(prev => ({ ...prev, reviews: null }));

      // 리뷰 데이터 유효성 검증
      if (!Array.isArray(newReviews)) {
        setErrors(prev => ({
          ...prev,
          reviews: '유효하지 않은 리뷰 데이터 형식입니다.'
        }));
        setIsReviewSubmitting(false);
        return;
      }

      console.log(`저장할 리뷰 데이터: ${newReviews.length}개`);

      // 인증 정보 확인 - 세션 우선, 토큰 백업으로 사용
      const token = Cookies.get('token') || localStorage.getItem('token');
      const headers = {};
      let authMethod = '';

      if (session?.user?.role === 'admin') {
        authMethod = 'session';
        console.log('관리자 세션으로 인증됨');
      } else if (token) {
        authMethod = 'token';
        headers.Authorization = `Bearer ${token}`;
        console.log('토큰으로 인증됨');
      } else {
        setErrors(prev => ({
          ...prev,
          reviews: '인증 정보가 없습니다. 다시 로그인해 주세요.'
        }));
        setIsReviewSubmitting(false);
        return;
      }

      // API 호출
      console.log(`/api/tvfilm/admin/reviews API 호출 (${authMethod} 인증): 리뷰 ${newReviews.length}개`);
      
      try {
        const response = await axios.post('/api/tvfilm/admin/reviews', {
          tvfilmId: id,
          reviews: newReviews
        }, {
          headers,
          timeout: 30000 // 타임아웃 30초로 증가
        });
        
        console.log('Reviews synchronized with database:', response.data);
        
        // 응답 확인
        if (response.data.success === true) {
          // 성공 처리
          toast.success('리뷰가 성공적으로 저장되었습니다.');
          
          // 오류가 있으면 표시
          if (response.data.data && response.data.data.errors > 0) {
            // 오류 메시지에 문제가 있는 리뷰 정보 표시
            const errorMessage = `${response.data.data.errors}개 리뷰에 오류가 있어 처리되지 않았습니다.`;
            const errorDetails = response.data.data.errorDetails && response.data.data.errorDetails.length > 0
              ? `\n문제: ${response.data.data.errorDetails.slice(0, 3).join(', ')}${response.data.data.errorDetails.length > 3 ? ' 외 여러 문제' : ''}`
              : '';
            
            setErrors(prev => ({
              ...prev,
              reviews: errorMessage + errorDetails
            }));
            
            // 문제가 있는 리뷰에 대한 자세한 정보를 콘솔에 출력
            console.warn('리뷰 처리 중 문제가 발생한 항목:', response.data.data.errorDetails);
          } else {
            setErrors(prev => ({ ...prev, reviews: null }));
          }
          
          // 마지막 저장 상태 업데이트 (깊은 복사)
          setReviewsLastSaved(JSON.parse(JSON.stringify(newReviews)));
          setHasReviewChanges(false);
        } else {
          // 서버에서 성공하지 않은 응답
          throw new Error(response.data.message || '리뷰 저장에 실패했습니다.');
        }
      } catch (error) {
        console.error('리뷰 동기화 중 오류:', error);
        toast.error('리뷰 저장 중 오류가 발생했습니다.');
        
        // 오류 메시지 개선
        const errorMsg = error.response?.data?.message || error.message || '리뷰 저장 중 오류가 발생했습니다.';
        const errorDetails = error.response?.data?.data?.errorDetails;
        
        if (errorDetails && Array.isArray(errorDetails)) {
          setErrors(prev => ({
            ...prev,
            reviews: `${errorMsg}\n문제: ${errorDetails.slice(0, 3).join(', ')}${errorDetails.length > 3 ? ' 외 여러 문제' : ''}`
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            reviews: errorMsg
          }));
        }
      }
    } catch (error) {
      console.error('리뷰 처리 중 예상치 못한 오류:', error);
      toast.error('처리 중 오류가 발생했습니다.');
      
      setErrors(prev => ({
        ...prev,
        reviews: '예상치 못한 오류가 발생했습니다: ' + error.message
      }));
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  // 리뷰 탭에서 변경 사항을 감지하는 부분 수정
  const handleReviewsChange = (newReviews) => {
    if (!Array.isArray(newReviews)) {
      console.warn('유효하지 않은 리뷰 데이터:', newReviews);
      return;
    }
    
    console.log('리뷰 편집기에서 새 리뷰 데이터 수신:', newReviews.length + '개');
    
    // 리뷰가 마지막 저장 상태와 다른지 확인
    const hasChanges = checkReviewsChanged(newReviews, reviewsLastSaved);
    setHasReviewChanges(hasChanges);
    
    // 리뷰 데이터가 변경될 때마다 평균 별점과 분포 업데이트
    let totalRating = 0;
    const distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    newReviews.forEach(review => {
      const rating = parseInt(review.rating, 10);
      if (!isNaN(rating) && rating >= 1 && rating <= 10) {
        totalRating += rating;
        // 별점은 1-10, 배열 인덱스는 0-9이므로 -1 처리
        const ratingIndex = Math.min(Math.max(Math.floor(rating) - 1, 0), 9);
        distribution[ratingIndex]++;
      }
    });
    
    const avgRating = newReviews.length > 0 ? totalRating / newReviews.length : 0;
    
    // 폼 데이터 업데이트
    setFormData(prev => ({
      ...prev,
      reviews: newReviews,
      reviewRating: parseFloat(avgRating.toFixed(1)),
      reviewCount: newReviews.length,
      ratingDistribution: distribution
    }));
  };

  // 리뷰 변경 여부를 확인하는 함수 추가
  const checkReviewsChanged = (current, saved) => {
    if (!Array.isArray(current) || !Array.isArray(saved)) return true;
    if (current.length !== saved.length) return true;
    
    // 간단한 비교로 변경됨
    const currentJson = JSON.stringify(current);
    const savedJson = JSON.stringify(saved);
    
    return currentJson !== savedJson;
  };

  // 세션 로딩 중이거나 인증 확인 중에는 로딩 인디케이터 표시
  if (status === 'loading' || !authChecked) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-screen">
          <Loader className="animate-spin mr-2" />
          <span>인증 확인 중...</span>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-screen">
          <Loader className="animate-spin mr-2" />
          <span>제출 중...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Edit TV/Film</h1>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={togglePreviewMode}
              className={`flex items-center px-4 py-2 rounded-md transition ${
                previewMode 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {previewMode ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Edit Mode
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </>
              )}
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200 pb-1 overflow-x-auto hide-scrollbar">
            <nav className="-mb-px flex space-x-6">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === 'basic'
                    ? 'border-b-2 border-pink-500 text-pink-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                기본 정보
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === 'media'
                    ? 'border-b-2 border-pink-500 text-pink-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                이미지
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cast')}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === 'cast'
                    ? 'border-b-2 border-pink-500 text-pink-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                출연진
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('providers')}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === 'providers'
                    ? 'border-b-2 border-pink-500 text-pink-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                시청 정보
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === 'videos'
                    ? 'border-b-2 border-pink-500 text-pink-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                트레일러 및 비디오
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === 'info'
                    ? 'border-b-2 border-pink-500 text-pink-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                정보
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 px-1 font-medium text-sm ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-pink-500 text-pink-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
              >
                리뷰
              </button>
            </nav>
          </div>

          {/* 기본 정보 탭 */}
          {activeTab === 'basic' && (
            <div className="space-y-5">
              {/* Title */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter TV/Film title"
                  disabled={previewMode}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.category ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={previewMode}
                >
                  <option value="">Select a category</option>
                  <option value="K-Drama">K-Drama</option>
                  <option value="Movie">Movie</option>
                  <option value="Documentary">Documentary</option>
                  <option value="Animation">Animation</option>
                  <option value="Reality Show">Reality Show</option>
                  <option value="Web Series">Web Series</option>
                  <option value="Other">Other</option>
                </select>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
              </div>

              {/* Genres */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="genres">
                  Genres
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.genres.length > 0 ? (
                    formData.genres.map((genre, index) => (
                      <div 
                        key={index} 
                        className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full flex items-center text-sm"
                      >
                        <span>{genre}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveGenre(index)} 
                          className="ml-2 text-indigo-500 hover:text-indigo-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No genres selected</p>
                  )}
                </div>
                {!previewMode && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {['Romance', 'Thriller', 'Comedy', 'Action', 'Fantasy', 'Historical', 'Medical', 'Crime', 'Melodrama', 'Mystery'].map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${
                          formData.genres.includes(genre)
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => {
                          const updatedGenres = [...formData.genres];
                          if (updatedGenres.includes(genre)) {
                            const index = updatedGenres.indexOf(genre);
                            updatedGenres.splice(index, 1);
                          } else {
                            updatedGenres.push(genre);
                          }
                          setFormData(prev => ({ ...prev, genres: updatedGenres }));
                        }}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Original Title */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="originalTitle">
                  Original Title
                </label>
                <input
                  type="text"
                  id="originalTitle"
                  name="originalTitle"
                  value={formData.originalTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter original title (if different from main title)"
                  disabled={previewMode}
                />
              </div>

              {/* Summary */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="summary">
                  Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="summary"
                  name="summary"
                  value={formData.summary}
                  onChange={handleInputChange}
                  rows="3"
                  className={`w-full px-3 py-2 border rounded-md ${errors.summary ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter a brief summary"
                  disabled={previewMode}
                ></textarea>
                {errors.summary && <p className="text-red-500 text-xs mt-1">{errors.summary}</p>}
              </div>
              
              {/* Continue with other basic info fields */}
            </div>
          )}

          {/* Media Tab - Images */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Cover Image */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Cover Image <span className="text-red-500">*</span>
                </label>
                
                <div className="border-dashed border-2 border-gray-300 p-6 rounded-md mb-3 bg-gray-50 text-center">
                  {imagePreview ? (
                    <div className="relative mb-4">
                      <img
                        src={imagePreview}
                        alt="Cover Preview"
                        className="max-h-48 mx-auto object-contain"
                        onError={(e) => {
                          console.log('커버 이미지 로드 실패:', imagePreview);
                          // 프록시 URL 사용 시에도 실패한 경우 플레이스홀더로 대체
                          e.target.onerror = null; // 무한 루프 방지
                          e.target.src = '/images/placeholder-tvfilm.svg';
                        }}
                      />
                      {!previewMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, coverImage: null }));
                            setImagePreview(null);
                          }}
                          className="absolute top-0 right-0 bg-red-500 rounded-full p-1 text-white hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center items-center mb-3">
                        <Upload className="w-12 h-12 text-gray-300" />
                      </div>
                      <p className="text-gray-500 mb-3">Drag and drop your cover image here, or click to browse</p>
                    </>
                  )}

                  {!previewMode && (
                    <div
                      className={`flex justify-center ${imagePreview ? 'mt-3' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <label
                        htmlFor="coverImage"
                        className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      >
                        {imagePreview ? 'Change Cover Image' : 'Select Image'}
                      </label>
                      <input
                        id="coverImage"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        ref={coverFileInputRef}
                      />
                    </div>
                  )}
                </div>

                {!previewMode && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Or enter image URL:</p>
                    <div className="flex">
                      <input 
                        type="text"
                        value={imageUrl}
                        onChange={handleImageUrlChange}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={setImageFromUrl}
                        className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600"
                      >
                        Use URL
                      </button>
                    </div>
                  </div>
                )}

                {errors.coverImage && <p className="text-red-500 text-xs mt-1">{errors.coverImage}</p>}
                {fileError && <p className="text-red-500 text-xs mt-1">{fileError}</p>}
                <p className="text-gray-500 text-xs mt-1">
                  This image will be used as the thumbnail in listings and on the detail page. Recommended ratio: 2:3, min size: 500x750px
                </p>
              </div>

              {/* Banner Image */}
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Banner Image (메인 배경 이미지)
                </label>
                
                <div className="border-dashed border-2 border-gray-300 p-6 rounded-md mb-3 bg-gray-50 text-center">
                  {bannerImagePreview ? (
                    <div className="relative mb-4">
                      <img
                        src={bannerImagePreview}
                        alt="Banner Preview"
                        className="max-h-48 w-full mx-auto object-cover"
                        onError={(e) => {
                          console.log('배너 이미지 로드 실패:', bannerImagePreview);
                          e.target.onerror = null; // 무한 루프 방지
                          e.target.src = '/images/placeholder-banner.svg';
                        }}
                      />
                      {!previewMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, bannerImage: null }));
                            setBannerImagePreview(null);
                          }}
                          className="absolute top-0 right-0 bg-red-500 rounded-full p-1 text-white hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center items-center mb-3">
                        <Upload className="w-12 h-12 text-gray-300" />
                      </div>
                      <p className="text-gray-500 mb-3">Drag and drop your banner image here, or click to browse</p>
                    </>
                  )}

                  {!previewMode && (
                    <div
                      className={`flex justify-center ${bannerImagePreview ? 'mt-3' : ''}`}
                      onDragOver={handleBannerDragOver}
                      onDragLeave={handleBannerDragLeave}
                      onDrop={handleBannerDrop}
                    >
                      <label
                        htmlFor="bannerImage"
                        className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      >
                        {bannerImagePreview ? 'Change Banner Image' : 'Select Image'}
                      </label>
                      <input
                        id="bannerImage"
                        type="file"
                        accept="image/*"
                        onChange={handleBannerFileChange}
                        className="hidden"
                        ref={bannerFileInputRef}
                      />
                    </div>
                  )}
                </div>

                {!previewMode && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Or enter image URL:</p>
                    <div className="flex">
                      <input 
                        type="text"
                        value={bannerImageUrl}
                        onChange={(e) => setBannerImageUrl(e.target.value)}
                        placeholder="https://example.com/banner.jpg"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!bannerImageUrl) return;
                          
                          try {
                            const urlPattern = /^(https?:\/\/)/i;
                            if (!urlPattern.test(bannerImageUrl)) {
                              setBannerFileError('Please enter a valid URL starting with http:// or https://');
                              return;
                            }
                            
                            // 프록시를 통한 URL 생성
                            const proxyUrl = `/api/proxy?url=${encodeURIComponent(bannerImageUrl)}`;
                            
                            // 실제 데이터에는 원본 URL 저장
                            setFormData(prev => ({
                              ...prev,
                              bannerImage: bannerImageUrl
                            }));
                            
                            // 미리보기는 프록시 URL 사용
                            setBannerImagePreview(proxyUrl);
                            console.log('외부 배너 이미지 URL 설정 완료:', bannerImageUrl);
                            
                            setBannerImageUrl('');
                            setBannerFileError('');
                          } catch (error) {
                            console.error('Error setting banner image from URL:', error);
                            setBannerFileError('Failed to load image from URL');
                          }
                        }}
                        className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600"
                      >
                        Use URL
                      </button>
                    </div>
                  </div>
                )}

                {bannerFileError && <p className="text-red-500 text-xs mt-1">{bannerFileError}</p>}
                <p className="text-gray-500 text-xs mt-1">
                  This image will be used as the background banner on the detail page. Recommended ratio: 16:9, min size: 1920x1080px
                </p>
              </div>
            </div>
          )}

          {/* Cast Tab */}
          {activeTab === 'cast' && (
            <div className="space-y-6">
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Cast</label>
                <CastEditor
                  value={formData.cast}
                  onChange={(newCast) => setFormData(prev => ({ ...prev, cast: newCast }))}
                  disabled={previewMode}
                />
              </div>
            </div>
          )}

          {/* Watch Providers Tab */}
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Watch Providers</label>
                <WatchProvidersEditor
                  value={formData.watchProviders}
                  onChange={(newProviders) => setFormData(prev => ({ ...prev, watchProviders: newProviders }))}
                  disabled={previewMode}
                />
              </div>
            </div>
          )}

          {/* Videos Tab */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Videos</label>
                <VideosEditor 
                  videos={formData.videos} 
                  onChange={(newVideos) => setFormData(prev => ({ ...prev, videos: newVideos }))}
                  readOnly={previewMode}
                />
              </div>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Director & Runtime */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Director
                  </label>
                  <input
                    type="text"
                    name="director"
                    value={formData.director}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Director's name"
                    disabled={previewMode}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Runtime
                  </label>
                  <input
                    type="text"
                    name="runtime"
                    value={formData.runtime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., 2시간 30분"
                    disabled={previewMode}
                  />
                </div>
              </div>

              {/* Release Date & Rating */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Release Date
                  </label>
                  <input
                    type="date"
                    name="releaseDate"
                    value={formData.releaseDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={previewMode}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Rating
                  </label>
                  <input
                    type="number"
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0-10"
                    disabled={previewMode}
                  />
                </div>
              </div>

              {/* Country & Age Rating */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., South Korea"
                    disabled={previewMode}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Age Rating
                  </label>
                  <select
                    name="ageRating"
                    value={formData.ageRating}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={previewMode}
                  >
                    <option value="">Select age rating</option>
                    <option value="ALL">ALL</option>
                    <option value="12">12</option>
                    <option value="15">15</option>
                    <option value="18">18</option>
                    <option value="R">R</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  이 콘텐츠에 대한 사용자 리뷰를 수정할 수 있습니다. 수정된 리뷰는 콘텐츠 상세 페이지에 표시됩니다.
                </p>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ExternalLink className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        추가한 리뷰는 콘텐츠가 등록된 이후에 API를 통해 관리할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                {errors.reviews && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          {errors.reviews}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-5 bg-white rounded-lg shadow space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-pink-600">사용자 리뷰</h2>
                    <div className="flex items-center gap-2">
                      {errors.reviews && (
                        <button
                          type="button"
                          onClick={() => {
                            // 문제가 있는 리뷰를 진단
                            console.log('리뷰 진단 시작...');
                            const reviews = formData.reviews || [];
                            
                            if (!Array.isArray(reviews)) {
                              console.error('유효하지 않은 리뷰 목록 형식:', reviews);
                              toast.error('리뷰 목록 형식이 올바르지 않습니다');
                              return;
                            }
                            
                            // 간단한 유효성 검사 수행
                            const problematicReviews = reviews.map((review, index) => {
                              const issues = [];
                              
                              // 기본 유효성 검사
                              if (!review.title || typeof review.title !== 'string' || review.title.trim() === '') {
                                issues.push('제목 누락');
                              }
                              
                              if (!review.content || typeof review.content !== 'string' || review.content.trim() === '') {
                                issues.push('내용 누락');
                              }
                              
                              if (!review.authorName || typeof review.authorName !== 'string' || review.authorName.trim() === '') {
                                issues.push('작성자 누락');
                              }
                              
                              const rating = parseInt(review.rating, 10);
                              if (isNaN(rating) || rating < 1 || rating > 10) {
                                issues.push('별점 오류');
                              }
                              
                              if (review.tags && !Array.isArray(review.tags)) {
                                issues.push('태그 형식 오류');
                              }
                              
                              return issues.length > 0 ? { index, review, issues } : null;
                            }).filter(Boolean);
                            
                            if (problematicReviews.length > 0) {
                              console.log('문제가 있는 리뷰:', problematicReviews);
                              // 첫 번째 문제가 있는 리뷰로 스크롤
                              toast.error(`${problematicReviews.length}개 리뷰에 문제가 있습니다. 수정이 필요합니다.`);
                              
                              // 문제가 있는 리뷰들에 대한 더 구체적인 안내
                              const issueDetails = problematicReviews.map(p => 
                                `리뷰 #${p.index + 1} (${p.review.title || '제목 없음'}): ${p.issues.join(', ')}`
                              ).join('\n');
                              
                              setErrors(prev => ({
                                ...prev,
                                reviews: `${prev.reviews || ''}\n\n문제가 있는 리뷰 상세:\n${issueDetails}`
                              }));
                            } else {
                              console.log('모든 리뷰가 기본 유효성 검사를 통과했습니다.');
                              toast.info('모든 리뷰가 기본 유효성 검사를 통과했습니다. 다른 문제가 있을 수 있습니다.');
                            }
                          }}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          진단하기
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          console.log('리뷰 저장 버튼 클릭됨');
                          handleSyncReviews(formData.reviews);
                        }}
                        disabled={isReviewSubmitting || isLoading || isSubmitting || !hasReviewChanges}
                        className={`px-4 py-2 rounded ${
                          isReviewSubmitting || isLoading || isSubmitting
                          ? 'bg-gray-300 cursor-not-allowed' 
                          : hasReviewChanges ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 cursor-default'} text-white flex items-center`}
                      >
                        {isReviewSubmitting ? (
                          <>
                            <Loader className="animate-spin w-4 h-4 mr-2" />
                            저장 중...
                          </>
                        ) : hasReviewChanges ? '리뷰 저장' : '저장됨'}
                      </button>
                    </div>
                  </div>
                  
                  <ReviewsEditor 
                    reviews={formData.reviews} 
                    onChange={handleReviewsChange}
                    tvfilmId={id}
                  />
                  
                  {hasReviewChanges && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mt-2">
                      <p className="text-sm text-blue-700">
                        리뷰에 변경사항이 있습니다. '리뷰 저장' 버튼을 클릭하여 변경사항을 저장하세요.
                      </p>
                    </div>
                  )}
                  
                  {!hasReviewChanges && reviewsLastSaved.length > 0 && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-3 mt-2">
                      <p className="text-sm text-green-700">
                        모든 리뷰 변경사항이 저장되었습니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end mt-8 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/admin/tvfilm')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md mr-2 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading || previewMode || isReviewSubmitting}
              className={`px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors flex items-center ${
                (isSubmitting || isLoading || previewMode || isReviewSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader className="animate-spin w-4 h-4 mr-2" />
                  저장 중...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default EditTVFilm; 