import { useId } from 'react';

// SudoDo original interlocking double-circle logo
function OriginalIconMark({ gl1, gl2, pillFill, pillStroke, maskColor, x = 0, y = 0, scaleMark = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scaleMark})`}>
      <rect x="2" y="2" width="92" height="92" rx="26" fill={pillFill} stroke={pillStroke} strokeWidth="1.5" />
      <circle cx="34" cy="48" r="20" fill="none" stroke={`url(#${gl1})`} strokeWidth="8" />
      <circle cx="62" cy="48" r="20" fill="none" stroke={`url(#${gl2})`} strokeWidth="8" />
      <rect x="44" y="28" width="12" height="40" fill={maskColor} />
      <path d="M44 33 Q48 48 44 63" stroke={`url(#${gl1})`} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M56 33 Q52 48 56 63" stroke={`url(#${gl2})`} strokeWidth="8" fill="none" strokeLinecap="round" />
      <circle cx="17" cy="48" r="6" fill="#f472b6" />
      <circle cx="79" cy="48" r="6" fill="#a78bfa" />
    </g>
  );
}

export function LegacyLogo({ size = 'md', className = '' }) {
  return <Logo variant="icon" size={size} className={className} />;
}

export default function Logo({ variant = 'full', size = 'md', className = '' }) {
  const uid = useId().replace(/:/g, '');
  const gl1 = `gl1-${uid}`;
  const gl2 = `gl2-${uid}`;
  const gtext = `gtext-${uid}`;
  const gtextDark = `gtext-dark-${uid}`;

  const scale = size === 'xs' ? 0.35 : size === 'sm' ? 0.6 : size === 'md' ? 0.8 : size === 'lg' ? 1.2 : 1;
  const isWhite = variant === 'white';
  const isDark = variant === 'dark';
  const iconOnly = variant === 'icon';

  const width = iconOnly ? 96 * scale : 360 * scale;
  const height = iconOnly ? 96 * scale : 100 * scale;

  const pillFill = isDark ? 'rgba(255,255,255,0.08)' : isWhite ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
  const pillStroke = isDark ? 'rgba(255,255,255,0.18)' : isWhite ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.8)';
  const maskColor = isDark ? 'rgba(30, 27, 75, 0.95)' : isWhite ? 'transparent' : 'rgba(255,255,255,0.55)';
  const textFill = isWhite ? '#fff' : isDark ? `url(#${gtextDark})` : `url(#${gtext})`;
  const subFill = isWhite ? 'rgba(255,255,255,0.65)' : isDark ? '#c4b5fd' : '#8176b5';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={iconOnly ? '0 0 96 96' : '0 0 360 100'}
      role="img"
      aria-label={iconOnly ? 'SudoDo' : 'SudoDo Task Manager'}
      className={className}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <defs>
        <linearGradient id={gl1} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id={gl2} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id={gtext} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id={gtextDark} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f9a8d4" />
        </linearGradient>
      </defs>

      {isDark && !iconOnly && <rect width="360" height="100" rx="20" fill="#0f0f1a" />}

      <OriginalIconMark
        gl1={gl1}
        gl2={gl2}
        pillFill={pillFill}
        pillStroke={pillStroke}
        maskColor={maskColor}
        x={iconOnly ? 0 : 2}
        y={iconOnly ? 0 : 2}
        scaleMark={iconOnly ? 1 : 0.96}
      />

      {!iconOnly && (
        <>
          <text x="108" y="58" fontFamily="system-ui,-apple-system,sans-serif" fontSize="38" fontWeight="800" fill={textFill}>
            SudoDo
          </text>
          <text x="110" y="76" fontFamily="system-ui,sans-serif" fontSize="10" fontWeight="600" fill={subFill} letterSpacing="4">
            TASK MANAGER
          </text>
        </>
      )}
    </svg>
  );
}
