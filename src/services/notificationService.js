/**
 * Notification Service
 * Listens to all chat conversations for a user and surfaces recent messages
 * from friends as "notifications" for the Inbox tab on FriendsPage.
 *
 * Strategy: Subscribe to each chatId (derived from friends list), fetch recent
 * messages ordered by time, and filter client-side for messages FROM the friend.
 * Read items stay visible until the user explicitly clears them.
 */

import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc
} from 'firebase/firestore';
import { getChatId } from './chatService';
import { db } from '../firebase';

/**
 * Subscribe to visible chat notifications across all friends.
 *
 * @param {string} userUid   — current user's UID
 * @param {Array}  friends   — array of friend profile objects (must have .uid)
 * @param {Function} callback — called with array of notification objects
 * @returns {Function} unsubscribe — call to stop all listeners
 */
export const subscribeToFriendNotifications = (userUid, friends, callback) => {
  if (!userUid || !friends || friends.length === 0) {
    callback([]);
    return () => {};
  }

  const unsubscribers = [];
  // Map: chatId → unread messages from that friend
  const chatMessages = {};

  const rebuild = () => {
    const all = Object.values(chatMessages)
      .flat()
      .sort((a, b) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return tb - ta; // newest first
      });
    callback(all);
  };

  friends.forEach((friend) => {
    if (!friend.uid) return;
    const chatId = getChatId(userUid, friend.uid);

    // Simple query — just recent messages by time, no composite index needed.
    // We filter unread + sender client-side.
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Keep messages from the friend until the user explicitly clears them.
        chatMessages[chatId] = snap.docs
          .map((d) => ({ id: d.id, chatId, friendUid: friend.uid, friendName: friend.displayName || 'เพื่อน', friendAvatar: friend.avatarUrl || null, ...d.data() }))
          .filter((m) => {
            const dismissedBy = Array.isArray(m.dismissedBy) ? m.dismissedBy : [];
            return m.senderId === friend.uid && !dismissedBy.includes(userUid);
          });
        rebuild();
      },
      () => {
        // Chat doc may not exist yet — ignore silently
        chatMessages[chatId] = [];
        rebuild();
      },
    );

    unsubscribers.push(unsub);
  });

  return () => unsubscribers.forEach((fn) => fn());
};

export const addSystemNotification = async (uid, message, type = 'system') => {
  if (!uid) return;
  try {
    const notifRef = collection(db, 'users', uid, 'notifications');
    await setDoc(doc(notifRef), {
      message,
      type,
      createdAt: new Date(),
      read: false,
      dismissedBy: []
    });
  } catch (err) {
    console.error('Error adding system notification:', err);
  }
};

export const subscribeToSystemNotifications = (uid, callback) => {
  if (!uid) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    const notifs = snap.docs
      .map(d => ({ id: d.id, isSystem: true, ...d.data() }))
      .filter((n) => {
        const dismissedBy = Array.isArray(n.dismissedBy) ? n.dismissedBy : [];
        return !dismissedBy.includes(uid);
      });
    callback(notifs);
  }, (err) => {
    console.error("System notifications error:", err);
    callback([]);
  });
};
