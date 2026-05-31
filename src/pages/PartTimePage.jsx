import React, { useState, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { DollarSign, Clock, CheckCircle2, Plus, ArrowLeft, Trash2, CalendarDays, History, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import TaskModal from '../components/TaskModal';
import { useTasks } from '../contexts/TasksContext';
import { saveTask } from '../services/taskService';
import { TASK_STATUS, TASK_PRIORITY, RATE_TYPE, DEFAULT_TASK_VALUES } from '../constants';
import { translations } from '../i18n';

export default function PartTimePage({ user, lang = 'en' }) {
  const t = translations[lang].partTime;
  const { tasks: allTasks, isLoading: isTasksLoading } = useTasks();
  const navigate = useNavigate();
  
  const tasks = useMemo(() => {
    const formattedData = allTasks.filter(t => t.isPartTime);
    formattedData.sort((a, b) => b.start - a.start);
    return formattedData;
  }, [allTasks]);

  const [isMutating, setIsMutating] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'history'
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    hourlyRate: DEFAULT_TASK_VALUES.HOURLY_RATE,
    rateType: RATE_TYPE.HOURLY,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    startTime: DEFAULT_TASK_VALUES.START_TIME,
    endTime: DEFAULT_TASK_VALUES.END_TIME
  });

  const daysOfWeek = [
    { id: 1, label: 'จ.' },
    { id: 2, label: 'อ.' },
    { id: 3, label: 'พ.' },
    { id: 4, label: 'พฤ.' },
    { id: 5, label: 'ศ.' },
    { id: 6, label: 'ส.' },
    { id: 0, label: 'อา.' },
  ];



  // Derived state
  const { upcomingTasks, historyTasks } = useMemo(() => {
    const upcoming = [];
    const history = [];
    
    tasks.forEach(t => {
      const isCompleted = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      if (isCompleted) {
        history.push(t);
      } else {
        upcoming.push(t);
      }
    });
    
    return { upcomingTasks: upcoming, historyTasks: history };
  }, [tasks]);

  const stats = useMemo(() => {
    let earned = 0;
    let pending = 0;
    
    tasks.forEach(t => {
      const rate = Number(t.hourlyRate) || 0;
      const isCompleted = t.status === TASK_STATUS.DONE || (t.actualStart && t.actualEnd);
      
      if (isCompleted) {
        let hours = 0;
        if (t.actualStart && t.actualEnd) {
          hours = (new Date(t.actualEnd) - new Date(t.actualStart)) / (1000 * 60 * 60);
        } else {
          hours = (t.end - t.start) / (1000 * 60 * 60);
        }
        if (t.rateType === RATE_TYPE.DAILY) earned += rate;
        else if (hours > 0) earned += hours * rate;
      } else {
        // Pending
        const hours = (t.end - t.start) / (1000 * 60 * 60);
        if (t.rateType === RATE_TYPE.DAILY) pending += rate;
        else if (hours > 0) pending += hours * rate;
      }
    });

    return { earned, pending, total: earned + pending };
  }, [tasks]);

  const uniqueTitles = useMemo(() => {
    const titles = new Set();
    tasks.forEach(t => {
      if (t.title) titles.add(t.title);
    });
    return Array.from(titles);
  }, [tasks]);

  const handleAddShift = async (e) => {
    e.preventDefault();
    
    setIsMutating(true);
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const shiftsToAdd = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().slice(0, 10);
      const startDateTime = new Date(`${dateString}T${formData.startTime}:00`).toISOString();
        let endDateObj = new Date(`${dateString}T${formData.endTime}:00`);
        
        if (formData.endTime < formData.startTime) {
          endDateObj.setDate(endDateObj.getDate() + 1);
        }
        
        shiftsToAdd.push({
          title: formData.title,
          description: '',
          start: startDateTime,
          end: endDateObj.toISOString(),
          status: TASK_STATUS.TODO,
          priority: TASK_PRIORITY.MEDIUM,
          isPartTime: true,
          hourlyRate: formData.hourlyRate,
          rateType: formData.rateType,
          actualStart: null,
          actualEnd: null
        });
    }

    if (shiftsToAdd.length === 0) {
      alert("ไม่พบวันที่ตรงกับเงื่อนไขในช่วงเวลาที่เลือก");
      setIsMutating(false);
      return;
    }
    
    if (shiftsToAdd.length > 31) {
       if(!window.confirm(`คุณกำลังจะสร้างตารางกะงานทั้งหมด ${shiftsToAdd.length} วัน แน่ใจหรือไม่?`)) {
           setIsMutating(false);
           return;
       }
    }

    await Promise.all(shiftsToAdd.map(task => saveTask('ADD', task, user.uid)));
    setShowAddForm(false);
    setIsMutating(false);
  };
  const handleMarkDone = async (task) => {
    const updated = {
      ...task,
      start: task.start.toISOString(),
      end: task.end.toISOString(),
      status: TASK_STATUS.DONE
    };
    setIsMutating(true);
    await saveTask('EDIT', updated, user.uid);
    setIsMutating(false);
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('คุณต้องการลบกะนี้หรือไม่?')) return;
    setIsMutating(true);
    await saveTask('DELETE', { id: taskId }, user.uid);
    setIsMutating(false);
  }

  const handleEditSave = async (taskData) => {
    setIsModalOpen(false);
    setIsMutating(true);
    await saveTask('EDIT', taskData, user.uid);
    setIsMutating(false);
  };

  const handleResetIncome = async () => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการ "รีเซ็ตรายได้" ?\n\nระบบจะทำการลบ{t.historyTitle}ที่เสร็จสิ้นแล้วทั้งหมด และยอดเงินจะกลับเป็น 0')) return;
    
    setIsMutating(true);
    for (const task of historyTasks) {
      await saveTask('DELETE', { id: task.id }, user.uid);
    }
    setIsMutating(false);
  };

  const fDate = (d) => format(d, 'EEEEที่ d MMM yyyy', { locale: th });
  const fTime = (d) => format(d, 'HH:mm');
  const activeTasks = activeTab === 'upcoming' ? upcomingTasks : historyTasks;

  if (isTasksLoading || isMutating) {
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
      <div className="flex items-center mb-8 gap-4 px-2">
        <button onClick={() => navigate('/')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-main">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-main flex items-center gap-2 m-0">
          <CalendarDays className="text-primary-500" size={28} />
          {t.title}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-green-500">
          <p className="text-xs text-main opacity-70 font-medium mb-1">{t.earned}</p>
          <span className="text-2xl font-bold text-green-500">฿{stats.earned.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-amber-500">
          <p className="text-xs text-main opacity-70 font-medium mb-1">{t.expected}</p>
          <span className="text-xl font-bold text-amber-500">฿{stats.pending.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="col-span-2 liquid-glass-card p-4 flex flex-col justify-center border-l-4 border-l-primary-500 border border-dashed border-main/20">
          <p className="text-sm text-main opacity-70 font-medium mb-1">{t.total}</p>
          <span className="text-2xl font-bold text-primary-500">฿{stats.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all text-sm ${activeTab === 'upcoming' ? 'bg-primary-500 text-white shadow-md' : 'bg-white/20 text-main hover:bg-white/40'}`}
          >
            <CalendarDays size={16} /> {t.upcoming}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all text-sm ${activeTab === 'history' ? 'bg-primary-500 text-white shadow-md' : 'bg-white/20 text-main hover:bg-white/40'}`}
          >
            <History size={16} /> {t.history}
          </button>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-full transition-all shadow-md active:scale-95 text-sm"
        >
          <Plus size={16} /> {showAddForm ? t.close : t.addShift}
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <form onSubmit={handleAddShift} className="liquid-glass-card p-6 space-y-5 border-2 border-primary-500/30 bg-primary-500/5">
              <h3 className="font-bold text-main">เพิ่ม{t.upcoming} (สามารถเพิ่มหลายวันได้)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.jobTitle}</label>
                  <input type="text" list="job-titles" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} placeholder="{t.jobTitlePlaceholder}" />
                  <datalist id="job-titles">
                    {uniqueTitles.map((title, idx) => (
                      <option key={idx} value={title} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.hourlyRate}</label>
                  <div className="flex gap-2">
                    <input type="number" step="any" value={formData.hourlyRate} onChange={e => setFormData({...formData, hourlyRate: e.target.value})} required min="0" className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                    <select 
                      value={formData.rateType} 
                      onChange={e => setFormData({...formData, rateType: e.target.value})}
                      className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main font-bold"
                      style={{ backgroundColor: 'var(--glass-bg-input)' }}
                    >
                      <option value="hourly">{t.perHour}</option>
                      <option value="daily">{t.perDay}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.fromDate}</label>
                    <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.startTime}</label>
                    <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} required className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.toDate}</label>
                    <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.endTime}</label>
                    <input onClick={e => e.currentTarget.showPicker && e.currentTarget.showPicker()} type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} required className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" style={{ backgroundColor: 'var(--glass-bg-input)' }} />
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={isMutating || isTasksLoading} className="w-full py-4 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-colors shadow-lg active:scale-[0.98]">
                  {t.createShifts}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'history' && historyTasks.length > 0 && (
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="text-lg font-bold text-main">{t.historyTitle}</h3>
          <button 
            onClick={handleResetIncome}
            className="text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl transition-colors active:scale-95 flex items-center gap-2"
          >
            <Trash2 size={16} /> {t.resetIncome}
          </button>
        </div>
      )}

      <div className="space-y-4 relative min-h-[200px]">
        {isTasksLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-3xl">
             <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {activeTasks.length === 0 && !isTasksLoading && (
          <div className="text-center py-16 liquid-glass-card rounded-[24px]">
             {activeTab === 'upcoming' ? <CalendarDays className="w-16 h-16 text-main opacity-20 mx-auto mb-4" /> : <History className="w-16 h-16 text-main opacity-20 mx-auto mb-4" />}
             <p className="text-main opacity-60 font-medium text-lg">
               {activeTab === 'upcoming' ? 'ยังไม่มี{t.upcoming}' : 'ยังไม่มี{t.historyTitle}'}
             </p>
          </div>
        )}

        {activeTasks.map(task => {
          const isCompleted = task.status === TASK_STATUS.DONE || (task.actualStart && task.actualEnd);
          
          let earnings = 0;
          let hours = 0;
          if (task.actualStart && task.actualEnd) {
             hours = (new Date(task.actualEnd) - new Date(task.actualStart)) / (1000 * 60 * 60);
          } else if (isCompleted) {
             hours = (task.end - task.start) / (1000 * 60 * 60);
          } else {
             // Pending
             hours = (task.end - task.start) / (1000 * 60 * 60);
          }
          
          if (task.rateType === RATE_TYPE.DAILY) {
             earnings = Number(task.hourlyRate) || 0;
          } else {
             earnings = hours * (Number(task.hourlyRate) || 0);
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const taskDate = new Date(task.start);
          taskDate.setHours(0, 0, 0, 0);
          const isFutureTask = taskDate > today;

          return (
            <div key={task.id} className="liquid-glass-card p-5 flex flex-col md:flex-row gap-5 items-start md:items-center relative group hover:border-primary-500/30 transition-colors">
              <div className="absolute top-4 right-4 flex gap-1">
                <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/20 rounded-full transition-all">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(task.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-main text-lg m-0">{task.title}</h3>
                  <span className="px-2 py-1 bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs rounded-lg font-bold border border-primary-500/20">
                    ฿{task.hourlyRate}{task.rateType === RATE_TYPE.DAILY ? '/วัน' : '/ชม.'}
                  </span>
                </div>
                <div className="text-sm text-main opacity-80 space-y-1.5 bg-white/30 dark:bg-black/20 p-3 rounded-xl border border-white/40 dark:border-white/5">
                  <p className="flex items-center gap-2"><span className="w-4">📅</span> {fDate(task.start)}</p>
                  <p className="flex items-center gap-2"><span className="w-4">⏱️</span> ตาราง: {fTime(task.start)} - {fTime(task.end)}</p>
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                {isCompleted ? (
                  <div className="text-right flex-1 md:flex-none p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <p className="text-sm text-green-600 dark:text-green-400 font-bold mb-1 flex items-center justify-end gap-1"><CheckCircle2 size={16}/> {t.completed}</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">+฿{earnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="text-right text-amber-500 mb-1 flex-1 md:flex-none p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                       <p className="text-xs font-bold mb-0.5">{t.expected}</p>
                       <p className="text-lg font-bold">+฿{earnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => !isFutureTask && handleMarkDone(task)} 
                        disabled={isFutureTask}
                        className={`flex-1 md:w-36 flex items-center justify-center gap-2 py-2 text-white font-bold rounded-xl transition-all ${isFutureTask ? 'bg-slate-400 cursor-not-allowed opacity-50 dark:opacity-30' : 'bg-green-500 hover:bg-green-600 active:scale-95'}`}
                      >
                        {isFutureTask ? <Clock size={16} /> : <CheckCircle2 size={16} />} 
                        {isFutureTask ? t.notReached : t.markDone}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleEditSave}
        onDelete={handleDelete}
        task={editingTask}
        lang={lang}
      />
    </motion.div>
  );
}
