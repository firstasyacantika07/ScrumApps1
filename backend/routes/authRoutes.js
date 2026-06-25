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

// Rute Publik untuk memproses token undangan (Baris 53 aman)
// Di dalam routes/authRoutes.js Anda bisa tulis sesederhana ini sekarang:
router.get('/invitations/verify', invitationController.verifyTokenRoute); 
router.post('/invitations/accept', invitationController.acceptInvite);

module.exports = router;