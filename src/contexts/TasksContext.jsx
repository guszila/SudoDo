import React, { createContext, useContext, useState, useEffect } from 'react';

import { subscribeToTasks, saveTask } from '../services/taskService';
import { syncTasksToGAS } from '../services/syncService';
import { syncPublicProfile } from '../services/friendService';
import { addSystemNotification } from '../services/notificationService';
import { TASK_PRIORITY, PRIORITY_WEIGHT, TASK_STATUS } from '../constants';

const TasksContext = createContext({
  tasks: [],
  isLoading: true,
  error: null
});

export const useTasks = () => useContext(TasksContext);

export const TasksProvider = ({ children, user }) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToTasks(user.uid, (data) => {
      try {
        const formattedData = data.map(item => ({
          ...item,
          start: new Date(item.start),
          end: new Date(item.end),
          priority: item.priority || TASK_PRIORITY.MEDIUM,
          allDay: item.isAllDay || false
        }));

        formattedData.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);

        setTasks(formattedData);
        setError(null);
        setIsLoading(false);
        
        if (user.email) {
          syncTasksToGAS(data, user.email).catch(() => {});
        }
        
        // Sync public profile stats for Friend System
        syncPublicProfile(user, formattedData).catch(err => console.error("Profile sync error", err));
      } catch (err) {
        setError(err);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-complete shifts 15 minutes after end time
  useEffect(() => {
    if (!user || tasks.length === 0) return;

    const checkAndAutoComplete = () => {
      const now = new Date();
      tasks.forEach(async (t) => {
        if (t.isPartTime && t.status !== TASK_STATUS.DONE && t.end) {
          const endTime = new Date(t.end);
          const autoCompleteTime = new Date(endTime.getTime() + 15 * 60000); // +15 mins
          
          if (now >= autoCompleteTime) {
            try {
              const updatedTask = { ...t, status: TASK_STATUS.DONE };
              await saveTask('EDIT', updatedTask, user.uid);
              await addSystemNotification(
                user.uid, 
                `กะทำงาน "${t.title}" ถูกบันทึกว่าสำเร็จอัตโนมัติแล้ว ✅`,
                'system_success'
              );
            } catch (err) {
              console.error("Auto-complete failed", err);
            }
          }
        }
      });
    };

    checkAndAutoComplete(); // Run immediately on mount or task update
    const interval = setInterval(checkAndAutoComplete, 60000);
    return () => clearInterval(interval);
  }, [user, tasks]);

  return (
    <TasksContext.Provider value={{ tasks, isLoading, error }}>
      {children}
    </TasksContext.Provider>
  );
};

