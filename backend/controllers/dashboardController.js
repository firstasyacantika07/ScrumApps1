const db = require('../config/db');

/**
 * getStats:
 * Mengambil ringkasan data untuk ditampilkan di Dashboard.
 */
exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.headers['x-tenant-id'];

        if (!tenantId) {
            return res.status(400).json({ success: false, message: "Header X-Tenant-ID diperlukan." });
        }

        // 1. Query untuk statistik proyek dengan nama tabel yang benar (tbr_projects)
        // Saya sesuaikan status 'Completed' dan 'In Progress' dengan standar sistem Anda
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
        res.status(200).json({
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
        res.status(500).json({ 
            success: false, 
            message: "Gagal mengambil data statistik dashboard", 
            error: error.message 
        });
    }
};