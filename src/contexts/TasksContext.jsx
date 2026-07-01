import React, { createContext, useContext, useState, useEffect } from 'react';

import { subscribeToTasks, saveTask } from '../services/taskService';
import { syncTasksToGAS } from '../services/syncService';
import { syncPublicProfile } from '../services/friendService';
import { addSystemNotification } from '../services/notificationService';
import { TASK_PRIORITY, PRIORITY_WEIGHT, TASK_STATUS, RATE_TYPE } from '../constants';

const TasksContext = createContext({
  tasks: [],
  isLoading: true,
  error: null,
});

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCurrency = (value) => (
  Number(value) || 0
).toLocaleString('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatHours = (value) => {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return rounded.toLocaleString('th-TH', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });
};

const formatShiftDate = (date) => {
  if (!date) return 'ไม่ทราบวันที่';
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatShiftTime = (date) => {
  if (!date) return '--:--';
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getShiftSummary = (task) => {
  const start = toDate(task.actualStart) || toDate(task.start);
  const end = toDate(task.actualEnd) || toDate(task.end);
  const breakHours = Math.max(0, Number(task.breakHours) || 0);
  const grossHours = start && end ? Math.max(0, (end - start) / 3600000) : 0;
  const netHours = Math.max(0, grossHours - breakHours);
  const rate = Number(task.hourlyRate) || 0;
  const earnings = task.rateType === RATE_TYPE.DAILY ? rate : netHours * rate;

  return {
    date: formatShiftDate(start || end),
    time: `${formatShiftTime(start)}-${formatShiftTime(end)}`,
    hours: netHours,
    earnings,
  };
};

const buildAutoCompleteMessage = (task) => {
  const summary = getShiftSummary(task);
  const title = task.title || 'ไม่มีชื่อ';

  return [
    `กะทำงาน "${title}" ถูกบันทึกว่าสำเร็จอัตโนมัติแล้ว`,
    `วันที่ ${summary.date} เวลา ${summary.time}`,
    `รวม ${formatHours(summary.hours)} ชม. | รายได้ ฿${formatCurrency(summary.earnings)}`,
  ].join('\n');
};

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
        const formattedData = data.map((item) => ({
          ...item,
          start: new Date(item.start),
          end: new Date(item.end),
          priority: item.priority || TASK_PRIORITY.MEDIUM,
          allDay: item.isAllDay || false,
        }));

        formattedData.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]);

        setTasks(formattedData);
        setError(null);
        setIsLoading(false);

        if (user.email) {
          syncTasksToGAS(data, user.email).catch(() => {});
        }

        syncPublicProfile(user, formattedData).catch((err) => console.error('Profile sync error', err));
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
          const autoCompleteTime = new Date(endTime.getTime() + 15 * 60000);

          if (now >= autoCompleteTime) {
            try {
              const updatedTask = { ...t, status: TASK_STATUS.DONE };
              await saveTask('EDIT', updatedTask, user.uid);
              await addSystemNotification(
                user.uid,
                buildAutoCompleteMessage(t),
                'system_success',
              );
            } catch (err) {
              console.error('Auto-complete failed', err);
            }
          }
        }
      });
    };

    checkAndAutoComplete();
    const interval = setInterval(checkAndAutoComplete, 60000);
    return () => clearInterval(interval);
  }, [user, tasks]);

  return (
    <TasksContext.Provider value={{ tasks, isLoading, error }}>
      {children}
    </TasksContext.Provider>
  );
};
