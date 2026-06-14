/**
 * Global Constants for SudoDo Application
 */

export const COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  STATS: 'stats',
  STREAK: 'streak',
  PUBLIC_PROFILES: 'public_profiles',
  FRIENDS: 'friends',
  FRIEND_REQUESTS: 'friendRequests',
  CHATS: 'chats',
};

export const TASK_STATUS = {
  TODO: 'To-Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

export const TASK_PRIORITY = {
  HIGH: 'สูง',
  MEDIUM: 'กลาง',
  LOW: 'ต่ำ',
};

export const PRIORITY_WEIGHT = {
  [TASK_PRIORITY.HIGH]: 3,
  [TASK_PRIORITY.MEDIUM]: 2,
  [TASK_PRIORITY.LOW]: 1,
};

export const RATE_TYPE = {
  HOURLY: 'hourly',
  DAILY: 'daily',
};

export const STREAK = {
  MAX_HISTORY_DAYS: 30,
};

export const DEFAULT_TASK_VALUES = {
  HOURLY_RATE: 100,
  SELECTED_DAYS: [1, 2, 3, 4, 5],
  START_TIME: '09:00',
  END_TIME: '17:00',
};
