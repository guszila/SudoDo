import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, isBefore, endOfDay, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { CheckCircle2, CircleDashed, Clock, Edit, Trash2 } from 'lucide-react';
import { TASK_STATUS, TASK_PRIORITY, RATE_TYPE } from '../../constants';

export default function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  onLongPress,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  now = new Date()
}) {
  const timerRef = useRef(null);
  const [isPressing, setIsPressing] = useState(false);

  // Clear timeout if unmounted
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handlePointerDown = (e) => {
    if (isSelectionMode) return;
    // Don't trigger long press if clicking the checkbox button
    if (e.target.closest('button')) return;
    
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      setIsPressing(false);
      onLongPress(task);
    }, 500);
  };

  const handlePointerUpOrLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPressing(false);
  };

  const handleClick = (e) => {
    if (isSelectionMode) {
      onToggleSelect(task.id);
    } else {
      // Only edit if not a long press (handled by letting normal click propagate if timer cleared)
      // Actually, standard onClick is fine, it will fire if not long pressed.
      // But if we just finished a long press, we don't want to edit.
      // Easiest is to let onEdit happen on normal click unless the long press already fired.
      if (!isSelectionMode) {
        onEdit(task);
      }
    }
  };

  const isCompleted = task.status === TASK_STATUS.DONE || (task.isPartTime && task.actualStart && task.actualEnd);
  const isOverdue = !isCompleted && isBefore(endOfDay(task.end), now) && !isSameDay(task.end, now);
  const isFutureTask = !isCompleted && isBefore(endOfDay(now), task.start);

  let priorityColor = 'bg-amber-500 text-amber-600';
  if (task.priority === TASK_PRIORITY.HIGH) priorityColor = 'bg-red-500 text-red-600';
  if (task.priority === TASK_PRIORITY.LOW) priorityColor = 'bg-green-500 text-green-600';

  const fDate = (d) => format(new Date(d), 'EE d MMM yyyy', { locale: th });
  const fTime = (d) => format(new Date(d), 'HH:mm');

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, scale: isPressing ? 0.98 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrLeave}
      onPointerLeave={handlePointerUpOrLeave}
      onPointerCancel={handlePointerUpOrLeave}
      onClick={handleClick}
      className={`liquid-glass-card p-4 flex items-center gap-4 rounded-[20px] cursor-pointer group hover:border-primary-500/30 transition-all ${isCompleted ? 'opacity-60' : ''} ${isSelected ? 'border-primary-500/50 bg-primary-500/5' : ''}`}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {isSelectionMode && (
        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
          isSelected ? 'bg-primary-500 border-primary-500' : 'border-main/20 dark:border-white/20'
        }`}>
          {isSelected && <CheckCircle2 size={16} className="text-white" />}
        </div>
      )}

      {!isSelectionMode && (
        <button 
          onClick={(e) => {
             e.stopPropagation();
             if (task.isPartTime && isFutureTask) return;
             onToggleStatus(task);
          }}
          className={`flex-shrink-0 p-1 rounded-full transition-transform active:scale-90 ${isCompleted ? 'text-green-500 hover:text-amber-500' : 'text-main/20 hover:text-green-500'} ${task.isPartTime && isFutureTask ? 'cursor-not-allowed opacity-30' : ''}`}
        >
          {isCompleted ? <CheckCircle2 size={28} /> : <CircleDashed size={28} />}
        </button>
      )}
      
      <div className="flex-1 min-w-0">
        <h3 className={`font-bold text-lg text-main truncate ${isCompleted ? 'line-through' : ''}`}>{task.title}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-main/70">
          <span className="flex items-center gap-1 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md">
            <Clock size={12} /> {fDate(task.start)} {fTime(task.start)} - {fTime(task.end)}
          </span>
          
          {!task.isPartTime && (
            <span className={`px-2 py-0.5 rounded-md bg-opacity-20 font-bold ${priorityColor.split(' ')[0]}/10 ${priorityColor.split(' ')[1]}`}>
              {task.priority}
            </span>
          )}

          {task.isPartTime && (
            <span className="px-2 py-0.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-md font-bold">
              ฿{task.hourlyRate}{task.rateType === RATE_TYPE.DAILY ? '/วัน' : '/ชม.'}
            </span>
          )}
          
          {task.description && (
            <span className="bg-main/10 dark:bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium max-w-xs truncate" title={task.description}>
              📝 {task.description}
            </span>
          )}
          
          {isOverdue && <span className="text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-md">เลยกำหนด</span>}
        </div>
      </div>

      {!isSelectionMode && (
        <div className="flex gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(task); }} 
            className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/20 rounded-full transition-all"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(task); }} 
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
