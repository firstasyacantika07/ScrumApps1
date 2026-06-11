const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * =========================================================================
 * 🔐 MIDDLEWARE VERIFY TOKEN (SINKRONISASI MULTI-TENANT SAAS)
 * =========================================================================
 * Memverifikasi JWT, memastikan masa aktif, dan menarik data user + status paket perusahaan
 */
const verifyToken = async (req, res, next) => {
  try {
    // 1. Mengambil header dengan ekstraksi toleran spasi & huruf besar/kecil
    const authHeader = req.header("Authorization") || req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Token diperlukan",
      });
    }

    // 2. Memotong string 'Bearer ' dengan aman menggunakan split
    const token = authHeader.split(" ")[1];

    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({
        message: "Token diperlukan",
      });
    }

    // 3. Verifikasi tanda tangan token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. FIX MULTI-TENANT: Melakukan JOIN ke tbr_tenants untuk mengambil plan_id (FREE/PRO) terbaru
    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.tenant_id,
        t.plan_id,
        t.status as tenant_status
      FROM tbr_users u
      LEFT JOIN tbr_tenants t ON u.tenant_id = t.id
      WHERE u.id = ?
    `;
    const [rows] = await db.query(sql, [decoded.id]);

    if (rows.length === 0) {
      return res.status(401).json({
        message: "User tidak ditemukan",
      });
    }

    // 5. Proteksi Tambahan: Jika perusahaan/tenant dibekukan oleh admin utama pusat
    if (rows[0].tenant_status === 'suspended') {
      return res.status(403).json({
        message: "Akses Perusahaan Ditangguhkan: Silakan hubungi bagian administrasi billing.",
      });
    }

    // 6. Menyimpan data user & tenant yang ter-akomodasi ke objek request (req.user)
    req.user = {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      role: rows[0].role,
      tenant_id: rows[0].tenant_id,
      plan_id: rows[0].plan_id || 'FREE' // Fallback aman jika plan_id bernilai null
    };

    next();
  } catch (err) {
    console.error("🔥 VERIFY TOKEN ERROR:", err.message);

    // Jika token kedaluwarsa, beri tahu frontend secara spesifik agar bisa auto-logout via Axios Interceptor
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token kedaluwarsa, silakan login kembali",
      });
    }

    return res.status(401).json({
      message: "Token tidak valid",
    });
  }
};

/**
 * =========================================================================
 * 🛡️ MIDDLEWARE OTORISASI HAK AKSES BERDASAR ROLE (RBAC)
 * =========================================================================
 * Membatasi akses rute API berdasarkan whitelist role atau forbidden role
 */
const authorize = (roles = [], options = {}) => {
  if (typeof roles === "string") roles = [roles];
  
  // Mengambil opsi daftar role yang diblokir khusus (jika ada)
  const forbiddenRoles = options.forbiddenRoles || [];
  
  // Normalisasi string untuk mengantisipasi ketidaksamaan format spasi / karakter
  const strictForbidden = forbiddenRoles.map(r => r.replace(/\s+/g, '').toLowerCase().trim());

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Normalisasi input role dari database user
    const userRole = req.user.role?.replace(/\s+/g, '').toLowerCase().trim();
    const allowedRoles = roles.map(r => r.replace(/\s+/g, '').toLowerCase().trim());

    // 1. Cek Proteksi Mutlak (Forbidden Roles) terlebih dahulu
    if (strictForbidden.includes(userRole)) {
      return res.status(403).json({ 
        message: "Forbidden: Role Anda sengaja dibatasi untuk aksi ini." 
      });
    }

    // 2. Bypass otomatis untuk Superadmin Tenant, KECUALI jika ia masuk ke daftar strictForbidden
    if (userRole === "superadmin") return next();

    // 3. Validasi apakah role user terdaftar di whitelist (allowedRoles)
    if (roles.length && !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: Anda tidak memiliki hak akses untuk menu ini." });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  authorize
};