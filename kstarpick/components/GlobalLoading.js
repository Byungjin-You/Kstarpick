import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const GlobalLoading = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleStart = (url) => {
      // 현재 페이지와 다른 페이지로 이동할 때만 로딩 표시
      if (url !== router.asPath) {
        setLoading(true);
      }
    };

    const handleComplete = () => {
      setLoading(false);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        {/* 로딩 애니메이션 */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#233CFA] animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-[#5a6eff] animate-reverse-spin"></div>
        </div>

        {/* 로딩 텍스트 */}
        <div className="text-center">
          <p className="text-lg font-medium text-gray-800 mb-1">Loading...</p>
        </div>

        {/* 진행 바 */}
        <div className="w-64 h-1 bg-gray-200 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#233CFA] to-[#5a6eff] rounded-full animate-progress"></div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes reverse-spin {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        .animate-reverse-spin {
          animation: reverse-spin 1s linear infinite;
        }
        
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default GlobalLoading; 