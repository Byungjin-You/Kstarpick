import Image from 'next/image';
import Link from 'next/link';
import { Clock, Eye, Film, Tv, User, FileText, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SearchResults = ({ results, viewMode, type, searchQuery }) => {
  if (!results || results.length === 0) {
    return null;
  }

  // 결과 항목 유형에 따른 아이콘 및 링크 경로 설정
  const getItemTypeInfo = (item, defaultType) => {
    const itemType = item._type || item.type || defaultType;
    
    // Check if this is a cast match result
    const isCastMatch = item.matchInfo && item.matchInfo.type === 'cast';
    
    switch (itemType) {
      case 'news':
        return {
          icon: <FileText size={14} className="mr-1 text-pink-500" />,
          path: `/news/${item.slug || item._id}`
        };
      case 'dramas':
        return {
          icon: <Tv size={14} className={`mr-1 ${isCastMatch ? 'text-yellow-500' : 'text-blue-500'}`} />,
          path: `/drama/${item.slug || item._id}`,
          isCastMatch
        };
      case 'movies':
        return {
          icon: <Film size={14} className={`mr-1 ${isCastMatch ? 'text-yellow-500' : 'text-purple-500'}`} />,
          path: `/tvfilm/${item.slug || item._id}`,
          isCastMatch
        };
      case 'actors':
        return {
          icon: <User size={14} className="mr-1 text-green-500" />,
          path: `/celeb/${item.slug || item._id}`
        };
      default:
        return {
          icon: <FileText size={14} className="mr-1 text-gray-500" />,
          path: `/${itemType}/${item.slug || item._id}`
        };
    }
  };

  // 날짜 형식 처리 함수
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  // 검색어에서 일치하는 부분을 하이라이트하는 함수
  const highlightMatches = (text, searchQuery) => {
    if (!text || !searchQuery) return text;
    try {
      // 검색어를 공백으로 분리
      const terms = searchQuery.split(/\s+/).filter(term => term.length > 1);
      
      // 정규식 패턴 생성 - 각 검색어에 대해 대소문자 구분 없이 일치
      const pattern = new RegExp(`(${terms.join('|')})`, 'gi');
      
      // 일치하는 부분을 하이라이트 태그로 감싸기
      return text.replace(pattern, '<span class="bg-yellow-100 font-medium">$1</span>');
    } catch (error) {
      console.error('Highlighting error:', error);
      return text;
    }
  };

  // 하이라이트된 텍스트를 안전하게 렌더링하는 컴포넌트
  const HighlightedText = ({ text, searchQuery, className = "" }) => {
    if (!text || !searchQuery) return <span className={className}>{text}</span>;
    
    const highlightedText = highlightMatches(text, searchQuery);
    
    return (
      <span 
        className={className} 
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    );
  };

  // 그리드 뷰 아이템 렌더링 - CardNews Featured News 스타일로 변경
  const renderGridItem = (item) => {
    const { icon, path, isCastMatch } = getItemTypeInfo(item, type);
    const title = item.title || item.name || 'Untitled';
    // content 필드를 우선으로 사용하고, HTML 태그 제거
    const rawContent = item.content || item.summary || item.description || item.biography || '';
    const cleanContent = rawContent.replace(/<[^>]*>/g, '');
    const coverImage = item.coverImage || item.profileImage || '/images/placeholder.jpg';
    const date = item.createdAt || item.updatedAt;
    const viewCount = item.viewCount || 0;
    
    // Check if search term appears in cast or if we have matchInfo
    const hasMatchInCast = 
      (item.matchInfo && item.matchInfo.type === 'cast') ||
      (searchQuery && item.cast && Array.isArray(item.cast) && 
        item.cast.some(actor => {
          const actorName = actor.name || '';
          return new RegExp(searchQuery, 'i').test(actorName);
        }));
    
    // Get matching cast members
    let matchingCastMembers = [];
    
    if (item.matchInfo && item.matchInfo.type === 'cast' && item.matchInfo.matches) {
      matchingCastMembers = item.matchInfo.matches;
    } 
    else if (hasMatchInCast && item.cast) {
      matchingCastMembers = item.cast.filter(actor => 
        new RegExp(searchQuery, 'i').test(actor.name || '')
      );
    }
    
    return (
      <Link href={path} key={item._id}>
        <div className="bg-white rounded-xl overflow-hidden transition-all duration-300 group relative cursor-pointer">
          <div className="h-56 overflow-hidden relative">
            {/* 이미지 */}
            <img 
              src={coverImage} 
              alt={title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-xl"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/images/placeholder.jpg";
              }}
            />
            
            {/* Add top decorative element */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8e44ad] via-[#9b59b6] to-[#d35400] opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* 카테고리 배지 */}
            <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20">
              <span className="px-2 py-1 md:px-3 md:py-1.5 text-white text-xs font-medium rounded-full backdrop-blur-sm shadow-md" 
                    style={{ background: 'linear-gradient(to right, #9333ea, #ec4899)' }}>
                {item.category || 'K-POP'}
              </span>
            </div>

            {/* Cast match badge */}
            {hasMatchInCast && (
              <div className="absolute top-2 right-2 bg-pink-500/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                Cast Match
              </div>
            )}
          </div>
          
          <div className="p-4">
            <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#8e44ad] transition-colors">
              <HighlightedText text={title} searchQuery={searchQuery} />
            </h3>
            
            <p className="text-gray-600 text-xs line-clamp-2 mb-3">
              <HighlightedText text={cleanContent} searchQuery={searchQuery} />
            </p>

            {/* Show matching cast members */}
            {matchingCastMembers.length > 0 && (
              <div className="mb-3 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-600 mb-1">Cast:</p>
                {matchingCastMembers.slice(0, 2).map((actor, idx) => (
                  <div key={idx} className="flex items-center text-sm mb-1">
                    <span className="font-medium text-pink-600">
                      <HighlightedText text={actor.name} searchQuery={searchQuery} />
                    </span>
                    {actor.role && (
                      <span className="text-xs text-gray-500 ml-1">
                        as {actor.role}
                      </span>
                    )}
                  </div>
                ))}
                {matchingCastMembers.length > 2 && (
                  <p className="text-xs text-gray-500">
                    +{matchingCastMembers.length - 2} more
                  </p>
                )}
              </div>
            )}
            
            <div className="flex justify-between items-end">
              {/* 시간 배지 */}
              <div className="flex items-center text-gray-500 text-xs">
                <Clock size={12} className="mr-1 text-[#9b59b6]" />
                <span>{date ? new Date(date).toLocaleDateString() : 'Unknown date'}</span>
              </div>
              
              {/* Read more 버튼 */}
              <span className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-xs font-medium hover:underline cursor-pointer group">
                Read more <ChevronRight size={14} className="ml-1 group-hover:animate-pulse" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  // 리스트 뷰 아이템 렌더링
  const renderListItem = (item) => {
    const { icon, path, isCastMatch } = getItemTypeInfo(item, type);
    const title = item.title || item.name || 'Untitled';
    // content 필드를 우선으로 사용하고, HTML 태그 제거
    const rawContent = item.content || item.summary || item.description || item.biography || '';
    const cleanContent = rawContent.replace(/<[^>]*>/g, '');
    const coverImage = item.coverImage || item.profileImage || '/images/placeholder.jpg';
    const date = formatDate(item.createdAt || item.updatedAt);
    const viewCount = item.viewCount || 0;
    
    // Check if search term appears in cast or if we have matchInfo
    const hasMatchInCast = 
      // From matchInfo provided by the server
      (item.matchInfo && item.matchInfo.type === 'cast') ||
      // Or from client-side detection
      (searchQuery && item.cast && Array.isArray(item.cast) && 
        item.cast.some(actor => new RegExp(searchQuery, 'i').test(actor.name || '')));
    
    // Get matching cast members
    let matchingCastMembers = [];
    
    // Use server-provided match info if available
    if (item.matchInfo && item.matchInfo.type === 'cast' && item.matchInfo.matches) {
      matchingCastMembers = item.matchInfo.matches;
    } 
    // Otherwise fall back to client-side detection
    else if (hasMatchInCast && item.cast) {
      matchingCastMembers = item.cast.filter(actor => 
        new RegExp(searchQuery, 'i').test(actor.name || '')
      );
    }
    
    return (
      <Link href={path} key={item._id}>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/4 relative">
              <Image
                src={coverImage}
                alt={title}
                width={300}
                height={200}
                className="w-full h-48 md:h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm flex items-center">
                {icon}
                <span>{item.category || type}</span>
              </div>
              
              {/* Cast match badge */}
              {hasMatchInCast && (
                <div className="absolute top-2 right-2 bg-pink-500/80 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                  Cast Match
                </div>
              )}
            </div>
            <div className="flex-1 p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                <HighlightedText text={title} searchQuery={searchQuery} />
              </h3>
              <p className="text-gray-500 text-sm line-clamp-3 mb-3">
                <HighlightedText text={cleanContent} searchQuery={searchQuery} />
              </p>
              
              {/* Show matching cast members */}
              {matchingCastMembers.length > 0 && (
                <div className="mb-3 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600 mb-1">Cast:</p>
                  {matchingCastMembers.slice(0, 3).map((actor, idx) => (
                    <div key={idx} className="flex items-center text-sm mb-1">
                      <span className="font-medium text-pink-600">
                        <HighlightedText text={actor.name} searchQuery={searchQuery} />
                      </span>
                      {actor.role && (
                        <span className="text-xs text-gray-500 ml-1">
                          as {actor.role}
                        </span>
                      )}
                    </div>
                  ))}
                  {matchingCastMembers.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{matchingCastMembers.length - 3} more
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <Clock size={14} className="mr-1" />
                  <span>{date}</span>
                </div>
                {viewCount > 0 && (
                  <div className="flex items-center">
                    <Eye size={14} className="mr-1" />
                    <span>{viewCount.toLocaleString()} views</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
      {results.map(viewMode === 'grid' ? renderGridItem : renderListItem)}
    </div>
  );
};

export default SearchResults; 