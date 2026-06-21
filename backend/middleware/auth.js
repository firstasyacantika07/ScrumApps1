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

    // 4. Ambil data user komplit & status tenant
    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.tenant_id,
        u.package_type,
        u.subscription_status,
        u.subscription_ends_at,
        u.trial_start,
        u.trial_end,
        u.is_trial,
        u.trial_used,
        u.billing_cycle,
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

    const user = rows[0];

    // 5. Proteksi Tambahan: Jika perusahaan/tenant dibekukan oleh admin utama pusat
    if (user.tenant_status === 'suspended') {
      return res.status(403).json({
        message: "Akses Perusahaan Ditangguhkan: Silakan hubungi bagian administrasi billing.",
      });
    }

    // =========================================================================
    // 🔄 SINKRONISASI CO-CHECK: Pengecekan Kedaluwarsa Realtime di Setiap Request API
    // =========================================================================
    let finalStatus = user.subscription_status || "active";
    let triggerDatabaseUpdate = false;
    const now = new Date();

    // A. Jalur cek kedaluwarsa TRIAL
    if (user.billing_cycle === "TRIAL" && user.trial_end) {
      const endTrialDate = new Date(user.trial_end);
      if (now > endTrialDate) {
        finalStatus = "expired";
        triggerDatabaseUpdate = true;
      }
    } 
    // B. Jalur cek kedaluwarsa Paket Komersial Reguler (PRO BULANAN/TAHUNAN)
    else if (user.package_type !== "FREE" && user.subscription_ends_at) {
      const endSubDate = new Date(user.subscription_ends_at);
      if (now > endSubDate) {
        finalStatus = "expired";
        triggerDatabaseUpdate = true;
      }
    }

    // Eksekusi update otomatis ke database jika status di DB belum 'expired'
    if (triggerDatabaseUpdate && user.subscription_status !== "expired") {
      await db.query(
        `UPDATE tbr_users SET subscription_status = 'expired' WHERE id = ?`,
        [user.id]
      );
    }

    // 6. Menyimpan data user & status billing ke objek request (req.user) dengan status terbaru
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      package_type: user.package_type || 'FREE',
      subscription_status: finalStatus, // Menggunakan status hasil sinkronisasi realtime
      subscription_ends_at: user.subscription_ends_at,
      trial_start: user.trial_start,
      trial_end: user.trial_end,
      is_trial: user.is_trial,
      trial_used: user.trial_used,
      billing_cycle: user.billing_cycle
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