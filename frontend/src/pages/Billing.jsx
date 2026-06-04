import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  ShieldCheck,
  Crown,
  Sparkles,
  ArrowRight,
  Rocket,
  Lock,
  Users,
  FolderKanban,
  FileText,
  GitBranch,
  Loader2,
} from 'lucide-react';
import api from '../api/axios';

const Billing = () => {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loadingTrial, setLoadingTrial] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // State Subscription terintegrasi dengan field Trial baru
  const [subscription, setSubscription] = useState({
    plan: 'FREE',
    status: 'ACTIVE',
    billingCycle: 'NONE',
    trialUsed: false,
    endDate: null,
    expiredTrial: false,
    paymentMethod: 'Midtrans',
    totalSpent: 0,
  });

  const [plans, setPlans] = useState([]);

  useEffect(() => {
    loadProfile();
  }, []);

  // ==========================================
  // 1. LOAD USER PROFILE & STATUS SUBSCRIPTION
  // ==========================================
  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await api.get('/auth/me');
      const user = res.data?.user || res.data || {};

      const userPlan = (user.package_type || 'FREE').toUpperCase();
      const userStatus = (user.subscription_status || 'ACTIVE').toUpperCase();
      const userCycle = (user.billing_cycle || 'NONE').toUpperCase();

      setSubscription({
        plan: userPlan,
        status: userStatus,
        billingCycle: userCycle,
        trialUsed: !!user.trial_used,
        endDate: user.end_date || null,
        expiredTrial: !!user.expired_trial,
        paymentMethod: 'Midtrans',
        totalSpent: 0,
      });

    } catch (err) {
      console.error("Gagal memuat profil pengguna:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // ==========================================
  // 2. FETCH & MAP PLANS FROM DATABASE
  // ==========================================
  // Mengekstrak nilai string primitif agar tidak memicu re-fetch akibat referensi objek state yang berubah
  const currentSubPlan = subscription.plan;
  const currentSubCycle = subscription.billingCycle;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/payment/plans');
        const plansData = response.data?.data || response.data || [];

        if (!Array.isArray(plansData) || plansData.length === 0) return;

        const formattedPlans = plansData.map((plan) => {
          const planId = Number(plan.id);
          
          let currentIcon = Crown;
          if (plan.name === 'FREE') currentIcon = Lock;
          if (plan.name === 'ENTERPRISE') currentIcon = Rocket;

          let description = 'Pilihan terbaik untuk startup dan tim berkembang.';
          if (plan.name === 'FREE') description = 'Cocok untuk individu yang baru mulai menggunakan ScrumApps.';
          if (plan.name === 'ENTERPRISE') description = 'Solusi enterprise untuk perusahaan dengan skala besar.';

          const dynamicFeatures = [
            {
              icon: FolderKanban,
              text: planId === 3 ? 'Project tanpa batas' : `${plan.max_projects} Project`,
            },
            {
              icon: Users,
              text: planId === 3 ? 'Anggota tim tanpa batas' : `Maksimal ${plan.max_team_per_project} anggota / project`,
            },
          ];

          if (plan.pdf_feature === 'watermark') {
            dynamicFeatures.push({ icon: FileText, text: 'Backlog PDF dengan watermark' });
          } else if (plan.pdf_feature === 'no_watermark') {
            dynamicFeatures.push({ icon: FileText, text: 'Backlog PDF tanpa watermark' });
          } else {
            dynamicFeatures.push({ icon: FileText, text: 'Backlog PDF custom logo perusahaan' });
          }

          if (plan.has_github_integration || planId === 3) {
            dynamicFeatures.push({ icon: GitBranch, text: 'Integrasi GitHub' });
          }

          // Aturan tombol disable:
          let isButtonDisabled = plan.name === currentSubPlan;
          if (currentSubPlan === 'PRO' && currentSubCycle !== 'TRIAL' && plan.name === 'FREE') {
            isButtonDisabled = true;
          }

          // Teks default tombol berdasarkan jenis paket
          let buttonText = 'Pilih Paket';
          if (plan.name === 'FREE') buttonText = 'Paket Saat Ini';
          if (plan.name === 'ENTERPRISE') buttonText = 'Hubungi Sales';

          return {
            id: planId,
            name: plan.name,
            monthlyPrice: plan.price_monthly ? Number(plan.price_monthly) : null,
            yearlyPrice: plan.price_yearly ? Number(plan.price_yearly) : null,
            icon: currentIcon,
            popular: plan.name === 'PRO',
            description: description,
            disabled: isButtonDisabled,
            features: dynamicFeatures,
            buttonText: buttonText,
          };
        });

        setPlans(formattedPlans);
      } catch (err) {
        console.error('Gagal mengambil data paket dari API:', err);
      }
    };

    if (!loadingProfile) {
      fetchPlans();
    }
  }, [loadingProfile, currentSubPlan, currentSubCycle]);

  // ==========================================
  // 3. ACTION HANDLERS (TRIAL & BUY)
  // ==========================================
  const handleStartTrial = async (plan) => {
    try {
      setLoadingTrial(true);
      const res = await api.post('/payment/start-trial');
      
      alert(res.data?.message || "Trial PRO aktif selama 7 hari");
      loadProfile(); 
    } catch (err) {
      alert(err.response?.data?.message || "Gagal mengaktifkan Trial.");
    } finally {
      setLoadingTrial(false);
    }
  };

  const handleBuyPlan = async (plan) => {
    try {
      if (Number(plan.id) === 3) {
        alert('Silakan hubungi sales untuk migrasi ke paket Enterprise.');
        return;
      }
      if (Number(plan.id) === 1) return;

      setLoadingPlan(plan.id);

      const res = await api.post('/payment/create-transaction', {
        planId: Number(plan.id),
        planName: plan.name,
        billingCycle: 'MONTHLY', 
      });

      const data = res.data;
      if (!data.success) {
        alert(data.message || 'Gagal membuat transaksi pembayaran.');
        return;
      }

      navigate('/payment', {
        state: {
          snapToken: data.token, 
          redirectUrl: data.redirect_url,
          orderId: data.order_id,
          planName: plan.name,
          price: plan.monthlyPrice,
          period: '/bulan',
        },
      });
    } catch (error) {
      console.error('Payment Selection Error:', error);
      alert(error.response?.data?.message || 'Server payment gagal dihubungi.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleSelectPlan = (plan) => {
    if (Number(plan.id) === 3) {
      alert('Silakan hubungi sales untuk migrasi ke paket Enterprise.');
      return;
    }
    if (Number(plan.id) === 1) {
      alert('Anda sudah berada di paket FREE.');
      return;
    }
    handleBuyPlan(plan);
  };

  const formatRupiah = (value) => {
    if (value === null || value === undefined) return 'Custom';
    if (value === 0) return 'Gratis';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-red-500" size={40} />
        <p className="text-slate-500 font-medium text-sm">Memuat data langganan...</p>
      </div>
    );
  }

  const remainingDays = subscription.endDate 
    ? Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-5 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-bold mb-5">
            <Sparkles size={16} />
            Subscription Management
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4">
            Billing & Subscription
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl leading-relaxed">
            Kelola subscription akun Anda dan nikmati semua fitur Premium ScrumApps.
          </p>
        </div>

        {/* CURRENT PLAN BOX */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
                  <Crown className="text-white" size={30} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900">
                    {subscription.plan} {subscription.billingCycle === 'TRIAL' && '(PRO TRIAL)'}
                  </h2>
                  <p className="text-slate-500 mt-2">
                    {subscription.billingCycle === 'TRIAL' 
                      ? `Masa uji coba aktif. Berakhir dalam ${remainingDays} hari lagi.` 
                      : subscription.expiredTrial 
                      ? "Masa uji coba trial Anda telah habis." 
                      : "Paket aktif saat ini."}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide ${
                      subscription.expiredTrial ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {subscription.expiredTrial ? 'EXPIRED' : subscription.status}
                    </span>
                    {subscription.billingCycle === 'TRIAL' && (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-md">
                        Selesai pada: {subscription.endDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(subscription.plan === 'FREE' || subscription.billingCycle === 'TRIAL' || subscription.expiredTrial) && (
                <button
                  onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                  className="h-14 px-7 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-lg shrink-0"
                >
                  {subscription.expiredTrial ? 'Perpanjang Sekarang' : 'Upgrade Plan'}
                </button>
              )}
            </div>

            {/* INTEGRASI METODE PEMBAYARAN */}
            <div className="mt-8 bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <CreditCard size={22} className="text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900">{subscription.paymentMethod}</p>
                <p className="text-sm text-slate-500 mt-1">Sistem gerbang pembayaran aman otomatis</p>
              </div>
            </div>
          </div>

          {/* SPENDING BOX */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <p className="text-slate-400 text-sm uppercase font-bold tracking-wide">Total Spending</p>
              <h2 className="text-4xl font-black mt-4">{formatRupiah(subscription.totalSpent)}</h2>
            </div>
          </div>
        </div>

        {/* PLANS GRID */}
        <div id="plans">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-black text-slate-900 mb-3">Pilih Paket Terbaik</h2>
            <p className="text-slate-500 text-lg">Nikmati skalabilitas manajemen tanpa batas rintangan.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, index) => {
              const CurrentIcon = plan.icon || Crown;
              const isProPlanCard = Number(plan.id) === 2;

              return (
                <div
                  key={plan.id || index}
                  className={`relative bg-white rounded-3xl p-8 border transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between ${
                    plan.popular
                      ? 'border-red-500 shadow-2xl shadow-red-100 lg:scale-105 z-10'
                      : 'border-slate-200 shadow-sm'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      RECOMMENDED
                    </div>
                  )}

                  <div>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                      plan.popular ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <CurrentIcon size={26} />
                    </div>

                    <h3 className="text-2xl font-black text-slate-900">{plan.name} PLAN</h3>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed min-h-[52px]">{plan.description}</p>

                    {/* PRICING AREA */}
                    <div className="mt-6 mb-6">
                      {isProPlanCard ? (
                        <>
                          <div className="flex items-end gap-1">
                            <span className="text-4xl font-black text-slate-900">{formatRupiah(plan.monthlyPrice)}</span>
                            <span className="text-slate-400 mb-1 text-sm font-medium">/bulan</span>
                          </div>
                          <p className="text-sm text-slate-500 mt-2">{formatRupiah(plan.yearlyPrice)} /tahun</p>
                        </>
                      ) : (
                        <div className="text-4xl font-black text-slate-900">
                          {Number(plan.id) === 1 ? 'Gratis' : 'Custom'}
                        </div>
                      )}
                    </div>

                    {/* LIST FEATURES */}
                    <div className="space-y-4 mb-8 border-t border-slate-100 pt-5">
                      {plan.features?.map((feature, idx) => {
                        const FeatureIcon = feature.icon || ShieldCheck; 
                        // Perbaikan: Menambahkan kembalian nilai (return eksplisit) agar UI fitur tampil
                        return (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                              <FeatureIcon size={16} className="text-emerald-600" />
                            </div>
                            <span className="text-slate-600 text-sm leading-relaxed">{feature.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* DOUBLE BUTTON INJECTION (Untuk Paket PRO) */}
                  {isProPlanCard ? (
                    <div className="flex flex-col gap-2 w-full">
                      {!subscription.trialUsed && subscription.plan !== 'PRO' ? (
                        <button
                          disabled={loadingTrial}
                          onClick={() => handleStartTrial(plan)}
                          className="w-full h-12 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white transition-all text-sm flex items-center justify-center gap-2"
                        >
                          {loadingTrial ? <Loader2 size={16} className="animate-spin" /> : 'Mulai Trial 7 Hari'}
                        </button>
                      ) : (
                        <div className="w-full text-center py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                          {subscription.billingCycle === 'TRIAL' ? 'Sedang Menjalani Trial' : 'Kuota Trial Sudah Terpakai'}
                        </div>
                      )}

                      <button
                        disabled={subscription.plan === 'PRO' && subscription.billingCycle !== 'TRIAL'}
                        onClick={() => handleBuyPlan(plan)}
                        className={`w-full h-12 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 ${
                          subscription.plan === 'PRO' && subscription.billingCycle !== 'TRIAL'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600 text-white shadow-md'
                        }`}
                      >
                        {loadingPlan === plan.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            {subscription.plan === 'PRO' && subscription.billingCycle !== 'TRIAL' ? 'Paket Aktif' : 'Beli Sekarang'}
                            {subscription.plan !== 'PRO' && <ArrowRight size={14} />}
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* STANDAR BUTTON (Untuk Paket FREE & ENTERPRISE) */
                    <button
                      disabled={plan.disabled || loadingPlan === plan.id}
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full h-14 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                        plan.disabled
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      {plan.name === subscription.plan ? 'Paket Saat Ini' : plan.buttonText}
                      {!plan.disabled && <ArrowRight size={16} />}
                    </button>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-16 flex items-center justify-center gap-2 text-xs text-slate-400 border-t border-slate-200/60 pt-6">
          <ShieldCheck size={14} />
          <span>Semua pembayaran komersial diproses aman menggunakan Midtrans</span>
        </div>

      </div>
    </div>
  );
};

export default Billing;