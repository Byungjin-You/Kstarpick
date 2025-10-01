import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!name || !email || !password || !confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '회원가입 중 오류가 발생했습니다.');
      }
      
      setSuccessMessage('회원가입에 성공했습니다! 잠시 후 로그인 페이지로 이동합니다.');
      
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>회원가입 | K-POP News Portal</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              K-POP News Portal
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              새 계정 만들기
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <p className="text-green-500">{successMessage}</p>
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="name" className="sr-only">
                  이름
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="이름"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email-address" className="sr-only">
                  이메일 주소
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="이메일 주소"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="비밀번호 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  비밀번호 확인
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || successMessage}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  (isLoading || successMessage) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link href="/auth/signin" className="text-primary-600 hover:text-primary-500">
                  이미 계정이 있으신가요? 로그인
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
} 