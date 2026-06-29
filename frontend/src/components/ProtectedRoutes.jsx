import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ✅ FIX: Tambahkan allowedRoles ke dalam destructuring props di bawah ini
const ProtectedRoute = ({ children, requiredPackage, allowedRoles }) => {
    // Menggunakan 'loading' agar sinkron dengan AuthContext.jsx
    const { user, packageType, loading } = useAuth();
    const location = useLocation();

    // Menangani state loading agar tidak muncul blank screen saat verifikasi session
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p>Memverifikasi Sesi...</p>
            </div>
        ); 
    }

    // 1. Jika belum login, tendang ke halaman login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Jika status expired, paksa buka halaman billing (kecuali jika dia sudah berada di halaman billing/payment)
    if (user.subscription_status === 'expired' && location.pathname !== '/billing' && location.pathname !== '/payment') {
        return <Navigate to="/billing" replace />;
    }

    // 3. Jika rute meminta paket spesifik (PRO/ENTERPRISE), cek kuota paket user
    if (requiredPackage && packageType === 'FREE') {
        alert("Fitur ini memerlukan paket PRO / Enterprise. Silakan lakukan upgrade paket!");
        return <Navigate to="/dashboard" replace />;
    }

    // 4. Pengecekan Hak Akses Role (Sudah aman karena allowedRoles didefinisikan sebagai prop)
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        alert(`Akses Ditolak! Akun Anda (${user?.role || 'Tanpa Role'}) tidak diizinkan mengakses halaman ini.`);
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;