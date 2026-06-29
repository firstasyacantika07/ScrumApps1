// routes/userRoutes.js
const express = require('express');
const router = express.Router();

const db = require('../config/db');
const bcrypt = require('bcryptjs');
const invitationController = require('../controllers/invitationController');

const { verifyToken } = require('../middleware/auth');

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
    res.status(500).json({ 
      success: false,
      message: "Gagal mengambil daftar pengguna workspace.",
      error: err.message 
    });
  }
});

// ================= CREATE USER (LEGACY) =================
// Menangani pembuatan user langsung lewat modal dashboard
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, phone_number, gender } = req.body;
    const tenantId = req.user.tenant_id; // Pastikan user baru terikat dengan perusahaan sang admin

    // Validasi input dasar untuk mencegah error MySQL NOT NULL
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Kolom Nama, Email, Password, dan Role wajib diisi!"
      });
    }

    // Cek apakah email sudah terpakai di database
    const [existing] = await db.query('SELECT id FROM tbr_users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email ini sudah terdaftar di sistem. Gunakan email lain."
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO tbr_users (name, email, password, role, phone_number, gender, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hash, role, phone_number || null, gender || null, tenantId]
    );

    res.status(201).json({ 
      success: true,
      message: "User berhasil dibuat dan bergabung ke workspace Anda" 
    });

  } catch (err) {
    console.error("❌ CREATE USER BACKEND CRASH:", err);
    // 💡 Mengubah objek key 'error' menjadi 'message' agar dibaca mulus oleh alert Axios Frontend Anda
    res.status(500).json({ 
      success: false,
      message: err.message || "Gagal membuat user baru akibat gangguan server." 
    });
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
      return res.status(403).json({ 
        success: false,
        message: "Akses ditolak atau user tidak ditemukan di workspace ini" 
      });
    }

    res.json({ 
      success: true,
      message: "Data user berhasil diperbarui" 
    });

  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: "Gagal memperbarui data user.",
      error: err.message 
    });
  }
});

// ================= DELETE USER =================
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Proteksi tambahan: Pastikan tidak bisa menghapus user dari tenant lain
    const [result] = await db.query('DELETE FROM tbr_users WHERE id=? AND tenant_id=?', [req.params.id, tenantId]);
    
    if (result.affectedRows === 0) {
      return res.status(403).json({ 
        success: false,
        message: "Akses ditolak atau user tidak ditemukan di workspace ini" 
      });
    }

    res.json({ 
      success: true,
      message: "User berhasil dihapus dari workspace" 
    });

  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ 
      success: false,
      message: "Gagal menghapus user dari database.",
      error: err.message 
    });
  }
});

module.exports = router;