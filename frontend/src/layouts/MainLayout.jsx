import React, { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { User, Search, LogOut } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';

// ✅ Import useAuth untuk ambil user & logout dari AuthContext
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  // ✅ Ambil objek 'user' dari global auth context
  const { user, logout } = useAuth();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  // Jika session kosong/loading belum selesai, return null agar tidak crash
  if (!user) return null;

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] font-sans overflow-hidden">
      
      {/* SIDEBAR AREA */}
      <aside 
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } transition-all duration-300 flex-shrink-0 z-50 bg-[#1e1e2d] shadow-2xl relative`}
      >
        {/* 🔥 FIX: Mengalirkan variabel 'user' ke prop userData Sidebar */}
        <Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
          userData={user} 
        />
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
          {/* Search Bar */}
          <div className="hidden md:flex items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 w-72">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari proyek..." 
              className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full outline-none" 
            />
          </div>
          
          <div className="flex items-center gap-6 ml-auto">
            {/* Notification Bell: dropdown notifikasi real dari API, muncul di semua halaman */}
            <NotificationBell />

            {/* User Profile & Logout Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-xl transition-all"
              >
                <div className="h-10 w-10 rounded-lg overflow-hidden border-2 border-slate-100 shadow-sm">
                   <img 
                     src={`https://ui-avatars.com/api/?name=${user.username || 'User'}&background=ee1e2d&color=fff`} 
                     alt="user" 
                   />
                </div>
                <div className="hidden sm:block text-left leading-tight mr-2">
                  <p className="text-sm font-bold text-slate-800">{user.username}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                    {user.role}
                  </p>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isSettingsOpen && (
                <div className="absolute right-0 mt-3 w-52 rounded-2xl bg-white shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={() => { setIsSettingsOpen(false); navigate('/kelolaprofil'); }} 
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <User size={16}/> Profil Saya
                  </button>
                  <hr className="my-2 border-slate-50" />
                  <button 
                    onClick={() => {
                      setIsSettingsOpen(false);
                      logout();
                      navigate('/login');
                    }} 
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-[#ee1e2d] hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut size={16}/> Keluar Akun
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
          {/* 🌟 FIX: Salurkan context dengan nama 'user' yang valid */}
          <Outlet context={{ user }} /> 
        </main>

      </div>
    </div>
  );
};

export default MainLayout;