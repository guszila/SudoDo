import React, { useState, useEffect } from 'react';

import { updateProfile, updatePassword, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, LogOut, Loader2, Check, Lock, AlertTriangle, Database, Trash2 } from 'lucide-react';

import { auth } from '../firebase';
import { useTasks } from '../contexts/TasksContext';
import { saveTask } from '../services/taskService';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ProfilePage({ user }) {
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { tasks } = useTasks();
  
  // Data Reset State
  const [resetIncomeConfirmText, setResetIncomeConfirmText] = useState('');
  const [isResettingIncome, setIsResettingIncome] = useState(false);
  
  // Delete Data State
  const [showDeleteDataConfirm, setShowDeleteDataConfirm] = useState(false);
  const [deleteDataConfirmText, setDeleteDataConfirmText] = useState('');
  const [isDeletingData, setIsDeletingData] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  if (!user) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || displayName === user.displayName) return;
    
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      setSuccessMsg('อัปเดตชื่อแสดงผลสำเร็จแล้ว!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error("Error updating profile", error);
      setErrorMsg('เกิดข้อผิดพลาดในการอัปเดตชื่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await updatePassword(user, newPassword);
      setSuccessMsg('เปลี่ยนรหัสผ่านสำเร็จแล้ว!');
      setNewPassword('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error("Error updating password", error);
      if (error.code === 'auth/requires-recent-login') {
        setErrorMsg('กรุณาออกจากระบบและเข้าสู่ระบบใหม่ก่อนเปลี่ยนรหัสผ่านเพื่อความปลอดภัย');
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

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
      setSuccessMsg('รีเซ็ตประวัติรายได้ทั้งหมดสำเร็จ');
      setResetIncomeConfirmText('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error(error);
      setErrorMsg('เกิดข้อผิดพลาดในการรีเซ็ตรายได้');
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
      setSuccessMsg('ลบข้อมูลทุกอย่างสำเร็จแล้ว');
      setDeleteDataConfirmText('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error(error);
      setErrorMsg('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsDeletingData(false);
    }
  };

  const getInitials = () => {
    if (user.displayName) {
      return user.displayName.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
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
          <h1 className="text-3xl font-bold tracking-tight text-main">ตั้งค่าโปรไฟล์ (Profile)</h1>
        </div>

        {/* Profile Card */}
        <div className="liquid-glass-card p-6 md:p-8 mb-8 relative">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8 pb-8" style={{ borderBottom: '1px solid var(--glass-border-strong)' }}>
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg flex-shrink-0" style={{ border: '4px solid var(--glass-border)' }}>
              {getInitials()}
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-main mb-1">{user.displayName || 'ผู้ใช้ SudoDo'}</h2>
              <p className="text-main opacity-70 flex items-center justify-center md:justify-start gap-2">
                <User size={16} /> {user.email}
              </p>
            </div>
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

          <div className="space-y-10">
            {/* Update Profile Form */}
            <form onSubmit={handleUpdateProfile}>
              <h3 className="text-lg font-bold text-main mb-4 flex items-center gap-2">
                <User size={20} className="text-primary-500" /> ข้อมูลทั่วไป
              </h3>
              <label className="block text-sm font-medium text-main mb-2 opacity-80">ชื่อที่ใช้แสดง (Display Name)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                  placeholder="กรอกชื่อของคุณ"
                />
                <button 
                  type="submit"
                  disabled={loading || displayName === user.displayName || !displayName.trim()}
                  className="px-6 py-3 bg-primary-500 text-white font-bold rounded-[16px] hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-md active:scale-95 disabled:opacity-50 sm:w-auto w-full flex justify-center items-center h-[50px]"
                  style={{ border: '1px solid var(--glass-border)' }}
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'บันทึกชื่อ'}
                </button>
              </div>
            </form>

            {/* Update Password Form */}
            <form onSubmit={handleUpdatePassword}>
              <h3 className="text-lg font-bold text-main mb-4 flex items-center gap-2">
                <Lock size={20} className="text-primary-500" /> ความปลอดภัย
              </h3>
              <label className="block text-sm font-medium text-main mb-2 opacity-80">เปลี่ยนรหัสผ่านใหม่ (New Password)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow"
                  style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                  placeholder="รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
                />
                <button 
                  type="submit"
                  disabled={loading || newPassword.length < 6}
                  className="px-6 py-3 bg-amber-500 text-white font-bold rounded-[16px] hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-md active:scale-95 disabled:opacity-50 sm:w-auto w-full flex justify-center items-center h-[50px]"
                  style={{ border: '1px solid var(--glass-border)' }}
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'เปลี่ยนรหัสผ่าน'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Data Section (Moved to Settings) */}

        {/* Logout Section */}
        <div className="liquid-glass-card p-6 md:p-8 flex flex-col items-center sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-main mb-1">ออกจากระบบ (Logout)</h3>
            <p className="text-sm text-main opacity-70">คุณสามารถเข้าสู่ระบบใหม่ได้ตลอดเวลา</p>
          </div>
          
          {showLogoutConfirm ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 sm:flex-none px-4 py-3 text-main font-bold rounded-[16px] transition-all active:scale-95"
                style={{ backgroundColor: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)' }}
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 sm:flex-none px-4 py-3 bg-red-500 text-white font-bold rounded-[16px] hover:bg-red-600 transition-all shadow-md active:scale-95 border border-red-500/20 flex items-center justify-center gap-2"
              >
                <LogOut size={18} /> ยืนยันออก
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full sm:w-auto px-6 py-3 bg-red-500/10 text-red-600 font-bold rounded-[16px] hover:bg-red-500/20 transition-all active:scale-95 border border-red-500/20 flex items-center justify-center gap-2"
            >
              <LogOut size={18} /> ออกจากระบบ
            </button>
          )}
        </div>
      </div>

      {/* Deleted Data Dialog (Moved to Settings) */}
    </motion.div>
  );
}
