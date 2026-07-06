import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, RefreshCcw, CheckCircle2, 
  AlertCircle, ShieldAlert, ChevronRight, 
  Activity, ArrowRight, Clock, Package,
  Users, Layers, CreditCard, Building, Plus, GitBranch, Play,
  Briefcase
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../api/axios';

const Dashboard = () => {
  const navigate = useNavigate();
  
  // 🌟 PERBAIKAN 1: Ambil data user langsung saat inisialisasi state agar tidak memicu re-render loop
  const [userData, setUserData] = useState(() => {
    const loggedInUser = localStorage.getItem('user');
    return loggedInUser ? JSON.parse(loggedInUser) : null;
  });
  
  const [loading, setLoading] = useState(true);
  
  // State manajemen data multi-role berbasis real database
  const [saasStats, setSaasStats] = useState({ total_revenue: 0, total_companies: 0, free_tier: 0, pro_tier: 0, enterprise_tier: 0 });
  const [workspaceStats, setWorkspaceStats] = useState({ active_package: 'FREE', remaining_days: 0, project_used: 0, project_limit: 0, team_used: 0, team_limit: 0 });
  const [scrumStats, setScrumStats] = useState({ total_backlogs: 0, hold: 0, progress: 0, done: 0, late: 0, current_sprint: null });
  const [recentData, setRecentData] = useState([]);

  useEffect(() => {
    // Jika tidak ada user di local storage, langsung tendang ke login
    if (!userData) {
      navigate('/login');
      return;
    }

    let isMounted = true; 

    const fetchInitialData = async () => {
      try {
        if (isMounted) setLoading(true);
        
        const roleLower = userData.role?.toString().toLowerCase().replace(/_/g, '') || '';

        // ======================================================
        // 👑 1. ROLE AKSES: SUPERADMIN (Global Platform Data)
        // ======================================================
        if (roleLower.includes('superadmin')) {
          const [saasRes, companyRes] = await Promise.all([
            api.get('/superadmin/dashboard/stats').catch(err => {
              console.warn("Superadmin stats error:", err.message);
              return { data: { data: {} } };
            }),
            api.get('/superadmin/companies/recent').catch(err => {
              console.warn("Superadmin companies error:", err.message);
              return { data: { data: [] } };
            })
          ]);

          if (isMounted) {
            const stats = saasRes.data?.data || {};
            setSaasStats({
              total_revenue: stats.totalRevenue || 0,
              total_companies: stats.totalCompanies || 0,
              free_tier: stats.freeTier || 0,
              pro_tier: stats.proTier || 0,
              enterprise_tier: stats.enterpriseTier || 0
            });
            setRecentData(companyRes.data?.data || companyRes.data || []);
          }

        // ======================================================
        // 🏢 2. ROLE AKSES: ADMIN WORKSPACE (Company Billing & Projects)
        // ======================================================
        } else if (roleLower.includes('admin')) {
          const [billingRes, projectRes] = await Promise.all([
            api.get('/billing/status').catch(err => {
              console.warn("Billing status error:", err.message);
              return { data: { data: {} } };
            }),
            api.get('/projects').catch(err => {
              console.warn("Projects error:", err.message);
              return { data: { data: [] } };
            })
          ]);

          if (isMounted) {
            const billing = billingRes.data?.data || {};
            setWorkspaceStats({
              active_package: billing.package_type || 'FREE',
              remaining_days: billing.remaining_days || 0,
              project_used: billing.project_used || 0,
              project_limit: billing.project_limit || 0,
              team_used: billing.team_used || 0,
              team_limit: billing.team_limit || 0
            });
            setRecentData(projectRes.data?.data || projectRes.data || []);
          }

        // ======================================================
        // 👥 3. ROLE AKSES: PROJECT OWNER, ANALYST, DEVELOPER (Scrum Core)
        // ======================================================
        } else {
          const [scrumStatsRes, taskRes] = await Promise.all([
            api.get('/projects/workspace/scrum/stats').catch(err => {
              console.warn("Scrum stats route handled safe:", err.message);
              return { data: { data: { total_backlogs: 0, hold: 0, progress: 0, done: 0, late: 0, current_sprint: null } } };
            }),
            api.get('/projects').catch(err => {
              console.warn("Projects data error:", err.message);
              return { data: { data: [] } };
            })
          ]);

          if (isMounted) {
            const scrum = scrumStatsRes.data?.data || {};
            setScrumStats({
              total_backlogs: scrum.total_backlogs || 0,
              hold: scrum.hold || 0,
              progress: scrum.progress || 0,
              done: scrum.done || 0,
              late: scrum.late || 0,
              current_sprint: scrum.current_sprint || null
            });
            setRecentData(taskRes.data?.data || taskRes.data || []);
          }
        }

      } catch (error) {
        console.error("Dashboard SaaS Fatal Data Fetch Error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false; 
    };
    // 🌟 PERBAIKAN 2: Kunci dependency array agar mengeksekusi fetch data hanya satu kali pas mount
  }, [navigate, userData]);

  if (!userData || loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-[#ee1e2d] rounded-full animate-spin"></div>
    </div>
  );

  const isRole = (target) => {
    const currentRole = userData.role?.toString().toLowerCase().replace(/_/g, '') || '';
    return currentRole.includes(target.toLowerCase().replace(/_/g, ''));
  };

  return (
    <div className="p-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            Halo, {userData.name || userData.username || 'User'}! 👋
          </h2>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-[3px]">
            Sistem Manajemen Scrum & Platform SaaS Terintegrasi
          </p>
        </div>
        <div className="px-4 py-2 bg-slate-100 rounded-full text-slate-600 text-[10px] font-black uppercase tracking-wider self-start sm:self-auto border border-slate-200">
          Role Akses: {userData.role}
        </div>
      </div>

      {/* 🛠️ FIX BUG #1: sebelumnya pakai beberapa && berurutan, sehingga role
          "superadmin" ikut ter-match oleh isRole('admin') (substring 'admin'
          ada di dalam 'superadmin') dan 2 dashboard tampil bersamaan.
          Sekarang pakai if-else chain agar hanya SATU view yang pernah dirender,
          urutan dari yang paling spesifik ke paling umum. */}
      {isRole('superadmin') ? (
        <SuperAdminView saasStats={saasStats} recentCompanies={recentData} navigate={navigate} />
      ) : isRole('projectowner') ? (
        <ProjectOwnerView scrumStats={scrumStats} recentProjects={recentData} navigate={navigate} />
      ) : isRole('admin') ? (
        <AdminWorkspaceView workspaceStats={workspaceStats} recentProjects={recentData} navigate={navigate} />
      ) : isRole('analyst') ? (
        <BusinessAnalystView scrumStats={scrumStats} recentProjects={recentData} navigate={navigate} />
      ) : isRole('developer') ? (
        <DeveloperView scrumStats={scrumStats} recentProjects={recentData} navigate={navigate} />
      ) : (
        <div className="text-center py-20 text-xs font-bold text-slate-400 uppercase tracking-wider">
          Role akun Anda belum memiliki tampilan dashboard.
        </div>
      )}
    </div>
  );
};

const StatCardModern = ({ label, value, icon, color, isDashed }) => (
  <div className={`bg-white p-6 rounded-[2rem] flex items-center gap-5 transition-all shadow-sm border border-slate-50 ${isDashed ? 'border-2 border-dashed border-slate-100' : ''}`}>
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 flex-shrink-0" style={{ borderColor: color + '15', color: color, backgroundColor: color + '05' }}>
      {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
    </div>
    <div>
      <div className="text-3xl font-black text-slate-800 leading-none">{value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wider leading-none">{label}</div>
    </div>
  </div>
);

/* ==========================================================================
   1. SUPER ADMIN VIEW
   ========================================================================== */
const SuperAdminView = ({ saasStats, recentCompanies, navigate }) => {
  const chartData = [
    { name: 'Free', value: saasStats.free_tier, color: '#3b82f6' },
    { name: 'Pro', value: saasStats.pro_tier, color: '#f59e0b' },
    { name: 'Enterprise', value: saasStats.enterprise_tier, color: '#ee1e2d' },
  ].filter(i => i.value > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardModern label="Total Pendapatan" value={`Rp ${(saasStats.total_revenue / 1000000).toFixed(1)}M`} icon={<CreditCard />} color="#ee1e2d" isDashed />
        <StatCardModern label="Total PT Terdaftar" value={saasStats.total_companies} icon={<Building />} color="#3b82f6" isDashed />
        <StatCardModern label="Paket Pro Aktif" value={saasStats.pro_tier} icon={<Layers />} color="#f59e0b" isDashed />
        <StatCardModern label="Paket Enterprise" value={saasStats.enterprise_tier} icon={<Activity />} color="#22c55e" isDashed />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[450px] flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[3px] border-l-4 border-slate-200 pl-4 mb-8">Rasio Pengguna Paket SaaS</h3>
          <div className="flex-1 flex items-center justify-center relative">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={90} outerRadius={120} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                    {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-300 text-xs font-bold uppercase tracking-wider">Belum Ada Data Paket</div>
            )}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-800">{saasStats.total_companies}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Total Perusahaan</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-black uppercase tracking-[2px] text-slate-800">Registrasi Perusahaan Baru</h4>
              <button onClick={() => navigate('/superadmin/companies')} className="text-[#ee1e2d] p-2 rounded-lg"><ArrowRight size={18} /></button>
            </div>
            <div className="space-y-4">
              {recentCompanies.length > 0 ? recentCompanies.slice(0, 3).map((c, i) => (
                <div key={i} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center text-[#ee1e2d] font-bold">PT</div>
                    <div>
                      <p className="text-xs font-black text-slate-800">{c.company_name || c.name || 'Workspace'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{c.package_type || 'FREE'}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              )) : (
                <div className="text-center py-8 text-xs font-bold text-slate-400 uppercase tracking-wide">Belum ada tenant baru</div>
              )}
            </div>
          </div>
          <div className="p-6 bg-slate-900 rounded-[2rem] text-white mt-6">
            <h4 className="text-xs font-black tracking-wider uppercase mb-1">Global System Logs</h4>
            <p className="text-[10px] text-slate-400">Server Status: <span className="text-green-400 font-bold">Healthy (100%)</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   2. ADMIN WORKSPACE VIEW
   ========================================================================== */
const AdminWorkspaceView = ({ workspaceStats, recentProjects, navigate }) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kuota Pembuatan Proyek</span>
            <Layers size={18} className="text-[#f59e0b]" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800 mb-2">
              {workspaceStats.project_used} / {workspaceStats.project_limit || '∞'}
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-[#f59e0b] h-full" style={{ width: `${workspaceStats.project_limit ? (workspaceStats.project_used / workspaceStats.project_limit) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Anggota Tim Internal</span>
            <Users size={18} className="text-[#3b82f6]" />
          </div>
          <div>
            <div className="text-3xl font-black text-slate-800 mb-2">
              {workspaceStats.team_used} / {workspaceStats.team_limit || '∞'}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Alokasi Anggota Terdaftar</p>
          </div>
        </div>

        <div className="p-6 rounded-[2rem] text-white flex flex-col justify-between bg-gradient-to-br from-red-500 to-[#ee1e2d] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[2px] bg-black/20 px-2.5 py-1 rounded-full border border-white/10">Paket {workspaceStats.active_package}</span>
            <Clock size={18} className="opacity-80" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black leading-tight">Sisa {workspaceStats.remaining_days} Hari Lagi</div>
            <button onClick={() => navigate('/billing')} className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-white text-[#ee1e2d] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
              Upgrade / Perbarui Paket <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Kelola Ruang Proyek Workspace</h3>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">Pantau rincian pengerjaan tim Anda.</p>
          </div>
          <button onClick={() => navigate('/projects/create')} className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black transition-all hover:bg-slate-800 shadow-sm">
            Buat Proyek Baru <Plus size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentProjects.length > 0 ? recentProjects.map((p) => (
            <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="p-5 rounded-2xl border bg-slate-50/50 hover:bg-white transition-all cursor-pointer group">
              <p className="font-black text-slate-800 text-sm">{p.name || p.project_name}</p>
              <div className="flex items-center justify-between mt-6 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-400">
                <span className="uppercase tracking-wider flex items-center gap-1"><Activity size={12} /> {p.status || 'Active'}</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12 text-xs font-bold text-slate-400 uppercase tracking-wider">Belum ada proyek dibuat di ruang kerja ini</div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   3. PROJECT OWNER VIEW
   ========================================================================== */
const ProjectOwnerView = ({ scrumStats, recentProjects, navigate }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem]">
          <ShieldAlert className="text-amber-600 mb-2" size={20} />
          <h4 className="text-xs font-black text-amber-800 uppercase">Mode Pemantauan Aktif (Read-Only)</h4>
          <p className="text-[11px] font-bold text-amber-600 mt-1">Anda memiliki hak akses penuh untuk meninjau diagram metrik tim, struktur backlog, serta visualisasi Kanban.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCardModern label="Jumlah Project" value={recentProjects.length} icon={<Briefcase />} color="#6366f1" />
          <StatCardModern label="Project Hold / Baru" value={scrumStats.hold} icon={<FolderOpen />} color="#3b82f6" />
          <StatCardModern label="Project Proses" value={scrumStats.progress} icon={<RefreshCcw />} color="#f59e0b" />
          <StatCardModern label="Project Selesai" value={scrumStats.done} icon={<CheckCircle2 />} color="#22c55e" />
          <StatCardModern label="Project Terlambat" value={scrumStats.late} icon={<AlertCircle />} color="#ef4444" />
        </div>
        <button onClick={() => navigate('/backlog')} className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 text-slate-800 rounded-2xl text-xs font-black shadow-sm hover:bg-slate-50 transition-all">
          Ekspor Dokumentasi Backlog (PDF) <ArrowRight size={16} />
        </button>
      </div>

      <div className="lg:col-span-4 bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[2px] border-l-4 border-[#ee1e2d] pl-4">Status Distribusi Kerja Proyek</h3>
        <div className="w-full h-[180px]">
          {recentProjects.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Hold', qty: scrumStats.hold },
                { name: 'In Progress', qty: scrumStats.progress },
                { name: 'Done', qty: scrumStats.done },
                { name: 'Overdue', qty: scrumStats.late },
              ]} margin={{ top: 5, right: 10, left: -20, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tick={{ fontSize: 9 }} tickMargin={8} />
                <YAxis stroke="#94a3b8" fontSize={9} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="qty" name="Jumlah Project" fill="#ee1e2d" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-wider">Tidak ada data project aktif</div>
          )}
        </div>
        <div className="p-3 bg-slate-50 rounded-2xl flex flex-col gap-2 text-[10px] font-bold text-slate-500">
          <span>Sprint Aktif dikelola oleh Business Analyst.</span>
          <button onClick={() => navigate('/projects')} className="text-[#ee1e2d] font-black uppercase tracking-wider flex items-center gap-1">Pantau Kanban Board <ChevronRight size={12} /></button>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   4. BUSINESS ANALYST VIEW
   ========================================================================== */
const BusinessAnalystView = ({ scrumStats, recentProjects, navigate }) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCardModern label="Jumlah Project" value={recentProjects.length} icon={<Briefcase />} color="#6366f1" />
        <StatCardModern label="Project Hold / Baru" value={scrumStats.hold} icon={<FolderOpen />} color="#3b82f6" />
        <StatCardModern label="Project Proses" value={scrumStats.progress} icon={<RefreshCcw />} color="#f59e0b" />
        <StatCardModern label="Project Selesai" value={scrumStats.done} icon={<CheckCircle2 />} color="#22c55e" />
        <StatCardModern label="Project Terlambat" value={scrumStats.late} icon={<AlertCircle />} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[2px] border-l-4 border-blue-600 pl-4">Manajemen Siklus Kerja</h3>
            <button onClick={() => navigate('/backlog')} className="text-xs font-black text-[#ee1e2d] uppercase tracking-wider flex items-center gap-1"><Plus size={14}/> Tambah Backlog</button>
          </div>

          {scrumStats.current_sprint ? (
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="text-[9px] font-black bg-blue-100 text-blue-700 w-fit px-2.5 py-1 rounded-full uppercase tracking-wider">Sprint Sedang Berjalan</div>
                <h4 className="font-black text-slate-800 text-base mt-3">{scrumStats.current_sprint.name}</h4>
                <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1"><Clock size={12}/> Berakhir tanggal: {scrumStats.current_sprint.end_date}</p>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => navigate(`/projects/${scrumStats.current_sprint.project_id || ''}`)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors">Tutup Sprint (End Sprint)</button>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[180px]">
              <Play className="text-slate-300 mb-2" size={24} />
              <p className="text-xs font-black text-slate-600">Tidak ada Sprint yang aktif</p>
              <button onClick={() => navigate('/projects')} className="mt-4 px-5 py-2.5 bg-[#ee1e2d] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Buat & Mulai Sprint Baru</button>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[2px] mb-4">Aksi Cepat Eksekusi BA</h3>
            <div className="space-y-3">
              <div onClick={() => navigate('/backlog')} className="p-4 rounded-xl border bg-slate-50 hover:bg-white transition-all cursor-pointer text-xs font-black text-slate-700 flex items-center justify-between">
                <span>Susun Prioritas Backlog (Drag-Drop)</span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
              <div
                onClick={() => {
                  // 🛠️ FIX: '/vision' bukan route yang ada — Vision Board bersarang
                  // per-project di ProjectDetail (/projects/:id/vision-board).
                  // Arahkan ke project terbaru milik BA; kalau belum ada project sama sekali,
                  // arahkan ke daftar project (pola sama seperti tombol "Buat & Mulai Sprint Baru").
                  if (recentProjects.length > 0) {
                    navigate(`/projects/${recentProjects[0].id}/vision-board`);
                  } else {
                    navigate('/projects');
                  }
                }}
                className="p-4 rounded-xl border bg-slate-50 hover:bg-white transition-all cursor-pointer text-xs font-black text-slate-700 flex items-center justify-between"
              >
                <span>Input & Perbarui Visi Proyek (Vision Board)</span>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/backlog')} className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors mt-6">
            Cetak Dokumen Spesifikasi PDF
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   5. TEAM DEVELOPER VIEW
   ========================================================================== */
const DeveloperView = ({ scrumStats, recentProjects, navigate }) => {
  // 🆕 State untuk fitur "Kirim Reminder Manual" ke akun PO tertentu.
  const [poList, setPoList] = useState([]);
  const [loadingPoList, setLoadingPoList] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    let isMounted = true;
    const fetchPoList = async () => {
      try {
        setLoadingPoList(true);
        const res = await api.get('/users');
        const data = res.data?.data || res.data || [];
        // 🔧 FIX: sebelumnya cuma .replace(/_/g, '') yang hanya membuang
        // underscore, PADAHAL role di DB kemungkinan tersimpan dengan spasi
        // (mis. "Project Owner"), jadi hasil normalisasi masih "project owner"
        // (dengan spasi) dan TIDAK PERNAH sama dengan target "projectowner".
        // Akibatnya PO asli ikut gagal ke-filter/ter-lock dengan benar.
        // Sekarang buang semua karakter non-huruf (spasi, underscore, strip,
        // dll) sekaligus, supaya "Project Owner", "project_owner", dan
        // "ProjectOwner" semuanya ternormalisasi jadi "projectowner".
        const normalizeRole = (r) => String(r || '').toLowerCase().replace(/[^a-z]/g, '');
        // 🆕 Hanya tampilkan akun dengan role Product Owner di dropdown ini.
        const owners = (Array.isArray(data) ? data : []).filter(
          (u) => normalizeRole(u.role) === 'projectowner'
        );
        if (isMounted) setPoList(owners);
      } catch (err) {
        console.warn('Gagal memuat daftar PO untuk reminder:', err.message);
      } finally {
        if (isMounted) setLoadingPoList(false);
      }
    };
    fetchPoList();
    return () => { isMounted = false; };
  }, []);

  const handleSendReminder = async () => {
    if (!selectedPoId) return;
    try {
      setSendingReminder(true);
      setReminderResult(null);
      const res = await api.post('/notifications/trigger-sprint-check', { userId: Number(selectedPoId) });
      setReminderResult({ type: 'success', text: res.data?.message || 'Reminder terkirim.' });
    } catch (err) {
      setReminderResult({ type: 'error', text: err.response?.data?.message || 'Gagal mengirim reminder.' });
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCardModern label="Jumlah Project" value={recentProjects.length} icon={<Briefcase />} color="#6366f1" />
        <StatCardModern label="Tugas Hold" value={scrumStats.hold} icon={<FolderOpen />} color="#3b82f6" />
        <StatCardModern label="Sedang Dikerjakan" value={scrumStats.progress} icon={<RefreshCcw />} color="#f59e0b" />
        <StatCardModern label="Selesai (Done)" value={scrumStats.done} icon={<CheckCircle2 />} color="#22c55e" />
        <StatCardModern label="Overdue" value={scrumStats.late} icon={<AlertCircle />} color="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[2px] border-l-4 border-amber-500 pl-4">Antrean Tugas Sprint Aktif</h3>
            <button onClick={() => navigate('/kanban')} className="text-xs font-black text-[#ee1e2d] uppercase tracking-wider flex items-center gap-1">Buka Kanban Board <ArrowRight size={14}/></button>
          </div>
          <div className="space-y-3">
            {recentProjects.length > 0 ? recentProjects.slice(0, 5).map((p) => (
              <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 cursor-pointer transition-all gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black border border-amber-100">
                    {(p.name || p.title || 'T').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{p.name || p.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Status: {p.status || 'BACKLOG'}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            )) : (
              <div className="text-center py-12 text-xs font-bold text-slate-400 uppercase tracking-wider">Tidak ada antrean tugas sprint untuk akun Anda</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 mb-4">
                <GitBranch className="text-slate-900" size={20} />
                <h4 className="text-xs font-black uppercase tracking-[1px]">Integrasi GitHub Feed</h4>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mb-6">Aktivitas repository terhubung otomatis berdasarkan Webhook yang aktif.</p>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] opacity-60">
                  <p className="font-black text-slate-700">Terhubung ke repository</p>
                  <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Status: Aktif Mendengarkan</p>
                </div>
              </div>
            </div>
            {/* ✅ FIX: Arahkan ke halaman GitHub Integrations yang sudah ada */}
            <button onClick={() => navigate('/github-integrations')} className="w-full mt-6 py-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-700 tracking-wider hover:bg-slate-50 transition-colors">
              Konfigurasi Webhook Repository
            </button>
          </div>

          {/* 🆕 KIRIM REMINDER MANUAL KE PO */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Clock className="text-slate-900" size={20} />
              <h4 className="text-xs font-black uppercase tracking-[1px]">Kirim Reminder Sprint Manual</h4>
            </div>
            <p className="text-[11px] font-bold text-slate-400 -mt-2">Pilih akun Product Owner untuk dikirimi email pengingat sprint secara manual.</p>

            <select
              value={selectedPoId}
              onChange={(e) => { setSelectedPoId(e.target.value); setReminderResult(null); }}
              disabled={loadingPoList}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="" disabled>
                {loadingPoList ? 'Memuat akun PO...' : 'Pilih Akun PO'}
              </option>
              {poList.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.name} {po.email ? `(${po.email})` : ''}
                </option>
              ))}
            </select>
            {!loadingPoList && poList.length === 0 && (
              <p className="text-[10px] text-amber-600 font-bold">Belum ada akun dengan role Product Owner.</p>
            )}

            <button
              onClick={handleSendReminder}
              disabled={!selectedPoId || sendingReminder}
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sendingReminder ? 'Mengirim...' : 'Kirim Reminder'}
            </button>

            {reminderResult && (
              <p className={`text-[10px] font-bold ${reminderResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {reminderResult.text}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;