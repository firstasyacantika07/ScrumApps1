import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Lucide from "lucide-react";
import api from "../../api/axios";
import RequestRepoModal from "../../pages/SuperAdmin/RequestRepoModal";

const GitHubStatusCard = ({ project, integrationData, refreshData }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Ikon
  const GithubIcon = Lucide.Github || Lucide.GitBranch;
  const { CheckCircle2, Clock, RefreshCw, AlertCircle, ExternalLink } = Lucide;

  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const userRole = userData?.role?.toUpperCase()?.replace(/\s+/g, '') || "";
  
  // "admin2" masuk ke jalur manajemen yang sama seperti BA (bisa Request Repository),
  // bukan jalur read-only default. Otorisasi aktual tetap ditegakkan di backend.
  const isBA = userRole === "BUSINESSANALYST" || userRole === "ADMIN2";
  const isFreePackage = (userData?.package_type || "FREE").toUpperCase() === "FREE";

  const showFeedback = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  const handleSyncBacklog = async () => {
    try {
      setLoadingAction(true);
      const projectId = project?.id || project?.project_id;
      const res = await api.post(`/projects/${projectId}/github-sync-backlog`);
      if (res.data?.success) showFeedback(res.data.message, "success");
    } catch (err) {
      showFeedback("Gagal menyelaraskan backlog ke GitHub", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // --- RENDER UNTUK ROLE SELAIN BA (VISIBILITAS TEKNIS UNTUK DEVELOPER) ---
  if (!isBA) {
    if (!integrationData) return null; // Jika belum ada data sama sekali, tetap kosong
    
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-xl"><GithubIcon size={20} /></div>
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                GitHub Status: {integrationData.status || "N/A"}
              </h4>
              <p className="text-sm font-bold text-slate-800">
                {integrationData.github_owner}/{integrationData.github_repo}
              </p>
            </div>
          </div>
          {integrationData.status === "ACTIVE" && integrationData.repo_url && (
            <a href={integrationData.repo_url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-[10px] font-black rounded-xl uppercase hover:bg-black transition-all">
              <ExternalLink size={12} /> Buka Repo
            </a>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER UNTUK BA (MANAJEMEN INTEGRASI) ---

  // 1. KONDISI ACTIVE
  if ((integrationData?.status === "ACTIVE" || integrationData?.status === "APPROVED") && !isFreePackage) {
    return (
      <div className="bg-white border border-green-100 rounded-3xl p-6 shadow-sm">
        {msg.text && <div className={`mb-3 p-2.5 rounded-xl text-xs font-semibold text-white ${msg.type === "error" ? "bg-red-500" : "bg-slate-800"}`}>{msg.text}</div>}
        
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <GithubIcon size={22} /> GitHub Repository
          </div>
          <span className="bg-green-100 text-green-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase">
            <CheckCircle2 size={10} /> Connected
          </span>
        </div>
        
        <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-xs text-gray-400 font-medium">Repository Terhubung:</p>
          <div className="flex justify-between items-center mt-1">
            <p className="text-sm font-bold text-slate-800 uppercase truncate">{integrationData?.github_owner} / {integrationData?.github_repo}</p>
            {integrationData?.repo_url && (
              <a href={integrationData.repo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800"><ExternalLink size={16}/></a>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50">
          <button onClick={handleSyncBacklog} disabled={loadingAction} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1">
            <RefreshCw size={12} className={loadingAction ? "animate-spin" : ""} /> Sync Backlog
          </button>
        </div>
      </div>
    );
  }

  // 2. KONDISI PENDING
  if (integrationData?.status === "PENDING") {
    return (
      <div className="bg-white border border-amber-100 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <h4 className="font-bold flex items-center gap-2"><GithubIcon size={20} /> Integrasi GitHub</h4>
          <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase"><Clock size={10} /> Pending</span>
        </div>
        <p className="text-xs text-gray-500 mt-3">Menunggu peninjauan paket oleh Super Admin.</p>
      </div>
    );
  }

  // 3. KONDISI DEFAULT / BELUM ADA
  return (
    <>
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative">
        {isFreePackage && <div className="absolute top-4 right-4 bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">Requires PRO</div>}
        <h4 className="font-bold flex items-center gap-2"><GithubIcon size={20} /> Integrasi GitHub</h4>
        <p className="text-gray-500 text-xs mt-2">Hubungkan project ke GitHub untuk sinkronisasi data real-time.</p>
        <button onClick={() => setIsModalOpen(true)} className="mt-4 bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
          Request Repository
        </button>
      </div>

      {isModalOpen && (
        <RequestRepoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
          projectId={project?.id || project?.project_id} refreshData={refreshData} />
      )}
    </>
  );
};

export default GitHubStatusCard;