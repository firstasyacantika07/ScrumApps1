import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Info, 
  ChevronRight, 
  ChevronLeft, 
  Layers3
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const [role, setRole] = useState('');

  useEffect(() => {
    // Ambil role langsung dari localStorage untuk memastikan data sinkron
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentRole = storedUser.role || '';
    setRole(currentRole.toString().toLowerCase().trim());
  }, []);

  const isRole = (targetRole) => role === targetRole.toLowerCase().trim();

  const menuItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: <LayoutDashboard size={20} />, 
      show: true 
    },
    { 
      name: 'Proyek', 
      path: '/projects', 
      icon: <Briefcase size={20} />, 
      show: true 
    },
    { 
      name: 'Pengguna', 
      path: '/users', 
      icon: <Users size={20} />, 
      // Muncul HANYA jika role adalah superadmin
      show: isRole('superadmin') 
    },
    { 
      name: 'Informasi', 
      path: '/info', 
      icon: <Info size={20} />, 
      show: true 
    },
  ];

  return (
    <div className={`flex h-screen flex-col bg-[#1b1b28] text-slate-300 relative transition-all duration-300 border-r border-white/5 z-50 shadow-2xl ${isCollapsed ? 'w-[80px]' : 'w-[260px]'}`}>
      
      {/* TOGGLE BUTTON */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-[#ee1e2d] p-1 rounded-lg text-white shadow-lg z-[100] hover:scale-110 transition-all active:scale-95 border border-white/10"
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
      </button>

      {/* LOGO */}
      <div className={`h-20 flex items-center gap-3 border-b border-white/5 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="w-9 h-9 bg-[#ee1e2d] rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
          <Layers3 size={20} strokeWidth={2.5}/>
        </div>
        {!isCollapsed && <span className="text-xl font-black text-white tracking-tight">ScrumApps</span>}
      </div>

      {/* NAV MENU */}
      <nav className={`flex-1 pt-6 space-y-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {menuItems.filter(item => item.show).map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `group relative flex items-center gap-3.5 rounded-xl transition-all duration-300 ${
                isCollapsed ? 'justify-center py-4' : 'px-4 py-3.5'
              } ${
                isActive 
                  ? 'bg-[#ee1e2d] text-white shadow-lg shadow-red-900/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !isCollapsed && (
                  <div className="absolute left-1.5 w-1 h-4 bg-yellow-400 rounded-full"></div>
                )}
                <div className={`${isActive ? 'text-white' : 'group-hover:text-white'}`}>{item.icon}</div>
                {!isCollapsed && <span className="text-sm font-bold tracking-wide">{item.name}</span>}
                
                {isCollapsed && (
                  <div className="absolute left-16 bg-[#2b2b40] text-white text-[10px] font-black px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 shadow-2xl border border-white/5 uppercase tracking-widest pointer-events-none">
                    {item.name}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* FOOTER */}
      <div className={`p-6 border-t border-white/5 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {!isCollapsed ? (
          <div className="animate-in fade-in duration-500">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[2px]">Core Version</p>
            <p className="text-[9px] text-slate-600 font-bold mt-1">v2.0.26 Build</p>
          </div>
        ) : (
          <div className="w-2 h-2 bg-[#ee1e2d] rounded-full animate-pulse shadow-[0_0_10px_rgba(238,30,45,0.5)]"></div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;