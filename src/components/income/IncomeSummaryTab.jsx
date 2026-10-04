import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths, getDaysInMonth, getWeekOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  CheckCircle2, Clock, Calendar as CalendarIcon,
  CalendarOff, Banknote, X, Award,
  TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, AreaChart, Area } from 'recharts';

import SwipeableRow from '../common/SwipeableRow';
import ConfirmDialog from '../common/ConfirmDialog';
import { useTasks } from '../../contexts/TasksContext';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import { TASK_STATUS, RATE_TYPE } from '../../constants';
import { saveTask } from '../../services/taskService';
import { calcSSO } from '../../utils/socialSecurity';

const COMPANY_COLORS = ['#6C63FF', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#3B82F6'];
const COMPANY_BG_CLASSES = ['bg-violet-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-blue-500'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="liquid-glass-card px-3 py-2 rounded-xl shadow-lg text-sm">
      <p className="text-primary-500 font-bold">฿{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  );
};

export default function IncomeSummaryTab({ user, lang = 'th', onEditExtraItem }) {
  const { tasks: allTasks } = useTasks();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const weekStartsOn = settings?.weekStart === 'จันทร์' || settings?.weekStart === 'Monday' ? 1 : 0;
  const ui = lang === 'en'
    ? {
        netIncome: 'Net income', shift: 'Shifts', hours: 'Hours', perShift: '฿/shift', perHour: '฿/hour',
        monthlySummary: 'Monthly income summary', daily: 'Daily', weekly: 'Weekly',
        noCompleted: 'No completed items yet', companyBreakdown: 'By workplace', expenseTotal: 'Expenses this month',
        shiftList: 'Shift list', records: 'records', noMonthData: 'No data for this month',
        compareLast: 'Compared with last month', average6: '6-month average', hoursUnit: 'hrs', shiftsUnit: 'shifts',
        incomeAnalytics: 'Income Analytics', last12Months: 'Last 12 Months',
        last12MonthsSub: 'Total earnings from shifts over the past year',
        bar: 'Bar', line: 'Line', total12M: 'Total 12M', activeMos: 'months with income',
        avgPerMonth: 'Avg / Month', perActiveMo: 'Per active month', peakMonth: 'Peak Month',
        monthlyBreakdown: 'Monthly Breakdown', ofPeak: 'of peak', peak: 'Peak',
        selectedMonthBadge: 'Viewing', noData: 'No data'
      }
    : {
        netIncome: 'รายได้สุทธิ', shift: 'กะงาน', hours: 'ชั่วโมง', perShift: '฿/กะ', perHour: '฿/ชม.',
        monthlySummary: 'สรุปรายได้ (เดือนนี้)', daily: 'รายวัน', weekly: 'รายสัปดาห์',
        noCompleted: 'ยังไม่มีรายการที่เสร็จแล้ว', companyBreakdown: 'สัดส่วนตามบริษัท', expenseTotal: 'รวมรายจ่ายเดือนนี้',
        shiftList: 'รายการกะงาน', records: 'รายการ', noMonthData: 'ไม่มีข้อมูลเดือนนี้',
        compareLast: 'เทียบเดือนที่แล้ว', average6: 'เฉลี่ย 6 เดือน', hoursUnit: 'ชม.', shiftsUnit: 'กะ',
        incomeAnalytics: 'ภาพรวมรายได้', last12Months: 'รายได้ 12 เดือนล่าสุด',
        last12MonthsSub: 'ยอดรวมรายได้จากกะงานในช่วง 1 ปีที่ผ่านมา',
        bar: 'บาร์', line: 'เส้น', total12M: 'รวม 12 เดือน', activeMos: 'เดือนที่มีรายได้',
        avgPerMonth: 'เฉลี่ย/เดือน', perActiveMo: 'เฉลี่ยเดือนที่ทำงาน', peakMonth: 'เดือนสูงสุด',
        monthlyBreakdown: 'สรุปรายได้ตามเดือน', ofPeak: 'ของยอดสูงสุด', peak: 'สูงสุด',
        selectedMonthBadge: 'กำลังดูเดือนนี้', noData: 'ยังไม่มีข้อมูล'
      };

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null); // null = all
  const [isShiftListCollapsed, setIsShiftListCollapsed] = useState(false);
  const [chartMode, setChartMode] = useState('daily'); // 'daily' | 'weekly'
  const [chart12mType, setChart12mType] = useState('bar'); // 'bar' | 'line'

  const partTimeTasks = useMemo(() =>
    allTasks.filter(t => t.isPartTime).sort((a, b) => new Date(b.start) - new Date(a.start)),
    [allTasks]
  );

  const monthsList = useMemo(() => {
    const s = new Set();
    s.add(format(new Date(), 'yyyy-MM'));
    partTimeTasks.forEach(t => { if (t.start) s.add(format(new Date(t.start), 'yyyy-MM')); });
    return Array.from(s).sort().reverse();
  }, [partTimeTasks]);

  // 12-Month Historical Data and Stats
  const fullChartData = useMemo(() => {
    const now = new Date();
    const monthKeys12 = [];
    const fullMonthlyIncome = {};

    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      monthKeys12.push(key);
      fullMonthlyIncome[key] = {
        name: format(d, 'MMM', { locale: lang === 'th' ? th : undefined }),
        fullName: format(d, 'MMMM yyyy', { locale: lang === 'th' ? th : undefined }),
        key,
        income: 0,
        shiftCount: 0
      };
    }

    partTimeTasks.forEach(t => {
      const isDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      if (!isDone || !t.start) return;

      const key = format(new Date(t.start), 'yyyy-MM');
      if (fullMonthlyIncome[key] === undefined) return;

      if (t.isExpense) {
        return;
      } else if (t.isExtraIncome) {
        fullMonthlyIncome[key].income += (Number(t.amount) || 0);
      } else {
        let hours = t.actualStart && t.actualEnd
          ? (new Date(t.actualEnd) - new Date(t.actualStart)) / 3600000
          : (new Date(t.end) - new Date(t.start)) / 3600000;
        hours = Math.max(0, hours - (Number(t.breakHours) || 0));
        let earnings = t.rateType === RATE_TYPE.DAILY ? Number(t.hourlyRate) || 0 : hours * (Number(t.hourlyRate) || 0);
        if (t.isHolidayPay) earnings *= 2;

        fullMonthlyIncome[key].income += earnings;
        fullMonthlyIncome[key].shiftCount += 1;
      }
    });

    return monthKeys12.map(k => fullMonthlyIncome[k]);
  }, [partTimeTasks, lang]);

  const chart12mStats = useMemo(() => {
    if (!fullChartData || fullChartData.length === 0) {
      return { total: 0, avg: 0, maxIncome: 0, peakMonth: null, activeCount: 0, breakdown: [] };
    }
    const total = fullChartData.reduce((acc, item) => acc + (item.income > 0 ? item.income : 0), 0);
    const activeItems = fullChartData.filter(item => item.income > 0);
    const activeCount = activeItems.length;
    const avg = activeCount > 0 ? Math.round(total / activeCount) : 0;
    const maxIncome = Math.max(...fullChartData.map(item => item.income || 0), 0);
    const peakMonth = maxIncome > 0 ? fullChartData.find(item => item.income === maxIncome) : null;
    const breakdown = [...activeItems].reverse();

    return { total, avg, maxIncome, peakMonth, activeCount, breakdown };
  }, [fullChartData]);

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTask) return;
    const taskToDelete = { ...deleteConfirmTask };
    setDeleteConfirmTask(null);
    const result = await saveTask('DELETE', { id: taskToDelete.id }, user.uid);
    if (!result) {
      showToast(lang === 'en' ? 'Could not delete this item.' : 'ลบรายการไม่สำเร็จ', { isError: true });
      return;
    }
    showToast('ลบเรียบร้อยแล้ว', {
      duration: 5000,
      onUndo: async () => {
        const undoResult = await saveTask('ADD', taskToDelete, user.uid);
        if (!undoResult) showToast(lang === 'en' ? 'Could not undo the deletion.' : 'ยกเลิกการลบไม่สำเร็จ', { isError: true });
      }
    });
  };

  const { summary, chartData, weeklyChartData, shiftsList, comparison, companyChartData, companyStatsMap, expensesList } = useMemo(() => {
    const targetDate = new Date(`${selectedMonth}-01T00:00:00`);
    const daysInMonth = getDaysInMonth(targetDate);

    let grossIncome = 0, totalExpenses = 0, ssoGross = 0, shiftCount = 0, totalHours = 0;
    const shiftsInMonth = [];
    const expensesList = [];
    const companyIncomeMap = {};
    const companySSOGrossMap = {};
    const companyStatsMap = {};
    const dailyIncomeMap = {};
    const weeklyIncomeMap = {};
    for (let i = 1; i <= daysInMonth; i++) dailyIncomeMap[i] = { income: 0 };

    partTimeTasks.forEach(t => {
      const taskDate = new Date(t.start);
      if (format(taskDate, 'yyyy-MM') !== selectedMonth) return;
      shiftsInMonth.push(t);

      const isDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      let hours, earnings = 0;

      if (t.isExpense) {
        const expAmt = Number(t.amount) || 0;
        if (isDone) totalExpenses += expAmt;
        expensesList.push(t);
      } else if (t.isExtraIncome) {
        earnings = Number(t.amount) || 0;
        if (isDone) {
          grossIncome += earnings;
          const n = t.title || 'อื่นๆ';
          companyIncomeMap[n] = (companyIncomeMap[n] || 0) + earnings;
          const job = (settings.jobs || []).find(j => j.name === t.title);
          const deductsSSO = (job?.deductSSO !== undefined ? job.deductSSO : (t.deductSSO !== undefined ? t.deductSSO : settings.socialSecurity));
          if (deductsSSO) {
            ssoGross += earnings;
            companySSOGrossMap[n] = (companySSOGrossMap[n] || 0) + earnings;
          }
        }
      } else {
        if (isDone) {
          hours = t.actualStart && t.actualEnd
            ? (new Date(t.actualEnd) - new Date(t.actualStart)) / 3600000
            : (new Date(t.end) - new Date(t.start)) / 3600000;
          hours = Math.max(0, hours - (Number(t.breakHours) || 0));
          if (t.rateType === RATE_TYPE.DAILY) earnings = Number(t.hourlyRate) || 0;
          else if (hours > 0) earnings = hours * (Number(t.hourlyRate) || 0);
          if (t.isHolidayPay) earnings *= 2;

          grossIncome += earnings;
          shiftCount++;
          totalHours += hours;

          const n = t.title || 'อื่นๆ';
          const job = (settings.jobs || []).find(j => j.name === t.title);
          const deductsSSO = (job?.deductSSO !== undefined ? job.deductSSO : (t.deductSSO !== undefined ? t.deductSSO : settings.socialSecurity));
          if (deductsSSO) {
            ssoGross += earnings;
            companySSOGrossMap[n] = (companySSOGrossMap[n] || 0) + earnings;
          }

          companyIncomeMap[n] = (companyIncomeMap[n] || 0) + earnings;
          if (!companyStatsMap[n]) companyStatsMap[n] = { shifts: 0, hours: 0, deductsSSO };
          companyStatsMap[n].shifts++;
          companyStatsMap[n].hours += hours;
        }
      }

      if (isDone) {
        const day = taskDate.getDate();
         const weekNum = getWeekOfMonth(taskDate, { weekStartsOn });
        if (!weeklyIncomeMap[weekNum]) weeklyIncomeMap[weekNum] = { week: `W${weekNum}`, weekNum, income: 0 };

        if (dailyIncomeMap[day]) {
          if (!t.isExpense) {
            dailyIncomeMap[day].income += earnings;
            weeklyIncomeMap[weekNum].income += earnings;
            const n = t.title || 'อื่นๆ';
            dailyIncomeMap[day][n] = (dailyIncomeMap[day][n] || 0) + earnings;
            weeklyIncomeMap[weekNum][n] = (weeklyIncomeMap[weekNum][n] || 0) + earnings;
          }
        }
      }
    });

    const chartArr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      if (dailyIncomeMap[i].income !== 0) {
        chartArr.push({ day: i.toString(), fullDay: i, ...dailyIncomeMap[i] });
      }
    }
    const weeklyChartArr = Object.values(weeklyIncomeMap).sort((a,b) => a.weekNum - b.weekNum);

    let lastMonthIncome = 0, sum6 = 0;
    for (let i = 1; i <= 6; i++) {
      const mStr = format(subMonths(targetDate, i), 'yyyy-MM');
      let mInc = 0;
      partTimeTasks.forEach(t => {
        if (format(new Date(t.start), 'yyyy-MM') !== mStr) return;
        const isDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
        if (!isDone) return;
        if (t.isExpense) { mInc -= (Number(t.amount) || 0); return; }
        let h = t.actualStart && t.actualEnd
          ? (new Date(t.actualEnd) - new Date(t.actualStart)) / 3600000
          : (new Date(t.end) - new Date(t.start)) / 3600000;
        h = Math.max(0, h - (Number(t.breakHours) || 0));
        let e = t.rateType === RATE_TYPE.DAILY ? Number(t.hourlyRate) || 0 : h * (Number(t.hourlyRate) || 0);
        if (t.isHolidayPay) e *= 2;
        mInc += e;
      });
      sum6 += mInc;
      if (i === 1) lastMonthIncome = mInc;
    }
    const avg6 = sum6 / 6;
    const getChange = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

    const totalGross = Math.max(0, grossIncome);
    let ssoDeduction = 0;
    if (ssoGross > 0) {
      ssoDeduction = calcSSO(ssoGross).deduction;
    }
    const incomeAfterSSO = Math.max(0, totalGross - ssoDeduction);
    const netIncome = Math.max(0, incomeAfterSSO - totalExpenses);

    // Distribute SSO deduction to each company in companyChartData
    const ssoCompanies = Object.keys(companySSOGrossMap);
    const totalCompSSOGross = ssoCompanies.reduce((acc, k) => acc + (companySSOGrossMap[k] || 0), 0);
    let allocatedSSO = 0;
    const compSSODeductionMap = {};
    ssoCompanies.forEach((name, idx) => {
      const compSSOGross = companySSOGrossMap[name] || 0;
      let compDeduction = 0;
      if (idx === ssoCompanies.length - 1) {
        compDeduction = Math.max(0, ssoDeduction - allocatedSSO);
      } else {
        compDeduction = totalCompSSOGross > 0
          ? Math.round((compSSOGross / totalCompSSOGross) * ssoDeduction)
          : 0;
        allocatedSSO += compDeduction;
      }
      compSSODeductionMap[name] = compDeduction;
    });

    const companyChartData = Object.entries(companyIncomeMap)
      .map(([name, value]) => {
        const ssoDed = compSSODeductionMap[name] || 0;
        const netValue = Math.max(0, value - ssoDed);
        const job = (settings.jobs || []).find(j => j.name === name);
        const deductsSSO = (job?.deductSSO !== undefined ? job.deductSSO : (settings.socialSecurity || false)) || !!companySSOGrossMap[name];
        return {
          name,
          grossValue: value,
          value: netValue,
          netValue,
          ssoDeduction: ssoDed,
          deductsSSO
        };
      })
      .sort((a, b) => b.value - a.value);

    return {
      summary: { totalGross, ssoDeduction, incomeAfterSSO, totalExpenses, netIncome, shiftCount, totalHours },
      companyChartData, companyStatsMap,
      chartData: chartArr,
      weeklyChartData: weeklyChartArr,
      shiftsList: shiftsInMonth,
      expensesList,
      comparison: {
        lastMonth: lastMonthIncome,
        lastMonthChange: getChange(netIncome, lastMonthIncome),
        avg6Months: avg6,
        avgChange: getChange(netIncome, avg6)
      }
    };
  }, [partTimeTasks, selectedMonth, settings, weekStartsOn]);

  // Derived: unique companies for filter
  const companies = useMemo(() => {
    const names = new Set();
    shiftsList.forEach(t => {
      if (!t.isExpense && !t.isExtraIncome && t.title) names.add(t.title);
    });
    return Array.from(names);
  }, [shiftsList]);

  // Filtered shift list
  const filteredShifts = useMemo(() => {
    if (!selectedCompany) return shiftsList;
    return shiftsList.filter(t => t.title === selectedCompany);
  }, [shiftsList, selectedCompany]);

  // Grouped shifts by week
  const groupedShifts = useMemo(() => {
    if (filteredShifts.length === 0) return [];
    
    const groupsMap = new Map();

    filteredShifts.forEach(task => {
      const taskDate = new Date(task.start);
       const weekNum = getWeekOfMonth(taskDate, { weekStartsOn });
      
       const startD = startOfWeek(taskDate, { weekStartsOn });
       const endD = endOfWeek(taskDate, { weekStartsOn });
      const startStr = format(startD, 'd MMM', { locale: th });
      const endStr = format(endD, 'd MMM', { locale: th });
      const yearStr = (endD.getFullYear() + 543).toString().slice(-2);
      
      const label = startD.getMonth() === endD.getMonth() 
        ? `${format(startD, 'd')} - ${format(endD, 'd MMM')} ${yearStr}`
        : `${startStr} - ${endStr} ${yearStr}`;
      
      if (!groupsMap.has(label)) {
        groupsMap.set(label, {
          label,
          weekNum,
          tasks: [],
          totalEarnings: 0
        });
      }
      
      const group = groupsMap.get(label);
      group.tasks.push(task);
      
      const isCompleted = task.status === TASK_STATUS.DONE || (task.actualStart && task.actualEnd);
      let earnings = 0;
      if (task.isExpense) {
        earnings = -(Number(task.amount) || 0);
      } else if (task.isExtraIncome) {
        earnings = Number(task.amount) || 0;
      } else {
        let hours = task.actualStart && task.actualEnd
          ? (new Date(task.actualEnd) - new Date(task.actualStart)) / 3600000
          : (new Date(task.end) - new Date(task.start)) / 3600000;
        hours = Math.max(0, hours - (Number(task.breakHours) || 0));
        if (task.rateType === RATE_TYPE.DAILY) earnings = Number(task.hourlyRate) || 0;
        else if (hours > 0) earnings = hours * (Number(task.hourlyRate) || 0);
        if (task.isHolidayPay) earnings *= 2;
      }
      
      if (isCompleted || task.isExtraIncome || task.isExpense) {
        group.totalEarnings += earnings;
      }
    });

    return Array.from(groupsMap.values()).sort((a, b) => b.weekNum - a.weekNum);
  }, [filteredShifts, weekStartsOn]);

  const formatThMonth = (s) => {
    const d = new Date(`${s}-01`);
    return `${format(d, 'MMM', { locale: th })} ${(d.getFullYear() + 543).toString().slice(-2)}`;
  };
  const formatFullThMonth = (s) => {
    const d = new Date(`${s}-01`);
    return `${format(d, 'MMMM', { locale: th })} ${d.getFullYear() + 543}`;
  };

  const avgPerShift = summary.shiftCount > 0 ? summary.totalGross / summary.shiftCount : 0;
  const avgPerHour = summary.totalHours > 0 ? summary.totalGross / summary.totalHours : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Month Pills */}
      <div className="flex gap-2 overflow-x-auto py-1.5 pb-3 -mx-3 px-3 snap-x scroll-px-3 hide-scrollbar">
        {monthsList.map(mStr => (
          <button
            key={mStr}
            onClick={() => { setSelectedMonth(mStr); setSelectedCompany(null); }}
            className={`snap-start whitespace-nowrap px-5 py-2.5 rounded-full text-sm flex-shrink-0 border font-bold transition-all ${
              selectedMonth === mStr
                ? 'bg-primary-500/25 border-primary-500/50 text-primary-600 dark:text-white shadow-md shadow-primary-500/10'
                : 'bg-white/30 dark:bg-white/5 border-white/40 dark:border-white/10 text-main/70 dark:text-white/70 hover:bg-white/50 dark:hover:bg-white/10 hover:text-main dark:hover:text-white'
            }`}
          >
            {formatThMonth(mStr)}
          </button>
        ))}
      </div>

      {/* ── Hero Summary Card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-[28px] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--theme-accent) 0%, color-mix(in srgb, var(--theme-accent) 60%, #8B5CF6) 100%)',
          boxShadow: '0 12px 40px rgba(108,99,255,0.30)'
        }}
      >
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl pointer-events-none" />

        <div className="relative z-10 p-6">
          <p className="text-white/70 text-xs font-bold mb-1">{formatFullThMonth(selectedMonth)} · {ui.netIncome}</p>
          <motion.h2
            key={summary.netIncome}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-[36px] font-black tracking-tight leading-none mb-1"
          >
            ฿{summary.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </motion.h2>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-white/90 text-xs font-medium mb-4 mt-2">
            {summary.ssoDeduction > 0 && (
              <span className="bg-white/20 px-2.5 py-0.5 rounded-xl text-white font-bold border border-white/20">
                {lang === 'th' ? 'หลังหัก ปกส.' : 'After SSO'}: ฿{summary.incomeAfterSSO.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            <span className="opacity-80">
              {lang === 'th' ? 'รายได้รวม' : 'Gross'}: ฿{summary.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {summary.ssoDeduction > 0 && (
              <span className="opacity-80">
                · {lang === 'th' ? 'หัก ปกส.' : 'SSO'}: -฿{summary.ssoDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            {summary.totalExpenses > 0 && (
              <span className="bg-red-500/30 text-white px-2.5 py-0.5 rounded-xl font-bold border border-red-400/30">
                {lang === 'th' ? 'หักรายจ่าย' : 'Expenses'}: -฿{summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>

          {/* 4-stat grid */}
          <div className="grid grid-cols-4 gap-1.5 mt-5">
            {[
              { label: ui.shift, value: `${summary.shiftCount}` },
              { label: ui.hours, value: `${summary.totalHours % 1 === 0 ? summary.totalHours : summary.totalHours.toFixed(1)}` },
              { label: ui.perShift, value: `${avgPerShift.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: ui.perHour, value: `${avgPerHour.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            ].map(item => (
              <div key={item.label} className="bg-black/20 backdrop-blur-md rounded-2xl p-2.5 text-center border border-white/10 shadow-inner">
                <p className="text-white font-black text-[16px] sm:text-[17px] leading-tight">{item.value}</p>
                <p className="text-white/80 text-[10px] sm:text-[11px] font-bold mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Bar Chart ── */}
      <div className="liquid-glass-card p-4 rounded-[24px]">
        <div className="flex justify-between items-center mb-3">
          <p className="text-main/60 text-xs font-bold">{ui.monthlySummary}</p>
          <div className="flex bg-main/5 dark:bg-white/5 rounded-full p-0.5">
            <button onClick={() => setChartMode('daily')} className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${chartMode === 'daily' ? 'bg-primary-500 text-white shadow-sm' : 'text-main/50 hover:text-main'}`}>{ui.daily}</button>
            <button onClick={() => setChartMode('weekly')} className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${chartMode === 'weekly' ? 'bg-primary-500 text-white shadow-sm' : 'text-main/50 hover:text-main'}`}>{ui.weekly}</button>
          </div>
        </div>
        {(chartMode === 'daily' ? chartData : weeklyChartData).length === 0 ? (
          <div className="h-[100px] flex flex-col items-center justify-center">
            <CalendarOff className="w-7 h-7 text-primary-500/30 mb-2" />
            <p className="text-main/40 text-xs font-bold">{ui.noCompleted}</p>
          </div>
        ) : (
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartMode === 'daily' ? chartData : weeklyChartData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,100,120,0.08)" />
                <XAxis dataKey={chartMode === 'daily' ? 'day' : 'week'} axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: 'rgba(100,100,120,0.7)', fontWeight: 'bold' }} dy={6} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: 'rgba(100,100,120,0.7)', fontWeight: 'bold' }}
                  tickFormatter={(value) => value > 0 ? `฿${value >= 1000 ? (value/1000).toFixed(1).replace(/\.0$/, '') + 'k' : value}` : '0'} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                {companyChartData.length > 1
                  ? companyChartData.map((c, i) => (
                      <Bar key={c.name} dataKey={c.name} stackId="a"
                        fill={COMPANY_COLORS[i % COMPANY_COLORS.length]} maxBarSize={36}
                        radius={i === 0 ? [0,0,4,4] : i === companyChartData.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
                    ))
                  : (
                      <Bar dataKey="income" radius={[6,6,6,6]} maxBarSize={36}>
                        {(chartMode === 'daily' ? chartData : weeklyChartData).map((entry, i) => {
                          const isCurrent = chartMode === 'daily'
                            ? entry.fullDay === new Date().getDate() && selectedMonth === format(new Date(), 'yyyy-MM')
                            : entry.weekNum === getWeekOfMonth(new Date(), { weekStartsOn }) && selectedMonth === format(new Date(), 'yyyy-MM');
                          return (
                            <Cell key={i} fill={isCurrent
                              ? 'var(--theme-accent)'
                              : 'color-mix(in srgb, var(--theme-accent) 35%, transparent)'} />
                          );
                        })}
                      </Bar>
                    )
                }
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Company Breakdown ── */}
      {companyChartData.length > 0 && (
        <div className="liquid-glass-card p-5 rounded-[24px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-main/80 font-bold text-sm">{ui.companyBreakdown}</h3>
            {summary.ssoDeduction > 0 && (
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                {lang === 'th' ? 'ยอดหลังหัก ปกส.' : 'After SSO'}
              </span>
            )}
          </div>
          <div className="space-y-3.5">
            {companyChartData.map((c, i) => {
              const baseTotal = summary.incomeAfterSSO > 0 ? summary.incomeAfterSSO : summary.totalGross;
              const pct = baseTotal > 0 ? (c.value / baseTotal) * 100 : 0;
              const stats = companyStatsMap[c.name];
              const job = (settings.jobs || []).find(j => j.name === c.name);
              return (
                <div key={c.name}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{job?.emoji || '🏢'}</span>
                      <span className="text-sm font-bold text-main">{c.name}</span>
                      {c.deductsSSO && (
                        <span className="text-[9px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded font-bold">
                          {lang === 'th' ? 'หัก ปกส.' : 'SSO'}
                        </span>
                      )}
                      {stats && (
                        <span className="text-[10px] text-main/40 font-medium">
                          {stats.shifts} {ui.shiftsUnit} · {stats.hours % 1 === 0 ? stats.hours : stats.hours.toFixed(1)} {ui.hoursUnit}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-main/70">
                        ฿{c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-main/40 ml-1">({pct.toFixed(0)}%)</span>
                      </span>
                      {c.ssoDeduction > 0 && (
                        <div className="text-[10px] text-red-500/80 font-medium">
                          {lang === 'th' 
                            ? `-฿${c.ssoDeduction.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ปกส. (ก่อนหัก ฿${c.grossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                            : `SSO -฿${c.ssoDeduction.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} (Gross ฿${c.grossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-main/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
                      className={`${COMPANY_BG_CLASSES[i % COMPANY_BG_CLASSES.length]} h-2 rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Expenses Summary Box ── */}
      {expensesList.length > 0 && (
        <div className="liquid-glass-card p-5 rounded-[24px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-main/80 font-bold text-sm">{ui.expenseTotal}</h3>
            <span className="text-sm font-bold text-red-500">
              -฿{expensesList.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="space-y-2">
            {expensesList.map(exp => (
              <div 
                key={exp.id} 
                onClick={() => onEditExtraItem && onEditExtraItem(exp)}
                className="flex justify-between items-center p-3 bg-red-500/5 border border-red-500/10 rounded-xl cursor-pointer hover:bg-red-500/10 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-main">{exp.title}</p>
                  <p className="text-[10px] text-main/50 mt-0.5">{format(new Date(exp.start), 'd MMM yyyy', { locale: th })}</p>
                </div>
                <span className="text-sm font-bold text-red-500">
                  -฿{(Number(exp.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 12-Month Historical Analytics Section ── */}
      <div className="liquid-glass-card p-5 rounded-[28px] space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[11px] font-bold mb-1 border border-primary-500/15">
              <TrendingUp size={12} />
              <span>{ui.incomeAnalytics}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-main tracking-tight">
              {ui.last12Months}
            </h3>
            <p className="text-main/60 text-xs mt-0.5">
              {ui.last12MonthsSub}
            </p>
          </div>

          {/* Bar / Line toggle */}
          <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-1 border border-black/5 dark:border-white/5 shrink-0">
            <button 
              type="button"
              onClick={() => setChart12mType('bar')} 
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${chart12mType === 'bar' ? 'bg-white dark:bg-white/20 text-primary-500 dark:text-white shadow-sm' : 'text-main/60 dark:text-white/60 hover:text-main'}`}
            >
              {ui.bar}
            </button>
            <button 
              type="button"
              onClick={() => setChart12mType('line')} 
              className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${chart12mType === 'line' ? 'bg-white dark:bg-white/20 text-primary-500 dark:text-white shadow-sm' : 'text-main/60 dark:text-white/60 hover:text-main'}`}
            >
              {ui.line}
            </button>
          </div>
        </div>

        {/* 3 Summary KPIs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Total 12M */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 dark:from-primary-500/15 dark:to-primary-900/10 border border-primary-500/20">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-primary-600 dark:text-primary-300 mb-1">
              <Banknote size={12} className="flex-shrink-0" />
              <span className="truncate">{ui.total12M}</span>
            </div>
            <div className="text-sm sm:text-base font-black text-main tracking-tight truncate">
              ฿{chart12mStats.total.toLocaleString()}
            </div>
            <div className="text-[10px] text-main/50 font-medium truncate mt-0.5">
              {chart12mStats.activeCount} {ui.activeMos}
            </div>
          </div>

          {/* Avg / Month */}
          <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-main/70 mb-1">
              <TrendingUp size={12} className="text-primary-500 flex-shrink-0" />
              <span className="truncate">{ui.avgPerMonth}</span>
            </div>
            <div className="text-sm sm:text-base font-black text-main tracking-tight truncate">
              ฿{chart12mStats.avg.toLocaleString()}
            </div>
            <div className="text-[10px] text-main/50 font-medium truncate mt-0.5">
              {ui.perActiveMo}
            </div>
          </div>

          {/* Peak Month */}
          <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
              <Award size={12} className="flex-shrink-0" />
              <span className="truncate">{ui.peakMonth}</span>
            </div>
            <div className="text-sm sm:text-base font-black text-main tracking-tight truncate">
              {chart12mStats.peakMonth ? `฿${chart12mStats.peakMonth.income.toLocaleString()}` : '-'}
            </div>
            <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium truncate mt-0.5">
              {chart12mStats.peakMonth ? chart12mStats.peakMonth.name : ui.noData}
            </div>
          </div>
        </div>

        {/* 12-Month Chart */}
        <div className="p-3 sm:p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
          <div className="h-[210px] sm:h-[240px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              {chart12mType === 'bar' ? (
                <BarChart data={fullChartData} margin={{ top: 20, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incTab12mBarPeak" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="incTab12mBarActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--theme-accent, #ec4899)" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="var(--theme-accent, #ec4899)" stopOpacity={0.65} />
                    </linearGradient>
                    <linearGradient id="incTab12mBarZero" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--theme-accent, #ec4899)" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="var(--theme-accent, #ec4899)" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,100,120,0.08)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9.5, fill: 'var(--color-text-main)', opacity: 0.75, fontWeight: 'bold' }} 
                    dy={8} 
                    interval={0} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, chart12mStats.maxIncome > 0 ? 'auto' : 1000]}
                    ticks={chart12mStats.maxIncome === 0 ? [0, 500, 1000] : undefined}
                    tick={{ fontSize: 9.5, fill: 'var(--color-text-main)', opacity: 0.6 }} 
                    tickFormatter={(value) => { 
                      if (value === 0) return '0'; 
                      const abs = Math.abs(value); 
                      return (value < 0 ? '-' : '') + '฿' + (abs >= 1000 ? (abs/1000).toFixed(abs % 1000 === 0 ? 0 : 1) + 'k' : abs); 
                    }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0]?.payload;
                      const isPeak = item && item.income > 0 && item.income === chart12mStats.maxIncome;
                      return (
                        <div className="liquid-glass-card px-3.5 py-2 rounded-xl shadow-xl border border-white/20 dark:border-white/10 text-xs">
                          <div className="font-bold text-main flex items-center gap-1 mb-1">
                            <span>{item?.fullName || label}</span>
                            {isPeak && <span className="text-amber-500 font-black">🏆 ({ui.peak})</span>}
                          </div>
                          <div className="text-primary-500 font-black text-sm">
                            ฿{(payload[0].value || 0).toLocaleString()}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="income" 
                    radius={[6, 6, 2, 2]} 
                    maxBarSize={28}
                    minPointSize={5}
                  >
                    <LabelList 
                      dataKey="income" 
                      position="top" 
                      content={(props) => {
                        const { x, y, width, value } = props;
                        if (!value || value === 0) return null;
                        const isPeak = value === chart12mStats.maxIncome;
                        const formatted = value >= 1000 
                          ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` 
                          : `${value}`;
                        return (
                          <text 
                            x={x + width / 2} 
                            y={y - 5} 
                            fill={isPeak ? '#8b5cf6' : 'var(--color-text-main, #64748b)'} 
                            textAnchor="middle" 
                            fontSize="8.5" 
                            fontWeight={isPeak ? "800" : "600"} 
                            opacity={isPeak ? 1 : 0.75}
                          >
                            {formatted}
                          </text>
                        );
                      }}
                    />
                    {fullChartData.map((entry, index) => {
                      const isPeak = entry.income > 0 && entry.income === chart12mStats.maxIncome;
                      const fillUrl = isPeak 
                        ? 'url(#incTab12mBarPeak)' 
                        : entry.income > 0 
                          ? 'url(#incTab12mBarActive)' 
                          : 'url(#incTab12mBarZero)';
                      return <Cell key={`cell-12m-${index}`} fill={fillUrl} />;
                    })}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={fullChartData} margin={{ top: 20, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incTab12mLineArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--theme-accent, #ec4899)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--theme-accent, #ec4899)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,100,120,0.08)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9.5, fill: 'var(--color-text-main)', opacity: 0.75, fontWeight: 'bold' }} 
                    dy={8} 
                    interval={0} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, chart12mStats.maxIncome > 0 ? 'auto' : 1000]}
                    ticks={chart12mStats.maxIncome === 0 ? [0, 500, 1000] : undefined}
                    tick={{ fontSize: 9.5, fill: 'var(--color-text-main)', opacity: 0.6 }} 
                    tickFormatter={(value) => { 
                      if (value === 0) return '0'; 
                      const abs = Math.abs(value); 
                      return (value < 0 ? '-' : '') + '฿' + (abs >= 1000 ? (abs/1000).toFixed(abs % 1000 === 0 ? 0 : 1) + 'k' : abs); 
                    }} 
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0]?.payload;
                      const isPeak = item && item.income > 0 && item.income === chart12mStats.maxIncome;
                      return (
                        <div className="liquid-glass-card px-3.5 py-2 rounded-xl shadow-xl border border-white/20 dark:border-white/10 text-xs">
                          <div className="font-bold text-main flex items-center gap-1 mb-1">
                            <span>{item?.fullName || label}</span>
                            {isPeak && <span className="text-amber-500 font-black">🏆 ({ui.peak})</span>}
                          </div>
                          <div className="text-primary-500 font-black text-sm">
                            ฿{(payload[0].value || 0).toLocaleString()}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="var(--theme-accent, #ec4899)" 
                    strokeWidth={3} 
                    fill="url(#incTab12mLineArea)" 
                    dot={(dotProps) => {
                      const { cx, cy, payload } = dotProps;
                      if (!payload || payload.income <= 0) return null;
                      const isPeak = payload.income === chart12mStats.maxIncome;
                      return (
                        <circle 
                          key={`dot-${cx}-${cy}`}
                          cx={cx} 
                          cy={cy} 
                          r={isPeak ? 5 : 3.5} 
                          fill={isPeak ? '#8b5cf6' : 'var(--theme-accent, #ec4899)'} 
                          stroke="#fff" 
                          strokeWidth={2} 
                        />
                      );
                    }} 
                    activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} 
                  >
                    <LabelList 
                      dataKey="income" 
                      position="top" 
                      content={(props) => {
                        const { x, y, value } = props;
                        if (!value || value === 0) return null;
                        const isPeak = value === chart12mStats.maxIncome;
                        const formatted = value >= 1000 
                          ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` 
                          : `${value}`;
                        return (
                          <text 
                            x={x} 
                            y={y - 8} 
                            fill={isPeak ? '#8b5cf6' : 'var(--color-text-main, #64748b)'} 
                            textAnchor="middle" 
                            fontSize="8.5" 
                            fontWeight={isPeak ? "800" : "600"} 
                            opacity={isPeak ? 1 : 0.75}
                          >
                            {formatted}
                          </text>
                        );
                      }}
                    />
                  </Area>
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Breakdown List */}
        {chart12mStats.breakdown.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-main flex items-center gap-1.5">
                <CalendarIcon size={14} className="text-primary-500" />
                <span>{ui.monthlyBreakdown}</span>
              </h4>
              <span className="text-[11px] text-main/50 font-medium">
                {lang === 'en' ? `${chart12mStats.breakdown.length} active months` : `พบข้อมูล ${chart12mStats.breakdown.length} เดือน`}
              </span>
            </div>

            <div className="space-y-2">
              {chart12mStats.breakdown.map((item, idx) => {
                const isPeak = item.income === chart12mStats.maxIncome;
                const isCurrentSelected = item.key === selectedMonth;
                const pct = chart12mStats.maxIncome > 0 ? Math.round((item.income / chart12mStats.maxIncome) * 100) : 0;
                return (
                  <div 
                    key={item.key || idx}
                    onClick={() => {
                      setSelectedMonth(item.key);
                      setSelectedCompany(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                      isCurrentSelected
                        ? 'ring-2 ring-primary-500 bg-primary-500/10 dark:bg-primary-500/20'
                        : isPeak 
                          ? 'bg-primary-500/10 dark:bg-primary-500/15 border border-primary-500/25' 
                          : 'bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    {/* Month Name */}
                    <div className="w-14 sm:w-16 flex-shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-main flex items-center gap-1">
                        {item.name}
                        {isCurrentSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                      </div>
                      {isPeak && (
                        <span className="inline-block text-[9px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
                          ★ {ui.peak}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPeak 
                              ? 'bg-gradient-to-r from-violet-500 to-primary-500' 
                              : 'bg-primary-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-xs sm:text-sm font-black ${isPeak ? 'text-primary-600 dark:text-primary-400' : 'text-main'}`}>
                        ฿{item.income.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-main/50 font-medium">
                        {pct}% {ui.ofPeak}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Comparison Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: ui.compareLast, amount: comparison.lastMonth, change: comparison.lastMonthChange },
          { label: ui.average6, amount: comparison.avg6Months, change: comparison.avgChange }
        ].map(item => {
          const isUp = item.change > 0;
          const isFlat = item.change === 0;
          const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
          return (
            <div key={item.label} className="liquid-glass-card p-4 rounded-[20px]">
              <p className="text-main/50 text-xs font-bold mb-1">{item.label}</p>
              <p className="text-main font-black text-base">฿{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 px-2 py-1 w-fit rounded-lg
                ${isUp ? 'bg-green-500/10 text-green-500' : isFlat ? 'bg-main/5 text-main/40' : 'bg-red-500/10 text-red-500'}`}>
                <Icon size={10} />
                {Math.abs(item.change).toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Shift List Header + Filter ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <button 
            onClick={() => setIsShiftListCollapsed(!isShiftListCollapsed)}
            className="flex items-center gap-2 active:scale-[0.98] transition-transform text-left"
          >
            <h3 className="text-main/80 font-bold text-sm">{ui.shiftList}</h3>
            <span className="text-main/40 text-xs">{filteredShifts.length} {ui.records}</span>
            <div className="p-1 rounded-full bg-black/5 dark:bg-white/5 ml-1">
              {isShiftListCollapsed ? <ChevronDown size={14} className="text-main/60" /> : <ChevronUp size={14} className="text-main/60" />}
            </div>
          </button>
          {selectedCompany && (
            <button
              onClick={() => setSelectedCompany(null)}
              className="flex items-center gap-1 text-[11px] font-bold bg-primary-500/10 text-primary-500 px-2.5 py-1 rounded-full hover:bg-primary-500/20 transition-colors"
            >
              <X size={11} />
              {selectedCompany}
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {!isShiftListCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {/* Company Filter Pills */}
              {companies.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 snap-x hide-scrollbar -mx-1 px-1">
                  {companies.map((name, i) => {
                    const job = (settings.jobs || []).find(j => j.name === name);
                    const isActive = selectedCompany === name;
                    return (
                      <button
                        key={name}
                        onClick={() => setSelectedCompany(isActive ? null : name)}
                        className={`snap-start flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                          ${isActive
                            ? `${COMPANY_BG_CLASSES[i % COMPANY_BG_CLASSES.length]} text-white border-transparent shadow-md scale-105`
                            : 'bg-white/30 dark:bg-white/5 border-white/30 dark:border-white/10 text-main/60 hover:bg-white/50 dark:hover:bg-white/10'}`}
                      >
                        <span>{job?.emoji || '🏢'}</span>
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Shift cards */}
              <div className="space-y-4">
                {groupedShifts.length === 0 ? (
                  <div className="liquid-glass-card rounded-[24px] p-8 text-center flex flex-col items-center">
                    <CalendarIcon className="w-12 h-12 text-main/20 mb-3" />
                    <p className="text-main/60 font-bold text-sm">{ui.noMonthData}</p>
                  </div>
                ) : (
                  groupedShifts.map(group => (
                    <div key={group.weekNum} className="space-y-2.5">
                      {/* Group Header */}
                      <div className="flex items-center justify-between px-2 pt-1 pb-1">
                        <h4 className="text-main/60 font-bold text-xs">{group.label}</h4>
                        {group.totalEarnings > 0 && (
                          <span className="text-main/50 font-bold text-xs">
                            ฿{group.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      {group.tasks.map(task => {
                        const isCompleted = task.status === TASK_STATUS.DONE || (task.actualStart && task.actualEnd);
                        let earnings = 0, hours = 0;
                        if (task.isExpense) {
                          earnings = -(Number(task.amount) || 0);
                        } else if (task.isExtraIncome) {
                          earnings = Number(task.amount) || 0;
                        } else {
                          hours = task.actualStart && task.actualEnd
                            ? (new Date(task.actualEnd) - new Date(task.actualStart)) / 3600000
                            : (new Date(task.end) - new Date(task.start)) / 3600000;
                          hours = Math.max(0, hours - (Number(task.breakHours) || 0));
                          if (task.rateType === RATE_TYPE.DAILY) earnings = Number(task.hourlyRate) || 0;
                          else if (hours > 0) earnings = hours * (Number(task.hourlyRate) || 0);
                          if (task.isHolidayPay) earnings *= 2;
                        }
                        const taskDate = new Date(task.start);
                        const isFuture = taskDate > new Date() && !isCompleted;
                        return (
                          <SwipeableRow key={task.id} onDelete={() => setDeleteConfirmTask(task)}>
                            <motion.div
                              onClick={() => {
                                if ((task.isExpense || task.isExtraIncome) && onEditExtraItem) {
                                  onEditExtraItem(task);
                                }
                              }}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`liquid-glass-card rounded-[20px] p-4 flex items-start gap-3.5 transition-all ${(task.isExpense || task.isExtraIncome) ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : ''} ${isFuture ? 'opacity-50' : ''}`}
                            >
                              {/* Left icon */}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                task.isExpense ? 'bg-red-500/10 text-red-500' :
                                task.isExtraIncome ? 'bg-green-500/10 text-green-500' :
                                isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-primary-500/15 text-primary-500'
                              }`}>
                                {task.isExtraIncome ? <Banknote size={18} /> : (isCompleted || task.isExpense ? <CheckCircle2 size={18} /> : <Clock size={18} />)}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className="font-bold text-main text-sm truncate">{task.title}</h4>
                                  {/* Status badge */}
                                  {!task.isExpense && !task.isExtraIncome && (
                                    <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                      ${isCompleted ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                        : isFuture ? 'bg-main/10 text-main/40'
                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
                                      {isCompleted ? '✓ เสร็จ' : isFuture ? 'รอทำ' : 'ค้างอยู่'}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-main/50">
                                  {format(taskDate, 'EEEEที่ d MMMM', { locale: th })}
                                </p>

                                {!task.isExpense && !task.isExtraIncome && (
                                  <p className="text-xs text-main/40 mt-0.5">
                                    ⏱ {format(taskDate, 'HH:mm')}–{format(new Date(task.end), 'HH:mm')}
                                    {hours > 0 && ` · ${hours % 1 === 0 ? hours : hours.toFixed(1)} ชม.`}
                                    {task.isHolidayPay && ' · วันหยุด x2 🎉'}
                                  </p>
                                )}

                                {/* Notes */}
                                {task.description && (
                                  <p className="text-xs text-main/40 mt-1 flex items-start gap-1">
                                    <span className="mt-0.5">📝</span>
                                    <span className="truncate">{task.description}</span>
                                  </p>
                                )}
                              </div>

                              {/* Earnings */}
                              <div className="shrink-0 text-right mt-0.5">
                                <p className={`font-black text-sm ${
                                  task.isExpense ? 'text-red-500' :
                                  isCompleted ? 'text-green-500' : 'text-amber-500'
                                }`}>
                                  {task.isExpense ? '-' : '+'}฿{Math.abs(earnings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                            </motion.div>
                          </SwipeableRow>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirmTask}
        title="ยืนยันการลบ"
        message={`ลบรายการ '${deleteConfirmTask?.title}' ใช่ไหม?`}
        confirmText="ลบ"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmTask(null)}
      />
    </motion.div>
  );
}
