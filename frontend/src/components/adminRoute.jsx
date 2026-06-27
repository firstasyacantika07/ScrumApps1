import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children, userRole }) => {
  // Sesuaikan role dengan yang ada di database Anda
  if (userRole !== 'superadmin' && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default AdminRoute;