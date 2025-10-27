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

  // Render a simplified header during server-side rendering
  if (!isMounted) {
    return (
      <header className="fixed top-0 z-50 bg-white w-full">
        <div
          className="w-full border-t-[5px] border-solid border-x-0 border-b-0 shadow-[0px_2px_3px_rgba(0,0,0,0.15)]"
          style={{ borderImage: 'linear-gradient(to right, #233CFA, #1d31cb) 1' }}
        >
          <div className="max-w-[1200px] mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="mr-6 flex-shrink-0">
                  <div className="block cursor-pointer">
                    <Logo />
                  </div>
                </div>
                <nav className="hidden lg:flex items-center h-full">
                  <div className="h-16 inline-flex items-center px-4 font-medium text-[15px] text-[#333] cursor-pointer">HOME</div>
                  <div className="h-16 inline-flex items-center px-4 font-medium text-[15px] text-[#333] cursor-pointer">DRAMA</div>
                  <div className="h-16 inline-flex items-center px-4 font-medium text-[15px] text-[#333] cursor-pointer">TV/FILM</div>
                  <div className="h-16 inline-flex items-center px-4 font-medium text-[15px] text-[#333] cursor-pointer">MUSIC</div>
                  <div className="h-16 inline-flex items-center px-4 font-medium text-[15px] text-[#333] cursor-pointer">CELEB</div>
                  <div className="h-16 inline-flex items-center px-4 font-medium text-[15px] text-[#333] cursor-pointer">RANKING</div>
                </nav>
              </div>
              <div className="flex items-center h-full">
                <button className="p-2 flex items-center justify-center text-[#666]" aria-label="Search">
                  <Search size={20} strokeWidth={2.5} />
                </button>
                <button className="ml-2 p-2 lg:hidden flex items-center justify-center text-[#666]" aria-label="Toggle menu">
                  <Menu size={24} strokeWidth={2.5} />
                </button>
              </div>
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
        className={`w-full border-t-[5px] border-solid border-x-0 border-b-0 transition-shadow duration-300 ${
          isScrolled ? 'shadow-[0px_4px_6px_rgba(0,0,0,0.2)]' : 'shadow-[0px_2px_3px_rgba(0,0,0,0.15)]'
        }`}
        style={{ borderImage: 'linear-gradient(to right, #233CFA, #1d31cb) 1' }}
      >
        <div className="max-w-[1200px] mx-auto px-4">
          {/* Desktop and Tablet Layout */}
          <div className="flex justify-between items-center h-16">
            {/* Left Section - Logo and Primary Nav */}
            <div className="flex items-center">
              {/* Logo - Visible on all screens */}
              <div className="mr-6 flex-shrink-0">
                <div onClick={(e) => {
                  e.preventDefault();
                  // 모든 세션 스토리지 초기화
                  sessionStorage.clear();
                  // 페이지 완전 새로고침
                  window.location.href = '/';
                }} className="block cursor-pointer">
                  <Logo />
                </div>
              </div>
              
              {/* Primary Navigation - Hidden on Mobile */}
              <nav className="hidden lg:flex items-center h-full">
                <Link href="/" className={`h-16 inline-flex items-center px-4 font-medium text-[15px] hover:text-[#233cfa] transition-colors duration-200 cursor-pointer ${
                  router.pathname === '/' ? 'text-[#233cfa] font-semibold' : 'text-[#333]'
                }`} onClick={router.pathname === '/' ? handleSameMenuClick : undefined}>
                  HOME
                </Link>
                <Link href="/drama" className={`h-16 inline-flex items-center px-4 font-medium text-[15px] hover:text-[#233cfa] transition-colors duration-200 cursor-pointer ${
                  router.pathname === '/drama' ? 'text-[#233cfa] font-semibold' : 'text-[#333]'
                }`} onClick={router.pathname === '/drama' ? handleSameMenuClick : undefined}>
                  DRAMA
                </Link>
                <Link href="/tvfilm" className={`h-16 inline-flex items-center px-4 font-medium text-[15px] hover:text-[#233cfa] transition-colors duration-200 cursor-pointer ${
                  router.pathname === '/tvfilm' ? 'text-[#233cfa] font-semibold' : 'text-[#333]'
                }`} onClick={router.pathname === '/tvfilm' ? handleSameMenuClick : undefined}>
                  TV/FILM
                </Link>
                <Link href="/music" className={`h-16 inline-flex items-center px-4 font-medium text-[15px] hover:text-[#233cfa] transition-colors duration-200 cursor-pointer ${
                  router.pathname === '/music' ? 'text-[#233cfa] font-semibold' : 'text-[#333]'
                }`} onClick={router.pathname === '/music' ? handleSameMenuClick : undefined}>
                  MUSIC
                </Link>
                <Link href="/celeb" className={`h-16 inline-flex items-center px-4 font-medium text-[15px] hover:text-[#233cfa] transition-colors duration-200 cursor-pointer ${
                  router.pathname === '/celeb' ? 'text-[#233cfa] font-semibold' : 'text-[#333]'
                }`} onClick={router.pathname === '/celeb' ? handleSameMenuClick : undefined}>
                  CELEB
                </Link>
                <Link href="/ranking" className={`h-16 inline-flex items-center px-4 font-medium text-[15px] hover:text-[#233cfa] transition-colors duration-200 cursor-pointer ${
                  router.pathname === '/ranking' ? 'text-[#233cfa] font-semibold' : 'text-[#333]'
                }`} onClick={router.pathname === '/ranking' ? handleSameMenuClick : undefined}>
                  RANKING
                </Link>
              </nav>
            </div>
            
            {/* Right Section - Actions */}
            <div className="flex items-center h-full">
              {/* Search Button - Visible on all screens, icon only */}
              <button
                onClick={toggleSearch}
                className={`p-2 flex items-center justify-center transition-colors duration-200 ${
                  isSearchOpen ? 'text-[#233cfa]' : 'text-[#666] hover:text-[#233cfa]'
                }`}
                aria-label="Search"
              >
                <Search size={20} strokeWidth={2.5} />
              </button>

              {/* Mobile Menu Toggle - Visible only on Mobile/Tablet */}
              <button
                onClick={toggleMenu}
                className={`ml-2 p-2 lg:hidden flex items-center justify-center transition-colors duration-200 ${
                  isMenuOpen ? 'text-[#233cfa]' : 'text-[#666] hover:text-[#233cfa]'
                }`}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search input (slides down when active) - 모바일과 데스크톱 공통 */}
      {isSearchOpen && (
        <div className="w-full bg-white border-b border-gray-200 shadow-md py-3 md:py-4">
          <div className="max-w-[1200px] mx-auto px-4">
            <form onSubmit={handleSearch} className="flex">
              <div className="flex-1 flex items-center bg-gray-100 rounded-lg overflow-hidden">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isMobile ? "Search K-POP news..." : "Search K-POP news, dramas, artists..."}
                  className="w-full py-2 md:py-3 px-3 md:px-4 bg-transparent border-none focus:outline-none text-gray-800 text-sm md:text-base"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="px-2 md:px-3 text-gray-400 hover:text-gray-600"
                  >
                    <X size={isMobile ? 16 : 18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="ml-2 px-3 md:px-6 py-2 md:py-3 text-white font-medium rounded-lg text-sm md:text-base"
                style={{ backgroundColor: '#233cfa' }}
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
                className="ml-2 px-2 md:px-4 py-2 md:py-3 text-gray-500 hover:text-gray-700 text-sm md:text-base"
              >
                {isMobile ? "✕" : "Cancel"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Navigation Menu (Slides down when active) */}
      {isMenuOpen && (
        <div className="lg:hidden fixed top-16 left-0 w-full h-[calc(100vh-4rem)] bg-white z-50 animate-slide-in-top">
          <div className="container mx-auto px-5 py-6">
            <nav className="flex flex-col space-y-4">
              <button
                className={`text-lg font-medium flex items-center py-2 text-left ${
                  router.pathname === '/' ? 'text-[#233cfa]' : 'text-gray-800'
                }`}
                onClick={() => handleMobileMenuClick('/')}
              >
                HOME
              </button>
              <button
                className={`text-lg font-medium flex items-center py-2 text-left ${
                  router.pathname === '/drama' ? 'text-[#233cfa]' : 'text-gray-800'
                }`}
                onClick={() => handleMobileMenuClick('/drama')}
              >
                DRAMA
              </button>
              <button
                className={`text-lg font-medium flex items-center py-2 text-left ${
                  router.pathname === '/tvfilm' ? 'text-[#233cfa]' : 'text-gray-800'
                }`}
                onClick={() => handleMobileMenuClick('/tvfilm')}
              >
                TV/FILM
              </button>
              <button
                className={`text-lg font-medium flex items-center py-2 text-left ${
                  router.pathname === '/music' ? 'text-[#233cfa]' : 'text-gray-800'
                }`}
                onClick={() => handleMobileMenuClick('/music')}
              >
                MUSIC
              </button>
              <button
                className={`text-lg font-medium flex items-center py-2 text-left ${
                  router.pathname === '/celeb' ? 'text-[#233cfa]' : 'text-gray-800'
                }`}
                onClick={() => handleMobileMenuClick('/celeb')}
              >
                CELEB
              </button>
              <button
                className={`text-lg font-medium flex items-center py-2 text-left ${
                  router.pathname === '/ranking' ? 'text-[#233cfa]' : 'text-gray-800'
                }`}
                onClick={() => handleMobileMenuClick('/ranking')}
              >
                RANKING
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;