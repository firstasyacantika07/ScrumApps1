import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Plus, Trash2, Edit, Target, Users, ShoppingBag, BarChart3, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../ui/Modal';

// Menggunakan forwardRef agar ProjectDetail bisa memicu fungsi openNewBoardModal() secara langsung
const VisionBoard = forwardRef(({ projectId, currentRole }, ref) => {
  const [visions, setVisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    vision: '',
    target_group: '',
    needs: '',
    products: '',
    business_goals: '',
    competitors: ''
  });

  // 🛠️ FIX: sebelumnya hanya SUPERADMIN & BUSINESSANALYST — padahal backend
  // (projectRoutes.js) mengizinkan authorize(['superadmin', 'admin',
  // 'projectowner', 'businessanalyst']) untuk create/update vision board.
  // Dibuat case-insensitive juga.
  const normalizedRole = currentRole?.toString().toUpperCase() || '';
  const hasWriteAccess = ['SUPERADMIN', 'ADMIN', 'PROJECTOWNER', 'BUSINESSANALYST'].includes(normalizedRole);
  // 🛠️ FIX: backend KHUSUS untuk delete vision board TIDAK mengizinkan
  // businessanalyst — authorize(['superadmin', 'admin', 'projectowner']).
  // Tombol Delete dipisah aksesnya dari Add/Edit supaya BA tidak melihat
  // tombol yang ujung-ujungnya ditolak backend (403).
  const hasDeleteAccess = ['SUPERADMIN', 'ADMIN', 'PROJECTOWNER'].includes(normalizedRole);

  const fetchVisions = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/vision-boards`);
      setVisions(res.data);
    } catch (err) {
      console.error("Error fetching vision boards:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchVisions();
  }, [fetchVisions]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '', vision: '', target_group: '', needs: '',
      products: '', business_goals: '', competitors: ''
    });
  };

  // Mengekspos fungsi membuka modal tambah ke Parent (ProjectDetail)
  useImperativeHandle(ref, () => ({
    openNewBoardModal() {
      if (!hasWriteAccess) {
        alert("Akses ditolak: Anda tidak memiliki otoritas untuk menambah data.");
        return;
      }
      resetForm();
      setIsModalOpen(true);
    }
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasWriteAccess) {
      alert("Akses ditolak: Anda tidak memiliki otoritas untuk mengubah data.");
      return;
    }
    try {
      if (editingId) {
        await api.put(`/projects/${projectId}/vision-boards/${editingId}`, formData);
      } else {
        await api.post(`/projects/${projectId}/vision-boards`, formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchVisions();
    } catch (err) {
      alert("Error saving vision board");
    }
  };

  const handleDelete = async (id) => {
    if (!hasDeleteAccess) {
      alert("Akses ditolak: Anda tidak memiliki otoritas untuk menghapus data.");
      return;
    }
    if (!window.confirm('Delete this vision board?')) return;
    try {
      await api.delete(`/projects/${projectId}/vision-boards/${id}`);
      fetchVisions();
    } catch (err) {
      alert("Error deleting vision board");
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      vision: item.vision || '',
      target_group: item.target_group || '',
      needs: item.needs || '',
      products: item.products || '',
      business_goals: item.business_goals || '',
      competitors: item.competitors || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Target className="text-red-500" /> Vision Board
          </h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Product Strategy & Goals</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse font-bold text-xs uppercase tracking-wider">Loading boards...</div>
      ) : visions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 border border-slate-100">
            <Target size={28} />
          </div>
          <h4 className="text-base font-black text-slate-700 mb-1">Belum Ada Vision Board</h4>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest max-w-xs leading-relaxed">
            {hasWriteAccess ? 'Gunakan tombol tambah di atas untuk membuat strategi produk baru.' : 'Belum ada data strategi yang ditambahkan oleh Business Analyst.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-8 animate-in fade-in duration-500">
          {visions.map((item) => (
            <div key={item.id} className="bg-white border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden group hover:border-slate-200 transition-all duration-300">
              {/* Header Card */}
              <div className="bg-slate-50/70 px-8 py-4 flex justify-between items-center border-b border-slate-100">
                <h3 className="font-black text-slate-700 uppercase tracking-tighter text-lg">{item.name}</h3>

                {(hasWriteAccess || hasDeleteAccess) && (
                  <div className="flex gap-2">
                    {hasWriteAccess && (
                      <button onClick={() => handleEditClick(item)} className="p-2 bg-white rounded-xl text-blue-500 shadow-sm hover:bg-blue-50 transition-colors" title="Edit Board">
                        <Edit size={16} />
                      </button>
                    )}
                    {hasDeleteAccess && (
                      <button onClick={() => handleDelete(item.id)} className="p-2 bg-white rounded-xl text-red-500 shadow-sm hover:bg-red-50 transition-colors" title="Delete Board">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Grid Content */}
              <div className="grid md:grid-cols-4 gap-px bg-slate-100">
                <div className="bg-white p-6 col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><Target size={14} className="text-red-500" /> Vision</label>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{item.vision || '-'}</p>
                </div>
                <div className="bg-white p-6">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><Users size={14} className="text-blue-500" /> Target Group</label>
                  <p className="text-slate-600 text-sm whitespace-pre-line">{item.target_group || '-'}</p>
                </div>
                <div className="bg-white p-6">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><ShoppingBag size={14} className="text-emerald-500" /> Needs</label>
                  <p className="text-slate-600 text-sm whitespace-pre-line">{item.needs || '-'}</p>
                </div>
                <div className="bg-white p-6">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><ShoppingBag size={14} className="text-orange-500" /> Products</label>
                  <p className="text-slate-600 text-sm whitespace-pre-line">{item.products || '-'}</p>
                </div>
                <div className="bg-white p-6 col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><BarChart3 size={14} className="text-purple-500" /> Business Goals</label>
                  <p className="text-slate-600 text-sm whitespace-pre-line">{item.business_goals || '-'}</p>
                </div>
                <div className="bg-white p-6 col-span-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-3"><ShieldAlert size={14} className="text-amber-500" /> Competitors</label>
                  <p className="text-slate-600 text-sm whitespace-pre-line">{item.competitors || '-'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL EDITOR */}
      {hasWriteAccess && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Vision Board" : "Create Vision Board"}>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Board Name</label>
              <input
                required
                placeholder="Versi 1.0"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all mt-1 text-sm"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Vision</label>
                <textarea
                  value={formData.vision}
                  onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl h-24 mt-1 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Target Group</label>
                <textarea
                  value={formData.target_group}
                  onChange={(e) => setFormData({ ...formData, target_group: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl h-24 mt-1 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Needs</label>
                <textarea
                  value={formData.needs}
                  onChange={(e) => setFormData({ ...formData, needs: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl h-24 mt-1 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Products</label>
                <textarea
                  value={formData.products}
                  onChange={(e) => setFormData({ ...formData, products: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl h-24 mt-1 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">Competitors</label>
                <textarea
                  value={formData.competitors}
                  onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl h-24 mt-1 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">Business Goals</label>
                <textarea
                  value={formData.business_goals}
                  onChange={(e) => setFormData({ ...formData, business_goals: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl h-24 mt-1 text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <button className="w-full bg-red-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-600 transition-colors sticky bottom-0 shadow-lg text-xs">
              {editingId ? 'Save Changes' : 'Create New Board'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
});

export default VisionBoard;