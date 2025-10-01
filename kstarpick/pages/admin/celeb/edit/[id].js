import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';
import { ArrowLeft, Save, Loader2, Download, Star, User, AlertTriangle, CheckCircle, Instagram, Twitter, Youtube, Music, Hash, ExternalLink, Clock } from 'lucide-react';

export default function EditCelebrity() {
  const router = useRouter();
  const { id } = router.query;
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
    socialMedia: {},
    socialMediaFollowers: {
      instagram: 0,
      twitter: 0,
      youtube: 0,
      spotify: 0,
      tiktok: 0,
      fancafe: 0
    },
    musicVideos: [],
    socialMediaRankings: {},
    socialMediaChanges: {}
  });
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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
  
  // 페이지 로드 시 셀럽 데이터 가져오기
  useEffect(() => {
    if (id) {
      fetchCelebrityData(id);
    }
  }, [id]);
  
  // 셀럽 데이터 가져오기
  const fetchCelebrityData = async (celebId) => {
    setFetchLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/celeb/${celebId}`);
      
      if (!response.ok) {
        throw new Error('셀럽 정보를 가져오는 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error('셀럽 정보를 가져오는 데 실패했습니다.');
      }
      
      // 소셜 미디어 팔로워 데이터가 없는 경우 초기화
      if (!data.data.socialMediaFollowers) {
        data.data.socialMediaFollowers = {
          instagram: 0,
          twitter: 0,
          youtube: 0,
          spotify: 0,
          tiktok: 0,
          fancafe: 0
        };
      }
      
      setFormData(data.data);
    } catch (error) {
      console.error('셀럽 데이터 가져오기 오류:', error);
      setError(error.message || '셀럽 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setFetchLoading(false);
    }
  };
  
  // 입력 필드 변경 처리
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // 소셜 미디어 입력 필드 변경 처리
  const handleSocialMediaChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [name]: value
      }
    }));
    
    // 확인용 로그
    console.log('소셜 미디어 변경:', name, value);
    console.log('업데이트된 폼 데이터 소셜 미디어:', {
      ...formData.socialMedia,
      [name]: value
    });
  };
  
  // 소셜 미디어 팔로워 입력 필드 변경 처리
  const handleSocialMediaFollowersChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseInt(value.replace(/,/g, ''), 10);
    
    setFormData(prev => ({
      ...prev,
      socialMediaFollowers: {
        ...prev.socialMediaFollowers,
        [name]: numValue || 0
      }
    }));
  };
  
  // 중첩된 변경 처리
  const handleNestedChange = (e) => {
    const { name, value } = e.target;
    const [main, sub] = name.split('.');
    setFormData(prev => ({
      ...prev,
      [main]: {
        ...prev[main],
        [sub]: value
      }
    }));
  };
  
  // 폼 제출 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    // 제출 전 formData 확인
    console.log('제출할 폼 데이터:', JSON.stringify(formData, null, 2));
    console.log('소셜 미디어 데이터:', JSON.stringify(formData.socialMedia, null, 2));
    
    try {
      const response = await fetch(`/api/celeb/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '셀럽 정보 업데이트 중 오류가 발생했습니다.');
      }
      
      setSuccess('셀럽 정보가 성공적으로 업데이트되었습니다.');
      setTimeout(() => {
        router.push('/admin/celeb');
      }, 2000);
    } catch (error) {
      console.error('셀럽 업데이트 오류:', error);
      setError(error.message || '셀럽 정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
  
  // 숫자 포맷팅 (1000 -> 1,000)
  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';
  };
  
  return (
    <AdminLayout>
      <Head>
        <title>셀럽 편집 | Admin</title>
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
            <h1 className="text-2xl font-bold text-gray-800">셀럽 편집</h1>
            <p className="text-gray-500">셀럽 프로필 정보를 수정합니다</p>
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
        
        {fetchLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 size={40} className="text-[#ff3e8e] animate-spin mb-4" />
              <p className="text-gray-500">셀럽 정보를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
                    value={formData.koreanName || ''}
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
                    placeholder="예: Singer, Rapper, Group"
                  />
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    카테고리
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
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
                    value={formData.agency || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                    placeholder="예: HYBE, SM Entertainment"
                  />
                </div>
                
                <div>
                  <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-1">
                    그룹명
                  </label>
                  <input
                    type="text"
                    id="group"
                    name="group"
                    value={formData.group || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                    placeholder="예: BTS, BLACKPINK (솔로 아티스트는 비워두세요)"
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
                    value={formData.profileImage || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                    placeholder="예: https://example.com/image.jpg"
                  />
                </div>
                
                <div>
                  <label htmlFor="followers" className="block text-sm font-medium text-gray-700 mb-1">
                    전체 팔로워 수
                  </label>
                  <input
                    type="number"
                    id="followers"
                    name="followers"
                    value={formData.followers || 0}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                    placeholder="예: 1000000"
                  />
                </div>
              </div>
              
              {/* 소셜 미디어 팔로워 수 */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">소셜 미디어 팔로워 수</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('instagram')}
                      <span className="ml-2">Instagram 팔로워</span>
                    </label>
                    <input
                      type="text"
                      name="socialMediaFollowers.instagram"
                      value={formatNumber(formData.socialMediaFollowers?.instagram || 0)}
                      onChange={handleSocialMediaFollowersChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: 1000000"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('twitter')}
                      <span className="ml-2">Twitter 팔로워</span>
                    </label>
                    <input
                      type="text"
                      name="socialMediaFollowers.twitter"
                      value={formatNumber(formData.socialMediaFollowers?.twitter || 0)}
                      onChange={handleSocialMediaFollowersChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: 500000"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('youtube')}
                      <span className="ml-2">YouTube 팔로워</span>
                    </label>
                    <input
                      type="text"
                      name="socialMediaFollowers.youtube"
                      value={formatNumber(formData.socialMediaFollowers?.youtube || 0)}
                      onChange={handleSocialMediaFollowersChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: 300000"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('spotify')}
                      <span className="ml-2">Spotify 팔로워</span>
                    </label>
                    <input
                      type="text"
                      name="socialMediaFollowers.spotify"
                      value={formatNumber(formData.socialMediaFollowers?.spotify || 0)}
                      onChange={handleSocialMediaFollowersChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: 200000"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('tiktok')}
                      <span className="ml-2">TikTok 팔로워</span>
                    </label>
                    <input
                      type="text"
                      name="socialMediaFollowers.tiktok"
                      value={formatNumber(formData.socialMediaFollowers?.tiktok || 0)}
                      onChange={handleSocialMediaFollowersChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: 400000"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('fancafe')}
                      <span className="ml-2">팬카페 팔로워</span>
                    </label>
                    <input
                      type="text"
                      name="socialMediaFollowers.fancafe"
                      value={formatNumber(formData.socialMediaFollowers?.fancafe || 0)}
                      onChange={handleSocialMediaFollowersChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: 100000"
                    />
                  </div>
                </div>
              </div>
              
              {/* 소셜 미디어 팔로워 정보 */}
              <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-700 mb-4">소셜 미디어 팔로워 정보</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Instagram Followers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Instagram size={16} className="text-pink-500" />
                        <span>Instagram 팔로워</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaFollowers.instagram"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaFollowers?.instagram || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* Instagram Ranking */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Instagram size={16} className="text-pink-500" /> 
                        <span>Instagram 랭킹</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaRankings.instagram"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaRankings?.instagram || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* Instagram Change */}
                  <div className="md:col-span-2 border-t border-gray-100 pt-4 mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                      <Instagram size={16} className="text-pink-500" /> 
                      <span>Instagram 변화량</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">팔로워 변화 수</label>
                        <input
                          type="number"
                          name="socialMediaChanges.instagram.count"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.instagram?.count || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">변화율 (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="socialMediaChanges.instagram.percent"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.instagram?.percent || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Twitter Followers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Twitter size={16} className="text-blue-500" />
                        <span>Twitter 팔로워</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaFollowers.twitter"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaFollowers?.twitter || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* Twitter Ranking */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Twitter size={16} className="text-blue-500" /> 
                        <span>Twitter 랭킹</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaRankings.twitter"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaRankings?.twitter || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* Twitter Change */}
                  <div className="md:col-span-2 border-t border-gray-100 pt-4 mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                      <Twitter size={16} className="text-blue-500" /> 
                      <span>Twitter 변화량</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">팔로워 변화 수</label>
                        <input
                          type="number"
                          name="socialMediaChanges.twitter.count"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.twitter?.count || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">변화율 (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="socialMediaChanges.twitter.percent"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.twitter?.percent || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* YouTube Followers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Youtube size={16} className="text-red-500" />
                        <span>YouTube 팔로워</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaFollowers.youtube"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaFollowers?.youtube || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* YouTube Ranking */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Youtube size={16} className="text-red-500" /> 
                        <span>YouTube 랭킹</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaRankings.youtube"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaRankings?.youtube || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* YouTube Change */}
                  <div className="md:col-span-2 border-t border-gray-100 pt-4 mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                      <Youtube size={16} className="text-red-500" /> 
                      <span>YouTube 변화량</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">팔로워 변화 수</label>
                        <input
                          type="number"
                          name="socialMediaChanges.youtube.count"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.youtube?.count || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">변화율 (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="socialMediaChanges.youtube.percent"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.youtube?.percent || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Spotify Followers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Music size={16} className="text-green-500" />
                        <span>Spotify 팔로워</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaFollowers.spotify"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaFollowers?.spotify || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* Spotify Ranking */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Music size={16} className="text-green-500" /> 
                        <span>Spotify 랭킹</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaRankings.spotify"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaRankings?.spotify || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* Spotify Change */}
                  <div className="md:col-span-2 border-t border-gray-100 pt-4 mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                      <Music size={16} className="text-green-500" /> 
                      <span>Spotify 변화량</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">팔로워 변화 수</label>
                        <input
                          type="number"
                          name="socialMediaChanges.spotify.count"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.spotify?.count || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">변화율 (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="socialMediaChanges.spotify.percent"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.spotify?.percent || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* TikTok Followers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Hash size={16} className="text-black" />
                        <span>TikTok 팔로워</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaFollowers.tiktok"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaFollowers?.tiktok || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* TikTok Ranking */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <div className="flex items-center gap-2">
                        <Hash size={16} className="text-black" /> 
                        <span>TikTok 랭킹</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      name="socialMediaRankings.tiktok"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={formData.socialMediaRankings?.tiktok || 0}
                      onChange={handleNestedChange}
                    />
                  </div>
                  
                  {/* TikTok Change */}
                  <div className="md:col-span-2 border-t border-gray-100 pt-4 mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                      <Hash size={16} className="text-black" /> 
                      <span>TikTok 변화량</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">팔로워 변화 수</label>
                        <input
                          type="number"
                          name="socialMediaChanges.tiktok.count"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.tiktok?.count || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">변화율 (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="socialMediaChanges.tiktok.percent"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={formData.socialMediaChanges?.tiktok?.percent || 0}
                          onChange={handleNestedChange}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Update social media timestamp */}
                  <div className="md:col-span-2 border-t border-gray-100 pt-4 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          socialMediaUpdatedAt: new Date().toISOString()
                        });
                      }}
                    >
                      <Clock size={14} className="mr-1" />
                      타임스탬프 업데이트
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 소셜 미디어 링크 */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">소셜 미디어 링크</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('instagram')}
                      <span className="ml-2">Instagram</span>
                    </label>
                    <input
                      type="text"
                      name="socialMedia.instagram"
                      value={formData.socialMedia?.instagram || ''}
                      onChange={handleSocialMediaChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: https://instagram.com/username"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('twitter')}
                      <span className="ml-2">Twitter</span>
                    </label>
                    <input
                      type="text"
                      name="socialMedia.twitter"
                      value={formData.socialMedia?.twitter || ''}
                      onChange={handleSocialMediaChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: https://twitter.com/username"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('youtube')}
                      <span className="ml-2">YouTube</span>
                    </label>
                    <input
                      type="text"
                      name="socialMedia.youtube"
                      value={formData.socialMedia?.youtube || ''}
                      onChange={handleSocialMediaChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: https://youtube.com/c/channelid"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('spotify')}
                      <span className="ml-2">Spotify</span>
                    </label>
                    <input
                      type="text"
                      name="socialMedia.spotify"
                      value={formData.socialMedia?.spotify || ''}
                      onChange={handleSocialMediaChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: https://open.spotify.com/artist/id"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('tiktok')}
                      <span className="ml-2">TikTok</span>
                    </label>
                    <input
                      type="text"
                      name="socialMedia.tiktok"
                      value={formData.socialMedia?.tiktok || ''}
                      onChange={handleSocialMediaChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: https://tiktok.com/@username"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                      {renderSocialIcon('fancafe')}
                      <span className="ml-2">팬카페</span>
                    </label>
                    <input
                      type="text"
                      name="socialMedia.fancafe"
                      value={formData.socialMedia?.fancafe || ''}
                      onChange={handleSocialMediaChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                      placeholder="예: https://cafe.daum.net/..."
                    />
                  </div>
                </div>
              </div>
              
              {/* 뮤직비디오 정보 */}
              {formData.musicVideos && formData.musicVideos.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">뮤직비디오 정보</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">총 {formData.musicVideos.length}개의 뮤직비디오가 있습니다.</p>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {formData.musicVideos.map((video, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-gray-200 shadow-sm">
                          <div className="flex flex-col md:flex-row">
                            {video.thumbnails && video.thumbnails.medium && (
                              <div className="mr-4 mb-2 md:mb-0">
                                <img 
                                  src={video.thumbnails.medium.url || '/placeholder-video.jpg'} 
                                  alt={video.title} 
                                  className="w-40 h-auto rounded"
                                />
                              </div>
                            )}
                            <div className="flex-grow">
                              <h4 className="font-medium text-gray-800">{video.title}</h4>
                              {video.artists && video.artists.length > 0 && (
                                <p className="text-sm text-gray-600 mb-2">
                                  아티스트: {video.artists.join(', ')}
                                </p>
                              )}
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-gray-600">
                                  <span className="font-medium">조회수:</span> {formatNumber(video.views || 0)}
                                </div>
                                <div className="text-gray-600">
                                  <span className="font-medium">좋아요:</span> {formatNumber(video.likes || 0)}
                                </div>
                                {video.publishedAt && (
                                  <div className="text-gray-600 col-span-2">
                                    <span className="font-medium">게시일:</span> {new Date(video.publishedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2">
                                <a 
                                  href={video.youtubeUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[#ff3e8e] text-sm hover:underline flex items-center"
                                >
                                  <Youtube size={16} className="mr-1" /> YouTube에서 보기
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  바이오 / 설명
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e]"
                  placeholder="셀럽에 대한 설명을 입력하세요"
                ></textarea>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#ff3e8e] border-gray-300 rounded focus:ring-[#ff3e8e]"
                  />
                  <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-700">
                    메인 페이지에 표시
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#ff3e8e] border-gray-300 rounded focus:ring-[#ff3e8e]"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    활성화
                  </label>
                </div>
              </div>
              
              <div className="pt-5 border-t border-gray-200 flex justify-end">
                <Link
                  href="/admin/celeb"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg mr-4 hover:bg-gray-200 transition-colors"
                >
                  취소
                </Link>
                <button
                  type="submit"
                  disabled={loading || fetchLoading}
                  className="px-4 py-2 bg-[#ff3e8e] text-white rounded-lg hover:bg-[#e02e7c] transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
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
        )}
      </div>
    </AdminLayout>
  );
}

// 서버 사이드에서 인증 확인
export async function getServerSideProps(context) {
  try {
    // Placeholder for authentication logic
    return {
      props: {},
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {},
    };
  }
} 