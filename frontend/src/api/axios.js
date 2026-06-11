import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
    }

    // 3. Menyuntikkan X-Tenant-ID ke Header untuk Isolasi Data SaaS
    // 🔥 PERBAIKAN: Validasi ekstra untuk mencegah string "NULL" dari database lolos ke header
    const rawTenantId = user?.tenant_id;
    const roleLower = user?.role?.toString().toLowerCase() || '';

    if (rawTenantId && rawTenantId !== 'NULL' && rawTenantId !== 'null') {
      config.headers['X-Tenant-ID'] = rawTenantId;
    } else if (roleLower.includes('admin') || roleLower.includes('superadmin')) {
      // 🔥 FALLBACK: Jika Superadmin memiliki tenant_id NULL di DB, bypass otomatis dengan ID '1'
      config.headers['X-Tenant-ID'] = '1';
    }

    // 4. Menyuntikkan X-Plan-ID untuk Validasi Paket Fitur di Backend
    if (user?.package_type || user?.plan_id) {
      config.headers['X-Plan-ID'] = user.package_type || user.plan_id;
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

    // ✨ PENJINAKAN ERROR 409 CONFLICT (Kasus Webhook GitHub Duplikat)
    // Jika backend melempar 409 karena webhook sudah terdaftar, jinakkan di sini 
    // agar di sisi Frontend React masuk ke blok 'try' dan tidak mengotori console browser.
    if (error.response && error.response.status === 409 && originalRequest.url.includes('/github-webhooks')) {
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
    if (error.response && error.response.status === 401) {
      console.warn('🔥 Token tidak valid atau kedaluwarsa. Mengarahkan ke login...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Maksa browser kembali ke login secara bersih jika tidak di dalam proses refresh token
      if (!originalRequest._retry && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;