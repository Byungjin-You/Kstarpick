import { useState, useEffect } from 'react';
import { Clock, TrendingUp, X } from 'lucide-react';

const SearchSuggestions = ({ 
  searchTerm, 
  onSelect, 
  onClearRecent,
  className = '' 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load recent searches from localStorage
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        const data = await response.json();
        setSuggestions(data.suggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelect = (suggestion) => {
    onSelect(suggestion.title);
    
    // Update recent searches
    const updatedSearches = [
      suggestion.title,
      ...recentSearches.filter(s => s !== suggestion.title)
    ].slice(0, 5);
    
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
    onClearRecent?.();
  };

  if (!searchTerm && recentSearches.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Recent Searches */}
      {!searchTerm && recentSearches.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Recent Searches</h3>
            <button
              onClick={handleClearRecent}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => handleSelect({ title: search })}
                className="flex items-center w-full p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <Clock size={16} className="mr-2 text-gray-400" />
                <span className="flex-1 text-left">{search}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Suggestions */}
      {searchTerm && (
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#ff3e8e] mx-auto"></div>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(suggestion)}
                  className="flex items-center w-full p-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <TrendingUp size={16} className="mr-2 text-gray-400" />
                  <span className="flex-1 text-left">{suggestion.title}</span>
                  <span className="text-xs text-gray-500">
                    {suggestion.count.toLocaleString()} views
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions; 