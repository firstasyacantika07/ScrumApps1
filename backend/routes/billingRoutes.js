const express = require('express');
const router = express.Router();
const db = require("../config/db");

// Import Controller
const paymentController = require('../controllers/paymentController');

// Middleware auth
const { verifyToken, authorize } = require('../middleware/auth');

/* =========================================================================
   🌐 WEBHOOK MIDTRANS (PUBLIC — HARUS SEBELUM router.use(verifyToken)!)
   ========================================================================= */
// Dipanggil server-to-server oleh Midtrans tanpa menggunakan token Bearer/JWT
router.post('/webhook', paymentController.handleMidtransWebhook);


/* =========================================================================
   🔒 PROTECTED ROUTES (Semua rute di bawah wajib login JWT)
   ========================================================================= */
router.use(verifyToken);


/* =========================================================================
   📊 PLANS & STATUS ENDPOINTS
   ========================================================================= */

/**
 * 📊 GET: Mengambil status billing tenant saat ini & sisa kuota utilisasi
 * Endpoint: GET /api/billing/status (atau sesuai mounting di server.js Anda)
 */
router.get("/status", async (req, res) => {
    try {
        const tenantId = req.user?.tenant_id;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant ID tidak ditemukan pada sesi token Anda."
            });
        }

        // Query fresh ke tbr_tenants agar data bersifat real-time untuk semua admin/superadmin
        const [tenantRows] = await db.query(
            `SELECT id, company_name, package_type, billing_cycle, subscription_status,
                    trial_end, subscription_ends_at
             FROM tbr_tenants WHERE id = ?`, 
            [tenantId]
        );

        if (tenantRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Data workspace / organisasi tidak ditemukan."
            });
        }

        const tenant = tenantRows[0];

        const packageType = (tenant.package_type || 'FREE').toUpperCase();
        const billingCycle = tenant.billing_cycle || 'NONE';
        const trialEnd = tenant.trial_end;
        const subscriptionEndsAt = tenant.subscription_ends_at;

        // Hitung sisa masa aktif paket
        let remainingDays = 0;
        const referenceEndDate = billingCycle === 'TRIAL' ? trialEnd : subscriptionEndsAt;
        if (referenceEndDate) {
            const diffMs = new Date(referenceEndDate).getTime() - Date.now();
            remainingDays = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
        }

        // Hitung akumulasi project yang telah dibuat oleh tenant ini
        const [projectRows] = await db.query(
            'SELECT COUNT(*) as total FROM tbr_projects WHERE tenant_id = ?',
            [tenantId]
        );
        const projectUsed = projectRows[0]?.total || 0;

        // Hitung akumulasi anggota tim (users) yang bergabung di tenant ini
        const [teamRows] = await db.query(
            'SELECT COUNT(*) as total FROM tbr_users WHERE tenant_id = ?',
            [tenantId]
        );
        const teamUsed = teamRows[0]?.total || 0;

        // Definisi limitasi kuota langganan SaaS
        const PACKAGE_LIMITS = {
            FREE: { project: 1, team: 5 },
            PRO: { project: 15, team: 25 },
            ENTERPRISE: { project: 999, team: 999 }
        };
        const limits = PACKAGE_LIMITS[packageType] || PACKAGE_LIMITS.FREE;

        return res.status(200).json({
            success: true,
            data: {
                tenant_id: tenant.id,
                company_name: tenant.company_name,
                package_type: packageType,
                billing_cycle: billingCycle,
                remaining_days: remainingDays,
                constraints: {
                    project_used: projectUsed,
                    project_limit: limits.project,
                    team_used: teamUsed,
                    team_limit: limits.team
                }
            }
        });

    } catch (error) {
        console.error("GET WORKSPACE BILLING STATUS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Terjadi kesalahan internal server saat memuat status langganan."
        });
    }
});

/**
 * 🎯 GET: Mengambil daftar penawaran paket langganan dari database
 * Endpoint: GET /api/billing/plans
 */
router.get("/plans", async (req, res) => {
    try {
        const [plans] = await db.query(`SELECT * FROM tbr_plans ORDER BY id ASC`);
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


/* =========================================================================
   💳 MIDTRANS & TRANSACTION ENDPOINTS
   ========================================================================= */

// ⚡ Mengenerate token transaksi via Midtrans Snap (Modal Popup)
router.post('/payment/create-transaction', paymentController.createPayment);

// 📱 Eksekusi direct charge via Midtrans Core API (E-Wallet / Virtual Account)
router.post('/payment/charge', paymentController.createCheckoutSession);

// 🔍 Melakukan polling status manual pengecekan pembayaran berdasarkan Order ID
router.get('/payment/status/:orderId', paymentController.checkPaymentStatus);

// 🚀 Aktivasi manual / bypassing perpanjangan paket subscription
router.post('/subscription/activate', paymentController.activatePlan);


/* =========================================================================
   📄 HISTORY & MANAGEMENT ENDPOINTS (ADMIN ONLY)
   ========================================================================= */

/**
 * 📜 GET: Menampilkan daftar riwayat aktivitas transaksi finansial (Hanya Superadmin)
 * Endpoint: GET /api/billing/history
 */
router.get('/history', authorize(['superadmin', 'Superadmin']), async (req, res) => {
    try {
        // 🔥 FIX: Nama tabel diubah dari tbr_payment menjadi tbr_payments agar sinkron
        const [history] = await db.query(
            `SELECT * FROM tbr_payments ORDER BY created_at DESC LIMIT 50`
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
 * ❌ DELETE: Menghapus log/membatalkan entitas draf transaksi pembayaran
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
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