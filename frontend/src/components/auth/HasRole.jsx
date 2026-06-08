import React from 'react';

const HasRole = ({ roles, children }) => {
  // Ambil data user dari localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role?.toLowerCase().trim();

  // Superadmin selalu bisa melihat apa saja
  if (userRole === 'superadmin') return <>{children}</>;

  // Jika role user saat ini ada di dalam daftar roles yang diizinkan
  if (roles.map(r => r.toLowerCase().trim()).includes(userRole)) {
    return <>{children}</>;
  }

  // Jika tidak punya hak akses, jangan rendang apa-apa
  return null;
};

export default HasRole;