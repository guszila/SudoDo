import React, { useState, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { format, isBefore, endOfDay, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowLeft, CheckCircle2, CircleDashed, Clock, Edit, ListTodo, Plus, Trash2, CalendarDays, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import TaskModal from '../components/TaskModal';
import TaskCard from '../components/TaskCard';
import ActionSheet from '../components/ActionSheet';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTasks } from '../contexts/TasksContext';
import { useToast } from '../contexts/ToastContext';
import { saveTask } from '../services/taskService';
import { TASK_STATUS } from '../constants';
import { translations } from '../i18n';

export default function TasksPage({ user, lang = 'en' }) {
  const { tasks, isLoading } = useTasks();
  const { showToast } = useToast();
  const t = translations[lang].tasks;
  const tCommon = translations[lang];
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'partTime'
  const [activeStatus, setActiveStatus] = useState('pending'); // 'pending' | 'done'
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  
  // Action/Confirm state
  const [actionTask, setActionTask] = useState(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

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

  const handleMarkDone = async (task) => {
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

  const confirmDelete = async (taskToDelete) => {
    setDeleteConfirmTask(null);
    setIsMutating(true);
    
    // Backup for undo
    const backupTask = { ...taskToDelete };
    
    await saveTask('DELETE', { id: taskToDelete.id }, user.uid);
    setIsMutating(false);
    
    showToast('ลบเรียบร้อยแล้ว', {
      duration: 5000,
      onUndo: async () => {
        await saveTask('ADD', backupTask, user.uid);
      }
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleteConfirm(false);
    setIsMutating(true);
    
    const tasksToDelete = displayedTasks.filter(t => selectedTaskIds.has(t.id));
    
    // Backup for undo
    const backupTasks = [...tasksToDelete];
    
    // Delete one by one since we don't have a bulk API currently
    for (const task of tasksToDelete) {
      await saveTask('DELETE', { id: task.id }, user.uid);
    }
    
    setSelectedTaskIds(new Set());
    setIsSelectionMode(false);
    setIsMutating(false);
    
    showToast(`ลบ ${tasksToDelete.length} งานเรียบร้อยแล้ว`, {
      duration: 5000,
      onUndo: async () => {
        // Restore all
        for (const task of backupTasks) {
          await saveTask('ADD', task, user.uid);
        }
      }
    });
  };

  const toggleSelectTask = (taskId) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === displayedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(displayedTasks.map(t => t.id)));
    }
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
            {lang === 'en' ? 'All Tasks' : 'งานทั้งหมด'}
          </h1>
        </div>
        {isSelectionMode ? (
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSelectAll} 
              className="text-sm font-bold text-main/70 hover:text-primary-500"
            >
              เลือกทั้งหมด
            </button>
            <button 
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedTaskIds(new Set());
              }}
              className="px-4 py-2 rounded-full font-bold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsSelectionMode(true)}
              className="p-2 md:px-4 md:py-2 text-main/70 rounded-full font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <span className="hidden md:inline">เลือก</span>
              <CheckCircle2 size={20} className="md:hidden" />
            </button>
            <button 
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="p-2 md:px-4 md:py-2 bg-primary-500 text-white rounded-full flex items-center gap-2 hover:bg-primary-600 transition-colors shadow-md active:scale-95"
            >
              <Plus size={20} /> <span className="hidden md:inline font-bold">{tCommon.addTask}</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Type Tabs */}
        <div className="flex p-1.5 rounded-2xl w-full md:w-auto" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'general' ? 'bg-[#6c63ff] text-white shadow-sm' : 'bg-transparent text-main/60 hover:text-main'}`}
          >
            <CalendarDays size={16} /> {t.generalTasks}
          </button>
          <button 
            onClick={() => setActiveTab('partTime')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'partTime' ? 'bg-[#6c63ff] text-white shadow-sm' : 'bg-transparent text-main/60 hover:text-main'}`}
          >
            <DollarSign size={16} /> {t.shifts}
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex p-1.5 rounded-2xl w-full md:w-auto ml-auto" style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.4)' }}>
          <button 
            onClick={() => setActiveStatus('pending')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeStatus === 'pending' ? 'bg-[#6c63ff] text-white shadow-sm' : 'bg-transparent text-main/60 hover:text-main'}`}
          >
            {t.pending}
          </button>
          <button 
            onClick={() => setActiveStatus('done')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeStatus === 'done' ? 'bg-[#6c63ff] text-white shadow-sm' : 'bg-transparent text-main/60 hover:text-main'}`}
          >
            {t.done}
          </button>
        </div>
      </div>

      <div className="space-y-3 relative min-h-[200px]">
        {displayedTasks.length === 0 && (
          <div className="text-center py-16 liquid-glass-card rounded-[24px]">
             <ListTodo className="w-16 h-16 text-main opacity-20 mx-auto mb-4" />
             <p className="text-main opacity-60 font-medium text-lg">
               {t.noTasks}
             </p>
          </div>
        )}

        <AnimatePresence>
          {displayedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              now={now}
              isSelectionMode={isSelectionMode}
              isSelected={selectedTaskIds.has(task.id)}
              onToggleSelect={toggleSelectTask}
              onToggleStatus={handleMarkDone}
              onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
              onDelete={(t) => setDeleteConfirmTask(t)}
              onLongPress={(t) => setActionTask(t)}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isSelectionMode && selectedTaskIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#1a1a2e] border-t border-main/10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30 flex justify-between items-center"
          >
            <span className="font-bold text-main">
              เลือกแล้ว {selectedTaskIds.size} รายการ
            </span>
            <button 
              onClick={() => setBulkDeleteConfirm(true)}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-colors"
            >
              ลบที่เลือก
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ActionSheet 
        isOpen={!!actionTask}
        onClose={() => setActionTask(null)}
        options={[
          {
            label: 'แก้ไข',
            icon: <Edit size={20} />,
            onClick: () => { setEditingTask(actionTask); setIsModalOpen(true); }
          },
          {
            label: 'ลบงานนี้',
            icon: <Trash2 size={20} />,
            isDanger: true,
            onClick: () => setDeleteConfirmTask(actionTask)
          }
        ]}
      />

      <ConfirmDialog 
        isOpen={!!deleteConfirmTask}
        title="ยืนยันการลบ"
        message={`ลบงาน '${deleteConfirmTask?.title}' ใช่ไหม?\nการกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmText="ลบ"
        isDanger={true}
        onConfirm={() => confirmDelete(deleteConfirmTask)}
        onCancel={() => setDeleteConfirmTask(null)}
      />

      <ConfirmDialog 
        isOpen={bulkDeleteConfirm}
        title="ยืนยันการลบหลายรายการ"
        message={`ลบ ${selectedTaskIds.size} งาน ใช่ไหม?\nการกระทำนี้ไม่สามารถย้อนกลับได้`}
        confirmText="ลบ"
        isDanger={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleEditSave}
        onDelete={(id) => handleDelete(id, { stopPropagation: () => {} })}
        task={editingTask}
        lang={lang}
      />
    </motion.div>
  );
}
