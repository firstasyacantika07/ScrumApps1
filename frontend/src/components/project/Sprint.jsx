import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react'; // 🛠️ Tambahkan forwardRef & useImperativeHandle
import { 
  Search, Calendar, Trash2, Edit3, Plus, ClipboardCheck, History, Bell, Loader2
} from 'lucide-react';
import api from '../../api/axios';
import Modal from '../ui/Modal';

const Sprint = forwardRef(({ projectId, currentRole }, ref) => { // 🛠️ Bungkus dengan forwardRef
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [sendingReminderId, setSendingReminderId] = useState(null); // 🔔 id sprint yg sedang dikirim reminder-nya
  const [projectOwner, setProjectOwner] = useState(null); // 🔔 { userId, name } - PO proyek ini, dipakai target trigger-sprint-check
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'planned',
    result_review: '',
    result_retrospective: ''
  });

  // 🛠️ FIX: sebelumnya perbandingan `currentRole === 'SUPERADMIN'` case-sensitive
  // dan hanya mengizinkan SUPERADMIN & BUSINESSANALYST — padahal backend
  // (projectRoutes.js) mengizinkan authorize(['superadmin', 'admin',
  // 'projectowner', 'businessanalyst']) untuk create/update/delete sprint.
  // Disamakan + dibuat case-insensitive.
  const normalizedRole = currentRole?.toString().toUpperCase() || '';
  const hasWriteAccess = ['SUPERADMIN', 'ADMIN', 'PROJECTOWNER', 'BUSINESSANALYST'].includes(normalizedRole);

  // 🛠️ Ekspos fungsi ke Parent (ProjectDetail) agar bisa membuka modal tambah dari luar
  useImperativeHandle(ref, () => ({
    openNewSprintModal() {
      if (!hasWriteAccess) {
        alert("Akses Ditolak: Anda tidak memiliki otoritas mengubah data sprint.");
        return;
      }
      resetForm();
      setIsModalOpen(true);
    }
  }));

  useEffect(() => {
    if (projectId) {
      fetchSprints();
      fetchProjectOwner();
    }
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

  // 🔔 Ambil Product Owner proyek ini dari endpoint members yang sudah ada
  // (teamController.getTeamByProject), supaya tombol reminder tahu harus
  // menyasar user mana lewat POST /notifications/trigger-sprint-check.
  // CATATAN: nama field di bawah (user_id/role_in_project) mengikuti skema
  // tbr_project_members. Kalau shape response teamController ternyata beda,
  // sesuaikan mapping di sini.
  const fetchProjectOwner = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/members`);
      const members = res.data?.data || res.data || [];
      const po = members.find(
        (m) => String(m.role_in_project || m.role || '').toLowerCase() === 'projectowner'
      );
      if (po) {
        setProjectOwner({
          userId: po.user_id ?? po.userId ?? po.id,
          name: po.name || po.user_name || 'Product Owner'
        });
      } else {
        setProjectOwner(null);
      }
    } catch (err) {
      console.error("Fetch Project Owner Error:", err);
      setProjectOwner(null);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString || dateString.startsWith('0000') || dateString.startsWith('00')) return '';
    if (dateString.includes('T')) return dateString.split('T')[0];
    return dateString.split(' ')[0];
  };

  const formatHumanDate = (dateString) => {
    if (!dateString || dateString.startsWith('0000')) return '-';
    
    const yearCheck = parseInt(dateString.split('-')[0], 10);
    if (isNaN(yearCheck) || yearCheck < 1970 || yearCheck > 2100) {
      return `Format Tidak Valid (${dateString.split(' ')[0]})`;
    }

    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return '-';

    return dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusStyles = (status) => {
    const cleanStatus = status?.toLowerCase() || 'planned';
    switch (cleanStatus) {
      case 'active':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'completed':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'planned':
      default:
        return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasWriteAccess) {
      alert("Akses Ditolak: Anda tidak memiliki otoritas mengubah data sprint.");
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      alert("Kesalahan Input: Tanggal mulai dan selesai wajib diisi.");
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      alert("Kesalahan Batas Waktu: Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    try {
      const payload = {
        ...formData,
        status: formData.status || 'planned',
        result_review: formData.status === 'completed' ? formData.result_review : null,
        result_retrospective: formData.status === 'completed' ? formData.result_retrospective : null
      };

      if (isEditing) {
        await api.put(`/projects/${projectId}/sprints/${currentId}`, payload);
      } else {
        await api.post(`/projects/${projectId}/sprints`, payload);
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
      start_date: formatDateForInput(item.start_date),
      end_date: formatDateForInput(item.end_date),
      status: item.status || 'planned', 
      result_review: item.result_review || '',
      result_retrospective: item.result_retrospective || ''
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
        await api.delete(`/projects/${projectId}/sprints/${id}`);
        fetchSprints();
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus data sprint");
      }
    }
  };

  // 🔔 Replikasi kondisi RF-14.1 di cronService.js (DATEDIFF < 3 AND >= 0)
  // supaya tombol reminder di UI hanya aktif saat sprint memang memenuhi
  // syarat backend — mencegah user bingung klik tombol tapi 0 notifikasi terkirim.
  const getDaysLeftClient = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((end - today) / (1000 * 60 * 60 * 24));
  };

  const isReminderEligible = (sprint) => {
    const daysLeft = getDaysLeftClient(sprint.end_date);
    return daysLeft !== null && daysLeft >= 0 && daysLeft < 3;
  };

  // 🔔 RF-14.1: kirim reminder ke Product Owner secara manual dari UI.
  // Memanggil endpoint yang SUDAH ADA (notificationRoutes.js ->
  // POST /notifications/trigger-sprint-check) dengan userId = PO proyek ini,
  // BUKAN endpoint custom terpisah, supaya tidak duplikat dengan cronService.js.
  const handleSendReminder = async (sprint) => {
    if (!hasWriteAccess) {
      alert("Akses Ditolak: Anda tidak memiliki otoritas mengirim reminder sprint.");
      return;
    }

    if (!projectOwner?.userId) {
      alert("Product Owner untuk proyek ini belum ditemukan/terdaftar sebagai member.");
      return;
    }

    if (!window.confirm(`Kirim reminder ke Product Owner (${projectOwner.name}) untuk sprint yang mendekati tenggat?`)) return;

    try {
      setSendingReminderId(sprint.id);
      const res = await api.post(`/notifications/trigger-sprint-check`, { userId: projectOwner.userId });
      alert(res.data?.message || "Reminder berhasil diproses.");
    } catch (err) {
      alert(err.response?.data?.message || "Gagal mengirim reminder ke Product Owner.");
    } finally {
      setSendingReminderId(null);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ 
      name: '', 
      description: '', 
      start_date: '', 
      end_date: '', 
      status: 'planned',
      result_review: '',
      result_retrospective: ''
    });
  };

  const filteredSprints = sprints.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Header Modul */}
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Daftar Sprint</h2>
            <p className="text-xs font-medium text-gray-400 mt-1">
              Kelola siklus pengerjaan, evaluasi sprint review, dan catatan retrospective.
            </p>
          </div>

          {/* Kontrol Pencarian & Tombol Tambah Internal */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Cari nama sprint..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-100 rounded-2xl bg-gray-50 text-xs font-semibold focus:ring-2 focus:ring-blue-50/50 outline-none transition"
              />
            </div>

            {hasWriteAccess && (
              <button
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition active:scale-[0.98] shrink-0"
              >
                <Plus size={14} /> New Sprint
              </button>
            )}
          </div>
        </div>

        {/* Tabel Data Sprint */}
        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-4 w-16">No</th>
                <th className="px-6 py-4">Nama Sprint & Catatan</th>
                <th className="px-6 py-4">Durasi</th>
                <th className="px-6 py-4">Status</th>
                {hasWriteAccess && <th className="px-8 py-4 text-center w-32">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={hasWriteAccess ? 5 : 4} className="text-center py-24 text-gray-400 font-bold text-xs uppercase tracking-widest animate-pulse">
                    Memuat siklus sprint...
                  </td>
                </tr>
              ) : filteredSprints.length > 0 ? (
                filteredSprints.map((sprint, index) => (
                  <tr key={sprint.id} className="hover:bg-gray-50/30 transition group">
                    <td className="px-8 py-5 text-xs font-bold text-gray-400">{index + 1}</td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-bold text-gray-800 tracking-tight">{sprint.name || `Sprint ID: ${sprint.id}`}</div>
                      <div className="text-xs font-medium text-gray-400 truncate max-w-[340px] mt-0.5">{sprint.description || 'Tidak ada deskripsi'}</div>
                      
                      {/* Indikator review & retrospective */}
                      {(sprint.result_review || sprint.result_retrospective) && (
                        <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-dashed border-gray-100">
                          {sprint.result_review && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50/60 px-1.5 py-0.5 rounded-md">
                              <ClipboardCheck size={11} /> Review OK
                            </span>
                          )}
                          {sprint.result_retrospective && (
                            <span className="flex items-center gap-1 text-[10px] text-purple-600 font-medium bg-purple-50/60 px-1.5 py-0.5 rounded-md">
                              <History size={11} /> Retro OK
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5 font-bold text-gray-700">
                        <Calendar size={13} className="text-gray-400"/> 
                        {formatHumanDate(sprint.start_date)}
                      </div>
                      <div className="text-[10px] font-bold text-gray-400 ml-5 mt-0.5 uppercase tracking-wide">
                        s/d {formatHumanDate(sprint.end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(sprint.status)}`}>
                        {sprint.status || 'planned'}
                      </span>
                    </td>
                    
                    {hasWriteAccess && (
                      <td className="px-8 py-5">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleSendReminder(sprint)}
                            disabled={sendingReminderId === sprint.id || !isReminderEligible(sprint) || !projectOwner}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50/50 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={
                              !projectOwner
                                ? "Product Owner proyek ini belum ditemukan"
                                : !isReminderEligible(sprint)
                                  ? "Reminder hanya aktif saat sisa waktu sprint kurang dari 3 hari"
                                  : `Kirim Reminder ke ${projectOwner.name}`
                            }
                          >
                            {sendingReminderId === sprint.id ? <Loader2 size={14} className="animate-spin"/> : <Bell size={14}/>}
                          </button>
                          <button onClick={() => handleEditClick(sprint)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl transition" title="Edit Sprint">
                            <Edit3 size={14}/>
                          </button>
                          <button onClick={() => handleDelete(sprint.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition" title="Hapus Sprint">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={hasWriteAccess ? 5 : 4} className="text-center py-24 text-xs font-bold text-gray-400 uppercase tracking-widest">
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
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 max-h-[80vh] overflow-y-auto px-1">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Sprint</label>
              <input 
                type="text" required
                placeholder="Contoh: Sprint 1 - Core Features"
                className="w-full mt-1.5 p-3.5 border border-gray-100 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-50 text-xs font-bold transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mulai</label>
                <input 
                  type="date" required
                  className="w-full mt-1.5 p-3.5 border border-gray-100 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-50 text-xs font-bold transition-all"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selesai</label>
                <input 
                  type="date" required
                  className="w-full mt-1.5 p-3.5 border border-gray-100 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-50 text-xs font-bold transition-all"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Tahapan</label>
              <select
                className={`w-full mt-1.5 p-3.5 border rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-50 text-xs font-black uppercase tracking-widest transition-all ${getStatusStyles(formData.status)}`}
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="planned" className="bg-white text-amber-600 font-bold">Planned (Direncanakan)</option>
                <option value="active" className="bg-white text-emerald-600 font-bold">Active (Sedang Berjalan)</option>
                <option value="completed" className="bg-white text-blue-600 font-bold">Completed (Selesai)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi / Goals</label>
              <textarea 
                placeholder="Jelaskan target utama pencapaian sprint ini..."
                className="w-full mt-1.5 p-3.5 border border-gray-100 rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-50 text-xs font-medium min-h-[80px] transition-all"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            {formData.status === 'completed' && (
              <div className="space-y-4 pt-2 border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                    <ClipboardCheck size={14}/> Hasil Sprint Review
                  </label>
                  <textarea 
                    placeholder="Tuliskan umpan balik dari stakeholders atau hasil demo fitur..."
                    className="w-full mt-1.5 p-3.5 border border-emerald-100 rounded-2xl bg-emerald-50/10 outline-none focus:ring-2 focus:ring-emerald-50 text-xs font-medium min-h-[80px] transition-all"
                    value={formData.result_review}
                    onChange={(e) => setFormData({...formData, result_review: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                    <History size={14}/> Hasil Sprint Retrospective
                  </label>
                  <textarea 
                    placeholder="Apa yang berjalan baik? Apa yang perlu ditingkatkan oleh tim di sprint berikutnya?"
                    className="w-full mt-1.5 p-3.5 border border-purple-100 rounded-2xl bg-purple-50/10 outline-none focus:ring-2 focus:ring-purple-50 text-xs font-medium min-h-[80px] transition-all"
                    value={formData.result_retrospective}
                    onChange={(e) => setFormData({...formData, result_retrospective: e.target.value})}
                  />
                </div>
              </div>
            )}

            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-100 mt-4 sticky bottom-0">
              {isEditing ? 'Simpan Perubahan' : 'Simpan Sprint Baru'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
});

export default Sprint;