import React, { useState, useEffect } from 'react';
import { updateProfile, sendEmailVerification } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, User, Loader2, Check, Lock, AlertTriangle, Camera, Mail, 
  Send, Calendar, Flame, Award, Medal, CheckCircle2, X, Users, Settings,
  ZoomIn, ZoomOut, Palette
} from 'lucide-react';

import { useTasks } from '../contexts/TasksContext';
import { useToast } from '../contexts/ToastContext';
import { calculateStreaks, BADGE_LIST, getUnlockedBadges } from '../utils/gamification';
import { getPublicProfile, updatePublicProfileSettings, syncPublicProfile } from '../services/friendService';

const PRESET_BANNERS = [
  { id: 'cyberpunk', name: 'Cyberpunk', value: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' },
  { id: 'indigo', name: 'Deep Indigo', value: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)' },
  { id: 'sunset', name: 'Sunset Glow', value: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
  { id: 'emerald', name: 'Emerald Breeze', value: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)' },
  { id: 'golden', name: 'Golden Aura', value: 'linear-gradient(135deg, #eab308 0%, #f97316 100%)' },
  { id: 'midnight', name: 'Midnight Mist', value: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }
];

export default function ProfilePage({ user, lang = 'th' }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('private'); // 'private', 'public', 'achievements'
  
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem(`avatar_${user?.uid}`) || '');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const [bannerColor, setBannerColor] = useState(() => 
    localStorage.getItem(`profile_banner_${user?.uid}`) || 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
  );
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  
  const [statusMessage, setStatusMessage] = useState('');
  const [featuredBadgeId, setFeaturedBadgeId] = useState('');
  const [isSavingPublic, setIsSavingPublic] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { tasks } = useTasks();
  
  const streaks = calculateStreaks(tasks);
  const unlockedBadges = getUnlockedBadges(tasks, streaks);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setAvatarUrl(localStorage.getItem(`avatar_${user.uid}`) || '');
      
      // Load public profile
      getPublicProfile(user.uid).then(data => {
        if (data) {
          if (data.statusMessage) setStatusMessage(data.statusMessage);
          if (data.featuredBadgeId) setFeaturedBadgeId(data.featuredBadgeId);
        }
      });
    }
  }, [user]);

  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  const [cropImageSize, setCropImageSize] = useState({ width: 260, height: 260 });
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 });
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('รูปภาพต้องมีขนาดไม่เกิน 2MB ครับ');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        let w = 260;
        let h = 260;
        if (aspect > 1) {
          w = 260 * aspect;
        } else {
          h = 260 / aspect;
        }
        setCropImageSize({ width: w, height: h });
        setCropOffset({ x: 0, y: 0 });
        setCropZoom(1);
        setTempImageSrc(dataUrl);
        setShowCropModal(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e) => {
    setIsDraggingCrop(true);
    setCropDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDraggingCrop) return;
    setCropOffset({
      x: e.clientX - cropDragStart.x,
      y: e.clientY - cropDragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDraggingCrop(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDraggingCrop(true);
    const touch = e.touches[0];
    setCropDragStart({ x: touch.clientX - cropOffset.x, y: touch.clientY - cropOffset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDraggingCrop || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setCropOffset({
      x: touch.clientX - cropDragStart.x,
      y: touch.clientY - cropDragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDraggingCrop(false);
  };

  const handleSaveCrop = () => {
    setIsSavingCrop(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 256, 256);
      
      const scaleToCanvas = 256 / 200;
      const w_canvas = cropImageSize.width * cropZoom * scaleToCanvas;
      const h_canvas = cropImageSize.height * cropZoom * scaleToCanvas;
      const cx_canvas = 128 + cropOffset.x * scaleToCanvas;
      const cy_canvas = 128 + cropOffset.y * scaleToCanvas;
      
      const x_canvas = cx_canvas - w_canvas / 2;
      const y_canvas = cy_canvas - h_canvas / 2;
      
      ctx.drawImage(img, x_canvas, y_canvas, w_canvas, h_canvas);
      
      try {
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        localStorage.setItem(`avatar_${user.uid}`, croppedDataUrl);
        setAvatarUrl(croppedDataUrl);
        
        // Sync public profile immediately to Firestore
        syncPublicProfile(user, tasks).catch(err => console.error("Error syncing profile on avatar change", err));

        setSuccessMsg('เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        console.error("Cropping error", err);
        setErrorMsg('เกิดข้อผิดพลาดในการตัดครอบรูปภาพ');
      } finally {
        setIsSavingCrop(false);
        setShowCropModal(false);
      }
    };
    img.src = tempImageSrc;
  };

  const handleRemoveAvatar = () => {
    localStorage.removeItem(`avatar_${user.uid}`);
    setAvatarUrl('');
    // Sync public profile immediately to Firestore
    syncPublicProfile(user, tasks).catch(err => console.error("Error syncing profile on avatar remove", err));
  };

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

  const handleSavePublicProfile = async (e) => {
    e.preventDefault();
    setIsSavingPublic(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await updatePublicProfileSettings(user.uid, {
        statusMessage: statusMessage.trim(),
        featuredBadgeId
      });
      if (res) {
        setSuccessMsg(lang === 'en' ? 'Public profile updated!' : 'อัปเดตโปรไฟล์สาธารณะเรียบร้อยแล้ว!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการบันทึกโปรไฟล์สาธารณะ');
      }
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกโปรไฟล์สาธารณะ');
    } finally {
      setIsSavingPublic(false);
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-main">{lang === 'en' ? 'Profile' : 'โปรไฟล์'}</h1>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="liquid-glass-button p-3 flex items-center justify-center text-main hover:text-primary-500 transition-colors"
          >
            <Settings size={24} />
          </button>
        </div>

        {/* Global Messages */}
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

        {/* Custom Tabs */}
        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl mb-8 border border-main/10 shadow-inner overflow-x-auto hide-scrollbar snap-x">
          <button 
            onClick={() => setActiveTab('private')}
            className={`flex-1 min-w-[110px] snap-center py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'private' ? 'bg-white dark:bg-[#2a2a3e] text-primary-500 shadow-sm' : 'text-main/60 hover:text-main'}`}
          >
            <User size={18} /> {lang === 'en' ? 'Private' : 'ข้อมูลส่วนตัว'}
          </button>
          <button 
            onClick={() => setActiveTab('public')}
            className={`flex-1 min-w-[110px] snap-center py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'public' ? 'bg-white dark:bg-[#2a2a3e] text-primary-500 shadow-sm' : 'text-main/60 hover:text-main'}`}
          >
            <Users size={18} /> {lang === 'en' ? 'Public' : 'สาธารณะ'}
          </button>
          <button 
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 min-w-[110px] snap-center py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0 ${activeTab === 'achievements' ? 'bg-white dark:bg-[#2a2a3e] text-primary-500 shadow-sm' : 'text-main/60 hover:text-main'}`}
          >
            <Award size={18} /> {lang === 'en' ? 'Stats' : 'ความสำเร็จ'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ================= TAB 1: PRIVATE PROFILE ================= */}
          {activeTab === 'private' && (
            <motion.div 
              key="private"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="liquid-glass-card overflow-hidden p-0 rounded-[28px] relative">
                {/* Banner Background */}
                <div 
                  className="w-full h-32 md:h-40 relative transition-all duration-500"
                  style={{ background: bannerColor }}
                >
                  {/* Edit Banner Button */}
                  <button 
                    type="button"
                    onClick={() => setShowBannerPicker(true)}
                    className="absolute top-4 right-4 bg-black/30 hover:bg-black/50 text-white p-2.5 rounded-full backdrop-blur-md transition-colors border border-white/10 flex items-center justify-center cursor-pointer shadow-md"
                    title={lang === 'en' ? 'Customize Banner' : 'ปรับแต่งแบนเนอร์'}
                  >
                    <Palette size={16} />
                  </button>
                </div>

                {/* Profile Details Container */}
                <div className="p-6 pt-0 flex flex-col md:flex-row items-center md:items-end gap-6 relative z-10 text-center md:text-left mt-[-48px] md:mt-[-56px]">
                  {/* Avatar with animated rotating border */}
                  <div className="relative flex-shrink-0 group">
                    <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-primary-500 via-indigo-500 to-pink-500 opacity-80 blur-[1px] animate-[spin_6s_linear_infinite] group-hover:opacity-100 group-hover:blur-[4px] transition-all duration-500 shadow-lg" />
                    <button
                      type="button"
                      onClick={() => setShowAvatarModal(true)}
                      className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden relative active:scale-95 transition-transform border-[4px] border-white dark:border-[#1e1e2d] z-10"
                    >
                      {avatarUrl
                        ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        : getInitials()
                      }
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-20">
                        <Camera size={28} className="text-white" />
                      </div>
                    </button>
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { handleAvatarChange(e); setShowAvatarModal(false); }} />
                  </div>

                  <div className="flex-1 md:pb-2">
                    <h2 className="text-2xl font-bold text-main mb-2 flex items-center justify-center md:justify-start gap-2">
                      {user.displayName || 'ผู้ใช้ SudoDo'}
                    </h2>
                    
                    <div className="flex flex-col gap-1 items-center md:items-start text-sm text-main opacity-80">
                      <p className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                        <span className="flex items-center gap-1"><Mail size={16} /> {user.email}</span>
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

                    {!user.emailVerified && (
                      <button 
                        onClick={handleVerifyEmail}
                        disabled={sendingVerification}
                        className="mt-3 text-sm flex items-center gap-2 text-primary-500 font-bold hover:text-primary-600 transition-colors mx-auto md:mx-0"
                      >
                        {sendingVerification ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        ส่งลิงก์ยืนยันอีเมล
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="liquid-glass-card p-6 md:p-8">
                <form onSubmit={handleUpdateProfile}>
                  <h3 className="text-sm font-bold text-main/50 uppercase tracking-wider mb-3">แก้ไขชื่อที่ใช้แสดง</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow font-medium"
                      style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                      placeholder="กรอกชื่อของคุณ"
                    />
                    <button 
                      type="submit"
                      disabled={loading || displayName === user.displayName || !displayName.trim()}
                      className="px-6 py-3 bg-primary-500 text-white font-bold rounded-[16px] hover:bg-primary-600 transition-all shadow-md active:scale-95 disabled:opacity-50 flex justify-center items-center min-h-[50px]"
                    >
                      {loading ? <Loader2 size={20} className="animate-spin" /> : 'บันทึก'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ================= TAB 2: PUBLIC PROFILE ================= */}
          {activeTab === 'public' && (
            <motion.div 
              key="public"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              <div className="liquid-glass-card p-6 md:p-8">
                <form onSubmit={handleSavePublicProfile} className="relative z-10">
                  <h3 className="text-lg font-bold text-main mb-6 flex items-center gap-2">
                    <Users size={22} className="text-primary-500" /> {lang === 'en' ? 'Public Profile (For Friends)' : 'โปรไฟล์สาธารณะ (ให้เพื่อนเห็น)'}
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-main mb-2 opacity-80">{lang === 'en' ? 'Status Message' : 'ข้อความสถานะ'}</label>
                      <input 
                        type="text" 
                        value={statusMessage} 
                        onChange={(e) => setStatusMessage(e.target.value)}
                        className="w-full px-4 py-3 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-primary-500 text-main transition-shadow font-medium"
                        style={{ backgroundColor: 'var(--glass-bg-input)', border: '1px solid var(--glass-border)' }}
                        placeholder={lang === 'en' ? "What's on your mind?" : "กำลังทำอะไรอยู่?"}
                        maxLength={50}
                      />
                      <p className="text-xs text-main/50 mt-1">{statusMessage.length}/50</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-main mb-3 opacity-80">{lang === 'en' ? 'Featured Badge' : 'เหรียญรางวัลเด่น'}</label>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        <div 
                          onClick={() => setFeaturedBadgeId('')}
                          className={`p-3 rounded-2xl flex items-center justify-center cursor-pointer border-2 transition-all ${!featuredBadgeId ? 'border-primary-500 bg-primary-500/10' : 'border-transparent bg-black/5 dark:bg-white/5 opacity-50 hover:opacity-100'}`}
                          title="None"
                        >
                          <span className="text-main/50 font-bold text-xs">None</span>
                        </div>
                        {unlockedBadges.map(unlockedItem => {
                          const fullBadge = BADGE_LIST.find(b => b.id === unlockedItem.id);
                          if (!fullBadge) return null;
                          return (
                            <div 
                              key={fullBadge.id}
                              onClick={() => setFeaturedBadgeId(fullBadge.id)}
                              className={`p-3 rounded-2xl flex items-center justify-center cursor-pointer border-2 transition-all text-3xl ${featuredBadgeId === fullBadge.id ? 'border-primary-500 bg-primary-500/10 shadow-md' : 'border-transparent bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'}`}
                              title={fullBadge.name[lang] || fullBadge.name.th}
                            >
                              <div className="hover:scale-110 transition-transform">{fullBadge.icon}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button 
                        type="submit" 
                        disabled={isSavingPublic}
                        className="flex items-center justify-center px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-[16px] font-bold transition-all active:scale-95 disabled:opacity-50 min-w-[140px] shadow-lg shadow-primary-500/30"
                      >
                        {isSavingPublic ? <Loader2 className="animate-spin" size={20} /> : (lang === 'en' ? 'Save Changes' : 'บันทึกการเปลี่ยนแปลง')}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ================= TAB 3: ACHIEVEMENTS ================= */}
          {activeTab === 'achievements' && (
            <motion.div 
              key="achievements"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="liquid-glass-card p-6 rounded-[24px] flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Flame size={36} className={`mb-3 ${streaks.currentStreak > 0 ? 'text-orange-500 animate-pulse' : 'text-main/20'}`} />
                  <h3 className="text-4xl font-black text-main">{streaks.currentStreak} <span className="text-lg font-bold text-main/50">วัน</span></h3>
                  <p className="text-xs font-bold text-main/60 uppercase tracking-wider mt-2">ไฟกำลังลุก (Current)</p>
                </div>
                
                <div className="liquid-glass-card p-6 rounded-[24px] flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Medal size={36} className="mb-3 text-yellow-500" />
                  <h3 className="text-4xl font-black text-main">{streaks.longestStreak} <span className="text-lg font-bold text-main/50">วัน</span></h3>
                  <p className="text-xs font-bold text-main/60 uppercase tracking-wider mt-2">สถิติสูงสุด (Longest)</p>
                </div>
              </div>

              <div className="liquid-glass-card p-6 md:p-8">
                <h3 className="text-lg font-bold text-main mb-6 flex items-center gap-2">
                  <Award size={22} className="text-primary-500" /> เหรียญเกียรติยศ (Badges)
                  <span className="ml-auto text-sm font-bold bg-primary-500/10 text-primary-500 px-3 py-1 rounded-full">
                    {unlockedBadges.length} / {BADGE_LIST.length}
                  </span>
                </h3>
                
                <div className="relative -mx-2">
                  <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4">
                    {(() => {
                      const TIER_ORDER = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
                      const sortedBadges = [...BADGE_LIST].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
                      const chunks = Array.from({ length: Math.ceil(sortedBadges.length / 6) }, (_, i) => sortedBadges.slice(i * 6, i * 6 + 6));
                      
                      return chunks.map((chunk, pageIndex) => (
                        <div key={pageIndex} className="w-full flex-none snap-center px-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 auto-rows-fr">
                          {chunk.map(badge => {
                            const unlockedBadgeInfo = unlockedBadges.find(b => b.id === badge.id);
                            const isUnlocked = !!unlockedBadgeInfo;
                            
                            const handleBadgeClick = () => {
                              setSelectedBadge({
                                ...badge,
                                isUnlocked,
                                date: unlockedBadgeInfo?.date || null
                              });
                            };

                            let tierClass = '';
                            if (isUnlocked) {
                              if (badge.tier === 'rare') tierClass = 'shadow-[0_0_15px_rgba(59,130,246,0.3)] border-blue-500/30';
                              if (badge.tier === 'epic') tierClass = 'animate-float shadow-[0_0_20px_rgba(168,85,247,0.4)] border-purple-500/50';
                              if (badge.tier === 'legendary') tierClass = 'animate-shimmer shadow-[0_0_25px_rgba(249,115,22,0.5)] border-orange-500/60';
                              if (badge.tier === 'mythic') tierClass = 'animate-sparkle shadow-[0_0_30px_rgba(236,72,153,0.6)] border-pink-500/80 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20';
                            }

                            return (
                              <div 
                                key={badge.id} 
                                onClick={handleBadgeClick}
                                className={`h-full relative p-4 rounded-[20px] flex flex-col items-center text-center transition-all ${isUnlocked ? badge.color + ' bg-opacity-10 border cursor-pointer hover:scale-105 active:scale-95 ' + tierClass : 'bg-black/5 dark:bg-white/5 border border-transparent grayscale opacity-50 cursor-pointer hover:scale-105 active:scale-95'}`}
                              >
                                <div className="text-4xl mb-3 drop-shadow-sm">{badge.icon}</div>
                                <h4 className={`font-bold text-sm mb-1 ${isUnlocked ? '' : 'text-main'}`}>{badge.name[lang] || badge.name.th}</h4>
                                <p className={`text-[10px] leading-snug flex-1 flex items-center justify-center ${isUnlocked ? 'opacity-80' : 'text-main/60'}`}>{badge.desc[lang] || badge.desc.th}</p>
                                
                                {isUnlocked && (
                                  <div className="absolute top-2 right-2">
                                    <CheckCircle2 size={14} className="text-current" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))})()}
                  </div>
                  
                  {/* Pagination Dots indicator */}
                  <div className="flex justify-center items-center gap-2 mt-2">
                    {Array.from({ length: Math.ceil(BADGE_LIST.length / 6) }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-main/20" />
                    ))}
                    <span className="text-[10px] text-main/40 ml-2 font-bold uppercase tracking-wider">Scroll</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar Modal */}
        {showAvatarModal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowAvatarModal(false)}
          >
            <div
              className="bg-white dark:bg-[#1e1e2d] w-full max-w-xs rounded-[28px] p-6 text-center shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden shadow-lg">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-white text-3xl font-bold">{getInitials()}</span>
                }
              </div>
              <h3 className="text-lg font-bold text-main mb-1">รูปโปรไฟล์</h3>
              <p className="text-sm text-main/60 mb-6">เลือกการดำเนินการ</p>

              <div className="flex flex-col gap-3">
                <label
                  htmlFor="avatar-upload"
                  className="flex items-center justify-center gap-3 w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl cursor-pointer transition-all active:scale-95 shadow-lg shadow-primary-500/20"
                >
                  <Camera size={20} />
                  อัปโหลดรูปใหม่
                </label>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => { handleRemoveAvatar(); setShowAvatarModal(false); }}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-2xl transition-all active:scale-95 border border-red-500/20"
                  >
                    ลบรูปปัจจุบัน
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAvatarModal(false)}
                  className="py-3 text-main/50 font-bold rounded-2xl transition-all hover:text-main/80"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Crop Modal */}
        {showCropModal && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(12px)' }}
          >
            <div 
              className="bg-white dark:bg-[#1e1e2d] w-full max-w-sm rounded-[28px] p-6 text-center shadow-2xl border border-white/20"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-main mb-2">ปรับแต่งรูปโปรไฟล์</h3>
              <p className="text-sm text-main/60 mb-6">ลากเพื่อย้ายตำแหน่ง และเลื่อนเพื่อซูม</p>
              
              <div className="flex justify-center mb-6">
                <div 
                  className="w-[260px] h-[260px] relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 border border-main/10 cursor-move select-none touch-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <img 
                    src={tempImageSrc} 
                    alt="Crop Preview" 
                    className="absolute pointer-events-none max-w-none origin-center"
                    style={{
                      width: `${cropImageSize.width}px`,
                      height: `${cropImageSize.height}px`,
                      transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})`,
                      left: '50%',
                      top: '50%',
                      marginLeft: `-${cropImageSize.width / 2}px`,
                      marginTop: `-${cropImageSize.height / 2}px`
                    }}
                  />
                  {/* Circular Crop Overlay Ring */}
                  <div className="absolute inset-0 rounded-2xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]" />
                  <div className="absolute top-[30px] left-[30px] w-[200px] h-[200px] rounded-full border-2 border-white pointer-events-none shadow-[0_0_0_1px_rgba(255,255,255,0.3)]" />
                </div>
              </div>
              
              {/* Zoom Slider Controls */}
              <div className="flex items-center gap-3 mb-6 px-2">
                <span className="text-main/40"><ZoomOut size={16} /></span>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05"
                  value={cropZoom} 
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-primary-500 h-1 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-main/40"><ZoomIn size={16} /></span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setShowCropModal(false); setTempImageSrc(''); }}
                  className="flex-1 py-3.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-main font-bold rounded-2xl transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
                <button 
                  type="button"
                  onClick={handleSaveCrop}
                  disabled={isSavingCrop}
                  className="flex-1 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
                >
                  {isSavingCrop ? <Loader2 size={18} className="animate-spin" /> : 'บันทึกรูปภาพ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Banner Picker Modal */}
        {showBannerPicker && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowBannerPicker(false)}
          >
            <div 
              className="bg-white dark:bg-[#1e1e2d] w-full max-w-sm rounded-[28px] p-6 text-center shadow-2xl border border-white/20"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-main mb-2">ปรับแต่งแบนเนอร์โปรไฟล์</h3>
              <p className="text-sm text-main/60 mb-6">เลือกชุดสีไล่เฉดสีที่ต้องการใช้งาน</p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {PRESET_BANNERS.map(banner => (
                  <button
                    key={banner.id}
                    type="button"
                    onClick={() => {
                      setBannerColor(banner.value);
                      localStorage.setItem(`profile_banner_${user.uid}`, banner.value);
                      // Sync immediately to Firestore
                      syncPublicProfile(user, tasks).catch(err => console.error(err));
                    }}
                    className={`h-16 rounded-2xl relative overflow-hidden transition-all duration-300 border-2 ${bannerColor === banner.value ? 'border-primary-500 scale-[1.03] shadow-md shadow-primary-500/10' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-[1.02]'}`}
                    style={{ background: banner.value }}
                  >
                    <span className="absolute inset-0 bg-black/10 dark:bg-black/20 flex items-center justify-center text-xs font-black text-white drop-shadow-md">
                      {banner.name}
                    </span>
                  </button>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => setShowBannerPicker(false)}
                className="w-full py-3.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-main font-bold rounded-2xl transition-all active:scale-95"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        )}

        {/* Badge Detail Modal */}
        {selectedBadge && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#1e1e2d] w-full max-w-sm rounded-[28px] p-6 text-center shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-4 p-2 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
              >
                <X size={18} className="text-main" />
              </button>
              
              <div className={`w-24 h-24 mx-auto rounded-[24px] flex items-center justify-center text-6xl mb-4 ${selectedBadge.isUnlocked ? selectedBadge.color.split(' ')[0] : 'bg-black/5 dark:bg-white/5 grayscale opacity-50'} shadow-lg ${selectedBadge.isUnlocked && selectedBadge.tier === 'epic' ? 'animate-float shadow-[0_0_30px_rgba(168,85,247,0.5)]' : ''} ${selectedBadge.isUnlocked && selectedBadge.tier === 'legendary' ? 'animate-shimmer shadow-[0_0_40px_rgba(249,115,22,0.6)]' : ''} ${selectedBadge.isUnlocked && selectedBadge.tier === 'mythic' ? 'animate-sparkle shadow-[0_0_50px_rgba(236,72,153,0.7)] bg-gradient-to-br from-indigo-500/40 via-purple-500/40 to-pink-500/40' : ''}`}>
                <span className="drop-shadow-md">{selectedBadge.icon}</span>
              </div>
              
              <h3 className="text-2xl font-black text-main mb-2">
                {selectedBadge.name[lang] || selectedBadge.name.th}
              </h3>
              
              <div className="bg-primary-500/10 p-4 rounded-[16px] mb-4 text-left border border-primary-500/20">
                <p className="text-sm font-bold text-primary-500 mb-1">วิธีได้รับ</p>
                <p className="text-sm text-main font-medium">{selectedBadge.desc[lang] || selectedBadge.desc.th}</p>
              </div>

              {selectedBadge.isUnlocked ? (
                <div className="bg-green-500/10 p-3 rounded-[16px] flex items-center justify-center gap-2 text-green-600 border border-green-500/20">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-bold">
                    {lang === 'en' ? 'Unlocked on ' : 'ได้รับเมื่อ '}{new Date(selectedBadge.date).toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ) : (
                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-[16px] flex items-center justify-center gap-2 text-main/50 border border-transparent">
                  <Lock size={18} />
                  <span className="text-sm font-bold">{lang === 'en' ? 'Not yet unlocked' : 'ยังไม่ได้รับ'}</span>
                </div>
              )}
            </motion.div>
          </div>
        )}

      </div>
    </motion.div>
  );
}
