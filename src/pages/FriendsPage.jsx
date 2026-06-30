import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Copy, Check, Search, Trash2, Award, Flame, X,
  Clock, MapPin, Briefcase, ChevronRight, Share2, QrCode, Sparkles,
  Calendar, Activity, ArrowRight, CheckCircle2, Circle, RefreshCw, Bell, BellOff,
  MessageCircle, CalendarDays, Trophy, Medal, Crown, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFriends, subscribeToFriends, addFriendByCode, removeFriend, subscribeToPendingRequests, acceptFriendRequest, declineFriendRequest } from '../services/friendService';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';
import { BADGE_LIST } from '../utils/gamification';
import ChatView from '../components/social/ChatView';

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  // Handle Firestore Timestamp objects
  if (typeof timeStr?.toDate === 'function') {
    const d = timeStr.toDate();
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }
  // Handle plain {seconds, nanoseconds} objects (Firestore Timestamp-like)
  if (typeof timeStr === 'object' && timeStr.seconds !== undefined) {
    const d = new Date(timeStr.seconds * 1000);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  }
  if (typeof timeStr !== 'string') return '';
  // Handle ISO date strings
  try {
    if (timeStr.includes('T')) {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
    // Handle HH:MM format
    if (timeStr.includes(':')) {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h);
      return `${hour.toString().padStart(2,'0')}:${m}`;
    }
  } catch {}
  return '';
};

const getStatusColor = (status) => {
  if (status === 'Done') return 'text-emerald-500 bg-emerald-500/10';
  if (status === 'In Progress') return 'text-amber-500 bg-amber-500/10';
  return 'text-sky-500 bg-sky-500/10';
};

const getStatusLabel = (status, lang) => {
  if (status === 'Done') return lang === 'en' ? 'Done' : 'เสร็จแล้ว';
  if (status === 'In Progress') return lang === 'en' ? 'In Progress' : 'กำลังทำ';
  return lang === 'en' ? 'To-Do' : 'รอทำ';
};

const extractFriendCode = (text) => {
  if (!text) return '';
  const trimmed = text.trim();
  
  if (trimmed.length === 6 && /^[A-Za-z0-9]{6}$/.test(trimmed)) {
    if (trimmed.toLowerCase() !== 'sudodo') {
      return trimmed.toUpperCase();
    }
  }

  const words = trimmed.split(/[\s:!?,.。，：\n\r\(\)\[\]\{\}]+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^A-Za-z0-9]/g, '');
    if (cleanWord.length === 6 && /^[A-Za-z0-9]{6}$/.test(cleanWord)) {
      if (cleanWord.toLowerCase() !== 'sudodo') {
        return cleanWord.toUpperCase();
      }
    }
  }
  
  return trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
};

// Avatar component with gradient fallback
const Avatar = ({ src, name, size = 'md', pulse = false }) => {
  const sizeMap = { sm: 'w-10 h-10 text-sm', md: 'w-14 h-14 text-lg', lg: 'w-20 h-20 text-2xl' };
  const initials = (name || '??').substring(0, 2).toUpperCase();
  return (
    <div className={`relative flex-shrink-0 ${sizeMap[size]}`}>
      <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden shadow-md`}>
        {src
          ? <img src={src} alt={name} className="w-full h-full object-cover" />
          : <span className="text-white font-bold">{initials}</span>
        }
      </div>
      {pulse && (
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#1e1e2d] rounded-full">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        </span>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────
// Today Schedule Card (shown on friend list item)
// ────────────────────────────────────────────────
const TodaySchedulePreview = ({ schedule = [], lang }) => {
  if (!schedule || schedule.length === 0) return null;
  const first = schedule[0];
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <Clock size={11} className="text-primary-500 flex-shrink-0" />
      <span className="text-xs text-primary-500 font-semibold truncate">
        {first.startTime && formatTime(first.startTime)}
        {first.startTime && first.endTime && ' – '}
        {first.endTime && formatTime(first.endTime)}
        {!first.startTime && !first.endTime && (first.title || '')}
      </span>
      {schedule.length > 1 && (
        <span className="text-[10px] font-bold text-primary-500/60 bg-primary-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
          +{schedule.length - 1}
        </span>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────
export default function FriendsPage({ user, lang = 'th' }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { notifications, unreadCount, markAllRead } = useNotifications();

  const [myCode, setMyCode] = useState('');
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'inbox'
  const [modalTab, setModalTab] = useState('profile'); // 'profile' | 'chat'

  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [myProfile, setMyProfile] = useState(null);

  // Pending friend requests (realtime)
  const [pendingRequests, setPendingRequests] = useState([]);
  const [processingRequest, setProcessingRequest] = useState(null); // uid being processed

  const loadData = useCallback(async (quiet = false) => {
    if (!user) return;
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const profileRef = doc(db, COLLECTIONS.PUBLIC_PROFILES, user.uid);
      const docSnap = await getDoc(profileRef);
      if (docSnap.exists() && docSnap.data().friendCode) {
        setMyCode(docSnap.data().friendCode);
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        await setDoc(profileRef, { friendCode: code, uid: user.uid }, { merge: true });
        setMyCode(code);
      }
      // Cache my profile for pending request metadata
      const docSnap2 = await getDoc(profileRef);
      if (docSnap2.exists()) setMyProfile(docSnap2.data());
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  // Load profile metadata
  useEffect(() => { loadData(); }, [loadData]);

  // Subscribe to friends list in real-time
  useEffect(() => {
    if (!user?.uid) return;
    setIsLoading(true);
    const unsub = subscribeToFriends(user.uid, (list) => {
      setFriends(list);
      setIsLoading(false);
      setIsRefreshing(false);
    });
    return unsub;
  }, [user?.uid]);

  // Subscribe to pending friend requests in real-time
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToPendingRequests(user.uid, setPendingRequests);
    return unsub;
  }, [user?.uid]);

  const handleCopyCode = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast(lang === 'en' ? 'Friend Code copied!' : 'คัดลอกรหัสเพื่อนแล้ว!');
  };

  const handleShare = async () => {
    const text = lang === 'en'
      ? `Add me on SudoDo! My friend code is: ${myCode}`
      : `เพิ่มฉันเป็นเพื่อนใน SudoDo! รหัสเพื่อนของฉัน: ${myCode}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'SudoDo', text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      showToast(lang === 'en' ? 'Copied to clipboard!' : 'คัดลอกแล้ว!');
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    const code = friendCodeInput.trim().toUpperCase();
    if (code.length !== 6) {
      showToast(lang === 'en' ? 'Code must be 6 characters' : 'รหัสต้องมี 6 ตัวอักษร', { type: 'error' });
      return;
    }
    if (code === myCode) {
      showToast(lang === 'en' ? 'Cannot add yourself' : 'ไม่สามารถเพิ่มตัวเองได้', { type: 'error' });
      return;
    }
    setIsAdding(true);
    const res = await addFriendByCode(user.uid, code, myProfile);
    setIsAdding(false);
    if (res.success) {
      showToast(lang === 'en' ? 'Friend added! 🎉' : 'เพิ่มเพื่อนสำเร็จแล้ว! 🎉');
      setFriendCodeInput('');
      setShowAddPanel(false);
      if (!friends.find(f => f.uid === res.friend.uid)) {
        setFriends(prev => [res.friend, ...prev]);
      }
    } else {
      showToast(res.error, { type: 'error' });
    }
  };

  const handleRemoveFriend = async (friendUid, friendName) => {
    if (!window.confirm(lang === 'en' ? `Remove ${friendName}?` : `ต้องการลบ ${friendName} ออกจากเพื่อนใช่ไหม?`)) return;
    setRemovingId(friendUid);
    const ok = await removeFriend(user.uid, friendUid);
    setRemovingId(null);
    if (ok) {
      setFriends(prev => prev.filter(f => f.uid !== friendUid));
      if (selectedFriend?.uid === friendUid) setSelectedFriend(null);
      showToast(lang === 'en' ? 'Friend removed' : 'ลบเพื่อนเรียบร้อยแล้ว');
    }
  };

  const handleAcceptRequest = async (req) => {
    setProcessingRequest(req.fromUid);
    const ok = await acceptFriendRequest(user.uid, req.fromUid);
    setProcessingRequest(null);
    if (ok) {
      showToast(lang === 'en' ? `Added ${req.fromName}! 🎉` : `เพิ่ม ${req.fromName} เป็นเพื่อนแล้ว! 🎉`);
      loadData(true); // reload friends list
    } else {
      showToast(lang === 'en' ? 'Something went wrong' : 'เกิดข้อผิดพลาด', { type: 'error' });
    }
  };

  const handleDeclineRequest = async (req) => {
    setProcessingRequest(req.fromUid);
    await declineFriendRequest(user.uid, req.fromUid);
    setProcessingRequest(null);
    showToast(lang === 'en' ? 'Request declined' : 'ปฏิเสธคำขอแล้ว');
  };

  const activeToday = friends.filter(f => f.hasWorkedToday).length;

  const leaderboardData = useMemo(() => {
    if (!myProfile && friends.length === 0) return [];
    
    const allUsers = [...friends];
    if (myProfile) {
      allUsers.push({
        uid: user.uid,
        displayName: user.displayName || (lang === 'en' ? 'Me' : 'ฉัน'),
        avatarUrl: localStorage.getItem(`avatar_${user.uid}`) || myProfile.avatarUrl,
        currentStreak: myProfile.currentStreak || 0,
        totalBadges: myProfile.totalBadges || 0,
        hasWorkedToday: myProfile.hasWorkedToday || false,
        isMe: true,
      });
    }
    
    return allUsers.sort((a, b) => {
      if ((b.currentStreak || 0) !== (a.currentStreak || 0)) {
        return (b.currentStreak || 0) - (a.currentStreak || 0);
      }
      return (b.totalBadges || 0) - (a.totalBadges || 0);
    });
  }, [friends, myProfile, user, lang]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="min-h-screen p-4 pt-safe md:p-8 font-sans pb-28 max-w-2xl mx-auto"
    >
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-black text-main flex items-center gap-2">
            <Users className="text-primary-500" size={30} />
            {lang === 'en' ? 'Friends' : 'เพื่อน'}
          </h1>
          {friends.length > 0 && activeTab === 'friends' && (
            <p className="text-sm text-main/50 mt-0.5 ml-1">
              {activeToday > 0
                ? (lang === 'en' ? `${activeToday} active today` : `${activeToday} คน ทำงานวันนี้ 🔥`)
                : (lang === 'en' ? `${friends.length} friends` : `${friends.length} คน`)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="liquid-glass-button p-3 text-main/60 hover:text-primary-500"
            title={lang === 'en' ? 'Refresh' : 'รีเฟรช'}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          {activeTab === 'friends' && (
            <button
              onClick={() => setShowAddPanel(p => !p)}
              className={`liquid-glass-button px-4 py-2.5 flex items-center gap-2 font-bold text-sm transition-all
                ${showAddPanel ? 'bg-primary-500 text-white border-primary-600' : 'text-primary-500'}`}
            >
              <UserPlus size={18} />
              {lang === 'en' ? 'Add' : 'เพิ่มเพื่อน'}
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ─────────────────────────────── */}
      <div className="flex gap-2 mb-4 p-1 liquid-glass-card rounded-2xl">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'friends'
              ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
              : 'text-main/60 hover:text-main'
          }`}
        >
          <Users size={16} />
          {lang === 'en' ? 'Friends' : 'เพื่อน'}
          {friends.length > 0 && (
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              activeTab === 'friends' ? 'bg-white/20 text-white' : 'bg-primary-500/10 text-primary-500'
            }`}>{friends.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all relative ${
            activeTab === 'inbox'
              ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
              : 'text-main/60 hover:text-main'
          }`}
        >
          <Bell size={16} />
          {lang === 'en' ? 'Inbox' : 'ข้อความ'}
          {unreadCount > 0 && (
            <span className={`flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[9px] font-black shadow-md px-1 relative ${
              activeTab === 'inbox' ? 'bg-white/30 text-white' : 'bg-red-500 text-white'
            }`}>
              {activeTab !== 'inbox' && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50" />}
              <span className="relative">{unreadCount > 9 ? '9+' : unreadCount}</span>
            </span>
          )}
        </button>
      </div>

      {/* ── Tab Content ──────────────────────────────── */}
      {activeTab === 'inbox' ? (
        <motion.div
          key="inbox"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {notifications.length === 0 ? (
            /* ── Empty State ── */
            <div className="liquid-glass-card rounded-[28px] p-10 text-center">
              <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-5 relative">
                <Bell size={36} className="text-primary-500/50" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Check size={11} className="text-white" />
                </span>
              </div>
              <h3 className="font-bold text-main text-lg mb-2">
                {lang === 'en' ? 'All caught up!' : 'ไม่มีข้อความใหม่'}
              </h3>
              <p className="text-main/50 text-sm max-w-xs mx-auto">
                {lang === 'en'
                  ? 'New messages from friends will appear here.'
                  : 'เมื่อเพื่อนส่งข้อความมาจะปรากฏที่นี่'}
              </p>
            </div>
          ) : (() => {
            /* ── Group notifications by date ── */
            const today = new Date();
            const todayStr = today.toDateString();
            const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

            const todayItems = notifications.filter(n => {
              const ts = n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000) : null;
              return ts && ts.toDateString() === todayStr;
            });
            const olderItems = notifications.filter(n => {
              const ts = n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000) : null;
              return ts && ts.toDateString() !== todayStr;
            });

            const NotifCard = ({ notif, idx }) => {
              const ts = notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000) : null;
              const isToday = ts && ts.toDateString() === todayStr;
              const timeStr = ts
                ? isToday
                  ? ts.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                  : ts.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
                : '';
              const isShift = notif.type === 'shift';
              const friendObj = friends.find(f => f.uid === notif.friendUid);

              const msgTitle = isShift
                ? `${notif.friendName} ส่งกะงานให้คุณ`
                : `${notif.friendName} ส่งข้อความมา`;
              const msgPreview = isShift
                ? (notif.shift?.title ? `📅 ${notif.shift.title}` : '📅 แชร์กะงาน')
                : notif.text;

              return (
                <motion.div
                  key={`${notif.chatId}-${notif.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => {
                    if (friendObj) { setSelectedFriend(friendObj); setModalTab('chat'); }
                  }}
                  className="flex items-center gap-3.5 px-1 py-3 cursor-pointer active:scale-[0.98] transition-all group border-b border-main/5 last:border-0"
                >
                  {/* Avatar circle */}
                  <div className="flex-shrink-0 w-[52px] h-[52px] rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden shadow-md ring-2 ring-white/20">
                    {notif.friendAvatar
                      ? <img src={notif.friendAvatar} alt="" className="w-full h-full object-cover" />
                      : <span className="text-white font-bold text-base">{(notif.friendName || '?').slice(0, 2).toUpperCase()}</span>
                    }
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-main text-sm leading-snug mb-0.5 truncate">
                      {msgTitle}
                    </p>
                    <p className="text-xs text-main/50 truncate leading-snug">
                      {isShift ? <span className="text-amber-500 font-medium">{msgPreview}</span> : `"${msgPreview}"`}
                    </p>
                    <p className="text-[10px] text-main/35 mt-1 font-medium">{timeStr} {lang === 'en' ? 'ago' : 'ที่แล้ว'}</p>
                  </div>

                  {/* Unread blue dot */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-md shadow-primary-500/40" />
                  </div>
                </motion.div>
              );
            };

            return (
              <div className="liquid-glass-card rounded-[24px] overflow-hidden divide-y divide-main/5">
                {/* Today section */}
                {todayItems.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-main/40 uppercase tracking-widest px-4 pt-4 pb-2">
                      {lang === 'en' ? 'Today' : 'วันนี้'}
                    </p>
                    <div className="px-3">
                      {todayItems.map((notif, idx) => (
                        <NotifCard key={`today-${notif.id}`} notif={notif} idx={idx} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Older section */}
                {olderItems.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-main/40 uppercase tracking-widest px-4 pt-4 pb-2">
                      {lang === 'en' ? 'Earlier' : 'ก่อนหน้านี้'}
                    </p>
                    <div className="px-3">
                      {olderItems.map((notif, idx) => (
                        <NotifCard key={`older-${notif.id}`} notif={notif} idx={todayItems.length + idx} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>

      ) : (
        <motion.div
          key="friends"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* ── My Friend Code Card ─────────────────────── */}
      <motion.div
        layout
        className="liquid-glass-card p-5 rounded-[24px] mb-4 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-primary-600/10 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-bold text-main/50 uppercase tracking-widest mb-2">
              {lang === 'en' ? 'Your Friend Code' : 'รหัสเพื่อนของคุณ'}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black tracking-[0.25em] text-primary-500 select-all">
                {myCode || '──────'}
              </span>
            </div>
            <p className="text-xs text-main/40 mt-2">
              {lang === 'en' ? 'Share this code with friends' : 'ส่งรหัสนี้ให้เพื่อนของคุณ'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCopyCode}
              className={`p-3 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center
                ${copied ? 'bg-emerald-500 text-white' : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'}`}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
            <button
              onClick={handleShare}
              className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 text-main/60 hover:text-primary-500 hover:bg-primary-500/10 transition-all active:scale-95 flex items-center justify-center"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Add Friend Panel ────────────────────────── */}
      <AnimatePresence>
        {showAddPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="liquid-glass-card p-5 rounded-[24px] border border-primary-500/20">
              <h3 className="text-sm font-bold text-main/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-primary-500" />
                {lang === 'en' ? 'Enter Friend Code' : 'กรอกรหัสเพื่อน'}
              </h3>
              <form onSubmit={handleAddFriend} className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder={lang === 'en' ? 'e.g. AB1234' : 'เช่น AB1234'}
                    value={friendCodeInput}
                    onChange={e => setFriendCodeInput(extractFriendCode(e.target.value))}
                    className="w-full bg-black/5 dark:bg-white/8 border border-main/10 rounded-[14px] px-4 py-3.5 text-main font-black tracking-[0.3em] text-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 uppercase text-center transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-main/30"
                  />
                  {/* Character dots */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i < friendCodeInput.length ? 'bg-primary-500' : 'bg-main/10'}`}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isAdding || friendCodeInput.length !== 6}
                  className="px-5 bg-primary-500 text-white font-bold rounded-[14px] hover:bg-primary-600 transition-all shadow-md active:scale-95 disabled:opacity-40 flex items-center gap-2"
                >
                  {isAdding
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><ArrowRight size={18} /></>
                  }
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pending Friend Requests ─────────────────── */}
      <AnimatePresence>
        {!isLoading && pendingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              <p className="text-xs font-bold text-primary-500 uppercase tracking-widest px-1 flex items-center gap-1.5">
                <UserPlus size={12} />
                {lang === 'en' ? 'Pending Friend Requests' : 'คำขอเป็นเพื่อน'}
                <span className="bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {pendingRequests.length}
                </span>
              </p>
              <div className="space-y-2.5">
                {pendingRequests.map((req) => (
                  <motion.div
                    key={req.fromUid}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="liquid-glass-card rounded-[20px] p-4 flex items-center gap-3.5"
                  >
                    <Avatar
                      src={req.fromAvatar}
                      name={req.fromName}
                      size="md"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-main truncate">
                        {req.fromName || (lang === 'en' ? 'Unknown' : 'ผู้ใช้งาน')}
                      </h4>
                      <p className="text-[10px] text-main/40 mt-0.5">
                        {lang === 'en' ? `Code: ${req.fromCode}` : `รหัส: ${req.fromCode}`}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDeclineRequest(req)}
                        disabled={processingRequest === req.fromUid}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold border border-main/15 text-main/70 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {lang === 'en' ? 'Decline' : 'ปฏิเสธ'}
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        disabled={processingRequest === req.fromUid}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-500 text-white shadow-md shadow-primary-500/25 hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {processingRequest === req.fromUid ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : null}
                        {lang === 'en' ? 'Accept' : 'ยอมรับ'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Friends List ────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-main/40 text-sm font-medium">{lang === 'en' ? 'Loading...' : 'กำลังโหลด...'}</p>
        </div>
      ) : friends.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="liquid-glass-card rounded-[28px] p-10 text-center"
        >
          <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Users size={40} className="text-primary-500/50" />
          </div>
          <h3 className="font-bold text-main text-lg mb-2">
            {lang === 'en' ? 'No friends yet' : 'ยังไม่มีเพื่อนเลย'}
          </h3>
          <p className="text-main/50 text-sm mb-6 max-w-xs mx-auto">
            {lang === 'en'
              ? 'Share your friend code and add your colleagues to see their shifts!'
              : 'แชร์รหัสเพื่อนและเพิ่มเพื่อนร่วมงาน เพื่อดูเวรของพวกเขาได้เลย!'}
          </p>
          <button
            onClick={() => setShowAddPanel(true)}
            className="px-6 py-3 bg-primary-500 text-white font-bold rounded-[16px] hover:bg-primary-600 transition-all active:scale-95 shadow-lg shadow-primary-500/30 flex items-center gap-2 mx-auto"
          >
            <UserPlus size={18} />
            {lang === 'en' ? 'Add your first friend' : 'เพิ่มเพื่อนคนแรก'}
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* ── Podium Leaderboard (Top 3) ── */}
          {leaderboardData.length >= 2 && (
            <div className="liquid-glass-card rounded-[28px] p-5 pt-10 mt-6 mb-4 relative overflow-visible border-primary-500/20 shadow-[0_8px_30px_rgba(var(--color-primary-500),0.1)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-400 to-amber-500 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-lg shadow-amber-500/30 flex items-center gap-1.5 whitespace-nowrap z-20">
                <Trophy size={14} /> LEADERBOARD
              </div>
              
              <div className="flex items-end justify-center gap-3 mt-6 min-h-[240px]">
                {(() => {
                  const top3 = leaderboardData.slice(0, 3);
                  // Always render 3 slots to keep Rank 1 perfectly centered: [Rank 2, Rank 1, Rank 3]
                  const podiumOrder = [top3[1] || null, top3[0], top3[2] || null];
                  
                  return podiumOrder.map((u, i) => {
                    if (!u) return <div key={`empty-${i}`} className="flex-1 max-w-[100px]" />;

                    const isFirst = u.uid === top3[0]?.uid;
                    const isSecond = top3.length > 1 && u.uid === top3[1]?.uid;
                    const isThird = top3.length > 2 && u.uid === top3[2]?.uid;
                    
                    const heightClass = isFirst ? 'h-[110px]' : isSecond ? 'h-[80px]' : 'h-[60px]';
                    const colorClass = isFirst ? 'from-amber-400 to-orange-500' : isSecond ? 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700' : 'from-orange-300 to-orange-400 dark:from-orange-800 dark:to-orange-900';
                    const glowClass = isFirst ? 'shadow-[0_0_20px_rgba(245,158,11,0.5)] z-10' : 'opacity-90';
                    
                    return (
                      <div key={u.uid} className={`flex flex-col items-center flex-1 max-w-[100px] ${isFirst ? 'scale-110 origin-bottom' : ''}`}>
                        <div className="relative z-10">
                          {isFirst && <Crown size={24} className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-500 drop-shadow-md z-20" />}
                          <Avatar src={u.avatarUrl} name={u.displayName} size={isFirst ? "lg" : "md"} pulse={u.hasWorkedToday} />
                        </div>
                        <p className={`text-xs font-bold mt-2 truncate w-full text-center px-1 ${isFirst ? 'text-primary-500' : 'text-main'}`}>
                          {u.isMe ? (lang === 'en' ? 'You' : 'คุณ') : u.displayName}
                        </p>
                        <p className="text-[10px] text-orange-500 font-bold mb-2 flex items-center gap-0.5">
                          <Flame size={10} fill="currentColor" /> {u.currentStreak || 0}
                        </p>
                        
                        <div className={`w-full rounded-t-xl bg-gradient-to-t ${colorClass} ${heightClass} ${glowClass} flex justify-center pt-2 relative overflow-hidden transition-all duration-500 mt-1`}>
                          <span className="text-white/90 font-black text-2xl drop-shadow-md">
                            {isFirst ? '1' : isSecond ? '2' : '3'}
                          </span>
                          <div className="absolute inset-0 bg-white/20 dark:bg-black/10 mix-blend-overlay" />
                          <div className="absolute top-0 left-0 w-full h-1 bg-white/40" />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* ── Full List ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-main/50 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <Users size={12} />
              {lang === 'en' ? 'All Users' : 'รายชื่อทั้งหมด'}
            </h3>

            {leaderboardData.map((friend, idx) => (
              <motion.div
                key={friend.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`liquid-glass-card rounded-[20px] p-4 flex items-center gap-3.5 cursor-pointer
                  hover:border-primary-500/40 hover:shadow-[0_4px_20px_rgba(var(--color-primary-500),0.15)] active:scale-[0.98] transition-all group relative
                  ${removingId === friend.uid ? 'opacity-50 pointer-events-none' : ''}
                  ${friend.hasWorkedToday ? 'border-emerald-500/30 bg-emerald-500/5' : ''}
                  ${friend.isMe ? 'border-primary-500/40 bg-primary-500/5' : ''}`}
                onClick={() => { 
                  if (friend.isMe) return;
                  setSelectedFriend(friend); 
                  setModalTab('profile'); 
                }}
              >
                <div className={`w-6 flex-shrink-0 flex items-center justify-center font-black text-lg ${
                  idx === 0 ? 'text-yellow-500' :
                  idx === 1 ? 'text-slate-400' :
                  idx === 2 ? 'text-orange-400' : 'text-main/20'
                }`}>
                  {idx + 1}
                </div>

                <Avatar
                  src={friend.avatarUrl}
                  name={friend.displayName}
                  size="md"
                  pulse={friend.hasWorkedToday}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold truncate ${friend.isMe ? 'text-primary-500' : 'text-main'}`}>
                      {friend.displayName || (lang === 'en' ? 'Unknown' : 'ผู้ใช้งาน')} {friend.isMe && (lang === 'en' ? '(You)' : '(คุณ)')}
                    </h4>
                    {friend.featuredBadgeId && (() => {
                      const b = BADGE_LIST.find(b => b.id === friend.featuredBadgeId);
                      return b ? <span className="text-base leading-none" title={b.name?.th}>{b.icon}</span> : null;
                    })()}
                  </div>

                  {friend.statusMessage
                    ? <p className="text-xs text-main/50 truncate mt-0.5">"{friend.statusMessage}"</p>
                    : friend.hasWorkedToday && friend.todaySchedule?.length > 0
                      ? <TodaySchedulePreview schedule={friend.todaySchedule} lang={lang} />
                      : null
                  }

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-orange-500 flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full">
                      <Flame size={12} fill="currentColor" /> {friend.currentStreak || 0}
                    </span>
                    <span className="text-xs font-bold text-primary-500 flex items-center gap-1 bg-primary-500/10 px-2 py-1 rounded-full">
                      <Award size={12} /> {friend.totalBadges || 0}
                    </span>
                    {friend.hasWorkedToday && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        <Activity size={12} /> {lang === 'en' ? 'Active' : 'กำลังลุยงาน'}
                      </span>
                    )}
                  </div>
                </div>

                {!friend.isMe && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ChevronRight size={16} className="text-main/30 group-hover:text-primary-500 transition-colors" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

        </motion.div>
      )}

      {/* ── Friend Detail Modal ─────────────────────── */}
      <AnimatePresence>
        {selectedFriend && (
          <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
            style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(10px)' }}
            onClick={() => setSelectedFriend(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-[#1a1a2e] w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col max-h-[88vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={() => setSelectedFriend(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Hero Header */}
              <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-7 flex flex-col items-center text-center relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 80%, white 0%, transparent 60%), radial-gradient(circle at 80% 20%, white 0%, transparent 60%)'
                }} />

                {/* Featured badge */}
                {selectedFriend.featuredBadgeId && (() => {
                  const b = BADGE_LIST.find(b => b.id === selectedFriend.featuredBadgeId);
                  return b ? (
                    <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2.5 rounded-2xl border border-white/30 shadow-lg">
                      <span className="text-2xl animate-pulse">{b.icon}</span>
                    </div>
                  ) : null;
                })()}

                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full ring-4 ring-white/30 shadow-xl overflow-hidden bg-white/20">
                    {selectedFriend.avatarUrl
                      ? <img src={selectedFriend.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white font-bold text-3xl">
                            {(selectedFriend.displayName || '??').substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                    }
                  </div>
                  {selectedFriend.hasWorkedToday && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-md">
                      <Activity size={12} className="text-white" />
                    </div>
                  )}
                </div>

                <h2 className="text-2xl font-black text-white mb-1">
                  {selectedFriend.displayName || (lang === 'en' ? 'Unknown User' : 'ผู้ใช้งาน')}
                </h2>
                {selectedFriend.statusMessage && (
                  <p className="text-white/80 text-sm italic mb-3">"{selectedFriend.statusMessage}"</p>
                )}

                {/* Stats row */}
                <div className="flex gap-3 mt-2">
                  <div className="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl flex flex-col items-center border border-white/20">
                    <span className="text-orange-300 flex items-center gap-1 font-black text-xl">
                      <Flame size={16} fill="currentColor" /> {selectedFriend.currentStreak || 0}
                    </span>
                    <span className="text-white/60 text-[10px] font-bold uppercase mt-0.5">
                      {lang === 'en' ? 'Streak' : 'สตรีค'}
                    </span>
                  </div>
                  <div className="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl flex flex-col items-center border border-white/20">
                    <span className="text-white flex items-center gap-1 font-black text-xl">
                      <Award size={16} /> {selectedFriend.totalBadges || 0}
                    </span>
                    <span className="text-white/60 text-[10px] font-bold uppercase mt-0.5">
                      {lang === 'en' ? 'Badges' : 'เหรียญ'}
                    </span>
                  </div>
                  {selectedFriend.hasWorkedToday && (
                    <div className="bg-emerald-500/30 backdrop-blur-md px-4 py-2.5 rounded-2xl flex flex-col items-center border border-emerald-400/40">
                      <span className="text-emerald-300 flex items-center gap-1 font-black text-xl">
                        <CheckCircle2 size={16} />
                      </span>
                      <span className="text-emerald-200/80 text-[10px] font-bold uppercase mt-0.5">
                        {lang === 'en' ? 'Active' : 'ทำงาน'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Tab Switcher ── */}
              <div className="flex gap-1.5 px-5 py-3 bg-gray-50 dark:bg-[#111120] border-b border-main/5 flex-shrink-0">
                <button
                  onClick={() => setModalTab('profile')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    modalTab === 'profile'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-main/50 hover:text-main hover:bg-main/5'
                  }`}
                >
                  {lang === 'en' ? '👤 Profile' : '👤 ข้อมูล'}
                </button>
                <button
                  onClick={() => setModalTab('chat')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    modalTab === 'chat'
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-main/50 hover:text-main hover:bg-main/5'
                  }`}
                >
                  {lang === 'en' ? '💬 Chat' : '💬 แชท'}
                </button>
              </div>

              {/* ── Chat Tab ── */}
              {modalTab === 'chat' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <ChatView
                    user={user}
                    friend={selectedFriend}
                    lang={lang}
                    onClose={() => setModalTab('profile')}
                  />
                </div>
              ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#111120]">

                {/* ── Today's Schedule Section ── */}
                <div className="p-5 border-b border-main/5">
                  <h3 className="font-bold text-main mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-main/60">
                    <Calendar size={15} className="text-primary-500" />
                    {lang === 'en' ? "Today's Schedule" : 'ตารางงานวันนี้'}
                    <span className="ml-auto text-[10px]">
                      {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </span>
                  </h3>

                  {!selectedFriend.todaySchedule || selectedFriend.todaySchedule.length === 0 ? (
                    <div className="flex items-center gap-3 py-4 text-center justify-center">
                      <Circle size={14} className="text-main/20" />
                      <p className="text-sm text-main/40">
                        {lang === 'en' ? 'No tasks scheduled for today' : 'ไม่มีงานวันนี้'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedFriend.todaySchedule.map((task, i) => (
                        <motion.div
                          key={task.id || i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="bg-white dark:bg-white/5 rounded-[16px] p-3.5 border border-main/5 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            {/* Time block */}
                            {(task.startTime || task.endTime) ? (
                              <div className="flex-shrink-0 text-center min-w-[52px]">
                                <div className={`rounded-[10px] px-2 py-1.5 ${task.isCompleted ? 'bg-emerald-500/10' : 'bg-primary-500/10'}`}>
                                  {task.startTime && (
                                    <p className={`font-black text-xs ${task.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary-600 dark:text-primary-400'}`}>
                                      {formatTime(task.startTime)}
                                    </p>
                                  )}
                                  {task.endTime && (
                                    <>
                                      <div className="w-px h-2 bg-current opacity-20 mx-auto my-0.5" />
                                      <p className={`font-bold text-xs opacity-70 ${task.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary-600 dark:text-primary-400'}`}>
                                        {formatTime(task.endTime)}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500/50 mt-2 ml-1" />
                            )}

                            {/* Task info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-main text-sm truncate">{task.title || (lang === 'en' ? 'Shift' : 'กะงาน')}</p>

                              {task.isPartTime && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                  <Briefcase size={10} />
                                  {lang === 'en' ? 'Part-time shift' : 'กะพาร์ทไทม์'}
                                </p>
                              )}
                            </div>

                            {/* Status */}
                            {task.isCompleted ? (
                              <span className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full text-emerald-600 bg-emerald-500/10">
                                {lang === 'en' ? 'Done' : 'เสร็จแล้ว'}
                              </span>
                            ) : task.status ? (
                              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                                {getStatusLabel(task.status, lang)}
                              </span>
                            ) : null}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Badges Section ── */}
                <div className="p-5">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-main/60 mb-3 flex items-center gap-2">
                    <Award size={15} className="text-primary-500" />
                    {lang === 'en' ? 'Unlocked Badges' : 'เหรียญที่ได้รับ'}
                    <span className="ml-auto text-[10px] bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded-full font-bold">
                      {selectedFriend.totalBadges || 0}
                    </span>
                  </h3>

                  {!selectedFriend.unlockedBadges || selectedFriend.unlockedBadges.length === 0 ? (
                    <p className="text-center text-main/40 text-sm py-6">
                      {lang === 'en' ? 'No badges yet' : 'ยังไม่มีเหรียญ'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2.5">
                      {BADGE_LIST.filter(b => selectedFriend.unlockedBadges.includes(b.id)).map(badge => {
                        let tierClass = '';
                        if (badge.tier === 'rare') tierClass = 'border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.2)]';
                        if (badge.tier === 'epic') tierClass = 'border-purple-500/40 shadow-[0_0_16px_rgba(168,85,247,0.3)] animate-float';
                        if (badge.tier === 'legendary') tierClass = 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.4)] animate-shimmer';
                        if (badge.tier === 'mythic') tierClass = 'border-pink-500/60 shadow-[0_0_25px_rgba(236,72,153,0.5)] animate-sparkle';
                        return (
                          <div key={badge.id} className={`p-2.5 rounded-2xl flex flex-col items-center text-center ${badge.color} bg-opacity-5 border ${tierClass}`}>
                            <div className="text-2xl mb-1">{badge.icon}</div>
                            <span className="text-[9px] font-bold leading-tight line-clamp-2 opacity-80">
                              {badge.name[lang] || badge.name.th}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Remove button */}
                <div className="px-5 pb-6">
                  <button
                    onClick={() => handleRemoveFriend(selectedFriend.uid, selectedFriend.displayName)}
                    className="w-full py-3 text-red-500 font-bold text-sm rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    {lang === 'en' ? 'Remove Friend' : 'ลบออกจากเพื่อน'}
                  </button>
                  </div>
              </div>
              )} {/* end profile tab */}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
