import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { ArrowLeft, Save, Loader2, Download, Star, User, AlertTriangle, CheckCircle, Instagram, Twitter, Youtube, Music, Hash, ExternalLink } from 'lucide-react';

export default function CreateCelebrity() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    koreanName: '',
    role: '',
    category: 'idol',
    agency: '',
    group: '',
    profileImage: '',
    followers: 0,
    isFeatured: false,
    isActive: true,
    bio: '',
    socialMedia: {}
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawledData, setCrawledData] = useState([]);
  const [selectedCrawlItem, setSelectedCrawlItem] = useState(null);
  
  // 카테고리 옵션
  const categoryOptions = [
    { value: 'idol', label: '아이돌' },
    { value: 'actor', label: '배우(남자)' },
    { value: 'actress', label: '배우(여자)' },
    { value: 'solo', label: '솔로 아티스트' },
    { value: 'band', label: '밴드' },
    { value: 'model', label: '모델' },
    { value: 'rookie', label: '신인' },
    { value: 'other', label: '기타' }
  ];
  
  // 입력 필드 변경 처리
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // 폼 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/celeb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '셀럽 추가 중 오류가 발생했습니다.');
      }
      
      setSuccess('셀럽이 성공적으로 추가되었습니다.');
      setTimeout(() => {
        router.push('/admin/celeb');
      }, 2000);
    } catch (error) {
      console.error('셀럽 추가 오류:', error);
      setError(error.message || '셀럽 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  
  // kpop-radar.com에서 아티스트 데이터 가져오기
  const fetchKpopRadarArtists = async () => {
    setCrawlLoading(true);
    setError('');
    setCrawledData([]);
    
    try {
      // API 엔드포인트 호출
      const response = await fetch('/api/scrape/kpop-radar');
      
      if (!response.ok) {
        throw new Error('크롤링 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        // API에서 받아온 데이터 설정
        setCrawledData(data.data);
        console.log('K-POP 레이더 데이터 로드됨:', data.data.length);
        
        // 대체 데이터를 사용한 경우 안내
        if (data.fallback) {
          console.log('실제 크롤링 데이터를 가져올 수 없어 대체 데이터를 사용합니다.');
        }
      } else {
        throw new Error('데이터를 가져오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('크롤링 오류:', error);
      setError(error.message || '크롤링 중 오류가 발생했습니다.');
    } finally {
      setCrawlLoading(false);
    }
  };
  
  // 크롤링 데이터에서 아이템 선택
  const selectCrawlItem = (item) => {
    setSelectedCrawlItem(item);
    
    // 선택한 아티스트 정보로 폼 데이터 업데이트
    setFormData(prev => ({
      ...prev,
      name: item.engName || '',
      koreanName: item.name || '',
      role: item.groupType === 'solo' ? 'Singer/Songwriter' : 'Group',
      category: item.groupType === 'solo' ? 'solo' : 'idol',
      agency: item.agency || '',
      profileImage: item.image || '',
      followers: parseInt(item.followers?.replace(/[^0-9]/g, '')) || 0,
      isFeatured: true,
      isActive: true,
      bio: item.debutDate ? `데뷔일: ${item.debutDate}` : '',
      socialMedia: item.socialMedia || {}
    }));
  };
  
  // 소셜 미디어 아이콘 렌더링
  const renderSocialIcon = (type) => {
    switch (type) {
      case 'instagram':
        return <Instagram size={18} className="text-[#E1306C]" />;
      case 'twitter':
        return <Twitter size={18} className="text-[#1DA1F2]" />;
      case 'youtube':
        return <Youtube size={18} className="text-[#FF0000]" />;
      case 'spotify':
        return <Music size={18} className="text-[#1ED760]" />;
      case 'tiktok':
        return <Hash size={18} className="text-[#000000]" />;
      case 'fancafe':
        return <Star size={18} className="text-[#FFA500]" />;
      default:
        return <ExternalLink size={18} className="text-gray-500" />;
    }
  };
  
  return (
    <AdminLayout>
      <Head>
        <title>셀럽 추가 | Admin</title>
      </Head>
      
      <div className="px-6 py-6">
        <div className="mb-6 flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">셀럽 추가</h1>
            <p className="text-gray-500">새로운 셀럽 프로필을 추가합니다</p>
          </div>
        </div>
        
        {/* 알림 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
            <div className="flex items-center">
              <AlertTriangle size={20} className="text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-md">
            <div className="flex items-center">
              <CheckCircle size={20} className="text-green-500 mr-2" />
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 셀럽 입력 폼 */}
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-4">셀럽 정보 입력</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      영문 이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: BTS, IU, Jisoo"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="koreanName" className="block text-sm font-medium text-gray-700 mb-1">
                      한글 이름
                    </label>
                    <input
                      type="text"
                      id="koreanName"
                      name="koreanName"
                      value={formData.koreanName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: 방탄소년단, 아이유, 지수"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                      역할 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: Vocalist, Dancer, Actor"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      카테고리 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="agency" className="block text-sm font-medium text-gray-700 mb-1">
                      소속사
                    </label>
                    <input
                      type="text"
                      id="agency"
                      name="agency"
                      value={formData.agency}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: SM Entertainment, HYBE"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-1">
                      그룹명 (솔로 아티스트는 공백)
                    </label>
                    <input
                      type="text"
                      id="group"
                      name="group"
                      value={formData.group}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: BLACKPINK, BTS"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700 mb-1">
                      프로필 이미지 URL
                    </label>
                    <input
                      type="text"
                      id="profileImage"
                      name="profileImage"
                      value={formData.profileImage}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="이미지 URL을 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="followers" className="block text-sm font-medium text-gray-700 mb-1">
                      팔로워 수
                    </label>
                    <input
                      type="number"
                      id="followers"
                      name="followers"
                      value={formData.followers}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="숫자만 입력"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    약력 (Bio)
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                    placeholder="셀럽의 간략한 소개를 입력하세요"
                  />
                </div>
                
                <div className="flex items-center space-x-8">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-[#ff3e8e] focus:ring-[#ff3e8e]"
                    />
                    <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-700">
                      Featured 추천 셀럽으로 표시
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-[#ff3e8e] focus:ring-[#ff3e8e]"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                      활성화
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors mr-4"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[#ff3e8e] text-white rounded-lg hover:bg-[#e02e7c] transition-colors flex items-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
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
            
            {/* 크롤링 데이터 표시 섹션 */}
            <div className="lg:w-96">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">K-POP 레이더 추천 셀럽</h2>
                <button
                  onClick={fetchKpopRadarArtists}
                  disabled={crawlLoading}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center text-sm"
                >
                  {crawlLoading ? (
                    <>
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                      로딩 중...
                    </>
                  ) : (
                    <>
                      <Download size={14} className="mr-1.5" />
                      가져오기
                    </>
                  )}
                </button>
              </div>
              
              {crawlLoading ? (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
                  <Loader2 size={36} className="text-[#ff3e8e] animate-spin mb-4" />
                  <p className="text-gray-500">K-POP 레이더에서 추천 아티스트 데이터를 가져오는 중입니다...</p>
                </div>
              ) : crawledData.length > 0 ? (
                <div className="overflow-y-auto max-h-[600px] bg-gray-50 rounded-lg">
                  <div className="grid gap-2 p-2">
                    {crawledData.map((item, index) => (
                      <div 
                        key={index} 
                        className={`p-3 bg-white rounded-lg border cursor-pointer transition-all ${
                          selectedCrawlItem === item 
                            ? 'border-[#ff3e8e] shadow-md' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => selectCrawlItem(item)}
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "/images/placeholder.jpg";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                <User size={18} />
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.engName}</div>
                          </div>
                          <div className="ml-auto flex items-center text-xs">
                            <Star size={12} className="text-yellow-400 mr-1" />
                            <span>{item.followers}</span>
                          </div>
                        </div>
                        {item.agency && (
                          <div className="mt-1 text-xs text-gray-500">
                            {item.agency}
                          </div>
                        )}
                        {item.debutDate && (
                          <div className="mt-1 text-xs text-gray-500">
                            데뷔: {item.debutDate}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 mb-2">아직 데이터가 로드되지 않았습니다.</p>
                  <p className="text-sm text-gray-400">'가져오기' 버튼을 클릭하여 K-POP 레이더에서 추천 아티스트를 불러옵니다.</p>
                </div>
              )}
              
              {/* 선택된 아티스트 상세 정보 */}
              {selectedCrawlItem && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="relative">
                    {selectedCrawlItem.thumbnail ? (
                      <img 
                        src={selectedCrawlItem.thumbnail} 
                        alt={selectedCrawlItem.name} 
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          console.log("썸네일 이미지 로드 실패:", selectedCrawlItem.thumbnail);
                          e.target.onerror = null;
                          // 썸네일 이미지 로드 실패 시 기본 프로필 이미지로 대체
                          if (selectedCrawlItem.image) {
                            console.log("대체 이미지 사용:", selectedCrawlItem.image);
                            e.target.src = selectedCrawlItem.image;
                          } else {
                            e.target.src = "/images/placeholder.jpg";
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <User size={36} className="text-gray-400" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <h3 className="text-white font-bold text-xl">{selectedCrawlItem.name}</h3>
                      <p className="text-white/80 text-sm">{selectedCrawlItem.engName}</p>
                    </div>
                  </div>
                  
                  {/* 디버그 정보 (개발 중에만 표시) */}
                  <div className="p-2 bg-gray-100 text-xs">
                    <details>
                      <summary className="font-medium text-gray-700 cursor-pointer">이미지 디버그 정보</summary>
                      <div className="mt-1 space-y-1 pl-2">
                        <div><span className="font-medium">썸네일:</span> {selectedCrawlItem.thumbnail || '없음'}</div>
                        <div><span className="font-medium">프로필:</span> {selectedCrawlItem.image || '없음'}</div>
                      </div>
                    </details>
                  </div>
                  
                  {/* Today 소셜 미디어 통계 */}
                  {selectedCrawlItem.todayStats && Object.keys(selectedCrawlItem.todayStats).length > 0 && (
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Today</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedCrawlItem.todayStats).map(([platform, count]) => (
                          <div key={platform} className="flex items-center p-2 bg-gray-50 rounded-md">
                            {renderSocialIcon(platform)}
                            <div className="ml-2">
                              <div className="text-xs text-gray-500 capitalize">{platform}</div>
                              <div className="font-medium text-sm">{count}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 소셜 미디어 링크 */}
                  {selectedCrawlItem.socialMedia && Object.values(selectedCrawlItem.socialMedia).some(v => v) && (
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">소셜 미디어</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedCrawlItem.socialMedia)
                          .filter(([_, url]) => url)
                          .map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                              title={platform}
                            >
                              {renderSocialIcon(platform)}
                            </a>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}