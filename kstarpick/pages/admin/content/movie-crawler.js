import { useState, useEffect } from 'react';
import { getSession, useSession } from 'next-auth/react';
import AdminLayout from '../../../components/AdminLayout';
import { 
  Plus, 
  Download, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Save,
  FileText,
  Globe,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function MovieCrawler() {
  // 세션 및 라우터
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // 상태 관리
  const [url, setUrl] = useState('https://mydramalist.com/search?adv=titles&ty=77&co=3&so=newest&or=asc&page=1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [crawledMovies, setCrawledMovies] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [selectedMovies, setSelectedMovies] = useState({});
  const [savingMovies, setSavingMovies] = useState({});
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [movieDetailModal, setMovieDetailModal] = useState({ open: false, movie: null });
  const [pageCount, setPageCount] = useState(1);

  // 세션 체크
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
  }, [session, status, router]);

  // 토스트 메시지 표시 함수
  const showToast = (message, type = 'info') => {
    toast[type](message, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  // URL 변경 핸들러
  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };

  // 스텔스 크롤링 실행
  const handleStealthCrawlingClick = async () => {
    try {
      // 간소화된 세션 체크
      console.log('크롤링 시작 - 세션 체크 간소화');
      
      setLoading(true);
      setError(null);
      setCrawledMovies([]);
      
      console.log(`영화 목록 크롤링 시작: ${url}`);
      showToast(`영화 목록 크롤링 중입니다...`, 'info');
      
      const response = await fetch('/api/crawler/movie-stealth-crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          mode: 'list'
        }),
      });
      
      // 응답 가져오기
      let result;
      try {
        result = await response.json();
      } catch (error) {
        console.error('응답 파싱 오류:', error);
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
      }
      
      if (!response.ok) {
        throw new Error(result.message || '영화 목록을 가져오는데 실패했습니다.');
      }
      
      console.log('크롤링 결과:', result);
      
      if (result.data && result.data.movies) {
        setCrawledMovies(result.data.movies);
        setNextPage(result.data.nextPage);
        showToast(`${result.data.movies.length}개의 영화 정보를 가져왔습니다.`, 'success');
      } else {
        setError('영화 정보가 없거나 형식이 올바르지 않습니다.');
        showToast('영화 정보 가져오기에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('크롤링 오류:', error);
      setError(error.message || '크롤링 중 오류가 발생했습니다.');
      showToast(`크롤링 오류: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 다음 페이지 크롤링
  const crawlNextPageWithStealth = async () => {
    if (!nextPage) {
      showToast('더 이상 다음 페이지가 없습니다.', 'info');
      return;
    }
    
    try {
      // 간소화된 세션 체크
      console.log('다음 페이지 크롤링 시작 - 세션 체크 간소화');
      
      setLoading(true);
      setError(null);
      
      console.log(`다음 페이지 크롤링 시작: ${nextPage}`);
      showToast('다음 페이지를 크롤링 중입니다...', 'info');
      
      const response = await fetch('/api/crawler/movie-stealth-crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: nextPage,
          mode: 'list'
        }),
      });
      
      // 응답 가져오기
      let result;
      try {
        result = await response.json();
      } catch (error) {
        console.error('응답 파싱 오류:', error);
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
      }
      
      if (!response.ok) {
        throw new Error(result.message || '영화 목록을 가져오는데 실패했습니다.');
      }
      
      console.log('크롤링 결과:', result);
      
      if (result.data && result.data.movies) {
        setCrawledMovies(prevMovies => [...prevMovies, ...result.data.movies]);
        setNextPage(result.data.nextPage);
        showToast(`${result.data.movies.length}개의 영화 정보를 추가로 가져왔습니다.`, 'success');
      } else {
        setError('영화 정보가 없거나 형식이 올바르지 않습니다.');
        showToast('영화 정보 가져오기에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('크롤링 오류:', error);
      setError(error.message || '크롤링 중 오류가 발생했습니다.');
      showToast(`크롤링 오류: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 영화 상세 정보 크롤링
  const fetchMovieDetail = async (movie) => {
    try {
      // 간소화된 세션 체크
      console.log('상세 정보 크롤링 시작 - 세션 체크 간소화');
      
      setLoading(true);
      setError(null);
      
      console.log(`영화 상세 정보 크롤링 시작: ${movie.title} (${movie.id})`);
      showToast(`"${movie.title}" 영화의 상세 정보를 가져오는 중...`, 'info');
      
      const response = await fetch('/api/crawler/movie-stealth-crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: movie.url,
          mode: 'detail'
        }),
      });
      
      // 응답 가져오기
      let result;
      try {
        result = await response.json();
      } catch (error) {
        console.error('응답 파싱 오류:', error);
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
      }
      
      if (!response.ok) {
        throw new Error(result.message || '영화 상세 정보를 가져오는데 실패했습니다.');
      }
      
      console.log('상세 정보 결과:', result);
      
      const movieDetail = result.data || {};
      
      // 기존 정보와 병합
      const completeMovieData = {
        ...movie,
        ...movieDetail,
        mdlId: movie.id,
        mdlUrl: movie.url
      };
      
      // 데이터 검증 및 구조 확인
      console.log(`영화 정보 검증 - 제목: ${completeMovieData.title}`);
      
      // 출연진 정보가 올바르게 구성되었는지 확인
      if (completeMovieData.credits) {
        console.log('출연진 정보 (credits):', {
          directors: completeMovieData.credits.directors?.length || 0,
          writers: completeMovieData.credits.writers?.length || 0,
          mainCast: completeMovieData.credits.mainCast?.length || 0,
          supportCast: completeMovieData.credits.supportCast?.length || 0
        });
      }
      
      if (completeMovieData.cast) {
        console.log('출연진 정보 (cast):', {
          type: typeof completeMovieData.cast,
          isArray: Array.isArray(completeMovieData.cast),
          mainRoles: completeMovieData.cast.mainRoles?.length || 0,
          supportRoles: completeMovieData.cast.supportRoles?.length || 0,
          length: Array.isArray(completeMovieData.cast) ? completeMovieData.cast.length : 'N/A'
        });
      }
      
      // 누락된 필드 확인 및 처리
      console.log('필수 정보 확인 중...');
      const criticalFields = [
        'originalTitle', 'releaseDate', 'duration', 'runtime',
        'country', 'contentRating', 'genres', 'synopsis', 'summary',
        'poster', 'coverImage', 'bannerImage'
      ];
      
      criticalFields.forEach(field => {
        if (!completeMovieData[field] && field !== 'originalTitle') {
          console.log(`누락된 필드 감지: ${field}`);
        }
      });
      
      // 데이터 보완
      if (!completeMovieData.summary && completeMovieData.synopsis) {
        completeMovieData.summary = completeMovieData.synopsis;
      }
      
      if (!completeMovieData.runtime && completeMovieData.duration) {
        completeMovieData.runtime = completeMovieData.duration;
      }
      
      if (!completeMovieData.ageRating && completeMovieData.contentRating) {
        completeMovieData.ageRating = completeMovieData.contentRating;
      }
      
      // 이미지 필드 확인
      if (!completeMovieData.coverImage && completeMovieData.poster) {
        completeMovieData.coverImage = completeMovieData.poster;
      }
      
      if (!completeMovieData.bannerImage) {
        completeMovieData.bannerImage = completeMovieData.coverImage || completeMovieData.poster;
      }
      
      // 배열 필드 초기화
      if (!Array.isArray(completeMovieData.genres)) {
        completeMovieData.genres = [];
      }
      
      if (!Array.isArray(completeMovieData.tags)) {
        completeMovieData.tags = [];
      }
      
      if (!Array.isArray(completeMovieData.watchProviders)) {
        completeMovieData.watchProviders = [];
      }
      
      // cast와 credits 구조 일관성 유지
      if (completeMovieData.credits) {
        // 항상 cast 객체가 있고 mainRoles, supportRoles 속성을 가지도록 보장
        if (typeof completeMovieData.cast !== 'object' || Array.isArray(completeMovieData.cast)) {
          completeMovieData.cast = {
            mainRoles: [],
            supportRoles: []
          };
        }
        
        // credits에서 cast로 데이터 복사 (중복 가능성이 있더라도 데이터 손실 방지)
        if (Array.isArray(completeMovieData.credits.mainCast)) {
          completeMovieData.cast.mainRoles = completeMovieData.credits.mainCast;
        }
        
        if (Array.isArray(completeMovieData.credits.supportCast)) {
          completeMovieData.cast.supportRoles = completeMovieData.credits.supportCast;
        }
      }
      
      // 중요 필드 로깅
      console.log('주요 정보:', {
        title: completeMovieData.title,
        originalTitle: completeMovieData.originalTitle || '(없음)',
        releaseDate: completeMovieData.releaseDate || '(없음)',
        runtime: completeMovieData.runtime || completeMovieData.duration || '(없음)',
        country: completeMovieData.country || '(없음)',
        genres: (completeMovieData.genres || []).join(', ') || '(없음)',
        ageRating: completeMovieData.ageRating || completeMovieData.contentRating || '(없음)'
      });
      
      // 현재 영화로 설정
      setCurrentMovie(completeMovieData);
      
      // 모달에 표시할 영화 데이터 설정
      setMovieDetailModal({
        open: true,
        movie: completeMovieData
      });
      
      showToast(`"${movie.title}" 영화의 상세 정보를 가져왔습니다.`, 'success');
      
      return completeMovieData;
    } catch (error) {
      console.error('상세 정보 크롤링 오류:', error);
      setError(error.message || '상세 정보 크롤링 중 오류가 발생했습니다.');
      showToast(`크롤링 오류: ${error.message}`, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 영화 저장
  const saveMovieToDatabase = async (movieData) => {
    if (!movieData) {
      showToast('저장할 영화 데이터가 없습니다.', 'error');
      return;
    }
    
    try {
      // 간소화된 세션 체크
      console.log('영화 저장 시작 - 세션 체크 간소화');
      
      setSavingMovies(prev => ({ ...prev, [movieData.mdlId]: 'saving' }));
      
      console.log(`영화 저장 시작: ${movieData.title}`);
      
      // 출연진 정보 로깅 및 확인
      if (movieData.credits) {
        console.log(`[영화 저장] 크레딧 정보: 주연 ${movieData.credits.mainCast?.length || 0}명, 조연 ${movieData.credits.supportCast?.length || 0}명`);
        
        // credits.mainCast 및 supportCast가 있는지 확인하고 cast 필드 업데이트
        if (Array.isArray(movieData.credits.mainCast) || Array.isArray(movieData.credits.supportCast)) {
          const mainCast = Array.isArray(movieData.credits.mainCast) ? movieData.credits.mainCast : [];
          const supportCast = Array.isArray(movieData.credits.supportCast) ? movieData.credits.supportCast : [];
          
          // 중복 제거를 위한 출연자 이름 집합
          const actorNames = new Set();
          
          // 출연진 정보 통합
          const convertedCast = [
            ...mainCast.filter(actor => {
              // 중복 제거
              if (actor && actor.name && !actorNames.has(actor.name)) {
                actorNames.add(actor.name);
                return true;
              }
              return false;
            }).map((actor, index) => ({
              name: actor.name || 'N/A',
              role: actor.role || (actor.character ? actor.character : 'Main Role'),
              image: actor.image || '',
              order: index
            })),
            ...supportCast.filter(actor => {
              // 중복 제거
              if (actor && actor.name && !actorNames.has(actor.name)) {
                actorNames.add(actor.name);
                return true;
              }
              return false;
            }).map((actor, index) => ({
              name: actor.name || 'N/A',
              role: actor.role || (actor.character ? actor.character : 'Support Role'),
              image: actor.image || '',
              order: mainCast.length + index
            }))
          ];
          
          console.log(`[영화 저장] 통합된 출연진 정보: 총 ${convertedCast.length}명`);
          // 출연진 정보 갱신
          movieData.cast = convertedCast;
        }
      } else if (movieData.cast && typeof movieData.cast === 'object' && !Array.isArray(movieData.cast)) {
        console.log(`[영화 저장] cast 객체 형태 정보: 주연 ${movieData.cast.mainRoles?.length || 0}명, 조연 ${movieData.cast.supportRoles?.length || 0}명`);
        
        // cast 객체에서 정보 추출하여 배열로 변환
        const mainRoles = Array.isArray(movieData.cast.mainRoles) ? movieData.cast.mainRoles : [];
        const supportRoles = Array.isArray(movieData.cast.supportRoles) ? movieData.cast.supportRoles : [];
        
        // 중복 제거를 위한 출연자 이름 집합
        const actorNames = new Set();
        
        // 배열로 통합
        const convertedCast = [
          ...mainRoles.filter(actor => {
            if (actor && actor.name && !actorNames.has(actor.name)) {
              actorNames.add(actor.name);
              return true;
            }
            return false;
          }).map((actor, index) => ({
            name: actor.name || 'N/A',
            role: actor.role || 'Main Role',
            image: actor.image || '',
            order: index
          })),
          ...supportRoles.filter(actor => {
            if (actor && actor.name && !actorNames.has(actor.name)) {
              actorNames.add(actor.name);
              return true;
            }
            return false;
          }).map((actor, index) => ({
            name: actor.name || 'N/A',
            role: actor.role || 'Support Role',
            image: actor.image || '',
            order: mainRoles.length + index
          }))
        ];
        
        console.log(`[영화 저장] 변환된 출연진 정보: 총 ${convertedCast.length}명`);
        // 출연진 정보 갱신
        movieData.cast = convertedCast;
      }
      
      // 필수 필드가 누락된 경우 기본값 설정
      const enhancedMovieData = {
        ...movieData,
        // 기본 정보
        category: 'movie',
        status: movieData.status || 'completed', // 영화는 기본적으로 'completed'
        
        // 필수 텍스트 필드
        originalTitle: movieData.originalTitle || '',
        summary: movieData.synopsis || movieData.summary || '',
        content: movieData.synopsis || movieData.content || movieData.summary || '',
        
        // 영화 상세 정보
        releaseDate: movieData.releaseDate || null,
        director: movieData.director || '',
        runtime: movieData.duration || movieData.runtime || '',
        country: movieData.country || 'South Korea', // 기본값
        ageRating: movieData.contentRating || '',
        
        // 배열 필드
        genres: Array.isArray(movieData.genres) ? movieData.genres : [],
        tags: Array.isArray(movieData.tags) ? movieData.tags : [],
        
        // 이미지 관련
        coverImage: movieData.poster || movieData.coverImage || '/images/placeholder-tvfilm.svg',
        bannerImage: movieData.bannerImage || movieData.poster || '/images/placeholder-tvfilm.svg',
        
        // 시청 플랫폼 (비어있는 경우 초기화)
        watchProviders: Array.isArray(movieData.watchProviders) ? movieData.watchProviders : [],
        
        // 타임스탬프
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('[영화 저장] 저장할 데이터 준비 완료:', {
        title: enhancedMovieData.title,
        originalTitle: enhancedMovieData.originalTitle,
        genre: enhancedMovieData.genres,
        runtime: enhancedMovieData.runtime,
        releaseDate: enhancedMovieData.releaseDate,
        country: enhancedMovieData.country,
        ageRating: enhancedMovieData.ageRating
      });
      
      // 데이터베이스에 저장
      console.log('데이터베이스에 저장 중...');
      
      // 인증 토큰 가져오기 - 개선된 방식
      let token = localStorage.getItem('token') || 
                  localStorage.getItem('adminToken') || 
                  sessionStorage.getItem('token') ||
                  sessionStorage.getItem('adminToken');
      
      console.log('영화 저장 토큰 확인:', token ? `토큰 존재 (길이: ${token.length})` : '토큰 없음');
      
      // 토큰이 없으면 NextAuth 세션에서 가져오기 시도
      if (!token) {
        console.log('로컬 토큰이 없음, NextAuth 세션 확인 시도');
        try {
          const sessionResponse = await fetch('/api/auth/session');
          const sessionData = await sessionResponse.json();
          if (sessionData?.user?.role === 'admin') {
            console.log('NextAuth 세션에서 admin 권한 확인됨');
            token = 'session-based-auth';
          }
        } catch (sessionError) {
          console.error('세션 확인 실패:', sessionError);
        }
      }
      
      const response = await fetch('/api/dramas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(enhancedMovieData),
      });
      
      // 응답 가져오기
      let result;
      try {
        result = await response.json();
      } catch (error) {
        console.error('응답 파싱 오류:', error);
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
      }
      
      if (!response.ok) {
        throw new Error(result.message || '영화 저장에 실패했습니다.');
      }
      
      console.log('저장 결과:', result);
      
      setSavingMovies(prev => ({ ...prev, [movieData.mdlId]: 'saved' }));
      showToast(`"${movieData.title}" 영화를 저장했습니다.`, 'success');
      return result.data;
    } catch (error) {
      console.error('영화 저장 오류:', error);
      setSavingMovies(prev => ({ ...prev, [movieData.mdlId]: 'error' }));
      showToast(`저장 오류: ${error.message}`, 'error');
      return null;
    }
  };

  // 선택한 영화 저장
  const saveSelectedMovies = async () => {
    const selectedMovieIds = Object.keys(selectedMovies).filter(id => selectedMovies[id]);
    
    if (selectedMovieIds.length === 0) {
      showToast('저장할 영화를 선택해주세요.', 'warning');
      return;
    }
    
    let savedCount = 0;
    let errorCount = 0;
    
    for (const movieId of selectedMovieIds) {
      const movie = crawledMovies.find(m => m.id === movieId);
      
      if (!movie) continue;
      
      try {
        await fetchMovieDetail(movie);
        await saveMovieToDatabase(currentMovie);
        savedCount++;
      } catch (error) {
        console.error(`"${movie.title}" 저장 실패:`, error);
        errorCount++;
      }
    }
    
    showToast(`${savedCount}개 영화 저장 완료, ${errorCount}개 실패`, savedCount > 0 ? 'success' : 'warning');
  };

  // 영화 선택 토글
  const toggleMovieSelection = (id) => {
    setSelectedMovies(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 모든 영화 선택/해제 토글
  const toggleSelectAll = () => {
    if (Object.keys(selectedMovies).length === crawledMovies.length &&
        Object.values(selectedMovies).every(v => v)) {
      // 모두 선택된 상태면 모두 해제
      setSelectedMovies({});
    } else {
      // 그렇지 않으면 모두 선택
      const newSelected = {};
      crawledMovies.forEach(movie => {
        newSelected[movie.id] = true;
      });
      setSelectedMovies(newSelected);
    }
  };

  // 저장 상태 아이콘 표시
  const getSavingStatusIcon = (id) => {
    const status = savingMovies[id];
    
    if (status === 'saving') return <RefreshCw className="animate-spin h-4 w-4 text-blue-500" />;
    if (status === 'saved') return <Check className="h-4 w-4 text-green-500" />;
    if (status === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />;
    
    return null;
  };

  // 리뷰 크롤링
  const crawlMovieReviews = async (movieId, movieUrl) => {
    if (!movieId || !movieUrl) {
      showToast('영화 ID와 URL이 필요합니다.', 'error');
      return;
    }
    
    try {
      // 간소화된 세션 체크
      console.log('리뷰 크롤링 시작 - 세션 체크 간소화');
      
      setReviewsLoading(true);
      
      console.log(`영화 리뷰 크롤링 시작: ${movieUrl}/reviews`);
      showToast('리뷰를 크롤링 중입니다...', 'info');
      
      const response = await fetch('/api/crawler/movie-reviews-stealth-crawler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `${movieUrl}/reviews`,
          dramaId: movieId
        }),
      });
      
      // 응답 가져오기
      let result;
      try {
        result = await response.json();
      } catch (error) {
        console.error('응답 파싱 오류:', error);
        throw new Error('서버 응답을 처리하는 중 오류가 발생했습니다.');
      }
      
      if (!response.ok) {
        throw new Error(result.message || '리뷰를 가져오는데 실패했습니다.');
      }
      
      console.log('리뷰 크롤링 결과:', result);
      
      if (result.data && result.data.reviewCount) {
        setReviewsCount(result.data.reviewCount);
        
        // 영화 상세 정보에 리뷰 정보 업데이트
        setMovieDetailModal(prev => ({
          ...prev,
          movie: {
            ...prev.movie,
            reviewCount: result.data.reviewCount,
            reviewRating: result.data.reviewRating,
            ratingDistribution: result.data.ratingDistribution
          }
        }));
        
        showToast(`${result.data.reviewCount}개의 리뷰를 크롤링했습니다. 평균 평점: ${result.data.reviewRating?.toFixed(1)}`, 'success');
      } else {
        showToast('리뷰를 크롤링 했으나 결과가 없습니다.', 'warning');
      }
    } catch (error) {
      console.error('리뷰 크롤링 오류:', error);
      showToast(`리뷰 크롤링 오류: ${error.message}`, 'error');
    } finally {
      setReviewsLoading(false);
    }
  };

  // 영화 상세 정보 모달
  const renderDetailModal = () => {
    if (!movieDetailModal.open || !movieDetailModal.movie) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{movieDetailModal.movie.title}</h2>
              <button 
                onClick={() => setMovieDetailModal({ open: false, movie: null })}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                {movieDetailModal.movie.poster ? (
                  <div className="relative w-full aspect-[2/3] rounded overflow-hidden">
                    <img
                      src={movieDetailModal.movie.poster}
                      alt={movieDetailModal.movie.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center rounded">
                    <span className="text-gray-400">이미지 없음</span>
                  </div>
                )}
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">평점:</span>
                    <span className="font-semibold">{movieDetailModal.movie.rating || '정보 없음'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">연도:</span>
                    <span className="font-semibold">{movieDetailModal.movie.year || '정보 없음'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">국가:</span>
                    <span className="font-semibold">{movieDetailModal.movie.country || '정보 없음'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">리뷰:</span>
                    <span className="font-semibold">{movieDetailModal.movie.reviewCount || '0'}</span>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold mb-2">상세 정보</h3>
                
                {movieDetailModal.movie.originalTitle && (
                  <div className="mb-3">
                    <span className="text-gray-500 text-sm">원제: </span>
                    <span>{movieDetailModal.movie.originalTitle}</span>
                  </div>
                )}
                
                {movieDetailModal.movie.genres && movieDetailModal.movie.genres.length > 0 && (
                  <div className="mb-3">
                    <span className="text-gray-500 text-sm">장르: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {movieDetailModal.movie.genres.map((genre, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {movieDetailModal.movie.synopsis && (
                  <div className="mb-3">
                    <span className="text-gray-500 text-sm">줄거리: </span>
                    <p className="text-sm mt-1 text-gray-700">{movieDetailModal.movie.synopsis}</p>
                  </div>
                )}
                
                {movieDetailModal.movie.cast && movieDetailModal.movie.cast.mainRoles && movieDetailModal.movie.cast.mainRoles.length > 0 && (
                  <div className="mb-3">
                    <span className="text-gray-500 text-sm">주요 출연진: </span>
                    <ul className="list-disc list-inside text-sm mt-1">
                      {movieDetailModal.movie.cast.mainRoles.map((actor, index) => (
                        <li key={index}>
                          {actor.name} {actor.role ? ` - ${actor.role}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {movieDetailModal.movie.releaseDate && (
                  <div className="mb-3">
                    <span className="text-gray-500 text-sm">개봉일: </span>
                    <span>{movieDetailModal.movie.releaseDate}</span>
                  </div>
                )}
                
                {movieDetailModal.movie.duration && (
                  <div className="mb-3">
                    <span className="text-gray-500 text-sm">상영 시간: </span>
                    <span>{movieDetailModal.movie.duration}</span>
                  </div>
                )}
                
                {movieDetailModal.movie.contentRating && (
                  <div className="mb-3">
                    <span className="text-gray-500 text-sm">등급: </span>
                    <span>{movieDetailModal.movie.contentRating}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-2">리뷰 정보</h3>
              
              {movieDetailModal.movie.reviewCount > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">평균 평점:</span>
                    <span className="font-semibold">{movieDetailModal.movie.reviewRating?.toFixed(1) || '0'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">평점 분포:</span>
                    <div className="flex mt-1 gap-1 h-24">
                      {movieDetailModal.movie.ratingDistribution && movieDetailModal.movie.ratingDistribution.map((count, index) => (
                        <div key={index} className="flex flex-col items-center w-8">
                          <div className="flex-grow w-full bg-gray-100 relative">
                            <div 
                              className="absolute bottom-0 w-full bg-blue-500"
                              style={{
                                height: `${count > 0 ? Math.max((count / Math.max(...movieDetailModal.movie.ratingDistribution)) * 100, 10) : 0}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-xs mt-1">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">
                  아직 리뷰 정보가 없습니다. 리뷰를 크롤링하세요.
                </div>
              )}
            </div>
              
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setMovieDetailModal({ open: false, movie: null })}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm"
              >
                닫기
              </button>
              
              <button
                onClick={() => saveMovieToDatabase(movieDetailModal.movie)}
                disabled={loading || savingMovies[movieDetailModal.movie.mdlId] === 'saving' || savingMovies[movieDetailModal.movie.mdlId] === 'saved'}
                className="px-4 py-2 rounded text-white text-sm flex items-center gap-1"
                style={{
                  backgroundColor: (loading || savingMovies[movieDetailModal.movie.mdlId] === 'saving' || savingMovies[movieDetailModal.movie.mdlId] === 'saved') ? '#93b4ff' : '#233cfa'
                }}
              >
                {savingMovies[movieDetailModal.movie.mdlId] === 'saving' ? (
                  <RefreshCw className="animate-spin h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                데이터베이스에 저장
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="container px-4 py-6 mx-auto">
        <h1 className="text-2xl font-bold mb-6">영화 정보 등록</h1>

        {/* 크롤링 컨트롤 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">MyDramaList 영화 크롤링</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-1">최대 페이지 수</label>
              <input
                type="number"
                min="1"
                max="10"
                value={pageCount}
                onChange={(e) => setPageCount(parseInt(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                disabled={loading}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleStealthCrawlingClick}
                disabled={loading}
                className="w-full px-4 py-2 rounded-md flex items-center justify-center"
                style={{
                  backgroundColor: loading ? '#93b4ff' : '#233cfa',
                  color: 'white'
                }}
              >
                {loading ? <RefreshCw className="animate-spin h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                스텔스 크롤링 시작
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm mb-4">
              {error}
            </div>
          )}
        </div>
        
        {/* 크롤링된 영화 목록 */}
        {crawledMovies.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">크롤링된 영화 목록 ({crawledMovies.length}개)</h2>
              
              <div className="flex gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  전체 선택/해제
                </button>
                
                {nextPage && (
                  <button
                    onClick={crawlNextPageWithStealth}
                    disabled={loading}
                    className="px-3 py-1 rounded text-sm flex items-center gap-1 text-white"
                    style={{
                      backgroundColor: loading ? '#93b4ff' : '#233cfa'
                    }}
                  >
                    {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    다음 페이지
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      선택
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-14">
                      이미지
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      제목
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      평점
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      연도
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      상태
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {crawledMovies.map((movie) => (
                    <tr key={movie.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedMovies[movie.id] || false}
                          onChange={() => toggleMovieSelection(movie.id)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {movie.image ? (
                          <div className="w-10 h-14 relative overflow-hidden rounded">
                            <img
                              src={movie.image}
                              alt={movie.title}
                              className="object-cover w-full h-full"
                              onError={(e) => { e.target.src = '/images/placeholder-poster.png'; }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-14 bg-gray-200 flex items-center justify-center rounded">
                            <span className="text-xs text-gray-500">없음</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{movie.title}</div>
                        <div className="text-xs text-gray-500">{movie.id}</div>
                        <div className="text-xs text-blue-500 hover:underline">
                          <a href={movie.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            MDL
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {movie.rating ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {movie.rating}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movie.year || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getSavingStatusIcon(movie.id) || (
                          <span className="text-xs text-gray-400">대기중</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => fetchMovieDetail(movie)}
                            disabled={loading}
                            className="text-xs flex items-center gap-1"
                            style={{ color: '#233cfa' }}
                          >
                            상세정보
                          </button>
                          {savingMovies[movie.id] === 'saved' ? (
                            <span className="text-green-600 text-xs">✓ 저장됨</span>
                          ) : (
                            <button
                              onClick={async () => {
                                await fetchMovieDetail(movie);
                                if (currentMovie) {
                                  await saveMovieToDatabase(currentMovie);
                                }
                              }}
                              disabled={loading || savingMovies[movie.id] === 'saving'}
                              className="text-xs flex items-center gap-1"
                              style={{
                                color: (loading || savingMovies[movie.id] === 'saving') ? '#93b4ff' : '#233cfa'
                              }}
                            >
                              {savingMovies[movie.id] === 'saving' ? '저장 중...' : '저장'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {renderDetailModal()}
      
      <ToastContainer />
    </AdminLayout>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  // 관리자 권한 체크
  if (!session || session.user.role !== 'admin') {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }
  
  return {
    props: {
      session,
    },
  };
} 