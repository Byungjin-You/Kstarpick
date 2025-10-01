import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

const LazyImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = '/images/placeholder.jpg',
  priority = false,
  quality = 85,
  sizes,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // priority가 true이면 즉시 로딩
  const imgRef = useRef(null);

  // Intersection Observer를 이용한 레이지 로딩
  useEffect(() => {
    // 서버 사이드에서는 실행하지 않음
    if (typeof window === 'undefined') return;

    if (priority) {
      setIsInView(true);
      return;
    }

    // Intersection Observer 지원 여부 확인
    if (!('IntersectionObserver' in window)) {
      // 지원하지 않는 경우 즉시 로딩
      setIsInView(true);
      return;
    }

    let observer;
    
    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        {
          rootMargin: '50px', // 뷰포트보다 50px 전에 로딩 시작
          threshold: 0.1
        }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }
    } catch (error) {
      console.warn('Intersection Observer error:', error);
      setIsInView(true); // 오류 발생 시 즉시 로딩
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  // WebP 지원 여부 확인 및 최적화된 src 생성
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc || hasError) return placeholder;
    
    // 외부 이미지의 경우 - 우선 원본 사용 (프록시 API 이슈 방지)
    if (originalSrc.startsWith('http') && !originalSrc.includes('kstarpick.com')) {
      // 개발 환경에서는 원본 이미지 직접 사용
      if (process.env.NODE_ENV === 'development') {
        return originalSrc;
      }
      
      // 프로덕션에서는 프록시 시도하되, 오류 시 원본 사용
      try {
        return `/api/proxy/image?url=${encodeURIComponent(originalSrc)}&w=${width}&q=${quality}`;
      } catch (error) {
        console.warn('Proxy API error, using original source:', error);
        return originalSrc;
      }
    }
    
    return originalSrc;
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* 플레이스홀더 */}
      <div 
        className={`absolute inset-0 bg-gray-200 animate-pulse transition-opacity duration-300 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* 실제 이미지 */}
      {isInView && (
        <Image
          src={getOptimizedSrc(src)}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          priority={priority}
          quality={quality}
          sizes={sizes || `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw`}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          {...props}
        />
      )}
      
      {/* 에러 상태 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">이미지 로드 실패</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyImage; 