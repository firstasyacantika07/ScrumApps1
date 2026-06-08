import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import * as Lucide from "lucide-react"; 

const GitHubIntegrations = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });

  const GitBranch = Lucide.GitBranch;
  const Loader2 = Lucide.Loader2;
  const Check = Lucide.Check;
  const X = Lucide.X;
  const Link2Off = Lucide.Link2Off;
  const Webhook = Lucide.Webhook; // 🛠️ Icon tambahan untuk aksi webhook

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
      showToast("Margarahkan ke otentikasi GitHub...", "success");
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
      showToast("Pengajuan berhasil ditolak");
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
      showToast("Koneksi repositori diputuskan");
      fetchRequests();
    } catch (error) {
      console.error(error);
      showToast("Gagal memutuskan koneksi", "error");
    }
  };

  // 🛠️ BARU: Fungsi untuk mengonfigurasi Webhook Kanban secara otomatis dari Dashboard Superadmin
  const handleConfigureWebhook = async (projectId) => {
    try {
      showToast("Mengonfigurasi webhook repositori...", "success");
      const res = await api.post(`/projects/${projectId}/github-webhooks`);
      if (res.data?.success) {
        showToast("Webhook GitHub berhasil aktif!");
      }
    } catch (error) {
      console.error(error);
      showToast("Gagal mendaftarkan webhook ke GitHub", "error");
    }
  };

  return (
    <div className="p-6">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3 rounded-xl shadow-lg text-white font-semibold ${
          toast.type === "error" ? "bg-red-600" : "bg-slate-800"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="text-sm text-gray-400">Super Admin &gt; GitHub Integrations</div>
        <h1 className="text-3xl font-bold text-slate-800 mt-2 flex items-center gap-2">
          {GitBranch && <GitBranch className="text-slate-700" />} GitHub Integration Center
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Pusat kendali integrasi repositori. Setujui permintaan dari Business Analyst dan kelola pemetaan Webhook Kanban SaaS secara instan.
        </p>
      </div>

      {/* TABLE LIST REQUEST */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Semua Pengajuan Repositori</h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            {Loader2 && <Loader2 className="animate-spin text-red-500" size={32} />}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Tidak ada riwayat pengajuan integrasi GitHub.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase font-semibold">
                  <th className="py-3 px-4">Nama Project</th>
                  <th className="py-3 px-4">Diajukan Oleh</th>
                  <th className="py-3 px-4">Repository</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4 font-semibold">{req.project_name}</td>
                    <td className="py-4 px-4">{req.requester_name || "Business Analyst"}</td>
                    <td className="py-4 px-4">
                      <a href={req.repository_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {req.repository_owner}/{req.repository_name}
                      </a>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                        req.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {req.status === "PENDING" && (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleApproveAndConnect(req.id)}
                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition shadow-sm flex items-center gap-1 text-xs font-medium"
                          >
                            {Check && <Check size={14} />} Connect
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition text-xs font-medium"
                          >
                            {X && <X size={14} />} Reject
                          </button>
                        </div>
                      )}
                      
                      {/* 🛠️ DISELARASKAN: Menggunakan status ACTIVE sesuai database */}
                      {req.status === "ACTIVE" && (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleConfigureWebhook(req.id)} // Menggunakan id integrasi/project
                            className="text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition text-xs font-semibold flex items-center gap-1"
                          >
                            {Webhook && <Webhook size={14} className="text-slate-500" />} Webhook
                          </button>
                          
                          <button
                            onClick={() => handleDisconnect(req.id)}
                            className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition text-xs font-semibold flex items-center gap-1"
                          >
                            {Link2Off && <Link2Off size={14} />} Disconnect
                          </button>
                        </div>
                      )}
                      
                      {req.status === "REJECTED" && <div className="text-center text-gray-400 text-xs">-</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubIntegrations;