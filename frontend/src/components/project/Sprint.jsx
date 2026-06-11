import React, { useEffect, useState } from 'react';
import { 
  Search, Calendar, Trash2, Edit3, Plus
} from 'lucide-react';
import api from '../../api/axios';
import Modal from '../ui/Modal';

const Sprint = ({ projectId, currentRole }) => {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // State untuk Form sesuai struktur tabel tbr_sprints
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planned'
  });

  // Menyelaraskan dengan format token UPPERCASE dari sistem otorisasi ScrumApps
  const isSuperAdmin = currentRole === 'SUPERADMIN';
  const isBA = currentRole === 'BUSINESSANALYST';
  const hasWriteAccess = isSuperAdmin || isBA;

  useEffect(() => {
    if (projectId) fetchSprints();
  }, [projectId]);

  const fetchSprints = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/sprints`);
      setSprints(res.data || []);
    } catch (err) {
      console.error("Fetch Sprints Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper untuk mengubah format ISO Date (string panjang) menjadi YYYY-MM-DD agar bisa dibaca input date
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasWriteAccess) {
      alert("Akses Ditolak: Anda tidak memiliki otoritas mengubah siklus sprint.");
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/projects/${projectId}/sprints/${currentId}`, formData);
      } else {
        await api.post(`/projects/${projectId}/sprints`, formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchSprints();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menyimpan data sprint");
    }
  };

  const handleEditClick = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      start_date: formatDateForInput(item.start_date), // ✨ FIX: Mencegah input date crash karena format ISO
      end_date: formatDateForInput(item.end_date),     // ✨ FIX: Memotong string tanggal menjadi YYYY-MM-DD
      status: item.status || 'planned'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!hasWriteAccess) {
      alert("Akses Ditolak: Anda tidak memiliki otoritas menghapus data sprint.");
      return;
    }

    if (window.confirm("Hapus sprint ini secara permanen?")) {
      try {
        // 🛠️ PERBAIKAN: Menembak nested route spesifik milik project ID bersangkutan
        await api.delete(`/projects/${projectId}/sprints/${id}`);
        fetchSprints();
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus data sprint");
      }
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ name: '', description: '', start_date: '', end_date: '', status: 'planned' });
  };

  // Filter Pencarian
  const filteredSprints = sprints.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Header Modul */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daftar Sprint</h2>
            <p className="text-sm text-gray-500 mt-1">
              Kelola siklus pengerjaan (sprint) untuk proyek ini.
            </p>
          </div>

          {/* Kontrol Pencarian & Tombol Tambah */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama sprint..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>

            {/* Tombol Tambah Sprint Baru berdasarkan Hak Akses */}
            {hasWriteAccess && (
              <button
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition active:scale-[0.98] shrink-0"
              >
                <Plus size={16} /> New Sprint
              </button>
            )}
          </div>
        </div>

        {/* Tabel Data Sprint */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Nama Sprint</th>
                <th className="px-6 py-4">Durasi</th>
                <th className="px-6 py-4">Status</th>
                {hasWriteAccess && <th className="px-6 py-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={hasWriteAccess ? 5 : 4} className="text-center py-20 text-gray-400 font-medium text-sm animate-pulse">
                    Memuat siklus sprint...
                  </td>
                </tr>
              ) : filteredSprints.length > 0 ? (
                filteredSprints.map((sprint, index) => (
                  <tr key={sprint.id} className="hover:bg-gray-50/50 transition group">
                    <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-800">{sprint.name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[240px] mt-0.5">{sprint.description || 'Tidak ada deskripsi'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar size={13} className="text-gray-400"/> 
                        {sprint.start_date ? new Date(sprint.start_date).toLocaleDateString('id-ID') : '-'}
                      </div>
                      <div className="text-[11px] text-gray-400 ml-5 mt-0.5">
                        s/d {sprint.end_date ? new Date(sprint.end_date).toLocaleDateString('id-ID') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        sprint.status === 'active' ? 'bg-blue-50 text-blue-600' : 
                        sprint.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {sprint.status}
                      </span>
                    </td>
                    
                    {/* Aksi Baris Data */}
                    {hasWriteAccess && (
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1 transition-all duration-200">
                          <button onClick={() => handleEditClick(sprint)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Sprint">
                            <Edit3 size={15}/>
                          </button>
                          <button onClick={() => handleDelete(sprint.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Hapus Sprint">
                            <Trash2 size={15}/>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={hasWriteAccess ? 5 : 4} className="text-center py-20 text-sm text-gray-400 font-medium">
                    Tidak ada sprint pengerjaan ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {hasWriteAccess && (
        <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={isEditing ? "Edit Siklus Sprint" : "Tambah Sprint Baru"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Sprint</label>
              <input 
                type="text" required
                placeholder="Contoh: Sprint 1 - Core Features"
                className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mulai</label>
                <input 
                  type="date" required
                  className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Selesai</label>
                <input 
                  type="date" required
                  className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 text-sm transition-all"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Tahapan</label>
              <select
                className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold text-blue-600 transition-all"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="planned">Planned (Direncanakan)</option>
                <option value="active">Active (Sedang Berjalan)</option>
                <option value="completed">Completed (Selesai)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Deskripsi / Goals</label>
              <textarea 
                placeholder="Jelaskan target utama pencapaian sprint ini..."
                className="w-full mt-1.5 p-3 border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-100 text-sm min-h-[100px] transition-all"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-100 mt-2">
              {isEditing ? 'Simpan Perubahan' : 'Simpan Sprint Baru'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Sprint;