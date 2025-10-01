import { useState } from 'react';
import { signIn, getCsrfToken } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function SignIn({ csrfToken }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { callbackUrl } = router.query;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      
      if (result.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        setIsLoading(false);
      } else {
        router.push(callbackUrl || '/');
      }
    } catch (error) {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>로그인 | K-POP News Portal</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              K-POP News Portal
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              계정에 로그인하세요
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-red-500">{error}</p>
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
            <div className="rounded-md shadow-sm -space-y-px">
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
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
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
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link href="/auth/signup" className="text-primary-600 hover:text-primary-500">
                  계정이 없으신가요? 회원가입
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {
      csrfToken: await getCsrfToken(context),
    },
  };
} 