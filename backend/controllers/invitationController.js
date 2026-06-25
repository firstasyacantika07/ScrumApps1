const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const db = require("../config/db"); // Impor koneksi database untuk proses acceptInvite

// 1. Konfigurasi Transporter SMTP Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true, // true untuk port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // 🔥 REVISI: Menggunakan properti 'pass' yang valid untuk SMTP
  },
});

// ======================================================
// 📩 1. INVITE USER (Kirim Email Undangan)
// ======================================================
exports.inviteUser = async (req, res) => {
  try {
    const { email, role } = req.body;
    
    // Ambil data dari middleware auth login admin
    const companyName = req.user?.company_name || "Organisasi Partner"; 

    if (!email || !role) {
      return res.status(400).json({ message: "Email dan Role wajib ditentukan." });
    }

    // 2. Generate Token Undangan Unik (Expired dalam 24 jam)
    const inviteToken = jwt.sign(
      { email, role, tenantId: req.user.tenant_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 3. Susun Tautan Verifikasi Menuju Frontend
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    // 4. Desain Template Email Premium Bertema Merah Putih (#ee1e2d)
    const mailOptions = {
      from: `"ScrumApps System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Undangan Bergabung ke Workspace ${companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 24px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #ee1e2d; margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">ScrumApps</h2>
            <p style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; font-weight: bold;">SaaS Agile Project Management</p>
          </div>
          
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">Halo,</p>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Anda telah diundang oleh Admin dari <strong>${companyName}</strong> untuk bergabung ke dalam repositori manajemen proyek mereka sebagai <span style="color: #ee1e2d; font-weight: bold;">${role}</span>.
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${inviteLink}" style="background-color: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              Terima Undangan & Atur Profil
            </a>
          </div>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; margin-bottom: 25px;">
            <p style="color: #64748b; font-size: 11px; margin: 0; line-height: 1.5;">
              ⚠️ <strong>Penting:</strong> Tautan di atas hanya berlaku selama <strong>24 jam</strong> sejak email ini dikirimkan. Jika tautan kedaluwarsa, silakan hubungi admin Anda untuk menjadwalkan ulang tautan baru.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin-bottom: 20px;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
            Email ini dikirim secara otomatis oleh sistem ScrumApps. Mohon untuk tidak membalas email ini.
          </p>
        </div>
      `,
    };

    // 5. Eksekusi Pengiriman Email Fisik
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Email undangan berhasil dirilis dan dikirim ke server tujuan.",
    });

  } catch (error) {
    console.error("NODEMAILER ERROR:", error);
    return res.status(500).json({ message: "Gagal memproses alokasi pengiriman email SMTP." });
  }
};

// ======================================================
// 🔍 2. VERIFY TOKEN ROUTE (Validasi Token di Frontend)
// ======================================================
exports.verifyTokenRoute = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token undangan tidak ditemukan." });
    }

    // Ekstrak data dari JWT token undangan
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    return res.status(200).json({
      success: true,
      message: "Token undangan valid.",
      data: {
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId
      }
    });
  } catch (error) {
    console.error("VERIFY INVITATION TOKEN ERROR:", error);
    return res.status(401).json({ 
      success: false, 
      message: "Tautan undangan tidak valid atau sudah kedaluwarsa (Maks. 24 Jam)." 
    });
  }
};

// ======================================================
// 👤 3. ACCEPT INVITE (Registrasi Anggota Tim Baru)
// ======================================================
exports.acceptInvite = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ success: false, message: "Seluruh data profil wajib diisi." });
    }

    // 1. Validasi ulang keaslian token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Enkripsi password anggota tim baru
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await salt ? await bcrypt.hash(password, salt) : '';

    // 3. Masukkan ke tabel tbr_users dengan tenant_id dari si pengundang
    await db.query(
      `INSERT INTO tbr_users (name, email, password, role, tenant_id) VALUES (?, ?, ?, ?, ?)`,
      [name, decoded.email, hashedPassword, decoded.role, decoded.tenantId]
    );

    return res.status(201).json({
      success: true,
      message: "Berhasil bergabung! Akun tim Anda telah aktif, silakan lakukan login.",
    });
  } catch (error) {
    console.error("ACCEPT INVITE ERROR:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: "Email ini sudah terdaftar di sistem ScrumApps." });
    }
    return res.status(500).json({ success: false, message: "Gagal memproses pembuatan akun tim baru." });
  }
};