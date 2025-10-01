import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center py-10">
      <div className="relative w-20 h-20">
        {/* Outer pulsing gradient ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 animate-pulse opacity-70"></div>
        
        {/* Rotating outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 border-r-purple-500 animate-spin-slow"></div>
        
        {/* Middle gradient ring that rotates in opposite direction */}
        <div className="absolute inset-2 rounded-full border-[3px] border-transparent border-b-pink-400 border-l-purple-400 animate-reverse-spin"></div>
        
        {/* Inner white circle background */}
        <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center">
          {/* Animated dot that bounces */}
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 animate-bounce"></div>
        </div>
        
        {/* Floating particles */}
        <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-pink-300 animate-float-1"></div>
        <div className="absolute bottom-3 left-1 w-1 h-1 rounded-full bg-purple-300 animate-float-2"></div>
        <div className="absolute top-4 left-2 w-1 h-1 rounded-full bg-pink-400 animate-float-3"></div>
      </div>
      
      {/* Loading text with gradient and animation */}
      <div className="relative ml-3 overflow-hidden">
        <div className="animate-text-reveal">
          <span className="inline-block font-medium text-lg bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Loading
          </span>
          <span className="inline-block mx-[1px] animate-dot-1">.</span>
          <span className="inline-block mx-[1px] animate-dot-2">.</span>
          <span className="inline-block mx-[1px] animate-dot-3">.</span>
        </div>
        {/* Gradient underline animation */}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-pink-500 to-purple-500 opacity-70 animate-expand-line"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 