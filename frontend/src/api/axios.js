import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Interceptor untuk menyuntikkan Token dan Tenant ID secara otomatis
api.interceptors.request.use(
  (config) => {
    // 1. Ambil data user dari localStorage untuk berjaga-jaga
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // 2. Pembacaan Token secara Fleksibel (Mencegah "Token diperlukan")
    // Mencoba mengambil dari key 'token' langsung, jika null ambil dari objek user.token
    const token = localStorage.getItem('token') || user?.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 3. Menyuntikkan X-Tenant-ID jika data tenant tersedia
    if (user?.tenant_id) {
      config.headers['X-Tenant-ID'] = user.tenant_id;
    }

    return config;
  },
  (error) => {
    // Tangani error request di sini
    return Promise.reject(error);
  }
);

// Tambahkan Interceptor Response (Opsional tetapi Sangat Disarankan)
// Jika backend mengembalikan status 401 (Unauthorized/Token Expired), otomatis bersihkan storage
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('🔥 Token tidak valid atau kedaluwarsa. Mengarahkan ke login...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Kamu bisa menambahkan window.location.href = '/login' di sini jika diperlukan
    }
    return Promise.reject(error);
  }
);

export default api;