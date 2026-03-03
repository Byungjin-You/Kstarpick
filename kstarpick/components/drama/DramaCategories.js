import { Heart, Sword, AlertTriangle, Sparkles, Castle, Laugh, Search, Film, Rocket, Skull, Camera, Tv, Music, Star, Users, Mic, Crown } from 'lucide-react';

const celebCategories = [
  { id: 'kpop', label: 'K-Pop', icon: Music },
  { id: 'solo', label: 'Solo', icon: Mic },
  { id: 'actor', label: 'Actor', icon: Star },
  { id: 'model', label: 'Model', icon: Crown },
  { id: 'group', label: 'Group', icon: Users },
  { id: 'variety', label: 'Variety', icon: Tv },
  { id: 'trending', label: 'Trending', icon: Rocket },
  { id: 'rookie', label: 'Rookie', icon: Sparkles },
  { id: 'global', label: 'Global', icon: Castle },
  { id: 'awards', label: 'Awards', icon: Heart },
];

const dramaCategories = [
  { id: 'romance', label: 'Romance', icon: Heart },
  { id: 'action', label: 'Action', icon: Sword },
  { id: 'thriller', label: 'Thriller', icon: AlertTriangle },
  { id: 'fantasy', label: 'Fantasy', icon: Sparkles },
  { id: 'historical', label: 'Historical', icon: Castle },
  { id: 'comedy', label: 'Comedy', icon: Laugh },
  { id: 'mystery', label: 'Mystery', icon: Search },
  { id: 'drama', label: 'Drama', icon: Film },
  { id: 'sci-fi', label: 'Sci-Fi', icon: Rocket },
  { id: 'horror', label: 'Horror', icon: Skull },
];

const tvfilmCategories = [
  { id: 'movie', label: 'Movie', icon: Film },
  { id: 'variety', label: 'Variety', icon: Tv },
  { id: 'documentary', label: 'Documentary', icon: Camera },
  { id: 'action', label: 'Action', icon: Sword },
  { id: 'comedy', label: 'Comedy', icon: Laugh },
  { id: 'thriller', label: 'Thriller', icon: AlertTriangle },
  { id: 'romance', label: 'Romance', icon: Heart },
  { id: 'sci-fi', label: 'Sci-Fi', icon: Rocket },
  { id: 'horror', label: 'Horror', icon: Skull },
  { id: 'animation', label: 'Animation', icon: Sparkles },
];

const DramaCategories = ({ onCategoryClick, activeCategory, type = 'drama' }) => {
  const categories = type === 'celeb' ? celebCategories : type === 'tvfilm' ? tvfilmCategories : dramaCategories;
  const title = type === 'celeb' ? 'Celeb Categories' : type === 'tvfilm' ? 'TV/Film Categories' : 'Drama Categories';

  return (
    <div className="bg-white border border-[#F3F4F6] shadow-card rounded-2xl p-6">
      <h3 className="font-bold text-[20px] text-[#101828] mb-4">{title}</h3>
      <div className="grid grid-cols-5 gap-y-4 gap-x-2">
        {categories.map(({ id, label, icon: Icon }) => {
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              onClick={() => onCategoryClick?.(id)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`w-[52px] h-[52px] rounded-[14px] border-2 flex items-center justify-center transition-all ${
                  isActive
                    ? 'border-ksp-accent bg-ksp-accent/10'
                    : 'border-[#E5E7EB] bg-white group-hover:border-ksp-accent group-hover:bg-ksp-accent/5'
                }`}
              >
                <Icon
                  size={22}
                  className={`transition-colors ${
                    isActive ? 'text-ksp-accent' : 'text-[#6B7280] group-hover:text-ksp-accent'
                  }`}
                />
              </div>
              <span
                className={`text-xs font-medium transition-colors ${
                  isActive ? 'text-ksp-accent' : 'text-[#374151] group-hover:text-ksp-accent'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DramaCategories;
