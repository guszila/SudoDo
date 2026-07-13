import { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Users, Home, Banknote, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav({ lang, setCurrentView, unreadCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const scrollDirection = useRef(0);
  const directionDistance = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;

        if (currentScrollY <= 12) {
          setIsHidden(false);
          directionDistance.current = 0;
        } else if (Math.abs(delta) >= 1) {
          const nextDirection = delta > 0 ? 1 : -1;

          // Reset the distance when the user changes direction. This prevents
          // small touch/trackpad jitters from making the bar flicker.
          if (nextDirection !== scrollDirection.current) {
            scrollDirection.current = nextDirection;
            directionDistance.current = 0;
          }

          directionDistance.current += Math.abs(delta);

          // Require a little downward intent before hiding, but reveal quickly
          // as soon as the user starts scrolling back up.
          if (nextDirection === 1 && directionDistance.current >= 24) {
            setIsHidden(true);
          } else if (nextDirection === -1 && directionDistance.current >= 8) {
            setIsHidden(false);
          }
        }

        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let idleTimer;

    const scheduleIdleHide = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIsHidden(true), 15000);
    };

    const handleActivity = () => {
      setIsHidden(false);
      scheduleIdleHide();
    };

    scheduleIdleHide();
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('wheel', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('wheel', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, []);

  return (
    <nav
      className={`tour-nav-bar floating-bottom-nav fixed z-40 flex items-center justify-around rounded-full px-2 ${isHidden ? 'floating-bottom-nav--hidden' : ''}`}
      aria-label={lang === 'en' ? 'Main navigation' : 'เมนูหลัก'}
    >
      <button 
        onClick={() => { navigate('/calendar'); setCurrentView('month'); }}
        className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/calendar' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <CalendarIcon size={24} />
        <span className={`text-[10px] mt-1 font-medium ${location.pathname === '/calendar' ? 'text-primary-500' : 'text-main opacity-60'}`}>{lang === 'en' ? 'Calendar' : 'ปฏิทิน'}</span>
      </button>
      <button 
        onClick={() => navigate('/part-time')}
        className={`tour-part-time-btn flex flex-col items-center justify-center w-full h-full ${location.pathname === '/part-time' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <Banknote size={24} />
        <span className={`text-[10px] mt-1 font-medium ${location.pathname === '/part-time' ? 'text-primary-500' : 'text-main opacity-60'}`}>{lang === 'en' ? 'Income' : 'รายได้'}</span>
      </button>
      <button 
        onClick={() => navigate('/')}
        className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <Home size={24} />
        <span className={`text-[10px] mt-1 font-medium ${location.pathname === '/' ? 'text-primary-500' : 'text-main opacity-60'}`}>{lang === 'en' ? 'Home' : 'หน้าหลัก'}</span>
      </button>
      <button 
        onClick={() => navigate('/friends')}
        className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/friends' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <div className="relative">
          <Users size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full flex items-center justify-center shadow-md">
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-60" />
              {unreadCount <= 9 && (
                <span className="relative text-[8px] font-black text-white leading-none px-0.5">{unreadCount}</span>
              )}
            </span>
          )}
        </div>
        <span className={`text-[10px] mt-1 font-medium ${location.pathname === '/friends' ? 'text-primary-500' : 'text-main opacity-60'}`}>{lang === 'en' ? 'Friends' : 'เพื่อน'}</span>
      </button>
      <button 
        onClick={() => navigate('/settings')}
        className={`tour-settings-btn flex flex-col items-center justify-center w-full h-full ${location.pathname === '/settings' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <Settings size={24} />
        <span className={`text-[10px] mt-1 font-medium ${location.pathname === '/settings' ? 'text-primary-500' : 'text-main opacity-60'}`}>{lang === 'en' ? 'Settings' : 'ตั้งค่า'}</span>
      </button>
    </nav>
  );
}
