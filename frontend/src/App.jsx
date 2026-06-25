import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { GoogleOAuthProvider } from '@react-oauth/google';

// ======================================================
// PUBLIC PAGES
// ======================================================
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import AcceptInvite from './pages/Acceptinvite'; // 💡 Dipindah atau dipastikan ter-import

// ======================================================
// PROTECTED PAGES
// ======================================================
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import Users from './pages/Users';
import Info from './pages/Info';
import KelolaProfil from './pages/KelolaProfil';
import Billing from './pages/Billing';
import Payment from './pages/Payment';
import Companies from './pages/SuperAdmin/Companies'; 
import BillingTracker from './pages/SuperAdmin/BillingTracker';
import GitHubIntegrations from './pages/SuperAdmin/GitHubIntegrations';

// ======================================================
// LAYOUT & AUTH CONTEXT / GUARD
// ======================================================
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoutes';

// ======================================================
// 🛡️ FLEXIBLE ROLE BASED ROUTE GUARD
// ======================================================
const AllowedRolesRoute = ({ children, userRole, allowedRoles = [] }) => {
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const syncUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Failed parse user:', error);
        setUser(null);
      }
    };

    window.addEventListener('storage', syncUser);
    const interval = setInterval(syncUser, 1000);

    return () => {
      window.removeEventListener('storage', syncUser);
      clearInterval(interval);
    };
  }, []);

  // Normalisasi string role (contoh: 'superadmin', 'admin')
  const userRole =
    user?.role
      ?.toString()
      .toLowerCase()
      .replace(/\s+/g, '') || '';

  return (
    <GoogleOAuthProvider
      clientId={
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
      }
    >
      <Router>
        <Routes>

          {/* ====================================================== */}
          {/* PUBLIC ROUTES                                          */}
          {/* ====================================================== */}
          <Route
            path="/"
            element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
          />

          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <Login />}
          />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* ✉️ ACCEPT INVITE (Public/Semi-Public): 
              Ditaruh di luar MainLayout agar user tidak melihat sidebar aplikasi saat mengisi form register/invite */}
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* ====================================================== */}
          {/* PROTECTED ROUTES (Wajib Login & Ber-Sidebar)          */}
          {/* ====================================================== */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout userData={user} />
              </ProtectedRoute>
            }
          >
            {/* AMAN UNTUK SEMUA ROLE (Karyawan, PO, BA, Admin, Superadmin) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id/*" element={<ProjectDetail />} />
            <Route path="/info" element={<Info />} />
            <Route path="/kelolaprofil" element={<KelolaProfil />} />
            <Route path="/payment" element={<Payment />} />

            {/* WORKSPACE BILLING (Bisa diakses Superadmin & Admin Workspace PT) */}
            <Route
              path="/billing"
              element={
                <AllowedRolesRoute userRole={userRole} allowedRoles={['superadmin', 'admin']}>
                  <Billing />
                </AllowedRolesRoute>
              }
            />

            {/* KELOLA KARYAWAN / USERS (Bisa diakses Superadmin & Admin Workspace PT) */}
            <Route
              path="/users"
              element={
                <AllowedRolesRoute userRole={userRole} allowedRoles={['superadmin', 'admin']}>
                  <Users />
                </AllowedRolesRoute>
              }
            />

            {/* ====================================================== */}
            {/* KHUSUS MUTLAK SUPERADMIN ONLY (Platform Tenant Global) */}
            {/* ====================================================== */}
            
            {/* 🏢 COMPANIES (Perusahaan SaaS) */}
            <Route
              path="/companies"
              element={
                <AllowedRolesRoute userRole={userRole} allowedRoles={['superadmin']}>
                  <Companies />
                </AllowedRolesRoute>
              }
            />

            {/* 💳 BILLING TRACKER (Billing Platform Global) */}
            <Route
              path="/billing-tracker"
              element={
                <AllowedRolesRoute userRole={userRole} allowedRoles={['superadmin']}>
                  <BillingTracker />
                </AllowedRolesRoute>
              }
            />

            {/* 🛠️ GITHUB INTEGRATIONS */}
            <Route
              path="/github-integrations"
              element={
                <AllowedRolesRoute userRole={userRole} allowedRoles={['superadmin']}>
                  <GitHubIntegrations />
                </AllowedRolesRoute>
              }
            />
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />

        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;