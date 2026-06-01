import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, CircleDashed, ListTodo, TrendingUp } from 'lucide-react';
import { TASK_STATUS } from '../constants';

export default function StatsBar({ tasks = [] }) {
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthTasks = tasks.filter(t => {
      const d = new Date(t.start);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const total = monthTasks.length;
    const todo = monthTasks.filter(t => t.status === TASK_STATUS.TODO).length;
    const inProgress = monthTasks.filter(t => t.status === TASK_STATUS.IN_PROGRESS).length;
    const done = monthTasks.filter(t => t.status === TASK_STATUS.DONE).length;
    
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, todo, inProgress, done, completionRate };
  }, [tasks]);

  return (
    <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Progress Bar Card */}
        <div className="liquid-glass-card p-4 md:p-5 flex-1 md:max-w-xs flex flex-col justify-center relative overflow-hidden group">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/20 blur-2xl rounded-full -translate-y-1/2 translate-x-1/4"></div>
          
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="font-bold text-main flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-primary-500" />
              ความสำเร็จเดือนนี้
            </h3>
            <span className="font-black text-primary-600 dark:text-primary-400 text-lg">{stats.completionRate}%</span>
          </div>
          <div className="h-4 md:h-5 rounded-full w-full overflow-hidden relative z-10 shadow-inner" style={{ backgroundColor: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.completionRate}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 shadow-[0_0_15px_rgba(var(--color-primary-500-rgb),0.6)] relative overflow-hidden flex items-center justify-end pr-2"
            >
              {/* Neon trail shimmer */}
              <div className="absolute inset-0 bg-white/30 dark:bg-white/10" style={{ transform: 'skewX(-20deg) translateX(-150%)', animation: 'shimmer 2s infinite' }}></div>
              {/* Pulse at the end of the bar */}
              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_white]"></div>
            </motion.div>
          </div>
        </div>

        {/* Stats Pills - Horizontally scrollable on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar flex-1 items-center">
          
          <div className="liquid-glass-card px-5 py-4 flex items-center gap-4 min-w-[140px] flex-shrink-0 group hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-primary-600 bg-primary-500/10 shadow-[0_0_15px_rgba(var(--color-primary-500-rgb),0.2)] group-hover:shadow-[0_0_20px_rgba(var(--color-primary-500-rgb),0.4)] transition-shadow">
              <ListTodo size={20} />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-main/60 font-bold mb-0.5 uppercase tracking-wider">ทั้งหมด</p>
              <p className="text-2xl font-black text-main leading-none">{stats.total}</p>
            </div>
          </div>

          <div className="liquid-glass-card px-5 py-4 flex items-center gap-4 min-w-[140px] flex-shrink-0 group hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-shadow">
              <CircleDashed size={20} />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-main/60 font-bold mb-0.5 uppercase tracking-wider">ต้องทำ</p>
              <p className="text-2xl font-black text-main leading-none">{stats.todo}</p>
            </div>
          </div>

          <div className="liquid-glass-card px-5 py-4 flex items-center gap-4 min-w-[140px] flex-shrink-0 group hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-shadow">
              <Clock size={20} />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-main/60 font-bold mb-0.5 uppercase tracking-wider">กำลังทำ</p>
              <p className="text-2xl font-black text-main leading-none">{stats.inProgress}</p>
            </div>
          </div>

          <div className="liquid-glass-card px-5 py-4 flex items-center gap-4 min-w-[140px] flex-shrink-0 group hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.2)] group-hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-shadow">
              <CheckCircle2 size={20} />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-main/60 font-bold mb-0.5 uppercase tracking-wider">เสร็จแล้ว</p>
              <p className="text-2xl font-black text-main leading-none">{stats.done}</p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
