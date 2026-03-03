import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';

const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CommentTicker = ({ comments = [], onNavigate }) => {
  const [commentIndex, setCommentIndex] = useState(0);
  const commentTimerRef = useRef(null);
  const commentCount = comments.length;

  useEffect(() => {
    if (commentCount <= 1) return;
    commentTimerRef.current = setInterval(() => {
      setCommentIndex(prev => (prev + 1) % commentCount);
    }, 4000);
    return () => clearInterval(commentTimerRef.current);
  }, [commentCount]);

  const currentComment = comments[commentIndex] || null;

  const handleClick = useCallback(() => {
    if (!currentComment) return;
    const prefix = currentComment.contentType === 'tvfilm' ? '/tvfilm' : '/news';
    onNavigate(`${prefix}/${currentComment.contentSlug}`);
  }, [currentComment, onNavigate]);

  if (!comments.length || !currentComment) return null;

  return (
    <div
      className="relative rounded-full cursor-pointer overflow-hidden"
      style={{
        padding: '2px',
        background: 'linear-gradient(90deg, #78A5FF 0%, #9075FF 100%)',
      }}
      onClick={handleClick}
    >
      <div className="flex items-center gap-[10px] bg-white rounded-full py-[10px] pl-4 pr-3">
        {/* Content group: avatar + text + time */}
        <div className="flex items-center gap-2 flex-1 min-w-0 h-4">
          {/* Avatar group: initial badge + profile image */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Gradient initial badge */}
            <div className="w-[14px] h-[14px] flex items-center justify-center overflow-hidden">
              <span
                className="text-[16px] font-black leading-none"
                style={{
                  fontFamily: "'Pretendard', sans-serif",
                  background: 'linear-gradient(90deg, #064AEC 0%, #0A4EEC 21%, #175AEE 43%, #2E6FF0 67%, #4D8BF4 91%, #75B0F8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {(currentComment.authorName || 'N')[0].toUpperCase()}
              </span>
            </div>
            {/* Profile image */}
            {currentComment.authorImage && (
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                <img
                  src={currentComment.authorImage}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                />
              </div>
            )}
          </div>
          {/* Comment text + Time */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <p className="flex-1 min-w-0 text-xs font-bold text-black truncate" style={{ lineHeight: '1.333em' }}>
              {currentComment.content}
            </p>
            <span className="text-xs font-bold text-ksp-accent flex-shrink-0 w-[27px] text-right">
              {getTimeAgo(currentComment.createdAt)}
            </span>
          </div>
        </div>
        {/* Chevron */}
        <ChevronRight size={16} className="text-[#0A0A0A] flex-shrink-0" strokeWidth={1.33} />
      </div>
    </div>
  );
};

export default CommentTicker;
