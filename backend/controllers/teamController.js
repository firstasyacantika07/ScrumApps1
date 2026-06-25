const db = require('../config/db');

/**
 * 👥 1. ADD TEAM MEMBER (Sudah Terproteksi checkTeamLimit di Router)
 */
exports.addTeamMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { user_id, role } = req.body;
    const tenantId = req.user.tenant_id; // Diambil dari JWT verifyToken

    // Validasi Keamanan: Pastikan proyek yang dituju benar-block milik tenant Admin yang login
    const [projectCheck] = await db.query(
      'SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?',
      [projectId, tenantId]
    );
    if (projectCheck.length === 0) {
      return res.status(403).json({ message: "Akses Ditolak: Proyek tidak berada di bawah workspace Anda." });
    }

    // Standardisasi string role agar konsisten (lowercase, tanpa spasi)
    const cleanRole = role ? String(role).replace(/\s+/g, '').toLowerCase().trim() : 'teamdeveloper';

    // Cek apakah user yang mau diundang sudah terdaftar di proyek ini
    const [existing] = await db.query(
      `SELECT id FROM tbr_project_members WHERE project_id = ? AND user_id = ?`,
      [projectId, user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "User ini sudah menjadi anggota tim aktif di proyek ini." });
    }

    // Insert ke tabel baru: tbr_project_members
    await db.query(
      `INSERT INTO tbr_project_members (project_id, user_id, role, created_at, updated_at) 
       VALUES (?, ?, ?, NOW(), NOW())`,
      [projectId, user_id, cleanRole]
    );

    res.status(201).json({ success: true, message: "Anggota tim berhasil ditambahkan secara manual." });

  } catch (err) {
    console.error("❌ ADD MEMBER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔍 2. GET TEAM BY PROJECT (Aman Multi-Tenant)
 */
exports.getTeamByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tenantId = req.user.tenant_id;

    // Pastikan proyek milik tenant bersangkutan sebelum menarik data tim
    const [projectCheck] = await db.query(
      'SELECT id FROM tbr_projects WHERE id = ? AND tenant_id = ?',
      [projectId, tenantId]
    );
    if (projectCheck.length === 0) {
      return res.status(403).json({ message: "Akses Ditolak." });
    }
    
    const [rows] = await db.query(
      `SELECT pm.id, pm.project_id, pm.user_id, pm.role, pm.created_at, u.name, u.email 
       FROM tbr_project_members pm
       JOIN tbr_users u ON pm.user_id = u.id 
       WHERE pm.project_id = ?
       ORDER BY pm.created_at ASC`, 
      [projectId]
    );
    
    res.json(rows);
  } catch (err) {
    console.error("❌ GET TEAM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔄 3. UPDATE TEAM MEMBER ROLE (Aman Multi-Tenant)
 */
exports.updateTeamMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const { role } = req.body;
    const tenantId = req.user.tenant_id;

    // Validasi berlapis: Pastikan member yang di-update berada di dalam proyek milik tenant yang sah
    const [validCheck] = await db.query(
      `SELECT pm.id FROM tbr_project_members pm
       JOIN tbr_projects p ON pm.project_id = p.id
       WHERE pm.id = ? AND p.id = ? AND p.tenant_id = ?`,
      [memberId, projectId, tenantId]
    );

    if (validCheck.length === 0) {
      return res.status(403).json({ message: "Akses Ditolak: Data tidak ditemukan atau berada di luar koridor tenant Anda." });
    }

    const cleanRole = role ? String(role).replace(/\s+/g, '').toLowerCase().trim() : 'teamdeveloper';

    await db.query(
      `UPDATE tbr_project_members SET role = ?, updated_at = NOW() WHERE id = ?`,
      [cleanRole, memberId]
    );

    res.json({ success: true, message: "Hak akses role anggota tim berhasil diperbarui secara manual." });
  } catch (err) {
    console.error("❌ UPDATE MEMBER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🗑️ 4. DELETE TEAM MEMBER (Aman Multi-Tenant)
 */
exports.deleteTeamMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const tenantId = req.user.tenant_id;

    // Validasi berlapis sebelum eksekusi hapus data tim
    const [validCheck] = await db.query(
      `SELECT pm.id FROM tbr_project_members pm
       JOIN tbr_projects p ON pm.project_id = p.id
       WHERE pm.id = ? AND p.id = ? AND p.tenant_id = ?`,
      [memberId, projectId, tenantId]
    );

    if (validCheck.length === 0) {
      return res.status(403).json({ message: "Akses Ditolak: Data tidak valid." });
    }

    await db.query('DELETE FROM tbr_project_members WHERE id = ?', [memberId]);
    res.json({ success: true, message: "Anggota tim berhasil dikeluarkan dari proyek secara manual." });
  } catch (err) {
    console.error("❌ DELETE MEMBER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};