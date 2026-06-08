import React, { useState, useMemo, useRef } from 'react';

import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { DollarSign, Clock, CheckCircle2, Plus, ArrowLeft, Trash2, CalendarDays, History, Edit, Target, X, Settings, List, LayoutGrid, BarChart2, PieChart, GripHorizontal, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

import TaskModal from '../components/tasks/TaskModal';
import ActionSheet from '../components/common/ActionSheet';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useTasks } from '../contexts/TasksContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { saveTask } from '../services/taskService';
import { calcSSO } from '../utils/socialSecurity';
import { TASK_STATUS, TASK_PRIORITY, RATE_TYPE, DEFAULT_TASK_VALUES } from '../constants';
import { translations } from '../i18n';
import confetti from 'canvas-confetti';

const JOB_COLORS = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', borderL: 'border-l-blue-500', button: 'text-blue-500 hover:bg-blue-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', borderL: 'border-l-red-500', button: 'text-red-500 hover:bg-red-500/20' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20', borderL: 'border-l-green-500', button: 'text-green-500 hover:bg-green-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', borderL: 'border-l-amber-500', button: 'text-amber-500 hover:bg-amber-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20', borderL: 'border-l-purple-500', button: 'text-purple-500 hover:bg-purple-500/20' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20', borderL: 'border-l-pink-500', button: 'text-pink-500 hover:bg-pink-500/20' },
  primary: { bg: 'bg-primary-500/10', text: 'text-primary-600 dark:text-primary-400', border: 'border-primary-500/20', borderL: 'border-l-primary-500', button: 'text-primary-500 hover:bg-primary-500/20' }
};

