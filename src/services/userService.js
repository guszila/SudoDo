import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS, STREAK } from "../constants";

/**
 * Fetches the user's streak data from Firestore.
 * @param {string} uid - The user's ID
 * @returns {Promise<Object|null>} The user's streak data or null if error
 */
export const fetchUserStreak = async (uid) => {
  if (!uid) return null;
  try {
    const docRef = doc(db, COLLECTIONS.USERS, uid, COLLECTIONS.STATS, COLLECTIONS.STREAK);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data();
    }
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastActiveDate: null,
      history: []
    };
  } catch (error) {
    console.error("Error fetching user streak:", error);
    return null;
  }
};

/**
 * Updates the user's streak data based on today's activity.
 * @param {string} uid - The user's ID
 * @param {string} todayStr - Today's date string (yyyy-MM-dd)
 * @param {string} yesterdayStr - Yesterday's date string (yyyy-MM-dd)
 * @returns {Promise<Object|null>} The updated streak data or null if error
 */
export const updateUserStreak = async (uid, todayStr, yesterdayStr) => {
  if (!uid) return null;
  try {
    const docRef = doc(db, COLLECTIONS.USERS, uid, COLLECTIONS.STATS, COLLECTIONS.STREAK);
    const snapshot = await getDoc(docRef);
    let data = {
      currentStreak: 0,
      bestStreak: 0,
      lastActiveDate: null,
      history: []
    };
    
    if (snapshot.exists()) {
      data = snapshot.data();
    }
    
    if (data.lastActiveDate === todayStr) {
      return data;
    }
    
    if (data.lastActiveDate === yesterdayStr) {
      data.currentStreak += 1;
    } else {
      data.currentStreak = 1;
    }
    
    if (data.currentStreak > data.bestStreak) {
      data.bestStreak = data.currentStreak;
    }
    
    data.lastActiveDate = todayStr;
    if (!data.history.includes(todayStr)) {
      data.history.push(todayStr);
    }
    
    if (data.history.length > STREAK.MAX_HISTORY_DAYS) {
      data.history = data.history.slice(-STREAK.MAX_HISTORY_DAYS);
    }
    
    await setDoc(docRef, data);
    return data;
  } catch (error) {
    console.error("Error updating user streak:", error);
    return null;
  }
};
