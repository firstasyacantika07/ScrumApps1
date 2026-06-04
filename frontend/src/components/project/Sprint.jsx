import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, MoreVertical, 
  ChevronLeft, ChevronRight, ChevronDown,
  Calendar, Trash2, Edit3, X
} from 'lucide-react';
import api from '../../api/axios';
import Modal from '../ui/Modal'; // Pastikan Anda memiliki komponen Modal umum

const Sprint = ({ projectId }) => {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planned'
  });

  useEffect(() => {
    if (projectId) fetchSprints();
  }, [projectId]);

  const fetchSprints = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/sprints`);
      setSprints(res.data);
    } catch (err) {
      console.error("Fetch Sprints Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/sprints`, formData);
      setIsModalOpen(false);
      setFormData({ name: '', description: '', start_date: '', end_date: '', status: 'planned' });
      fetchSprints();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menambah sprint");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Hapus sprint ini?")) {
      try {
        await api.delete(`/projects/${projectId}/sprints/${id}`);
        fetchSprints();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filter Search
  const filteredSprints = sprints.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Daftar Sprint</h2>
          <p className="text-sm text-gray-500 mt-1">
            Kelola siklus pengerjaan (sprint) untuk proyek ini.
          </p>
        </div>

        {/* Toolbar */}
        <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-100">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition shadow-md shadow-red-100"
          >
            <Plus size={18} /> Tambah Sprint
          </button>
          
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama sprint..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-100 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-red-100 outline-none transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">No</th>
                <th className="px-6 py-4">Nama Sprint</th>
                <th className="px-6 py-4">Durasi</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-20 text-gray-400">Memuat data...</td></tr>
              ) : filteredSprints.length > 0 ? (
                filteredSprints.map((sprint, index) => (
                  <tr key={sprint.id} className="hover:bg-gray-50/50 transition group">
                    <td className="px-6 py-4 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-800">{sprint.name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[200px]">{sprint.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1"><Calendar size={12}/> {sprint.start_date}</div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">s/d {sprint.end_date}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        sprint.status === 'active' ? 'bg-blue-50 text-blue-600' : 
                        sprint.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {sprint.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => handleDelete(sprint.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center py-20 text-sm text-gray-400">Tidak ada sprint ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Sprint Baru">
        <form onSubmit={handleCreateSprint} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Nama Sprint</label>
            <input 
              type="text" required
              className="w-full mt-1.5 p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-red-100"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Mulai</label>
              <input 
                type="date" required
                className="w-full mt-1.5 p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-red-100"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Selesai</label>
              <input 
                type="date" required
                className="w-full mt-1.5 p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-red-100"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Deskripsi</label>
            <textarea 
              className="w-full mt-1.5 p-3 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-red-100 min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-red-100">
            Simpan Sprint
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Sprint;