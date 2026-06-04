import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/ui/Modal";
import api from "../api/axios";
import {
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
} from "lucide-react";

const ProjectList = () => {
  const navigate = useNavigate();

  // ==========================
  // STATES
  // ==========================
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [modalReason, setModalReason] = useState(""); // "free_limit" atau "trial_expired"

  const [userData, setUserData] = useState(() => {
    return JSON.parse(localStorage.getItem("user") || "{}");
  });

  const [toast, setToast] = useState({ show: false, msg: "", type: "" });

  const initialForm = {
    name: "",
    status: "hold",
    start_date: "",
    end_date: "",
    label: "external",
  };

  const [formData, setFormData] = useState(initialForm);

  // ==========================
  // DERIVED STATES & ALUR TRIAL
  // ==========================
  const currentPackage = (userData?.package_type || "FREE").toUpperCase();
  const billingCycle = (userData?.billing_cycle || "").toUpperCase();
  const isTrial = billingCycle === "TRIAL" && currentPackage === "PRO";
  const hasExpiredTrial = userData?.expired_trial === true;
  
  // 🔥 VALIDASI ROLE: Kebal dari masalah huruf besar/kecil (case-insensitive)
  const isSuperAdmin = userData?.role?.toUpperCase() === "SUPERADMIN";

  // Aturan Batasan Pembuatan Project Baru
  const projectLimit = 1;
  const isFreePackage = currentPackage === "FREE";
  
  // Terkena limit jika paket FREE murni (dan project >= 1) ATAU eks-trial yang sudah kedaluwarsa
  const reachedLimit = (isFreePackage && projects.length >= projectLimit) || hasExpiredTrial;

  // Hitung Sisa Hari Trial (Jika Sedang Aktif)
  const getRemainingDays = () => {
    if (!userData?.end_date) return 0;
    const remaining = Math.ceil(
      (new Date(userData.end_date) - new Date()) / (1000 * 60 * 60 * 24)
    );
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

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUserData(localUser);
    fetchProjects();
  }, []);

  // ==========================
  // ACTIONS (Kunci Validasi Fungsi)
  // ==========================
  const openCreate = () => {
    if (!isSuperAdmin) {
      showToast("Akses Ditolak: Hanya Superadmin yang dapat membuat proyek baru", "error");
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
    if (!isSuperAdmin) {
      showToast("Akses Ditolak: Hanya Superadmin yang dapat mengedit proyek", "error");
      return;
    }
    setSelectedId(project.id);
    setFormData({
      name: project.name || "",
      status: project.status || "hold",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      label: project.label || "external",
    });
    setIsEdit(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast("Akses Ditolak: Anda tidak memiliki hak memproses data ini", "error");
      return;
    }
    try {
      if (isEdit) {
        await api.put(`/projects/${selectedId}`, formData);
        showToast("Project berhasil diperbarui");
      } else {
        await api.post("/projects", formData);
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
    if (!isSuperAdmin) {
      showToast("Akses Ditolak: Hanya Superadmin yang dapat menghapus proyek", "error");
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
        {isTrial && (
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
                <p className="text-xs opacity-80 mt-0.5">Berakhir otomatis pada: {userData.end_date}</p>
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
              
              {/* 🔥 BUTTON CARD: Sekarang terbungkus penuh & hanya tampil untuk SUPERADMIN murni */}
              {isSuperAdmin && (
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
                  {isFreePackage && !hasExpiredTrial && projects.length >= projectLimit && (
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
                    {/* 🔥 BUTTON TRASH: Hanya dirender di DOM untuk SUPERADMIN */}
                    {isSuperAdmin && (
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
                      
                      {/* 🔥 BUTTON EDIT: Hanya dirender di DOM untuk SUPERADMIN */}
                      {isSuperAdmin && (
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
          <input
            type="text" required placeholder="Nama Project" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
          <select
            value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          >
            <option value="hold">Hold</option>
            <option value="on_progress">Progress</option>
            <option value="done">Done</option>
          </select>
          <button className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition shadow-md">
            {isEdit ? "Update Project" : "Buat Project"}
          </button>
        </form>
      </Modal>

      {/* POPUP ALERT UPGRADE */}
      {upgradeModal && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setUpgradeModal(false)}></div>
          
          <div className="bg-white p-8 rounded-3xl max-w-md w-full relative z-10 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
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