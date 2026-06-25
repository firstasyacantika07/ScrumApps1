import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Search, Filter, CheckCircle, 
  XCircle, Clock, AlertCircle, RefreshCw, 
  ArrowUpRight, Download, Receipt, DollarSign 
} from 'lucide-react';
import api from '../../api/axios';

const BillingTracker = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  // Fungsi untuk mengambil data invoice / transaksi dari platform global
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Endpoint masa depan saat backend invoice kamu sudah siap
      const response = await api.get('/superadmin/billing/invoices');
      setInvoices(response.data?.data || response.data || []);
    } catch (error) {
      console.error("Gagal memuat invoices, menggunakan fallback mock data:", error);
      // Fallback Data sesuai rancangan struktur gabungan tbr_tenants & tbr_invoices
      setInvoices([
        {
          id: 101,
          invoice_number: "INV/202606/0042",
          tenant_id: 1,
          company_name: "PT Tech Innovator Indonesia",
          package_type: "PRO",
          amount: 499000,
          payment_method: "Virtual Account",
          status: "paid",
          created_at: "2026-06-20",
          paid_at: "2026-06-20 10:15:30"
        },
        {
          id: 102,
          invoice_number: "INV/202606/0043",
          tenant_id: 3,
          company_name: "Nusantara Digital Corp",
          package_type: "ENTERPRISE",
          amount: 3500000,
          payment_method: "Manual Bank Transfer",
          status: "unpaid",
          created_at: "2026-06-23",
          paid_at: null
        },
        {
          id: 103,
          invoice_number: "INV/202606/0044",
          tenant_id: 4,
          company_name: "Cahya Cellular Group",
          package_type: "PRO",
          amount: 499000,
          payment_method: "QRIS",
          status: "expired",
          created_at: "2026-06-15",
          paid_at: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Fungsi Override Manual: Konfirmasi pembayaran manual (Sangat berguna untuk tipe Enterprise transfer bank)
  const handleMarkAsPaid = async (invoiceId, companyName) => {
    const confirmMsg = `Apakah Anda yakin ingin mengonfirmasi pembayaran untuk ${companyName} secara MANUAL? Tindakan ini akan mengaktifkan paket tenant terkait.`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(invoiceId);
    try {
      // Eksekusi ke API backend (mengubah status invoice & otomatis nambah subscription_ends_at di tbr_tenants)
      await api.patch(`/superadmin/billing/invoices/${invoiceId}/override-paid`);
      
      // Update state di frontend langsung demi UX yang responsif
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: 'paid', paid_at: new Date().toISOString().replace('T', ' ').substring(0, 19) } : inv
      ));
    } catch (error) {
      console.error("Gagal melakukan override pembayaran:", error);
      alert("Gagal memperbarui status pembayaran. Pastikan route backend Anda sudah dikonfigurasi.");
    } finally {
      setActionLoading(null);
    }
  };

  // Menghitung ringkasan finansial cepat di atas halaman
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingRevenue = invoices.filter(i => i.status === 'unpaid').reduce((acc, curr) => acc + curr.amount, 0);

  // Filter & Search Logic
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesMethod = filterMethod === 'all' || inv.payment_method.toLowerCase().includes(filterMethod.toLowerCase());

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-green-200 inline-flex items-center gap-1"><CheckCircle size={12}/> Paid</span>;
      case 'unpaid':
        return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-200 inline-flex items-center gap-1"><Clock size={12}/> Unpaid</span>;
      case 'expired':
        return <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-200 inline-flex items-center gap-1"><XCircle size={12}/> Expired</span>;
      default:
        return <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="p-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <CreditCard className="text-[#ee1e2d]" size={32} /> Subscription & Billing Tracker
          </h2>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-[3px]">
            Log Transaksi Masuk, Manajemen Invoice, dan Verifikasi Pembayaran Manual Langganan SaaS.
          </p>
        </div>
        <button onClick={fetchInvoices} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all border border-slate-200">
          <RefreshCw size={14} /> Sinkronisasi Transaksi
        </button>
      </div>

      {/* METRIC SUMMARIES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-green-100 text-green-600 bg-green-50/50">
            <DollarSign size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 leading-none">Rp {totalRevenue.toLocaleString('id-ID')}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wider leading-none">Pendapatan Berhasil Terkonfirmasi</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-amber-100 text-amber-600 bg-amber-50/50">
            <Receipt size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 leading-none">Rp {pendingRevenue.toLocaleString('id-ID')}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wider leading-none">Menunggu Pembayaran (Pending)</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-red-100 text-[#ee1e2d] bg-red-50/50">
            <AlertCircle size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800 leading-none">
              {invoices.filter(i => i.status === 'unpaid' && i.payment_method.includes('Manual')).length} Transaksi
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-wider leading-none">Perlu Konfirmasi Transfer Manual</div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH PANEL */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="relative w-full lg:w-1/3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari kode invoice atau nama PT..." 
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
            <option value="all">Semua Status Invoice</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="expired">Expired</option>
          </select>

          <select 
            value={filterMethod} 
            onChange={(e) => setFilterMethod(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value="all">Semua Metode Pembayaran</option>
            <option value="Virtual Account">Virtual Account</option>
            <option value="QRIS">QRIS</option>
            <option value="Manual">Manual Transfer</option>
          </select>
        </div>
      </div>

      {/* INVOICES LIST TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Kode Invoice</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Tenant (Perusahaan)</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Paket & Nominal</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Metode Transaksi</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Aksi / Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="w-8 h-8 border-4 border-slate-100 border-t-[#ee1e2d] rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-wider">Menyelaraskan Pembayaran Lintas Tenant...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Tidak ditemukan riwayat pembayaran billing.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Kode Invoice */}
                    <td className="p-6 font-black text-slate-700 text-xs tracking-wide">
                      {inv.invoice_number}
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">Dibuat: {inv.created_at}</p>
                    </td>

                    {/* Nama Perusahaan */}
                    <td className="p-6 font-black text-slate-800 text-sm">
                      {inv.company_name}
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ID Tenant: #{inv.tenant_id}</p>
                    </td>

                    {/* Paket & Nominal */}
                    <td className="p-6">
                      <p className="text-xs font-black text-slate-800">Rp {inv.amount.toLocaleString('id-ID')}</p>
                      <p className="text-[9px] font-black text-[#ee1e2d] uppercase tracking-wider mt-0.5">{inv.package_type} PLAN</p>
                    </td>

                    {/* Metode Pembayaran */}
                    <td className="p-6 text-xs font-bold text-slate-600">
                      {inv.payment_method}
                      {inv.paid_at && <p className="text-[9px] font-medium text-slate-400 mt-0.5">Selesai: {inv.paid_at}</p>}
                    </td>

                    {/* Status */}
                    <td className="p-6">
                      {getStatusBadge(inv.status)}
                    </td>

                    {/* Tombol Override Verifikasi */}
                    <td className="p-6 text-center">
                      {inv.status === 'unpaid' && inv.payment_method.includes('Manual') ? (
                        <button
                          onClick={() => handleMarkAsPaid(inv.id, inv.company_name)}
                          disabled={actionLoading === inv.id}
                          className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                        >
                          {actionLoading === inv.id ? 'Memproses...' : 'Setujui Pembayaran'}
                        </button>
                      ) : inv.status === 'paid' ? (
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 text-[10px] font-bold uppercase">
                          <Download size={14} /> Unduh Kuitansi
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">-</span>
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