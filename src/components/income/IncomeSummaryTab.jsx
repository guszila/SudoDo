import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  format, subMonths, getDaysInMonth
} from 'date-fns';
import { th } from 'date-fns/locale';
import {
  CheckCircle2, Clock, Calendar as CalendarIcon,
  ArrowDown, ArrowUp, CalendarOff, ChevronDown, ChevronUp, Banknote
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

import SwipeableRow from '../common/SwipeableRow';
import ConfirmDialog from '../common/ConfirmDialog';
import { useTasks } from '../../contexts/TasksContext';
import { useToast } from '../../contexts/ToastContext';
import { useSettings } from '../../contexts/SettingsContext';
import { TASK_STATUS, RATE_TYPE } from '../../constants';
import { saveTask } from '../../services/taskService';
import { calcSSO } from '../../utils/socialSecurity';

const COMPANY_COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6'];
const COMPANY_BG_CLASSES = ['bg-blue-500', 'bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'];

export default function IncomeSummaryTab({ user, lang = 'th' }) {
  const { tasks: allTasks } = useTasks();
  const { showToast } = useToast();
  const { settings } = useSettings();

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

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
    setIsDeleting(true);
    await saveTask('DELETE', { id: taskToDelete.id }, user.uid);
    setIsDeleting(false);
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

    let latestDay = 1;
    const now = new Date();
    if (selectedMonth === format(now, 'yyyy-MM')) {
      latestDay = now.getDate();
    } else {
      for (let i = daysInMonth; i >= 1; i--) {
        if (dailyIncomeMap[i].income !== 0) { latestDay = i; break; }
      }
    }

    const chartArr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      if (dailyIncomeMap[i].income !== 0) {
        chartArr.push({ day: i.toString(), fullDay: i, ...dailyIncomeMap[i] });
      }
    }

    const companyChartData = Object.entries(companyIncomeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Comparison
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
      chartData: chartArr, latestDay,
      shiftsList: shiftsInMonth,
      comparison: {
        lastMonth: lastMonthIncome,
        lastMonthChange: getChange(netIncome, lastMonthIncome),
        avg6Months: avg6,
        avgChange: getChange(netIncome, avg6)
      }
    };
  }, [partTimeTasks, selectedMonth, settings]);

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

  if (isDeleting) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Month Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x hide-scrollbar">
        {monthsList.map(mStr => (
          <button
            key={mStr}
            onClick={() => setSelectedMonth(mStr)}
            className={`snap-start whitespace-nowrap px-5 py-2.5 rounded-full text-sm flex-shrink-0 border font-bold transition-all ${
              selectedMonth === mStr
                ? 'bg-primary-500/20 border-primary-500/50 text-primary-600 dark:text-primary-300'
                : 'bg-white/30 dark:bg-black/30 border-white/40 dark:border-white/10 text-main/60 hover:bg-white/50 dark:hover:bg-white/10'
            }`}
          >
            {formatThMonth(mStr)}
          </button>
        ))}
      </div>

      {/* Monthly Summary Hero Card */}
      <div className="bg-primary-50 dark:bg-primary-900/40 rounded-[24px] shadow-[0_8px_32px_rgba(124,99,255,0.12)] p-6 relative overflow-hidden border border-primary-500/10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 dark:bg-primary-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/4" />
        <p className="text-primary-600 dark:text-primary-300 font-bold text-sm mb-1 relative z-10">
          {formatFullThMonth(selectedMonth)} · รวม
        </p>
        <h2 className="text-primary-700 dark:text-primary-100 text-[32px] font-black mb-2 tracking-tight relative z-10">
          ฿{summary.netIncome.toLocaleString()}
        </h2>
        {summary.ssoDeduction > 0 && (
          <div className="flex items-center gap-2 mb-4 relative z-10">
            <span className="text-sm font-bold text-red-500">-฿{summary.ssoDeduction.toLocaleString()}</span>
            <span className="text-xs text-primary-600/80 dark:text-primary-300/80 font-medium">(หักประกันสังคม 5%)</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 relative z-10 cursor-pointer" onClick={() => setShowBreakdown(!showBreakdown)}>
          {[
            { label: 'กะทำงาน', value: `${summary.shiftCount} กะ` },
            { label: 'ชั่วโมงรวม', value: `${summary.totalHours.toFixed(1).replace('.0', '')} ชม.` }
          ].map(item => (
            <div key={item.label} className="bg-white/70 dark:bg-black/30 rounded-[16px] p-4 border border-white/50 dark:border-white/5">
              <div className="flex justify-between items-center mb-1">
                <p className="text-primary-600 dark:text-primary-400 text-[12px] font-bold">{item.label}</p>
                {companyChartData.length > 1 && (showBreakdown ? <ChevronUp size={14} className="text-primary-500/50" /> : <ChevronDown size={14} className="text-primary-500/50" />)}
              </div>
              <p className="text-primary-700 dark:text-primary-100 text-[18px] font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Bar Chart */}
      {chartData.length === 0 ? (
        <div className="h-[140px] flex flex-col items-center justify-center liquid-glass-card rounded-[20px]">
          <CalendarOff className="w-8 h-8 text-primary-500/40 mb-2" />
          <p className="text-main/50 text-sm font-bold">ไม่มีข้อมูลเดือนนี้</p>
        </div>
      ) : (
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontWeight: 'bold' }} dy={8} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              {companyChartData.length > 1
                ? companyChartData.map((c, i) => (
                    <Bar key={c.name} dataKey={c.name} stackId="a"
                      fill={COMPANY_COLORS[i % COMPANY_COLORS.length]} maxBarSize={40}
                      radius={i === 0 ? [0,0,4,4] : i === companyChartData.length - 1 ? [4,4,0,0] : [0,0,0,0]} />
                  ))
                : (
                    <Bar dataKey="income" radius={[4,4,4,4]} maxBarSize={40}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fullDay === new Date().getDate() ? 'var(--theme-accent)' : 'var(--theme-accent-border)'} />
                      ))}
                    </Bar>
                  )
              }
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Company Breakdown */}
      {companyChartData.length > 1 && (
        <div className="liquid-glass-card p-5">
          <h3 className="text-main/80 font-bold text-sm mb-4">สัดส่วนรายได้ตามบริษัท</h3>
          <div className="space-y-4">
            {companyChartData.map((c, i) => {
              const pct = summary.totalGross > 0 ? (c.value / summary.totalGross) * 100 : 0;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-main">{c.name}</span>
                    <span className="text-main/70">฿{c.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-main/10 rounded-full h-2.5 overflow-hidden">
                    <div className={`${COMPANY_BG_CLASSES[i % COMPANY_BG_CLASSES.length]} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'เทียบเดือนที่แล้ว', amount: comparison.lastMonth, change: comparison.lastMonthChange },
          { label: 'เฉลี่ย 6 เดือน', amount: comparison.avg6Months, change: comparison.avgChange }
        ].map(item => (
          <div key={item.label} className="liquid-glass-card p-4">
            <p className="text-main/60 text-xs font-bold mb-1">{item.label}</p>
            <p className="text-main font-bold">฿{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 px-2 py-1 w-fit rounded-md ${item.change >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {item.change >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {Math.abs(item.change).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* Shift List */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-main/80 font-bold text-sm">รายการกะงาน</h3>
          <span className="text-main/50 text-xs">{shiftsList.length} รายการ</span>
        </div>
        <div className="space-y-3">
          {shiftsList.length === 0 ? (
            <div className="liquid-glass-card rounded-[24px] p-8 text-center flex flex-col items-center">
              <CalendarIcon className="w-12 h-12 text-main/20 mb-3" />
              <p className="text-main/60 font-bold text-sm">ไม่มีข้อมูลเดือนนี้</p>
            </div>
          ) : (
            shiftsList.map(task => {
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
                  <div className={`liquid-glass-card rounded-[20px] p-4 flex items-center gap-4 transition-all ${isFuture ? 'opacity-50' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      task.isExpense ? 'bg-red-500/10 text-red-500' :
                      task.isExtraIncome ? 'bg-green-500/10 text-green-500' :
                      isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-primary-500/20 text-primary-500'
                    }`}>
                      {task.isExtraIncome ? <Banknote size={20} /> : (isCompleted || task.isExpense ? <CheckCircle2 size={20} /> : <Clock size={20} />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-main text-sm truncate">{task.title}</h4>
                      <p className="text-xs text-main/50 mt-1 truncate">
                        {format(taskDate, 'd MMM', { locale: th })}
                        {!task.isExpense && !task.isExtraIncome && ` · ${format(taskDate, 'HH:mm')}–${format(new Date(task.end), 'HH:mm')} · ${hours.toFixed(1).replace('.0', '')} ชม.`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-bold text-sm ${task.isExpense ? 'text-red-500' : isCompleted ? 'text-green-500' : 'text-primary-500'}`}>
                        {task.isExpense ? '' : '+'}฿{Math.abs(earnings).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </SwipeableRow>
              );
            })
          )}
        </div>
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
