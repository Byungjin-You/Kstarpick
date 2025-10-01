import React, { useState } from 'react';
import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import Image from 'next/image';

// 한국 주요 스트리밍 서비스 정보 정의
const COMMON_PROVIDERS = [
  {
    name: 'Netflix',
    color: '#E50914',
    textColor: '#FFFFFF',
    type: 'subscription',
    price: '9,500원/월',
    quality: ['HD', '4K'],
    url: 'https://www.netflix.com/',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png'
  },
  {
    name: 'Disney+',
    color: '#0063E5',
    textColor: '#FFFFFF',
    type: 'subscription',
    price: '9,900원/월',
    quality: ['HD', '4K'],
    url: 'https://www.disneyplus.com/',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg'
  },
  {
    name: 'TVING',
    color: '#FF0050',
    textColor: '#FFFFFF',
    type: 'subscription',
    price: '7,900원/월',
    quality: ['HD', '4K'],
    url: 'https://www.tving.com/',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/95/TVING_logo.png'
  },
  {
    name: 'Watcha',
    color: '#FF0A54',
    textColor: '#FFFFFF',
    type: 'subscription',
    price: '7,900원/월',
    quality: ['HD', '4K'],
    url: 'https://watcha.com/',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Watcha_logo.png/800px-Watcha_logo.png'
  },
  {
    name: 'Wavve',
    color: '#1351F9',
    textColor: '#FFFFFF',
    type: 'subscription',
    price: '7,900원/월',
    quality: ['HD', '4K'],
    url: 'https://www.wavve.com/',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Wavve_logo.png'
  },
  {
    name: 'Apple TV+',
    color: '#000000',
    textColor: '#FFFFFF',
    type: 'subscription',
    price: '8,900원/월',
    quality: ['HD', '4K'],
    url: 'https://tv.apple.com/',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg'
  }
];

