import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { useRouter } from 'next/router';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { X, Plus, Upload, ExternalLink, Eye, EyeOff, Loader } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Cookies from 'js-cookie';
import CastEditor from '../../../components/admin/CastEditor';
import WatchProvidersEditor from '../../../components/admin/WatchProvidersEditor';
import VideosEditor from '../../../components/admin/VideosEditor';
import ReviewsEditor from '../../../components/admin/ReviewsEditor';
import slugify from 'slugify';

// Import QuillEditor dynamically to avoid SSR issues
const QuillEditor = dynamic(() => import('../../../components/Editor'), {
  ssr: false
});

// Add parseJwt function to decode tokens
function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Handle both browser and Node.js environments
    let jsonPayload;
    if (typeof window !== 'undefined') {
      // Browser environment
      jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
    } else {
      // Node.js environment
      const buffer = Buffer.from(base64, 'base64');
      jsonPayload = buffer.toString('utf-8');
    }
    
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error parsing JWT token:', e);
    return null;
  }
}

function CreateTVFilm() {
  const router = useRouter();
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
    category: 'drama',
    coverImage: null,
    bannerImage: null,
    summary: '',
    network: '',
    status: 'ongoing',
    releaseDate: new Date().toISOString().split('T')[0],
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

  // Reset form data when the page changes (for new creation)
  useEffect(() => {
    setFormData({
      title: '',
      originalTitle: '',
      category: 'drama',
      coverImage: null,
      bannerImage: null,
      summary: '',
      network: '',
      status: 'ongoing',
      releaseDate: new Date().toISOString().split('T')[0],
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
    setErrors({});
    setImageUrl('');
    setBannerImageUrl('');
    setFileError('');
    setBannerFileError('');
    setPreviewMode(false);
  }, [router.pathname]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'category' && value === 'movie') {
      // If category is changed to 'movie', automatically set status to 'completed'
      setFormData(prevData => ({
        ...prevData,
        [name]: value,
        status: 'completed'
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }
    
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
    
    // 디버깅을 위한 브라우저 콘솔 로그
    console.log('==== Form submission started ====');
    
    setIsSubmitting(true);
    setErrors({});
    
    // 유효성 검사 (클라이언트 측)
    const newErrors = {};
    if (!formData.title) newErrors.title = '제목을 입력해주세요.';
    if (!formData.category) newErrors.category = '카테고리를 선택해주세요.';
    if (!formData.summary) newErrors.summary = '요약을 입력해주세요.';
    
    // 커버 이미지 검사하지만 URL 이미지인 경우 예외 처리
    if (!formData.coverImage && !imagePreview) {
      newErrors.coverImage = '커버 이미지를 업로드해주세요.';
    }
    
    if (Object.keys(newErrors).length > 0) {
      console.log('Validation errors:', newErrors);
      setErrors(newErrors);
      setIsSubmitting(false);
      
      // 오류 메시지를 화면에 표시
      setErrors({ submit: '필수 필드를 모두 입력해주세요.' });
      return;
    }
    
    setErrors({});
    setSuccessMessage('');
    setIsLoading(true);
    
    try {
      // 토큰 확인
      console.log('Checking authentication token...');
      const token = Cookies.get('token') || localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 관리자 계정으로 로그인해주세요.');
      }
      
      // 작성자 ID 확인
      let authorId = null;
      
      // 세션에서 사용자 ID 확인
      if (session?.user?.id) {
        authorId = session.user.id;
        console.log('Using session user ID:', authorId);
      } else {
        try {
          // 토큰에서 사용자 ID 확인
          const tokenData = parseJwt(token);
          console.log('Token payload:', tokenData);
          
          if (tokenData?.id) {
            authorId = tokenData.id;
          } else if (tokenData?.userId) {
            authorId = tokenData.userId;
          } else if (tokenData?.sub) {
            authorId = tokenData.sub;
          }
        } catch (err) {
          console.error('Token parsing error:', err);
        }
      }

      // 기본 관리자 ID 사용
      if (!authorId) {
        authorId = "6405c9f09a99517bc4d03be2"; // 기본 관리자 ID
        console.log('Using default admin ID:', authorId);
      }
      
      // Slug 생성
      let slug;
      try {
        slug = slugify(formData.title, {
          lower: true,
          strict: true,
          locale: 'ko'
        });
        
        // 한글만 있는 경우 처리
        if (!slug || slug.trim() === '') {
          const uuid = Math.random().toString(36).substring(2, 10);
          slug = `tvfilm-${uuid}`;
        }
      } catch (err) {
        const timestamp = new Date().getTime();
        slug = `tvfilm-${timestamp}`;
        console.log('Using timestamp slug due to error:', slug);
      }
      
      // 커버 이미지 확인
      let coverImage = formData.coverImage;
      if (typeof coverImage === 'string' && !coverImage.startsWith('/') && !coverImage.startsWith('http')) {
        coverImage = '/images/placeholder-tvfilm.svg';
      }
      
      // API 데이터 준비
      const apiData = {
        title: formData.title,
        originalTitle: formData.originalTitle || '',
        slug: slug,
        category: formData.category, 
        summary: formData.summary,
        content: formData.summary,
        status: formData.category === 'movie' ? 'completed' : (formData.status || 'ongoing'),
        releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
        country: formData.country || '',
        runtime: formData.runtime || '',
        ageRating: formData.ageRating || '',
        director: formData.director || '',
        trailerUrl: formData.trailerUrl || '',
        tags: formData.tags || [],
        genres: formData.genres || [],
        cast: formData.cast || [],
        watchProviders: formData.watchProviders || [],
        videos: formData.videos || [],
        reviews: formData.reviews || [],
        reviewRating: formData.reviewRating || 0,
        reviewCount: formData.reviewCount || 0,
        ratingDistribution: formData.ratingDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        author: authorId,
        lang: 'ko',
        featured: false,
        views: 0,
        likes: 0
      };
      
      // 파일 업로드 처리
      console.log('Handling file uploads...');
      
      // 1. 커버 이미지 처리
      if (formData.coverImage instanceof File) {
        console.log('Uploading cover image file:', formData.coverImage.name);
        const coverImageFormData = new FormData();
        coverImageFormData.append('file', formData.coverImage);
        
        try {
          const coverImageResponse = await axios.post('/api/upload', coverImageFormData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          
          if (coverImageResponse.data.success) {
            apiData.coverImage = coverImageResponse.data.fileUrl;
            console.log('Cover image uploaded successfully:', apiData.coverImage);
          } else {
            throw new Error('Cover image upload failed');
          }
        } catch (uploadError) {
          console.error('Cover image upload error:', uploadError);
          apiData.coverImage = '/images/placeholder-tvfilm.svg';
        }
      } else if (typeof formData.coverImage === 'string' && formData.coverImage) {
        console.log('Using string URL for cover image:', formData.coverImage.substring(0, 50));
        apiData.coverImage = formData.coverImage;
      } else if (imagePreview) {
        console.log('Using image preview as cover image source');
        apiData.coverImage = imagePreview.startsWith('data:') 
          ? '/images/placeholder-tvfilm.svg' // 데이터 URL은 저장할 수 없으므로 기본 이미지 사용
          : imagePreview;
      } else {
        console.log('Using default placeholder for cover image');
        apiData.coverImage = '/images/placeholder-tvfilm.svg';
      }
      
      // 2. 배너 이미지 처리
      if (formData.bannerImage instanceof File) {
        console.log('Uploading banner image file:', formData.bannerImage.name);
        const bannerImageFormData = new FormData();
        bannerImageFormData.append('file', formData.bannerImage);
        
        try {
          const bannerImageResponse = await axios.post('/api/upload', bannerImageFormData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
          
          if (bannerImageResponse.data.success) {
            apiData.bannerImage = bannerImageResponse.data.fileUrl;
            console.log('Banner image uploaded successfully:', apiData.bannerImage);
          }
        } catch (uploadError) {
          console.error('Banner image upload error:', uploadError);
        }
      } else if (typeof formData.bannerImage === 'string' && formData.bannerImage) {
        console.log('Using string URL for banner image');
        apiData.bannerImage = formData.bannerImage;
      } else if (bannerImagePreview) {
        apiData.bannerImage = bannerImagePreview.startsWith('data:')
          ? '/images/placeholder-banner.jpg'
          : bannerImagePreview;
      }
      
      // API 요청 전에 데이터 확인
      console.log('Submitting data to API with the following fields:', Object.keys(apiData).join(', '));
      console.log('Category:', apiData.category);
      console.log('Status:', apiData.status);
      
      try {
        // 3. API 요청 전송
        console.log('Sending request to /api/tvfilm endpoint...');
        const response = await axios.post('/api/tvfilm', apiData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // 4. 응답 처리
        console.log('API response received:', response.status);
        
        if (response.data.success) {
          console.log('TV/Film created successfully!', response.data.data._id);
          setSuccessMessage(`TV/Film "${response.data.data.title}"이(가) 성공적으로 생성되었습니다`);
          
          // 성공 시 목록 페이지로 리디렉션
          setTimeout(() => {
            router.push('/admin/tvfilm');
          }, 2000);
        } else {
          throw new Error(response.data.message || 'Unknown error occurred');
        }
      } catch (error) {
        console.error('Error in API request:', error);
        
        // 서버 응답 오류 처리
        if (error.response) {
          console.error('Server error:', error.response.status, error.response.data);
          
          // 상태 코드별 처리
          if (error.response.status === 400) {
            setErrors({ submit: `입력 데이터 오류: ${error.response.data.message || '입력 데이터를 확인해주세요'}` });
          } else if (error.response.status === 401) {
            setErrors({ submit: '인증이 필요합니다. 다시 로그인해주세요.' });
          } else if (error.response.status === 403) {
            setErrors({ submit: '이 작업을 수행할 권한이 없습니다.' });
          } else {
            setErrors({ submit: `서버 오류 (${error.response.status}): ${error.response.data.message || '알 수 없는 오류가 발생했습니다'}` });
          }
        } else if (error.request) {
          // 요청은 생성되었지만 응답을 받지 못함
          console.error('No response received:', error.request);
          setErrors({ submit: '서버로부터 응답이 없습니다. 네트워크 연결을 확인해주세요.' });
        } else {
          // 요청 설정 중 오류 발생
          console.error('Request setup error:', error.message);
          setErrors({ submit: `요청 오류: ${error.message}` });
        }
      } finally {
        setIsSubmitting(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: error.message || '폼 제출 중 오류가 발생했습니다.' });
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

  // 리뷰 탭에서 사용할 handleReviewsChange 함수 추가
  const handleReviewsChange = (newReviews) => {
    console.log('리뷰 편집기에서 새 리뷰 데이터 수신:', newReviews.length + '개');
    
    if (!Array.isArray(newReviews)) {
      console.warn('유효하지 않은 리뷰 데이터:', newReviews);
      return;
    }
    
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
    
    setFormData(prev => ({
      ...prev,
      reviews: newReviews,
      reviewRating: parseFloat(avgRating.toFixed(1)),
      reviewCount: newReviews.length,
      ratingDistribution: distribution
    }));
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
          <h1 className="text-2xl font-bold">Create New TV/Film</h1>
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

        <form 
          onSubmit={(e) => {
            console.log('Form submit event triggered');
            handleSubmit(e);
          }} 
          className="bg-white rounded-lg shadow-md p-6"
        >
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
                  <option value="drama">K-Drama</option>
                  <option value="movie">Movie</option>
                  <option value="documentary">Documentary</option>
                  <option value="variety">Variety Show</option>
                  <option value="other">Other</option>
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

              {/* Status - only show for non-movies */}
              {formData.category !== 'movie' && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={previewMode}
                  >
                    <option value="ongoing">방영 중</option>
                    <option value="completed">방영 종료</option>
                    <option value="upcoming">방영 예정</option>
                    <option value="canceled">취소됨</option>
                  </select>
                </div>
              )}
              
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
                  이 콘텐츠에 대한 가상의 사용자 리뷰를 추가할 수 있습니다. 추가된 리뷰는 콘텐츠 상세 페이지에 표시됩니다.
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
                
                <ReviewsEditor 
                  reviews={formData.reviews} 
                  onChange={handleReviewsChange}
                  tvfilmId="temp_id" // 임시 ID, 실제로는 저장 후 생성된 ID를 사용
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.submit}
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
              disabled={isSubmitting || previewMode}
              className={`px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors flex items-center ${
                (isSubmitting || previewMode) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={(e) => {
                console.log('Submit button clicked');
                // Form will be submitted via the onSubmit handler on the form element
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin w-4 h-4 mr-2" />
                  Creating...
                </>
              ) : (
                'Create TV/Film'
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

export default CreateTVFilm; 