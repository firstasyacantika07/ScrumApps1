import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { User, Search, LogOut } from 'lucide-react';
import Sidebar from '../components/sidebar';
import NotificationBell from '../components/NotificationBell';
import api from '../api/axios';

// ✅ Import useAuth untuk ambil user & logout dari AuthContext
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  // ✅ Ambil objek 'user' dari global auth context
  const { user, logout } = useAuth();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  // 🔍 State untuk fitur pencarian proyek di header
  const [searchQuery, setSearchQuery] = useState('');
  const [allProjects, setAllProjects] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchBoxRef = useRef(null);

  // Ambil daftar proyek sekali saat layout dimuat, dipakai untuk filter pencarian
  // (dilewati untuk Superadmin karena search bar tidak ditampilkan untuk role ini)
  useEffect(() => {
    const roleNormalized = user?.role?.toString().toLowerCase().replace(/[\s_-]/g, '') || '';
    if (roleNormalized === 'superadmin') return;

    let isMounted = true;
    const fetchProjects = async () => {
      try {
        setIsSearchLoading(true);
        const res = await api.get('/projects');
        const data = res.data?.data || res.data || [];
        if (isMounted) setAllProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Gagal memuat daftar proyek untuk pencarian:', err.message);
      } finally {
        if (isMounted) setIsSearchLoading(false);
      }
    };
    fetchProjects();
    return () => { isMounted = false; };
  }, [user]);

  // Filter proyek setiap kali query berubah
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const filtered = allProjects.filter((p) =>
      (p.name || p.title || '').toLowerCase().includes(q)
    );
    setSearchResults(filtered.slice(0, 8));
  }, [searchQuery, allProjects]);

  // Tutup dropdown hasil pencarian saat klik di luar area search box
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProject = (project) => {
    setSearchQuery('');
    setIsSearchOpen(false);
    navigate(`/projects/${project.id}`);
  };

  // Jika session kosong/loading belum selesai, return null agar tidak crash
  if (!user) return null;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#f8fafc] font-sans overflow-hidden">
      
      {/* SIDEBAR AREA (Dioptimalkan agar pembungkus mengikuti sifat responsif Sidebar internal) */}
      <aside className="z-50 flex-shrink-0 md:block relative">
        {/* 🔥 Mengalirkan variabel 'user' ke prop userData Sidebar */}
        <Sidebar 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
          userData={user} 
        />
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-5 md:px-8 shrink-0">
          
          {/* Search Bar — disembunyikan untuk role Superadmin */}
          {user?.role?.toString().toLowerCase().replace(/[\s_-]/g, '') !== 'superadmin' && (
            <div className="hidden md:flex flex-col relative w-72" ref={searchBoxRef}>
              <div className="flex items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                <Search size={18} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari proyek..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full outline-none"
                />
              </div>

              {/* Dropdown hasil pencarian */}
              {isSearchOpen && searchQuery.trim() && (
                <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden">
                  {isSearchLoading ? (
                    <div className="px-4 py-3 text-xs text-slate-400 font-semibold">Memuat proyek...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                      >
                        {project.name || project.title}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 font-semibold">
                      Tidak ada proyek dengan nama tersebut
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-4 md:gap-6 ml-auto">
            {/* Notification Bell: dropdown notifikasi real dari API, muncul di semua halaman */}
            <NotificationBell />

            {/* User Profile & Logout Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                className="flex items-center gap-2 md:gap-3 hover:bg-slate-50 p-1.5 rounded-xl transition-all"
              >
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg overflow-hidden border-2 border-slate-100 shadow-sm shrink-0">
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

        {/* CONTENT AREA (Responsif Padding antara Mobile & Desktop) */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#f8fafc]">
          {/* 🌟 Salurkan context dengan nama 'user' yang valid */}
          <Outlet context={{ user }} /> 
        </main>

      </div>
    </div>
  );
};

export default MainLayout;