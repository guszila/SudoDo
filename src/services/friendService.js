import { collection, doc, getDoc, setDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../constants';
import { calculateStreaks, getUnlockedBadges } from '../utils/gamification';
import { isSameDay } from 'date-fns';

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const syncPublicProfile = async (user, tasks) => {
  if (!user || !user.uid) return null;
  
  try {
    const profileRef = doc(db, COLLECTIONS.PUBLIC_PROFILES, user.uid);
    const docSnap = await getDoc(profileRef);
    
    let friendCode = '';
    if (docSnap.exists() && docSnap.data().friendCode) {
      friendCode = docSnap.data().friendCode;
    } else {
      friendCode = generateRandomCode();
    }
    
    // Calculate stats
    const streaks = calculateStreaks(tasks);
    const unlockedBadges = getUnlockedBadges(tasks, streaks);
    
    // Check if active today
    const today = new Date();
    const hasWorkedToday = tasks.some(t => {
      const isDone = t.status === 'Done';
      if (t.isPartTime) {
        if (!t.isExpense && !t.isExtraIncome && t.actualStart && t.actualEnd) {
          return isSameDay(new Date(t.start), today);
        }
      } else {
        if (isDone && isSameDay(new Date(t.end), today)) {
          return true;
        }
      }
      return false;
    });

    const publicData = {
      uid: user.uid,
      friendCode,
      displayName: user.displayName || 'ผู้ใช้ SudoDo',
      avatarUrl: localStorage.getItem(`avatar_${user.uid}`) || '',
      currentStreak: streaks.currentStreak || 0,
      totalBadges: unlockedBadges.length || 0,
      unlockedBadges: unlockedBadges.map(b => b.id), // Just save IDs to save space
      hasWorkedToday,
      lastSync: new Date().toISOString()
    };
    
    await setDoc(profileRef, publicData, { merge: true });
    return publicData;
  } catch (err) {
    console.error("Error syncing public profile", err);
    return null;
  }
};

export const addFriendByCode = async (userUid, friendCode) => {
  if (!userUid || !friendCode) return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
  
  const code = friendCode.toUpperCase().trim();
  try {
    // 1. Find user by friendCode
    const profilesRef = collection(db, COLLECTIONS.PUBLIC_PROFILES);
    const q = query(profilesRef, where("friendCode", "==", code));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: 'ไม่พบผู้ใช้จากรหัสเพื่อนนี้' };
    }
    
    const friendDoc = snapshot.docs[0];
    const friendData = friendDoc.data();
    
    if (friendData.uid === userUid) {
      return { success: false, error: 'ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้' };
    }
    
    // 2. Add to friends subcollection
    const friendRef = doc(db, COLLECTIONS.USERS, userUid, COLLECTIONS.FRIENDS, friendData.uid);
    await setDoc(friendRef, { addedAt: new Date().toISOString() });
    
    return { success: true, friend: friendData };
  } catch (err) {
    console.error("Error adding friend", err);
    return { success: false, error: 'เกิดข้อผิดพลาดในการเพิ่มเพื่อน' };
  }
};

export const removeFriend = async (userUid, friendUid) => {
  try {
    const friendRef = doc(db, COLLECTIONS.USERS, userUid, COLLECTIONS.FRIENDS, friendUid);
    await deleteDoc(friendRef);
    return true;
  } catch (err) {
    console.error("Error removing friend", err);
    return false;
  }
};

export const getFriends = async (userUid) => {
  if (!userUid) return [];
  try {
    const friendsRef = collection(db, COLLECTIONS.USERS, userUid, COLLECTIONS.FRIENDS);
    const snapshot = await getDocs(friendsRef);
    
    if (snapshot.empty) return [];
    
    const friendUids = [];
    snapshot.forEach(doc => {
      friendUids.push(doc.id);
    });
    
    // Fetch public profiles for these UIDs
    const friendsList = [];
    // Firestore 'in' query supports max 10 values, so we chunk it if > 10
    const chunks = [];
    for (let i = 0; i < friendUids.length; i += 10) {
      chunks.push(friendUids.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      const profilesRef = collection(db, COLLECTIONS.PUBLIC_PROFILES);
      const q = query(profilesRef, where("uid", "in", chunk));
      const profilesSnap = await getDocs(q);
      profilesSnap.forEach(doc => {
        friendsList.push(doc.data());
      });
    }
    
    return friendsList;
  } catch (err) {
    console.error("Error fetching friends", err);
    return [];
  }
};

export const getPublicProfile = async (uid) => {
  if (!uid) return null;
  try {
    const profileRef = doc(db, COLLECTIONS.PUBLIC_PROFILES, uid);
    const docSnap = await getDoc(profileRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (err) {
    console.error("Error fetching public profile", err);
    return null;
  }
};

export const updatePublicProfileSettings = async (uid, settings) => {
  if (!uid || !settings) return false;
  try {
    const profileRef = doc(db, COLLECTIONS.PUBLIC_PROFILES, uid);
    await setDoc(profileRef, settings, { merge: true });
    return true;
  } catch (err) {
    console.error("Error updating public profile settings", err);
    return false;
  }
};
