const db = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * GET USERS
 */
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, email, role, phone_number, gender 
      FROM tbr_users
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * CREATE USER
 */
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

    // PERBAIKAN LOGIKA: Memastikan semua kolom dipetakan secara urut dan eksplisit
    // Menetapkan default tenant_id ke 1 atau menyesuaikan arsitektur MVP multi-tenant Anda
    await db.query(
      `INSERT INTO tbr_users 
      (name, email, password, role, phone_number, gender, tenant_id, package_type, subscription_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hash,
        role || 'TeamDeveloper', // Default role sesuai kebutuhan ScrumApps
        phone_number || null,
        gender || 'male',        // Mencegah nilai kosong bergeser di database
        1,                       // Default tenant_id awal untuk kelancaran SaaS MVP
        'FREE',
        'active'
      ]
    );

    res.status(201).json({
      message: "User berhasil dibuat"
    });

  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

/**
 * DELETE USER
 */
exports.deleteUser = async (req, res) => {
  try {
    await db.query(
      'DELETE FROM tbr_users WHERE id=?',
      [req.params.id]
    );

    res.json({ message: "User deleted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};