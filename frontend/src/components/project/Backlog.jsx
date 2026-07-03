import React, { useEffect, useState, useCallback } from 'react';
import { Search, Edit2, Trash2, Layers, User, Clock, Plus, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import useSubscription from '../../hooks/useSubscription'; 

const Backlog = ({ projectId, currentRole }) => {
  const { isSubscriptionActive } = useSubscription(); 
  const [backlogs, setBacklogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formMode, setFormMode] = useState(null); 
  const [currentId, setCurrentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const normalizedRole = currentRole?.toUpperCase() || '';
  // 🛠️ FIX: sebelumnya hanya SUPERADMIN & BUSINESSANALYST yang dianggap punya
  // akses tulis, padahal backend (projectRoutes.js) mengizinkan
  // authorize(['superadmin', 'admin', 'projectowner', 'businessanalyst'])
  // untuk create/update/delete backlog. Disamakan supaya tombol Add/Edit/Delete
  // tidak hilang untuk role Admin & ProjectOwner.
  const hasWriteAccess = 
    ['SUPERADMIN', 'ADMIN', 'PROJECTOWNER', 'BUSINESSANALYST'].includes(normalizedRole) 
    && isSubscriptionActive;

  const fetchBacklogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/backlogs`);
      setBacklogs(res.data || []);
    } catch (err) {
      console.error("Gagal mengambil data backlog:", err);
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
    if (!hasWriteAccess) return;

    try {
      if (formMode === 'edit') {
        await api.put(`/projects/${projectId}/backlogs/${currentId}`, formData);
      } else {
        await api.post(`/projects/${projectId}/backlogs`, { ...formData, project_id: projectId });
      }
      setFormData(initialFormState);
      setFormMode(null);
      fetchBacklogs();
    } catch (err) {
      alert("Gagal menyimpan: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAdd = () => {
    setFormData(initialFormState);
    setFormMode('add');
  };

  const handleEdit = (item) => {
    setFormMode('edit');
    setCurrentId(item.id);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      priority: item.priority || 'low',
      applicant: item.applicant || '',
      status: item.status || 'inactive',
      sprint_id: item.sprint_id || null,
      project_id: projectId,
    });
  };

  const handleDelete = async (id) => {
    if (!hasWriteAccess || !window.confirm("Hapus backlog ini? Fitur terikat pada papan kanban mungkin akan terpengaruh.")) return;
    try {
      await api.delete(`/projects/${projectId}/backlogs/${id}`);
      fetchBacklogs();
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  // Filter pencarian backlog
  const filteredBacklogs = backlogs.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex h-64 flex-col items-center justify-center gap-2">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menyelaraskan Backlog...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* SaaS Gatekeeper Alert Banner */}
      {!isSubscriptionActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-700">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-xs font-medium">
            SaaS Pro Version diperlukan. Fitur modifikasi Backlog terkunci karena masa aktif langganan workspace Anda kedaluwarsa.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Backlog Management</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kumpulan Fitur & Spesifikasi Kebutuhan Sistem</p>
        </div>
        
        {hasWriteAccess && (
          <button onClick={handleAdd} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-[0.98] shadow-md shadow-blue-100">
            <Plus size={14} /> Add Backlog
          </button>
        )}
      </div>

      {/* Kontrol Pencarian */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text"
          placeholder="Cari backlog berdasarkan nama atau rincian deskripsi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 shadow-sm"
        />
      </div>

      {/* Form Section */}
      {formMode && hasWriteAccess && (
        <div className="bg-white rounded-[2rem] border border-blue-100 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-xs font-black uppercase text-blue-600 mb-4 tracking-wider">
            {formMode === 'add' ? '✨ Buat Backlog Item Baru' : '📝 Perbarui Rincian Backlog'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Nama Backlog / Fitur</label>
              <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700" placeholder="Contoh: Integrasi Payment Gateway Midtrans" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tingkat Prioritas</label>
                <select name="priority" value={formData.priority} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold text-slate-700 appearance-none bg-white">
                  <option value="low">🟢 Low Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="high">🔴 High Priority</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pengaju Kebutuhan (Applicant)</label>
                <input type="text" name="applicant" value={formData.applicant} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-700" placeholder="Contoh: Client / Product Owner" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Deskripsi & Kriteria Penerimaan (Acceptance Criteria)</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-600 min-h-[100px]" placeholder="Tuliskan detail user story dan spesifikasi teknis fitur..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setFormMode(null)} className="px-5 py-3 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all">Batal</button>
              <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-md shadow-blue-100 transition-all">Simpan Backlog</button>
            </div>
          </form>
        </div>
      )}

      {/* List Backlog Content */}
      {filteredBacklogs.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-100 rounded-[2.5rem]">
          <Layers className="mx-auto text-slate-200 mb-3" size={48} />
          <h4 className="text-sm font-black text-slate-700">Backlog Kosong</h4>
          <p className="text-slate-400 text-[11px] mt-0.5">Tidak ada data backlog yang cocok dengan kriteria pencarian.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBacklogs.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 rounded-[1.5rem] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-200 transition-all shadow-sm group">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Badge Prioritas */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    item.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                    item.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}>
                    {item.priority}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.description || 'Tidak ada deskripsi rinci.'}</p>
                
                {/* Meta data info bawah */}
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase pt-1 flex-wrap">
                  <span className="flex items-center gap-1"><User size={12}/> By: {item.applicant || 'Anonim'}</span>
                  <span className="flex items-center gap-1"><Clock size={12}/> {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : 'Baru'}</span>
                </div>
              </div>

              {/* Aksi Operasi - Hanya bisa diklik jika lolos gatekeeper */}
              {hasWriteAccess && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 self-end md:self-center">
                  <button onClick={() => handleEdit(item)} className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-all" title="Edit Backlog">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all" title="Hapus Backlog">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Backlog;