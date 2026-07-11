import { useState, useMemo, useRef, useEffect } from 'react';

import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { CheckCircle2, Check, Plus, Trash2, CalendarDays, History, Edit, Target, X, Settings, List, LayoutGrid, BarChart2, GripHorizontal, Flame, ChevronDown, Banknote, Receipt, Calculator } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

import TaskModal from '../components/tasks/TaskModal';
import ActionSheet from '../components/common/ActionSheet';
import ConfirmDialog from '../components/common/ConfirmDialog';
import CalculatorWidget from '../components/common/CalculatorWidget';
import IncomeSummaryTab from '../components/income/IncomeSummaryTab';
import ShiftSuccessModal from '../components/income/ShiftSuccessModal';
import ExtraSuccessModal from '../components/income/ExtraSuccessModal';
import { useTasks } from '../contexts/TasksContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { saveTask } from '../services/taskService';
import { calcSSO } from '../utils/socialSecurity';
import { TASK_STATUS, TASK_PRIORITY, RATE_TYPE, DEFAULT_TASK_VALUES } from '../constants';
import { translations } from '../i18n';
import { useSwipeToClose } from '../hooks/useSwipeToClose';

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
  const weekStartsOn = settings?.weekStart === 'จันทร์' || settings?.weekStart === 'Monday' ? 1 : 0;
  const ui = lang === 'en'
    ? {
        shifts: 'Shifts', summary: 'Income summary', editWidgets: 'Edit widgets', done: 'Done', addWidget: 'Add widget',
        select: 'Select', cancelSelect: 'Cancel selection', list: 'List', calendar: 'Calendar',
        extraIncome: 'Extra income', editExtraIncome: 'Edit extra income', addExtraIncome: 'Add extra income',
        manageJobs: 'Manage workplaces', selectWorkDate: 'Select workdays', selectWorkDateHelp: 'If no days are selected, a shift is added for every day in the date range.',
        noDateData: 'No shifts on', chooseWidgets: 'Choose widgets', cancel: 'Cancel', save: 'Save',
        editSelected: 'Edit selected shifts', bulkHelp: 'Choose the fields to change for the selected shifts (leave blank to keep unchanged)',
        addOther: 'Add other item', noMonthData: 'No data for this month'
      }
    : {
        shifts: 'กะงาน', summary: 'สรุปรายได้', editWidgets: 'แก้ไข Widget', done: 'เสร็จสิ้น', addWidget: 'เพิ่ม Widget',
        select: 'เลือก', cancelSelect: 'ยกเลิกเลือก', list: 'ลิสต์', calendar: 'ปฏิทิน',
        extraIncome: 'รายได้พิเศษ', editExtraIncome: 'แก้ไขรายได้พิเศษ', addExtraIncome: 'เพิ่มรายได้พิเศษ',
        manageJobs: 'จัดการบริษัท', selectWorkDate: 'เลือกวันที่ทำงาน', selectWorkDateHelp: 'ถ้าไม่เลือกวัน ระบบจะเพิ่มกะให้ทุกวันในช่วงวันที่ที่เลือก',
        noDateData: 'ไม่มีกะงานในวันที่', chooseWidgets: 'เลือก Widget ที่ต้องการแสดง', cancel: 'ยกเลิก', save: 'บันทึก',
        editSelected: 'แก้ไขกะที่เลือก', bulkHelp: 'เลือกข้อมูลที่ต้องการเปลี่ยนสำหรับกะที่เลือก (ปล่อยว่างไว้ถ้าไม่ต้องการเปลี่ยน)',
        addOther: 'เพิ่มรายการอื่น', noMonthData: 'ไม่มีข้อมูลเดือนนี้'
      };
  
  const tasks = useMemo(() => {
    const partTimeTasks = allTasks.filter(t => t.isPartTime);
    partTimeTasks.sort((a, b) => new Date(b.start) - new Date(a.start));
    return partTimeTasks;
  }, [allTasks]);

  const [isMutating, setIsMutating] = useState(false);
  const [mainTab, setMainTab] = useState('shifts'); // 'shifts' | 'summary'
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'history'
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  
  const { showToast } = useToast();
  const [actionTask, setActionTask] = useState(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const timerRef = useRef(null);
  const [pressingId, setPressingId] = useState(null);

  // Bulk Edit States
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [showBulkEditForm, setShowBulkEditForm] = useState(false);
  const [bulkEditFormData, setBulkEditFormData] = useState({
    jobName: '',
    startTime: '',
    endTime: '',
    breakHours: ''
  });
  const previousShiftsState = useRef(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddExtraForm, setShowAddExtraForm] = useState(false);
  const [showExtraActionSheet, setShowExtraActionSheet] = useState(false);
  const [extraFormType, setExtraFormType] = useState('expense'); // 'income' | 'expense'
  const [formData, setFormData] = useState({
    title: '',
    note: '',
    hourlyRate: DEFAULT_TASK_VALUES.HOURLY_RATE,
    rateType: RATE_TYPE.HOURLY,
    isHolidayPay: false,
    breakHours: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    startTime: DEFAULT_TASK_VALUES.START_TIME,
    endTime: DEFAULT_TASK_VALUES.END_TIME,
    selectedDays: []
  });
  const [successShiftData, setSuccessShiftData] = useState(null);
  const [successExtraData, setSuccessExtraData] = useState(null);
  
  const [enabledWidgets, setEnabledWidgets] = useState(() => {
    const saved = localStorage.getItem('income_dashboard');
    return saved ? JSON.parse(saved) : ['total_sso_net', 'expense_list', 'goal', 'earned', 'expected', 'work_streak'];
  });
  const [isEditWidgetMode, setIsEditWidgetMode] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [selectedDate, setSelectedDate] = useState(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState(new Set()); // week keys that are collapsed
  
  const [incomeGoal, setIncomeGoal] = useState(() => {
    const saved = localStorage.getItem('income_goal');
    return saved ? JSON.parse(saved) : { goalAmount: 5000, goalMonth: new Date().toISOString().slice(0, 7), isRecurring: true };
  });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState({ goalAmount: 5000, goalMonth: new Date().toISOString().slice(0, 7), isRecurring: true });
  const extraFormSheet = useSwipeToClose(() => setShowAddExtraForm(false), { dragFromSheet: true });
  const widgetSelectorSheet = useSwipeToClose(() => setShowWidgetSelector(false));
  const goalSheet = useSwipeToClose(() => setShowGoalModal(false));

  useEffect(() => {
    localStorage.setItem('income_dashboard', JSON.stringify(enabledWidgets));
  }, [enabledWidgets]);

  useEffect(() => {
    localStorage.setItem('income_goal', JSON.stringify(incomeGoal));
  }, [incomeGoal]);

  const [extraFormData, setExtraFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    month: new Date().toISOString().slice(0, 7),
    incomeCategory: 'tip',
    isPercentage: false,
  });

  const getInitialExtraFormData = () => ({
    title: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    month: new Date().toISOString().slice(0, 7),
    incomeCategory: 'tip',
    isPercentage: false,
  });

  const incomeCategories = [
    { id: 'tip', label: 'ทิป' },
    { id: 'commission', label: 'ค่าคอมมิชชั่น' },
    { id: 'bonus', label: 'โบนัส' },
    { id: 'freelance', label: 'ฟรีแลนซ์' },
    { id: 'other', label: 'อื่น ๆ' },
  ];

  const getIncomeCategoryLabel = (categoryId) => (
    incomeCategories.find(category => category.id === categoryId)?.label || 'อื่น ๆ'
  );

  const daysOfWeek = [
    { id: 1, label: 'จ.' },
    { id: 2, label: 'อ.' },
    { id: 3, label: 'พ.' },
    { id: 4, label: 'พฤ.' },
    { id: 5, label: 'ศ.' },
    { id: 6, label: 'ส.' },
    { id: 0, label: 'อา.' },
  ];



  const handleBulkEditSave = async () => {
    if (selectedShifts.length === 0) return;
    
    const oldShifts = tasks.filter(t => selectedShifts.includes(t.id));
    previousShiftsState.current = oldShifts;

    const updates = [];
    for (const task of oldShifts) {
      let newTask = { ...task };
      if (bulkEditFormData.jobName) {
        const job = settings.jobs?.find(j => j.name === bulkEditFormData.jobName);
        if (job) {
          newTask.title = job.name;
          newTask.hourlyRate = job.rate || newTask.hourlyRate;
          newTask.rateType = job.rateType || newTask.rateType;
          newTask.deductSSO = job.deductSSO;
        }
      }
      if (bulkEditFormData.startTime) {
        newTask.startTime = bulkEditFormData.startTime;
        const d = new Date(newTask.start);
        const [h, m] = bulkEditFormData.startTime.split(':');
        d.setHours(h, m, 0, 0);
        newTask.start = d.toISOString();
      }
      if (bulkEditFormData.endTime) {
        newTask.endTime = bulkEditFormData.endTime;
        const d = new Date(newTask.end);
        const [h, m] = bulkEditFormData.endTime.split(':');
        d.setHours(h, m, 0, 0);
        newTask.end = d.toISOString();
      }
      if (bulkEditFormData.breakHours !== '') {
        newTask.breakHours = bulkEditFormData.breakHours;
      }
      
      updates.push(newTask);
    }
    
    try {
      let allSucceeded = true;
      for (const t of updates) {
        const result = await saveTask('EDIT', t, user?.uid);
        if (!result) allSucceeded = false;
      }
      if (!allSucceeded) {
        showToast(lang === 'en' ? 'Some shifts could not be updated.' : 'อัปเดตกะงานบางรายการไม่สำเร็จ', { isError: true });
        return;
      }
      setShowBulkEditForm(false);
      setIsBulkEditMode(false);
      setSelectedShifts([]);
      
      showToast(`อัปเดตกะงาน ${updates.length} รายการแล้ว`, {
        duration: 5000,
        onUndo: async () => {
          for (const t of previousShiftsState.current) {
             await saveTask('EDIT', t, user?.uid);
          }
          showToast('ยกเลิกการเปลี่ยนแปลงแล้ว');
        }
      });
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการอัปเดตกะงาน');
    }
  };

  const calendarDays = useMemo(() => {
    if (viewMode !== 'calendar') return [];
    try {
      const targetDate = parseISO(`${selectedMonth}-01T00:00:00`);
      const monthStart = startOfMonth(targetDate);
      const monthEnd = endOfMonth(monthStart);
       const startDate = startOfWeek(monthStart, { weekStartsOn });
       const endDate = endOfWeek(monthEnd, { weekStartsOn });
      return eachDayOfInterval({ start: startDate, end: endDate });
    } catch {
      return [];
    }
  }, [selectedMonth, viewMode, weekStartsOn]);

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
    const sourceTasks = viewMode === 'calendar' ? [...upcomingTasks, ...historyTasks] : (activeTab === 'upcoming' ? upcomingTasks : historyTasks);
    
    let filteredTasks = sourceTasks;
    if (viewMode === 'calendar' && selectedDate) {
      filteredTasks = sourceTasks.filter(t => {
        try {
          return format(new Date(t.start), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
        } catch { return false; }
      });
    } else if (viewMode === 'calendar' && !selectedDate) {
      filteredTasks = [];
    }

    filteredTasks.forEach(task => {
      const job = (settings.jobs || []).find(j => j.name === task.title);
      const title = job ? job.name : (task.title || 'อื่นๆ');
      if (!groups[title]) groups[title] = { job: job, tasks: [] };
      groups[title].tasks.push(task);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [upcomingTasks, historyTasks, activeTab, selectedDate, viewMode, settings.jobs]);

  // Weekly grouping for list view
  const weeklyGroupedTasks = useMemo(() => {
    const sourceTasks = activeTab === 'upcoming' ? upcomingTasks : historyTasks;
    const weekMap = {};

    sourceTasks.forEach(task => {
      try {
        const taskDate = new Date(task.start);
         const wStart = startOfWeek(taskDate, { weekStartsOn });
         const wEnd = endOfWeek(taskDate, { weekStartsOn });
        const weekKey = format(wStart, 'yyyy-MM-dd');

        if (!weekMap[weekKey]) {
          weekMap[weekKey] = {
            weekKey,
            weekStart: wStart,
            weekEnd: wEnd,
            tasks: [],
            totalEarnings: 0,
            completedCount: 0,
          };
        }

        // Calculate earnings for this task
        const isCompleted = task.status === TASK_STATUS.DONE || (task.actualStart && task.actualEnd);
        let hours = 0;
        if (task.actualStart && task.actualEnd) {
          hours = (new Date(task.actualEnd) - new Date(task.actualStart)) / 3600000;
        } else {
          hours = (new Date(task.end) - new Date(task.start)) / 3600000;
        }
        hours = Math.max(0, hours - (Number(task.breakHours) || 0));
        let earnings = task.rateType === RATE_TYPE.DAILY
          ? (Number(task.hourlyRate) || 0)
          : hours * (Number(task.hourlyRate) || 0);
        if (task.isHolidayPay) earnings *= 2;

        weekMap[weekKey].tasks.push(task);
        weekMap[weekKey].totalEarnings += task.isExpense
          ? 0
          : (task.isExtraIncome ? (Number(task.amount) || 0) : earnings);
        if (isCompleted && !task.isExpense && !task.isExtraIncome) weekMap[weekKey].completedCount++;
      } catch { /* Ignore malformed task dates. */ }
    });

    return Object.values(weekMap).sort((a, b) =>
      activeTab === 'upcoming'
        ? a.weekStart - b.weekStart
        : b.weekStart - a.weekStart
    );
  }, [upcomingTasks, historyTasks, activeTab, weekStartsOn]);

  const toggleWeek = (weekKey) => {
    setCollapsedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekKey)) next.delete(weekKey);
      else next.add(weekKey);
      return next;
    });
  };

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
      if (!breakdown[monthKey][jobTitle]) breakdown[monthKey][jobTitle] = { job, total: 0, deductsSSO };
      
      let taskEarned = 0;
      let hours;
      
      if (t.isExtraIncome) {
        taskEarned = Number(t.amount) || 0;
        earned[monthKey] = (earned[monthKey] || 0) + taskEarned;
        // We assume extra income typically doesn't deduct SSO, but if it does based on company setting, we handle it.
        if (deductsSSO) earnedSSO[monthKey] = (earnedSSO[monthKey] || 0) + taskEarned;
      } else if (isCompleted) {
        if (t.actualStart && t.actualEnd) {
          hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
        } else {
          hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
        }
        hours = Math.max(0, hours - (Number(t.breakHours) || 0));
        if (t.rateType === RATE_TYPE.DAILY) taskEarned = rate;
        else if (hours > 0) taskEarned = hours * rate;
        if (t.isHolidayPay) taskEarned *= 2;
        
        earned[monthKey] = (earned[monthKey] || 0) + taskEarned;
        if (deductsSSO) earnedSSO[monthKey] = (earnedSSO[monthKey] || 0) + taskEarned;
      } else {
        hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
        hours = Math.max(0, hours - (Number(t.breakHours) || 0));
        if (t.rateType === RATE_TYPE.DAILY) taskEarned = rate;
        else if (hours > 0) taskEarned = hours * rate;
        if (t.isHolidayPay) taskEarned *= 2;
        
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
      
      let amt;
      if (t.isPercentage) {
        const percentage = Number(t.amount) || 0;
        amt = (earned + pending) * (percentage / 100);
      } else {
        amt = Number(t.amount) || 0;
      }
      
      expenseTotal += amt;
    });

    const ssoGross = earnedSSO + pendingSSO;
    if (ssoGross > 0) {
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
  }, [tasks, monthlyGross, selectedMonth]);

  const extraStats = useMemo(() => {
    let shiftCount = 0;
    let totalHours = 0;
    
    tasks.forEach(t => {
      if (t.isExpense || t.isExtraIncome) return;
      shiftCount++;
      let hours;
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
      if (t.isPartTime && !t.isExpense && !t.isExtraIncome && isDone) {
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
        return (
          <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-purple-500 h-full">
            <p className="text-xs text-main opacity-70 font-medium mb-1">{lang === 'en' ? 'Net income' : 'รายได้สุทธิ'}</p>
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
               <div className="flex-1 flex items-center justify-center text-sm opacity-50">{lang === 'en' ? 'No data' : 'ไม่มีข้อมูล'}</div>
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
                        {b.deductsSSO && <span className="text-[9px] text-red-500 bg-red-500/10 px-1 py-0.5 rounded font-bold ml-1">หักประกันสังคม</span>}
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
                   let amt;
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
                     <div key={exp.id} onClick={() => handleEditExtraItemClick(exp)} className="flex justify-between items-center p-2 bg-main/5 rounded-lg cursor-pointer hover:bg-main/10 transition-colors">
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

  const handleAddShift = async (e) => {
    e.preventDefault();
    
    setIsMutating(true);
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const shiftsToAdd = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (formData.selectedDays && formData.selectedDays.length > 0 && !formData.selectedDays.includes(d.getDay())) {
        continue;
      }

      const dateString = d.toISOString().slice(0, 10);
      const startDateTime = new Date(`${dateString}T${formData.startTime}:00`).toISOString();
        let endDateObj = new Date(`${dateString}T${formData.endTime}:00`);
        
        if (formData.endTime < formData.startTime) {
          endDateObj.setDate(endDateObj.getDate() + 1);
        }
        
        shiftsToAdd.push({
          title: formData.title,
          description: formData.note || '',
          start: startDateTime,
          end: endDateObj.toISOString(),
          status: TASK_STATUS.TODO,
          priority: TASK_PRIORITY.MEDIUM,
          isPartTime: true,
          hourlyRate: formData.hourlyRate,
          isHolidayPay: formData.isHolidayPay,
          rateType: formData.rateType,
          breakHours: (formData.rateType === RATE_TYPE.HOURLY) ? (Number(formData.breakHours) || 0) : 0,
          actualStart: null,
          actualEnd: null
        });
    }

    if (shiftsToAdd.length === 0) {
      alert(lang === 'en' ? 'No dates matched the selected range.' : 'ไม่พบวันที่ตรงกับเงื่อนไขในช่วงเวลาที่เลือก');
      setIsMutating(false);
      return;
    }
    
    if (shiftsToAdd.length > 31) {
       if(!window.confirm(lang === 'en'
         ? `You are about to create ${shiftsToAdd.length} shifts. Continue?`
         : `คุณกำลังจะสร้างตารางกะงานทั้งหมด ${shiftsToAdd.length} วัน แน่ใจหรือไม่?`)) {
           setIsMutating(false);
           return;
       }
    }

    const successData = {
      title: formData.title,
      startDate: formData.startDate,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      hourlyRate: formData.hourlyRate,
      rateType: formData.rateType,
      isHolidayPay: formData.isHolidayPay,
      breakHours: (formData.rateType === RATE_TYPE.HOURLY) ? (Number(formData.breakHours) || 0) : 0,
      shiftCount: shiftsToAdd.length
    };

    const results = await Promise.all(shiftsToAdd.map(task => saveTask('ADD', task, user.uid)));
    if (results.some(result => !result)) {
      showToast(lang === 'en' ? 'Some shifts could not be saved.' : 'บันทึกกะงานบางรายการไม่สำเร็จ', { isError: true });
      setIsMutating(false);
      return;
    }
    setShowAddForm(false);
    setSuccessShiftData(successData);
    setIsMutating(false);
  };
  const openExtraItemForm = (type) => {
    setExtraFormType(type);
    setExtraFormData(getInitialExtraFormData());
    setShowExtraActionSheet(false);
    setShowAddForm(false);
    setShowAddExtraForm(true);
  };

  const handleAddExtraItem = async (e) => {
    e.preventDefault();
    if (isMutating) return;

    const title = extraFormData.title.trim();
    const amount = Number(extraFormData.amount);
    const month = extraFormData.month || new Date().toISOString().slice(0, 7);
    const startDate = new Date(`${month}-01T00:00:00`);

    if (!title || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(startDate.getTime())) {
      showToast(lang === 'en' ? 'Please check the item details.' : 'กรุณาตรวจสอบข้อมูลรายการ');
      return;
    }

    setIsMutating(true);
    try {
    
    const startDateTime = startDate.toISOString();
    
    const extraTask = {
      title,
      description: '',
      start: startDateTime,
      end: startDateTime,
      status: TASK_STATUS.DONE,
      priority: TASK_PRIORITY.MEDIUM,
      isPartTime: true,
      isExpense: extraFormType === 'expense',
      isExtraIncome: extraFormType === 'income',
      amount,
      incomeCategory: extraFormType === 'income' ? extraFormData.incomeCategory : '',
      isPercentage: false
    };
    
    if (extraFormData.id) {
      const result = await saveTask('EDIT', { ...extraTask, id: extraFormData.id }, user.uid);
      if (!result) throw new Error('Save failed');
      showToast(lang === 'en' ? 'Changes saved.' : 'บันทึกการแก้ไขเรียบร้อยแล้ว');
    } else {
      const result = await saveTask('ADD', extraTask, user.uid);
      if (!result) throw new Error('Save failed');
      setSuccessExtraData({
        title: extraTask.title,
        amount: extraTask.amount,
        month,
        type: extraFormType
      });
    }
    setShowAddExtraForm(false);
    setExtraFormData(getInitialExtraFormData());
    } catch (error) {
      console.error('Failed to save extra item:', error);
      showToast(lang === 'en' ? 'Could not save this item.' : 'บันทึกรายการนี้ไม่สำเร็จ');
    } finally {
      setIsMutating(false);
    }
  };


  const handleEditExtraItemClick = (item) => {
    const startD = new Date(item.start);
    setExtraFormType(item.isExtraIncome ? 'income' : 'expense');
    setExtraFormData({
      id: item.id,
      title: item.title,
      amount: item.amount,
      date: isNaN(startD.getTime()) ? new Date().toISOString().slice(0, 10) : startD.toISOString().slice(0, 10),
      month: isNaN(startD.getTime()) ? new Date().toISOString().slice(0, 7) : startD.toISOString().slice(0, 7),
      incomeCategory: item.incomeCategory || 'tip',
      isPercentage: false
    });
    setShowAddExtraForm(true);
  };

  const handleMarkDone = async (task) => {
    const updated = {
      ...task,
      start: task.start instanceof Date ? task.start.toISOString() : task.start,
      end: task.end instanceof Date ? task.end.toISOString() : task.end,
      status: TASK_STATUS.DONE
    };
    setIsMutating(true);
    const result = await saveTask('EDIT', updated, user.uid);
    if (!result) {
      showToast(lang === 'en' ? 'Could not mark this shift as done.' : 'บันทึกสถานะกะงานไม่สำเร็จ', { isError: true });
      setIsMutating(false);
      return;
    }
    showToast(lang === 'en' ? 'Shift marked as done.' : 'บันทึกกะงานว่าสำเร็จแล้ว');
    setIsMutating(false);
  };

  const confirmDelete = async (taskToDelete) => {
    setDeleteConfirmTask(null);
    setIsMutating(true);
    
    // Backup for undo
    const backupTask = { ...taskToDelete };
    
    const result = await saveTask('DELETE', { id: taskToDelete.id }, user.uid);
    setIsMutating(false);
    if (!result) {
      showToast(lang === 'en' ? 'Could not delete this shift.' : 'ลบกะงานไม่สำเร็จ', { isError: true });
      return;
    }
    
    showToast('ลบเรียบร้อยแล้ว', {
      duration: 5000,
      onUndo: async () => {
        const undoResult = await saveTask('ADD', backupTask, user.uid);
        if (!undoResult) showToast(lang === 'en' ? 'Could not undo the deletion.' : 'ยกเลิกการลบไม่สำเร็จ', { isError: true });
      }
    });
  };

  const handleEditSave = async (taskData) => {
    setIsMutating(true);
    let result;
    if (editingTask) {
      result = await saveTask('EDIT', { ...taskData, id: editingTask.id }, user.uid);
    } else {
      result = await saveTask('ADD', taskData, user.uid);
    }
    if (!result) {
      showToast(lang === 'en' ? 'Could not save this shift.' : 'บันทึกกะงานไม่สำเร็จ', { isError: true });
      setIsMutating(false);
      return;
    }
    setIsModalOpen(false);
    setEditingTask(null);
    showToast(editingTask
      ? (lang === 'en' ? 'Shift updated.' : 'อัปเดตกะงานแล้ว')
      : (lang === 'en' ? 'Shift added.' : 'เพิ่มกะงานแล้ว'));
    setIsMutating(false);
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
  const fTime = (d) => format(d, 'HH:mm');
  const activeTasks = activeTab === 'upcoming' ? upcomingTasks : historyTasks;

  if (isTasksLoading) {
    return (
      <div role="status" aria-live="polite" className="min-h-screen flex flex-col gap-3 items-center justify-center bg-gray-50 dark:bg-[#121212] text-main/60">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-medium">{lang === 'en' ? 'Loading shifts...' : 'กำลังโหลดกะงาน...'}</span>
      </div>
    );
  }

  const sortedWidgets = enabledWidgets;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="min-h-screen font-sans pb-32 md:pb-8 p-4 pt-safe md:p-8 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 px-2">
        <div className="flex items-center gap-4">

          <h1 className="text-2xl font-bold text-main flex items-center gap-2 m-0">
            <CalendarDays className="text-primary-500 shrink-0" size={28} />
            {t.title}
          </h1>
        </div>
        <button 
          onClick={() => setShowCalculator(true)}
          className="p-2 bg-primary-500/10 text-primary-500 rounded-full hover:bg-primary-500/20 transition-colors shadow-sm shrink-0"
          title={lang === 'en' ? 'Calculator' : 'เครื่องคิดเลข'}
        >
          <Calculator size={22} />
        </button>
      </div>

      {/* Main Tab Bar */}
      <div className="flex gap-1 bg-black/5 dark:bg-white/5 rounded-full p-1.5 mb-6 mx-2">
        <button
          onClick={() => setMainTab('shifts')}
          className={`flex-1 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'shifts' ? 'bg-white dark:bg-white/20 shadow-md text-primary-600 dark:text-primary-300' : 'text-main/50 hover:text-main'
          }`}
        >
          <CalendarDays size={14} /> {ui.shifts}
        </button>
        <button
          onClick={() => setMainTab('summary')}
          className={`flex-1 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'summary' ? 'bg-white dark:bg-white/20 shadow-md text-primary-600 dark:text-primary-300' : 'text-main/50 hover:text-main'
          }`}
        >
          <BarChart2 size={14} /> {ui.summary}
        </button>
      </div>

      {/* Income Summary Tab */}
      {mainTab === 'summary' && (
        <IncomeSummaryTab user={user} lang={lang} onEditExtraItem={handleEditExtraItemClick} />
      )}

      {/* Shifts Tab wrapper — hidden when on summary */}
      <div className={mainTab !== 'shifts' ? 'hidden' : ''}>

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
          {isEditWidgetMode ? ui.done : <><Settings size={14}/> {ui.editWidgets}</>}
        </button>
      </div>

      <Reorder.Group 
        axis="y"
        values={sortedWidgets}
        onReorder={setEnabledWidgets}
        className="grid grid-cols-2 auto-rows-[minmax(120px,auto)] md:auto-rows-[minmax(132px,auto)] gap-4 mb-4"
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
              className={`relative min-h-[120px] md:min-h-[132px] ${['total_sso_net', 'expense_list', 'goal', 'chart'].includes(id) ? 'col-span-2' : ''} ${isEditWidgetMode ? 'cursor-grab active:cursor-grabbing z-[55]' : ''}`}
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
             <Plus size={20} /> {ui.addWidget}
           </button>
           <p className="text-center text-xs opacity-50 mt-2">แตะ ✕ เพื่อลบ Widget ออกจากหน้าจอ</p>
         </motion.div>
      )}

      {!isEditWidgetMode && <div className="mb-8" />}



      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 px-2 gap-3">
        <div role="tablist" aria-label={lang === 'en' ? 'Shift status' : 'สถานะกะงาน'} className="grid grid-cols-2 gap-1.5 w-full md:w-auto bg-black/5 dark:bg-white/5 rounded-2xl p-1.5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upcoming'}
            aria-pressed={activeTab === 'upcoming'}
            onClick={() => setActiveTab('upcoming')}
            className={`relative min-w-0 px-3 md:px-4 py-2.5 rounded-xl transition-colors text-xs font-bold truncate ${activeTab === 'upcoming' ? 'text-primary-600 dark:text-primary-300' : 'text-main/60 hover:text-main'}`}
          >
            {activeTab === 'upcoming' && <motion.span layoutId="active-shift-tab" transition={{ type: 'spring', stiffness: 420, damping: 32 }} className="absolute inset-0 rounded-xl bg-white dark:bg-white/20 shadow-sm" />}
            <span className="relative z-10 inline-flex items-center gap-1.5"><CalendarDays size={14} />{t.upcoming}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            aria-pressed={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`relative min-w-0 px-3 md:px-4 py-2.5 rounded-xl transition-colors text-xs font-bold truncate ${activeTab === 'history' ? 'text-primary-600 dark:text-primary-300' : 'text-main/60 hover:text-main'}`}
          >
            {activeTab === 'history' && <motion.span layoutId="active-shift-tab" transition={{ type: 'spring', stiffness: 420, damping: 32 }} className="absolute inset-0 rounded-xl bg-white dark:bg-white/20 shadow-sm" />}
            <span className="relative z-10 inline-flex items-center gap-1.5"><History size={14} />{t.history}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:flex gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => { 
                if (showAddExtraForm && extraFormType === 'expense') {
                  setShowAddExtraForm(false);
                } else {
                  openExtraItemForm('expense');
                }
              }}
              className={`min-w-0 justify-center items-center gap-2 flex px-2 md:px-4 py-2.5 font-bold rounded-full transition-all shadow-md active:scale-95 text-xs md:text-sm truncate ${showAddExtraForm && extraFormType === 'expense' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/20 text-red-600 dark:text-red-400 hover:bg-red-500/10'}`}
            >
              <Plus size={16} /> {showAddExtraForm && extraFormType === 'expense' ? t.close : t.addExpense}
            </button>
            <button
              type="button"
              onClick={() => { 
                if (showAddExtraForm && extraFormType === 'income') {
                  setShowAddExtraForm(false);
                } else {
                  openExtraItemForm('income');
                }
              }}
              className={`min-w-0 justify-center items-center gap-2 flex px-2 md:px-4 py-2.5 font-bold rounded-full transition-all shadow-md active:scale-95 text-xs md:text-sm truncate ${showAddExtraForm && extraFormType === 'income' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white/20 text-green-600 dark:text-green-400 hover:bg-green-500/10'}`}
            >
              <Banknote size={16} /> {showAddExtraForm && extraFormType === 'income' ? t.close : ui.extraIncome}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(!showAddForm); setShowAddExtraForm(false); }}
              className={`min-w-0 col-span-2 md:col-span-1 justify-center items-center gap-2 flex px-2 md:px-4 py-2.5 font-bold rounded-full transition-all shadow-md active:scale-95 text-xs md:text-sm truncate ${showAddForm ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white/20 text-green-600 dark:text-green-400 hover:bg-green-500/10'}`}
            >
              <Plus size={16} /> {showAddForm ? t.close : t.addShift}
            </button>
        </div>
      </div>

      <div className="mb-5 px-2">
        <div className="flex flex-1 bg-black/5 dark:bg-white/5 rounded-[22px] p-1.5 items-center justify-between gap-2 overflow-x-auto hide-scrollbar">
          <span className="text-sm font-bold text-main px-4 opacity-70">เวรล่วงหน้า</span>
          <div className="flex gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full flex-shrink-0">
            <button
              onClick={() => { 
                setIsBulkEditMode(!isBulkEditMode);
                setSelectedShifts([]);
              }}
              className={`px-3 md:px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold whitespace-nowrap ${isBulkEditMode ? 'bg-primary-500 text-white shadow-md scale-100' : 'text-main/60 hover:text-main hover:bg-black/5 dark:hover:bg-white/5 scale-95'}`}
            >
              {isBulkEditMode ? ui.cancelSelect : ui.select}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 md:px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold whitespace-nowrap ${viewMode === 'list' ? 'bg-white dark:bg-white/20 shadow-md text-primary-600 dark:text-primary-300 scale-100' : 'text-main/60 hover:text-main hover:bg-black/5 dark:hover:bg-white/5 scale-95'}`}
            >
              <List size={14} /> ลิสต์
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 md:px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 text-xs font-bold whitespace-nowrap ${viewMode === 'calendar' ? 'bg-white dark:bg-white/20 shadow-md text-primary-600 dark:text-primary-300 scale-100' : 'text-main/60 hover:text-main hover:bg-black/5 dark:hover:bg-white/5 scale-95'}`}
            >
              <CalendarDays size={14} /> {ui.calendar}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddExtraForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setShowAddExtraForm(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              {...extraFormSheet.dragProps}
              className={`relative w-full max-w-md max-h-[88vh] overflow-y-auto overscroll-contain liquid-glass-card p-6 md:p-8 space-y-5 border border-x-0 border-b-0 sm:border-white/20 dark:sm:border-white/10 shadow-2xl z-10 rounded-t-[32px] sm:rounded-3xl ${extraFormType === 'income' ? 'bg-white/90 dark:bg-zinc-900/90 border-t-4 border-t-green-500' : 'bg-white/90 dark:bg-zinc-900/90 border-t-4 border-t-red-500'}`}
            >
              <div {...extraFormSheet.handleProps} className={`${extraFormSheet.handleProps.className} sm:hidden`} />
              <button 
                onClick={() => setShowAddExtraForm(false)} 
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main/50 hover:text-main"
                type="button"
              >
                <X size={20} />
              </button>
              
              <h3 className="font-bold text-xl text-main pr-8 flex items-center gap-2">
                {extraFormType === 'income' ? <><Banknote className="text-green-500"/> {extraFormData.id ? ui.editExtraIncome : ui.addExtraIncome}</> : <><Receipt className="text-red-500"/> {extraFormData.id ? (lang === 'en' ? 'Edit expense' : 'แก้ไขรายจ่าย') : t.addExpenseTitle}</>}
              </h3>
              
              <form onSubmit={handleAddExtraItem} className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">
                      {extraFormType === 'income' ? 'ชื่อรายการ' : t.expenseTitle}
                    </label>
                    <input type="text" value={extraFormData.title} onChange={e => setExtraFormData({...extraFormData, title: e.target.value})} required className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 ${extraFormType === 'income' ? 'focus:ring-green-500' : 'focus:ring-red-500'} text-main`} style={{ backgroundColor: 'var(--glass-bg-input)' }} placeholder={extraFormType === 'income' ? 'เช่น ทิป, ค่าคอมมิชชัน' : t.expenseTitlePlaceholder} />
                  </div>
                  {extraFormType === 'income' && (
                    <div>
                      <label className="block text-sm font-medium text-main mb-1.5 opacity-80">
                        หมวดหมู่รายได้
                      </label>
                      <select
                        value={extraFormData.incomeCategory}
                        onChange={e => setExtraFormData({...extraFormData, incomeCategory: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-main font-bold"
                        style={{ backgroundColor: 'var(--glass-bg-input)' }}
                      >
                        {incomeCategories.map(category => (
                          <option key={category.id} value={category.id}>{category.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.amount}</label>
                    <div className="relative">
                      <input type="number" step="any" value={extraFormData.amount} onChange={e => setExtraFormData({...extraFormData, amount: e.target.value})} required min="0" className={`w-full pl-4 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 ${extraFormType === 'income' ? 'focus:ring-green-500' : 'focus:ring-red-500'} text-main`} style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold opacity-50">฿</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">
                      ประจำเดือน
                    </label>
                    <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="month" value={extraFormData.month} onChange={e => setExtraFormData({...extraFormData, month: e.target.value})} required className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 ${extraFormType === 'income' ? 'focus:ring-green-500' : 'focus:ring-red-500'} text-main`} style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  {extraFormData.id && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setDeleteConfirmTask({ id: extraFormData.id, title: extraFormData.title });
                        setShowAddExtraForm(false);
                      }}
                      className="py-3 px-4 text-red-500 font-bold rounded-xl transition-colors hover:bg-red-500/10 border border-red-500/20"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button type="submit" disabled={isMutating || isTasksLoading} className={`flex-1 py-4 text-white font-bold rounded-xl transition-colors shadow-lg active:scale-[0.98] ${extraFormType === 'income' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/25' : 'bg-red-500 hover:bg-red-600 shadow-red-500/25'}`}>
                    {extraFormData.id ? ui.save : (extraFormType === 'income' ? (lang === 'en' ? 'Save extra income' : 'บันทึกรายได้พิเศษ') : t.createExpense)}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showAddForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleAddShift} className="liquid-glass-card p-6 space-y-5 border-2 border-primary-500/30 bg-primary-500/5">
              <h3 className="font-bold text-main">{lang === 'en' ? 'Add upcoming shifts (multiple days supported)' : `เพิ่ม${t.upcoming} (สามารถเพิ่มหลายวันได้)`}</h3>
              
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
                    <button type="button" onClick={() => navigate('/settings', { state: { openSheet: 'manageJobs' } })} className="flex flex-col items-center justify-center min-w-[90px] h-[90px] p-3 rounded-2xl border-2 border-dashed border-main/20 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-all snap-start shadow-sm">
                      <Plus className="text-main opacity-50 mb-1" size={24} />
                      <span className="text-xs font-bold text-main opacity-50">{ui.manageJobs}</span>
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

              <div className="flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="isHolidayPay"
                  checked={formData.isHolidayPay} 
                  onChange={e => setFormData({...formData, isHolidayPay: e.target.checked})}
                  className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="isHolidayPay" className="ml-2 text-sm font-bold text-main cursor-pointer">ทำในวันหยุด (ค่าแรง x2)</label>
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
                let estPay = formData.rateType === 'daily' ? (Number(formData.hourlyRate) || 0) : (netHrs * (Number(formData.hourlyRate) || 0));
                if (formData.isHolidayPay) estPay *= 2;
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
                      <span className={`text-sm font-bold transition-opacity ${!canTakeBreak ? 'opacity-30' : 'text-main/70'}`}>ชั่วโมง</span>
                      {canTakeBreak && grossHrs > 0 && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                          <span className="text-xs font-bold text-green-600 dark:text-green-400">
                            ทำงาน {netHrs % 1 === 0 ? netHrs : netHrs.toFixed(1)} ชม.
                          </span>
                          <span className="text-green-500/40 text-xs">·</span>
                          <span className="text-sm font-black text-green-600 dark:text-green-400">
                            ≈ ฿{estPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="mb-4">
                <label className="block text-sm font-medium text-main mb-1 opacity-80">{ui.selectWorkDate}</label>
                <p className="text-xs text-main/45 mb-2">{ui.selectWorkDateHelp}</p>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          selectedDays: prev.selectedDays?.includes(day.id)
                            ? prev.selectedDays.filter(id => id !== day.id)
                            : [...(prev.selectedDays || []), day.id]
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        formData.selectedDays?.includes(day.id)
                          ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                          : 'bg-black/5 dark:bg-white/5 text-main/70 border-transparent hover:border-main/20'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

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
          <div className="text-center py-16 px-6 liquid-glass-card rounded-[24px]">
             {activeTab === 'upcoming' ? <CalendarDays className="w-16 h-16 text-main opacity-20 mx-auto mb-4" /> : <History className="w-16 h-16 text-main opacity-20 mx-auto mb-4" />}
             <p className="text-main opacity-60 font-medium text-lg">
               {activeTab === 'upcoming' ? t.noUpcoming : t.noHistory}
             </p>
             {activeTab === 'upcoming' && (
               <>
                 <p className="text-sm text-main/60 mt-2 mb-5">
                   {lang === 'en' ? 'Add a shift to start tracking your income.' : 'เพิ่มกะงานเพื่อเริ่มติดตามรายได้ของคุณ'}
                 </p>
                 <button
                   type="button"
                   onClick={() => { setShowAddForm(true); setShowAddExtraForm(false); }}
                   className="px-5 py-2.5 rounded-full bg-primary-500 text-white font-bold hover:bg-primary-600 transition-colors active:scale-95"
                 >
                   {t.addShift}
                 </button>
               </>
             )}
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="liquid-glass-card p-4 mb-6 relative">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-main opacity-50 py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {calendarDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = format(day, 'yyyy-MM') === selectedMonth;
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                const allShifts = [...upcomingTasks, ...historyTasks];
                const dayTasks = allShifts.filter(t => {
                  try { return format(new Date(t.start), 'yyyy-MM-dd') === dayStr && !t.isExpense; } catch { return false; }
                });
                
                return (
                  <button
                    key={dayStr}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square rounded-xl p-1 flex flex-col items-center justify-start transition-all border overflow-hidden
                      ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}
                      ${isSelected ? 'border-primary-500 bg-primary-500/10' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'}
                      ${isToday && !isSelected ? 'border-main/20 bg-main/5' : ''}
                    `}
                  >
                    <span className={`text-xs md:text-sm font-bold mt-0.5 md:mt-1 ${isToday ? 'text-primary-500' : 'text-main'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex gap-0.5 mt-auto mb-1 flex-wrap justify-center w-full px-0.5">
                      {dayTasks.slice(0, 4).map((t, idx) => {
                        const job = (settings.jobs || []).find(j => j.name === t.title);
                        const colorMap = { blue: 'bg-blue-500', red: 'bg-red-500', green: 'bg-green-500', amber: 'bg-amber-500', purple: 'bg-purple-500', pink: 'bg-pink-500', primary: 'bg-primary-500' };
                        const dotColor = colorMap[job ? job.color : 'primary'] || colorMap.primary;
                        const isShiftDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
                        return isShiftDone ? (
                          <div key={idx} className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${dotColor} flex items-center justify-center`}>
                            <svg className="w-1 h-1 md:w-1.5 md:h-1.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                            </svg>
                          </div>
                        ) : (
                          <div key={idx} className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${dotColor} opacity-50`} />
                        );
                      })}
                      {dayTasks.length > 4 && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-main/50" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'calendar' && selectedDate && groupedTasks.length === 0 && (
          <div className="text-center py-8 text-main opacity-60 font-medium">
            {ui.noDateData} {format(selectedDate, 'd MMM', { locale: th })}
          </div>
        )}

        {/* ── Calendar view: flat cards grouped by job ── */}
        {viewMode === 'calendar' && groupedTasks.map(([groupName, groupData]) => {
          const c = JOB_COLORS[groupData.job?.color || 'primary'] || JOB_COLORS.primary;
          return (
            <div key={groupName} className="mb-4">
              <h4 className="font-bold text-main text-base mb-2 flex items-center gap-2 pl-1">
                {groupData.job?.emoji || '🏢'} {groupName}
              </h4>
              <div className="space-y-3">
                {groupData.tasks.map(task => {
                  const isCompleted = task.status === TASK_STATUS.DONE || (task.actualStart && task.actualEnd);
                  let hours = task.actualStart && task.actualEnd
                    ? (new Date(task.actualEnd) - new Date(task.actualStart)) / 3600000
                    : (new Date(task.end) - new Date(task.start)) / 3600000;
                  hours = Math.max(0, hours - (Number(task.breakHours) || 0));
                  let earnings = task.rateType === RATE_TYPE.DAILY ? (Number(task.hourlyRate)||0) : hours*(Number(task.hourlyRate)||0);
                  if (task.isHolidayPay) earnings *= 2;
                  return (
                    <motion.div key={task.id} animate={{ scale: pressingId === task.id ? 0.98 : 1 }}
                      onPointerDown={() => handlePointerDown(task)} onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp} onPointerCancel={handlePointerUp}
                      onClick={(e) => { if (e.target.closest('button')) return; if (timerRef.current) setActionTask(task); }}
                      className={`liquid-glass-card p-3.5 flex items-center gap-3 cursor-pointer touch-none border-l-4 ${c.borderL} ${isCompleted ? 'opacity-70' : ''} group`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-main truncate">{task.title}</p>
                        <p className="text-xs text-main/65">⏱ {fTime(task.start)} – {fTime(task.end)}</p>
                      </div>
                      <p className={`text-sm font-black flex-shrink-0 ${isCompleted ? 'text-green-500' : 'text-amber-500'}`}>
                        +฿{earnings.toLocaleString(undefined,{maximumFractionDigits:0})}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── List view: weekly accordion ── */}
        {viewMode === 'list' && weeklyGroupedTasks.map(weekGroup => {
          const isCollapsed = collapsedWeeks.has(weekGroup.weekKey);
          const shiftTasks = weekGroup.tasks.filter(t => !t.isExpense && !t.isExtraIncome);
          const extraTasks = weekGroup.tasks.filter(t => t.isExpense || t.isExtraIncome);
          const today = new Date();
          const isCurrentWeek = weekGroup.weekStart <= today && today <= weekGroup.weekEnd;
          const weekLabel = `${format(weekGroup.weekStart, 'd', { locale: th })}–${format(weekGroup.weekEnd, 'd MMM', { locale: th })}`;

          return (
            <div key={weekGroup.weekKey} className="mb-2">
              {/* Week Header */}
              <button
                onClick={() => toggleWeek(weekGroup.weekKey)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left mb-1.5
                  ${isCurrentWeek
                    ? 'bg-primary-500/10 border border-primary-500/25'
                    : 'bg-black/5 dark:bg-white/5 border border-transparent hover:border-main/10'}`}
              >
                <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
                  <ChevronDown size={16} className={isCurrentWeek ? 'text-primary-500' : 'text-main/40'} />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isCurrentWeek ? 'text-primary-500' : 'text-main'}`}>
                      สัปดาห์ {weekLabel}
                    </span>
                    {isCurrentWeek && (
                      <span className="text-[9px] font-bold bg-primary-500 text-white px-1.5 py-0.5 rounded-full">สัปดาห์นี้</span>
                    )}
                  </div>
                  {shiftTasks.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${(weekGroup.completedCount / shiftTasks.length) * 100}%` }}
                        />
                      </div>
                        <span className="text-[10px] text-main/60 font-medium">{weekGroup.completedCount}/{shiftTasks.length}</span>
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-black ${activeTab === 'upcoming' ? 'text-amber-500' : 'text-green-500'}`}>
                    ฿{weekGroup.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-main/60">{weekGroup.tasks.length} รายการ</p>
                </div>
              </button>

              {/* Collapsible content */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pb-1 pl-1">
                      {/* Shift tasks */}
                      {shiftTasks.map(task => {
                        const isCompleted = task.status === TASK_STATUS.DONE || (task.actualStart && task.actualEnd);
                        const job = (settings.jobs || []).find(j => j.name === task.title);
                        const c = JOB_COLORS[job?.color || 'primary'] || JOB_COLORS.primary;
                        let hours = task.actualStart && task.actualEnd
                          ? (new Date(task.actualEnd) - new Date(task.actualStart)) / 3600000
                          : (new Date(task.end) - new Date(task.start)) / 3600000;
                        hours = Math.max(0, hours - (Number(task.breakHours) || 0));
                        let earnings = task.rateType === RATE_TYPE.DAILY ? (Number(task.hourlyRate)||0) : hours*(Number(task.hourlyRate)||0);
                        if (task.isHolidayPay) earnings *= 2;
                        const todayD = new Date(); todayD.setHours(0,0,0,0);
                        const taskDateD = new Date(task.start); taskDateD.setHours(0,0,0,0);
                        const isFutureTask = taskDateD > todayD;

                        return (
                          <motion.div
                            key={task.id}
                            onPointerDown={() => handlePointerDown(task)}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            onClick={(e) => {
                              if (e.target.closest('button')) return;
                              if (isBulkEditMode) {
                                setSelectedShifts(prev =>
                                  prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]
                                );
                                return;
                              }
                              if (timerRef.current) setActionTask(task);
                            }}
                            animate={{ scale: pressingId === task.id ? 0.98 : 1 }}
                            className={`liquid-glass-card relative group cursor-pointer touch-none border-l-4 ${c.borderL} ${isCompleted ? 'opacity-75' : ''}`}
                          >
                            {isBulkEditMode && (
                              <div className="absolute top-1/2 -translate-y-1/2 left-3 z-10">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedShifts.includes(task.id) ? 'bg-primary-500 border-primary-500' : 'border-main/30'}`}>
                                  {selectedShifts.includes(task.id) && <Check size={11} className="text-white" />}
                                </div>
                              </div>
                            )}

                            <div className={`flex items-center gap-3 p-3 ${isBulkEditMode ? 'pl-10' : ''}`}>
                              {/* Date column */}
                              <div className="flex-shrink-0 text-center w-10">
                                <p className="text-[10px] font-bold text-main/40 uppercase">{format(new Date(task.start), 'EEE', { locale: th })}</p>
                                <p className="text-xl font-black text-main leading-tight">{format(new Date(task.start), 'd')}</p>
                              </div>

                              <div className={`w-px h-10 rounded-full mx-0.5 ${isCompleted ? 'bg-green-500/30' : 'bg-amber-400/30'}`} />

                              {/* Job + time + hours + note */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-main text-sm truncate">
                                    {job?.emoji || ''} {task.title}
                                  </p>
                                  {/* Hours pill */}
                                  <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                    ${isCompleted
                                      ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                                    {hours % 1 === 0 ? hours : hours.toFixed(1)} ชม.
                                  </span>
                                </div>
                                <p className="text-xs text-main/50 mt-0.5">
                                  {fTime(task.start)} – {fTime(task.end)}{task.breakHours > 0 ? ` · พัก ${task.breakHours}ชม.` : ''}
                                </p>
                                {task.description && (
                                  <p className="text-xs text-main/40 mt-0.5 truncate">
                                    📝 {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Earnings + action */}
                              <div className="flex-shrink-0 text-right">
                                <p className={`text-sm font-black ${isCompleted ? 'text-green-500' : 'text-amber-500'}`}>
                                  +฿{earnings.toLocaleString(undefined,{maximumFractionDigits:0})}
                                </p>
                                {isCompleted ? (
                                  <p className="text-[10px] text-green-500/70">{hours.toFixed(1)} ชม.</p>
                                ) : !isFutureTask ? (
                                  <button
                                    onClick={async (e) => { e.stopPropagation(); await handleMarkDone(task); }}
                                    className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full hover:bg-green-600 active:scale-95 transition-all mt-0.5"
                                  >
                                    ✓ เสร็จ
                                  </button>
                                ) : (
                                  <p className="text-[10px] text-main/30">ยังไม่ถึงวัน</p>
                                )}
                              </div>

                              {/* Hover actions */}
                              {!isBulkEditMode && (
                                <div className="touch-visible-actions flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsModalOpen(true); }}
                                    className={`p-1.5 ${c.button} bg-black/5 dark:bg-white/10 md:bg-transparent rounded-full`}
                                    aria-label={lang === 'en' ? 'Edit shift' : 'แก้ไขกะ'}
                                  ><Edit size={12} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmTask(task); }}
                                    className="p-1.5 text-red-500 bg-red-500/10 md:bg-transparent hover:bg-red-500/10 rounded-full"
                                    aria-label={lang === 'en' ? 'Delete shift' : 'ลบกะ'}
                                  ><Trash2 size={12} /></button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Extra income / expense rows */}
                      {extraTasks.map(task => {
                        let expenseAmount;
                        if (task.isPercentage && task.isExpense) {
                          const d = new Date(task.start);
                          const mk = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : null;
                          expenseAmount = mk ? ((monthlyGross.earned[mk]||0)+(monthlyGross.pending[mk]||0))*(Number(task.amount)/100) : 0;
                        } else { expenseAmount = Number(task.amount)||0; }
                        return (
                          <motion.div key={task.id}
                            onClick={() => handleEditExtraItemClick(task)}
                            className={`liquid-glass-card p-3 flex items-center gap-3 cursor-pointer border-l-4 group
                              ${task.isExtraIncome ? 'border-l-green-500' : 'border-l-red-500'}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-main truncate">{task.title}</p>
                              <p className="text-[10px] text-main/60">
                                {task.isExtraIncome && `${getIncomeCategoryLabel(task.incomeCategory)} · `}
                                {task.isExtraIncome ? 'รายได้พิเศษ' : 'รายจ่าย'} · {fDate(task.start)}
                              </p>
                            </div>
                            <p className={`text-sm font-black flex-shrink-0 ${task.isExtraIncome ? 'text-green-500' : 'text-red-500'}`}>
                              {task.isExtraIncome ? '+' : '-'}฿{expenseAmount.toLocaleString(undefined,{maximumFractionDigits:0})}
                            </p>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmTask(task); }}
                              className="touch-visible-actions p-1.5 text-red-500 md:text-red-400/40 hover:text-red-500 bg-red-500/10 md:bg-transparent hover:bg-red-500/10 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all flex-shrink-0"
                              aria-label={lang === 'en' ? 'Delete item' : 'ลบรายการ'}
                            >
                              <Trash2 size={12} />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}



        <ActionSheet 
          isOpen={!!actionTask}
          onClose={() => setActionTask(null)}
          lang={lang}
          options={[
            {
              label: lang === 'en' ? 'Edit' : 'แก้ไข',
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
          lang={lang}
          title={lang === 'en' ? 'Confirm deletion' : 'ยืนยันการลบ'}
          message={lang === 'en'
            ? `Delete shift '${deleteConfirmTask?.title}'?\nThis action cannot be undone.`
            : `ลบกะ '${deleteConfirmTask?.title}' ใช่ไหม?\nการกระทำนี้ไม่สามารถย้อนกลับได้`}
          confirmText={lang === 'en' ? 'Delete' : 'ลบ'}
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
              {...widgetSelectorSheet.dragProps}
              className="fixed bottom-0 left-0 right-0 z-50 liquid-glass-card rounded-b-none border-x-0 border-b-0 shadow-2xl p-6 max-h-[86vh] overflow-y-auto overscroll-contain max-w-4xl mx-auto"
            >
              <div {...widgetSelectorSheet.handleProps} />
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><LayoutGrid size={20}/> {ui.chooseWidgets}</h3>
              
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowGoalModal(false)} />
             <motion.div
               initial={{ opacity: 0, y: '100%' }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 300 }}
               {...goalSheet.dragProps}
               className="liquid-glass-card p-6 w-full max-w-md relative z-10 border-2 border-primary-500/30 rounded-t-[32px] sm:rounded-[28px] max-h-[86vh] overflow-y-auto overscroll-contain"
             >
               <div {...goalSheet.handleProps} className={`${goalSheet.handleProps.className} sm:hidden`} />
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
                   <button onClick={() => setShowGoalModal(false)} className="flex-1 py-3 bg-black/5 dark:bg-white/10 rounded-xl font-bold">{ui.cancel}</button>
                   <button 
                     onClick={() => {
                       setIncomeGoal(tempGoal);
                       setShowGoalModal(false);
                     }} 
                     className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30"
                   >
                     {ui.save}
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

      {/* Bottom Action Bar for Bulk Edit */}
      <AnimatePresence>
        {isBulkEditMode && selectedShifts.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-0 right-0 z-[45] px-4"
          >
            <div className="max-w-md mx-auto bg-white/90 dark:bg-[#1a1a2e]/90 backdrop-blur-md border border-main/10 shadow-xl rounded-2xl p-3 md:p-4 flex gap-2 md:gap-3">
              <button
                onClick={() => {
                  setIsBulkEditMode(false);
                  setSelectedShifts([]);
                }}
                className="flex-1 py-3.5 rounded-xl text-sm md:text-base font-bold bg-black/5 dark:bg-white/10 text-main hover:bg-black/10 transition-colors"
              >
                {ui.cancel}
              </button>
              <button
                onClick={() => setShowBulkEditForm(true)}
                className="flex-[2] py-3.5 rounded-xl text-sm md:text-base font-bold bg-primary-500 text-white shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition-colors"
              >
                {ui.editSelected} ({selectedShifts.length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ActionSheet for Bulk Edit Options */}
      <ActionSheet lang={lang} isOpen={showBulkEditForm} onClose={() => setShowBulkEditForm(false)} title={lang === 'en' ? 'Bulk edit shifts' : 'แก้ไขหลายรายการ'}>
        <div className="flex flex-col gap-5 px-1 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-center text-main opacity-70 mb-2">
            {ui.bulkHelp} ({selectedShifts.length})
          </p>
          
          <div>
            <label className="block text-sm font-bold text-main mb-2 opacity-80">{lang === 'en' ? 'Choose a new workplace' : 'เลือกบริษัทใหม่'}</label>
            <select 
              value={bulkEditFormData.jobName} 
              onChange={e => setBulkEditFormData({...bulkEditFormData, jobName: e.target.value})} 
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main bg-black/5 dark:bg-white/10"
            >
              <option value="">ไม่เปลี่ยน</option>
              {(settings.jobs || []).map(j => (
                <option key={j.id} value={j.name}>{j.emoji} {j.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-main mb-2 opacity-80">เวลาเข้างานใหม่</label>
              <input 
                type="time" 
                value={bulkEditFormData.startTime} 
                onChange={e => setBulkEditFormData({...bulkEditFormData, startTime: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main bg-black/5 dark:bg-white/10"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-main mb-2 opacity-80">เวลาเลิกงานใหม่</label>
              <input 
                type="time" 
                value={bulkEditFormData.endTime} 
                onChange={e => setBulkEditFormData({...bulkEditFormData, endTime: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main bg-black/5 dark:bg-white/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-main mb-2 opacity-80">เวลาพักใหม่ (ชั่วโมง)</label>
            <input 
              type="number" 
              step="any" 
              min="0" 
              value={bulkEditFormData.breakHours} 
              onChange={e => setBulkEditFormData({...bulkEditFormData, breakHours: e.target.value})} 
              placeholder="ปล่อยว่างถ้าไม่ต้องการเปลี่ยน" 
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main bg-black/5 dark:bg-white/10"
            />
          </div>

          <button 
            onClick={handleBulkEditSave}
            className="w-full mt-4 py-4 bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition-colors"
          >
            {lang === 'en' ? 'Save changes' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </ActionSheet>

      {/* ActionSheet for Extra Item Type Selection */}
      <ActionSheet lang={lang} isOpen={showExtraActionSheet} onClose={() => setShowExtraActionSheet(false)} title={ui.addOther}>
        <div className="flex flex-col gap-3 py-2">
          <button 
            onClick={() => openExtraItemForm('income')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30">
              <Banknote size={24} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-main">รายได้พิเศษ</h4>
              <p className="text-sm opacity-60 text-main">เช่น ทิป, ค่าคอมมิชชัน, โบนัส</p>
            </div>
          </button>
          
          <button 
            onClick={() => openExtraItemForm('expense')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
              <Receipt size={24} />
            </div>
            <div className="text-left">
              <h4 className="font-bold text-main">รายจ่าย / หักเงิน</h4>
              <p className="text-sm opacity-60 text-main">เช่น ค่าชุด, ค่าปรับ, หักภาษี</p>
            </div>
          </button>
        </div>
      </ActionSheet>

      <CalculatorWidget 
        isOpen={showCalculator} 
        onClose={() => setShowCalculator(false)} 
        lang={lang} 
      />

      <ShiftSuccessModal
        isOpen={!!successShiftData}
        onClose={() => setSuccessShiftData(null)}
        data={successShiftData}
        lang={lang}
      />
      <ExtraSuccessModal
        isOpen={!!successExtraData}
        onClose={() => setSuccessExtraData(null)}
        data={successExtraData}
        lang={lang}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirmTask}
        title="ยืนยันการลบ"
        message={`คุณแน่ใจหรือไม่ว่าต้องการลบ '${deleteConfirmTask?.title || 'รายการนี้'}'?`}
        confirmText="ลบ"
        isDanger={true}
        onConfirm={() => confirmDelete(deleteConfirmTask)}
        onCancel={() => setDeleteConfirmTask(null)}
      />

      {/* End of Shifts tab wrapper */}
      </div>
    </motion.div>
  );
}
