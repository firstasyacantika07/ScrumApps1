const db = require('../config/db');

const checkPlan = async (req, res, next) => {
  try {
    // 1. Pastikan user sudah melewati middleware verifyJWT sebelumnya
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Akses Ditolak: Sesi tidak valid atau kedaluwarsa." });
    }

    // 2. Ambil data paket & status berlangganan langsung dari database (Realtime Validation)
    // Menggunakan kolom trial_end dan subscription_ends_at yang baru kita rapikan
    const [rows] = await db.query(
      `SELECT package_type, subscription_status, billing_cycle, trial_end, subscription_ends_at 
       FROM tbr_users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    const userDb = rows[0];

    if (!userDb) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    const now = new Date();
    const userPackage = userDb.package_type || 'FREE';
    const subStatus = userDb.subscription_status || 'active';

    // 3. Validasi Masa Kedaluwarsa Langganan / Trial
    if (subStatus === 'expired') {
      return res.status(403).json({ 
        message: "Akses Terkunci: Masa langganan atau trial Anda telah habis. Silakan lakukan pembaruan paket." 
      });
    }

    // Pengecekan ekstra jika status di DB belum ter-update tapi tanggal sudah lewat
    const expiryDate = userDb.billing_cycle === 'TRIAL' ? userDb.trial_end : userDb.subscription_ends_at;
    if (expiryDate && now > new Date(expiryDate)) {
      // Update otomatis status ke expired
      await db.query(`UPDATE tbr_users SET subscription_status = 'expired' WHERE id = ?`, [req.user.id]);
      return res.status(403).json({ 
        message: "Akses Terkunci: Masa berlaku paket Anda telah kedaluwarsa." 
      });
    }

    // 4. Penentuan Batasan Limit Berdasarkan Paket Kontrak (Plan Limit Assignment)
    console.log(`[PlanCheck] User ID: ${req.user.id} | Package: ${userPackage} | Status: ${subStatus}`);

    if (userPackage === 'FREE') {
      req.planLimit = 1; // Batasan maksimal untuk user paket FREE (Misal: maks 5 project/sprint)
    } else {
      req.planLimit = 5; // Kuota tak terbatas untuk user paket PRO / PREMIUM
    }

    // Teruskan ke controller berikutnya
    next();

  } catch (error) {
    console.error("CHECKPLAN MIDDLEWARE ERROR:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada sistem pengecekan paket aplikasi." });
  }
};

module.exports = { checkPlan };