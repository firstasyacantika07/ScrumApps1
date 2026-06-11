import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, RefreshCcw, CheckCircle2, 
  AlertCircle, ShieldAlert, ChevronRight, 
  Activity, ArrowRight, Clock, Package 
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../api/axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, hold: 0, progress: 0, done: 0, late: 0, total_users: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      const loggedInUser = localStorage.getItem('user');
      if (!loggedInUser) {
        navigate('/login');
        return;
      }

      try {
        const user = JSON.parse(loggedInUser);
        setUserData(user);

        setLoading(true);
        const roleLower = user.role?.toString().toLowerCase() || '';
        
        const statsEndpoint = (roleLower.includes('admin') || roleLower.includes('owner')) 
          ? '/dashboard/stats' 
          : '/projects/stats';
        
        const [statsRes, projectsRes] = await Promise.all([
          api.get(statsEndpoint).catch(() => ({ data: null })),
          api.get('/projects').catch(() => ({ data: [] }))
        ]);
        
        if (statsRes?.data) {
          setStats({
            total: Number(statsRes.data.total) || 0,
            hold: Number(statsRes.data.hold) || 0,
            progress: Number(statsRes.data.progress) || 0,
            done: Number(statsRes.data.done) || 0,
            late: Number(statsRes.data.late) || 0,
            total_users: Number(statsRes.data.total_users) || 0
          });
        }
        
        const projectList = projectsRes.data?.data || projectsRes.data || [];
        setRecentProjects(Array.isArray(projectList) ? projectList.slice(0, 3) : []); 

      } catch (error) {
        console.error("Dashboard Data Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [navigate]);

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
            Berikut ringkasan performa pengerjaan secara real-time.
          </p>
        </div>
        <div className="px-4 py-2 bg-slate-100 rounded-full text-slate-600 text-[10px] font-black uppercase tracking-wider self-start sm:self-auto border border-slate-200">
          Role Workspace: {userData.role}
        </div>
      </div>

      {isRole('superadmin') && <SuperAdminView stats={stats} recentProjects={recentProjects} navigate={navigate} />}
      {isRole('analyst') && <AnalystView stats={stats} recentProjects={recentProjects} navigate={navigate} />}
      {isRole('developer') && <DeveloperView stats={stats} recentProjects={recentProjects} navigate={navigate} />}
      {isRole('projectowner') && <ProjectOwnerView stats={stats} recentProjects={recentProjects} navigate={navigate} />}
    </div>
  );
};

