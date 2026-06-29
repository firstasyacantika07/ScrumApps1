import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Building, Search, Filter, ShieldAlert, 
  CheckCircle, AlertTriangle, RefreshCw, 
  ExternalLink 
} from 'lucide-react';
import api from '../../api/axios';

const CompanyManagement = () => {
  const { user } = useOutletContext(); 

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPackage, setFilterPackage] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  // 🟢 AMBIL DATA ASLI DARI DATABASE
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/superadmin/companies');
      
      // Membongkar response objek (.data.data) sesuai struktur backend Express
      if (response.data && response.data.success) {
        setCompanies(response.data.data);
      } else if (Array.isArray(response.data)) {
        setCompanies(response.data);
      } else {
        throw new Error("Format data API tidak dikenali");
      }
    } catch (error) {
      console.error("Gagal mengambil data tenants dari database:", error);
      alert("Koneksi API gagal. Pastikan backend Express menyala.");
      setCompanies([]); // Kosongkan data agar tidak memunculkan data tiruan lagi
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // 🟢 TOGGLE STATUS AKTIF / SUSPEND DI DATABASE ASLI
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const confirmMsg = `Apakah Anda yakin ingin mengubah status perusahaan ini menjadi ${newStatus.toUpperCase()}?`;
    
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(id);
    try {
      // Menembak endpoint patch status
      await api.patch(`/superadmin/companies/${id}/status`, { status: newStatus });
      
      // Update state lokal secara berkala agar UI instan berubah
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (error) {
      console.error("Gagal mengubah status perusahaan:", error);
      alert(error.response?.data?.message || "Gagal memperbarui status ke database. Silakan coba lagi.");
    } finally {
      setActionLoading(null);
    }
  };

  // Logika Pencarian dan Filter Frontend
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = (company.company_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (company.subdomain?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesPackage = filterPackage === 'all' || (company.package_type?.toUpperCase() === filterPackage.toUpperCase());
    const matchesStatus = filterStatus === 'all' || (company.status?.toLowerCase() === filterStatus.toLowerCase());
    
    return matchesSearch && matchesPackage && matchesStatus;
  });

  // Helper formatting tanggal aman (mencegah "Invalid Date")
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('id-ID');
  };

  // Helper badge warna untuk status
  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-green-200 inline-flex items-center gap-1"><CheckCircle size={12}/> Active</span>;
      case 'trial':
        return <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-200 inline-flex items-center gap-1"><RefreshCw size={12} className="animate-spin duration-1000"/> Trial</span>;
      case 'suspended':
        return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-200 inline-flex items-center gap-1"><AlertTriangle size={12}/> Suspended</span>;
      default:
        return <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200">{status}</span>;
    }
  };

  // Helper badge warna untuk tipe paket
  const getPackageBadge = (type) => {
    switch(type?.toUpperCase()) {
      case 'ENTERPRISE':
        return <span className="px-2.5 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md text-[9px] font-black uppercase tracking-wide shadow-sm">Enterprise</span>;
      case 'PRO':
        return <span className="px-2.5 py-0.5 bg-[#ee1e2d] text-white rounded-md text-[9px] font-black uppercase tracking-wide shadow-sm">Pro Plan</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border rounded-md text-[9px] font-black uppercase tracking-wide">Free Tier</span>;
    }
  };

  return (
    <div className="p-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Building className="text-[#ee1e2d]" size={32} /> Kelola Perusahaan SaaS
          </h2>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-[3px]">
            Manajemen Lisensi Organisasi, Status Penagihan langsung dari database, dan Kontrol Akses Global.
          </p>
        </div>
        <button onClick={fetchCompanies} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all border border-slate-200">
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* FILTER & SEARCH BAR PANEL */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="relative w-full lg:w-1/3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama perusahaan atau subdomain..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#ee1e2d]/20 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap w-full lg:w-auto items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-slate-400 shrink-0" />
            <select 
              value={filterPackage} 
              onChange={(e) => setFilterPackage(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
            >
              <option value="all">Semua Paket</option>
              <option value="FREE">FREE</option>
              <option value="PRO">PRO</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>
          </div>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE WORKSPACE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Perusahaan / Subdomain</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Paket SaaS</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Siklus & Kontrak</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Masa Berlaku</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Aksi Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="w-8 h-8 border-4 border-slate-100 border-t-[#ee1e2d] rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-wider">Memuat Data Tenant Real-Time...</p>
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Tidak ada perusahaan yang terdaftar di database.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-slate-100 border rounded-xl flex items-center justify-center font-black text-[#ee1e2d] text-sm shrink-0">
                          {company.company_logo ? (
                            <img src={company.company_logo} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            (company.company_name || 'C').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 tracking-tight">{company.company_name}</p>
                          <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                            <ExternalLink size={10}/> {company.subdomain}.scrumapps.com
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-6">
                      {getPackageBadge(company.package_type)}
                      <p className="text-[10px] font-bold text-slate-400 mt-1">ID Paket: #{company.plan_id}</p>
                    </td>

                    <td className="p-6">
                      <p className="text-xs font-black text-slate-700 uppercase tracking-wide">{company.billing_cycle || 'N/A'}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">Terdaftar: {formatDate(company.created_at)}</p>
                    </td>

                    <td className="p-6">
                      {company.status === 'trial' ? (
                        <div>
                          <p className="text-xs font-bold text-amber-600">Selesai Trial:</p>
                          <p className="text-[11px] font-black text-slate-700">
                            {formatDate(company.trial_end || company.trial_start)}
                          </p>
                        </div>
                      ) : company.subscription_ends_at ? (
                        <div>
                          <p className="text-xs font-bold text-slate-500">Berakhir Pada:</p>
                          <p className="text-[11px] font-black text-slate-700">{formatDate(company.subscription_ends_at)}</p>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-400">-</p>
                      )}
                    </td>

                    <td className="p-6">
                      {getStatusBadge(company.status)}
                    </td>

                    <td className="p-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleToggleStatus(company.id, company.status)}
                          disabled={actionLoading === company.id}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm border ${
                            company.status === 'suspended'
                              ? 'bg-green-600 text-white border-green-700 hover:bg-green-700'
                              : 'bg-white text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200'
                          } ${actionLoading === company.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {actionLoading === company.id ? (
                            'Processing...'
                          ) : company.status === 'suspended' ? (
                            'Aktifkan Akun'
                          ) : (
                            'Bekukan Akun'
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompanyManagement;