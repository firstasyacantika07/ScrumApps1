const express = require('express');
const router = express.Router();

// Controller
const dashboardController = require('../controllers/dashboardController');

// Middleware (PASTIKAN path & nama file benar)
const { verifyToken, authorize } = require('../middleware/auth');

// 🔒 Semua route di bawah ini WAJIB login
router.use(verifyToken);

// Route umum (semua role bisa akses kalau sudah login)
router.get('/stats', dashboardController.getStats);

// 🔐 Khusus Superadmin
router.get('/admin', authorize('Superadmin'), (req, res) => {
    res.json({ message: "Welcome to Superadmin Dashboard" });
});

// 🔐 Khusus Business Analyst
router.get('/analyst', authorize('BusinessAnalyst'), (req, res) => {
    res.json({ message: "Welcome to Business Analyst Dashboard" });
});

// 🔐 Khusus Developer
router.get('/developer', authorize('TeamDeveloper'), (req, res) => {
    res.json({ message: "Welcome to Developer Dashboard" });
});

module.exports = router;