// pages/ProjectList.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/ui/Modal";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext"; 
import {
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
} from "lucide-react";

const ProjectList = () => {
  const navigate = useNavigate();
  const { refreshUser, user: authUser } = useAuth(); 

  // ==========================
  // STATES
  // ==========================
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [modalReason, setModalReason] = useState(""); 

  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });

  const initialForm = {
    name: "",
    status: "hold",
    label: "external", 
    owner_id: "", 
  };

  const [formData, setFormData] = useState(initialForm);

  // ==========================================================================
  // DERIVED STATES & ALUR TRIAL (FIXED: PRIORITAS AKUN USER UTAMA)
  // ==========================================================================
  
  const getPackageString = () => {
    // 💡 FIX: Ambil status murni dari akun pengguna (Context / LocalStorage) sebagai prioritas utama
    const currentContextUser = authUser || JSON.parse(localStorage.getItem("user") || "{}");
    let rawPackage = currentContextUser?.package_type || currentContextUser?.plan_id;

    // Jika data di user kosong, baru fallback ke data project terdekat
    if (!rawPackage && projects && projects.length > 0 && projects[0].package_type) {
      rawPackage = projects[0].package_type;
    }

    // Jika semuanya kosong, default ke FREE
    if (!rawPackage) rawPackage = "FREE";

    // Normalisasi data jika tipe data berupa Integer, String angka, atau String Nama Paket
    if (rawPackage === 1 || rawPackage === "1" || String(rawPackage).toUpperCase() === "FREE") return "FREE";
    if (rawPackage === 2 || rawPackage === "2" || String(rawPackage).toUpperCase() === "PRO") return "PRO";
    return String(rawPackage).toUpperCase();
  };

  const getBillingCycleString = () => {
    const currentContextUser = authUser || JSON.parse(localStorage.getItem("user") || "{}");
    return String(currentContextUser?.billing_cycle || "").toUpperCase();
  };

  const currentPackage = getPackageString(); 
  const billingCycle = getBillingCycleString();
  
  const isFreePackage = currentPackage === "FREE";
  const isProPackage = currentPackage === "PRO";

  // Evaluasi status Trial secara aman
  const isTrial = billingCycle === "TRIAL" && isProPackage;
  
  const currentContextUser = authUser || JSON.parse(localStorage.getItem("user") || "{}");
  
  // Jika paket sudah terdeteksi PRO, paksa flag expired menjadi false agar fitur tidak terkunci data lokal usang
  const hasExpiredTrial = isProPackage 
    ? false 
    : (currentContextUser?.expired_trial === true || currentContextUser?.expired_trial === 1);
  
  const isSuperAdmin = String(currentContextUser?.role || "").toUpperCase() === "SUPERADMIN";
  const isAdmin = String(currentContextUser?.role || "").toUpperCase() === "ADMIN";

  // Sesuai dengan billingController Anda: FREE limit adalah 1 project
  const projectLimit = 1;
  
  // Limit tercapai HANYA jika pengguna berada di paket FREE dan proyek melebihi batas, ATAU trial memang habis
  const reachedLimit = (isFreePackage && projects.length >= projectLimit) || hasExpiredTrial;

  const getRemainingDays = () => {
    if (!currentContextUser?.end_date) return 0;
    const diffTime = new Date(currentContextUser.end_date).getTime() - new Date().getTime();
    const remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return remaining > 0 ? remaining : 0;
  };

  const remainingDays = isTrial ? getRemainingDays() : 0;

  // ==========================
  // TOAST HANDLER
  // ==========================
  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast({ show: false, msg: "", type: "" });
    }, 3000);
  };

  // ==========================
  // FETCH DATA FROM API
  // ==========================
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects");
      const data = res.data?.data || res.data || [];
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Projects Error:", error);
      showToast("Gagal memuat project", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await api.get("/users");
      const data = res.data?.data || res.data || [];
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Team Members Error:", error);
      showToast("Gagal memuat daftar anggota tim untuk PO", "error");
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    const initPageData = async () => {
      if (refreshUser) {
        try {
          await refreshUser(); 
        } catch (err) {
          console.error("Refresh user context failed", err);
        }
      }
      fetchProjects();
      fetchTeamMembers();
    };
    
    initPageData();
  }, [refreshUser]);

  // ==========================
  // ACTIONS
  // ==========================
  const openCreate = () => {
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Admin yang dapat membuat proyek baru", "error");
      return;
    }
    if (hasExpiredTrial) {
      setModalReason("trial_expired");
      setUpgradeModal(true);
      return;
    }
    if (isFreePackage && projects.length >= projectLimit) {
      setModalReason("free_limit");
      setUpgradeModal(true);
      return;
    }
    setFormData(initialForm);
    setSelectedId(null);
    setIsEdit(false);
    setIsModalOpen(true);
  };

  const handleEdit = (e, project) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Admin yang dapat mengedit proyek", "error");
      return;
    }
    setSelectedId(project.id);
    setFormData({
      name: project.name || "",
      status: project.status || "hold",
      label: project.label || "external",
    });
    setIsEdit(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast("Akses Ditolak: Anda tidak memiliki hak memproses data ini", "error");
      return;
    }

    if (!isEdit && !formData.owner_id) {
      showToast("Pilih Akun PO terlebih dahulu", "error");
      return;
    }

    let cleanTenantId = currentContextUser?.tenant_id;
    if (!cleanTenantId || cleanTenantId === "NULL" || cleanTenantId === null) {
      cleanTenantId = 1; 
    }

    const payload = {
      ...formData,
      tenant_id: Number(cleanTenantId)
    };

    if (isEdit) {
      delete payload.owner_id;
    }

    try {
      if (isEdit) {
        await api.put(`/projects/${selectedId}`, payload);
        showToast("Project berhasil diperbarui");
      } else {
        await api.post("/projects", payload);
        showToast("Project berhasil dibuat");
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (error) {
      showToast(error.response?.data?.message || "Gagal menyimpan project", "error");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast("Akses Ditolak: Hanya Admin yang dapat menghapus proyek", "error");
      return;
    }
    const ok = window.confirm("Hapus project ini secara permanen?");
    if (!ok) return;

    try {
      await api.delete(`/projects/${id}`);
      showToast("Project berhasil dihapus");
      fetchProjects();
    } catch (error) {
      showToast("Gagal menghapus project", "error");
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "done": return "bg-green-100 text-green-700";
      case "on_progress":
      case "progress": return "bg-yellow-100 text-yellow-700";
      case "hold": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <>
      {/* TOAST SYSTEM */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[9999]">
          <div className={`px-5 py-3 rounded-xl shadow-lg text-white font-semibold ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
            {toast.msg}
          </div>
        </div>
      )}

      <div className="p-6">
        {/* BANNER TRIAL */}
        {isTrial && remainingDays > 0 && (
          <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
            remainingDays <= 3 
              ? "bg-red-50 border-red-200 text-red-900" 
              : "bg-yellow-50 border-yellow-200 text-yellow-900"
          }`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={remainingDays <= 3 ? "text-red-500" : "text-yellow-600"} size={20} />
              <div>
                <p className="font-semibold text-sm">
                  {remainingDays <= 3 
                    ? `Trial PRO Anda akan berakhir dalam ${remainingDays} hari!` 
                    : "Anda sedang menikmati akses penuh PRO Trial (7 Hari)."}
                </p>
                <p className="text-xs opacity-80 mt-0.5">Berakhir otomatis pada: {currentContextUser.end_date}</p>
              </div>
            </div>
            {remainingDays <= 3 && (
              <button
                onClick={() => navigate("/billing")}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm whitespace-nowrap"
              >
                Upgrade Sekarang
              </button>
            )}
          </div>
        )}

        {/* TOP INFOBAR */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="text-sm text-gray-400">Proyek &gt; Semua</div>
          <h1 className="text-3xl font-bold text-slate-800 mt-2">Proyek</h1>
          <p className="text-gray-500 mt-2">Halaman ini berisi daftar proyek Anda di ScrumApps.</p>
          
          <div className="mt-4 flex gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium uppercase">
              Paket : {currentPackage} {isTrial && "(TRIAL)"}
            </span>
            {isFreePackage && !hasExpiredTrial && (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                {projects.length}/{projectLimit} Project Digunakan
              </span>
            )}
            {hasExpiredTrial && (
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                Masa Trial Habis
              </span>
            )}
          </div>
        </div>

        {/* MAIN LIST CONTAINER */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8">
          <h2 className="text-3xl font-bold text-slate-800">Daftar Proyek</h2>
          <p className="text-gray-500 mt-2 mb-8">
            Halaman ini berisi daftar proyek yang ada sesuai hak akses dan kontribusi pengguna.
          </p>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[240px] rounded-3xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* BUTTON CARD */}
              {isAdmin && (
                <div className={`border border-gray-200 rounded-3xl h-[240px] flex flex-col items-center justify-center transition-all ${reachedLimit ? "bg-amber-50/50 border-amber-200 border-dashed" : "bg-white"}`}>
                  <h3 className="text-xl font-semibold mb-6">Buat Proyek Baru</h3>
                  <button
                    onClick={openCreate}
                    className={`px-8 py-3 rounded-xl flex items-center gap-2 font-semibold transition shadow-sm ${
                      reachedLimit 
                        ? "bg-amber-500 hover:bg-amber-600 text-white" 
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    <Plus size={18} />
                    {reachedLimit ? "Upgrade Paket" : "Tambah Proyek"}
                  </button>
                  {isFreePackage && !hasExpiredTrial && (
                    <p className="mt-4 text-xs text-center text-amber-600 font-medium px-6">
                      Maksimal {projectLimit} project untuk paket FREE.
                    </p>
                  )}
                  {hasExpiredTrial && (
                    <p className="mt-4 text-xs text-center text-red-600 font-medium px-6">
                      Masa uji coba PRO (Trial) telah berakhir.
                    </p>
                  )}
                </div>
              )}

              {/* CARD LOOP PROJECTS */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="bg-white border border-gray-200 rounded-3xl overflow-hidden cursor-pointer hover:shadow-lg transition flex flex-col justify-between h-[240px]"
                >
                  <div className="bg-red-50 h-16 relative">
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="absolute top-3 left-3 w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center shadow hover:bg-red-600 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base uppercase text-slate-800 line-clamp-1" title={project.name}>
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                          {project.name?.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-500 truncate max-w-[150px]">
                          {project.owner_name || "Project Owner"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase ${getStatusStyle(project.status)}`}>
                        {project.status === 'on_progress' ? 'progress' : project.status}
                      </span>
                      
                      {isAdmin && (
                        <button
                          onClick={(e) => handleEdit(e, project)}
                          className="flex items-center gap-1 text-red-500 font-semibold text-xs hover:text-red-600 transition"
                        >
                          <Edit3 size={12} />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>
      </div>

      {/* FORM INPUT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEdit ? "Edit Project" : "Tambah Project"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nama Project</label>
            <input
              type="text" required placeholder="Nama Project" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-700 font-medium"
            />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Akun PO</label>
              <select
                required
                value={formData.owner_id}
                onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                disabled={loadingMembers}
                className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-700 font-medium"
              >
                <option value="" disabled>
                  {loadingMembers ? "Memuat anggota tim..." : "Pilih Akun PO"}
                </option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.email ? `(${member.email})` : ""}
                  </option>
                ))}
              </select>
              {!loadingMembers && teamMembers.length === 0 && (
                <p className="text-[11px] text-amber-600 font-medium mt-1.5 ml-1">
                  Belum ada anggota tim yang di-invite. Undang anggota terlebih dahulu di menu Kelola Karyawan.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Status Kinerja</label>
            <select
              value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-700 font-medium"
            >
              <option value="hold">Hold</option>
              <option value="on_progress">Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Klasifikasi Label</label>
            <select
              value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-700 font-medium"
            >
              <option value="external">External (Klien)</option>
              <option value="internal">Internal (Tim)</option>
            </select>
          </div>
          <button className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition shadow-md pt-4">
            {isEdit ? "Update Data Project" : "Terbitkan Project Baru"}
          </button>
        </form>
      </Modal>

      {/* POPUP ALERT UPGRADE */}
      {upgradeModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setUpgradeModal(false)}></div>
          
          <div className="bg-white p-8 rounded-3xl max-w-md w-full relative z-10 shadow-2xl text-center">
            <div className="text-5xl mb-4">
              {modalReason === "trial_expired" ? "⚠️" : "🚀"}
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800">
              {modalReason === "trial_expired" ? "Masa Trial Berakhir" : "Limit Paket FREE Tercapai"}
            </h2>

            <p className="mt-3 text-gray-500 text-sm leading-relaxed">
              {modalReason === "trial_expired" ? (
                "Masa trial PRO Anda telah berakhir. Untuk melanjutkan penggunaan fitur tak terbatas dan integrasi manajemen penuh, silakan lakukan pembelian paket."
              ) : (
                `Paket FREE hanya dapat membuat maksimal ${projectLimit} project.`
              )}
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 my-4 text-left text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-700">Tetap Berlangganan untuk menikmati:</p>
              <p>✓ Unlimited Projects & Boards</p>
              <p>✓ GitHub Integration</p>
              <p>✓ PDF Export & Premium Reports</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setUpgradeModal(false);
                  navigate("/billing");
                }}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-semibold transition shadow-md"
              >
                {modalReason === "trial_expired" ? "Perpanjang Sekarang" : "Upgrade Sekarang"}
              </button>
              <button
                onClick={() => setUpgradeModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-sm font-medium transition"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectList;