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
    let { email, password } = req.body;

    // 🔧 FIX: Normalisasi email (trim + lowercase) supaya konsisten dengan data yang disimpan
    email = email ? email.trim().toLowerCase() : email;

    // 🔍 DEBUG SEMENTARA: hapus setelah masalah login selesai
    console.log("[LOGIN DEBUG] Mencoba login dengan email:", JSON.stringify(email));

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
      // 🔍 DEBUG SEMENTARA
      console.log("[LOGIN DEBUG] User TIDAK DITEMUKAN untuk email:", JSON.stringify(email));
      return res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
    }

    // 🔍 DEBUG SEMENTARA
    console.log("[LOGIN DEBUG] User ditemukan, id:", user.id, "| hash di-DB (10 char awal):", user.password?.substring(0, 10));

    // 2. Sinkronisasi format hash bcrypt PHP ($2y$ ke $2a$)
    let hashedPassword = user.password;
    if (hashedPassword && hashedPassword.startsWith("$2y$")) {
      hashedPassword = "$2a$" + hashedPassword.slice(4);
    }

    // 3. Verifikasi Password
    const isMatch = await bcrypt.compare(password, hashedPassword);

    // 🔍 DEBUG SEMENTARA
    console.log("[LOGIN DEBUG] Hasil bcrypt.compare:", isMatch);

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

// ======================================================
// 📝 USER REGISTER (Self Sign-Up: buat Tenant baru + User Admin pertama)
// ======================================================
exports.register = async (req, res) => {
  const connection = await db.getConnection(); // pastikan db (mysql2 pool) support getConnection()
  try {
    const { name, email, password, company_name } = req.body;

    // 1. Validasi input dasar
    if (!name || !email || !password) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password wajib diisi",
      });
    }

    if (password.length < 6) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    // 2. Cek apakah email sudah terdaftar
    const [existing] = await connection.query(
      `SELECT id FROM tbr_users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar, silakan login",
      });
    }

    await connection.beginTransaction();

    // 3. Buat Tenant baru dengan paket TRIAL default (14 hari)
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    // 🔧 FIX: Generate subdomain unik (kolom ini UNIQUE di tbr_tenants).
    // Kalau dibiarkan kosong, MySQL isi default '' dan registrasi kedua dst akan
    // selalu gagal ER_DUP_ENTRY karena banyak baris bentrok di subdomain = ''.
    const baseSlug = (company_name || name || "workspace")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "workspace";
    const randomSuffix = Math.random().toString(36).slice(2, 8); // 6 karakter acak
    const subdomain = `${baseSlug}-${randomSuffix}`;

    const [tenantResult] = await connection.query(
      `INSERT INTO tbr_tenants
        (package_type, billing_cycle, status, trial_start, trial_end, subdomain)
       VALUES ('FREE', 'TRIAL', 'active', ?, ?, ?)`,
      [
        trialStart.toISOString().slice(0, 19).replace("T", " "),
        trialEnd.toISOString().slice(0, 19).replace("T", " "),
        subdomain,
      ]
    );

    const tenantId = tenantResult.insertId;

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Buat user pertama sebagai admin/owner tenant tersebut
    const [userResult] = await connection.query(
      `INSERT INTO tbr_users (name, email, password, role, tenant_id)
       VALUES (?, ?, ?, 'admin', ?)`,
      [name, email, hashedPassword, tenantId]
    );

    await connection.commit();
    connection.release();

    const newUserId = userResult.insertId;

    // 6. Generate JWT langsung (auto-login setelah register)
    const token = jwt.sign(
      {
        id: newUserId,
        role: "admin",
        tenant_id: tenantId,
        package_type: "FREE",
        subscription_status: "active",
        billing_cycle: "TRIAL",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      token,
      user: {
        id: newUserId,
        name,
        email,
        role: "admin",
        tenant_id: tenantId,
        package_type: "FREE",
        billing_cycle: "TRIAL",
        subscription_status: "active",
        end_date: safeIsoDate(trialEnd),
      },
    });

  } catch (error) {
    try {
      await connection.rollback();
      connection.release();
    } catch (e) {
      // koneksi mungkin sudah ter-release, abaikan
    }
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal melakukan registrasi",
      error: error.message,
    });
  }
};
// ======================================================
// 🔍 DEBUG SEMENTARA: List semua user (hapus setelah masalah selesai!)
// ======================================================
exports.debugListUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, tenant_id, LENGTH(email) as email_length FROM tbr_users ORDER BY id DESC LIMIT 50`
    );
    return res.status(200).json({
      success: true,
      count: rows.length,
      users: rows.map(u => ({
        ...u,
        email_json: JSON.stringify(u.email),
      })),
    });
  } catch (error) {
    console.error("DEBUG LIST USERS ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};