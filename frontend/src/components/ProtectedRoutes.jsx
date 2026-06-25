import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredPackage }) => {
    const { user, isSubscriptionActive, packageType } = useAuth();
    const location = useLocation();

    // 1. Jika belum login, tendang ke halaman login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Jika status expired, paksa buka halaman billing
    if (user.subscription_status === 'expired' && location.pathname !== '/billing') {
        return <Navigate to="/billing" replace />;
    }

    // 3. Jika rute meminta paket spesifik (PRO/ENTERPRISE), cek kuota user
    if (requiredPackage && packageType === 'FREE') {
        alert("Fitur ini memerlukan paket PRO. Silakan upgrade!");
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;