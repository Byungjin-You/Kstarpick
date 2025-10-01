import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';
import { ArrowLeft, Music, Save } from 'lucide-react';

export default function EditMusicPage() {
  const router = useRouter();
  const { id } = router.query;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    album: '',
    position: 1,
    previousPosition: 1,
    youtubeUrl: '',
    dailyViews: '0',
    totalViews: '0',
    releaseDate: '',
    featured: false,
    coverImage: '',
    description: '',
    genre: ['kpop']
  });
  const [previewThumbnail, setPreviewThumbnail] = useState('');

  // 음악 정보 가져오기
  useEffect(() => {
    if (id) {
      fetchMusicDetails();
    }
  }, [id]);

  const fetchMusicDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/music/${id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '음악 정보를 불러오는데 실패했습니다.');
      }
      
      // 데이터 설정 - music 객체에서 데이터 추출
      const musicData = data.music;
      
      console.log('음악 상세 데이터:', {
        id: musicData._id,
        title: musicData.title,
        dailyViews: musicData.dailyViews,
        dailyview: musicData.dailyview,
        dailyView: musicData.dailyView,
        views: musicData.views
      });
      
      // 일일 조회수 값 찾기
      let dailyViewsValue = musicData.dailyViews;
      if (dailyViewsValue === undefined) {
        if (musicData.dailyview !== undefined) {
          dailyViewsValue = musicData.dailyview;
        } else if (musicData.dailyView !== undefined) {
          dailyViewsValue = musicData.dailyView;
        } else {
          // 기본값: 총 조회수의 2%
          dailyViewsValue = Math.round((musicData.views || 0) * 0.02);
        }
      }
      
      setFormData({
        title: musicData.title || '',
        artist: musicData.artist || '',
        album: musicData.album || '',
        position: musicData.position || 1,
        previousPosition: musicData.previousPosition || 1,
        youtubeUrl: musicData.musicVideo || '', // musicVideo 필드를 youtubeUrl에 매핑
        dailyViews: dailyViewsValue?.toString() || '0',
        totalViews: musicData.views?.toString() || '0', // views 필드를 totalViews에 매핑
        releaseDate: musicData.releaseDate ? new Date(musicData.releaseDate).toISOString().split('T')[0] : '',
        featured: musicData.featured || false,
        coverImage: musicData.coverImage || '',
        description: musicData.description || '',
        genre: musicData.genre || ['kpop']
      });
      
      // 썸네일 미리보기 설정
      if (musicData.musicVideo) {
        updateThumbnailPreview(musicData.musicVideo);
      }
    } catch (error) {
      console.error('음악 정보 로딩 오류:', error);
      setError(error.message || '음악 정보를 불러오는데 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 폼 입력값 변경 처리
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: newValue
    }));

    // YouTube URL이 변경되면 썸네일 미리보기 업데이트
    if (name === 'youtubeUrl' && value) {
      updateThumbnailPreview(value);
    }
  };

  // 유튜브 URL에서 썸네일 URL 생성
  const updateThumbnailPreview = (url) => {
    try {
      const videoId = extractYoutubeVideoId(url);
      if (videoId) {
        setPreviewThumbnail(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      } else {
        setPreviewThumbnail('');
      }
    } catch (error) {
      console.error('썸네일 미리보기 생성 오류:', error);
      setPreviewThumbnail('');
    }
  };

  // 유튜브 URL에서 비디오 ID 추출
  const extractYoutubeVideoId = (url) => {
    if (!url) return null;
    
    // youtube.com/watch?v=VIDEO_ID 형식
    let match = url.match(/youtube\.com\/watch\?v=([^&]+)/);
    if (match) return match[1];
    
    // youtu.be/VIDEO_ID 형식
    match = url.match(/youtu\.be\/([^?]+)/);
    if (match) return match[1];
    
    // youtube.com/embed/VIDEO_ID 형식
    match = url.match(/youtube\.com\/embed\/([^?]+)/);
    if (match) return match[1];
    
    return null;
  };

  // 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 필드 이름 매핑 및 데이터 형식 변환
      const submitData = {
        ...formData,
        musicVideo: formData.youtubeUrl, // youtubeUrl을 모델의 musicVideo 필드로 매핑
        views: parseInt(formData.totalViews) || 0, // totalViews를 숫자로 변환하여 views 필드로 매핑
        dailyViews: parseInt(formData.dailyViews) || 0 // dailyViews를 숫자로 변환
      };
      
      const response = await fetch(`/api/music/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '음악 정보 수정에 실패했습니다.');
      }
      
      // 성공 시 목록 페이지로 이동
      router.push('/admin/music');
    } catch (error) {
      console.error('음악 수정 오류:', error);
      setError(error.message || '음악 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>음악 정보 수정 | 관리자</title>
      </Head>
      
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft size={18} className="mr-1" />
            <span>뒤로 가기</span>
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">음악 정보 수정</h1>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-[#ff3e8e] border-t-transparent rounded-full"></div>
                <span className="ml-3 text-gray-600">정보를 불러오는 중...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    {/* 제목 */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        노래 제목 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                        placeholder="노래 제목을 입력하세요"
                      />
                    </div>
                    
                    {/* 아티스트 */}
                    <div>
                      <label htmlFor="artist" className="block text-sm font-medium text-gray-700 mb-1">
                        아티스트 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="artist"
                        name="artist"
                        value={formData.artist}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                        placeholder="아티스트 이름을 입력하세요"
                      />
                    </div>
                    
                    {/* 유튜브 URL */}
                    <div>
                      <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-700 mb-1">
                        유튜브 URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        id="youtubeUrl"
                        name="youtubeUrl"
                        value={formData.youtubeUrl}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        유튜브 영상 URL을 입력하면 자동으로 썸네일이 생성됩니다.
                      </p>
                    </div>
                    
                    {/* 순위 */}
                    <div>
                      <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                        현재 순위 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="position"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                        min="1"
                        required
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      />
                    </div>
                    
                    {/* 이전 순위 */}
                    <div>
                      <label htmlFor="previousPosition" className="block text-sm font-medium text-gray-700 mb-1">
                        이전 순위
                      </label>
                      <input
                        type="number"
                        id="previousPosition"
                        name="previousPosition"
                        value={formData.previousPosition}
                        onChange={handleChange}
                        min="1"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 발매일 */}
                    <div>
                      <label htmlFor="releaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                        발매일
                      </label>
                      <input
                        type="date"
                        id="releaseDate"
                        name="releaseDate"
                        value={formData.releaseDate}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      />
                    </div>
                    
                    {/* 일일 조회수 */}
                    <div>
                      <label htmlFor="dailyViews" className="block text-sm font-medium text-gray-700 mb-1">
                        일일 조회수
                      </label>
                      <input
                        type="number"
                        id="dailyViews"
                        name="dailyViews"
                        value={formData.dailyViews}
                        onChange={handleChange}
                        min="0"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      />
                    </div>
                    
                    {/* 총 조회수 */}
                    <div>
                      <label htmlFor="totalViews" className="block text-sm font-medium text-gray-700 mb-1">
                        총 조회수
                      </label>
                      <input
                        type="number"
                        id="totalViews"
                        name="totalViews"
                        value={formData.totalViews}
                        onChange={handleChange}
                        min="0"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      />
                    </div>
                    
                    {/* 주요 아티스트 여부 */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="featured"
                        name="featured"
                        checked={formData.featured}
                        onChange={handleChange}
                        className="h-4 w-4 text-[#ff3e8e] focus:ring-[#ff3e8e] border-gray-300 rounded"
                      />
                      <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                        주요 아티스트에 표시
                      </label>
                    </div>
                    
                    {/* 썸네일 미리보기 */}
                    <div>
                      <p className="block text-sm font-medium text-gray-700 mb-2">
                        썸네일 미리보기
                      </p>
                      <div className="mt-1 h-36 w-64 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {previewThumbnail ? (
                          <img 
                            src={previewThumbnail} 
                            alt="썸네일 미리보기" 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/images/placeholder.jpg';
                            }}
                          />
                        ) : (
                          <div className="text-gray-400 flex flex-col items-center">
                            <Music size={40} />
                            <p className="text-sm mt-2">썸네일 없음</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#ff3e8e] hover:bg-[#e02e7c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff3e8e] flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        저장하기
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 