const StatCardModern = ({ label, value, icon, color, isDashed }) => (
  <div className={`bg-white p-6 rounded-[2rem] flex items-center gap-5 transition-all shadow-sm border border-slate-50 ${isDashed ? 'border-2 border-dashed border-slate-100' : ''}`}>
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 flex-shrink-0" style={{ borderColor: color + '15', color: color, backgroundColor: color + '05' }}>
      {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
    </div>
    <div>
      <div className="text-3xl font-black text-slate-800 leading-none">{value ?? 0}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wider leading-none">{label}</div>
    </div>
  </div>
);

const getCleanStats = (stats, recentProjects) => {
  const safeStats = {
    total: stats?.total ?? 0,
    hold: stats?.hold ?? 0,
    progress: stats?.progress ?? 0,
    done: stats?.done ?? 0,
    late: stats?.late ?? 0,
  };

  const calculated = (recentProjects || []).reduce((acc, item) => {
    const s = (item.status || '').toLowerCase();
    acc.total += 1;
    if (s === 'hold') acc.hold += 1;
    else if (['progress', 'in progress', 'on_progress'].includes(s)) acc.progress += 1;
    else if (['done', 'completed'].includes(s)) acc.done += 1;
    else if (['late', 'overdue'].includes(s)) acc.late += 1;
    return acc;
  }, { total: 0, hold: 0, progress: 0, done: 0, late: 0 });

  return {
    total: safeStats.total || calculated.total,
    hold: safeStats.hold || calculated.hold,
    progress: safeStats.progress || calculated.progress,
    done: safeStats.done || calculated.done,
    late: safeStats.late || calculated.late,
  };
};

const SuperAdminView = ({ stats, recentProjects, navigate }) => {
  const finalStats = getCleanStats(stats, recentProjects);
  const chartData = [
    { name: 'Hold', value: finalStats.hold, color: '#3b82f6' },
    { name: 'Progress', value: finalStats.progress, color: '#f59e0b' },
    { name: 'Done', value: finalStats.done, color: '#22c55e' },
    { name: 'Late', value: finalStats.late, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCardModern label="Total Unit" value={finalStats.total} icon={<Activity />} color="#ee1e2d" isDashed />
        <StatCardModern label="Hold" value={finalStats.hold} icon={<FolderOpen />} color="#3b82f6" isDashed />
        <StatCardModern label="Progress" value={finalStats.progress} icon={<RefreshCcw />} color="#f59e0b" isDashed />
        <StatCardModern label="Done" value={finalStats.done} icon={<CheckCircle2 />} color="#22c55e" isDashed />
        <StatCardModern label="Late" value={finalStats.late} icon={<AlertCircle />} color="#ef4444" isDashed />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[500px] flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[3px] border-l-4 border-slate-200 pl-4 mb-8">Statistik Proyek</h3>
          <div className="flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={100} outerRadius={135} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                  {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-800">{finalStats.total}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Unit<br/>Pengerjaan</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-black uppercase tracking-[2px] text-slate-800">Proyek Terbaru</h4>
              <button onClick={() => navigate('/projects')} className="text-[#ee1e2d] hover:bg-red-50 p-2 rounded-lg transition-colors"><ArrowRight size={18} /></button>
            </div>
            <div className="space-y-4">
              {recentProjects.map((p, i) => (
                <div key={i} onClick={() => navigate(`/projects/${p.id}`)} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#ee1e2d] font-bold border border-slate-100 group-hover:bg-[#ee1e2d] group-hover:text-white transition-all">
                      {p.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 truncate">{p.name || 'Proyek'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mt-1"><Clock size={10} /> {p.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#ee1e2d] p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-110 transition-transform"></div>
            <p className="text-[9px] font-black uppercase tracking-[2px] opacity-70 mb-2">Layanan Kami</p>
            <h3 className="text-xl font-black leading-tight mb-6">Paket SaaS &<br />Pricing Plan</h3>
            <button onClick={() => navigate('/billing')} className="flex items-center gap-2 px-5 py-3 bg-white text-[#ee1e2d] rounded-xl text-[9px] font-black uppercase tracking-widest hover:shadow-lg transition-all">
              Lihat Harga <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalystView = ({ stats, recentProjects, navigate }) => {
  const finalStats = getCleanStats(stats, recentProjects);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardModern label="Hold" value={finalStats.hold} icon={<FolderOpen />} color="#3b82f6" />
        <StatCardModern label="Progress" value={finalStats.progress} icon={<RefreshCcw />} color="#f59e0b" />
        <StatCardModern label="Done" value={finalStats.done} icon={<CheckCircle2 />} color="#22c55e" />
        <StatCardModern label="Late" value={finalStats.late} icon={<AlertCircle />} color="#ef4444" />
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[2px] border-l-4 border-blue-500 pl-4">Analisis Proyek</h3>
          <button onClick={() => navigate('/projects')} className="text-xs font-black text-blue-600 uppercase tracking-wider">Lihat Semua</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentProjects.map((p) => (
            <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="p-6 rounded-[2rem] bg-slate-50 hover:bg-white border border-slate-100 transition-all cursor-pointer group">
              <p className="font-black text-slate-800 text-sm mt-3">{p.name}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 text-[10px] font-bold text-slate-400">
                <span>ID: #{p.id}</span>
                <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DeveloperView = ({ stats, recentProjects, navigate }) => {
  const finalStats = getCleanStats(stats, recentProjects);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardModern label="Tugas Hold" value={finalStats.hold} icon={<FolderOpen />} color="#3b82f6" />
        <StatCardModern label="Sedang Dikerjakan" value={finalStats.progress} icon={<RefreshCcw />} color="#f59e0b" />
        <StatCardModern label="Selesai" value={finalStats.done} icon={<CheckCircle2 />} color="#22c55e" />
        <StatCardModern label="Overdue" value={finalStats.late} icon={<AlertCircle />} color="#ef4444" />
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[2px] border-l-4 border-amber-500 pl-4 mb-6">Antrean Tugas Developer</h3>
        <div className="space-y-3">
          {recentProjects.map((p) => (
            <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 cursor-pointer transition-all gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black border border-amber-100">{p.name?.charAt(0).toUpperCase()}</div>
                <div>
                  <p className="font-black text-slate-800 text-sm">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Status: {p.status}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProjectOwnerView = ({ stats, recentProjects, navigate }) => {
  const finalStats = getCleanStats(stats, recentProjects);
  const pieData = [
    { name: 'Hold', value: finalStats.hold, color: '#3b82f6' },
    { name: 'Progress', value: finalStats.progress, color: '#f59e0b' },
    { name: 'Done', value: finalStats.done, color: '#22c55e' },
    { name: 'Late', value: finalStats.late, color: '#ef4444' },
  ].filter(i => i.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem]">
          <ShieldAlert className="text-amber-600 mb-2" size={20} />
          <h4 className="text-xs font-black text-amber-800 uppercase">Mode Pemantauan Aktif</h4>
          <p className="text-[11px] font-bold text-amber-600 mt-1">Sebagai Project Owner, Anda memiliki akses penuh untuk meninjau diagram metrik.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCardModern label="Total Proyek" value={finalStats.total} icon={<Package />} color="#ee1e2d" />
          <StatCardModern label="In Progress" value={finalStats.progress} icon={<RefreshCcw />} color="#f59e0b" />
          <StatCardModern label="Selesai" value={finalStats.done} icon={<CheckCircle2 />} color="#22c55e" />
          <StatCardModern label="Tertahan" value={finalStats.hold} icon={<FolderOpen />} color="#3b82f6" />
        </div>
      </div>
      <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[2px] border-l-4 border-red-500 pl-4 mb-4">Grafik Komposisi Progress</h3>
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8">
          <div className="w-full sm:w-1/2 h-[260px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={75} outerRadius={100} paddingAngle={6} stroke="none" cornerRadius={6}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800">{finalStats.total}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
            </div>
          </div>
          <div className="w-full sm:w-1/2 space-y-2">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{item.name}</span>
                </div>
                <span className="text-xs font-black text-slate-800">{item.value} Unit</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;