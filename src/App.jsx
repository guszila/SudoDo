import React, { useState, useEffect, useCallback } from 'react';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isBefore, startOfDay, endOfDay, differenceInDays, isSameDay } from 'date-fns';
import { enUS, th } from 'date-fns/locale';
import { Plus, Loader2, Calendar as CalendarIcon, CheckCircle2, Clock, CircleDashed, Languages, LogOut, Home, Settings, ListTodo, User, Moon, Sun, DollarSign, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import TaskModal from './components/TaskModal';
import StatsBar from './components/StatsBar';
import Login from './components/Login';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import PartTimePage from './pages/PartTimePage';
import IncomeHistoryPage from './pages/IncomeHistoryPage';
import TodayPage from './pages/TodayPage';
import SocialSecurityPage from './pages/SocialSecurityPage';
import TasksPage from './pages/TasksPage';
import Logo from './components/Logo';
import SplashScreen from './components/SplashScreen';

import TaskCard from './components/TaskCard';
import { saveTask } from './services/taskService';
import { getThaiHoliday } from './utils/holidays';
import { TASK_STATUS, TASK_PRIORITY } from './constants';
import { translations } from './i18n';
import { auth } from './firebase';
import { TasksProvider, useTasks } from './contexts/TasksContext';
import { ToastProvider } from './contexts/ToastContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'red', color: 'white', overflow: 'auto', zIndex: 9999, position: 'relative' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children; 
  }
}


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
    case TASK_STATUS.DONE: return <CheckCircle2 className={`text-status-done ${className}`} />;
    case TASK_STATUS.IN_PROGRESS: return <Clock className={`text-status-progress ${className}`} />;
    default: return <CircleDashed className={`text-status-todo ${className}`} />;
  }
};

