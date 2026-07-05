import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import api from '../api/axios';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Mengambil state penunjang pembayaran dari halaman Billing sebelumnya
  const {
    snapToken,
    orderId,
    planName,
    price,
    period, // Mengandung '/bulan' atau '/tahun'
  } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // =========================
  // VALIDATION & GUARD
  // =========================
  useEffect(() => {
    if (!snapToken || !orderId) {
      navigate('/billing');
    }
  }, [snapToken, orderId, navigate]);

  // =========================
  // FORMAT RUPIAH
  // =========================
  const formatRupiah = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // =========================
  // OPEN MIDTRANS SNAP POPUP
  // =========================
  const handleOpenPayment = useCallback(() => {
    if (!window.snap) {
      alert('Midtrans Snap belum termuat sempurna di browser Anda.');
      return;
    }

    setLoading(true);

    window.snap.pay(snapToken, {
      onSuccess: async function (result) {
        console.log('Midtrans Success Result:', result);
        try {
          // Menentukan billing cycle berdasarkan state period dari komponen Billing
          const billingCycle = period === '/tahun' ? 'YEARLY' : 'MONTHLY';

          // 1. Hit ke Backend untuk aktivasi paket di DB lokal
          if (typeof api !== 'undefined') {
            await api.post('/billing/subscription/activate', {
              package_type: planName,
              billing_cycle: billingCycle,
            });

            // 2. Ambil ulang profile user terbaru pasca-upgrade
            const me = await api.get('/auth/me');
            localStorage.setItem('user', JSON.stringify(me.data?.user || me.data));
          }

          setLoading(false);
          setPaymentSuccess(true);
        } catch (err) {
          console.error('Gagal sinkronisasi data langganan di server lokal:', err);
          setLoading(false);
          // Tetap tandai sukses karena pembayaran di Midtrans sebenarnya sudah berhasil resmi
          setPaymentSuccess(true);
        }
      },

      onPending: function (result) {
        console.log('Payment Pending:', result);
        setLoading(false);
        alert('Pembayaran Anda sedang ditinjau / pending. Selesaikan proses di aplikasi wallet/bank Anda.');
        navigate('/billing'); // Arahkan kembali ke billing agar user bisa mengecek berkala
      },

      onError: function (result) {
        console.error('Payment Error:', result);
        setLoading(false);
        alert('Pembayaran gagal dilakukan. Silakan coba kembali.');
      },

      // =========================================================
      // 💡 RESOLVE STATE SAAT POPUP DITUTUP MANUAL
      // =========================================================
      onClose: function () {
        console.log('User closed the snap popup.');
        setLoading(false);

        alert('Pembayaran dibatalkan. Anda bisa mencoba kembali kapan saja melalui menu ini.');

        // Alihkan navigasi secara aman untuk mereset frame komunikasi localhost vs Sandbox
        navigate('/billing');
      },
    });
  }, [snapToken, planName, period, navigate]);

  // =========================
  // AUTO OPEN SNAP MODAL
  // =========================
  useEffect(() => {
    if (snapToken) {
      const timeout = setTimeout(() => {
        handleOpenPayment();
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [snapToken, handleOpenPayment]);

  // =========================
  // RENDER: SUCCESS SCREEN
  // =========================
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={42} className="text-emerald-600" />
          </div>

          <h1 className="text-3xl font-black text-slate-900">Pembayaran Berhasil</h1>
          <p className="text-slate-500 mt-3">Subscription premium berhasil diaktifkan.</p>

          <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-100 p-5 text-left space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Paket</span>
              <span className="font-bold">{planName} ({period === '/tahun' ? 'TAHUNAN' : 'BULANAN'})</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="font-black text-red-500">{formatRupiah(price)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Order ID</span>
              <span className="font-mono text-xs font-bold">{orderId}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="mt-8 w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all"
          >
            Masuk Dashboard
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // RENDER: MAIN SCREEN
  // =========================
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Kembali
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} />
            Secured by Midtrans
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* LEFT PANEL */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Sparkles size={15} />
              Secure Checkout
            </div>

            <h1 className="text-4xl font-black text-slate-900 leading-tight">
              Selesaikan Pembayaran
            </h1>
            <p className="mt-4 text-slate-500 leading-relaxed">
              Semua metode pembayaran tersedia otomatis melalui Midtrans Snap.
            </p>

            <button
              onClick={handleOpenPayment}
              disabled={loading}
              className="mt-10 w-full h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Membuka Payment...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  Pilih Metode Pembayaran
                </>
              )}
            </button>
          </div>

          {/* RIGHT PANEL (SUMMARY) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-2xl">
            <p className="text-sm uppercase tracking-wider text-slate-400 font-bold">
              Ringkasan Pembayaran
            </p>

            <div className="mt-8">
              <div className="flex justify-between items-center pb-5 border-b border-white/10">
                <div>
                  <p className="text-slate-400 text-sm">Paket</p>
                  <h2 className="text-3xl font-black mt-2">{planName}</h2>
                </div>
                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center">
                  <CreditCard size={28} />
                </div>
              </div>

              <div className="space-y-5 mt-8">
                <div className="flex justify-between">
                  <span className="text-slate-400">Harga</span>
                  <span className="font-bold">{formatRupiah(price)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Durasi</span>
                  <span className="font-bold">{period === '/tahun' ? 'Per Tahun' : 'Per Bulan'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID</span>
                  <span className="font-mono text-xs font-bold">{orderId}</span>
                </div>

                <div className="border-t border-white/10 pt-6 flex justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-3xl font-black text-red-400">{formatRupiah(price)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={14} />
          Semua transaksi diproses aman menggunakan Midtrans Snap
        </div>
      </div>
    </div>
  );
};

export default Payment;