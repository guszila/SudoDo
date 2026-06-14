import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Briefcase, Clock, ChevronDown, ChevronUp, Paperclip, CheckCircle2, CalendarDays } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { getChatId, subscribeToChat, sendMessage, sendShiftMessage, markMessagesAsRead } from '../../services/chatService';
import { useTasks } from '../../contexts/TasksContext';
import { TASK_STATUS } from '../../constants';

// ── Helpers ──────────────────────────────────────────────
const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v === 'string') return new Date(v);
  if (typeof v === 'object' && v.seconds !== undefined) return new Date(v.seconds * 1000);
  return null;
};

const fmtDate = (v) => {
  const d = toDate(v);
  if (!d) return '';
  return format(d, 'EEE d MMM', { locale: th }); // e.g. "จ. 14 มิ.ย."
};

const fmtDateShort = (v) => {
  const d = toDate(v);
  if (!d) return '';
  return format(d, 'd MMM', { locale: th });
};

// Extract HH:mm — prefer explicit startTime/endTime string, fallback to datetime
const getTime = (timeStr, datetimeField) => {
  if (timeStr && typeof timeStr === 'string' && timeStr.includes(':')) return timeStr;
  const d = toDate(datetimeField);
  if (!d) return '';
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

// ── Expandable Shift Card in chat ─────────────────────────
const ShiftBubble = ({ shift, isMine }) => {
  const [expanded, setExpanded] = useState(false);
  if (!shift) return null;

  const dateStr = fmtDate(shift.start);
  const startT = getTime(shift.startTime, shift.start);
  const endT = getTime(shift.endTime, shift.end);
  const timeStr = startT && endT ? `${startT} – ${endT}` : (startT || endT || '');

  return (
    <div className={`rounded-[16px] overflow-hidden shadow-sm border max-w-[230px] transition-all ${
      isMine
        ? 'bg-primary-500/15 border-primary-500/30'
        : 'bg-white dark:bg-white/8 border-main/10'
    }`}>
      {/* Header row */}
      <div className={`px-3 py-2 flex items-center gap-2 ${
        isMine ? 'bg-primary-500/25' : 'bg-main/5'
      }`}>
        <CalendarDays size={13} className="text-primary-500 flex-shrink-0" />
        <span className="text-xs font-bold text-main truncate flex-1">{shift.title || 'กะงาน'}</span>
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(p => !p)}
          className="p-0.5 rounded-full text-main/40 hover:text-primary-500 transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Compact body — always visible */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Clock size={11} className="text-primary-500 flex-shrink-0" />
          <div className="flex flex-col">
            {dateStr && <span className="text-[11px] font-semibold text-main/80">{dateStr}</span>}
            {timeStr && (
              <span className="text-xs font-black text-primary-500">{timeStr}</span>
            )}
          </div>
        </div>

        {/* Expandable details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="mt-2 pt-2 border-t border-main/10 space-y-1.5">
                {shift.status && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    shift.status === TASK_STATUS.DONE
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : shift.status === TASK_STATUS.IN_PROGRESS
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-sky-500/10 text-sky-600'
                  }`}>
                    {shift.status === TASK_STATUS.DONE && <CheckCircle2 size={9} />}
                    {shift.status}
                  </span>
                )}
                {shift.isHolidayPay && (
                  <p className="text-[10px] font-bold text-orange-500">🎉 วันหยุด x2</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tap hint */}
        <p className="text-[9px] text-main/25 mt-1.5">
          {expanded ? 'กดเพื่อย่อ ▲' : 'กดดูเพิ่มเติม ▼'}
        </p>
      </div>
    </div>
  );
};

