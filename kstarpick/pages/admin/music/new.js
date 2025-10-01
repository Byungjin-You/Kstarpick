import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { ArrowLeft, Music, Save, Loader } from 'lucide-react';

export default function NewMusicPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingYoutubeData, setIsFetchingYoutubeData] = useState(false);
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
    description: '',
    coverImage: '',
    genre: ['kpop']
  });
  const [previewThumbnail, setPreviewThumbnail] = useState('');

  // 장르 옵션
  const genreOptions = [
    { value: 'kpop', label: 'K-POP' },
    { value: 'ballad', label: '발라드' },
    { value: 'dance', label: '댄스' },
    { value: 'hiphop', label: '힙합' },
    { value: 'rnb', label: 'R&B' },
    { value: 'rock', label: '록' },
    { value: 'indie', label: '인디' },
    { value: 'trot', label: '트로트' },
    { value: 'ost', label: 'OST' }
  ];

  // 폼 입력값 변경 처리
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'genre') {
      // 체크박스 배열 처리
      const genreArray = [...formData.genre];
      if (checked) {
        if (!genreArray.includes(value)) {
          genreArray.push(value);
        }
      } else {
        const index = genreArray.indexOf(value);
        if (index > -1) {
          genreArray.splice(index, 1);
        }
      }
      
      setFormData((prev) => ({
        ...prev,
        genre: genreArray
      }));
      return;
    }
    
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: newValue
    }));

    // YouTube URL이 변경되면 썸네일 미리보기 업데이트 및 정보 가져오기
    if (name === 'youtubeUrl' && value) {
      updateThumbnailPreview(value);
      fetchYoutubeData(value);
    }
  };

  // 유튜브 URL에서 썸네일 URL 생성
  const updateThumbnailPreview = (url) => {
    try {
      const videoId = extractYoutubeVideoId(url);
      if (videoId) {
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        setPreviewThumbnail(thumbnailUrl);
        
        // 커버 이미지가 없으면 썸네일을 커버 이미지로 설정
        if (!formData.coverImage) {
          setFormData(prev => ({
            ...prev,
            coverImage: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
          }));
        }
      } else {
        setPreviewThumbnail('');
      }
    } catch (error) {
      console.error('썸네일 미리보기 생성 오류:', error);
      setPreviewThumbnail('');
    }
  };

  // 유튜브 정보 가져오기
  const fetchYoutubeData = async (url) => {
    if (!url) return;
    
    try {
      setIsFetchingYoutubeData(true);
      setError(null);
      
      const videoId = extractYoutubeVideoId(url);
      if (!videoId) {
        throw new Error('유효한 YouTube URL이 아닙니다.');
      }
      
      // API 호출하여 유튜브 정보 가져오기
      const response = await fetch(`/api/youtube/video-info?videoId=${videoId}`);
      
      if (!response.ok) {
        throw new Error('YouTube 정보를 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      if (data.success && data.videoInfo) {
        // 폼 데이터 업데이트
        setFormData(prev => {
          const newData = { ...prev };
          
          // 제목이 비어있으면 유튜브 제목으로 설정
          if (!prev.title && data.videoInfo.title) {
            newData.title = data.videoInfo.title;
          }
          
          // 아티스트가 비어있으면 유튜브 채널명으로 설정
          if (!prev.artist && data.videoInfo.channelTitle) {
            newData.artist = data.videoInfo.channelTitle;
          }
          
          // 설명이 비어있으면 유튜브 설명으로 설정
          if (!prev.description && data.videoInfo.description) {
            newData.description = data.videoInfo.description.substring(0, 500); // 설명이 너무 길면 자르기
          }
          
          // 조회수 설정
          if (data.videoInfo.viewCount) {
            newData.totalViews = data.videoInfo.viewCount;
            // 일일 조회수는 총 조회수의 약 0.5~2% 정도로 설정 (예시)
            const viewCount = Number(data.videoInfo.viewCount);
            const dailyEstimate = Math.round(viewCount * (Math.random() * 0.015 + 0.005));
            newData.dailyViews = dailyEstimate.toString();
            
            // views 필드도 동일하게 설정 (API 모델용)
            newData.views = viewCount;
            
            console.log('조회수 데이터 설정:', {
              totalViews: newData.totalViews,
              dailyViews: newData.dailyViews,
              views: newData.views
            });
          }
          
          // 발매일이 비어있으면 영상 업로드 날짜로 설정
          if (!prev.releaseDate && data.videoInfo.publishedAt) {
            const publishDate = new Date(data.videoInfo.publishedAt);
            newData.releaseDate = publishDate.toISOString().split('T')[0];
          }
          
          // musicVideo 필드 설정 (API 모델용)
          if (!prev.musicVideo && prev.youtubeUrl) {
            newData.musicVideo = prev.youtubeUrl;
          }
          
          return newData;
        });
      }
    } catch (error) {
      console.error('유튜브 데이터 가져오기 오류:', error);
      setError(error.message || '유튜브 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsFetchingYoutubeData(false);
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
      // 필수 필드 확인
      if (formData.genre.length === 0) {
        throw new Error('적어도 하나의 장르를 선택해주세요.');
      }
      
      // 필드 이름 매핑 및 데이터 형식 변환
      const submitData = {
        ...formData,
        musicVideo: formData.youtubeUrl, // youtubeUrl을 모델의 musicVideo 필드로 매핑
        views: parseInt(formData.totalViews) || 0, // totalViews를 숫자로 변환하여 views 필드로 매핑
        dailyViews: parseInt(formData.dailyViews) || 0 // dailyViews를 숫자로 변환
      };
      
      console.log('제출 데이터 확인:', {
        title: submitData.title,
        artist: submitData.artist,
        dailyViews: submitData.dailyViews,
        views: submitData.views
      });
      
      const response = await fetch('/api/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '음악 등록에 실패했습니다.');
      }
      
      // 성공 시 목록 페이지로 이동
      router.push('/admin/music');
    } catch (error) {
      console.error('음악 등록 오류:', error);
      setError(error.message || '음악 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>새 음악 등록 | 관리자</title>
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
            <h1 className="text-2xl font-bold text-gray-800 mb-6">새 음악 등록</h1>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* 유튜브 URL */}
                  <div>
                    <label htmlFor="youtubeUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      유튜브 URL <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
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
                      {isFetchingYoutubeData && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader size={18} className="animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      유튜브 영상 URL을 입력하면 자동으로 정보를 가져옵니다.
                    </p>
                  </div>
                  
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
                  
                  {/* 앨범 */}
                  <div>
                    <label htmlFor="album" className="block text-sm font-medium text-gray-700 mb-1">
                      앨범
                    </label>
                    <input
                      type="text"
                      id="album"
                      name="album"
                      value={formData.album}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="앨범명을 입력하세요"
                    />
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
                  
                  {/* 장르 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      장르 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {genreOptions.map((genre) => (
                        <div key={genre.value} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`genre-${genre.value}`}
                            name="genre"
                            value={genre.value}
                            checked={formData.genre.includes(genre.value)}
                            onChange={handleChange}
                            className="h-4 w-4 text-[#ff3e8e] focus:ring-[#ff3e8e]/50 border-gray-300 rounded"
                          />
                          <label htmlFor={`genre-${genre.value}`} className="ml-2 block text-sm text-gray-700">
                            {genre.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* 발매일 */}
                  <div>
                    <label htmlFor="releaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                      발매일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="releaseDate"
                      name="releaseDate"
                      value={formData.releaseDate}
                      onChange={handleChange}
                      required
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
                  
                  {/* 커버 이미지 URL */}
                  <div>
                    <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700 mb-1">
                      커버 이미지 URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      id="coverImage"
                      name="coverImage"
                      value={formData.coverImage}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  {/* 설명 */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      설명
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="음악에 대한 설명을 입력하세요"
                    ></textarea>
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
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 