import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isBefore, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { enUS, th } from 'date-fns/locale';
import { Plus, Loader2, Calendar as CalendarIcon, CheckCircle2, Clock, CircleDashed, Languages, LogOut, Home, Settings, ListTodo, User, Moon, Sun } from 'lucide-react';
import { fetchTasks, saveTask } from './api/firestore';
import TaskModal from './components/TaskModal';
import StatsBar from './components/StatsBar';
import Login from './components/Login';
import ProfilePage from './pages/ProfilePage';
import Logo from './components/Logo';
import { translations } from './i18n';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const locales = {
  'en-US': enUS,
  'th': th,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const StatusIcon = ({ status, className = "" }) => {
  switch (status) {
    case 'Done': return <CheckCircle2 className={`text-status-done ${className}`} />;
    case 'In Progress': return <Clock className={`text-status-progress ${className}`} />;
    default: return <CircleDashed className={`text-status-todo ${className}`} />;
  }
};

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Firebase Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Language state
  const [lang, setLang] = useState('th');
  const t = translations[lang];

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await fetchTasks(user.uid);
    const formattedData = data.map(item => ({
      ...item,
      start: new Date(item.start),
      end: new Date(item.end),
      priority: item.priority || 'กลาง'
    }));

    // Sort by priority (สูง > กลาง > ต่ำ)
    const priorityWeight = { 'สูง': 3, 'กลาง': 2, 'ต่ำ': 1 };
    formattedData.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    setTasks(formattedData);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadTasks();
    } else {
      setTasks([]);
    }
  }, [loadTasks, user]);

  const handleSelectSlot = ({ start, end }) => {
    setSelectedTask({ start, end });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedTask(event);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    setIsModalOpen(false);
    setIsLoading(true);
    const action = taskData.id ? 'EDIT' : 'ADD';
    await saveTask(action, taskData, user.uid);
    await loadTasks();
  };

  const handleDeleteTask = async (taskId) => {
    setIsModalOpen(false);
    setIsLoading(true);
    await saveTask('DELETE', { id: taskId }, user.uid);
    await loadTasks();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'th' : 'en');
  };

  const EventComponent = ({ event }) => {
    const isDone = event.status === 'Done';
    let priorityColor = 'bg-amber-500';
    if (event.priority === 'สูง') priorityColor = 'bg-red-500';
    if (event.priority === 'ต่ำ') priorityColor = 'bg-green-500';

    const now = new Date();
    const isOverdue = !isDone && isBefore(endOfDay(event.end), now);

    const handleToggleDone = (e) => {
      e.stopPropagation(); // Prevent opening modal
      const newStatus = isDone ? 'To-Do' : 'Done';
      handleSaveTask({ ...event, status: newStatus });
    };

    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 overflow-hidden h-full ${isDone ? 'opacity-60 line-through' : ''}`}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColor}`}></div>
        <button 
          onClick={handleToggleDone} 
          className="hover:scale-110 active:scale-95 transition-transform p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          title={isDone ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จแล้ว"}
        >
          <StatusIcon status={event.status} className="w-3.5 h-3.5 flex-shrink-0 cursor-pointer" />
        </button>
        <span className="truncate text-main text-xs font-medium flex-1">{event.title}</span>
        {isOverdue && <span className="bg-red-500 text-white text-[9px] px-1 rounded-[4px] font-bold ml-auto flex-shrink-0">เกินกำหนด</span>}
      </div>
    );
  };

  const eventPropGetter = (event) => {
    let borderColor = 'var(--color-status-todo)';
    
    if (event.status === 'Done') {
      borderColor = 'var(--color-status-done)';
    } else if (event.status === 'In Progress') {
      borderColor = 'var(--color-status-progress)';
    }

    let bgOpacity = '0.4';
    if (event.priority === 'สูง') bgOpacity = '0.8';
    if (event.priority === 'ต่ำ') bgOpacity = '0.2';

    const now = new Date();
    const isDone = event.status === 'Done';
    const isOverdue = !isDone && isBefore(endOfDay(event.end), now);
    const isDueToday = !isDone && !isOverdue && startOfDay(event.end).getTime() === startOfDay(now).getTime();
    const isDueSoon = !isDone && !isOverdue && !isDueToday && differenceInDays(startOfDay(event.end), startOfDay(now)) <= 3;

    let boxShadow = 'none';
    if (isOverdue) boxShadow = '0 0 12px 2px rgba(239,68,68,0.6)'; // red-500 glow
    else if (isDueToday) boxShadow = '0 0 12px 2px rgba(245,158,11,0.6)'; // amber-500 glow
    else if (isDueSoon) boxShadow = '0 0 12px 2px rgba(253,224,71,0.4)'; // yellow-300 glow

    return {
      style: {
        backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
        borderLeft: `4px solid ${borderColor}`,
        borderRight: '1px solid rgba(255,255,255,0.4)',
        borderTop: '1px solid rgba(255,255,255,0.4)',
        borderBottom: '1px solid rgba(255,255,255,0.4)',
        color: 'var(--color-text-main)',
        boxShadow: boxShadow
      }
    };
  };

  const CustomDateHeader = ({ label, date, onDrillDown }) => {
    const now = new Date();
    const hasOverdue = tasks.some(t => {
      if (t.status === 'Done') return false;
      const isOverdue = isBefore(endOfDay(t.end), now);
      return isOverdue && startOfDay(t.end).getTime() === startOfDay(date).getTime();
    });

    return (
      <button onClick={onDrillDown} className="w-full text-center relative flex justify-center pb-1 font-medium hover:bg-white/10 rounded-t-lg transition-colors pt-1">
        <span>{label}</span>
        {hasOverdue && <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
      </button>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!user) {
    return <Login lang={lang} />;
  }

  const CalendarView = (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="min-h-screen font-sans pb-32 md:pb-8 overflow-x-hidden"
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 liquid-glass border-b-0 border-x-0 rounded-none rounded-b-3xl p-4 md:p-6 mb-6 flex justify-between items-center animate-slide-up">
        <div className="flex items-center">
          <Logo variant={theme === 'dark' ? 'dark' : 'full'} size="md" className="w-32 md:w-40" />
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="liquid-glass-button p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-main"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
          <button 
            onClick={toggleLanguage}
            className="liquid-glass-button p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-main"
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            {lang === 'th' ? <span className="font-bold text-sm">TH</span> : <span className="font-bold text-sm">EN</span>}
          </button>
          <button 
            onClick={() => { setSelectedTask(null); setIsModalOpen(true); }}
            className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-[20px] transition-all shadow-[0_4px_16px_0_rgba(108,99,255,0.3)] active:scale-95 border"
            style={{ borderColor: 'var(--glass-border)' }}
          >
            <Plus size={20} /> {t.addTask}
          </button>
          <button 
            onClick={() => navigate('/profile')}
            className="liquid-glass-button p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-primary-500 hover:text-primary-600"
            title="Profile"
          >
            <User size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 animate-slide-up">
        <main className="relative">
          {isLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center backdrop-blur-sm rounded-[24px]" style={{ backgroundColor: 'var(--glass-bg-strong)' }}>
              <div className="flex flex-col items-center gap-3 text-primary-600">
                <Loader2 className="w-10 h-10 animate-spin" />
                <span className="font-medium animate-pulse">{t.syncing}</span>
              </div>
            </div>
          )}
          
          <StatsBar tasks={tasks} />

          <Calendar
            localizer={localizer}
            culture={lang === 'en' ? 'en-US' : 'th'}
            messages={t.calendarMessages}
            events={tasks}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            components={{
              event: EventComponent,
              month: {
                dateHeader: CustomDateHeader
              }
            }}
            eventPropGetter={eventPropGetter}
            views={['month', 'week', 'day', 'agenda']}
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            popup
          />
        </main>
      </div>

      {/* Mobile Floating Action Button */}
      <button 
        onClick={() => { setSelectedTask(null); setIsModalOpen(true); }}
        className="md:hidden fixed bottom-28 right-6 w-14 h-14 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_32px_0_rgba(108,99,255,0.4)] border z-40 active:scale-90 transition-transform"
        style={{ borderColor: 'var(--glass-border)' }}
      >
        <Plus size={28} />
      </button>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 liquid-glass border-x-0 border-b-0 rounded-t-[28px] rounded-b-none p-2 pb-safe flex justify-around items-center z-40 h-[72px]">
        <button 
          onClick={() => setCurrentView('month')}
          className={`flex flex-col items-center justify-center w-full h-full ${currentView === 'month' ? 'text-primary-500' : 'text-slate-400'}`}
        >
          <CalendarIcon size={24} />
          <span className={`text-[10px] mt-1 font-medium text-main ${currentView !== 'month' && 'opacity-60'}`}>Calendar</span>
        </button>
        <button 
          onClick={() => setCurrentView('agenda')}
          className={`flex flex-col items-center justify-center w-full h-full ${currentView === 'agenda' ? 'text-primary-500' : 'text-slate-400'}`}
        >
          <ListTodo size={24} />
          <span className={`text-[10px] mt-1 font-medium text-main ${currentView !== 'agenda' && 'opacity-60'}`}>Tasks</span>
        </button>
        <button 
          onClick={() => {
            setCurrentDate(new Date());
            setCurrentView('day');
          }}
          className={`flex flex-col items-center justify-center w-full h-full ${currentView === 'day' ? 'text-primary-500' : 'text-slate-400'}`}
        >
          <Home size={24} />
          <span className={`text-[10px] mt-1 font-medium text-main ${currentView !== 'day' && 'opacity-60'}`}>Today</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center w-full h-full text-slate-400 active:bg-white/10 rounded-xl transition-colors"
        >
          <Settings size={24} />
          <span className="text-[10px] mt-1 font-medium text-main opacity-60">Settings</span>
        </button>
      </nav>

      {/* Task Modal Popup */}
      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        task={selectedTask}
        lang={lang}
      />
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={CalendarView} />
        <Route path="/profile" element={<ProfilePage user={user} />} />
      </Routes>
    </AnimatePresence>
  );
}
