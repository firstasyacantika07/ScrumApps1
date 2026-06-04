const express = require('express');
const router = express.Router();

const db = require('../config/db');
const bcrypt = require('bcryptjs');

const {
  verifyToken
} = require('../middleware/auth');

router.use(verifyToken);

// ================= GET ALL USERS =================
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT id, name, email, role, phone_number, gender
      FROM tbr_users
    `);

    res.json(users);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= CREATE USER =================
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, phone_number, gender } = req.body;

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO tbr_users (name, email, password, role, phone_number, gender)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hash, role, phone_number, gender]
    );

    res.status(201).json({ message: "User berhasil dibuat" });

  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE USER =================
router.put('/:id', async (req, res) => {
  try {
    const { name, gender, email, phone_number, password } = req.body;

    let query = `
      UPDATE tbr_users
      SET name=?, gender=?, email=?, phone_number=?
    `;

    let params = [name, gender, email, phone_number];

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query += `, password=?`;
      params.push(hash);
    }

    query += ` WHERE id=?`;
    params.push(req.params.id);

    await db.query(query, params);

    res.json({ message: "User berhasil diupdate" });

  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE USER =================
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM tbr_users WHERE id=?', [req.params.id]);
    res.json({ message: "User berhasil dihapus" });

  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;