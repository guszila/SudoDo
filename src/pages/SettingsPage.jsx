import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Check, AlertTriangle, Database, Trash2, Moon, Sun, Languages, Settings } from 'lucide-react';
import { saveTask } from '../services/taskService';
import { useTasks } from '../contexts/TasksContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SettingsPage({ user, lang, setLang, theme, toggleTheme }) {
  const navigate = useNavigate();
  const { tasks } = useTasks();
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Data Reset State
  const [resetIncomeConfirmText, setResetIncomeConfirmText] = useState('');
  const [isResettingIncome, setIsResettingIncome] = useState(false);
  
  // Delete Data State
  const [showDeleteDataConfirm, setShowDeleteDataConfirm] = useState(false);
  const [deleteDataConfirmText, setDeleteDataConfirmText] = useState('');
  const [isDeletingData, setIsDeletingData] = useState(false);

  const handleResetIncome = async () => {
    if (resetIncomeConfirmText !== 'ยืนยัน') return;
    
    setIsResettingIncome(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const historyTasks = tasks.filter(t => t.isPartTime);
      for (const task of historyTasks) {
        await saveTask('DELETE', { id: task.id }, user.uid);
      }
      setSuccessMsg(lang === 'th' ? 'รีเซ็ตประวัติรายได้ทั้งหมดสำเร็จ' : 'Income history reset successfully');
      setResetIncomeConfirmText('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error(error);
      setErrorMsg(lang === 'th' ? 'เกิดข้อผิดพลาดในการรีเซ็ตรายได้' : 'Failed to reset income history');
    } finally {
      setIsResettingIncome(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteDataConfirmText !== user.displayName) return;
    
    setShowDeleteDataConfirm(false);
    setIsDeletingData(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      for (const task of tasks) {
        await saveTask('DELETE', { id: task.id }, user.uid);
      }
      setSuccessMsg(lang === 'th' ? 'ลบข้อมูลทุกอย่างสำเร็จแล้ว' : 'All data deleted successfully');
      setDeleteDataConfirmText('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error(error);
      setErrorMsg(lang === 'th' ? 'เกิดข้อผิดพลาดในการลบข้อมูล' : 'Failed to delete data');
    } finally {
      setIsDeletingData(false);
    }
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'th' : 'en');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="min-h-screen p-4 md:p-8 font-sans pb-24 md:pb-8 overflow-x-hidden"
    >
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/')}
            className="liquid-glass-button p-3 flex items-center justify-center text-main"
            style={{ ':hover': { backgroundColor: 'var(--glass-bg-strong)' } }}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-main">{lang === 'th' ? 'ตั้งค่าแอป (Settings)' : 'Settings'}</h1>
        </div>

        {successMsg && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-[16px] flex items-center gap-2 text-green-700 font-medium">
            <Check size={20} /> {successMsg}
          </div>
        )}
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-[16px] flex items-center gap-2 text-red-700 font-medium">
            <AlertTriangle size={20} /> {errorMsg}
          </div>
        )}

        {/* Display Settings */}
        <div className="liquid-glass-card p-6 md:p-8 mb-8 relative">
          <h3 className="text-lg font-bold text-main mb-6 flex items-center gap-2 border-b border-main/10 pb-4">
            <Settings size={20} className="text-primary-500" /> {lang === 'th' ? 'การแสดงผล (Display)' : 'Display'}
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-main/5 border border-main/10 rounded-[16px]">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon size={24} className="text-indigo-500" /> : <Sun size={24} className="text-yellow-500" />}
                <div>
                  <h4 className="font-bold text-main">{lang === 'th' ? 'ธีมแอปพลิเคชัน' : 'App Theme'}</h4>
                  <p className="text-sm text-main/70">{lang === 'th' ? 'เลือกโหมดมืดหรือสว่าง' : 'Choose dark or light mode'}</p>
                </div>
              </div>
              <div 
                onClick={toggleTheme}
                className="relative w-16 h-8 rounded-full bg-black/10 dark:bg-white/10 cursor-pointer p-1 transition-colors border border-black/5 dark:border-white/5 shadow-inner"
              >
                <motion.div 
                  className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md"
                  animate={{ x: theme === 'dark' ? 32 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {theme === 'dark' ? <Moon size={14} className="text-indigo-600" /> : <Sun size={14} className="text-amber-500" />}
                </motion.div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-main/5 border border-main/10 rounded-[16px]">
              <div className="flex items-center gap-3">
                <Languages size={24} className="text-primary-500" />
                <div>
                  <h4 className="font-bold text-main">{lang === 'th' ? 'ภาษา (Language)' : 'Language'}</h4>
                  <p className="text-sm text-main/70">{lang === 'th' ? 'สลับภาษาไทย / English' : 'Switch Thai / English'}</p>
                </div>
              </div>
              <div 
                onClick={toggleLanguage}
                className="relative w-16 h-8 rounded-full bg-black/10 dark:bg-white/10 cursor-pointer p-1 transition-colors border border-black/5 dark:border-white/5 shadow-inner flex items-center justify-between px-2 text-[10px] font-bold text-main/50"
              >
                <span>TH</span>
                <span>EN</span>
                <motion.div 
                  className="absolute w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md text-[10px] font-bold text-primary-600 top-1 left-1"
                  animate={{ x: lang === 'en' ? 32 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  {lang === 'en' ? 'EN' : 'TH'}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="liquid-glass-card p-6 md:p-8 mb-8 relative">
          <h3 className="text-lg font-bold text-main mb-6 flex items-center gap-2 border-b border-main/10 pb-4">
            <Database size={20} className="text-amber-500" /> {lang === 'th' ? 'ข้อมูล (Data)' : 'Data'}
          </h3>
          
          <div className="space-y-8">
            {/* Reset Income */}
            <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-[16px]">
              <h4 className="font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                <Trash2 size={16} /> {lang === 'th' ? 'รีเซ็ตประวัติรายได้' : 'Reset Income History'}
              </h4>
              <p className="text-sm text-main/70 mb-4">
                {lang === 'th' ? 'จะลบประวัติรายได้ทั้งหมด และเริ่มนับใหม่จาก ฿0' : 'Delete all income history and start fresh from ฿0'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={resetIncomeConfirmText} 
                  onChange={(e) => setResetIncomeConfirmText(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-amber-500 text-main transition-shadow"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                  placeholder={lang === 'th' ? "พิมพ์คำว่า 'ยืนยัน' เพื่อลบ" : "Type 'ยืนยัน' to delete"}
                />
                <button 
                  onClick={handleResetIncome}
                  disabled={isResettingIncome || resetIncomeConfirmText !== 'ยืนยัน'}
                  className="px-6 py-3 bg-amber-500 text-white font-bold rounded-[16px] hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-md active:scale-95 disabled:opacity-50 sm:w-auto w-full flex justify-center items-center h-[50px]"
                >
                  {isResettingIncome ? <Loader2 size={20} className="animate-spin" /> : (lang === 'th' ? 'รีเซ็ตรายได้' : 'Reset Income')}
                </button>
              </div>
            </div>

            {/* Delete All Data */}
            <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-[16px]">
              <h4 className="font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} /> {lang === 'th' ? 'ลบข้อมูลทั้งหมด' : 'Delete All Data'}
              </h4>
              <p className="text-sm text-main/70 mb-4">
                {lang === 'th' ? 'ลบงานและกะทั้งหมดออกจากระบบ การกระทำนี้ไม่สามารถกู้คืนได้ (ไม่ลบบัญชีผู้ใช้)' : 'Delete all tasks and shifts. This cannot be undone. (Does not delete your account)'}
              </p>
              <button 
                onClick={() => setShowDeleteDataConfirm(true)}
                className="px-6 py-3 bg-red-500/10 text-red-600 font-bold rounded-[16px] hover:bg-red-500/20 transition-all active:scale-95 border border-red-500/20 w-full sm:w-auto"
              >
                {lang === 'th' ? 'ลบข้อมูลทั้งหมด' : 'Delete All Data'}
              </button>
            </div>
          </div>
        </div>

      </div>

      <ConfirmDialog 
        isOpen={showDeleteDataConfirm}
        title={lang === 'th' ? "ยืนยันการลบข้อมูลทั้งหมด" : "Confirm Data Deletion"}
        message={lang === 'th' ? `โปรดพิมพ์ชื่อแสดงผลของคุณเพื่อยืนยัน\n(ชื่อปัจจุบัน: ${user?.displayName})` : `Please type your display name to confirm\n(Current: ${user?.displayName})`}
        confirmText={lang === 'th' ? "ลบถาวร" : "Delete Permanently"}
        cancelText={lang === 'th' ? "ยกเลิก" : "Cancel"}
        isDanger={true}
        onConfirm={handleDeleteAllData}
        onCancel={() => {
          setShowDeleteDataConfirm(false);
          setDeleteDataConfirmText('');
        }}
      />
      {showDeleteDataConfirm && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none p-4">
            <input 
              type="text" 
              value={deleteDataConfirmText} 
              onChange={(e) => setDeleteDataConfirmText(e.target.value)}
              className="mt-[160px] max-w-sm w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-red-500 text-main transition-shadow pointer-events-auto shadow-2xl"
              style={{ backgroundColor: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)' }}
              placeholder={`พิมพ์ '${user?.displayName}'`}
              autoFocus
            />
         </div>
      )}
    </motion.div>
  );
}
