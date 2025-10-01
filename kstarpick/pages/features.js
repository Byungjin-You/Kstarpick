import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Link from 'next/link';
import { cardNewsData } from '../data/cardNewsData';
import { BookOpen, TrendingUp, Calendar, Bookmark, Award, Star, ArrowRight, Play } from 'lucide-react';

export default function Features() {
  const router = useRouter();
  
  // Create special features content
  const featuredContent = [
    {
      id: 101,
      title: 'K-Pop 4세대 아이돌 총정리',
      summary: '4세대 K-Pop 아이돌 그룹들의 특징과 성과를 분석합니다.',
      date: '2023-05-20',
      category: 'Industry Analysis',
      readTime: '8 min read'
    },
    {
      id: 102,
      title: '한국 드라마의 세계적 인기 비결',
      summary: '한국 드라마가 글로벌 시장에서 사랑받는 이유를 알아봅니다.',
      date: '2023-05-18',
      category: 'Global Impact',
      readTime: '10 min read'
    },
    {
      id: 103,
      title: 'K-Pop 트레이닝 시스템 심층 분석',
      summary: '세계가 주목하는 K-Pop 아이돌 양성 시스템의 모든 것',
      date: '2023-05-15',
      category: 'Behind The Scenes',
      readTime: '12 min read'
    },
    {
      id: 104,
      title: 'K-Pop 아이돌 팬덤 문화의 진화',
      summary: '소셜미디어와 디지털 플랫폼이 K-Pop 팬덤 문화를 어떻게 변화시켰는지 심층 분석합니다.',
      date: '2023-05-10',
      category: 'Fan Culture',
      readTime: '9 min read'
    }
  ];
  
  // Additional feature types
  const featureCategories = [
    { name: 'Industry Analysis', count: '21', icon: 'chart' },
    { name: 'Artist Interviews', count: '34', icon: 'mic' },
    { name: 'Behind The Scenes', count: '19', icon: 'camera' },
    { name: 'Fan Culture', count: '15', icon: 'heart' },
    { name: 'Global Impact', count: '27', icon: 'globe' },
    { name: 'Retrospectives', count: '16', icon: 'history' }
  ];
  
  // Editorial picks
  const editorialPicks = [
    { title: 'The Evolution of K-Pop Fashion', author: 'Min-ji Kim', date: 'April 29, 2023' },
    { title: 'How K-Pop Changed Music Production', author: 'Jun-ho Park', date: 'April 15, 2023' },
    { title: 'The Rise of K-Drama OSTs in Global Charts', author: 'Soo-young Lee', date: 'March 30, 2023' },
  ];
  
  return (
    <div className="bg-white min-h-screen">
      <Head>
        <title>Features - K-POP News Portal</title>
        <meta name="description" content="Special features and in-depth articles about K-POP" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      
      {/* Page header with gradient background */}
      <div className="bg-gradient-to-r from-[#ff3e8e] to-[#ffb67b] text-white">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Special Features</h1>
              <p className="text-white/90 max-w-xl">In-depth articles and special coverage about Korean entertainment.</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center bg-white/20 backdrop-blur-md rounded-lg p-2">
              <span className="flex items-center px-3 py-1">
                <BookOpen size={16} className="mr-2" />
                <span className="text-sm font-medium">New: K-Pop 4세대 총정리</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <main className="container mx-auto px-4 md:px-6 py-8 bg-white">
        {/* Featured Article - Hero Section */}
        <section className="mb-12">
          <div className="relative bg-gray-800 rounded-xl overflow-hidden h-80 md:h-96">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80"></div>
            <div className="absolute inset-0 flex items-end">
              <div className="p-6 md:p-8 w-full">
                <div className="flex items-center mb-3">
                  <span className="bg-[#ff3e8e] text-white text-xs font-medium px-2.5 py-1 rounded-full">Feature of the Month</span>
                  <span className="ml-3 text-white/80 text-xs flex items-center">
                    <Calendar size={12} className="mr-1" />
                    May 20, 2023
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{featuredContent[0].title}</h2>
                <p className="text-white/90 mb-4 max-w-xl">{featuredContent[0].summary}</p>
                <Link href={`/features/${featuredContent[0].id}`} className="inline-flex items-center bg-white text-[#ff3e8e] px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors">
                  Read Full Article <ArrowRight size={16} className="ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        {/* Latest Features Grid */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BookOpen className="text-[#ff3e8e] mr-2" size={20} />
              <h2 className="text-2xl font-bold">Latest Features</h2>
            </div>
            <Link href="/features/all" className="text-[#ff3e8e] text-sm font-medium hover:underline flex items-center">
              View all <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredContent.slice(1, 4).map((feature) => (
              <Link key={feature.id} href={`/features/${feature.id}`} className="group">
                <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm group-hover:shadow-md transition-all duration-200 h-full flex flex-col">
                  <div className="h-48 bg-gray-100 relative flex items-center justify-center">
                    <span className="text-gray-400">Feature Image</span>
                    <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm text-[#ff3e8e] text-xs font-medium px-2 py-1 rounded-full">
                      {feature.category}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                      <span>{feature.date}</span>
                      <span>{feature.readTime}</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-[#ff3e8e] transition-colors">{feature.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 flex-grow">{feature.summary}</p>
                    <div className="text-[#ff3e8e] text-sm font-medium flex items-center mt-auto">
                      Read article <ArrowRight size={14} className="ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1">
            {/* More Featured Articles */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <TrendingUp className="text-[#ff3e8e] mr-2" size={20} />
                  <h2 className="text-2xl font-bold">More In-Depth Articles</h2>
                </div>
              </div>
              
              <div className="space-y-6">
                {cardNewsData.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex flex-col md:flex-row gap-4 bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="w-full md:w-48 h-32 md:h-auto bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                      <span className="text-gray-400">Article Image</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center text-xs mb-2">
                        <span className="bg-orange-100 text-orange-800 rounded-full px-2.5 py-1 font-medium">
                          Feature
                        </span>
                        <span className="ml-2 text-gray-500 flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {item.date}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        <Link href={`/features/article/${item.id}`} className="hover:text-[#ff3e8e] transition-colors">
                          {item.title}
                        </Link>
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">{item.summary}</p>
                      <Link href={`/features/article/${item.id}`} className="text-[#ff3e8e] text-sm font-medium hover:underline flex items-center">
                        Read more <ArrowRight size={14} className="ml-1" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          
          {/* Sidebar */}
          <div className="w-full md:w-72 shrink-0">
            {/* Feature Categories */}
            <div className="bg-white rounded-xl p-5 mb-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <BookOpen size={16} className="text-[#ff3e8e] mr-2" />
                  Categories
                </h3>
                <Link href="/features/categories" className="text-[#ff3e8e] text-xs font-medium hover:underline">
                  View all
                </Link>
              </div>
              
              <div className="space-y-2">
                {featureCategories.map((category, index) => (
                  <Link 
                    href={`/features/category/${category.name.toLowerCase().replace(/\s+/g, '-')}`} 
                    key={index}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                  >
                    <span className="text-gray-700">{category.name}</span>
                    <span className="bg-gray-200 text-gray-700 rounded-full text-xs px-2 py-1">
                      {category.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Editor's Picks */}
            <div className="bg-gradient-to-br from-[#ff3e8e]/10 to-[#ffb67b]/10 rounded-xl p-5">
              <div className="flex items-center mb-4">
                <Star size={16} className="text-[#ff3e8e] mr-2" />
                <h3 className="font-semibold text-lg">Editor's Picks</h3>
              </div>
              
              <div className="space-y-4">
                {editorialPicks.map((article, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 bg-white/60 backdrop-blur-sm rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#ff3e8e] rounded-full flex items-center justify-center text-white font-bold text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{article.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">By {article.author} • {article.date}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200/50">
                <h4 className="font-medium text-sm mb-3 flex items-center">
                  <Bookmark size={14} className="text-[#ff3e8e] mr-1" />
                  Subscribe to Features
                </h4>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs text-gray-700 mb-2">Get the best features delivered to your inbox</p>
                  <form className="flex">
                    <input 
                      type="email" 
                      placeholder="Your email" 
                      className="flex-1 text-sm py-1 px-2 border border-gray-200 rounded-l-md focus:outline-none focus:border-[#ff3e8e]"
                    />
                    <button className="bg-[#ff3e8e] text-white text-xs font-medium py-1 px-2 rounded-r-md border border-[#ff3e8e]">
                      Subscribe
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Server-side rendering - in a real implementation, this would fetch data from a database
export async function getServerSideProps() {
  return {
    props: {},
  };
} 