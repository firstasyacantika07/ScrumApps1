// routes/superadminRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // 💡 Menggunakan koneksi pool database MySQL Anda

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

/**
 * 🔥 3. BARU: Menangani GET /api/superadmin/companies
 * Dipergunakan oleh komponen CompanyManagement frontend untuk merender semua item database
 */
router.get('/companies', async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        company_name, 
        subdomain, 
        plan_id, 
        status, 
        package_type, 
        billing_cycle, 
        trial_start, 
        trial_end, 
        subscription_ends_at, 
        company_logo, 
        created_at
      FROM tbr_tenants 
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(query);

    res.status(200).json({
      success: true,
      message: "Seluruh data perusahaan berhasil ditarik.",
      data: rows
    });
  } catch (error) {
    console.error('❌ Error fetching all companies:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengambil data perusahaan dari database',
      error: error.message 
    });
  }
});

/**
 * 4. Menangani GET /api/superadmin/billing/invoices
 * Dipergunakan oleh komponen BillingTracker frontend Anda
 */
router.get('/billing/invoices', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        company_name,
        subdomain,
        package_type,
        billing_cycle,
        status,
        subscription_ends_at,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS paid_at,
        /* Membuat nomor invoice generator otomatis berbasis tanggal join dan ID */
        CONCAT('INV/', DATE_FORMAT(created_at, '%Y%m'), '/', LPAD(id, 4, '0')) AS invoice_number,
        /* Memetakan nominal harga bayangan berdasarkan package_type */
        CASE 
          WHEN package_type = 'PRO' THEN 499000
          WHEN package_type = 'ENTERPRISE' THEN 3500000
          ELSE 0 
        END AS amount
      FROM tbr_tenants
      ORDER BY created_at DESC
    `;

    const [rows] = await db.query(query);

    res.status(200).json({
      success: true,
      message: "Data billing dari tabel tbr_tenants berhasil ditarik.",
      data: rows
    });
  } catch (error) {
    console.error('❌ Error fetching billing invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data billing dari database.',
      error: error.message
    });
  }
});

/**
 * 5. Menangani PATCH /api/superadmin/tenants/:id/activate
 * Berfungsi mengubah status perusahaan menjadi active saat tombol verifikasi diklik di BillingTracker
 */
router.patch('/tenants/:id/activate', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      UPDATE tbr_tenants 
      SET status = 'active', 
          subscription_ends_at = DATE_ADD(NOW(), INTERVAL 1 MONTH),
          updated_at = NOW()
      WHERE id = ?
    `;

    const [result] = await db.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Perusahaan tenant tidak ditemukan di database."
      });
    }

    res.status(200).json({
      success: true,
      message: "Status pembayaran diverifikasi, tenant berhasil diaktifkan!"
    });
  } catch (error) {
    console.error('❌ Error activating tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status aktivasi di database.',
      error: error.message
    });
  }
});

/**
 * 🔥 6. BARU/MODIFIKASI: Menangani PATCH /api/superadmin/companies/:id/status
 * Menyesuaikan dengan kebutuhan tombol "Bekukan" & "Aktifkan Akun" di halaman CompanyManagement
 */
router.patch('/companies/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Menerima status baru ('active' atau 'suspended')

  // Validasi input status mencegah anomali data string ilegal
  if (!['active', 'suspended', 'trial'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status tidak valid. Gunakan 'active' atau 'suspended'."
    });
  }

  try {
    let query = `UPDATE tbr_tenants SET status = ?, updated_at = NOW() `;
    
    // Jika status diubah ke active, otomatis berikan masa perpanjangan opsional jika kosong
    if (status === 'active') {
      query += `, subscription_ends_at = IFNULL(subscription_ends_at, DATE_ADD(NOW(), INTERVAL 1 MONTH)) `;
    }
    
    query += ` WHERE id = ?`;

    const [result] = await db.query(query, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Organisasi tenant tidak ditemukan."
      });
    }

    res.status(200).json({
      success: true,
      message: `Berhasil mengubah status perusahaan menjadi ${status}.`
    });
  } catch (error) {
    console.error('❌ Error updating company status:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status kontrol organisasi di database.',
      error: error.message
    });
  }
});

module.exports = router;