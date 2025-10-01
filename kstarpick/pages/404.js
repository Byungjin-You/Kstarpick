import { useRouter } from 'next/router';
import MainLayout from '../components/MainLayout';
import Seo from '../components/Seo';
import Link from 'next/link';

export default function Custom404() {
  const router = useRouter();

  return (
    <MainLayout>
      <Seo
        title="Page Not Found - 404"
        description="Sorry, the page you are looking for cannot be found. Please check the URL or go back to homepage."
        url="/404"
      />
      
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-pink-500">404</h1>
            <p className="text-2xl font-semibold text-gray-800 mt-4">
              Oops! Page Not Found
            </p>
          </div>
          
          <p className="text-gray-600 mb-8">
            죄송합니다. 찾으시는 페이지가 존재하지 않습니다. 
            URL을 다시 확인하시거나 아래 링크를 이용해주세요.
          </p>
          
          <div className="space-y-4">
            <Link href="/">
              <a className="inline-block bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition-colors">
                홈페이지로 이동
              </a>
            </Link>
            
            <div className="flex justify-center space-x-4 mt-4">
              <Link href="/drama">
                <a className="text-pink-500 hover:text-pink-600 transition-colors">
                  드라마
                </a>
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/music">
                <a className="text-pink-500 hover:text-pink-600 transition-colors">
                  음악
                </a>
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/tvfilm">
                <a className="text-pink-500 hover:text-pink-600 transition-colors">
                  TV/영화
                </a>
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/celeb">
                <a className="text-pink-500 hover:text-pink-600 transition-colors">
                  연예인
                </a>
              </Link>
            </div>
          </div>
          
          <div className="mt-12">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800 transition-colors underline"
            >
              이전 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 