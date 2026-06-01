import React, { useState, useEffect } from 'react';
import { updateProfile, updatePassword, signOut, sendEmailVerification, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, LogOut, Loader2, Check, Lock, AlertTriangle, Camera, Mail, Send, Calendar, UserX, RefreshCw } from 'lucide-react';

import { auth } from '../firebase';
import { useTasks } from '../contexts/TasksContext';
import { saveTask } from '../services/taskService';

export default function ProfilePage({ user }) {
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountText, setDeleteAccountText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const { tasks } = useTasks();

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

  const handleVerifyEmail = async () => {
    setSendingVerification(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await sendEmailVerification(user);
      setSuccessMsg('ส่งลิงก์ยืนยันไปที่อีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/too-many-requests') {
        setErrorMsg('ส่งลิงก์บ่อยเกินไป กรุณารอสักครู่');
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการส่งลิงก์ยืนยันอีเมล');
      }
    } finally {
      setSendingVerification(false);
    }
  };

  const handleResetPasswordEmail = async () => {
    setSendingReset(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSuccessMsg('ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว!');
    } catch (error) {
      console.error(error);
      setErrorMsg('เกิดข้อผิดพลาดในการส่งลิงก์รีเซ็ตรหัสผ่าน');
    } finally {
      setSendingReset(false);
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

  const handleDeleteAccount = async () => {
    const matchText = user.displayName || user.email;
    if (deleteAccountText !== matchText) return;
    
    setIsDeletingAccount(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      for (const task of tasks) {
        await saveTask('DELETE', { id: task.id }, user.uid);
      }
      await deleteUser(user);
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
         setErrorMsg('กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ เพื่อยืนยันตัวตนก่อนลบบัญชี');
      } else {
         setErrorMsg('เกิดข้อผิดพลาดในการลบบัญชี');
      }
      setShowDeleteAccount(false);
      setIsDeletingAccount(false);
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

  const getInitials = () => {
    if (user.displayName) {
      return user.displayName.substring(0, 2).toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const getMemberSince = () => {
    if (!user.metadata?.creationTime) return '';
    const date = new Date(user.metadata.creationTime);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const dateString = date.toLocaleDateString('th-TH', options);
    
    const diffTime = Math.abs(new Date() - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `เป็นสมาชิกเมื่อ ${dateString} (${diffDays} วัน)`;
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
          <h1 className="text-3xl font-bold tracking-tight text-main">โปรไฟล์ (Profile)</h1>
        </div>

        {/* Profile Card */}
        <div className="liquid-glass-card p-6 md:p-8 mb-8 relative">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8 pb-8" style={{ borderBottom: '1px solid var(--glass-border-strong)' }}>
            
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg flex-shrink-0" style={{ border: '4px solid var(--glass-border)' }}>
              {getInitials()}
            </div>

            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold text-main mb-2">{user.displayName || 'ผู้ใช้ SudoDo'}</h2>
              
              <div className="flex flex-col gap-1 items-center md:items-start text-sm text-main opacity-80">
                <p className="flex items-center gap-2">
                  <Mail size={16} /> {user.email}
                  {user.emailVerified ? (
                    <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-green-500/20">
                      <Check size={12} /> ยืนยันแล้ว
                    </span>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border border-amber-500/20">
                      <AlertTriangle size={12} /> ยังไม่ยืนยัน
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-2 mt-1">
                  <Calendar size={16} /> {getMemberSince()}
                </p>
              </div>

              {/* Verify Email Button (if not verified) */}
              {!user.emailVerified && (
                <button 
                  onClick={handleVerifyEmail}
                  disabled={sendingVerification}
                  className="mt-3 text-sm flex items-center gap-2 text-primary-500 font-bold hover:text-primary-600 transition-colors"
                >
                  {sendingVerification ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  ส่งลิงก์ยืนยันอีเมล
                </button>
              )}
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
                <Lock size={20} className="text-amber-500" /> ความปลอดภัย
              </h3>
              <label className="block text-sm font-medium text-main mb-2 opacity-80">เปลี่ยนรหัสผ่านใหม่ (New Password)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-amber-500 text-main transition-shadow"
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
              
              <button
                type="button"
                onClick={handleResetPasswordEmail}
                disabled={sendingReset}
                className="mt-4 text-sm flex items-center gap-2 text-main opacity-70 hover:opacity-100 transition-opacity font-medium"
              >
                {sendingReset ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                ลืมรหัสผ่าน? ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมล
              </button>
            </form>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="liquid-glass-card p-6 md:p-8 mb-8 border-red-500/20" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
          <h3 className="text-lg font-bold text-red-500 mb-2 flex items-center gap-2">
            <UserX size={20} /> ลบบัญชีผู้ใช้ (Delete Account)
          </h3>
          <p className="text-sm text-main opacity-70 mb-4">การลบบัญชีจะลบข้อมูลงานและรายได้ของคุณทั้งหมดอย่างถาวร ไม่สามารถกู้คืนได้</p>
          
          {showDeleteAccount ? (
            <div className="mt-4 p-4 rounded-[16px] bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-600 font-medium mb-3">
                พิมพ์ <span className="font-bold select-all">"{user.displayName || user.email}"</span> เพื่อยืนยันการลบ
              </p>
              <input 
                type="text" 
                value={deleteAccountText}
                onChange={(e) => setDeleteAccountText(e.target.value)}
                className="w-full px-4 py-3 rounded-[12px] bg-white dark:bg-black/20 border border-red-500/30 focus:outline-none focus:border-red-500 text-main mb-3 text-center font-bold"
                placeholder={user.displayName || user.email}
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => { setShowDeleteAccount(false); setDeleteAccountText(''); }}
                  className="flex-1 py-3 text-main font-bold rounded-[12px] bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  disabled={deleteAccountText !== (user.displayName || user.email) || isDeletingAccount}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-[12px] hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-red-500/30"
                >
                  {isDeletingAccount ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />} 
                  ยืนยันลบถาวร
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowDeleteAccount(true)}
              className="px-6 py-3 w-full sm:w-auto bg-red-500 text-white font-bold rounded-[16px] hover:bg-red-600 transition-all shadow-md shadow-red-500/30 active:scale-95"
            >
              ลบบัญชีถาวร
            </button>
          )}
        </div>

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
    </motion.div>
  );
}
