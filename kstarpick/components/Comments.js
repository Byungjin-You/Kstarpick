import { useState, useEffect } from 'react';
import { Smile } from 'lucide-react';

// ─── Helpers ───
function getColorFromNickname(nickname) {
  const colors = [
    { main: '#FF6B6B', secondary: '#FFA500' },
    { main: '#4ECDC4', secondary: '#44A08D' },
    { main: '#A06CD5', secondary: '#5B6DEC' },
    { main: '#F38181', secondary: '#FCE38A' },
    { main: '#3AAFA9', secondary: '#2B7A78' },
    { main: '#F857A6', secondary: '#FF5858' },
    { main: '#56AB2F', secondary: '#A8E063' },
    { main: '#1FA2FF', secondary: '#12D8FA' },
  ];
  if (!nickname) return colors[0];
  const hash = String(nickname).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getAvatarByUser(userId, userName) {
  const seed = userId || userName || 'guest';
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

function formatCommentDate(dateInput) {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function getVisitorId() {
  if (typeof window === 'undefined') return 'anonymous';
  let vid = localStorage.getItem('ksp_visitor_id');
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('ksp_visitor_id', vid);
  }
  return vid;
}

/**
 * 재사용 가능한 Comments 컴포넌트 (반응형: 모바일 + PC)
 *
 * @param {string} contentId - 콘텐츠 ID (필수)
 * @param {string} contentType - 'news' | 'schedule' | 'drama' 등 (기본 'news')
 */
export default function Comments({ contentId, contentType = 'news' }) {
  const [localComments, setLocalComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSort, setCommentSort] = useState('latest');
  const [visibleCommentCount, setVisibleCommentCount] = useState(5);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (!contentId) return;
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, contentType]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/news/comment?id=${contentId}&type=${contentType}`, {
        headers: { 'x-visitor-id': getVisitorId() }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const formatted = data.comments.map(comment => {
          const userId = comment.author?._id || comment._id;
          const userName = comment.author?.name || comment.guestName || 'Guest';
          const avatarUrl = comment.author?.image || getAvatarByUser(userId, userName);
          return {
            id: comment._id,
            author: userName,
            avatar: avatarUrl,
            text: comment.content,
            timestamp: comment.createdAt,
            likes: comment.likes || 0,
            dislikes: comment.dislikes || 0,
            userReaction: comment.userReaction || null,
            isGuest: comment.isGuest || comment.author?.isGuest || false,
          };
        });
        setLocalComments(formatted);
      }
    } catch (err) {
      console.error('Comments fetch error:', err);
    }
  };

  const handleCommentChange = (e) => {
    if (e.target.value.length <= 300) setNewComment(e.target.value);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const response = await fetch('/api/news/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-visitor-id': getVisitorId(),
        },
        body: JSON.stringify({
          id: contentId,
          type: contentType,
          content: newComment.trim(),
        }),
      });
      if (response.ok) {
        setNewComment('');
        await fetchComments();
      }
    } catch (err) {
      console.error('Comment submit error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentReaction = async (commentId, reactionType) => {
    try {
      const res = await fetch('/api/news/comment-reaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-visitor-id': getVisitorId(),
        },
        body: JSON.stringify({ commentId, type: reactionType }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalComments(prev => prev.map(c =>
          c.id === commentId
            ? { ...c, likes: data.likes ?? c.likes, dislikes: data.dislikes ?? c.dislikes, userReaction: data.userReaction ?? c.userReaction }
            : c
        ));
      }
    } catch (err) {
      console.error('Comment reaction error:', err);
    }
  };

  const sortedComments = [...localComments].sort((a, b) => {
    if (commentSort === 'popular') return ((b.likes || 0) + (b.dislikes || 0)) - ((a.likes || 0) + (a.dislikes || 0));
    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });

  return (
    <>
      {/* ============ Mobile ============ */}
      <div className="lg:hidden">
        <div style={{ padding: '16px 0 8px', borderTop: '8px solid #F2F3F6', borderBottom: '8px solid #F2F3F6' }}>
          {/* Header */}
          <div className="flex items-center justify-between" style={{ padding: '0 16px 12px' }}>
            <div className="flex items-center" style={{ gap: '6px' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '18px', lineHeight: '27px', letterSpacing: '-0.44px', color: '#1E2939' }}>
                Comments <span style={{ color: '#2B7FFF' }}>{localComments.length}</span>
              </span>
            </div>
            <div className="flex" style={{ gap: '4px' }}>
              {['latest', 'popular'].map(sort => (
                <button
                  key={sort}
                  onClick={() => setCommentSort(sort)}
                  style={{
                    border: `1px solid ${commentSort === sort ? '#1E2939' : '#D1D5DC'}`,
                    borderRadius: '4px',
                    padding: '5px 9px',
                    fontFamily: 'Pretendard, sans-serif',
                    fontWeight: 500,
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: commentSort === sort ? '#1E2939' : '#99A1AF',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {sort === 'latest' ? 'Latest' : 'Popular'}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Input */}
          <div style={{ padding: '12px 16px' }}>
            <form onSubmit={handleCommentSubmit}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #D1D5DC', borderRadius: '10px', padding: '13px 13px 1px' }}>
                <textarea
                  className="w-full focus:outline-none resize-none"
                  placeholder="Write your comment here"
                  value={newComment}
                  onChange={handleCommentChange}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '14px',
                    lineHeight: '20px',
                    letterSpacing: '-0.15px',
                    color: '#333',
                    minHeight: '40px',
                    border: 'none',
                    background: 'transparent',
                  }}
                />
                <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Smile size={20} color="#99A1AF" />
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-1 bg-white p-2 rounded-lg shadow-md z-50 flex gap-2 flex-wrap border border-gray-200" style={{ width: '200px' }}>
                        {['😊', '👍', '❤️', '🔥', '👏', '😂', '🎉', '👀', '🙏', '😍'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            className="w-8 h-8 text-xl hover:bg-gray-50 rounded flex items-center justify-center"
                            onClick={() => {
                              setNewComment(prev => (prev + ' ' + emoji).slice(0, 300));
                              setShowEmojiPicker(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '16px', color: '#99A1AF' }}>
                      {newComment.length}/300
                    </span>
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submittingComment}
                      style={{
                        backgroundColor: !newComment.trim() || submittingComment ? '#D1D5DC' : '#233CFA',
                        borderRadius: '4px',
                        padding: '6px 9px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 700,
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: !newComment.trim() || submittingComment ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {submittingComment ? '...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Comments List */}
          <div className="flex flex-col">
            {localComments.length > 0 ? (
              sortedComments.slice(0, visibleCommentCount || 5).map((comment, index) => {
                const colors = getColorFromNickname(comment.author);
                return (
                  <div
                    key={comment.id || index}
                    className="flex flex-col"
                    style={{
                      padding: index === 0 ? '20px 16px' : '12px 16px',
                      gap: index === 0 ? '12px' : '4px',
                      borderBottom: '1px solid #F3F4F6',
                      backgroundColor: index === 0 ? 'rgba(242, 244, 254, 0.5)' : '#FFFFFF',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center" style={{ gap: '8px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '100px', overflow: 'hidden', flexShrink: 0, border: '1px solid #E9EBEF' }}>
                          <img
                            src={comment.avatar}
                            alt={comment.author}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              const parentNode = e.target.parentNode;
                              const gradientDiv = document.createElement('div');
                              gradientDiv.className = 'flex items-center justify-center';
                              gradientDiv.style.cssText = `width:100%;height:100%;background:linear-gradient(135deg, ${colors.main} 0%, ${colors.secondary} 100%)`;
                              const initial = document.createElement('span');
                              initial.textContent = comment.author.charAt(0).toUpperCase();
                              initial.className = 'text-white font-bold text-sm';
                              gradientDiv.appendChild(initial);
                              parentNode.appendChild(gradientDiv);
                            }}
                          />
                        </div>
                        <div className="flex flex-col" style={{ gap: '2px' }}>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px', color: '#101828' }}>
                            {comment.author}
                          </span>
                          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '12px', lineHeight: '16px', letterSpacing: '-0.4px', color: '#99A1AF' }}>
                            {formatCommentDate(comment.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '19.25px', letterSpacing: '-0.15px', color: '#333333', margin: 0 }}>
                      {comment.text}
                    </p>
                    <div className="flex items-center justify-end">
                      <div className="flex items-center" style={{ gap: '20px' }}>
                        <button className="flex items-center" style={{ gap: '2px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleCommentReaction(comment.id, 'like')}>
                          <img src="/images/comment-like.svg" alt="like" style={{ width: '16px', height: '16px', opacity: comment.userReaction === 'like' ? 1 : 0.5 }} />
                          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px', lineHeight: '20px', letterSpacing: '-0.15px', color: comment.userReaction === 'like' ? '#2B7FFF' : '#99A1AF' }}>
                            {comment.likes || 0}
                          </span>
                        </button>
                        <button className="flex items-center" style={{ gap: '2px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleCommentReaction(comment.id, 'dislike')}>
                          <img src="/images/comment-dislike.svg" alt="dislike" style={{ width: '16px', height: '16px', opacity: comment.userReaction === 'dislike' ? 1 : 0.5 }} />
                          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px', lineHeight: '20px', letterSpacing: '-0.15px', color: comment.userReaction === 'dislike' ? '#2B7FFF' : '#99A1AF' }}>
                            {comment.dislikes || 0}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#99A1AF', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>

          {/* Show more / Collapse */}
          {localComments.length > 5 && (
            <div className="flex justify-end" style={{ padding: '16px' }}>
              {visibleCommentCount < localComments.length ? (
                <button
                  onClick={() => setVisibleCommentCount(visibleCommentCount + 5)}
                  className="flex items-center"
                  style={{ gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '20px', color: '#101828' }}>
                    Show More Comments
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="#99A1AF" strokeWidth="1.14"/></svg>
                </button>
              ) : (
                <button
                  onClick={() => setVisibleCommentCount(5)}
                  className="flex items-center"
                  style={{ gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '14px', lineHeight: '20px', color: '#101828' }}>
                    Collapse Comments
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 10L8 6L4 10" stroke="#99A1AF" strokeWidth="1.14"/></svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============ PC ============ */}
      <div className="hidden lg:block">
        <div className="flex flex-col" style={{ padding: '30px 25px 40px', gap: '30px' }}>
          <div className="flex flex-col" style={{ gap: '10px' }}>
            {/* Header */}
            <div className="flex flex-col" style={{ gap: '6px' }}>
              <div className="flex items-center" style={{ gap: '6px' }}>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '18px', lineHeight: '1.5em', letterSpacing: '-0.024em', color: '#1E2939' }}>
                  Comments {localComments.length > 0 && localComments.length}
                </span>
                <img src="/images/icons8-messaging-48.png" alt="" className="w-6 h-6" />
              </div>
            </div>

            {/* Comment input */}
            <div className="rounded-[12px] overflow-hidden">
              <div style={{ padding: '16px 16px 1px' }}>
                <form onSubmit={handleCommentSubmit}>
                  <div className="bg-white rounded-[10px] border border-[#D1D5DC] flex flex-col" style={{ padding: '13px', height: '132px', gap: '14px' }}>
                    <textarea
                      className="w-full flex-1 bg-transparent focus:outline-none resize-none"
                      placeholder="Write your comment here"
                      value={newComment}
                      onChange={handleCommentChange}
                      maxLength={300}
                      style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '1.43em', letterSpacing: '-0.011em', color: '#111111' }}
                    />
                    <div className="flex justify-end items-center">
                      <div className="flex items-center" style={{ gap: '8px' }}>
                        <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '12px', lineHeight: '1.33em', color: '#99A1AF' }}>
                          {newComment.length}/300
                        </span>
                        <button
                          type="submit"
                          disabled={!newComment.trim() || submittingComment}
                          className="transition-all"
                          style={{
                            fontFamily: 'Inter', fontWeight: 700, fontSize: '12px', lineHeight: '1.33em', color: '#FFFFFF',
                            background: !newComment.trim() || submittingComment ? '#D1D5DC' : '#2B7FFF',
                            borderRadius: '4px',
                            padding: '6px 9px',
                            cursor: !newComment.trim() || submittingComment ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {submittingComment ? '...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Sort tabs */}
            <div style={{ padding: '16px 0 17px', borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex items-center" style={{ gap: '8px' }}>
                <button
                  onClick={() => setCommentSort('latest')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'Inter', fontWeight: commentSort === 'latest' ? 700 : 400, fontSize: '14px', lineHeight: '1.36em', letterSpacing: '-0.021em', color: commentSort === 'latest' ? '#111111' : '#99A1AF'
                  }}
                >
                  Latest
                </button>
                <div style={{ width: '3px', height: '3px', borderRadius: '1.5px', background: '#99A1AF' }} />
                <button
                  onClick={() => setCommentSort('popular')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'Inter', fontWeight: commentSort === 'popular' ? 700 : 400, fontSize: '14px', lineHeight: '1.36em', letterSpacing: '-0.021em', color: commentSort === 'popular' ? '#111111' : '#99A1AF'
                  }}
                >
                  Popular
                </button>
              </div>
            </div>

            {/* Comments list */}
            <div className="flex flex-col rounded-[12px] overflow-hidden">
              {localComments.length > 0 ? (
                <>
                  <div style={{ background: 'rgba(242, 244, 254, 0.5)' }}>
                    {sortedComments.slice(0, visibleCommentCount || 10).map((comment, index) => {
                      const colors = getColorFromNickname(comment.author);
                      return (
                        <div key={comment.id || index} className="flex flex-col" style={{ padding: '16px 25px', borderBottom: '1px solid #F3F4F6', gap: '8px' }}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center" style={{ gap: '8px' }}>
                              <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: '40px', height: '40px', background: `linear-gradient(135deg, ${colors.main} 0%, ${colors.secondary} 100%)` }}>
                                <img src={comment.avatar} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                              </div>
                              <div className="flex flex-col" style={{ gap: '2px' }}>
                                <div className="flex items-center" style={{ gap: '4px' }}>
                                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px', lineHeight: '1.36em', letterSpacing: '-0.021em', color: '#151517' }}>{comment.author}</span>
                                </div>
                                <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '14px', lineHeight: '1.14em', letterSpacing: '-0.029em', color: '#99A1AF' }}>{formatCommentDate(comment.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                          <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '15px', lineHeight: '1.33em', letterSpacing: '-0.02em', color: '#151517', margin: 0 }}>{comment.text}</p>
                          <div className="flex justify-end items-center">
                            <div className="flex items-center" style={{ gap: '12px' }}>
                              <button className="flex items-center" style={{ gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleCommentReaction(comment.id, 'like')}>
                                <img src="/images/comment-like.svg" alt="like" style={{ width: '12px', height: '12px', opacity: comment.userReaction === 'like' ? 1 : 0.5 }} />
                                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '16px', lineHeight: '1.5em', letterSpacing: '-0.02em', color: comment.userReaction === 'like' ? '#2B7FFF' : '#99A1AF' }}>{comment.likes || 0}</span>
                              </button>
                              <button className="flex items-center" style={{ gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleCommentReaction(comment.id, 'dislike')}>
                                <img src="/images/comment-dislike.svg" alt="dislike" style={{ width: '12px', height: '12px', opacity: comment.userReaction === 'dislike' ? 1 : 0.5 }} />
                                <span style={{ fontFamily: 'Inter', fontWeight: comment.userReaction === 'dislike' ? 700 : 500, fontSize: '16px', lineHeight: '1.5em', letterSpacing: '-0.02em', color: comment.userReaction === 'dislike' ? '#2B7FFF' : '#99A1AF' }}>{comment.dislikes || 0}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {visibleCommentCount < localComments.length && (
                    <div style={{ padding: '20px 25px' }}>
                      <button
                        onClick={() => setVisibleCommentCount(prev => prev + 5)}
                        className="w-full flex items-center justify-center transition-colors hover:bg-gray-50"
                        style={{
                          padding: '14px 40px',
                          borderRadius: '9999px',
                          border: '1px solid #E5E7EB',
                          background: '#FFFFFF',
                          gap: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.15px', color: '#374151' }}>
                          More Comments
                        </span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#99A1AF', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
