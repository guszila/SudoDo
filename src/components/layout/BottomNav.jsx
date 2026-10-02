import { useEffect, useRef, useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Users, Home, Banknote, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard';

export default function BottomNav({ lang, setCurrentView, unreadCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isKeyboardOpen } = useVirtualKeyboard();
  const [isHidden, setIsHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const scrollDirection = useRef(0);
  const directionDistance = useRef(0);

  const tabs = useMemo(() => [
    {
      id: 'calendar',
      path: '/calendar',
      label: lang === 'en' ? 'Calendar' : 'ปฏิทิน',
      icon: CalendarIcon,
      onClick: () => {
        navigate('/calendar');
        if (setCurrentView) setCurrentView('month');
      }
    },
    {
      id: 'part-time',
      path: '/part-time',
      tourClass: 'tour-part-time-btn',
      label: lang === 'en' ? 'Income' : 'รายได้',
      icon: Banknote,
      onClick: () => navigate('/part-time')
    },
    {
      id: 'home',
      path: '/',
      label: lang === 'en' ? 'Home' : 'หน้าหลัก',
      icon: Home,
      onClick: () => navigate('/')
    },
    {
      id: 'friends',
      path: '/friends',
      label: lang === 'en' ? 'Friends' : 'เพื่อน',
      icon: Users,
      hasBadge: true,
      onClick: () => navigate('/friends')
    },
    {
      id: 'settings',
      path: '/settings',
      tourClass: 'tour-settings-btn',
      label: lang === 'en' ? 'Settings' : 'ตั้งค่า',
      icon: Settings,
      onClick: () => navigate('/settings')
    }
  ], [lang, navigate, setCurrentView]);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;

        if (currentScrollY <= 12) {
          setIsHidden(prev => prev ? false : prev);
          directionDistance.current = 0;
        } else if (Math.abs(delta) >= 1) {
          const nextDirection = delta > 0 ? 1 : -1;

          if (nextDirection !== scrollDirection.current) {
            scrollDirection.current = nextDirection;
            directionDistance.current = 0;
          }

          directionDistance.current += Math.abs(delta);

          if (nextDirection === 1 && directionDistance.current >= 30) {
            setIsHidden(prev => !prev ? true : prev);
          } else if (nextDirection === -1 && directionDistance.current >= 12) {
            setIsHidden(prev => prev ? false : prev);
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
      idleTimer = window.setTimeout(() => setIsHidden(prev => !prev ? true : prev), 20000);
    };

    const handleActivity = () => {
      setIsHidden(prev => prev ? false : prev);
      scheduleIdleHide();
    };

    scheduleIdleHide();
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('wheel', handleActivity, { passive: true });

    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('wheel', handleActivity);
    };
  }, []);

  if (isKeyboardOpen) return null;

  return (
    <nav
      className={`tour-nav-bar floating-bottom-nav fixed z-40 flex items-center justify-around rounded-full px-2 ${isHidden ? 'floating-bottom-nav--hidden' : ''}`}
      aria-label={lang === 'en' ? 'Main navigation' : 'เมนูหลัก'}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (isActive) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                tab.onClick();
              }
            }}
            className={`group relative flex flex-col items-center justify-center w-full h-[54px] rounded-[22px] transition-transform duration-100 active:scale-[0.93] ${tab.tourClass || ''}`}
          >
            {/* Smooth animated active pill background */}
            {isActive && (
              <motion.div
                layoutId="activeNavTabPill"
                className="absolute inset-y-1 inset-x-1 rounded-[20px] bg-gradient-to-b from-primary-500/18 to-primary-500/6 dark:from-primary-500/28 dark:to-primary-500/12 border border-primary-500/15 dark:border-primary-500/25 shadow-[inset_0_1px_1.5px_0_rgba(255,255,255,0.75),0_2px_8px_-1px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_2px_8px_-1px_rgba(0,0,0,0.3)]"
                transition={{ type: "spring", stiffness: 440, damping: 32 }}
              />
            )}

            {/* Hover state for inactive tabs on pointer devices */}
            {!isActive && (
              <div className="absolute inset-y-1 inset-x-1 rounded-[20px] opacity-0 group-hover:opacity-100 bg-black/[0.03] dark:bg-white/[0.04] transition-opacity duration-150 pointer-events-none" />
            )}

            <motion.div 
              className="relative z-10 flex flex-col items-center justify-center"
              animate={{ 
                y: isActive ? -1.5 : 0, 
                scale: isActive ? 1.05 : 1 
              }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            >
              <div className="relative">
                <Icon 
                  size={21} 
                  fill="currentColor"
                  fillOpacity={isActive ? 0.16 : 0}
                  className={`transition-all duration-200 ${
                    isActive 
                      ? 'text-primary-500 stroke-[2.2]' 
                      : 'text-main/55 dark:text-white/60 stroke-[1.8] group-hover:text-main/80 dark:group-hover:text-white'
                  }`} 
                />
                
                {tab.hasBadge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-0.5 bg-rose-500 ring-2 ring-white dark:ring-slate-900 rounded-full flex items-center justify-center shadow-sm">
                    <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-50" />
                    {unreadCount <= 9 && (
                      <span className="relative text-[8.5px] font-black text-white leading-none">{unreadCount}</span>
                    )}
                  </span>
                )}
              </div>

              <span 
                className={`text-[10.5px] mt-1 transition-colors duration-200 tracking-normal leading-none ${
                  isActive 
                    ? 'text-primary-600 dark:text-primary-300 font-bold' 
                    : 'text-main/60 dark:text-white/60 font-medium group-hover:text-main/80 dark:group-hover:text-white'
                }`}
              >
                {tab.label}
              </span>
            </motion.div>
          </button>
        );
      })}
    </nav>
  );
}
