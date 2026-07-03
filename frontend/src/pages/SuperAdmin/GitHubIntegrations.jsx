import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import * as Lucide from "lucide-react"; 

const GitHubIntegrations = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, msg: "", type: "" });

  // 🔧 FIX: Deteksi role user yang login untuk membatasi tombol AKSI hanya
  // untuk Superadmin (backend githubController.js sudah menolak permintaan
  // approve/reject/sync-webhook/disconnect dari role selain superadmin --
  // ini melengkapi sisi tampilan supaya Admin tidak lihat tombol yang
  // ujungnya cuma akan gagal/403 kalau diklik).
  //
  // Karena struktur penyimpanan auth di project ini tidak dipastikan,
  // fungsi ini coba beberapa pola localStorage yang umum dipakai secara
  // berurutan. Kalau semuanya gagal, dianggap BUKAN superadmin (fail-safe:
  // lebih aman menyembunyikan tombol daripada salah menampilkannya).
  const getCurrentUserRole = () => {
    // Pola 1: objek user tersimpan utuh, mis. localStorage.setItem('user', JSON.stringify(user))
    try {
      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (parsed?.role) return String(parsed.role).toLowerCase();
      }
    } catch (e) {
      // 'user' bukan JSON valid -> lanjut coba pola lain
    }

    // Pola 2: role disimpan langsung sebagai string
    const directRole = localStorage.getItem("role");
    if (directRole) return directRole.toLowerCase();

    // Pola 3: decode payload JWT di localStorage 'token'
    try {
      const token = localStorage.getItem("token");
      if (token && token.split(".").length === 3) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.role) return String(payload.role).toLowerCase();
      }
    } catch (e) {
      // token tidak valid / bukan JWT standar -> lanjut, biarkan return null di bawah
    }

    return null;
  };

  const currentUserRole = getCurrentUserRole();
  const isSuperadmin = currentUserRole === "superadmin";

  const { 
    GitBranch, Loader2, Check, X, Link2Off, Webhook, Github, ArrowRight 
  } = Lucide;

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "" }), 3000);
  };

  // FIX 1: Sesuaikan endpoint ke rute baru pusat (/api/github/requests atau /api/projects/github/requests)
  // Tergantung pada prefix route base di file server Anda (misal: app.use('/api/github', githubRoutes))
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/github/requests"); 
      setRequests(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (error) {
      console.error(error);
      showToast("Gagal mengambil data pengajuan repo", "error");
    } finally {
      setLoading(false);
    }
  };

  // Tangani redirect balik dari GitHub OAuth (success/error di query param)
  useEffect(() => {
    const success = searchParams.get("success");
    const error   = searchParams.get("error");

    if (success === "connected") {
      showToast("Repositori GitHub berhasil terhubung!", "success");
      navigate("/github-integrations", { replace: true });
      fetchRequests();
    } else if (error) {
      const errorMessages = {
        oauth_denied:      "Otentikasi GitHub dibatalkan oleh pengguna.",
        missing_params:    "Parameter OAuth tidak lengkap dari GitHub.",
        token_failed:      "Gagal menukar kode OAuth dengan access token.",
        request_not_found: "ID pengajuan tidak ditemukan di database.",
        server_error:      "Terjadi kesalahan server saat proses OAuth.",
      };
      showToast(errorMessages[error] || `Error OAuth: ${error}`, "error");
      navigate("/github-integrations", { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    fetchRequests();
  }, []);

  // Panggil PUT /requests/:id/approve untuk perbarui status DB dan dapatkan oauth_url
  const handleApproveAndConnect = async (requestId) => {
    try {
      showToast("Memproses persetujuan...", "success");

      const approveRes = await api.put(`/github/requests/${requestId}/approve`);
      const oauthUrl = approveRes.data?.oauth_url;

      if (!oauthUrl) {
        showToast("Gagal mendapatkan URL OAuth dari server", "error");
        return;
      }

      showToast("Mengarahkan ke otentikasi GitHub...", "success");
      sessionStorage.setItem("pending_request_id", requestId);

      setTimeout(() => {
        window.location.href = oauthUrl;
      }, 800);

    } catch (error) {
      console.error(error);
      showToast(
        error.response?.data?.error || "Gagal memproses otentikasi GitHub",
        "error"
      );
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Tolak pengajuan integrasi repositori ini?")) return;
    try {
      await api.put(`/github/requests/${id}/reject`);
      showToast("Pengajuan berhasil ditolak", "success");
      fetchRequests();
    } catch (error) {
      console.error(error);
      showToast("Gagal menolak pengajuan", "error");
    }
  };

  // FIX 2: Sesuaikan URL disconnect ke endpoint /github/:id murni (tanpa nested projects)
  const handleDisconnect = async (id) => {
    if (!window.confirm("Putuskan koneksi GitHub dari project ini? Otomatisasi Kanban akan terhenti.")) return;
    try {
      await api.delete(`/github/${id}`); 
      showToast("Koneksi repositori diputuskan", "success");
      fetchRequests();
    } catch (error) {
      console.error(error);
      showToast("Gagal memutuskan koneksi", "error");
    }
  };

  // FIX 3: Sesuaikan endpoint konfigurasi webhook ke POST /github/project/:projectId/webhooks
  const handleConfigureWebhook = async (projectId) => {
    if (!projectId) {
      showToast("Gagal mengonfigurasi: Project ID tidak valid", "error");
      return;
    }
    try {
      showToast("Mengonfigurasi webhook repositori...", "success");
      const res = await api.post(`/github/project/${projectId}/webhooks`);
      if (res.data?.success || res.status === 200 || res.status === 201) {
        showToast("Webhook GitHub berhasil aktif!");
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        showToast(
          error.response.data?.message || "Webhook sudah aktif di repositori ini.", 
          "success"
        );
      } else {
        console.error("Gagal konfigurasi webhook:", error);
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

  const getStatusStyle = (status) => {
    switch (status) {
      case "CONNECTED":
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm shadow-emerald-100/50";
      case "PENDING":
        return "bg-amber-50 text-amber-700 border border-amber-200 shadow-sm shadow-amber-100/50";
      case "APPROVED":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      default:
        return "bg-rose-50 text-rose-700 border border-rose-200 shadow-sm shadow-rose-100/50";
    }
  };

  const getDotStyle = (status) => {
    switch (status) {
      case "CONNECTED":
      case "ACTIVE":    return "bg-emerald-500 animate-pulse";
      case "PENDING":   return "bg-amber-500 animate-pulse";
      case "APPROVED":  return "bg-blue-500 animate-pulse";
      default:          return "bg-rose-500";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "CONNECTED": return "Connected";
      case "ACTIVE":    return "Active";
      case "PENDING":   return "Pending";
      case "APPROVED":  return "Approved";
      default:          return status || "Rejected";
    }
  };

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen font-sans">
      {/* TOAST */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[9999] px-5 py-3.5 rounded-xl shadow-xl text-white font-medium flex items-center gap-2 transition-all duration-300 ${
          toast.type === "error" ? "bg-red-600" : "bg-slate-900"
        }`}>
          {toast.type === "error" ? <X size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
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

      {/* TABLE */}
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
                  <th className="py-3.5 px-6">Tenant</th>
                  <th className="py-3.5 px-6">Diajukan Oleh</th>
                  <th className="py-3.5 px-6">Repository</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-center">Aksi / Kontrol Sistem</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                {requests.map((req) => {
                  const currentStatus = req.status ? req.status.toUpperCase() : "";
                  const isConnected = currentStatus === "CONNECTED" || currentStatus === "ACTIVE";
                  const isPending   = currentStatus === "PENDING";
                  const isApproved  = currentStatus === "APPROVED";
                  const isRejected  = !isConnected && !isPending && !isApproved;

                  // FIX 4: Mapping diselaraskan dengan alias SQL database (repository_owner & repository_name)
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/40 transition-colors duration-150">
                      <td className="py-4 px-6 font-semibold text-slate-800">{req.project_name}</td>
                      <td className="py-4 px-6 text-slate-500">
                        {req.tenant_name ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {req.tenant_name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Tanpa Nama Tenant</span>
                        )}
                      </td>
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
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(currentStatus)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getDotStyle(currentStatus)}`} />
                          {getStatusLabel(currentStatus)}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {isPending && (
                            isSuperadmin ? (
                              <>
                                <button
                                  onClick={() => handleApproveAndConnect(req.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-all duration-150 shadow-sm shadow-emerald-200 flex items-center gap-1 text-xs font-semibold"
                                >
                                  {Check && <Check size={14} />} Connect Repo
                                </button>
                                <button
                                  onClick={() => handleReject(req.id)}
                                  className="bg-white hover:bg-rose-600 text-rose-600 hover:text-white px-3 py-1.5 rounded-lg border border-rose-200 hover:border-rose-600 transition-all duration-150 text-xs font-medium flex items-center gap-1"
                                >
                                  {X && <X size={14} />} Reject Request
                                </button>
                              </>
                            ) : (
                              // 🔧 FIX: Admin tenant hanya boleh melihat status, tidak bisa approve/reject.
                              <span className="text-xs text-amber-500 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-md font-medium italic">
                                Menunggu tindakan Superadmin
                              </span>
                            )
                          )}

                          {isApproved && (
                            <span className="text-xs text-blue-500 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md font-medium italic">
                              Menunggu OAuth GitHub...
                            </span>
                          )}
                          
                          {isConnected && (
                            isSuperadmin ? (
                              <>
                                <button
                                  onClick={() => handleConfigureWebhook(req.project_id)}
                                  className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg transition-all duration-150 shadow-sm text-xs font-semibold flex items-center gap-1.5"
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
                            ) : (
                              // 🔧 FIX: Admin tenant cuma bisa lihat status koneksi, tidak bisa
                              // sync webhook / disconnect -- itu wewenang Superadmin.
                              <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md font-medium italic">
                                Dikelola oleh Superadmin
                              </span>
                            )
                          )}
                          
                          {isRejected && (
                            <span className="text-xs text-rose-400 bg-rose-50/50 border border-rose-100 px-2.5 py-1 rounded-md font-medium italic">
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