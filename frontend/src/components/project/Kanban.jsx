import React, { useEffect, useState, useCallback } from 'react';
import { 
  Activity, Layout as BoardIcon, List as ListIcon,
  Trash2, Calendar, Link as LinkIcon, ArrowRight, Clock,
  Trophy, Edit3, Plus, Terminal
} from 'lucide-react';
import api from '../../api/axios';
import Modal from '../ui/Modal';

const COLUMNS = [
  { id: 'todo', label: 'To Do', bg: 'bg-gray-50', accent: 'bg-gray-400', text: 'text-gray-500' },
  { id: 'in_progress', label: 'In Progress', bg: 'bg-blue-50/50', accent: 'bg-blue-500', text: 'text-blue-600' },
  { id: 'qa', label: 'Review / QA', bg: 'bg-yellow-50/50', accent: 'bg-yellow-500', text: 'text-yellow-600' },
  { id: 'done', label: 'Completed', bg: 'bg-green-50/50', accent: 'bg-green-500', text: 'text-green-600' }
];

const Kanban = ({ projectId, currentRole }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [syncingTaskId, setSyncingTaskId] = useState(null); 
  
  const [formData, setFormData] = useState({
    title: '', 
    description: '',
    status: 'todo',
    link: ''
  });

  const normalizedRole = currentRole?.toUpperCase() || '';
  // 🛠️ FIX: 'ADMIN' sebelumnya tidak ada di daftar ini, padahal backend
  // (projectRoutes.js) mengizinkan authorize(['superadmin', 'admin',
  // 'projectowner', 'businessanalyst', 'teamdeveloper']) untuk
  // create/update/delete development (kanban).
  const hasWriteAccess = 
    normalizedRole === 'SUPERADMIN' || 
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'PROJECTOWNER' || 
    normalizedRole === 'BUSINESSANALYST' || 
    normalizedRole === 'DEVELOPER' || 
    normalizedRole === 'TEAMDEVELOPER';

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/developments`);
      setTasks(res.data || []);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchTasks();
  }, [fetchTasks, projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasWriteAccess) {
      alert('Akses Ditolak: Anda tidak memiliki otoritas mengubah data.');
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/projects/${projectId}/developments/${currentTaskId}`, formData);
      } else {
        await api.post(`/projects/${projectId}/developments`, formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan tugas');
    }
  };

  const handleEditClick = (task) => {
    setIsEditing(true);
    setCurrentTaskId(task.id);
    setFormData({
      title: task.title || task.name || '',
      description: task.description || task.desc || '',
      status: task.status || 'todo',
      link: task.link || ''
    });
    setIsModalOpen(true);
  };

  const handleMoveStatus = async (taskId, currentStatus) => {
    if (!hasWriteAccess) return;
    
    const statusOrder = ['todo', 'in_progress', 'qa', 'done'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    if (currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      try {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
        await api.put(`/projects/${projectId}/developments/${taskId}/status`, { status: nextStatus });
      } catch (err) {
        console.error('Gagal memperbarui status:', err);
        fetchTasks(); 
      }
    }
  };

  const handleDelete = async (id) => {
    if (!hasWriteAccess) {
      alert('Akses Ditolak: Anda tidak memiliki otoritas menghapus data.');
      return;
    }

    if (window.confirm('Hapus tugas ini secara permanen?')) {
      try {
        await api.delete(`/projects/${projectId}/developments/${id}`);
        setTasks(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        alert('Gagal menghapus tugas');
      }
    }
  };

  const handleSyncToGitHub = async (task) => {
    if (!hasWriteAccess) return;
    try {
      setSyncingTaskId(task.id);
      await api.post(`/projects/${projectId}/developments/${task.id}/github-sync`, {
        title: task.title || task.name,
        body: task.description || task.desc || 'No description provided.'
      });
      alert('Berhasil membuat issue di repositori GitHub proyek!');
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal sinkronisasi ke GitHub. Pastikan token repositori sudah terkonfigurasi.');
    } finally {
      setSyncingTaskId(null);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentTaskId(null);
    setFormData({ title: '', description: '', status: 'todo', link: '' });
  };

  if (loading) return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Memuat Kanban...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-100">
            <BoardIcon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kanban Board</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visualisasi & Kelola Progres Tugas Tim</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {hasWriteAccess && (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition active:scale-[0.98] shrink-0"
            >
              <Plus size={16} /> New Task
            </button>
          )}

          <div className="flex items-center bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full sm:w-auto justify-center">
            <button 
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'board' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <BoardIcon size={16} /> BOARD
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ListIcon size={16} /> LIST
            </button>
          </div>
        </div>
      </div>

      {/* RENDER VIEW */}
      {tasks.length === 0 ? (
        <div className="py-20 text-center bg-white border-2 border-dashed border-slate-100 rounded-[3rem]">
          <Trophy className="mx-auto text-slate-100 mb-4" size={64} />
          <h3 className="text-lg font-black text-slate-800">Mulai Kanban Board</h3>
          <p className="text-slate-400 text-xs mt-1">Belum ada tugas yang tercatat di papan ini.</p>
        </div>
      ) : (
        viewMode === 'board' ? (
          /* KANBAN BOARD VIEW */
          <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
            {COLUMNS.map((col) => (
              <div key={col.id} className="w-80 flex-shrink-0 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.accent}`}></div>
                    <h3 className={`text-[11px] font-black uppercase tracking-[0.15em] ${col.text}`}>{col.label}</h3>
                  </div>
                  <span className="bg-white border border-slate-100 text-[10px] font-black px-2.5 py-1 rounded-lg text-slate-400">
                    {tasks.filter(t => t.status === col.id).length}
                  </span>
                </div>

                <div className={`${col.bg} rounded-[2.5rem] p-4 space-y-4 min-h-[500px] border border-slate-50`}>
                  {tasks.filter(t => t.status === col.id).map((task) => (
                    <div key={task.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm group hover:shadow-md transition-all relative">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors">
                          {task.title || task.name}
                        </h4>
                        
                        {hasWriteAccess && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all duration-200 bg-white pl-1 shrink-0">
                            <button 
                              onClick={() => handleSyncToGitHub(task)} 
                              disabled={syncingTaskId === task.id}
                              className={`p-1 text-slate-400 hover:text-black transition-colors ${syncingTaskId === task.id ? 'animate-pulse text-black' : ''}`}
                              title="Sync to GitHub Issues"
                            >
                              <Terminal size={13} />
                            </button>
                            <button onClick={() => handleEditClick(task)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Edit Task">
                              <Edit3 size={13} />
                            </button>
                            <button onClick={() => handleDelete(task.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Delete Task">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-4">
                        {task.description || task.desc || 'Tidak ada rincian deskripsi.'}
                      </p>
                      
                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                          <Clock size={12} /> {task.created_at ? new Date(task.created_at).toLocaleDateString('id-ID') : 'Baru'}
                        </div>
                        
                        {hasWriteAccess && col.id !== 'done' && (
                          <button 
                            onClick={() => handleMoveStatus(task.id, task.status)}
                            className="bg-slate-50 p-2 rounded-xl text-slate-400 hover:bg-blue-600 hover:text-white transition-all group/btn"
                            title="Pindahkan ke tahap berikutnya"
                          >
                            <ArrowRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="grid grid-cols-1 gap-4">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white border border-slate-100 rounded-[1.5rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-blue-200 transition-all">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      COLUMNS.find(c => c.id === task.status)?.text.replace('text', 'bg').replace('600', '100')
                    } ${COLUMNS.find(c => c.id === task.status)?.text}`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                    <h3 className="font-black text-slate-800 text-base">{task.title || task.name}</h3>
                  </div>
                  <p className="text-sm text-slate-500">{task.description || task.desc || 'Tidak ada deskripsi.'}</p>
                  
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase flex-wrap pt-1">
                    <span className="flex items-center gap-1.5"><Calendar size={14}/> {task.created_at ? new Date(task.created_at).toLocaleDateString('id-ID') : '-'}</span>
                    {task.link && (
                      <a href={task.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-500 hover:underline">
                        <LinkIcon size={14}/> Reference
                      </a>
                    )}
                  </div>
                </div>

                {hasWriteAccess && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
                    <button 
                      onClick={() => handleSyncToGitHub(task)}
                      disabled={syncingTaskId === task.id}
                      className={`p-3 text-slate-400 hover:bg-slate-100 hover:text-black rounded-2xl transition-all ${syncingTaskId === task.id ? 'animate-pulse text-black' : ''}`}
                      title="Sync to GitHub"
                    >
                      <Terminal size={18} />
                    </button>
                    <button onClick={() => handleEditClick(task)} className="p-3 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all" title="Edit Task">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="p-3 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all" title="Delete Task">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* MODAL FORM */}
      {hasWriteAccess && (
        <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={isEditing ? "Edit Task" : "New Task"}>
          <form onSubmit={handleSubmit} className="space-y-5 p-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Task Name</label>
              <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700" 
                value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="e.g., Setup Database Schema" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Status</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none bg-white" 
                  value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="qa">QA / Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reference Link</label>
                <input type="url" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                  value={formData.link} onChange={(e) => setFormData({...formData, link: e.target.value})} placeholder="https://..." />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Task Details</label>
              <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] text-sm" 
                value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Rincian deskripsi tugas..." />
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] mt-4">
              {isEditing ? 'Save Changes' : 'Save Task'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Kanban;