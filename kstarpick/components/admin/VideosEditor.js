import React, { useState } from 'react';
import { X, Plus, ArrowDown, ArrowUp, Youtube } from 'lucide-react';

const VideosEditor = ({ videos, onChange }) => {
  const [newVideo, setNewVideo] = useState({
    title: '',
    type: 'trailer',
    url: ''
  });
  const [errors, setErrors] = useState({});

  const videoTypes = [
    { value: 'trailer', label: '공식 트레일러' },
    { value: 'teaser', label: '티저' },
    { value: 'ad', label: '광고' },
    { value: 'making-of', label: '메이킹 필름' },
    { value: 'clip', label: '클립' },
    { value: 'interview', label: '인터뷰' },
    { value: 'other', label: '기타' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVideo(prev => ({
      ...prev,
      [name]: value
    }));

    // 에러 클리어
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateUrl = (url) => {
    // 기본 URL 유효성 검사
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]+/;
    return pattern.test(url);
  };

  const addVideo = () => {
    // 유효성 검사
    const newErrors = {};
    if (!newVideo.title.trim()) newErrors.title = '제목을 입력해주세요';
    if (!newVideo.url.trim()) {
      newErrors.url = 'URL을 입력해주세요';
    } else if (!validateUrl(newVideo.url)) {
      newErrors.url = '유효한 YouTube URL을 입력해주세요';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 새 비디오 추가
    const updatedVideos = [
      ...videos,
      {
        ...newVideo,
        order: videos.length,
        id: Date.now().toString() // 임시 ID 생성
      }
    ];
    
    onChange(updatedVideos);
    
    // 입력 초기화
    setNewVideo({
      title: '',
      type: 'trailer',
      url: ''
    });
    setErrors({});
  };

  const removeVideo = (index) => {
    const updatedVideos = [...videos];
    updatedVideos.splice(index, 1);
    
    // 순서 재조정
    updatedVideos.forEach((video, i) => {
      video.order = i;
    });
    
    onChange(updatedVideos);
  };

  const moveVideo = (index, direction) => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === videos.length - 1)
    ) return;

    const updatedVideos = [...videos];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // 항목 위치 변경
    [updatedVideos[index], updatedVideos[newIndex]] = [updatedVideos[newIndex], updatedVideos[index]];
    
    // 순서 업데이트
    updatedVideos.forEach((video, i) => {
      video.order = i;
    });
    
    onChange(updatedVideos);
  };

  // YouTube URL에서 비디오 ID 추출
  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    
    // 유튜브 URL 패턴 매칭
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-700">비디오: 트레일러 & 티저</h3>
      
      {/* 비디오 목록 */}
      <div className="mb-6">
        {videos.length === 0 ? (
          <div className="text-gray-500 mb-4 border border-dashed border-gray-300 p-4 rounded-md text-center">
            등록된 비디오가 없습니다. 아래 폼에서 유튜브 링크를 추가해주세요.
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video, index) => {
              const videoId = getYoutubeVideoId(video.url);
              return (
                <div 
                  key={index} 
                  className="flex flex-col md:flex-row md:items-center gap-3 border border-gray-200 p-3 rounded-md bg-white shadow-sm"
                >
                  {/* 썸네일 */}
                  <div className="flex-shrink-0 w-full md:w-48 h-24 bg-gray-100 rounded overflow-hidden md:mr-2">
                    {videoId ? (
                      <img 
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Youtube className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* 비디오 정보 */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{video.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded">
                            {videoTypes.find(t => t.value === video.type)?.label || video.type}
                          </span>
                          <a 
                            href={video.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs inline-flex items-center"
                          >
                            {video.url.substring(0, 30)}...
                          </a>
                        </div>
                      </div>
                      
                      {/* 제어 버튼들 */}
                      <div className="flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={() => moveVideo(index, 'up')}
                          disabled={index === 0}
                          className={`p-1 rounded-full ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => moveVideo(index, 'down')}
                          disabled={index === videos.length - 1}
                          className={`p-1 rounded-full ${index === videos.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="p-1 rounded-full text-red-500 hover:bg-red-50"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* 새 비디오 추가 폼 */}
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <h4 className="text-sm font-medium mb-3 text-gray-700">새 비디오 추가</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              name="title"
              value={newVideo.title}
              onChange={handleInputChange}
              placeholder="공식 트레일러, 티저 영상 2 등"
              className={`w-full px-3 py-2 border rounded-md ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
            <select
              name="type"
              value={newVideo.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {videoTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">유튜브 URL</label>
          <input
            type="text"
            name="url"
            value={newVideo.url}
            onChange={handleInputChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`w-full px-3 py-2 border rounded-md ${errors.url ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
          <p className="mt-1 text-xs text-gray-500">유튜브 동영상 URL을 입력해주세요 (예: https://www.youtube.com/watch?v=dQw4w9WgXcQ)</p>
        </div>
        
        <button
          type="button"
          onClick={addVideo}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
        >
          <Plus size={16} className="mr-2" />
          비디오 추가
        </button>
      </div>
    </div>
  );
};

export default VideosEditor; 