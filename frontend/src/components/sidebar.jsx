import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { 
  Building, CreditCard, Users, Briefcase, 
  FileSpreadsheet, GitBranch, Info, Home 
} from 'lucide-react';
// Ambil context autentikasi global agar data role sinkron
import { useAuth } from '../context/AuthContext'; 

const Sidebar = () => {
  const { id: projectId } = useParams(); 
  const { user } = useAuth();

  // Normalisasi string role agar aman dicocokkan
  const userRole = user?.role?.toString().toLowerCase().replace(/[\s+_-]/g, '') || '';

  // Fungsi helper untuk mengecek kecocokan hak akses role
  const isRole = (roleTarget) => userRole === roleTarget;

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
      path: '/companies', // Sesuai dengan App.jsx
      icon: Building, 
      show: isRole('superadmin') 
    },
    { 
      name: 'Billing Platform', 
      path: '/billing-tracker', // Sesuai dengan App.jsx
      icon: CreditCard, 
      show: isRole('superadmin') 
    },

    // ------------------------------------------------------------------------
    // MENU ADMIN PT / WORKSPACE
    // ------------------------------------------------------------------------
    { 
      name: 'Kelola Karyawan', 
      path: '/users', // Sesuai dengan App.jsx
      icon: Users, 
      show: isRole('superadmin') || isRole('admin') 
    },
    { 
      name: 'Workspace Billing', 
      path: '/billing', // Sesuai dengan App.jsx
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
      show: isRole('superadmin') || isRole('admin') || isRole('businessanalyst') || isRole('teamdeveloper')
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
    <aside className="w-64 h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 border-r border-slate-800 z-50">
      
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-black tracking-wider text-red-500 uppercase">ScrumApps</h2>
        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wide">
          Role: {user?.role || 'Guest'}
        </p>
      </div>

      {/* List Item Navigasi */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {allowedMenus.map((menu, index) => {
          const IconComponent = menu.icon;
          return (
            <NavLink
              key={index}
              to={menu.path}
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
  );
};

export default Sidebar;