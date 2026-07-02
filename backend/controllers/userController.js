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

    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ GET GLOBAL USERS ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// =========================================================================
// 🏢 2. GET USERS BY TENANT (Khusus Tenant Admin - Hanya Anggota Organisasinya)
// =========================================================================
exports.getUsersByTenant = async (req, res) => {
  try {
    // tenant_id diambil secara aman dari token JWT pengguna yang sedang login (via middleware auth)
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: "Identifikasi Tenant tidak valid pada sesi Anda." });
    }

    // Filter ketat dengan WHERE tenant_id = ? demi mencegah kebocoran data antar tenant
    const [rows] = await db.query(`
      SELECT id, name, email, role, phone_number, gender 
      FROM tbr_users
      WHERE tenant_id = ?
      ORDER BY name ASC
    `, [tenantId]);

    return res.status(200).json(rows);
  } catch (err) {
    console.error("❌ GET TENANT USERS ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// =========================================================================
// 🚀 3. CREATE USER (Bawaan Project / MVP Fallback)
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

    // VALIDASI WAJIB
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "name, email, password wajib diisi"
      });
    }

    // Amankan password dengan bcrypt hash
    const hash = await bcrypt.hash(password, 10);

    // Ambil tenant_id dari admin yang membuat atau fallback ke tenant ID 1 jika self-register
    const tenantId = req.user?.tenant_id || 1;

    await db.query(
      `INSERT INTO tbr_users 
      (name, email, password, role, phone_number, gender, tenant_id, package_type, subscription_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hash,
        role || 'TeamDeveloper', 
        phone_number || null,
        gender || 'male',        
        tenantId,                
        'FREE',
        'active'
      ]
    );

    return res.status(201).json({
      message: "User berhasil dibuat"
    });

  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// =========================================================================
// 🗑️ 4. DELETE USER (Bawaan Project)
// =========================================================================
exports.deleteUser = async (req, res) => {
  try {
    await db.query(
      'DELETE FROM tbr_users WHERE id=?',
      [req.params.id]
    );

    return res.json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};