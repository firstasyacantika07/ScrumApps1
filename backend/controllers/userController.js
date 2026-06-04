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

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO tbr_users 
      (name, email, password, role, phone_number, gender, package_type, subscription_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hash,
        role || 'TeamDeveloper',
        phone_number || null,
        gender || 'male',
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