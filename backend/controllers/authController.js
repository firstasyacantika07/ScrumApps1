const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

// Helper internal sanitasi format tanggal ISO
const safeIsoDate = (dateString) => {
  if (!dateString) return null;
  if (dateString instanceof Date) {
    if (isNaN(dateString.getTime())) return null;
    return dateString.toISOString().split('T')[0];
  }
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

    // 1. 🔥 REVISI: Ambil data profile dari tbr_users dan gabungkan data paket dari tbr_tenants
    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.password,
        u.role,
        u.tenant_id,
        t.package_type,
        t.billing_cycle,
        t.status as tenant_status,
        t.trial_start,
        t.trial_end,
        t.subscription_ends_at
      FROM tbr_users u
      LEFT JOIN tbr_tenants t ON u.tenant_id = t.id
      WHERE u.email = ?
      LIMIT 1
      `,
      [email]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    // 2. Sinkronisasi format hash bcrypt PHP ($2y$ ke $2a$)
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

    // Cek jika tenant disuspended pusat
    if (user.tenant_status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: "Akses Perusahaan Ditangguhkan: Hubungi bagian administrasi billing.",
      });
    }

    // 4. SINKRONISASI NOTIFIKASI: Cek Kedaluwarsa Realtime di level Tenant
    let finalStatus = user.tenant_status || "active";
    let expiredTrial = false;
    let expiredSubscription = false;
    let triggerDatabaseUpdate = false;
    const now = new Date();

    if (user.billing_cycle === "TRIAL" && user.trial_end) {
      const endTrialDate = new Date(user.trial_end);
      if (now > endTrialDate) {
        finalStatus = "expired";
        expiredTrial = true;
        triggerDatabaseUpdate = true;
      }
    } 
    else if (user.package_type !== "FREE" && user.subscription_ends_at) {
      const endSubDate = new Date(user.subscription_ends_at);
      if (now > endSubDate) {
        finalStatus = "expired";
        expiredSubscription = true;
        triggerDatabaseUpdate = true;
      }
    }

    // 🔥 REVISI: Update target ke tbr_tenants
    if (triggerDatabaseUpdate && user.tenant_status !== "expired") {
      await db.query(
        `UPDATE tbr_tenants SET status = 'expired' WHERE id = ?`,
        [user.tenant_id]
      );
    }

    // 5. Generate JWT Token dengan payload data perusahaan yang bersih
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

    delete user.password;
    const formattedEndDate = user.billing_cycle === "TRIAL" ? user.trial_end : user.subscription_ends_at;

    return res.status(200).json({
      success: true,
      token,
      user: {
        ...user,
        subscription_status: finalStatus,
        expired_trial: expiredTrial,
        expired_subscription: expiredSubscription, 
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

    // 🔥 REVISI: Ambil profil user dan satukan dengan data langganan dari tbr_tenants
    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.tenant_id,
        t.package_type,
        t.billing_cycle,
        t.status as tenant_status,
        t.trial_start,
        t.trial_end,
        t.subscription_ends_at
      FROM tbr_users u
      LEFT JOIN tbr_tenants t ON u.tenant_id = t.id
      WHERE u.id = ?
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

    let finalStatus = user.tenant_status || "active";
    let expiredTrial = false;
    let expiredSubscription = false;
    let triggerDatabaseUpdate = false;
    const now = new Date();

    if (user.billing_cycle === "TRIAL" && user.trial_end) {
      const endTrialDate = new Date(user.trial_end);
      if (now > endTrialDate) {
        finalStatus = "expired";
        expiredTrial = true;
        triggerDatabaseUpdate = true;
      }
    } 
    else if (user.package_type !== "FREE" && user.subscription_ends_at) {
      const endSubDate = new Date(user.subscription_ends_at);
      if (now > endSubDate) {
        finalStatus = "expired";
        expiredSubscription = true;
        triggerDatabaseUpdate = true;
      }
    }

    if (triggerDatabaseUpdate && user.tenant_status !== "expired") {
      await db.query(
        `UPDATE tbr_tenants SET status = 'expired' WHERE id = ?`,
        [user.tenant_id]
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
        trial_start: user.trial_start,
        trial_end: user.trial_end,
        expired_trial: expiredTrial,
        expired_subscription: expiredSubscription, 
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