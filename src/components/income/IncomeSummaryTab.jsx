import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths, getDaysInMonth, getWeekOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  CheckCircle2, Clock, Calendar as CalendarIcon,
  ArrowDown, ArrowUp, CalendarOff, Banknote, SlidersHorizontal, X,
  TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

export default function IncomeSummaryTab({ user, lang = 'th' }) {
  const { tasks: allTasks } = useTasks();
  const { showToast } = useToast();
  const { settings } = useSettings();

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null); // null = all
  const [isShiftListCollapsed, setIsShiftListCollapsed] = useState(false);

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

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTask) return;
    const taskToDelete = { ...deleteConfirmTask };
    setDeleteConfirmTask(null);
    await saveTask('DELETE', { id: taskToDelete.id }, user.uid);
    showToast('ลบเรียบร้อยแล้ว', {
      duration: 5000,
      onUndo: async () => { await saveTask('ADD', taskToDelete, user.uid); }
    });
  };

  const { summary, chartData, shiftsList, comparison, companyChartData, companyStatsMap } = useMemo(() => {
    const targetDate = new Date(`${selectedMonth}-01T00:00:00`);
    const daysInMonth = getDaysInMonth(targetDate);

    let totalIncome = 0, ssoGross = 0, shiftCount = 0, totalHours = 0;
    const shiftsInMonth = [];
    const companyIncomeMap = {};
    const companyStatsMap = {};
    const dailyIncomeMap = {};
    for (let i = 1; i <= daysInMonth; i++) dailyIncomeMap[i] = { income: 0 };

    partTimeTasks.forEach(t => {
      const taskDate = new Date(t.start);
      if (format(taskDate, 'yyyy-MM') !== selectedMonth) return;
      shiftsInMonth.push(t);

      const isDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      let hours = 0, earnings = 0;

      if (t.isExpense) {
        earnings = -(Number(t.amount) || 0);
        if (isDone) totalIncome += earnings;
      } else if (t.isExtraIncome) {
        earnings = Number(t.amount) || 0;
        if (isDone) {
          totalIncome += earnings;
          const n = t.title || 'อื่นๆ';
          companyIncomeMap[n] = (companyIncomeMap[n] || 0) + earnings;
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

          totalIncome += earnings;
          shiftCount++;
          totalHours += hours;

          const job = (settings.jobs || []).find(j => j.name === t.title);
          if ((job?.deductSSO !== undefined ? job.deductSSO : settings.socialSecurity)) ssoGross += earnings;

          const n = t.title || 'อื่นๆ';
          companyIncomeMap[n] = (companyIncomeMap[n] || 0) + earnings;
          if (!companyStatsMap[n]) companyStatsMap[n] = { shifts: 0, hours: 0 };
          companyStatsMap[n].shifts++;
          companyStatsMap[n].hours += hours;
        }
      }

      if (isDone) {
        const day = taskDate.getDate();
        if (dailyIncomeMap[day]) {
          dailyIncomeMap[day].income += earnings;
          if (!t.isExpense) {
            const n = t.title || 'อื่นๆ';
            dailyIncomeMap[day][n] = (dailyIncomeMap[day][n] || 0) + earnings;
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

    const companyChartData = Object.entries(companyIncomeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

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

    const totalGross = Math.max(0, totalIncome);
    let ssoDeduction = 0, netIncome = totalGross;
    if (ssoGross > 0 && settings.showInIncome) {
      ssoDeduction = calcSSO(ssoGross).deduction;
      netIncome = totalGross - ssoDeduction;
    }

    return {
      summary: { totalGross, ssoDeduction, netIncome, shiftCount, totalHours },
      companyChartData, companyStatsMap,
      chartData: chartArr,
      shiftsList: shiftsInMonth,
      comparison: {
        lastMonth: lastMonthIncome,
        lastMonthChange: getChange(netIncome, lastMonthIncome),
        avg6Months: avg6,
        avgChange: getChange(netIncome, avg6)
      }
    };
  }, [partTimeTasks, selectedMonth, settings]);

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
      const weekNum = getWeekOfMonth(taskDate, { weekStartsOn: 1 });
      
      const startD = startOfWeek(taskDate, { weekStartsOn: 1 });
      const endD = endOfWeek(taskDate, { weekStartsOn: 1 });
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
  }, [filteredShifts]);

  const formatThMonth = (s) => {
    const d = new Date(`${s}-01`);
    return `${format(d, 'MMM', { locale: th })} ${(d.getFullYear() + 543).toString().slice(-2)}`;
  };
  const formatFullThMonth = (s) => {
    const d = new Date(`${s}-01`);
    return `${format(d, 'MMMM', { locale: th })} ${d.getFullYear() + 543}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="liquid-glass-card px-3 py-2 rounded-xl shadow-lg text-sm">
        <p className="text-primary-500 font-bold">฿{payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
      </div>
    );
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
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x hide-scrollbar">
        {monthsList.map(mStr => (
          <button
            key={mStr}
            onClick={() => { setSelectedMonth(mStr); setSelectedCompany(null); }}
            className={`snap-start whitespace-nowrap px-5 py-2.5 rounded-full text-sm flex-shrink-0 border font-bold transition-all ${
              selectedMonth === mStr
                ? 'bg-primary-500/20 border-primary-500/50 text-primary-600 dark:text-primary-300 scale-105'
                : 'bg-white/30 dark:bg-black/30 border-white/40 dark:border-white/10 text-main/60 hover:bg-white/50 dark:hover:bg-white/10'
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
          <p className="text-white/70 text-xs font-bold mb-1">{formatFullThMonth(selectedMonth)} · รายได้สุทธิ</p>
          <motion.h2
            key={summary.netIncome}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-[36px] font-black tracking-tight leading-none mb-1"
          >
            ฿{summary.netIncome.toLocaleString()}
          </motion.h2>

          {summary.ssoDeduction > 0 && (
            <p className="text-white/60 text-xs font-medium mb-4">
              หักประกันสังคม ฿{summary.ssoDeduction.toLocaleString()} · รวม ฿{summary.totalGross.toLocaleString()}
            </p>
          )}

          {/* 4-stat grid */}
          <div className="grid grid-cols-4 gap-1.5 mt-5">
            {[
              { label: 'กะงาน', value: `${summary.shiftCount}` },
              { label: 'ชั่วโมง', value: `${summary.totalHours % 1 === 0 ? summary.totalHours : summary.totalHours.toFixed(1)}` },
              { label: '฿/กะ', value: `${avgPerShift.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
              { label: '฿/ชม.', value: `${avgPerHour.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
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
        <p className="text-main/60 text-xs font-bold mb-3">รายได้รายวัน (เดือนนี้)</p>
        {chartData.length === 0 ? (
          <div className="h-[100px] flex flex-col items-center justify-center">
            <CalendarOff className="w-7 h-7 text-primary-500/30 mb-2" />
            <p className="text-main/40 text-xs font-bold">ยังไม่มีรายการที่เสร็จแล้ว</p>
          </div>
        ) : (
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,100,120,0.08)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: 'rgba(100,100,120,0.7)', fontWeight: 'bold' }} dy={6} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: 'rgba(100,100,120,0.7)', fontWeight: 'bold' }}
                  tickFormatter={(value) => value > 0 ? `฿${value >= 1000 ? (value/1000) + 'k' : value}` : '0'} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                {companyChartData.length > 1
                  ? companyChartData.map((c, i) => (
                      <Bar key={c.name} dataKey={c.name} stackId="a"
                        fill={COMPANY_COLORS[i % COMPANY_COLORS.length]} maxBarSize={36}
                        radius={i === 0 ? [0,0,4,4] : i === companyChartData.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
                    ))
                  : (
                      <Bar dataKey="income" radius={[6,6,6,6]} maxBarSize={36}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fullDay === new Date().getDate()
                            ? 'var(--theme-accent)'
                            : 'color-mix(in srgb, var(--theme-accent) 35%, transparent)'} />
                        ))}
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
          <h3 className="text-main/80 font-bold text-sm mb-4">สัดส่วนตามบริษัท</h3>
          <div className="space-y-3.5">
            {companyChartData.map((c, i) => {
              const pct = summary.totalGross > 0 ? (c.value / summary.totalGross) * 100 : 0;
              const stats = companyStatsMap[c.name];
              const job = (settings.jobs || []).find(j => j.name === c.name);
              return (
                <div key={c.name}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{job?.emoji || '🏢'}</span>
                      <span className="text-sm font-bold text-main">{c.name}</span>
                      {stats && (
                        <span className="text-[10px] text-main/40 font-medium">
                          {stats.shifts} กะ · {stats.hours % 1 === 0 ? stats.hours : stats.hours.toFixed(1)} ชม.
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-main/70">
                      ฿{c.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <span className="text-main/40 ml-1">({pct.toFixed(0)}%)</span>
                    </span>
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

      {/* ── Comparison Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'เทียบเดือนที่แล้ว', amount: comparison.lastMonth, change: comparison.lastMonthChange },
          { label: 'เฉลี่ย 6 เดือน', amount: comparison.avg6Months, change: comparison.avgChange }
        ].map(item => {
          const isUp = item.change > 0;
          const isFlat = item.change === 0;
          const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
          return (
            <div key={item.label} className="liquid-glass-card p-4 rounded-[20px]">
              <p className="text-main/50 text-xs font-bold mb-1">{item.label}</p>
              <p className="text-main font-black text-base">฿{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
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
            <h3 className="text-main/80 font-bold text-sm">รายการกะงาน</h3>
            <span className="text-main/40 text-xs">{filteredShifts.length} รายการ</span>
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
                    <p className="text-main/60 font-bold text-sm">ไม่มีข้อมูลเดือนนี้</p>
                  </div>
                ) : (
                  groupedShifts.map(group => (
                    <div key={group.weekNum} className="space-y-2.5">
                      {/* Group Header */}
                      <div className="flex items-center justify-between px-2 pt-1 pb-1">
                        <h4 className="text-main/60 font-bold text-xs">{group.label}</h4>
                        {group.totalEarnings > 0 && (
                          <span className="text-main/50 font-bold text-xs">
                            ฿{group.totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                        const job = (settings.jobs || []).find(j => j.name === task.title);
                        const jobColorIdx = companyChartData.findIndex(c => c.name === task.title);
                        const dotColor = COMPANY_COLORS[jobColorIdx >= 0 ? jobColorIdx % COMPANY_COLORS.length : 0];

                        return (
                          <SwipeableRow key={task.id} onDelete={() => setDeleteConfirmTask(task)}>
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`liquid-glass-card rounded-[20px] p-4 flex items-start gap-3.5 transition-all ${isFuture ? 'opacity-50' : ''}`}
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
                                  {task.isExpense ? '-' : '+'}฿{Math.abs(earnings).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
