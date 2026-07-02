// routes/workspaceRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // 💡 Menggunakan koneksi pool database MySQL Anda
const invitationController = require('../controllers/invitationController'); 
const { verifyToken } = require('../middleware/auth'); // Menyelaraskan dengan file utama server.js Anda

// =========================================================================
// 🛡️ MIDDLEWARE PROTEKSI KHUSUS ADMIN WORKSPACE
// =========================================================================
const requireAdmin = (req, res, next) => {
  const roleLower = req.user?.role?.toString().toLowerCase() || '';
  if (!roleLower.includes('admin')) {
    return res.status(403).json({ 
      success: false, 
      message: "Akses ditolak. Otoritas ini hanya dimiliki oleh Admin Workspace Perusahaan." 
    });
  }
  next();
};

/**
 * 📩 1. Route Eksisting: Mengirim email undangan anggota tim baru
 * POST /api/workspace/invitations
 */
router.post('/invitations', verifyToken, requireAdmin, invitationController.inviteUser);

/**
 * 🏢 2. 🔥 BARU: Menangani GET /api/workspace/billing/status
 * Dipergunakan oleh komponen AdminWorkspaceView frontend untuk mengambil kuota penggunaan & limit SaaS
 */
router.get('/billing/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Identitas Tenant ID (Isolasi Data SaaS) tidak ditemukan pada sesi Anda."
      });
    }

    // a. Ambil data paket langganan dan hitung sisa hari aktif dari tabel tbr_tenants
    const [tenantQuery] = await db.query(`
      SELECT 
        package_type,
        status,
        IFNULL(DATEDIFF(subscription_ends_at, NOW()), 0) AS remaining_days
      FROM tbr_tenants 
      WHERE id = ?
    `, [tenantId]);

    if (tenantQuery.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Data organisasi ruang kerja Anda tidak terdaftar." 
      });
    }

    const tenant = tenantQuery[0];

    // b. Hitung jumlah total proyek yang sudah dibuat oleh tenant ini
    const [projectCount] = await db.query(
      'SELECT COUNT(*) as total FROM tbr_projects WHERE tenant_id = ?', 
      [tenantId]
    );

    // c. Hitung jumlah anggota tim internal yang terdaftar dalam tenant ini
    const [teamCount] = await db.query(
      'SELECT COUNT(*) as total FROM tbr_users WHERE tenant_id = ?', 
      [tenantId]
    );

    // d. Logika Hard-Limit Kuota Fitur Berbasis Tingkatan Paket (Package Tier)
    let projectLimit = 3;  // Default Paket FREE: maksimal 3 proyek
    let teamLimit = 5;     // Default Paket FREE: maksimal 5 anggota tim

    if (tenant.package_type === 'PRO') {
      projectLimit = 15;
      teamLimit = 30;
    } else if (tenant.package_type === 'ENTERPRISE') {
      projectLimit = 0; // Angka 0 akan dibaca sebagai tak terbatas (∞) oleh logika frontend Anda
      teamLimit = 0;
    }

    // e. Kirim data dengan struktur properti yang tepat sesuai kebutuhan state frontend
    return res.status(200).json({
      success: true,
      data: {
        package_type: tenant.package_type || 'FREE',
        remaining_days: tenant.remaining_days < 0 ? 0 : tenant.remaining_days,
        project_used: projectCount[0].total,
        project_limit: projectLimit,
        team_used: teamCount[0].total,
        team_limit: teamLimit
      }
    });

  } catch (error) {
    console.error("❌ Error fetching workspace billing status:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Gagal memuat status kuota workspace dari database.",
      error: error.message 
    });
  }
});

module.exports = router;