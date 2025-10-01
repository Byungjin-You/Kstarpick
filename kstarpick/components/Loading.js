import React from 'react';

const Loading = () => {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      <span className="ml-3 text-gray-600">로딩 중...</span>
    </div>
  );
};

export default Loading; 