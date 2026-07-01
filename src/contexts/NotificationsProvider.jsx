/**
 * NotificationsProvider
 *
 * Provides realtime unread chat notifications from friends.
 *
 * Key design decisions:
 * - Friends list is loaded once and cached; subscription persists across page navigation.
 * - Notifications are NOT cleared when friends list is loading — avoids flash of empty state.
 * - markAllRead() is exposed for explicit user action (not called automatically).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { writeBatch, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { NotificationsContext } from './NotificationsContext';
import { subscribeToFriendNotifications, subscribeToSystemNotifications } from '../services/notificationService';
import { subscribeToFriends } from '../services/friendService';

const getNotificationTime = (item) => {
  if (item.createdAt?.seconds) return item.createdAt.seconds;
  if (typeof item.createdAt?.toDate === 'function') return item.createdAt.toDate().getTime() / 1000;
  if (typeof item.createdAt?.getTime === 'function') return item.createdAt.getTime() / 1000;
  return 0;
};

export default function NotificationsProvider({ children, user }) {
  // null = not loaded yet, [] = loaded but empty
  const [friends, setFriends] = useState(null);
  const [friendNotifications, setFriendNotifications] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  
  // Combine both types of notifications, sort by date (newest first)
  const notifications = [...friendNotifications, ...systemNotifications].sort((a, b) => getNotificationTime(b) - getNotificationTime(a));

  const notificationsRef = useRef([]);

  // Keep ref in sync so markAllRead always has the latest list
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Subscribe to friends list in real-time
  useEffect(() => {
    if (!user?.uid) {
      setFriends(null);
      return;
    }
    const unsub = subscribeToFriends(user.uid, (list) => {
      setFriends(list);
    });
    return unsub;
  }, [user?.uid]);

  // Subscribe to unread messages across all friends.
  // Only clears notifications when friends list has been loaded (not null).
  useEffect(() => {
    if (!user?.uid) return;
    if (friends === null) return; // still loading — don't touch notifications yet

    if (friends.length === 0) {
      setFriendNotifications([]);
      return;
    }

    const unsub = subscribeToFriendNotifications(user.uid, friends, setFriendNotifications);
    return unsub;
  }, [user?.uid, friends]);

  // Subscribe to system notifications
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToSystemNotifications(user.uid, setSystemNotifications);
    return unsub;
  }, [user?.uid]);

  const markAllRead = useCallback(async () => {
    const items = notificationsRef.current.filter((item) => item.read === false);
    if (items.length === 0) return;
    if (!user?.uid) return;
    try {
      const batch = writeBatch(db);
      items.forEach((item) => {
        if (item.isSystem) {
          const msgRef = doc(db, 'users', user.uid, 'notifications', item.id);
          batch.update(msgRef, { read: true });
        } else {
          const msgRef = doc(db, 'chats', item.chatId, 'messages', item.id);
          batch.update(msgRef, { read: true });
        }
      });
      await batch.commit();
      setFriendNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setSystemNotifications((current) => current.map((item) => ({ ...item, read: true })));
    } catch (err) {
      console.error('markAllRead error:', err);
    }
  }, [user?.uid]);

  const clearAllNotifications = useCallback(async () => {
    const items = notificationsRef.current;
    if (items.length === 0) return;
    if (!user?.uid) return;
    try {
      const batch = writeBatch(db);
      items.forEach((item) => {
        const data = { read: true, dismissedBy: arrayUnion(user.uid) };
        if (item.isSystem) {
          const msgRef = doc(db, 'users', user.uid, 'notifications', item.id);
          batch.update(msgRef, data);
        } else {
          const msgRef = doc(db, 'chats', item.chatId, 'messages', item.id);
          batch.update(msgRef, data);
        }
      });
      await batch.commit();
      setFriendNotifications([]);
      setSystemNotifications([]);
    } catch (err) {
      console.error('clearAllNotifications error:', err);
    }
  }, [user?.uid]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount: notifications.filter((item) => item.read === false).length,
        markAllRead,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
