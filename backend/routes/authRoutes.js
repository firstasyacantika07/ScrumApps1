const express = require("express");
const router = express.Router();

// Impor controller & middleware bawaan project Anda
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const invitationController = require('../controllers/invitationController');

// ======================================================
// 🔐 AUTHENTICATION ROUTES
// ======================================================

/**
 * @route   POST /api/auth/login
 * @desc    Log in user & generate JWT Token beserta data Tenant/SaaS
 * @access  Public
 */
router.post("/login", (req, res, next) => {
  if (!authController?.login) {
    return res.status(500).json({
      success: false,
      message: "Fungsi authController.login tidak ditemukan atau gagal diekspor",
    });
  }
  return authController.login(req, res, next);
});

/**
 * @route   GET /api/auth/me
 * @desc    Ambil data profile user yang sedang login & validasi kedaluwarsa Tenant
 * @access  Private (Memerlukan token JWT valid)
 */
// Menggunakan verifyToken sebagai middleware pelindung rute /me
router.get("/me", verifyToken, (req, res, next) => {
  if (!authController?.getMe) {
    return res.status(500).json({
      success: false,
      message: "Fungsi authController.getMe tidak ditemukan atau gagal diekspor",
    });
  }
  return authController.getMe(req, res, next);
});

// ======================================================
// ✉️ INVITATION ROUTES (WORKSPACE COLLABORATION)
// ======================================================

// 🛠️ PERBAIKAN: Nama fungsi disesuaikan dengan yang di-export oleh invitationController
router.get('/invitations/verify', invitationController.verifyInvitation); 
router.post('/invitations/accept', invitationController.acceptInvitation);

module.exports = router;