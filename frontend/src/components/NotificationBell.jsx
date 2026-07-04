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
        const data = response.data.notifications; // FIX: backend mengembalikan key "notifications", bukan "data"
        
        if (Array.isArray(data)) {
          setNotifications(data);
          // PERBAIKAN: Menggunakan konversi ke boolean agar perbandingan lebih akurat
          const unread = data.filter(n => Number(n.isRead) === 0);
          setUnreadCount(unread.length);
        }
      } catch (err) {
        console.error("Gagal mengambil notifikasi:", err);
      }
    };

    fetchNotifications(); // ambil data saat komponen pertama kali mount

    // 🔄 POLLING: karena MainLayout hanya mount sekali untuk semua halaman,
    // tanpa ini badge/dropdown tidak akan pernah update selama user
    // berpindah-pindah halaman tanpa reload penuh.
    const interval = setInterval(fetchNotifications, 30000); // tiap 30 detik

    return () => clearInterval(interval); // bersihkan interval saat unmount
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      const updated = notifications.map(n => ({ ...n, isRead: 1 }));
      setNotifications(updated);
      setUnreadCount(0);
    } catch (err) {
      console.error("Gagal memperbarui status");
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/read/${id}`);
      const updated = notifications.map(n => 
        (n.id === id ? { ...n, isRead: 1 } : n)
      );
      setNotifications(updated);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Gagal memperbarui status notifikasi:", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'LATE': return <Clock className="w-4 h-4 text-red-600" />;
      case 'DONE': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'SPRINT_REMINDER': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'ASSIGNMENT': return <Mail className="w-4 h-4 text-indigo-600" />;
      default: return <Mail className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="relative inline-block">
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
                    key={notif._id || notif.id} 
                    onClick={() => Number(notif.isRead) === 0 && markAsRead(notif.id)}
                    className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${Number(notif.isRead) === 0 ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="flex-shrink-0 mt-1 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{notif.title}</p>
                      <p className="text-xs text-slate-500 leading-snug mt-0.5">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 font-medium mt-1.5 block">
                        {notif.time || new Date(notif.createdAt).toLocaleDateString('id-ID')}
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