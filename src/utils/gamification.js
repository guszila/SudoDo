import { differenceInDays, startOfDay, subDays, getDay } from 'date-fns';
import { TASK_STATUS, RATE_TYPE } from '../constants';

export const getActiveDates = (tasks) => {
  const dates = new Set();
  
  tasks.forEach(task => {
    const isCompleted = task.status === TASK_STATUS.DONE || (task.isPartTime && task.actualStart && task.actualEnd);
    if (isCompleted && task.start) {
      const dateStr = startOfDay(new Date(task.start)).toISOString();
      dates.add(dateStr);
    }
  });
  
  return Array.from(dates)
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());
};

const isContinuous = (newerDate, olderDate) => {
  const diff = differenceInDays(newerDate, olderDate);
  if (diff === 1) return true;
  
  if (diff === 2) {
    const middleDay = getDay(subDays(newerDate, 1));
    if (middleDay === 0 || middleDay === 6) return true;
  }
  
  if (diff === 3) {
    const m1 = getDay(subDays(newerDate, 1));
    const m2 = getDay(subDays(newerDate, 2));
    if ((m1 === 0 || m1 === 6) && (m2 === 0 || m2 === 6)) return true;
  }
  
  return false;
};

export const calculateStreaks = (tasks) => {
  const dates = getActiveDates(tasks);
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = startOfDay(new Date());
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  
  for (let i = 0; i < dates.length - 1; i++) {
    if (isContinuous(dates[i], dates[i+1])) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  
  const diffToday = differenceInDays(today, dates[0]);
  if (diffToday === 0 || isContinuous(today, dates[0])) {
    currentStreak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      if (isContinuous(dates[i], dates[i+1])) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
};

export const BADGE_LIST = [
  // หมวดหมู่ที่ 1: วินัยการทำงานต่อเนื่อง (Streaks)
  { id: 'streak_3', category: 'streak', tier: 'common', icon: '🔥', name: { th: 'ไฟแรง 3 วัน', en: 'On Fire (3 Days)' }, desc: { th: 'ทำเป้าหมายต่อเนื่อง 3 วันติด', en: '3-day streak' }, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: 'streak_7', category: 'streak', tier: 'rare', icon: '⚡', name: { th: 'ไม่ยอมแพ้ (7 วัน)', en: 'Unstoppable (7 Days)' }, desc: { th: 'ทำเป้าหมายต่อเนื่อง 7 วันติด', en: '7-day streak' }, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'streak_30', category: 'streak', tier: 'epic', icon: '👑', name: { th: 'วินัยเหล็ก (30 วัน)', en: 'Master (30 Days)' }, desc: { th: 'ทำเป้าหมายต่อเนื่อง 30 วันติด', en: '30-day streak' }, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'streak_100', category: 'streak', tier: 'legendary', icon: '💎', name: { th: 'ผู้ไม่เคยหยุดพัก (100 วัน)', en: 'Iron Will (100 Days)' }, desc: { th: 'ทำเป้าหมายต่อเนื่อง 100 วันติด', en: '100-day streak' }, color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  { id: 'streak_365', category: 'streak', tier: 'mythic', icon: '🌠', name: { th: 'ตำนานแห่งปี (365 วัน)', en: 'Legend (365 Days)' }, desc: { th: 'ทำเป้าหมายต่อเนื่อง 365 วันติด', en: '365-day streak' }, color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },

  // หมวดหมู่ที่ 2: การจัดการงานทั่วไป (Tasks)
  { id: 'task_1', category: 'task', tier: 'common', icon: '🌱', name: { th: 'ก้าวแรก', en: 'First Step' }, desc: { th: 'ทำงานชิ้นแรกสำเร็จ', en: 'Completed your first task' }, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { id: 'task_50', category: 'task', tier: 'rare', icon: '🛠️', name: { th: 'นักปฏิบัติ (50 ชิ้น)', en: 'Doer (50 Tasks)' }, desc: { th: 'ทำงานเสร็จครบ 50 ชิ้น', en: 'Completed 50 tasks' }, color: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
  { id: 'task_100', category: 'task', tier: 'epic', icon: '🎯', name: { th: 'ผู้เชี่ยวชาญ (100 ชิ้น)', en: 'Centurion (100 Tasks)' }, desc: { th: 'ทำงานเสร็จครบ 100 ชิ้น', en: 'Completed 100 tasks' }, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { id: 'task_500', category: 'task', tier: 'legendary', icon: '⚔️', name: { th: 'เทพแห่งการจัดการ (500 ชิ้น)', en: 'Task Master (500 Tasks)' }, desc: { th: 'ทำงานเสร็จครบ 500 ชิ้น', en: 'Completed 500 tasks' }, color: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },

  // หมวดหมู่ที่ 3: กะการทำงาน (Part-Time Shifts)
  { id: 'parttime_1', category: 'shift', tier: 'common', icon: '💼', name: { th: 'กะแรก', en: 'First Shift' }, desc: { th: 'ทำกะพาร์ทไทม์ครั้งแรก', en: 'Completed your first shift' }, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { id: 'parttime_10', category: 'shift', tier: 'rare', icon: '💸', name: { th: 'คนขยันหาเงิน (10 กะ)', en: 'Hard Worker (10 Shifts)' }, desc: { th: 'ทำกะพาร์ทไทม์ครบ 10 ครั้ง', en: 'Completed 10 shifts' }, color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  { id: 'parttime_50', category: 'shift', tier: 'epic', icon: '🏃', name: { th: 'สู้ชีวิต (50 กะ)', en: 'Shift Runner (50 Shifts)' }, desc: { th: 'ทำกะพาร์ทไทม์ครบ 50 ครั้ง', en: 'Completed 50 shifts' }, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { id: 'parttime_100', category: 'shift', tier: 'legendary', icon: '🏆', name: { th: 'พนักงานดีเด่น (100 กะ)', en: 'Workaholic (100 Shifts)' }, desc: { th: 'ทำกะพาร์ทไทม์ครบ 100 ครั้ง', en: 'Completed 100 shifts' }, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },

  // หมวดหมู่ที่ 4: ความมั่งคั่ง (Earnings)
  { id: 'earn_first', category: 'earn', tier: 'common', icon: '🪙', name: { th: 'หยาดเหงื่อแรงงาน', en: 'First Paycheck' }, desc: { th: 'มีรายได้ก้อนแรก', en: 'Earned your first income' }, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { id: 'earn_10k', category: 'earn', tier: 'rare', icon: '💰', name: { th: 'นักเก็บออม (10,000฿)', en: 'Saver (10,000฿)' }, desc: { th: 'หาเงินได้ครบ 10,000 บาท', en: 'Earned 10,000฿' }, color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  { id: 'earn_50k', category: 'earn', tier: 'epic', icon: '🏦', name: { th: 'ผู้มั่งคั่ง (50,000฿)', en: 'Wealthy (50,000฿)' }, desc: { th: 'หาเงินได้ครบ 50,000 บาท', en: 'Earned 50,000฿' }, color: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20' },
  { id: 'earn_100k', category: 'earn', tier: 'legendary', icon: '🤑', name: { th: 'เศรษฐีใหม่ (100,000฿)', en: 'Tycoon (100,000฿)' }, desc: { th: 'หาเงินได้ครบ 100,000 บาท', en: 'Earned 100,000฿' }, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { id: 'earn_1m', category: 'earn', tier: 'mythic', icon: '🌌', name: { th: 'อายุน้อยร้อยล้าน (1M฿)', en: 'Millionaire (1M฿)' }, desc: { th: 'หาเงินได้ครบ 1,000,000 บาท', en: 'Earned 1,000,000฿' }, color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' }
];

export const getUnlockedBadges = (tasks, streaks) => {
  const unlocked = [];
  
  const completedTasks = tasks.filter(t => !t.isPartTime && t.status === TASK_STATUS.DONE);
  const completedShifts = tasks.filter(t => t.isPartTime && t.actualStart && t.actualEnd);
  
  const sortedTasks = [...completedTasks].sort((a,b) => new Date(a.start) - new Date(b.start));
  const sortedShifts = [...completedShifts].sort((a,b) => new Date(a.start) - new Date(b.start));
  
  // Streaks
  if (streaks.longestStreak >= 3) {
    const activeDates = getActiveDates(tasks).reverse(); // oldest to newest
    let current = 1;
    const streakDates = {};
    if (activeDates.length > 0) {
      for (let i = 0; i < activeDates.length - 1; i++) {
        if (isContinuous(activeDates[i+1], activeDates[i])) {
          current++;
        } else {
          current = 1;
        }
        [3, 7, 30, 100, 365].forEach(milestone => {
          if (current >= milestone && !streakDates[milestone]) streakDates[milestone] = activeDates[i+1];
        });
      }
    }
    
    const fallbackDate = activeDates.length > 0 ? activeDates[activeDates.length - 1] : new Date();

    if (streaks.longestStreak >= 3) unlocked.push({ id: 'streak_3', date: streakDates[3] || fallbackDate });
    if (streaks.longestStreak >= 7) unlocked.push({ id: 'streak_7', date: streakDates[7] || fallbackDate });
    if (streaks.longestStreak >= 30) unlocked.push({ id: 'streak_30', date: streakDates[30] || fallbackDate });
    if (streaks.longestStreak >= 100) unlocked.push({ id: 'streak_100', date: streakDates[100] || fallbackDate });
    if (streaks.longestStreak >= 365) unlocked.push({ id: 'streak_365', date: streakDates[365] || fallbackDate });
  }

  // Tasks
  if (sortedTasks.length >= 1) unlocked.push({ id: 'task_1', date: new Date(sortedTasks[0].start) });
  if (sortedTasks.length >= 50) unlocked.push({ id: 'task_50', date: new Date(sortedTasks[49].start) });
  if (sortedTasks.length >= 100) unlocked.push({ id: 'task_100', date: new Date(sortedTasks[99].start) });
  if (sortedTasks.length >= 500) unlocked.push({ id: 'task_500', date: new Date(sortedTasks[499].start) });

  // Shifts
  if (sortedShifts.length >= 1) unlocked.push({ id: 'parttime_1', date: new Date(sortedShifts[0].start) });
  if (sortedShifts.length >= 10) unlocked.push({ id: 'parttime_10', date: new Date(sortedShifts[9].start) });
  if (sortedShifts.length >= 50) unlocked.push({ id: 'parttime_50', date: new Date(sortedShifts[49].start) });
  if (sortedShifts.length >= 100) unlocked.push({ id: 'parttime_100', date: new Date(sortedShifts[99].start) });

  // Earnings
  const completedIncomeTasks = tasks.filter(t => !t.isExpense && (t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd) || t.isExtraIncome));
  let totalEarned = 0;
  const earnDates = []; 

  completedIncomeTasks.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(t => {
    let earned = 0;
    if (t.isExtraIncome) {
      earned = Number(t.amount) || 0;
    } else {
      const rate = Number(t.hourlyRate) || 0;
      let hours = 0;
      if (t.actualStart && t.actualEnd) {
        hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
      } else {
        hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
      }
      hours = Math.max(0, hours - (Number(t.breakHours) || 0));
      if (t.rateType === RATE_TYPE.DAILY) earned = rate;
      else if (hours > 0) earned = hours * rate;
      if (t.isHolidayPay) earned *= 2;
    }
    
    if (earned > 0) {
      totalEarned += earned;
      earnDates.push({ total: totalEarned, date: new Date(t.start) });
    }
  });

  const getEarnDate = (target) => earnDates.find(e => e.total >= target)?.date;

  if (getEarnDate(1)) unlocked.push({ id: 'earn_first', date: getEarnDate(1) });
  if (getEarnDate(10000)) unlocked.push({ id: 'earn_10k', date: getEarnDate(10000) });
  if (getEarnDate(50000)) unlocked.push({ id: 'earn_50k', date: getEarnDate(50000) });
  if (getEarnDate(100000)) unlocked.push({ id: 'earn_100k', date: getEarnDate(100000) });
  if (getEarnDate(1000000)) unlocked.push({ id: 'earn_1m', date: getEarnDate(1000000) });

  return unlocked;
};

