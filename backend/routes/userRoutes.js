const express = require('express');
const router = express.Router();

const db = require('../config/db');
const bcrypt = require('bcryptjs');
const invitationController = require('../controllers/invitationController');

const {
  verifyToken
} = require('../middleware/auth');

// Melindungi semua rute di bawah ini dengan middleware autentikasi
router.use(verifyToken);

// ================= POST INVITE USER (FITUR BARU) =================
// Menangani: POST /api/users/invitations
router.post('/invitations', invitationController.inviteUser);

// ================= GET ALL USERS (SINKRONISASI SAAS MULTI-TENANT) =================
router.get('/', async (req, res) => {
  try {
    // Ambil tenant_id dari user/admin yang sedang login (disediakan oleh middleware verifyToken)
    const tenantId = req.user.tenant_id; 

    // Filter data agar hanya menampilkan user yang berada di perusahaan yang sama
    const [users] = await db.query(`
      SELECT id, name, email, role, phone_number, gender
      FROM tbr_users
      WHERE tenant_id = ?
    `, [tenantId]);

    res.json(users);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= CREATE USER (LEGACY) =================
// Tetap dipertahankan jika Anda masih membutuhkan pendaftaran langsung tanpa email invite
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, phone_number, gender } = req.body;
    const tenantId = req.user.tenant_id; // Pastikan user baru terikat dengan perusahaan sang admin

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO tbr_users (name, email, password, role, phone_number, gender, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hash, role, phone_number, gender, tenantId]
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
    const tenantId = req.user.tenant_id;

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

    // Proteksi tambahan: Pastikan hanya bisa mengupdate user di tenant yang sama
    query += ` WHERE id=? AND tenant_id=?`;
    params.push(req.params.id, tenantId);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: "Akses ditolak atau user tidak ditemukan di workspace ini" });
    }

    res.json({ message: "User berhasil diupdate" });

  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= DELETE USER =================
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Proteksi tambahan: Pastikan tidak bisa menghapus user dari tenant lain
    const [result] = await db.query('DELETE FROM tbr_users WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    
    if (result.affectedRows === 0) {
      return res.status(403).json({ message: "Akses ditolak atau user tidak ditemukan di workspace ini" });
    }

    res.json({ message: "User berhasil dihapus" });

  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;