// ── Single Message Bubble ─────────────────────────────────
const MessageBubble = ({ msg, isMine, showAvatar, lang = 'th' }) => {
  const ts = toDate(msg.createdAt);
  return (
    <div className={`flex gap-2 items-end ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-7 flex-shrink-0">
        {!isMine && showAvatar && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
            {msg.senderAvatar
              ? <img src={msg.senderAvatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-white text-[9px] font-bold">{(msg.senderName || '?').slice(0, 2).toUpperCase()}</span>
            }
          </div>
        )}
      </div>

      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
        {msg.type === 'shift' ? (
          <ShiftBubble shift={msg.shift} isMine={isMine} />
        ) : (
          <div className={`px-3 py-2 rounded-[18px] text-sm leading-snug ${
            isMine
              ? 'bg-primary-500 text-white rounded-br-[6px]'
              : 'bg-white dark:bg-white/8 text-main rounded-bl-[6px] shadow-sm border border-main/5'
          }`}>
            {msg.text}
          </div>
        )}
        <div className="flex items-center gap-1.5 px-1 select-none">
          {isMine && (
            <span className={`text-[9px] font-bold ${msg.read ? 'text-primary-500 font-bold' : 'text-main/30'}`}>
              {msg.read 
                ? (lang === 'en' ? 'Read' : 'อ่านแล้ว') 
                : (lang === 'en' ? 'Sent' : 'ส่งแล้ว')}
            </span>
          )}
          {ts && (
            <span className="text-[9px] text-main/30">
              {format(ts, 'HH:mm')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Shift Picker — upcoming shifts only ───────────────────
const ShiftPicker = ({ tasks, onSelect, onClose, lang }) => {
  const today = startOfDay(new Date());

  const upcoming = tasks
    .filter(t => {
      if (!t.isPartTime || t.isExpense || t.isExtraIncome) return false;
      if (t.status === TASK_STATUS.DONE) return false; // skip completed
      const d = toDate(t.start);
      return d && d >= today; // today or future
    })
    .sort((a, b) => {
      const da = toDate(a.start) ?? new Date(0);
      const db = toDate(b.start) ?? new Date(0);
      return da - db; // ascending by date
    })
    .slice(0, 15);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="absolute bottom-full left-0 right-0 mb-2 liquid-glass-card rounded-[20px] p-3 shadow-xl max-h-60 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-2 px-1">
        <div>
          <p className="text-xs font-bold text-main/70">แชร์กะงาน</p>
          <p className="text-[9px] text-main/40">เวรที่ยังไม่ถึง ({upcoming.length})</p>
        </div>
        <button onClick={onClose} className="p-1 text-main/40 hover:text-main rounded-full">
          <X size={14} />
        </button>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-center py-5">
          <CalendarDays size={24} className="text-main/20 mx-auto mb-2" />
          <p className="text-xs text-main/40">ไม่มีเวรที่ยังไม่ถึง</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {upcoming.map(s => {
            const d = toDate(s.start);
            const isToday = d && startOfDay(d).getTime() === today.getTime();
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className="w-full flex items-center gap-3 p-2.5 rounded-[14px] hover:bg-primary-500/10 active:scale-[0.98] transition-all text-left group"
              >
                {/* Date badge */}
                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                  isToday ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : 'bg-primary-500/10'
                }`}>
                  <span className={`text-[9px] font-bold uppercase ${isToday ? 'text-white/80' : 'text-primary-500/60'}`}>
                    {d ? format(d, 'EEE', { locale: th }) : ''}
                  </span>
                  <span className={`text-sm font-black leading-none ${isToday ? 'text-white' : 'text-primary-500'}`}>
                    {d ? format(d, 'd') : '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-main truncate group-hover:text-primary-500 transition-colors">
                    {s.title || 'กะงาน'}
                  </p>
                  <p className="text-[10px] text-main/50">
                    {(() => {
                      const st = getTime(s.startTime, s.start);
                      const et = getTime(s.endTime, s.end);
                      if (st && et) return `${st} – ${et}`;
                      if (st) return st;
                      if (et) return et;
                      return d ? fmtDateShort(d) : '';
                    })()}
                  </p>
                </div>
                {isToday && (
                  <span className="text-[9px] font-bold bg-primary-500/10 text-primary-500 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    วันนี้
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

// ── Main Chat View ────────────────────────────────────────
export default function ChatView({ user, friend, lang = 'th', onClose }) {
  const { tasks } = useTasks();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const chatId = getChatId(user.uid, friend.uid);

  useEffect(() => {
    const unsub = subscribeToChat(chatId, (msgs) => {
      setMessages(msgs);
      // Mark incoming messages from the friend as read
      const unreadFromFriend = msgs.filter(m => m.senderId === friend.uid && !m.read);
      if (unreadFromFriend.length > 0) {
        markMessagesAsRead(chatId, unreadFromFriend.map(m => m.id));
      }
    });
    return unsub;
  }, [chatId, friend.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendMessage(chatId, user.uid, user.displayName || 'ฉัน', user.photoURL, text);
    setText('');
    setSending(false);
    inputRef.current?.focus();
  }, [chatId, user, text, sending]);

  const handleSendShift = useCallback(async (shift) => {
    setShowShiftPicker(false);
    setSending(true);
    await sendShiftMessage(chatId, user.uid, user.displayName || 'ฉัน', user.photoURL, shift);
    setSending(false);
  }, [chatId, user]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-main/10 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden shadow-sm">
          {friend.avatarUrl
            ? <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-white text-xs font-bold">{(friend.displayName || '?').slice(0, 2).toUpperCase()}</span>
          }
        </div>
        <div className="flex-1">
          <p className="font-bold text-main text-sm leading-tight">{friend.displayName || 'เพื่อน'}</p>
          <p className="text-[10px] text-main/40">
            {friend.hasWorkedToday
              ? (lang === 'en' ? '🟢 Active today' : '🟢 ทำงานวันนี้')
              : (lang === 'en' ? 'Offline' : 'ออฟไลน์')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-main/10 text-main/50 hover:text-main transition-colors"
        >
          <ChevronDown size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-10 gap-2 text-center">
            <div className="w-14 h-14 bg-primary-500/10 rounded-full flex items-center justify-center mb-2">
              <Send size={24} className="text-primary-500/50" />
            </div>
            <p className="text-sm font-bold text-main/60">
              {lang === 'en' ? 'Start a conversation!' : 'เริ่มสนทนาได้เลย!'}
            </p>
            <p className="text-xs text-main/40">
              {lang === 'en' ? 'Share your upcoming shifts 📅' : 'แชร์เวรที่กำลังจะมาถึง 📅'}
            </p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.senderId === user.uid;
          const prevMsg = messages[i - 1];
          const showAvatar = !isMine && (!prevMsg || prevMsg.senderId !== msg.senderId);
          return (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={isMine}
              showAvatar={showAvatar}
              lang={lang}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="px-3 pb-3 flex-shrink-0 relative">
        <AnimatePresence>
          {showShiftPicker && (
            <ShiftPicker
              tasks={tasks}
              onSelect={handleSendShift}
              onClose={() => setShowShiftPicker(false)}
              lang={lang}
            />
          )}
        </AnimatePresence>

        <div className="flex gap-2 items-end">
          <button
            onClick={() => setShowShiftPicker(p => !p)}
            title={lang === 'en' ? 'Share upcoming shift' : 'แชร์เวรที่กำลังจะมา'}
            className={`p-3 rounded-2xl flex-shrink-0 transition-all ${
              showShiftPicker
                ? 'bg-primary-500 text-white'
                : 'bg-main/8 text-main/50 hover:text-primary-500 hover:bg-primary-500/10'
            }`}
          >
            <CalendarDays size={18} />
          </button>

          <div className="flex-1 flex items-end bg-main/5 rounded-[20px] border border-main/10 focus-within:border-primary-500/40 focus-within:bg-primary-500/5 transition-all overflow-hidden">
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === 'en' ? 'Type a message…' : 'พิมพ์ข้อความ…'}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-main resize-none focus:outline-none placeholder:text-main/30 max-h-28"
              style={{ lineHeight: '1.4' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="p-3 rounded-2xl bg-primary-500 text-white flex-shrink-0 hover:bg-primary-600 active:scale-95 transition-all shadow-md shadow-primary-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
