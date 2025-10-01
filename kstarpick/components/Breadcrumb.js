import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = ({ items = [] }) => {
  // 기본 홈 아이템 추가
  const breadcrumbItems = [
    { name: 'Home', href: '/', icon: Home },
    ...items
  ];

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4 py-2">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const Icon = item.icon;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
              )}
              
              {isLast ? (
                <span className="text-gray-900 font-medium flex items-center">
                  {Icon && <Icon className="w-4 h-4 mr-1" />}
                  {item.name}
                </span>
              ) : (
                <Link 
                  href={item.href}
                  className="text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                >
                  {Icon && <Icon className="w-4 h-4 mr-1" />}
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb; 