import { useEffect } from 'react';
import Logo from '../layout/Logo';
import { version } from '../../../package.json';
import { THEMES, DEFAULT_THEME } from '../../constants/themes';

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  // Read theme from localStorage to apply it immediately without waiting for context
  const colorThemeId = localStorage.getItem('color_theme') || DEFAULT_THEME;
  const currentTheme = THEMES[colorThemeId] || THEMES[DEFAULT_THEME];
  
  // Determine if it should be dark mode
  const isDark = currentTheme.forceDark || localStorage.getItem('theme') === 'dark';
  const backgroundGradient = isDark ? currentTheme.darkGradient : currentTheme.gradient;
  const accentColor = isDark ? currentTheme.accentDark : currentTheme.accent;
  
  // Custom theme colors for inline styles
  const accentLightHex = currentTheme.accentLight.startsWith('#') 
    ? currentTheme.accentLight 
    : accentColor; // Fallback for midnight's rgba

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden" style={{ background: backgroundGradient, animation: 'splashFadeOut 0.3s ease-out 2.2s both' }}>
      <style>{`
        @keyframes logoScale {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes wordFade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes subFade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes dotPop {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes splashFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes circlePulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
      `}</style>

      {/* Decorative blurred circles */}
      <div className="absolute top-[15%] left-[10%] w-64 h-64 rounded-full bg-white blur-[60px]" style={{ animation: 'circlePulse 4s ease-in-out infinite', opacity: isDark ? 0.05 : undefined }} />
      <div className="absolute top-[40%] right-[10%] w-80 h-80 rounded-full bg-white blur-[80px]" style={{ animation: 'circlePulse 5s ease-in-out infinite 1s', opacity: isDark ? 0.05 : undefined }} />
      <div className="absolute bottom-[10%] left-[20%] w-72 h-72 rounded-full bg-white blur-[70px]" style={{ animation: 'circlePulse 4.5s ease-in-out infinite 2s', opacity: isDark ? 0.05 : undefined }} />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Logo Container */}
        <div className="relative flex items-center justify-center w-[88px] h-[88px] mb-6" style={{ animation: 'logoScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both' }}>
          {/* Ripple rings */}
          <div className="absolute inset-0 rounded-[28px] border-2 border-white/60" style={{ animation: 'ripple 2s cubic-bezier(0.1, 0.7, 0.3, 1) infinite' }} />
          <div className="absolute inset-0 rounded-[28px] border-2 border-white/40" style={{ animation: 'ripple 2s cubic-bezier(0.1, 0.7, 0.3, 1) infinite 1s' }} />
          
          {/* Glass pill */}
          <div className="absolute inset-0 rounded-[28px] bg-white/40 backdrop-blur-md border-[1.5px] border-white/70 shadow-lg flex items-center justify-center z-10">
            <Logo variant="icon" size="md" className="w-12 h-12" />
          </div>
        </div>

        {/* Wordmark */}
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-[36px] font-[800] tracking-tight leading-none mb-2" style={{ 
            background: 'linear-gradient(90deg, #7c3aed, #db2777)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            animation: 'wordFade 0.5s ease-out 0.8s both'
          }}>
            SudoDo
          </h1>
          <p className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ 
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(83,74,183,0.7)',
            animation: 'subFade 0.4s ease-out 1.1s both'
          }}>
            Task Manager
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-4" style={{ animation: 'subFade 0.4s ease-out 1.3s both' }}>
          {/* Ring Spinner */}
          <div className="w-[36px] h-[36px] rounded-full border-4" style={{ 
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(127,119,221,0.2)',
            borderTopColor: accentColor,
            animation: 'spin 0.9s linear infinite' 
          }} />
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1 mt-1">
              <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: accentColor, animation: 'dotPop 1.4s ease-in-out infinite' }} />
              <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: accentColor, animation: 'dotPop 1.4s ease-in-out infinite 0.2s' }} />
              <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: accentColor, animation: 'dotPop 1.4s ease-in-out infinite 0.4s' }} />
            </div>
          </div>
        </div>

      </div>

      {/* Version */}
      <div className="absolute bottom-8 left-0 right-0 text-center" style={{ animation: 'subFade 0.4s ease-out 1.5s both' }}>
        <p className="text-[11px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(83,74,183,0.4)' }}>v{version}</p>
      </div>

    </div>
  );
}
