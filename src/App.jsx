import React, { useState, useEffect } from 'react';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDropLib from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { format, parse, startOfWeek, getDay, isBefore, startOfDay, endOfDay, differenceInDays, isSameDay } from 'date-fns';
import { enUS, th } from 'date-fns/locale';
import { Plus, Loader2, Calendar as CalendarIcon, CheckCircle2, Clock, CircleDashed, Home, Settings, ListTodo, User, DollarSign, ChevronLeft, ChevronRight, X, FileText, Coins, Bell } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import TaskModal from './components/tasks/TaskModal';
import StatsBar from './components/tasks/StatsBar';
import TaskCard from './components/tasks/TaskCard';
import Login from './components/auth/Login';
import SplashScreen from './components/auth/SplashScreen';
import Logo from './components/layout/Logo';
import BottomNav from './components/layout/BottomNav';
import ProductTour from './components/onboarding/ProductTour';
import ErrorBoundary from './components/common/ErrorBoundary';
import ChangelogModal from './components/common/ChangelogModal';
import OneSignalVerificationModal from './components/common/OneSignalVerificationModal';
import pkg from '../package.json';

import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import PartTimePage from './pages/PartTimePage';
import TodayPage from './pages/TodayPage';
import SocialSecurityPage from './pages/SocialSecurityPage';
import TasksPage from './pages/TasksPage';
import FriendsPage from './pages/FriendsPage';

import { saveTask } from './services/taskService';
import { getThaiHoliday } from './utils/holidays';
import { TASK_STATUS, TASK_PRIORITY } from './constants';
import { translations } from './i18n';
import { auth } from './firebase';
import { TasksProvider, useTasks } from './contexts/TasksContext';
import { ToastProvider } from './contexts/ToastContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useNotifications } from './contexts/NotificationsContext';
import NotificationsProvider from './contexts/NotificationsProvider';





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

const withDragAndDrop = typeof withDragAndDropLib === 'function' ? withDragAndDropLib : withDragAndDropLib.default;
const DnDCalendar = withDragAndDrop(Calendar);

const StatusIcon = ({ status, className = "" }) => {
  switch (status) {
    case TASK_STATUS.DONE: return <CheckCircle2 className={`text-status-done ${className}`} />;
    case TASK_STATUS.IN_PROGRESS: return <Clock className={`text-status-progress ${className}`} />;
    default: return <CircleDashed className={`text-status-todo ${className}`} />;
  }
};

