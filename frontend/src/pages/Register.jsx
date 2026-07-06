import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EyeOff, Eye, Building2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({ 
    name: '', 
    company_name: '', // 👈 Menambahkan field company_name untuk tabel tbr_tenants
    phone_number: '', // 🔧 FIX: field nomor telepon agar tersimpan ke tbr_users
    email: '', 
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
      try {
          const response = await api.post('/auth/register', formData);
          
          if (response.data.success) {
            alert("Registrasi Berhasil! Silakan login untuk masuk.");
            
            // 🛠️ PASTIKAN NAVIGASI DIARAHKAN KE /login
            navigate('/login'); 
          }
        } catch (error) {
          console.error("Register error:", error);
        }
      };

  return (
    <div className="flex min-h-screen w-full bg-white antialiased">
      {/* Sisi Visual Merah (Identik dengan Login) */}
      <div className="hidden lg:flex flex-1 bg-[#D31217] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-white/5 rounded-full -top-20 -left-20"></div>
        <div className="absolute w-64 h-64 bg-white/5 rounded-full -bottom-10 -right-10"></div>
        <div className="relative z-10 text-center">
          <h1 className="text-6xl font-black text-white mb-4 tracking-tighter">ScrumApps</h1>
          <p className="text-white/80 text-xl max-w-sm mx-auto leading-relaxed font-medium">
            Bergabunglah dan kelola proyek agile kamu dengan lebih mudah dan terstruktur.
          </p>
        </div>
      </div>

      {/* Sisi Form Register */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-24 bg-white">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-2">Daftar</h2>
            <p className="text-slate-500 font-medium">Buat akun ScrumApps Anda.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-semibold shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Input Nama Lengkap */}
            <input 
              name="name" 
              placeholder="Nama Lengkap" 
              onChange={handleChange} 
              required 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#D31217] outline-none transition-all" 
            />

            {/* 🆕 Input Nama Perusahaan / Workspace */}
            <div className="relative">
              <input 
                name="company_name" 
                placeholder="Nama Perusahaan / Organisasi" 
                onChange={handleChange} 
                required 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#D31217] outline-none transition-all pr-12" 
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Building2 size={20} />
              </div>
            </div>

            {/* 🔧 FIX: Input Nomor Telepon agar tersimpan ke tbr_users */}
            <input 
              name="phone_number" 
              type="tel" 
              placeholder="Nomor Handphone (WhatsApp)" 
              onChange={handleChange} 
              required 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#D31217] outline-none transition-all" 
            />

            {/* Input Email */}
            <input 
              name="email" 
              type="email" 
              placeholder="Email" 
              onChange={handleChange} 
              required 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#D31217] outline-none transition-all" 
            />
            
            {/* Input Password dengan Toggle Visibility */}
            <div className="relative">
              <input 
                name="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                onChange={handleChange} 
                required 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#D31217] outline-none transition-all pr-12" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <p className="text-xs text-slate-400 px-1 leading-relaxed">
              Akun Anda akan otomatis dibuat sebagai <span className="font-bold text-slate-600">Admin</span> dari workspace baru.
              Untuk mengundang anggota tim dengan role lain (Product Owner, Developer, dll), gunakan menu undangan setelah login.
            </p>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-4 bg-[#D31217] text-white rounded-2xl font-bold text-lg hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-100 disabled:opacity-50"
            >
              {isLoading ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 font-medium">
            Sudah punya akun? <Link to="/login" className="text-[#D31217] font-bold hover:underline">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;