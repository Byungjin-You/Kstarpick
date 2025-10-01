import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, Edit, Eye, Music as MusicIcon, ArrowUp, ArrowDown, AlertCircle, Youtube, X, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

export default function AdminMusicList() {
  const router = useRouter();
  const [music, setMusic] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [limit] = useState(10);
  const [updatedMusicIds, setUpdatedMusicIds] = useState([]);
  
  // 유튜브 인기 급상승 관련 상태
  const [showTrendingModal, setShowTrendingModal] = useState(false);
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [trendingError, setTrendingError] = useState(null);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0 });

  // 이번주 인기 영상 관련 상태
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyVideos, setWeeklyVideos] = useState([]);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [weeklyError, setWeeklyError] = useState(null);
  const [selectedWeeklyVideos, setSelectedWeeklyVideos] = useState([]);
  const [playlistUrl, setPlaylistUrl] = useState('https://www.youtube.com/playlist?list=OLNY56MxFrczc5CoAvnTCDO_3bAdOLExkJQ');

  // 음악 데이터 가져오기
  const fetchMusic = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // JWT 토큰 가져오기 - 임시 제거
      // const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      
      // 기본값으로 position 오름차순 정렬
      const response = await fetch(`/api/music?limit=${limit}&page=${currentPage}&sort=position`, {
        headers: {
          // 'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch music data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('API 응답 데이터:', data);
        
        // 음악 데이터가 없으면 처리 중단
        if (!data.musics || data.musics.length === 0) {
          setMusic([]);
          setTotalPages(1);
          setIsLoading(false);
          return;
        }
        
        // 첫 번째 항목 로깅
        console.log('첫 번째 음악 항목:', {
          id: data.musics[0]._id,
          title: data.musics[0].title,
          position: data.musics[0].position,
          position타입: typeof data.musics[0].position,
          dailyViews: data.musics[0].dailyViews || data.musics[0].dailyview || data.musics[0].dailyView
        });
        
        // 필드 정규화 처리
        const formattedMusics = data.musics.map(item => {
          // 숫자로 변환
          const ensureNumber = (value, defaultValue = 0) => {
            if (typeof value === 'number') return value;
            const parsed = parseInt(value);
            return isNaN(parsed) ? defaultValue : parsed;
          };
          
          // 일일 조회수 통합
          const dailyViews = ensureNumber(
            item.dailyViews || item.dailyview || item.dailyView, 
            Math.round(ensureNumber(item.views) * 0.02)
          );
          
          // position 처리
          const position = ensureNumber(item.position, 99);
          const previousPosition = ensureNumber(item.previousPosition, position);
          
          return {
            ...item,
            dailyViews,
            position,
            previousPosition,
            totalViews: ensureNumber(item.totalViews || item.views)
          };
        });
        
        console.log('처리된 음악 데이터 (첫 항목):', formattedMusics[0]);
        
        setMusic(formattedMusics);
        setTotalPages(Math.ceil(data.totalItems / limit) || 1);
      } else {
        throw new Error(data.message || 'Failed to fetch music data');
      }
    } catch (error) {
      console.error('음악 데이터를 가져오는 중 오류가 발생했습니다:', error);
      setError('음악 데이터를 가져오는 중 오류가 발생했습니다.');
      // 오류 발생시 로컬 더미 데이터 사용
      const dummyData = generateDummyMusic();
      setMusic(dummyData);
      setTotalPages(Math.ceil(dummyData.length / limit));
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 음악 데이터 가져오기
  useEffect(() => {
    fetchMusic();
  }, [currentPage]);

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // 데모용 더미 데이터 생성
  const generateDummyMusic = () => {
    return Array(10).fill(0).map((_, index) => ({
      _id: `dummy-${index + 1}`,
      title: `K-POP Song ${index + 1}`,
      artist: `Artist ${index + 1}`,
      position: index + 1,
      previousPosition: index + 2,
      youtubeUrl: 'https://www.youtube.com/watch?v=example',
      thumbnailUrl: 'https://i.ytimg.com/vi/example/default.jpg',
      dailyViews: `${Math.floor(Math.random() * 100000)}`,
      totalViews: `${Math.floor(Math.random() * 10000000)}`,
      releaseDate: new Date(Date.now() - Math.random() * 10000000000).toISOString()
    }));
  };

  // 검색 처리
  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      fetchMusic();
      return;
    }
    
    const filteredMusic = music.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.artist.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setMusic(filteredMusic);
  };

  // 음악 삭제
  const handleDelete = async (id) => {
    try {
      // JWT 토큰 가져오기 - 임시 제거
      // const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      
      const response = await fetch(`/api/music/${id}`, {
        method: 'DELETE',
        headers: {
          // 'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('음악 삭제에 실패했습니다.');
      }
      
      // 목록에서 삭제된 항목 제거
      setMusic(prevMusic => prevMusic.filter(item => item._id !== id));
      setShowDeleteModal(false);
      setDeleteItemId(null);
    } catch (error) {
      console.error('음악 삭제 오류:', error);
      setError('음악 삭제 중 오류가 발생했습니다.');
    }
  };

  // 포지션 업데이트
  const updatePosition = async (id, newPosition) => {
    try {
      const item = music.find(m => m._id === id);
      if (!item) return;
      
      // JWT 토큰 가져오기 - 임시 제거
      // const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      
      const response = await fetch(`/api/music/${id}`, {
        method: 'PUT',
        headers: {
          // 'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...item,
          position: newPosition,
          previousPosition: item.position
        })
      });
      
      if (!response.ok) {
        throw new Error('포지션 업데이트에 실패했습니다.');
      }
      
      // 목록 새로 고침
      fetchMusic();
    } catch (error) {
      console.error('포지션 업데이트 오류:', error);
      setError('포지션 업데이트 중 오류가 발생했습니다.');
    }
  };

  // 포지션 변경 (위/아래)
  const movePosition = (id, direction) => {
    const index = music.findIndex(item => item._id === id);
    if (index === -1) return;
    
    const item = music[index];
    let newPosition;
    
    if (direction === 'up' && index > 0) {
      newPosition = music[index - 1].position;
      updatePosition(id, newPosition);
    } else if (direction === 'down' && index < music.length - 1) {
      newPosition = music[index + 1].position;
      updatePosition(id, newPosition);
    }
  };

  // 날짜 형식화
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // position이 없는 음악 데이터 수정
  const fixPositions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // JWT 토큰 가져오기 - 임시 제거
      // const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      
      const response = await fetch('/api/music/fix-positions', {
        method: 'POST',
        headers: {
          // 'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'position 필드 수정에 실패했습니다.');
      }
      
      // 실행 결과 로그
      console.log('순위 업데이트 결과:', data);
      
      // 성공시 데이터 다시 불러오기 (3초 지연 후)
      setTimeout(() => {
        fetchMusic();
      }, 3000);
      
      alert(`${data.updates.length}개의 음악 레코드가 일일 조회수 기준으로 정렬되었습니다. 3초 후 최신 데이터로 갱신됩니다.`);
    } catch (error) {
      console.error('Position 수정 오류:', error);
      setError('음악 순위 데이터 업데이트 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  // 강제 순위 정렬
  const forceSort = async () => {
    if (music.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 조회수 기준으로 정렬
      const sortedMusic = [...music].sort((a, b) => {
        // 일일 조회수 비교 (높은 순)
        const dailyViewsA = a.dailyViews || 0;
        const dailyViewsB = b.dailyViews || 0;
        return dailyViewsB - dailyViewsA;
      });
      
      // 순위 부여
      const updatedMusic = sortedMusic.map((item, index) => {
        const position = index + 1;
        return {
          ...item,
          position: position,
          previousPosition: item.position || position
        };
      });
      
      // 상태 업데이트
      setMusic(updatedMusic);
      
      console.log('클라이언트 측 순위 정렬 완료:', updatedMusic.slice(0, 3));
      
      // JWT 토큰 가져오기 - 임시 제거
      // const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
      
      // 서버에 변경사항 저장
      const savePromises = updatedMusic.map(item => 
        fetch(`/api/music/${item._id}`, {
          method: 'PUT',
          headers: {
            // 'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            position: item.position,
            previousPosition: item.previousPosition
          })
        })
      );
      
      // 모든 업데이트 요청이 완료될 때까지 대기
      const results = await Promise.allSettled(savePromises);
      
      // 결과 분석
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (failed > 0) {
        console.warn(`${failed}개 항목 저장 실패`);
        setError(`${succeeded}개 항목 저장 성공, ${failed}개 항목 저장 실패`);
      }
      
      alert(`${succeeded}개 항목 순위 정렬 완료 및 저장됨${failed > 0 ? `, ${failed}개 항목 저장 실패` : ''}`);
      
      // 최신 데이터로 목록 새로고침
      setTimeout(() => {
        fetchMusic();
      }, 1000);
    } catch (error) {
      console.error('순위 정렬 오류:', error);
      setError('순위 정렬 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 조회수 업데이트
  const updateViews = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // JWT 토큰 가져오기
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || sessionStorage.getItem('adminToken');
      
      const response = await fetch('/api/music/update-views', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '조회수 업데이트에 실패했습니다.');
      }
      
      // 실행 결과 로그
      console.log('조회수 및 순위 업데이트 결과:', data);
      
      // 업데이트된 음악 ID 저장 (조회수와 순위 변경 모두 포함)
      const updatedIds = [
        ...data.updates.map(update => update.id),
        ...data.positionUpdates?.map(update => update.id) || []
      ];
      setUpdatedMusicIds([...new Set(updatedIds)]); // 중복 제거
      
      // 데이터 다시 불러오기
      setTimeout(() => {
        fetchMusic();
      }, 1000);
      
      // 5초 후에 강조 표시 제거
      setTimeout(() => {
        setUpdatedMusicIds([]);
      }, 5000);
      
      alert(data.message || `${data.updates.length}개 음악의 조회수와 순위가 업데이트되었습니다.`);
    } catch (error) {
      console.error('조회수 업데이트 오류:', error);
      setError('조회수 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 유튜브 인기 급상승 음악 가져오기
  const fetchTrendingVideos = async () => {
    setIsLoadingTrending(true);
    setTrendingError(null);
    
    try {
      console.log('=== 인기 급상승 음악 API 호출 시작 ===');
      
      const response = await fetch('/api/youtube/trending-music', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('API 응답 상태:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 오류 응답:', errorText);
        throw new Error(`서버 오류 (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API 응답 데이터:', data);
      
      if (data.success) {
        setTrendingVideos(data.data);
        console.log(`✅ 인기 급상승 음악 ${data.count}개 로드 완료`);
      } else {
        throw new Error(data.message || '데이터를 가져오는데 실패했습니다');
      }
    } catch (error) {
      console.error('=== 인기 급상승 음악 가져오기 오류 ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      setTrendingError(`오류 발생: ${error.message}`);
    } finally {
      setIsLoadingTrending(false);
    }
  };
  
  // 선택된 영상 토글
  const toggleVideoSelection = (videoId) => {
    setSelectedVideos(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      } else {
        return [...prev, videoId];
      }
    });
  };
  
  // 이번주 인기 영상 가져오기
  const fetchWeeklyVideos = async () => {
    setIsLoadingWeekly(true);
    setWeeklyError(null);
    
    try {
      console.log('=== 이번주 인기 영상 API 호출 시작 ===');
      
      const response = await fetch('/api/youtube/weekly-videos', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistUrl }),
      });
      
      console.log('API 응답 상태:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API 오류 응답:', errorText);
        throw new Error(`서버 오류 (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API 응답 데이터:', data);
      
      if (data.success) {
        setWeeklyVideos(data.data);
        console.log(`✅ 이번주 인기 영상 ${data.count}개 로드 완료`);
      } else {
        throw new Error(data.message || '데이터를 가져오는데 실패했습니다');
      }
    } catch (error) {
      console.error('=== 이번주 인기 영상 가져오기 오류 ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      setWeeklyError(`오류 발생: ${error.message}`);
    } finally {
      setIsLoadingWeekly(false);
    }
  };
  
  // 선택된 이번주 영상 토글
  const toggleWeeklyVideoSelection = (videoId) => {
    setSelectedWeeklyVideos(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      } else {
        return [...prev, videoId];
      }
    });
  };
  
  // 선택된 이번주 영상 임포트
  const importSelectedWeeklyVideos = async () => {
    if (selectedWeeklyVideos.length === 0) return;
    
    setIsImporting(true);
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // 선택된 각 비디오에 대해 처리
      for (const videoId of selectedWeeklyVideos) {
        const video = weeklyVideos.find(v => v.videoId === videoId);
        if (!video) continue;
        
        // 임포트할 데이터 준비
        const musicData = {
          title: video.title,
          artist: video.channelTitle,
          releaseDate: video.publishedAt,
          youtubeUrl: video.youtubeUrl,
          coverImage: video.thumbnailUrl,
          totalViews: video.viewCount,
          dailyViews: Math.round(video.viewCount * 0.01), // 일일 조회수 추정
          likes: video.likeCount,
          genre: ['kpop'],
          position: 999, // 기본 위치 (나중에 업데이트될 예정)
          previousPosition: 999
        };
        
        // 데이터베이스에 추가
        const response = await fetch('/api/music', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(musicData),
        });
        
        if (response.ok) {
          successCount++;
        } else {
          failedCount++;
          console.error(`${video.title} 임포트 실패:`, await response.text());
        }
      }
      
      // 결과 저장
      setImportResults({
        success: successCount,
        failed: failedCount
      });
      
      // 성공했으면 목록 새로고침
      if (successCount > 0) {
        await fetchMusic();
      }
      
      // 모든 선택 해제
      setSelectedWeeklyVideos([]);
    } catch (error) {
      console.error('이번주 영상 임포트 오류:', error);
      setWeeklyError(error.message);
    } finally {
      setIsImporting(false);
    }
  };

  // 선택된 영상 임포트
  const importSelectedVideos = async () => {
    if (selectedVideos.length === 0) return;
    
    setIsImporting(true);
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // 선택된 각 비디오에 대해 처리
      for (const videoId of selectedVideos) {
        const video = trendingVideos.find(v => v.videoId === videoId);
        if (!video) continue;
        
        // 임포트할 데이터 준비
        const musicData = {
          title: video.title,
          artist: video.channelTitle,
          releaseDate: video.publishedAt,
          youtubeUrl: video.youtubeUrl,
          coverImage: video.thumbnailUrl,
          totalViews: video.viewCount,
          dailyViews: Math.round(video.viewCount * 0.01), // 일일 조회수 추정
          likes: video.likeCount,
          genre: ['kpop'],
          position: 999, // 기본 위치 (나중에 업데이트될 예정)
          previousPosition: 999
        };
        
        // JWT 토큰 가져오기 - 임시 제거
        // const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        
        // 데이터베이스에 추가
        const response = await fetch('/api/music', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(musicData),
        });
        
        if (response.ok) {
          successCount++;
        } else {
          failedCount++;
          console.error(`${video.title} 임포트 실패:`, await response.text());
        }
      }
      
      // 결과 저장
      setImportResults({
        success: successCount,
        failed: failedCount
      });
      
      // 성공했으면 목록 새로고침
      if (successCount > 0) {
        await fetchMusic();
      }
      
      // 모든 선택 해제
      setSelectedVideos([]);
    } catch (error) {
      console.error('비디오 임포트 오류:', error);
      setTrendingError(error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>음악 차트 관리 | 관리자</title>
      </Head>
      
      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">음악 차트 관리</h1>
            <p className="text-gray-500">K-POP 차트에 표시될 음악을 관리합니다</p>
            {error && (
              <p className="text-red-500 mt-2">{error}</p>
            )}
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            <Link 
              href="/admin/music/new"
              className="inline-flex items-center px-4 py-2 bg-[#ff3e8e] text-white rounded-lg hover:bg-[#e02e7c] transition-colors"
            >
              <Plus size={18} className="mr-2" />
              새 음악 등록
            </Link>
            <button
              onClick={fixPositions}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Eye size={18} className="mr-2" />
              순위 데이터 수정
            </button>
            <button
              onClick={forceSort}
              className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <ArrowUp size={18} className="mr-2" />
              강제 순위 정렬
            </button>
            <button
              onClick={updateViews}
              className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <MusicIcon size={18} className="mr-2" />
              조회수 및 순위 업데이트
            </button>
            <button
              onClick={() => {
                setShowTrendingModal(true);
                fetchTrendingVideos();
              }}
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Youtube size={18} className="mr-2" />
              유튜브 인기 급상승
            </button>
            <button
              onClick={() => {
                setShowWeeklyModal(true);
                fetchWeeklyVideos();
              }}
              className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Youtube size={18} className="mr-2" />
              이번주 유튜브 인기 영상
            </button>
          </div>
        </div>
        
        {/* 검색 */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <div className="relative flex-grow md:w-64">
              <input
                type="text"
                placeholder="노래 제목 또는 아티스트 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </span>
            </div>
            <button
              type="submit"
              className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              검색
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                fetchMusic();
              }}
              className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              초기화
            </button>
          </form>
        </div>
        
        {/* 음악 목록 */}
        <div className="bg-white rounded-lg shadow-sm mb-6 w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    순위
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    음악 정보
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell w-32">
                    일일 조회수
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell w-32">
                    총 조회수
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell w-32">
                    발매일
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : music.length > 0 ? (
                  music.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="text-lg font-semibold text-gray-800">
                          {typeof item.position === 'number' ? item.position : '?'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {typeof item.previousPosition === 'number' && typeof item.position === 'number' && item.previousPosition !== item.position ? (
                            item.previousPosition > item.position ? (
                              <span className="text-green-500 flex items-center justify-center">
                                <ArrowUp size={12} className="mr-1" />
                                {item.previousPosition - item.position}
                              </span>
                            ) : (
                              <span className="text-red-500 flex items-center justify-center">
                                <ArrowDown size={12} className="mr-1" />
                                {item.position - item.previousPosition}
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                            {item.coverImage ? (
                              <img 
                                src={item.coverImage} 
                                alt={item.title}
                                className="h-12 w-12 object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/images/placeholder.jpg';
                                }}
                              />
                            ) : (
                              <div className="h-12 w-12 flex items-center justify-center bg-gray-200 text-gray-400">
                                <MusicIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="ml-4 max-w-[280px]">
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">
                              {item.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.artist}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        <div className="relative">
                          <span className={`transition-all duration-500 ${updatedMusicIds.includes(item._id) ? 'text-purple-600 font-bold animate-pulse' : 'hover:text-purple-600 hover:font-medium'}`}>
                            {item.dailyViews?.toLocaleString() || '0'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        <div className="relative">
                          <span className={`transition-all duration-500 ${updatedMusicIds.includes(item._id) ? 'text-purple-600 font-bold animate-pulse' : 'hover:text-purple-600 hover:font-medium'}`}>
                            {(item.totalViews?.toLocaleString() || item.views?.toLocaleString() || '0')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {formatDate(item.releaseDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-center space-x-2">
                          {/* 순위 변경 버튼 */}
                          <button 
                            onClick={() => movePosition(item._id, 'up')}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            disabled={item.position === 1}
                          >
                            <ArrowUp size={18} className={item.position === 1 ? 'text-gray-300' : ''} />
                          </button>
                          <button 
                            onClick={() => movePosition(item._id, 'down')}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            disabled={item.position === music.length}
                          >
                            <ArrowDown size={18} className={item.position === music.length ? 'text-gray-300' : ''} />
                          </button>
                          
                          {/* 동영상 보기 버튼 */}
                          <a 
                            href={item.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-700 p-1"
                          >
                            <Eye size={18} />
                          </a>
                          
                          {/* 수정 버튼 */}
                          <Link 
                            href={`/admin/music/edit/${item._id}`}
                            className="text-blue-500 hover:text-blue-700 p-1"
                          >
                            <Edit size={18} />
                          </Link>
                          
                          {/* 삭제 버튼 */}
                          <button
                            onClick={() => {
                              setDeleteItemId(item._id);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center">
                      등록된 음악이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* 페이지네이션 */}
        <div className="mt-4 flex justify-center items-center">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md mr-2 ${
              currentPage === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // 현재 페이지를 중심으로 표시 (최대 5개)
              const pageNum = currentPage <= 3 
                ? i + 1 
                : currentPage + i - 2 > totalPages 
                  ? totalPages - 4 + i 
                  : currentPage - 2 + i;
                  
              // 유효한 페이지 번호만 표시
              if (pageNum > 0 && pageNum <= totalPages) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-500 text-white font-bold'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              return null;
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md ml-2 ${
              currentPage === totalPages
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <ChevronRight size={18} />
          </button>
          
          <span className="ml-4 text-sm text-gray-500">
            {totalPages > 0 ? `${currentPage} / ${totalPages} 페이지` : '데이터 없음'}
          </span>
        </div>
      </div>
      
      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDeleteModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle size={24} className="text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">음악 삭제</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        이 음악을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => handleDelete(deleteItemId)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  삭제
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 유튜브 인기 급상승 모달 */}
      {showTrendingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowTrendingModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Youtube size={20} className="mr-2 text-red-500" />
                    유튜브 인기 급상승 음악
                  </h3>
                  <button 
                    onClick={() => setShowTrendingModal(false)}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                {trendingError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                    {trendingError}
                  </div>
                )}
                
                {isLoadingTrending ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={32} className="animate-spin text-red-500" />
                    <span className="ml-2 text-gray-600">인기 급상승 음악을 가져오는 중...</span>
                  </div>
                ) : trendingVideos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    인기 급상승 음악을 찾을 수 없습니다
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-500">
                          총 {trendingVideos.length}개의 인기 급상승 음악을 찾았습니다
                        </span>
                      </div>
                      <div>
                        <button
                          onClick={importSelectedVideos}
                          disabled={selectedVideos.length === 0 || isImporting}
                          className={`inline-flex items-center px-4 py-2 rounded-lg ${
                            selectedVideos.length === 0 || isImporting
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          } transition-colors`}
                        >
                          {isImporting ? (
                            <>
                              <Loader2 size={18} className="mr-2 animate-spin" />
                              임포트 중...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={18} className="mr-2" />
                              선택한 {selectedVideos.length}개 임포트
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {importResults.success > 0 && (
                      <div className="mb-4 bg-green-50 text-green-600 p-3 rounded-lg">
                        {importResults.success}개 음악이 성공적으로 임포트되었습니다.
                        {importResults.failed > 0 && ` (${importResults.failed}개 실패)`}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto p-2">
                      {trendingVideos.map((video) => (
                        <div 
                          key={video.videoId}
                          className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                            selectedVideos.includes(video.videoId)
                              ? 'border-green-400 bg-green-50 transform scale-[1.02] shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow'
                          }`}
                          onClick={() => toggleVideoSelection(video.videoId)}
                        >
                          <div className="relative">
                            <img 
                              src={video.thumbnailUrl} 
                              alt={video.title}
                              className="w-full aspect-video object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/placeholder.jpg';
                              }}
                            />
                            <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-2 py-1 m-2 rounded">
                              {(video.viewCount).toLocaleString()} 조회
                            </div>
                            
                            {selectedVideos.includes(video.videoId) && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                                <CheckCircle2 size={18} />
                              </div>
                            )}
                          </div>
                          
                          <div className="p-3">
                            <h4 className="font-medium text-gray-800 line-clamp-2 mb-1">{video.title}</h4>
                            <p className="text-sm text-gray-500">{video.channelTitle}</p>
                            <div className="mt-2 flex justify-between items-center">
                              <span className="text-xs text-gray-400">
                                {new Date(video.publishedAt).toLocaleDateString()}
                              </span>
                              <a
                                href={video.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Youtube size={16} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowTrendingModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 이번주 유튜브 인기 영상 모달 */}
      {showWeeklyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowWeeklyModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">이번주 유튜브 인기 영상</h3>
                  <button
                    onClick={() => setShowWeeklyModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                {/* 플레이리스트 URL 입력 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    플레이리스트 URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playlistUrl}
                      onChange={(e) => setPlaylistUrl(e.target.value)}
                      placeholder="YouTube 플레이리스트 URL을 입력하세요"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <button
                      onClick={fetchWeeklyVideos}
                      disabled={isLoadingWeekly}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                      {isLoadingWeekly ? '로딩...' : '가져오기'}
                    </button>
                  </div>
                </div>

                {weeklyError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {weeklyError}
                  </div>
                )}

                {isLoadingWeekly ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    <span className="ml-2">플레이리스트 영상을 가져오는 중...</span>
                  </div>
                ) : weeklyVideos.length > 0 ? (
                  <div>
                    <div className="mb-4 flex justify-between items-center">
                      <p className="text-sm text-gray-600">
                        총 {weeklyVideos.length}개의 영상이 있습니다. 임포트할 영상을 선택하세요.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedWeeklyVideos(weeklyVideos.map(v => v.videoId))}
                          className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          전체 선택
                        </button>
                        <button
                          onClick={() => setSelectedWeeklyVideos([])}
                          className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          선택 해제
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
                      {weeklyVideos.map((video) => (
                        <div key={video.videoId} className="flex items-center p-3 border-b border-gray-100 hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={selectedWeeklyVideos.includes(video.videoId)}
                            onChange={() => toggleWeeklyVideoSelection(video.videoId)}
                            className="mr-3"
                          />
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-20 h-14 object-cover rounded mr-3"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {video.title}
                            </h4>
                            <p className="text-xs text-gray-500 truncate">
                              {video.channelTitle}
                            </p>
                            <div className="flex gap-4 text-xs text-gray-400 mt-1">
                              <span>조회수: {video.viewCount?.toLocaleString()}</span>
                              <span>좋아요: {video.likeCount?.toLocaleString()}</span>
                            </div>
                          </div>
                          <a
                            href={video.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-500 hover:text-blue-700"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    플레이리스트 URL을 입력하고 '가져오기' 버튼을 클릭하세요.
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedWeeklyVideos.length > 0 && (
                  <button
                    onClick={importSelectedWeeklyVideos}
                    disabled={isImporting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-500 text-base font-medium text-white hover:bg-orange-600 disabled:opacity-50 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {isImporting ? '임포트 중...' : `선택된 ${selectedWeeklyVideos.length}개 임포트`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowWeeklyModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 