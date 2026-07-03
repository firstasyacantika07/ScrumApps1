const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const invitationController = require('../controllers/invitationController');
const { verifyToken } = require('../middleware/auth');

/* =========================================================================
   🔓 1. PUBLIC ROUTES (TANPA TOKEN JWT)
   Harus di paling atas agar tidak sengaja tertelan oleh wildcard /:id di bawah
   ========================================================================= */

// Menangani: GET /api/users/invitations/verify?token=xyz
router.get('/invitations/verify', invitationController.verifyInvitation);

// Menangani: POST /api/users/invitations/accept
router.post('/invitations/accept', invitationController.acceptInvitation);


/* =========================================================================
   🛡️ MIDDLEWARE PROTEKSI GLOBAL
   Semua rute di bawah baris ini wajib melampirkan JWT valid pada header
   ========================================================================= */
router.use(verifyToken);


/* =========================================================================
   🔒 2. PROTECTED BASE ROUTES (BASE API: /api/users)
   Rute statis/akar wajib didahulukan sebelum rute berbasis parameter /:id
   ========================================================================= */

// 🏢 GET: Mengambil list seluruh anggota tim berdasarkan tenant yang sedang aktif login
// Merespon request dari Users.jsx frontend
router.get('/', userController.getUsersByTenant);

// ➕ POST: Membuat user baru via modal dashboard internal workspace
router.post('/', userController.createUser);

// ✉️ POST: Mengirimkan undangan email bergabung ke user baru
router.post('/invitations', invitationController.inviteUser);


/* =========================================================================
   🗂️ 3. DYNAMIC PARAMETER ROUTES (WILDCARD - MUTLAK DI PALING BAWAH)
   ========================================================================= */

// 🗑️ DELETE: Menghapus / mencabut hak akses user tertentu berdasarkan ID
router.delete('/:id', userController.deleteUser);

// ✏️ PUT: Menangani perubahan data profil pengguna internal tim
router.put('/:id', async (req, res) => {
  try {
    const { name, gender, email, phone_number, password } = req.body;
    const tenantId = req.user?.tenant_id; // 🔧 Menggunakan optional chaining demi keamanan
    const db = require('../config/db');
    const bcrypt = require('bcryptjs');

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID tidak teridentifikasi pada sesi Anda."
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi."
      });
    }

    // 🔧 FIX: Normalisasi email agar konsisten dengan proses login & register (lowercase + trim)
    const cleanEmail = email.trim().toLowerCase();

    let query = `
      UPDATE tbr_users
      SET name=?, gender=?, email=?, phone_number=?
    `;
    let params = [name ? name.trim() : name, gender || 'male', cleanEmail, phone_number || null];

    if (password) {
      const hash = await bcrypt.hash(password.trim(), 10);
      query += `, password=?`;
      params.push(hash);
    }

    query += ` WHERE id=? AND tenant_id=?`;
    params.push(req.params.id, tenantId);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(403).json({ 
        success: false,
        message: "Akses ditolak atau user tidak ditemukan di workspace ini." 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: "Data user berhasil diperbarui" 
    });

  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    return res.status(500).json({ 
      success: false,
      message: "Gagal memperbarui data user.",
      error: err.message 
    });
  }
});

module.exports = router;