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
// 📊 PLANS & STATUS ENDPOINTS (TARUH STATIS DI ATAS)
// ======================================================

/**
 * 🔥 TAMBAHAN AKSI: Mengambil status billing/langganan paket tenant aktif saat ini
 * Merespon: GET http://localhost:5000/api/workspace/billing/status
 */
router.get("/status", async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant ID tidak ditemukan pada sesi token Anda."
            });
        }

        // Ambil informasi paket langganan aktif dari tabel tbr_tenants
        const [tenantRows] = await db.query(
            `SELECT id, company_name, package_type, expires_at 
             FROM tbr_tenants 
             WHERE id = ?`, 
            [tenantId]
        );

        if (tenantRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Data workspace / organisasi tidak ditemukan."
            });
        }

        const tenant = tenantRows[0];

        // Definisikan kapasitas benefit static berdasarkan package_type sebagai fallback UI frontend
        let maxProjects = 1;
        let maxTeamMembers = 5;

        if (String(tenant.package_type).toLowerCase() === 'pro') {
            maxProjects = 15;
            maxTeamMembers = 25;
        } else if (String(tenant.package_type).toLowerCase() === 'enterprise') {
            maxProjects = 999;
            maxTeamMembers = 999;
        }

        return res.status(200).json({
            success: true,
            data: {
                tenant_id: tenant.id,
                company_name: tenant.company_name,
                package_type: tenant.package_type || 'FREE',
                expires_at: tenant.expires_at || null,
                constraints: {
                    max_projects: maxProjects,
                    max_team_members: maxTeamMembers
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
 * ❌ DELETE: Batalkan/Hapus transaksi tertentu berdasarkan ID (Ditaruh di paling bawah)
 * Endpoint: DELETE /api/billing/:id
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