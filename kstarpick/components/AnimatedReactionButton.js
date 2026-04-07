import { useState, useRef, useEffect } from 'react';

// 사이즈별 프리셋 (원본 디자인 100% 보존)
const SIZE_PRESETS = {
  mobile: {
    width: 194,
    height: 71,
    border: '1px',
    iconLikeW: 70,
    iconLikeH: 83,
    iconDislikeW: 65,
    iconDislikeH: 80,
    iconLikeTop: 8,
    iconDislikeTop: -18,
    iconOffset: -14,
    textTop: 28,
    textLeftLike: 57,
    textLeftDislike: 36,
    countFontSize: 16,
    labelFontSize: 16,
    enableHoverScale: false,
  },
  pc: {
    width: 232,
    height: 85,
    border: '1.5px',
    iconLikeW: 80,
    iconLikeH: 95,
    iconDislikeW: 74,
    iconDislikeH: 91,
    iconLikeTop: 7,
    iconDislikeTop: -17,
    iconOffset: -20,
    textTop: 50,
    textLeftLike: 74,
    textLeftDislike: 58,
    countFontSize: 18,
    labelFontSize: 16,
    enableHoverScale: true,
  },
};

/**
 * 효능감 강화 좋아요/싫어요 버튼
 * — 원본 디자인 100% 보존
 * — 클릭 시 파티클 폭발 + 아이콘 bounce + 카운터 슬라이드 애니메이션 추가
 *
 * 파티클은 button 외부 wrapper에 렌더링되어 overflow:hidden 영향 없음
 */
export default function AnimatedReactionButton({
  variant = 'like',
  count = 0,
  isActive = false,
  onClick,
  label,
  icon,
  size = 'mobile',
}) {
  const preset = SIZE_PRESETS[size] || SIZE_PRESETS.mobile;
  const isLike = variant === 'like';
  const borderColor = isLike ? '#2B7FFF' : '#A7A7A7';
  const textColor = isLike ? '#2B7FFF' : '#7D7F85';

  const [particles, setParticles] = useState([]);
  const [bursting, setBursting] = useState(false);
  const [countAnimKey, setCountAnimKey] = useState(0);
  const prevCountRef = useRef(count);

  // 카운트 변화 감지 → 슬라이드 애니메이션 트리거
  useEffect(() => {
    if (prevCountRef.current !== count) {
      prevCountRef.current = count;
      setCountAnimKey((k) => k + 1);
    }
  }, [count]);

  const handleClick = () => {
    // 활성화될 때만 (즉, 새로 누를 때만) 폭발 효과
    if (!isActive) {
      const colors = isLike
        ? ['#2B7FFF', '#5DA8FF', '#FF6B9D', '#FFB84D', '#5DD879', '#9C7BFF']
        : ['#A7A7A7', '#7D7F85'];

      const newParticles = Array.from({ length: 14 }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.3;
        const distance = 60 + Math.random() * 40;
        return {
          id: Date.now() + i,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          size: 10 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 60,
        };
      });
      setParticles(newParticles);
      setBursting(true);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }

      setTimeout(() => {
        setParticles([]);
        setBursting(false);
      }, 900);
    }

    onClick?.();
  };

  return (
    <div
      className="reaction-wrapper"
      style={{
        position: 'relative',
        display: 'flex',
        flex: 1,
        maxWidth: `${preset.width}px`,
        height: `${preset.height}px`,
      }}
    >
      <button
        onClick={handleClick}
        className={preset.enableHoverScale ? 'transition-all duration-200 hover:scale-[1.02]' : ''}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: isActive
            ? isLike
              ? 'rgba(43,127,255,0.05)'
              : 'rgba(125,127,133,0.05)'
            : '#FFFFFF',
          border: `${preset.border} solid ${borderColor}`,
          borderRadius: '10px',
          overflow: 'hidden',
          cursor: 'pointer',
          transform: bursting ? 'scale(0.96)' : undefined,
          transition: 'background-color 0.3s ease, transform 0.15s ease',
        }}
      >
        {/* 아이콘 (overflow hidden 안에서 클립됨, 클릭 시 bounce) */}
        <img
          src={icon}
          alt=""
          style={{
            position: 'absolute',
            top: isLike ? `${preset.iconLikeTop}px` : `${preset.iconDislikeTop}px`,
            [isLike ? 'left' : 'right']: `${preset.iconOffset}px`,
            width: isLike ? `${preset.iconLikeW}px` : `${preset.iconDislikeW}px`,
            height: isLike ? `${preset.iconLikeH}px` : `${preset.iconDislikeH}px`,
            pointerEvents: 'none',
            transform: bursting ? 'scale(1.18) rotate(-8deg)' : 'scale(1) rotate(0deg)',
            transformOrigin: 'center center',
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />

        {/* 텍스트 + 카운터 */}
        <div
          style={{
            position: 'absolute',
            top: size === 'pc' ? '50%' : `${preset.textTop}px`,
            transform: size === 'pc' ? 'translateY(-50%)' : 'none',
            left: isLike ? `${preset.textLeftLike}px` : `${preset.textLeftDislike}px`,
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
          }}
        >
          <span
            style={{
              position: 'relative',
              display: 'inline-block',
              minWidth: '20px',
              textAlign: 'left',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 900,
              fontSize: `${preset.countFontSize}px`,
              lineHeight: '1em',
              color: textColor,
              overflow: 'hidden',
            }}
          >
            <span
              key={countAnimKey}
              className="anim-count"
              style={{ display: 'inline-block' }}
            >
              {count}
            </span>
          </span>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: `${preset.labelFontSize}px`,
              lineHeight: '1em',
              color: textColor,
            }}
          >
            {label}
          </span>
        </div>
      </button>

      {/* 파티클 — button 외부에 렌더링되어 overflow:hidden 영향 없음 */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 0,
          height: 0,
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        {particles.map((p) => (
          <span
            key={p.id}
            className="anim-particle"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              backgroundColor: p.color,
              boxShadow: `0 0 12px ${p.color}, 0 0 4px ${p.color}`,
              ['--dx']: `${p.dx}px`,
              ['--dy']: `${p.dy}px`,
              animationDelay: `${p.delay}ms`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        .anim-particle {
          animation: particle-burst 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }
        .anim-count {
          animation: count-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes particle-burst {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          15% {
            transform: translate(
                calc(-50% + var(--dx) * 0.4),
                calc(-50% + var(--dy) * 0.4)
              )
              scale(1.4);
            opacity: 1;
          }
          70% {
            transform: translate(
                calc(-50% + var(--dx) * 0.95),
                calc(-50% + var(--dy) * 0.95)
              )
              scale(1);
            opacity: 0.9;
          }
          100% {
            transform: translate(
                calc(-50% + var(--dx)),
                calc(-50% + var(--dy))
              )
              scale(0);
            opacity: 0;
          }
        }
        @keyframes count-slide-up {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
