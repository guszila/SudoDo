import { useId } from 'react';

export function LegacyLogo({ size = 'md', className = '' }) {
  const scale = size === 'sm' ? 0.6 : size === 'lg' ? 1.2 : 0.8;
  const gradientId = `legacy-logo-gradient-${useId().replace(/:/g, '')}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={96 * scale} height={96 * scale} viewBox="0 0 96 96" role="img" aria-label="SudoDo" className={className} style={{ maxWidth: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" /><stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="92" height="92" rx="26" fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" />
      <circle cx="34" cy="48" r="20" fill="none" stroke={`url(#${gradientId})`} strokeWidth="8" />
      <circle cx="62" cy="48" r="20" fill="none" stroke={`url(#${gradientId})`} strokeWidth="8" />
      <rect x="44" y="28" width="12" height="40" fill="rgba(255,255,255,0.55)" />
      <path d="M44 33 Q48 48 44 63" stroke={`url(#${gradientId})`} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M56 33 Q52 48 56 63" stroke={`url(#${gradientId})`} strokeWidth="8" fill="none" strokeLinecap="round" />
      <circle cx="17" cy="48" r="6" fill="#f472b6" /><circle cx="79" cy="48" r="6" fill="#a78bfa" />
    </svg>
  );
}

// SudoDo logo: a focused S-shape joined with a completion checkmark.
function IconMark({ gradientId, iconBackground, pillFill, pillStroke, checkColor, x = 0, y = 0, scaleMark = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scaleMark})`}>
      <rect width="96" height="96" rx="26" fill={iconBackground} />
      <rect x="3" y="3" width="90" height="90" rx="24" fill={pillFill} stroke={pillStroke} strokeWidth="1.5" />
      <path d="M68 27H38c-9 0-16 5-16 12s7 12 16 12h20c9 0 16 5 16 12s-7 12-16 12H28" fill="none" stroke={`url(#${gradientId})`} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M54 58l8 8 16-18" fill="none" stroke={checkColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="27" r="4" fill="#f472b6" />
    </g>
  );
}

export default function Logo({ variant = 'full', size = 'md', className = '' }) {
  const scale = size === 'xs' ? 0.35 : size === 'sm' ? 0.6 : size === 'md' ? 0.8 : size === 'lg' ? 1.2 : 1;
  const gradientId = `sudo-logo-gradient-${useId().replace(/:/g, '')}`;
  const isWhite = variant === 'white';
  const isDark = variant === 'dark';
  const iconOnly = variant === 'icon';
  const width = iconOnly ? 96 * scale : 360 * scale;
  const height = iconOnly ? 96 * scale : 100 * scale;
  const pillFill = isDark ? 'rgba(255,255,255,0.08)' : isWhite ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
  const pillStroke = isDark ? 'rgba(255,255,255,0.18)' : isWhite ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.8)';
  const textFill = isWhite ? '#fff' : isDark ? '#f9a8d4' : `url(#${gradientId})`;
  const subFill = isWhite ? 'rgba(255,255,255,0.65)' : isDark ? '#c4b5fd' : '#8176b5';
  const iconBackground = isDark ? '#0f0f1a' : isWhite ? 'transparent' : 'none';

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
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="52%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      {isDark && !iconOnly && <rect width="360" height="100" rx="20" fill="#0f0f1a" />}
      <IconMark gradientId={gradientId} iconBackground={iconBackground} pillFill={pillFill} pillStroke={pillStroke} checkColor="#fff" x={iconOnly ? 0 : 2} y={iconOnly ? 0 : 2} scaleMark={iconOnly ? 1 : 0.9} />
      {!iconOnly && (
        <>
          <text x="108" y="58" fontFamily="system-ui,-apple-system,sans-serif" fontSize="38" fontWeight="800" fill={textFill}>SudoDo</text>
          <text x="110" y="76" fontFamily="system-ui,sans-serif" fontSize="10" fontWeight="600" fill={subFill} letterSpacing="4">TASK MANAGER</text>
        </>
      )}
    </svg>
  );
}
