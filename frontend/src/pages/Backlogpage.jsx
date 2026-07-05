import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Layers, Plus, Download, Clock, CheckCircle2, 
  HelpCircle, AlertCircle, FileText 
} from 'lucide-react';
import api from '../api/axios';
import html2pdf from 'html2pdf.js'; // Mengganti jsPDF autotable agar layout gelombang & ttd presisi

const BacklogPage = () => {
  const { projectId: projectIdFromParams } = useParams();
  const navigate = useNavigate();
  const [backlogs, setBacklogs] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);

  // State untuk project selector (ketika diakses dari /backlog tanpa projectId)
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Gunakan projectId dari URL params (jika ada) atau dari selector dropdown
  const projectId = projectIdFromParams || selectedProjectId;

  // State untuk Form Input (Sesuai elemen visual di gambar)
  const [namaBacklog, setNamaBacklog] = useState('');
  const [applicant, setApplicant] = useState('');
  const [prioritas, setPrioritas] = useState('Low');
  const [statusDatabase, setStatusDatabase] = useState('Inactive (Draft)');
  const [deskripsi, setDeskripsi] = useState('');

  // Membuat referensi DOM untuk menangkap container element yang dicetak ke PDF
  const printAreaRef = useRef(null);

  // Fetch list semua project untuk ditampilkan di selector (hanya jika tidak ada projectId di URL)
  useEffect(() => {
    if (projectIdFromParams) return; // Sudah ada projectId dari URL, skip
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: token ? `Bearer ${token}` : '' } };
        const res = await api.get('/projects', config);
        const list = res.data?.data || res.data || [];
        setProjects(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Gagal memuat daftar proyek:", error);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [projectIdFromParams]);

  // 🛠️ FIX: dipindah keluar dari useEffect (sebelumnya hanya fungsi lokal
  // di dalam useEffect) supaya bisa dipanggil ulang secara manual dari
  // handleAddBacklog untuk merefresh list + data project setelah backlog
  // baru berhasil disimpan ke database.
  const fetchBacklogData = async () => {
    if (!projectId) {
      setBacklogs([]);
      setProject(null);
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      };

      const [projectRes, backlogRes] = await Promise.all([
        api.get(`/projects/${projectId}`, config).catch(() => ({ data: null })),
        api.get(`/projects/${projectId}/backlogs`, config).catch(() => ({ data: [] }))
      ]);

      if (projectRes?.data) {
        setProject(projectRes.data.data || projectRes.data);
      }

      const backlogList = backlogRes.data?.data || backlogRes.data || [];
      setBacklogs(Array.isArray(backlogList) ? backlogList : []);
    } catch (error) {
      console.error("Gagal memuat data backlog:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBacklogData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // --- FUNGSI SUBMIT: MENAMBAHKAN BACKLOG BARU KE DATABASE ---
  // Sebelumnya tombol "Tambah Ke Backlog" tidak memiliki handler sama sekali,
  // sehingga data form tidak pernah tersimpan/terkirim ke backend.
  const handleAddBacklog = async () => {
    if (!namaBacklog.trim()) {
      alert("Nama backlog wajib diisi.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      };

      // 🛠️ FIX: payload sebelumnya memakai field "title" & value berkapital
      // ("Low"/"Active"), padahal backend & komponen Backlog.jsx (tab di
      // halaman detail proyek) memakai field "name" dan value lowercase
      // ("low"/"active"). Akibatnya backlog yang ditambahkan dari halaman
      // ini tidak nyambung/tidak tampil di tab Backlog detail proyek.
      const payload = {
        name: namaBacklog,
        applicant: applicant,
        priority: prioritas.toLowerCase(),
        status: statusDatabase === 'Active' ? 'active' : 'inactive',
        description: deskripsi,
        project_id: projectId,
      };

      const res = await api.post(`/projects/${projectId}/backlogs`, payload, config);
      const newItem = res.data?.data || res.data;

      // Update list backlog secara optimis tanpa perlu reload halaman
      setBacklogs((prev) => [...prev, newItem]);

      // Reset form setelah berhasil ditambahkan
      setNamaBacklog('');
      setApplicant('');
      setPrioritas('Low');
      setStatusDatabase('Inactive (Draft)');
      setDeskripsi('');

      // 🛠️ FIX: refresh ulang dari server supaya data (termasuk id asli)
      // benar-benar sinkron dengan yang tersimpan di database & yang akan
      // dilihat lewat tab Backlog di halaman detail proyek.
      fetchBacklogData();
    } catch (error) {
      console.error("Gagal menambahkan backlog:", error);
      alert("Gagal menambahkan backlog. Silakan coba lagi.");
    }
  };

  // --- FUNGSI DOWNLOAD PDF DENGAN LAYOUT REQUIREMENT SIGN OFF SHEET ---
  const handleDownloadBacklogPDF = () => {
    try {
      const element = printAreaRef.current;
      
      const options = {
        margin:       0,
        filename:     `Requirement_Sign_Off_Project_${projectId}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      // Eksekusi konversi komponen HTML tersembunyi ke file PDF
      html2pdf().set(options).from(element).save();
    } catch (error) {
      console.error("Gagal mendownload PDF:", error);
      alert("Gagal mencetak PDF Backlog. Silakan periksa dependensi html2pdf.js.");
    }
  };

  if (loadingProjects) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen">

      {/* Project Selector — hanya tampil jika diakses dari /backlog (bukan dari detail proyek) */}
      {!projectIdFromParams && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
            Pilih Proyek
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm text-slate-700 font-bold focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
          >
            <option value="">-- Pilih proyek untuk melihat backlog --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        
        {/* Atas Header Card Management + Tombol Cetak PDF */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 mb-6 gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Backlog Management</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">List Fitur Dan Kebutuhan Proyek</p>
          </div>
          
          {/* Tombol Cetak Laporan PDF Berwarna Emerald Sesuai Guideline UI */}
          <button
            onClick={handleDownloadBacklogPDF}
            className="px-4 py-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider self-start sm:self-auto shadow-sm"
          >
            <Download size={14} strokeWidth={2.5} />
            <span>Unduh Laporan PDF</span>
          </button>
        </div>

        {/* Form Pembuatan Backlog (Sesuai Gambar Layout) */}
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Nama Backlog</label>
              <input 
                type="text" 
                value={namaBacklog}
                onChange={(e) => setNamaBacklog(e.target.value)}
                placeholder="Contoh: Fitur Login Multi-role"
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Applicant (Pengaju)</label>
              <input 
                type="text" 
                value={applicant}
                onChange={(e) => setApplicant(e.target.value)}
                placeholder="Nama Client/Stakeholder"
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Prioritas</label>
              <select 
                value={prioritas}
                onChange={(e) => setPrioritas(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Status Database</label>
              <select 
                value={statusDatabase}
                onChange={(e) => setStatusDatabase(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm text-blue-600 font-bold focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
              >
                <option value="Inactive (Draft)">Inactive (Draft)</option>
                <option value="Active">Active</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Deskripsi Detail</label>
            <textarea 
              rows={3}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Jelaskan kriteria pengerjaan..."
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleAddBacklog}
              disabled={!projectId}
              className="px-6 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Tambah Ke Backlog
            </button>
          </div>
        </div>

        {/* Bagian List Item Backlog (Bagian bawah pada gambar) */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          {!projectId ? (
            <div className="text-center py-12 text-slate-300 text-xs font-bold uppercase tracking-wider">
              Pilih proyek terlebih dahulu untuk melihat backlog.
            </div>
          ) : backlogs.length > 0 ? (
            backlogs.map((item, index) => (
              <div key={item.id || index} className="p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-bold text-slate-800 text-sm">{item.name || item.title}</h5>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-black text-[9px] uppercase rounded tracking-wide">
                        {(item.priority || 'low').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{item.description || 'Tidak ada deskripsi'}</p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {item.status || 'TODO'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
              Belum ada data backlog yang tersimpan.
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* AREA TEMPLATE TERSEMBUNYI KHUSUS UNTUK CONVERT KE PDF (DENGAN TAILWIND)   */}
      {/* ========================================================================= */}
      <div className="absolute left-[-9999px] top-0">
        <div 
          ref={printAreaRef} 
          className="w-[8.5in] min-h-[11in] bg-white relative box-border overflow-hidden text-black"
          style={{ padding: '0px', margin: '0px' }}
        >
          {/* Dekorasi Atas Gari-Garis Gelombang Merah */}
          <div className="absolute top-0 left-0 w-full z-0">
            <svg viewBox="0 0 500 60" preserveAspectRatio="none" className="w-full h-auto">
              <path d="M0,0 L500,0 L500,40 Q250,60 0,40 Z" fill="#dc2626" />
            </svg>
          </div>

          {/* Konten Lembar Persetujuan Dokumen */}
          <div className="relative z-10 pt-[1.3in] pb-[0.8in] px-[0.8in] font-sans">
            <h2 className="text-center text-base font-extrabold tracking-wider mb-10 mt-2 uppercase text-black">
              REQUIREMENT SIGN OFF SHEET
            </h2>

            {/* Tabel Identitas Dokumen */}
            <table className="w-full mb-8 text-xs border-collapse text-black">
              <tbody>
                <tr>
                  <td className="w-[140px] font-bold py-1 align-top">Nama Projek</td>
                  <td className="py-1 align-top">: {project?.name || 'eduplay'}</td>
                </tr>
                <tr>
                  <td className="w-[140px] font-bold py-1 align-top">Nama Pemohon</td>
                  <td className="py-1 align-top">: {backlogs[0]?.applicant || applicant || 'cod'}</td>
                </tr>
                <tr>
                  <td className="w-[140px] font-bold py-1 align-top">Hari, Tanggal</td>
                  <td className="py-1 align-top">: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
              </tbody>
            </table>

            {/* Iterasi Menampilkan Setiap Item Backlog sebagai Bab Point */}
            {backlogs.map((item, idx) => (
              <div key={item.id || idx} className="mb-6 text-xs text-black break-inside-avoid">
                <h3 className="font-bold mb-1.5 uppercase">
                  {String.fromCharCode(65 + idx)}. User Story ({item.name || item.title || 'Fitur'})
                </h3>
                <div className="ml-4 mb-2">
                  <span className="font-semibold text-gray-700">Priority: </span>
                  <span className="uppercase text-red-600 font-bold">{(item.priority || 'low').toUpperCase()}</span>
                </div>
                <p className="ml-4 text-gray-800 leading-relaxed bg-gray-50 p-2.5 rounded border border-gray-100">
                  {item.description || 'Tidak ada keterangan kriteria pengerjaan backlog.'}
                </p>
              </div>
            ))}

            {backlogs.length === 0 && (
              <div className="text-xs text-gray-500 italic p-4 text-center border border-dashed rounded">
                Belum ada rincian backlog/fitur yang diajukan pada proyek ini.
              </div>
            )}

            {/* Ruang Kolom Tanda Tangan Persetujuan */}
            <div className="flex justify-between mt-16 px-10 text-xs break-inside-avoid">
              <div className="text-center w-[160px]">
                <p className="mb-16">Mengetahui,</p>
                <p className="font-bold border-t border-black pt-1">{backlogs[0]?.applicant || applicant || 'Client'}</p>
                <p className="text-[10px] text-gray-500">Product Owner/Pemohon</p>
              </div>
              <div className="text-center w-[160px]">
                <p className="mb-16">Dibuat Oleh,</p>
                <p className="font-bold border-t border-black pt-1">ScrumApps Team</p>
                <p className="text-[10px] text-gray-500">Development Team</p>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default BacklogPage;