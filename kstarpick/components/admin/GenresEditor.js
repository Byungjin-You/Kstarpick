import React, { useState, useEffect } from 'react';
import { X, Plus, CheckCircle, Circle } from 'lucide-react';

// 표준 장르 목록 (예시)
const STANDARD_GENRES = [
  { id: "action", name: "액션" },
  { id: "adventure", name: "모험" },
  { id: "animation", name: "애니메이션" },
  { id: "comedy", name: "코미디" },
  { id: "crime", name: "범죄" },
  { id: "documentary", name: "다큐멘터리" },
  { id: "drama", name: "드라마" },
  { id: "family", name: "가족" },
  { id: "fantasy", name: "판타지" },
  { id: "history", name: "역사" },
  { id: "horror", name: "공포" },
  { id: "music", name: "음악" },
  { id: "mystery", name: "미스터리" },
  { id: "romance", name: "로맨스" },
  { id: "science-fiction", name: "SF" },
  { id: "thriller", name: "스릴러" },
  { id: "war", name: "전쟁" },
  { id: "western", name: "서부" }
];

const GenresEditor = ({ initialGenres = [], onChange }) => {
  const [selectedGenres, setSelectedGenres] = useState(initialGenres);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customGenre, setCustomGenre] = useState({ id: '', name: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialGenres) {
      setSelectedGenres(initialGenres);
    }
  }, [initialGenres]);

  // 검색어에 따라 필터링된 장르 목록
  const filteredGenres = STANDARD_GENRES.filter(genre => 
    genre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    genre.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 장르가 이미 선택되었는지 확인
  const isGenreSelected = (genreId) => {
    return selectedGenres.some(g => g.id === genreId);
  };

  // 장르 선택/해제 토글
  const toggleGenre = (genre) => {
    if (isGenreSelected(genre.id)) {
      // 이미 선택된 경우 제거
      const updatedGenres = selectedGenres.filter(g => g.id !== genre.id);
      setSelectedGenres(updatedGenres);
      onChange(updatedGenres);
    } else {
      // 선택되지 않은 경우 추가
      const updatedGenres = [...selectedGenres, genre];
      setSelectedGenres(updatedGenres);
      onChange(updatedGenres);
    }
  };

  // 커스텀 장르 추가 모달 열기
  const openCustomGenreModal = () => {
    setCustomGenre({ id: '', name: '' });
    setErrors({});
    setShowCustomModal(true);
  };

  // 커스텀 장르 입력 변경 처리
  const handleCustomGenreChange = (e) => {
    const { name, value } = e.target;
    setCustomGenre(prev => ({
      ...prev,
      [name]: value
    }));

    // 에러 제거
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // 커스텀 장르 ID 자동 생성
  const generateGenreId = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // 이름 입력 시 ID 자동 생성
  const handleNameBlur = () => {
    if (customGenre.name && !customGenre.id) {
      setCustomGenre(prev => ({
        ...prev,
        id: generateGenreId(prev.name)
      }));
    }
  };

  // 커스텀 장르 추가
  const addCustomGenre = () => {
    // 유효성 검증
    const newErrors = {};
    
    if (!customGenre.name.trim()) {
      newErrors.name = '장르 이름을 입력해주세요.';
    }
    
    if (!customGenre.id.trim()) {
      newErrors.id = '장르 ID를 입력해주세요.';
    } else if (STANDARD_GENRES.some(g => g.id === customGenre.id) || selectedGenres.some(g => g.id === customGenre.id)) {
      newErrors.id = '이미 사용 중인 ID입니다.';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // 새 장르 추가 및 선택
    const newGenre = {
      id: customGenre.id,
      name: customGenre.name,
      custom: true
    };
    
    const updatedGenres = [...selectedGenres, newGenre];
    setSelectedGenres(updatedGenres);
    onChange(updatedGenres);
    setShowCustomModal(false);
  };

  // 선택된 장르 제거
  const removeGenre = (genreId) => {
    const updatedGenres = selectedGenres.filter(g => g.id !== genreId);
    setSelectedGenres(updatedGenres);
    onChange(updatedGenres);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">장르 관리</h2>
        <button
          type="button"
          onClick={openCustomGenreModal}
          className="px-3 py-1.5 text-sm bg-pink-50 text-pink-600 rounded-md hover:bg-pink-100 transition flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          커스텀 장르 추가
        </button>
      </div>

      {/* 선택된 장르 표시 */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">선택된 장르</p>
        {selectedGenres.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-500">선택된 장르가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedGenres.map(genre => (
              <div
                key={genre.id}
                className={`px-3 py-1.5 rounded-full text-sm flex items-center ${
                  genre.custom 
                    ? 'bg-pink-50 text-pink-600 border border-pink-200'
                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                }`}
              >
                {genre.name}
                <button
                  type="button"
                  onClick={() => removeGenre(genre.id)}
                  className="ml-1.5 text-current hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 장르 검색 */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="장르 검색..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 장르 목록 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          {filteredGenres.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredGenres.map(genre => (
                <div
                  key={genre.id}
                  className={`p-3 flex items-center hover:bg-gray-50 cursor-pointer ${
                    isGenreSelected(genre.id) ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => toggleGenre(genre)}
                >
                  <div className="mr-3 text-blue-500">
                    {isGenreSelected(genre.id) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{genre.name}</p>
                    <p className="text-xs text-gray-500">{genre.id}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 커스텀 장르 추가 모달 */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                커스텀 장르 추가
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCustomModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* 장르 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  장르 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={customGenre.name}
                  onChange={handleCustomGenreChange}
                  onBlur={handleNameBlur}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="예: 로맨틱 코미디"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              
              {/* 장르 ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  장르 ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="id"
                  value={customGenre.id}
                  onChange={handleCustomGenreChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.id ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="예: romantic-comedy"
                />
                {errors.id && (
                  <p className="mt-1 text-sm text-red-500">{errors.id}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  영문, 숫자, 하이픈(-) 만 사용 가능합니다. 이름을 입력하면 자동으로 생성됩니다.
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={addCustomGenre}
                className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenresEditor; 