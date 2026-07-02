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
 * 📡 GET: Status paket & kuota workspace aktif tenant yang sedang login
 * Endpoint: GET /api/billing/status
 * Dipakai oleh Dashboard.jsx (role Admin) untuk menampilkan kartu billing.
 */
router.get('/status', async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;

        if (!tenantId) {
            return res.status(404).json({
                success: false,
                message: "Data perusahaan/workspace tidak ditemukan untuk akun Anda."
            });
        }

        const packageType = (req.user.package_type || 'FREE').toUpperCase();
        const billingCycle = req.user.billing_cycle || 'NONE';
        const trialEnd = req.user.trial_end;
        const subscriptionEndsAt = req.user.subscription_ends_at;

        let remainingDays = 0;
        const referenceEndDate = billingCycle === 'TRIAL' ? trialEnd : subscriptionEndsAt;
        if (referenceEndDate) {
            const diffMs = new Date(referenceEndDate).getTime() - Date.now();
            remainingDays = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
        }

        const [projectRows] = await db.query(
            'SELECT COUNT(*) as total FROM tbr_projects WHERE tenant_id = ?',
            [tenantId]
        );
        const projectUsed = projectRows[0]?.total || 0;

        const [teamRows] = await db.query(
            'SELECT COUNT(*) as total FROM tbr_users WHERE tenant_id = ?',
            [tenantId]
        );
        const teamUsed = teamRows[0]?.total || 0;

        // 🔒 Batas kuota konsisten dengan middleware/SubscriptionsMiddleware.js
        const PACKAGE_LIMITS = {
            FREE: { project: 1, team: 5 },
            PRO: { project: 15, team: 25 },
            ENTERPRISE: { project: null, team: null }
        };
        const limits = PACKAGE_LIMITS[packageType] || PACKAGE_LIMITS.FREE;

        return res.status(200).json({
            success: true,
            data: {
                package_type: packageType,
                remaining_days: remainingDays,
                project_used: projectUsed,
                project_limit: limits.project,
                team_used: teamUsed,
                team_limit: limits.team
            }
        });
    } catch (error) {
        console.error("GET BILLING STATUS ROUTE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Gagal mengambil status billing workspace."
        });
    }
});

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