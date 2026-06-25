import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Fungsi helper sederhana untuk mendekripsi JWT Payload di sisi client tanpa library tambahan
const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Mencegah flicker / redirect liar saat reload halaman

    // 🔄 REHYDRATION LOGIC: Cek sesi aktif setiap kali aplikasi di-refresh
    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    const decoded = parseJwt(token);
                    // Cek jika token JWT bawaan sudah kedaluwarsa secara waktu unix timestamp
                    if (decoded && decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        // Daftarkan token global ke Axios default header
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        setUser(JSON.parse(storedUser));
                    }
                } catch (error) {
                    console.error("Gagal memulihkan sesi login:", error);
                    logout();
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, []);

    /**
     * 🔐 ACTION LOGIN
     * Memproses token, menyimpan profil SaaS, dan mendaftarkan header interseptor global
     */
    const login = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Inject token langsung ke axios instance agar backend verifyToken langsung mengenali
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
    };

    /**
     * 🚪 ACTION LOGOUT
     * Membersihkan seluruh jejak kredensial dari browser client
     */
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    /**
     * 🛡️ UTILITY HELPER: Pengecekan Hak Akses Instan di Sisi Komponen UI
     */
    const hasRole = (allowedRoles = []) => {
        if (!user) return false;
        return allowedRoles.includes(user.role);
    };

    const isSubscriptionActive = () => {
        if (!user) return false;
        // Tenant Superadmin platform utama tidak terikat oleh limitasi paket workspace
        if (user.role === 'superadmin') return true; 
        return user.subscription_status === 'active';
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            login, 
            logout, 
            hasRole, 
            isSubscriptionActive,
            packageType: user?.package_type || 'FREE'
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth harus digunakan di dalam cakupan AuthProvider');
    }
    return context;
};