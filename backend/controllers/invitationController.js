// controllers/invitationController.js
const nodemailer = require('nodemailer');
const crypto = require('crypto'); 
const bcrypt = require("bcryptjs"); // 👑 Pindahkan ke atas agar rapi & optimal
const db = require("../config/db"); 

// 1. Konfigurasi Transporter SMTP Nodemailer (Disertai Bypass Handshake SSL Localhost)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_PORT === '465', 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
  tls: {
    rejectUnauthorized: false // 🛠️ Menghindari error 500 SMTP akibat blokade SSL lokal
  }
});

// ======================================================
// 📩 1. INVITE USER (Simpan ke DB & Kirim Email Undangan)
// ======================================================
exports.inviteUser = async (req, res) => {
  try {
    const { email, role } = req.body;
    const tenantId = req.user?.tenant_id; 
    const companyName = req.user?.company_name || "Organisasi Partner"; 

    if (!email || !role) {
      return res.status(400).json({ success: false, message: "Email dan Role wajib ditentukan." });
    }

    // A. Validasi apakah email sudah terdaftar sebagai user aktif
    const [existingUser] = await db.query('SELECT id FROM tbr_users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: "Email ini sudah terdaftar sebagai pengguna aktif." });
    }

    // B. Generate Token Unik & Set Expired 24 Jam
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 

    // C. Bersihkan sisa undangan pending lama dengan email yang sama
    await db.query('DELETE FROM tbr_invitations WHERE email = ? AND status = "pending"', [email]);

    // D. Simpan data undangan ke tabel tbr_invitations
    const insertQuery = `
      INSERT INTO tbr_invitations (email, role, tenant_id, token, expires_at, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `;
    await db.query(insertQuery, [email, role, tenantId, inviteToken, expiresAt]);

    // E. Susun Tautan Verifikasi Menuju Frontend
    const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

    // F. Desain Template Email Premium Bertema Merah Putih (#ee1e2d)
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

    // G. Eksekusi Pengiriman Email Fisik
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Email undangan berhasil dirilis dan dikirim ke server tujuan.",
    });

  } catch (error) {
    console.error("❌ NODEMAILER / DB ERROR:", error);
    return res.status(500).json({ success: false, message: "Gagal memproses alokasi pengiriman email SMTP." });
  }
};

// ======================================================
// 🔍 2. VERIFY TOKEN ROUTE (Validasi Token Database ke Frontend)
// ======================================================
exports.verifyTokenRoute = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token undangan tidak ditemukan." });
    }

    const [invitations] = await db.query('SELECT * FROM tbr_invitations WHERE token = ?', [token]);
    
    if (invitations.length === 0) {
      return res.status(404).json({ success: false, message: "Tautan undangan tidak valid atau tidak terdaftar." });
    }

    const invitation = invitations[0];

    if (invitation.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Tautan ini tidak dapat digunakan karena berstatus: ${invitation.status}.` });
    }

    if (new Date() > new Date(invitation.expires_at)) {
      await db.query('UPDATE tbr_invitations SET status = "expired" WHERE id = ?', [invitation.id]);
      return res.status(410).json({ success: false, message: "Tautan undangan sudah kedaluwarsa (Maks. 24 Jam)." });
    }
    
    return res.status(200).json({
      success: true,
      message: "Token undangan valid.",
      data: {
        email: invitation.email,
        role: invitation.role,
        tenantId: invitation.tenant_id
      }
    });
  } catch (error) {
    console.error("❌ VERIFY INVITATION TOKEN ERROR:", error);
    return res.status(500).json({ success: false, message: "Gagal memvalidasi token dari database." });
  }
};

// ======================================================
// 👤 3. ACCEPT INVITE (Registrasi Anggota Tim & Update State)
// ======================================================
exports.acceptInvite = async (req, res) => {
  // Ambil koneksi manual untuk mengaktifkan fitur ACID Transaction
  const connection = await db.getConnection();
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ success: false, message: "Seluruh data profil wajib diisi." });
    }

    // A. Ambil dan validasi token langsung dari DB
    const [invitations] = await connection.query('SELECT * FROM tbr_invitations WHERE token = ?', [token]);
    if (invitations.length === 0) {
      return res.status(404).json({ success: false, message: "Undangan tidak valid." });
    }

    const invitation = invitations[0];

    if (invitation.status !== 'pending' || new Date() > new Date(invitation.expires_at)) {
      return res.status(400).json({ success: false, message: "Undangan ini sudah tidak dapat digunakan lagi atau kedaluwarsa." });
    }

    // B. Mulai Transaksi Database Aman
    await connection.beginTransaction();

    // C. Enkripsi password menggunakan bcryptjs yang sudah di-import di atas
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // D. Masukkan data ke tabel utama tbr_users
    await connection.query(
      `INSERT INTO tbr_users (name, email, password, role, tenant_id) VALUES (?, ?, ?, ?, ?)`,
      [name, invitation.email, hashedPassword, invitation.role, invitation.tenant_id]
    );

    // E. Kunci Token secara permanen menjadi 'accepted'
    await connection.query('UPDATE tbr_invitations SET status = "accepted" WHERE id = ?', [invitation.id]);

    // F. Commit transaksi jika kedua query di atas sukses tanpa cela
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Berhasil bergabung! Akun tim Anda telah aktif, silakan lakukan login.",
    });
  } catch (error) {
    // Rollback otomatis jika di tengah jalan ada query yang crash (mencegah data menggantung)
    await connection.rollback();
    console.error("❌ ACCEPT INVITE ERROR:", error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: "Email ini sudah terdaftar di sistem ScrumApps." });
    }
    return res.status(500).json({ success: false, message: "Gagal memproses pembuatan akun tim baru." });
  } finally {
    // Kembalikan koneksi ke pool agar memori server tidak bocor
    connection.release();
  }
};