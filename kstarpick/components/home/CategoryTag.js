const CATEGORY_LABELS = {
  kpop: 'K-pop',
  drama: 'Drama',
  movie: 'Film',
  celeb: 'Celebrity',
  variety: 'Variety',
  tvfilm: 'TV/Film',
  other: 'News',
};

const CategoryTag = ({ category, className = '', variant = 'default' }) => {
  const label = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;

  if (variant === 'overlay') {
    // Used on top of images - white semi-transparent background, blue text
    return (
      <span
        className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${className}`}
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', color: '#518EF4' }}
      >
        {label}
      </span>
    );
  }

  // Default: blue background, white text (Editor's Pick style)
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={{ backgroundColor: '#2B7FFF', color: '#FFFFFF' }}
    >
      {label}
    </span>
  );
};

export default CategoryTag;
export { CATEGORY_LABELS };
