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
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { NotificationsContext } from './NotificationsContext';
import { subscribeToFriendNotifications, subscribeToSystemNotifications } from '../services/notificationService';
import { getFriends, subscribeToFriends } from '../services/friendService';

export default function NotificationsProvider({ children, user }) {
  // null = not loaded yet, [] = loaded but empty
  const [friends, setFriends] = useState(null);
  const [friendNotifications, setFriendNotifications] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  
  // Combine both types of notifications, sort by date (newest first)
  const notifications = [...friendNotifications, ...systemNotifications].sort((a, b) => {
    const timeA = a.createdAt?.seconds || a.createdAt?.getTime() / 1000 || 0;
    const timeB = b.createdAt?.seconds || b.createdAt?.getTime() / 1000 || 0;
    return timeB - timeA;
  });

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
    const items = notificationsRef.current;
    if (items.length === 0) return;
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
      setFriendNotifications([]);
      setSystemNotifications([]);
    } catch (err) {
      console.error('markAllRead error:', err);
    }
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount: notifications.length,
        markAllRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