function MainApp({ user, lang, setLang, theme, setThemeMode }) {
  const { currentTheme } = useTheme();
  const { settings } = useSettings();
  
  useEffect(() => {
    if (settings?.themeMode) {
      setThemeMode(settings.themeMode);
    }
  }, [settings?.themeMode, setThemeMode]);

  const navigate = useNavigate();
  const location = useLocation();
  const { tasks, isLoading } = useTasks();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState(null);
  const [currentView, setCurrentView] = useState('month'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [showTour, setShowTour] = useState(() => {
    return localStorage.getItem('tourCompleted_v1.1') !== 'true';
  });

  const [showChangelog, setShowChangelog] = useState(() => {
    const lastVersion = localStorage.getItem('lastSeenVersion');
    if (lastVersion !== pkg.version) {
      return true;
    }
    return false;
  });

  const handleCloseChangelog = () => {
    localStorage.setItem('lastSeenVersion', pkg.version);
    setShowChangelog(false);
  };

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

  const onEventDrop = async ({ event, start, end }) => {
    const updatedEvent = { ...event, start: start.toISOString(), end: end.toISOString() };
    await saveTask('EDIT', updatedEvent, user.uid);
  };

  const onEventResize = async ({ event, start, end }) => {
    const updatedEvent = { ...event, start: start.toISOString(), end: end.toISOString() };
    await saveTask('EDIT', updatedEvent, user.uid);
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

  const EventComponent = ({ event }) => {
    if (event.isNote) {
      let NoteIcon = FileText;
      let iconColor = 'text-violet-500 dark:text-violet-400';
      if (event.noteType === 'payday') {
        NoteIcon = Coins;
        iconColor = 'text-amber-500 dark:text-amber-400';
      } else if (event.noteType === 'reminder') {
        NoteIcon = Bell;
        iconColor = 'text-rose-500 dark:text-rose-400';
      }
      return (
        <div className="flex items-center gap-1.5 px-1 py-0.5 md:px-2 md:py-1 overflow-hidden h-full">
          <NoteIcon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
          <span className="truncate text-main text-[10px] md:text-xs font-bold flex-1">{event.title}</span>
        </div>
      );
    }

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
    if (currentView === 'month') {
      return {
        style: {
          display: 'none'
        }
      };
    }

    if (event.isNote) {
      let bgColor = 'rgba(139, 92, 246, 0.12)';
      let borderColor = 'rgba(139, 92, 246, 0.8)';
      let glowColor = 'rgba(139, 92, 246, 0.2)';
      
      if (event.noteType === 'payday') {
        bgColor = 'rgba(245, 158, 11, 0.12)';
        borderColor = 'rgba(245, 158, 11, 0.8)';
        glowColor = 'rgba(245, 158, 11, 0.2)';
      } else if (event.noteType === 'reminder') {
        bgColor = 'rgba(244, 63, 94, 0.12)';
        borderColor = 'rgba(244, 63, 94, 0.8)';
        glowColor = 'rgba(244, 63, 94, 0.2)';
      }
      
      return {
        style: {
          backgroundColor: bgColor,
          borderLeft: `4px solid ${borderColor}`,
          borderRight: '1px solid rgba(255,255,255,0.15)',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          color: 'var(--color-text-main)',
          boxShadow: `0 2px 6px ${glowColor}`
        }
      };
    }

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

    const dayTasks = tasks.filter(t => startOfDay(new Date(t.start)).getTime() === startOfDay(date).getTime());

    // Helper to determine dot/pill color
    const getPillColor = (t) => {
      if (t.isNote) {
        if (t.noteType === 'payday') return 'bg-amber-400 dark:bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.4)]';
        if (t.noteType === 'reminder') return 'bg-rose-400 dark:bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.4)]';
        return 'bg-violet-400 dark:bg-violet-500 shadow-[0_0_4px_rgba(139,92,246,0.4)]';
      }
      if (t.isPartTime) {
        return 'bg-green-400 dark:bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]';
      }
      if (t.status === TASK_STATUS.DONE) {
        return 'bg-slate-300 dark:bg-slate-600';
      }
      if (t.status === TASK_STATUS.IN_PROGRESS) {
        return 'bg-orange-400 dark:bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.4)]';
      }
      return 'bg-blue-400 dark:bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.4)]';
    };

    // Sort items so dots display consistently: Shifts, then Notes, then Tasks
    const sortedTasks = [...dayTasks].sort((a, b) => {
      const getOrder = (item) => {
        if (item.isPartTime) return 1;
        if (item.isNote) {
          if (item.noteType === 'payday') return 2;
          if (item.noteType === 'reminder') return 3;
          return 4;
        }
        if (item.status === TASK_STATUS.TODO) return 5;
        if (item.status === TASK_STATUS.IN_PROGRESS) return 6;
        return 7;
      };
      return getOrder(a) - getOrder(b);
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

    const isToday = isSameDay(date, now);

    return (
      <button onClick={() => handleSelectSlot({ start: date })} className="w-full text-center relative flex flex-col items-center justify-between pb-1.5 font-medium hover:bg-white/10 rounded-t-lg transition-colors pt-2 h-full min-h-[44px]">
        {isToday ? (
          <span className="bg-primary-500 text-white text-xs md:text-sm font-bold rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center shadow-[0_0_8px_rgba(127,119,221,0.5)]">
            {label}
          </span>
        ) : (
          <span className={`${textClass} text-sm md:text-base`} style={textColorStyle}>{label}</span>
        )}
        <div className="flex flex-wrap justify-center gap-0.5 md:gap-1 mt-1 max-w-full px-1">
          {holidayName && (
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full opacity-80" title={holidayName}></div>
          )}
          {sortedTasks.map((t, idx) => (
            <div 
              key={t.id || idx} 
              className={`w-3.5 h-1 rounded-full ${getPillColor(t)}`} 
              title={t.title}
            />
          ))}
        </div>
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

  const exportToICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SudoDo App//EN\n";
    
    tasks.forEach(task => {
      if (!task.start || !task.end) return;
      
      const formatICSDate = (dateString) => {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const start = formatICSDate(task.start);
      const end = formatICSDate(task.end);
      if (!start || !end) return;

      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:${task.id}@sudodo.app\n`;
      icsContent += `DTSTAMP:${formatICSDate(new Date())}\n`;
      icsContent += `DTSTART:${start}\n`;
      icsContent += `DTEND:${end}\n`;
      icsContent += `SUMMARY:${task.title}\n`;
      if (task.description) {
        icsContent += `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}\n`;
      }
      
      // VALARM mobile reminder notifications based on settings
      if (task.isPartTime) {
        if (settings?.notifyShifts !== false) {
          icsContent += "BEGIN:VALARM\n";
          icsContent += "TRIGGER:-PT30M\n";
          icsContent += "ACTION:DISPLAY\n";
          icsContent += `DESCRIPTION:เข้ากะงาน: ${task.title}\n`;
          icsContent += "END:VALARM\n";
        }
      } else {
        if (settings?.notifyTasks !== false) {
          icsContent += "BEGIN:VALARM\n";
          icsContent += "TRIGGER:-PT15M\n";
          icsContent += "ACTION:DISPLAY\n";
          icsContent += `DESCRIPTION:แจ้งเตือน: ${task.title}\n`;
          icsContent += "END:VALARM\n";
        }
      }

      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'sudodo_tasks.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthSuccess = React.useMemo(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let total = 0;
    let completed = 0;
    
    tasks.forEach(t => {
      const d = new Date(t.start);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && !t.isExpense && !t.isExtraIncome && !t.isNote) {
        total++;
        if (t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd)) {
          completed++;
        }
      }
    });
    
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }, [tasks, currentDate]);

  const CalendarView = (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="min-h-screen font-sans pb-32 pt-safe md:pb-8 overflow-x-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 animate-slide-up mt-8">
        <header className="flex justify-between items-start mb-6 animate-slide-up">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-main flex items-center gap-2 mb-1">
              <CalendarIcon size={32} className="text-primary-500" />
              ปฏิทิน
            </h1>
            <p className="text-main/60 font-medium text-sm">จัดการตารางเวลาและวันสำคัญของคุณ</p>
          </div>
          <button 
            onClick={exportToICS}
            className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-[14px] text-xs font-bold text-main transition-colors active:scale-95 mt-1"
            title="Export Calendar to .ics"
          >
            <CalendarIcon size={14} /> Export
          </button>
        </header>

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

          <DnDCalendar
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
            scrollToTime={new Date(1970, 1, 1, 7, 0, 0)}
            min={new Date(1970, 1, 1, 6, 0, 0)}
            max={new Date(1970, 1, 1, 23, 59, 59)}
            step={30}
            timeslots={2}
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
            resizable
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
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
                          lang={lang}
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
          <Route path="/" element={<TodayPage user={user} lang={lang} />} />
          <Route path="/calendar" element={CalendarView} />
          <Route path="/profile" element={<ProfilePage user={user} lang={lang} />} />
          <Route path="/settings" element={<ErrorBoundary><SettingsPage user={user} lang={lang} setLang={setLang} theme={theme} setThemeMode={setThemeMode} /></ErrorBoundary>} />
          <Route path="/part-time" element={<ErrorBoundary><PartTimePage user={user} lang={lang} /></ErrorBoundary>} />
          <Route path="/social-security" element={<SocialSecurityPage lang={lang} />} />
          <Route path="/tasks" element={<TasksPage user={user} lang={lang} />} />
          <Route path="/friends" element={<FriendsPage user={user} lang={lang} />} />
        </Routes>
      </AnimatePresence>
      
      {showTour && (
        <ProductTour 
          lang={lang}
          onComplete={() => {
            localStorage.setItem('tourCompleted_v1.1', 'true');
            setShowTour(false);
          }}
          steps={[
            {
              target: '.tour-nav-bar',
              title: lang === 'en' ? 'Welcome to SudoDo!' : 'ยินดีต้อนรับสู่ SudoDo!',
              content: lang === 'en' ? 'Navigate between your Calendar, Tasks, Income dashboard, and Settings right from here.' : 'จัดการงานและรายได้ของคุณได้ง่ายๆ สลับดูรายการงาน หรือตารางรายได้ ได้จากเมนูด้านล่างนี้เลย',
              icon: '👋',
              borderRadius: 28
            },
            {
              target: '.tour-add-btn',
              title: lang === 'en' ? 'Add Tasks & Shifts' : 'เพิ่มงานและกะ',
              content: lang === 'en' ? 'Tap this button to create a new task or log a part-time shift.' : 'แตะที่ปุ่มนี้เพื่อเพิ่ม "สิ่งที่ต้องทำ" ใหม่ หรือบันทึก "กะการทำงาน" ของคุณ',
              icon: '✨',
              borderRadius: 50
            },
            {
              target: '.tour-part-time-btn',
              title: lang === 'en' ? 'Income Dashboard & Bulk Edit' : 'สรุปรายได้ & จัดการหลายกะ',
              content: lang === 'en' ? 'Check your income, export to PDF, and try the new Bulk Edit feature here!' : 'หน้านี้จะสรุปรายได้ สามารถ Export เป็น PDF ได้ และตอนนี้รองรับการเลือกแก้กะงานหลายอันพร้อมกัน (Bulk Edit) แล้วนะ!',
              icon: '💰',
              borderRadius: 16
            },
            {
              target: '.tour-settings-btn',
              title: lang === 'en' ? 'Settings & Manage Jobs' : 'ตั้งค่า & จัดการบริษัท',
              content: lang === 'en' ? 'Change themes, setup your companies/jobs, and configure notifications here!' : 'คุณสามารถเข้ามาจัดการรายชื่อบริษัท (Jobs) ตั้งค่าหักประกันสังคม หรือเปลี่ยนธีมสีได้ที่นี่เลย!',
              icon: '🎨',
              borderRadius: 24
            }
          ]}
        />
      )}

      {/* Changelog Modal Auto-Show */}
      <ChangelogModal isOpen={showChangelog && !showTour} onClose={handleCloseChangelog} lang={lang} />
      
      {/* Global Add Button — only on calendar pages */}
      {(location.pathname === '/' || location.pathname === '/calendar') && (
        <div className="fixed bottom-24 right-4 md:bottom-24 md:right-8 z-50">
          <button 
            onClick={() => { 
              setSelectedTask(selectedDateFilter ? { start: selectedDateFilter, end: selectedDateFilter } : null); 
              setIsModalOpen(true); 
            }}
            className="tour-add-btn w-14 h-14 bg-[var(--theme-accent)] text-[var(--theme-accent-light)] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:scale-105 active:scale-95 transition-all group"
          >
            <span className="absolute inset-0 rounded-full bg-[var(--theme-accent)] opacity-20 group-hover:animate-ping"></span>
            <Plus size={28} className="relative z-10" />
          </button>
        </div>
      )}
      {/* Mobile Bottom Navigation */}
      <BottomNavWithBadge lang={lang} currentView={currentView} setCurrentView={setCurrentView} />
      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        task={selectedTask}
        lang={lang}
      />
      <OneSignalVerificationModal lang={lang} />
    </>
  );
}

// Thin wrapper that injects unreadCount from context into BottomNav
function BottomNavWithBadge(props) {
  const { unreadCount } = useNotifications();
  return <BottomNav {...props} unreadCount={unreadCount} />;
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
    return localStorage.getItem('theme') || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = (currentMode) => {
      if (currentMode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches ? 'dark' : 'light');
      
      const listener = (e) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      applyTheme(theme);
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      // Initialize OneSignal
      import('./services/OneSignalService').then(mod => {
        mod.default.initialize(currentUser?.uid);
      });
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
            <NotificationsProvider user={user}>
              <MainApp 
                user={user} 
                lang={lang} 
                setLang={setLang} 
                theme={theme} 
                setThemeMode={setTheme} 
              />
            </NotificationsProvider>
          </ThemeProvider>
        </SettingsProvider>
      </TasksProvider>
    </ToastProvider>
  );
}
