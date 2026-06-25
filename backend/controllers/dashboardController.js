const db = require('../config/db');

// =========================================================================
// 🏢 1. TENANT/WORKSPACE DASHBOARD (Untuk User Biasa & Admin Workspace)
// =========================================================================
/**
 * getStats:
 * Mengambil ringkasan data proyek spesifik untuk workspace/tenant tertentu.
 */
exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Header X-Tenant-ID diperlukan." });
        }

        // 1. Query untuk statistik proyek dengan nama tabel yang benar (tbr_projects)
        const [projectStats] = await db.query(
            `SELECT 
                COUNT(*) as totalProjects,
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completedProjects,
                SUM(CASE WHEN status = 'on_progress' THEN 1 ELSE 0 END) as activeProjects
             FROM tbr_projects 
             WHERE tenant_id = ?`, 
            [tenantId]
        );

        // 2. Ambil 5 aktivitas proyek terbaru dalam lingkup tenant
        const [recentActivity] = await db.query(
            'SELECT name, status, updated_at FROM tbr_projects WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 5',
            [tenantId]
        );

        // 3. Pastikan data tidak kosong
        const summary = projectStats[0] || { totalProjects: 0, completedProjects: 0, activeProjects: 0 };

        // 4. Kirim respon
        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalProjects: Number(summary.totalProjects) || 0,
                    completedProjects: Number(summary.completedProjects) || 0,
                    activeProjects: Number(summary.activeProjects) || 0
                },
                recentActivity: recentActivity,
                user: {
                    role: req.user.role
                }
            }
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Gagal mengambil data statistik dashboard", 
            error: error.message 
        });
    }
};

// =========================================================================
// 👑 2. SUPERADMIN DASHBOARD (Global Platform SaaS - Memakai tbr_tenants)
// =========================================================================

/**
 * getDashboardStats:
 * Mengambil statistik akumulatif seluruh platform untuk kebutuhan Superadmin.
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // Proteksi tambahan: Pastikan yang mengakses benar-benar superadmin
        if (req.user?.role !== 'superadmin' && req.user?.role !== 'admin') {
            // Catatan: sesuaikan string 'superadmin' dengan enum role di database Anda
        }

        // Hitung total tenant dari tbr_tenants
        const [tenantCount] = await db.query('SELECT COUNT(*) as totalTenants FROM tbr_tenants');
        // Hitung total user dari tbr_users
        const [userCount] = await db.query('SELECT COUNT(*) as totalUsers FROM tbr_users');
        // Hitung total subscription aktif
        const [activeSubs] = await db.query("SELECT COUNT(*) as activeSubs FROM tbr_tenants WHERE status = 'active'");

        return res.status(200).json({
            success: true,
            data: {
                totalCompanies: tenantCount[0].totalTenants, // Properti disamakan dengan kebutuhan frontend
                totalUsers: userCount[0].totalUsers,
                activeSubscriptions: activeSubs[0].activeSubs
            }
        });
    } catch (error) {
        console.error("Superadmin Stats Error:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Gagal memuat statistik dashboard superadmin.",
            error: error.message 
        });
    }
};

/**
 * getRecentTenants:
 * Mengambil 5 tenant/perusahaan yang baru saja mendaftar ke platform ScrumApps.
 */
exports.getRecentTenants = async (req, res) => {
    try {
        // Mengambil 5 tenant terbaru dari tbr_tenants
        const [rows] = await db.query(`
            SELECT 
                id, 
                package_type, 
                billing_cycle, 
                status, 
                created_at 
            FROM tbr_tenants 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        return res.status(200).json({
            success: true,
            data: rows // Akan dipetakan oleh frontend ke tabel Recent Companies
        });
    } catch (error) {
        console.error("Superadmin Recent Tenants Error:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Gagal memuat data perusahaan terbaru.",
            error: error.message 
        });
    }
};