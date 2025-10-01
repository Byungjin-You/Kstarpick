import React, { useEffect, useState } from 'react';
import { Smartphone, Wifi, Battery, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const MobileOptimization = () => {
  const [mobileChecks, setMobileChecks] = useState({
    viewport: false,
    touchTargets: false,
    textSize: false,
    contentWidth: false,
    webpSupport: false,
    connectionType: 'unknown'
  });

  useEffect(() => {
    // 브라우저 환경에서만 실행
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const checkMobileOptimization = () => {
      try {
        // 뷰포트 메타 태그 확인
        const viewport = document.querySelector('meta[name="viewport"]');
        const hasViewport = !!viewport && viewport.content.includes('width=device-width');

        // 터치 타겟 크기 확인 (최소 44px)
        const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
        const adequateTouchTargets = Array.from(buttons).every(btn => {
          const rect = btn.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        });

        // 텍스트 크기 확인 (최소 16px)
        const textElements = document.querySelectorAll('p, span, div, li');
        const adequateTextSize = Array.from(textElements).every(el => {
          const fontSize = window.getComputedStyle(el).fontSize;
          return parseFloat(fontSize) >= 16;
        });

        // 콘텐츠 너비 확인
        const body = document.body;
        const hasHorizontalScroll = body.scrollWidth > window.innerWidth;

        // WebP 지원 확인
        let webpSupport = false;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        } catch (error) {
          console.warn('Canvas WebP check failed:', error);
        }

        // 네트워크 연결 타입 확인 (Network Information API)
        let connectionType = 'unknown';
        try {
          const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
          connectionType = connection ? connection.effectiveType : 'unknown';
        } catch (error) {
          console.warn('Network Information API not supported:', error);
        }

        setMobileChecks({
          viewport: hasViewport,
          touchTargets: adequateTouchTargets,
          textSize: adequateTextSize,
          contentWidth: !hasHorizontalScroll,
          webpSupport,
          connectionType
        });
      } catch (error) {
        console.warn('Mobile optimization check error:', error);
      }
    };

    // 페이지 로드 완료 후 검사
    if (document.readyState === 'complete') {
      checkMobileOptimization();
    } else {
      const handleLoad = () => {
        checkMobileOptimization();
        window.removeEventListener('load', handleLoad);
      };
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  // 서버 사이드에서는 렌더링하지 않음
  if (typeof window === 'undefined') {
    return null;
  }

  const getCheckIcon = (passed) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getConnectionIcon = (type) => {
    switch (type) {
      case '4g':
        return <Wifi className="w-4 h-4 text-green-600" />;
      case '3g':
        return <Wifi className="w-4 h-4 text-yellow-600" />;
      case '2g':
      case 'slow-2g':
        return <Wifi className="w-4 h-4 text-red-600" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-600" />;
    }
  };

  const passedChecks = Object.values(mobileChecks).filter(check => 
    typeof check === 'boolean' ? check : true
  ).length;
  const totalChecks = Object.keys(mobileChecks).filter(key => key !== 'connectionType').length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center mb-4">
        <Smartphone className="w-5 h-5 text-blue-500 mr-2" />
        <h3 className="font-semibold text-gray-900">모바일 최적화</h3>
        <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-full ${
          score >= 80 ? 'bg-green-100 text-green-700' :
          score >= 60 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {score}%
        </span>
      </div>

      <div className="space-y-3">
        {/* 뷰포트 메타 태그 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">뷰포트 메타 태그</span>
          {getCheckIcon(mobileChecks.viewport)}
        </div>

        {/* 터치 타겟 크기 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">터치 타겟 크기 (44px+)</span>
          {getCheckIcon(mobileChecks.touchTargets)}
        </div>

        {/* 텍스트 크기 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">텍스트 크기 (16px+)</span>
          {getCheckIcon(mobileChecks.textSize)}
        </div>

        {/* 콘텐츠 너비 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">가로 스크롤 없음</span>
          {getCheckIcon(mobileChecks.contentWidth)}
        </div>

        {/* WebP 지원 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">WebP 지원</span>
          {getCheckIcon(mobileChecks.webpSupport)}
        </div>

        {/* 네트워크 연결 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">네트워크 연결</span>
          <div className="flex items-center">
            {getConnectionIcon(mobileChecks.connectionType)}
            <span className="ml-2 text-xs text-gray-500 uppercase">
              {mobileChecks.connectionType}
            </span>
          </div>
        </div>
      </div>

      {/* 개선 제안 */}
      {score < 100 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">개선 제안</span>
          </div>
          <ul className="text-xs text-blue-800 space-y-1">
            {!mobileChecks.viewport && (
              <li>• 뷰포트 메타 태그를 추가하세요: &lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</li>
            )}
            {!mobileChecks.touchTargets && (
              <li>• 버튼과 링크의 최소 크기를 44px 이상으로 설정하세요</li>
            )}
            {!mobileChecks.textSize && (
              <li>• 본문 텍스트 크기를 16px 이상으로 설정하세요</li>
            )}
            {!mobileChecks.contentWidth && (
              <li>• 가로 스크롤이 발생하지 않도록 레이아웃을 조정하세요</li>
            )}
            {!mobileChecks.webpSupport && (
              <li>• 이미지 최적화를 위해 WebP 포맷을 사용하세요</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MobileOptimization; 