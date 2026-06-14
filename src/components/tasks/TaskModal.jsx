import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Trash2, CheckCircle2, Circle, FileText, Coins, Bell } from 'lucide-react';

import { translations } from '../../i18n';
import { TASK_STATUS, TASK_PRIORITY, DEFAULT_TASK_VALUES } from '../../constants';
import { useSettings } from '../../contexts/SettingsContext';

const JOB_COLORS = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  green: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20' },
  primary: { bg: 'bg-primary-500/10', text: 'text-primary-600 dark:text-primary-400', border: 'border-primary-500/20' }
};

const toLocalISOString = (dateObj) => {
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function TaskModal({ isOpen, onClose, onSave, onDelete, task, lang = 'en' }) {
  const t = translations[lang].modal;
  const statusT = translations[lang].status;
  const dragControls = useDragControls();
  const { settings } = useSettings();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: toLocalISOString(new Date()),
    end: toLocalISOString(new Date()),
    status: TASK_STATUS.TODO,
    priority: TASK_PRIORITY.MEDIUM,
    subtasks: [],
    tags: [],
    recurring: 'none',
    isNote: false,
    noteType: 'general'
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        start: task.start ? toLocalISOString(task.start) : toLocalISOString(new Date()),
        end: task.end ? toLocalISOString(task.end) : toLocalISOString(new Date()),
        status: task.status || TASK_STATUS.TODO,
        priority: task.priority || TASK_PRIORITY.MEDIUM,
        isPartTime: task.isPartTime || false,
        hourlyRate: task.hourlyRate || DEFAULT_TASK_VALUES.HOURLY_RATE,
        isHolidayPay: task.isHolidayPay || false,
        rateType: task.rateType || 'hourly',
        breakHours: task.breakHours ?? 0,
        isAllDay: task.isAllDay || false,
        subtasks: task.subtasks || [],
        tags: task.tags || [],
        recurring: task.recurring || 'none',
        isNote: task.isNote || false,
        noteType: task.noteType || 'general'
      });
    } else {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60*60*1000);
      setFormData({
        title: '',
        description: '',
        start: toLocalISOString(now),
        end: toLocalISOString(inOneHour),
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        isPartTime: false,
        hourlyRate: DEFAULT_TASK_VALUES.HOURLY_RATE,
        isHolidayPay: false,
        rateType: 'hourly',
        breakHours: 0,
        isAllDay: false,
        subtasks: [],
        tags: [],
        recurring: 'none',
        isNote: false,
        noteType: 'general'
      });
    }
  }, [task, isOpen]);

  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');

  const addTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };
  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const addSubtask = (e) => {
    e.preventDefault();
    if (subtaskInput.trim()) {
      setFormData(prev => ({ 
        ...prev, 
        subtasks: [...prev.subtasks, { id: Date.now().toString(), text: subtaskInput.trim(), done: false }] 
      }));
      setSubtaskInput('');
    }
  };
  const toggleSubtask = (id) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s)
    }));
  };
  const removeSubtask = (id) => {
    setFormData(prev => ({ ...prev, subtasks: prev.subtasks.filter(s => s.id !== id) }));
  };
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      ...task, 
      ...formData, 
      start: new Date(formData.start).toISOString(), 
      end: new Date(formData.end).toISOString() 
    });
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center backdrop-blur-sm font-sans"
          style={{ backgroundColor: 'var(--overlay-bg)' }}
        >
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="liquid-glass-card w-full max-w-md p-6 relative rounded-t-[32px] md:rounded-[24px] pb-safe max-h-[90vh] overflow-y-auto"
          >
        <div 
          className="w-12 h-1.5 rounded-full mx-auto mb-6 md:hidden cursor-grab active:cursor-grabbing touch-none" 
          style={{ backgroundColor: 'var(--glass-border-strong)' }}
          onPointerDown={(e) => dragControls.start(e)}
        ></div>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-colors hidden md:block text-main opacity-60 hover:opacity-100"
          style={{ ':hover': { backgroundColor: 'var(--glass-bg-strong)' } }}
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold mb-4 text-main">
          {task?.id 
            ? (formData.isNote ? t.editNote : (formData.isPartTime ? t.editShift : t.editTask)) 
            : (formData.isNote ? t.newNote : (formData.isPartTime ? t.newShift : t.newTask))}
        </h2>

        {/* Quick Done Toggle - big and easy to tap on mobile */}
        {task?.id && !formData.isNote && (
          <button
            type="button"
            onClick={() => {
              onSave({ ...task, status: formData.status === TASK_STATUS.DONE ? TASK_STATUS.TODO : TASK_STATUS.DONE });
            }}
            className={`w-full flex items-center justify-center gap-3 py-4 mb-6 rounded-[18px] text-base font-bold transition-all active:scale-[0.97] ${
              formData.status === TASK_STATUS.DONE
                ? 'bg-green-500/20 text-green-600 border-green-500/40'
                : 'text-main border-dashed opacity-80 hover:opacity-100'
            }`}
            style={{ border: formData.status === TASK_STATUS.DONE ? '2px solid rgba(34,197,94,0.4)' : '2px dashed var(--glass-border-strong)' }}
          >
            {formData.status === TASK_STATUS.DONE ? (
              <><CheckCircle2 size={24} /> {formData.isPartTime ? (lang === 'th' ? 'ทำเครื่องหมายว่าจบกะแล้ว' : 'Mark shift as completed') : t.quickDone}</>
            ) : (
              <><Circle size={24} /> {formData.isPartTime ? (lang === 'th' ? 'กดเพื่อทำเครื่องหมายว่าจบกะ' : 'Click to mark shift as completed') : t.quickMarkDone}</>
            )}
          </button>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.itemType}</label>
            <div className="flex bg-black/5 dark:bg-white/5 rounded-2xl p-1 gap-1 border border-main/5">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isNote: false, isPartTime: false }))}
                className={`flex-grow py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  !formData.isNote && !formData.isPartTime
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-main/60 hover:text-main'
                }`}
              >
                📋 {t.generalTask}
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isNote: true, isPartTime: false, noteType: prev.noteType || 'general' }))}
                className={`flex-grow py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  formData.isNote
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-main/60 hover:text-main'
                }`}
              >
                📝 {t.note}
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isNote: false, isPartTime: true }))}
                className={`flex-grow py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  formData.isPartTime
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-main/60 hover:text-main'
                }`}
              >
                💰 {t.shift}
              </button>
            </div>
          </div>

          {formData.isNote && (
            <div className="animate-slide-up">
              <label className="block text-sm font-medium text-main mb-2 opacity-80">{t.noteCategory}</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-main/5">
                {[
                  { id: 'general', label: t.noteCategories?.general || 'ทั่วไป', icon: FileText, colorClass: 'text-violet-500', activeClass: 'border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10' },
                  { id: 'payday', label: t.noteCategories?.payday || 'เงินออก', icon: Coins, colorClass: 'text-amber-500', activeClass: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
                  { id: 'reminder', label: t.noteCategories?.reminder || 'แจ้งเตือน', icon: Bell, colorClass: 'text-rose-500', activeClass: 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10' },
                ].map(cat => {
                  const Icon = cat.icon;
                  const isActive = formData.noteType === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, noteType: cat.id }))}
                      className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all text-xs font-bold ${
                        isActive
                          ? `${cat.activeClass} scale-105 border-2`
                          : 'border-transparent text-main/60 hover:text-main'
                      }`}
                    >
                      <Icon size={18} className={`mb-1 ${isActive ? '' : cat.colorClass}`} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-main mb-1.5 opacity-80">
              {formData.isNote ? t.noteTitle : (formData.isPartTime ? translations[lang].partTime.jobTitle : t.title)}
            </label>
            
            {formData.isPartTime && (
              <div className="flex gap-3 overflow-x-auto py-2 px-1 snap-x hide-scrollbar mb-2 -mx-1">
                {(settings?.jobs || []).map(job => {
                  const c = JOB_COLORS[job.color] || JOB_COLORS.primary;
                  return (
                    <button 
                      key={job.id} type="button"
                      onClick={() => {
                        if (formData.title === job.name) {
                          setFormData({...formData, title: '', hourlyRate: DEFAULT_TASK_VALUES.HOURLY_RATE, deductSSO: false});
                        } else {
                          setFormData({...formData, title: job.name, hourlyRate: job.rate || formData.hourlyRate, rateType: job.rateType || formData.rateType, deductSSO: job.deductSSO});
                        }
                      }}
                      className={`flex flex-col items-center justify-center min-w-[90px] h-[90px] p-3 rounded-2xl border-2 transition-all snap-start shadow-sm ${formData.title === job.name ? `${c.border} ${c.bg} scale-105` : 'border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}`}
                    >
                      <span className="text-3xl mb-1">{job.emoji || '🏢'}</span>
                      <span className="text-xs font-bold text-main whitespace-nowrap truncate w-full px-1">{job.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            
            {(!formData.isPartTime || !((settings?.jobs || []).some(j => j.name === formData.title))) && (
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
                style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                placeholder={formData.isNote ? (lang === 'th' ? "เช่น วันเงินออก หรือ ค่าไฟล่วงหน้า..." : "e.g. Payday or bills...") : (formData.isPartTime ? (lang === 'th' ? "ระบุชื่อบริษัท..." : "e.g. Cafe Shop...") : t.titlePlaceholder)}
              />
            )}
          </div>

          {!formData.isPartTime && !formData.isNote && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.status}</label>
                <div 
                  className="flex rounded-[16px] overflow-hidden p-1"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                >
                  {[
                    { id: TASK_STATUS.TODO, label: statusT['To-Do'], color: 'bg-blue-500' },
                    { id: TASK_STATUS.IN_PROGRESS, label: statusT['In Progress'], color: 'bg-amber-500' },
                    { id: TASK_STATUS.DONE, label: statusT['Done'], color: 'bg-green-500' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: s.id }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-[12px] transition-all ${
                        formData.status === s.id 
                          ? 'shadow-sm text-main' 
                          : 'text-main/60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      style={{ backgroundColor: formData.status === s.id ? 'var(--glass-bg-strong)' : 'transparent' }}
                    >
                      <div className={`w-2 h-2 rounded-full ${s.color}`}></div>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.priority}</label>
                <div 
                  className="flex rounded-[16px] overflow-hidden p-1"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                >
                  {[
                    { id: TASK_PRIORITY.HIGH, color: 'bg-red-500' },
                    { id: TASK_PRIORITY.MEDIUM, color: 'bg-amber-500' },
                    { id: TASK_PRIORITY.LOW, color: 'bg-green-500' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: p.id }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold rounded-[12px] transition-all ${
                        formData.priority === p.id 
                          ? 'shadow-sm text-main' 
                          : 'text-main/60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      style={{ backgroundColor: formData.priority === p.id ? 'var(--glass-bg-strong)' : 'transparent' }}
                    >
                      <div className={`w-2 h-2 rounded-full ${p.color}`}></div>
                      {p.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-main mb-1.5 opacity-80">
              {formData.isPartTime ? 'หมายเหตุ (เช่น ทำกะแทนใคร)' : (formData.isNote ? 'รายละเอียดบันทึก' : t.description)}
            </label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={3}
              className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
              style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
              placeholder={formData.isNote ? "รายละเอียดเพิ่มเติม..." : t.descriptionPlaceholder}
            />
          </div>

          {/* Tags */}
          {!formData.isPartTime && !formData.isNote && (
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">Tags / หมวดหมู่</label>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="bg-primary-500/10 text-primary-500 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 border border-primary-500/20">
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addTag(e); } }}
                  className="flex-1 px-4 py-2 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-main"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                  placeholder="พิมพ์ Tag แล้วกด Enter..."
                />
                <button type="button" onClick={addTag} className="px-3 py-2 bg-primary-500 text-white rounded-[12px] text-sm font-bold shadow-sm active:scale-95 transition-transform">เพิ่ม</button>
              </div>
            </div>
          )}

          {/* Subtasks */}
          {!formData.isPartTime && !formData.isNote && (
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">Checklist งานย่อย</label>
              {formData.subtasks.length > 0 && (
                <div className="space-y-2 mb-2 max-h-32 overflow-y-auto pr-1">
                  {formData.subtasks.map(st => (
                    <div key={st.id} className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-2 rounded-[12px] border border-transparent hover:border-main/10 transition-colors">
                      <button type="button" onClick={() => toggleSubtask(st.id)} className={`flex-shrink-0 ${st.done ? 'text-green-500' : 'text-main/30'}`}>
                        {st.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <span className={`flex-1 text-sm truncate ${st.done ? 'line-through opacity-50 text-main' : 'text-main'}`}>{st.text}</span>
                      <button type="button" onClick={() => removeSubtask(st.id)} className="text-red-500/50 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addSubtask(e); } }}
                  className="flex-1 px-4 py-2 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-main"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                  placeholder="ชื่องานย่อย แล้วกด Enter..."
                />
                <button type="button" onClick={addSubtask} className="px-3 py-2 bg-primary-500 text-white rounded-[12px] text-sm font-bold shadow-sm active:scale-95 transition-transform">เพิ่ม</button>
              </div>
            </div>
          )}

          {/* Recurring */}
          {!formData.isPartTime && !formData.isNote && (
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">ตั้งเวลาทำซ้ำ (Recurring)</label>
              <select 
                value={formData.recurring}
                onChange={(e) => setFormData(prev => ({ ...prev, recurring: e.target.value }))}
                className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main text-sm font-bold appearance-none cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
              >
                <option value="none">ไม่ทำซ้ำ (ทำครั้งเดียว)</option>
                <option value="daily">ทุกวัน (Daily)</option>
                <option value="weekly">ทุกสัปดาห์ (Weekly)</option>
              </select>
            </div>
          )}

          {formData.isPartTime && (
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">อัตราค่าจ้าง (บาท)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  step="any"
                  name="hourlyRate"
                  value={formData.hourlyRate} 
                  onChange={handleChange}
                  required min="0" 
                  className="w-full px-4 py-3 rounded-[16px] font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 text-main" 
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }} 
                />
                <select 
                  name="rateType"
                  value={formData.rateType} 
                  onChange={handleChange}
                  className="px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main font-bold appearance-none text-sm"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                >
                  <option value="hourly" className="text-sm font-medium">/ ชั่วโมง</option>
                  <option value="daily" className="text-sm font-medium">/ วัน</option>
                </select>
              </div>
            </div>
          )}

          {formData.isPartTime && (
            <div className="flex items-center mt-2">
              <input 
                type="checkbox" 
                id="editIsHolidayPay"
                name="isHolidayPay"
                checked={formData.isHolidayPay} 
                onChange={e => setFormData({...formData, isHolidayPay: e.target.checked})}
                className="w-5 h-5 rounded text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="editIsHolidayPay" className="ml-2 text-sm font-bold text-main cursor-pointer">ทำในวันหยุด (ค่าแรง x2)</label>
            </div>
          )}

          {formData.isPartTime && (() => {
            const shiftHrs = formData.start && formData.end
              ? (new Date(formData.end) - new Date(formData.start)) / (1000 * 60 * 60)
              : 0;
            const canTakeBreak = true;
            return (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-sm font-medium text-main opacity-80">เวลาพักเบรก</label>
                  {shiftHrs > 0 && (
                    shiftHrs > 0
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">✓ ทำงาน {shiftHrs.toFixed(1)} ชม.</span>
                      : null
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="number"
                    name="breakHours"
                    value={formData.breakHours}
                    onChange={handleChange}
                    min="0"
                    step="0.5"
                    disabled={!canTakeBreak}
                    className={`w-28 px-4 py-3 rounded-[16px] font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-main transition-opacity ${!canTakeBreak ? 'opacity-30 cursor-not-allowed' : ''}`}
                    style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                    placeholder="0"
                  />
                  <span className={`text-sm font-bold transition-opacity ${!canTakeBreak ? 'opacity-30' : 'text-main/50'}`}>ชั่วโมง</span>
                  {canTakeBreak && shiftHrs > 0 && (() => {
                    const netHrs = Math.max(0, shiftHrs - (Number(formData.breakHours) || 0));
                    let estPay = formData.rateType === 'daily' ? (Number(formData.hourlyRate) || 0) : (netHrs * (Number(formData.hourlyRate) || 0));
                    if (formData.isHolidayPay) estPay *= 2;
                    return (
                      <div className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                        <span className="text-xs font-bold text-green-700 dark:text-green-400">ทำงาน {netHrs} ชม.</span>
                        <span className="text-green-500/30 font-black">·</span>
                        <span className="text-sm font-black text-green-600 dark:text-green-400">≈ ฿{estPay.toLocaleString()}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          <div className="space-y-4">
            {!formData.isPartTime && (
              <div 
                className="flex items-center justify-between mb-2 min-h-[52px] w-full px-5 rounded-[16px] transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                onClick={() => setFormData(prev => ({ ...prev, isAllDay: !prev.isAllDay }))}
              >
                <span className="text-sm font-bold text-main">{t.allDay}</span>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.isAllDay ? 'bg-primary-500' : 'bg-black/20 dark:bg-white/20'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-300 shadow-sm ${formData.isAllDay ? 'translate-x-[26px]' : 'translate-x-0.5'}`} />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.startTime}</label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                  type="date" 
                  value={formData.start.split('T')[0]} 
                  onChange={(e) => setFormData(prev => ({ ...prev, start: `${e.target.value}T${prev.start.split('T')[1] || '00:00'}` }))}
                  required
                  className="w-full px-2 sm:px-4 py-3.5 text-xs sm:text-sm font-bold rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main tracking-tight sm:tracking-wider min-w-0"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                />
                {!formData.isAllDay && (
                  <input 
                    onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                    type="time" 
                    value={formData.start.split('T')[1] || '00:00'} 
                    onChange={(e) => setFormData(prev => ({ ...prev, start: `${prev.start.split('T')[0] || toLocalISOString(new Date()).slice(0, 10)}T${e.target.value}` }))}
                    required
                    className="w-full px-2 sm:px-4 py-3.5 text-xs sm:text-sm font-bold rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main tracking-tight sm:tracking-wider text-center min-w-0"
                    style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.endTime}</label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                  type="date" 
                  value={formData.end.split('T')[0]} 
                  onChange={(e) => setFormData(prev => ({ ...prev, end: `${e.target.value}T${prev.end.split('T')[1] || '00:00'}` }))}
                  required
                  className="w-full px-2 sm:px-4 py-3.5 text-xs sm:text-sm font-bold rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main tracking-tight sm:tracking-wider min-w-0"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                />
                {!formData.isAllDay && (
                  <input 
                    onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                    type="time" 
                    value={formData.end.split('T')[1] || '00:00'} 
                    onChange={(e) => setFormData(prev => ({ ...prev, end: `${prev.end.split('T')[0] || toLocalISOString(new Date()).slice(0, 10)}T${e.target.value}` }))}
                    required
                    className="w-full px-2 sm:px-4 py-3.5 text-xs sm:text-sm font-bold rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main tracking-tight sm:tracking-wider text-center min-w-0"
                    style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                  />
                )}
              </div>
            </div>
          </div>
          


          <div className="flex justify-between items-center mt-8 pt-4">
            {task?.id ? (
              <button 
                type="button" 
                onClick={() => onDelete(task.id)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-500 bg-red-50/50 rounded-[16px] hover:bg-red-100/50 transition-colors"
              >
                <Trash2 size={18} /> <span className="hidden sm:inline">{t.delete}</span>
              </button>
            ) : <div></div>}
            
            <div className="flex gap-3 flex-1 justify-end">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-main rounded-[16px] transition-colors"
                style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
              >
                {t.cancel}
              </button>
              <button 
                type="submit"
                className="px-6 py-3 text-sm font-bold text-white bg-primary-500 rounded-[16px] hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all shadow-md active:scale-95 border"
                style={{ borderColor: 'var(--glass-border)' }}
              >
                {formData.isNote ? 'บันทึก' : t.saveTask}
              </button>
            </div>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
