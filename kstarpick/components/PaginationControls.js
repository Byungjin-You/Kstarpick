import React from 'react';

const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
  const pageNumbers = [];
  
  // 최대 5개의 페이지 번호만 표시
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  // 시작 페이지 재조정
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  return (
    <div className="flex justify-center items-center space-x-2 mt-6 mb-10">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded ${
          currentPage === 1
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        이전
      </button>
      
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            1
          </button>
          {startPage > 2 && <span className="px-1">...</span>}
        </>
      )}
      
      {pageNumbers.map((number) => (
        <button
          key={number}
          onClick={() => onPageChange(number)}
          className={`px-3 py-1 rounded ${
            currentPage === number
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          {number}
        </button>
      ))}
      
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-1">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`px-3 py-1 rounded ${
          currentPage === totalPages
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        다음
      </button>
    </div>
  );
};

export default PaginationControls; 