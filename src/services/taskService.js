import { collection, getDocs, doc, setDoc, deleteDoc, query, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { COLLECTIONS } from "../constants";

/**
 * Fetches all tasks for a specific user.
 * @param {string} uid - The user's ID
 * @returns {Promise<Array>} Array of task objects
 */
export const fetchTasks = async (uid) => {
  if (!uid) return [];
  try {
    const tasksRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.TASKS);
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

/**
 * Subscribes to real-time updates for a user's tasks.
 * @param {string} uid - The user's ID
 * @param {function} callback - Function called with updated tasks array
 * @returns {function} Unsubscribe function
 */
export const subscribeToTasks = (uid, callback) => {
  if (!uid) return () => {};
  
  const tasksRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.TASKS);
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

/**
 * Saves, updates, or deletes a task in Firestore.
 * @param {string} action - 'ADD', 'EDIT', or 'DELETE'
 * @param {Object} task - The task data
 * @param {string} uid - The user's ID
 * @returns {Promise<Object|null>} Status object on success, null on error
 */
export const saveTask = async (action, task, uid) => {
  if (!uid) return null;
  try {
    const tasksRef = collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.TASKS);
    
    // Ensure dates are strings
    const taskData = { ...task };
    if (taskData.start instanceof Date) taskData.start = taskData.start.toISOString();
    if (taskData.end instanceof Date) taskData.end = taskData.end.toISOString();

    if (action === 'ADD') {
      const newDocRef = doc(tasksRef); 
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
