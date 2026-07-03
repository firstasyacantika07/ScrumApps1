import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000, // Tambahan opsional: timeout 10 detik agar UI tidak hang jika server overload
});

// ======================================================
// 🚀 INTERCEPTOR REQUEST (Injeksi Token & Tenant ID)
// ======================================================
api.interceptors.request.use(
  (config) => {
    // 1. Ambil data user dari localStorage secara aman
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // 2. Pembacaan Token secara Fleksibel (Mencegah "Token diperlukan")
    const token = localStorage.getItem('token') || user?.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    // 3. Menyuntikkan X-Tenant-ID ke Header untuk Isolasi Data SaaS
    // 🔥 PERBAIKAN: Validasi ekstra untuk mencegah string "NULL" dari database lolos ke header
    const rawTenantId = user?.tenant_id;
    const roleLower = user?.role?.toString().toLowerCase() || '';

    if (rawTenantId && rawTenantId !== 'NULL' && rawTenantId !== 'null') {
      config.headers['X-Tenant-ID'] = rawTenantId;
    } else if (roleLower === 'superadmin') {
      // 🛠️ FIX: sebelumnya roleLower.includes('admin') ikut menangkap role
      // "admin" biasa (tenant admin), sehingga admin workspace yang tenant_id-nya
      // kosong di localStorage dipaksa memakai tenant_id '1' yang salah,
      // menyebabkan semua data (billing, projects, dll) tampak kosong/0.
      // Fallback hardcode ini sekarang HANYA untuk superadmin sejati (exact match),
      // yang secara desain memang boleh tidak terikat tenant tertentu.
      config.headers['X-Tenant-ID'] = '1';
    } else {
      delete config.headers['X-Tenant-ID'];
    }

    // 4. Menyuntikkan X-Plan-ID untuk Validasi Paket Fitur di Backend
    if (user?.package_type || user?.plan_id) {
      config.headers['X-Plan-ID'] = user.package_type || user.plan_id;
    } else {
      delete config.headers['X-Plan-ID'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ======================================================
// 📥 INTERCEPTOR RESPONSE (Pembersihan Sesi & Harmonisasi Error)
// ======================================================
api.interceptors.response.use(
  (response) => {
    // Jika response sukses biasa, langsung teruskan data
    return response;
  },
  (error) => {
    const originalRequest = error.config;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    // ✨ PENJINAKAN ERROR 409 CONFLICT (Kasus Webhook GitHub Duplikat)
    // 🔥 OPTIMASI: Ditambahkan .toLowerCase() agar deteksi kebal terhadap variasi penulisan endpoint URL
    if (
      error.response && 
      error.response.status === 409 && 
      originalRequest.url && 
      originalRequest.url.toLowerCase().includes('github-webhooks')
    ) {
      console.log('ℹ️ Webhook sudah dikonfigurasi sebelumnya. Menjinakkan status 409 menjadi sukses.');
      
      // Manipulasi response error menjadi bentuk response sukses tiruan
      return {
        data: {
          success: true,
          isDuplicate: true,
          message: error.response.data?.message || 'Webhook sudah aktif dan terkonfigurasi!'
        },
        status: 200,
        statusText: 'OK',
        headers: error.response.headers,
        config: originalRequest,
      };
    }

    // 🔐 OTOMATIS LOGOUT JIKA TOKEN EXPIRED (Status 401)
    // 🔥 PERBAIKAN: Jangan usir user jika error 401 berasal dari proses login/auth itu sendiri atau jika user sudah di halaman login
    const isAuthRequest = originalRequest.url && originalRequest.url.toLowerCase().includes('/auth');
    
    if (error.response && error.response.status === 401 && !isAuthRequest) {
      console.warn('🔥 Token tidak valid atau kedaluwarsa. Mengarahkan ke login...');
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Maksa browser kembali ke login secara bersih jika tidak di dalam proses refresh token
      if (!originalRequest._retry && typeof window !== 'undefined' && currentPath !== '/login') {
        // Gunakan replace agar user tidak terjebak dalam loop tombol "back" di browser
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;