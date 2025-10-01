import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { useSession } from 'next-auth/react';

// Higher Order Component that checks if the user is authenticated and is an admin
const withAdminAuth = (WrappedComponent) => {
  const Wrapper = (props) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const { data: session, status } = useSession();

    useEffect(() => {
      // First try NextAuth session
      if (status === 'loading') {
        return; // Wait for session to load
      }

      if (session && session.user && session.user.role === 'admin') {
        setIsLoading(false);
        return;
      }

      // Then check for token in cookies or localStorage (including adminToken)
      const token = Cookies.get('token') || 
                   localStorage.getItem('token') || 
                   localStorage.getItem('adminToken');
      
      if (!token) {
        // Redirect to login if no token found
        console.log('No admin token found, redirecting to login');
        router.push('/admin/login');
        return;
      }
      
      // Verify token with server
      verifyAdminToken(token);
    }, [router, session, status]);

    // 서버에서 관리자 권한 확인하는 함수
    const verifyAdminToken = async (token) => {
      try {
        const response = await fetch('/api/auth/check-admin', {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        
        const data = await response.json();
        
        if (data.isAdmin) {
          setIsLoading(false);
        } else {
          console.log('Not an admin user, redirecting to login');
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Admin auth check failed:', error);
        router.push('/admin/login');
      }
    };

    if (isLoading) {
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

    return <WrappedComponent {...props} />;
  };

  return Wrapper;
};

export default withAdminAuth; 