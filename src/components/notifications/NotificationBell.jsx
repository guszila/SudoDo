import { useState } from 'react';
import { Bell, CheckCircle2, MessageCircle, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useNotifications } from '../../contexts/NotificationsContext';

const getCreatedDate = (createdAt) => {
  if (!createdAt) return null;
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
  if (typeof createdAt.toDate === 'function') return createdAt.toDate();
  return new Date(createdAt);
};

const cleanText = (value) => {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text || text.toLowerCase() === 'undefined' || text.toLowerCase() === 'null') return '';
  return text;
};

export default function NotificationBell({ lang = 'th' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { notifications, unreadCount, markAllRead, clearAllNotifications } = useNotifications();
  const navigate = useNavigate();

  const labels = {
    title: lang === 'en' ? 'Notifications' : 'การแจ้งเตือน',
    close: lang === 'en' ? 'Close' : 'ปิด',
    clear: lang === 'en' ? 'Clear' : 'ล้าง',
    clearing: lang === 'en' ? 'Clearing...' : 'กำลังล้าง...',
    empty: lang === 'en' ? 'No notifications' : 'ไม่มีการแจ้งเตือน',
    system: lang === 'en' ? 'System' : 'ระบบ',
    message: lang === 'en' ? 'Message' : 'ข้อความ',
    new: lang === 'en' ? 'New' : 'ใหม่',
    read: lang === 'en' ? 'Read' : 'อ่านแล้ว',
    autoDone: lang === 'en' ? 'Auto-completed shift' : 'บันทึกงานอัตโนมัติ',
    systemFallback: lang === 'en' ? 'The app updated your task status.' : 'ระบบอัปเดตสถานะงานให้เรียบร้อยแล้ว',
    friendFallback: lang === 'en' ? 'Friend message' : 'ข้อความจากเพื่อน',
    messageFallback: lang === 'en' ? 'Open chat to view details.' : 'เปิดแชทเพื่อดูรายละเอียด',
  };

  const getNotificationCopy = (n) => {
    const rawText = cleanText(n.text) || cleanText(n.message);

    if (n.isSystem) {
      return {
        title: n.type === 'system_success' ? labels.autoDone : labels.system,
        preview: rawText || labels.systemFallback,
      };
    }

    return {
      title: cleanText(n.friendName) || labels.friendFallback,
      preview: rawText || labels.messageFallback,
    };
  };

  const openBell = async () => {
    setIsOpen(true);
    await markAllRead();
  };

  const handleClear = async () => {
    if (notifications.length === 0 || isClearing) return;
    setIsClearing(true);
    await clearAllNotifications();
    setIsClearing(false);
  };

  return (
    <div className="relative z-[21000]">
      <button
        type="button"
        aria-label={labels.title}
        onClick={isOpen ? () => setIsOpen(false) : openBell}
        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md text-white flex items-center justify-center transition-colors relative"
      >
        <Bell size={18} className="md:w-5 md:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border border-white text-[9px] font-black flex items-center justify-center shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+4.75rem)] md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-[22rem] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-main/10 z-[21000] overflow-hidden flex flex-col max-h-[min(440px,calc(100vh-6rem))]">
          <div className="p-3 border-b border-main/10 flex items-center gap-2 bg-black/5 dark:bg-white/5">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-main truncate">{labels.title}</h3>
              <p className="text-[11px] text-main/45">
                {notifications.length} {lang === 'en' ? 'items' : 'รายการ'}
              </p>
            </div>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isClearing}
                className="h-8 px-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/15 disabled:opacity-50 transition-colors flex items-center gap-1.5 text-xs font-bold"
                title={labels.clear}
              >
                <Trash2 size={14} />
                <span>{isClearing ? labels.clearing : labels.clear}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg text-main/50 hover:text-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center"
              aria-label={labels.close}
              title={labels.close}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="p-7 text-center text-main/50 text-sm">
                <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-500/70" />
                {labels.empty}
              </div>
            ) : (
              notifications.map((n) => {
                const createdDate = getCreatedDate(n.createdAt);
                const isUnread = n.read === false;
                const Icon = n.isSystem ? (n.type === 'system_success' ? CheckCircle2 : Bell) : MessageCircle;
                const copy = getNotificationCopy(n);

                return (
                  <button
                    type="button"
                    key={`${n.isSystem ? 'system' : n.chatId}-${n.id}`}
                    className={`w-full text-left p-3 mb-1 rounded-xl transition-colors border ${
                      isUnread
                        ? 'bg-primary-500/10 border-primary-500/15'
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    onClick={() => {
                      if (!n.isSystem) navigate('/friends');
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        n.isSystem ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-500'
                      }`}>
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-bold truncate ${n.isSystem ? 'text-amber-600 dark:text-amber-400' : 'text-blue-500'}`}>
                            {copy.title}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                            isUnread ? 'bg-red-500 text-white' : 'bg-main/10 text-main/45'
                          }`}>
                            {isUnread ? labels.new : labels.read}
                          </span>
                        </span>
                        <span className="block text-xs text-main/80 leading-relaxed whitespace-pre-line line-clamp-4">
                          {copy.preview}
                        </span>
                        <span className="text-[10px] text-main/40 mt-1 block">
                          {createdDate && !Number.isNaN(createdDate.getTime())
                            ? format(createdDate, 'd MMM HH:mm', { locale: lang === 'th' ? th : undefined })
                            : ''}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
