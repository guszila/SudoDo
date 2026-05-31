import React, { useState, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { format, isBefore, endOfDay, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowLeft, CheckCircle2, CircleDashed, Clock, Edit, ListTodo, Plus, Trash2, CalendarDays, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import TaskModal from '../components/TaskModal';
import { useTasks } from '../contexts/TasksContext';
import { saveTask } from '../services/taskService';
import { TASK_STATUS, TASK_PRIORITY, RATE_TYPE } from '../constants';

export default function TasksPage({ user }) {
  const { tasks, isLoading } = useTasks();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'partTime'
  const [activeStatus, setActiveStatus] = useState('pending'); // 'pending' | 'done'
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  // Derived state
  const { generalPending, generalDone, partTimePending, partTimeDone } = useMemo(() => {
    const gp = [];
    const gd = [];
    const pp = [];
    const pd = [];
    
    tasks.forEach(t => {
      const isCompleted = t.status === TASK_STATUS.DONE || (t.isPartTime && t.actualStart && t.actualEnd);
      
      if (t.isPartTime) {
        if (isCompleted) pd.push(t);
        else pp.push(t);
      } else {
        if (isCompleted) gd.push(t);
        else gp.push(t);
      }
    });
    
    const sortTasks = (a, b) => b.start - a.start;
    gp.sort(sortTasks);
    gd.sort(sortTasks);
    pp.sort(sortTasks);
    pd.sort(sortTasks);
    
    return { generalPending: gp, generalDone: gd, partTimePending: pp, partTimeDone: pd };
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    if (activeTab === 'general') {
      return activeStatus === 'pending' ? generalPending : generalDone;
    } else {
      return activeStatus === 'pending' ? partTimePending : partTimeDone;
    }
  }, [activeTab, activeStatus, generalPending, generalDone, partTimePending, partTimeDone]);

  const handleMarkDone = async (task, e) => {
    e.stopPropagation();
    const updated = {
      ...task,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      status: task.status === TASK_STATUS.DONE ? TASK_STATUS.TODO : TASK_STATUS.DONE
    };
    setIsMutating(true);
    await saveTask('EDIT', updated, user.uid);
    setIsMutating(false);
  };

  const handleDelete = async (taskId, e) => {
    e.stopPropagation();
    if (!window.confirm('คุณต้องการลบงานนี้หรือไม่?')) return;
    setIsMutating(true);
    await saveTask('DELETE', { id: taskId }, user.uid);
    setIsMutating(false);
  };

  const handleEditSave = async (taskData) => {
    setIsModalOpen(false);
    setIsMutating(true);
    await saveTask('EDIT', taskData, user.uid);
    setIsMutating(false);
  };

  const fDate = (d) => format(d, 'EE d MMM yyyy', { locale: th });
  const fTime = (d) => format(d, 'HH:mm');
  const now = new Date();

  if (isLoading || isMutating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="min-h-screen font-sans pb-32 md:pb-8 p-4 md:p-8 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-main flex items-center gap-2 m-0">
            <ListTodo className="text-primary-500" size={28} />
            งานทั้งหมด
          </h1>
        </div>
        <button 
          onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          className="p-2 md:px-4 md:py-2 bg-primary-500 text-white rounded-full flex items-center gap-2 hover:bg-primary-600 transition-colors shadow-md active:scale-95"
        >
          <Plus size={20} /> <span className="hidden md:inline font-bold">เพิ่มงานใหม่</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Type Tabs */}
        <div className="flex p-1.5 rounded-2xl w-full md:w-auto" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'general' ? 'bg-[#6c63ff] text-white shadow-sm' : 'bg-transparent text-main/60 hover:text-main'}`}
          >
            <CalendarDays size={16} /> งานทั่วไป
          </button>
          <button 
            onClick={() => setActiveTab('partTime')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'partTime' ? 'bg-[#6c63ff] text-white shadow-sm' : 'bg-transparent text-main/60 hover:text-main'}`}
          >
            <DollarSign size={16} /> กะงาน
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex p-1.5 rounded-2xl w-full md:w-auto ml-auto" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
          <button 
            onClick={() => setActiveStatus('pending')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeStatus === 'pending' ? 'bg-[#6c63ff] text-white shadow-sm' : 'bg-transparent text-main/60 hover:text-main'}`}
          >
            ค้างอยู่
          </button>
          <button 
            onClick={() => setActiveStatus('done')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeStatus === 'done' ? 'bg-[#6c63ff] text-white shadow-sm' : 'bg-transparent text-main/60 hover:text-main'}`}
          >
            เสร็จแล้ว
          </button>
        </div>
      </div>

      <div className="space-y-3 relative min-h-[200px]">
        {displayedTasks.length === 0 && (
          <div className="text-center py-16 liquid-glass-card rounded-[24px]">
             <ListTodo className="w-16 h-16 text-main opacity-20 mx-auto mb-4" />
             <p className="text-main opacity-60 font-medium text-lg">
               ไม่มีงานในหมวดหมู่นี้
             </p>
          </div>
        )}

        <AnimatePresence>
          {displayedTasks.map(task => {
            const isCompleted = task.status === TASK_STATUS.DONE || (task.isPartTime && task.actualStart && task.actualEnd);
            const isOverdue = !isCompleted && isBefore(endOfDay(task.end), now) && !isSameDay(task.end, now);
            const isFutureTask = !isCompleted && isBefore(endOfDay(now), task.start);

            let priorityColor = 'bg-amber-500 text-amber-600';
            if (task.priority === TASK_PRIORITY.HIGH) priorityColor = 'bg-red-500 text-red-600';
            if (task.priority === TASK_PRIORITY.LOW) priorityColor = 'bg-green-500 text-green-600';

            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={task.id} 
                onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                className={`liquid-glass-card p-4 flex items-center gap-4 rounded-[20px] cursor-pointer group hover:border-primary-500/30 transition-all ${isCompleted ? 'opacity-60' : ''}`}
              >
                <button 
                  onClick={(e) => {
                     if (task.isPartTime && isFutureTask) {
                        e.stopPropagation();
                        return; // Cannot mark future part time as done easily
                     }
                     handleMarkDone(task, e);
                  }}
                  className={`flex-shrink-0 p-1 rounded-full transition-transform active:scale-90 ${isCompleted ? 'text-green-500 hover:text-amber-500' : 'text-main/20 hover:text-green-500'} ${task.isPartTime && isFutureTask ? 'cursor-not-allowed opacity-30' : ''}`}
                >
                  {isCompleted ? <CheckCircle2 size={28} /> : <CircleDashed size={28} />}
                </button>
                
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
                    
                    {isOverdue && <span className="text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-md">เลยกำหนด</span>}
                  </div>
                </div>

                <div className="flex gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsModalOpen(true); }} 
                    className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/20 rounded-full transition-all"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(task.id, e)} 
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleEditSave}
        onDelete={(id) => handleDelete(id, { stopPropagation: () => {} })}
        task={editingTask}
        lang="th"
      />
    </motion.div>
  );
}
