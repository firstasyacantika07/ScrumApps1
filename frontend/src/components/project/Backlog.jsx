import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, Search, Edit2, Trash2, 
  Layers, User, Tag, AlertCircle, Clock
} from 'lucide-react';
import api from '../../api/axios';

const Backlog = ({ projectId }) => {
  const [backlogs, setBacklogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Initial State sesuai struktur Tabel tbr_backlogs
  const initialFormState = {
    name: '',
    description: '',
    priority: 'low',
    applicant: '',
    status: 'inactive', 
    sprint_id: null,
    project_id: projectId,
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchBacklogs = useCallback(async () => {
    try {
      setLoading(true);
      // Menggunakan endpoint /projects/:projectId/backlogs
      const res = await api.get(`/projects/${projectId}/backlogs`);
      setBacklogs(res.data);
    } catch (err) {
      console.error("Gagal mengambil data:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchBacklogs();
  }, [projectId, fetchBacklogs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // PERBAIKAN: Menambahkan prefix /projects agar tidak 404
        await api.put(`/projects/backlogs/${currentId}`, formData);
      } else {
        await api.post(`/projects/${projectId}/backlogs`, {
          ...formData,
          project_id: projectId
        });
      }
      setFormData(initialFormState);
      setIsEditing(false);
      fetchBacklogs();
    } catch (err) {
      alert("Gagal menyimpan data: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      priority: item.priority || 'low',
      applicant: item.applicant || '',
      status: item.status || 'inactive',
      sprint_id: item.sprint_id,
      project_id: projectId,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Hapus backlog ini secara permanen?")) {
      try {
        // PERBAIKAN: Menambahkan prefix /projects agar tidak 404
        await api.delete(`/projects/backlogs/${id}`);
        fetchBacklogs();
      } catch (err) {
        alert("Gagal menghapus data: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const filteredBacklogs = backlogs.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Backlog Management</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">List fitur dan kebutuhan proyek</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <input 
            type="text"
            placeholder="Cari item..."
            className="pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500 w-full md:w-60 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* FORM SECTION */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nama Backlog</label>
              <input
                name="name"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Contoh: Fitur Login Multi-role"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Applicant (Pengaju)</label>
              <input
                name="applicant"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                value={formData.applicant}
                onChange={handleInputChange}
                placeholder="Nama Client/Stakeholder"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Prioritas</label>
              <select 
                name="priority" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                value={formData.priority}
                onChange={handleInputChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status Database</label>
              <select 
                name="status" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 font-bold text-blue-600 transition-all"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="inactive">Inactive (Draft)</option>
                <option value="active">Active (Ready for Sprint)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Deskripsi Detail</label>
            <textarea
              name="description"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
              rows="3"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Jelaskan kriteria pengerjaan..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {isEditing && (
              <button 
                type="button" 
                onClick={() => { setIsEditing(false); setFormData(initialFormState); }}
                className="px-6 py-3 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Batal
              </button>
            )}
            <button type="submit" className="px-10 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all">
              {isEditing ? 'Update Database' : 'Tambah ke Backlog'}
            </button>
          </div>
        </form>
      </div>

      {/* LIST SECTION */}
      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">Loading data...</div>
        ) : filteredBacklogs.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
             <Layers size={40} className="mx-auto text-slate-200 mb-2" />
             <p className="text-slate-400 text-[10px] font-black uppercase">Belum ada backlog pengerjaan</p>
          </div>
        ) : (
          filteredBacklogs.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${item.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                  <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                  <span className={`ml-2 px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    item.priority === 'high' ? 'bg-red-50 text-red-500' : 
                    item.priority === 'medium' ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.priority}
                  </span>
                </div>
                <p className="text-slate-400 text-xs line-clamp-1">{item.description || 'Tidak ada deskripsi'}</p>
                <div className="flex items-center gap-4 mt-3">
                   <div className="flex items-center gap-1 text-slate-400">
                      <User size={10} />
                      <span className="text-[9px] font-bold uppercase">{item.applicant || 'General'}</span>
                   </div>
                   <div className="flex items-center gap-1 text-slate-400">
                      <Clock size={10} />
                      <span className="text-[9px] font-bold uppercase">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : 'New'}
                      </span>
                   </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all shadow-sm">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all shadow-sm">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Backlog;