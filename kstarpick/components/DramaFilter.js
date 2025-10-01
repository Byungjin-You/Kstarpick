import React from 'react';

const DramaFilter = ({ genres, selectedGenres, onGenreToggle, onClearFilters }) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">장르 필터</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => onGenreToggle(genre)}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedGenres.includes(genre)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>
      {selectedGenres.length > 0 && (
        <button
          onClick={onClearFilters}
          className="text-blue-500 text-sm hover:underline"
        >
          필터 초기화
        </button>
      )}
    </div>
  );
};

export default DramaFilter; 