import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, GitPullRequest, GitCommit, RefreshCw, AlertCircle, ExternalLink, Clock } from 'lucide-react';
import api from '../../api/axios';

/**
 * GitHubFeed.jsx
 * Menampilkan aktivitas repository GitHub (commit & pull request)
 * yang terhubung ke project via integrasi aktif.
 * 
 * Props:
 * - projectId: ID project yang aktif
 * - integrationData: data integrasi dari endpoint /github-status (opsional, bisa null)
 */
const GitHubFeed = ({ projectId, integrationData }) => {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isActive = integrationData?.status?.toUpperCase() === 'ACTIVE';

  const fetchActivity = useCallback(async () => {
    if (!projectId || !isActive) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/projects/${projectId}/github-activity`);
      // Backend mengembalikan array commit/PR atau objek dengan .commits & .pull_requests
      const data = res.data;
      if (Array.isArray(data)) {
        setActivity(data);
      } else {
        // Gabungkan commits dan pull_requests jika format objek
        const commits = (data?.commits || []).map(c => ({ ...c, type: 'commit' }));
        const prs = (data?.pull_requests || []).map(p => ({ ...p, type: 'pr' }));
        setActivity([...commits, ...prs].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at)));
      }
    } catch (err) {
      console.error('Gagal memuat GitHub activity:', err);
      setError(err.response?.data?.message || 'Gagal memuat aktivitas repository.');
    } finally {
      setLoading(false);
    }
  }, [projectId, isActive]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const repoUrl = integrationData?.repository_url || '#';
  const repoLabel = integrationData
    ? `${integrationData.github_owner}/${integrationData.github_repo}`
    : null;

  // ─── STATE: Integrasi belum aktif ────────────────────────────────────────
  if (!isActive) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-100 rounded-lg">
            <GitBranch size={15} className="text-slate-500" />
          </div>
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
            Integrasi GitHub Feed
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
            <GitBranch size={22} className="text-slate-300" />
          </div>
          <p className="text-xs font-bold text-slate-500 max-w-xs leading-relaxed">
            Repository belum terhubung. Hubungkan repository GitHub melalui menu <span className="text-slate-700">Pengajuan Integrasi</span> untuk memantau aktivitas secara real-time.
          </p>
        </div>
      </div>
    );
  }

  // ─── STATE: Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-50 rounded-lg">
            <GitBranch size={15} className="text-emerald-600" />
          </div>
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Integrasi GitHub Feed</span>
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
          <RefreshCw size={20} className="animate-spin text-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Memuat aktivitas repository...</span>
        </div>
      </div>
    );
  }

  // ─── STATE: Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2.5">
          <div className="p-1.5 bg-red-50 rounded-lg">
            <GitBranch size={15} className="text-red-500" />
          </div>
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Integrasi GitHub Feed</span>
        </div>
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-xs text-slate-500">{error}</p>
          <button
            onClick={fetchActivity}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ─── STATE: Data kosong ───────────────────────────────────────────────────
  if (activity.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <FeedHeader repoLabel={repoLabel} repoUrl={repoUrl} onRefresh={fetchActivity} />
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-2">
          <GitCommit size={20} className="text-slate-300" />
          <p className="text-xs text-slate-400 font-medium">Belum ada aktivitas commit atau pull request pada repository ini.</p>
        </div>
      </div>
    );
  }

  // ─── STATE: Ada data ──────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      <FeedHeader repoLabel={repoLabel} repoUrl={repoUrl} onRefresh={fetchActivity} />

      <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
        {activity.map((item, idx) => {
          const isPR = item.type === 'pr' || item.pull_request;
          const Icon = isPR ? GitPullRequest : GitCommit;
          const iconColor = isPR ? 'text-purple-500' : 'text-emerald-500';
          const iconBg = isPR ? 'bg-purple-50' : 'bg-emerald-50';
          const label = isPR ? item.title || item.name : item.message || item.title;
          const author = item.author || item.committer || item.user || '-';
          const date = item.date || item.created_at || item.timestamp;
          const url = item.html_url || item.url || repoUrl;

          return (
            <div key={idx} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
              <div className={`mt-0.5 p-1.5 ${iconBg} rounded-lg shrink-0`}>
                <Icon size={13} className={iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2">
                  {label || 'Tidak ada pesan'}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">{typeof author === 'object' ? author?.login || author?.name : author}</span>
                  {date && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={9} /> {formatDate(date)}
                    </span>
                  )}
                  {url && url !== '#' && (
                    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 text-[10px] text-indigo-500 hover:underline ml-auto shrink-0">
                      Lihat <ExternalLink size={9} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Sub-komponen Header ──────────────────────────────────────────────────────
const FeedHeader = ({ repoLabel, repoUrl, onRefresh }) => (
  <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-emerald-50 rounded-lg">
        <GitBranch size={15} className="text-emerald-600" />
      </div>
      <div>
        <span className="text-xs font-black text-slate-700 uppercase tracking-widest block">Integrasi GitHub Feed</span>
        {repoLabel && (
          <a href={repoUrl} target="_blank" rel="noreferrer"
            className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1 mt-0.5">
            {repoLabel} <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
        Aktif Mendengarkan
      </span>
      <button onClick={onRefresh} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600" title="Refresh">
        <RefreshCw size={13} />
      </button>
    </div>
  </div>
);

export default GitHubFeed;
