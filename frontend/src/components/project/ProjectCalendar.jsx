import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Flag
} from 'lucide-react';
import api from '../../api/axios';

const CalendarPage = ({ projectId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rawEvents, setEvents] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [loading, setLoading] = useState(true);

  // Format Date ke string YYYY-MM-DD lokal
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Validasi tahun rasional untuk mencegah bug database
  const getSafeSprintDate = (dateString) => {
    if (!dateString || dateString.startsWith('0000')) return null;
    const year = parseInt(dateString.split('-')[0], 10);
    if (isNaN(year) || year < 1970 || year > 2100) return null;
    return new Date(dateString);
  };

  // Fetch data paralel
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [resDev, resSprint] = await Promise.all([
        api.get(`/projects/${projectId}/developments`),
        api.get(`/projects/${projectId}/sprints`)
      ]);

      setEvents(resDev.data || []);
      setSprints(resSprint.data || []);

      if (resSprint.data && resSprint.data.length > 0) {
        const activeSprint = resSprint.data.find(s => s.status?.toLowerCase() === 'active') || resSprint.data[0];
        setSelectedSprintId(activeSprint.id.toString());
        
        const safeStartDate = getSafeSprintDate(activeSprint.start_date);
        if (safeStartDate) {
          setCurrentDate(safeStartDate);
        }
      }
    } catch (err) {
      console.error("Gagal memuat data kalender & sprint:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const currentSprint = sprints.find(s => s.id.toString() === selectedSprintId);

  // Optimasi Performa: Pre-parsing tanggal event agar tidak melakukan "new Date()" berulang kali di dalam loop grid
  const processedEvents = useMemo(() => {
    return rawEvents.map(e => {
      // Prioritaskan start_date/end_date pengerjaan, fallback ke created_at jika kosong
      const targetStart = e.start_date || e.created_at;
      const targetEnd = e.end_date || targetStart;

      return {
        ...e,
        parsedStartStr: targetStart ? formatLocalDate(new Date(targetStart)) : null,
        parsedStartTime: targetStart ? new Date(targetStart).setHours(0,0,0,0) : null,
        parsedEndTime: targetEnd ? new Date(targetEnd).setHours(23,59,59,999) : null
      };
    });
  }, [rawEvents]);

  const handleSprintChange = (e) => {
    const sprintId = e.target.value;
    setSelectedSprintId(sprintId);
    const selected = sprints.find(s => s.id.toString() === sprintId);
    
    const safeStartDate = selected ? getSafeSprintDate(selected.start_date) : null;
    if (safeStartDate) {
      setCurrentDate(safeStartDate);
    }
  };

  // Logika Grid Kalender Dinamis
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    
    if (sprints.length > 0) {
      const overlappingSprint = sprints.find(s => {
        const safeStart = getSafeSprintDate(s.start_date);
        const safeEnd = getSafeSprintDate(s.end_date);
        if (!safeStart || !safeEnd) return false;
        
        const start = safeStart.setHours(0,0,0,0);
        const end = safeEnd.setHours(23,59,59,999);
        return today >= start && today <= end;
      });

      const activeSprint = overlappingSprint || sprints.find(s => s.status?.toLowerCase() === 'active') || sprints[0];
      setSelectedSprintId(activeSprint.id.toString());
    }
  };

  if (loading) return (
    <div className="h-[500px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ee1e2d]"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      {/* HEADER KALENDER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-2xl text-[#ee1e2d]">
              <CalendarIcon size={24} />
            </div>
            Sprint Calendar
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-14">
            Monitoring Milestone & Deadline
          </p>
        </div>

        {/* CONTROLLER & SPRINT FILTER */}
        <div className="flex flex-wrap items-center gap-3 md:self-end">
          <div className="flex flex-col">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Pilih Sprint</label>
            <select 
              value={selectedSprintId} 
              onChange={handleSprintChange}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 min-w-[200px]"
            >
              {sprints.map(sprint => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name || `Sprint ID: ${sprint.id}`} ({sprint.status?.toUpperCase() || 'PLANNED'})
                </option>
              ))}
              {sprints.length === 0 && <option value="">Belum ada Sprint</option>}
            </select>
          </div>

          <div className="flex flex-col justify-end h-full pt-5">
            <button onClick={goToToday} className="px-4 py-2 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl transition-all shadow-sm">
              Hari Ini
            </button>
          </div>

          <div className="flex flex-col justify-end pt-5">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600">
                <ChevronLeft size={20} />
              </button>
              <div className="px-4 py-2 text-xs font-black text-slate-700 min-w-[140px] text-center capitalize">
                {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
              </div>
              <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER INFORMASI RENTANG SPRINT */}
      {currentSprint && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm text-slate-600">
              <Flag size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">{currentSprint.name || `Sprint ID: ${currentSprint.id}`} Detailed Range</h4>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                {getSafeSprintDate(currentSprint.start_date) ? new Date(currentSprint.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} - {getSafeSprintDate(currentSprint.end_date) ? new Date(currentSprint.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </p>
            </div>
          </div>
          <div>
            <span className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl border ${
              currentSprint.status?.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
              currentSprint.status?.toLowerCase() === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              Status: {currentSprint.status || 'planned'}
            </span>
          </div>
        </div>
      )}

      {/* GRID KALENDER */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-32 border-b border-r border-slate-100 bg-slate-50/20" />
          ))}
          
          {days.map((day) => {
            const thisDate = new Date(year, month, day);
            const thisDateTime = thisDate.getTime();
            const dateStr = formatLocalDate(thisDate);

            let isInsideSprint = false;
            const safeStart = currentSprint ? getSafeSprintDate(currentSprint.start_date) : null;
            const safeEnd = currentSprint ? getSafeSprintDate(currentSprint.end_date) : null;

            if (safeStart && safeEnd) {
              const start = new Date(safeStart).setHours(0,0,0,0);
              const end = new Date(safeEnd).setHours(23,59,59,999);
              isInsideSprint = thisDate >= start && thisDate <= end;
            }

            // Memfilter event menggunakan properti tanggal yang sudah di-parse (Lebih Ringan & Cepat)
            const dayEvents = processedEvents.filter(e => {
              if (!e.parsedStartStr) return false;

              // Kondisi 1: Jika task berbentuk rentang waktu pengerjaan (Berjalan menggunakan timestamp angka)
              if (e.start_date && e.end_date) {
                return thisDateTime >= e.parsedStartTime && thisDateTime <= e.parsedEndTime && isInsideSprint;
              }
              
              // Kondisi 2: Jika single deadline / target date saja
              return e.parsedStartStr === dateStr && isInsideSprint;
            });

            const isToday = formatLocalDate(new Date()) === dateStr;

            return (
              <div 
                key={day} 
                className={`h-32 border-b border-r border-slate-100 p-2 transition-colors group relative ${
                  isInsideSprint 
                    ? 'bg-red-50/20 hover:bg-red-50/40' 
                    : 'bg-slate-50/40 text-slate-400 opacity-60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 text-xs font-black rounded-lg ${
                    isToday ? 'bg-[#ee1e2d] text-white shadow-lg shadow-red-200' : 'text-slate-600'
                  }`}>
                    {day}
                  </span>
                  
                  {isInsideSprint && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Rentang Sprint Aktif" />
                  )}
                </div>

                {/* Kontainer Event / Task */}
                <div className="mt-2 space-y-1 overflow-y-auto max-h-[72px] pr-0.5 custom-scrollbar">
                  {dayEvents.map((event) => {
                    const cleanStatus = event.status?.toLowerCase() || 'planned';
                    const isCompleted = cleanStatus === 'completed' || cleanStatus === 'done';
                    
                    return (
                      <div 
                        key={event.id}
                        className={`text-[9px] p-1.5 rounded-lg border flex items-center gap-1 font-bold truncate transition-all ${
                          isCompleted 
                            ? 'bg-green-50 text-green-700 border-green-100' 
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}
                        title={`${event.name} (${cleanStatus.toUpperCase()})`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={10} className="shrink-0 text-green-600" />
                        ) : (
                          <Clock size={10} className="shrink-0 text-blue-600" />
                        )}
                        <span className="truncate">{event.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER / LEGENDA */}
      <div className="mt-6 flex flex-wrap items-center gap-6 px-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ee1e2d]"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-3 border border-red-200 bg-red-50/40 rounded"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sprint Active Zone</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;