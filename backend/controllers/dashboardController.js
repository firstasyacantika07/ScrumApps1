const db = require('../config/db');

/**
 * getStats:
 * Mengambil ringkasan data untuk ditampilkan di Dashboard.
 * Mencakup total proyek, statistik status, dan informasi profil ringkas.
 */
exports.getStats = async (req, res) => {
    try {
        // 1. Ambil data user dari req.user (hasil decode verifyToken)
        const userId = req.user.id;

        // 2. Query untuk statistik proyek (Total, Selesai, Aktif)
        // Menghitung berdasarkan user_id agar data yang muncul hanya milik user tersebut
        const [projectStats] = await db.query(
            `SELECT 
                COUNT(*) as totalProjects,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedProjects,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as activeProjects
             FROM projects 
             WHERE user_id = ?`, 
            [userId]
        );

        // 3. Ambil 5 aktivitas proyek terbaru
        const [recentActivity] = await db.query(
            'SELECT name, status, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC LIMIT 5',
            [userId]
        );

        // 4. Kirim respon ke Frontend
        res.status(200).json({
            success: true,
            data: {
                summary: projectStats[0] || { totalProjects: 0, completedProjects: 0, activeProjects: 0 },
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