export default function PartTimePage({ user, lang = 'en' }) {
  const t = translations[lang].partTime;
  const { tasks: allTasks, isLoading: isTasksLoading } = useTasks();
  const { settings } = useSettings();
  const navigate = useNavigate();
  
  const tasks = useMemo(() => {
    const partTimeTasks = allTasks.filter(t => t.isPartTime);
    partTimeTasks.sort((a, b) => new Date(b.start) - new Date(a.start));
    return partTimeTasks;
  }, [allTasks]);

  const [isMutating, setIsMutating] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'history'
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { showToast } = useToast();
  const [actionTask, setActionTask] = useState(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const timerRef = useRef(null);
  const [pressingId, setPressingId] = useState(null);

  const [achievementToShow, setAchievementToShow] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    note: '',
    hourlyRate: DEFAULT_TASK_VALUES.HOURLY_RATE,
    rateType: RATE_TYPE.HOURLY,
    breakHours: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    startTime: DEFAULT_TASK_VALUES.START_TIME,
    endTime: DEFAULT_TASK_VALUES.END_TIME
  });
  
  const [enabledWidgets, setEnabledWidgets] = useState(() => {
    const saved = localStorage.getItem('income_dashboard');
    return saved ? JSON.parse(saved) : ['total_sso_net', 'expense_list', 'goal', 'earned', 'expected', 'work_streak'];
  });
  const [isEditWidgetMode, setIsEditWidgetMode] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [incomeGoal, setIncomeGoal] = useState(() => {
    const saved = localStorage.getItem('income_goal');
    return saved ? JSON.parse(saved) : { goalAmount: 5000, goalMonth: new Date().toISOString().slice(0, 7), isRecurring: true };
  });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState({ goalAmount: 5000, goalMonth: new Date().toISOString().slice(0, 7), isRecurring: true });

  React.useEffect(() => {
    localStorage.setItem('income_dashboard', JSON.stringify(enabledWidgets));
  }, [enabledWidgets]);

  React.useEffect(() => {
    localStorage.setItem('income_goal', JSON.stringify(incomeGoal));
  }, [incomeGoal]);

  const [expenseFormData, setExpenseFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    month: new Date().toISOString().slice(0, 7),
    month: new Date().toISOString().slice(0, 7),
    isPercentage: false,
  });

  const daysOfWeek = [
    { id: 1, label: 'จ.' },
    { id: 2, label: 'อ.' },
    { id: 3, label: 'พ.' },
    { id: 4, label: 'พฤ.' },
    { id: 5, label: 'ศ.' },
    { id: 6, label: 'ส.' },
    { id: 0, label: 'อา.' },
  ];



  // Derived state
  const { upcomingTasks, historyTasks } = useMemo(() => {
    const upcoming = [];
    const history = [];
    
    tasks.forEach(t => {
      const isCompleted = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      if (isCompleted) {
        history.push(t);
      } else {
        upcoming.push(t);
      }
    });
    
    // Sort upcoming nearest first
    upcoming.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    return { upcomingTasks: upcoming, historyTasks: history };
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    const groups = {};
    const sourceTasks = activeTab === 'upcoming' ? upcomingTasks : historyTasks;
    sourceTasks.forEach(task => {
      const job = (settings.jobs || []).find(j => j.name === task.title);
      const title = job ? job.name : (task.title || 'อื่นๆ');
      if (!groups[title]) groups[title] = { job: job, tasks: [] };
      groups[title].tasks.push(task);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [upcomingTasks, historyTasks, activeTab, settings.jobs]);

  const monthlyGross = useMemo(() => {
    const earned = {};
    const pending = {};
    const earnedSSO = {};
    const pendingSSO = {};
    const breakdown = {};
    
    tasks.forEach(t => {
      if (t.isExpense) return;
      
      const job = (settings.jobs || []).find(j => j.name === t.title);
      const deductsSSO = (job && job.deductSSO !== undefined) ? job.deductSSO : settings.socialSecurity;

      const isCompleted = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      const rate = Number(t.hourlyRate) || 0;
      
      const d = new Date(t.start);
      if (isNaN(d.getTime())) return;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!breakdown[monthKey]) breakdown[monthKey] = {};
      
      const jobTitle = job ? job.name : (t.title || 'อื่นๆ');
      if (!breakdown[monthKey][jobTitle]) breakdown[monthKey][jobTitle] = { job, total: 0 };
      
      let taskEarned = 0;
      let hours = 0;
      
      if (isCompleted) {
        if (t.actualStart && t.actualEnd) {
          hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
        } else {
          hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
        }
        hours = Math.max(0, hours - (Number(t.breakHours) || 0));
        if (t.rateType === RATE_TYPE.DAILY) taskEarned = rate;
        else if (hours > 0) taskEarned = hours * rate;
        
        earned[monthKey] = (earned[monthKey] || 0) + taskEarned;
        if (deductsSSO) earnedSSO[monthKey] = (earnedSSO[monthKey] || 0) + taskEarned;
      } else {
        hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
        hours = Math.max(0, hours - (Number(t.breakHours) || 0));
        if (t.rateType === RATE_TYPE.DAILY) taskEarned = rate;
        else if (hours > 0) taskEarned = hours * rate;
        
        pending[monthKey] = (pending[monthKey] || 0) + taskEarned;
        if (deductsSSO) pendingSSO[monthKey] = (pendingSSO[monthKey] || 0) + taskEarned;
      }
      breakdown[monthKey][jobTitle].total += taskEarned;
    });
    
    return { earned, pending, earnedSSO, pendingSSO, breakdown };
  }, [tasks, settings.jobs, settings.socialSecurity]);

  const stats = useMemo(() => {
    let earned = monthlyGross.earned[selectedMonth] || 0;
    let pending = monthlyGross.pending[selectedMonth] || 0;
    let earnedSSO = monthlyGross.earnedSSO[selectedMonth] || 0;
    let pendingSSO = monthlyGross.pendingSSO[selectedMonth] || 0;
    let ssoDeducted = 0;
    let expenseTotal = 0;
    
    tasks.forEach(t => {
      if (!t.isExpense) return;
      const d = new Date(t.start);
      if (isNaN(d.getTime())) return;
      const expMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (expMonthKey !== selectedMonth) return;
      
      let amt = 0;
      if (t.isPercentage) {
        const percentage = Number(t.amount) || 0;
        amt = (earned + pending) * (percentage / 100);
      } else {
        amt = Number(t.amount) || 0;
      }
      
      expenseTotal += amt;
    });

    const ssoGross = earnedSSO + pendingSSO;
    if (ssoGross > 0 && settings.showInIncome) {
       const { deduction } = calcSSO(ssoGross);
       ssoDeducted = deduction;
    }

    const breakdownData = monthlyGross.breakdown[selectedMonth] || {};
    const jobBreakdown = Object.entries(breakdownData).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);

    return { 
      earned, 
      pending, 
      total: earned + pending,
      ssoDeducted,
      expenseTotal,
      netTotal: earned + pending - ssoDeducted - expenseTotal,
      jobBreakdown
    };
  }, [tasks, monthlyGross, settings.socialSecurity, selectedMonth]);

  const extraStats = useMemo(() => {
    let shiftCount = 0;
    let totalHours = 0;
    
    tasks.forEach(t => {
      if (t.isExpense) return;
      shiftCount++;
      let hours = 0;
      if (t.actualStart && t.actualEnd) {
        hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
      } else {
        hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
      }
      hours = Math.max(0, hours - (Number(t.breakHours) || 0));
      if (hours > 0) totalHours += hours;
    });
    
    const allMonths = new Set([...Object.keys(monthlyGross.earned), ...Object.keys(monthlyGross.pending)]);
    const chartData = Array.from(allMonths).sort().map(month => {
      const parts = month.split('-');
      const d = new Date(parts[0], parseInt(parts[1]) - 1);
      return {
        name: format(d, 'MMM', { locale: th }),
        earned: monthlyGross.earned[month] || 0,
        expected: monthlyGross.pending[month] || 0
      };
    }).slice(-6);

    let currentWorkStreak = 0;
    let bestWorkStreak = 0;
    const completedWorkDates = new Set();
    tasks.forEach(t => {
      const isDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      if (t.isPartTime && !t.isExpense && isDone) {
         completedWorkDates.add(format(new Date(t.start), 'yyyy-MM-dd'));
      }
    });
    const sortedWorkDates = Array.from(completedWorkDates).sort((a, b) => b.localeCompare(a));
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = format(yesterdayDate, 'yyyy-MM-dd');

    if (completedWorkDates.has(todayStr) || completedWorkDates.has(yesterdayStr)) {
      let checkDate = new Date(completedWorkDates.has(todayStr) ? now : yesterdayDate);
      while (completedWorkDates.has(format(checkDate, 'yyyy-MM-dd'))) {
        currentWorkStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
    
    let tempStreak = 0;
    let previousDate = null;
    for (let i = sortedWorkDates.length - 1; i >= 0; i--) {
       if (i === sortedWorkDates.length - 1) {
          tempStreak = 1;
       } else {
          const currentD = new Date(sortedWorkDates[i]);
          const prevD = new Date(previousDate);
          prevD.setDate(prevD.getDate() + 1);
          if (format(currentD, 'yyyy-MM-dd') === format(prevD, 'yyyy-MM-dd')) {
             tempStreak++;
          } else {
             tempStreak = 1;
          }
       }
       if (tempStreak > bestWorkStreak) bestWorkStreak = tempStreak;
       previousDate = sortedWorkDates[i];
    }
    
    return { shiftCount, totalHours: Math.round(totalHours), chartData, currentWorkStreak, bestWorkStreak };
  }, [tasks, monthlyGross]);

  const expensesList = useMemo(() => {
    return tasks.filter(t => {
      if (!t.isExpense) return false;
      const d = new Date(t.start);
      if (isNaN(d.getTime())) return false;
      const expMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return expMonthKey === selectedMonth;
    });
  }, [tasks, selectedMonth]);

  const removeWidget = (id) => {
    setEnabledWidgets(prev => prev.filter(w => w !== id));
  };
  
  const AVAILABLE_WIDGETS = [
    { id: 'net', label: 'รายได้สุทธิ (Net Income)' },
    { id: 'earned', label: 'รายได้ที่ได้แล้ว (Earned)' },
    { id: 'expected', label: 'คาดว่าได้รับ (Expected)' },
    { id: 'total_sso_net', label: 'รายได้รวม & หักประกันสังคม' },
    { id: 'expense_list', label: 'รายจ่ายทั้งหมด (Expense List)' },
    { id: 'goal', label: 'เป้าหมายรายได้ (Income Goal)' },
    { id: 'work_streak', label: 'วันทำงานต่อเนื่อง (Work Streak)' },
    { id: 'shift_count', label: 'จำนวนกะ (Shift Count)' },
    { id: 'total_hours', label: 'ชั่วโมงรวม (Total Hours)' },
    { id: 'chart', label: 'กราฟรายเดือน (Monthly Chart)' }
  ];

  const renderWidgetContent = (id) => {
    switch(id) {
      case 'net':
      
  React.useEffect(() => {
    if (isTasksLoading) return;
    
    const shown = JSON.parse(localStorage.getItem('achievements_shown') || '{}');
    const goalAmount = Number(incomeGoal.goalAmount) || 0;
    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');
    const currentMonthIncome = monthlyGross.earned[currentMonthKey] || 0;
    
    const milestones = [100, 30, 14, 7, 3];
    for (const m of milestones) {
       if (extraStats.currentWorkStreak >= m) {
           const key = `work_streak_${m}`;
           if (!shown[key]) {
               setAchievementToShow({
                   type: 'streak',
                   title: '🔥 ไฟลุกซู่!',
                   message: `ยอดเยี่ยม! คุณทำงาน Part-Time ต่อเนื่องมา ${m} วันแล้ว`,
                   key
               });
               return; 
           }
           break; 
       }
    }
    
    if (currentMonthIncome >= goalAmount && goalAmount > 0) {
        const key = `goal_${currentMonthKey}`;
        if (!shown[key]) {
            setAchievementToShow({
                type: 'goal',
                title: '🏆 ทะลุเป้า!',
                message: `คุณทำรายได้เดือนนี้ทะลุเป้า ฿${goalAmount.toLocaleString()} แล้ว!`,
                key
            });
        }
    }
  }, [extraStats.currentWorkStreak, monthlyGross, isTasksLoading, incomeGoal]);

  React.useEffect(() => {
    if (achievementToShow) {
       confetti({
           particleCount: 150,
           spread: 70,
           origin: { y: 0.6 },
           colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
           zIndex: 1000
       });
    }
  }, [achievementToShow]);

  return (

          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-purple-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">รายได้สุทธิ (Net Income)</p>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">฿{stats.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        );
      case 'earned':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-green-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">{t.earned}</p>
            <span className="text-2xl font-bold text-green-500">฿{stats.earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        );
      case 'expected':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-amber-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">{t.expected}</p>
            <span className="text-xl font-bold text-amber-500">฿{stats.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        );
            case 'work_streak':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-between h-full border-l-4 border-l-orange-500 relative overflow-hidden group">
            <motion.div 
              className="absolute -right-4 -top-4 text-orange-500/10"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Flame size={80} strokeWidth={1.5} />
            </motion.div>
            <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1 relative z-10 group-hover:text-orange-500 transition-colors">
              <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{ originY: 0.8 }}>
                <Flame size={16} className="text-orange-500" fill="currentColor" />
              </motion.div>
              Work Streak
            </h3>
            <div className="text-2xl md:text-3xl font-black text-orange-600 dark:text-orange-500 mb-0.5 relative z-10 group-hover:scale-105 transition-transform origin-left">
              {extraStats.currentWorkStreak} วัน
            </div>
            <p className="text-[10px] font-medium text-orange-700/70 dark:text-orange-300/70 relative z-10">สถิติสูงสุด {extraStats.bestWorkStreak} วัน</p>
          </div>
        );
      case 'shift_count':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-blue-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">จำนวนกะรวม</p>
            <span className="text-2xl font-bold text-blue-500">{extraStats.shiftCount} กะ</span>
          </div>
        );
      case 'total_hours':
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-indigo-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">ชั่วโมงทำงานรวม</p>
            <span className="text-2xl font-bold text-indigo-500">{extraStats.totalHours} ชม.</span>
          </div>
        );
      case 'chart':
        return (
          <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center h-48 border-l-4 border-l-pink-500">
             <p className="text-xs text-main opacity-70 font-medium mb-2">กราฟรายได้รายเดือน</p>
             {extraStats.chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={extraStats.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{fontSize: 10, fill: 'var(--color-main)'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 10, fill: 'var(--color-main)'}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.1)'}} contentStyle={{borderRadius: '12px', border: 'none', background: 'var(--glass-bg)'}} />
                    <Bar dataKey="earned" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="expected" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex-1 flex items-center justify-center text-sm opacity-50">ไม่มีข้อมูล</div>
             )}
          </div>
        );
      case 'total_sso_net':
        return (
          <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-primary-500 border border-dashed border-main/20">
            <div className="flex justify-between items-center mb-1">
               <p className="text-sm text-main opacity-70 font-medium">{t.total} (ก่อนหัก)</p>
               <span className="text-2xl font-bold text-primary-500">฿{stats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            {stats.jobBreakdown && stats.jobBreakdown.length > 0 && (
              <div className="mt-2 mb-3 space-y-1.5 border-t border-main/10 pt-2">
                <p className="text-[10px] text-main opacity-50 font-bold mb-1 uppercase">แยกตามบริษัท</p>
                {stats.jobBreakdown.map((b, i) => {
                  const c = JOB_COLORS[b.job ? b.job.color : 'primary'] || JOB_COLORS.primary;
                  if (b.total === 0) return null;
                  return (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 opacity-90">
                        <span>{b.job ? b.job.emoji : '🏢'}</span>
                        <span className="font-medium text-main">{b.name}</span>
                      </div>
                      <span className={`font-bold ${c.text}`}>฿{b.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {stats.ssoDeducted > 0 && (
               <div className="flex justify-between items-center mb-1 border-t border-main/10 pt-2 mt-2">
                 <p className="text-sm text-red-600 dark:text-red-400 opacity-90 font-medium">{lang === 'th' ? 'หักประกันสังคม (-5%)' : 'SSO Deduction (-5%)'}</p>
                 <span className="text-lg font-bold text-red-600 dark:text-red-400">-฿{stats.ssoDeducted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
            )}
            {stats.expenseTotal > 0 && (
              <div className="flex justify-between items-center mb-1 border-t border-main/10 pt-2 mt-2">
                   <p className="text-sm text-red-600 dark:text-red-400 opacity-90 font-medium">รวมรายจ่ายอื่นๆ</p>
                   <span className="text-lg font-bold text-red-600 dark:text-red-400">-฿{stats.expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between items-center mt-2 bg-purple-500/10 p-2 rounded-xl">
               <p className="text-sm text-purple-600 dark:text-purple-400 font-bold">{lang === 'th' ? 'รายได้สุทธิ' : 'Net Income'}</p>
               <span className="text-xl font-bold text-purple-600 dark:text-purple-400">฿{stats.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        );
      case 'expense_list':
        return (
          <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-red-500">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-bold text-main flex items-center gap-2"><List size={16}/> รายจ่ายทั้งหมด</p>
              {stats.expenseTotal > 0 && <span className="text-sm font-bold text-red-500">-฿{stats.expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
            </div>
            {expensesList.length === 0 ? (
              <p className="text-xs text-center opacity-50 py-2">ไม่มีรายการรายจ่าย</p>
            ) : (
              <div className="space-y-2">
                {expensesList.map(exp => {
                   let amt = 0;
                   if (exp.isPercentage) {
                     const d = new Date(exp.start);
                     const monthKey = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null;
                     const monthEarned = monthKey ? (monthlyGross.earned[monthKey] || 0) : 0;
                     const monthPending = monthKey ? (monthlyGross.pending[monthKey] || 0) : 0;
                     amt = (monthEarned + monthPending) * (Number(exp.amount) / 100);
                   } else {
                     amt = Number(exp.amount) || 0;
                   }
                   return (
                     <div key={exp.id} onClick={() => handleEditExpenseClick(exp)} className="flex justify-between items-center p-2 bg-main/5 rounded-lg cursor-pointer hover:bg-main/10 transition-colors">
                       <div>
                         <p className="text-sm font-medium">{exp.title}</p>
                         <p className="text-[10px] opacity-60">{exp.isPercentage ? `${exp.amount}% ของรายได้` : fDate(exp.start)}</p>
                       </div>
                       <span className="text-sm font-bold text-red-500">-฿{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                   );
                })}
              </div>
            )}
          </div>
        );
      case 'goal': {
        const currentIncome = stats.earned;
        const progress = Math.min(100, Math.round((currentIncome / incomeGoal.goalAmount) * 100)) || 0;
        const diff = incomeGoal.goalAmount - currentIncome;
        return (
          <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-primary-500 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2 relative z-10">
               <p className="text-sm font-bold text-main flex items-center gap-2"><Target size={16}/> เป้าหมายเดือนนี้</p>
               <button onClick={(e) => { e.stopPropagation(); setTempGoal(incomeGoal); setShowGoalModal(true); setIsEditWidgetMode(false); }} className="text-primary-500 hover:bg-primary-500/10 p-1.5 rounded-full transition-colors"><Edit size={14}/></button>
            </div>
            <p className="text-xs opacity-70 mb-2 relative z-10">฿{currentIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ฿{incomeGoal.goalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <div className="w-full bg-main/10 rounded-full h-3 mb-2 overflow-hidden relative z-10">
               <div className="bg-primary-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-xs relative z-10">
               <span className="font-medium">
                 {diff > 0 ? `เหลืออีก ฿${diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ถึงเป้า` : diff === 0 ? `🎉 ทำได้ตามเป้าแล้ว!` : `🔥 เกินเป้า ฿${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
               </span>
               <span className="font-bold text-primary-500">{progress}%</span>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const uniqueTitles = useMemo(() => {
    const titles = new Set();
    tasks.forEach(t => {
      if (t.title) titles.add(t.title);
    });
    return Array.from(titles);
  }, [tasks]);

  const handleAddShift = async (e) => {
    e.preventDefault();
    
    setIsMutating(true);
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const shiftsToAdd = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().slice(0, 10);
      const startDateTime = new Date(`${dateString}T${formData.startTime}:00`).toISOString();
        let endDateObj = new Date(`${dateString}T${formData.endTime}:00`);
        
        if (formData.endTime < formData.startTime) {
          endDateObj.setDate(endDateObj.getDate() + 1);
        }
        
        const shiftHours = (endDateObj - new Date(startDateTime)) / (1000 * 60 * 60);
        const canBreak = true;

        shiftsToAdd.push({
          title: formData.title,
          description: formData.note || '',
          start: startDateTime,
          end: endDateObj.toISOString(),
          status: TASK_STATUS.TODO,
          priority: TASK_PRIORITY.MEDIUM,
          isPartTime: true,
          hourlyRate: formData.hourlyRate,
          rateType: formData.rateType,
          breakHours: (formData.rateType === RATE_TYPE.HOURLY) ? (Number(formData.breakHours) || 0) : 0,
          actualStart: null,
          actualEnd: null
        });
    }

    if (shiftsToAdd.length === 0) {
      alert("ไม่พบวันที่ตรงกับเงื่อนไขในช่วงเวลาที่เลือก");
      setIsMutating(false);
      return;
    }
    
    if (shiftsToAdd.length > 31) {
       if(!window.confirm(`คุณกำลังจะสร้างตารางกะงานทั้งหมด ${shiftsToAdd.length} วัน แน่ใจหรือไม่?`)) {
           setIsMutating(false);
           return;
       }
    }

    await Promise.all(shiftsToAdd.map(task => saveTask('ADD', task, user.uid)));
    setShowAddForm(false);
    setIsMutating(false);
  };
  const handleAddExpense = async (e) => {
    e.preventDefault();
    setIsMutating(true);
    
    let expenseDateStr = `${expenseFormData.month}-01`;
    const startDateTime = new Date(`${expenseDateStr}T00:00:00`).toISOString();
    
    const expenseTask = {
      title: expenseFormData.title,
      description: '',
      start: startDateTime,
      end: startDateTime,
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.MEDIUM,
      isPartTime: true,
      isExpense: true,
      amount: expenseFormData.amount,
      isPercentage: false
    };
    
    if (expenseFormData.id) {
      await saveTask('EDIT', { ...expenseTask, id: expenseFormData.id }, user.uid);
    } else {
      await saveTask('ADD', expenseTask, user.uid);
    }
    setShowAddExpenseForm(false);
    setExpenseFormData({ title: '', amount: '', date: new Date().toISOString().slice(0, 10), month: new Date().toISOString().slice(0, 7), isPercentage: false });
    setIsMutating(false);
  };


  const handleEditExpenseClick = (exp) => {
    const startD = new Date(exp.start);
    setExpenseFormData({
      id: exp.id,
      title: exp.title,
      amount: exp.amount,
      date: isNaN(startD.getTime()) ? new Date().toISOString().slice(0, 10) : startD.toISOString().slice(0, 10),
      month: isNaN(startD.getTime()) ? new Date().toISOString().slice(0, 7) : startD.toISOString().slice(0, 7),
      isPercentage: false
    });
    setShowAddExpenseForm(true);
  };

  const handleMarkDone = async (task) => {
    const updated = {
      ...task,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      status: TASK_STATUS.DONE
    };
    setIsMutating(true);
    await saveTask('EDIT', updated, user.uid);
    setIsMutating(false);
  };

  const confirmDelete = async (taskToDelete) => {
    setDeleteConfirmTask(null);
    setIsMutating(true);
    
    // Backup for undo
    const backupTask = { ...taskToDelete };
    
    await saveTask('DELETE', { id: taskToDelete.id }, user.uid);
    setIsMutating(false);
    
    showToast('ลบเรียบร้อยแล้ว', {
      duration: 5000,
      onUndo: async () => {
        await saveTask('ADD', backupTask, user.uid);
      }
    });
  };

  const handleEditSave = async (taskData) => {
    setIsMutating(true);
    if (editingTask) {
      await saveTask('EDIT', { ...taskData, id: editingTask.id }, user.uid);
    } else {
      await saveTask('ADD', taskData, user.uid);
    }
    setIsMutating(false);
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleDelete = async (taskData) => {
    // Forward to our confirm dialog flow instead of deleting directly
    setDeleteConfirmTask(taskData);
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handlePointerDown = (task) => {
    setPressingId(task.id);
    timerRef.current = setTimeout(() => {
      setPressingId(null);
      setActionTask(task);
    }, 500);
  };

  const handlePointerUp = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressingId(null);
  };

  const fDate = (d) => format(d, 'EEEEที่ d MMM yyyy', { locale: th });
  const fMonth = (d) => format(d, 'MMMM yyyy', { locale: th });
  const fTime = (d) => format(d, 'HH:mm');
  const activeTasks = activeTab === 'upcoming' ? upcomingTasks : historyTasks;

  if (isTasksLoading || isMutating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const sortedWidgets = enabledWidgets;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="min-h-screen font-sans pb-32 md:pb-8 p-4 md:p-8 max-w-4xl mx-auto"
    >
      <div className="flex items-center mb-8 gap-4 px-2">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main shrink-0">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-main flex items-center gap-2 m-0">
          <CalendarDays className="text-primary-500 shrink-0" size={28} />
          {t.title}
        </h1>
      </div>

      <div className="flex justify-between items-center mb-4 px-2 mt-2">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-lg text-main leading-none">ภาพรวมรายได้</h2>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm font-bold text-primary-500 bg-transparent outline-none cursor-pointer p-0"
          />
        </div>
        <button 
          onClick={() => setIsEditWidgetMode(!isEditWidgetMode)} 
          className={`text-sm px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 ${isEditWidgetMode ? 'bg-primary-500 text-white shadow-md' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'}`}
        >
          {isEditWidgetMode ? 'เสร็จสิ้น' : <><Settings size={14}/> แก้ไข Widget</>}
        </button>
      </div>

      <Reorder.Group 
        axis="y"
        values={sortedWidgets}
        onReorder={setEnabledWidgets}
        className="grid grid-cols-2 gap-4 mb-4"
      >
        <AnimatePresence>
          {sortedWidgets.map(id => (
            <Reorder.Item 
              key={id}
              value={id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isEditWidgetMode ? {
                 opacity: 1, 
                 scale: 1, 
                 rotate: [-0.8, 0.8, -0.8],
                 transition: { rotate: { repeat: Infinity, duration: 0.2 } }
              } : { opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              dragListener={isEditWidgetMode}
              className={`relative ${['total_sso_net', 'expense_list', 'goal', 'chart'].includes(id) ? 'col-span-2' : ''} ${isEditWidgetMode ? 'cursor-grab active:cursor-grabbing z-50' : ''}`}
            >
              {isEditWidgetMode && (
                <>
                  <button 
                    onClick={() => removeWidget(id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg z-[60] hover:scale-110 transition-transform"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[60] opacity-30 text-main pointer-events-none">
                    <GripHorizontal size={20} />
                  </div>
                </>
              )}
              <div className={isEditWidgetMode ? 'pointer-events-none opacity-80' : ''}>
                {renderWidgetContent(id)}
              </div>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {isEditWidgetMode && (
         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8">
           <button 
             onClick={() => setShowWidgetSelector(true)}
             className="w-full py-4 border-2 border-dashed border-main/20 rounded-2xl flex items-center justify-center gap-2 text-main/60 hover:text-main hover:border-main/40 transition-colors bg-white/10"
           >
             <Plus size={20} /> เพิ่ม Widget
           </button>
           <p className="text-center text-xs opacity-50 mt-2">แตะ ✕ เพื่อลบ Widget ออกจากหน้าจอ</p>
         </motion.div>
      )}

      {!isEditWidgetMode && <div className="mb-8" />}

      <div className="flex flex-col md:flex-row justify-between items-center mb-5 px-2 gap-3">
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all text-sm whitespace-nowrap ${activeTab === 'upcoming' ? 'bg-primary-500 text-white shadow-md' : 'bg-white/20 text-main hover:bg-white/40'}`}
          >
            <CalendarDays size={16} /> {t.upcoming}
          </button>
          <button 
            onClick={() => navigate('/income/history')}
            className="flex-1 md:flex-none flex justify-center items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all text-sm whitespace-nowrap bg-primary-500 text-white shadow-md hover:bg-primary-600 active:scale-95"
          >
            <History size={16} /> {t.history}
          </button>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => { 
                if (!showAddExpenseForm) {
                  setExpenseFormData({ title: '', amount: '', date: new Date().toISOString().slice(0, 10), month: new Date().toISOString().slice(0, 7), isPercentage: false });
                }
                setShowAddExpenseForm(!showAddExpenseForm); 
                setShowAddForm(false); 
              }}
              className={`flex-1 md:flex-none justify-center items-center gap-2 flex px-4 py-2.5 font-bold rounded-full transition-all shadow-md active:scale-95 text-sm ${showAddExpenseForm ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/20 text-red-500 hover:bg-red-500/10'}`}
            >
              <Plus size={16} /> {showAddExpenseForm ? t.close : t.addExpense}
            </button>
            <button 
              onClick={() => { setShowAddForm(!showAddForm); setShowAddExpenseForm(false); }}
              className={`flex-1 md:flex-none justify-center items-center gap-2 flex px-4 py-2.5 font-bold rounded-full transition-all shadow-md active:scale-95 text-sm ${showAddForm ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white/20 text-green-600 dark:text-green-400 hover:bg-green-500/10'}`}
            >
              <Plus size={16} /> {showAddForm ? t.close : t.addShift}
            </button>
        </div>
      </div>

      <AnimatePresence>
        {showAddExpenseForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleAddExpense} className="liquid-glass-card p-6 space-y-5 border-2 border-red-500/30 bg-red-500/5">
              <h3 className="font-bold text-main">{t.addExpenseTitle}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.expenseTitle}</label>
                  <input type="text" value={expenseFormData.title} onChange={e => setExpenseFormData({...expenseFormData, title: e.target.value})} required className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} placeholder={t.expenseTitlePlaceholder} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.amount}</label>
                  <div className="relative">
                    <input type="number" step="any" value={expenseFormData.amount} onChange={e => setExpenseFormData({...expenseFormData, amount: e.target.value})} required min="0" className="w-full pl-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold opacity-50">฿</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-main mb-1.5 opacity-80">
                    ประจำเดือน
                  </label>
                  <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="month" value={expenseFormData.month} onChange={e => setExpenseFormData({...expenseFormData, month: e.target.value})} required className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={isMutating || isTasksLoading} className="w-full py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg active:scale-[0.98]">
                  {t.createExpense}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {showAddForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleAddShift} className="liquid-glass-card p-6 space-y-5 border-2 border-primary-500/30 bg-primary-500/5">
              <h3 className="font-bold text-main">เพิ่ม{t.upcoming} (สามารถเพิ่มหลายวันได้)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2 mb-2">
                  <label className="block text-sm font-medium text-main mb-2 opacity-80">{t.jobTitle}</label>
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar">
                    {(settings.jobs || []).map(job => {
                      const c = JOB_COLORS[job.color] || JOB_COLORS.primary;
                      return (
                      <button 
                        key={job.id} type="button"
                        onClick={() => setFormData({...formData, title: job.name, hourlyRate: job.rate || formData.hourlyRate, rateType: job.rateType || formData.rateType, deductSSO: job.deductSSO})}
                        className={`flex flex-col items-center justify-center min-w-[90px] h-[90px] p-3 rounded-2xl border-2 transition-all snap-start shadow-sm ${formData.title === job.name ? `${c.border} ${c.bg} scale-105` : 'border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                      >
                        <span className="text-3xl mb-1">{job.emoji || '🏢'}</span>
                        <span className="text-xs font-bold text-main whitespace-nowrap truncate w-full px-1">{job.name}</span>
                      </button>
                    )})}
                    <button type="button" onClick={() => navigate('/settings')} className="flex flex-col items-center justify-center min-w-[90px] h-[90px] p-3 rounded-2xl border-2 border-dashed border-main/20 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-all snap-start shadow-sm">
                      <Plus className="text-main opacity-50 mb-1" size={24} />
                      <span className="text-xs font-bold text-main opacity-50">จัดการบริษัท</span>
                    </button>
                  </div>
                  {!((settings.jobs || []).some(j => j.name === formData.title)) && (
                    <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full mt-3 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} placeholder="ระบุชื่อบริษัท..." />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.hourlyRate}</label>
                  <div className="flex gap-2">
                    <input type="number" step="any" value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: e.target.value})} required min="0" className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                    <select 
                      value={formData.rateType} 
                      onChange={e => setFormData({...formData, rateType: e.target.value})}
                      className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main font-bold"
                      style={{ backgroundColor: 'var(--glass-bg-input)' }}
                    >
                      <option value="hourly">{t.perHour}</option>
                      <option value="daily">{t.perDay}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-main mb-1.5 opacity-80">หมายเหตุ (เช่น ทำกะแทนใคร)</label>
                <input type="text" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} placeholder="ตัวอย่าง: ทำแทนคุณ A" />
              </div>

              {(() => {
                const startDt = new Date(`${formData.startDate}T${formData.startTime}:00`);
                let endDt = new Date(`${formData.startDate}T${formData.endTime}:00`);
                if (formData.endTime < formData.startTime) endDt.setDate(endDt.getDate() + 1);
                const grossHrs = (endDt - startDt) / (1000 * 60 * 60);
                const canTakeBreak = true;
                const breakHrs = canTakeBreak ? (Number(formData.breakHours) || 0) : 0;
                const netHrs = Math.max(0, grossHrs - breakHrs);
                const estPay = formData.rateType === 'daily' ? (Number(formData.hourlyRate) || 0) : (netHrs * (Number(formData.hourlyRate) || 0));
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-sm font-medium text-main opacity-80">เวลาพักเบรก</label>
                      {grossHrs > 0 && (
                        grossHrs > 0
                          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">✓ ทำงาน {grossHrs.toFixed(1)} ชม.</span>
                          : null
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        type="number"
                        value={formData.breakHours}
                        onChange={e => setFormData({...formData, breakHours: e.target.value})}
                        min="0"
                        step="0.5"
                        disabled={!canTakeBreak}
                        className={`w-28 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-main font-bold transition-opacity ${!canTakeBreak ? 'opacity-30 cursor-not-allowed' : ''}`}
                        style={{ backgroundColor: 'var(--glass-bg-input)' }}
                        placeholder="0"
                      />
                      <span className={`text-sm font-bold transition-opacity ${!canTakeBreak ? 'opacity-30' : 'text-main/50'}`}>ชั่วโมง</span>
                      {canTakeBreak && grossHrs > 0 && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">
                            ทำงาน {netHrs % 1 === 0 ? netHrs : netHrs.toFixed(1)} ชม.
                          </span>
                          <span className="text-green-500/40 text-xs">·</span>
                          <span className="text-sm font-black text-green-600 dark:text-green-400">
                            ≈ ฿{estPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.fromDate}</label>
                    <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required className="w-full px-2 sm:px-4 py-3 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main min-w-0" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.startTime}</label>
                    <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} required className="w-full px-2 sm:px-4 py-3 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main min-w-0" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.toDate}</label>
                    <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required className="w-full px-2 sm:px-4 py-3 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main min-w-0" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.endTime}</label>
                    <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required className="w-full px-2 sm:px-4 py-3 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main min-w-0" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={isMutating || isTasksLoading} className="w-full py-4 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-colors shadow-lg active:scale-[0.98]">
                  {t.createShifts}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'history' && historyTasks.length > 0 && (
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-lg font-bold text-main">{t.historyTitle}</h3>
        </div>
      )}

      <div className="space-y-4 relative min-h-[200px]">
        {isTasksLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-3xl">
             <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {activeTasks.length === 0 && !isTasksLoading && (
          <div className="text-center py-16 liquid-glass-card rounded-[24px]">
             {activeTab === 'upcoming' ? <CalendarDays className="w-16 h-16 text-main opacity-20 mx-auto mb-4" /> : <History className="w-16 h-16 text-main opacity-20 mx-auto mb-4" />}
             <p className="text-main opacity-60 font-medium text-lg">
               {activeTab === 'upcoming' ? t.noUpcoming : t.noHistory}
             </p>
          </div>
        )}

        {groupedTasks.map(([groupName, groupData]) => (
          <div key={groupName} className="mb-6">
            <h4 className="font-bold text-main text-lg mb-3 flex items-center gap-2 opacity-90 pl-1">
              {groupData.job ? groupData.job.emoji : '🏢'} {groupName}
            </h4>
            <div className="space-y-4">
            {groupData.tasks.map(task => {
              const isCompleted = task.status === TASK_STATUS.DONE || (task.actualStart && task.actualEnd);
              const jobColor = groupData.job ? groupData.job.color : 'primary';
              
              if (task.isExpense) {
                let expenseAmount = 0;
                if (task.isPercentage) {
                  const d = new Date(task.start);
                  const monthKey = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null;
                  const monthEarned = monthKey ? (monthlyGross.earned[monthKey] || 0) : 0;
                  const monthPending = monthKey ? (monthlyGross.pending[monthKey] || 0) : 0;
                  expenseAmount = (monthEarned + monthPending) * (Number(task.amount) / 100);
                } else {
                  expenseAmount = Number(task.amount) || 0;
                }
                
                return (
                  <motion.div 
                    key={task.id} 
                    onPointerDown={() => handlePointerDown(task)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onClick={() => {
                       if (!timerRef.current) return; 
                       handleEditExpenseClick(task);
                    }}
                    animate={{ scale: pressingId === task.id ? 0.98 : 1 }}
                    className="liquid-glass-card p-5 flex flex-col md:flex-row gap-5 items-start md:items-center relative group hover:border-red-500/30 transition-colors border-l-4 border-l-red-500 cursor-pointer touch-none"
                  >
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmTask(task); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-main text-lg m-0">{task.title}</h3>
                        <span className="px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-lg font-bold border border-red-500/20">
                          {t.expenses}
                        </span>
                      </div>
                      <div className="text-sm text-main opacity-80 space-y-1.5 bg-white/30 dark:bg-black/20 p-3 rounded-xl border border-white/40 dark:border-white/5 w-fit">
                        <p className="flex items-center gap-2"><span className="w-4">📅</span> {task.isPercentage ? `ประจำเดือน ${fMonth(task.start)}` : fDate(task.start)}</p>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                      <div className="text-right flex-1 md:flex-none p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                        <p className="text-sm text-red-600 dark:text-red-400 font-bold mb-1 flex items-center justify-end gap-1">
                          {task.isPercentage ? `${task.amount}% (${t.expenses})` : t.expenses}
                        </p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">-฿{expenseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              let earnings = 0;
              let hours = 0;
              if (task.actualStart && task.actualEnd) {
                 hours = (new Date(task.actualEnd) - new Date(task.actualStart)) / (1000 * 60 * 60);
              } else if (isCompleted) {
                 hours = (new Date(task.end) - new Date(task.start)) / (1000 * 60 * 60);
              } else {
                 hours = (new Date(task.end) - new Date(task.start)) / (1000 * 60 * 60);
              }
              
              hours = Math.max(0, hours - (Number(task.breakHours) || 0));
              
              if (task.rateType === RATE_TYPE.DAILY) {
                 earnings = Number(task.hourlyRate) || 0;
              } else {
                 earnings = hours * (Number(task.hourlyRate) || 0);
              }

              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const taskDate = new Date(task.start);
              taskDate.setHours(0, 0, 0, 0);
              const isFutureTask = taskDate > today;
              
              const c = JOB_COLORS[jobColor] || JOB_COLORS.primary;

              return (
                <motion.div 
                  key={task.id} 
                  onPointerDown={() => handlePointerDown(task)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onClick={(e) => {
                    if (e.target.closest('button')) return;
                    if (timerRef.current) {
                      setActionTask(task);
                    }
                  }}
                  animate={{ scale: pressingId === task.id ? 0.98 : 1 }}
                  className={`liquid-glass-card p-5 flex flex-col md:flex-row gap-5 items-start md:items-center relative group transition-colors border-l-4 cursor-pointer touch-none ${c.borderL} ${isCompleted ? 'opacity-70' : ''}`}
                >
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsModalOpen(true); }} className={`p-2 ${c.button} rounded-full transition-all`}>
                      <Edit size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmTask(task); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-main text-lg m-0">{task.title}</h3>
                      <span className={`px-2 py-1 ${c.bg} ${c.text} text-xs rounded-lg font-bold border ${c.border}`}>
                        ฿{task.hourlyRate}{task.rateType === RATE_TYPE.DAILY ? '/วัน' : '/ชม.'}
                      </span>
                    </div>
                    <div className="text-sm text-main opacity-80 space-y-1.5 bg-white/30 dark:bg-black/20 p-3 rounded-xl border border-white/40 dark:border-white/5 w-fit">
                      <p className="flex items-center gap-2"><span className="w-4">📅</span> {fDate(task.start)}</p>
                      <p className="flex items-center gap-2"><span className="w-4">⏱️</span> ตาราง: {fTime(task.start)} - {fTime(task.end)}</p>
                      {task.description && (
                        <p className={`flex items-start gap-2 ${c.text} font-medium mt-1`}>
                          <span className="w-4 mt-0.5">📝</span>
                          <span className="flex-1">หมายเหตุ: {task.description}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                    {isCompleted ? (
                      <div className="text-right flex-1 md:flex-none p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                        <div className="flex justify-between items-center mb-1 gap-4">
                          <span className="text-xs font-bold bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-md">
                            {hours} ชม.
                          </span>
                          <p className="text-sm text-green-600 dark:text-green-400 font-bold flex items-center justify-end gap-1"><CheckCircle2 size={16}/> {t.completed}</p>
                        </div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">+฿{earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="text-right text-amber-500 mb-1 flex-1 md:flex-none p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                           <div className="flex justify-between items-center mb-0.5 gap-4">
                             <span className="text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md">
                               {hours} ชม.
                             </span>
                             <p className="text-xs font-bold">{t.expected}</p>
                           </div>
                           <p className="text-lg font-bold">+฿{earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); !isFutureTask && handleMarkDone(task); }} 
                            disabled={isFutureTask}
                            className={`flex-1 md:w-36 flex items-center justify-center gap-2 py-2 text-white font-bold rounded-xl transition-all ${isFutureTask ? 'bg-slate-400 cursor-not-allowed opacity-50 dark:opacity-30' : 'bg-green-500 hover:bg-green-600 active:scale-95'}`}
                          >
                            {isFutureTask ? <Clock size={16} /> : <CheckCircle2 size={16} />} 
                            {isFutureTask ? t.notReached : t.markDone}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
            </div>
          </div>
        ))}

        <ActionSheet 
          isOpen={!!actionTask}
          onClose={() => setActionTask(null)}
          options={[
            {
              label: 'แก้ไข',
              icon: <Edit size={20} />,
              onClick: () => { setEditingTask(actionTask); setIsModalOpen(true); }
            },
            {
              label: 'ลบกะนี้',
              icon: <Trash2 size={20} />,
              isDanger: true,
              onClick: () => setDeleteConfirmTask(actionTask)
            }
          ]}
        />

        <ConfirmDialog 
          isOpen={!!deleteConfirmTask}
          title="ยืนยันการลบ"
          message={`ลบกะ '${deleteConfirmTask?.title}' ใช่ไหม?\nการกระทำนี้ไม่สามารถย้อนกลับได้`}
          confirmText="ลบ"
          isDanger={true}
          onConfirm={() => { confirmDelete(deleteConfirmTask); setDeleteConfirmTask(null); }}
          onCancel={() => setDeleteConfirmTask(null)}
        />
      </div>

            {/* Widget Selector Bottom Sheet */}
      <AnimatePresence>
        {showWidgetSelector && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setShowWidgetSelector(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 liquid-glass-card rounded-b-none border-x-0 border-b-0 shadow-2xl p-6 max-h-[80vh] overflow-y-auto max-w-4xl mx-auto"
            >
              <div className="w-12 h-1.5 bg-black/10 dark:bg-white/20 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><LayoutGrid size={20}/> เลือก Widget ที่ต้องการแสดง</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_WIDGETS.map(w => {
                  const isEnabled = enabledWidgets.includes(w.id);
                  return (
                    <button 
                      key={w.id}
                      disabled={isEnabled}
                      onClick={() => {
                        setEnabledWidgets(prev => [...prev, w.id]);
                        setShowWidgetSelector(false);
                      }}
                      className={`p-4 rounded-xl flex items-center gap-3 text-left transition-all ${isEnabled ? 'bg-green-500/10 border-2 border-green-500 text-green-600 dark:text-green-400 opacity-60' : 'bg-white/20 border-2 border-transparent hover:border-primary-500/50 text-main'}`}
                    >
                      <div className="flex-1 font-medium">{w.label}</div>
                      {isEnabled && <CheckCircle2 size={16} />}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setShowWidgetSelector(false)} className="w-full mt-6 py-4 bg-black/5 dark:bg-white/10 rounded-xl font-bold">ปิด</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Income Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowGoalModal(false)} />
             <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="liquid-glass-card p-6 w-full max-w-md relative z-10 border-2 border-primary-500/30">
               <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary-500"><Target size={24}/> ตั้งเป้าหมายรายได้</h3>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium opacity-80 mb-1">เป้าหมายรายได้ (บาท/เดือน)</label>
                   <input 
                     type="number" 
                     value={tempGoal.goalAmount} 
                     onChange={e => setTempGoal({...tempGoal, goalAmount: Number(e.target.value)})}
                     className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-black/5 dark:bg-white/10 font-bold text-xl text-main"
                   />
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {[3000, 5000, 10000, 15000].map(amt => (
                     <button key={amt} onClick={() => setTempGoal({...tempGoal, goalAmount: amt})} className="px-3 py-1.5 bg-primary-500/10 text-primary-500 rounded-full text-sm font-medium hover:bg-primary-500/20 transition-colors">
                       ฿{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </button>
                   ))}
                 </div>
                 <label className="flex items-center gap-2 mt-4 cursor-pointer">
                   <input type="checkbox" checked={tempGoal.isRecurring} onChange={e => setTempGoal({...tempGoal, isRecurring: e.target.checked})} className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500" />
                   <span className="text-sm font-medium">ใช้เป้าหมายนี้ทุกเดือน</span>
                 </label>
                 
                 <div className="flex gap-3 mt-6">
                   <button onClick={() => setShowGoalModal(false)} className="flex-1 py-3 bg-black/5 dark:bg-white/10 rounded-xl font-bold">ยกเลิก</button>
                   <button 
                     onClick={() => {
                       setIncomeGoal(tempGoal);
                       setShowGoalModal(false);
                     }} 
                     className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30"
                   >
                     บันทึก
                   </button>
                 </div>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleEditSave}
        onDelete={handleDelete}
        task={editingTask}
        lang={lang}
      />
    </motion.div>
  );
}
