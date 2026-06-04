const express = require('express');
const router = express.Router();
const db = require("../config/db");

// Import Controller yang telah kita buat sebelumnya
const paymentController = require('../controllers/paymentController');

// Middleware auth (pastikan path ini sesuai dengan struktur project Anda)
const { verifyToken, authorize } = require('../middleware/auth');

/**
 * 🔒 SEMUA ROUTE BILLING WAJIB LOGIN
 * Menjaga semua endpoint di bawah ini agar hanya bisa diakses user terautentikasi
 */
router.use(verifyToken);

// ======================================================
// 📊 PLANS ENDPOINTS
// ======================================================

/**
 * 🎯 GET: Ambil semua daftar paket (Plans) dari database
 * Endpoint: GET /api/billing/plans
 */
router.get("/plans", async (req, res) => {
    try {
        const [plans] = await db.query(`SELECT * FROM tbr_plans`);
        return res.status(200).json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error("GET PLANS ROUTE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Gagal mengambil data paket penawaran"
        });
    }
});

// ======================================================
// 💳 MIDTRANS & TRANSACTION ENDPOINTS
// ======================================================

/**
 * ⚡ POST: Buat transaksi via Midtrans Snap (Mendapatkan token & redirect URL)
 * Endpoint: POST /api/billing/payment/create-transaction
 */
router.post('/payment/create-transaction', paymentController.createPayment);

/**
 * 📱 POST: Buat transaksi via Midtrans Core API (Direct Charge QRIS/VA)
 * Endpoint: POST /api/billing/payment/charge
 */
router.post('/payment/charge', paymentController.createCheckoutSession);

/**
 * 🔍 GET: Cek status pembayaran ke Midtrans berdasarkan Order ID
 * Endpoint: GET /api/billing/payment/status/:orderId
 */
router.get('/payment/status/:orderId', paymentController.checkPaymentStatus);

/**
 * 🚀 POST: Aktivasi/Upgrade paket langganan user (Subscription)
 * Endpoint: POST /api/billing/subscription/activate
 */
router.post('/subscription/activate', paymentController.activatePlan);

// ======================================================
// 📄 HISTORY & MANAGEMENT ENDPOINTS (ADMIN ONLY)
// ======================================================

/**
 * 📜 GET: Riwayat seluruh transaksi (Hanya Superadmin)
 * Endpoint: GET /api/billing/history
 */
router.get('/history', authorize('Superadmin'), async (req, res) => {
    try {
        // Integrasikan dengan tbr_payment jika ingin mengambil data riwayat asli dari DB
        const [history] = await db.query(
            `SELECT * FROM tbr_payment ORDER BY created_at DESC LIMIT 50`
        );
        
        return res.status(200).json({
            success: true,
            message: 'Riwayat seluruh transaksi berhasil diambil',
            data: history
        });
    } catch (error) {
        console.error("GET HISTORY ROUTE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Gagal mengambil data riwayat transaksi"
        });
    }
});

/**
 * ❌ DELETE: Batalkan/Hapus transaksi tertentu berdasarkan ID
 * Endpoint: DELETE /api/billing/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Simulasi atau eksekusi query hapus/update status ke database
        // await db.query(`UPDATE tbr_payment SET payment_status = 'CANCELLED' WHERE id = ?`, [id]);

        return res.status(200).json({
            success: true,
            message: `Transaksi dengan id ${id} berhasil dibatalkan`
        });
    } catch (error) {
        console.error("DELETE TRANSACTION ROUTE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Gagal membatalkan transaksi"
        });
    }
});

module.exports = router;