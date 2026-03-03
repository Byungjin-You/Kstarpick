const KpopRankingSection = ({ songs = [], onPlayVideo }) => {
  if (!songs || songs.length === 0) return null;

  const topSongs = songs.slice(0, 4);
  const featured = topSongs[0];
  const restSongs = topSongs.slice(1, 4);

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Featured - Full Width Square */}
        <div
          className="relative w-full aspect-square overflow-hidden bg-[#F3F4F6] cursor-pointer group"
          onClick={() => {
            if (featured.youtubeUrl && onPlayVideo) {
              onPlayVideo(featured.youtubeUrl);
            }
          }}
        >
          <img
            src={featured.albumArt || featured.thumbnailUrl || featured.coverImage || '/images/placeholder.jpg'}
            alt={featured.title || featured.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
          />
          {/* Rank badge */}
          <div
            className="absolute flex items-center justify-center"
            style={{ top: '17px', left: '17px', width: '59px', height: '59px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid #BEBEBE' }}
          >
            <span className="text-white font-black" style={{ fontFamily: 'Inter, sans-serif', fontSize: '40px', lineHeight: '1em', letterSpacing: '0.022em' }}>1</span>
          </div>
          {/* Gradient Overlay */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)', height: '107px' }}
          >
            <div className="absolute bottom-0 left-0 right-0 px-[22px] pb-[25px]">
              <div
                className="inline-block px-4 py-[5px] rounded-full text-white text-[10px] font-bold mb-2"
                style={{ background: 'linear-gradient(90deg, #064AEC 0%, #0A4EEC 21%, #175AEE 43%, #2E6FF0 67%, #4D8BF4 91%, #75B0F8 100%)' }}
              >
                #1
              </div>
              <h4 className="font-bold text-[18px] text-white line-clamp-1 leading-[1.2] mb-1">{featured.title || featured.name}</h4>
              {featured.artist && (
                <span className="text-sm text-white/70">{featured.artist}</span>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnails - 3 items grid */}
        <div className="grid grid-cols-3 gap-[10px] mt-4">
          {restSongs.map((song, index) => (
            <div
              key={song._id || index}
              className="cursor-pointer"
              onClick={() => {
                if (song.youtubeUrl && onPlayVideo) {
                  onPlayVideo(song.youtubeUrl);
                }
              }}
            >
              <div className="w-full aspect-square overflow-hidden bg-[#F3F4F6] mb-2">
                <img
                  src={song.albumArt || song.thumbnailUrl || song.coverImage || '/images/placeholder.jpg'}
                  alt={song.title || song.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
                />
              </div>
              <h4 className="font-medium text-[13px] text-[#0A0A0A] line-clamp-1">{song.title || song.name}</h4>
              {song.artist && (
                <span className="text-[12px] text-[#99A1AF] line-clamp-1 block">{song.artist}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Layout - 3 items */}
      <div className="hidden md:flex gap-9">
        {topSongs.slice(0, 3).map((song, index) => (
          <div
            key={song._id || index}
            className="flex flex-col items-start gap-3 cursor-pointer group"
            onClick={() => {
              if (song.youtubeUrl && onPlayVideo) {
                onPlayVideo(song.youtubeUrl);
              }
            }}
          >
            <div className="relative w-[342px] h-[342px] rounded-xl overflow-hidden bg-[#F3F4F6]">
              <img
                src={song.albumArt || song.thumbnailUrl || song.coverImage || '/images/placeholder.jpg'}
                alt={song.title || song.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.target.src = '/images/placeholder.jpg'; }}
              />
              <div
                className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #2B7FFF, #7C3AED)' }}
              >
                {index + 1}
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
            <h4
              className="font-bold text-xl text-left text-[#101828] line-clamp-1 w-[342px] group-hover:text-ksp-accent transition-colors"
              style={{ letterSpacing: '-0.022em' }}
            >
              {song.title || song.name}
            </h4>
            {song.artist && (
              <span className="text-sm text-ksp-meta text-left">{song.artist}</span>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default KpopRankingSection;
