import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, Newspaper, Film, Tv, Users, Layers } from 'lucide-react'

const AdminLayout = ({ children }) => {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* 사이드바 */}
        <div className="w-64 min-h-screen bg-white shadow-md">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">관리자 패널</h2>
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link href="/admin">
                  <a className={`flex items-center px-4 py-2 rounded-lg ${router.pathname === '/admin' ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}>
                    <Home className="mr-3 h-5 w-5" />
                    대시보드
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/admin/content">
                  <a className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/content') ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}>
                    <Layers className="mr-3 h-5 w-5" />
                    콘텐츠 관리
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/admin/news">
                  <a className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/news') ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}>
                    <Newspaper className="mr-3 h-5 w-5" />
                    뉴스 관리
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/admin/drama">
                  <a className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/drama') ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}>
                    <Film className="mr-3 h-5 w-5" />
                    드라마 관리
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/admin/users">
                  <a className={`flex items-center px-4 py-2 rounded-lg ${router.pathname.startsWith('/admin/users') ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-100'}`}>
                    <Users className="mr-3 h-5 w-5" />
                    사용자 관리
                  </a>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* 메인 콘텐츠 */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AdminLayout 