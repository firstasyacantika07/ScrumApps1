const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../config/db");
<<<<<<< HEAD
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
=======
const { sendEmail } = require("../services/emailService");
>>>>>>> 33abfe97e4934f20bf8902c77c19da92487955c1

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

    // 1. 🔥 REVISI: Ambil data profile dasar
    const [rows] = await db.query(
      `SELECT id, name, email, password, role, tenant_id FROM tbr_users WHERE email = ? LIMIT 1`,
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

    // 4. Ambil daftar workspace dari tabel pivot
    const [workspaces] = await db.query(`
      SELECT 
        tu.tenant_id, tu.role, t.company_name, t.subdomain, t.package_type, t.billing_cycle, t.status as tenant_status, t.trial_end, t.subscription_ends_at
      FROM tbr_tenant_users tu
      JOIN tbr_tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = ?
    `, [user.id]);

    // Update status kedaluwarsa untuk semua workspace
    for (let ws of workspaces) {
      let finalStatus = ws.tenant_status || "active";
      let triggerUpdate = false;
      const now = new Date();
      if (ws.billing_cycle === "TRIAL" && ws.trial_end && now > new Date(ws.trial_end)) {
        finalStatus = "expired";
        triggerUpdate = true;
      } else if (ws.package_type !== "FREE" && ws.subscription_ends_at && now > new Date(ws.subscription_ends_at)) {
        finalStatus = "expired";
        triggerUpdate = true;
      }
      ws.tenant_status = finalStatus;
      if (triggerUpdate && ws.tenant_status !== "expired") {
        await db.query(`UPDATE tbr_tenants SET status = 'expired' WHERE id = ?`, [ws.tenant_id]);
      }
    }

    // Cek jika tenant legacy disuspended (untuk backward compatibility)
    // if (user.tenant_status === 'suspended') ... dihilangkan, sekarang per workspace.

    // 5. Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    delete user.password;
    
    const defaultWorkspace = workspaces.length > 0 ? workspaces[0] : null;

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        workspaces: workspaces,
        // Backward compatibility
        tenant_id: defaultWorkspace ? defaultWorkspace.tenant_id : user.tenant_id,
        role: defaultWorkspace ? defaultWorkspace.role : user.role,
        subscription_status: defaultWorkspace ? defaultWorkspace.tenant_status : 'active'
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

    // Ambil semua workspaces
    const [workspaces] = await db.query(`
      SELECT 
        tu.tenant_id, tu.role, t.company_name, t.subdomain, t.package_type, t.billing_cycle, t.status as tenant_status, t.trial_end, t.subscription_ends_at
      FROM tbr_tenant_users tu
      JOIN tbr_tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = ?
    `, [req.user.id]);

    for (let ws of workspaces) {
      let finalStatus = ws.tenant_status || "active";
      let triggerUpdate = false;
      const now = new Date();
      if (ws.billing_cycle === "TRIAL" && ws.trial_end && now > new Date(ws.trial_end)) {
        finalStatus = "expired";
        triggerUpdate = true;
      } else if (ws.package_type !== "FREE" && ws.subscription_ends_at && now > new Date(ws.subscription_ends_at)) {
        finalStatus = "expired";
        triggerUpdate = true;
      }
      ws.tenant_status = finalStatus;
      if (triggerUpdate && ws.tenant_status !== "expired") {
        await db.query(`UPDATE tbr_tenants SET status = 'expired' WHERE id = ?`, [ws.tenant_id]);
      }
    }

    const formattedEndDate = req.user.billing_cycle === "TRIAL" ? req.user.trial_end : req.user.subscription_ends_at;
    
    // Pastikan req.user mengandung data terbaru yang diinject middleware
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        workspaces: workspaces,
        // Active context dari middleware (header X-Tenant-ID)
        tenant_id: req.user.tenant_id,
        role: req.user.role,
        package_type: req.user.package_type || "FREE",
        billing_cycle: req.user.billing_cycle || "NONE",
        subscription_status: req.user.subscription_status || "active",
        trial_start: req.user.trial_start,
        trial_end: req.user.trial_end,
        expired_trial: req.user.subscription_status === 'expired' && req.user.billing_cycle === 'TRIAL',
        expired_subscription: req.user.subscription_status === 'expired' && req.user.billing_cycle !== 'TRIAL',
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
    // Tetap insert ke tbr_users dengan legacy tenant_id untuk backup
    const [userResult] = await connection.query(
      `INSERT INTO tbr_users (name, email, password, role, tenant_id, phone_number)
       VALUES (?, ?, ?, 'admin', ?, ?)`,
      [email.trim().toLowerCase(), name, hashedPassword, tenantId, phone_number || null]
    );
    const newUserId = userResult.insertId;

    // 🔥 REVISI: Masukkan ke tabel pivot tbr_tenant_users
    await connection.query(
      `INSERT INTO tbr_tenant_users (user_id, tenant_id, role) VALUES (?, ?, 'admin')`,
      [newUserId, tenantId]
    );

    await connection.commit();
    connection.release();

    // 6. Generate JWT langsung
    const token = jwt.sign(
      {
        id: newUserId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Mock workspaces array
    const workspaces = [{
      tenant_id: tenantId,
      role: 'admin',
      company_name: company_name.trim(),
      subdomain: subdomain,
      package_type: 'FREE',
      billing_cycle: 'TRIAL',
      tenant_status: 'active',
      trial_end: trialEnd
    }];

    return res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      token,
      user: {
        id: newUserId,
        name,
        email,
        workspaces: workspaces,
        // Legacy
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

    // 🔧 FIX #5 lanjutan: sebelumnya tautan reset cuma di-log ke console (email
    // tidak pernah benar-benar terkirim). Sekarang disambungkan ke sendEmail()
    // dari emailService.js. Kegagalan kirim TIDAK menggagalkan request --
    // tetap kembalikan genericResponse (200) supaya endpoint ini tidak bisa
    // dipakai menebak email terdaftar, tapi kegagalan tetap dicatat di log
    // agar ketahuan dari server.
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Atur Ulang Kata Sandi</h2>
        <p>Halo ${user.name || ""},</p>
        <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun ScrumApps Anda. Klik tombol di bawah untuk melanjutkan:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background:#D31217;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Atur Ulang Kata Sandi
          </a>
        </p>
        <p>Atau salin tautan ini ke browser Anda:<br>${resetUrl}</p>
        <p style="color:#888;font-size:13px;">Tautan ini berlaku selama 1 jam. Jika Anda tidak meminta ini, abaikan email ini.</p>
      </div>
    `;

    const emailSent = await sendEmail(email, "Atur Ulang Kata Sandi - ScrumApps", emailHtml);
    if (!emailSent) {
      console.error(`[FORGOT PASSWORD] Gagal mengirim email reset ke ${email}, tautan tetap dicatat untuk debugging: ${resetUrl}`);
    }

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

// ======================================================
// 🌐 GOOGLE AUTH LOGIN / REGISTER
// ======================================================
exports.googleAuth = async (req, res) => {
  let connection;
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token Google tidak ditemukan." });
    }

    // Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    // We need email, name from payload
    const email = payload.email.trim().toLowerCase();
    const name = payload.name;

    connection = await db.getConnection();
    
    // Check if user exists
    const [rows] = await connection.query(
      `SELECT
        u.id, u.name, u.email, u.role, u.tenant_id,
        t.package_type, t.billing_cycle, t.status as tenant_status,
        t.trial_end, t.subscription_ends_at
       FROM tbr_users u
       LEFT JOIN tbr_tenants t ON u.tenant_id = t.id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );

    let user = rows[0];

    // If user does not exist, we need to register them automatically
    if (!user) {
      await connection.beginTransaction();

      const company_name = name + " Workspace";
      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      const baseSlug = company_name.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "workspace";
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const subdomain = `${baseSlug}-${randomSuffix}`;

      const [tenantResult] = await connection.query(
        `INSERT INTO tbr_tenants (company_name, package_type, billing_cycle, status, trial_start, trial_end, subdomain) VALUES (?, 'FREE', 'TRIAL', 'active', ?, ?, ?)`,
        [company_name.trim(), trialStart.toISOString().slice(0, 19).replace("T", " "), trialEnd.toISOString().slice(0, 19).replace("T", " "), subdomain]
      );
      const tenantId = tenantResult.insertId;

      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      const [userResult] = await connection.query(
        `INSERT INTO tbr_users (name, email, password, role, tenant_id) VALUES (?, ?, ?, 'admin', ?)`,
        [email, name, hashedPassword, tenantId]
      );
      const newUserId = userResult.insertId;

      await connection.query(
        `INSERT INTO tbr_tenant_users (user_id, tenant_id, role) VALUES (?, ?, 'admin')`,
        [newUserId, tenantId]
      );

      await connection.commit();

      // Refresh user object directly to match standard login flow
      user = { id: newUserId, name: name, email: email };
    }

    // Ambil daftar workspace
    const [workspaces] = await connection.query(`
      SELECT 
        tu.tenant_id, tu.role, t.company_name, t.subdomain, t.package_type, t.billing_cycle, t.status as tenant_status, t.trial_end, t.subscription_ends_at
      FROM tbr_tenant_users tu
      JOIN tbr_tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = ?
    `, [user.id]);

    for (let ws of workspaces) {
      let finalStatus = ws.tenant_status || "active";
      let triggerUpdate = false;
      const now = new Date();
      if (ws.billing_cycle === "TRIAL" && ws.trial_end && now > new Date(ws.trial_end)) {
        finalStatus = "expired";
        triggerUpdate = true;
      } else if (ws.package_type !== "FREE" && ws.subscription_ends_at && now > new Date(ws.subscription_ends_at)) {
        finalStatus = "expired";
        triggerUpdate = true;
      }
      ws.tenant_status = finalStatus;
      if (triggerUpdate && ws.tenant_status !== "expired") {
        await connection.query(`UPDATE tbr_tenants SET status = 'expired' WHERE id = ?`, [ws.tenant_id]);
      }
    }

    if (connection) {
       connection.release();
       connection = null;
    }

    const jwtToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    const defaultWorkspace = workspaces.length > 0 ? workspaces[0] : null;

    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        workspaces: workspaces,
        // Legacy
        tenant_id: defaultWorkspace ? defaultWorkspace.tenant_id : null,
        role: defaultWorkspace ? defaultWorkspace.role : null,
        subscription_status: defaultWorkspace ? defaultWorkspace.tenant_status : 'active'
      },
    });

  } catch (error) {
    if (connection) {
      try { await connection.rollback(); connection.release(); } catch (e) {}
    }
    console.error("GOOGLE AUTH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal login dengan Google",
      error: error.message,
    });
  }
};