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
import { subscribeToFriendNotifications } from '../services/notificationService';
import { getFriends, subscribeToFriends } from '../services/friendService';

export default function NotificationsProvider({ children, user }) {
  // null = not loaded yet, [] = loaded but empty
  const [friends, setFriends] = useState(null);
  const [notifications, setNotifications] = useState([]);
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
      setNotifications([]);
      return;
    }

    const unsub = subscribeToFriendNotifications(user.uid, friends, setNotifications);
    return unsub;
  }, [user?.uid, friends]);

  const markAllRead = useCallback(async () => {
    const items = notificationsRef.current;
    if (items.length === 0) return;
    try {
      const batch = writeBatch(db);
      items.forEach((item) => {
        const msgRef = doc(db, 'chats', item.chatId, 'messages', item.id);
        batch.update(msgRef, { read: true });
      });
      await batch.commit();
      setNotifications([]);
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
