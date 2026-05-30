import { collection, getDocs, doc, setDoc, deleteDoc, query } from "firebase/firestore";
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
