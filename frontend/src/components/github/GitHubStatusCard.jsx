import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Lucide from "lucide-react";
import api from "../../api/axios";
import RequestRepoModal from "../../pages/SuperAdmin/RequestRepoModal";

const GitHubStatusCard = ({ project, integrationData, refreshData }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [personalUsername, setPersonalUsername] = useState("");
  const [isConnectingDev, setIsConnectingDev] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Deklarasi variabel ikon terpusat dengan fallback aman
  const GithubIcon = Lucide.Github || Lucide.GitHub || Lucide.GitBranch;
  const Lock = Lucide.Lock;
  const Clock = Lucide.Clock;
  const CheckCircle2 = Lucide.CheckCircle2;
  const ChevronRight = Lucide.ChevronRight;
  const RefreshCw = Lucide.RefreshCw;
  const Webhook = Lucide.Webhook;
  const Key = Lucide.Key;
  const UserCheck = Lucide.UserCheck;

  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = userData?.role?.toUpperCase()?.replace(/\s+/g, '') || "";
  
  // Pemetaan Role Sesuai Matriks Baru
  const isSuperAdmin = userRole === "SUPERADMIN";
  const isBA = userRole === "BUSINESSANALYST";
  const isDeveloper = userRole === "DEVELOPER";
  const isProjectOwner = userRole === "PROJECTOWNER";
  
  const isFreePackage = (userData?.package_type || "FREE").toUpperCase() === "FREE";

  const showFeedback = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  // 🛠️ AKSI BA: Sinkronisasi Backlog ke GitHub Issues
  const handleSyncBacklog = async () => {
    try {
      setLoadingAction(true);
      const projectId = project?.id || project?.project_id;
      const res = await api.post(`/projects/${projectId}/github-sync-backlog`);
      if (res.data?.success) showFeedback(res.data.message, "success");
    } catch (err) {
      console.error(err);
      showFeedback("Gagal menyelaraskan backlog ke GitHub", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // 🛠️ AKSI DEVELOPER: Menghubungkan Akun Personal GitHub
  const handleConnectPersonalDev = async (e) => {
    e.preventDefault();
    if (!personalUsername.trim()) return;
    try {
      setLoadingAction(true);
      const res = await api.post("/projects/github/connect-personal", {
        github_username: personalUsername.trim()
      });
      if (res.data?.success) {
        showFeedback("Akun personal Anda berhasil ditautkan!", "success");
        setIsConnectingDev(false);
        setPersonalUsername("");
      }
    } catch (err) {
      console.error(err);
      showFeedback("Gagal menautkan akun personal", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // 🛠️ AKSI SUPERADMIN: Cepat Konfigurasi Webhook dari Project View
  const handleQuickWebhook = async () => {
    try {
      setLoadingAction(true);
      const projectId = project?.id || project?.project_id;
      const res = await api.post(`/projects/${projectId}/github-webhooks`);
      if (res.data?.success) showFeedback("Webhook berhasil terkonfigurasi aktif!", "success");
    } catch (err) {
      console.error(err);
      showFeedback("Gagal mengonfigurasi webhook", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // KONDISI 1: Fitur Terkunci oleh Paket FREE SaaS
  if (isFreePackage) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-3xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-4 right-4 text-slate-300">{Lock && <Lock size={40} />}</div>
        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
          {GithubIcon && <GithubIcon size={22} />} Integrasi GitHub
        </div>
        <p className="text-gray-500 text-xs mt-2 max-w-sm leading-relaxed">
          Otomatisasi pembuatan Backlog ScrumApps menjadi GitHub Issues & sinkronisasi Kanban. Fitur ini terkunci pada paket FREE.
        </p>
        {isSuperAdmin ? (
          <button
            onClick={() => navigate("/billing")}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            Upgrade ke Paket PRO
          </button>
        ) : (
          <p className="mt-4 text-xs text-amber-600 font-medium flex items-center gap-1">
            {Lock && <Lock size={12} />} Hubungi Super Admin Anda untuk upgrade paket.
          </p>
        )}
      </div>
    );
  }

  // KONDISI 2: Sudah Terhubung Aktif (ACTIVE atau APPROVED)
  if (integrationData?.status === "ACTIVE" || integrationData?.status === "APPROVED") {
    return (
      <div className="bg-white border border-green-100 rounded-3xl p-6 shadow-sm">
        {msg.text && (
          <div className={`mb-3 p-2.5 rounded-xl text-xs font-semibold text-white ${msg.type === "error" ? "bg-red-500" : "bg-slate-800"}`}>
            {msg.text}
          </div>
        )}

        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            {GithubIcon && <GithubIcon size={22} className="text-slate-900" />} GitHub Repository
          </div>
          <span className="bg-green-100 text-green-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase">
            {CheckCircle2 && <CheckCircle2 size={10} />} Connected
          </span>
        </div>
        
        <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-xs text-gray-400 font-medium">Repository Terhubung:</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5 uppercase truncate">
            {integrationData?.github_owner} / {integrationData?.github_repo}
          </p>
        </div>

        {/* AREA GRUP AKSI BERDASARKAN MATRIKS ROLE USER */}
        <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
          
          {/* Aksi Khusus Business Analyst (BA): Sync Backlog */}
          {isBA && (
            <button
              onClick={handleSyncBacklog}
              disabled={loadingAction}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1 shadow-sm disabled:opacity-50"
            >
              {RefreshCw && <RefreshCw size={12} className={loadingAction ? "animate-spin" : ""} />} Sync Backlog
            </button>
          )}

          {/* Aksi Khusus Super Admin: Configure Webhook & Quick Links */}
          {isSuperAdmin && (
            <>
              <button
                onClick={handleQuickWebhook}
                disabled={loadingAction}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1"
              >
                {Webhook && <Webhook size={12} />} Webhook
              </button>
              <button
                onClick={() => navigate("/github-integrations")}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                {Key && <Key size={12} />} Manage PAT
              </button>
            </>
          )}

          {/* Aksi Khusus Developer: Menghubungkan Akun Personal GitHub untuk Auto Update Kanban */}
          {isDeveloper && (
            <div className="w-full">
              {!isConnectingDev ? (
                <button
                  onClick={() => setIsConnectingDev(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1"
                >
                  {UserCheck && <UserCheck size={12} />} Connect Personal Account
                </button>
              ) : (
                <form onSubmit={handleConnectPersonalDev} className="mt-2 flex gap-1.5 w-full">
                  <input
                    type="text"
                    placeholder="Username GitHub Anda"
                    value={personalUsername}
                    onChange={(e) => setPersonalUsername(e.target.value)}
                    className="border border-gray-200 text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:border-slate-400"
                    disabled={loadingAction}
                  />
                  <button
                    type="submit"
                    disabled={loadingAction || !personalUsername.trim()}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 rounded-xl transition disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConnectingDev(false)}
                    className="bg-gray-100 text-gray-500 text-xs px-2.5 rounded-xl hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Keterangan bagi Project Owner (Hanya Berhak Melihat Status & Aktivitas) */}
          {isProjectOwner && (
            <p className="text-[11px] text-gray-400 italic">
              Mode peninjauan aktif. Anda memiliki akses penuh untuk memantau status & aktivitas integrasi.
            </p>
          )}
        </div>

        <div className="mt-3 flex justify-between items-center text-[11px] text-gray-400">
          <span>Oleh: {integrationData?.requester_name || "Super Admin"}</span>
          {isSuperAdmin && (
            <button
              onClick={() => navigate("/superadmin/github-integrations")}
              className="text-red-500 hover:underline font-semibold flex items-center"
            >
              Kelola Hubungan {ChevronRight && <ChevronRight size={12} />}
            </button>
          )}
        </div>
      </div>
    );
  }

  // KONDISI 3: Menunggu Persetujuan Super Admin (PENDING)
  if (integrationData?.status === "PENDING") {
    return (
      <div className="bg-white border border-amber-100 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            {GithubIcon && <GithubIcon size={22} />} Integrasi GitHub
          </div>
          <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase">
            {Clock && <Clock size={10} />} Pending Approval
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Repositori <span className="font-semibold text-slate-700">{integrationData?.github_owner}/{integrationData?.github_repo}</span> sedang menunggu aktivasi oleh Super Admin organisasi Anda.
        </p>
        {isSuperAdmin && (
          <button
            onClick={() => navigate("/superadmin/github-integrations")}
            className="mt-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            Tinjau di Integration Center
          </button>
        )}
      </div>
    );
  }

  // KONDISI 4: Belum Ada Pengajuan Sama Sekali (integrationData === null atau REJECTED)
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
          {GithubIcon && <GithubIcon size={22} />} Integrasi GitHub
        </div>
        <p className="text-gray-500 text-xs mt-2 leading-relaxed">
          Hubungkan project ini ke repositori GitHub organisasi untuk menyinkronkan data Backlog secara real-time.
        </p>
        
        {isSuperAdmin || isBA ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            {isSuperAdmin ? "Connect Repository" : "Request Repository"}
          </button>
        ) : (
          <p className="mt-4 text-xs text-slate-400 font-medium flex items-center gap-1">
            {Lock && <Lock size={12} />} Hanya Super Admin atau BA yang dapat menginisiasi integrasi repositori.
          </p>
        )}
      </div>

      {isModalOpen && (
        <RequestRepoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          projectId={project?.id || project?.project_id} 
          refreshData={refreshData}
        />
      )}
    </>
  );
};

export default GitHubStatusCard;