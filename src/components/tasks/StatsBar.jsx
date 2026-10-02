import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, CircleDashed, ListTodo, TrendingUp } from 'lucide-react';
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
    <div className="mb-4 animate-slide-up">
      <div className="liquid-glass-card p-3 sm:p-3.5 relative overflow-hidden">
        {/* Subtle ambient corner glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/15 blur-2xl rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 relative z-10">
          
          {/* ─── Top/Left: Progress & Sparkline ─── */}
          <div className="flex items-center justify-between md:justify-start gap-3 flex-1">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-primary-500/15 flex items-center justify-center text-primary-500 shadow-sm">
                <TrendingUp size={16} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-main/50 uppercase tracking-widest block leading-none">เดือนนี้</span>
                <span className="text-xs font-bold text-main leading-tight">ความสำเร็จ</span>
              </div>
            </div>

            {/* Slim Animated Progress Bar */}
            <div className="flex items-center gap-2.5 flex-1 max-w-[180px] sm:max-w-[220px]">
              <div 
                className="h-2 rounded-full w-full overflow-hidden relative shadow-inner"
                style={{ backgroundColor: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.completionRate}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: 'shimmer 2s infinite' }} />
                </motion.div>
              </div>
              <motion.span
                key={stats.completionRate}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-sm font-black text-primary-500 tabular-nums shrink-0"
              >
                {stats.completionRate}%
              </motion.span>
            </div>

            {/* 7d Sparkline */}
            <div className="hidden sm:flex items-end gap-0.5 h-6 pl-2 border-l border-black/5 dark:border-white/10" title="7 วันล่าสุด">
              {stats.spark.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  style={{
                    width: '3.5px',
                    height: `${Math.max(20, (v / maxSpark) * 100)}%`,
                    transformOrigin: 'bottom',
                    borderRadius: '1px',
                    backgroundColor: v > 0 ? 'var(--theme-accent, #7F77DD)' : 'rgba(150,150,150,0.25)',
                    opacity: i === 6 ? 1 : 0.4 + (i / 6) * 0.5,
                  }}
                />
              ))}
              <span className="text-[9px] font-mono text-main/40 ml-1 leading-none self-end">7d</span>
            </div>
          </div>

          {/* ─── Bottom/Right: 4-Column Stat Grid (No cut off, fits screen perfectly) ─── */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:w-auto md:min-w-[340px]">
            {statCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + idx * 0.04, duration: 0.3 }}
                  className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all select-none group"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Icon size={11} className={card.colorClass} />
                    <span className={`text-[10px] sm:text-[11px] font-bold ${card.colorClass} opacity-85 truncate`}>
                      {card.label}
                    </span>
                  </div>
                  <motion.span
                    key={card.value}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-base sm:text-lg font-black text-main tabular-nums leading-tight"
                  >
                    {card.value}
                  </motion.span>
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
