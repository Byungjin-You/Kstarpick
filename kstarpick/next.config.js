require('dotenv').config({ path: '.env.production' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // 성능 최적화 설정
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 번들 분석기 설정
  webpack: (config, { isServer }) => {
    // 클라이언트 사이드 번들 크기 최적화
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Webpack 설정 수정
    config.optimization.usedExports = false;
    return config;
  },
  
  // 이미지 최적화 설정
  images: {
    domains: [
      'kstarpick.com',
      '43.202.38.79',
      'www.soompi.com',
      '0.soompi.io',
      'image.tmdb.org',
      'mydramalist.com',
      'i.mydramalist.com',
      'img.youtube.com',
      'i.ytimg.com',
      'via.placeholder.com',
      'i.imgur.com',
      'images.unsplash.com',
      'loremflickr.com',
      'picsum.photos',
      'upload.wikimedia.org',
      'wikimedia.org',
      'images.justwatch.com',
      'www.tving.com',
      'www.wavve.com',
      'www.google.com',
      'watcha.com',
      'tv.apple.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.justwatch.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'kstarpick.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 24시간 캐시
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: false, // 이미지 최적화 활성화
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.instagram.com https://platform.twitter.com https://www.riddle.com https://cdn.riddle.com; frame-src 'self' https://www.instagram.com https://platform.twitter.com https://www.riddle.com; connect-src 'self' https://www.riddle.com https://cdn.riddle.com; object-src 'none'; style-src 'self' 'unsafe-inline';",
  },
  
  experimental: {
    scrollRestoration: true,
    optimizePackageImports: ['lucide-react', 'swiper'],
    serverComponentsExternalPackages: ['mongoose'],
    // 정적 생성 최적화
    staticPageGenerationTimeout: 120,
    // 메모리 사용량 최적화
    workerThreads: false,
    cpus: 1,
  },
  
  // 압축 설정
  compress: true,
  
  // 파워드 바이 헤더 제거
  poweredByHeader: false,
  
  // 정적 파일 캐싱
  async headers() {
    return [
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/((?!_next|images|api).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    MYSQL_HOST: process.env.MYSQL_HOST,
    MYSQL_PORT: process.env.MYSQL_PORT,
    MYSQL_DATABASE: process.env.MYSQL_DATABASE,
    MYSQL_USER: process.env.MYSQL_USER,
    MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    ADMIN_KEY: process.env.ADMIN_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },

  async redirects() {
    return [
      // 기존 URL에서 새 URL로 리다이렉트 (SEO 점수 유지)
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      // API 프록시 설정
      {
        source: '/api/proxy/:path*',
        destination: '/:path*',
      },
    ];
  },

  // 트레일링 슬래시 제거 (중복 URL 방지)
  trailingSlash: false,
  
  // 빌드 최적화
  optimizeFonts: true,
  
  // SSG에서 제외할 경로 (어드민 페이지는 서버 사이드 렌더링만 사용)
  async generateBuildId() {
    return 'kstarpick-build-' + Date.now()
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 