// routes/userRoutes.js
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const invitationController = require('../controllers/invitationController');
const { verifyToken } = require('../middleware/auth');

// =========================================================================
// 🔓 1. RUTE PUBLIK (TIDAK Memerlukan Login / JWT Token)
// Calon pengguna baru mengakses rute ini dari tautan email mereka
// =========================================================================

// Menangani: GET /api/users/invitations/verify?token=xyz
router.get('/invitations/verify', invitationController.verifyInvitation);

// Menangani: POST /api/users/invitations/accept
router.post('/invitations/accept', invitationController.acceptInvitation);


// =========================================================================
// 🛡️ 2. MIDDLEWARE PROTEKSI
// Semua rute di bawah baris ini wajib melampirkan JWT valid (Hanya untuk Admin/User)
// =========================================================================
router.use(verifyToken);


// ================= ✉️ POST INVITE USER =================
// Menangani: POST /api/users/invitations
router.post('/invitations', invitationController.inviteUser);

// ================= 🏢 GET USERS BY TENANT (SINKRONISASI SAAS MULTI-TENANT) =================
// 🛠️ PERBAIKAN: Dialihkan ke userController agar ter-filter rapi berdasarkan tenant admin yang login
router.get('/', userController.getUsersByTenant);

// ================= ➕ CREATE USER (LEGACY / DASHBOARD MODAL) =================
// Menangani pembuatan user langsung lewat modal dashboard
router.post('/', userController.createUser);

// ================= 🗑️ DELETE / REVOKE USER =================
router.delete('/:id', userController.deleteUser);

// ================= ✏️ UPDATE USER =================
// Menangani perubahan data profile user internal tim
router.put('/:id', async (req, res) => {
  try {
    const { name, gender, email, phone_number, password } = req.body;
    const tenantId = req.user.tenant_id;
    const db = require('../config/db');
    const bcrypt = require('bcryptjs');

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

module.exports = router;