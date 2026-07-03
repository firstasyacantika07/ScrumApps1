import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EyeOff, Eye } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import api from '../api/axios';

// ✅ FIX: Import useAuth agar login() bisa update state AuthContext
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ FIX: Ambil fungsi login() dari AuthContext
  const { login } = useAuth();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // 🔐 HANDLER 1: Login Form Biasa (Email & Password)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError("Email dan password wajib diisi");
      return;
    }
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { 
        email, 
        password,
        rememberMe 
      });

      if (response.data?.token) {
        // ✅ FIX: Ganti localStorage.setItem manual dengan login() dari AuthContext
        // login() otomatis simpan token, set axios header, dan update state user
        login(response.data.token, response.data.user);
        
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }

        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login gagal, silakan cek kembali email dan password Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🌐 HANDLER 2: Sukses Otentikasi Google Frontend -> Kirim ke Backend
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    
    try {
      const response = await api.post('/auth/google', {
        token: credentialResponse.credential
      });

      if (response.data?.token) {
        // ✅ FIX: Sama seperti di atas, pakai login() dari AuthContext
        login(response.data.token, response.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal sinkronisasi akun Google dengan server internal.");
    } finally {
      setIsLoading(false);
    }
  };

  // ⚠️ HANDLER 3: Gagal Otentikasi Pop-up Google
  const handleGoogleError = () => {
    setError("Otentikasi Google dibatalkan atau gagal berjalan.");
  };

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="flex min-h-screen w-full bg-white antialiased">
        
        {/* KIRI: Sisi Visual Merah (Brand Area) */}
        <div className="hidden lg:flex flex-1 bg-[#D31217] items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute w-96 h-96 bg-white/5 rounded-full -top-20 -left-20"></div>
          <div className="absolute w-64 h-64 bg-white/5 rounded-full -bottom-10 -right-10"></div>
          
          <div className="relative z-10 text-center">
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

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-semibold shadow-sm animate-fade-in">
                {error}
              </div>
            )}

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
                  <Link to="/forgot-password" className="text-[#D31217] text-xs font-bold hover:underline">Lupa sandi?</Link>
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
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-[#D31217] focus:ring-[#D31217] cursor-pointer" 
                  />
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

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Atau</span>
              </div>
            </div>

            <div className="w-full flex justify-center GoogleLoginWrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                shape="pill"
                width="400px"
                locale="id"
              />
            </div>
            
            <p className="mt-8 text-center text-slate-500 font-medium">
              Belum punya akun? <Link to="/register" className="text-[#D31217] font-bold hover:underline">Daftar di sini</Link>
            </p>

            <p className="mt-12 text-slate-300 text-[10px] text-center uppercase tracking-[4px] font-bold italic">
              ScrumApps Project Management Tool
            </p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login;