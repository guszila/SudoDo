import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { version } from '../../../package.json';
import { THEMES, DEFAULT_THEME } from '../../constants/themes';

export default function SplashScreen({ onDone, isReady = true }) {
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [showReady, setShowReady] = useState(false);

  const isReadyRef = useRef(isReady);
  const onDoneRef = useRef(onDone);
  const animCompletedRef = useRef(false);

  const colorThemeId = localStorage.getItem('color_theme') || DEFAULT_THEME;
  const currentTheme = THEMES[colorThemeId] || THEMES[DEFAULT_THEME];

  const [isDark, setIsDark] = useState(() => {
    if (currentTheme.forceDark) return true;
    if (typeof document !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') return true;
      if (savedTheme === 'light') return false;
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (currentTheme.forceDark) {
      setIsDark(true);
      return;
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
    } else if (savedTheme === 'light') {
      setIsDark(false);
    } else {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
  }, [currentTheme]);

  const accentColor = isDark ? currentTheme.accentDark : currentTheme.accent;

  // Keep refs up to date without triggering re-render effects
  useEffect(() => {
    isReadyRef.current = isReady;
    if (isReady && animCompletedRef.current) {
      if (onDoneRef.current) onDoneRef.current();
    }
  }, [isReady]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      setLine1('Sudo');
      setLine2('do');
      setShowReady(true);
      animCompletedRef.current = true;
      const timer = setTimeout(() => {
        if (isReadyRef.current && onDoneRef.current) onDoneRef.current();
      }, 700);
      return () => clearTimeout(timer);
    }

    // Deliberate typewriter rhythm:
    // Prompt (>) is visible immediately.
    // Line 1: 'Sudo'
    const t1 = setTimeout(() => setLine1('S'), 250);
    const t2 = setTimeout(() => setLine1('Su'), 440);
    const t3 = setTimeout(() => setLine1('Sud'), 630);
    const t4 = setTimeout(() => setLine1('Sudo'), 820);

    // Natural pause between words, cursor moves to line 2
    // Line 2: 'do'
    const t5 = setTimeout(() => setLine2('d'), 1150);
    const t6 = setTimeout(() => setLine2('do'), 1350);

    // Both words completed; status changes to workspace ready
    const t7 = setTimeout(() => setShowReady(true), 1550);

    // Hold the completed "Sudo do" clearly on screen for reading (~900ms)
    // Only transition when typing is 100% complete AND app is ready
    const doneTimer = setTimeout(() => {
      animCompletedRef.current = true;
      if (isReadyRef.current && onDoneRef.current) {
        onDoneRef.current();
      }
    }, 2450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.03, 
        filter: 'blur(10px)',
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } 
      }}
      className="splash-screen flex flex-col items-center justify-center select-none"
      style={{
        background: isDark ? currentTheme.darkGradient : currentTheme.gradient,
        backgroundColor: isDark ? '#1e1b4b' : '#e8d5f5',
      }}
    >
      {/* Ambient background light orbs */}
      <div 
        className="absolute -top-24 -left-20 w-80 h-80 rounded-full blur-[80px] pointer-events-none opacity-40 dark:opacity-20 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(167,139,250,0.8) 0%, rgba(244,114,182,0.2) 70%, transparent 100%)',
          animationDuration: '4s'
        }} 
      />
      <div 
        className="absolute -bottom-28 -right-20 w-96 h-96 rounded-full blur-[90px] pointer-events-none opacity-40 dark:opacity-20 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.8) 0%, rgba(127,119,221,0.2) 70%, transparent 100%)',
          animationDuration: '5s',
          animationDelay: '1s'
        }} 
      />

      {/* Terminal Card */}
      <motion.div 
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[320px] rounded-2xl border shadow-2xl backdrop-blur-2xl overflow-hidden p-6"
        style={{
          backgroundColor: isDark ? 'rgba(18, 18, 28, 0.88)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.75)',
          boxShadow: isDark 
            ? '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(127, 119, 221, 0.15)' 
            : '0 20px 50px rgba(127, 119, 221, 0.18), 0 2px 10px rgba(127, 119, 221, 0.08)'
        }}
      >
        {/* Terminal Header with Window Dots */}
        <div className="flex items-center justify-between pb-3.5 border-b border-black/5 dark:border-white/10 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-sm" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-sm" />
          </div>
          <span className="text-[10px] font-mono tracking-widest uppercase opacity-40 text-main">
            sudodo.sh
          </span>
        </div>

        {/* Terminal Prompt Typewriter Content */}
        <div className="font-mono text-3xl font-black tracking-tight leading-snug py-1">
          {/* Line 1: > sudo */}
          <div className="flex items-center">
            <span className="text-emerald-500 mr-2 select-none">&gt;</span>
            <span className="text-main tracking-tight">{line1}</span>
            {line1.length < 4 && (
              <span className="inline-block w-2.5 h-7 bg-emerald-500 ml-1 animate-pulse" />
            )}
          </div>

          {/* Line 2:   do_ */}
          <div className="flex items-center pl-6 min-h-[40px]">
            <span 
              className="tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {line2}
            </span>
            {line1.length === 4 && (
              <span 
                className="inline-block w-2.5 h-7 ml-1 animate-pulse"
                style={{ backgroundColor: accentColor }}
              />
            )}
          </div>
        </div>

        {/* Terminal Status Footer */}
        <div className="mt-5 pt-3.5 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[11px] font-mono">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: showReady ? 1 : 0.5 }}
            className="flex items-center gap-1.5 text-main/70"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span>{showReady ? 'workspace ready' : 'initializing...'}</span>
          </motion.div>
          <span className="text-main/40 font-sans text-[10px] font-semibold">
            Task Manager
          </span>
        </div>
      </motion.div>

      {/* App Version Bottom */}
      <div 
        className="absolute text-[11px] font-mono text-main/40 select-none pointer-events-none"
        style={{
          bottom: 'calc(60px + max(1.25rem, env(safe-area-inset-bottom)))'
        }}
      >
        <span>v{version}</span>
      </div>
    </motion.div>
  );
}
