// routes/superadminRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // 💡 Sesuaikan dengan path file koneksi database/pool Anda

/**
 * 1. Menangani GET /api/superadmin/dashboard/stats
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    // 📊 Hitung total seluruh tenant/perusahaan
    const [totalCompanies] = await db.query('SELECT COUNT(*) as total FROM tbr_tenants');
    
    // 🟢 Hitung tenant yang statusnya aktif
    const [activeCompanies] = await db.query('SELECT COUNT(*) as total FROM tbr_tenants WHERE status = "active"');
    
    // ⏳ Hitung tenant yang tipenya PRO (sebagai contoh metrik komersial)
    const [proCompanies] = await db.query('SELECT COUNT(*) as total FROM tbr_tenants WHERE package_type = "PRO"');

    res.status(200).json({
      success: true,
      totalCompanies: totalCompanies[0].total,
      totalActiveUsers: activeCompanies[0].total, // Mengisi slot active metrics di dashboard
      pendingRequests: proCompanies[0].total       // Mengisi slot package metrics di dashboard
    });
  } catch (error) {
    console.error('❌ Error fetching superadmin stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengambil statistik database',
      error: error.message 
    });
  }
});

/**
 * 2. Menangani GET /api/superadmin/companies/recent
 */
router.get('/companies/recent', async (req, res) => {
  try {
    // 🏢 Mengambil 5 perusahaan terbaru berdasarkan kolom company_name, status, dan created_at
    const [recentTenants] = await db.query(
      `SELECT 
        id, 
        company_name AS name, 
        status, 
        package_type, 
        created_at AS createdAt 
       FROM tbr_tenants 
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    // Kirim langsung array datanya ke frontend
    res.status(200).json(recentTenants);
  } catch (error) {
    console.error('❌ Error fetching recent tenants:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengambil data perusahaan terbaru',
      error: error.message 
    });
  }
});

module.exports = router;