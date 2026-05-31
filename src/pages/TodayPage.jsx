import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, isBefore, startOfDay, endOfDay, subMonths, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { updateUserStreak, saveTask } from '../api/firestore';
import { Flame, DollarSign, Clock, Circle, Check, ArrowLeft, Maximize2, X, Trash2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../contexts/TasksContext';

export default function TodayPage({ user }) {
  const { tasks, isLoading: tasksLoading } = useTasks();
  const [streakData, setStreakData] = useState({ currentStreak: 0, bestStreak: 0, history: [] });
  const [isLoadingStreak, setIsLoadingStreak] = useState(true);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const navigate = useNavigate();
  
  const [now] = useState(new Date());

  const handleDelete = async (taskId) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?')) {
      try {
        await saveTask('DELETE', { id: taskId }, user?.uid);
      } catch (err) {
        console.error('Error deleting task:', err);
        alert('เกิดข้อผิดพลาดในการลบงาน');
      }
    }
  };

  useEffect(() => {
    const initData = async () => {
      if (!user) return;
      setIsLoadingStreak(true);
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const todayStr = format(today, 'yyyy-MM-dd');
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      
      const fetchedStreak = await updateUserStreak(user.uid, todayStr, yesterdayStr);
      if (fetchedStreak) setStreakData(fetchedStreak);
      
      setIsLoadingStreak(false);
    };
    initData();
  }, [user]);

  const { todayTasks, highPriorityCount, todayIncome, chartData, weeklyStreak, totalToday, doneToday, pendingToday } = useMemo(() => {
    let income = 0;
    const tTasks = [];
    const oTasks = [];
    let highPriority = 0;
    let doneT = 0;
    let pendingT = 0;
    
    // Monthly aggregation
    const monthlyIncome = {};
    const fullMonthlyIncome = {};
    const monthKeys6 = [];
    const monthKeys12 = [];

    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      monthKeys6.push(key);
      monthlyIncome[key] = { name: format(d, 'MMM', { locale: th }), income: 0 };
    }

    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      monthKeys12.push(key);
      fullMonthlyIncome[key] = { name: format(d, 'MMM', { locale: th }), income: 0 };
    }

    tasks.forEach(t => {
      const isDone = t.status === 'Done';
      
      if (t.isPartTime) {
        const key = format(t.start, 'yyyy-MM');
        if (monthlyIncome[key] !== undefined || fullMonthlyIncome[key] !== undefined) {
          let earnings = 0;
          let hours = 0;
          
          if (isDone || (t.actualStart && t.actualEnd)) {
            if (t.actualStart && t.actualEnd) {
              hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
            } else {
              hours = (t.end - t.start) / (1000 * 60 * 60);
            }
            if (t.rateType === 'daily') earnings = Number(t.hourlyRate) || 0;
            else if (hours > 0) earnings = hours * (Number(t.hourlyRate) || 0);
            
            if (monthlyIncome[key] !== undefined) monthlyIncome[key].income += earnings;
            if (fullMonthlyIncome[key] !== undefined) fullMonthlyIncome[key].income += earnings;
          }
        }
        
        if (isSameDay(t.start, now) && isDone) {
            let earnings = 0;
            let hours = (t.end - t.start) / (1000 * 60 * 60);
            if (t.rateType === 'daily') earnings = Number(t.hourlyRate) || 0;
            else if (hours > 0) earnings = hours * (Number(t.hourlyRate) || 0);
            income += earnings;
        }
      }

      const isDueToday = isSameDay(t.end, now);
      const isOverdue = !isDone && isBefore(endOfDay(t.end), now) && !isDueToday;

      if (isDueToday || isOverdue) {
        if (isOverdue) oTasks.push(t);
        else tTasks.push(t);
        
        if (isDueToday) {
            if (isDone) doneT++;
            else pendingT++;
            
            if (!isDone && t.priority === 'สูง') highPriority++;
        }
      }
    });

    const cData = monthKeys6.map(k => monthlyIncome[k]);
    const fcData = monthKeys12.map(k => fullMonthlyIncome[k]);

    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    const wStreak = weekDays.map(d => ({
      day: format(d, 'EE', { locale: th }),
      date: format(d, 'yyyy-MM-dd'),
      active: streakData.history.includes(format(d, 'yyyy-MM-dd')),
      isToday: isSameDay(d, now)
    }));
    
    const priorityWeight = { 'สูง': 3, 'กลาง': 2, 'ต่ำ': 1 };
    
    const allTodayTasks = [...oTasks, ...tTasks].sort((a, b) => {
      const aOverdue = isBefore(a.end, now) && a.status !== 'Done';
      const bOverdue = isBefore(b.end, now) && b.status !== 'Done';
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      if (priorityWeight[b.priority] !== priorityWeight[a.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return a.end.getTime() - b.end.getTime();
    });

    return { 
      todayTasks: allTodayTasks.slice(0, 5), 
      highPriorityCount: highPriority, 
      todayIncome: income,
      chartData: cData,
      fullChartData: fcData,
      weeklyStreak: wStreak,
      totalToday: doneT + pendingT,
      doneToday: doneT,
      pendingToday: pendingT
    };
  }, [tasks, streakData, now]);

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return 'สวัสดีตอนเช้า';
    if (hour >= 12 && hour < 17) return 'สวัสดีตอนบ่าย';
    if (hour >= 17 && hour < 21) return 'สวัสดีตอนเย็น';
    return 'สวัสดีตอนดึก';
  };

  const getStatusColor = (status, priority) => {
    if (status === 'Done') return 'bg-green-500';
    if (priority === 'สูง') return 'bg-red-500';
    if (priority === 'ต่ำ') return 'bg-green-500';
    return 'bg-amber-500';
  };

  if (tasksLoading || isLoadingStreak) {
    return (
      <div className="min-h-screen flex items-center justify-center">
         <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const avatarInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="min-h-screen font-sans pb-32 md:pb-8 overflow-x-hidden p-4 md:p-8"
    >
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center mb-4 gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main">
            <ArrowLeft size={24} />
          </button>
        </div>

        <header className="flex justify-between items-center mb-8 mt-2 animate-slide-up">
          <div>
            <p className="text-main/60 font-medium text-sm mb-1">{format(now, 'EEEE d MMM yyyy', { locale: th })}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-main flex items-center gap-2">
              {getGreeting()} {user?.displayName?.split(' ')[0] || ''} <span className="animate-wave origin-bottom-right inline-block">👋</span>
            </h1>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl shadow-inner border border-primary-500/20">
            {avatarInitial}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="liquid-glass-card p-4 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all">
            <h3 className="text-sm font-bold text-main/80 mb-2">งานทั้งหมด</h3>
            <div className="text-3xl md:text-4xl font-black text-main mb-1">{totalToday}</div>
            <p className="text-xs font-medium text-main/60">{doneToday} เสร็จ · {pendingToday} ค้างอยู่</p>
          </div>
          
          <div className="liquid-glass-card p-4 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all">
            <h3 className="text-sm font-bold text-main/80 mb-2">งานด่วนวันนี้</h3>
            <div className={`text-3xl md:text-4xl font-black mb-1 ${highPriorityCount > 0 ? 'text-red-500' : 'text-main'}`}>
              {highPriorityCount}
            </div>
            <p className="text-xs font-medium text-main/60">ครบกำหนดคืนนี้</p>
          </div>
          
          <div className="liquid-glass-card p-4 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all">
            <h3 className="text-sm font-bold text-main/80 mb-2">รายได้วันนี้</h3>
            <div className="text-3xl md:text-4xl font-black text-green-500 dark:text-green-400 mb-1">
              ฿{todayIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs font-medium text-main/60">{todayIncome > 0 ? 'จากกะวันนี้' : 'ไม่มีกะวันนี้'}</p>
          </div>
          
          <div className="p-4 rounded-[20px] flex flex-col justify-between shadow-lg relative overflow-hidden" 
               style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(139,92,246,0.15) 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <div className="absolute -right-4 -top-4 text-primary-500/10">
              <Flame size={80} />
            </div>
            <h3 className="text-sm font-bold text-primary-600 dark:text-primary-400 mb-2 flex items-center gap-1 relative z-10">
              <Flame size={16} /> Streak
            </h3>
            <div className="text-3xl md:text-4xl font-black text-primary-600 dark:text-primary-500 mb-1 relative z-10">
              {streakData.currentStreak} วัน
            </div>
            <p className="text-xs font-medium text-primary-700/70 dark:text-primary-300/70 relative z-10">สถิติสูงสุด {streakData.bestStreak} วัน</p>
          </div>
        </div>

        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex justify-between items-end mb-3">
            <h3 className="font-bold text-main/80">Streak รายสัปดาห์</h3>
            <span className="text-xs font-medium text-main/50">จ-อา</span>
          </div>
          <div className="flex justify-between gap-1 md:gap-2">
            {weeklyStreak.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-full h-8 md:h-10 rounded-lg mb-1.5 transition-all ${
                    day.active 
                      ? 'bg-primary-300 dark:bg-primary-500/80 shadow-[0_0_10px_rgba(139,92,246,0.3)]' 
                      : (day.isToday ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5')
                  }`}
                />
                <span className={`text-[10px] font-bold ${day.isToday ? 'text-primary-600 dark:text-primary-400' : 'text-main/50'}`}>
                  {day.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-main/80 flex items-center gap-2">รายได้รายเดือน</h3>
            <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-1">
              <button 
                onClick={() => setChartType('bar')} 
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${chartType === 'bar' ? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm' : 'text-main/60'}`}
              >
                บาร์
              </button>
              <button 
                onClick={() => setChartType('line')} 
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${chartType === 'line' ? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm' : 'text-main/60'}`}
              >
                เส้น
              </button>
            </div>
          </div>
          <div 
            className="h-48 w-full cursor-pointer hover:opacity-90 transition-opacity relative group"
            onClick={() => setIsChartExpanded(true)}
          >
            <div className="absolute top-2 right-2 bg-black/10 dark:bg-white/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Maximize2 className="w-4 h-4 text-main/70" />
            </div>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-main)', opacity: 0.6 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-main)', opacity: 0.6 }} tickFormatter={(value) => value > 0 ? `฿${value >= 1000 ? (value/1000)+'k' : value}` : '0'} />
                  <Tooltip 
                    cursor={{ fill: 'var(--glass-bg-strong)', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: 'var(--color-primary-500)', fontWeight: 'bold' }}
                    formatter={(value) => [`฿${value.toLocaleString()}`, 'รายได้']}
                    labelStyle={{ color: 'var(--color-text-main)', opacity: 0.8, marginBottom: '4px' }}
                  />
                  <Bar dataKey="income" radius={[6, 6, 6, 6]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? 'var(--color-primary-500)' : 'var(--color-primary-300)'} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-main)', opacity: 0.6 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-main)', opacity: 0.6 }} tickFormatter={(value) => value > 0 ? `฿${value >= 1000 ? (value/1000)+'k' : value}` : '0'} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: 'var(--color-primary-500)', fontWeight: 'bold' }}
                    formatter={(value) => [`฿${value.toLocaleString()}`, 'รายได้']}
                    labelStyle={{ color: 'var(--color-text-main)', opacity: 0.8, marginBottom: '4px' }}
                  />
                  <Line type="monotone" dataKey="income" stroke="var(--color-primary-500)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-primary-500)', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs font-bold text-main/70">
             <div className="w-2 h-2 rounded-sm bg-primary-500"></div> รายได้ (฿)
          </div>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-main/80">งานวันนี้</h3>
            {todayTasks.length > 0 && <span className="text-xs font-bold text-primary-500">ทั้งหมด {todayTasks.length} งาน</span>}
          </div>
          
          <div className="space-y-3">
            {todayTasks.length === 0 ? (
              <div className="liquid-glass-card p-6 text-center text-main/50 font-medium rounded-[20px]">
                ไม่มีงานสำหรับวันนี้ 🎉
              </div>
            ) : (
              todayTasks.map(task => {
                const isOverdue = !isSameDay(task.end, now) && isBefore(task.end, now) && task.status !== 'Done';
                return (
                  <div key={task.id} className={`liquid-glass-card p-4 rounded-[20px] flex items-center gap-3 transition-all ${task.status === 'Done' ? 'opacity-60' : 'hover:border-primary-500/30'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(task.status, task.priority)} ${isOverdue ? 'animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-main truncate ${task.status === 'Done' ? 'line-through' : ''}`}>{task.title}</h4>
                      <p className="text-[10px] md:text-xs text-main/60 truncate flex items-center gap-1.5 mt-0.5">
                         {format(task.start, 'HH:mm')} - {format(task.end, 'HH:mm')}
                         <span className="opacity-50">•</span>
                         {task.isPartTime ? (
                           <span className="text-green-500 dark:text-green-400 font-bold flex items-center gap-0.5"><DollarSign size={10} /> กะงาน</span>
                         ) : (
                           <span className={task.priority === 'สูง' ? 'text-red-500 font-bold' : ''}>สำคัญ{task.priority}</span>
                         )}
                         {isOverdue && <span className="text-red-500 font-bold ml-1 bg-red-500/10 px-1.5 rounded text-[9px]">เลยกำหนด</span>}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      {task.status === 'Done' ? (
                        <div className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold border border-green-500/20 flex items-center gap-1">
                          <Check size={12} /> เสร็จแล้ว
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-full bg-white/50 dark:bg-black/30 text-main text-xs font-bold border border-main/10 shadow-sm">
                          {task.status}
                        </div>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                        className="p-1.5 text-main/30 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                        title="ลบงานนี้"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Expanded Chart Modal */}
      {isChartExpanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsChartExpanded(false)}>
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[80vh] rounded-[32px] p-6 md:p-8 flex flex-col shadow-2xl relative border border-black/5 dark:border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsChartExpanded(false)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main/70 hover:text-main"
            >
              <X size={24} />
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-main">รายได้ 12 เดือนล่าสุด</h2>
              <p className="text-main/60 text-sm mt-1">ยอดรวมรายได้จากกะงานในช่วง 1 ปีที่ผ่านมา</p>
            </div>
            
            <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-1 w-max mb-6">
              <button 
                onClick={() => setChartType('bar')} 
                className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${chartType === 'bar' ? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm' : 'text-main/60'}`}
              >
                บาร์
              </button>
              <button 
                onClick={() => setChartType('line')} 
                className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${chartType === 'line' ? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm' : 'text-main/60'}`}
              >
                เส้น
              </button>
            </div>

            <div className="flex-1 min-h-0 relative">
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={fullChartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" opacity={0.5} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-main)', opacity: 0.8 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-main)', opacity: 0.8 }} tickFormatter={(value) => value > 0 ? `฿${value >= 1000 ? (value/1000)+'k' : value}` : '0'} />
                      <Tooltip 
                        cursor={{ fill: 'var(--glass-bg-strong)', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: 'var(--color-primary-500)', fontWeight: 'bold' }}
                        formatter={(value) => [`฿${value.toLocaleString()}`, 'รายได้']}
                        labelStyle={{ color: 'var(--color-text-main)', opacity: 0.8, marginBottom: '4px' }}
                      />
                      <Bar dataKey="income" radius={[8, 8, 8, 8]}>
                        {fullChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === fullChartData.length - 1 ? 'var(--color-primary-500)' : 'var(--color-primary-300)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart data={fullChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" opacity={0.5} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-main)', opacity: 0.8 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-main)', opacity: 0.8 }} tickFormatter={(value) => value > 0 ? `฿${value >= 1000 ? (value/1000)+'k' : value}` : '0'} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: 'var(--color-primary-500)', fontWeight: 'bold' }}
                        formatter={(value) => [`฿${value.toLocaleString()}`, 'รายได้']}
                        labelStyle={{ color: 'var(--color-text-main)', opacity: 0.8, marginBottom: '4px' }}
                      />
                      <Line type="monotone" dataKey="income" stroke="var(--color-primary-500)" strokeWidth={4} dot={{ r: 5, fill: 'var(--color-primary-500)', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 8 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
