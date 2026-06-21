const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

// =========================================================================
// 💡 HELPER INTERNAL: VALIDASI & SINKRONISASI FORMAT TANGGAL ISO
// =========================================================================
// Mencegah crash jika data berupa objek Date asli JavaScript atau string kosong 0000-00-00
const safeIsoDate = (dateString) => {
  if (!dateString) return null;

  // Jika driver mysql2 otomatis mengonversi kolom DATETIME menjadi objek Date JavaScript
  if (dateString instanceof Date) {
    if (isNaN(dateString.getTime())) return null;
    return dateString.toISOString().split('T')[0];
  }

  // Jika data berupa tipe string, lakukan sanitasi format kosong MySQL
  if (typeof dateString === 'string') {
    const trimmed = dateString.trim();
    if (!trimmed || trimmed.startsWith('0000')) return null;
    
    const parsedDate = new Date(trimmed);
    return isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString().split('T')[0];
  }

  return null;
};

// ======================================================
// 🔐 USER LOGIN
// ======================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Ambil data user komplit berdasarkan email
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
        trial_start,
        trial_end,
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
    if (hashedPassword && hashedPassword.startsWith("$2y$")) {
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

    // 4. SINKRONISASI NOTIFIKASI: Cek Kedaluwarsa Realtime (Trial & Subscription Reguler)
    let finalStatus = user.subscription_status || "active";
    let expiredTrial = false;
    let expiredSubscription = false;
    let triggerDatabaseUpdate = false;
    const now = new Date();

    // A. Pengecekan jika akun sedang dalam masa TRIAL
    if (user.billing_cycle === "TRIAL" && user.trial_end) {
      const endTrialDate = new Date(user.trial_end);
      if (now > endTrialDate) {
        finalStatus = "expired";
        expiredTrial = true;
        triggerDatabaseUpdate = true;
      }
    } 
    // B. Pengecekan jika akun menggunakan paket komersial reguler (BULANAN/TAHUNAN)
    else if (user.package_type !== "FREE" && user.subscription_ends_at) {
      const endSubDate = new Date(user.subscription_ends_at);
      if (now > endSubDate) {
        finalStatus = "expired";
        expiredSubscription = true;
        triggerDatabaseUpdate = true;
      }
    }

    // Eksekusi update otomatis status ke database jika terdeteksi expired di server
    if (triggerDatabaseUpdate && user.subscription_status !== "expired") {
      await db.query(
        `UPDATE tbr_users SET subscription_status = 'expired' WHERE id = ?`,
        [user.id]
      );
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

    // Tentukan info tambahan tanggal batas akhir untuk dibaca komponen frontend
    const formattedEndDate = user.billing_cycle === "TRIAL" ? user.trial_end : user.subscription_ends_at;

    return res.status(200).json({
      success: true,
      token,
      user: {
        ...user,
        subscription_status: finalStatus,
        expired_trial: expiredTrial,
        expired_subscription: expiredSubscription, // Flag baru untuk dibaca notifikasi frontend
        end_date: safeIsoDate(formattedEndDate)
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
// 🔍 GET ME (Check Current Logged In User Data)
// ======================================================
exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau kedaluwarsa",
      });
    }

    // Ambil data lengkap untuk disinkronkan ke Billing & Dashboard Frontend
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
        trial_start,
        trial_end,
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

    // SINKRONISASI NOTIFIKASI: Cek Kedaluwarsa Realtime saat Refresh Browser
    let finalStatus = user.subscription_status || "active";
    let expiredTrial = false;
    let expiredSubscription = false;
    let triggerDatabaseUpdate = false;
    const now = new Date();

    // A. Jalur cek TRIAL
    if (user.billing_cycle === "TRIAL" && user.trial_end) {
      const endTrialDate = new Date(user.trial_end);
      if (now > endTrialDate) {
        finalStatus = "expired";
        expiredTrial = true;
        triggerDatabaseUpdate = true;
      }
    } 
    // B. Jalur cek Subscription reguler
    else if (user.package_type !== "FREE" && user.subscription_ends_at) {
      const endSubDate = new Date(user.subscription_ends_at);
      if (now > endSubDate) {
        finalStatus = "expired";
        expiredSubscription = true;
        triggerDatabaseUpdate = true;
      }
    }

    if (triggerDatabaseUpdate && user.subscription_status !== "expired") {
      await db.query(
        `UPDATE tbr_users SET subscription_status = 'expired' WHERE id = ?`,
        [user.id]
      );
    }

    const formattedEndDate = user.billing_cycle === "TRIAL" ? user.trial_end : user.subscription_ends_at;

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
        trial_start: user.trial_start,
        trial_end: user.trial_end,
        expired_trial: expiredTrial,
        expired_subscription: expiredSubscription, // Flag untuk memicu banner peringatan di frontend
        end_date: safeIsoDate(formattedEndDate)
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