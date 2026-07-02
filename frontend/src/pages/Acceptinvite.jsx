import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { User, Lock, Phone, Eye, EyeOff, CheckCircle, ShieldAlert, KeyRound } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token');

  // State Manajemen Form
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    gender: 'male',
    password: '',
    confirmPassword: ''
  });

  // State UI & Validasi
  const [invitedEmail, setInvitedEmail] = useState('');
  const [assignedRole, setAssignedRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Validasi Token Saat Halaman Pertama Kali Diakses
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setIsValidToken(false);
      setErrorMsg("Token undangan tidak ditemukan atau tidak valid.");
      return;
    }

    const verifyToken = async () => {
      try {
        // Ganti endpoint ini sesuai dengan arsitektur backend invitations-mu
        const res = await api.get(`/invitations/verify?token=${token}`);
        setInvitedEmail(res.data?.data?.email || res.data?.email);
        setAssignedRole(res.data?.data?.role || res.data?.role);
        setIsValidToken(true);
      } catch (err) {
        console.error("VERIFY TOKEN ERROR:", err);
        setErrorMsg(err?.response?.data?.message || "Tautan undangan telah kedaluwarsa atau sudah pernah digunakan.");
        setIsValidToken(false);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // 2. Handler Kirim Data Registrasi
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    try {
      setLoading(true);
      // Kirim payload lengkap beserta token aktivasi ke backend
      const res = await api.post('/invitations/accept', {
        token,
        name: formData.name,
        phone_number: formData.phone_number,
        gender: formData.gender,
        password: formData.password
      });

      // 🔧 FIX: Auto-login pakai token dari backend, lalu arahkan ke dashboard
      // (akses menu/halaman selanjutnya otomatis terbatas sesuai role lewat AllowedRolesRoute)
      if (res.data?.token) {
        login(res.data.token, res.data.user);
        navigate('/dashboard');
      } else {
        alert("Registrasi berhasil! Silakan login.");
        navigate('/login');
      }
    } catch (err) {
      console.error("ACCEPT INVITATION ERROR:", err);
      setErrorMsg(err?.response?.data?.message || "Gagal mengaktivasi akun. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // --- STATE LOADING VERIFIKASI ---
  if (loading && !isValidToken && !errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#ee1e2d] rounded-full animate-spin"></div>
        <p className="text-xs font-black text-slate-400 mt-4 uppercase tracking-widest">Memvalidasi Kredensial Undangan...</p>
      </div>
    );
  }

  // --- STATE JIKA TOKEN INVALID / KEDALUWARSA ---
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center text-[#ee1e2d] mx-auto mb-6">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Undangan Tidak Valid</h2>
          <p className="text-slate-400 text-xs font-medium mt-3 leading-relaxed">
            {errorMsg}
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full mt-8 py-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  // --- Halaman Utama Formulir Aktivasi ---
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-md w-full p-10 transform transition-all">
        
        {/* Header Form */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-4">
            <KeyRound size={24} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Bergabung dengan Tim</h2>
          <p className="text-slate-400 font-bold mt-1 uppercase text-[9px] tracking-[2px]">
            Selesaikan profil untuk mengakses workspace organisasi
          </p>
        </div>

        {/* Info Box Email & Role */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 text-xs font-semibold text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Email Diundang:</span>
            <span className="text-slate-800 font-bold">{invitedEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Hak Akses Struktural:</span>
            <span className="px-2 py-0.5 bg-[#ee1e2d]/10 text-[#ee1e2d] rounded text-[10px] font-black uppercase tracking-wide">
              {assignedRole}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-[#ee1e2d]">
            {errorMsg}
          </div>
        )}

        {/* Form Pendaftaran Mandiri */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                required
                placeholder="Masukkan nama asli Anda"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ee1e2d]/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nomor Handphone (WhatsApp)</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="tel"
                required
                placeholder="Contoh: 08123456789"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ee1e2d]/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Jenis Kelamin</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'male' })}
                className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${formData.gender === 'male' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}
              >
                Laki-Laki
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, gender: 'female' })}
                className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${formData.gender === 'female' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'}`}
              >
                Perempuan
              </button>
            </div>
          </div>

          <hr className="my-4 border-slate-100" />

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Kata Sandi Baru</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Minimal 6 karakter..."
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ee1e2d]/20 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Konfirmasi Kata Sandi</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Ulangi kata sandi..."
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#ee1e2d]/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-slate-400"
          >
            <CheckCircle size={14} /> Aktivasi Akun Saya
          </button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvite;