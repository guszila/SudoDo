import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  format, subMonths, isSameMonth, getDaysInMonth, 
  isSameDay, startOfMonth, endOfMonth, isBefore, endOfDay 
} from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  ArrowLeft, CheckCircle2, Clock, Calendar as CalendarIcon, ArrowDown, ArrowUp, CalendarOff
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

import { useTasks } from '../contexts/TasksContext';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { TASK_STATUS, RATE_TYPE } from '../constants';
import { saveTask } from '../services/taskService';
import { calcSSO } from '../utils/socialSecurity';
import SwipeableRow from '../components/SwipeableRow';
import ConfirmDialog from '../components/ConfirmDialog';

export default function IncomeHistoryPage({ user, lang = 'th' }) {
  const navigate = useNavigate();
  const { tasks: allTasks, isLoading } = useTasks();
  const { showToast } = useToast();
  const { settings } = useSettings();
  
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const partTimeTasks = useMemo(() => {
    return allTasks.filter(t => t.isPartTime).sort((a, b) => new Date(b.start) - new Date(a.start));
  }, [allTasks]);

  // Generate months array for pills (only months with data + current month)
  const monthsList = useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(format(new Date(), 'yyyy-MM')); // always include current month
    
    partTimeTasks.forEach(t => {
      if (t.start) {
        monthsSet.add(format(new Date(t.start), 'yyyy-MM'));
      }
    });
    
    return Array.from(monthsSet).sort().reverse();
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
      onUndo: async () => {
        await saveTask('ADD', taskToDelete, user.uid);
      }
    });
  };

  // Compute all data
  const { 
    summary, 
    chartData, 
    latestDay,
    shiftsList,
    comparison 
  } = useMemo(() => {
    const targetDate = new Date(`${selectedMonth}-01T00:00:00`);
    const daysInMonth = getDaysInMonth(targetDate);
    
    // Summary
    let totalIncome = 0;
    let shiftCount = 0;
    let totalHours = 0;
    
    // Lists
    const shiftsInMonth = [];
    const dailyIncomeMap = {};
    for (let i = 1; i <= daysInMonth; i++) dailyIncomeMap[i] = 0;
    
    // Map tasks
    partTimeTasks.forEach(t => {
      const taskDate = new Date(t.start);
      if (format(taskDate, 'yyyy-MM') === selectedMonth) {
        shiftsInMonth.push(t);
        
        const isDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
        let hours = 0;
        let earnings = 0;
        
        if (t.isExpense) {
           earnings = -(Number(t.amount) || 0);
           if (isDone) {
             totalIncome += earnings;
           }
        } else {
           if (isDone) {
             if (t.actualStart && t.actualEnd) {
               hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
             } else {
               hours = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
             }
             if (t.rateType === RATE_TYPE.DAILY) earnings = Number(t.hourlyRate) || 0;
             else if (hours > 0) earnings = hours * (Number(t.hourlyRate) || 0);
             
             totalIncome += earnings;
             shiftCount += 1;
             totalHours += hours;
           }
        }
        
        // Add to chart only if done or expense
        if (isDone) {
          const day = taskDate.getDate();
          if (dailyIncomeMap[day] !== undefined) {
             dailyIncomeMap[day] += earnings;
          }
        }
      }
    });

    // Determine latest active bar for chart
    let latestDay = 1;
    const now = new Date();
    if (selectedMonth === format(now, 'yyyy-MM')) {
      latestDay = now.getDate();
    } else {
      // Find last day with income
      for (let i = daysInMonth; i >= 1; i--) {
        if (dailyIncomeMap[i] !== 0) {
          latestDay = i;
          break;
        }
      }
    }

    // Prepare chart data (filter days to only those with income, or all days if user prefers)
    // Design spec: "X-axis: day of month (only days with shifts)"
    const chartArr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      if (dailyIncomeMap[i] !== 0) {
        chartArr.push({
          day: i.toString(),
          fullDay: i,
          income: dailyIncomeMap[i]
        });
      }
    }

    // Comparison logic
    // We need total income for last month
    const lastMonthDate = subMonths(targetDate, 1);
    const lastMonthStr = format(lastMonthDate, 'yyyy-MM');
    let lastMonthIncome = 0;
    
    // Average 6 months (excluding current selected month, or including? Usually past 6 months before selected)
    let sum6Months = 0;
    for (let i = 1; i <= 6; i++) {
      const mDate = subMonths(targetDate, i);
      const mStr = format(mDate, 'yyyy-MM');
      
      // Calculate income for this specific past month
      let mIncome = 0;
      partTimeTasks.forEach(t => {
        if (format(new Date(t.start), 'yyyy-MM') === mStr) {
          const isDone = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
          if (isDone) {
             if (t.isExpense) {
               mIncome -= (Number(t.amount) || 0);
             } else {
               let h = (new Date(t.end) - new Date(t.start)) / (1000 * 60 * 60);
               if (t.actualStart && t.actualEnd) h = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
               if (t.rateType === RATE_TYPE.DAILY) mIncome += Number(t.hourlyRate) || 0;
               else if (h > 0) mIncome += h * (Number(t.hourlyRate) || 0);
             }
          }
        }
      });
      
      sum6Months += mIncome;
      if (i === 1) lastMonthIncome = mIncome;
    }
    
    const avg6Months = sum6Months / 6;
    
    const getChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const totalGross = totalIncome < 0 ? 0 : totalIncome;
    let ssoDeduction = 0;
    let netIncome = totalGross;

    if (settings.socialSecurity && settings.showInIncome && totalGross > 0) {
      const sso = calcSSO(totalGross);
      ssoDeduction = sso.deduction;
      netIncome = sso.netIncome;
    }

    return {
      summary: { totalGross: Math.round(totalGross), ssoDeduction, netIncome, shiftCount, totalHours },
      chartData: chartArr,
      latestDay,
      shiftsList: shiftsInMonth,
      comparison: {
        lastMonth: lastMonthIncome,
        lastMonthChange: getChange(netIncome, lastMonthIncome),
        avg6Months: avg6Months,
        avgChange: getChange(netIncome, avg6Months)
      }
    };
  }, [partTimeTasks, selectedMonth, settings.socialSecurity, settings.showInIncome]);

  const formatThMonthYear = (dateStr) => {
    const d = new Date(`${dateStr}-01`);
    const thMonth = format(d, 'MMM', { locale: th });
    const thYear = d.getFullYear() + 543;
    return `${thMonth} ${thYear.toString().slice(-2)}`;
  };
  
  const formatFullThMonthYear = (dateStr) => {
    const d = new Date(`${dateStr}-01`);
    const thMonth = format(d, 'MMMM', { locale: th });
    const thYear = d.getFullYear() + 543;
    return `${thMonth} ${thYear}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#121212] border border-main/10 p-3 rounded-xl shadow-lg">
          <p className="text-main font-bold mb-1">วันที่ {label}</p>
          <p className="text-primary-500 font-bold">
            ฿{payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen font-sans pb-32 md:pb-8"
    >
      {/* Top Bar */}
      <div className="p-4 flex items-center gap-4 sticky top-0 liquid-glass border-b border-main/5 z-20">
        <button onClick={() => navigate('/part-time')} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
          <ArrowLeft size={24} className="text-main/80" />
        </button>
        <h1 className="text-xl font-bold text-main">ประวัติรายได้</h1>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Month Selector (Horizontal Scroll) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x">
          {monthsList.map((mStr) => {
            const isActive = selectedMonth === mStr;
            return (
              <button
                key={mStr}
                onClick={() => setSelectedMonth(mStr)}
                className={`snap-start whitespace-nowrap px-5 py-2.5 rounded-full text-sm transition-all flex-shrink-0 border ${
                  isActive 
                  ? 'bg-[rgba(127,119,221,0.25)] border-[rgba(127,119,221,0.5)] text-[var(--theme-accent-dark)] font-[500]' 
                  : 'bg-[rgba(255,255,255,0.3)] border-[rgba(255,255,255,0.4)] text-[rgba(26,26,46,0.6)] font-bold hover:bg-white/50'
                }`}
              >
                {formatThMonthYear(mStr)}
              </button>
            );
          })}
        </div>

        {/* Monthly Summary Card */}
        <div className="bg-[var(--theme-accent-light)] dark:bg-primary-900/60 rounded-[24px] shadow-[0_8px_32px_rgba(124,99,255,0.12)] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 blur-3xl rounded-full -translate-y-1/2 translate-x-1/4"></div>
          
          <p className="text-[var(--theme-nav-active)] font-bold text-sm mb-1">{formatFullThMonthYear(selectedMonth)} · รวม</p>
          <h2 className="text-[var(--theme-accent-dark)] text-[32px] font-black mb-2 tracking-tight">
            ฿{summary.netIncome.toLocaleString()}
          </h2>
          
          {settings.socialSecurity && settings.showInIncome && summary.ssoDeduction > 0 ? (
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-bold text-red-500">
                -฿{summary.ssoDeduction.toLocaleString()}
              </span>
              <span className="text-xs text-[var(--theme-nav-active)] font-medium opacity-80">(หักประกันสังคม 5%)</span>
            </div>
          ) : (
            <div className="mb-6"></div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[rgba(255,255,255,0.7)] rounded-[16px] p-4 border border-[rgba(255,255,255,0.5)]">
              <p className="text-[var(--theme-nav-active)] text-[12px] font-bold mb-1">กะทำงาน</p>
              <p className="text-[var(--theme-accent-dark)] text-[18px] font-[500]">{summary.shiftCount} กะ</p>
            </div>
            <div className="bg-[rgba(255,255,255,0.7)] rounded-[16px] p-4 border border-[rgba(255,255,255,0.5)]">
              <p className="text-[var(--theme-nav-active)] text-[12px] font-bold mb-1">ชั่วโมงรวม</p>
              <p className="text-[var(--theme-accent-dark)] text-[18px] font-[500]">{summary.totalHours.toFixed(1).replace('.0', '')} ชม.</p>
            </div>
          </div>
        </div>

        {/* Daily Bar Chart */}
        {chartData.length === 0 ? (
          <div className="h-[160px] w-full mt-2 mb-4 flex flex-col items-center justify-center bg-[rgba(255,255,255,0.25)] rounded-[16px] border border-[rgba(255,255,255,0.4)]">
            <CalendarOff className="w-8 h-8 text-[var(--theme-nav-active)]/40 mb-2" />
            <p className="text-[var(--theme-nav-active)]/60 text-sm font-bold">ไม่มีข้อมูลเดือนนี้</p>
          </div>
        ) : (
          <div className="h-[160px] w-full mt-2 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#71717a', fontWeight: 'bold' }} 
                  dy={10} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="income" radius={[4, 4, 4, 4]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fullDay === summary.latestDay || (chartData.length === 1) ? 'var(--theme-accent)' : '#AFA9EC'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparison Footer */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[rgba(255,255,255,0.25)] backdrop-blur-[16px] border border-[rgba(255,255,255,0.35)] rounded-[16px] p-4">
            <p className="text-main/60 text-xs font-bold mb-1">เทียบเดือนที่แล้ว</p>
            <div className="flex items-end gap-2">
              <span className="text-main font-bold">฿{comparison.lastMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 px-2 py-1 w-fit rounded-md ${
              comparison.lastMonthChange >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {comparison.lastMonthChange >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {Math.abs(comparison.lastMonthChange).toFixed(1)}%
            </div>
          </div>
          <div className="bg-[rgba(255,255,255,0.25)] backdrop-blur-[16px] border border-[rgba(255,255,255,0.35)] rounded-[16px] p-4">
            <p className="text-main/60 text-xs font-bold mb-1">เฉลี่ย 6 เดือน</p>
            <div className="flex items-end gap-2">
              <span className="text-main font-bold">฿{comparison.avg6Months.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-bold mt-2 px-2 py-1 w-fit rounded-md ${
              comparison.avgChange >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {comparison.avgChange >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
              {Math.abs(comparison.avgChange).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Shift List */}
        <div>
          <div className="flex justify-between items-center mb-4 px-1">
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
                
                let earnings = 0;
                let hours = 0;
                
                if (task.isExpense) {
                  earnings = -(Number(task.amount) || 0);
                } else {
                  if (task.actualStart && task.actualEnd) {
                    hours = (new Date(task.actualEnd) - new Date(task.actualStart)) / (1000 * 60 * 60);
                  } else {
                    hours = (new Date(task.end) - new Date(task.start)) / (1000 * 60 * 60);
                  }
                  if (task.rateType === RATE_TYPE.DAILY) {
                    earnings = Number(task.hourlyRate) || 0;
                  } else {
                    earnings = hours * (Number(task.hourlyRate) || 0);
                  }
                }

                const taskDate = new Date(task.start);
                const isFutureTask = taskDate > new Date() && !isCompleted;

                return (
                  <SwipeableRow key={task.id} onDelete={() => setDeleteConfirmTask(task)}>
                    <div 
                      className={`liquid-glass-card rounded-[20px] p-4 flex items-center gap-4 transition-all ${
                        isFutureTask ? 'opacity-50' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        task.isExpense ? 'bg-red-500/10 text-red-500' :
                        isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-primary-500/20 text-primary-500'
                      }`}>
                        {isCompleted || task.isExpense ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-main text-sm truncate">{task.title}</h4>
                        <p className="text-xs text-main/50 mt-1 truncate">
                          {format(taskDate, 'd MMM', { locale: th })}
                          {!task.isExpense && ` · ${format(taskDate, 'HH:mm')}–${format(new Date(task.end), 'HH:mm')} · ${hours.toFixed(1).replace('.0', '')} ชม.`}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className={`font-bold text-sm ${
                          task.isExpense ? 'text-red-500' :
                          isCompleted ? 'text-green-500' : 'text-primary-500'
                        }`}>
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

      </div>

      <ConfirmDialog 
        isOpen={!!deleteConfirmTask}
        title="ยืนยันการลบ"
        message={`ลบรายการ '${deleteConfirmTask?.title}' ใช่ไหม?\nการกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmText="ลบ"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmTask(null)}
      />
    </motion.div>
  );
}
