import { useState, useEffect, useMemo } from 'react';

import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { format, isBefore, endOfDay, subMonths, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { Flame, DollarSign, Check, ArrowLeft, Maximize2, X, Trash2, Bell, Edit2, Zap, Briefcase, Settings, GripHorizontal, LayoutGrid, Plus, Calendar, CloudRain, Timer, Play, Pause, RotateCcw, Users, Sun, Cloud, CloudFog, CloudLightning, Droplets } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

import { useTasks } from '../contexts/TasksContext';
import { useSettings } from '../contexts/SettingsContext';
import { updateUserStreak } from '../services/userService';
import { saveTask } from '../services/taskService';
import { calcSSO } from '../utils/socialSecurity';
import { TASK_STATUS, TASK_PRIORITY, PRIORITY_WEIGHT, RATE_TYPE } from '../constants';
import GreetingBanner from '../components/GreetingBanner';
import { calculateStreaks } from '../utils/gamification';

const AVAILABLE_WIDGETS = [
  { id: 'ALL_TASKS', labelKey: 'allTasks', size: 1 },
  { id: 'URGENT_TASKS', labelKey: 'urgentTasks', size: 1 },
  { id: 'TODAY_INCOME', labelKey: 'todayIncome', size: 1 },
  { id: 'APP_STREAK', labelKey: 'appStreak', size: 1 },
  { id: 'WORK_STREAK', labelKey: 'workStreak', size: 1 },
  { id: 'DDAY_WIDGET', labelKey: 'ddayWidget', size: 1 },
  { id: 'WEATHER_WIDGET', labelKey: 'weatherWidget', size: 2 },
  { id: 'POMODORO_WIDGET', labelKey: 'pomodoroWidget', size: 1 },
  { id: 'INCOME_GOAL', labelKey: 'incomeGoal', size: 2 },
  { id: 'TODAY_WORK_WIDGET', labelKey: 'todayWorkWidget', size: 1 }
];

const DEFAULT_WIDGETS = ['ALL_TASKS', 'URGENT_TASKS', 'TODAY_INCOME', 'APP_STREAK'];

export default function TodayPage({ user, lang = 'th' }) {
  const t = lang === 'en' ? {
    allTasks: 'All Tasks',
    urgentTasks: 'Urgent Tasks',
    todayIncome: 'Today Income',
    appStreak: 'App Streak',
    workStreak: 'Work Streak',
    ddayWidget: 'D-Day',
    incomeGoal: 'Income Goal',
    done: 'Done',
    pending: 'Pending',
    dueTonight: 'Due tonight',
    noShiftsToday: 'No shifts today',
    fromTodayShift: 'From today\'s shift',
    days: 'days',
    bestStreak: 'Best',
    thisMonthIncome: 'This Month',
    ssoDeduction: 'SSO',
    pastDays: 'Past',
    tapToSet: 'Tap to configure',
    youHaveTasks: (n) => `${n} tasks today`,
    noTasksToday: 'No tasks today 🎉',
    urgentItems: (n) => `${n} urgent`,
    editWidget: 'Edit Widget',
    finish: 'Done',
    addWidget: 'Add Widget',
    removeWidgetHelp: 'Tap ✕ to remove widget',
    weeklyStreak: 'Weekly Streak',
    monSun: 'Mon-Sun',
    monthlyIncome: 'Monthly Income',
    bar: 'Bar',
    line: 'Line',
    incomeTitle: 'Income',
    tasksToday: 'Tasks Today',
    totalItems: (n) => `Total ${n}`,
    workShift: 'Shift',
    important: 'High',
    overdue: 'Overdue',
    upcoming7Days: 'Upcoming (7 days)',
    noUrgent7Days: 'No urgent tasks in 7 days 🎉',
    waiting: 'Pending',
    last12Months: 'Last 12 Months',
    last12MonthsSub: 'Total income from shifts over the past year',
    loadingChart: 'Loading chart...',
    selectWidget: 'Select Widget',
    slots: 'slots',
    space: 'Space',
    close: 'Close',
    configDDay: 'Configure D-Day',
    eventName: 'Event Name',
    eventNamePlaceholder: 'e.g., Final Exam',
    targetDate: 'Target Date',
    cancel: 'Cancel',
    save: 'Save',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    goodNight: 'Good night',
    deleteConfirm: 'Are you sure you want to delete this item?',
    deleteError: 'Error deleting item',
    ddayDefault: 'D-Day',
    incomeLabel: 'Income',
    weatherWidget: 'Weather',
    pomodoroWidget: 'Focus Timer',
    todayWorkWidget: 'Work Today'
  } : {
    allTasks: 'สิ่งที่ต้องทำทั้งหมด',
    urgentTasks: 'สิ่งที่ต้องทำด่วน',
    todayIncome: 'รายได้วันนี้',
    appStreak: 'App Streak',
    workStreak: 'Work Streak',
    ddayWidget: 'D-Day วันสำคัญ',
    incomeGoal: 'เป้าหมายรายได้เดือนนี้',
    done: 'เสร็จ',
    pending: 'ค้างอยู่',
    dueTonight: 'ครบกำหนดคืนนี้',
    noShiftsToday: 'ไม่มีกะวันนี้',
    fromTodayShift: 'จากกะวันนี้',
    days: 'วัน',
    bestStreak: 'สถิติสูงสุด',
    thisMonthIncome: 'รายได้เดือนนี้',
    ssoDeduction: 'หักประกันสังคม',
    pastDays: 'ผ่านมาแล้ว',
    tapToSet: 'กดเพื่อตั้งค่า',
    youHaveTasks: (n) => `วันนี้มี ${n} สิ่งที่ต้องทำ`,
    noTasksToday: 'วันนี้ไม่มีสิ่งที่ต้องทำ 🎉',
    urgentItems: (n) => `ด่วน ${n} รายการ`,
    editWidget: 'แก้ไข Widget',
    finish: 'เสร็จสิ้น',
    addWidget: 'เพิ่ม Widget',
    removeWidgetHelp: 'แตะ ✕ เพื่อลบ Widget ออกจากหน้าจอ',
    weeklyStreak: 'Streak รายสัปดาห์',
    monSun: 'จ-อา',
    monthlyIncome: 'รายได้รายเดือน',
    bar: 'บาร์',
    line: 'เส้น',
    incomeTitle: 'รายได้ (฿)',
    tasksToday: 'สิ่งที่ต้องทำวันนี้',
    totalItems: (n) => `ทั้งหมด ${n} รายการ`,
    workShift: 'กะงาน',
    important: 'สำคัญ',
    overdue: 'เลยกำหนด',
    upcoming7Days: 'สิ่งที่ต้องทำเร็วๆ นี้ (7 วัน)',
    noUrgent7Days: 'ไม่มีรายการเร่งด่วนในช่วง 7 วันนี้ 🎉',
    waiting: 'รอทำ',
    last12Months: 'รายได้ 12 เดือนล่าสุด',
    last12MonthsSub: 'ยอดรวมรายได้จากกะงานในช่วง 1 ปีที่ผ่านมา',
    loadingChart: 'กำลังโหลดกราฟ...',
    selectWidget: 'เลือก Widget ที่ต้องการแสดง',
    slots: 'ช่อง',
    space: 'พื้นที่',
    close: 'ปิด',
    configDDay: 'ตั้งค่า D-Day',
    eventName: 'ชื่อเหตุการณ์',
    eventNamePlaceholder: 'เช่น สอบปลายภาค, วันเกิด',
    targetDate: 'วันที่เป้าหมาย',
    cancel: 'ยกเลิก',
    save: 'บันทึก',
    goodMorning: 'สวัสดีตอนเช้า',
    goodAfternoon: 'สวัสดีตอนบ่าย',
    goodEvening: 'สวัสดีตอนเย็น',
    goodNight: 'สวัสดีตอนดึก',
    deleteConfirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?',
    deleteError: 'เกิดข้อผิดพลาดในการลบรายการ',
    ddayDefault: 'วันสำคัญ',
    incomeLabel: 'รายได้',
    weatherWidget: 'สภาพอากาศ',
    pomodoroWidget: 'จับเวลาสมาธิ',
    todayWorkWidget: 'กะงานวันนี้'
  };
  const { tasks, isLoading: tasksLoading } = useTasks();
  const gamificationStreaks = useMemo(() => calculateStreaks(tasks), [tasks]);
  const { settings } = useSettings();
  const [streakData, setStreakData] = useState({ currentStreak: 0, bestStreak: 0, history: [] });
  const [isLoadingStreak, setIsLoadingStreak] = useState(true);
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [showModalChart, setShowModalChart] = useState(false);
  const [isTickerActive, setIsTickerActive] = useState(false);

  const [selectedWidgets, setSelectedWidgets] = useState(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });
  const [isEditWidgetMode, setIsEditWidgetMode] = useState(false);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);

  const [ddayConfig, setDdayConfig] = useState(() => {
    const saved = localStorage.getItem('dashboard_dday');
    return saved ? JSON.parse(saved) : { title: t.ddayDefault, date: '' };
  });
  const [showDdayModal, setShowDdayModal] = useState(false);
  const [ddayInput, setDdayInput] = useState({ title: '', date: '' });

  // Weather State
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Pomodoro State
  const [pomodoroState, setPomodoroState] = useState({
    isActive: false,
    timeLeft: 25 * 60,
    isBreak: false
  });

  useEffect(() => {
    localStorage.setItem('dashboard_widgets', JSON.stringify(selectedWidgets));
  }, [selectedWidgets]);

  useEffect(() => {
    localStorage.setItem('dashboard_dday', JSON.stringify(ddayConfig));
  }, [ddayConfig]);

  useEffect(() => {
    let interval = null;
    if (pomodoroState.isActive && pomodoroState.timeLeft > 0) {
      interval = setInterval(() => {
        setPomodoroState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (pomodoroState.isActive && pomodoroState.timeLeft === 0) {
      const isBreakNow = !pomodoroState.isBreak;
      setPomodoroState(prev => ({
        isActive: false,
        isBreak: isBreakNow,
        timeLeft: isBreakNow ? 5 * 60 : 25 * 60
      }));
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(isBreakNow ? (lang === 'en' ? "Time for a 5 min break!" : "ได้เวลาพัก 5 นาทีแล้ว!") : (lang === 'en' ? "Break over! Back to work." : "หมดเวลาพัก! ได้เวลากลับไปลุยงาน"));
      } else if ("Notification" in window && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification(isBreakNow ? (lang === 'en' ? "Time for a 5 min break!" : "ได้เวลาพัก 5 นาทีแล้ว!") : (lang === 'en' ? "Break over! Back to work." : "หมดเวลาพัก! ได้เวลากลับไปลุยงาน"));
          }
        });
      }
    }
    return () => clearInterval(interval);
  }, [pomodoroState.isActive, pomodoroState.timeLeft, pomodoroState.isBreak, lang]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!selectedWidgets.includes('WEATHER_WIDGET')) return;
      
      const cachedStr = localStorage.getItem('weather_cache');
      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr);
          // Use cache if it's less than 30 mins old and has rain probability as a number
          if (Date.now() - cached.timestamp < 30 * 60 * 1000 && cached.data && typeof cached.data.rainProb === 'number') {
            setWeatherData(cached.data);
            return;
          }
        } catch (e) {}
      }
      
      setWeatherLoading(true);
      
      const getPosition = () => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported"));
          } else {
            // Reduce timeout to 3s to fail faster if location is not available
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          }
        });
      };

      let lat = 13.75;
      let lon = 100.51;
      let isLocal = false;
      let locationName = lang === 'en' ? 'Bangkok' : 'กรุงเทพมหานคร';

      try {
        const position = await getPosition();
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        isLocal = true;
      } catch (err) {
        console.log("Geolocation failed or denied, using fallback BKK.");
      }

      try {
        if (isLocal) {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=${lang === 'en' ? 'en' : 'th'}`);
          const geoData = await geoRes.json();
          if (geoData && geoData.address) {
             const addr = geoData.address;
             const district = addr.city_district || addr.district || addr.suburb || addr.town || addr.county || "";
             const province = addr.city || addr.province || addr.state || "";
             if (district && province && district !== province) {
                locationName = `${district}, ${province}`;
             } else if (province || district) {
                locationName = province || district;
             } else {
                locationName = geoData.name || (lang === 'en' ? 'Current Location' : 'ตำแหน่งปัจจุบัน');
             }
          }
        }
      } catch (e) {
        console.log("Reverse geocoding failed", e);
      }

      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=precipitation_probability_max&timezone=auto`);
        const data = await res.json();
        const rainProb = data.daily?.precipitation_probability_max?.[0] || 0;
        const finalData = { ...data.current_weather, isLocal, locationName, rainProb };
        setWeatherData(finalData);
        localStorage.setItem('weather_cache', JSON.stringify({ timestamp: Date.now(), data: finalData }));
      } catch (err) {
        console.error("Weather fetch error", err);
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, [selectedWidgets, lang]);

  const navigate = useNavigate();
  
  const [now] = useState(new Date());

  const handleDelete = async (taskId) => {
    if (window.confirm(t.deleteConfirm)) {
      try {
        await saveTask('DELETE', { id: taskId }, user?.uid);
      } catch {
        alert(t.deleteError);
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

  const [incomeGoal, setIncomeGoal] = useState(() => {
    const saved = localStorage.getItem('income_goal');
    return saved ? JSON.parse(saved) : { goalAmount: 5000, goalMonth: format(new Date(), 'yyyy-MM'), isRecurring: true };
  });

  const { todayTasks, upcomingTasks, highPriorityCount, todayIncome, todayNetIncome, todaySSODeduction, chartData, fullChartData, weeklyStreak, totalToday, doneToday, pendingToday, thisMonthIncome, thisMonthSSO, currentWorkStreak, bestWorkStreak } = useMemo(() => {
    let income = 0;
    let ssoIncome = 0;
    const tTasks = [];
    const oTasks = [];
    const upcomingList = [];
    let highPriority = 0;
    let doneT = 0;
    let pendingT = 0;
    
    // Monthly aggregation
    const monthlyIncome = {};
    const fullMonthlyIncome = {};
    const monthKeys6 = [];
    const monthKeys12 = [];
    
    const currentMonthKey = format(now, 'yyyy-MM');
    let currentMonthSSOIncome = 0;
    
    const completedWorkDates = new Set();

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
      const isDone = t.status === TASK_STATUS.DONE;
      
      if (t.isPartTime) {
        const key = format(t.start, 'yyyy-MM');
        if (monthlyIncome[key] !== undefined || fullMonthlyIncome[key] !== undefined) {
          if (t.isExpense) {
            if (isDone || (t.actualStart && t.actualEnd)) {
               const amt = -(Number(t.amount) || 0);
               if (monthlyIncome[key] !== undefined) monthlyIncome[key].income += amt;
               if (fullMonthlyIncome[key] !== undefined) fullMonthlyIncome[key].income += amt;
            }
          } else if (t.isExtraIncome) {
            if (isDone || (t.actualStart && t.actualEnd)) {
               const amt = Number(t.amount) || 0;
               if (monthlyIncome[key] !== undefined) monthlyIncome[key].income += amt;
               if (fullMonthlyIncome[key] !== undefined) fullMonthlyIncome[key].income += amt;
            }
          } else {
            let earnings = 0;
            let hours;
            if (isDone || (t.actualStart && t.actualEnd)) {
              if (t.actualStart && t.actualEnd) {
                hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
              } else {
                hours = (t.end - t.start) / (1000 * 60 * 60);
              }
              hours = Math.max(0, hours - (Number(t.breakHours) || 0));
              if (t.rateType === RATE_TYPE.DAILY) earnings = Number(t.hourlyRate) || 0;
              else if (hours > 0) earnings = hours * (Number(t.hourlyRate) || 0);
              if (t.isHolidayPay) earnings *= 2;
              
              if (monthlyIncome[key] !== undefined) monthlyIncome[key].income += earnings;
              if (fullMonthlyIncome[key] !== undefined) fullMonthlyIncome[key].income += earnings;
              
              if (key === currentMonthKey) {
                const job = (settings.jobs || []).find(j => j.name === t.title);
                const deductsSSO = (job && job.deductSSO !== undefined) ? job.deductSSO : settings.socialSecurity;
                if (deductsSSO) currentMonthSSOIncome += earnings;
              }
              
              if (!t.isExpense && !t.isExtraIncome) {
                 completedWorkDates.add(format(new Date(t.start), 'yyyy-MM-dd'));
              }
            }
          }
        }
        
        if (isSameDay(t.start, now) && (isDone || (t.actualStart && t.actualEnd))) {
            let earnings = 0;
            if (t.isExpense) {
                earnings = -(Number(t.amount) || 0);
            } else if (t.isExtraIncome) {
                earnings = Number(t.amount) || 0;
            } else {
                let hours = (t.end - t.start) / (1000 * 60 * 60);
                hours = Math.max(0, hours - (Number(t.breakHours) || 0));
                if (t.rateType === RATE_TYPE.DAILY) earnings = Number(t.hourlyRate) || 0;
                else if (hours > 0) earnings = hours * (Number(t.hourlyRate) || 0);
                if (t.isHolidayPay) earnings *= 2;
            }
            income += earnings;
            if (!t.isExpense && !t.isExtraIncome) {
              const job = (settings.jobs || []).find(j => j.name === t.title);
              const deductsSSO = (job && job.deductSSO !== undefined) ? job.deductSSO : settings.socialSecurity;
              if (deductsSSO) ssoIncome += earnings;
            }
        }
      }

      const isDueToday = isSameDay(t.end, now);
      const isOverdue = !isDone && isBefore(endOfDay(t.end), now) && !isDueToday;
      const isUpcoming = !isDone && !isOverdue && !isDueToday && isBefore(t.start, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

      if (isDueToday || isOverdue || isUpcoming) {
        if (isOverdue) oTasks.push(t);
        else if (isDueToday) tTasks.push(t);
        else if (isUpcoming) upcomingList.push(t);
        
        if (isDueToday) {
            if (isDone) doneT++;
            else pendingT++;
            
            if (!isDone && t.priority === TASK_PRIORITY.HIGH) highPriority++;
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

    const allTodayTasks = [...oTasks, ...tTasks].sort((a, b) => {
      const aOverdue = isBefore(a.end, now) && a.status !== TASK_STATUS.DONE;
      const bOverdue = isBefore(b.end, now) && b.status !== TASK_STATUS.DONE;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      if (PRIORITY_WEIGHT[b.priority] !== PRIORITY_WEIGHT[a.priority]) {
        return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      }
      return a.end.getTime() - b.end.getTime();
    });
    
    upcomingList.sort((a, b) => a.start.getTime() - b.start.getTime());

    let todayNetIncome = income;
    let todaySSODeduction = 0;
    if (ssoIncome > 0) {
      const sso = calcSSO(ssoIncome);
      todaySSODeduction = sso.deduction;
      todayNetIncome = income - todaySSODeduction;
    }
    
    const thisMonthIncomeTotal = fullMonthlyIncome[currentMonthKey]?.income || 0;
    let thisMonthSSODeduction = 0;
    if (currentMonthSSOIncome > 0) {
        thisMonthSSODeduction = calcSSO(currentMonthSSOIncome).deduction;
    }
    
    let currentWorkStreak = 0;
    let bestWorkStreak = 0;
    const sortedWorkDates = Array.from(completedWorkDates).sort((a, b) => b.localeCompare(a));
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

    return { 
      todayTasks: allTodayTasks.slice(0, 5), 
      upcomingTasks: upcomingList.slice(0, 4),
      highPriorityCount: highPriority, 
      todayIncome: Math.round(income),
      todayNetIncome,
      todaySSODeduction,
      chartData: cData,
      fullChartData: fcData,
      weeklyStreak: wStreak,
      totalToday: doneT + pendingT,
      doneToday: doneT,
      pendingToday: pendingT,
      thisMonthIncome: thisMonthIncomeTotal,
      thisMonthSSO: thisMonthSSODeduction,
      currentWorkStreak,
      bestWorkStreak
    };
  }, [tasks, streakData, now, settings.socialSecurity, settings.showInIncome]);

  const pendingTasksList = useMemo(() => {
    return todayTasks.filter(t => t.status !== TASK_STATUS.DONE);
  }, [todayTasks]);

  useEffect(() => {
    if (pendingToday > 0 && pendingTasksList.length > 0) {
      const timer1 = setTimeout(() => setIsTickerActive(true), 2000);
      const timer2 = setTimeout(() => setIsTickerActive(false), 10000); // 8s for the marquee
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [pendingToday, pendingTasksList.length]);

  useEffect(() => {
    if (isChartExpanded) {
      const timer = setTimeout(() => setShowModalChart(true), 150);
      
      return () => {
        clearTimeout(timer);
      };
    } else {
      setTimeout(() => setShowModalChart(false), 0);
    }
  }, [isChartExpanded]);

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour >= 5 && hour < 12) return t.goodMorning;
    if (hour >= 12 && hour < 17) return t.goodAfternoon;
    if (hour >= 17 && hour < 21) return t.goodEvening;
    return t.goodNight;
  };

  const getStatusColor = (status, priority) => {
    if (status === TASK_STATUS.DONE) return 'bg-green-500';
    if (priority === TASK_PRIORITY.HIGH) return 'bg-red-500';
    if (priority === TASK_PRIORITY.LOW) return 'bg-green-500';
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
  const avatarUrl = user?.uid ? (localStorage.getItem(`avatar_${user.uid}`) || '') : '';

  const renderWidget = (id) => {
    switch (id) {
      case 'ALL_TASKS':
        return (
          <div key={id} onClick={() => navigate('/tasks')} className="liquid-glass-card p-4 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all cursor-pointer group active:scale-95 col-span-1 min-h-[120px]">
            <h3 className="text-sm font-bold text-main/80 mb-2 group-hover:text-primary-500 transition-colors">{t.allTasks}</h3>
            <div className="text-3xl md:text-4xl font-black text-main mb-1 group-hover:scale-105 transition-transform origin-left">{totalToday}</div>
            <p className="text-xs font-medium text-main/60">{doneToday} {t.done} · {pendingToday} {t.pending}</p>
          </div>
        );
      case 'URGENT_TASKS':
        return (
          <div key={id} onClick={() => navigate('/tasks')} className="liquid-glass-card p-4 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all cursor-pointer group active:scale-95 col-span-1 min-h-[120px]">
            <h3 className="text-sm font-bold text-main/80 mb-2 group-hover:text-primary-500 transition-colors">{t.urgentTasks}</h3>
            <div className={`text-3xl md:text-4xl font-black mb-1 group-hover:scale-105 transition-transform origin-left ${highPriorityCount > 0 ? 'text-red-500' : 'text-main'}`}>
              {highPriorityCount}
            </div>
            <p className="text-xs font-medium text-main/60">{t.dueTonight}</p>
          </div>
        );
      case 'TODAY_INCOME':
        return (
          <div key={id} onClick={() => navigate('/part-time')} className="liquid-glass-card p-4 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all cursor-pointer group active:scale-95 col-span-1 min-h-[120px]">
            <h3 className="text-sm font-bold text-main/80 mb-2 flex items-center justify-between group-hover:text-primary-500 transition-colors">
              {t.todayIncome}
              {todaySSODeduction > 0 && (
                <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold border border-red-500/20">
                  -5% {t.ssoDeduction}
                </span>
              )}
            </h3>
            <div className="text-3xl md:text-4xl font-black text-green-500 dark:text-green-400 mb-1 group-hover:scale-105 transition-transform origin-left">
              ฿{todayNetIncome.toLocaleString()}
            </div>
            <p className="text-xs font-medium text-main/60">{todayIncome > 0 ? t.fromTodayShift : t.noShiftsToday}</p>
          </div>
        );
      case 'APP_STREAK':
        return (
          <div key={id} className="p-4 rounded-[20px] flex flex-col justify-between shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 col-span-1 min-h-[120px]" 
               style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.1) 0%, rgba(139,92,246,0.15) 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <motion.div className="absolute -right-4 -top-4 text-primary-500/10" animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <Flame size={80} strokeWidth={1.5} />
            </motion.div>
            <h3 className="text-sm font-bold text-primary-600 dark:text-primary-400 mb-2 flex items-center gap-1 relative z-10 group-hover:text-primary-500 transition-colors">
              <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{ originY: 0.8 }}>
                <Flame size={18} className="text-orange-500" fill="currentColor" />
              </motion.div>
              {t.appStreak}
            </h3>
            <div className="text-3xl md:text-4xl font-black text-primary-600 dark:text-primary-500 mb-1 relative z-10 group-hover:scale-105 transition-transform origin-left">
              {streakData.currentStreak} {t.days}
            </div>
            <p className="text-xs font-medium text-primary-700/70 dark:text-primary-300/70 relative z-10">{t.bestStreak} {streakData.bestStreak} {t.days}</p>
          </div>
        );
      case 'WORK_STREAK':
        return (
          <div key={id} onClick={() => navigate('/part-time')} className="p-4 rounded-[20px] flex flex-col justify-between shadow-lg relative overflow-hidden group hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer col-span-1 min-h-[120px]" 
               style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(22,163,74,0.15) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <motion.div className="absolute -right-4 -top-4 text-green-500/10" animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <Briefcase size={80} strokeWidth={1.5} />
            </motion.div>
            <h3 className="text-sm font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1 relative z-10 group-hover:text-green-500 transition-colors">
              <Briefcase size={18} className="text-green-500" fill="currentColor" />
              {t.workStreak}
            </h3>
            <div className="text-3xl md:text-4xl font-black text-green-600 dark:text-green-500 mb-1 relative z-10 group-hover:scale-105 transition-transform origin-left">
              {currentWorkStreak} {t.days}
            </div>
            <p className="text-xs font-medium text-green-700/70 dark:text-green-300/70 relative z-10">{t.bestStreak} {bestWorkStreak} {t.days}</p>
          </div>
        );
      case 'INCOME_GOAL':
        if (settings.showInIncome === false || !incomeGoal || incomeGoal.goalAmount <= 0) return null;
        return (
          <div key={id} onClick={() => navigate('/part-time')} className="col-span-2 liquid-glass-card p-4 rounded-[20px] relative overflow-hidden group cursor-pointer hover:border-primary-500/30 transition-all flex flex-col justify-center min-h-[120px]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-main/80 flex items-center gap-2 text-sm">{t.incomeGoal}</h3>
              <span className="text-[10px] md:text-xs font-bold bg-primary-500/10 text-primary-500 px-2 py-1 rounded-full">
                 ฿{thisMonthIncome.toLocaleString()} / ฿{incomeGoal.goalAmount.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-black/10 dark:bg-white/10 h-2.5 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-green-500 transition-all duration-1000 ease-out relative"
                style={{ width: `${Math.min(100, (thisMonthIncome / incomeGoal.goalAmount) * 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] md:text-xs font-bold text-main/60">
              <span>{(thisMonthIncome / incomeGoal.goalAmount * 100).toFixed(1)}%</span>
              {thisMonthSSO > 0 && <span>{t.ssoDeduction} ฿{thisMonthSSO.toLocaleString()}</span>}
            </div>
          </div>
        );
      case 'DDAY_WIDGET':
        let daysDiff = null;
        let isPast = false;
        let isToday = false;
        if (ddayConfig.date) {
           const targetDate = new Date(ddayConfig.date);
           const today = new Date(now);
           today.setHours(0,0,0,0);
           targetDate.setHours(0,0,0,0);
           const timeDiff = targetDate.getTime() - today.getTime();
           daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
           if (daysDiff < 0) isPast = true;
           if (daysDiff === 0) isToday = true;
        }

        return (
          <div 
             key={id} 
             onClick={() => {
                if (isEditWidgetMode) return;
                setDdayInput({ title: ddayConfig.title, date: ddayConfig.date });
                setShowDdayModal(true);
             }} 
             className="liquid-glass-card p-4 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all cursor-pointer group active:scale-95 col-span-1 min-h-[120px] relative overflow-hidden"
          >
            <h3 className="text-sm font-bold text-main/80 mb-2 truncate group-hover:text-primary-500 transition-colors z-10">
              {ddayConfig.title || t.ddayDefault}
            </h3>
            <div className="z-10 flex flex-col">
               {ddayConfig.date ? (
                  isToday ? (
                     <div className="text-2xl md:text-3xl font-black text-primary-500 animate-pulse">D-Day! 🎉</div>
                  ) : isPast ? (
                     <div className="text-xl md:text-2xl font-black text-main/60">{t.pastDays} {Math.abs(daysDiff)} {t.days}</div>
                  ) : (
                     <div className="flex items-baseline gap-1">
                        <span className="text-3xl md:text-4xl font-black text-primary-500 group-hover:scale-105 transition-transform origin-left">
                          D-{daysDiff}
                        </span>
                     </div>
                  )
               ) : (
                  <div className="text-sm font-bold text-main/50">{t.tapToSet}</div>
               )}
            </div>
            {ddayConfig.date && !isToday && !isPast && (() => {
               const d = new Date(ddayConfig.date);
               return (
                 <p className="text-[10px] md:text-xs font-medium text-main/60 mt-1 z-10">
                   {`${format(d, 'd MMM', { locale: th })} ${d.getFullYear() + 543}`}
                 </p>
               );
            })()}
            <div className="absolute -bottom-6 -right-6 text-primary-500/5 group-hover:text-primary-500/10 transition-colors group-hover:scale-110 duration-500 pointer-events-none">
              <Calendar size={100} strokeWidth={1} />
            </div>
          </div>
        );
      case 'WEATHER_WIDGET':
        const getWeatherInfo = (code, lang) => {
          if (code === 0) return { Icon: Sun, text: lang === 'en' ? 'Clear' : 'แจ่มใส', color: 'text-orange-500' };
          if (code >= 1 && code <= 3) return { Icon: Cloud, text: lang === 'en' ? 'Cloudy' : 'มีเมฆบางส่วน', color: 'text-sky-500' };
          if (code === 45 || code === 48) return { Icon: CloudFog, text: lang === 'en' ? 'Foggy' : 'มีหมอก', color: 'text-gray-500' };
          if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { Icon: CloudRain, text: lang === 'en' ? 'Rain' : 'ฝนตก', color: 'text-blue-500' };
          if (code >= 95) return { Icon: CloudLightning, text: lang === 'en' ? 'Thunderstorm' : 'ฝนฟ้าคะนอง', color: 'text-purple-500' };
          return { Icon: Cloud, text: lang === 'en' ? 'Unknown' : 'ไม่ทราบ', color: 'text-sky-500' };
        };

        const wInfo = weatherData ? getWeatherInfo(weatherData.weathercode, lang) : null;

        return (
          <div key={id} className="col-span-2 liquid-glass-card p-4 md:p-5 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all group min-h-[120px] relative overflow-hidden">
            <div className="flex justify-between items-center z-10 mb-2">
               <h3 className="text-sm font-bold text-main/80 flex items-center gap-1.5 group-hover:text-primary-500 transition-colors">
                 <CloudRain size={16} className={wInfo ? wInfo.color : "text-blue-500"} />
                 {t.weatherWidget || (lang === 'en' ? 'Weather' : 'สภาพอากาศ')}
               </h3>
               {weatherData && (
                 <span className="text-[10px] md:text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full flex items-center gap-1 border border-blue-500/20 shadow-sm backdrop-blur-md">
                    <Droplets size={12} />
                    {lang === 'en' ? 'Rain' : 'โอกาสฝน'} {weatherData.rainProb ?? 0}%
                 </span>
               )}
            </div>

            <div className="z-10 flex items-center justify-between mt-2 flex-1">
              {weatherLoading ? (
                <div className="w-full flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : weatherData ? (
                <>
                  <div className="flex items-center gap-3 md:gap-4">
                     <div className="p-2.5 bg-white/50 dark:bg-black/20 rounded-[18px] shadow-inner border border-white/20 dark:border-white/5">
                        <wInfo.Icon size={38} className={`${wInfo.color} drop-shadow-md`} />
                     </div>
                     <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                           <span className={`text-4xl md:text-5xl font-black tracking-tighter ${wInfo.color}`}>{Math.round(weatherData.temperature)}°</span>
                        </div>
                        <span className="text-sm md:text-base font-bold text-main/80">{wInfo.text}</span>
                     </div>
                  </div>
                  <div className="flex flex-col items-end justify-end text-right ml-4 max-w-[60%]">
                     <span className="text-[11px] md:text-xs font-medium text-main/70 bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded-xl line-clamp-2 leading-snug">
                        {weatherData.locationName}
                     </span>
                  </div>
                </>
              ) : (
                <span className="text-xs font-medium text-main/50">Unavailable</span>
              )}
            </div>
            
            {wInfo && (
               <div className={`absolute -bottom-8 -right-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none ${wInfo.color}`}>
                 <wInfo.Icon size={120} strokeWidth={1.5} />
               </div>
            )}
          </div>
        );
      case 'POMODORO_WIDGET':
        const formatTime = (seconds) => {
          const m = Math.floor(seconds / 60);
          const s = seconds % 60;
          return `${m}:${s.toString().padStart(2, '0')}`;
        };
        const progress = pomodoroState.isBreak 
          ? ((5 * 60 - pomodoroState.timeLeft) / (5 * 60)) * 100 
          : ((25 * 60 - pomodoroState.timeLeft) / (25 * 60)) * 100;
        
        return (
          <div key={id} className="liquid-glass-card p-4 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all group col-span-1 min-h-[120px] relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1 bg-primary-500/20 w-full">
               <div className="h-full bg-primary-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
            </div>
            <h3 className="text-sm font-bold text-main/80 mb-1 truncate group-hover:text-primary-500 transition-colors z-10 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Timer size={16} className={pomodoroState.isBreak ? "text-green-500" : "text-primary-500"} />
                {pomodoroState.isBreak ? (lang === 'en' ? 'Break' : 'พักผ่อน') : (t.pomodoroWidget || (lang === 'en' ? 'Focus Timer' : 'จับเวลาสมาธิ'))}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPomodoroState(prev => ({ ...prev, timeLeft: prev.isBreak ? 5*60 : 25*60, isActive: false }));
                }}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-main/40 hover:text-main transition-colors"
              >
                <RotateCcw size={12} />
              </button>
            </h3>
            <div className="z-10 flex flex-col items-center justify-center flex-1 mt-1">
              <span className={`text-3xl md:text-4xl font-black ${pomodoroState.isBreak ? "text-green-500" : "text-primary-500 font-mono"}`}>
                {formatTime(pomodoroState.timeLeft)}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPomodoroState(prev => ({ ...prev, isActive: !prev.isActive }));
                }}
                className={`mt-2 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all ${pomodoroState.isBreak ? 'bg-green-500' : 'bg-primary-500'}`}
              >
                {pomodoroState.isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
              </button>
            </div>
          </div>
        );
      case 'TODAY_WORK_WIDGET':
        const todayShifts = tasks.filter(t => t.isPartTime && !t.isExpense && !t.isExtraIncome && isSameDay(t.start, now));
        const hasShift = todayShifts.length > 0;
        return (
          <div key={id} onClick={() => navigate('/part-time')} className="liquid-glass-card p-4 rounded-[20px] flex flex-col justify-between hover:border-primary-500/30 transition-all cursor-pointer group active:scale-95 col-span-1 min-h-[120px]">
            <h3 className="text-sm font-bold text-main/80 mb-2 group-hover:text-primary-500 transition-colors">{t.todayWorkWidget}</h3>
            <div className={`text-3xl md:text-4xl font-black mb-1 group-hover:scale-105 transition-transform origin-left ${hasShift ? 'text-primary-500' : 'text-main opacity-50'}`}>
              {hasShift ? (lang === 'en' ? 'Yes' : 'มีงาน') : (lang === 'en' ? 'Free' : 'ว่าง')}
            </div>
            <p className="text-xs font-medium text-main/60">
              {hasShift ? `${todayShifts.length} ${lang === 'en' ? 'shifts' : 'กะ'}` : t.noShiftsToday}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="min-h-screen font-sans pb-32 md:pb-8 overflow-x-hidden"
    >
      <div className="relative w-full h-[180px] md:h-[220px] mb-6">
        <GreetingBanner 
          name={user?.displayName?.split(' ')[0] || ''} 
          dateLabel={format(now, 'EEEE d MMM yyyy', { locale: lang === 'th' ? th : undefined })} 
          streak={gamificationStreaks.currentStreak}
          className="rounded-b-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-b border-white/10" 
        />
        
        <div className="absolute top-0 left-0 right-0 p-4 md:p-8 flex justify-end items-start z-10 max-w-4xl mx-auto w-full">

          
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex items-center">
              <motion.div
                 initial={{ opacity: 0, x: 30, scale: 0.5 }}
                 animate={{ opacity: [0, 1, 1, 0], x: [30, 0, 0, 30], scale: [0.5, 1, 1, 0.5] }}
                 transition={{ duration: 5, repeat: Infinity, repeatDelay: 3, times: [0, 0.1, 0.9, 1], ease: "easeInOut" }}
                 className="absolute right-full whitespace-nowrap bg-white text-primary-600 font-bold text-[10px] px-2.5 py-1 rounded-full shadow-lg border border-primary-500/20 mr-2 pointer-events-none origin-right"
              >
                 {lang === 'en' ? 'Add Friends!' : 'เพิ่มเพื่อนเลย!'}
                 <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-[4px] border-transparent border-l-white"></div>
              </motion.div>
              <button 
                 onClick={() => navigate('/friends')}
                 className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-black/20 hover:bg-black/30 backdrop-blur-md text-white shadow-sm"
                 title={lang === 'en' ? 'Friends' : 'เพื่อน'}
              >
                 <Users size={18} />
              </button>
            </div>
            <button 
               onClick={() => setIsEditWidgetMode(!isEditWidgetMode)} 
               className={`hidden md:flex text-sm px-3 py-1.5 rounded-full transition-colors items-center gap-1 ${isEditWidgetMode ? 'bg-primary-500 text-white shadow-md' : 'bg-black/20 hover:bg-black/30 backdrop-blur-md text-white'}`}
            >
               {isEditWidgetMode ? t.finish : <><LayoutGrid size={14}/> {t.editWidget}</>}
            </button>
            <button 
               onClick={() => setIsEditWidgetMode(!isEditWidgetMode)} 
               className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isEditWidgetMode ? 'bg-primary-500 text-white shadow-md' : 'bg-black/20 hover:bg-black/30 backdrop-blur-md text-white'}`}
            >
               {isEditWidgetMode ? <Check size={18} /> : <LayoutGrid size={18} />}
            </button>
            <div 
              onClick={() => navigate('/profile')}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl shadow-inner border border-white/30 flex-shrink-0 overflow-hidden backdrop-blur-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform"
              title={lang === 'en' ? 'Profile' : 'โปรไฟล์'}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : avatarInitial
              }
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <header className="flex justify-between items-start mb-6 animate-slide-up">
          <div className="flex-1 w-full">
            
            <div className="flex flex-wrap items-center gap-2">
              <motion.div 
                layout
                onClick={() => setIsTickerActive(!isTickerActive)}
                className="px-3 py-1.5 bg-primary-500/10 text-primary-700 dark:text-primary-300 rounded-full text-[11px] md:text-xs font-bold border border-primary-500/20 flex items-center gap-1.5 overflow-hidden cursor-pointer"
                style={{ maxWidth: '85vw' }}
              >
                <Bell size={14} className="text-primary-500 flex-shrink-0" />
                <AnimatePresence mode="wait">
                  {!isTickerActive ? (
                    <motion.div 
                      key="summary"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap"
                    >
                      {pendingToday > 0 
                        ? t.youHaveTasks(pendingToday)
                        : t.noTasksToday
                      }
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="ticker"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 280 }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap relative overflow-hidden flex items-center"
                    >
                      <style>{`
                        @keyframes slide-ticker {
                          0% { transform: translateX(280px); }
                          100% { transform: translateX(-100%); }
                        }
                      `}</style>
                      <div 
                        style={{ display: 'flex', animation: 'slide-ticker 8s linear forwards' }} 
                        className="items-center whitespace-nowrap"
                      >
                        {pendingTasksList.map((tItem, idx) => {
                          const isWork = tItem.isPartTime;
                          const timeStr = `${format(tItem.start, 'd MMM HH:mm', { locale: lang === 'th' ? th : undefined })} - ${format(tItem.end, 'HH:mm')}`;
                          return (
                            <div 
                              key={tItem.id || idx} 
                              className={`inline-flex items-center gap-1.5 px-3 py-1 mx-1 rounded-full text-[11px] font-bold transition-all ${
                                isWork 
                                  ? 'bg-green-500/15 text-green-700 dark:text-green-300 border border-green-500/30' 
                                  : 'bg-black/5 dark:bg-white/10 text-main border border-main/10'
                              }`}
                            >
                               {isWork ? (
                                 <DollarSign size={12} className="text-green-600 dark:text-green-400" />
                               ) : (
                                 <div className={`w-1.5 h-1.5 rounded-full ${tItem.priority === TASK_PRIORITY.HIGH ? 'bg-red-500 animate-pulse' : 'bg-primary-500/70'}`} />
                               )}
                               <span>{tItem.title}</span>
                               <span className="opacity-60 font-medium ml-0.5">{timeStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              {highPriorityCount > 0 && (
                <div className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-[11px] md:text-xs font-bold border border-red-500/20 flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                   {t.urgentItems(highPriorityCount)}
                </div>
              )}
            </div>
          </div>
        </header>

        <Reorder.Group 
          axis="y"
          values={selectedWidgets}
          onReorder={setSelectedWidgets}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          <AnimatePresence>
            {selectedWidgets.filter(id => AVAILABLE_WIDGETS.some(w => w.id === id)).map(id => (
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
                className={`relative ${AVAILABLE_WIDGETS.find(w => w.id === id)?.size === 2 ? 'col-span-2' : 'col-span-1'} ${isEditWidgetMode ? 'cursor-grab active:cursor-grabbing z-50' : ''}`}
              >
                {isEditWidgetMode && (
                  <>
                    <button 
                      onClick={() => setSelectedWidgets(prev => prev.filter(w => w !== id))}
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
                  {renderWidget(id)}
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
               <Plus size={20} /> {t.addWidget}
             </button>
             <p className="text-center text-xs opacity-50 mt-2">{t.removeWidgetHelp}</p>
           </motion.div>
        )}


        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex justify-between items-end mb-3">
            <h3 className="font-bold text-main/80">{t.weeklyStreak}</h3>
            <span className="text-xs font-medium text-main/50">{t.monSun}</span>
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
            <h3 className="font-bold text-main/80 flex items-center gap-2">{t.monthlyIncome}</h3>
            <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-1">
              <button 
                onClick={() => setChartType('bar')} 
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${chartType === 'bar' ? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm' : 'text-main/60'}`}
              >
                {t.bar}
              </button>
              <button 
                onClick={() => setChartType('line')} 
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${chartType === 'line' ? 'bg-white dark:bg-slate-800 text-primary-500 shadow-sm' : 'text-main/60'}`}
              >
                {t.line}
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
                    formatter={(value) => [`฿${(value || 0).toLocaleString()}`, t.incomeLabel]}
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
                    formatter={(value) => [`฿${(value || 0).toLocaleString()}`, t.incomeLabel]}
                    labelStyle={{ color: 'var(--color-text-main)', opacity: 0.8, marginBottom: '4px' }}
                  />
                  <Line type="monotone" dataKey="income" stroke="var(--color-primary-500)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-primary-500)', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs font-bold text-main/70">
             <div className="w-2 h-2 rounded-sm bg-primary-500"></div> {t.incomeTitle}
          </div>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-main/80">{t.tasksToday}</h3>
            {todayTasks.length > 0 && <span className="text-xs font-bold text-primary-500">{t.totalItems(todayTasks.length)}</span>}
          </div>
          
          <div className="space-y-3">
            {todayTasks.length === 0 ? (
              <div className="liquid-glass-card p-6 text-center text-main/50 font-medium rounded-[20px]">
                {t.noTasksToday}
              </div>
            ) : (
              todayTasks.map(task => {
                const isOverdue = !isSameDay(task.end, now) && isBefore(task.end, now) && task.status !== TASK_STATUS.DONE;
                return (
                  <div key={task.id} className={`liquid-glass-card p-4 rounded-[20px] flex items-center gap-3 transition-all ${task.status === TASK_STATUS.DONE ? 'opacity-60' : 'hover:border-primary-500/30'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(task.status, task.priority)} ${isOverdue ? 'animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-main truncate ${task.status === TASK_STATUS.DONE ? 'line-through' : ''}`}>{task.title}</h4>
                      <p className="text-[10px] md:text-xs text-main/60 truncate flex items-center gap-1.5 mt-0.5">
                         {format(task.start, 'HH:mm')} - {format(task.end, 'HH:mm')}
                         <span className="opacity-50">•</span>
                         {task.isPartTime ? (
                           <span className="text-green-500 dark:text-green-400 font-bold flex items-center gap-0.5"><DollarSign size={10} /> {t.workShift}</span>
                         ) : (
                           <span className={task.priority === TASK_PRIORITY.HIGH ? 'text-red-500 font-bold' : ''}>{t.important}{task.priority}</span>
                         )}
                         {isOverdue && <span className="text-red-500 font-bold ml-1 bg-red-500/10 px-1.5 rounded text-[9px]">{t.overdue}</span>}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      {task.status === TASK_STATUS.DONE ? (
                        <div className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold border border-green-500/20 flex items-center gap-1">
                          <Check size={12} /> {t.done}
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-full bg-white/50 dark:bg-black/30 text-main text-xs font-bold border border-main/10 shadow-sm">
                          {task.status}
                        </div>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                        className="p-1.5 text-main/30 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                        title="ลบรายการนี้"
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

        <div className="animate-slide-up mt-8" style={{ animationDelay: '0.5s' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-main/80">{t.upcoming7Days}</h3>
            {upcomingTasks.length > 0 && <span className="text-xs font-bold text-amber-500">{t.totalItems(upcomingTasks.length)}</span>}
          </div>
          
          <div className="space-y-3">
            {upcomingTasks.length === 0 ? (
              <div className="liquid-glass-card p-6 text-center text-main/50 font-medium rounded-[20px]">
                {t.noUrgent7Days}
              </div>
            ) : (
              upcomingTasks.map(task => (
                <div key={task.id} className="liquid-glass-card p-4 rounded-[20px] flex items-center gap-3 transition-all hover:border-amber-500/30">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === TASK_PRIORITY.HIGH ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-main truncate">{task.title}</h4>
                    <p className="text-[10px] md:text-xs text-main/60 truncate flex items-center gap-1.5 mt-0.5">
                       {format(task.start, 'd MMM HH:mm', { locale: lang === 'th' ? th : undefined })}
                       <span className="opacity-50">•</span>
                       {task.isPartTime ? (
                         <span className="text-green-500 dark:text-green-400 font-bold flex items-center gap-0.5"><DollarSign size={10} /> {t.workShift}</span>
                       ) : (
                         <span className={task.priority === TASK_PRIORITY.HIGH ? 'text-red-500 font-bold' : ''}>{t.important}{task.priority}</span>
                       )}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                     <div className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                       {t.waiting}
                     </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {isChartExpanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-white/30 dark:bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setIsChartExpanded(false)}>
          <div 
            className="liquid-glass-card w-full max-w-5xl h-[80vh] p-6 md:p-8 flex flex-col relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsChartExpanded(false)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main/70 hover:text-main"
            >
              <X size={24} />
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-main">{t.last12Months}</h2>
              <p className="text-main/60 text-sm mt-1">{t.last12MonthsSub}</p>
            </div>
            
            <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-1 w-max mb-6">
              <button 
                onClick={() => setChartType('bar')} 
                className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${chartType === 'bar' ? 'bg-[var(--glass-bg-strong)] text-primary-500 shadow-sm border border-[var(--glass-border)]' : 'text-main/60'}`}
              >
                {t.bar}
              </button>
              <button 
                onClick={() => setChartType('line')} 
                className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${chartType === 'line' ? 'bg-[var(--glass-bg-strong)] text-primary-500 shadow-sm border border-[var(--glass-border)]' : 'text-main/60'}`}
              >
                {t.line}
              </button>
            </div>

            <div className="flex-1 flex justify-center items-center w-full relative overflow-x-auto overflow-y-hidden min-h-[300px]">
              {!showModalChart ? (
                <div className="flex flex-col items-center justify-center text-main/50 gap-3">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-bold">{t.loadingChart}</span>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={fullChartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" opacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-main)', opacity: 0.8 }} dy={10} interval={0} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-main)', opacity: 0.8 }} tickFormatter={(value) => value > 0 ? `฿${value >= 1000 ? (value/1000)+'k' : value}` : '0'} />
                        <Tooltip 
                          cursor={{ fill: 'var(--glass-bg-strong)', opacity: 0.4 }}
                          contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                          itemStyle={{ color: 'var(--color-primary-500)', fontWeight: 'bold' }}
                          formatter={(value) => [`฿${(value || 0).toLocaleString()}`, 'รายได้']}
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
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-main)', opacity: 0.8 }} dy={10} interval={0} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-main)', opacity: 0.8 }} tickFormatter={(value) => value > 0 ? `฿${value >= 1000 ? (value/1000)+'k' : value}` : '0'} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                          itemStyle={{ color: 'var(--color-primary-500)', fontWeight: 'bold' }}
                          formatter={(value) => [`฿${(value || 0).toLocaleString()}`, 'รายได้']}
                          labelStyle={{ color: 'var(--color-text-main)', opacity: 0.8, marginBottom: '4px' }}
                        />
                        <Line type="monotone" dataKey="income" stroke="var(--color-primary-500)" strokeWidth={4} dot={{ r: 5, fill: 'var(--color-primary-500)', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 8 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Widget Selector Bottom Sheet */}
      <AnimatePresence>
        {showWidgetSelector && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowWidgetSelector(false)}>
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white dark:bg-[#1a1b26] rounded-t-[32px] sm:rounded-[32px] p-6 pb-safe shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-black/10 dark:bg-white/10 rounded-full mx-auto mb-6" />
              
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><LayoutGrid size={20}/> {t.selectWidget}</h3>
              
              <div className="mb-4 text-sm text-main/70">
                <div className="flex items-center gap-2 font-bold text-primary-500">
                  <div className="flex-1 bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${(selectedWidgets.reduce((acc, id) => acc + (AVAILABLE_WIDGETS.find(w => w.id === id)?.size || 1), 0) / 6) * 100}%` }}
                    />
                  </div>
                  <span>
                    {selectedWidgets.reduce((acc, id) => acc + (AVAILABLE_WIDGETS.find(w => w.id === id)?.size || 1), 0)} / 6 {t.slots}
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                {AVAILABLE_WIDGETS.map(w => {
                  const isEnabled = selectedWidgets.includes(w.id);
                  const currentSize = selectedWidgets.reduce((acc, id) => acc + (AVAILABLE_WIDGETS.find(widget => widget.id === id)?.size || 1), 0);
                  const canAdd = isEnabled || (currentSize + w.size <= 6);
                  
                  return (
                    <button 
                      key={w.id}
                      disabled={!isEnabled && !canAdd}
                      onClick={() => {
                        if (isEnabled) {
                          setSelectedWidgets(prev => prev.filter(id => id !== w.id));
                        } else if (canAdd) {
                          setSelectedWidgets(prev => [...prev, w.id]);
                          setShowWidgetSelector(false); // Close after adding
                        }
                      }}
                      className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all ${
                        isEnabled 
                          ? 'bg-primary-500/10 border-primary-500 text-primary-600 dark:text-primary-400' 
                          : (!canAdd ? 'bg-black/5 dark:bg-white/5 border-transparent opacity-40 cursor-not-allowed' : 'bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10 dark:hover:bg-white/10 text-main')
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-bold">{t[w.labelKey] || w.label}</div>
                        <div className="text-[10px] opacity-70">{t.space} {w.size} {t.slots}</div>
                      </div>
                      {isEnabled ? (
                        <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center">
                          <Check size={14} />
                        </div>
                      ) : (
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${!canAdd ? 'border-main/20 text-main/20' : 'border-main/20 text-main/40'}`}>
                          <Plus size={14} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              <button onClick={() => setShowWidgetSelector(false)} className="w-full mt-6 py-4 bg-black/5 dark:bg-white/10 rounded-xl font-bold">{t.close}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* D-Day Config Modal */}
      {showDdayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDdayModal(false)}>
          <div 
            className="liquid-glass-card w-full max-w-sm p-6 flex flex-col relative animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-main mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-primary-500" />
              {t.configDDay}
            </h2>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-main/70 mb-1">{t.eventName}</label>
                  <input 
                     type="text" 
                     value={ddayInput.title}
                     onChange={(e) => setDdayInput({...ddayInput, title: e.target.value})}
                     className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-main font-medium focus:outline-none focus:border-primary-500 transition-colors"
                     placeholder={t.eventNamePlaceholder}
                     maxLength={20}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold text-main/70 mb-1">{t.targetDate}</label>
                  <input 
                     type="date" 
                     value={ddayInput.date}
                     onChange={(e) => setDdayInput({...ddayInput, date: e.target.value})}
                     className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-xl px-4 py-2.5 text-main font-medium focus:outline-none focus:border-primary-500 transition-colors"
                  />
               </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => setShowDdayModal(false)}
                className="flex-1 py-2.5 rounded-xl text-main font-bold hover:bg-main/5 transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={() => {
                   let savedDate = ddayInput.date;
                   if (savedDate) {
                       const parts = savedDate.split('-');
                       if (parts.length === 3 && parseInt(parts[0], 10) > 2400) {
                           parts[0] = (parseInt(parts[0], 10) - 543).toString();
                           savedDate = parts.join('-');
                       }
                   }
                   setDdayConfig({ ...ddayInput, date: savedDate });
                   setShowDdayModal(false);
                }}
                className="flex-1 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary-500/30"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}
