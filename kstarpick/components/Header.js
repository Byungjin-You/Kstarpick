import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Search, Menu, X, Loader2 } from 'lucide-react';
import Logo from './Logo';

const Header = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchInputRef = useRef(null);

  // Initialize client-side state after mounting to avoid hydration mismatch
  useEffect(() => {
    // Mark component as mounted on client-side
    setIsMounted(true);
    
    // Check if mobile
    setIsMobile(window.innerWidth < 768);
    
    // Set default recent searches
    setRecentSearches([
      'BTS',
      'Blackpink',
      'NewJeans',
      'Drama Recommendations'
    ]);

    // Handle scroll events to add shadow when scrolled
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    // Handle resize events
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      
      // Close mobile menu when window is resized to desktop size
      if (window.innerWidth >= 1024 && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    // Keyboard shortcut for search
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    
    // Add event listeners (only on client-side)
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen, isSearchOpen]); // Include dependencies for the cleanup functions

  // 페이지 변경 시 메뉴 닫기 (스크롤 관리는 _app.js에서 처리)
  useEffect(() => {
    const handleRouteChange = (url) => {
      // 메뉴가 열려있으면 닫기
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, isMenuOpen]);

  // 같은 메뉴 클릭 처리 함수
  const handleSameMenuClick = (e) => {
    if (typeof window !== 'undefined') {
      // 세션 스토리지 키 정의
      const STORAGE_KEYS = {
        NEWS_DATA: 'moreNewsData',
        NEWS_PAGE: 'moreNewsPage',
        GLOBAL_ID_SET: 'moreNewsLoadedIds',
        SCROLL_POS: 'moreNewsScrollPos',
        BACK_NAVIGATION: 'wasBackNavigation'
      };
      
      // 모든 관련 스토리지 항목 제거
      sessionStorage.removeItem(STORAGE_KEYS.NEWS_DATA);
      sessionStorage.removeItem(STORAGE_KEYS.NEWS_PAGE);
      sessionStorage.removeItem(STORAGE_KEYS.GLOBAL_ID_SET);
      sessionStorage.removeItem(STORAGE_KEYS.SCROLL_POS);
      sessionStorage.removeItem(STORAGE_KEYS.BACK_NAVIGATION);
      
      // 명시적인 초기화 표시를 위한 플래그 설정
      sessionStorage.setItem('logoClicked', 'true');
      
      // 쿨다운 플래그 초기화
      window._newsLoadCooldown = false;
      window._forceNextLoad = false;
      
      // 전역 상태 초기화
      window._loadedNewsIds = new Set();
      
      // 스크롤 초기화
      window.scrollTo(0, 0);
      
      console.log('[Header] 같은 메뉴 클릭 - 세션 스토리지 초기화 및 플래그 설정');
      
      // 현재 경로로 이동 (URL 파라미터 없이)
      window.location.href = window.location.pathname;
    }
  };
  
  // 모바일 메뉴 버튼에서 같은 경로 클릭 처리
  const handleMobileMenuClick = (path) => {
    if (router.pathname === path) {
      // 같은 경로면 세션 스토리지 초기화 및 새로고침
      // 세션 스토리지 키 정의
      const STORAGE_KEYS = {
        NEWS_DATA: 'moreNewsData',
        NEWS_PAGE: 'moreNewsPage',
        GLOBAL_ID_SET: 'moreNewsLoadedIds',
        SCROLL_POS: 'moreNewsScrollPos',
        BACK_NAVIGATION: 'wasBackNavigation'
      };
      
      // 모든 관련 스토리지 항목 제거
      sessionStorage.removeItem(STORAGE_KEYS.NEWS_DATA);
      sessionStorage.removeItem(STORAGE_KEYS.NEWS_PAGE);
      sessionStorage.removeItem(STORAGE_KEYS.GLOBAL_ID_SET);
      sessionStorage.removeItem(STORAGE_KEYS.SCROLL_POS);
      sessionStorage.removeItem(STORAGE_KEYS.BACK_NAVIGATION);
      
      // 현재 경로로 이동 (URL 파라미터 없이)
      window.location.href = path;
    } else {
      // 다른 경로면 일반 이동
      router.push(path);
      toggleMenu();
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isSearchOpen) setIsSearchOpen(false);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isMenuOpen) setIsMenuOpen(false);
    
    // Focus the search input when opening
    if (!isSearchOpen && isMounted) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      // Simulate searching
      setIsSearching(true);
      
      // Save to recent searches if it's not already there
      if (!recentSearches.includes(searchValue)) {
        setRecentSearches(prev => [searchValue, ...prev.slice(0, 3)]);
      }
      
      // Simulate a search delay to show the loading state
      setTimeout(() => {
        setIsSearching(false);
        router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
        setIsSearchOpen(false);
        setSearchValue('');
      }, 500);
    }
  };

  const handleRecentSearchClick = (term) => {
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setIsSearchOpen(false);
  };

  const clearSearch = () => {
    setSearchValue('');
    searchInputRef.current?.focus();
  };

  // Navigation items
  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/drama', label: 'Drama' },
    { path: '/tvfilm', label: 'TV/Film' },
    { path: '/music', label: 'Music' },
    { path: '/celeb', label: 'Celeb' },
    { path: '/ranking', label: 'Ranking' },
  ];

  // Render a simplified header during server-side rendering
  if (!isMounted) {
    return (
      <header className="fixed top-0 z-50 bg-white w-full">
        <div className="w-full border-b border-[#F3F4F6] lg:border-b-2 lg:border-ksp-border">
          <div className="max-w-[1772px] mx-auto px-4 lg:px-10">
            {/* Desktop SSR */}
            <div className="hidden lg:flex justify-between items-center h-[84px]">
              <div className="flex items-center">
                <div className="mr-6 flex-shrink-0">
                  <div className="block cursor-pointer"><Logo /></div>
                </div>
                <nav className="flex items-center h-full gap-8">
                  <div className="inline-flex items-center font-bold text-base text-ksp-accent cursor-pointer">HOME</div>
                  <div className="inline-flex items-center font-medium text-base text-[#333333] cursor-pointer">DRAMA</div>
                  <div className="inline-flex items-center font-medium text-base text-[#333333] cursor-pointer">TV/FILM</div>
                  <div className="inline-flex items-center font-medium text-base text-[#333333] cursor-pointer">MUSIC</div>
                  <div className="inline-flex items-center font-medium text-base text-[#333333] cursor-pointer">CELEB</div>
                  <div className="inline-flex items-center font-medium text-base text-[#333333] cursor-pointer">RANKING</div>
                </nav>
              </div>
              <div className="flex items-center h-full gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full text-[#4A5565]">
                  <Search size={18} strokeWidth={2} />
                </div>
                <div className="flex items-center justify-center px-3 py-2 bg-ksp-accent text-white font-bold text-sm rounded-[10px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Sign in
                </div>
              </div>
            </div>
            {/* Mobile SSR - single row */}
            <div className="lg:hidden relative flex items-center h-[48px]">
              <div className="flex-shrink-0">
                <div className="block cursor-pointer">
                  <img src="/images/k-logo-mobile.svg" alt="KstarPick" width={16} height={17} />
                </div>
              </div>
              <nav className="flex items-center gap-3 overflow-x-auto hide-scrollbar pl-3 flex-1 min-w-0 h-full">
                {navItems.map(item => (
                  <div key={item.path} className={`relative flex-shrink-0 flex items-center h-full text-[15px] ${item.path === '/' ? 'font-bold text-ksp-accent' : 'font-medium text-[#6A7282]'}`} style={{ letterSpacing: '-0.015em' }}>
                    {item.label}
                    {item.path === '/' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-ksp-accent" />}
                  </div>
                ))}
              </nav>
              <div className="absolute right-0 top-[5px] w-6 h-[38px] pointer-events-none" style={{ background: 'linear-gradient(270deg, white 0%, transparent 100%)' }} />
              <button className="p-1 flex-shrink-0 flex items-center justify-center text-[#6A7282] ml-1" aria-label="Search">
                <Search size={20} strokeWidth={1.67} />
              </button>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Full client-side rendering after mounting
  return (
    <header className="fixed top-0 z-50 bg-white w-full">
      {/* Top navigation bar */}
      <div
        className={`w-full border-b border-[#F3F4F6] lg:border-b-2 lg:border-ksp-border transition-shadow duration-300 ${
          isScrolled ? 'shadow-[0px_2px_8px_rgba(0,0,0,0.08)]' : ''
        }`}
      >
        <div className="max-w-[1772px] mx-auto px-4 lg:px-10">

          {/* === Desktop Layout (lg+) === */}
          <div className="hidden lg:flex justify-between items-center h-[84px]">
            <div className="flex items-center">
              <div className="mr-6 flex-shrink-0">
                <div onClick={(e) => {
                  e.preventDefault();
                  sessionStorage.clear();
                  window.location.href = '/';
                }} className="block cursor-pointer">
                  <Logo />
                </div>
              </div>
              <nav className="flex items-center h-full gap-8">
                {navItems.map(item => (
                  <Link key={item.path} href={item.path} className={`inline-flex items-center text-base hover:text-ksp-accent transition-colors duration-200 cursor-pointer ${
                    router.pathname === item.path ? 'text-ksp-accent font-bold' : 'text-[#333333] font-medium'
                  }`} style={{ fontFamily: "'Noto Sans', sans-serif" }} onClick={router.pathname === item.path ? handleSameMenuClick : undefined}>
                    {item.label.toUpperCase()}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center h-full gap-3">
              <button
                onClick={toggleSearch}
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                  isSearchOpen ? 'bg-gray-100 text-ksp-accent' : 'hover:bg-gray-100 text-[#4A5565]'
                }`}
                aria-label="Search"
              >
                <Search size={18} strokeWidth={2} />
              </button>
              <Link
                href="/auth/signin"
                className="flex items-center justify-center px-3 py-2 bg-ksp-accent text-white font-bold text-sm rounded-[10px] hover:opacity-90 transition-opacity"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.01em' }}
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* === Mobile Layout (below lg) - single row === */}
          <div className="lg:hidden relative flex items-center h-[48px]">
            {/* K Logo */}
            <div className="flex-shrink-0">
              <div onClick={(e) => {
                e.preventDefault();
                sessionStorage.clear();
                window.location.href = '/';
              }} className="block cursor-pointer">
                <img src="/images/k-logo-mobile.svg" alt="KstarPick" width={16} height={17} />
              </div>
            </div>
            {/* Horizontal scrollable tabs */}
            <nav className="flex items-center gap-3 overflow-x-auto hide-scrollbar pl-3 flex-1 min-w-0 h-full">
              {navItems.map(item => {
                const isActive = router.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`relative flex-shrink-0 flex items-center h-full text-[15px] transition-colors ${
                      isActive
                        ? 'font-bold text-ksp-accent'
                        : 'font-medium text-[#6A7282]'
                    }`}
                    style={{ fontFamily: "'Inter', 'Pretendard', sans-serif", letterSpacing: '-0.015em' }}
                    onClick={isActive ? handleSameMenuClick : undefined}
                  >
                    {item.label}
                    {isActive && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-ksp-accent" />}
                  </Link>
                );
              })}
            </nav>
            {/* Right edge fade */}
            <div className="absolute right-[36px] top-[5px] w-6 h-[38px] pointer-events-none" style={{ background: 'linear-gradient(270deg, white 0%, transparent 100%)' }} />
            {/* Search icon */}
            <button
              onClick={toggleSearch}
              className={`p-1 flex-shrink-0 flex items-center justify-center transition-colors ml-1 ${
                isSearchOpen ? 'text-ksp-accent' : 'text-[#6A7282]'
              }`}
              aria-label="Search"
            >
              <Search size={20} strokeWidth={1.67} />
            </button>
          </div>

        </div>
      </div>

      {/* Search input (slides down when active) */}
      {isSearchOpen && (
        <div className="w-full bg-white border-b border-ksp-border shadow-card py-3 md:py-4">
          <div className="max-w-[1772px] mx-auto px-4 lg:px-10">
            <form onSubmit={handleSearch} className="flex">
              <div className="flex-1 flex items-center bg-ksp-bg-light rounded-lg overflow-hidden">
                <Search size={18} className="text-ksp-meta ml-3 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isMobile ? "Search K-POP news..." : "Search K-POP news, dramas, artists..."}
                  className="w-full py-2.5 md:py-3 px-3 bg-transparent border-none focus:outline-none text-ksp-dark text-sm md:text-base placeholder:text-ksp-meta"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="px-2 md:px-3 text-ksp-meta hover:text-ksp-text"
                  >
                    <X size={isMobile ? 16 : 18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="ml-2 px-3 md:px-6 py-2 md:py-3 bg-ksp-accent text-white font-medium rounded-lg text-sm md:text-base hover:opacity-90 transition-opacity"
              >
                {isSearching ? (
                  <Loader2 size={isMobile ? 16 : 20} strokeWidth={2.5} className="animate-spin" />
                ) : (
                  isMobile ? "Go" : "Search"
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="ml-2 px-2 md:px-4 py-2 md:py-3 text-ksp-meta hover:text-ksp-text text-sm md:text-base"
              >
                {isMobile ? "✕" : "Cancel"}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;