import { useState } from 'react';
import Head from 'next/head';
import AnimatedReactionButton from '../../components/AnimatedReactionButton';

/**
 * 효능감 강화 좋아요/싫어요 버튼 데모 페이지
 * /demo/reactions 로 접근
 */
export default function ReactionsDemo() {
  const [reactions, setReactions] = useState({ like: 137, dislike: 12 });
  const [userReaction, setUserReaction] = useState(null);

  const handleClick = (type) => {
    const isCancel = userReaction === type;
    const newUserReaction = isCancel ? null : type;
    const previousReaction = userReaction;

    const newReactions = { ...reactions };
    if (previousReaction) {
      newReactions[previousReaction] = Math.max(0, newReactions[previousReaction] - 1);
    }
    if (!isCancel) {
      newReactions[type] = (newReactions[type] || 0) + 1;
    }
    setReactions(newReactions);
    setUserReaction(newUserReaction);
  };

  return (
    <>
      <Head>
        <title>Reactions Demo - KstarPick</title>
      </Head>

      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #F8F9FB 0%, #FFFFFF 100%)',
          padding: '60px 20px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', color: '#1E2939' }}>
            Reaction Button Demo
          </h1>
          <p style={{ fontSize: '14px', color: '#7D7F85', marginBottom: '40px' }}>
            트위터 스타일 마이크로 인터랙션 + 카운터 슬라이드 + 파티클 폭발
          </p>

          {/* 효능감 강화 버전 */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#2B7FFF',
                  background: 'rgba(43,127,255,0.08)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                }}
              >
                ✨ NEW
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginTop: '12px', color: '#1E2939' }}>
                효능감 강화 버전
              </h2>
              <p style={{ fontSize: '13px', color: '#99A1AF', marginTop: '4px' }}>
                클릭 시 파티클 폭발 + 아이콘 bounce + 카운터 슬라이드 + 햅틱
              </p>
            </div>

            <div className="flex justify-center" style={{ padding: '20px 0', gap: '10px' }}>
              <AnimatedReactionButton
                variant="like"
                count={reactions.like}
                isActive={userReaction === 'like'}
                onClick={() => handleClick('like')}
                label="Like it!"
                icon="/images/like-thumb-blue.svg"
              />
              <AnimatedReactionButton
                variant="dislike"
                count={reactions.dislike}
                isActive={userReaction === 'dislike'}
                onClick={() => handleClick('dislike')}
                label="Not for me"
                icon="/images/notforme-thumb-gray.svg"
              />
            </div>

            <div
              style={{
                marginTop: '20px',
                padding: '12px 16px',
                background: '#F8F9FB',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#7D7F85',
              }}
            >
              현재 상태: {userReaction ? `"${userReaction}" 활성화됨` : '아직 누르지 않음'}
            </div>
          </div>

          {/* 가이드 */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#1E2939' }}>
              테스트 시나리오
            </h2>
            <ol style={{ fontSize: '14px', color: '#4B5563', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li>Like it! 버튼 클릭 → 파티클 폭발 + 카운터 +1</li>
              <li>다시 클릭 → 취소 (효과 없음, 카운터 -1)</li>
              <li>Like 활성 상태에서 Not for me 클릭 → like 취소되고 dislike 활성</li>
              <li>모바일에서 클릭 → 햅틱 진동</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
