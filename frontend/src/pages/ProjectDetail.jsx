import React, { useState, useEffect, useCallback, useRef } from 'react'; // 🛠️ Tambahkan useRef
import { Routes, Route, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Briefcase, Plus, RefreshCw, Target, ChevronLeft, 
  Clock, Users, X, Database, Activity, 
  Calendar as CalendarIcon, ShieldAlert, User, AlertCircle
} from 'lucide-react';
import api from '../api/axios'; 

// Import komponen detail lainnya
import VisionBoard from '../components/project/VisionBoard';
import Backlog from '../components/project/Backlog';
import Sprint from '../components/project/Sprint';
import Development from '../components/project/Kanban';
import Members from '../components/project/Members';
import ProjectCalendar from '../components/project/ProjectCalendar';
import GitHubStatusCard from '../components/github/GitHubStatusCard';
import GitHubFeed from '../components/github/GitHubFeed';

// ==========================================
// INTERNAL COMPONENT: ACTIVITY LOGS
// ==========================================
const ActivityLogsInline = ({ projectId, currentRole }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/projects/${projectId}/logs`);
      setLogs(res.data || []);
    } catch (err) {
      console.error("Gagal memuat log aktivitas:", err);
      setError(err.response?.data?.error || "Gagal memuat log aktivitas sistem.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchLogs();
  }, [projectId, fetchLogs]);

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <RefreshCw size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-bold uppercase tracking-wider">Memuat Log Aktivitas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center p-4">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 mb-4">
          <AlertCircle size={24} />
        </div>
        <h4 className="text-sm font-black text-slate-800 mb-1">Gagal Memuat Data</h4>
        <p className="text-xs text-slate-400 max-w-xs mb-4">{error}</p>
        <button onClick={fetchLogs} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all">Coba Lagi</button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
          <Clock size={28} />
        </div>
        <h4 className="text-base font-black text-slate-700 mb-1">Belum Ada Aktivitas</h4>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] max-w-xs leading-relaxed">Semua rekaman perubahan akan muncul di sini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">Activity Log</h3>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Jejak audit pengerjaan proyek terbaru</p>
        </div>
        <button onClick={fetchLogs} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-all active:scale-95" title="Refresh Log"><RefreshCw size={14} /></button>
      </div>

      <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
        {logs.map((log) => (
          <div key={log.id} className="relative group">
            <div className="absolute -left-[31px] top-1 w-4 h-4 bg-white border-2 border-blue-600 rounded-full group-hover:bg-blue-600 transition-all duration-300 shadow-sm" />
            <div className="bg-white group-hover:bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all duration-300">
              <p className="text-sm font-medium text-slate-700 leading-relaxed">{log.activity}</p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-bold mt-2 pt-2 border-t border-dashed border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md">
                  <User size={12} className="text-slate-400" />
                  <span className="uppercase tracking-wider">{log.user_name || 'System / Guest'}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-slate-300" />
                  <span>{formatDateTime(log.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT: PROJECT DETAIL
// ==========================================
const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const visionBoardRef = useRef(null);

  const [project, setProject] = useState(null);
  const [integrationData, setIntegrationData] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState({ id: null, role: 'GUEST' });

  const isProjectOwner = currentUser.role === 'PROJECTOWNER';

  const getModalType = () => {
    if (location.pathname.includes('backlog')) return 'Backlog';
    if (location.pathname.includes('vision-board')) return 'Vision Board';
    return 'Data';
  };

  // Fungsi pengecekan akses diperbarui
  const hasWriteAccess = useCallback(() => {
    const role = currentUser.role;
    if (role === 'SUPERADMIN' || role === 'ADMIN') return true;
    
    // BA (ANALYST) diizinkan edit di modul tertentu
    if (role === 'ANALYST' || role === 'BUSINESSANALYST') {
      return ['vision-board', 'backlog'].some(path => location.pathname.includes(path));
    }
    
    // TEAMDEVELOPER atau DEVELOPER diizinkan edit development dll
    if (role === 'TEAMDEVELOPER' || role === 'DEVELOPER') return true;
    
    // ProjectOwner biasanya hanya baca/pantau
    return false;
  }, [currentUser.role, location.pathname]);

  const loadUserProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      const user = res.data?.user || res.data || {};
      setCurrentUser({
        id: user.id,
        role: (user.role || 'GUEST').toUpperCase().replace(/\s+/g, '')
      });
    } catch (err) {
      console.error("Gagal memuat identitas user:", err);
    }
  };

  const fetchGitHubStatus = useCallback(async () => {
    try {
      const res = await api.get(`/projects/${id}/github-status`);
      setIntegrationData(res.data || null);
    } catch (err) {
      setIntegrationData(null); 
    }
  }, [id]);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
    } catch (err) {
      setError("Gagal memuat data proyek.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      Promise.all([loadUserProfile(), fetchProject(), fetchGitHubStatus()]);
    }
  }, [id, fetchProject, fetchGitHubStatus]);

  const handleAddButtonClick = () => {
    if (location.pathname.includes('vision-board')) {
      visionBoardRef.current?.openNewBoardModal();
    } else if (hasWriteAccess()) {
      setFormData({ title: '', description: '' }); 
      setShowAddModal(true);
    } else {
      alert("Anda tidak memiliki izin untuk menambah data di sini.");
    }
  };

  const handleSave = async () => {
    if (!hasWriteAccess()) {
      alert("Akses Ditolak: Anda tidak memiliki otoritas untuk menyimpan perubahan.");
      return;
    }

    try {
      setIsSubmitting(true);
      // Sesuaikan endpoint berdasarkan jalur (path) yang aktif
      const path = location.pathname;
      let endpoint = '';
      if (path.includes('backlog')) endpoint = `/projects/${id}/backlogs`;
      else if (path.includes('vision-board')) endpoint = `/projects/${id}/vision-boards`;

      if (endpoint) {
        await api.post(endpoint, { ...formData, name: formData.title });
        setShowAddModal(false);
        setFormData({ title: '', description: '' });
        fetchProject();
      }
    } catch (err) {
      alert("Gagal menyimpan: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  if (error) return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="text-red-500 font-bold mb-2">Error Occurred</div>
      <p className="text-sm text-slate-500 mb-4">{error}</p>
      <button onClick={() => navigate('/projects')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"> Kembali ke Proyek</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col gap-6 animate-in fade-in duration-500">
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/projects')} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{project?.name}</h2>
              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-black rounded-md uppercase border border-green-100">{project?.status}</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-md uppercase border border-blue-100">Role: {currentUser.role}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Mulai: {project?.start_date ? new Date(project.start_date).toLocaleDateString('id-ID') : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['backlog', 'vision-board'].some(p => location.pathname.includes(p)) ? (
            hasWriteAccess() ? (
              <button onClick={handleAddButtonClick}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
                <Plus size={18} strokeWidth={3} /> TAMBAH {getModalType().toUpperCase()}
              </button>
            ) : (
              isProjectOwner && (
                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-xl text-xs font-bold">
                  <ShieldAlert size={16} /> Mode Pantau (Read-Only)
                </div>
              )
            )
          ) : (
            isProjectOwner && ['sprint', 'development', 'members'].some(p => location.pathname.includes(p)) && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-xl text-xs font-bold">
                <ShieldAlert size={16} /> Mode Pantau (Read-Only)
              </div>
            )
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        {/* SIDEBAR */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-2">
          <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-1 sticky top-8">
            <SideLink to="members" icon={<Users size={18}/>} label="Members" /> 
            <SideLink to="" icon={<Briefcase size={18}/>} label="Overview" end={true} />
            <SideLink to="calendar" icon={<CalendarIcon size={18}/>} label="Calendar" />
            <SideLink to="vision-board" icon={<Target size={18}/>} label="Vision Board" />
            <SideLink to="backlog" icon={<Database size={18}/>} label="Backlog" />
            <SideLink to="sprint" icon={<RefreshCw size={18}/>} label="Sprint" />
            <SideLink to="development" icon={<Activity size={18}/>} label="Development" />
            <SideLink to="logs" icon={<Clock size={18}/>} label="Activity Log" /> 
          </div>
        </div>

        {/* CONTENT AREA: 🛠️ Ditambahkan class 'block w-full clear-both static' untuk isolasi total */}
        <div className="col-span-12 lg:col-span-9 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm min-h-[600px] block w-full clear-both static">
          <Routes>
            <Route path="/" element={<DefaultView project={project} integrationData={integrationData} refreshData={fetchGitHubStatus} />} />
            <Route path="calendar" element={<ProjectCalendar projectId={id} currentRole={currentUser.role} />} />
            <Route path="vision-board" element={<VisionBoard ref={visionBoardRef} projectId={id} currentRole={currentUser.role} />} />
            <Route path="backlog" element={<Backlog projectId={id} currentRole={currentUser.role} />} />
            <Route path="sprint" element={<Sprint projectId={id} currentRole={currentUser.role} />} />
            <Route path="development" element={<Development projectId={id} currentRole={currentUser.role} />} />
            <Route path="members" element={<Members projectId={id} currentRole={currentUser.role} currentUserId={currentUser.id} />} />
            <Route path="logs" element={<ActivityLogsInline projectId={id} currentRole={currentUser.role} />} /> 
          </Routes>
        </div>
      </div>

      {/* MODAL DYNAMIC */}
      {showAddModal && hasWriteAccess() && location.pathname.includes('backlog') && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tambah {getModalType()}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-5">
              <FormInput label="Nama / Judul" placeholder={`Masukkan nama ${getModalType()}...`} value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              <FormTextarea label="Deskripsi / Detail" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Tulis detail pengerjaan..." />

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all">Batal</button>
                <button onClick={handleSave} disabled={isSubmitting} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                  {isSubmitting ? 'Menyimpan...' : `Simpan ${getModalType()}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// UI HELPER COMPONENTS
const SideLink = ({ to, icon, label, end = false }) => (
  <NavLink to={to} end={end} className={({ isActive }) => `flex items-center gap-3 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
    {icon} {label}
  </NavLink>
);

const DefaultView = ({ project, integrationData, refreshData }) => (
  <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 duration-700">
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center text-blue-200 mb-6 border border-blue-100">
        <Briefcase size={48} />
      </div>
      <h3 className="text-2xl font-black text-slate-800 mb-2">{project?.name}</h3>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] max-w-sm leading-relaxed">
        Project Dashboard. Gunakan navigasi samping untuk mengelola Development & Backlog.
      </p>
    </div>

    <div className="border-t border-slate-100 pt-6">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Integrasi Aplikasi</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GitHubStatusCard project={project} integrationData={integrationData} refreshData={refreshData} />
        <GitHubFeed projectId={project?.id} integrationData={integrationData} />
      </div>
    </div>
  </div>
);

const FormInput = ({ label, placeholder, value, onChange, type = "text" }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all" />
  </div>
);

const FormTextarea = ({ label, placeholder, value, onChange }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    <textarea rows="4" value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all" />
  </div>
);

export default ProjectDetail;