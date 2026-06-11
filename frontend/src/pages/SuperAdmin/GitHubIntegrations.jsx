import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import * as Lucide from "lucide-react"; 

const GitHubIntegrations = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });

  const { 
    GitBranch, Loader2, Check, X, Link2Off, Webhook, Github, ArrowRight 
  } = Lucide;

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "" }), 3000);
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects/github/requests");
      setRequests(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (error) {
      console.error(error);
      showToast("Gagal mengambil data pengajuan repo", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproveAndConnect = async (requestId) => {
    try {
      showToast("Mengarahkan ke otentikasi GitHub...", "success");
      sessionStorage.setItem("pending_request_id", requestId);
      
      const res = await api.get(`/projects/github/oauth-url?request_id=${requestId}`);
      if (res.data?.url) {
        window.location.href = res.data.url; 
      }
    } catch (error) {
      console.error(error);
      showToast("Gagal memproses otentikasi GitHub", "error");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Tolak pengajuan integrasi repositori ini?")) return;
    try {
      await api.put(`/projects/github/requests/${id}/reject`);
      showToast("Pengajuan berhasil ditolak", "success");
      fetchRequests();
    } catch (error) {
      console.error(error);
      showToast("Gagal menolak pengajuan", "error");
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm("Putuskan koneksi GitHub dari project ini? Otomatisasi Kanban akan terhenti.")) return;
    try {
      await api.delete(`/projects/github/integrations/${id}`);
      showToast("Koneksi repositori diputuskan", "success");
      fetchRequests();
    } catch (error) {
      console.error(error);
      showToast("Gagal memutuskan koneksi", "error");
    }
  };

  const handleConfigureWebhook = async (projectId) => {
    if (!projectId) {
      showToast("Gagal mengonfigurasi: Project ID tidak valid", "error");
      return;
    }
    try {
      showToast("Mengonfigurasi webhook repositori...", "success");
      const res = await api.post(`/projects/${projectId}/github-webhooks`);
      if (res.data?.success || res.status === 200 || res.status === 201) {
        showToast("Webhook GitHub berhasil aktif!");
      }
    } catch (error) {
      // 🌟 FIX: Mencegat status 409 (Conflict) agar ditangani sebagai informasi sukses, bukan error crash
      if (error.response && error.response.status === 409) {
        showToast(
          error.response.data?.message || "Webhook sudah aktif dan terkonfigurasi di repositori ini.", 
          "success"
        );
      } else {
        console.error("❌ Gagal konfigurasi webhook:", error);
        showToast(
          error.response?.data?.message || "Gagal mendaftarkan webhook ke GitHub", 
          "error"
        );
      }
    }
  };

  const formatRepoUrl = (url) => {
    if (!url) return "#";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen font-sans">
      {/* TOAST SYSTEM */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3.5 rounded-xl shadow-xl text-white font-medium flex items-center gap-2 transition-all duration-300 transform translate-y-0 ${
          toast.type === "error" ? "bg-red-600" : "bg-slate-900"
        }`}>
          {toast.type === "error" ? <X size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span>Super Admin</span>
          <ArrowRight size={12} className="text-slate-300" />
          <span className="text-slate-600 font-semibold">GitHub Integrations</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mt-2 flex items-center gap-2.5">
          <div className="p-2 bg-slate-100 rounded-xl">
            {GitBranch && <GitBranch className="text-slate-700" size={22} />}
          </div>
          GitHub Integration Center
        </h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-3xl">
          Pusat kendali integrasi repositori internal ScrumApps. Kelola hak otentikasi webhook kanban, validasi permintaan dari Business Analyst, serta pantau tautan repositori secara real-time.
        </p>
      </div>

      {/* MAIN CONTAINER TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Daftar Pengajuan Log Integrasi</h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
            Total: {requests.length} Data
          </span>
        </div>
        
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            {Loader2 && <Loader2 className="animate-spin text-indigo-600" size={36} />}
            <p className="text-xs text-slate-400 font-medium tracking-wide">Memuat data integrasi...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center gap-2">
            <div className="p-3 bg-slate-50 rounded-full text-slate-300 mb-1">
              {Github && <Github size={32} />}
            </div>
            Tidak ada riwayat atau berkas pengajuan integrasi GitHub ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs uppercase font-semibold tracking-wider">
                  <th className="py-3.5 px-6">Nama Project</th>
                  <th className="py-3.5 px-6">Diajukan Oleh</th>
                  <th className="py-3.5 px-6">Repository</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Aksi / Kontrol Sistem</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                {requests.map((req) => {
                  const currentStatus = req.status ? req.status.toUpperCase() : "";
                  
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                      <td className="py-4 px-6 font-semibold text-slate-800">{req.project_name}</td>
                      <td className="py-4 px-6 text-slate-500 font-medium">{req.requester_name || "Business Analyst"}</td>
                      <td className="py-4 px-6">
                        <a 
                          href={formatRepoUrl(req.repository_url)} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium inline-flex items-center gap-1.5 group"
                        >
                          {Github && <Github size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />}
                          {req.repository_owner}/{req.repository_name}
                        </a>
                      </td>
                      
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          currentStatus === "ACTIVE" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm shadow-emerald-100/50" 
                            : currentStatus === "PENDING" 
                            ? "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm shadow-amber-100/50" 
                            : "bg-rose-50 text-rose-700 border border-rose-200 shadow-sm shadow-rose-100/50"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            currentStatus === "ACTIVE" ? "bg-emerald-500 animate-pulse" :
                            currentStatus === "PENDING" ? "bg-amber-500 animate-pulse" : "bg-rose-500"
                          }`} />
                          {currentStatus === "ACTIVE" && "Active"}
                          {currentStatus === "PENDING" && "Pending"}
                          {currentStatus !== "ACTIVE" && currentStatus !== "PENDING" && "Rejected"}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {currentStatus === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleApproveAndConnect(req.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-all duration-150 shadow-sm shadow-emerald-200 flex items-center gap-1 text-xs font-semibold"
                              >
                                {Check && <Check size={14} />} Connect Repo
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                className="bg-white hover:bg-rose-600 text-rose-600 hover:text-white px-3 py-1.5 rounded-lg border border-rose-200 hover:border-rose-600 transition-all duration-150 text-xs font-medium"
                              >
                                {X && <X size={14} />} Reject Request
                              </button>
                            </>
                          )}
                          
                          {currentStatus === "ACTIVE" && (
                            <>
                              <button
                                onClick={() => handleConfigureWebhook(req.project_id || req.id)}
                                className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg transition-all duration-150 shadow-sm text-xs font-semibold flex items-center gap-1.5"
                                title="Konfigurasi Webhook Kanban"
                              >
                                {Webhook && <Webhook size={13} className="text-slate-300" />} Sync Webhook
                              </button>
                              
                              <button
                                onClick={() => handleDisconnect(req.id)}
                                className="bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg border border-rose-200 transition-all duration-150 text-xs font-semibold flex items-center gap-1.5"
                              >
                                {Link2Off && <Link2Off size={13} />} Disconnect
                              </button>
                            </>
                          )}
                          
                          {currentStatus !== "PENDING" && currentStatus !== "ACTIVE" && (
                            <span className="text-xs text-rose-400 bg-rose-50/50 border border-rose-100 px-2.5 py-1 rounded-md font-medium select-none italic">
                              Archived / Rejected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubIntegrations;