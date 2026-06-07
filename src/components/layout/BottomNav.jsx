import React from 'react';
import { Calendar as CalendarIcon, ListTodo, Home, DollarSign, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav({ lang, currentView, setCurrentView }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="tour-nav-bar md:hidden fixed bottom-0 left-0 right-0 liquid-glass border-x-0 border-b-0 rounded-t-[28px] rounded-b-none p-2 pb-safe flex justify-around items-center z-40 h-[calc(72px+env(safe-area-inset-bottom))]">
      <button 
        onClick={() => { navigate('/'); setCurrentView('month'); }}
        className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/' && currentView === 'month' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <CalendarIcon size={24} />
        <span className={`text-[10px] mt-1 font-medium text-main ${!(location.pathname === '/' && currentView === 'month') && 'opacity-60'}`}>{lang === 'en' ? 'Calendar' : 'ปฏิทิน'}</span>
      </button>
      <button 
        onClick={() => navigate('/tasks')}
        className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/tasks' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <ListTodo size={24} />
        <span className={`text-[10px] mt-1 font-medium text-main ${location.pathname !== '/tasks' && 'opacity-60'}`}>{lang === 'en' ? 'Tasks' : 'งานทั้งหมด'}</span>
      </button>
      <button 
        onClick={() => navigate('/today')}
        className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/today' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <Home size={24} />
        <span className={`text-[10px] mt-1 font-medium text-main ${location.pathname !== '/today' && 'opacity-60'}`}>{lang === 'en' ? 'Today' : 'วันนี้'}</span>
      </button>
      <button 
        onClick={() => navigate('/part-time')}
        className={`tour-part-time-btn flex flex-col items-center justify-center w-full h-full ${location.pathname === '/part-time' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <DollarSign size={24} />
        <span className={`text-[10px] mt-1 font-medium text-main ${location.pathname !== '/part-time' && 'opacity-60'}`}>{lang === 'en' ? 'Income' : 'รายได้'}</span>
      </button>
      <button 
        onClick={() => navigate('/settings')}
        className={`tour-settings-btn flex flex-col items-center justify-center w-full h-full ${location.pathname === '/settings' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
      >
        <Settings size={24} />
        <span className={`text-[10px] mt-1 font-medium text-main ${location.pathname !== '/settings' && 'opacity-60'}`}>{lang === 'en' ? 'Settings' : 'ตั้งค่า'}</span>
      </button>
    </nav>
  );
}
