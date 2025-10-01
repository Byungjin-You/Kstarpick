import { useState } from 'react';
import Link from 'next/link';
import { Instagram, Twitter, Youtube, Music, Star, ChevronRight, Heart, ExternalLink, Users, Hash } from 'lucide-react';

// 소셜 미디어 아이콘 매핑
const SocialIconMap = {
  instagram: <Instagram className="text-pink-500" size={14} />,
  twitter: <Twitter className="text-blue-400" size={14} />,
  youtube: <Youtube className="text-red-500" size={14} />,
  spotify: <Music className="text-green-500" size={14} />,
  tiktok: <Hash className="text-black" size={14} />
};

export default function FeaturedCelebrities({ celebrities = [] }) {
  // 이미지 에러 핸들러
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/images/placeholder.jpg';
  };
  
  // 팔로워 수 포맷팅
  const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };
  
  // 가장 많은 팔로워를 가진 플랫폼 찾기
  const getTopPlatform = (socialMediaFollowers) => {
    if (!socialMediaFollowers) return { platform: null, count: 0 };
    
    const platforms = Object.entries(socialMediaFollowers);
    if (platforms.length === 0) return { platform: null, count: 0 };
    
    return platforms.reduce((max, [platform, count]) => 
      count > max.count ? { platform, count } : max, 
      { platform: platforms[0][0], count: platforms[0][1] }
    );
  };

  // 소셜 미디어 링크 핸들러
  const handleSocialLinkClick = (e, url) => {
    e.preventDefault();
    e.stopPropagation();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  
  if (!celebrities || celebrities.length === 0) {
    return (
      <div className="my-8">
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <div className="h-1 w-12 bg-gradient-to-r from-pink-300 to-pink-400 rounded-full mr-3"></div>
            <Star size={22} className="text-[#ff3e8e] mr-3" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] text-transparent bg-clip-text mb-2">
            Featured K-POP Celebrities
          </h2>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="text-gray-400 mb-3">
            <Users size={40} className="mx-auto opacity-50" />
          </div>
          <p className="text-gray-500">No celebrities found</p>
        </div>
      </div>
    );
  }
  
  return (
    <section className="my-8">
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div className="h-1 w-12 bg-gradient-to-r from-pink-300 to-pink-400 rounded-full mr-3"></div>
          <Star size={22} className="text-[#ff3e8e] mr-3" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-[#ff3e8e] to-[#ff8360] text-transparent bg-clip-text mb-2">
          Featured K-POP Celebrities
        </h2>
        <p className="text-gray-500 max-w-lg">
          Popular K-POP artists and their social media stats
        </p>
      </div>
      
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6">
          {celebrities.map((celeb) => {
            const topPlatform = getTopPlatform(celeb.socialMediaFollowers);
            const isSolo = celeb.category === 'solo';
            
            return (
              <Link key={celeb._id} href={`/celeb/${celeb.slug}`} className="block group">
                <div className="relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 h-full">
                  {/* Image */}
                  <div className="aspect-square relative overflow-hidden">
                    <img 
                      src={celeb.profileImage} 
                      alt={celeb.name}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                      onError={handleImageError}
                    />
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Category badge */}
                    <div className="absolute top-2 left-2">
                      <div className={`px-2 py-0.5 rounded-full text-xs text-white font-medium ${
                        isSolo ? 'bg-pink-500' : 'bg-purple-500'
                      }`}>
                        {isSolo ? 'Solo' : 'Group'}
                      </div>
                    </div>
                    
                    {/* Hover detail button */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <div className="flex justify-between items-center">
                        {celeb.agency && (
                          <span className="text-white text-xs">{celeb.agency}</span>
                        )}
                        <span className="text-white bg-[#ff3e8e]/80 hover:bg-[#ff3e8e] px-2 py-1 rounded text-xs font-medium flex items-center">
                          Details <ExternalLink size={10} className="ml-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-bold text-gray-800 group-hover:text-[#ff3e8e] transition-colors line-clamp-1">
                      {celeb.name}
                    </h3>
                    
                    {/* Social media followers */}
                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                      {celeb.socialMediaFollowers && Object.entries(celeb.socialMediaFollowers).map(([platform, count]) => (
                        count && SocialIconMap[platform] ? (
                          <div 
                            key={platform}
                            className="flex items-center space-x-1 text-xs cursor-pointer hover:text-[#ff3e8e]"
                            onClick={(e) => handleSocialLinkClick(e, celeb.socialMedia && celeb.socialMedia[platform])}
                          >
                            {SocialIconMap[platform]}
                            <span className="text-gray-600 font-medium">
                              {formatFollowers(count)}
                            </span>
                          </div>
                        ) : null
                      ))}
                    </div>
                    
                    {/* Social Media Links */}
                    {celeb.socialMedia && Object.keys(celeb.socialMedia).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(celeb.socialMedia).map(([platform, url]) => (
                          SocialIconMap[platform] && url ? (
                            <button 
                              key={platform}
                              className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                              onClick={(e) => handleSocialLinkClick(e, url)}
                              title={`Visit ${platform}`}
                            >
                              {SocialIconMap[platform]}
                            </button>
                          ) : null
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Like button */}
                  <button 
                    className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.preventDefault();
                      // 좋아요 기능 추가 예정
                    }}
                  >
                    <Heart size={14} className="text-gray-600 hover:text-[#ff3e8e]" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
} 