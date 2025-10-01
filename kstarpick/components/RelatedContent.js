import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, TrendingUp, ArrowRight } from 'lucide-react';

const RelatedContent = ({ 
  items = [], 
  title = "관련 콘텐츠", 
  type = "news", 
  maxItems = 4 
}) => {
  if (!items || items.length === 0) return null;

  const displayItems = items.slice(0, maxItems);

  const getItemUrl = (item) => {
    switch (type) {
      case 'news':
        return `/news/${item.slug || item._id}`;
      case 'drama':
        return `/drama/${item._id}`;
      case 'tvfilm':
        return `/tvfilm/${item._id}`;
      case 'celeb':
        return `/celeb/${item.slug || item._id}`;
      case 'music':
        return `/music/${item._id}`;
      default:
        return `/${type}/${item._id}`;
    }
  };

  const getItemImage = (item) => {
    switch (type) {
      case 'news':
        return item.featuredImage || item.coverImage || '/images/default-news.jpg';
      case 'drama':
        return item.coverImage || item.posterImage || '/images/dramas/default-poster.jpg';
      case 'tvfilm':
        return item.coverImage || item.bannerImage || '/images/default-tvfilm-cover.jpg';
      case 'celeb':
        return item.profileImage || item.image || '/images/default-avatar.png';
      case 'music':
        return item.coverImage || item.albumArt || '/images/default-thumbnail.jpg';
      default:
        return item.image || '/images/placeholder.jpg';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
          {title}
        </h3>
        {items.length > maxItems && (
          <Link 
            href={`/${type}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
          >
            더보기
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        )}
      </div>

      <div className="grid gap-4">
        {displayItems.map((item, index) => (
          <Link 
            key={item._id || index}
            href={getItemUrl(item)}
            className="group flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <Image
                  src={getItemImage(item)}
                  alt={item.title || item.name || '제목 없음'}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.target.src = '/images/placeholder.jpg';
                  }}
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                {item.title || item.name || '제목 없음'}
              </h4>
              
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {item.createdAt && (
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDate(item.createdAt)}
                  </span>
                )}
                
                {item.views && (
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {item.views.toLocaleString()}
                  </span>
                )}
                
                {item.category && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {item.category}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 구조화 데이터를 위한 JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": title,
            "numberOfItems": displayItems.length,
            "itemListElement": displayItems.map((item, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": type === 'news' ? "NewsArticle" : "Thing",
                "name": item.title || item.name,
                "url": `https://kstarpick.com${getItemUrl(item)}`,
                "image": getItemImage(item)
              }
            }))
          })
        }}
      />
    </div>
  );
};

export default RelatedContent; 