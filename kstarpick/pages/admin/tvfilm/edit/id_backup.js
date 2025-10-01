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
        setErrors({ general: 'TV/Film 데이터를 불러오는데 실패했습니다' });
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
    
    // toast.info 대신 toast.loading 사용
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
      setSuccessMessage('TV/Film 수정이 완료되었습니다');
      
      setTimeout(() => {
        router.push('/admin/tvfilm');
      }, 2000);
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
    
    console.log('리뷰 동기화 시작 - 리뷰 개수:', newReviews.length);
    console.log('평론가 리뷰 개수:', newReviews.filter(r => Boolean(r.isCritic)).length);
    
    // 구현 단순화 - 변경 사항 비교 로직 생략 (테스트 목적)
    // 항상 저장을 진행합니다
    
    try {
      setIsReviewSubmitting(true);
      setErrors(prev => ({ ...prev, reviews: null }));

      // 토큰 확인
      let token = Cookies.get('token') || localStorage.getItem('token');
      console.log('리뷰 동기화에 사용할 토큰:', token ? `${token.substring(0, 10)}...` : '쿠키/로컬스토리지에 토큰 없음');
      
      // 토큰이 없고 세션이 있는 경우 세션 사용
      if (!token && session?.user?.role === 'admin') {
        console.log('세션으로 인증됨. 토큰 없이 진행');
        
        console.log(`/api/tvfilm/admin/reviews API 호출 중... (리뷰 ${newReviews.length}개)`);
        const response = await axios.post('/api/tvfilm/admin/reviews', {
          tvfilmId: id,
          reviews: newReviews
        }, {
          // 요청 타임아웃 설정
          timeout: 15000
        });
        
        console.log('리뷰가 성공적으로 저장되었습니다:', response.data);
        
        // 성공 메시지 표시 및 마지막 저장 상태 업데이트
        toast.success('리뷰가 성공적으로 저장되었습니다.');
        setReviewsLastSaved(JSON.parse(JSON.stringify(newReviews)));
        setHasReviewChanges(false);
        
        setIsReviewSubmitting(false);
        return;
      }
      
      if (!token) {
        console.warn('인증 토큰이 없어 리뷰 동기화를 진행할 수 없습니다.');
        setErrors(prev => ({
          ...prev,
          reviews: '인증 토큰이 없습니다. 다시 로그인해 주세요.'
        }));
        setIsReviewSubmitting(false);
        return;
      }
      
      console.log(`/api/tvfilm/admin/reviews API 호출 중... (리뷰 ${newReviews.length}개, 토큰 사용)`);
      const response = await axios.post('/api/tvfilm/admin/reviews', {
        tvfilmId: id,
        reviews: newReviews
      }, {
        headers: { 
          Authorization: `Bearer ${token}`
        },
        // 요청 타임아웃 설정
        timeout: 15000
      });
      
      console.log('리뷰가 성공적으로 저장되었습니다:', response.data);
      
      // 성공 메시지 표시 및 마지막 저장 상태 업데이트
      toast.success('리뷰가 성공적으로 저장되었습니다.');
      setReviewsLastSaved(JSON.parse(JSON.stringify(newReviews)));
      setHasReviewChanges(false);
    } catch (error) {
      console.error('리뷰 저장 중 오류:', error);
      toast.error('리뷰 저장 중 오류가 발생했습니다.');
      setErrors(prev => ({
        ...prev,
        reviews: error.response?.data?.message || error.message || '리뷰 저장 중 오류가 발생했습니다.'
      }));
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      {/* Rest of the component content */}
      <div className="p-5 bg-white rounded-lg shadow space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-pink-600">사용자 리뷰</h2>
          <button
            type="button"
            onClick={() => handleSyncReviews(formData.reviews)}
            disabled={isReviewSubmitting || isLoading || isSubmitting || !hasReviewChanges}
            className={`px-4 py-2 rounded ${
              isReviewSubmitting || isLoading || isSubmitting || !hasReviewChanges
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600'} text-white flex items-center`}
          >
            {isReviewSubmitting ? (
              <>
                <Loader className="animate-spin w-4 h-4 mr-2" />
                저장 중...
              </>
            ) : hasReviewChanges ? '리뷰 저장' : '저장됨'}
          </button>
        </div>
        
        {/* 디버깅 정보 */}
        <div className="bg-gray-100 p-2 text-xs rounded">
          <p>변경감지: {hasReviewChanges ? '있음' : '없음'}</p>
          <p>리뷰 개수: {formData.reviews.length}개</p>
          <p>평론가 리뷰: {formData.reviews.filter(r => r.isCritic).length}개</p>
          <p>마지막 저장: {reviewsLastSaved.length}개</p>
          <button 
            onClick={() => {
              // 변경 사항 테스트를 위해 직접 상태 변경
              setHasReviewChanges(true);
              console.log("강제로 변경 감지 상태를 true로 설정했습니다.");
            }}
            className="mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded"
          >
            변경상태 강제설정
          </button>
        </div>
        
        <ReviewsEditor 
          reviews={formData.reviews} 
          onChange={(newReviews) => {
            console.log('리뷰 편집기에서 새 리뷰 데이터 수신:', newReviews.length + '개');
            
            // 리뷰 데이터가 변경될 때마다 평균 별점과 분포 업데이트
            let totalRating = 0;
            const distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            
            // 평론가 리뷰 개수 확인
            const criticReviews = newReviews.filter(r => Boolean(r.isCritic)).length;
            console.log(`현재 평론가 리뷰 수: ${criticReviews}개`);
            
            newReviews.forEach(review => {
              totalRating += review.rating;
              // 별점은 1-10, 배열 인덱스는 0-9이므로 -1 처리
              const ratingIndex = Math.min(Math.max(Math.floor(review.rating) - 1, 0), 9);
              distribution[ratingIndex]++;
            });
            
            const avgRating = newReviews.length > 0 ? totalRating / newReviews.length : 0;
            
            // 변경 사항 감지 - 항상 true로 설정 (테스트용)
            setHasReviewChanges(true);
            console.log('리뷰 변경 감지됨: true (강제 설정)');
            
            // 폼 데이터 업데이트
            setFormData(prev => ({
              ...prev,
              reviews: newReviews,
              reviewRating: parseFloat(avgRating.toFixed(1)),
              reviewCount: newReviews.length,
              ratingDistribution: distribution
            }));
          }}
          tvfilmId={id}
        />
      </div>
    </AdminLayout>
  );
}

export default EditTVFilm; 