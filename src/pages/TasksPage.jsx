import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowLeft, CheckCircle2, Edit, ListTodo, Plus, Trash2, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import TaskModal from '../components/tasks/TaskModal';
import TaskCard from '../components/tasks/TaskCard';
import ActionSheet from '../components/common/ActionSheet';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useTasks } from '../contexts/TasksContext';
import { useToast } from '../contexts/ToastContext';
import { saveTask } from '../services/taskService';
import { TASK_STATUS, PRIORITY_WEIGHT } from '../constants';
import { translations } from '../i18n';

export default function TasksPage({ user, lang = 'en' }) {
  const { tasks, isLoading } = useTasks();
  const { showToast } = useToast();
  const t = translations[lang].tasks;
  const tCommon = translations[lang];
  const navigate = useNavigate();
  
  const [activeStatus, setActiveStatus] = useState('pending'); // 'pending' | 'done'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'high' | 'normal' | 'low'
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  
  // Action/Confirm state
  const [actionTask, setActionTask] = useState(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Derived state — general tasks only
  const { generalPending, generalDone } = useMemo(() => {
    const gp = [];
    const gd = [];
    tasks.forEach(t => {
      if (t.isPartTime) return; // Part-Time tasks belong to PartTimePage
      const isCompleted = t.status === TASK_STATUS.DONE;
      if (isCompleted) gd.push(t);
      else gp.push(t);
    });
    const sortTasks = (a, b) => new Date(b.start) - new Date(a.start);
    gp.sort(sortTasks);
    gd.sort(sortTasks);
    return { generalPending: gp, generalDone: gd };
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    let list = activeStatus === 'pending' ? generalPending : generalDone;
    
    if (priorityFilter !== 'all') {
      list = list.filter(t => (t.priority || 'normal') === priorityFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    list = [...list];
    if (sortBy === 'priority') {
      list.sort((a, b) => (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0) || new Date(b.start) - new Date(a.start));
    } else if (sortBy === 'date-asc') {
      list.sort((a, b) => new Date(a.start) - new Date(b.start));
    } else {
      list.sort((a, b) => new Date(b.start) - new Date(a.start));
    }
    return list;
  }, [activeStatus, generalPending, generalDone, searchQuery, sortBy, priorityFilter]);

  const generateRecurringTask = async (originalTask) => {
    if (originalTask.recurring && originalTask.recurring !== 'none') {
      const newStart = new Date(originalTask.start);
      const newEnd = new Date(originalTask.end);
      if (originalTask.recurring === 'daily') {
        newStart.setDate(newStart.getDate() + 1);
        newEnd.setDate(newEnd.getDate() + 1);
      } else if (originalTask.recurring === 'weekly') {
        newStart.setDate(newStart.getDate() + 7);
        newEnd.setDate(newEnd.getDate() + 7);
      }
      
      const recurringTask = {
        ...originalTask,
        status: TASK_STATUS.TODO,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
        subtasks: originalTask.subtasks ? originalTask.subtasks.map(s => ({...s, done: false})) : []
      };
      delete recurringTask.id;
      await saveTask('ADD', recurringTask, user.uid);
      showToast(lang === 'th' ? `สร้างงานสำหรับรอบถัดไปอัตโนมัติแล้ว` : `Next recurring task created`, { duration: 3000 });
    }
  };

  const handleMarkDone = async (task) => {
    const isNowDone = task.status !== TASK_STATUS.DONE;
    const updated = {
      ...task,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      status: isNowDone ? TASK_STATUS.DONE : TASK_STATUS.TODO
    };
    setIsMutating(true);
    await saveTask('EDIT', updated, user.uid);
    if (isNowDone) await generateRecurringTask(task);
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
    
    const wasDone = editingTask?.status === TASK_STATUS.DONE;
    const isNowDone = taskData.status === TASK_STATUS.DONE;
    
    await saveTask(taskData.id ? 'EDIT' : 'ADD', taskData, user.uid);
    
    if (taskData.id && !wasDone && isNowDone) {
      await generateRecurringTask(taskData);
    }
    
    setIsMutating(false);
  };

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
          </div>
        )}
      </div>

      {/* Status + Priority Tabs */}
      <div className="flex gap-3 mb-4">
        {/* Status filter */}
        <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1 gap-0.5">
          <button
            onClick={() => setActiveStatus('pending')}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${
              activeStatus === 'pending' ? 'bg-primary-500 text-white shadow-sm' : 'text-main/60 hover:text-main'
            }`}
          >
            {lang === 'th' ? 'รอดำเนินการ' : 'Pending'}
          </button>
          <button
            onClick={() => setActiveStatus('done')}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${
              activeStatus === 'done' ? 'bg-primary-500 text-white shadow-sm' : 'text-main/60 hover:text-main'
            }`}
          >
            {lang === 'th' ? 'เสร็จแล้ว' : 'Done'}
          </button>
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`ml-auto p-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-1.5 ${
            (priorityFilter !== 'all' || sortBy !== 'date-desc') ? 'bg-primary-500 text-white' : 'bg-black/5 dark:bg-white/5 text-main/60 hover:text-main'
          }`}
        >
          <Filter size={16} />
          {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="liquid-glass-card p-4 space-y-3">
              {/* Priority chips */}
              <div>
                <p className="text-xs font-bold text-main/50 mb-2">{lang === 'th' ? 'ความสำคัญ' : 'Priority'}</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All', color: 'bg-main/10 text-main' },
                    { id: 'high', label: lang === 'th' ? 'สูง' : 'High', color: 'bg-red-500/10 text-red-500' },
                    { id: 'normal', label: lang === 'th' ? 'ปกติ' : 'Normal', color: 'bg-amber-500/10 text-amber-500' },
                    { id: 'low', label: lang === 'th' ? 'ต่ำ' : 'Low', color: 'bg-green-500/10 text-green-500' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPriorityFilter(p.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
                        priorityFilter === p.id
                          ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-300'
                          : `border-transparent ${p.color} opacity-70 hover:opacity-100`
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Sort */}
              <div>
                <p className="text-xs font-bold text-main/50 mb-2">{lang === 'th' ? 'เรียงตาม' : 'Sort by'}</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'date-desc', label: lang === 'th' ? 'ล่าสุดก่อน' : 'Newest' },
                    { id: 'date-asc', label: lang === 'th' ? 'เก่าสุดก่อน' : 'Oldest' },
                    { id: 'priority', label: lang === 'th' ? 'ความสำคัญ' : 'Priority' },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSortBy(s.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
                        sortBy === s.id
                          ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-300'
                          : 'border-transparent bg-main/5 text-main/60 hover:text-main'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mb-6">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-main/40" size={18} />
         <input 
            type="text"
            placeholder={lang === 'th' ? 'ค้นหางาน...' : 'Search tasks...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/10 border-transparent rounded-2xl pl-10 pr-4 py-3 text-main font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
         />
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
              lang={lang}
            />
          ))}
        </AnimatePresence>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isSelectionMode && selectedTaskIds.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              className="fixed bottom-0 left-0 right-0 px-5 pt-5 pb-[calc(1rem+84px+env(safe-area-inset-bottom))] liquid-glass border-t border-main/10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30 flex justify-between items-center rounded-t-[32px]"
            >
              <span className="font-bold text-main text-lg">
                เลือกแล้ว {selectedTaskIds.size} รายการ
              </span>
              <button 
                onClick={() => setBulkDeleteConfirm(true)}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-[16px] shadow-lg shadow-red-500/30 transition-transform active:scale-95"
              >
                ลบที่เลือก
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <ActionSheet 
        isOpen={!!actionTask}
        onClose={() => setActionTask(null)}
        options={[
          {
            label: 'แก้ไข',
            icon: <Edit size={20} />,
            onClick: () => { setEditingTask(actionTask); setActionTask(null); setIsModalOpen(true); }
          },
          {
            label: 'ลบงานนี้',
            icon: <Trash2 size={20} />,
            isDanger: true,
            onClick: () => { setDeleteConfirmTask(actionTask); setActionTask(null); }
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
        onDelete={() => {
          setIsModalOpen(false);
          // Small delay to allow modal exit animation before opening the confirm dialog
          setTimeout(() => setDeleteConfirmTask(editingTask), 100);
        }}
        task={editingTask}
        lang={lang}
      />
    </motion.div>
  );
}
