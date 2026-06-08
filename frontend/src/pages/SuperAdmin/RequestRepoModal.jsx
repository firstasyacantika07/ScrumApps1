import React, { useState } from "react";
import Modal from "../../components/ui/Modal";
import api from "../../api/axios";

const RequestRepoModal = ({ isOpen, onClose, projectId, refreshData }) => {
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
      // 🛠️ PERBAIKAN: Mengirimkan data dari state formData yang benar dan valid
      await api.post(`/projects/${projectId}/github-requests`, {
        github_owner: formData.owner,      // Mengambil nilai owner dari input form
        github_repo: formData.repoName,   // Mengambil nilai repoName dari input form
      });
      
      // Reset form setelah berhasil
      setFormData({ owner: "", repoName: "", repoUrl: "" });
      onClose();
      
      if (refreshData) refreshData(); // Trigger re-fetch status integrasi di detail project
    } catch (error) {
      console.error("🔥 Error posting github request:", error);
      setErrorMsg(error.response?.data?.message || "Gagal mengirim pengajuan integrasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajukan Integrasi GitHub Repository">
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        <p className="text-xs text-gray-400 leading-relaxed">
          Masukkan informasi repositori target organisasi Anda dengan benar. Super Admin memerlukan data ini untuk melakukan koneksi otentikasi.
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
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <button
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition shadow-md mt-2"
        >
          {loading ? "Mengirim Pengajuan..." : "Kirim Pengajuan Integrasi"}
        </button>
      </form>
    </Modal>
  );
};

export default RequestRepoModal;