function MainApp({ user, lang, setLang, theme, toggleTheme }) {
  const { tasks, isLoading } = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  const t = translations[lang];

  const handleSelectSlot = ({ start }) => {
    setSelectedDateFilter(start);
    // Smooth scroll to the bottom if on mobile
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleSelectEvent = (event) => {
    setSelectedTask(event);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    setIsModalOpen(false);
    const action = taskData.id ? 'EDIT' : 'ADD';
    await saveTask(action, taskData, user.uid);
  };

  const handleDeleteTask = async (taskId) => {
    setIsModalOpen(false);
    await saveTask('DELETE', { id: taskId }, user.uid);
  };

  const handleToggleStatus = async (task) => {
    const isDone = task.status === TASK_STATUS.DONE;
    const newStatus = isDone ? TASK_STATUS.TODO : TASK_STATUS.DONE;
    await handleSaveTask({ ...task, status: newStatus });
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
    const isDone = event.status === TASK_STATUS.DONE;
    let priorityColor = 'bg-amber-500';
    if (event.priority === TASK_PRIORITY.HIGH) priorityColor = 'bg-red-500';
    if (event.priority === TASK_PRIORITY.LOW) priorityColor = 'bg-green-500';

    const now = new Date();
    const isOverdue = !isDone && isBefore(endOfDay(event.end), now);

    const handleToggleDone = (e) => {
      e.stopPropagation(); // Prevent opening modal
      const newStatus = isDone ? TASK_STATUS.TODO : TASK_STATUS.DONE;
      handleSaveTask({ ...event, status: newStatus });
    };

    return (
      <div className={`flex items-center gap-1 md:gap-1.5 px-1 py-0.5 md:px-2 md:py-1 overflow-hidden h-full ${isDone ? 'opacity-60 line-through' : ''}`}>
        {event.isPartTime ? (
          <DollarSign className="w-2 h-2 md:w-3 md:h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
        ) : (
          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${priorityColor}`}></div>
        )}
        <button 
          onClick={handleToggleDone} 
          className="hover:scale-110 active:scale-95 transition-transform p-0 md:p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          title={isDone ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จแล้ว"}
        >
          <StatusIcon status={event.status} className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0 cursor-pointer" />
        </button>
        <span className="truncate text-main text-[9px] md:text-xs font-medium flex-1">{event.title}</span>
        {isOverdue && <span className="bg-red-500 text-white text-[8px] md:text-[9px] px-0.5 md:px-1 rounded-[4px] font-bold ml-auto flex-shrink-0">เกินกำหนด</span>}
      </div>
    );
  };

  const eventPropGetter = (event) => {
    let borderColor = 'var(--color-status-todo)';
    
    if (event.status === TASK_STATUS.DONE) {
      borderColor = 'var(--color-status-done)';
    } else if (event.status === TASK_STATUS.IN_PROGRESS) {
      borderColor = 'var(--color-status-progress)';
    }

    let bgOpacity = '0.4';
    if (event.priority === TASK_PRIORITY.HIGH) bgOpacity = '0.8';
    if (event.priority === TASK_PRIORITY.LOW) bgOpacity = '0.2';
    
    let bgColor = `rgba(255, 255, 255, ${bgOpacity})`;
    
    if (event.isPartTime) {
      bgColor = `rgba(34, 197, 94, ${event.status === TASK_STATUS.DONE ? '0.15' : '0.3'})`;
      borderColor = 'rgba(34, 197, 94, 0.8)';
    }

    const now = new Date();
    const isDone = event.status === TASK_STATUS.DONE;
    const isOverdue = !isDone && isBefore(endOfDay(event.end), now);
    const isDueToday = !isDone && !isOverdue && startOfDay(event.end).getTime() === startOfDay(now).getTime();
    const isDueSoon = !isDone && !isOverdue && !isDueToday && differenceInDays(startOfDay(event.end), startOfDay(now)) <= 3;

    let boxShadow = 'none';
    if (isOverdue) boxShadow = '0 0 12px 2px rgba(239,68,68,0.6)'; // red-500 glow
    else if (isDueToday) boxShadow = '0 0 12px 2px rgba(245,158,11,0.6)'; // amber-500 glow
    else if (isDueSoon) boxShadow = '0 0 12px 2px rgba(253,224,71,0.4)'; // yellow-300 glow

    return {
      style: {
        backgroundColor: bgColor,
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
      if (t.status === TASK_STATUS.DONE) return false;
      const isOverdue = isBefore(endOfDay(t.end), now);
      return isOverdue && startOfDay(t.end).getTime() === startOfDay(date).getTime();
    });

    const holidayName = getThaiHoliday(date);
    const dayOfWeek = date.getDay();
    
    let textClass = '';
    let textColorStyle = {};
    if (holidayName) {
      textClass = 'text-red-500 font-bold';
    } else if (dayOfWeek === 0) {
      textClass = 'font-bold opacity-90'; // Sunday
      textColorStyle = { color: 'var(--color-primary-500)' };
    } else if (dayOfWeek === 6) {
      textClass = 'font-bold opacity-70'; // Saturday
      textColorStyle = { color: 'var(--color-primary-500)' };
    }

    return (
      <button onClick={() => handleSelectSlot({ start: date })} className="w-full text-center relative flex flex-col items-center justify-center pb-1 font-medium hover:bg-white/10 rounded-t-lg transition-colors pt-2 h-full min-h-[30px]">
        <span className={textClass} style={textColorStyle}>{label}</span>
        {holidayName && (
          <div className="w-1 h-1 bg-red-500 rounded-full mt-0.5 opacity-80" title={holidayName}></div>
        )}
        {hasOverdue && <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
      </button>
    );
  };

  const CustomToolbar = ({ date, view, views, label, onNavigate, onView }) => {
    const goToBack = () => onNavigate('PREV');
    const goToNext = () => onNavigate('NEXT');
    const goToToday = () => onNavigate('TODAY');

    const now = new Date();
    let isCurrent = false;
    if (view === 'month') {
      isCurrent = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    } else if (view === 'day') {
      isCurrent = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    } else {
      isCurrent = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }

    return (
      <div className="rbc-toolbar flex-col gap-0 mb-4 border-none bg-transparent p-0">
        <div style={{
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(12px)',
          border: '0.5px solid rgba(255,255,255,0.4)',
          borderRadius: '16px',
          padding: '12px 16px',
          marginBottom: '12px'
        }} className="flex justify-between items-center w-full shadow-sm">
          
          <button 
            onClick={goToToday}
            disabled={isCurrent}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              background: 'rgba(127,119,221,0.15)',
              border: '0.5px solid var(--theme-accent-border)',
              fontSize: '12px',
              color: 'var(--theme-nav-active)',
              fontWeight: 500,
              opacity: isCurrent ? 0.4 : 1,
              cursor: isCurrent ? 'default' : 'pointer'
            }}
            className="transition-opacity active:scale-95 flex-shrink-0"
          >
            {lang === 'th' ? 'วันนี้' : 'Today'}
          </button>

          <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--theme-accent-dark)', textAlign: 'center' }} className="flex-1 px-2 truncate">
            {view === 'month' ? `${format(date, 'MMMM', { locale: lang === 'th' ? th : enUS })} ${date.getFullYear()}` : label}
          </div>

          <div className="flex gap-[4px] flex-shrink-0">
            <button 
              onClick={goToBack}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.35)',
                border: '0.5px solid rgba(255,255,255,0.4)',
                padding: 0
              }}
              className="flex items-center justify-center hover:bg-white/50 dark:hover:bg-white/10 transition-colors active:scale-90"
            >
              <ChevronLeft size={14} color="var(--theme-nav-active)" />
            </button>
            <button 
              onClick={goToNext}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.35)',
                border: '0.5px solid rgba(255,255,255,0.4)',
                padding: 0
              }}
              className="flex items-center justify-center hover:bg-white/50 dark:hover:bg-white/10 transition-colors active:scale-90"
            >
              <ChevronRight size={14} color="var(--theme-nav-active)" />
            </button>
          </div>
        </div>

        <div className="rbc-btn-group w-full flex justify-center !mb-2 mt-0">
          {views.map(name => (
            <button
              type="button"
              key={name}
              className={view === name ? 'rbc-active' : ''}
              onClick={() => onView(name)}
            >
              {t.calendarMessages[name] || name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const CalendarView = (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="min-h-screen font-sans pb-32 md:pb-8 overflow-x-hidden"
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 liquid-glass border-b-0 border-x-0 rounded-none rounded-b-3xl p-4 md:p-6 mb-6 pt-safe flex justify-between items-center animate-slide-up">
        <div className="flex items-center">
          <Logo variant={theme === 'dark' ? 'dark' : 'full'} size="md" className="w-32 md:w-40" />
        </div>
        
        <div className="flex items-center gap-2">

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
            longPressThreshold={10}
            length={365}
            components={{
              event: EventComponent,
              month: {
                dateHeader: CustomDateHeader
              },
              toolbar: CustomToolbar
            }}
            eventPropGetter={eventPropGetter}
            views={['month', 'week', 'day', 'agenda']}
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            onDrillDown={() => {}}
            popup
          />

          {selectedDateFilter && (
            <div className="mt-6 mb-24 animate-slide-up">
              <div className="flex justify-between items-center mb-4 liquid-glass-card p-4 rounded-2xl border border-primary-500/20">
                <h3 className="text-lg font-bold text-main flex items-center gap-2">
                  <CalendarIcon size={20} className="text-primary-500" />
                  {format(selectedDateFilter, 'd MMMM yyyy', { locale: lang === 'th' ? th : enUS })}
                </h3>
                <button 
                  onClick={() => setSelectedDateFilter(null)} 
                  className="w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-3">
                {(() => {
                  const holiday = getThaiHoliday(selectedDateFilter);
                  const filteredTasks = tasks.filter(t => isSameDay(new Date(t.start), selectedDateFilter));
                  const hasContent = holiday || filteredTasks.length > 0;

                  if (!hasContent) {
                    return (
                      <div className="text-center py-8 liquid-glass-card rounded-[20px] text-main/50 font-medium border border-dashed border-main/20">
                        ไม่มีกิจกรรมในวันนี้
                      </div>
                    );
                  }

                  return (
                    <>
                      {holiday && (
                        <div className="liquid-glass-card p-4 flex items-center gap-4 rounded-[20px] border-red-500/30 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-slide-up">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-red-500 bg-red-500/10">
                            <span className="text-lg">🇹🇭</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-red-500 font-bold mb-0.5">วันหยุดประเทศไทย</p>
                            <h3 className="font-bold text-lg text-main">{holiday}</h3>
                          </div>
                        </div>
                      )}
                      
                      {filteredTasks.map(task => (
                        <TaskCard 
                          key={task.id}
                          task={task}
                          onEdit={handleSelectEvent}
                          onDelete={handleDeleteTask}
                          onToggleStatus={handleToggleStatus}
                          onLongPress={() => {}}
                        />
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={CalendarView} />
          <Route path="/today" element={<TodayPage user={user} lang={lang} />} />
          <Route path="/profile" element={<ProfilePage user={user} lang={lang} />} />
          <Route path="/settings" element={<ErrorBoundary><SettingsPage user={user} lang={lang} setLang={setLang} theme={theme} toggleTheme={toggleTheme} /></ErrorBoundary>} />
          <Route path="/part-time" element={<ErrorBoundary><PartTimePage user={user} lang={lang} /></ErrorBoundary>} />
          <Route path="/income/history" element={<ErrorBoundary><IncomeHistoryPage user={user} lang={lang} /></ErrorBoundary>} />
          <Route path="/social-security" element={<SocialSecurityPage lang={lang} />} />
          <Route path="/tasks" element={<TasksPage user={user} lang={lang} />} />
        </Routes>
      </AnimatePresence>

      {/* Floating Action Button */}
      {location.pathname === '/' && (
        <button 
          onClick={() => { 
            setSelectedTask(selectedDateFilter ? { start: selectedDateFilter, end: selectedDateFilter } : null); 
            setIsModalOpen(true); 
          }}
          className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(var(--color-primary-500-rgb),0.5)] border border-primary-400/30 z-50 hover:scale-105 active:scale-95 transition-all group"
        >
          <span className="absolute inset-0 rounded-full bg-primary-500 opacity-20 group-hover:animate-ping"></span>
          <Plus size={28} className="relative z-10" />
        </button>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 liquid-glass border-x-0 border-b-0 rounded-t-[28px] rounded-b-none p-2 pb-safe flex justify-around items-center z-40 h-[calc(72px+env(safe-area-inset-bottom))]">
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
          className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/part-time' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
        >
          <DollarSign size={24} />
          <span className={`text-[10px] mt-1 font-medium text-main ${location.pathname !== '/part-time' && 'opacity-60'}`}>{lang === 'en' ? 'Income' : 'รายได้'}</span>
        </button>
        <button 
          onClick={() => navigate('/settings')}
          className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/settings' ? 'text-primary-500' : 'text-slate-400 active:bg-white/10 rounded-xl transition-colors'}`}
        >
          <Settings size={24} />
          <span className={`text-[10px] mt-1 font-medium text-main ${location.pathname !== '/settings' && 'opacity-60'}`}>{lang === 'en' ? 'Settings' : 'ตั้งค่า'}</span>
        </button>
      </nav>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        task={selectedTask}
        lang={lang}
      />
    </>
  );
}

const hasShownSplash = sessionStorage.getItem('splashShown') === 'true';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(!hasShownSplash);

  // Language state
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('lang') || 'th';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

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

  return showSplash ? (
    <SplashScreen onDone={() => {
      sessionStorage.setItem('splashShown', 'true');
      setShowSplash(false);
    }} />
  ) : (
    <ToastProvider>
      <TasksProvider user={user}>
        <SettingsProvider user={user}>
          <ThemeProvider>
            <MainApp 
              user={user} 
              lang={lang} 
              setLang={setLang} 
              theme={theme} 
              toggleTheme={toggleTheme} 
            />
          </ThemeProvider>
        </SettingsProvider>
      </TasksProvider>
    </ToastProvider>
  );
}
