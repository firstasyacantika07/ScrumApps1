import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  CreditCard, Search, CheckCircle, 
  XCircle, Clock, AlertCircle, RefreshCw, 
  Download, Building2, DollarSign 
} from 'lucide-react';
import api from '../../api/axios';

const BillingTracker = () => {
  const { user } = useOutletContext(); 

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPackage, setFilterPackage] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  // Fungsi untuk mengambil data tenant yang merepresentasikan billing
  const fetchBillingFromTenants = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await api.get('/superadmin/billing/invoices');
      const resData = response.data?.data || response.data;
      
      if (Array.isArray(resData)) {
        setTenants(resData);
      } else {
        throw new Error("Format response data tenant bukan array.");
      }
    } catch (error) {
      console.error("Gagal memuat data dari tbr_tenants:", error);
      setErrorMessage("Gagal menarik data langsung dari tbr_tenants. Pastikan backend router Anda aktif.");
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingFromTenants();
  }, []);

  // Fungsi Verifikasi: Mengubah status tenant dari 'unpaid/pending' menjadi 'active' di DB
  const handleActivation = async (tenantId, companyName) => {
    const confirmMsg = `Apakah Anda yakin ingin menyetujui pembayaran & mengaktifkan status ${companyName} secara MANUAL di database?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(tenantId);
    try {
      // Mengarah ke endpoint patch update status tenant Anda
      await api.patch(`/superadmin/tenants/${tenantId}/activate`);
      
      await fetchBillingFromTenants(); // Ambil data ter-update
      alert(`Tenant ${companyName} berhasil diaktifkan di database!`);
    } catch (error) {
      console.error("Gagal memperbarui status tenant:", error);
      alert(error.response?.data?.message || "Gagal memperbarui status tenant di DB.");
    } finally {
      setActionLoading(null);
    }
  };

  const safeTenants = Array.isArray(tenants) ? tenants : [];
  
  // Kalkulasi Finansial berbasis data tbr_tenants
  const totalRevenue = safeTenants.filter(t => t.status === 'active').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const pendingRevenue = safeTenants.filter(t => t.status === 'unpaid' || t.status === 'pending').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Pencarian & Penyaringan Data
  const filteredTenants = safeTenants.filter(tenant => {
    const matchesSearch = (tenant.company_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (tenant.subdomain?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // Normalisasi status pencocokan badge
    const currentStatus = tenant.status === 'active' ? 'paid' : 'unpaid';
    const matchesStatus = filterStatus === 'all' || currentStatus === filterStatus;
    const matchesPackage = filterPackage === 'all' || tenant.package_type === filterPackage;

    return matchesSearch && matchesStatus && matchesPackage;
  });

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'paid':
        return <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-green-200 inline-flex items-center gap-1"><CheckCircle size={12}/> Active / Paid</span>;
      case 'unpaid':
      case 'pending':
        return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-200 inline-flex items-center gap-1"><Clock size={12}/> Unpaid</span>;
      default:
        return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-200 inline-flex items-center gap-1"><XCircle size={12}/> Expired</span>;
    }
  };

  return (
    <div className="p-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <CreditCard className="text-[#ee1e2d]" size={32} /> Subscription & Tenant Billing
          </h2>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-[3px]">
            Manajemen Status Aktif, Paket Langganan, dan Verifikasi Finansial Berdasarkan Tabel tbr_tenants.
          </p>
        </div>
        <button onClick={fetchBillingFromTenants} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all border border-slate-200">
          <RefreshCw size={14} /> Sinkronisasi Tenant DB
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-semibold">
          <AlertCircle size={20} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* METRIC SUMMARIES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-green-100 text-green-600 bg-green-50/50">
            <DollarSign size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 leading-none">Rp {totalRevenue.toLocaleString('id-ID')}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wider leading-none">Estimasi Omset Aktif (Active)</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-amber-100 text-amber-600 bg-amber-50/50">
            <Building2 size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 leading-none">Rp {pendingRevenue.toLocaleString('id-ID')}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wider leading-none">Potensi Dana Tertahan (Unpaid)</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-red-100 text-[#ee1e2d] bg-red-50/50">
            <AlertCircle size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 leading-none">
              {safeTenants.filter(t => t.status === 'unpaid' || t.status === 'pending').length} Perusahaan
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wider leading-none">Menunggu Persetujuan Aktivasi</div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH PANEL */}
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
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">Semua Status Tenant</option>
            <option value="paid">Active / Paid</option>
            <option value="unpaid">Unpaid / Pending</option>
          </select>

          <select 
            value={filterPackage} 
            onChange={(e) => setFilterPackage(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">Semua Paket</option>
            <option value="PRO">PRO Plan</option>
            <option value="ENTERPRISE">ENTERPRISE Plan</option>
          </select>
        </div>
      </div>

      {/* INVOICES / TENANTS LIST TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Kode Reff</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Tenant (Perusahaan)</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Paket & Nominal</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Siklus & Batas Akhir</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="w-8 h-8 border-4 border-slate-100 border-t-[#ee1e2d] rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-wider">Membaca Data Langsung Tabel tbr_tenants...</p>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Tidak ada data tenant terdaftar di database.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* ID & Kode Referensi buatan */}
                    <td className="p-6 font-black text-slate-700 text-xs tracking-wide">
                      {tenant.invoice_number || `TEN-${tenant.id}`}
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">Join: {tenant.created_at?.substring(0, 10)}</p>
                    </td>

                    {/* Info Perusahaan */}
                    <td className="p-6 font-black text-slate-800 text-sm">
                      {tenant.company_name}
                      <p className="text-[10px] text-red-500 font-bold mt-0.5">Domain: {tenant.subdomain}.scrumapps.id</p>
                    </td>

                    {/* Nominal Biaya Paket Terpetakan */}
                    <td className="p-6">
                      <p className="text-xs font-black text-slate-800">Rp {(Number(tenant.amount) || 0).toLocaleString('id-ID')}</p>
                      <p className="text-[9px] font-black text-[#ee1e2d] uppercase tracking-wider mt-0.5">{tenant.package_type} PLAN</p>
                    </td>

                    {/* Siklus Tagihan */}
                    <td className="p-6 text-xs font-bold text-slate-600">
                      <span className="uppercase tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{tenant.billing_cycle}</span>
                      <p className="text-[9px] font-medium text-slate-400 mt-1.5">Ends at: {tenant.subscription_ends_at || 'No Limit'}</p>
                    </td>

                    {/* Status Tenant */}
                    <td className="p-6">
                      {getStatusBadge(tenant.status)}
                    </td>

                    {/* Tombol Interaksi */}
                    <td className="p-6 text-center">
                      {tenant.status !== 'active' ? (
                        <button
                          onClick={() => handleActivation(tenant.id, tenant.company_name)}
                          disabled={actionLoading === tenant.id}
                          className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                        >
                          {actionLoading === tenant.id ? 'Memproses...' : 'Aktifkan Tenant'}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">Sudah Sinkron</span>
                      )}
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

export default BillingTracker;