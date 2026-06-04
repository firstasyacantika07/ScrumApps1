import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Flag,
  CheckCircle2,
  Clock
} from 'lucide-react';
import api from '../../api/axios';

const CalendarPage = ({ projectId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data sprint dan task untuk ditampilkan di kalender
  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      // Mengambil data pengembangan/task
      const resDev = await api.get(`/projects/${projectId}/developments`);
      setEvents(resDev.data);
    } catch (err) {
      console.error("Gagal memuat data kalender:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Logika Kalender
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

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

        <div className="flex items-center gap-2 self-end">
          <button onClick={goToToday} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
            Hari Ini
          </button>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600">
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 py-2 text-xs font-black text-slate-700 min-w-[140px] text-center">
              {currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-600">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* GRID KALENDER */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        {/* Nama Hari */}
        <div className="grid grid-cols-7 border-b border-slate-50 bg-slate-50/50">
          {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Tanggal */}
        <div className="grid grid-cols-7">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-32 border-b border-r border-slate-50 bg-slate-50/20" />
          ))}
          
          {days.map((day) => {
            const dateStr = new Date(year, month, day).toISOString().split('T')[0];
            const dayEvents = events.filter(e => {
              const eventDate = new Date(e.created_at).toISOString().split('T')[0];
              return eventDate === dateStr;
            });

            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            return (
              <div key={day} className="h-32 border-b border-r border-slate-50 p-2 hover:bg-slate-50/50 transition-colors group relative">
                <span className={`inline-flex items-center justify-center w-7 h-7 text-xs font-black rounded-lg ${
                  isToday ? 'bg-[#ee1e2d] text-white shadow-lg shadow-red-100' : 'text-slate-400'
                }`}>
                  {day}
                </span>

                <div className="mt-2 space-y-1 overflow-y-auto max-h-[70px] custom-scrollbar">
                  {dayEvents.map((event) => (
                    <div 
                      key={event.id}
                      className={`text-[9px] p-1.5 rounded-lg border flex items-center gap-1 font-bold truncate ${
                        event.status === 'done' 
                        ? 'bg-green-50 text-green-600 border-green-100' 
                        : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}
                    >
                      {event.status === 'done' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      <span className="truncate">{event.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER / LEGENDA */}
      <div className="mt-6 flex items-center gap-6 px-4">
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
      </div>
    </div>
  );
};

export default CalendarPage;