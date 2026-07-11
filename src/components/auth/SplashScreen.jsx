import { useEffect, useState } from 'react';
import { LegacyLogo } from '../layout/Logo';
import { version } from '../../../package.json';
import { THEMES, DEFAULT_THEME } from '../../constants/themes';

export default function SplashScreen({ onDone }) {
  const [status, setStatus] = useState('กำลังเตรียมพื้นที่ทำงาน...');
  const colorThemeId = localStorage.getItem('color_theme') || DEFAULT_THEME;
  const currentTheme = THEMES[colorThemeId] || THEMES[DEFAULT_THEME];
  const isDark = currentTheme.forceDark || localStorage.getItem('theme') === 'dark';
  const accentColor = isDark ? currentTheme.accentDark : currentTheme.accent;

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const statusTimer = window.setTimeout(() => {
      setStatus(isDark ? 'กำลังเปิดโหมดส่วนตัว...' : 'กำลังซิงก์งานของคุณ...');
    }, reducedMotion ? 200 : 500);
    const doneTimer = window.setTimeout(onDone, reducedMotion ? 500 : 1000);

    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(doneTimer);
    };
  }, [isDark, onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden px-6 pt-safe pb-safe"
      style={{ background: isDark ? currentTheme.darkGradient : currentTheme.gradient, minHeight: '100dvh' }}
    >
      <style>{`
        @keyframes splashLogoIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splashGlow {
          0%, 100% { transform: scale(1); opacity: 0.16; }
          50% { transform: scale(1.08); opacity: 0.26; }
        }
        @keyframes splashProgress {
          from { transform: scaleX(0.08); }
          to { transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-motion { animation: none !important; }
        }
      `}</style>

      <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-white blur-[70px] splash-motion" style={{ animation: 'splashGlow 4s ease-in-out infinite' }} />
      <div className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-primary-300/50 blur-[80px] splash-motion" style={{ animation: 'splashGlow 5s ease-in-out infinite 0.8s' }} />

      <div className="relative z-10 flex flex-col items-center text-center splash-motion" style={{ animation: 'splashLogoIn 0.55s ease-out both' }}>
        <div className="relative flex items-center justify-center w-[88px] h-[88px]">
          <div className="absolute inset-0 rounded-[28px] border-2 border-white/40 splash-motion" style={{ animation: 'splashGlow 2.5s ease-in-out infinite' }} />
          <LegacyLogo size="md" className="w-20 h-20" />
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight" style={{ background: 'linear-gradient(90deg, #7c3aed, #db2777)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SudoDo</h1>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-main/55">Task Manager</p>
        <p className="mt-5 text-sm font-medium text-main/65">
          {status}
        </p>
        <div className="mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-black/10 dark:bg-white/10" aria-hidden="true">
          <div className="h-full origin-left rounded-full splash-motion" style={{ width: '100%', backgroundColor: accentColor, animation: 'splashProgress 0.95s ease-out both' }} />
        </div>
      </div>

      <p className="absolute bottom-[max(1.25rem,calc(0.75rem+env(safe-area-inset-bottom)))] text-[11px] font-medium text-main/40">
        v{version}
      </p>
    </div>
  );
}
