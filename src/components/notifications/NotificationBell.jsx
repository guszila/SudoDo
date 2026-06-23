import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationsContext';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function NotificationBell({ lang = 'th' }) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleOpen = () => {
    setIsOpen(true);
    markAllRead();
  };

  return (
    <div className="relative">
      <button 
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md text-white flex items-center justify-center transition-colors relative"
      >
        <Bell size={18} className="md:w-5 md:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-main/10 z-[100] overflow-hidden flex flex-col max-h-[400px]">
          <div className="p-3 border-b border-main/10 flex justify-between items-center bg-black/5 dark:bg-white/5">
            <h3 className="font-bold text-sm">{lang === 'en' ? 'Notifications' : 'การแจ้งเตือน'}</h3>
            <span className="text-xs text-main/50 cursor-pointer hover:text-primary-500" onClick={() => setIsOpen(false)}>
              {lang === 'en' ? 'Close' : 'ปิด'}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-main/50 text-sm">
                {lang === 'en' ? 'No new notifications' : 'ไม่มีการแจ้งเตือน'}
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3 mb-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors" onClick={() => {
                   if (!n.isSystem) navigate('/friends');
                   setIsOpen(false);
                }}>
                  {n.isSystem ? (
                    <div className="text-xs font-bold text-primary-500 mb-0.5">{lang === 'en' ? 'System' : 'ระบบ'}</div>
                  ) : (
                    <div className="text-xs font-bold text-blue-500 mb-0.5">{n.friendName}</div>
                  )}
                  <p className="text-xs text-main/80 line-clamp-2">{n.text || n.message}</p>
                  <span className="text-[10px] text-main/40 mt-1 block">
                    {n.createdAt?.seconds ? format(new Date(n.createdAt.seconds * 1000), 'd MMM HH:mm', { locale: lang === 'th' ? th : undefined }) : (n.createdAt ? format(new Date(n.createdAt), 'd MMM HH:mm', { locale: lang === 'th' ? th : undefined }) : '')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
