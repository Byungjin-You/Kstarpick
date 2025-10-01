import dynamic from 'next/dynamic';
import { PageSkeleton } from './skeleton/PageSkeleton';

// 페이지별 지연 로딩 컴포넌트들
export const LazyRecommendedNews = dynamic(
  () => import('./RecommendedNews'),
  {
    ssr: false,
    loading: () => (
      <div className="py-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
        <p className="mt-2 text-gray-500">Loading recommended news...</p>
      </div>
    ),
  }
);

export const LazyMoreNews = dynamic(
  () => import('./MoreNews'),
  {
    ssr: false,
    loading: () => (
      <div className="py-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
        <p className="mt-2 text-gray-500">Loading more news...</p>
      </div>
    ),
  }
);

export const LazyCardNews = dynamic(
  () => import('./CardNews'),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-xl overflow-hidden shadow-md animate-pulse">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-4">
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    ),
  }
);

export const LazyLoadingSpinner = dynamic(
  () => import('./LoadingSpinner'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    ),
  }
);

// 관리자 페이지 컴포넌트들 (필요할 때만 로드)
export const LazyAdminLayout = dynamic(
  () => import('./admin/AdminLayout'),
  {
    ssr: false,
    loading: () => <PageSkeleton type="default" />,
  }
);

export const LazyEditor = dynamic(
  () => import('./Editor'),
  {
    ssr: false,
    loading: () => (
      <div className="border rounded-lg p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    ),
  }
);

// 차트 라이브러리 (필요할 때만 로드)
export const LazyChart = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Chart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center animate-pulse">
        <div className="text-gray-500">Loading chart...</div>
      </div>
    ),
  }
);

// Swiper 컴포넌트 (필요할 때만 로드)
export const LazySwiper = dynamic(
  () => import('swiper/react').then(mod => ({ default: mod.Swiper })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
    ),
  }
);

export const LazySwiperSlide = dynamic(
  () => import('swiper/react').then(mod => ({ default: mod.SwiperSlide })),
  {
    ssr: false,
  }
); 