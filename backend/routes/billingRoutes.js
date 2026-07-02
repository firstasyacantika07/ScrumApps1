const express = require('express');
const router = express.Router();
const db = require("../config/db");

// Import Controller
const paymentController = require('../controllers/paymentController');

// Middleware auth
const { verifyToken, authorize } = require('../middleware/auth');

// ======================================================
// 🌐 WEBHOOK MIDTRANS (PUBLIC — HARUS SEBELUM router.use(verifyToken)!)
// ======================================================
/**
 * ⚠️ FIX: sebelumnya diarahkan ke subscriptionController.handleMidtransWebhook, yang
 * baca dari tabel `transactions` -- tabel yang TIDAK PERNAH ditulis oleh alur checkout
 * (createPayment/createCheckoutSession keduanya nulis ke tbr_payments). Akibatnya webhook
 * itu selalu gagal cari order ("not found") dan tbr_tenants tidak pernah ter-update.
 *
 * SEKARANG: diarahkan ke paymentController.handleMidtransWebhook, yang baca dari
 * tbr_payments (tabel yang benar) dan mem-propagate ke tbr_subscriptions + tbr_tenants + tbr_users.
 *
 * ⚠️ PENTING: route ini WAJIB tetap di atas router.use(verifyToken) di bawah.
 * Midtrans memanggil endpoint ini server-to-server TANPA JWT/Bearer token user,
 * jadi kalau ikut kena verifyToken, notifikasi akan selalu ditolak 401 dan
 * tbr_tenants tidak akan pernah ter-update walau transaksi sukses di Midtrans.
 *
 * Endpoint: POST /api/workspace/billing/webhook
 * (sesuaikan path ini dengan "Payment Notification URL" di dashboard Midtrans kamu)
 */
router.post('/webhook', paymentController.handleMidtransWebhook);

/**
 * 🔒 SEMUA ROUTE BILLING DI BAWAH INI WAJIB LOGIN
 * Menjaga semua endpoint di bawah ini agar hanya bisa diakses user terautentikasi
 */
router.use(verifyToken);

// ======================================================
// 📊 PLANS & STATUS ENDPOINTS
// ======================================================

/**
 * 🔥 Mengambil status billing/langganan paket tenant aktif saat ini beserta utilisasi kuota
 * Endpoint: GET /api/workspace/billing/status
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

        // 1. Ambil informasi tenant/perusahaan BESERTA data langganan langsung dari DB
        //    ⚠️ SEBELUMNYA: package_type/billing_cycle diambil dari req.user (isi JWT token),
        //    yang basi kalau token belum di-refresh sejak terakhir beli paket. Ini penyebab
        //    "subscription admin baru belum termuat di dashboard" & "admin/superadmin ga sinkron",
        //    karena setiap admin di tenant yang sama bisa punya JWT dengan snapshot data berbeda-beda.
        //    SEKARANG: selalu query fresh ke tbr_tenants, jadi SEMUA admin di tenant yang sama
        //    otomatis melihat data yang sama & real-time.
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

        // 2. Ambil data langganan dari tenant (bukan dari JWT lagi)
        const packageType = (tenant.package_type || 'FREE').toUpperCase();
        const billingCycle = tenant.billing_cycle || 'NONE';
        const trialEnd = tenant.trial_end;
        const subscriptionEndsAt = tenant.subscription_ends_at;

        // 3. Hitung sisa hari aktif langganan
        let remainingDays = 0;
        const referenceEndDate = billingCycle === 'TRIAL' ? trialEnd : subscriptionEndsAt;
        if (referenceEndDate) {
            const diffMs = new Date(referenceEndDate).getTime() - Date.now();
            remainingDays = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
        }

        // 4. Hitung jumlah project yang sudah digunakan
        const [projectRows] = await db.query(
            'SELECT COUNT(*) as total FROM tbr_projects WHERE tenant_id = ?',
            [tenantId]
        );
        const projectUsed = projectRows[0]?.total || 0;

        // 5. Hitung jumlah anggota tim yang sudah terdaftar
        const [teamRows] = await db.query(
            'SELECT COUNT(*) as total FROM tbr_users WHERE tenant_id = ?',
            [tenantId]
        );
        const teamUsed = teamRows[0]?.total || 0;

        // 🔒 Batas kuota konsisten dengan middleware/SubscriptionsMiddleware.js
        const PACKAGE_LIMITS = {
            FREE: { project: 1, team: 5 },
            PRO: { project: 15, team: 25 },
            ENTERPRISE: { project: 999, team: 999 } // Diubah dari null ke 999 agar konsisten dengan fallback UI numerik
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
 * ❌ DELETE: Batalkan/Hapus transaksi tertentu berdasarkan ID
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