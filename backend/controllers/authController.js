const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
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

// ======================================================
// 📝 USER REGISTER (Self Sign-Up: buat Tenant baru + User Admin pertama)
// ======================================================
exports.register = async (req, res) => {
  // 🔧 FIX: getConnection() dipindah ke dalam try — sebelumnya di luar try,
  // sehingga jika pool koneksi habis/reject, error tidak tertangkap (unhandled rejection).
  let connection;
  try {
    connection = await db.getConnection();
    const { name, email, password, company_name, phone_number } = req.body; // 🔧 FIX: tangkap phone_number

    // 1. Validasi input dasar (Kini menyertakan company_name)
    if (!name || !email || !password || !company_name) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: "Nama, nama perusahaan, email, dan password wajib diisi",
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

    // Generate subdomain unik berdasarkan company_name
    const baseSlug = company_name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "workspace";
    const randomSuffix = Math.random().toString(36).slice(2, 8); // 6 karakter acak
    const subdomain = `${baseSlug}-${randomSuffix}`;

    // 🔧 FIX: Memasukkan data 'company_name' ke dalam query insert tabel tbr_tenants
    const [tenantResult] = await connection.query(
      `INSERT INTO tbr_tenants
        (company_name, package_type, billing_cycle, status, trial_start, trial_end, subdomain)
       VALUES (?, 'FREE', 'TRIAL', 'active', ?, ?, ?)`,
      [
        company_name.trim(),
        trialStart.toISOString().slice(0, 19).replace("T", " "),
        trialEnd.toISOString().slice(0, 19).replace("T", " "),
        subdomain,
      ]
    );

    const tenantId = tenantResult.insertId;

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Buat user pertama sebagai admin/owner tenant tersebut
    // 🔧 FIX: Sertakan phone_number agar tersimpan (sebelumnya diabaikan meski dikirim frontend)
    const [userResult] = await connection.query(
      `INSERT INTO tbr_users (name, email, password, role, tenant_id, phone_number)
       VALUES (?, ?, ?, 'admin', ?, ?)`,
      [email.trim().toLowerCase(), name, hashedPassword, tenantId, phone_number || null]
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
    // 🔧 FIX: guard `connection &&` — bisa saja error terjadi sebelum getConnection() berhasil
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (e) {
        // koneksi mungkin sudah ter-release, abaikan
      }
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
// 🔑 FORGOT PASSWORD (Kirim tautan atur ulang kata sandi)
// ======================================================
exports.forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email wajib diisi",
      });
    }

    email = email.trim().toLowerCase();

    const [rows] = await db.query(
      `SELECT id, name FROM tbr_users WHERE email = ? LIMIT 1`,
      [email]
    );
    const user = rows[0];

    // 🔒 Pesan generik dikembalikan baik email ditemukan maupun tidak,
    // supaya endpoint ini tidak bisa dipakai untuk menebak email yang terdaftar.
    const genericResponse = {
      success: true,
      message: "Jika email terdaftar, tautan atur ulang kata sandi telah dikirim.",
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate token acak, simpan versi hash-nya saja di DB (token asli hanya ada di link email)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // berlaku 1 jam

    await db.query(
      `UPDATE tbr_users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`,
      [hashedToken, expiresAt.toISOString().slice(0, 19).replace("T", " "), user.id]
    );

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    // 🔧 TODO: Sambungkan ke layanan email sungguhan (SMTP/SendGrid/Resend/dll).
    // Untuk sementara, tautan reset di-log ke console server agar development tetap jalan.
    console.log(`[FORGOT PASSWORD] Tautan reset untuk ${email}: ${resetUrl}`);

    return res.status(200).json(genericResponse);

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memproses permintaan lupa password",
    });
  }
};

// ======================================================
// 🔑 RESET PASSWORD (Set kata sandi baru menggunakan token dari email)
// ======================================================
exports.resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, token, dan password baru wajib diisi",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 6 karakter",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const [rows] = await db.query(
      `SELECT id, reset_token_expires FROM tbr_users WHERE email = ? AND reset_token = ? LIMIT 1`,
      [email.trim().toLowerCase(), hashedToken]
    );
    const user = rows[0];

    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Tautan reset tidak valid atau sudah kedaluwarsa",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE tbr_users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?`,
      [hashedPassword, user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Password berhasil diatur ulang, silakan login dengan password baru Anda",
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengatur ulang password",
    });
  }
};

// ======================================================
// 🔧 FIX: Endpoint debug ini sebelumnya expose seluruh daftar user (id, email, role,
// tenant_id) TANPA pengecekan auth di dalam controller — risiko kebocoran data lintas
// tenant kalau route-nya tidak diproteksi middleware. Dinonaktifkan di sini.
// Kalau memang masih dibutuhkan untuk debugging, aktifkan lagi HANYA di belakang
// middleware auth + role admin, dan jangan biarkan aktif di production.
// ======================================================
exports.debugListUsers = async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "Endpoint debug ini sudah dinonaktifkan.",
  });
};