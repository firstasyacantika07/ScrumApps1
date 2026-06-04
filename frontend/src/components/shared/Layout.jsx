import React from 'react';
import { LayoutDashboard, FolderKanban, Users, Info, Bell, Sun, UserCircle } from 'lucide-react';

const Layout = ({ children, title }) => {
  return (
    <div className="flex h-screen bg-scrum-bg font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 bg-scrum-dark text-gray-400 flex flex-col">
        <div className="p-6 flex items-center gap-3 text-white">
          <div className="bg-scrum-red p-1.5 rounded-lg">
            <FolderKanban size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">SrcumApps</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <NavItem icon={<FolderKanban size={18}/>} label="Proyek" active />
          <NavItem icon={<Users size={18}/>} label="Pengguna" />
          <NavItem icon={<Info size={18}/>} label="Informasi Sistem" />
        </nav>

        <div className="p-4 text-xs text-gray-600 border-t border-gray-800">
          © Copyright 2024 ScrumApps.
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Proyek</span>
            <span className="text-gray-300">{'>'}</span>
            <span className="text-scrum-red font-medium">Semua</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <Bell size={18} />
            <Sun size={18} />
            <UserCircle size={18} />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-xl font-bold text-gray-800">{title}</h1>
              <p className="text-sm text-gray-400 mt-1">Halaman ini berisi daftar proyek yang tersedia sesuai hak akses.</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
    active ? 'bg-scrum-red text-white' : 'hover:bg-gray-800 hover:text-gray-200'
  }`}>
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export default Layout;