const WatchProvidersEditor = ({ value = [], onChange, disabled = false }) => {
  console.log('WatchProvidersEditor rendering with value:', value);

  const [newProvider, setNewProvider] = useState({
    name: '',
    logo: '',
    color: '#6366F1', // 기본 색상: 인디고
    textColor: '#FFFFFF',
    type: 'subscription',
    price: '',
    quality: [],
    url: ''
  });
  const [showLogoInput, setShowLogoInput] = useState(false);
  const [qualityInput, setQualityInput] = useState('');
  const [error, setError] = useState('');
  const [selectedCommonProvider, setSelectedCommonProvider] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewProvider(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const addQuality = () => {
    if (!qualityInput.trim()) return;

    if (!newProvider.quality.includes(qualityInput.trim())) {
      setNewProvider(prev => ({
        ...prev,
        quality: [...prev.quality, qualityInput.trim()]
      }));
    }
    
    setQualityInput('');
  };

  const removeQuality = (index) => {
    setNewProvider(prev => ({
      ...prev,
      quality: prev.quality.filter((_, i) => i !== index)
    }));
  };

  // 일반 제공자 추가 함수
  const addProvider = () => {
    if (newProvider.name.trim() === '') {
      setError('제공자 이름을 입력해주세요.');
      return;
    }
    
    // 서비스 이름에 따라 적절한 로고 URL 선택
    let logoUrl = '';
    
    if (newProvider.name.toLowerCase().includes('netflix')) {
      logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png';
    } else if (newProvider.name.toLowerCase().includes('disney')) {
      logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg';
    } else if (newProvider.name.toLowerCase().includes('tving')) {
      logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/9/95/TVING_logo.png';
    } else if (newProvider.name.toLowerCase().includes('wavve')) {
      logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Wavve_logo.png';
    } else if (newProvider.name.toLowerCase().includes('watcha')) {
      logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Watcha_logo.png/800px-Watcha_logo.png';
    } else if (newProvider.name.toLowerCase().includes('apple')) {
      logoUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/39/Apple_TV.svg';
    } else {
      // 기타 서비스는 URL 기반 favicon 사용
      logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(newProvider.url)}&sz=128`;
    }

    const updatedProviders = [
      ...value,
      {
        ...newProvider,
        logo: logoUrl,
        order: value.length
      }
    ];

    onChange(updatedProviders);
    setNewProvider({
      name: '',
      logo: '',
      color: '#6366F1', // 기본 색상: 인디고
      textColor: '#FFFFFF',
      type: 'subscription',
      price: '',
      quality: [],
      url: ''
    });
    setShowLogoInput(false);
  };

  // 미리 정의된 제공자 추가 함수
  const addCommonProvider = (e) => {
    const selectedValue = e.target.value;
    if (!selectedValue) return;
    
    setSelectedCommonProvider('');
    
    // 이미 추가된 제공자인지 확인
    const existingProvider = value.find(p => p.name === selectedValue);
    if (existingProvider) {
      setError(`${selectedValue} is already added`);
      return;
    }
    
    // 선택된 제공자 정보 찾기
    const providerInfo = COMMON_PROVIDERS.find(p => p.name === selectedValue);
    if (!providerInfo) return;
    
    // 새 제공자 추가
    const updatedProviders = [
      ...value,
      {
        ...providerInfo,
        order: value.length
      }
    ];
    
    onChange(updatedProviders);
  };

  const removeProvider = (index) => {
    const updatedProviders = value.filter((_, i) => i !== index);
    // Update order for each provider
    const reorderedProviders = updatedProviders.map((provider, idx) => ({
      ...provider,
      order: idx
    }));
    onChange(reorderedProviders);
  };

  const moveProvider = (index, direction) => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === value.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedProviders = [...value];
    
    // Swap the items
    [updatedProviders[index], updatedProviders[newIndex]] = [updatedProviders[newIndex], updatedProviders[index]];
    
    // Update order for each provider
    const reorderedProviders = updatedProviders.map((provider, idx) => ({
      ...provider,
      order: idx
    }));
    
    onChange(reorderedProviders);
  };

  const toggleLogoInput = () => {
    setShowLogoInput(!showLogoInput);
  };

  const getProviderTypeLabel = (type) => {
    switch (type) {
      case 'subscription': return 'Subscription';
      case 'rental': return 'Rental';
      case 'purchase': return 'Purchase';
      case 'free': return 'Free';
      default: return type;
    }
  };

  // 서비스 이름의 첫 글자 또는 약자 가져오기
  const getInitials = (name) => {
    if (!name) return '';
    
    if (name === 'Netflix') return 'N';
    if (name === 'Disney+') return 'D+';
    if (name === 'Apple TV+') return 'TV+';
    
    return name.charAt(0);
  };

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {value.map((provider, index) => (
            <div key={index} className="flex items-center border rounded-md p-3 bg-white">
              <div className="flex-shrink-0 mr-4">
                <div 
                  className="relative h-12 w-20 overflow-hidden rounded flex items-center justify-center"
                  style={{ 
                    backgroundColor: provider.color || '#6366F1',
                    color: provider.textColor || '#FFFFFF'
                  }}
                >
                  <span className="text-lg font-bold">{getInitials(provider.name)}</span>
                </div>
              </div>

              <div className="flex-grow">
                <p className="font-medium">{provider.name}</p>
                <div className="flex flex-wrap gap-1 items-center text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">{getProviderTypeLabel(provider.type)}</span>
                  {provider.price && <span>• {provider.price}</span>}
                  {provider.quality && provider.quality.length > 0 && (
                    <span>• {provider.quality.join(', ')}</span>
                  )}
                </div>
              </div>

              {!disabled && (
                <div className="flex-shrink-0 flex items-center space-x-1">
                  <button 
                    type="button" 
                    onClick={() => moveProvider(index, 'up')}
                    disabled={index === 0}
                    className={`p-1 text-gray-500 hover:text-gray-700 ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => moveProvider(index, 'down')}
                    disabled={index === value.length - 1}
                    className={`p-1 text-gray-500 hover:text-gray-700 ${index === value.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => removeProvider(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="mt-4 border rounded-md p-4 bg-gray-50">
          <h4 className="text-sm font-medium mb-3">Add Watch Provider</h4>
          
          {/* 빠른 선택 드롭다운 */}
          <div className="mb-4">
            <label className="block text-sm text-gray-700 mb-1">Quick Add:</label>
            <select
              value={selectedCommonProvider}
              onChange={addCommonProvider}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Select a common provider...</option>
              {COMMON_PROVIDERS.map(provider => (
                <option 
                  key={provider.name} 
                  value={provider.name}
                  disabled={value.some(p => p.name === provider.name)}
                >
                  {provider.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Provider information will be automatically added
            </p>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Or add custom provider:</h4>
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="Provider name (e.g., Netflix, Disney+)"
                  value={newProvider.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <select
                  name="type"
                  value={newProvider.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="subscription">Subscription</option>
                  <option value="rental">Rental</option>
                  <option value="purchase">Purchase</option>
                  <option value="free">Free</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  name="price"
                  placeholder="Price (e.g., $9.99/month, $3.99)"
                  value={newProvider.price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <input
                  type="text"
                  name="url"
                  placeholder="Link URL (e.g., https://netflix.com/title/123)"
                  value={newProvider.url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-1">Provider Color:</label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    name="color"
                    value={newProvider.color}
                    onChange={handleChange}
                    className="h-10 w-12 p-0 border-0"
                  />
                  <input
                    type="text"
                    name="color"
                    value={newProvider.color}
                    onChange={handleChange}
                    placeholder="#6366F1"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Quality (e.g., HD, 4K)"
                    value={qualityInput}
                    onChange={(e) => setQualityInput(e.target.value)}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={addQuality}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
                
                {newProvider.quality.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newProvider.quality.map((q, i) => (
                      <div key={i} className="flex items-center bg-gray-100 px-2 py-1 rounded text-sm">
                        {q}
                        <button
                          type="button"
                          onClick={() => removeQuality(i)}
                          className="ml-1 text-gray-500 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addProvider}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Provider
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchProvidersEditor; 