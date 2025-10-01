import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pageNumbers = [];
  
  // Display maximum 5 page numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  
  // Readjust start page if needed
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex justify-center items-center space-x-2">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`px-3 py-2 rounded-md ${
          currentPage === 1
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-pink-500 text-white hover:bg-pink-600'
        }`}
      >
        이전
      </button>
      
      {startPage > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
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
          className={`px-3 py-2 rounded-md ${
            currentPage === number
              ? 'bg-pink-500 text-white'
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
            className="px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`px-3 py-2 rounded-md ${
          currentPage === totalPages
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-pink-500 text-white hover:bg-pink-600'
        }`}
      >
        다음
      </button>
    </div>
  );
};

export default Pagination; 