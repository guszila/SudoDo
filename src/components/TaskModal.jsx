import React, { useState, useEffect } from 'react';
import { X, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { translations } from '../i18n';
import { motion, AnimatePresence } from 'framer-motion';

export default function TaskModal({ isOpen, onClose, onSave, onDelete, task, lang = 'en' }) {
  const t = translations[lang].modal;
  const statusT = translations[lang].status;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: new Date().toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16),
    status: 'To-Do',
    priority: 'กลาง'
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        start: task.start ? new Date(task.start).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        end: task.end ? new Date(task.end).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        status: task.status || 'To-Do',
        priority: task.priority || 'กลาง'
      });
    } else {
      setFormData({
        title: '',
        description: '',
        start: new Date().toISOString().slice(0, 16),
        end: new Date(new Date().getTime() + 60*60*1000).toISOString().slice(0, 16),
        status: 'To-Do',
        priority: 'กลาง'
      });
    }
  }, [task, isOpen]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center backdrop-blur-sm font-sans"
          style={{ backgroundColor: 'var(--overlay-bg)' }}
        >
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="liquid-glass-card w-full max-w-md p-6 relative rounded-t-[32px] md:rounded-[24px] pb-safe max-h-[90vh] overflow-y-auto"
          >
        <div className="w-12 h-1.5 rounded-full mx-auto mb-6 md:hidden" style={{ backgroundColor: 'var(--glass-border-strong)' }}></div>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-colors hidden md:block text-main opacity-60 hover:opacity-100"
          style={{ ':hover': { backgroundColor: 'var(--glass-bg-strong)' } }}
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold mb-4 text-main">
          {task?.id ? t.editTask : t.newTask}
        </h2>

        {/* Quick Done Toggle - big and easy to tap on mobile */}
        {task?.id && (
          <button
            type="button"
            onClick={() => {
              onSave({ ...task, status: formData.status === 'Done' ? 'To-Do' : 'Done' });
            }}
            className={`w-full flex items-center justify-center gap-3 py-4 mb-6 rounded-[18px] text-base font-bold transition-all active:scale-[0.97] ${
              formData.status === 'Done'
                ? 'bg-green-500/20 text-green-600 border-green-500/40'
                : 'text-main border-dashed opacity-80 hover:opacity-100'
            }`}
            style={{ border: formData.status === 'Done' ? '2px solid rgba(34,197,94,0.4)' : '2px dashed var(--glass-border-strong)' }}
          >
            {formData.status === 'Done' ? (
              <><CheckCircle2 size={24} /> เสร็จแล้ว! กดเพื่อยกเลิก</>
            ) : (
              <><Circle size={24} /> กดเพื่อทำเครื่องหมายเสร็จ ✅</>
            )}
          </button>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.title}</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              required
              className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
              style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
              placeholder={t.titlePlaceholder}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.description}</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.startTime}</label>
              <input 
                type="datetime-local" 
                name="start" 
                value={formData.start} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main"
                style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.endTime}</label>
              <input 
                type="datetime-local" 
                name="end" 
                value={formData.end} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main"
                style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">{t.status}</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main appearance-none"
                style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
              >
                <option value="To-Do">{statusT['To-Do']}</option>
                <option value="In Progress">{statusT['In Progress']}</option>
                <option value="Done">{statusT['Done']}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-main mb-1.5 opacity-80">ระดับความสำคัญ</label>
              <div 
                className="flex rounded-[16px] overflow-hidden p-1"
                style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
              >
                {[
                  { id: 'สูง', color: 'bg-red-500' },
                  { id: 'กลาง', color: 'bg-amber-500' },
                  { id: 'ต่ำ', color: 'bg-green-500' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, priority: p.id }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-[12px] transition-all ${
                      formData.priority === p.id 
                        ? 'shadow-sm text-main' 
                        : 'text-main/70 opacity-70 hover:opacity-100'
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
    </AnimatePresence>
  );
}
