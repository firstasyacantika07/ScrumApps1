const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

// ======================================================
// USER LOGIN
// ======================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Ambil data user komplit berdasarkan email (Menambahkan kolom trial & subscription)
    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        email,
        password,
        role,
        tenant_id,
        package_type,
        billing_cycle,
        subscription_status,
        trial_used,
        trial_ends_at,
        subscription_ends_at
      FROM tbr_users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    const user = rows[0];

    // Jika user tidak ditemukan
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    // 2. Sinkronisasi format hash bcrypt PHP ($2y$ ke $2a$) jika migrasi dari PHP
    let hashedPassword = user.password;
    if (hashedPassword.startsWith("$2y$")) {
      hashedPassword = "$2a$" + hashedPassword.slice(4);
    }

    // 3. Verifikasi Password
    const isMatch = await bcrypt.compare(password, hashedPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    // 💡 CATATAN LOGIKA: Status subscription tidak diblokir di sini agar user FREE / PENDING 
    // tetap bisa masuk ke dashboard dan mengakses halaman Billing untuk upgrade paket.

    // 4. Cek apakah trial sudah kedaluwarsa secara realtime (Cron-job alternatif saat login)
    let finalStatus = user.subscription_status || "active";
    let expiredTrial = false;
    
    if (user.billing_cycle === "TRIAL" && user.trial_ends_at) {
      const now = new Date();
      const endTrialDate = new Date(user.trial_ends_at);
      if (now > endTrialDate) {
        finalStatus = "expired";
        expiredTrial = true;
        
        // Update otomatis ke database jika ketahuan expired pas login
        await db.query(
          `UPDATE tbr_users SET subscription_status = 'expired' WHERE id = ?`,
          [user.id]
        );
      }
    }

    // 5. Generate JWT Token dengan payload data paket terbaru
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        tenant_id: user.tenant_id || 0,
        package_type: user.package_type || "FREE",
        subscription_status: finalStatus,
        billing_cycle: user.billing_cycle || "NONE",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Amankan payload response dengan menghapus properti password sebelum dikirim
    delete user.password;

    // Masukkan info tambahan tanggal untuk dibaca Billing.jsx frontend
    const formattedEndDate = user.billing_cycle === "TRIAL" ? user.trial_ends_at : user.subscription_ends_at;

    return res.status(200).json({
      success: true,
      token,
      user: {
        ...user,
        subscription_status: finalStatus,
        expired_trial: expiredTrial,
        end_date: formattedEndDate ? new Date(formattedEndDate).toISOString().split('T')[0] : null
      },
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ======================================================
// GET ME (Check Current Logged In User Data)
// ======================================================
exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau kedaluwarsa",
      });
    }

    // Ambil data lengkap untuk disinkronkan ke Billing Frontend secara berkala
    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        tenant_id,
        package_type,
        billing_cycle,
        subscription_status,
        trial_used,
        trial_ends_at,
        subscription_ends_at
      FROM tbr_users
      WHERE id = ?
      LIMIT 1
      `,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    const user = rows[0];

    // Cek status kedaluwarsa trial secara realtime saat user merefresh halaman browser
    let finalStatus = user.subscription_status || "active";
    let expiredTrial = false;
    
    if (user.billing_cycle === "TRIAL" && user.trial_ends_at) {
      const now = new Date();
      const endTrialDate = new Date(user.trial_ends_at);
      if (now > endTrialDate) {
        finalStatus = "expired";
        expiredTrial = true;

        await db.query(
          `UPDATE tbr_users SET subscription_status = 'expired' WHERE id = ?`,
          [user.id]
        );
      }
    }

    const formattedEndDate = user.billing_cycle === "TRIAL" ? user.trial_ends_at : user.subscription_ends_at;

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        package_type: user.package_type || "FREE",
        billing_cycle: user.billing_cycle || "NONE",
        subscription_status: finalStatus,
        trial_used: user.trial_used,
        expired_trial: expiredTrial,
        end_date: formattedEndDate ? new Date(formattedEndDate).toISOString().split('T')[0] : null
      },
    });

  } catch (error) {
    console.error("GET ME ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat data user",
      error: error.message,
    });
  }
};