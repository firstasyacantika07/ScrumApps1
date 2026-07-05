import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../api/axios';

const AuthContext = createContext();

const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    const decoded = parseJwt(token);
                    if (!decoded || decoded.exp * 1000 < Date.now()) {
                        clearAuthData();
                    } else {
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        setUser(JSON.parse(storedUser));
                    }
                } catch (error) {
                    console.error("Gagal memulihkan sesi login:", error);
                    clearAuthData();
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
    };

    const logout = useCallback(() => {
        clearAuthData();
        setUser(null);
    }, []);

    // 💡 PENAMBAHAN: Fungsi untuk update state user secara instan dari komponen eksternal (seperti Payment)
    const updateUserDirectly = useCallback((newUserData) => {
        if (!newUserData) return;
        localStorage.setItem('user', JSON.stringify(newUserData));
        setUser(newUserData);
    }, []);

    // 🔄 FIX: Fungsi sinkronisasi data user dari server menggunakan custom instance 'api'
    const refreshUser = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;

            const response = await api.get('/auth/me');

            // Fleksibilitas pengecekan response struktur data backend
            if (response.data) {
                const freshUserData = response.data.user || response.data.data || response.data;

                if (freshUserData) {
                    localStorage.setItem('user', JSON.stringify(freshUserData));
                    setUser(freshUserData);
                    console.log("Sesi user berhasil disinkronkan via Custom Instance:", freshUserData.package_type);
                    return freshUserData;
                }
            }
        } catch (error) {
            console.error("Gagal menyegarkan data user dari server:", error);
            if (error.response && error.response.status === 401) {
                logout();
            }
        }
        return null;
    }, [logout]);

    const switchWorkspace = (tenantId) => {
        if (!user || !user.workspaces) return;
        const selected = user.workspaces.find(ws => ws.tenant_id === Number(tenantId));

        if (selected) {
            const updatedUser = {
                ...user,
                tenant_id: selected.tenant_id,
                role: selected.role,
                package_type: selected.package_type || user.package_type, // Fallback ke user level jika workspace kosong
                billing_cycle: selected.billing_cycle,
                subscription_status: selected.tenant_status || selected.subscription_status,
                trial_end: selected.trial_end
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            // Reload halaman untuk mereset seluruh state aplikasi (cara paling aman)
            window.location.href = '/dashboard';
        }
    };

    const hasRole = (allowedRoles = []) => {
        if (!user) return false;
        return allowedRoles.includes(user.role);
    };

    const isSubscriptionActive = () => {
        if (!user) return false;
        if (user.role === 'superadmin') return true;

        // Cek toleransi status jika backend mengirimkan 'active' atau data subscription valid
        return user.subscription_status === 'active' || user.package_type === 'PRO';
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            refreshUser,
            updateUserDirectly, // Di-export agar bisa dipakai di Payment.jsx
            switchWorkspace,
            hasRole,
            isSubscriptionActive,
            packageType: user?.package_type || 'FREE'
        }}>
            {children}
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