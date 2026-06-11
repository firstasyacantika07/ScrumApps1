import React, { useState } from "react";
import Modal from "../../components/ui/Modal";
import api from "../../api/axios";

const RequestRepoModal = ({ isOpen, onClose, projectId, refreshData, isFreePackage }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    owner: "",
    repoName: "",
    repoUrl: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 🛠️ MENGIRIMKAN DATA FORMULIR SECARA LENGKAP
      await api.post(`/projects/${projectId}/github-requests`, {
        github_owner: formData.owner.trim(),      // Nama owner/organisasi
        github_repo: formData.repoName.trim(),    // Nama repositori
        github_url: formData.repoUrl.trim(),      // Menyertakan URL repositori yang wajib diisi
        request_upgrade: isFreePackage            // Memberi sinyal ke backend untuk sekalian memicu alur upgrade billing
      });
      
      // Reset form setelah berhasil
      setFormData({ owner: "", repoName: "", repoUrl: "" });
      onClose();
      
      if (refreshData) refreshData(); // Memicu re-fetch komponen utama agar status berubah ke 'PENDING'
    } catch (error) {
      console.error("🔥 Error posting github request:", error);
      setErrorMsg(error.response?.data?.message || "Gagal mengirim pengajuan integrasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isFreePackage ? "Ajukan Integrasi & Upgrade ke PRO" : "Ajukan Integrasi GitHub Repository"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        
        {/* Deskripsi Dinamis Mengikuti Status Paket Tenant */}
        <p className="text-xs text-gray-400 leading-relaxed">
          {isFreePackage ? (
            <span className="text-amber-600 font-medium">
              ⚠️ Project ini saat ini berada pada paket FREE. Mengirimkan formulir ini akan mengajukan registrasi repositori ke sistem dan secara otomatis mengirim permintaan resmi ke Super Admin Anda untuk melakukan upgrade langganan ke paket PRO.
            </span>
          ) : (
            "Masukkan informasi repositori target organisasi Anda dengan benar. Super Admin memerlukan data ini untuk memvalidasi dan melakukan koneksi token otentikasi (PAT)."
          )}
        </p>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Repository Owner / Organization</label>
          <input
            type="text" 
            required 
            placeholder="Contoh: perusahaan-tani"
            value={formData.owner}
            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Repository Name</label>
          <input
            type="text" 
            required 
            placeholder="Contoh: rawattani-app"
            value={formData.repoName}
            onChange={(e) => setFormData({ ...formData, repoName: e.target.value })}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Full Repository URL</label>
          <input
            type="url" 
            required 
            placeholder="Contoh: https://github.com/perusahaan-tani/rawattani-app"
            value={formData.repoUrl}
            onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800"
            disabled={loading}
          />
        </div>

        {/* Tombol Aksi Menyesuaikan Keadaan Logika Bisnis */}
        <button
          disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition shadow-md mt-2 text-white ${
            isFreePackage 
              ? "bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300" 
              : "bg-slate-800 hover:bg-slate-900 disabled:bg-gray-300"
          }`}
        >
          {loading ? "Mengirim Pengajuan..." : isFreePackage ? "Ajukan Integrasi & Minta Upgrade" : "Kirim Pengajuan Integrasi"}
        </button>
      </form>
    </Modal>
  );
};

export default RequestRepoModal;