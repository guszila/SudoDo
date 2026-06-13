import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserPlus, Users, Copy, Check, Search, Trash2, Award, Flame, X, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFriends, addFriendByCode, removeFriend } from '../services/friendService';
import { useToast } from '../contexts/ToastContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';
import { BADGE_LIST } from '../utils/gamification';

export default function FriendsPage({ user, lang = 'th' }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [myCode, setMyCode] = useState('');
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setIsLoading(true);
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
        
        // Get friends list
        const friendsList = await getFriends(user.uid);
        setFriends(friendsList);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const handleCopyCode = () => {
    if (!myCode) return;
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast(lang === 'en' ? 'Friend Code copied!' : 'คัดลอกรหัสเพื่อนแล้ว!');
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendCodeInput.trim() || friendCodeInput.trim().length !== 6) {
      showToast(lang === 'en' ? 'Invalid Friend Code' : 'รหัสเพื่อนไม่ถูกต้อง (ต้องมี 6 ตัวอักษร)', { type: 'error' });
      return;
    }
    
    if (friendCodeInput.toUpperCase() === myCode) {
      showToast(lang === 'en' ? 'Cannot add yourself' : 'ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้', { type: 'error' });
      return;
    }
    
    setIsAdding(true);
    const res = await addFriendByCode(user.uid, friendCodeInput);
    setIsAdding(false);
    
    if (res.success) {
      showToast(lang === 'en' ? 'Friend added successfully!' : 'เพิ่มเพื่อนสำเร็จแล้ว!');
      setFriendCodeInput('');
      // Optimistic update
      if (!friends.find(f => f.uid === res.friend.uid)) {
        setFriends(prev => [...prev, res.friend]);
      }
    } else {
      showToast(res.error, { type: 'error' });
    }
  };

  const handleRemoveFriend = async (friendUid, friendName) => {
    if (window.confirm(lang === 'en' ? `Remove ${friendName} from friends?` : `ต้องการลบ ${friendName} ออกจากรายชื่อเพื่อนใช่ไหม?`)) {
      const success = await removeFriend(user.uid, friendUid);
      if (success) {
        setFriends(prev => prev.filter(f => f.uid !== friendUid));
        showToast(lang === 'en' ? 'Friend removed' : 'ลบเพื่อนเรียบร้อยแล้ว');
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen p-4 md:p-8 font-sans pb-24 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-8">

        <h1 className="text-3xl font-bold tracking-tight text-main flex items-center gap-3">
          <Users className="text-primary-500" size={32} />
          {lang === 'en' ? 'Friends' : 'เพื่อน'}
        </h1>
      </div>

      {/* My Code Section */}
      <div className="liquid-glass-card p-6 rounded-[24px] mb-6 flex flex-col items-center text-center">
        <p className="text-sm font-bold text-main/60 uppercase tracking-wider mb-2">
          {lang === 'en' ? 'Your Friend Code' : 'รหัสเพื่อนของคุณ'}
        </p>
        <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 py-3 px-6 rounded-2xl mb-4 border border-main/10">
          <span className="text-3xl font-black text-primary-500 tracking-widest">
            {myCode || '------'}
          </span>
          <button 
            onClick={handleCopyCode}
            className="p-2 bg-white/50 dark:bg-black/20 rounded-xl hover:bg-white dark:hover:bg-black/40 transition-colors shadow-sm"
          >
            {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} className="text-main/70" />}
          </button>
        </div>
        <p className="text-xs text-main/50 font-medium">
          {lang === 'en' ? 'Share this code with your friends so they can add you.' : 'ส่งรหัสนี้ให้เพื่อนของคุณ เพื่อให้พวกเขาสามารถเพิ่มคุณเป็นเพื่อนได้'}
        </p>
      </div>

      {/* Add Friend Section */}
      <div className="liquid-glass-card p-6 rounded-[24px] mb-8">
        <h3 className="text-lg font-bold text-main mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-primary-500" /> 
          {lang === 'en' ? 'Add Friend' : 'เพิ่มเพื่อนใหม่'}
        </h3>
        <form onSubmit={handleAddFriend} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-main/40" size={18} />
            <input 
              type="text" 
              placeholder={lang === 'en' ? "Enter 6-digit Friend Code" : "กรอกรหัสเพื่อน 6 หลัก"}
              value={friendCodeInput}
              onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full bg-black/5 dark:bg-white/10 border-transparent rounded-[16px] pl-11 pr-4 py-3.5 text-main font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all uppercase"
            />
          </div>
          <button 
            type="submit"
            disabled={isAdding || friendCodeInput.length !== 6}
            className="px-6 bg-primary-500 text-white font-bold rounded-[16px] hover:bg-primary-600 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center"
          >
            {isAdding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (lang === 'en' ? 'Add' : 'เพิ่ม')}
          </button>
        </form>
      </div>

      {/* Friends List */}
      <h3 className="text-xl font-bold text-main mb-4 flex items-center justify-between px-2">
        <span>{lang === 'en' ? 'My Friends' : 'รายชื่อเพื่อน'} ({friends.length})</span>
      </h3>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-12 liquid-glass-card rounded-[24px] opacity-70">
          <Users size={48} className="mx-auto mb-4 text-main/30" />
          <p className="font-medium text-main/60">{lang === 'en' ? 'You haven\'t added any friends yet.' : 'คุณยังไม่มีเพื่อนในรายชื่อเลย'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map(friend => (
            <div 
              key={friend.uid}
              onClick={() => setSelectedFriend(friend)}
              className="liquid-glass-card p-4 rounded-[20px] flex items-center gap-4 cursor-pointer hover:border-primary-500/30 transition-all active:scale-95 group"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden shadow-sm">
                  {friend.avatarUrl ? (
                    <img src={friend.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-lg">{(friend.displayName || '??').substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                {friend.hasWorkedToday && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-[#1e1e2d] rounded-full" title={lang === 'en' ? 'Active Today' : 'ทำภารกิจวันนี้แล้ว'} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-main text-base truncate flex items-center gap-2">
                  {friend.displayName || (lang === 'en' ? 'Unknown User' : 'ผู้ใช้งาน')}
                </h4>
                {friend.statusMessage && (
                  <p className="text-xs text-main/60 truncate mt-0.5">
                    {friend.statusMessage}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-bold text-orange-500 flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded-full">
                    <Flame size={12} fill="currentColor" /> {friend.currentStreak || 0}
                  </span>
                  <span className="text-xs font-bold text-primary-500 flex items-center gap-1 bg-primary-500/10 px-2 py-0.5 rounded-full">
                    <Award size={12} /> {friend.totalBadges || 0}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend.uid, friend.displayName); }}
                className="p-2 text-main/20 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Friend Profile Modal */}
      <AnimatePresence>
        {selectedFriend && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedFriend(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1e1e2d] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedFriend(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition-colors backdrop-blur-md"
              >
                <X size={20} />
              </button>

              <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-8 flex flex-col items-center text-center relative">
                <div className="w-24 h-24 rounded-full bg-white/20 p-1 mb-4 shadow-lg backdrop-blur-sm">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {selectedFriend.avatarUrl ? (
                      <img src={selectedFriend.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary-600 font-bold text-3xl">{(selectedFriend.displayName || '??').substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <h2 className="text-2xl font-black text-white mb-1">{selectedFriend.displayName || (lang === 'en' ? 'Unknown User' : 'ผู้ใช้งาน')}</h2>
                {selectedFriend.statusMessage && (
                  <p className="text-white/90 text-sm font-medium italic mb-2 px-4">
                    "{selectedFriend.statusMessage}"
                  </p>
                )}
                
                {selectedFriend.featuredBadgeId && BADGE_LIST.find(b => b.id === selectedFriend.featuredBadgeId) && (() => {
                  const badge = BADGE_LIST.find(b => b.id === selectedFriend.featuredBadgeId);
                  return (
                    <div className="absolute top-4 left-4 bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-lg flex flex-col items-center border border-white/30" title={`Featured Badge: ${badge.name[lang] || badge.name.th}`}>
                      <span className="text-2xl drop-shadow-md animate-pulse">{badge.icon}</span>
                    </div>
                  )
                })()}
                <div className="flex gap-4 mt-4">
                  <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex flex-col items-center">
                    <span className="text-orange-300 flex items-center gap-1 font-bold text-lg">
                      <Flame size={18} fill="currentColor" /> {selectedFriend.currentStreak || 0}
                    </span>
                    <span className="text-white/70 text-[10px] font-bold uppercase">Streak</span>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex flex-col items-center">
                    <span className="text-white flex items-center gap-1 font-bold text-lg">
                      <Award size={18} /> {selectedFriend.totalBadges || 0}
                    </span>
                    <span className="text-white/70 text-[10px] font-bold uppercase">Badges</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50 dark:bg-[#121212]">
                <h3 className="font-bold text-main mb-4 flex items-center gap-2">
                  <Award className="text-primary-500" size={20} /> 
                  {lang === 'en' ? 'Unlocked Badges' : 'เหรียญที่ปลดล็อกแล้ว'}
                </h3>
                
                {(!selectedFriend.unlockedBadges || selectedFriend.unlockedBadges.length === 0) ? (
                  <p className="text-center text-main/50 text-sm py-8">
                    {lang === 'en' ? 'No badges unlocked yet.' : 'เพื่อนคนนี้ยังไม่ได้ปลดล็อกเหรียญใดๆ'}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {BADGE_LIST.filter(b => selectedFriend.unlockedBadges.includes(b.id)).map(badge => {
                       let tierClass = '';
                       if (badge.tier === 'rare') tierClass = 'shadow-[0_0_15px_rgba(59,130,246,0.2)] border-blue-500/20';
                       if (badge.tier === 'epic') tierClass = 'animate-float shadow-[0_0_20px_rgba(168,85,247,0.3)] border-purple-500/30';
                       if (badge.tier === 'legendary') tierClass = 'animate-shimmer shadow-[0_0_25px_rgba(249,115,22,0.4)] border-orange-500/40';
                       if (badge.tier === 'mythic') tierClass = 'animate-sparkle shadow-[0_0_30px_rgba(236,72,153,0.5)] border-pink-500/50 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10';

                       return (
                        <div key={badge.id} className={`p-3 rounded-2xl flex flex-col items-center text-center ${badge.color} bg-opacity-5 border ${tierClass}`}>
                          <div className="text-3xl mb-2 drop-shadow-sm">{badge.icon}</div>
                          <span className="text-[10px] font-bold leading-tight line-clamp-2">{badge.name[lang] || badge.name.th}</span>
                        </div>
                       );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
