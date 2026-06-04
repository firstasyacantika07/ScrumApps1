import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EyeOff, Eye } from 'lucide-react';
import api from '../api/axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Email dan password wajib diisi");
      return;
    }
    setIsLoading(true);

    console.log("Mencoba login dengan:", email);

    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.message || "Login gagal, cek email/password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white antialiased">
      
      {/* KIRI: Sisi Visual Merah (Brand Area) */}
      <div className="hidden lg:flex flex-1 bg-[#D31217] items-center justify-center p-12 relative overflow-hidden">
        {/* Dekorasi Background */}
        <div className="absolute w-96 h-96 bg-white/5 rounded-full -top-20 -left-20"></div>
        <div className="absolute w-64 h-64 bg-white/5 rounded-full -bottom-10 -right-10"></div>
        
        <div className="relative z-10 text-center">
          {/* Ikon Centang & Kalender sesuai Gambar 2 */}
          <div className="w-80 h-80 bg-white/10 rounded-[50px] flex items-center justify-center mb-10 mx-auto border border-white/20 shadow-2xl backdrop-blur-md">
             <div className="w-44 h-44 bg-white rounded-full flex items-center justify-center shadow-2xl relative">
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-[#D31217] rounded-full flex items-center justify-center border-[6px] border-white shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <svg className="w-24 h-24 text-[#D31217]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2a1 1 0 011 1v1h2V3a1 1 0 011-1h2a1 1 0 011 1v1h2V3a1 1 0 011-1h2a1 1 0 011 1v1h1a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h1V3zm2 3v12h12V6H4z" />
                </svg>
             </div>
          </div>
          <h1 className="text-6xl font-black text-white mb-4 tracking-tighter">ScrumApps</h1>
          <p className="text-white/80 text-xl max-w-sm mx-auto leading-relaxed font-medium">
            Kelola proyek agile kamu dengan lebih mudah dan terstruktur.
          </p>
        </div>
        
        {/* Blur Circles using Tailwind */}
        <div className="absolute rounded-full blur-[100px] z-0 w-[400px] h-[400px] bg-white/15 -top-[150px] -left-[100px]"></div>
        <div className="absolute rounded-full blur-[100px] z-0 w-[500px] h-[500px] bg-black/10 -bottom-[200px] -right-[100px]"></div>
      </div>

      {/* KANAN: Sisi Form Login */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-24 bg-white">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-2">Masuk</h2>
            <p className="text-slate-500 font-medium">Gunakan akun ScrumApps Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Alamat Email</label>
              <input
                type="email"
                required
                placeholder="superadmin@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#D31217] focus:bg-white outline-none transition-all placeholder:text-slate-300 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Kata Sandi</label>
                <Link to="#" className="text-[#D31217] text-xs font-bold hover:underline">Lupa sandi?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#D31217] focus:bg-white outline-none transition-all shadow-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center px-1">
              <label className="flex items-center gap-3 text-sm text-slate-500 cursor-pointer group">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-[#D31217] focus:ring-[#D31217] cursor-pointer" />
                <span className="group-hover:text-slate-800 transition-colors font-medium">Ingat saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#D31217] text-white rounded-2xl font-bold text-lg hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-100 disabled:opacity-70"
            >
              {isLoading ? "Memproses..." : "Masuk Sekarang"}
            </button>
          </form>

          {/* --- PEMBATAS / DIVIDER --- */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Atau</span>
            </div>
          </div>

          {/* --- TOMBOL GOOGLE LOGIN --- */}
          <button
            type="button"
            onClick={() => {
              // Logika integrasi Google Auth Anda di sini
              console.log("Login Google diklik");
            }}
            className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold text-base hover:bg-slate-50 hover:border-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.908 3.152-1.928 4.176-1.224 1.224-3.136 2.552-6.792 2.552-5.624 0-10.064-4.576-10.064-10.2s4.44-10.2 10.064-10.2c3.112 0 5.392 1.224 7.072 2.816l2.32-2.32c-1.976-1.872-4.592-3.296-9.392-3.296-8.28 0-15 6.72-15 15s6.72 15 15 15c4.472 0 7.84-1.472 10.424-4.176 2.68-2.68 3.536-6.448 3.536-9.424 0-.896-.08-1.744-.24-2.552H12.48z"
              />
            </svg>
            Masuk dengan Google
          </button>
          
          <p className="mt-20 text-slate-300 text-[10px] text-center uppercase tracking-[4px] font-bold italic">
            ScrumApps Project Management Tool
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;