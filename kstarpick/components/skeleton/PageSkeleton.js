import React from 'react';

// 기본 스켈레톤 아이템
const SkeletonItem = ({ className = "", animate = true }) => (
  <div className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 ${animate ? 'animate-pulse' : ''} ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
  </div>
);

// 드라마 페이지 스켈레톤
export const DramaSkeleton = () => (
  <div className="container mx-auto px-4 py-12">
    {/* 헤더 스켈레톤 */}
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <SkeletonItem className="h-6 w-16 rounded-full mr-3" />
        <SkeletonItem className="h-8 w-48 rounded-md" />
      </div>
      <SkeletonItem className="h-4 w-96 rounded-md" />
    </div>
    
    {/* 드라마 카드 그리드 스켈레톤 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-md">
          <SkeletonItem className="h-80 w-full" />
          <div className="p-4">
            <SkeletonItem className="h-6 w-3/4 rounded-md mb-2" />
            <div className="flex gap-1 mb-2">
              <SkeletonItem className="h-5 w-16 rounded-full" />
              <SkeletonItem className="h-5 w-16 rounded-full" />
            </div>
            <SkeletonItem className="h-4 w-full rounded-md mb-1" />
            <SkeletonItem className="h-4 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 뉴스 페이지 스켈레톤
export const NewsSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* 헤더 스켈레톤 */}
    <div className="mb-8">
      <SkeletonItem className="h-8 w-64 rounded-md mb-4" />
      <SkeletonItem className="h-4 w-96 rounded-md" />
    </div>
    
    {/* 뉴스 카드 그리드 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl overflow-hidden shadow-md">
          <SkeletonItem className="h-48 w-full" />
          <div className="p-4">
            <SkeletonItem className="h-6 w-3/4 rounded-md mb-3" />
            <SkeletonItem className="h-4 w-full rounded-md mb-2" />
            <SkeletonItem className="h-4 w-2/3 rounded-md mb-3" />
            <div className="flex items-center justify-between">
              <SkeletonItem className="h-4 w-20 rounded-md" />
              <SkeletonItem className="h-4 w-16 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 셀럽 페이지 스켈레톤
export const CelebSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* 헤더 스켈레톤 */}
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <SkeletonItem className="h-6 w-16 rounded-full mr-3" />
        <SkeletonItem className="h-8 w-48 rounded-md" />
      </div>
      <SkeletonItem className="h-4 w-96 rounded-md" />
    </div>
    
    {/* 셀럽 카드 그리드 */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl overflow-hidden shadow-md">
          <SkeletonItem className="aspect-square w-full" />
          <div className="p-3">
            <SkeletonItem className="h-5 w-full rounded-md mb-2" />
            <SkeletonItem className="h-4 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 뮤직 페이지 스켈레톤
export const MusicSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* 헤더 스켈레톤 */}
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <SkeletonItem className="h-6 w-16 rounded-full mr-3" />
        <SkeletonItem className="h-8 w-48 rounded-md" />
      </div>
      <SkeletonItem className="h-4 w-96 rounded-md" />
    </div>
    
    {/* 음악 차트 스켈레톤 */}
    <div className="bg-white rounded-xl p-6 shadow-md mb-8">
      <SkeletonItem className="h-6 w-32 rounded-md mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <SkeletonItem className="h-12 w-12 rounded-lg" />
            <div className="flex-1">
              <SkeletonItem className="h-5 w-3/4 rounded-md mb-1" />
              <SkeletonItem className="h-4 w-1/2 rounded-md" />
            </div>
            <SkeletonItem className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// TV/Film 페이지 스켈레톤
export const TVFilmSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* 헤더 스켈레톤 */}
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <SkeletonItem className="h-6 w-16 rounded-full mr-3" />
        <SkeletonItem className="h-8 w-48 rounded-md" />
      </div>
      <SkeletonItem className="h-4 w-96 rounded-md" />
    </div>
    
    {/* 영화 카드 그리드 */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl overflow-hidden shadow-md">
          <SkeletonItem className="h-72 w-full" />
          <div className="p-4">
            <SkeletonItem className="h-6 w-3/4 rounded-md mb-2" />
            <SkeletonItem className="h-4 w-full rounded-md mb-1" />
            <SkeletonItem className="h-4 w-2/3 rounded-md mb-3" />
            <div className="flex items-center justify-between">
              <SkeletonItem className="h-4 w-16 rounded-md" />
              <SkeletonItem className="h-4 w-12 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// 랭킹 페이지 스켈레톤
export const RankingSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* 헤더 스켈레톤 */}
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <SkeletonItem className="h-6 w-16 rounded-full mr-3" />
        <SkeletonItem className="h-8 w-48 rounded-md" />
      </div>
      <SkeletonItem className="h-4 w-96 rounded-md" />
    </div>
    
    {/* 탭 스켈레톤 */}
    <div className="flex gap-4 mb-8">
      <SkeletonItem className="h-10 w-20 rounded-full" />
      <SkeletonItem className="h-10 w-20 rounded-full" />
      <SkeletonItem className="h-10 w-20 rounded-full" />
    </div>
    
    {/* 랭킹 리스트 스켈레톤 */}
    <div className="space-y-4">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl p-4 shadow-md flex items-center gap-4">
          <SkeletonItem className="h-8 w-8 rounded-full" />
          <SkeletonItem className="h-16 w-16 rounded-lg" />
          <div className="flex-1">
            <SkeletonItem className="h-6 w-3/4 rounded-md mb-2" />
            <SkeletonItem className="h-4 w-1/2 rounded-md" />
          </div>
          <SkeletonItem className="h-4 w-16 rounded-md" />
        </div>
      ))}
    </div>
  </div>
);

// 뉴스 상세 페이지 스켈레톤
export const NewsDetailSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* 브레드크럼 스켈레톤 */}
    <div className="flex items-center gap-2 mb-6">
      <SkeletonItem className="h-4 w-12 rounded-md" />
      <span className="text-gray-400">&gt;</span>
      <SkeletonItem className="h-4 w-16 rounded-md" />
      <span className="text-gray-400">&gt;</span>
      <SkeletonItem className="h-4 w-24 rounded-md" />
    </div>
    
    {/* 메인 콘텐츠 스켈레톤 */}
    <div className="bg-white rounded-xl p-6 shadow-md">
      {/* 제목 */}
      <SkeletonItem className="h-8 w-full rounded-md mb-4" />
      <SkeletonItem className="h-8 w-3/4 rounded-md mb-6" />
      
      {/* 메타 정보 */}
      <div className="flex items-center gap-4 mb-6">
        <SkeletonItem className="h-4 w-20 rounded-md" />
        <SkeletonItem className="h-4 w-24 rounded-md" />
        <SkeletonItem className="h-4 w-16 rounded-md" />
      </div>
      
      {/* 이미지 */}
      <SkeletonItem className="h-64 w-full rounded-lg mb-6" />
      
      {/* 본문 */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonItem key={index} className="h-4 w-full rounded-md" />
        ))}
        <SkeletonItem className="h-4 w-2/3 rounded-md" />
      </div>
    </div>
  </div>
);

// 홈페이지 스켈레톤
export const HomeSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    {/* 히어로 섹션 스켈레톤 */}
    <div className="mb-16">
      <SkeletonItem className="h-64 w-full rounded-2xl" />
    </div>
    
    {/* Featured News 스켈레톤 */}
    <div className="mb-12">
      <SkeletonItem className="h-8 w-48 rounded-md mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-xl overflow-hidden shadow-md">
            <SkeletonItem className="h-48 w-full" />
            <div className="p-4">
              <SkeletonItem className="h-6 w-3/4 rounded-md mb-2" />
              <SkeletonItem className="h-4 w-full rounded-md mb-1" />
              <SkeletonItem className="h-4 w-2/3 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 통합 페이지 스켈레톤 (페이지 타입에 따라 자동 선택)
export const PageSkeleton = ({ type = 'default' }) => {
  switch (type) {
    case 'drama':
      return <DramaSkeleton />;
    case 'news':
      return <NewsSkeleton />;
    case 'celeb':
      return <CelebSkeleton />;
    case 'music':
      return <MusicSkeleton />;
    case 'tvfilm':
      return <TVFilmSkeleton />;
    case 'ranking':
      return <RankingSkeleton />;
    case 'news-detail':
      return <NewsDetailSkeleton />;
    case 'home':
      return <HomeSkeleton />;
    default:
      return <HomeSkeleton />;
  }
}; 