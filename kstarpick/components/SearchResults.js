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


  // Save scroll position before navigation
  const handleLinkClick = () => {
    if (typeof window !== 'undefined') {
      const scrollPosition = document.body.scrollTop || window.pageYOffset || document.documentElement.scrollTop;
      sessionStorage.setItem('searchScrollPosition', scrollPosition.toString());
      sessionStorage.setItem('isBackToSearch', 'true');
    }
  };

  // 그리드 뷰 아이템 렌더링 - CardNews와 완전히 동일한 디자인
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
      <Link href={path} key={item._id} onClick={handleLinkClick}>
        <div className="block cursor-pointer">
          <div className="bg-white rounded-lg overflow-hidden transition-all duration-300 group relative">
            <div className="h-64 overflow-hidden relative rounded-md">
              {/* 이미지 */}
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/images/placeholder.jpg";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span>Image Placeholder</span>
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="font-bold text-gray-800 text-xl md:text-2xl mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-[#006fff] transition-colors">
                {title}
              </h3>

              <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                {cleanContent && cleanContent.trim()
                  ? cleanContent.slice(0, 120) + '...'
                  : rawContent
                    ? rawContent.slice(0, 120) + '...'
                    : 'No content available'}
              </p>

              {/* Show matching cast members */}
              {matchingCastMembers.length > 0 && (
                <div className="mb-3 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600 mb-1">Cast:</p>
                  {matchingCastMembers.slice(0, 2).map((actor, idx) => (
                    <div key={idx} className="flex items-center text-sm mb-1">
                      <span className="font-medium text-pink-600">
                        {actor.name}
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

              <div className="flex items-center text-gray-500 text-xs">
                <Clock size={12} className="mr-1 text-gray-500" />
                <span>{date ? new Date(date).toLocaleDateString() : 'Unknown date'}</span>
              </div>
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
      <Link href={path} key={item._id} onClick={handleLinkClick}>
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
                {title}
              </h3>
              <p className="text-gray-500 text-sm line-clamp-3 mb-3">
                {cleanContent}
              </p>
              
              {/* Show matching cast members */}
              {matchingCastMembers.length > 0 && (
                <div className="mb-3 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600 mb-1">Cast:</p>
                  {matchingCastMembers.slice(0, 3).map((actor, idx) => (
                    <div key={idx} className="flex items-center text-sm mb-1">
                      <span className="font-medium text-pink-600">
                        {actor.name}
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