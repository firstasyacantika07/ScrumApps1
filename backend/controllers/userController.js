// controllers/userController.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// =========================================================================
// 👑 1. GET ALL USERS GLOBAL (Khusus Superadmin - Lintas Seluruh Perusahaan)
// =========================================================================
exports.getAllUsersGlobal = async (req, res) => {
  try {
    // Superadmin menarik seluruh data pengguna dari semua tenant tanpa batasan
    const [rows] = await db.query(`
      SELECT id, name, email, role, phone_number, gender, tenant_id, package_type, subscription_status 
      FROM tbr_users
      ORDER BY id DESC
    `);

    return res.status(200).json({
      success: true,
      message: "Seluruh data user global berhasil ditarik.",
      data: rows
    });
  } catch (err) {
    console.error("❌ GET GLOBAL USERS ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// =========================================================================
// 🏢 2. GET USERS BY TENANT (Khusus Tenant Admin / Merespon Halaman Users.jsx / Members.jsx)
// =========================================================================
exports.getUsersByTenant = async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(400).json({ 
        success: false, 
        message: "Identifikasi Tenant tidak valid pada sesi Anda." 
      });
    }

    // Filter ketat dengan WHERE tenant_id = ? demi mencegah kebocoran data antar tenant
    const [rows] = await db.query(`
      SELECT id, name, email, role, phone_number, gender 
      FROM tbr_users
      WHERE tenant_id = ?
      ORDER BY name ASC
    `, [tenantId]);

    return res.status(200).json({
      success: true,
      message: "Data anggota tim berhasil dimuat.",
      data: rows
    });
  } catch (err) {
    console.error("❌ GET TENANT USERS ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// =========================================================================
// 🚀 3. CREATE USER (Bawaan Project / Dashboard Modal / Auto-Join Project)
// =========================================================================
exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone_number,
      gender
    } = req.body;

    const tenantId = req.user?.tenant_id;

    // Proteksi utama: Pastikan admin memiliki tenant_id yang jelas
    if (!tenantId) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak: Workspace Anda tidak teridentifikasi."
      });
    }

    // VALIDASI WAJIB
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password wajib diisi."
      });
    }

    // Normalisasi email (trim + lowercase)
    const cleanEmail = email.trim().toLowerCase();

    // Cek apakah email duplikat secara global
    const [existing] = await db.query('SELECT id FROM tbr_users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email ini sudah terdaftar di sistem."
      });
    }

    // Amankan password dengan bcrypt hash
    const hash = await bcrypt.hash(password.trim(), 10);
    
    // Gunakan string standar lowercase seperti teamdeveloper, productowner, scrummaster
    const userRole = role ? String(role).replace(/\s+/g, '').toLowerCase().trim() : 'teamdeveloper';

    // A. Daftarkan pengguna baru ke database terikat dengan tenantId admin
    const [insertResult] = await db.query(
      `INSERT INTO tbr_users 
      (name, email, password, role, phone_number, gender, tenant_id, package_type, subscription_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        cleanEmail,
        hash,
        userRole, 
        phone_number || null,
        gender || 'male',        
        tenantId,                
        'FREE',
        'active'
      ]
    );

    const newUserId = insertResult.insertId;

    // 🔥 B. SINKRONISASI OTOMATIS: Ambil seluruh project di tenant ini
    const [activeProjects] = await db.query(
      `SELECT id FROM tbr_projects WHERE tenant_id = ?`, 
      [tenantId]
    );

    if (activeProjects.length > 0) {
      // 🔧 FIX: Ubah target nama kolom menjadi 'role_in_project' agar sinkron dengan teamController.js
      const memberInsertValues = activeProjects.map(proj => [proj.id, newUserId, userRole]);
      await db.query(
        `INSERT INTO tbr_project_members (project_id, user_id, role_in_project) VALUES ?`,
        [memberInsertValues]
      );
    }

    return res.status(201).json({
      success: true,
      message: "User berhasil dibuat dan otomatis terhubung ke proyek workspace."
    });

  } catch (err) {
    console.error("❌ CREATE USER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat user baru.",
      error: err.message
    });
  }
};

// =========================================================================
// 🗑️ 4. DELETE USER (Bawaan Project)
// =========================================================================
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(403).json({ success: false, message: "Sesi tidak valid." });
    }

    // Keamanan Tambahan: Pastikan user yang dihapus berada di tenant yang sama dengan admin
    const [userCheck] = await db.query('SELECT id FROM tbr_users WHERE id = ? AND tenant_id = ?', [userId, tenantId]);
    if (userCheck.length === 0) {
      return res.status(403).json({ success: false, message: "Akses Ditolak: User tidak ditemukan di workspace Anda." });
    }

    // Menghapus dari tbr_users otomatis membersihkan relasi jika foreign key diset CASCADE,
    // namun kita eksekusi manual juga ke tbr_project_members demi keamanan data terintegrasi
    await db.query('DELETE FROM tbr_project_members WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM tbr_users WHERE id = ?', [userId]);

    return res.status(200).json({ 
      success: true,
      message: "User dan hak keanggotaan proyek berhasil dihapus secara permanen." 
    });
  } catch (err) {
    console.error("❌ DELETE USER ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};