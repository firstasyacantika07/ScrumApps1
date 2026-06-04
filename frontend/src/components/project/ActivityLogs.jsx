import React, { useEffect, useState, useCallback } from 'react';
import { Clock, User, Activity } from 'lucide-react';
import api from '../../api/axios';
import { format } from 'date-fns'; // Opsional: npm install date-fns

const ActivityLogs = ({ projectId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await api.get(`/projects/${projectId}/logs`);
      setLogs(res.data);
    } catch (err) {
      console.error("Gagal memuat log aktivitas:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading) {
    return <div className="text-center py-10 text-slate-400 text-xs font-black uppercase tracking-widest">Loading Logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
        <Activity size={32} className="mx-auto text-slate-300 mb-2" />
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Belum ada aktivitas tercatat</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
      
      {logs.map((log, index) => (
        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
          
          {/* DOT TIMELINE */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-red-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
            <Clock size={16} strokeWidth={3} />
          </div>

          {/* CARD CONTENT */}
          <div className="w-[calc(100%-4rem)] md:w-[45%] bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-1.5 rounded-lg">
                  <User size={12} className="text-slate-500" />
                </div>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">
                  {log.user_name || `User #${log.user_id}`}
                </span>
              </div>
              <time className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                {new Date(log.created_at).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </time>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed">
              <span className="font-bold text-slate-800">{log.activity}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityLogs;