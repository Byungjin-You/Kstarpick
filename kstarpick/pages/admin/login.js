import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // If user is already logged in and is an admin, redirect to admin dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'admin') {
      router.push('/admin');
    }
  }, [session, status, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      console.log('Attempting to sign in with:', { email });
      
      // NextAuth 로그인 시도
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      
      console.log('Sign in result:', result);
      
      if (result.error) {
        // NextAuth 로그인 실패 시 직접 API 호출로 시도
        try {
          console.log('Trying direct API login...');
          const loginResponse = await axios.post('/api/auth/login', {
            email,
            password
          });
          
          console.log('Direct login response:', loginResponse.data);
          
          if (loginResponse.data.success && loginResponse.data.token) {
            // 토큰 저장
            const token = loginResponse.data.token;
            console.log('Received token, saving to cookies and localStorage');
            
            // 쿠키에 토큰 저장 (7일 유효)
            Cookies.set('token', token, { expires: 7 });
            
            // 로컬 스토리지에 토큰 저장 (두 키 모두 사용하여 호환성 보장)
            localStorage.setItem('token', token);
            localStorage.setItem('adminToken', token);
            
            // 관리자 권한 확인
            const authCheck = await axios.get('/api/auth/check-admin', {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('Admin check result:', authCheck.data);
            
            if (authCheck.data.isAdmin) {
              router.push('/admin');
            } else {
              Cookies.remove('token');
              localStorage.removeItem('adminToken');
              setError('You do not have admin privileges.');
              setIsLoading(false);
            }
          } else {
            setError('Invalid credentials. Please try again.');
            setIsLoading(false);
          }
        } catch (apiError) {
          console.error('Direct API login error:', apiError);
          setError('Invalid credentials. Please try again.');
          setIsLoading(false);
        }
      } else {
        // NextAuth 로그인 성공 시 관리자 권한 확인
        console.log('Checking admin status...');
        const response = await fetch('/api/auth/check-admin');
        const data = await response.json();
        
        console.log('Admin check result:', data);
        
        if (data.isAdmin) {
          router.push('/admin');
        } else {
          // If not an admin, sign out and show error
          await signIn('credentials', { redirect: false, email: '', password: '' });
          setError('You do not have admin privileges.');
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again.');
      setIsLoading(false);
    }
  };

  // If still loading session, show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Login | K-POP News Portal</title>
        <meta name="description" content="Admin login page for K-POP News Portal" />
      </Head>
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Admin Portal</h1>
                <p className="text-gray-600 mt-2">Sign in to your admin account</p>
              </div>
              
              {error && (
                <div className="mb-6 flex items-center p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  <p>{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm font-medium ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? 'Signing in...' : 'Sign in to Admin'}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-sm text-center text-gray-600">
                Need an admin account? <Link href="/admin/register" className="font-medium text-blue-600 hover:text-blue-500">Register here</Link>
              </p>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {},
  };
} 