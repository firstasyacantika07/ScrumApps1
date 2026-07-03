const db = require('../config/db');

/**
 * =========================================================================
 * ⚠️ FIX: File ini sebelumnya KOSONG (tidak ada satu fungsi pun), sehingga
 * route yang memanggil billingController.getBillingStatus gagal total
 * (server bisa crash saat start jika didaftarkan sebagai route handler,
 * atau selalu 500 saat diakses). Ini penyebab data "Kuota Pembuatan Proyek
 * 0/∞" dan "Sisa 0 Hari Lagi" selalu muncul di dashboard Admin Workspace.
 *
 * CATATAN SKEMA (sudah dikonfirmasi ke database sebenarnya):
 * - Tabel tbr_tenants punya kolom: package_type, billing_cycle, status,
 *   trial_start, trial_end, subscription_ends_at (BUKAN start_date/end_date).
 * - Batas project_limit / team_limit ditentukan dari package_type
 *   (FREE / PRO / ENTERPRISE). Sesuaikan angka limit di bawah sesuai
 *   kebijakan bisnis Anda, atau ganti jadi baca dari tabel tbr_plans jika ada.
 * =========================================================================
 */

// Batas default per paket. Ganti sesuai kebijakan produk Anda,
// atau pindahkan ke tabel database jika limit-nya dinamis.
const PLAN_LIMITS = {
    free: { project_limit: 3, team_limit: 5 },
    pro: { project_limit: 20, team_limit: 30 },
    enterprise: { project_limit: null, team_limit: null } // null = unlimited (∞)
};

exports.getBillingStatus = async (req, res) => {
    try {
        // 🔧 Konsisten dengan fix keamanan di dashboardController.js: utamakan
        // tenant_id dari JWT (req.user) yang sudah terverifikasi, bukan header
        // client yang bisa dipalsukan. Header dipertahankan sebagai fallback
        // hanya untuk kompatibilitas kalau ada pemanggil lama yang masih pakai itu.
        const tenantId = req.user.tenant_id || req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant ID tidak ditemukan pada request."
            });
        }

        // 🐛 BUG DITEMUKAN & DIPERBAIKI: kolom `start_date`/`end_date` TIDAK ADA di
        // tabel tbr_tenants. Kolom yang benar: `trial_start`, `trial_end`, dan
        // `subscription_ends_at`. Query lama selalu gagal (ER_BAD_FIELD_ERROR),
        // sehingga endpoint ini SELALU 500 — itu penyebab dashboard Admin selalu
        // tampil "0/∞" (frontend fallback ke objek kosong saat request gagal).
        const [[tenant]] = await db.query(
            `SELECT package_type, billing_cycle, status, trial_start, trial_end, subscription_ends_at 
             FROM tbr_tenants WHERE id = ?`,
            [tenantId]
        );

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "Data workspace/tenant tidak ditemukan."
            });
        }

        // 🔧 FIX: samakan logika end-date dengan authController.js (login/getMe) —
        // selama TRIAL pakai trial_end, setelah upgrade pakai subscription_ends_at.
        const relevantEndDate = tenant.billing_cycle === 'TRIAL' ? tenant.trial_end : tenant.subscription_ends_at;

        // Hitung sisa hari aktif paket
        let remainingDays = 0;
        if (relevantEndDate) {
            const end = new Date(relevantEndDate);
            const now = new Date();
            const diffMs = end.getTime() - now.getTime();
            remainingDays = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
        }

        const packageKey = (tenant.package_type || 'free').toLowerCase();
        const limits = PLAN_LIMITS[packageKey] || PLAN_LIMITS.free;

        // Hitung pemakaian aktual
        const [[projectUsage]] = await db.query(
            `SELECT COUNT(*) as cnt FROM tbr_projects WHERE tenant_id = ?`,
            [tenantId]
        );

        const [[teamUsage]] = await db.query(
            `SELECT COUNT(*) as cnt FROM tbr_users WHERE tenant_id = ?`,
            [tenantId]
        );

        return res.status(200).json({
            success: true,
            data: {
                package_type: (tenant.package_type || 'FREE').toUpperCase(),
                remaining_days: remainingDays,
                project_used: projectUsage?.cnt || 0,
                project_limit: limits.project_limit, // null berarti ∞ (unlimited)
                team_used: teamUsage?.cnt || 0,
                team_limit: limits.team_limit
            }
        });

    } catch (error) {
        console.error("Billing Status Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Gagal memuat status billing workspace.",
            error: error.message
        });
    }
};