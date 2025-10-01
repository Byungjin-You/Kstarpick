import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, Zap, Users, Eye, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const SeoMonitoring = ({ showDetails = false }) => {
  const [metrics, setMetrics] = useState({
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    fcp: null
  });

  const [seoChecks, setSeoChecks] = useState({
    title: false,
    description: false,
    h1: false,
    images: false,
    structuredData: false
  });

  useEffect(() => {
    // 브라우저 환경에서만 실행
    if (typeof window === 'undefined') return;

    // Core Web Vitals 측정
    const measureWebVitals = () => {
      // LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            setMetrics(prev => ({ ...prev, lcp: Math.round(lastEntry.startTime) }));
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // FID (First Input Delay)
          const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const fid = entry.processingStart - entry.startTime;
              setMetrics(prev => ({ ...prev, fid: Math.round(fid) }));
            }
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // CLS (Cumulative Layout Shift)
          const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            setMetrics(prev => ({ ...prev, cls: Math.round(clsValue * 1000) / 1000 }));
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
          console.warn('Performance Observer not supported:', error);
        }
      }

      // Navigation Timing API를 사용한 추가 메트릭
      if (window.performance && window.performance.getEntriesByType) {
        try {
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            const ttfb = navigation.responseStart - navigation.requestStart;
            const fcp = navigation.loadEventEnd - navigation.navigationStart;
            
            setMetrics(prev => ({
              ...prev,
              ttfb: Math.round(ttfb),
              fcp: Math.round(fcp)
            }));
          }
        } catch (error) {
          console.warn('Navigation Timing API error:', error);
        }
      }
    };

    // SEO 기본 요소 체크
    const checkSeoElements = () => {
      if (typeof document === 'undefined') return;

      try {
        const checks = {
          title: !!document.querySelector('title')?.textContent,
          description: !!document.querySelector('meta[name="description"]')?.content,
          h1: document.querySelectorAll('h1').length === 1,
          images: Array.from(document.querySelectorAll('img')).every(img => img.alt),
          structuredData: !!document.querySelector('script[type="application/ld+json"]')
        };
        setSeoChecks(checks);
      } catch (error) {
        console.warn('SEO check error:', error);
      }
    };

    measureWebVitals();
    checkSeoElements();
  }, []);

  const getScoreColor = (metric, value) => {
    if (value === null) return 'text-gray-400';
    
    switch (metric) {
      case 'lcp':
        return value <= 2500 ? 'text-green-600' : value <= 4000 ? 'text-yellow-600' : 'text-red-600';
      case 'fid':
        return value <= 100 ? 'text-green-600' : value <= 300 ? 'text-yellow-600' : 'text-red-600';
      case 'cls':
        return value <= 0.1 ? 'text-green-600' : value <= 0.25 ? 'text-yellow-600' : 'text-red-600';
      case 'ttfb':
        return value <= 600 ? 'text-green-600' : value <= 1000 ? 'text-yellow-600' : 'text-red-600';
      case 'fcp':
        return value <= 1800 ? 'text-green-600' : value <= 3000 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatValue = (metric, value) => {
    if (value === null) return '측정 중...';
    
    switch (metric) {
      case 'lcp':
      case 'fid':
      case 'ttfb':
      case 'fcp':
        return `${value}ms`;
      case 'cls':
        return value.toFixed(3);
      default:
        return value;
    }
  };

  // 서버 사이드에서는 렌더링하지 않음
  if (typeof window === 'undefined') {
    return null;
  }

  // 프로덕션 환경에서는 showDetails가 true일 때만 표시
  if (process.env.NODE_ENV === 'production' && !showDetails) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-4 max-w-sm">
        <div className="flex items-center mb-3">
          <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="font-semibold text-gray-900">SEO 모니터링</h3>
        </div>

        {/* Core Web Vitals */}
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Core Web Vitals</h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>LCP:</span>
              <span className={getScoreColor('lcp', metrics.lcp)}>
                {formatValue('lcp', metrics.lcp)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>FID:</span>
              <span className={getScoreColor('fid', metrics.fid)}>
                {formatValue('fid', metrics.fid)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>CLS:</span>
              <span className={getScoreColor('cls', metrics.cls)}>
                {formatValue('cls', metrics.cls)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>TTFB:</span>
              <span className={getScoreColor('ttfb', metrics.ttfb)}>
                {formatValue('ttfb', metrics.ttfb)}
              </span>
            </div>
          </div>
        </div>

        {/* SEO 체크리스트 */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">SEO 체크</h4>
          
          <div className="space-y-1 text-xs">
            {Object.entries(seoChecks).map(([key, passed]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="capitalize">{key}:</span>
                {passed ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 점수 요약 */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span>전체 점수:</span>
            <span className="font-semibold text-blue-600">
              {Math.round((Object.values(seoChecks).filter(Boolean).length / Object.keys(seoChecks).length) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeoMonitoring; 