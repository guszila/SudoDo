import React, { createContext, useContext, useState, useEffect } from 'react';

import { subscribeToTasks } from '../services/taskService';
import { syncTasksToGAS } from '../services/syncService';
import { syncPublicProfile } from '../services/friendService';
import { TASK_PRIORITY, PRIORITY_WEIGHT } from '../constants';

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

  return (
    <TasksContext.Provider value={{ tasks, isLoading, error }}>
      {children}
    </TasksContext.Provider>
  );
};

