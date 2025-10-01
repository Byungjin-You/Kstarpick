import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Newspaper, 
  Film, 
  Music, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  BookOpen,
  PenTool,
  TrendingUp,
  FileText,
  Video,
  Eye,
  ThumbsUp,
  MessageCircle,
  Activity,
  Calendar,
  AlertCircle,
  Trash2
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [dramas, setDramas] = useState([]);
  const [dramaLoading, setDramaLoading] = useState(false);
  const [dramaError, setDramaError] = useState('');
  const [stats, setStats] = useState({
    news: 0,
    dramas: 0,
    views: 0,
    likes: 0,
    comments: 0,
    users: 0
  });

  // URL에서 탭 파라미터 가져오기
  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab);
    }
  }, [router.query.tab]);

  // Redirect if not logged in or not an admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/admin/login');
    } else if (session && session.user?.role !== 'admin') {
      // In a real app, check if the user has admin privileges
      router.push('/');
      alert('You do not have admin privileges.');
    } else {
      setIsLoading(false);
    }
  }, [session, status, router]);

  // 드라마 데이터 로드
  useEffect(() => {
    const fetchDramas = async () => {
      if (activeTab === 'drama') {
        try {
          setDramaLoading(true);
          setDramaError('');
          
          // 인증 토큰 가져오기
          const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
          
          const response = await fetch('/api/dramas', {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            }
          });
          const result = await response.json();
          
          if (response.ok) {
            console.log('드라마 데이터 로드됨:', result);
            if (result.success && Array.isArray(result.data)) {
              setDramas(result.data);
            } else {
              setDramas([]);
              setDramaError('데이터 형식이 올바르지 않습니다.');
              console.error('응답 데이터 형식 오류:', result);
            }
          } else {
            setDramaError('Failed to load dramas: ' + (result.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error fetching dramas:', error);
          setDramaError('Failed to load dramas: ' + error.message);
        } finally {
          setDramaLoading(false);
        }
      }
    };
    
    fetchDramas();
  }, [activeTab]);

  // Fetch dashboard stats
  useEffect(() => {
    // For demo purposes, we'll use simulated data
    // In a real app, you would fetch this from your API
    const mockStats = {
      news: 24,
      dramas: 48,
      views: 12489,
      likes: 3275,
      comments: 864,
      users: 1532
    };
    
    // Simulate loading
    const timer = setTimeout(() => {
      setStats(mockStats);
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Recent activity (mock data)
  const recentActivity = [
    { type: 'news', action: 'New article published', title: 'BTS Announces New Tour Dates', time: '2 hours ago' },
    { type: 'user', action: 'New user registered', title: 'user934@gmail.com', time: '5 hours ago' },
    { type: 'drama', action: 'Drama updated', title: 'Crash Landing on You', time: '1 day ago' },
    { type: 'comment', action: 'New comment', title: 'On "BLACKPINK music video"', time: '1 day ago' },
    { type: 'news', action: 'Article edited', title: 'NewJeans Comeback Special', time: '2 days ago' }
  ];
  
  // Quick action links
  const quickActions = [
    { href: '/admin/news/create', icon: <FileText size={20} />, label: 'Create News Article', color: 'bg-blue-500' },
    { href: '/admin/drama/create', icon: <Video size={20} />, label: 'Add New Drama', color: 'bg-green-500' },
    { href: '/admin/news', icon: <Activity size={20} />, label: 'Manage News', color: 'bg-[#ff3e8e]' },
    { href: '/admin/users', icon: <Users size={20} />, label: 'Manage Users', color: 'bg-purple-500' }
  ];

  // 드라마 삭제 처리
  const handleDeleteDrama = async (dramaId) => {
    if (!confirm('Are you sure you want to delete this drama?')) {
      return;
    }
    
    try {
      // 인증 토큰 가져오기
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/dramas/${dramaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      
      if (response.ok) {
        // 목록에서 삭제된 드라마 제거
        setDramas(dramas.filter(drama => drama._id !== dramaId));
        alert('Drama deleted successfully');
      } else {
        const result = await response.json();
        alert('Failed to delete drama: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting drama:', error);
      alert('Failed to delete drama: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Admin Dashboard | K-POP News Portal</title>
      </Head>
      
      {/* Main Content */}
      <div className="flex flex-col w-full">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">{currentDate}</p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total News</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.news}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                <Video size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Dramas</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.dramas}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                <Users size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Registered Users</p>
                <h3 className="text-2xl font-bold text-gray-800">{stats.users}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link 
                key={index} 
                href={action.href}
                className={`${action.color} text-white rounded-lg p-4 flex items-center hover:opacity-90 transition-opacity`}
              >
                <div className="mr-3 bg-white/20 p-2 rounded-md">
                  {action.icon}
                </div>
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-sm">
            <ul className="divide-y divide-gray-200">
              {recentActivity.map((activity, index) => (
                <li key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start">
                    <div className="mr-4">
                      {activity.type === 'news' && (
                        <div className="p-2 bg-blue-100 text-blue-500 rounded-full">
                          <Newspaper size={20} />
                        </div>
                      )}
                      {activity.type === 'drama' && (
                        <div className="p-2 bg-green-100 text-green-500 rounded-full">
                          <Film size={20} />
                        </div>
                      )}
                      {activity.type === 'user' && (
                        <div className="p-2 bg-purple-100 text-purple-500 rounded-full">
                          <Users size={20} />
                        </div>
                      )}
                      {activity.type === 'comment' && (
                        <div className="p-2 bg-gray-100 text-gray-500 rounded-full">
                          <MessageCircle size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'drama' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Dramas</h2>
              <Link 
                href="/admin/drama/create" 
                className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center"
              >
                <Plus size={16} className="mr-2" />
                Add New
              </Link>
            </div>
            
            {dramaLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading dramas...</p>
              </div>
            ) : dramaError ? (
              <div className="p-6 text-center">
                <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                <p className="text-red-500">{dramaError}</p>
              </div>
            ) : dramas.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No dramas found.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {dramas.map((drama) => (
                  <li key={drama._id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 rounded overflow-hidden bg-gray-100">
                        {drama.image ? (
                          <img 
                            src={drama.image} 
                            alt={drama.title} 
                            className="h-full w-full object-cover" 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/images/dramas/default-poster.jpg';
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gray-200">
                            <Film size={20} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <h3 className="text-sm font-medium text-gray-800">{drama.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {drama.year} • {drama.episodes} eps • Rating: {drama.rating || 'N/A'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Link 
                          href={`/admin/drama/edit/${drama._id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        >
                          <PenTool size={16} />
                        </Link>
                        <Link 
                          href={`/drama/${drama._id}`}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                          target="_blank"
                        >
                          <Eye size={16} />
                        </Link>
                        <button 
                          onClick={() => handleDeleteDrama(drama._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// 서버 사이드 렌더링으로 강제 (SSG 비활성화)
export async function getServerSideProps() {
  return {
    props: {}
  };
} 