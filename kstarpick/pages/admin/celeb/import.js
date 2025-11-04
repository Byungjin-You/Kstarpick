import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { Loader, Check, AlertTriangle, ArrowLeft, RefreshCw, Save, List, Eye } from 'lucide-react';

export default function ImportCelebrities() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedData, setFetchedData] = useState(null);
  const [importResults, setImportResults] = useState(null);
  
  // K-POP 레이더에서 데이터 가져오기
  const fetchData = async () => {
    setFetchLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/scrape/kpop-radar');
      
      if (!response.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // 예상치 못한 데이터 필터링 (메뉴 항목, FAQ 등)
        const filteredData = data.data.filter(artist =>
          artist.name &&
          artist.id &&
          !artist.id.includes('faq') &&
          !artist.id.includes('#') &&
          !artist.id.includes('viewcount') &&
          !artist.id.includes('artistList') &&
          !artist.id.includes('brief') &&
          !artist.id.includes('contact') &&
          !artist.id.includes('dashboard')
        );
        
        setFetchedData({
          artists: filteredData,
          timestamp: new Date().toISOString(),
          source: 'kpop-radar.com',
          fallback: data.fallback || false
        });
      } else {
        throw new Error('유효하지 않은 데이터 형식입니다.');
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
      setError(error.message || '데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setFetchLoading(false);
    }
  };
  
  // 데이터베이스에 일괄 저장
  const importData = async () => {
    if (!fetchedData || !fetchedData.artists || fetchedData.artists.length === 0) {
      setError('저장할 데이터가 없습니다. 먼저 데이터를 가져와주세요.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/celeb/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artists: fetchedData.artists }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '데이터 저장 중 오류가 발생했습니다.');
      }
      
      const result = await response.json();
      setImportResults(result.data);
      
    } catch (error) {
      console.error('데이터 저장 오류:', error);
      setError(error.message || '데이터 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 어드민 셀럽 목록으로 이동
  const goToList = () => {
    router.push('/admin/celeb');
  };
  
  // 결과 요약 표시
  const renderSummary = () => {
    if (!importResults) return null;
    
    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
        <h3 className="text-lg font-medium text-green-800 flex items-center">
          <Check className="mr-2 h-5 w-5" />
          데이터 가져오기 완료
        </h3>
        <div className="mt-2 text-sm text-green-700">
          <p>새로 추가됨: <span className="font-bold">{importResults.imported}</span>개</p>
          <p>업데이트됨: <span className="font-bold">{importResults.updated}</span>개</p>
          {importResults.failed > 0 && (
            <p className="text-amber-600">실패: <span className="font-bold">{importResults.failed}</span>개</p>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <AdminLayout>
      <Head>
        <title>Import K-POP Celebrities | Admin</title>
      </Head>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">K-POP 셀럽 가져오기</h1>
          <p className="text-gray-500">K-POP 레이더에서 아티스트 데이터를 가져옵니다</p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={goToList}
            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            셀럽 목록으로
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-800">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span className="font-medium">오류</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">K-POP 레이더 데이터 가져오기</h2>
        
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={fetchData}
            disabled={fetchLoading}
            className={`inline-flex items-center px-4 py-2 ${
              fetchLoading ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'
            } text-white rounded-lg transition-colors`}
          >
            {fetchLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                데이터 가져오는 중...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                K-POP 레이더에서 가져오기
              </>
            )}
          </button>
          
          {fetchedData && (
            <button
              onClick={importData}
              disabled={isLoading}
              className={`inline-flex items-center px-4 py-2 ${
                isLoading ? 'bg-green-300' : 'bg-green-500 hover:bg-green-600'
              } text-white rounded-lg transition-colors`}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  저장하는 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  데이터베이스에 저장
                </>
              )}
            </button>
          )}
        </div>
        
        {/* 가져오기 결과 요약 */}
        {importResults && renderSummary()}
        
        {/* 가져온 데이터 표시 */}
        {fetchedData && !isLoading && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">케이팝 레이더 데이터</h2>
            <div className="flex flex-col space-y-2 mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">데이터 소스:</span> {fetchedData.source}
                {fetchedData.fallback && (
                  <span className="ml-2 text-yellow-600">(대체 데이터 사용)</span>
                )}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">가져온 시간:</span> {new Date(fetchedData.timestamp).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">아티스트 수:</span> {fetchedData.artists.length}
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {fetchedData.artists.map((artist, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 border-b">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <img 
                        src={artist.image || '/images/placeholder.jpg'} 
                        alt={artist.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.jpg'; }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{artist.engName || artist.name}</h3>
                      {artist.name !== artist.engName && (
                        <p className="text-xs text-gray-600">{artist.name}</p>
                      )}
                    </div>
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {artist.followers}
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
                      <div className="text-xs text-gray-600">소속사</div>
                      <div className="text-xs font-medium">{artist.agency || '-'}</div>
                      
                      <div className="text-xs text-gray-600">유형</div>
                      <div className="text-xs font-medium">{artist.groupType === 'solo' ? '솔로' : '그룹'}</div>
                      
                      <div className="text-xs text-gray-600">데뷔일</div>
                      <div className="text-xs font-medium">{artist.debutDate || '-'}</div>
                    </div>
                    
                    {/* 소셜 미디어 정보 */}
                    <div className="border-t pt-2 mb-2">
                      <h4 className="text-xs font-semibold mb-1.5">소셜 미디어</h4>
                      <div className="grid grid-cols-3 gap-1">
                        {artist.socialMedia && Object.entries(artist.socialMedia).map(([platform, url]) => (
                          <div key={platform} className="flex items-center">
                            <span className="text-xs capitalize">{platform}</span>
                            {url && (
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ml-1 text-blue-500 hover:text-blue-700"
                              >
                                <Eye size={12} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 뮤직비디오 정보 */}
                    {artist.musicVideos && artist.musicVideos.length > 0 && (
                      <div className="border-t pt-2">
                        <h4 className="text-xs font-semibold mb-1.5">뮤직비디오 ({artist.musicVideos.length})</h4>
                        <div className="max-h-24 overflow-y-auto pr-1 space-y-1">
                          {artist.musicVideos.slice(0, 3).map((video, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="truncate max-w-[70%]" title={video.title}>
                                {video.title}
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="bg-gray-100 px-1 rounded" title="순위">
                                  #{video.ranking}
                                </span>
                                <span className={`px-1 rounded ${video.views > 1000000 ? 'bg-red-50 text-red-800' : 'bg-gray-50'}`} title="조회수">
                                  {video.views > 1000000 
                                    ? `${(video.views / 1000000).toFixed(1)}M` 
                                    : video.views > 1000 
                                      ? `${(video.views / 1000).toFixed(0)}K` 
                                      : video.views}
                                </span>
                                {video.youtubeUrl && (
                                  <a 
                                    href={video.youtubeUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Eye size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                          {artist.musicVideos.length > 3 && (
                            <div className="text-xs text-gray-500 text-center italic">
                              +{artist.musicVideos.length - 3}개 더...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {}, // 필요한 props 여기에 전달
  };
} 