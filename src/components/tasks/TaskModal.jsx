import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Trash2, CheckCircle2, Circle } from 'lucide-react';

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

export default function TaskModal({ isOpen, onClose, onSave, onDelete, task, lang = 'en' }) {
  const t = translations[lang].modal;
  const statusT = translations[lang].status;
  const dragControls = useDragControls();
  const { settings } = useSettings();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: new Date().toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16),
    status: TASK_STATUS.TODO,
    priority: TASK_PRIORITY.MEDIUM
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        start: task.start ? new Date(task.start).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        end: task.end ? new Date(task.end).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        status: task.status || TASK_STATUS.TODO,
        priority: task.priority || TASK_PRIORITY.MEDIUM,
        isPartTime: task.isPartTime || false,
        hourlyRate: task.hourlyRate || DEFAULT_TASK_VALUES.HOURLY_RATE,
        isHolidayPay: task.isHolidayPay || false,
        rateType: task.rateType || 'hourly',
        breakHours: task.breakHours ?? 0,
        isAllDay: task.isAllDay || false
      });
    } else {
      setFormData({
        title: '',
        description: '',
        start: new Date().toISOString().slice(0, 16),
        end: new Date(new Date().getTime() + 60*60*1000).toISOString().slice(0, 16),
        status: TASK_STATUS.TODO,
        priority: TASK_PRIORITY.MEDIUM,
        isPartTime: false,
        hourlyRate: DEFAULT_TASK_VALUES.HOURLY_RATE,
        isHolidayPay: false,
        rateType: 'hourly',
        breakHours: 0,
        isAllDay: false
      });
    }
  }, [task, isOpen]);

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
            ? (formData.isPartTime ? 'แก้ไขกะงาน' : t.editTask) 
            : (formData.isPartTime ? 'เพิ่มกะงาน' : t.newTask)}
        </h2>

        {/* Quick Done Toggle - big and easy to tap on mobile */}
        {task?.id && (
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
              <><CheckCircle2 size={24} /> {formData.isPartTime ? 'ทำเครื่องหมายว่าจบกะแล้ว' : t.quickDone}</>
            ) : (
              <><Circle size={24} /> {formData.isPartTime ? 'กดเพื่อทำเครื่องหมายว่าจบกะ' : t.quickMarkDone}</>
            )}
          </button>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-main mb-1.5 opacity-80">
              {formData.isPartTime ? 'ชื่องาน / สถานที่' : t.title}
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
                placeholder={formData.isPartTime ? "ระบุชื่อบริษัท..." : t.titlePlaceholder}
              />
            )}
          </div>

          {!formData.isPartTime && (
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
              {formData.isPartTime ? 'หมายเหตุ (เช่น ทำกะแทนใคร)' : t.description}
            </label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={3}
              className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
              style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
              placeholder={t.descriptionPlaceholder}
            />
          </div>

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
                    onChange={(e) => setFormData(prev => ({ ...prev, start: `${prev.start.split('T')[0] || new Date().toISOString().slice(0, 10)}T${e.target.value}` }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, end: `${prev.end.split('T')[0] || new Date().toISOString().slice(0, 10)}T${e.target.value}` }))}
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
                {t.saveTask}
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
