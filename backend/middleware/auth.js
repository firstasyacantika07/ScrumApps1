const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Middleware untuk memverifikasi JWT Token dan mengambil data user dari database
 */
const verifyToken = async (req, res, next) => {
  try {
    // 🛠️ AMAN: Mengambil header dengan ekstraksi toleran spasi & huruf besar/kecil
    const authHeader = req.header("Authorization") || req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Token diperlukan",
      });
    }

    // Memotong string 'Bearer ' dengan aman menggunakan split
    const token = authHeader.split(" ")[1];

    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({
        message: "Token diperlukan",
      });
    }

    // Verifikasi tanda tangan token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Mengambil data user dari tabel tbr_users sesuai prefix database Anda
    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        tenant_id,
        package_type,
        subscription_status,
        subscription_ends_at
      FROM tbr_users
      WHERE id = ?
      `,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "User tidak ditemukan",
      });
    }

    // Menyimpan data user ke objek request (req.user)
    req.user = rows[0];

    next();
  } catch (err) {
    console.error("🔥 VERIFY TOKEN ERROR:", err.message);

    // Jika token kedaluwarsa, beri tahu frontend secara spesifik agar bisa auto-logout
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
 * Middleware Otorisasi Hak Akses Berdasarkan Role
 * @param {Array|String} roles - Role yang diizinkan mengakses endpoint
 * @param {Object} options - Pengaturan tambahan untuk memblokir role tertentu secara spesifik
 * @param {Array} options.forbiddenRoles - Role yang mutlak DILUAR izin (ditolak langsung)
 */
const authorize = (roles = [], options = {}) => {
  if (typeof roles === "string") roles = [roles];
  
  // Mengambil opsi daftar role yang diblokir khusus (jika ada)
  const forbiddenRoles = options.forbiddenRoles || [];
  
  // Normalisasi string untuk mengantisipasi ketidaksamaan format spasi / karakter (misal: "Business Analyst" -> "businessanalyst")
  const strictForbidden = forbiddenRoles.map(r => r.replace(/\s+/g, '').toLowerCase().trim());

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    // Normalisasi input role dari database user (menghapus spasi jika ada)
    const userRole = req.user.role?.replace(/\s+/g, '').toLowerCase().trim();
    const allowedRoles = roles.map(r => r.replace(/\s+/g, '').toLowerCase().trim());

    // 1. Cek Proteksi Mutlak (Forbidden Roles) terlebih dahulu
    if (strictForbidden.includes(userRole)) {
      return res.status(403).json({ 
        message: "Forbidden: Role Anda sengaja dibatasi untuk aksi ini." 
      });
    }

    // 2. Bypass otomatis untuk Superadmin, KECUALI jika dia masuk ke dalam strictForbidden di atas
    if (userRole === "superadmin") return next();

    // 3. Validasi apakah role user terdaftar di whitelist (allowedRoles)
    if (roles.length && !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: Anda tidak memiliki akses." });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  authorize
};