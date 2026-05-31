import { collection, getDocs, doc, setDoc, getDoc, deleteDoc, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export const fetchTasks = async (uid) => {
  if (!uid) return [];
  try {
    const tasksRef = collection(db, "users", uid, "tasks");
    const q = query(tasksRef);
    const snapshot = await getDocs(q);
    const tasks = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    return tasks;
  } catch (error) {
    console.error("Error fetching tasks from Firestore:", error);
    return [];
  }
};

export const subscribeToTasks = (uid, callback) => {
  if (!uid) return () => {};
  
  const tasksRef = collection(db, "users", uid, "tasks");
  const q = query(tasksRef);
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const tasks = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    callback(tasks);
  }, (error) => {
    console.error("Error subscribing to tasks:", error);
    callback([]);
  });
  
  return unsubscribe;
};

export const saveTask = async (action, task, uid) => {
  if (!uid) return null;
  try {
    const tasksRef = collection(db, "users", uid, "tasks");
    
    // Make sure dates are saved as strings to match App.jsx behavior
    const taskData = { ...task };
    if (taskData.start instanceof Date) taskData.start = taskData.start.toISOString();
    if (taskData.end instanceof Date) taskData.end = taskData.end.toISOString();

    if (action === 'ADD') {
      const newDocRef = doc(tasksRef); // Auto-generate ID
      taskData.id = newDocRef.id;
      await setDoc(newDocRef, taskData);
      return { status: 'success' };
    } else if (action === 'EDIT') {
      const docRef = doc(tasksRef, taskData.id);
      await setDoc(docRef, taskData, { merge: true });
      return { status: 'success' };
    } else if (action === 'DELETE') {
      const docRef = doc(tasksRef, taskData.id);
      await deleteDoc(docRef);
      return { status: 'success' };
    }
  } catch (error) {
    console.error("Error saving task to Firestore:", error);
    return null;
  }
};

export const fetchUserStreak = async (uid) => {
  if (!uid) return null;
  try {
    const docRef = doc(db, "users", uid, "stats", "streak");
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

export const updateUserStreak = async (uid, todayStr, yesterdayStr) => {
  if (!uid) return null;
  try {
    const docRef = doc(db, "users", uid, "stats", "streak");
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
    
    if (data.history.length > 30) {
      data.history = data.history.slice(-30);
    }
    
    await setDoc(docRef, data);
    return data;
  } catch (error) {
    console.error("Error updating user streak:", error);
    return null;
  }
};
