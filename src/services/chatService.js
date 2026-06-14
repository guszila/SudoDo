/**
 * Chat Service — Firestore-based real-time messaging
 * Collection: chats/{chatId}/messages/{messageId}
 * chatId = sorted UIDs joined with '_'
 */

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Deterministic chat ID from two UIDs (sorted alphabetically)
 */
export const getChatId = (uid1, uid2) => {
  return [uid1, uid2].sort().join('_');
};

/**
 * Subscribe to messages in real-time.
 * Returns an unsubscribe function.
 */
export const subscribeToChat = (chatId, callback, msgLimit = 60) => {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(msgLimit),
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
};

/**
 * Mark a batch of messages as read
 */
export const markMessagesAsRead = async (chatId, messageIds) => {
  if (!messageIds || messageIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    messageIds.forEach((id) => {
      const msgRef = doc(db, 'chats', chatId, 'messages', id);
      batch.update(msgRef, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error marking messages as read:', err);
  }
};

/**
 * Send a text message
 */
export const sendMessage = async (chatId, senderId, senderName, senderAvatar, text) => {
  if (!text?.trim()) return;
  const msgRef = collection(db, 'chats', chatId, 'messages');
  await addDoc(msgRef, {
    type: 'text',
    senderId,
    senderName,
    senderAvatar: senderAvatar || null,
    text: text.trim(),
    createdAt: serverTimestamp(),
    read: false,
  });
  // Update last message meta on chat doc
  await setDoc(
    doc(db, 'chats', chatId),
    { lastMessage: text.trim(), lastAt: serverTimestamp(), participants: chatId.split('_') },
    { merge: true },
  );
};

/**
 * Send a shift card message
 */
export const sendShiftMessage = async (chatId, senderId, senderName, senderAvatar, shift) => {
  const msgRef = collection(db, 'chats', chatId, 'messages');
  const text = `📅 แชร์กะงาน: ${shift.title || 'กะงาน'}`;

  // Safely convert any date value to ISO string (handles string, Date, Firestore Timestamp, plain {seconds})
  const toIso = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v?.toDate === 'function') return v.toDate().toISOString(); // Firestore Timestamp
    if (v instanceof Date) return v.toISOString(); // native Date
    if (typeof v === 'object' && v.seconds !== undefined) return new Date(v.seconds * 1000).toISOString(); // plain {seconds,nanoseconds}
    return null;
  };

  // Build shift payload — filter out undefined/null to keep Firestore happy
  const shiftPayload = {
    id: shift.id ?? '',
    title: shift.title ?? '',
    startTime: shift.startTime ?? '',
    endTime: shift.endTime ?? '',
    hourlyRate: Number(shift.hourlyRate) || 0,
    rateType: shift.rateType ?? 'daily',
    isHolidayPay: Boolean(shift.isHolidayPay),
    breakHours: Number(shift.breakHours) || 0,
    status: shift.status ?? '',
  };
  const startIso = toIso(shift.start);
  const endIso = toIso(shift.end);
  if (startIso) shiftPayload.start = startIso;
  if (endIso) shiftPayload.end = endIso;

  await addDoc(msgRef, {
    type: 'shift',
    senderId,
    senderName,
    senderAvatar: senderAvatar || null,
    text,
    shift: shiftPayload,
    createdAt: serverTimestamp(),
    read: false,
  });
  await setDoc(
    doc(db, 'chats', chatId),
    { lastMessage: text, lastAt: serverTimestamp(), participants: chatId.split('_') },
    { merge: true },
  );
};
