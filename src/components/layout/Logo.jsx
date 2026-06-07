// Logo.jsx — SudoDo Logo Component
// Usage:
//   <Logo />                    full color, medium
//   <Logo variant="icon" />     icon only
//   <Logo variant="dark" />     dark background version
//   <Logo variant="white" />    white (for colored bg)
//   <Logo size="sm" />          small
//   <Logo size="lg" />          large

export default function Logo({ variant = "full", size = "md", className = "" }) {
  const scale = 
    size === "xs" ? 0.35 :
    size === "sm" ? 0.6 : 
    size === "md" ? 0.8 : 
    size === "lg" ? 1.2 : 1;
  const iconW = 96 * scale;
  const iconH = 96 * scale;

  const maskColor =
    variant === "dark" ? "#0f0f1a" :
    variant === "white" ? "transparent" : "white";

  const textColor =
    variant === "white" ? "white" :
    variant === "dark"  ? "url(#gtext-dark)" : "url(#gtext)";

  const subColor =
    variant === "white" ? "rgba(255,255,255,0.6)" :
    variant === "dark"  ? "#6b5b8a" : "#9d8ec0";

  const bgFill =
    variant === "dark"  ? "#0f0f1a" : "none";

  const pillFill =
    variant === "dark"  ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)";

  const pillStroke =
    variant === "dark"  ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.8)";

  if (variant === "icon") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={iconW}
        height={iconH}
        viewBox="0 0 96 96"
        aria-label="SudoDo"
        className={className}
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <defs>
          <linearGradient id="gi1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6"/>
            <stop offset="100%" stopColor="#a78bfa"/>
          </linearGradient>
          <linearGradient id="gi2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa"/>
            <stop offset="100%" stopColor="#f472b6"/>
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="92" height="92" rx="26"
          fill={pillFill} stroke={pillStroke} strokeWidth="1.5"/>
        <circle cx="34" cy="48" r="20" fill="none" stroke="url(#gi1)" strokeWidth="8"/>
        <circle cx="62" cy="48" r="20" fill="none" stroke="url(#gi2)" strokeWidth="8"/>
        <rect x="44" y="28" width="12" height="40" fill={maskColor}/>
        <path d="M44 33 Q48 48 44 63" stroke="url(#gi1)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d="M56 33 Q52 48 56 63" stroke="url(#gi2)" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <circle cx="17" cy="48" r="6" fill="#f472b6"/>
        <circle cx="79" cy="48" r="6" fill="#a78bfa"/>
      </svg>
    );
  }

  const totalW = variant === "full" || variant === "dark" ? 320 * scale : 320 * scale;
  const totalH = 100 * scale;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={totalW}
      height={totalH}
      viewBox="0 0 320 100"
      aria-label="SudoDo Task Manager"
      className={className}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <defs>
        <linearGradient id="gl1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6"/>
          <stop offset="100%" stopColor="#a78bfa"/>
        </linearGradient>
        <linearGradient id="gl2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="100%" stopColor="#f472b6"/>
        </linearGradient>
        <linearGradient id="gtext" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#db2777"/>
        </linearGradient>
        <linearGradient id="gtext-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c084fc"/>
          <stop offset="100%" stopColor="#f9a8d4"/>
        </linearGradient>
      </defs>
      {variant === "dark" && (
        <rect width="320" height="100" rx="20" fill={bgFill}/>
      )}
      <rect x="4" y="8" width="88" height="84" rx="22"
        fill={pillFill} stroke={pillStroke} strokeWidth="1.5"/>
      <circle cx="32" cy="50" r="22" fill="none" stroke="url(#gl1)" strokeWidth="8"/>
      <circle cx="68" cy="50" r="22" fill="none" stroke="url(#gl2)" strokeWidth="8"/>
      <rect x="43" y="28" width="14" height="44" fill={maskColor}/>
      <path d="M43 34 Q50 50 43 66" stroke="url(#gl1)" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <path d="M57 34 Q50 50 57 66" stroke="url(#gl2)" strokeWidth="8" fill="none" strokeLinecap="round"/>
      <circle cx="14" cy="50" r="7" fill="#f472b6"/>
      {variant !== "white" && <circle cx="14" cy="50" r="3.5" fill="white" fillOpacity="0.6"/>}
      <circle cx="86" cy="50" r="7" fill="#a78bfa"/>
      {variant !== "white" && <circle cx="86" cy="50" r="3.5" fill="white" fillOpacity="0.6"/>}
      <text x="108" y="58"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="38" fontWeight="800"
        fill={textColor}>
        SudoDo
      </text>
      <text x="110" y="76"
        fontFamily="system-ui,sans-serif"
        fontSize="10" fontWeight="500"
        fill={subColor} letterSpacing="4">
        TASK MANAGER
      </text>
    </svg>
  );
}
