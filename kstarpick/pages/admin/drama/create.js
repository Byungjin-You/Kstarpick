import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { useRouter } from 'next/router';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { X, Plus, Upload, ExternalLink, Eye, EyeOff, Loader, Star } from 'lucide-react';
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

function CreateDrama() {
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
    category: 'k-drama',
    coverImage: null,
    bannerImage: null,
    summary: '',
    network: '',
    status: 'ongoing',
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
      category: 'k-drama',
      coverImage: null,
      bannerImage: null,
      summary: '',
      network: '',
      status: 'ongoing',
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
    setErrors({});
    setImageUrl('');
    setBannerImageUrl('');
    setFileError('');
    setBannerFileError('');
    setPreviewMode(false);
  }, [router.pathname]);

  // 크롤링된 데이터 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined' && router.query.fromCrawler === 'true') {
      try {
        // 로컬 스토리지에서 드라마 데이터 불러오기
        const dramaDataStr = localStorage.getItem('registerDramaData');
        
        if (dramaDataStr) {
          const dramaData = JSON.parse(dramaDataStr);
          console.log('크롤링된 드라마 데이터 불러옴:', dramaData);
          
          // 방영일 포맷 변환 (May 6, 2025 -> 2025-05-06)
          let formattedReleaseDate = '';
          if (dramaData.releaseDate) {
            try {
              // 방영일 문자열로부터 Date 객체 생성 시도
              const releaseDate = new Date(dramaData.releaseDate);
              
              // 유효한 날짜인 경우 YYYY-MM-DD 형식으로 변환
              if (!isNaN(releaseDate)) {
                formattedReleaseDate = releaseDate.toISOString().split('T')[0];
                console.log('방영일 변환:', dramaData.releaseDate, '->', formattedReleaseDate);
              } else {
                // 직접 파싱 시도 - 'Month Day, Year' 형식 (May 6, 2025)
                const dateMatch = dramaData.releaseDate.match(/([A-Za-z]+)\s+(\d+),\s+(\d{4})/);
                if (dateMatch) {
                  const monthMap = {
                    'January': '01', 'February': '02', 'March': '03', 'April': '04',
                    'May': '05', 'June': '06', 'July': '07', 'August': '08',
                    'September': '09', 'October': '10', 'November': '11', 'December': '12'
                  };
                  
                  const month = monthMap[dateMatch[1]] || '01';
                  let day = dateMatch[2].padStart(2, '0');
                  const year = dateMatch[3];
                  
                  formattedReleaseDate = `${year}-${month}-${day}`;
                  console.log('방영일 수동 변환:', dramaData.releaseDate, '->', formattedReleaseDate);
                }
              }
            } catch (err) {
              console.error('방영일 변환 중 오류:', err);
              formattedReleaseDate = '';
            }
          }
          
          // 폼 데이터 업데이트
          setFormData(prevData => ({
            ...prevData,
            title: dramaData.title || prevData.title,
            originalTitle: dramaData.originalTitle || prevData.originalTitle,
            summary: dramaData.summary || prevData.summary,
            network: dramaData.network || prevData.network,
            status: dramaData.status || prevData.status,
            releaseDate: formattedReleaseDate || prevData.releaseDate,
            rating: dramaData.rating || prevData.rating,
            runtime: dramaData.runtime || prevData.runtime,
            ageRating: dramaData.ageRating || prevData.ageRating,
            director: dramaData.director || prevData.director,
            country: dramaData.country || prevData.country,
            genres: Array.isArray(dramaData.genres) ? dramaData.genres : [],
            category: dramaData.category || prevData.category
          }));
          
          // 이미지 URL이 있으면 설정
          if (dramaData.coverImage) {
            setImageUrl(dramaData.coverImage);
            
            // 이미지 URL 직접 설정
            console.log('이미지 URL 직접 설정:', dramaData.coverImage);
            
            // 이미지 미리보기 설정 (직접 URL 사용)
            setImagePreview(dramaData.coverImage);
            
            // 폼 데이터에 이미지 URL 설정
            setFormData(prevData => ({
              ...prevData,
              coverImage: dramaData.coverImage
            }));
          }
          
          // 사용 후 데이터 제거
          localStorage.removeItem('registerDramaData');
          
          // 성공 알림
          alert('크롤링된 드라마 정보를 불러왔습니다. 정보를 확인하고 필요시 수정 후 등록하세요.');
        }
      } catch (err) {
        console.error('크롤링된 데이터를 불러오는 중 오류:', err);
        alert('크롤링된 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    }
  }, [router.query.fromCrawler]);

  // 원격 이미지 URL 처리 함수 추가
  const handleRemoteImageUrl = (url) => {
    if (!url) return;
    
    try {
      console.log('원격 이미지 URL 처리:', url);
      
      // 이미지 미리보기 설정 (직접 URL 사용)
      setImagePreview(url);
      
      // 폼 데이터에 이미지 URL 설정
      setFormData(prevData => ({
        ...prevData,
        coverImage: url
      }));
      
      return true;
    } catch (error) {
      console.error('원격 이미지 URL 처리 오류:', error);
      return false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: name === 'rating' ? parseFloat(value) || '' : value
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
      
      // 이미지를 직접 설정 시도
      const directResult = handleRemoteImageUrl(imageUrl);
      
      if (directResult) {
        console.log('이미지 URL 직접 설정 성공');
      } else {
        console.log('이미지 URL 직접 설정 실패, 프록시 사용 시도');
        
        // 프록시 URL 설정 - 외부 이미지를 위해 프록시 사용
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(imageUrl)}`;
        
        // 이미지 미리보기용으로는 프록시 URL 사용
        setImagePreview(proxyUrl);
        
        // 실제 저장은 원본 URL 사용
        setFormData(prevData => ({
          ...prevData,
          coverImage: imageUrl
        }));
      }
      
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
    
    try {
      console.log('폼 데이터 제출 시작');
      console.log('formData 장르:', formData.genres);
      console.log('formData 출연진:', formData.cast);
      console.log('formData 시청 제공자:', formData.watchProviders);
      
      // Validate required fields
      const requiredFields = ['title', 'summary'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        
        // Set errors for each missing field
        const newErrors = {};
        missingFields.forEach(field => {
          newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        });
        
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }
      
      // 안전하게 JSON 파싱
      let castData = [];
      try {
        if (Array.isArray(formData.cast)) {
          castData = formData.cast;
        } else if (typeof formData.cast === 'string') {
          castData = JSON.parse(formData.cast || '[]');
        }
      } catch (err) {
        console.error('출연진 데이터 파싱 오류:', err);
        castData = [];
      }
      
      let watchProvidersData = [];
      try {
        if (Array.isArray(formData.watchProviders)) {
          watchProvidersData = formData.watchProviders;
        } else if (typeof formData.watchProviders === 'string') {
          watchProvidersData = JSON.parse(formData.watchProviders || '[]');
        }
      } catch (err) {
        console.error('시청 제공자 데이터 파싱 오류:', err);
        watchProvidersData = [];
      }
      
      console.log('폼 데이터 전송 전 값 확인:');
      console.log('category: ', formData.category);
      console.log('status: ', formData.status);
      console.log('ageRating: ', formData.ageRating);

      // 1. Prepare data for tvfilm API (기존 방식)
      const tvfilmData = {
        title: formData.title,
        originalTitle: formData.originalTitle,
        slug: formData.slug,
        summary: formData.summary,
        content: formData.content || formData.summary || '',
        category: 'k-drama',
        status: formData.status,
        releaseDate: formData.releaseDate,
        network: formData.network,
        director: formData.director,
        runtime: formData.runtime,
        country: formData.country,
        ageRating: formData.ageRating,
        trailerUrl: formData.trailerUrl,
        coverImage: formData.coverImage || '/images/defaults/drama-cover.jpg',
        bannerImage: formData.bannerImage || '/images/defaults/drama-banner.jpg',
        cast: castData,
        genres: formData.genres,
        watchProviders: watchProvidersData,
        reviews: formData.reviews || [],
        reviewRating: formData.reviewRating || 0,
        reviewCount: formData.reviewCount || 0,
        ratingDistribution: formData.ratingDistribution || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      };
      
      // 2. Prepare data for dramas API (추가된 방식)
      const dramasData = {
        title: formData.title,
        originalTitle: formData.originalTitle,
        summary: formData.summary,
        status: formData.status,
        releaseDate: formData.releaseDate,
        network: formData.network,
        director: formData.director,
        runtime: formData.runtime,
        country: formData.country,
        ageRating: formData.ageRating,
        rating: formData.rating,
        genre: formData.genres,
        coverImage: formData.coverImage || '/images/defaults/drama-cover.jpg',
        bannerImage: formData.bannerImage || '/images/defaults/drama-banner.jpg',
        trailerUrl: formData.trailerUrl,
        category: 'k-drama'
      };
      
      // 배열 데이터 확인 - 문자열이면 배열로 변환
      if (!Array.isArray(dramasData.genre)) {
        console.warn('genre가 배열이 아닙니다. 배열로 변환합니다:', dramasData.genre);
        if (typeof dramasData.genre === 'string') {
          try {
            // JSON 문자열인 경우 파싱
            if (dramasData.genre.startsWith('[') && dramasData.genre.endsWith(']')) {
              dramasData.genre = JSON.parse(dramasData.genre);
            } else {
              // 단일 문자열인 경우 배열로 변환
              dramasData.genre = [dramasData.genre];
            }
          } catch (err) {
            console.error('genre를 배열로 변환하는 중 오류 발생:', err);
            dramasData.genre = dramasData.genre ? [dramasData.genre] : [];
          }
        } else if (!dramasData.genre) {
          dramasData.genre = []; 
        } else {
          dramasData.genre = [String(dramasData.genre)];
        }
      }
      
      console.log('tvfilm API로 전송되는 데이터:', JSON.stringify(tvfilmData, null, 2));
      console.log('dramas API로 전송되는 데이터:', JSON.stringify(dramasData, null, 2));
      console.log('장르 데이터 형식 확인:', typeof dramasData.genre, Array.isArray(dramasData.genre), JSON.stringify(dramasData.genre));
      
      // Get token
      const token = Cookies.get('token') || localStorage.getItem('token');
      
      // Submit to both APIs in parallel
      try {
        console.log('API 요청 시작 - 두 API 모두에 병렬로 요청');
        const [tvfilmResponse, dramasResponse] = await Promise.all([
          // 1. 기존 tvfilm API 요청
          axios.post('/api/tvfilm', tvfilmData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          
          // 2. 추가된 dramas API 요청
          axios.post('/api/dramas', dramasData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);
        
        console.log('tvfilm API 응답:', tvfilmResponse.status, tvfilmResponse.statusText);
        console.log('tvfilm 생성된 데이터:', JSON.stringify(tvfilmResponse.data, null, 2));
        
        console.log('dramas API 응답:', dramasResponse.status, dramasResponse.statusText);
        console.log('dramas 생성된 데이터:', JSON.stringify(dramasResponse.data, null, 2));
      
        if (tvfilmResponse.data.success && dramasResponse.data.success) {
          setSuccessMessage('TV/Film이 성공적으로 생성되어 드라마 목록에도 표시됩니다');
          setTimeout(() => {
            router.push('/admin/drama');
          }, 2000);
        } else if (tvfilmResponse.data.success) {
          setSuccessMessage('TV/Film만 성공적으로 생성되었습니다. 드라마 목록에는 추가되지 않았습니다.');
          setTimeout(() => {
            router.push('/admin/drama');
          }, 2000);
        } else {
          throw new Error('데이터 저장에 실패했습니다.');
        }
      } catch (error) {
        console.error('Error creating content:', error);
        if (error.response) {
          console.error('Error response status:', error.response.status);
          console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
        }
        throw error; // 상위 catch 블록으로 에러 전달
      }
    } catch (error) {
      console.error('Error creating drama:', error);
      
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        // 유효성 검증 오류인 경우 자세한 메시지 표시
        if (error.response.status === 400 && error.response.data.message) {
          setErrors({ general: `제출 오류: ${error.response.data.message}` });
        } else {
          setErrors({ general: '서버 오류가 발생했습니다. 다시 시도해주세요.' });
        }
      } else {
        setErrors({ general: '서버 오류가 발생했습니다. 다시 시도해주세요.' });
      }
    } finally {
      setIsSubmitting(false);
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

              {/* Rating */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="rating">
                  드라마 평점 <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-2">드라마의 전체적인 평점을 입력하세요 (0-10점)</p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          const rating = star * 2;
                          setFormData(prev => ({ ...prev, rating }));
                        }}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= (formData.rating ? Math.ceil(formData.rating / 2) : 0)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    id="rating"
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                    min="0"
                    max="10"
                    step="0.1"
                    className={`w-24 px-3 py-2 border rounded-md ${errors.rating ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="0-10"
                    disabled={previewMode}
                  />
                </div>
                {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
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

              {/* Status */}
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

          {/* Submit Button */}
          <div className="flex justify-end mt-8 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/admin/drama')}
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

export default CreateDrama; 