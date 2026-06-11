import React, { useEffect, useState } from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { GoogleOAuthProvider } from '@react-oauth/google';

// ======================================================
// PUBLIC PAGES (Halaman yang bisa diakses tanpa login)
// ======================================================
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

// ======================================================
// PROTECTED PAGES (Halaman internal - Wajib Login)
// ======================================================
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import Users from './pages/Users';
import Info from './pages/Info';
import KelolaProfil from './pages/KelolaProfil';
import Billing from './pages/Billing';
import Payment from './pages/Payment';

// 🌟 BARU: Halaman Pengelolaan Integrasi GitHub Khusus Super Admin
import GitHubIntegrations from './pages/SuperAdmin/GitHubIntegrations';

// ======================================================
// LAYOUT
// ======================================================
import MainLayout from './layouts/MainLayout';

// ======================================================
// 🔐 PROTECTED ROUTE GUARD (Satpam Utama Aplikasi)
// Aturan wajib login diatur di sini. Jika user tidak ada,
// browser otomatis dipaksa kembali ke halaman /login.
// ======================================================
const ProtectedRoute = ({ children, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ======================================================
// 🛡️ ROLE BASED ROUTE GUARD (Pembatasan Hak Akses Admin)
// Mencegah user non-admin masuk ke halaman manajemen organisasi global.
// ======================================================
const AdminRoute = ({ children, userRole }) => {
  if (userRole !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  // ======================================================
  // USER STATE (Membaca data login dari LocalStorage)
  // Termasuk role, tenant_id, dan plan_id untuk isolasi data
  // ======================================================
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  // ======================================================
  // MONITOR LOGIN / LOGOUT / BILLING STATUS (Sinkronisasi State)
  // ======================================================
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

    // Sinkronisasi jika user membuka aplikasi di banyak tab sekaligus
    window.addEventListener('storage', syncUser);

    // Polling berkala setiap 1 detik untuk mendeteksi perubahan login & paket secara realtime
    const interval = setInterval(syncUser, 1000);

    return () => {
      window.removeEventListener('storage', syncUser);
      clearInterval(interval);
    };
  }, []);

  // ======================================================
  // NORMALIZE ROLE (Format teks role agar seragam)
  // ======================================================
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
          {/* PUBLIC ROUTES & AUTO REDIRECT LOGIC                    */}
          {/* ====================================================== */}
          
          {/* Jalur Utama '/' : Jika sudah login ke dashboard, jika belum ke login */}
          <Route
            path="/"
            element={
              <Navigate
                to={user ? '/dashboard' : '/login'}
                replace
              />
            }
          />

          {/* Jalur '/login' : Jika sudah login, tidak boleh masuk halaman login lagi */}
          <Route
            path="/login"
            element={
              user
                ? <Navigate to="/dashboard" replace />
                : <Login />
            }
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          {/* ====================================================== */}
          {/* PROTECTED ROUTES (Dibungkus oleh ProtectedRoute)       */}
          {/* ====================================================== */}
          <Route
            element={
              <ProtectedRoute user={user}>
                {/* Melempar data user ke layout agar sidebar/navbar bisa mendeteksi tenant & plan */}
                <MainLayout userData={user} />
              </ProtectedRoute>
            }
          >

            {/* DASHBOARD */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* PROJECTS */}
            <Route
              path="/projects"
              element={<ProjectList />}
            />

            <Route
              path="/projects/:id/*"
              element={<ProjectDetail />}
            />

            {/* BILLING & SUBSCRIPTION (Khusus Pembelian Paket oleh Admin) */}
            <Route
              path="/billing"
              element={<Billing />}
            />

            {/* PAYMENT */}
            <Route
              path="/payment"
              element={<Payment />}
            />

            {/* INFO */}
            <Route
              path="/info"
              element={<Info />}
            />

            {/* PROFILE MANAGEMENT */}
            <Route
              path="/kelolaprofil"
              element={<KelolaProfil />}
            />

            {/* USERS - KHUSUS SUPERADMIN ONLY */}
            <Route
              path="/users"
              element={
                <AdminRoute userRole={userRole}>
                  <Users />
                </AdminRoute>
              }
            />

            {/* 🌟 GITHUB INTEGRATIONS - MUTLAK KHUSUS SUPERADMIN ONLY 
                Business Analyst (BA) tidak diizinkan mengakses jalur ini */}
            <Route
              path="/github-integrations"
              element={
                <AdminRoute userRole={userRole}>
                  <GitHubIntegrations />
                </AdminRoute>
              }
            />

          </Route>

          {/* ====================================================== */}
          {/* 404 FALLBACK HANDLER (Proteksi URL Acak)               */}
          {/* ====================================================== */}
          <Route
            path="*"
            element={
              <Navigate
                to={user ? '/dashboard' : '/login'}
                replace
              />
            }
          />

        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;