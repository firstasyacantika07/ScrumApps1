import React, { useState, useEffect } from 'react';
import { Bell, Mail, Clock, CheckCircle, X } from 'lucide-react';
import api from '../api/axios';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        const data = response.data.data; // Mengambil array dari respons API
        
        if (Array.isArray(data)) {
          setNotifications(data);
          setUnreadCount(data.filter(n => n.isRead === false).length);
        }
      } catch (err) {
        console.error("Gagal mengambil notifikasi:", err);
      }
    };
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      const updated = notifications.map(n => ({ ...n, isRead: true }));
      setNotifications(updated);
      setUnreadCount(0);
    } catch (err) {
      console.error("Gagal memperbarui status");
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'LATE': return <Clock className="w-4 h-4 text-red-600" />;
      case 'DONE': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Mail className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="relative inline-block">
      {/* Tombol Lonceng */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-slate-400 hover:text-slate-600 transition-all duration-200 hover:bg-slate-100 rounded-full focus:outline-none"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#ee1e2d] text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden ring-1 ring-black ring-opacity-5">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Pemberitahuan</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">Tidak ada notifikasi</div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif._id} 
                    className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{notif.title}</p>
                      <p className="text-xs text-slate-500 leading-snug mt-0.5">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 font-medium mt-1.5 block">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;