import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscribeToTasks } from '../api/firestore';
import { syncTasksToGAS } from '../api/googleSheets';

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
          priority: item.priority || 'กลาง'
        }));

        // Sort by priority (สูง > กลาง > ต่ำ)
        const priorityWeight = { 'สูง': 3, 'กลาง': 2, 'ต่ำ': 1 };
        formattedData.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

        setTasks(formattedData);
        setError(null);
        setIsLoading(false);
        
        // Sync to google sheets when tasks update
        if (user.email) {
          syncTasksToGAS(data, user.email).catch(err => console.error("GAS Sync Error", err));
        }
      } catch (err) {
        console.error("Error formatting tasks:", err);
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
