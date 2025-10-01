import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Upload, RotateCw } from 'lucide-react';
import Image from 'next/image';

const DirectorsEditor = ({ initialDirectors = [], onChange }) => {
  const [directors, setDirectors] = useState(initialDirectors);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    profileImage: null,
    biography: '',
    nationality: '',
    birthDate: '',
  });
  const [errors, setErrors] = useState({});
  const [isEdit, setIsEdit] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  
  useEffect(() => {
    if (initialDirectors) {
      setDirectors(initialDirectors);
    }
  }, [initialDirectors]);

  // 모달 열기
  const openModal = (director = null) => {
    if (director) {
      // 수정 모드
      setFormData({
        id: director.id,
        name: director.name || '',
        profileImage: director.profileImage || null,
        biography: director.biography || '',
        nationality: director.nationality || '',
        birthDate: director.birthDate || '',
      });
      setPreviewImage(director.profileImage);
      setIsEdit(true);
    } else {
      // 추가 모드
      setFormData({
        id: '',
        name: '',
        profileImage: null,
        biography: '',
        nationality: '',
        birthDate: '',
      });
      setPreviewImage(null);
      setIsEdit(false);
    }
    
    setErrors({});
    setShowModal(true);
  };

  // 모달 닫기
  const closeModal = () => {
    setShowModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // 입력 처리
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 에러 제거
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // 파일 업로드 처리
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ 
        ...prev, 
        profileImage: '이미지 크기는 5MB 이하여야 합니다.' 
      }));
      return;
    }

    // 이미지 파일 타입 검증
    if (!file.type.match('image.*')) {
      setErrors(prev => ({ 
        ...prev, 
        profileImage: '이미지 파일만 업로드 가능합니다.' 
      }));
      return;
    }

    // 미리보기 URL 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);

    setFormData(prev => ({
      ...prev,
      profileImage: file
    }));

    // 에러 제거
    if (errors.profileImage) {
      setErrors(prev => ({ ...prev, profileImage: null }));
    }
  };

  // 검색 실행
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    
    try {
      // API 검색 기능 구현
      // 예시: const response = await fetch(`/api/search/directors?query=${searchQuery}`);
      // 실제 구현 시에는 적절한 API 엔드포인트로 대체해야 합니다.
      
      // 임시 mock 데이터
      const mockResults = [
        { id: '1', name: '봉준호', nationality: '대한민국' },
        { id: '2', name: '김기덕', nationality: '대한민국' },
        { id: '3', name: '박찬욱', nationality: '대한민국' },
      ].filter(director => 
        director.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // 실제 구현 시에는 아래 코드 주석 해제
      // const data = await response.json();
      // setSearchResults(data.results);
      
      // 임시 데이터 사용
      setTimeout(() => {
        setSearchResults(mockResults);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('감독 검색 오류:', error);
      setSearchResults([]);
      setLoading(false);
    }
  };

  // 감독 선택
  const selectDirector = (director) => {
    setFormData({
      id: director.id,
      name: director.name,
      profileImage: director.profileImage || null,
      biography: director.biography || '',
      nationality: director.nationality || '',
      birthDate: director.birthDate || '',
    });
    
    setPreviewImage(director.profileImage);
    setSearchResults([]);
    setSearchQuery('');
  };

  // 폼 제출
  const handleSubmit = () => {
    // 유효성 검증
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '감독 이름을 입력해주세요.';
    }
    
    // 추가 유효성 검증 가능
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // 감독 추가 또는 수정
    if (isEdit) {
      // 감독 정보 수정
      const updatedDirectors = directors.map(director => 
        director.id === formData.id ? { ...formData } : director
      );
      setDirectors(updatedDirectors);
      onChange(updatedDirectors);
    } else {
      // 새 감독 추가
      const newDirector = {
        ...formData,
        id: formData.id || `director-${Date.now()}` // 임시 ID 생성
      };
      
      const updatedDirectors = [...directors, newDirector];
      setDirectors(updatedDirectors);
      onChange(updatedDirectors);
    }
    
    closeModal();
  };

  // 감독 삭제
  const removeDirector = (directorId) => {
    const updatedDirectors = directors.filter(director => director.id !== directorId);
    setDirectors(updatedDirectors);
    onChange(updatedDirectors);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">감독 관리</h2>
        <button
          type="button"
          onClick={() => openModal()}
          className="px-3 py-1.5 text-sm bg-pink-50 text-pink-600 rounded-md hover:bg-pink-100 transition flex items-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          감독 추가
        </button>
      </div>

      {/* 감독 목록 */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">등록된 감독</p>
        {directors.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-500">등록된 감독이 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {directors.map(director => (
                <div key={director.id} className="p-4 flex items-center hover:bg-gray-50">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-gray-100 mr-4">
                    {director.profileImage ? (
                      <Image
                        src={director.profileImage}
                        alt={director.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{director.name}</p>
                    <p className="text-sm text-gray-500">
                      {director.nationality && <span className="mr-2">{director.nationality}</span>}
                      {director.birthDate && <span>{director.birthDate}</span>}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => openModal(director)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDirector(director.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 감독 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEdit ? '감독 정보 수정' : '감독 추가'}
              </h3>
              <button 
                type="button" 
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* 감독 검색 (추가 모드에서만 표시) */}
              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    감독 검색
                  </label>
                  <div className="flex items-center">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="감독 이름 검색..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={loading || !searchQuery.trim()}
                      className={`ml-2 px-3 py-2 rounded-md ${
                        loading || !searchQuery.trim()
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {loading ? (
                        <RotateCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  
                  {/* 검색 결과 */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                      <div className="max-h-40 overflow-y-auto divide-y divide-gray-200">
                        {searchResults.map(result => (
                          <div
                            key={result.id}
                            className="p-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => selectDirector(result)}
                          >
                            <p className="font-medium">{result.name}</p>
                            {result.nationality && (
                              <p className="text-xs text-gray-500">{result.nationality}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* 감독 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  감독 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="예: 봉준호"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              
              {/* 프로필 이미지 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로필 이미지
                </label>
                <div className="mt-1 flex items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 mr-4 flex-shrink-0">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="프로필 미리보기"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center">
                    <Upload className="w-4 h-4 mr-1" />
                    <span className="text-sm">이미지 업로드</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {errors.profileImage && (
                  <p className="mt-1 text-sm text-red-500">{errors.profileImage}</p>
                )}
              </div>
              
              {/* 국적 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  국적
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="예: 대한민국"
                />
              </div>
              
              {/* 생년월일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  생년월일
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              {/* 소개/약력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  약력
                </label>
                <textarea
                  name="biography"
                  value={formData.biography}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="감독의 약력을 입력하세요..."
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
              >
                {isEdit ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorsEditor; 