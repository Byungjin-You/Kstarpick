import Image from 'next/image';
import { useState } from 'react';

const NewsCard = ({ news }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // 이미지 로드 실패 시 기본 이미지로 대체
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // 안전한 이미지 URL (이미 프록시 URL로 저장됨)
  const imageUrl = imageError ? '/images/default-news.jpg' : (news.featuredImage || '/images/default-news.jpg');

  return (
    <div className="news-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* 이미지 섹션 */}
      <div className="relative w-full h-48 bg-gray-200">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        <Image
          src={imageUrl}
          alt={news.title}
          fill
          className={`object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
        />
        
        {/* 카테고리 배지 */}
        {news.category && (
          <div className="absolute top-2 left-2">
            <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
              {news.category}
            </span>
          </div>
        )}
      </div>

      {/* 콘텐츠 섹션 */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2 line-clamp-2 transition-colors">
          <a href={`/news/${news.slug || news._id}`} className="no-underline">
            {news.title}
          </a>
        </h3>
        
        {news.content && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-3">
            {news.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
          </p>
        )}
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{news.author || 'Soompi'}</span>
          <span>{new Date(news.publishedAt).toLocaleDateString()}</span>
        </div>
        
        {/* 통계 */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
          <span>👁 {news.views || 0}</span>
          <span>❤️ {news.likes || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default NewsCard; 