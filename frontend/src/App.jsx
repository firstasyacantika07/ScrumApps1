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
import AcceptInvite from './pages/Acceptinvite';

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
import BacklogPage from './pages/Backlogpage';

// ======================================================
// LAYOUT & AUTH CONTEXT / GUARD
// ======================================================
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoutes';

// ✅ FIX: Import AuthProvider agar AuthContext tersedia di seluruh app
import { AuthProvider, useAuth } from './context/AuthContext';

// ======================================================
// 🛡️ FLEXIBLE ROLE BASED ROUTE GUARD
// ✅ FIX: Ambil userRole dari AuthContext, bukan dari prop
// ======================================================
const AllowedRolesRoute = ({ children, allowedRoles = [] }) => {
  const { user } = useAuth();
  const userRole = user?.role?.toString().toLowerCase().replace(/\s+/g, '') || '';

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// ======================================================
// ✅ FIX: Pisahkan Routes ke komponen sendiri agar bisa
// menggunakan useAuth() di dalam AuthProvider
// ======================================================
function AppRoutes() {
  // ✅ FIX: Hapus useState & setInterval — ambil user dari AuthContext saja
  // setInterval setiap 1 detik adalah penyebab "Maximum update depth exceeded"
  const { user, loading } = useAuth();

  const userRole = user?.role?.toString().toLowerCase().replace(/\s+/g, '') || '';

  // Tunggu AuthContext selesai init, cegah blank screen saat refresh
  if (loading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        alignItems: 'center', height: '100vh'
      }}>
        <span>Memuat...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route
        path="/"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      {/* PROTECTED ROUTES */}
      {/* ✅ FIX: MainLayout tidak perlu userData prop lagi, ambil sendiri via useAuth() */}
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

        {/* 🛠️ GITHUB INTEGRATIONS */}
        <Route
          path="/github-integrations"
          element={
            <AllowedRolesRoute allowedRoles={['superadmin','teamdeveloper','businessanalyst']}>
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
      {/* ✅ FIX: AuthProvider membungkus Router agar semua komponen bisa useAuth() */}
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
