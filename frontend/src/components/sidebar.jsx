import React, { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { 
  Building, CreditCard, Users, Briefcase, 
  FileSpreadsheet, GitBranch, Info, Home,
  Menu, X 
} from 'lucide-react';
// Ambil context autentikasi global agar data role sinkron
import { useAuth } from '../context/AuthContext'; 
import WorkspaceSwitcher from './WorkspaceSwitcher';

const Sidebar = () => {
  const { id: projectId } = useParams(); 
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false); // State kontrol mobile drawer

  // Normalisasi string role agar aman dicocokkan
  const userRole = user?.role?.toString().toLowerCase().replace(/[\s+_-]/g, '') || '';

  // Fungsi helper untuk mengecek kecocokan hak akses role
  const isRole = (roleTarget) => userRole === roleTarget;

  // Toggle buka/tutup sidebar mobile
  const toggleSidebar = () => setIsOpen(!isOpen);

  // ----------------=======================================
  // DAFTAR MENU STRUKTURAL (Menyesuaikan Path Akurat di App.jsx)
  // ----------------=======================================
  const menuItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: Home, 
      show: true 
    },

    // ------------------------------------------------------------------------
    // MENU KHUSUS SUPER ADMIN PLATFORM
    // ------------------------------------------------------------------------
    { 
      name: 'Perusahaan SaaS', 
      path: '/companies', 
      icon: Building, 
      show: isRole('superadmin') 
    },
    { 
      name: 'Billing Platform', 
      path: '/billing-tracker', 
      icon: CreditCard, 
      show: isRole('superadmin') 
    },

    // ------------------------------------------------------------------------
    // MENU ADMIN PT / WORKSPACE
    // ------------------------------------------------------------------------
    { 
      name: 'Kelola Karyawan', 
      path: '/users', 
      icon: Users, 
      show: isRole('superadmin') || isRole('admin') 
    },
    { 
      name: 'Workspace Billing', 
      path: '/billing', 
      icon: CreditCard, 
      show: isRole('admin') 
    },

    // ------------------------------------------------------------------------
    // MENU OPERASIONAL SCRUM (PO, BA, DEVELOPER)
    // ------------------------------------------------------------------------
    { 
      name: 'Project Space', 
      path: '/projects', 
      icon: Briefcase, 
      show: !isRole('superadmin') 
    },
    { 
      name: 'Product Backlog', 
      path: '/backlog', 
      icon: FileSpreadsheet, 
      show: isRole('projectowner') || isRole('productowner') || isRole('businessanalyst')
    },
    { 
      name: 'GitHub Integrations', 
      path: '/github-integrations', 
      icon: GitBranch, 
      show: isRole('superadmin') || isRole('admin') || isRole('businessanalyst') || isRole('teamdeveloper') || isRole('admin02') 
    },

    // ------------------------------------------------------------------------
    // MENU UMUM / INFORMASI
    // ------------------------------------------------------------------------
    { 
      name: 'Informasi', 
      path: '/info', 
      icon: Info, 
      show: true 
    },
  ];

  // Saring menu, hanya tampilkan yang flag 'show'-nya bernilai true
  const allowedMenus = menuItems.filter(menu => menu.show);

  return (
    <>
      {/* 1. HEADER TOP NAVBAR (Hanya terlihat di Mobile / Layar Kecil) */}
      <div className="md:hidden bg-slate-900 text-white h-16 px-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 active:scale-95 transition-all"
          >
            <Menu size={20} />
          </button>
          <span className="font-black text-lg tracking-wider text-red-500 uppercase">ScrumApps</span>
        </div>
      </div>

      {/* 2. BACKDROP OVERLAY (Klik di luar menu area untuk menutup sidebar di mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* 3. SIDEBAR COMPONENT (Menggunakan kombinasi transform translate-x) */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 h-screen bg-slate-900 text-white flex flex-col border-r border-slate-800 z-50
        transform transition-transform duration-300 ease-in-out
        md:sticky md:top-0 md:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-wider text-red-500 uppercase">ScrumApps</h2>
          {/* Tombol Close silang khusus mobile drawer */}
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white md:hidden transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-slate-800/50">
          <WorkspaceSwitcher />
        </div>

        {/* List Item Navigasi */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {allowedMenus.map((menu, index) => {
            const IconComponent = menu.icon;
            return (
              <NavLink
                key={index}
                to={menu.path}
                onClick={() => setIsOpen(false)} // Otomatis menutup sidebar setelah menu dipilih di mobile
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-900/20'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`
                }
              >
                <IconComponent size={20} className="shrink-0 transition-transform group-hover:scale-105" />
                <span>{menu.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;