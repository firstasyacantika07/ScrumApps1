import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

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

    const switchWorkspace = (tenantId) => {
        if (!user || !user.workspaces) return;
        const selected = user.workspaces.find(ws => ws.tenant_id === Number(tenantId));
        
        if (selected) {
            const updatedUser = {
                ...user,
                tenant_id: selected.tenant_id,
                role: selected.role,
                package_type: selected.package_type,
                billing_cycle: selected.billing_cycle,
                subscription_status: selected.tenant_status,
                trial_end: selected.trial_end
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            // Reload halaman untuk mereset semua state aplikasi (cara paling aman)
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
        return user.subscription_status === 'active';
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
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