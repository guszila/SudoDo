import React, { useMemo } from 'react';
import { CheckCircle2, Clock, CircleDashed, ListTodo, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatsBar({ tasks = [] }) {
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthTasks = tasks.filter(t => {
      const d = new Date(t.start);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const total = monthTasks.length;
    const todo = monthTasks.filter(t => t.status === 'To-Do').length;
    const inProgress = monthTasks.filter(t => t.status === 'In Progress').length;
    const done = monthTasks.filter(t => t.status === 'Done').length;
    
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, todo, inProgress, done, completionRate };
  }, [tasks]);

  return (
    <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Progress Bar Card */}
        <div className="liquid-glass-card p-4 md:p-5 flex-1 md:max-w-xs flex flex-col justify-center">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-main flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-primary-500" />
              ความสำเร็จเดือนนี้
            </h3>
            <span className="font-bold text-primary-600">{stats.completionRate}%</span>
          </div>
          <div className="h-3 md:h-4 rounded-full w-full overflow-hidden" style={{ backgroundColor: 'var(--glass-border-strong)', border: '1px solid var(--glass-border)' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.completionRate}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 shadow-sm relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20" style={{ transform: 'skewX(-20deg) translateX(-150%)', animation: 'shimmer 2s infinite' }}></div>
            </motion.div>
          </div>
        </div>

        {/* Stats Pills - Horizontally scrollable on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar flex-1 items-center">
          
          <div className="liquid-glass-card px-5 py-4 flex items-center gap-4 min-w-[140px] flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary-600" style={{ backgroundColor: 'var(--glass-bg-strong)' }}>
              <ListTodo size={20} />
            </div>
            <div>
              <p className="text-xs text-main opacity-70 font-medium mb-0.5">ทั้งหมด</p>
              <p className="text-xl font-bold text-main leading-none">{stats.total}</p>
            </div>
          </div>

          <div className="liquid-glass-card px-5 py-4 flex items-center gap-4 min-w-[140px] flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-blue-500" style={{ backgroundColor: 'var(--glass-bg-strong)' }}>
              <CircleDashed size={20} />
            </div>
            <div>
              <p className="text-xs text-main opacity-70 font-medium mb-0.5">ต้องทำ</p>
              <p className="text-xl font-bold text-main leading-none">{stats.todo}</p>
            </div>
          </div>

          <div className="liquid-glass-card px-5 py-4 flex items-center gap-4 min-w-[140px] flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-amber-500" style={{ backgroundColor: 'var(--glass-bg-strong)' }}>
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-main opacity-70 font-medium mb-0.5">กำลังทำ</p>
              <p className="text-xl font-bold text-main leading-none">{stats.inProgress}</p>
            </div>
          </div>

          <div className="liquid-glass-card px-5 py-4 flex items-center gap-4 min-w-[140px] flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-green-500" style={{ backgroundColor: 'var(--glass-bg-strong)' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs text-main opacity-70 font-medium mb-0.5">เสร็จแล้ว</p>
              <p className="text-xl font-bold text-main leading-none">{stats.done}</p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
