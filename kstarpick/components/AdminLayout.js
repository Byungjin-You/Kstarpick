import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { Home, FileText, Video, Users, Settings, LogOut, Menu, X, AlertCircle, Film, Newspaper, Tv, Layers, Music, Star, Vote, Sparkles, TrendingUp } from 'lucide-react';

const AdminLayout = ({ children }) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Redirect if not logged in or not admin
  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      router.push('/admin/login');
    }
  }, [session, status, router]);
  
  // If still loading session, show loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 border-4 border-t-[#ff3e8e] rounded-full animate-spin"></div>
            <p className="text-xl font-medium">Loading admin panel...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // If not authenticated or not admin, show unauthorized
  if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md max-w-md">
          <div className="flex flex-col items-center space-y-4 text-center">
            <AlertCircle size={48} className="text-red-500" />
            <h1 className="text-2xl font-bold text-gray-800">Unauthorized Access</h1>
            <p className="text-gray-600">You don't have permission to access the admin area.</p>
            <Link href="/" className="px-4 py-2 mt-4 text-white bg-[#ff3e8e] rounded-md hover:bg-[#e02e7c]">
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Navigation links
  const navLinks = [
    { href: '/admin', icon: <Home size={20} />, label: 'Dashboard' },
    { href: '/admin/news', icon: <FileText size={20} />, label: 'News' },
    { href: '/admin/drama', icon: <Video size={20} />, label: 'Dramas' },
    { href: '/admin/music', icon: <Music size={20} />, label: 'Music' },
    { href: '/admin/users', icon: <Users size={20} />, label: 'Users' },
    { href: '/admin/settings', icon: <Settings size={20} />, label: 'Settings' },
  ];
  
  // Function to check if a link is active
  const isActive = (href) => {
    if (href === '/admin') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };
  
  // Handle sign out
  const handleSignOut = () => {
    // localStorage와 sessionStorage에서 adminToken 제거
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    
    // NextAuth 로그아웃
    signOut({ callbackUrl: '/' });
  };
  
  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* 사이드바 */}
        <div className="w-64 min-h-screen bg-white shadow-md">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">관리자 패널</h2>
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/admin" 
                  className={`flex items-center px-4 py-2 rounded-lg ${router.pathname === '/admin' ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}
                >
                  <Home className="mr-3 h-5 w-5" />
                  대시보드
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/drama"
                  className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/drama') ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}
                >
                  <Tv className="mr-3 h-5 w-5" />
                  드라마 관리
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/tvfilm"
                  className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/tvfilm') ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}
                >
                  <Film className="mr-3 h-5 w-5" />
                  영화 관리
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/news"
                  className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/news') ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}
                >
                  <Newspaper className="mr-3 h-5 w-5" />
                  뉴스 관리
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/music"
                  className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/music') ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}
                >
                  <Music className="mr-3 h-5 w-5" />
                  음악 차트 관리
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/celeb"
                  className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/celeb') ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}
                >
                  <Star className="mr-3 h-5 w-5" />
                  셀럽 관리
                </Link>
              </li>

              {/* 트렌드 분석 - 로컬 개발 환경에서만 표시 */}
              {process.env.NODE_ENV === 'development' && (
                <>
                  <li className="pt-4 mt-4 border-t">
                    <span className="px-4 text-xs font-semibold text-gray-400 uppercase">분석 도구</span>
                  </li>
                  <li>
                    <Link
                      href="/admin/trends"
                      className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/trends') ? 'bg-orange-600 text-white' : 'text-gray-800 hover:bg-orange-100'}`}
                    >
                      <TrendingUp className="mr-3 h-5 w-5" />
                      트렌드 분석
                    </Link>
                  </li>
                </>
              )}

              {/* 마이원픽 섹션 */}
              <li className="pt-4 mt-4 border-t">
                <span className="px-4 text-xs font-semibold text-gray-400 uppercase">마이원픽</span>
              </li>
              <li>
                <Link
                  href="/admin/my1pick/theme-votes"
                  className={`flex items-center px-4 py-2 rounded-lg ${router.pathname === '/admin/my1pick/theme-votes' ? 'bg-purple-600 text-white' : 'text-gray-800 hover:bg-purple-100'}`}
                >
                  <Vote className="mr-3 h-5 w-5" />
                  테마 투표 관리
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/my1pick/draft-articles"
                  className={`flex items-center px-4 py-2 rounded-lg ${router.pathname === '/admin/my1pick/draft-articles' ? 'bg-purple-600 text-white' : 'text-gray-800 hover:bg-purple-100'}`}
                >
                  <Sparkles className="mr-3 h-5 w-5" />
                  AI 기사 관리
                </Link>
              </li>
            </ul>
            
            {/* 로그아웃 버튼 */}
            <div className="border-t mt-4 pt-4">
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="mr-3 h-5 w-5" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
        
        {/* 메인 콘텐츠 */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout; 