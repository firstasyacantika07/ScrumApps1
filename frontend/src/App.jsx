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
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AcceptInvite from './pages/Acceptinvite';

// ======================================================
// PROTECTED PAGES
// ======================================================
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/Projectlist'
import ProjectDetail from './pages/ProjectDetail';
import Users from './pages/Users';
import Info from './pages/Info';
import KelolaProfil from './pages/KelolaProfil';
import Billing from './pages/Billing';
import Payment from './pages/Payment';
import Companies from './pages/SuperAdmin/Companies';
import BillingTracker from './pages/SuperAdmin/BillingTracker';
import GitHubIntegrations from './pages/SuperAdmin/GitHubIntegrations';
import BacklogPage from './pages/Backlogpage';

// ======================================================
// LAYOUT & AUTH CONTEXT / GUARD
// ======================================================
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoutes';

// ✅ Import AuthProvider agar AuthContext tersedia di seluruh app
import { AuthProvider, useAuth } from './context/AuthContext';

// ======================================================
// 🛡️ FLEXIBLE ROLE BASED ROUTE GUARD
// ======================================================
const AllowedRolesRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  // Tunggu sampai proses pembacaan token / localstorage selesai
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Memverifikasi Hak Akses...</p>
      </div>
    );
  }

  const userRole = user?.role?.toString().toLowerCase().replace(/\s+/g, '') || '';

  if (!allowedRoles.includes(userRole)) {
    alert(`Akses Ditolak! Anda tidak memiliki izin untuk halaman ini. (Role saat ini: ${userRole || 'Tidak Diketahui'})`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// ======================================================
// ✅ APP ROUTES SYSTEM
// ======================================================
function AppRoutes() {
  const { user, loading, logout } = useAuth(); // 👈 Ambil fungsi logout jika tersedia di context
  const [isInitialRun, setIsInitialRun] = useState(false); // Tidak lagi menghapus sesi awal

  if (loading || isInitialRun) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        alignItems: 'center', height: '100vh'
      }}>
        <span>Memuat Sesi...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      {/* 🛠️ DIUBAH: Sekarang default route langsung melempar ke /login */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/dashboard" replace /> : <Register />}
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      {/* PROTECTED ROUTES */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* AMAN UNTUK SEMUA ROLE */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectList />} />
        {/* 🛠️ FIX: Tanpa route literal ini, "/projects/create" tertangkap oleh
            "/projects/:id/*" (id = "create"), sehingga ProjectDetail ikut mount
            dan memanggil /api/projects/create/github-status -> 400 Bad Request.
            Pembuatan proyek dilakukan lewat modal di ProjectList, jadi cukup
            redirect balik ke /projects. */}
        <Route path="/projects/create" element={<Navigate to="/projects" replace />} />
        <Route path="/projects/:id/*" element={<ProjectDetail />} />
        <Route path="/info" element={<Info />} />
        <Route path="/kelolaprofil" element={<KelolaProfil />} />
        <Route path="/payment" element={<Payment />} />

        {/* WORKSPACE BILLING */}
        <Route
          path="/billing"
          element={
            <AllowedRolesRoute allowedRoles={['superadmin', 'admin']}>
              <Billing />
            </AllowedRolesRoute>
          }
        />

        {/* KELOLA KARYAWAN */}
        <Route
          path="/users"
          element={
            <AllowedRolesRoute allowedRoles={['superadmin', 'admin']}>
              <Users />
            </AllowedRolesRoute>
          }
        />

        {/* 🏢 COMPANIES */}
        <Route
          path="/companies"
          element={
            <AllowedRolesRoute allowedRoles={['superadmin']}>
              <Companies />
            </AllowedRolesRoute>
          }
        />

        {/* 💳 BILLING TRACKER */}
        <Route
          path="/billing-tracker"
          element={
            <AllowedRolesRoute allowedRoles={['superadmin']}>
              <BillingTracker />
            </AllowedRolesRoute>
          }
        />

        {/* 🛠️ GITHUB INTEGRATIONS
            FIX: Diperluas agar mencakup seluruh role multi-tenant yang membutuhkan koordinasi Git & Kanban */}
        <Route
          path="/github-integrations"
          element={
            <AllowedRolesRoute allowedRoles={['superadmin', 'admin', 'projectowner', 'productowner', 'businessanalyst', 'teamdeveloper']}>
              <GitHubIntegrations />
            </AllowedRolesRoute>
          }
        />

        {/* 📋 PRODUCT BACKLOG */}
        <Route
          path="/backlog"
          element={
            <AllowedRolesRoute allowedRoles={['businessanalyst', 'projectowner', 'productowner']}>
              <BacklogPage />
            </AllowedRolesRoute>
          }
        />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider
      clientId={
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '692937082573-r1udkbnlooteav7qhthhqnrl9s40vucd.apps.googleusercontent.com'
      }
    >
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;