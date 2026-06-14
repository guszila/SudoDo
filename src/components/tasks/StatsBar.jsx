import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, CircleDashed, ListTodo, TrendingUp, Zap } from 'lucide-react';
import { TASK_STATUS } from '../../constants';

export default function StatsBar({ tasks = [] }) {
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthTasks = tasks.filter(t => {
      if (t.isNote) return false;
      const d = new Date(t.start);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const total = monthTasks.length;
    const todo = monthTasks.filter(t => t.status === TASK_STATUS.TODO).length;
    const inProgress = monthTasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length;
    const done = monthTasks.filter(t => t.status === TASK_STATUS.DONE).length;

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    const toDateStr = (v) => {
      if (!v) return '';
      if (typeof v === 'string') return v.slice(0, 10);
      if (typeof v?.toDate === 'function') return v.toDate().toISOString().slice(0, 10);
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v).slice(0, 10);
    };

    // mini sparkline: last 7 days done count
    const spark = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return tasks.filter(t => t.status === TASK_STATUS.DONE && toDateStr(t.actualEnd || t.end) === key).length;
    });

    return { total, todo, inProgress, done, completionRate, spark };
  }, [tasks]);

  const statCards = [
    {
      label: 'ทั้งหมด',
      value: stats.total,
      icon: ListTodo,
      color: 'primary',
      colorClass: 'text-primary-500',
      bgClass: 'bg-primary-500/10',
      shadowColor: 'rgba(var(--color-primary-500-rgb),0.3)',
      gradient: 'from-primary-500/10 to-transparent',
    },
    {
      label: 'ต้องทำ',
      value: stats.todo,
      icon: CircleDashed,
      color: 'blue',
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-500/10',
      shadowColor: 'rgba(59,130,246,0.3)',
      gradient: 'from-blue-500/10 to-transparent',
    },
    {
      label: 'กำลังทำ',
      value: stats.inProgress,
      icon: Clock,
      color: 'amber',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      shadowColor: 'rgba(245,158,11,0.3)',
      gradient: 'from-amber-500/10 to-transparent',
    },
    {
      label: 'เสร็จแล้ว',
      value: stats.done,
      icon: CheckCircle2,
      color: 'green',
      colorClass: 'text-green-400',
      bgClass: 'bg-green-500/10',
      shadowColor: 'rgba(34,197,94,0.3)',
      gradient: 'from-green-500/10 to-transparent',
    },
  ];

  const maxSpark = Math.max(...stats.spark, 1);

  return (
    <div className="mb-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex flex-col md:flex-row gap-3">

        {/* ─── Progress Card ─── */}
        <div className="liquid-glass-card p-4 md:p-5 md:w-72 flex-shrink-0 flex flex-col justify-between relative overflow-hidden group">
          {/* Ambient glow */}
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-primary-500/20 blur-3xl rounded-full pointer-events-none" />

          <div className="flex justify-between items-start mb-3 relative z-10">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <TrendingUp size={13} className="text-primary-400" />
                <span className="text-[11px] font-bold text-main/50 uppercase tracking-widest">เดือนนี้</span>
              </div>
              <p className="text-sm font-bold text-main">ความสำเร็จ</p>
            </div>
            <div className="text-right">
              <motion.span
                key={stats.completionRate}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="text-3xl font-black text-primary-500 leading-none"
              >
                {stats.completionRate}
              </motion.span>
              <span className="text-sm font-bold text-primary-400">%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="h-3 rounded-full w-full overflow-hidden mb-3 relative z-10 shadow-inner"
            style={{ backgroundColor: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.completionRate}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 relative overflow-hidden flex items-center justify-end pr-1.5"
              style={{ boxShadow: '0 0 12px rgba(var(--color-primary-500-rgb),0.5)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_white] flex-shrink-0" />
            </motion.div>
          </div>

          {/* Sparkline — last 7 days */}
          <div className="flex items-end gap-0.5 h-8 relative z-10" title="7 วันล่าสุด">
            {stats.spark.map((v, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: 'easeOut' }}
                style={{
                  flex: 1,
                  height: `${Math.max(15, (v / maxSpark) * 100)}%`,
                  transformOrigin: 'bottom',
                  borderRadius: '2px 2px 0 0',
                  opacity: i === 6 ? 1 : 0.4 + (i / 6) * 0.5,
                  background: v === 0
                    ? 'var(--glass-bg-strong)'
                    : `linear-gradient(to top, rgba(var(--color-primary-500-rgb),0.9), rgba(var(--color-primary-500-rgb),0.4))`,
                }}
              />
            ))}
            <span className="text-[9px] text-main/30 ml-1 self-end leading-none">7d</span>
          </div>
        </div>

        {/* ─── Stat Pills ─── */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 md:pb-0 hide-scrollbar flex-1 items-stretch">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + idx * 0.07, duration: 0.4, ease: 'easeOut' }}
                className="liquid-glass-card px-4 py-4 flex flex-col justify-between min-w-[110px] flex-shrink-0 group hover:scale-[1.03] transition-all duration-200 relative overflow-hidden cursor-pointer select-none"
              >
                {/* Hover glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bgClass} ${card.colorClass} mb-3`}
                  style={{ boxShadow: `0 0 14px ${card.shadowColor}` }}
                >
                  <Icon size={18} strokeWidth={2} />
                </div>

                {/* Value */}
                <div className="relative z-10">
                  <motion.p
                    key={card.value}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    className="text-[28px] font-black text-main leading-none mb-1"
                  >
                    {card.value}
                  </motion.p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${card.colorClass} opacity-80`}>
                    {card.label}
                  </p>
                </div>

                {/* Subtle corner decoration */}
                <div className={`absolute -bottom-3 -right-3 w-14 h-14 ${card.bgClass} rounded-full opacity-40 pointer-events-none`} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
